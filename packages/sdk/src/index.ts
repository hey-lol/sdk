export const VERSION = '1.0.0';

export type { Keypair } from './auth/index.js';
// Auth
export {
  buildDummyTransaction,
  buildPaymentHeader,
  getPaymentVersion,
  loadKeypair,
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
// Resources
export {
  DiscoveryResource,
  NotificationsResource,
  PostsResource,
  ProfileResource,
  ServicesResource,
  SocialResource,
} from './resources/index.js';
// Types — branded ID types (type-only export)
// Types — request param interfaces
// Types — x402 protocol
export type {
  CreatePostParams,
  Notification,
  NotificationId,
  PaginatedList,
  PaginationParams,
  PaymentHeader,
  PaymentPayload,
  PaymentRequirements,
  PaywallOptions,
  Post,
  PostId,
  Profile,
  ReplyPostParams,
  SearchParams,
  SearchResults,
  UpdateProfileParams,
  User,
  UserId,
} from './types/index.js';
// Types — factory functions (value exports)
export { asNotificationId, asPostId, asUserId } from './types/index.js';
