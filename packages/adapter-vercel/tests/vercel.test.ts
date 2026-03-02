import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @heylol/sdk to avoid crypto dep chain
vi.mock('@heylol/sdk', () => {
  class MockHeyLolClient {
    readonly _opts: { privateKey: string };
    readonly posts = {};
    readonly profile = {};
    readonly social = {};

    constructor(opts: { privateKey: string }) {
      this._opts = opts;
    }
  }

  return {
    HeyLolClient: MockHeyLolClient,
  };
});

// Mock next/server to avoid requiring full Next.js runtime in tests
vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static next(opts?: { request?: { headers?: Headers } }): MockNextResponse {
      const responseHeaders = new Headers();
      // Copy any request headers (simulates Next.js middleware response headers)
      if (opts?.request?.headers) {
        opts.request.headers.forEach((value, key) => {
          responseHeaders.set(key, value);
        });
      }
      return new MockNextResponse(null, { status: 200, headers: responseHeaders });
    }
  }
  return { NextResponse: MockNextResponse };
});

import { createNextjsMiddleware, VercelClient } from '../src/index.js';

describe('VercelClient', () => {
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

  it('reads HEYLOL_PRIVATE_KEY from process.env', () => {
    process.env.HEYLOL_PRIVATE_KEY = 'vercel-test-key';

    const client = new VercelClient();
    expect((client as unknown as { _opts: { privateKey: string } })._opts.privateKey).toBe(
      'vercel-test-key',
    );
  });

  it('throws when HEYLOL_PRIVATE_KEY env var is missing', () => {
    expect(() => new VercelClient()).toThrow(
      'HEYLOL_PRIVATE_KEY environment variable is required for VercelClient',
    );
  });

  it('accepts additional ClientOptions', () => {
    process.env.HEYLOL_PRIVATE_KEY = 'vercel-test-key';

    const client = new VercelClient({ retries: 5, timeout: 10000 });
    expect(client).toBeInstanceOf(VercelClient);
  });

  it('is an instance of VercelClient', () => {
    process.env.HEYLOL_PRIVATE_KEY = 'vercel-test-key';
    const client = new VercelClient();
    expect(client).toBeInstanceOf(VercelClient);
  });
});

describe('createNextjsMiddleware', () => {
  it('returns a function', () => {
    const middleware = createNextjsMiddleware();
    expect(typeof middleware).toBe('function');
  });

  it('returned middleware sets x-heylol-ready header via NextResponse.next', async () => {
    const middleware = createNextjsMiddleware();
    const request = new Request('https://example.com/api/test');

    const response = await middleware(request);
    // x-heylol-ready is set on request headers passed to NextResponse.next
    // Our mock copies them to the response so we can verify the header was set
    expect(response.headers.get('x-heylol-ready')).toBe('1');
  });

  it('accepts NextjsMiddlewareOptions', () => {
    const middleware = createNextjsMiddleware({
      matcher: ['/api/:path*'],
    });
    expect(typeof middleware).toBe('function');
  });

  it('handles Edge Config option gracefully when @vercel/edge-config is unavailable', async () => {
    const middleware = createNextjsMiddleware({
      edgeConfigConnectionString: 'https://edge-config.vercel.com/test',
    });

    const request = new Request('https://example.com/api/test');
    // Should not throw even if @vercel/edge-config is not installed
    const response = await middleware(request);
    expect(response).toBeDefined();
    expect(response.headers.get('x-heylol-ready')).toBe('1');
  });
});
