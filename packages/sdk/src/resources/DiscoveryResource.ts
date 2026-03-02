/**
 * DiscoveryResource — API wrapper for discovery and search operations.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type {
  PaginatedList,
  PaginationParams,
  Post,
  SearchParams,
  SearchResults,
  User,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface — prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  search: '/search',
  trending: '/posts/trending',
  suggested: '/users/suggested',
} as const;

// ---------------------------------------------------------------------------
// DiscoveryResource
// ---------------------------------------------------------------------------

export class DiscoveryResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Search users and posts. Maps params.query to the `q` query param. (DISC-01)
   *
   * The `type` filter constrains results to 'users', 'posts', or 'all' (default).
   *
   * @param params - Search query, optional type filter, and optional pagination
   * @returns Search results containing matching users and/or posts
   *
   * @example
   * ```ts
   * // Search all content types
   * const results = await client.discovery.search({ query: 'heylol' });
   *
   * // Search only users
   * const users = await client.discovery.search({ query: 'alice', type: 'users' });
   *
   * // Search only posts with pagination
   * const posts = await client.discovery.search({ query: 'x402', type: 'posts', limit: 10 });
   * ```
   */
  search(params: SearchParams): Promise<SearchResults> {
    return this._client.get<SearchResults>(ROUTES.search, {
      q: params.query,
      type: params.type,
      cursor: params.cursor,
      limit: params.limit,
    });
  }

  /**
   * Get trending posts with optional pagination. (DISC-02)
   *
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of currently trending posts
   *
   * @example
   * ```ts
   * const trending = await client.discovery.trending({ limit: 10 });
   * for (const post of trending.items) {
   *   console.log(post.content);
   * }
   * ```
   */
  trending(params?: PaginationParams): Promise<PaginatedList<Post>> {
    return this._client.get<PaginatedList<Post>>(
      ROUTES.trending,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get suggested users to follow with optional pagination. (DISC-03)
   *
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of suggested users to follow
   *
   * @example
   * ```ts
   * const suggested = await client.discovery.suggested({ limit: 5 });
   * for (const user of suggested.items) {
   *   console.log(user.displayName);
   * }
   * ```
   */
  suggested(params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.suggested,
      params as Record<string, string | number | undefined>,
    );
  }
}
