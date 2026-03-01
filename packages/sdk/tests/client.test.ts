import { ed25519 } from '@noble/curves/ed25519.js';
import { base58 } from '@scure/base';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeyLolClient } from '../src/client/HeyLolClient.js';
import {
  APIError,
  AuthError,
  NetworkError,
  PaymentRejectedError,
  RateLimitError,
} from '../src/errors/index.js';
import type { Post } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Test keypair — deterministic, no randomness
// ---------------------------------------------------------------------------

const TEST_SECRET = new Uint8Array(32).fill(1);
const TEST_PUBLIC = ed25519.getPublicKey(TEST_SECRET);
const TEST_KEY = base58.encode(new Uint8Array([...TEST_SECRET, ...TEST_PUBLIC]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const v1_402 = new Response(
  JSON.stringify({
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: 'solana-mainnet',
        maxAmountRequired: '0',
        resource: 'https://api.hey.lol/test',
      },
    ],
  }),
  { status: 402, headers: { 'content-type': 'application/json' } },
);

function v2_402(): Response {
  return new Response(null, {
    status: 402,
    headers: {
      'payment-required': btoa(
        JSON.stringify({
          accepts: [
            {
              scheme: 'exact',
              network: 'solana-mainnet',
              maxAmountRequired: '0',
              resource: 'https://api.hey.lol/test',
            },
          ],
        }),
      ),
    },
  });
}

