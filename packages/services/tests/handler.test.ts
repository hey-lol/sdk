import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createX402Service } from '../src/handler.js';
import type { ServiceDefinition } from '../src/types.js';

// Helper: build a minimal ServiceDefinition
const makeDefinition = (overrides?: Partial<ServiceDefinition>): ServiceDefinition => ({
  id: 'test-service',
  description: 'Test service',
  price: {
    amount: '0.001',
    currency: 'USDC',
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    payTo: 'WalletAddressBase58',
  },
  ...overrides,
});

// Helper: build a mock Response for fetch calls
const mockFetchResponse = (status: number, body: unknown, isJson = true): Response => {
  const bodyStr = isJson ? JSON.stringify(body) : String(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => bodyStr,
  } as unknown as Response;
};

// Helper: encode a payment payload to base64 (simulates client-side header creation)
const makePaymentHeader = (payload: unknown = { amount: '0.001' }): string =>
  btoa(JSON.stringify(payload));

// A valid verify response (facilitator confirms)
const validVerifyResponse = mockFetchResponse(200, {
  isValid: true,
  payer: '0xPayerAddr',
  invalidReason: undefined,
});

// A valid settle response (facilitator confirms settlement)
const validSettleResponse = mockFetchResponse(200, {
  success: true,
  transaction: '0xTxHash123',
  network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
});

// A failed verify response
const invalidVerifyResponse = mockFetchResponse(200, {
  isValid: false,
  invalidReason: 'Payment amount too low',
});

// A failed settle response
const failedSettleResponse = mockFetchResponse(200, { success: false });

describe('createX402Service()', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a function', () => {
    const definition = makeDefinition();
    const result = createX402Service(definition, async () => ({ data: 'ok' }));
    expect(typeof result).toBe('function');
  });

  it('returns 402 with PAYMENT-REQUIRED header when no payment header present', async () => {
    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => ({ data: 'ok' }));

    const request = new Request('https://api.example.com/service');
    const response = await fetchHandler(request);

    expect(response.status).toBe(402);
    expect(response.headers.get('PAYMENT-REQUIRED')).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 400 when request body fails Zod validation', async () => {
    const schema = z.object({ query: z.string().min(1) });
    const definition = makeDefinition({ inputSchema: schema });
    const fetchHandler = createX402Service(definition, async () => ({ data: 'ok' }));

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({ query: '' }), // fails .min(1)
    });

    const response = await fetchHandler(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid input');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns 402 with reason when verifyPayment returns valid:false', async () => {
    mockFetch.mockResolvedValueOnce(invalidVerifyResponse);

    const definition = makeDefinition();
    const handler = vi.fn(async () => ({ data: 'ok' }));
    const fetchHandler = createX402Service(definition, handler);

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    const response = await fetchHandler(request);

    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.reason).toBe('Payment amount too low');
    // Handler should NOT be called
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls handler with parsed input after successful verification', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse).mockResolvedValueOnce(validSettleResponse);

    const schema = z.object({ query: z.string() });
    const definition = makeDefinition({ inputSchema: schema });
    const handler = vi.fn(async () => ({ result: 'data' }));
    const fetchHandler = createX402Service(definition, handler);

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({ query: 'hello' }),
    });

    await fetchHandler(request);

    expect(handler).toHaveBeenCalledWith(request, { query: 'hello' });
  });

  it('returns 200 with handler output as JSON body on success', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse).mockResolvedValueOnce(validSettleResponse);

    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => ({ answer: 42 }));

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    const response = await fetchHandler(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ answer: 42 });
  });

  it('includes PAYMENT-RESPONSE header with settlement proof on success', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse).mockResolvedValueOnce(validSettleResponse);

    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => ({ ok: true }));

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    const response = await fetchHandler(request);

    expect(response.status).toBe(200);
    const paymentResponse = response.headers.get('PAYMENT-RESPONSE');
    expect(paymentResponse).toBeTruthy();

    const decoded = JSON.parse(atob(paymentResponse!));
    expect(decoded.success).toBe(true);
    expect(decoded.transaction).toBe('0xTxHash123');
    expect(decoded.payer).toBe('0xPayerAddr');
  });

  it('returns 200 even if settlement fails (handler output still returned)', async () => {
    mockFetch
      .mockResolvedValueOnce(validVerifyResponse)
      .mockResolvedValueOnce(failedSettleResponse);

    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => ({ data: 'still here' }));

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    const response = await fetchHandler(request);

    // Still 200 — settlement failure is best-effort
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: 'still here' });
    // No PAYMENT-RESPONSE header since settlement failed
    expect(response.headers.get('PAYMENT-RESPONSE')).toBeNull();
  });

  it('returns 500 when handler throws', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse);

    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => {
      throw new Error('Internal handler failure');
    });

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    const response = await fetchHandler(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Handler error');
  });

  it('reads payment-signature header (v2)', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse).mockResolvedValueOnce(validSettleResponse);

    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => ({ ok: true }));

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    const response = await fetchHandler(request);
    expect(response.status).toBe(200);
  });

  it('falls back to x-payment header (v1)', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse).mockResolvedValueOnce(validSettleResponse);

    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => ({ ok: true }));

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-payment': makePaymentHeader(), // v1 header
      },
      body: JSON.stringify({}),
    });

    const response = await fetchHandler(request);
    // Should proceed past payment check — not return 402
    expect(response.status).toBe(200);
  });

  it('passes facilitatorUrl to verifyPayment and settlePayment', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse).mockResolvedValueOnce(validSettleResponse);

    const definition = makeDefinition();
    const fetchHandler = createX402Service(definition, async () => ({ ok: true }), {
      facilitatorUrl: 'https://custom.facilitator.io',
    });

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    await fetchHandler(request);

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://custom.facilitator.io/verify',
      expect.any(Object),
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://custom.facilitator.io/settle',
      expect.any(Object),
    );
  });

  it('enforces verify -> handle -> settle order', async () => {
    const callOrder: string[] = [];

    // verify mock
    mockFetch.mockImplementation(async (url: string) => {
      if ((url as string).endsWith('/verify')) {
        callOrder.push('verify');
        return validVerifyResponse;
      }
      if ((url as string).endsWith('/settle')) {
        callOrder.push('settle');
        return validSettleResponse;
      }
      return mockFetchResponse(404, 'Not found');
    });

    const definition = makeDefinition();
    const handler = vi.fn(async () => {
      callOrder.push('handler');
      return { ok: true };
    });
    const fetchHandler = createX402Service(definition, handler);

    const request = new Request('https://api.example.com/service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payment-signature': makePaymentHeader(),
      },
      body: JSON.stringify({}),
    });

    await fetchHandler(request);

    expect(callOrder).toEqual(['verify', 'handler', 'settle']);
  });

  it('skips body parsing for GET requests', async () => {
    mockFetch.mockResolvedValueOnce(validVerifyResponse).mockResolvedValueOnce(validSettleResponse);

    const definition = makeDefinition();
    const handler = vi.fn(async () => ({ result: 'get response' }));
    const fetchHandler = createX402Service(definition, handler);

    // GET with no body
    const request = new Request('https://api.example.com/service?param=value', {
      method: 'GET',
      headers: {
        'payment-signature': makePaymentHeader(),
      },
    });

    const response = await fetchHandler(request);

    expect(response.status).toBe(200);
    // Handler was called with empty object as input
    expect(handler).toHaveBeenCalledWith(request, {});
  });
});
