---
phase: 03-http-client
plan: "02"
subsystem: api
tags: [x402, solana, fetch, web-api, retry, payments, http-client]

# Dependency graph
requires:
  - phase: 03-01
    provides: "withRetry, ClientOptions, _sleep injection, RateLimitError, APIError, NetworkError, PaymentRejectedError"
  - phase: 02-core-crypto-and-auth
    provides: "loadKeypair, buildDummyTransaction, buildPaymentHeader, parsePaymentRequirements, getPaymentVersion"

provides:
  - "HeyLolClient class with get<T>(), post<T>(), patch<T>(), delete<T>() typed HTTP methods"
  - "Inline 402 payment loop with paymentHeader guard preventing infinite loops"
  - "429/503 retry integration via withRetry; 400/401/403/404 immediate APIError"
  - "NetworkError wrapping for fetch failures and AbortSignal timeouts"
  - "HeyLolClient exported from @heylol/sdk main entry point"
  - "RateLimitError, APIError, Post, Profile, User added to @heylol/sdk main exports"
  - "19-test mock-fetch suite covering all error paths and payment loop scenarios"

affects: ["04-service-layer", "05-testing", "06-adapters"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "402 payment loop as inline closure with paymentHeader variable guard (not delegated)"
    - "AbortSignal.timeout created fresh per attempt (not reused across retries)"
    - "Injectable _sleep and network (fetch) for test isolation without global mocking"
    - "Static source analysis test enforcing Web API portability (no Node.js globals)"

key-files:
  created:
    - packages/sdk/src/client/HeyLolClient.ts
    - packages/sdk/tests/client.test.ts
  modified:
    - packages/sdk/src/client/index.ts
    - packages/sdk/src/index.ts

key-decisions:
  - "402 payment loop implemented inline in request() closure, not delegated to a helper function — keeps loop guard (paymentHeader) in same scope as retry logic"
  - "getPaymentVersion() result null-coalesced to 1 on 402 response — safe default for servers that omit version header"
  - "Second 402 after payment header already sent throws PaymentRejectedError — prevents infinite loop without complex state machines"
  - "comment wording uses 'no node-specific globals' instead of listing 'Buffer' — static analysis test checks source text for literal word"

patterns-established:
  - "Payment loop pattern: paymentHeader = null guard, inline attempt closure, recursive call after setting paymentHeader"
  - "Error wrapping pattern: catch fetch TypeError/DOMException, wrap in NetworkError with FETCH_FAILED or TIMEOUT code"
  - "Test isolation pattern: inject mockFetch + _sleep:() => Promise.resolve() to prevent real network calls and timer delays"

requirements-completed: [CLT-01, CLT-02, CLT-03, CLT-04, CLT-05]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 3 Plan 02: HeyLolClient Summary

**HeyLolClient class with inline 402 payment loop, withRetry integration, and typed HTTP methods — all using zero Node.js built-ins (Web API only)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-01T21:39:51Z
- **Completed:** 2026-03-01T21:42:51Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- HeyLolClient class with request(), get(), post(), patch(), delete() — all returning typed Promise<T>
- Inline 402 payment loop: null paymentHeader guard prevents infinite loops, second 402 throws PaymentRejectedError
- 429/503 responses trigger withRetry backoff; 400/401/403/404 throw APIError immediately with no retry
- Fresh AbortSignal.timeout created per attempt — correctly isolated across retries
- All 5 CI checks pass: build (10.86 KB ESM), lint (no errors), typecheck, test (123 tests), size-check (13.6 KB)
- HeyLolClient, RateLimitError, APIError, Post, Profile, User all exported from @heylol/sdk main entry

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement HeyLolClient class with 402 loop, retry integration, and typed HTTP methods** - `934e8a3` (feat)
2. **Task 2: Wire barrel exports, update SDK entry point, and validate full CI pipeline** - `8be46b3` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `packages/sdk/src/client/HeyLolClient.ts` - Main SDK client class with 402 loop and typed HTTP methods
- `packages/sdk/tests/client.test.ts` - 19-test mock-fetch suite covering all error paths and payment loop scenarios
- `packages/sdk/src/client/index.ts` - Barrel export updated to include HeyLolClient
- `packages/sdk/src/index.ts` - Main SDK entry updated with HeyLolClient, RateLimitError, APIError, Post, Profile, User

## Decisions Made

- **Inline 402 loop:** The `attempt` closure captures `paymentHeader` from the outer `request()` scope. After a 402, `paymentHeader` is set and `attempt()` is called recursively — same closure, updated guard. This avoids passing state through function parameters and keeps the loop readable.
- **Null-coalesce version to 1:** `getPaymentVersion(response) ?? 1` — on a 402 where the function returns null (malformed but still 402), we default to v1 format rather than throwing. This is a permissive fallback.
- **Comment wording fix:** The source file JSDoc comment originally said "no Buffer" — the word `Buffer` would trip the static analysis test that checks for the literal word. Changed to "no node-specific globals" to avoid false positive while preserving intent.
- **Unused import removed:** `ResolvedOptions` was imported from options.ts but not used in HeyLolClient.ts — removed to keep the file clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment text triggered static analysis test for 'Buffer'**
- **Found during:** Task 1 (Web API portability test)
- **Issue:** JSDoc comment in HeyLolClient.ts said "no Buffer, process, require, __dirname" — the literal word `Buffer` in the comment caused the `expect(source).not.toMatch(/\bBuffer\b/)` test to fail
- **Fix:** Rewrote comment to say "no node-specific globals or built-ins" instead
- **Files modified:** packages/sdk/src/client/HeyLolClient.ts
- **Verification:** Test passes after comment change
- **Committed in:** 934e8a3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: test false positive from comment text)
**Impact on plan:** Trivial fix — one-line comment change. No behavior change. No scope creep.

## Issues Encountered

None beyond the comment-text test false positive described above.

## Next Phase Readiness

- HeyLolClient is the complete SDK surface — Phase 4 can build service layer objects that use `client.get<T>()` / `client.post<T>()` directly
- All typed domain interfaces (Post, Profile, User) are exported and ready for Phase 4 expansion
- No blockers. CI is fully green.

---
*Phase: 03-http-client*
*Completed: 2026-03-01*
