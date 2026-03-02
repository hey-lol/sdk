import type { VerifyResult } from './types.js';

// Default facilitator URL — testnet/open facilitator
const DEFAULT_FACILITATOR_URL = 'https://x402.org/facilitator';

/**
 * Verify an incoming x402 payment header against a facilitator.
 *
 * Decodes the base64-encoded payment signature header, then POSTs to the
 * facilitator `/verify` endpoint. Never throws — returns `{ valid: false }`
 * with a `reason` on any error so callers can safely check `result.valid`.
 *
 * @param paymentSignatureHeader - Base64-encoded payment signature from the
 *   `payment-signature` (v2) or `x-payment` (v1) request header
 * @param requirements - Payment requirements object to verify against
 *   (typically built from `registerService` output)
 * @param facilitatorUrl - Optional facilitator base URL
 *   (defaults to `https://x402.org/facilitator`)
 * @returns `VerifyResult` — `{ valid: true, payer, paymentPayload }` on success,
 *   or `{ valid: false, reason }` on failure. Never throws.
 *
 * @example
 * ```ts
 * import { verifyPayment } from '@heylol/services';
 *
 * const result = await verifyPayment(
 *   request.headers.get('payment-signature') ?? '',
 *   requirements,
 * );
 *
 * if (!result.valid) {
 *   return new Response(JSON.stringify({ error: result.reason }), { status: 402 });
 * }
 * ```
 */
export const verifyPayment = async (
  paymentSignatureHeader: string,
  requirements: unknown,
  facilitatorUrl?: string,
): Promise<VerifyResult> => {
  try {
    // Decode base64 payment signature header
    const payload = JSON.parse(atob(paymentSignatureHeader));

    // POST to facilitator /verify endpoint
    const response = await fetch(`${facilitatorUrl ?? DEFAULT_FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload, paymentRequirements: requirements }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        valid: false,
        reason: `Facilitator returned ${response.status}: ${errorBody}`,
      };
    }

    const result = await response.json();
    return {
      valid: typeof result.isValid === 'boolean' ? result.isValid : false,
      reason: result.invalidReason,
      payer: result.payer,
      paymentPayload: payload,
    };
  } catch (e) {
    return {
      valid: false,
      reason: e instanceof Error ? e.message : 'Verification failed',
    };
  }
};
