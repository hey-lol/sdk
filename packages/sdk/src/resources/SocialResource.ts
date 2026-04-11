/**
 * SocialResource — API wrapper for social graph operations.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type { PaginatedList, PaginationParams, User, Username } from '../types/index.js';

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
  follow: (username: Username) => `/users/${username}/follow`,
  followers: (username: Username) => `/users/${username}/followers`,
  following: (username: Username) => `/users/${username}/following`,
  block: (username: Username) => `/users/${username}/block`,
  blocks: '/users/blocks',
  suggestions: '/suggestions/',
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
   * Follow a user by username. (SOCL-01)
   *
   * @param username - Username of the user to follow
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUsername } from '@heylol/sdk';
   *
   * await client.social.follow(asUsername('alice'));
   * ```
   */
  follow(username: Username): Promise<void> {
    return this._client.post<void>(ROUTES.follow(username));
  }

  /**
   * Unfollow a user by username. (SOCL-02)
   *
   * @param username - Username of the user to unfollow
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUsername } from '@heylol/sdk';
   *
   * await client.social.unfollow(asUsername('alice'));
   * ```
   */
  unfollow(username: Username): Promise<void> {
    return this._client.delete<void>(ROUTES.follow(username));
  }

  /**
   * List a user's followers with optional pagination. (SOCL-03)
   *
   * @param username - Username of the user whose followers to list
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of users following the given user
   *
   * @example
   * ```ts
   * import { asUsername } from '@heylol/sdk';
   *
   * const page1 = await client.social.followers(asUsername('alice'), { limit: 20 });
   * const page2 = await client.social.followers(asUsername('alice'), {
   *   cursor: page1.nextCursor,
   *   limit: 20,
   * });
   * ```
   */
  followers(username: Username, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.followers(username),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * List users that a user is following with optional pagination. (SOCL-04)
   *
   * @param username - Username of the user whose following list to retrieve
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of users that the given user follows
   *
   * @example
   * ```ts
   * import { asUsername } from '@heylol/sdk';
   *
   * const following = await client.social.following(asUsername('alice'), { limit: 20 });
   * ```
   */
  following(username: Username, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.following(username),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Block a user by username. (SOCL-05)
   *
   * @param username - Username of the user to block
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUsername } from '@heylol/sdk';
   *
   * await client.social.block(asUsername('bob'));
   * ```
   */
  block(username: Username): Promise<void> {
    return this._client.post<void>(ROUTES.block(username));
  }

  /**
   * Unblock a user by username. (SOCL-06)
   *
   * @param username - Username of the user to unblock
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUsername } from '@heylol/sdk';
   *
   * await client.social.unblock(asUsername('bob'));
   * ```
   */
  unblock(username: Username): Promise<void> {
    return this._client.delete<void>(ROUTES.block(username));
  }

  /**
   * List blocked users. (SOCL-07)
   *
   * @returns Paginated list of blocked users
   *
   * @example
   * ```ts
   * const blocked = await client.social.blocks();
   * for (const user of blocked.items) {
   *   console.log(user.username);
   * }
   * ```
   */
  blocks(): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(ROUTES.blocks);
  }

  /**
   * Get follow suggestions. (SOCL-08)
   *
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of suggested users to follow
   *
   * @example
   * ```ts
   * const suggested = await client.social.suggestions({ limit: 5 });
   * for (const user of suggested.items) {
   *   console.log(user.username);
   * }
   * ```
   */
  suggestions(params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(
      ROUTES.suggestions,
      params as Record<string, string | number | undefined>,
    );
  }
}
