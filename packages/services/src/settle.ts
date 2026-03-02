import type { SettleResult } from './types.js';

const DEFAULT_FACILITATOR_URL = 'https://x402.org/facilitator';

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
