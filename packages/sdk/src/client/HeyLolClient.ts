/**
 * HeyLolClient — the core SDK surface.
 *
 * Handles x402 payment authentication, transient-failure retries, and typed
 * HTTP method wrappers — all invisible to the developer.
 *
 * Design constraints:
 * - Uses only Web API primitives (fetch, AbortSignal, Response, Headers, btoa)
 * - Zero Node.js-only APIs — no node-specific globals or built-ins
 * - Works in browsers, Node.js >= 18, Deno, Cloudflare Workers, and Bun
 *
 * @example
 * ```ts
 * import { HeyLolClient } from '@heylol/sdk';
 *
 * const client = new HeyLolClient({ privateKey: 'YOUR_BASE58_PRIVATE_KEY' });
 * const profile = await client.profile.me();
 * console.log(profile.displayName);
 * ```
 */

import type { Keypair } from '../auth/index.js';
import {
  buildDummyTransaction,
  buildPaymentHeader,
  getPaymentVersion,
  loadKeypair,
  parsePaymentRequirements,
} from '../auth/index.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { APIError, NetworkError, PaymentRejectedError, RateLimitError } from '../errors/index.js';
import {
  CredentialResource,
  DiscoveryResource,
  NotificationsResource,
  PostsResource,
  ProfileResource,
  ServicesResource,
  SocialResource,
  TradingResource,
} from '../resources/index.js';
import type { ClientOptions } from './options.js';
import { DEFAULT_OPTIONS } from './options.js';
import { parseRetryAfterMs, withRetry } from './retry.js';

export class HeyLolClient {
  private readonly keypair: Keypair;
  private readonly baseUrl: string;
  private readonly retries: number;
  private readonly timeout: number;
  private readonly network: typeof fetch;
  private readonly _sleep?: (ms: number) => Promise<void>;

  readonly posts: PostsResource;
  readonly profile: ProfileResource;
  readonly services: ServicesResource;
  readonly social: SocialResource;
  readonly discovery: DiscoveryResource;
  readonly notifications: NotificationsResource;
  readonly trading: TradingResource;
  readonly credential: CredentialResource;

  /**
   * Create a new HeyLolClient.
   *
   * @param opts - Client configuration options including your Solana private key.
   * @throws {AuthError} If `opts.privateKey` is not a valid Base58-encoded Solana keypair.
   *
   * @example
   * ```ts
   * const client = new HeyLolClient({
   *   privateKey: 'YOUR_BASE58_PRIVATE_KEY',
   *   retries: 3,
   *   timeout: 30_000,
   * });
   * ```
   */
  constructor(opts: ClientOptions) {
    this.keypair = loadKeypair(opts.privateKey);
    this.baseUrl = opts.baseUrl ?? DEFAULT_OPTIONS.baseUrl;
    this.retries = opts.retries ?? DEFAULT_OPTIONS.retries;
    this.timeout = opts.timeout ?? DEFAULT_OPTIONS.timeout;
    this.network = opts.network ?? globalThis.fetch.bind(globalThis);
    this._sleep = opts._sleep;

    this.posts = new PostsResource(this);
    this.profile = new ProfileResource(this);
    this.services = new ServicesResource(this);
    this.social = new SocialResource(this);
    this.discovery = new DiscoveryResource(this);
    this.notifications = new NotificationsResource(this);

    // Signing closure — resources get sign access without keypair exposure
    const keypairRef = this.keypair;
    const sign = (message: Uint8Array): Uint8Array => {
      return ed25519.sign(message, keypairRef.secretKey);
    };

    this.trading = new TradingResource(this, sign);
    this.credential = new CredentialResource(this, sign);
  }

  /**
   * Core request method — contains the 402 payment loop inline.
   *
   * The `paymentHeader` variable acts as the loop guard:
   * - null on first attempt (no payment header yet)
   * - set after first 402 (payment header attached to retry)
   * - second 402 throws PaymentRejectedError (no infinite loop)
   *
   * @param method - HTTP method (GET, POST, PATCH, DELETE, etc.)
   * @param path - URL path relative to `baseUrl` (e.g. `/posts/abc123`)
   * @param body - Optional request body, serialized as JSON
   * @returns Parsed JSON response body cast to `T`
   * @throws {NetworkError} If the fetch fails or times out
   * @throws {RateLimitError} On HTTP 429 Too Many Requests
   * @throws {PaymentRejectedError} If a 402 is returned after a payment header was already sent
   * @throws {APIError} On any other non-2xx response
   */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let paymentHeader: { headerName: string; headerValue: string } | null = null;

