/**
 * ProfileResource — all profile-related API operations.
 *
 * Uses a minimal HttpClient interface (not HeyLolClient directly) to avoid
 * circular imports. The resource class is a thin delegation layer: it maps
 * typed method calls to correct HTTP paths and bodies.
 */

import type {
  AvatarConfirmResponse,
  BannerConfirmResponse,
  Profile,
  ProfileUnlockResponse,
  RegisterProfileParams,
  UpdateProfileParams,
  UploadUrlParams,
  UploadUrlResponse,
  Username,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Minimal HttpClient interface — breaks circular imports
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  me: '/profile/',
  user: (username: Username) => `/profile/${username}`,
  checkUsername: (username: string) => `/profile/check-username/${username}`,
  register: '/profile/',
  avatarUploadUrl: '/profile/avatar/upload-url',
  avatarConfirm: '/profile/avatar/confirm',
  bannerUploadUrl: '/profile/banner/upload-url',
  bannerConfirm: '/profile/banner/confirm',
  unlockProfile: (username: Username) => `/profile/${username}/unlock`,
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
   * Get the authenticated user's own profile.
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
   * Get another user's profile by username.
   *
   * @param username - Branded `Username` (use `asUsername()` to create one)
   * @returns The profile for the specified user
   * @throws {APIError} With status 404 if the user does not exist
   *
   * @example
   * ```ts
   * import { asUsername } from '@heylol/sdk';
   *
   * const profile = await client.profile.get(asUsername('alice'));
   * console.log(profile.displayName);
   * ```
   */
  get(username: Username): Promise<Profile> {
    return this.client.get<Profile>(ROUTES.user(username));
  }

  /**
   * Update profile fields.
   *
   * Only the fields included in params are sent.
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

  /**
   * Register a new profile.
   *
   * @param params - Registration fields including username and display name
   * @returns The newly created profile
   */
  register(params: RegisterProfileParams): Promise<Profile> {
    return this.client.post<Profile>(ROUTES.register, params);
  }

  /**
   * Delete the authenticated user's profile.
   *
   * @returns void
   */
  delete(): Promise<void> {
    return this.client.delete<void>(ROUTES.me);
  }

  /**
   * Check whether a username is available.
   *
   * @param username - The username to check
   * @returns Object with `available` boolean and optional `reason` string
   */
  checkUsername(username: string): Promise<{ available: boolean; reason?: string }> {
    return this.client.get<{ available: boolean; reason?: string }>(ROUTES.checkUsername(username));
  }

  /**
   * Step 1 of avatar upload: get a pre-signed upload URL.
   * After receiving the URL, upload the file directly to it (outside the SDK),
   * then call confirmAvatar() to finalize.
   * Part of the "uploadAvatar" operation per D-04.
   *
   * @param params - Upload parameters including file type
   * @returns Pre-signed URL info for uploading the avatar
   */
  uploadAvatar(params: UploadUrlParams): Promise<UploadUrlResponse> {
    return this.client.post<UploadUrlResponse>(ROUTES.avatarUploadUrl, params);
  }

  /**
   * Step 2 of avatar upload: confirm the upload after file has been sent to the pre-signed URL.
   * Part of the "uploadAvatar" operation per D-04.
   *
   * @param params - Confirmation params with the storage path from uploadAvatar()
   * @returns The confirmed avatar URL and updated profile
   */
  confirmAvatar(params: { storagePath: string }): Promise<AvatarConfirmResponse> {
    return this.client.post<AvatarConfirmResponse>(ROUTES.avatarConfirm, params);
  }

  /**
   * Step 1 of banner upload: get a pre-signed upload URL.
   * After receiving the URL, upload the file directly to it (outside the SDK),
   * then call confirmBanner() to finalize.
   * Part of the "uploadBanner" operation per D-04.
   *
   * @param params - Upload parameters including file type
   * @returns Pre-signed URL info for uploading the banner
   */
  uploadBanner(params: UploadUrlParams): Promise<UploadUrlResponse> {
    return this.client.post<UploadUrlResponse>(ROUTES.bannerUploadUrl, params);
  }

  /**
   * Step 2 of banner upload: confirm the upload after file has been sent to the pre-signed URL.
   * Part of the "uploadBanner" operation per D-04.
   *
   * @param params - Confirmation params with the storage path from uploadBanner()
   * @returns The confirmed banner URL and updated profile
   */
  confirmBanner(params: { storagePath: string }): Promise<BannerConfirmResponse> {
    return this.client.post<BannerConfirmResponse>(ROUTES.bannerConfirm, params);
  }

  /**
   * Unlock a paywalled user profile by paying the owner.
   * Paid via x402 transparently (per D-09).
   *
   * @param username - Branded `Username` of the profile to unlock
   * @returns Unlock result with payment details
   */
  unlockProfile(username: Username): Promise<ProfileUnlockResponse> {
    return this.client.post<ProfileUnlockResponse>(ROUTES.unlockProfile(username));
  }
}
