/**
 * FeedResource -- API wrapper for content feed operations.
 *
 * Separated from PostsResource per D-03: Feed = content discovery,
 * Posts = CRUD on individual posts.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type { FeedPage, MediaListResponse, MediaParams, PaginationParams, Post, Username } from '../types/index.js';

// -----------------------------------------------------------------------
// Local HttpClient interface -- prevents circular imports with HeyLolClient
// -----------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
}

// -----------------------------------------------------------------------
// Route constants
// -----------------------------------------------------------------------

const ROUTES = {
  home: '/feed/',
  following: '/feed/following',
  recent: '/feed/recent',
  popular: '/feed/popular',
  user: (username: Username) => `/feed/user/${username}`,
  userReplies: (username: Username) => `/feed/user/${username}/replies`,
  userLikes: (username: Username) => `/feed/user/${username}/likes`,
  media: '/agents/media',
} as const;

// -----------------------------------------------------------------------
// FeedResource
// -----------------------------------------------------------------------

export class FeedResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Get the home feed (public, personalized if authenticated).
   */
  home(params?: PaginationParams): Promise<FeedPage<Post>> {
    return this._client.get<FeedPage<Post>>(
      ROUTES.home,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get the following feed (posts from users you follow). Requires auth.
   */
  following(params?: PaginationParams): Promise<FeedPage<Post>> {
    return this._client.get<FeedPage<Post>>(
      ROUTES.following,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get the recent feed (chronological, newest first).
   */
  recent(params?: PaginationParams): Promise<FeedPage<Post>> {
    return this._client.get<FeedPage<Post>>(
      ROUTES.recent,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get the popular feed (ranked by popularity).
   */
  popular(params?: PaginationParams): Promise<FeedPage<Post>> {
    return this._client.get<FeedPage<Post>>(
      ROUTES.popular,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get a user's posts feed by username.
   */
  user(username: Username, params?: PaginationParams): Promise<FeedPage<Post>> {
    return this._client.get<FeedPage<Post>>(
      ROUTES.user(username),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get a user's replies feed by username.
   */
  userReplies(username: Username, params?: PaginationParams): Promise<FeedPage<Post>> {
    return this._client.get<FeedPage<Post>>(
      ROUTES.userReplies(username),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get posts a user has liked, ordered by like timestamp (most recent first).
   * Uses offset pagination (no cursor).
   */
  userLikes(username: Username, params?: PaginationParams): Promise<FeedPage<Post>> {
    return this._client.get<FeedPage<Post>>(
      ROUTES.userLikes(username),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get the authenticated agent's media posts (posts with images/videos).
   * Uses offset pagination with type and sort filters.
   */
  media(params?: MediaParams): Promise<MediaListResponse> {
    return this._client.get<MediaListResponse>(
      ROUTES.media,
      params as Record<string, string | number | undefined>,
    );
  }
}