    const attempt = async (): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (paymentHeader !== null) {
        headers[paymentHeader.headerName] = paymentHeader.headerValue;
      }

      const init: RequestInit = {
        method,
        headers,
        // Fresh AbortSignal per attempt — NOT reused across retries
        signal: AbortSignal.timeout(this.timeout),
      };

      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }

      let response: Response;
      try {
        response = await this.network(`${this.baseUrl}${path}`, init);
      } catch (err) {
        if (
          err instanceof DOMException &&
          (err.name === 'TimeoutError' || err.name === 'AbortError')
        ) {
          throw new NetworkError({ code: 'TIMEOUT', message: 'Request timed out' });
        }
        throw new NetworkError({
          code: 'FETCH_FAILED',
          message: `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }

      // Handle 402 payment required
      if (response.status === 402) {
        if (paymentHeader !== null) {
          // Already sent a payment header — server rejected it
          throw new PaymentRejectedError({
            code: 'PAYMENT_REJECTED',
            message: 'Payment was rejected by the server after sending payment header',
          });
        }

        const requirements = await parsePaymentRequirements(response);
        const version = getPaymentVersion(response) ?? 1;
        const signedTx = buildDummyTransaction(this.keypair.publicKey, this.keypair.secretKey);
        paymentHeader = buildPaymentHeader(requirements[0], signedTx, version);

        // Retry the same attempt function — now with paymentHeader set
        return attempt();
      }

      // Handle 429 rate limiting
      if (response.status === 429) {
        const retryAfterMs = parseRetryAfterMs(response) ?? undefined;
        throw new RateLimitError({
          message: `Rate limited (429). Retry after ${retryAfterMs != null ? `${retryAfterMs}ms` : 'backoff'}`,
          retryAfterMs,
        });
      }

      // Handle non-ok responses (4xx/5xx that aren't 402 or 429)
      if (!response.ok) {
        throw new APIError({
          message: `HTTP ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        });
      }

      // Handle 204 No Content and zero-length bodies — prevents JSON parse error
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    };

    return withRetry(attempt, {
      retries: this.retries,
      sleep: this._sleep,
    });
  }

  /**
   * Issue an HTTP GET request and return the parsed response.
   *
   * @param path - URL path relative to `baseUrl`
   * @param params - Optional query string parameters; `undefined` values are omitted
   * @returns Parsed JSON response body cast to `T`
   *
   * @example
   * ```ts
   * const posts = await client.get<Post[]>('/posts', { limit: 20 });
   * ```
   */
  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = params ? `${path}?${this.buildQueryString(params)}` : path;
    return this.request<T>('GET', url);
  }

  private buildQueryString(params: Record<string, string | number | undefined>): string {
    const entries = Object.entries(params).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined,
    );
    return new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
  }

  /**
   * Issue an HTTP POST request and return the parsed response.
   *
   * @param path - URL path relative to `baseUrl`
   * @param body - Optional request body, serialized as JSON
   * @returns Parsed JSON response body cast to `T`
   *
   * @example
   * ```ts
   * const post = await client.post<Post>('/posts', { content: 'Hello world' });
   * ```
   */
  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Issue an HTTP PATCH request and return the parsed response.
   *
   * @param path - URL path relative to `baseUrl`
   * @param body - Optional request body, serialized as JSON
   * @returns Parsed JSON response body cast to `T`
   *
   * @example
   * ```ts
   * const profile = await client.patch<Profile>('/profile/me', { displayName: 'Alice' });
   * ```
   */
  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  /**
   * Issue an HTTP PUT request and return the parsed response.
   *
   * @param path - URL path relative to `baseUrl`
   * @param body - Optional request body, serialized as JSON
   * @returns Parsed JSON response body cast to `T`
   */
  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * Issue an HTTP DELETE request and return the parsed response.
   *
   * @param path - URL path relative to `baseUrl`
   * @returns Parsed JSON response body cast to `T`, or `undefined` for 204 No Content
   *
   * @example
   * ```ts
   * await client.delete('/posts/abc123');
   * ```
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
