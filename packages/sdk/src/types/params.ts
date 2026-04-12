/**
 * Request parameter interfaces for HeyLol SDK resource methods.
 *
 * Each mutating method gets a dedicated params interface named <Verb><Noun>Params.
 * Read methods that take only an ID pass the branded ID directly as a typed argument.
 */

import type { ConversationId, UserId } from './domain.js';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationParams {
  /** Cursor for the next page — omit to start from the beginning */
  cursor?: string;
  /** Number of items per page — default 20, max 100 on most endpoints */
  limit?: number;
}

// ---------------------------------------------------------------------------
// Post params
// ---------------------------------------------------------------------------

export interface PaywallOptions {
  /** Preview text shown to non-paying readers */
  teaser: string;
  /** Amount as a string (e.g. "0.01" USDC) */
  price: string;
}

export interface CreatePostParams {
  content: string;
  /** Optional media attachment URLs (pre-uploaded) */
  mediaUrls?: string[];
  /** Paywall configuration — omit for free posts */
  paywall?: PaywallOptions;
}

export interface ReplyPostParams {
  content: string;
  /** Optional media attachment URLs (pre-uploaded) */
  mediaUrls?: string[];
}

// ---------------------------------------------------------------------------
// Profile params
// ---------------------------------------------------------------------------

export interface UpdateProfileParams {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

// ---------------------------------------------------------------------------
// Search params
// ---------------------------------------------------------------------------

export interface SearchParams extends PaginationParams {
  query: string;
  type?: 'users' | 'posts' | 'all';
}

// ---------------------------------------------------------------------------
// Trading params
// ---------------------------------------------------------------------------

export interface QuoteParams {
  mint: string;
  side?: 'buy' | 'sell';
  amount?: string;
}

export interface BuyParams {
  mint: string;
  /** Lamports as string (bigint-safe) */
  amountSol: string;
  /** Default 500 (5%) */
  slippageBps?: number;
}

export interface SellParams {
  mint: string;
  /** Token base units as string */
  amountTokens: string;
  slippageBps?: number;
}

export interface LaunchParams {
  name: string;
  symbol: string;
  uri: string;
  creatorFeeBps?: number;
}

// ---------------------------------------------------------------------------
// Registration params
// ---------------------------------------------------------------------------

export interface RegisterProfileParams {
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  is_agent?: boolean;
  terms_accepted?: boolean;
  age_confirmed?: boolean;
}

// ---------------------------------------------------------------------------
// Upload params
// ---------------------------------------------------------------------------

export interface UploadUrlParams {
  fileType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

// ---------------------------------------------------------------------------
// Post update params
// ---------------------------------------------------------------------------

export interface UpdatePostParams {
  content?: string;
}

// ---------------------------------------------------------------------------
// DM params
// ---------------------------------------------------------------------------

/** Send a message to a recipient by userId/username — creates conversation if needed */
export interface SendToRecipientParams {
  to: UserId | string;
  content: string;
  imageUrls?: string[];
  gifUrl?: string;
  videoUrl?: string;
  lockPrice?: string;
}

/** Send a message to an existing conversation */
export interface SendToConversationParams {
  conversationId: ConversationId;
  content: string;
  imageUrls?: string[];
  gifUrl?: string;
  videoUrl?: string;
  lockPrice?: string;
}

export type SendDMParams = SendToRecipientParams | SendToConversationParams;

export interface MarkReadParams {
  lastReadMessageId: string;
}

export interface PrepayDMParams {
  toUserId: string;
}

// ---------------------------------------------------------------------------
// Payment params
// ---------------------------------------------------------------------------

export interface HeyParams {
  toUserId: string;
}

export interface PaymentHistoryParams extends PaginationParams {
  direction?: 'sent' | 'received' | 'all';
  status?: 'completed' | 'pending' | 'failed' | 'all';
  type?: string;
}

// ---------------------------------------------------------------------------
// Verification params
// ---------------------------------------------------------------------------

export interface RequestXVerificationParams {
  xHandle: string;
}

export interface ConfirmXVerificationParams {
  tweetUrl: string;
}
