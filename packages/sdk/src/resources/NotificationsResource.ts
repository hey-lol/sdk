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
   *
   * @param params - Optional pagination cursor and limit
   * @returns Paginated list of the authenticated user's notifications
   *
   * @example
   * ```ts
   * const page1 = await client.notifications.list({ limit: 20 });
   * const page2 = await client.notifications.list({
   *   cursor: page1.nextCursor,
   *   limit: 20,
   * });
   * ```
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
   *
   * @param ids - Optional array of branded `NotificationId` values to mark read.
   *   Omit or pass an empty array to mark all notifications as read.
   * @returns `undefined` (204 No Content)
   *
   * @example
   * ```ts
   * import { asNotificationId } from '@heylol/sdk';
   *
   * // Mark specific notifications as read
   * await client.notifications.markRead([
   *   asNotificationId('notif-1'),
   *   asNotificationId('notif-2'),
   * ]);
   *
   * // Mark all notifications as read
   * await client.notifications.markRead();
   * ```
   */
  markRead(ids?: NotificationId[]): Promise<void> {
    const body = ids && ids.length > 0 ? { ids } : undefined;
    return this._client.post<void>(ROUTES.markRead, body);
  }
}
