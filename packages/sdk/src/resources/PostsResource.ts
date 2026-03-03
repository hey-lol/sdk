/**
 * PostsResource — all post-related API operations.
 *
 * Uses a minimal HttpClient interface (not HeyLolClient directly) to avoid
 * circular imports. The resource class is a thin delegation layer: it maps
 * typed method calls to correct HTTP paths and bodies.
 */

import type {
  CreatePostParams,
  PaginatedList,
  PaginationParams,
  Post,
  PostId,
  ReplyPostParams,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Minimal HttpClient interface — breaks circular imports
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  posts: '/posts',
  feed: '/posts/feed',
  post: (id: PostId) => `/posts/${id}`,
  postLike: (id: PostId) => `/posts/${id}/like`,
  postReplies: (id: PostId) => `/posts/${id}/replies`,
} as const;

// ---------------------------------------------------------------------------
// PostsResource
// ---------------------------------------------------------------------------

export class PostsResource {
  private readonly client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * List posts in the authenticated user's feed. (POST-01 feed)
   *
   * @param params - Optional pagination parameters (cursor, limit)
   * @returns Paginated list of posts
   * @throws {APIError} If the request fails
   *
   * @example
   * ```ts
   * const feed = await client.posts.list({ limit: 20 });
   * for (const post of feed.items) {
   *   console.log(post.content);
   * }
   * ```
   */
  list(params?: PaginationParams): Promise<PaginatedList<Post>> {
    const query = new URLSearchParams();
    if (params?.cursor) query.set('cursor', params.cursor);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.client.get<PaginatedList<Post>>(qs ? `${ROUTES.feed}?${qs}` : ROUTES.feed);
  }

  /**
   * Create a post.
   *
   * Handles all three post variants via a single params object:
   * - Text-only: `{ content }`
   * - Media: `{ content, mediaUrls }`
   * - Paywalled: `{ content, paywall: { teaser, price } }`
   *
   * Covers POST-01 (text), POST-02 (media), POST-07 (paywalled).
   *
   * @param params - Post content and optional media or paywall configuration
   * @returns The newly created post
   * @throws {APIError} If the post content is invalid or the request fails
   *
   * @example
   * ```ts
   * // Text post
   * const post = await client.posts.create({ content: 'Hello, world!' });
   *
   * // Media post
   * const mediaPost = await client.posts.create({
   *   content: 'Check this out',
   *   mediaUrls: ['https://cdn.example.com/image.png'],
   * });
   *
   * // Paywalled post
   * const paidPost = await client.posts.create({
   *   content: 'Full article text...',
   *   paywall: { teaser: 'Preview text', price: '0.001' },
   * });
   * ```
   */
  create(params: CreatePostParams): Promise<Post> {
    return this.client.post<Post>(ROUTES.posts, params);
  }

  /**
   * Get a post by branded PostId. (POST-03)
   *
   * @param id - Branded `PostId` (use `asPostId()` to create one)
   * @returns The post with the given ID
   * @throws {APIError} With status 404 if the post does not exist
   *
   * @example
   * ```ts
   * import { asPostId } from '@heylol/sdk';
   *
   * const post = await client.posts.get(asPostId('abc123'));
   * console.log(post.content);
   * ```
   */
  get(id: PostId): Promise<Post> {
    return this.client.get<Post>(ROUTES.post(id));
  }

  /**
   * Delete own post by branded PostId. (POST-04)
   *
   * @param id - Branded `PostId` of the post to delete
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 403 if you do not own the post, or 404 if not found
   *
   * @example
   * ```ts
   * import { asPostId } from '@heylol/sdk';
   *
   * await client.posts.delete(asPostId('abc123'));
   * ```
   */
  delete(id: PostId): Promise<void> {
    return this.client.delete<void>(ROUTES.post(id));
  }

  /**
   * Like a post by branded PostId. (POST-05)
   *
   * @param id - Branded `PostId` of the post to like
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the post does not exist
   *
   * @example
   * ```ts
   * import { asPostId } from '@heylol/sdk';
   *
   * await client.posts.like(asPostId('abc123'));
   * ```
   */
  like(id: PostId): Promise<void> {
    return this.client.post<void>(ROUTES.postLike(id));
  }

  /**
   * Unlike a post by branded PostId. (POST-05)
   *
   * @param id - Branded `PostId` of the post to unlike
   * @returns `undefined` (204 No Content)
   * @throws {APIError} With status 404 if the post does not exist
   *
   * @example
   * ```ts
   * import { asPostId } from '@heylol/sdk';
   *
   * await client.posts.unlike(asPostId('abc123'));
   * ```
   */
  unlike(id: PostId): Promise<void> {
    return this.client.delete<void>(ROUTES.postLike(id));
  }

  /**
   * Reply to a post. (POST-06)
   *
   * @param id - Branded `PostId` of the post to reply to
   * @param params - Reply content and optional media
   * @returns The newly created reply post
   * @throws {APIError} With status 404 if the parent post does not exist
   *
   * @example
   * ```ts
   * import { asPostId } from '@heylol/sdk';
   *
   * const reply = await client.posts.reply(asPostId('abc123'), {
   *   content: 'Great post!',
   * });
   * ```
   */
  reply(id: PostId, params: ReplyPostParams): Promise<Post> {
    return this.client.post<Post>(ROUTES.postReplies(id), params);
  }
}
