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
// Client
export type { ClientOptions, ResolvedOptions } from './client/index.js';
export { DEFAULT_OPTIONS, HeyLolClient } from './client/index.js';
export type { SdkError } from './errors/index.js';
// Errors
export {
  APIError,
  AuthError,
  HeyLolError,
  isSdkError,
  NetworkError,
  PaymentRejectedError,
  RateLimitError,
} from './errors/index.js';
// Types
export type {
  PaymentHeader,
  PaymentPayload,
  PaymentRequirements,
  Post,
  Profile,
  User,
} from './types/index.js';