function makeClient(overrides: { mockFetch?: ReturnType<typeof vi.fn>; retries?: number } = {}) {
  const mockFetch = overrides.mockFetch ?? vi.fn();
  const client = new HeyLolClient({
    privateKey: TEST_KEY,
    network: mockFetch as typeof fetch,
    _sleep: () => Promise.resolve(),
    retries: overrides.retries ?? 3,
  });
  return { client, mockFetch };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HeyLolClient', () => {
  describe('Constructor', () => {
    it('creates client with only privateKey (defaults applied)', () => {
      // Should not throw — defaults are applied internally
      const client = new HeyLolClient({ privateKey: TEST_KEY });
      expect(client).toBeInstanceOf(HeyLolClient);
    });

    it('creates client with all custom options', () => {
      const mockFetch = vi.fn();
      const client = new HeyLolClient({
        privateKey: TEST_KEY,
        baseUrl: 'https://custom.api.example.com',
        retries: 5,
        timeout: 60_000,
        network: mockFetch as typeof fetch,
        _sleep: () => Promise.resolve(),
      });
      expect(client).toBeInstanceOf(HeyLolClient);
    });

    it('throws AuthError for invalid privateKey', () => {
      expect(() => new HeyLolClient({ privateKey: 'not-valid-base58!!!' })).toThrow(AuthError);
    });
  });

  describe('GET success', () => {
    it('returns parsed JSON as T', async () => {
      const { client, mockFetch } = makeClient();
      const payload = { id: '1', authorId: 'u1', content: 'hello', createdAt: '2026-01-01' };
      mockFetch.mockResolvedValueOnce(jsonResponse(payload));

      const result = await client.get<Post>('/v1/posts/1');

      expect(result).toEqual(payload);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST success', () => {
    it('sends body as JSON and returns parsed response', async () => {
      const { client, mockFetch } = makeClient();
      const requestBody = { content: 'my post' };
      const responseBody = { id: '2', authorId: 'u1', content: 'my post', createdAt: '2026-01-01' };
      mockFetch.mockResolvedValueOnce(jsonResponse(responseBody));

      const result = await client.post<Post>('/v1/posts', requestBody);

      expect(result).toEqual(responseBody);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(JSON.stringify(requestBody));
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });
  });

  describe('402 payment loop', () => {
    it('v1: returns 402 then 200, fetch called twice, second call has x-payment header', async () => {
      const { client, mockFetch } = makeClient({ retries: 0 });
      mockFetch.mockResolvedValueOnce(v1_402.clone());
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: '1', authorId: 'u1', content: 'ok', createdAt: '2026-01-01' }),
      );

      const result = await client.get<Post>('/v1/posts/1');

      expect(result.content).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, secondInit] = mockFetch.mock.calls[1] as [string, RequestInit];
      const secondHeaders = secondInit.headers as Record<string, string>;
      expect(secondHeaders['x-payment']).toBeDefined();
    });

    it('v2: returns 402 with payment-required header then 200, uses payment-signature header', async () => {
      const { client, mockFetch } = makeClient({ retries: 0 });
      mockFetch.mockResolvedValueOnce(v2_402());
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: '1', authorId: 'u1', content: 'ok', createdAt: '2026-01-01' }),
      );

      const result = await client.get<Post>('/v1/posts/1');

      expect(result.content).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, secondInit] = mockFetch.mock.calls[1] as [string, RequestInit];
      const secondHeaders = secondInit.headers as Record<string, string>;
      expect(secondHeaders['payment-signature']).toBeDefined();
    });

    it('double 402 rejection: throws PaymentRejectedError on second 402 (no infinite loop)', async () => {
      const { client, mockFetch } = makeClient({ retries: 0 });
      mockFetch.mockResolvedValueOnce(v1_402.clone());
      mockFetch.mockResolvedValueOnce(v1_402.clone());

      await expect(client.get('/v1/posts/1')).rejects.toThrow(PaymentRejectedError);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('429 rate limiting', () => {
    it('retries on 429 with Retry-After: 0', async () => {
      const { client, mockFetch } = makeClient();
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Retry-After': '0' } }),
      );
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: '1', authorId: 'u1', content: 'ok', createdAt: '2026-01-01' }),
      );

      const result = await client.get<Post>('/v1/posts/1');

      expect(result.content).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('retries on 429 without Retry-After header (uses backoff)', async () => {
      const { client, mockFetch } = makeClient();
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 429 }));
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: '1', authorId: 'u1', content: 'ok', createdAt: '2026-01-01' }),
      );

      const result = await client.get<Post>('/v1/posts/1');

      expect(result.content).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('503 server error retry', () => {
    it('retries on 503 and succeeds on second attempt', async () => {
      const { client, mockFetch } = makeClient();
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ id: '1', authorId: 'u1', content: 'ok', createdAt: '2026-01-01' }),
      );

      const result = await client.get<Post>('/v1/posts/1');

      expect(result.content).toBe('ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Non-retryable errors (4xx)', () => {
    it('400 throws APIError immediately, fetch called only once', async () => {
      const { client, mockFetch } = makeClient();
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 400 }));

      await expect(client.get('/v1/posts/1')).rejects.toThrow(APIError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('401 throws APIError immediately', async () => {
      const { client, mockFetch } = makeClient();
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));

      const err = await client.get('/v1/posts/1').catch((e) => e);
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).statusCode).toBe(401);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('404 throws APIError immediately', async () => {
      const { client, mockFetch } = makeClient();
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }));

      const err = await client.get('/v1/posts/1').catch((e) => e);
      expect(err).toBeInstanceOf(APIError);
      expect((err as APIError).statusCode).toBe(404);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fetch failures', () => {
    it('TypeError from fetch throws NetworkError with code FETCH_FAILED', async () => {
      const { client, mockFetch } = makeClient({ retries: 0 });
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const err = await client.get('/v1/posts/1').catch((e) => e);
      expect(err).toBeInstanceOf(NetworkError);
      expect((err as NetworkError).code).toBe('FETCH_FAILED');
    });

    it('DOMException TimeoutError throws NetworkError with code TIMEOUT', async () => {
      const { client, mockFetch } = makeClient({ retries: 0 });
      mockFetch.mockRejectedValueOnce(
        new DOMException('The operation was aborted', 'TimeoutError'),
      );

      const err = await client.get('/v1/posts/1').catch((e) => e);
      expect(err).toBeInstanceOf(NetworkError);
      expect((err as NetworkError).code).toBe('TIMEOUT');
    });
  });

  describe('Retry exhaustion', () => {
    it('429 repeated beyond retries=2 throws RateLimitError after 3 total attempts', async () => {
      const { client, mockFetch } = makeClient({ retries: 2 });
      mockFetch.mockResolvedValue(new Response(null, { status: 429 }));

      await expect(client.get('/v1/posts/1')).rejects.toThrow(RateLimitError);
      // retries=2 means: 1 initial attempt + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response body typing', () => {
    it('get<Post>() returns a typed Post object', async () => {
      const { client, mockFetch } = makeClient();
      const post: Post = { id: '1', authorId: 'u1', content: 'hello', createdAt: '2026-01-01' };
      mockFetch.mockResolvedValueOnce(jsonResponse(post));

      const result = await client.get<Post>('/v1/posts/1');

      // TypeScript compile-time check: accessing typed fields
      expect(result.id).toBe('1');
      expect(result.content).toBe('hello');
      expect(result.authorId).toBe('u1');
    });
  });

  describe('Web API portability', () => {
    it('HeyLolClient.ts source does not reference Node.js-only globals', async () => {
      // Static source analysis — enforces CLT-01 multi-runtime portability
      const { readFileSync } = await import('node:fs');
      const source = readFileSync(
        new URL('../src/client/HeyLolClient.ts', import.meta.url).pathname,
        'utf-8',
      );
      expect(source).not.toMatch(/\bBuffer\b/);
      expect(source).not.toMatch(/\bprocess\.env\b/);
      expect(source).not.toMatch(/\brequire\(/);
      expect(source).not.toMatch(/__dirname/);
      expect(source).not.toMatch(/\bprocess\.argv\b/);
    });
  });
});
