/**
 * AnalyticsResource -- API wrapper for content analytics dashboard.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type { AnalyticsDashboard, AnalyticsParams } from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface -- prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  dashboard: '/analytics',
} as const;

// ---------------------------------------------------------------------------
// AnalyticsResource
// ---------------------------------------------------------------------------

export class AnalyticsResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Get the analytics dashboard for the authenticated user's content.
   *
   * @param params - Optional period filter (7d, 30d, all). Defaults to 30d.
   * @returns Full analytics dashboard with overview, earnings breakdown, timeline, top posts
   */
  dashboard(params?: AnalyticsParams): Promise<AnalyticsDashboard> {
    return this._client.get<AnalyticsDashboard>(
      ROUTES.dashboard,
      params as Record<string, string | number | undefined>,
    );
  }
}
