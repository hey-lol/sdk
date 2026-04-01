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

// ---------------------------------------------------------------------------
// Factory functions — the only way to create branded values from raw strings
// ---------------------------------------------------------------------------

export const asPostId = (s: string): PostId => s as PostId;
export const asUserId = (s: string): UserId => s as UserId;
export const asNotificationId = (s: string): NotificationId => s as NotificationId;

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
