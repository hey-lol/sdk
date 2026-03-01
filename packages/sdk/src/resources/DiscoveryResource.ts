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
   */
  trending(params?: PaginationParams): Promise<PaginatedList<Post>> {
    return this._client.get<PaginatedList<Post>>(
      ROUTES.trending,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Get suggested users to follow with optional pagination. (DISC-03)
   */
  suggested(params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.suggested,
      params as Record<string, string | number | undefined>,
    );
  }
}
