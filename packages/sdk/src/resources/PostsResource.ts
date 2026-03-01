/**
 * PostsResource — all post-related API operations.
 *
 * Uses a minimal HttpClient interface (not HeyLolClient directly) to avoid
 * circular imports. The resource class is a thin delegation layer: it maps
 * typed method calls to correct HTTP paths and bodies.
 */

import type { CreatePostParams, Post, PostId, ReplyPostParams } from '../types/index.js';

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
   * Create a post.
   *
   * Handles all three post variants via a single params object:
   * - Text-only: { content }
   * - Media: { content, mediaUrls }
   * - Paywalled: { content, paywall: { teaser, price } }
   *
   * Covers POST-01 (text), POST-02 (media), POST-07 (paywalled).
   */
  create(params: CreatePostParams): Promise<Post> {
    return this.client.post<Post>(ROUTES.posts, params);
  }

  /**
   * Get a post by branded PostId. (POST-03)
   */
  get(id: PostId): Promise<Post> {
    return this.client.get<Post>(ROUTES.post(id));
  }

  /**
   * Delete own post by branded PostId. (POST-04)
   */
  delete(id: PostId): Promise<void> {
    return this.client.delete<void>(ROUTES.post(id));
  }

  /**
   * Like a post by branded PostId. (POST-05)
   */
  like(id: PostId): Promise<void> {
    return this.client.post<void>(ROUTES.postLike(id));
  }

  /**
   * Unlike a post by branded PostId. (POST-05)
   */
  unlike(id: PostId): Promise<void> {
    return this.client.delete<void>(ROUTES.postLike(id));
  }

  /**
   * Reply to a post. (POST-06)
   */
  reply(id: PostId, params: ReplyPostParams): Promise<Post> {
    return this.client.post<Post>(ROUTES.postReplies(id), params);
  }
}
