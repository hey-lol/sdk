import { describe, expect, it, vi } from 'vitest';
import { calcBackoffMs, parseRetryAfterMs, withRetry } from '../src/client/retry.js';
import { APIError, RateLimitError } from '../src/errors/index.js';

describe('calcBackoffMs', () => {
  it('returns a value between 0 and base (300) for attempt=0', () => {
    for (let i = 0; i < 100; i++) {
      const result = calcBackoffMs(0);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(300);
    }
  });

  it('returns values in the expected range for attempt=2', () => {
    // base=300, attempt=2: cap = min(10000, 300 * 4) = 1200
    for (let i = 0; i < 100; i++) {
      const result = calcBackoffMs(2);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1200);
    }
  });

  it('caps at max (10000) for high attempt values', () => {
    // attempt=5, base=300: 300 * 32 = 9600 < 10000 → cap = 9600
    // attempt=6, base=300: 300 * 64 = 19200 > 10000 → cap = 10000
    for (let i = 0; i < 100; i++) {
      const result = calcBackoffMs(6);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10_000);
    }
  });

  it('respects custom base and max', () => {
    // attempt=0, base=100, max=500 → cap = min(500, 100) = 100
    for (let i = 0; i < 100; i++) {
      const result = calcBackoffMs(0, 100, 500);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    }
  });
});

describe('parseRetryAfterMs', () => {
  function makeResponse(retryAfterValue: string | null): Response {
    const headers = new Headers();
    if (retryAfterValue !== null) {
      headers.set('retry-after', retryAfterValue);
    }
    return new Response(null, { headers });
  }

  it('returns null when retry-after header is missing', () => {
    const response = makeResponse(null);
    expect(parseRetryAfterMs(response)).toBeNull();
  });

  it('returns seconds * 1000 for integer value', () => {
    const response = makeResponse('120');
    expect(parseRetryAfterMs(response)).toBe(120_000);
  });

  it('returns milliseconds until HTTP-date for date value', () => {
    // Use a future date to ensure positive result
    const future = new Date(Date.now() + 60_000);
    const response = makeResponse(future.toUTCString());
    const result = parseRetryAfterMs(response);
    expect(result).not.toBeNull();
    // Should be within ~5 seconds of 60000 (accounting for test execution time)
    expect(result!).toBeGreaterThan(50_000);
    expect(result!).toBeLessThanOrEqual(60_000);
  });

  it('returns null for unparseable value', () => {
    const response = makeResponse('invalid');
    expect(parseRetryAfterMs(response)).toBeNull();
  });

  it('returns 0 for a past HTTP-date', () => {
    const past = new Date(Date.now() - 60_000);
    const response = makeResponse(past.toUTCString());
    const result = parseRetryAfterMs(response);
    expect(result).toBe(0);
  });
});

describe('withRetry', () => {
  const noSleep = () => Promise.resolve();

  it('returns result on first success (no retry)', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { retries: 3, sleep: noSleep });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on RateLimitError and succeeds on second attempt', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new RateLimitError({ message: 'rate limited' }))
      .mockResolvedValue('success');
    const result = await withRetry(fn, { retries: 3, sleep: noSleep });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on APIError with statusCode 503 and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new APIError({ message: 'service unavailable', statusCode: 503 }))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { retries: 3, sleep: noSleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on APIError with statusCode 502 and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new APIError({ message: 'bad gateway', statusCode: 502 }))
      .mockResolvedValue('ok');
    const result = await withRetry(fn, { retries: 3, sleep: noSleep });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on APIError with statusCode 400 — throws immediately', async () => {
    const err = new APIError({ message: 'bad request', statusCode: 400 });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { retries: 3, sleep: noSleep })).rejects.toThrow(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on plain Error — throws immediately', async () => {
    const err = new Error('unexpected');
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { retries: 3, sleep: noSleep })).rejects.toThrow(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    const err = new RateLimitError({ message: 'always rate limited' });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withRetry(fn, { retries: 2, sleep: noSleep })).rejects.toThrow(err);
    // attempt=0, attempt=1, attempt=2 → 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses retryAfterMs from RateLimitError when available', async () => {
    const err = new RateLimitError({ message: 'rate limited', retryAfterMs: 5000 });
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    await withRetry(fn, { retries: 3, sleep });
    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it('calls sleep with calcBackoffMs result when retryAfterMs is not available', async () => {
    const err = new RateLimitError({ message: 'rate limited' }); // no retryAfterMs
    const fn = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');
    const sleep = vi.fn().mockResolvedValue(undefined);
    await withRetry(fn, { retries: 3, sleep });
    expect(sleep).toHaveBeenCalledTimes(1);
    // sleep was called with a backoff value between 0 and 300 (attempt=0, base=300)
    const callArg = sleep.mock.calls[0][0];
    expect(callArg).toBeGreaterThanOrEqual(0);
    expect(callArg).toBeLessThanOrEqual(300);
  });
});
