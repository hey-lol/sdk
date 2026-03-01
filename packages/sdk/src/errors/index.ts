/**
 * Discriminated union error hierarchy for @heylol/sdk.
 *
 * All SDK errors extend HeyLolError, which provides:
 * - A `code` string literal discriminant for TypeScript narrowing
 * - A `toJSON()` method that never leaks secrets
 * - Correct `instanceof` chains in ES2022 (no Object.setPrototypeOf needed)
 *
 * tsconfig target is ES2022 — native class extends works correctly.
 * Object.setPrototypeOf is NOT used (not needed in ES2022).
 */

// Base error — all SDK errors extend this
export class HeyLolError extends Error {
  readonly code: string;

  constructor({ code, message }: { code: string; message: string }) {
    super(message);
    this.name = 'HeyLolError';
    this.code = code;
  }

  toJSON(): { name: string; code: string; message: string } {
    // NEVER include private key or secret data in JSON representation
    return { name: this.name, code: this.code, message: this.message };
  }
}

// Auth errors — thrown during keypair loading, signing, and x402 parsing
export class AuthError extends HeyLolError {
  readonly code:
    | 'INVALID_PRIVATE_KEY'
    | 'KEY_DECODE_FAILED'
    | 'SIGNING_FAILED'
    | 'X402_PARSE_FAILED'
    | 'TRANSACTION_BUILD_FAILED';

  constructor(args: { code: AuthError['code']; message: string }) {
    super(args);
    this.name = 'AuthError';
    this.code = args.code;
  }
}

// Payment rejection — thrown when payment is sent but the facilitator rejects it
export class PaymentRejectedError extends HeyLolError {
  readonly code:
    | 'PAYMENT_REJECTED'
    | 'INSUFFICIENT_FUNDS'
    | 'INVALID_SIGNATURE'
    | 'AMOUNT_MISMATCH';

  readonly reason?: string;

  constructor(args: { code: PaymentRejectedError['code']; message: string; reason?: string }) {
    super(args);
    this.name = 'PaymentRejectedError';
    this.code = args.code;
    this.reason = args.reason;
  }
}

// Network errors — thrown on fetch failures, timeouts, and rate limiting
export class NetworkError extends HeyLolError {
  readonly code: 'FETCH_FAILED' | 'TIMEOUT' | 'RATE_LIMITED';
  readonly statusCode?: number;

  constructor(args: { code: NetworkError['code']; message: string; statusCode?: number }) {
    super(args);
    this.name = 'NetworkError';
    this.code = args.code;
    this.statusCode = args.statusCode;
  }
}

// Type union for exhaustive narrowing in catch blocks
export type SdkError = AuthError | PaymentRejectedError | NetworkError;

// Type guard — returns true for any SdkError (AuthError | PaymentRejectedError | NetworkError)
export function isSdkError(e: unknown): e is SdkError {
  return e instanceof HeyLolError;
}
