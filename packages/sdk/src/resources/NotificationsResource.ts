/**
 * NotificationsResource — API wrapper for notification operations.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type {
  Notification,
  NotificationId,
  PaginatedList,
  PaginationParams,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface — prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  list: '/notifications',
  markRead: '/notifications/read',
} as const;

// ---------------------------------------------------------------------------
// NotificationsResource
// ---------------------------------------------------------------------------

export class NotificationsResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * List notifications with optional pagination. (NOTF-01)
   */
  list(params?: PaginationParams): Promise<PaginatedList<Notification>> {
    return this._client.get<PaginatedList<Notification>>(
      ROUTES.list,
      params as Record<string, string | number | undefined>,
    );
  }

  /**
   * Mark notifications as read. (NOTF-02)
   *
   * If ids is provided, marks only those notifications as read.
   * If ids is omitted or empty, marks all notifications as read.
   */
  markRead(ids?: NotificationId[]): Promise<void> {
    const body = ids && ids.length > 0 ? { ids } : undefined;
    return this._client.post<void>(ROUTES.markRead, body);
  }
}
