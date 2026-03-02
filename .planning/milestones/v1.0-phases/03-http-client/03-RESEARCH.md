# Phase 3: HTTP Client - Research

**Researched:** 2026-03-01
**Domain:** Fetch-based HTTP client, exponential backoff retry, typed error hierarchy, x402 402-retry loop, domain object response mapping
**Confidence:** HIGH (fetch/retry patterns well-established; x402 retry loop pattern confirmed from coinbase/x402 reference impl; error class extension from Phase 2)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLT-01 | Fetch-based HTTP client works in Node.js, Cloudflare Workers, Vercel Edge, and browsers | `fetch`, `AbortController`, `AbortSignal.timeout` all confirmed available in Node.js 18+, Cloudflare Workers (fixed bug #1020 closed Oct 2023), Vercel Edge; no polyfills needed |
| CLT-02 | Auto-retry with exponential backoff and jitter on transient failures (429, 503) | Full-jitter formula documented: `Math.min(maxDelay, base * 2^attempt) * Math.random()`; Retry-After header parsing for both seconds and HTTP-date format; retry on 429/503 only (plus optional 408/500/502/504) |
| CLT-03 | Typed error hierarchy (HeyLolError, AuthError, RateLimitError, APIError, NetworkError) | Phase 2 already defines `HeyLolError`, `AuthError`, `NetworkError`; this phase adds `RateLimitError` and `APIError`; ES2022 class inheritance confirmed working (no `Object.setPrototypeOf` needed — prior decision) |
| CLT-04 | Methods return domain objects (Post, Profile, User), not raw HTTP responses | Cast-via-interface pattern: `response.json() as Post`; no runtime validation unless Zod peer dep present; types go in `src/types/` (covered by Phase 4 TYPE-01, Phase 3 just needs stubs) |
| CLT-05 | Client accepts configurable options (retries, timeout, network) | Constructor options object with Partial defaults: `retries` (default 3), `timeout` (default 30000ms), `network` (injectable fetch function for testing) |
</phase_requirements>

---

## Summary

Phase 3 wraps Phase 2's auth primitives in an HTTP client class. The client's only new logic is: (1) a 402-retry loop that calls `parsePaymentRequirements`, `buildDummyTransaction`, `buildPaymentHeader` in sequence, (2) an exponential backoff retry loop for 429/503, and (3) typed error emission for every failure mode. Everything else — crypto, x402 parsing, header construction — is already done.

The critical design constraint is that the 402-retry loop and the transient-failure retry loop are **separate concerns**. The 402 loop runs exactly once per request (probe → pay → retry), guarded by a `paymentAttempted` boolean to prevent loops. The transient-failure loop runs up to `retries` times only on 429/503. Conflating them leads to infinite loops or payment re-attempts on transient failures.

The `network` option (injectable fetch function) is the key testability pattern. By accepting `fetch` as a constructor parameter, the client can be tested in Vitest with `vi.fn()` mocks without any module mocking. This pattern is used by both the Anthropic and OpenAI Node SDKs. The injectable fetch also satisfies CLT-01 — adapters can pass platform-specific fetch implementations in Phase 6.

**Primary recommendation:** Build in three plans: (1) error hierarchy extension + client skeleton + options interface, (2) 402-retry loop + transient-failure retry + core `request()` method, (3) typed method wrappers (`get<T>`, `post<T>`) + test harness wiring. Domain object types (`Post`, `Profile`, `User`) are stub interfaces for Phase 3; Phase 4 populates them.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `fetch` | Built-in | HTTP requests | Available in Node.js 18+, all edge runtimes, browsers; no dependency |
| Native `AbortController` | Built-in | Request cancellation and timeout | Standard across all target runtimes; AbortSignal.timeout available everywhere (Cloudflare bug closed 2023) |
| Phase 2 auth exports | workspace | `parsePaymentRequirements`, `buildDummyTransaction`, `buildPaymentHeader`, `loadKeypair`, `HeyLolError` | Already built and exported from `@heylol/sdk` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` + `vi.fn()` | catalog | Mock fetch for retry and 402-loop tests | Inject fetch as constructor param; `vi.fn().mockResolvedValueOnce()` for sequence mocking |
| MSW (Mock Service Worker) | optional | Integration-level HTTP mock | Only if sequence mocking in vi.fn() becomes unwieldy; not needed for unit tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled retry | `exponential-backoff` npm package | Package is 0-dep but adds a dep for ~10 lines of code; hand-roll is cleaner for this use case |
| Hand-rolled retry | `@lifeomic/attempt` | Same tradeoff — overkill for 3 retry types |
| Injectable fetch | Node.js module mock | Module mocking is fragile across ESM and requires `vi.mock()` hoisting; constructor injection is cleaner and works the same in all runtimes |
| `AbortSignal.timeout()` | Manual `AbortController` + `setTimeout` | `AbortSignal.timeout()` is cleaner; the Cloudflare spurious-log bug is closed; use it |

**Installation:** No new dependencies. All primitives are built-in or from Phase 2.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── client/
│   ├── HeyLolClient.ts    # Main client class
│   ├── retry.ts           # Exponential backoff + Retry-After parsing
│   ├── options.ts         # ClientOptions interface + defaults
│   └── index.ts           # Barrel export
├── errors/
│   └── index.ts           # Extended with RateLimitError + APIError (Phase 3 adds)
├── types/
│   ├── domain.ts          # Post, Profile, User stub interfaces
│   └── index.ts           # Re-exports (extended in Phase 4)
├── auth/                  # Phase 2 — unchanged
└── index.ts               # Main entry — add HeyLolClient export
```

### Pattern 1: Injectable Fetch for Testability and Runtime Portability

**What:** Accept a `fetch`-compatible function as a constructor option with `globalThis.fetch` as default.
**When to use:** All clients that need to work across runtimes and be unit-testable without module mocking.

```typescript
// Source: Anthropic SDK pattern, verified from github.com/anthropics/anthropic-sdk-typescript
export interface ClientOptions {
  privateKey: string;
  baseUrl?: string;
  retries?: number;
  timeout?: number;
  network?: typeof fetch; // injectable fetch
}

export class HeyLolClient {
  private readonly fetch: typeof fetch;
  private readonly options: Required<ClientOptions>;

  constructor(opts: ClientOptions) {
    this.fetch = opts.network ?? globalThis.fetch;
    this.options = {
      baseUrl: opts.baseUrl ?? 'https://api.hey.lol',
      retries: opts.retries ?? 3,
      timeout: opts.timeout ?? 30_000,
      network: this.fetch,
      privateKey: opts.privateKey,
    };
  }
}
```

### Pattern 2: Separate 402-Retry Loop from Transient-Failure Retry

**What:** Two distinct retry mechanisms with separate guards. Never mix them.
**When to use:** Any client that must handle both x402 authentication and network transients.

```typescript
// Source: x402 protocol pattern + coinbase/x402 reference implementation
async request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const doRequest = async (paymentAttempted = false): Promise<T> => {
    const signal = AbortSignal.timeout(this.options.timeout);
    const response = await this.fetch(`${this.options.baseUrl}${path}`, {
      method,
      signal,
      headers: this.buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    // 402: attempt payment once, then retry
    if (response.status === 402) {
      if (paymentAttempted) {
        throw new PaymentRejectedError({ code: 'PAYMENT_REJECTED', message: 'Payment rejected by server' });
      }
      const paymentHeader = await this.buildPayment(response);
      this.pendingPaymentHeader = paymentHeader;
      return doRequest(true); // retry with payment header, paymentAttempted=true
    }

    this.pendingPaymentHeader = null; // clear after use

    if (!response.ok) {
      throw this.mapError(response);
    }

    return response.json() as Promise<T>;
  };

  return withRetry(doRequest, { retries: this.options.retries });
}
```

### Pattern 3: Exponential Backoff with Full Jitter

**What:** `delay = Math.random() * Math.min(maxDelay, base * 2^attempt)`. Full jitter spreads load better than equal jitter for API clients.
**When to use:** All transient failures (429, 503). Respect `Retry-After` when present.

```typescript
// Source: AWS Architecture Blog exponential backoff + jitter research, verified
function calcBackoffMs(attempt: number, base = 300, max = 10_000): number {
  const cap = Math.min(max, base * Math.pow(2, attempt));
  return Math.random() * cap; // full jitter
}

function parseRetryAfterMs(response: Response): number | null {
  const val = response.headers.get('retry-after');
  if (!val) return null;
  if (/^\d+$/.test(val)) return Number(val) * 1000; // seconds
  const ts = Date.parse(val);
  return Number.isNaN(ts) ? null : Math.max(0, ts - Date.now()); // HTTP-date
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { retries: number },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === opts.retries) throw err;
      const retryAfter = err instanceof NetworkError ? err.retryAfterMs : null;
      const delay = retryAfter ?? calcBackoffMs(attempt);
      await sleep(delay);
    }
  }
  throw lastError;
}
```

### Pattern 4: Error Hierarchy Extension (Phase 3 additions)

**What:** Add `RateLimitError` and `APIError` to the existing Phase 2 hierarchy.
**When to use:** Map HTTP status codes to typed errors at the response boundary.

```typescript
// Source: Stripe/Anthropic SDK error pattern, verified
export class RateLimitError extends HeyLolError {
  readonly code: 'RATE_LIMITED';
  readonly retryAfterMs?: number;

  constructor(args: { message: string; retryAfterMs?: number }) {
    super({ code: 'RATE_LIMITED', message: args.message });
    this.name = 'RateLimitError';
    this.code = 'RATE_LIMITED';
    this.retryAfterMs = args.retryAfterMs;
  }
}

export class APIError extends HeyLolError {
  readonly code: 'API_ERROR';
  readonly statusCode: number;

  constructor(args: { message: string; statusCode: number }) {
    super({ code: 'API_ERROR', message: args.message });
    this.name = 'APIError';
    this.code = 'API_ERROR';
    this.statusCode = args.statusCode;
  }
}
```

### Anti-Patterns to Avoid

- **Mixing 402 loop with transient retry:** A 402 on the retry attempt means the payment was rejected, not that it should retry again. Guard with `paymentAttempted` boolean.
- **Retrying non-idempotent methods on 5xx:** Only retry GET, HEAD, OPTIONS on 500/502/503/504. Never retry POST/DELETE on server errors (risk of duplicate mutations). For this phase, target mutations aren't present yet — apply the guard now.
- **Retrying 400, 401, 403, 404:** These are permanent failures. Throw immediately; never retry.
- **Using `setTimeout` for backoff in tests:** Tests that sleep are slow. Design backoff to accept a `sleep` function so tests can inject `() => Promise.resolve()`.
- **Mutating the original Request between retries:** Construct a fresh Request object on each attempt (or pass the URL+options directly to fetch). `Response` bodies are consumed after first read.
- **Calling `response.json()` twice:** Body streams can only be consumed once. If you parse the 402 response body for v1 x402, the response is consumed. `parsePaymentRequirements` handles this — don't re-read the body after calling it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry-After header date parsing | Custom date logic | The two-branch pattern: `/^\d+$/.test(val)` → seconds; `Date.parse(val)` → HTTP-date | HTTP-date parsing via `Date.parse` is reliable; seconds check is trivial; this is well-understood and tested |
| Fetch cancellation / timeout | Custom timer with fetch abort | `AbortSignal.timeout(ms)` | Supported in all target runtimes (Node 18+, CF Workers, Vercel Edge); one line instead of a cleanup mess |
| Response type narrowing | Custom JSON schema validation | TypeScript cast `as T` with interface types | Zod is an optional peer dep per prior decision; Phase 3 doesn't require runtime validation — that's Phase 5 (services) territory |
| Error class prototype chains | `Object.setPrototypeOf` | Native ES2022 class extends | Prior decision confirmed: ES2022 class inheritance works correctly in this monorepo's tsconfig target |

**Key insight:** The retry logic itself (10-15 lines) is simpler than any library's API. The sleep injection for testability is the only non-obvious detail.

---

## Common Pitfalls

### Pitfall 1: Infinite 402 Loop

**What goes wrong:** Client gets a 402, sends payment, gets another 402 (payment rejected), sends payment again — loops forever.
**Why it happens:** No guard on payment attempts. Happens when the payment header is malformed, the dummy transaction is expired, or the server rejects the payment but still returns 402.
**How to avoid:** `paymentAttempted` boolean — passed into the inner request function. If 402 arrives and `paymentAttempted === true`, throw `PaymentRejectedError` immediately.
**Warning signs:** Test hangs or hits max call stack. Add a max-attempt guard even on the 402 loop as a belt-and-suspenders safety net.

### Pitfall 2: Response Body Consumed Before Payment Parsing

**What goes wrong:** Code calls `await response.text()` or `await response.json()` to check for an error body, then passes the same Response to `parsePaymentRequirements` — which needs `.json()` on it for v1 x402.
**Why it happens:** Response body streams are single-read. After `.json()` or `.text()`, the body is gone.
**How to avoid:** Check `response.status === 402` **before** any body reads. Pass the pristine Response to `parsePaymentRequirements`. Only read the body for non-402 responses.
**Warning signs:** `parsePaymentRequirements` throws `X402_PARSE_FAILED` on a valid API response.

### Pitfall 3: AbortSignal.timeout Not Carried Across Retries

**What goes wrong:** A per-request `AbortSignal.timeout(30000)` is created once and reused for all retry attempts. After a timeout fires on attempt 1, the signal is already aborted — all subsequent attempts abort immediately.
**Why it happens:** `AbortSignal.timeout()` creates a one-shot signal. Once triggered, it stays aborted.
**How to avoid:** Create a fresh `AbortSignal.timeout(this.options.timeout)` inside the retry loop on **each attempt**, not outside it.
**Warning signs:** Retry attempts immediately throw `TimeoutError` without making a network call.

### Pitfall 4: Retrying POST/PATCH/DELETE on Transient Errors

**What goes wrong:** Client retries a `POST /posts` on 503 — creates duplicate posts.
**Why it happens:** Retry logic doesn't check HTTP method. Generic "retry on 5xx" is only safe for idempotent methods.
**How to avoid:** In Phase 3, the only mutations are internal (payment retry, which is its own loop). When Phase 4 adds API methods, enforce: retry GET on 408/429/500/502/503/504; retry POST/PATCH/DELETE only on 429 (rate limit, not duplicate risk) and 503 with Retry-After.
**Warning signs:** Duplicate resources appear in integration tests after artificial 503 injection.

### Pitfall 5: Leaking Keypair in Error Messages

**What goes wrong:** An error thrown during request building includes the base58 private key in the message string (e.g., from `loadKeypair` call inside the client constructor).
**Why it happens:** `String(error)` or template literals in catch blocks stringify the full error chain.
**How to avoid:** The existing `HeyLolError.toJSON()` strips secrets — that's already done. Never put `keypair.secretKey` or the raw `privateKey` string in any error message. Client stores the loaded `Keypair` object, never the original base58 string.
**Warning signs:** Test assertions on error messages accidentally match private key bytes.

### Pitfall 6: Not Passing AbortSignal Through to Inner Fetch Calls During 402 Retry

**What goes wrong:** The payment retry makes a second `fetch()` call without a timeout signal, so the second call can hang indefinitely even though the original request had a timeout.
**Why it happens:** Developers create the signal for the initial request and forget to pass it to the retry.
**How to avoid:** Create the timeout signal before the `doRequest` closure. Pass it into each fetch call within the same request lifecycle, or create a fresh per-attempt signal inside the retry loop.

---

## Code Examples

Verified patterns from research sources and existing Phase 2 code:

### Full Client Request Method Skeleton

```typescript
// Based on x402 protocol pattern + Anthropic SDK structure
async request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  let paymentHeader: { headerName: string; headerValue: string } | null = null;

  const attempt = async (): Promise<T> => {
    const signal = AbortSignal.timeout(this.options.timeout);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (paymentHeader) {
      headers[paymentHeader.headerName] = paymentHeader.headerValue;
    }

    const response = await this.fetch(`${this.options.baseUrl}${path}`, {
      method,
      signal,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 402) {
      if (paymentHeader !== null) {
        // Payment was already sent — server rejected it
        throw new PaymentRejectedError({
          code: 'PAYMENT_REJECTED',
          message: `Payment rejected (${path})`,
        });
      }
      const requirements = await parsePaymentRequirements(response);
      const req = requirements[0]; // select first accepted requirement
      const tx = buildDummyTransaction(this.keypair.publicKey, req.network);
      const signed = signTransaction(tx, this.keypair.secretKey);
      const version = getPaymentVersion(response) ?? 1;
      paymentHeader = buildPaymentHeader(req, signed, version);
      return attempt(); // retry with payment header
    }

    if (response.status === 429) {
      const retryAfterMs = parseRetryAfterMs(response);
      throw new RateLimitError({ message: 'Rate limited', retryAfterMs: retryAfterMs ?? undefined });
    }

    if (!response.ok) {
      throw new APIError({ message: `API error ${response.status}`, statusCode: response.status });
    }

    return response.json() as Promise<T>;
  };

  return withRetry(attempt, { retries: this.options.retries, retryOn: [429, 503] });
}
```

### Backoff with Injected Sleep (Testable)

```typescript
// sleep injection enables fast tests without actual delays
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    retries: number;
    retryOn: number[];
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<T> {
  const sleepFn = opts.sleep ?? ((ms: number) => new Promise(r => setTimeout(r, ms)));
  let lastErr: unknown;
  for (let i = 0; i <= opts.retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable =
        err instanceof RateLimitError ||
        (err instanceof APIError && opts.retryOn.includes(err.statusCode));
      if (!isRetryable || i === opts.retries) throw err;
      const retryAfterMs = err instanceof RateLimitError ? err.retryAfterMs : undefined;
      await sleepFn(retryAfterMs ?? calcBackoffMs(i));
    }
  }
  throw lastErr;
}
```

### Vitest Pattern for Testing Retry Sequence

```typescript
// Source: Vitest mockResolvedValueOnce pattern for sequential responses
it('retries on 429 and succeeds', async () => {
  const mockFetch = vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'retry-after': '0' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: '1' }), { status: 200 }));

  const client = new HeyLolClient({
    privateKey: TEST_KEY,
    network: mockFetch,
    retries: 3,
  });

  const result = await client.get('/test');
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(result).toEqual({ id: '1' });
});
```

### Timeout Signal Per Attempt

```typescript
// Fresh signal per attempt — avoids already-aborted signal on retry
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  const signal = AbortSignal.timeout(timeoutMs); // new signal each iteration
  try {
    const res = await fetch(url, { signal });
    // ...
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new NetworkError({ code: 'TIMEOUT', message: `Request timed out after ${timeoutMs}ms` });
    }
    throw new NetworkError({ code: 'FETCH_FAILED', message: String(err) });
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `node-fetch` polyfill | Native `fetch` (Node 18+) | Node 18 (2022), stable Node 20 (2023) | No polyfill needed; one less dependency; works in edge runtimes natively |
| `axios` for retries | Hand-rolled fetch wrapper with AbortSignal | 2023-2024 | Axios doesn't work in all edge runtimes; fetch is universal |
| `Object.setPrototypeOf` in Error subclasses | ES2022 native class extends | TypeScript ES2022 target | Already confirmed in Phase 2 — no workaround needed |
| `AbortController` + `setTimeout` for timeout | `AbortSignal.timeout(ms)` | Node 17.3 / Cloudflare Workers 2022 | One line instead of timer cleanup code; Cloudflare bug #1020 closed Oct 2023 |
| Axios interceptors for auth | Constructor-injected payment logic | x402 protocol era (2024-2025) | Payment logic lives in client, not middleware; testable, predictable |

**Deprecated/outdated:**
- `node-fetch` v2/v3: No longer needed. Node 18+ has native fetch.
- `cross-fetch` / `isomorphic-fetch`: No longer needed for this stack (Node 18+, CF Workers, Vercel Edge all have native fetch).
- `Object.setPrototypeOf(this, new.target.prototype)` in Error subclasses: Not needed with ES2022 class semantics — confirmed in Phase 2.

---

## Open Questions

1. **Which HTTP methods are present in Phase 3 vs Phase 4?**
   - What we know: Phase 3 goal is the client skeleton. Phase 4 adds all API method wrappers.
   - What's unclear: Does Phase 3 ship `get<T>()` / `post<T>()` generic methods, or does it only ship the internal `request()` method?
   - Recommendation: Ship `get<T>()` and `post<T>()` as thin typed wrappers over `request()` in Phase 3. Phase 4 then calls those. Keeps Phase 4 plans focused on API coverage, not client internals.

2. **Does `buildDummyTransaction` need the target URL or is it network-agnostic?**
   - What we know: Phase 2 built `buildDummyTransaction(publicKey, network)` where `network` comes from the `PaymentRequirements.network` field.
   - What's unclear: Does the Solana dummy tx need to encode the specific resource URL, or is it wallet-identification only?
   - Recommendation: Use the Phase 2 implementation as-is. The `network` field from PaymentRequirements drives chain selection. Document the LOW-confidence blockhash convention concern from Phase 2 STATE.md — will require integration test validation.

3. **Should `signTransaction` be a new function in Phase 3, or is it already in Phase 2?**
   - What we know: Phase 2 has `buildDummyTransaction` (builds tx bytes) and `ed25519.sign` is available via `@noble/curves`. The `buildPaymentHeader` expects a signed `Uint8Array`.
   - What's unclear: Is there a `signTransaction(tx, secretKey)` helper already, or does the client need to call `ed25519.sign` directly?
   - Recommendation: Check Phase 2 code before writing Phase 3 plan. If not present, add a thin `signTransaction(txBytes: Uint8Array, secretKey: Uint8Array): Uint8Array` helper to `src/auth/solana.ts` in Phase 3, exported from `auth/index.ts`.

4. **What domain object stubs are needed in Phase 3?**
   - What we know: `CLT-04` requires methods return typed objects. Phase 4 adds POST-*, PROF-* etc. requirements with full types.
   - What's unclear: Phase 3 needs enough type stubs so `get<T>` compiles without `any`.
   - Recommendation: Add minimal `Post`, `Profile`, `User` interfaces to `src/types/domain.ts` in Phase 3 with required ID fields only. Phase 4 expands them.

---

## Sources

### Primary (HIGH confidence)
- Phase 2 codebase (`packages/sdk/src/auth/`, `packages/sdk/src/errors/`) — existing interfaces, error classes, and auth primitives Phase 3 consumes
- `developers.cloudflare.com/workers/runtime-apis/web-standards/` — AbortController/AbortSignal confirmed supported in Cloudflare Workers
- `github.com/cloudflare/workerd/issues/1020` — AbortSignal.timeout spurious-log bug confirmed CLOSED Oct 2023 (PR #1177 merged)
- `developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static` — AbortSignal.timeout specification

### Secondary (MEDIUM confidence)
- `aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/` — Full jitter formula recommendation; canonical source
- `tasukehub.com/articles/nodejs-fetch-timeout-retry-guide` — Retry-After parsing patterns (seconds + HTTP-date), per-attempt signal creation
- `7blocklabs.com/blog/embedding-x402-in-sdks-making-pay-required-developer-friendly` — x402 SDK embedding patterns; paymentAttempted guard; receipt handling
- `github.com/anthropics/anthropic-sdk-typescript` — Injectable fetch pattern; retry with typed errors; constructor options interface
- `github.com/stripe/stripe-node/wiki/Error-Handling` — Error class hierarchy pattern; StripeError → subtypes with status codes
- `stainless.com/sdk-api-best-practices/standard-error-handling-patterns-in-sdks-across-languages` — Standard SDK error mapping (HTTP status → typed exception)

### Tertiary (LOW confidence)
- `coinbase/x402` GitHub repository ecosystem (via search) — `x402-fetch` uses `wrapFetchWithPayment` pattern with similar 402-retry logic; not directly read but consistent with 7blocklabs article
- MSW for integration testing fetch — Community pattern; not verified against vitest catalog version

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primitives are native or from Phase 2; no new dependencies
- Architecture: HIGH — fetch wrapper + 402-retry loop is a known pattern with multiple reference implementations
- Retry/backoff logic: HIGH — AWS blog formula + tasukehub implementation verified; Retry-After parsing is straightforward
- Error hierarchy: HIGH — extends Phase 2 classes which are already confirmed working in ES2022
- Pitfalls: HIGH — body-consumed, infinite-loop, and stale-signal pitfalls are all real and well-documented
- Domain type stubs: MEDIUM — stubs are trivial TypeScript; risk is only in not knowing final Phase 4 shape yet

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable web standards; no fast-moving deps)
