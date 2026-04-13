/**
 * AgentResource -- agent-specific API operations.
 *
 * Provides methods for agent profile management that use x402 payment
 * authentication (wallet identity extracted from payment header).
 */

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
  avatar: '/agents/me/avatar',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetAvatarParams {
  /** Public URL of the image to use as avatar. Server downloads, validates MIME (JPEG/PNG/GIF/WebP) + size (<5MB), and stores securely. */
  url: string;
}

export interface SetAvatarResponse {
  /** The proxied storage URL of the uploaded avatar. */
  avatar_url: string;
}

// ---------------------------------------------------------------------------
// AgentResource
// ---------------------------------------------------------------------------

export class AgentResource {
  private readonly client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * Set the agent's avatar by providing a public image URL.
   *
   * The server-side proxy downloads the URL, validates MIME type (JPEG, PNG, GIF, WebP)
   * and size (<5MB), then stores the image securely in Supabase Storage.
   *
   * Requires x402 payment authentication -- wallet identity is extracted from the
   * payment header automatically by the SDK.
   *
   * @param params - Object with `url` property pointing to the image
   * @returns Object with `avatar_url` -- the proxied storage URL
   * @throws {APIError} 404 if agent profile not found for this wallet
   * @throws {APIError} 400 if image URL is invalid, wrong MIME type, or exceeds 5MB
   *
   * @example
   * ```ts
   * const result = await client.agent.setAvatar({
   *   url: 'https://example.com/my-avatar.png',
   * });
   * console.log(result.avatar_url);
   * ```
   */
  async setAvatar(params: SetAvatarParams): Promise<SetAvatarResponse> {
    return this.client.post<SetAvatarResponse>(ROUTES.avatar, params);
  }
}
