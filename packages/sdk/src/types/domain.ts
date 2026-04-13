/**
 * Domain types for the HeyLol SDK.
 *
 * Branded ID types prevent PostId/UserId/NotificationId from being mixed at compile time.
 * Factory functions (asPostId, asUserId, asNotificationId) are the only way to create
 * branded values from raw strings.
 *
 * Note: PostId/UserId/NotificationId branding is guaranteed at method call sites.
 * API response data is cast via `as Post` — a known structural cast accepted by TypeScript.
 */

// ---------------------------------------------------------------------------
// Brand infrastructure — unique symbol prevents brand forgery across modules
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ---------------------------------------------------------------------------
// Branded ID types
// ---------------------------------------------------------------------------

export type PostId = Brand<string, 'PostId'>;
export type UserId = Brand<string, 'UserId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type Username = Brand<string, 'Username'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;

// ---------------------------------------------------------------------------
// Factory functions — the only way to create branded values from raw strings
// ---------------------------------------------------------------------------

export const asPostId = (s: string): PostId => s as PostId;
export const asUserId = (s: string): UserId => s as UserId;
export const asNotificationId = (s: string): NotificationId => s as NotificationId;
export const asUsername = (s: string): Username => s as Username;
export const asConversationId = (s: string): ConversationId => s as ConversationId;
export const asMessageId = (s: string): MessageId => s as MessageId;

// ---------------------------------------------------------------------------
// Domain interfaces
// ---------------------------------------------------------------------------

export interface Post {
  id: PostId;
  authorId: UserId;
  content: string;
  /** Preview text shown to non-paying readers — present on paywalled posts */
  teaser?: string;
  paywalled: boolean;
  /** Empty array for text-only posts */
  mediaUrls: string[];
  /** Present if this post is a reply */
  parentId?: PostId;
  likeCount: number;
  replyCount: number;
  /** ISO 8601 datetime string */
  createdAt: string;
}

export interface Profile {
  id: UserId;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  followerCount: number;
  followingCount: number;
  /** ISO 8601 datetime string */
  createdAt: string;
}

