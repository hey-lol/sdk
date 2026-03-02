import { describe, expect, it } from 'vitest';
import {
  buildPaymentHeader,
  getPaymentVersion,
  PAYMENT_HEADERS,
  parsePaymentRequirements,
} from '../src/auth/x402.js';
import type { PaymentRequirements } from '../src/types/x402.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function mockV2Response(requirements: PaymentRequirements[]): Response {
  const encoded = btoa(JSON.stringify({ accepts: requirements }));
  return new Response(null, {
    status: 402,
    headers: { 'payment-required': encoded },
  });
}

function mockV1Response(requirements: PaymentRequirements[]): Response {
  return new Response(JSON.stringify({ x402Version: 1, accepts: requirements }), {
    status: 402,
    headers: { 'content-type': 'application/json' },
  });
}

const FIXTURE_REQUIREMENTS: PaymentRequirements = {
  scheme: 'exact',
  network: 'solana-mainnet',
  amount: '0',
  maxAmountRequired: '0',
  resource: 'https://api.hey.lol/v1/posts',
};

const FIXTURE_REQUIREMENTS_V2: PaymentRequirements = {
  scheme: 'exact',
  network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  amount: '0',
  maxAmountRequired: '0',
  resource: 'https://api.hey.lol/v1/posts',
};

// ---------------------------------------------------------------------------
// PAYMENT_HEADERS constant
// ---------------------------------------------------------------------------

describe('PAYMENT_HEADERS', () => {
  it('has REQUIRED set to payment-required', () => {
    expect(PAYMENT_HEADERS.REQUIRED).toBe('payment-required');
  });

  it('has SIGNATURE set to payment-signature', () => {
    expect(PAYMENT_HEADERS.SIGNATURE).toBe('payment-signature');
  });

  it('has V1_PAYMENT set to x-payment', () => {
    expect(PAYMENT_HEADERS.V1_PAYMENT).toBe('x-payment');
  });
});

// ---------------------------------------------------------------------------
// getPaymentVersion
// ---------------------------------------------------------------------------

describe('getPaymentVersion', () => {
  it('returns 2 for a v2 response with payment-required header', () => {
    const response = mockV2Response([FIXTURE_REQUIREMENTS_V2]);
    expect(getPaymentVersion(response)).toBe(2);
  });

  it('returns 1 for a v1 response with JSON body and no payment-required header', () => {
    const response = mockV1Response([FIXTURE_REQUIREMENTS]);
    expect(getPaymentVersion(response)).toBe(1);
  });

  it('returns null for a non-402 response', () => {
    const response = new Response(null, { status: 200 });
    expect(getPaymentVersion(response)).toBeNull();
  });

  it('returns null for 402 response with neither header format', () => {
    const response = new Response(null, { status: 402 });
    expect(getPaymentVersion(response)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parsePaymentRequirements
// ---------------------------------------------------------------------------

describe('parsePaymentRequirements', () => {
  it('parses v2 response and returns fixture requirements', async () => {
    const response = mockV2Response([FIXTURE_REQUIREMENTS_V2]);
    const result = await parsePaymentRequirements(response);
    expect(result).toHaveLength(1);
    expect(result[0].scheme).toBe('exact');
    expect(result[0].network).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  });

  it('parses v1 response and returns fixture requirements from JSON body', async () => {
    const response = mockV1Response([FIXTURE_REQUIREMENTS]);
    const result = await parsePaymentRequirements(response);
    expect(result).toHaveLength(1);
    expect(result[0].scheme).toBe('exact');
    expect(result[0].network).toBe('solana-mainnet');
    expect(result[0].amount).toBe('0');
    expect(result[0].resource).toBe('https://api.hey.lol/v1/posts');
  });

  it('parses v2 response with multiple accepts and returns all requirements', async () => {
    const response = mockV2Response([FIXTURE_REQUIREMENTS_V2, FIXTURE_REQUIREMENTS_V2]);
    const result = await parsePaymentRequirements(response);
    expect(result).toHaveLength(2);
  });

  it('throws AuthError with X402_PARSE_FAILED for malformed v2 header (not valid base64)', async () => {
    const response = new Response(null, {
      status: 402,
      headers: { 'payment-required': '!!! not valid base64 !!!' },
    });
    await expect(parsePaymentRequirements(response)).rejects.toMatchObject({
      name: 'AuthError',
      code: 'X402_PARSE_FAILED',
    });
  });

  it('throws AuthError with X402_PARSE_FAILED for malformed v1 body (invalid JSON)', async () => {
    const response = new Response('not-json', {
      status: 402,
      headers: { 'content-type': 'application/json' },
    });
    await expect(parsePaymentRequirements(response)).rejects.toMatchObject({
      name: 'AuthError',
      code: 'X402_PARSE_FAILED',
    });
  });

  it('throws AuthError with X402_PARSE_FAILED for non-402 response', async () => {
    const response = new Response(null, { status: 200 });
    await expect(parsePaymentRequirements(response)).rejects.toMatchObject({
      name: 'AuthError',
      code: 'X402_PARSE_FAILED',
    });
  });
});

// ---------------------------------------------------------------------------
// buildPaymentHeader
// ---------------------------------------------------------------------------

describe('buildPaymentHeader', () => {
  const signedTx = new Uint8Array(10).fill(0xab);

  describe('v1 (default)', () => {
    it('returns correct headerName for v1', () => {
      const result = buildPaymentHeader(FIXTURE_REQUIREMENTS, signedTx, 1);
      expect(result.headerName).toBe('x-payment');
    });

    it('produces a valid base64-encoded JSON payload for v1', () => {
      const result = buildPaymentHeader(FIXTURE_REQUIREMENTS, signedTx, 1);
      const decoded = JSON.parse(atob(result.headerValue));
      expect(decoded.x402Version).toBe(1);
      expect(decoded.scheme).toBe('exact');
      expect(decoded.network).toBe('solana-mainnet');
      expect(decoded.payload.serializedTransaction).toBeDefined();
    });

    it('payload.serializedTransaction round-trips back to original bytes', () => {
      const result = buildPaymentHeader(FIXTURE_REQUIREMENTS, signedTx, 1);
      const decoded = JSON.parse(atob(result.headerValue));
      const serializedTx = decoded.payload.serializedTransaction;
      const backToBytes = Uint8Array.from(atob(serializedTx), (c) => c.charCodeAt(0));
      expect(backToBytes).toEqual(signedTx);
    });

    it('defaults to v1 when no version argument provided', () => {
      const result = buildPaymentHeader(FIXTURE_REQUIREMENTS, signedTx);
      expect(result.headerName).toBe('x-payment');
      const decoded = JSON.parse(atob(result.headerValue));
      expect(decoded.x402Version).toBe(1);
    });
  });

  describe('v2', () => {
    it('returns correct headerName for v2', () => {
      const result = buildPaymentHeader(FIXTURE_REQUIREMENTS_V2, signedTx, 2);
      expect(result.headerName).toBe('payment-signature');
    });

    it('produces a payload with x402Version 2', () => {
      const result = buildPaymentHeader(FIXTURE_REQUIREMENTS_V2, signedTx, 2);
      const decoded = JSON.parse(atob(result.headerValue));
      expect(decoded.x402Version).toBe(2);
    });
  });
});
