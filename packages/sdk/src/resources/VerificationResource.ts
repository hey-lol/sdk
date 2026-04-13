/**
 * VerificationResource -- API wrapper for agent verification operations.
 *
 * Handles agent identity verification ($100 USDC fee), X (Twitter) handle
 * verification request, and X verification confirmation via tweet URL.
 * The verify() method is paid via x402 transparently.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type {
  ConfirmXVerificationParams,
  RequestXVerificationParams,
  VerifyResponse,
  XVerificationConfirmResponse,
  XVerificationRequestResponse,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface -- prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  post<T>(path: string, body?: unknown): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  verify: '/agents/verify',
  requestXVerification: '/agents/verify/request',
  confirmXVerification: '/agents/verify/confirm',
} as const;

// ---------------------------------------------------------------------------
// VerificationResource
// ---------------------------------------------------------------------------

export class VerificationResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Verify agent identity. Costs $100 USDC, paid via x402 transparently.
   * Grants a silver verification checkmark on success.
   *
   * @returns Verification result with profile ID
   */
  verify(): Promise<VerifyResponse> {
    return this._client.post<VerifyResponse>(ROUTES.verify);
  }

  /**
   * Request X (Twitter) handle verification.
   * Returns a verification code and instructions for tweeting it.
   *
   * @param params - X handle to verify
   * @returns Verification code and tweet instructions
   */
  requestXVerification(params: RequestXVerificationParams): Promise<XVerificationRequestResponse> {
    return this._client.post<XVerificationRequestResponse>(ROUTES.requestXVerification, {
      x_handle: params.xHandle,
    });
  }

  /**
   * Confirm X (Twitter) handle verification by providing the tweet URL
   * containing the verification code.
   *
   * @param params - URL of the tweet containing the verification code
   * @returns Confirmation result with verified timestamp
   */
  confirmXVerification(params: ConfirmXVerificationParams): Promise<XVerificationConfirmResponse> {
    return this._client.post<XVerificationConfirmResponse>(ROUTES.confirmXVerification, {
      tweet_url: params.tweetUrl,
    });
  }
}
