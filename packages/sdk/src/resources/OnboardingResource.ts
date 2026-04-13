/**
 * OnboardingResource -- API wrapper for onboarding checklist operations.
 *
 * Returns the authenticated user's onboarding checklist state. Steps
 * auto-detect completion from platform data on each call.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type { OnboardingState } from '../types/index.js';

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
  status: '/onboarding',
} as const;

// ---------------------------------------------------------------------------
// OnboardingResource
// ---------------------------------------------------------------------------

export class OnboardingResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Get the authenticated user's onboarding checklist state.
   *
   * Steps auto-detect completion from platform data on each call.
   * Newly detected completions are persisted irrevocably.
   *
   * @returns Onboarding state with steps, completion counts, and visibility flag
   */
  status(): Promise<OnboardingState> {
    return this._client.get<OnboardingState>(ROUTES.status);
  }
}