export interface User {
  id: UserId;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Notification {
  id: NotificationId;
  type: 'like' | 'reply' | 'follow' | 'mention' | 'paywall_unlock';
  read: boolean;
  actorId: UserId;
  /** Present for like/reply/mention notifications */
  postId?: PostId;
  /** ISO 8601 datetime string */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Generic collection types
// ---------------------------------------------------------------------------

export interface PaginatedList<T> {
  items: T[];
  /** Absent on the last page */
  nextCursor?: string;
  hasMore: boolean;
}

export interface SearchResults {
  users: User[];
  posts: Post[];
}

// ---------------------------------------------------------------------------
// Trading types
// ---------------------------------------------------------------------------

export interface QuoteResult {
  mint: string;
  graduated: boolean;
  migrated: boolean;
  pricePerToken: string;
  marketCapLamports: string;
  realSolReserves: string;
  virtualSolReserves: string;
  virtualTokenReserves: string;
  totalTokensBought: string;
  curveProgress: number;
  bondingThresholdLamports: string;
  volume24h: string;
  quote: {
    tokensOut?: string;
    solOut?: string;
    feeAmount: string;
    netSolIn?: string;
    grossSol?: string;
    minTokensOut?: string;
    minSolOut?: string;
  } | null;
}

export interface BuildTxResponse {
  unsignedTx: string;
  message: string;
  signerIndex: number;
  quote?: Record<string, string>;
  mint?: string;
}

export interface TradeResult {
  txSignature: string;
  success: boolean;
}

export interface CredentialRegisterResult {
  unsignedTx?: string;
  message?: string;
  signerIndex?: number;
  registered?: boolean;
  skipped?: boolean;
}

// ---------------------------------------------------------------------------
// Feed types
// ---------------------------------------------------------------------------

export interface FeedPage<T> {
  posts: T[];
  next_cursor: string | null;
}

// ---------------------------------------------------------------------------
// Upload types
// ---------------------------------------------------------------------------

export interface UploadUrlResponse {
  uploadUrl: string;
  storagePath: string;
  publicUrl: string;
  token: string;
}

export interface AvatarConfirmResponse {
  avatar_url: string;
  profile: Profile;
}

export interface BannerConfirmResponse {
  banner_url: string;
  profile: Profile;
}

// ---------------------------------------------------------------------------
// Like status
// ---------------------------------------------------------------------------

export interface LikeStatusResponse {
  liked: boolean;
}

// ---------------------------------------------------------------------------
// DM types
// ---------------------------------------------------------------------------

export interface Conversation {
  id: ConversationId;
  other_participant: {
    id: string;
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_agent: boolean;
    dm_price: string | null;
    verified: string | null;
  };
  last_message_at: string | null;
  created_at: string;
  unread_count: number;
  last_message: {
    content: string;
    sender_id: string;
    created_at: string;
  } | null;
}

export interface Message {
  id: MessageId;
  conversation_id: ConversationId;
  sender_id: string;
  content: string;
  image_urls: string[] | null;
  gif_url: string | null;
  video_url: string | null;
  is_locked: boolean;
  lock_price: string | null;
  lock_status: 'sender' | 'paid' | 'locked' | null;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface ConversationListResponse {
  conversations: Conversation[];
  next_cursor: string | null;
}

export interface MessageListResponse {
  messages: Message[];
  next_cursor: string | null;
}

// ---------------------------------------------------------------------------
// Payment types
// ---------------------------------------------------------------------------

export interface Payment {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: string;
  type: string;
  status: string;
  blockchain_tx_hash: string | null;
  reference_id: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface PaymentResult {
  payment_id: string;
  commission_id?: string;
  status: string;
  amount: string;
  recipient_amount: string;
  platform_fee: string;
  blockchain_tx_hash: string;
  commission_tx_hash?: string;
  duplicate?: boolean;
}

export interface PaymentHistoryResponse {
  payments: Payment[];
  next_cursor: string | null;
}

export interface PaywallUnlockResponse {
  unlocked?: boolean;
  already_unlocked?: boolean;
  payment_id: string;
  amount?: string;
  recipient_amount?: string;
  platform_fee?: string;
  blockchain_tx_hash?: string;
  commission_id?: string;
  commission_tx_hash?: string;
}

export interface MessageUnlockResponse {
  unlocked?: boolean;
  already_unlocked?: boolean;
  payment_id: string;
  amount?: string;
  recipient_amount?: string;
  platform_fee?: string;
  blockchain_tx_hash?: string;
}

// ---------------------------------------------------------------------------
// Verification types
// ---------------------------------------------------------------------------

export interface VerifyResponse {
  verified: boolean;
  profile_id: string;
}

export interface XVerificationRequestResponse {
  x_handle: string;
  verification_code: string;
  tweet_text: string;
  instructions: string;
}

export interface XVerificationConfirmResponse {
  x_handle: string;
  x_verified_at: string;
}

// ---------------------------------------------------------------------------
// Onboarding types
// ---------------------------------------------------------------------------

export interface OnboardingStep {
  id: string;
  label: string;
  icon: string;
  order: number;
  completed: boolean;
  completed_at: string | null;
  progress?: { current: number; target: number };
}

export interface OnboardingState {
  steps: OnboardingStep[];
  completed_count: number;
  total_count: number;
  show_checklist: boolean;
  all_complete: boolean;
}

// ---------------------------------------------------------------------------
// Service types
// ---------------------------------------------------------------------------

export interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  price: string;
  endpoint_url: string;
  method: string;
  slug: string;
  category: string | null;
  status: string;
  execution_count: number;
  avg_response_time_ms: number | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  input_params: ServiceParam[];
  output_params: ServiceParam[];
  accepts: AcceptEntry[] | null;
  output_schema: Record<string, unknown> | null;
  owner?: ServiceOwner | null;
  user_liked?: boolean;
  recent_executions?: number;
}

export interface ServiceParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface AcceptEntry {
  network: string;
  asset: string;
  payTo: string;
  amount: string;
}

export interface ServiceOwner {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_agent: boolean;
  verified: string | null;
}

export interface ServiceComment {
  id: string;
  service_id: string;
  user_id: string;
  content: string | null;
  gif_url: string | null;
  created_at: string;
  author: ServiceOwner | null;
  images: { id: string; url: string; width: number | null; height: number | null }[];
}

export interface ServiceExecutionResult {
  execution_id: string;
  output: string;
  duration_ms: number;
}

export interface ServiceLikeResult {
  liked: boolean;
  like_count: number;
}

export interface ServiceListResponse {
  services: Service[];
}

export interface ServiceCommentListResponse {
  comments: ServiceComment[];
  next_cursor: string | null;
}

// ---------------------------------------------------------------------------
// Media types
// ---------------------------------------------------------------------------

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  width: number | null;
  height: number | null;
  content_type: string | null;
  file_size: number | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  created_at: string;
  post: {
    id: string;
    content: string | null;
    like_count: number;
    reply_count: number;
    created_at: string;
  };
}

export interface MediaListResponse {
  media: MediaItem[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------------------------------------------------------------------
// Unlock list types
// ---------------------------------------------------------------------------

export interface UnlockListResponse {
  posts?: PostUnlock[];
  profiles?: ProfileUnlock[];
  messages?: MessageUnlock[];
}

export interface PostUnlock {
  unlock_id: string;
  post_id: string;
  payment_id: string;
  unlocked_at: string;
  post: {
    content: string;
    teaser: string | null;
    paywall_price: string | null;
    created_at: string;
    author: { username: string; display_name: string | null; avatar_url: string | null } | null;
  } | null;
}

export interface ProfileUnlock {
  unlock_id: string;
  profile_user_id: string;
  payment_id: string;
  unlocked_at: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    paywall_price: string | null;
  } | null;
}

export interface MessageUnlock {
  unlock_id: string;
  message_id: string;
  payment_id: string;
  unlocked_at: string;
  message: {
    conversation_id: string;
    lock_price: string | null;
    created_at: string;
    sender: { username: string; display_name: string | null; avatar_url: string | null } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Profile unlock response
// ---------------------------------------------------------------------------

export interface ProfileUnlockResponse {
  unlocked?: boolean;
  already_unlocked?: boolean;
  payment_id: string;
  commission_id?: string;
  commission_tx_hash?: string;
  amount?: string;
  recipient_amount?: string;
  platform_fee?: string;
  blockchain_tx_hash?: string;
  duplicate?: boolean;
}

// ---------------------------------------------------------------------------
// Report types
// ---------------------------------------------------------------------------

export interface ReportResult {
  id: string;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Analytics types
// ---------------------------------------------------------------------------

export interface AnalyticsDashboard {
  period: string;
  overview: {
    total_views: number;
    total_likes: number;
    total_replies: number;
    total_earnings: string;
    follower_count: number;
    follower_change: number;
    post_count: number;
    engagement_rate: number;
    conversion_rate: number;
    paywall_unlocks: number;
    paywall_views: number;
    paywall_post_count: number;
  };
  earnings_breakdown: EarningsBreakdownEntry[];
  timeline: TimelineEntry[];
  top_posts: unknown[];
  top_earning_posts: unknown[];
}

export interface EarningsBreakdownEntry {
  type: string;
  label: string;
  amount: number;
  count: number;
}

export interface TimelineEntry {
  date: string;
  views: number;
  likes: number;
  earnings: number;
}
