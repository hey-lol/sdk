/**
 * SocialResource — API wrapper for social graph operations.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type { PaginatedList, PaginationParams, User, UserId } from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface — prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  follow: (id: UserId) => `/users/${id}/follow`,
  followers: (id: UserId) => `/users/${id}/followers`,
  following: (id: UserId) => `/users/${id}/following`,
} as const;

// ---------------------------------------------------------------------------
// SocialResource
// ---------------------------------------------------------------------------

export class SocialResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Follow a user by branded UserId. (SOCL-01)
   */
  follow(id: UserId): Promise<void> {
    return this._client.post<void>(ROUTES.follow(id));
  }

  /**
   * Unfollow a user by branded UserId. (SOCL-02)
   */
  unfollow(id: UserId): Promise<void> {
    return this._client.delete<void>(ROUTES.follow(id));
  }

  /**
   * List a user's followers with optional pagination. (SOCL-03)
   */
  followers(id: UserId, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.followers(id),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * List users that a user is following with optional pagination. (SOCL-04)
   */
  following(id: UserId, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.following(id),
      params as Record<string, string | number | undefined>,
    );
  }
}
