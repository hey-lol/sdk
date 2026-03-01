/**
 * Request parameter interfaces for HeyLol SDK resource methods.
 *
 * Each mutating method gets a dedicated params interface named <Verb><Noun>Params.
 * Read methods that take only an ID pass the branded ID directly as a typed argument.
 */

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
