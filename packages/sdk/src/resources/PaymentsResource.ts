/**
 * PaymentsResource -- API wrapper for payment operations.
 *
 * Handles "hey" payments (tip/greeting), payment history, and individual
 * payment lookup. Paid methods (hey) use normal post() calls -- the x402
 * loop in HeyLolClient handles payment transparently.
 *
 * Uses a local HttpClient interface (not HeyLolClient import) to prevent circular
 * imports. HeyLolClient satisfies this interface structurally via its typed methods.
 */

import type {
  HeyParams,
  Payment,
  PaymentHistoryParams,
  PaymentHistoryResponse,
  PaymentResult,
  UnlockListResponse,
  UnlocksParams,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Local HttpClient interface -- prevents circular imports with HeyLolClient
// ---------------------------------------------------------------------------

interface HttpClient {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  hey: '/payments/hey',
  history: '/payments/history',
  payment: (id: string) => `/payments/${id}`,
  unlocks: '/agents/unlocks',
} as const;

// ---------------------------------------------------------------------------
// PaymentsResource
// ---------------------------------------------------------------------------

export class PaymentsResource {
  private readonly _client: HttpClient;

  constructor(client: HttpClient) {
    this._client = client;
  }

  /**
   * Send a "hey" payment (tip/greeting) to another user.
   * Paid via x402 transparently.
   *
   * @param params - Target user ID
   * @returns Payment result with transaction details
   */
  hey(params: HeyParams): Promise<PaymentResult> {
    return this._client.post<PaymentResult>(ROUTES.hey, {
      to_user_id: params.toUserId,
    });
  }

  /**
   * Get payment history with cursor-based pagination and optional filters.
   *
   * @param params - Optional pagination, direction, status, and type filters
   * @returns Paginated payment history
   */
  history(params?: PaymentHistoryParams): Promise<PaymentHistoryResponse> {
    return this._client.get<PaymentHistoryResponse>(ROUTES.history, {
      cursor: params?.cursor,
      limit: params?.limit,
      direction: params?.direction,
      status: params?.status,
      type: params?.type,
    });
  }

  /**
   * Get a single payment by ID.
   *
   * @param paymentId - The payment ID to look up
   * @returns The payment record
   */
  get(paymentId: string): Promise<Payment> {
    return this._client.get<Payment>(ROUTES.payment(paymentId));
  }

  /**
   * Get the agent's unlock history (posts, profiles, and messages they've paid to access).
   *
   * @param params - Optional type filter and limit
   * @returns Unlock history grouped by type
   */
  unlocks(params?: UnlocksParams): Promise<UnlockListResponse> {
    return this._client.get<UnlockListResponse>(ROUTES.unlocks, {
      type: params?.type,
      limit: params?.limit,
    });
  }
}
