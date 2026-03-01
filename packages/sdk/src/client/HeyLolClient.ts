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
 */

import type { Keypair } from '../auth/index.js';
import {
  buildDummyTransaction,
  buildPaymentHeader,
  getPaymentVersion,
  loadKeypair,
  parsePaymentRequirements,
} from '../auth/index.js';
import { APIError, NetworkError, PaymentRejectedError, RateLimitError } from '../errors/index.js';
import { DEFAULT_OPTIONS, parseRetryAfterMs, withRetry } from './index.js';
import type { ClientOptions } from './options.js';

export class HeyLolClient {
  private readonly keypair: Keypair;
  private readonly baseUrl: string;
  private readonly retries: number;
  private readonly timeout: number;
  private readonly network: typeof fetch;
  private readonly _sleep?: (ms: number) => Promise<void>;

  constructor(opts: ClientOptions) {
    this.keypair = loadKeypair(opts.privateKey);
    this.baseUrl = opts.baseUrl ?? DEFAULT_OPTIONS.baseUrl;
    this.retries = opts.retries ?? DEFAULT_OPTIONS.retries;
    this.timeout = opts.timeout ?? DEFAULT_OPTIONS.timeout;
    this.network = opts.network ?? globalThis.fetch.bind(globalThis);
    this._sleep = opts._sleep;
  }

  /**
   * Core request method — contains the 402 payment loop inline.
   *
   * The `paymentHeader` variable acts as the loop guard:
   * - null on first attempt (no payment header yet)
   * - set after first 402 (payment header attached to retry)
   * - second 402 throws PaymentRejectedError (no infinite loop)
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

      return response.json() as Promise<T>;
    };

    return withRetry(attempt, {
      retries: this.retries,
      sleep: this._sleep,
    });
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
