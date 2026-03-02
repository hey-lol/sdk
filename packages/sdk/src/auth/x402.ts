import { AuthError } from '../errors/index.js';
import type { PaymentHeader, PaymentPayload, PaymentRequirements } from '../types/x402.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PAYMENT_HEADERS = {
  REQUIRED: 'payment-required',
  SIGNATURE: 'payment-signature',
  RESPONSE: 'payment-response',
  V1_PAYMENT: 'x-payment',
  V1_RESPONSE: 'x-payment-response',
} as const;

// ---------------------------------------------------------------------------
// Version detection
// ---------------------------------------------------------------------------

/**
 * Detects the x402 protocol version from a Response.
 *
 * - Returns 2 if the response has a `payment-required` header (x402 v2)
 * - Returns 1 if the response is a 402 with content-type: application/json (x402 v1)
 * - Returns null for non-402 responses or 402 responses that match neither format
 */
export function getPaymentVersion(response: Response): 1 | 2 | null {
  if (response.status !== 402) return null;
  if (response.headers.get(PAYMENT_HEADERS.REQUIRED)) return 2;
  if (response.headers.get('content-type')?.includes('application/json')) return 1;
  return null;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/** Ensures `amount` is always populated (falls back to `maxAmountRequired` for v1 wire data). */
function normalizeRequirements(raw: Array<Record<string, unknown>>): PaymentRequirements[] {
  return raw.map((req) => ({
    ...req,
    amount: (req.amount as string) ?? (req.maxAmountRequired as string),
  })) as PaymentRequirements[];
}

/**
 * Parses payment requirements from an x402 402 response.
 *
 * Automatically detects v1 (JSON body) vs v2 (PAYMENT-REQUIRED header) format.
 * Throws AuthError with code X402_PARSE_FAILED for any non-402 or malformed response.
 */
export async function parsePaymentRequirements(response: Response): Promise<PaymentRequirements[]> {
  const version = getPaymentVersion(response);

  if (version === null) {
    throw new AuthError({
      code: 'X402_PARSE_FAILED',
      message: 'Response is not a valid x402 payment required response',
    });
  }

  if (version === 2) {
    try {
      const header = response.headers.get(PAYMENT_HEADERS.REQUIRED) as string;
      const decoded = JSON.parse(atob(header)) as { accepts: Array<Record<string, unknown>> };
      return normalizeRequirements(decoded.accepts);
    } catch {
      throw new AuthError({
        code: 'X402_PARSE_FAILED',
        message: 'Failed to parse x402 v2 payment-required header',
      });
    }
  }

  // version === 1
  try {
    const body = (await response.json()) as {
      x402Version: number;
      accepts: Array<Record<string, unknown>>;
    };
    return normalizeRequirements(body.accepts);
  } catch {
    throw new AuthError({
      code: 'X402_PARSE_FAILED',
      message: 'Failed to parse x402 v1 JSON body',
    });
  }
}

// ---------------------------------------------------------------------------
// Header builder
// ---------------------------------------------------------------------------

/** Converts a Uint8Array to a base64 string without Node.js Buffer */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Constructs the payment header to send with the request.
 *
 * @param requirements - The payment requirements from parsePaymentRequirements
 * @param signedTx - The signed Solana transaction as raw bytes
 * @param version - Protocol version (1 = x-payment header, 2 = payment-signature header)
 * @returns PaymentHeader with headerName and base64-encoded headerValue
 */
export function buildPaymentHeader(
  requirements: PaymentRequirements,
  signedTx: Uint8Array,
  version: 1 | 2 = 1,
): PaymentHeader {
  const paymentPayload: PaymentPayload = {
    x402Version: version,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      serializedTransaction: uint8ArrayToBase64(signedTx),
    },
  };

  const headerValue = btoa(JSON.stringify(paymentPayload));
  const headerName = version === 2 ? PAYMENT_HEADERS.SIGNATURE : PAYMENT_HEADERS.V1_PAYMENT;

  return { headerName, headerValue };
}
