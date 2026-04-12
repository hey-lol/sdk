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
  CredentialResource,
  DiscoveryResource,
  DMResource,
  FeedResource,
  NotificationsResource,
  OnboardingResource,
  PaymentsResource,
  PostsResource,
  ProfileResource,
  ServicesResource,
  SocialResource,
  TradingResource,
  VerificationResource,
} from './resources/index.js';
// Types — branded ID types (type-only export)
// Types — request param interfaces
// Types — x402 protocol
export type {
  AvatarConfirmResponse,
  BannerConfirmResponse,
  BuildTxResponse,
  BuyParams,
  ConfirmXVerificationParams,
  Conversation,
  ConversationId,
  ConversationListResponse,
  CreatePostParams,
  CredentialRegisterResult,
  FeedPage,
  HeyParams,
  LaunchParams,
  LikeStatusResponse,
  MarkReadParams,
  Message,
  MessageId,
  MessageListResponse,
  MessageUnlockResponse,
  Notification,
  NotificationId,
  OnboardingState,
  OnboardingStep,
  PaginatedList,
  PaginationParams,
  Payment,
  PaymentHeader,
  PaymentHistoryParams,
  PaymentHistoryResponse,
  PaymentPayload,
  PaymentRequirements,
  PaymentResult,
  PaywallOptions,
  PaywallUnlockResponse,
  Post,
  PostId,
  PrepayDMParams,
  Profile,
  QuoteParams,
  QuoteResult,
  RegisterProfileParams,
  ReplyPostParams,
  RequestXVerificationParams,
  SearchParams,
  SearchResults,
  SellParams,
  SendDMParams,
  SendToConversationParams,
  SendToRecipientParams,
  TradeResult,
  UpdatePostParams,
  UpdateProfileParams,
  UploadUrlParams,
  UploadUrlResponse,
  User,
  UserId,
  Username,
  VerifyResponse,
  XVerificationConfirmResponse,
  XVerificationRequestResponse,
} from './types/index.js';
// Types — factory functions (value exports)
export { asConversationId, asMessageId, asNotificationId, asPostId, asUserId, asUsername } from './types/index.js';
