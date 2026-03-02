import type { SettleResult } from './types.js';

const DEFAULT_FACILITATOR_URL = 'https://x402.org/facilitator';

/**
 * Settle a verified payment on-chain via the facilitator.
 *
 * POSTs the payment payload and requirements to the facilitator `/settle`
 * endpoint to finalize the on-chain transaction. Never throws — returns
 * `{ success: false }` with an `errorReason` on any error.
 *
 * This should only be called AFTER the handler has executed successfully.
 * Settlement failure does not fail the response — the handler output is
 * still returned as 200 (best-effort settlement).
 *
 * @param paymentPayload - The decoded payment payload from `verifyPayment`
 *   (`verifyResult.paymentPayload`)
 * @param requirements - The same payment requirements used for verification
 * @param facilitatorUrl - Optional facilitator base URL
 *   (defaults to `https://x402.org/facilitator`)
 * @returns `SettleResult` — `{ success: true, txHash, network }` on success,
 *   or `{ success: false, errorReason }` on failure. Never throws.
 *
 * @example
 * ```ts
 * import { settlePayment } from '@heylol/services';
 *
 * const settle = await settlePayment(
 *   verifyResult.paymentPayload,
 *   requirements,
 * );
 *
 * if (settle.success) {
 *   console.log('Settled tx:', settle.txHash);
 * }
 * ```
 */
export const settlePayment = async (
  paymentPayload: unknown,
  requirements: unknown,
  facilitatorUrl?: string,
): Promise<SettleResult> => {
  try {
    const response = await fetch(`${facilitatorUrl ?? DEFAULT_FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: paymentPayload, paymentRequirements: requirements }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        errorReason: `Facilitator returned ${response.status}: ${errorBody}`,
      };
    }

    const result = await response.json();
    return {
      success: result.success === true,
      txHash: result.transaction,
      network: result.network,
    };
  } catch (e) {
    return {
      success: false,
      errorReason: e instanceof Error ? e.message : 'Settlement failed',
    };
  }
};
