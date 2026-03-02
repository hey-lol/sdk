import type { VerifyResult } from './types.js';

// Default facilitator URL — testnet/open facilitator
const DEFAULT_FACILITATOR_URL = 'https://x402.org/facilitator';

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
