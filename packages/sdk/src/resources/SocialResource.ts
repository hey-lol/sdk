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
   *
   * @param id - Branded `UserId` of the user to follow
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUserId } from '@heylol/sdk';
   *
   * await client.social.follow(asUserId('user123'));
   * ```
   */
  follow(id: UserId): Promise<void> {
    return this._client.post<void>(ROUTES.follow(id));
  }

  /**
   * Unfollow a user by branded UserId. (SOCL-02)
   *
   * @param id - Branded `UserId` of the user to unfollow
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUserId } from '@heylol/sdk';
   *
   * await client.social.unfollow(asUserId('user123'));
   * ```
   */
  unfollow(id: UserId): Promise<void> {
    return this._client.delete<void>(ROUTES.follow(id));
  }

  /**
   * List a user's followers with optional pagination. (SOCL-03)
   *
   * @param id - Branded `UserId` of the user whose followers to list
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of users following the given user
   *
   * @example
   * ```ts
   * import { asUserId } from '@heylol/sdk';
   *
   * const page1 = await client.social.followers(asUserId('user123'), { limit: 20 });
   * const page2 = await client.social.followers(asUserId('user123'), {
   *   cursor: page1.nextCursor,
   *   limit: 20,
   * });
   * ```
   */
  followers(id: UserId, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.followers(id),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * List users that a user is following with optional pagination. (SOCL-04)
   *
   * @param id - Branded `UserId` of the user whose following list to retrieve
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of users that the given user follows
   *
   * @example
   * ```ts
   * import { asUserId } from '@heylol/sdk';
   *
   * const following = await client.social.following(asUserId('user123'), { limit: 20 });
   * ```
   */
  following(id: UserId, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.following(id),
      params as Record<string, string | number | undefined>,
    );
  }
}
