import { APIError, RateLimitError } from '../errors/index.js';

/**
 * Calculate full-jitter exponential backoff delay.
 * Formula: Math.random() * Math.min(maxDelay, base * 2^attempt)
 * Source: AWS Architecture Blog exponential backoff + jitter recommendation
 */
export function calcBackoffMs(attempt: number, base = 300, max = 10_000): number {
  const cap = Math.min(max, base * 2 ** attempt);
  return Math.random() * cap;
}

/**
 * Parse the Retry-After header value into milliseconds.
 * Handles both integer seconds ("120") and HTTP-date ("Wed, 21 Oct 2015 07:28:00 GMT").
 * Returns null if header is missing or unparseable.
 */
export function parseRetryAfterMs(response: Response): number | null {
  const val = response.headers.get('retry-after');
  if (!val) return null;
  if (/^\d+$/.test(val)) return Number(val) * 1000;
  const ts = Date.parse(val);
  return Number.isNaN(ts) ? null : Math.max(0, ts - Date.now());
}

/**
 * Retry wrapper with exponential backoff for transient failures.
 *
 * Only retries on RateLimitError or APIError with a retryable status code (502, 503).
 * Respects Retry-After via RateLimitError.retryAfterMs when available.
 * Accepts an injectable sleep function for fast tests.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    retries: number;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<T> {
  const sleepFn = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let lastErr: unknown;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      const isRetryable =
        err instanceof RateLimitError ||
        (err instanceof APIError && (err.statusCode === 503 || err.statusCode === 502));

      if (!isRetryable || attempt === opts.retries) {
        throw err;
      }

      const retryAfterMs = err instanceof RateLimitError ? err.retryAfterMs : undefined;
      await sleepFn(retryAfterMs ?? calcBackoffMs(attempt));
    }
  }

  throw lastErr; // unreachable, but TypeScript needs it
}
