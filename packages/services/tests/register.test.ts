import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { registerService } from '../src/register.js';
import type { PriceConfig } from '../src/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basePrice: PriceConfig = {
  amount: '0.001',
  currency: 'USDC',
  network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  payTo: 'So11111111111111111111111111111111111111112',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerService()', () => {
  it('returns a ServiceDefinition with correct id, price, and description', () => {
    const svc = registerService({
      id: 'my-service',
      description: 'Does something useful',
      price: basePrice,
    });

    expect(svc.id).toBe('my-service');
    expect(svc.description).toBe('Does something useful');
    expect(svc.price).toEqual(basePrice);
  });

  it('shallow-copies price — mutating input does not mutate result', () => {
    const inputPrice: PriceConfig = { ...basePrice };
    const svc = registerService({ id: 'svc', price: inputPrice });

    // mutate original
    inputPrice.amount = '999';

    expect(svc.price.amount).toBe('0.001');
  });

  it('omits description when not provided', () => {
    const svc = registerService({ id: 'no-desc', price: basePrice });

    // description key should be present but undefined (spread of opts without description)
    expect(svc.id).toBe('no-desc');
    expect(svc.description).toBeUndefined();
  });

  it('includes inputSchema and outputSchema when provided', () => {
    // Mock ZodType — we only need the structural shape for this test
    const mockInputSchema = { parse: (v: unknown) => v } as unknown as ZodType<string>;
    const mockOutputSchema = { parse: (v: unknown) => v } as unknown as ZodType<number>;

    const svc = registerService<string, number>({
      id: 'typed-svc',
      price: basePrice,
      inputSchema: mockInputSchema,
      outputSchema: mockOutputSchema,
    });

    expect(svc.inputSchema).toBe(mockInputSchema);
    expect(svc.outputSchema).toBe(mockOutputSchema);
  });

  it('works without schemas (TInput/TOutput default to unknown)', () => {
    const svc = registerService({ id: 'no-schemas', price: basePrice });

    expect(svc.inputSchema).toBeUndefined();
    expect(svc.outputSchema).toBeUndefined();
  });
});
