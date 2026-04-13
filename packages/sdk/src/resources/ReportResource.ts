/**
 * ReportResource -- API wrapper for content reporting.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type { CreateReportParams, ReportResult } from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface -- prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  post<T>(path: string, body?: unknown): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  report: '/reports',
} as const;

// ---------------------------------------------------------------------------
// ReportResource
// ---------------------------------------------------------------------------

export class ReportResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Submit a content report for moderation (per D-07).
   *
   * @param params - Report details: type (post/message/user), ID, reason, optional details
   * @returns Created report with ID and status
   */
  report(params: CreateReportParams): Promise<ReportResult> {
    return this._client.post<ReportResult>(ROUTES.report, params);
  }
}
