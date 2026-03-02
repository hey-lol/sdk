import { describe, expect, it } from 'vitest';
import { create402Response, USDC_MINT } from '../src/response.js';
import type { ServiceDefinition } from '../src/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mainnetNetwork = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const baseDefinition: ServiceDefinition = {
  id: 'test-service',
  description: 'A test service',
  price: {
    amount: '0.001',
    currency: 'USDC',
    network: mainnetNetwork,
    payTo: 'So11111111111111111111111111111111111111112',
  },
};

function decodeHeader(response: Response): Record<string, unknown> {
  const headerValue = response.headers.get('PAYMENT-REQUIRED');
  if (!headerValue) throw new Error('PAYMENT-REQUIRED header missing');
  return JSON.parse(atob(headerValue)) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('create402Response()', () => {
  it('returns a Response with status 402', () => {
    const response = create402Response(baseDefinition);
    expect(response.status).toBe(402);
  });

  it('sets PAYMENT-REQUIRED header with base64-encoded JSON', () => {
    const response = create402Response(baseDefinition);
    const headerValue = response.headers.get('PAYMENT-REQUIRED');

    expect(headerValue).toBeTruthy();
    // Should be valid base64
    expect(() => atob(headerValue!)).not.toThrow();
    // Decoded should be valid JSON
    expect(() => JSON.parse(atob(headerValue!))).not.toThrow();
  });

  it('PAYMENT-REQUIRED header contains correct x402Version, network, amount, payTo', () => {
    const response = create402Response(baseDefinition);
    const payload = decodeHeader(response);

    expect(payload.x402Version).toBe(2);

    const accepts = payload.accepts as Array<Record<string, unknown>>;
    expect(accepts).toHaveLength(1);

    const accept = accepts[0];
    expect(accept.network).toBe(mainnetNetwork);
    expect(accept.amount).toBe('0.001');
    expect(accept.payTo).toBe('So11111111111111111111111111111111111111112');
    expect(accept.scheme).toBe('exact');
    expect(accept.maxTimeoutSeconds).toBe(60);
  });

  it('uses USDC_MINT to resolve asset address for known network', () => {
    const response = create402Response(baseDefinition);
    const payload = decodeHeader(response);

    const accepts = payload.accepts as Array<Record<string, unknown>>;
    expect(accepts[0].asset).toBe(USDC_MINT[mainnetNetwork]);
    expect(accepts[0].asset).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  it('uses empty string for asset on unknown network', () => {
    const unknownDef: ServiceDefinition = {
      ...baseDefinition,
      price: { ...baseDefinition.price, network: 'solana:unknown-network' },
    };

    const response = create402Response(unknownDef);
    const payload = decodeHeader(response);

    const accepts = payload.accepts as Array<Record<string, unknown>>;
    expect(accepts[0].asset).toBe('');
  });

  it('includes opts.resource and opts.description when provided', () => {
    const response = create402Response(baseDefinition, {
      resource: 'https://api.example.com/my-resource',
      description: 'Custom description',
    });
    const payload = decodeHeader(response);

    const accepts = payload.accepts as Array<Record<string, unknown>>;
    expect(accepts[0].resource).toBe('https://api.example.com/my-resource');
    expect(accepts[0].description).toBe('Custom description');
  });

  it('falls back to definition.description when opts.description not provided', () => {
    const response = create402Response(baseDefinition, { resource: 'https://api.example.com/r' });
    const payload = decodeHeader(response);

    const accepts = payload.accepts as Array<Record<string, unknown>>;
    expect(accepts[0].description).toBe('A test service');
  });
});
