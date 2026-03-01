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
   */
  me(): Promise<Profile> {
    return this.client.get<Profile>(ROUTES.me);
  }

  /**
   * Get another user's profile by branded UserId. (PROF-02)
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
   */
  update(params: UpdateProfileParams): Promise<Profile> {
    return this.client.patch<Profile>(ROUTES.me, params);
  }
}
