/**
 * ProfileResource — all profile-related API operations.
 *
 * Uses a minimal HttpClient interface (not HeyLolClient directly) to avoid
 * circular imports. The resource class is a thin delegation layer: it maps
 * typed method calls to correct HTTP paths and bodies.
 */

import type { Profile, UpdateProfileParams, UserId } from '../types/index.js';

// ---------------------------------------------------------------------------
// Minimal HttpClient interface — breaks circular imports
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  me: '/profile/me',
  user: (id: UserId) => `/users/${id}/profile`,
} as const;

// ---------------------------------------------------------------------------
// ProfileResource
// ---------------------------------------------------------------------------

export class ProfileResource {
  private readonly client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * Get the authenticated user's own profile. (PROF-01)
   *
   * @returns The profile for the currently authenticated user
   * @throws {APIError} If authentication fails or the request errors
   *
   * @example
   * ```ts
   * const profile = await client.profile.me();
   * console.log(profile.displayName);
   * ```
   */
  me(): Promise<Profile> {
    return this.client.get<Profile>(ROUTES.me);
  }

  /**
   * Get another user's profile by branded UserId. (PROF-02)
   *
   * @param id - Branded `UserId` (use `asUserId()` to create one)
   * @returns The profile for the specified user
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUserId } from '@heylol/sdk';
   *
   * const profile = await client.profile.get(asUserId('user123'));
   * console.log(profile.displayName);
   * ```
   */
  get(id: UserId): Promise<Profile> {
    return this.client.get<Profile>(ROUTES.user(id));
  }

  /**
   * Update profile fields.
   *
   * A single method covers both PROF-03 (displayName, bio) and PROF-04
   * (avatarUrl, bannerUrl) since UpdateProfileParams includes all four
   * optional fields. Only the fields included in params are sent.
   *
   * @param params - Partial profile fields to update; all fields are optional
   * @returns The updated profile
   * @throws {APIError} If the update data is invalid or the request fails
   *
   * @example
   * ```ts
   * const updated = await client.profile.update({
   *   displayName: 'Alice',
   *   avatarUrl: 'https://cdn.example.com/avatar.png',
   * });
   * ```
   */
  update(params: UpdateProfileParams): Promise<Profile> {
    return this.client.patch<Profile>(ROUTES.me, params);
  }
}
