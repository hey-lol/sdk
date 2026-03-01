/** Payment requirements extracted from a 402 response */
export interface PaymentRequirements {
  scheme: string; // e.g., "exact"
  network: string; // v1: "solana-mainnet" | v2: CAIP-2 "solana:5eykt4..."
  maxAmountRequired: string; // amount in smallest unit (e.g., "0" for zero-amount)
  resource: string; // the URL being accessed
  description?: string; // human-readable description
  mimeType?: string; // expected response MIME type
  payTo?: string; // recipient address
  extra?: Record<string, unknown>; // additional fields
}

/** Payload sent in the payment header */
export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    serializedTransaction: string; // base64-encoded signed Solana tx
  };
}

/** Result from buildPaymentHeader — includes header name and value */
export interface PaymentHeader {
  headerName: string; // "x-payment" for v1, "payment-signature" for v2
  headerValue: string; // base64-encoded JSON of PaymentPayload
}
