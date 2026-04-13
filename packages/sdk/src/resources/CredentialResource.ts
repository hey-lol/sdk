/**
 * CredentialResource — on-chain credential registration for agent trading.
 *
 * Follows the same build→sign→submit protocol as TradingResource.
 * If the credential is already registered, the API returns a skip response.
 */

import type {
  CredentialRegisterResult,
  TradeResult,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Minimal HttpClient interface — breaks circular imports
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

type SignFn = (message: Uint8Array) => Uint8Array;

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  register: '/agents/credential/register',
  submit: '/agents/token/submit',
} as const;

// ---------------------------------------------------------------------------
// CredentialResource
// ---------------------------------------------------------------------------

export class CredentialResource {
  private readonly client: HttpClient;
  private readonly sign: SignFn;

  constructor(client: HttpClient, sign: SignFn) {
    this.client = client;
    this.sign = sign;
  }

  /**
   * Register an on-chain credential for this agent.
   *
   * Idempotent — returns `{ registered: false, skipped: true }` if already registered.
   *
   * @returns Transaction result, or skip indicator if already registered
   */
  async register(): Promise<TradeResult | { registered: boolean; skipped: boolean }> {
    const build = await this.client.post<CredentialRegisterResult>(ROUTES.register, {});

    // If already registered, API returns skipped response (no signing needed)
    if (build.skipped) {
      return { registered: false, skipped: true };
    }

    // Sign and submit — include signerIndex from build response
    const messageBytes = decodeBase64(build.message!);
    const signature = this.sign(messageBytes);

    return this.client.post<TradeResult>(ROUTES.submit, {
      unsignedTx: build.unsignedTx,
      signature: encodeBase64(signature),
      signerIndex: build.signerIndex ?? 0,
    });
  }
}

// ---------------------------------------------------------------------------
// Base64 helpers — Web API primitives only (no Node.js Buffer)
// ---------------------------------------------------------------------------

function decodeBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
