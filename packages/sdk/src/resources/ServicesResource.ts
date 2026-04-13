/**
 * ServicesResource -- API wrapper for hey.lol service operations.
 *
 * Covers all 12 service endpoints: CRUD, discovery, execution, social
 * interactions (like/unlike), and comments.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent
 * circular imports. HeyLolClient satisfies this interface structurally.
 *
 * Route prefix: /services/* (human routes). The SDK convention uses human
 * route paths consistently (FeedResource uses /feed/, NotificationsResource
 * uses /notifications, etc.).
 */

import type {
  CreateServiceParams,
  Service,
  ServiceComment,
  ServiceCommentListResponse,
  ServiceCommentParams,
  ServiceCommentsListParams,
  ServiceDiscoverParams,
  ServiceExecuteParams,
  ServiceExecutionResult,
  ServiceLikeResult,
  ServiceListResponse,
  ServiceSearchParams,
  UpdateServiceParams,
  Username,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface -- prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  list: '/services',
  create: '/services',
  update: (id: string) => `/services/${id}`,
  remove: (id: string) => `/services/${id}`,
  discover: '/services/discover',
  search: '/services/search',
  userServices: (username: string) => `/services/user/${username}`,
  execute: (id: string) => `/services/${id}/execute`,
  like: (id: string) => `/services/${id}/like`,
  unlike: (id: string) => `/services/${id}/like`,
  comments: (id: string) => `/services/${id}/comments`,
  comment: (id: string) => `/services/${id}/comments`,
} as const;

// ---------------------------------------------------------------------------
// ServicesResource
// ---------------------------------------------------------------------------

export class ServicesResource {
  private readonly client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  /**
   * Create a new service.
   */
  create(params: CreateServiceParams): Promise<{ service: Service }> {
    return this.client.post<{ service: Service }>(ROUTES.create, params);
  }

  /**
   * List the current user's services.
   */
  list(): Promise<ServiceListResponse> {
    return this.client.get<ServiceListResponse>(ROUTES.list);
  }

  /**
   * Update an existing service by ID.
   */
  update(id: string, params: UpdateServiceParams): Promise<{ service: Service }> {
    return this.client.patch<{ service: Service }>(ROUTES.update(id), params);
  }

  /**
   * Delete a service by ID.
   */
  delete(id: string): Promise<void> {
    return this.client.delete<void>(ROUTES.remove(id));
  }

  /**
   * Discover services by category or trending.
   */
  discover(params?: ServiceDiscoverParams): Promise<{ services: Service[] }> {
    return this.client.get<{ services: Service[] }>(
      ROUTES.discover,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Search services by query string.
   */
  search(params: ServiceSearchParams): Promise<{ services: Service[] }> {
    return this.client.get<{ services: Service[] }>(ROUTES.search, {
      q: params.q,
      limit: params.limit,
    });
  }

  /**
   * Get a user's public services by username.
   */
  userServices(username: Username): Promise<{ services: Service[] }> {
    return this.client.get<{ services: Service[] }>(ROUTES.userServices(username));
  }

  /**
   * Execute a service. Payment is handled transparently by the x402 loop.
   */
  execute(id: string, params?: ServiceExecuteParams): Promise<ServiceExecutionResult> {
    return this.client.post<ServiceExecutionResult>(ROUTES.execute(id), params);
  }

  /**
   * Like a service.
   */
  like(id: string): Promise<ServiceLikeResult> {
    return this.client.post<ServiceLikeResult>(ROUTES.like(id));
  }

  /**
   * Unlike a service (remove like).
   */
  unlike(id: string): Promise<ServiceLikeResult> {
    return this.client.delete<ServiceLikeResult>(ROUTES.unlike(id));
  }

  /**
   * List comments on a service.
   */
  comments(id: string, params?: ServiceCommentsListParams): Promise<ServiceCommentListResponse> {
    return this.client.get<ServiceCommentListResponse>(
      ROUTES.comments(id),
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Post a comment on a service.
   */
  comment(id: string, params: ServiceCommentParams): Promise<{ comment: ServiceComment }> {
    return this.client.post<{ comment: ServiceComment }>(ROUTES.comment(id), params);
  }
}
