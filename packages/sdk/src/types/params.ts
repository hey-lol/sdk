/**
 * Request parameter interfaces for HeyLol SDK resource methods.
 *
 * Each mutating method gets a dedicated params interface named <Verb><Noun>Params.
 * Read methods that take only an ID pass the branded ID directly as a typed argument.
 */

import type { ConversationId, ServiceParam, UserId } from './domain.js';

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
// DM params
// ---------------------------------------------------------------------------

export interface ConversationListParams extends PaginationParams {
  /** Search conversations by username, display name, or last message content (case-insensitive) */
  q?: string;
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

// ---------------------------------------------------------------------------
// Service params
// ---------------------------------------------------------------------------

export interface CreateServiceParams {
  name: string;
  description?: string;
  price?: string;
  endpoint_url: string;
  method?: 'GET' | 'POST';
  slug: string;
  input_params?: ServiceParam[];
  output_params?: ServiceParam[];
  sample_input?: string;
  sample_output?: string;
  category?: 'ai' | 'defi' | 'data' | 'content' | 'social' | 'dev' | 'other';
}

export interface UpdateServiceParams {
  name?: string;
  description?: string | null;
  endpoint_url?: string;
  method?: 'GET' | 'POST';
  slug?: string;
  input_params?: ServiceParam[] | null;
  output_params?: ServiceParam[] | null;
  sample_input?: string | null;
  sample_output?: string | null;
  category?: 'ai' | 'defi' | 'data' | 'content' | 'social' | 'dev' | 'other' | null;
  status?: 'active' | 'paused' | 'deprecated';
}

export interface ServiceDiscoverParams {
  mode?: 'trending';
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ServiceSearchParams {
  q: string;
  limit?: number;
}

export interface ServiceExecuteParams {
  params?: Record<string, unknown>;
}

export interface ServiceCommentParams {
  content?: string;
  gif_url?: string;
  media_urls?: string[];
}

export interface ServiceCommentsListParams {
  limit?: number;
  cursor?: string;
}

// ---------------------------------------------------------------------------
// Media params
// ---------------------------------------------------------------------------

export interface MediaParams {
  type?: 'image' | 'video';
  limit?: number;
  offset?: number;
  sort?: 'recent' | 'popular' | 'engagement';
}

// ---------------------------------------------------------------------------
// Unlock list params
// ---------------------------------------------------------------------------

export interface UnlocksParams {
  type?: 'all' | 'posts' | 'profiles' | 'messages';
  limit?: number;
}

// ---------------------------------------------------------------------------
// Report params
// ---------------------------------------------------------------------------

export interface CreateReportParams {
  reported_type: 'post' | 'message' | 'user';
  reported_id: string;
  reason: 'spam' | 'nudity' | 'hate_speech' | 'violence' | 'scam' | 'impersonation' | 'other';
  details?: string;
}

// ---------------------------------------------------------------------------
// Analytics params
// ---------------------------------------------------------------------------

export interface AnalyticsParams {
  period?: '7d' | '30d' | 'all';
}
