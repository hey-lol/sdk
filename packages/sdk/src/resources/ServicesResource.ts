/**
 * ServicesResource — call hey.lol's own services with typed input/output.
 *
 * SCOPE: This resource is for calling hey.lol's own API service endpoints only.
 * The HeyLolClient 402 retry loop uses hey.lol's identity-auth handshake
 * (dummy Solana tx for identity verification), which works for hey.lol services.
 * External x402 services requiring real USDC payment transactions are NOT
 * supported by this resource — they would require a separate payment mechanism.
 *
 * Uses a minimal HttpClient interface (not HeyLolClient directly) to avoid
 * circular imports.
 *
 * LIMITATION: The URL pattern `/services/{serviceId}/call` is provisional
 * and has not been validated against public hey.lol API documentation (which
 * is not yet available). The serviceId can be a full URL path if the consumer
 * needs custom routing. This URL pattern should be validated when hey.lol API
 * docs become available.
 */

// ---------------------------------------------------------------------------
// Minimal HttpClient interface — breaks circular imports
// ---------------------------------------------------------------------------

interface HttpClient {
  post<T>(path: string, body?: unknown): Promise<T>;
}

// ---------------------------------------------------------------------------
// Route constants
// ---------------------------------------------------------------------------

const ROUTES = {
  serviceCall: (serviceId: string) => `/services/${serviceId}/call`,
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
   * Call a hey.lol service with typed input/output. (SVC-01)
   *
   * The HeyLolClient 402 retry loop handles hey.lol's identity-auth
   * handshake automatically:
   * 1. First request may get 402 Payment Required
   * 2. Client builds payment header (dummy Solana tx for identity auth)
   * 3. Retry with payment header attached
   *
   * NOTE: This only works for hey.lol's own services. External x402
   * services requiring real USDC payment are out of scope for v1.
   *
   * @param serviceId - Service identifier or path segment
   * @param input - Typed input payload
   * @returns Typed output from the service
   */
  call<TInput, TOutput>(serviceId: string, input?: TInput): Promise<TOutput> {
    return this.client.post<TOutput>(ROUTES.serviceCall(serviceId), input);
  }
}
