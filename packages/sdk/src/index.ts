export const VERSION = '1.0.0';

export type { Keypair } from './auth/index.js';
// Auth
export {
  buildDummyTransaction,
  buildPaymentHeader,
  getPaymentVersion,
  loadKeypair,
  PAYMENT_HEADERS,
  parsePaymentRequirements,
} from './auth/index.js';
export type { SdkError } from './errors/index.js';
// Errors
export {
  AuthError,
  HeyLolError,
  isSdkError,
  NetworkError,
  PaymentRejectedError,
} from './errors/index.js';

// Types
export type {
  PaymentHeader,
  PaymentPayload,
  PaymentRequirements,
} from './types/index.js';
