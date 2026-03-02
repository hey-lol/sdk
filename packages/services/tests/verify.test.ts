import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPayment } from '../src/verify.js';

// Helper: encode a payload to base64 (simulates client-side encoding)
const encodeHeader = (payload: unknown): string => btoa(JSON.stringify(payload));

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

describe('verifyPayment()', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns valid:true with payer and paymentPayload when facilitator confirms', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { isValid: true, payer: '0xABC', invalidReason: undefined }),
    );

    const header = encodeHeader(dummyPayload);
    const result = await verifyPayment(header, dummyRequirements);

    expect(result.valid).toBe(true);
    expect(result.payer).toBe('0xABC');
    expect(result.paymentPayload).toEqual(dummyPayload);
    expect(result.reason).toBeUndefined();
  });

  it('returns valid:false with reason when facilitator rejects', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { isValid: false, invalidReason: 'Insufficient amount' }),
    );

    const header = encodeHeader(dummyPayload);
    const result = await verifyPayment(header, dummyRequirements);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Insufficient amount');
  });

  it('returns valid:false when facilitator returns non-200', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(500, 'Internal Server Error', false));

    const header = encodeHeader(dummyPayload);
    const result = await verifyPayment(header, dummyRequirements);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('500');
    expect(result.reason).toContain('Internal Server Error');
  });

  it('returns valid:false when header is not valid base64/JSON', async () => {
    const result = await verifyPayment('not-valid-base64!!!', dummyRequirements);

    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns valid:false when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const header = encodeHeader(dummyPayload);
    const result = await verifyPayment(header, dummyRequirements);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Network failure');
  });

  it('uses custom facilitatorUrl when provided', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { isValid: true, payer: '0xDEF' }));

    const header = encodeHeader(dummyPayload);
    await verifyPayment(header, dummyRequirements, 'https://custom.facilitator.io');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.facilitator.io/verify',
      expect.any(Object),
    );
  });

  it('POSTs to /verify with payload and paymentRequirements', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(200, { isValid: true }));

    const header = encodeHeader(dummyPayload);
    await verifyPayment(header, dummyRequirements);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://x402.org/facilitator/verify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: dummyPayload, paymentRequirements: dummyRequirements }),
      }),
    );
  });

  it('adds typeof guard — returns valid:false if isValid is not boolean', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse(200, { isValid: 'true' }), // string instead of boolean
    );

    const header = encodeHeader(dummyPayload);
    const result = await verifyPayment(header, dummyRequirements);

    expect(result.valid).toBe(false);
  });
});
