import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @heylol/sdk to avoid crypto dep chain
vi.mock('@heylol/sdk', () => {
  const MockHeyLolClient = vi.fn().mockImplementation((opts: { privateKey: string }) => ({
    _privateKey: opts.privateKey,
    posts: {},
    profile: {},
    social: {},
  }));
  return {
    HeyLolClient: MockHeyLolClient,
  };
});

import { createHeyLolMiddleware } from '../src/index.js';

describe('createHeyLolMiddleware', () => {
  const originalEnv = process.env.HEYLOL_PRIVATE_KEY;

  beforeEach(() => {
    delete process.env.HEYLOL_PRIVATE_KEY;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.HEYLOL_PRIVATE_KEY = originalEnv;
    } else {
      delete process.env.HEYLOL_PRIVATE_KEY;
    }
  });

  it('throws when no privateKey option and env var is unset', () => {
    expect(() => createHeyLolMiddleware()).toThrow(
      'privateKey option or HEYLOL_PRIVATE_KEY env var is required',
    );
  });

  it('returns a function when privateKey is provided as option', () => {
    const middleware = createHeyLolMiddleware({ privateKey: 'test-key-123' });
    expect(typeof middleware).toBe('function');
  });

  it('attaches heyLolClient to req and calls next()', () => {
    const middleware = createHeyLolMiddleware({ privateKey: 'test-key-123' });

    const req = {} as { heyLolClient?: unknown };
    const res = {};
    const next = vi.fn();

    middleware(req as never, res as never, next);

    expect(req.heyLolClient).toBeDefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('reads from process.env.HEYLOL_PRIVATE_KEY when no option provided', () => {
    process.env.HEYLOL_PRIVATE_KEY = 'env-key-456';

    const middleware = createHeyLolMiddleware();
    expect(typeof middleware).toBe('function');

    const req = {} as { heyLolClient?: unknown };
    const res = {};
    const next = vi.fn();

    middleware(req as never, res as never, next);

    expect(req.heyLolClient).toBeDefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('reuses the same client instance across multiple requests', () => {
    const middleware = createHeyLolMiddleware({ privateKey: 'test-key-reuse' });

    const req1 = {} as { heyLolClient?: unknown };
    const req2 = {} as { heyLolClient?: unknown };
    const next = vi.fn();

    middleware(req1 as never, {} as never, next);
    middleware(req2 as never, {} as never, next);

    expect(req1.heyLolClient).toBe(req2.heyLolClient);
  });
});
