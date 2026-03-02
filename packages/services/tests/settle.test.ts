import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { settlePayment } from '../src/settle.js';

// Helper: create a mock Response
const mockResponse = (status: number, body: unknown, isJson = true): Response => {
  const bodyStr = isJson ? JSON.stringify(body) : String(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => bodyStr,
  } as unknown as Response;
};

const dummyPayload = { scheme: 'exact', amount: '0.001', network: 'solana:mainnet' };
const dummyRequirements = { x402Version: 2, accepts: [] };

describe('settlePayment()', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns success:true with txHash and network on success', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, {
        success: true,
        transaction: '0xABCDEF1234567890',
        network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      }),
    );

    const result = await settlePayment(dummyPayload, dummyRequirements);

    expect(result.success).toBe(true);
    expect(result.txHash).toBe('0xABCDEF1234567890');
    expect(result.network).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
    expect(result.errorReason).toBeUndefined();
  });

  it('returns success:false with errorReason on facilitator error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: false }));

    const result = await settlePayment(dummyPayload, dummyRequirements);

    expect(result.success).toBe(false);
  });

  it('returns success:false when facilitator returns non-200', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'Internal Server Error', false));

    const result = await settlePayment(dummyPayload, dummyRequirements);

    expect(result.success).toBe(false);
    expect(result.errorReason).toContain('500');
    expect(result.errorReason).toContain('Internal Server Error');
  });

  it('returns success:false when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await settlePayment(dummyPayload, dummyRequirements);

    expect(result.success).toBe(false);
    expect(result.errorReason).toBe('Connection refused');
  });

  it('uses custom facilitatorUrl when provided', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, transaction: '0xTX' }));

    await settlePayment(dummyPayload, dummyRequirements, 'https://custom.facilitator.io');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.facilitator.io/settle',
      expect.any(Object),
    );
  });

  it('POSTs to /settle with payload and paymentRequirements', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { success: true, transaction: '0xTX' }));

    await settlePayment(dummyPayload, dummyRequirements);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://x402.org/facilitator/settle',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: dummyPayload, paymentRequirements: dummyRequirements }),
      }),
    );
  });
});
