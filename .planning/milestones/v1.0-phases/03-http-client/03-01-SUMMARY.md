---
phase: 03-http-client
plan: 01
subsystem: api
tags: [http, retry, exponential-backoff, error-handling, typescript]

# Dependency graph
requires:
  - phase: 02-core-crypto-and-auth
    provides: HeyLolError base class and error hierarchy from errors/index.ts
provides:
  - RateLimitError and APIError extending HeyLolError with typed discriminants
  - withRetry exponential backoff utility with injectable sleep for testing
  - calcBackoffMs full-jitter backoff calculation (AWS recommendation)
  - parseRetryAfterMs parsing integer seconds and HTTP-date Retry-After headers
  - ClientOptions interface with privateKey, baseUrl, retries, timeout, network, _sleep
  - DEFAULT_OPTIONS constant with baseUrl/retries/timeout defaults
  - Post, Profile, User stub domain interfaces for Phase 4 expansion
affects:
  - 03-http-client (Plan 03-02 uses these types directly)
  - 04-api-methods (expands domain stubs with full fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Full-jitter exponential backoff (AWS Architecture Blog pattern)
    - Injectable sleep function for deterministic retry testing
    - Barrel index.ts per module (src/client/index.ts)
    - Coverage exclusion of barrel/type-only files in vitest.config.ts

key-files:
  created:
    - packages/sdk/src/client/options.ts
    - packages/sdk/src/client/retry.ts
    - packages/sdk/src/client/index.ts
    - packages/sdk/src/types/domain.ts
    - packages/sdk/tests/retry.test.ts
  modified:
    - packages/sdk/src/errors/index.ts
    - packages/sdk/src/types/index.ts
    - packages/sdk/tests/errors.test.ts
    - packages/sdk/vitest.config.ts

key-decisions:
  - "NetworkError.code union narrowed to 'FETCH_FAILED' | 'TIMEOUT' — RATE_LIMITED moved to dedicated RateLimitError class for proper discriminant isolation"
  - "withRetry retries on 502 in addition to 503 — both indicate transient upstream failures"
  - "barrel files (client/index.ts, auth/index.ts) and options.ts excluded from coverage — these are type/re-export only files with no callable runtime code"
  - "_sleep injection pattern chosen over mocking Date/setTimeout — cleaner test boundary, no global state contamination"

patterns-established:
  - "Injectable sleep pattern: all retry tests pass sleep: () => Promise.resolve() to avoid real delays"
  - "Retry retryable status codes: 502 and 503 are transient; 400, 404, 500 are non-retryable"
  - "Barrel exclusion from coverage: add pure re-export index.ts files to vitest.config.ts exclude list"

requirements-completed: [CLT-02, CLT-03, CLT-04, CLT-05]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 03 Plan 01: Error Hierarchy + Retry Infrastructure Summary

**RateLimitError/APIError error classes, full-jitter exponential backoff retry with injectable sleep, ClientOptions interface, and Post/Profile/User domain stubs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T21:34:37Z
- **Completed:** 2026-03-01T21:36:47Z
- **Tasks:** 2 of 2
- **Files modified:** 9

## Accomplishments
- Extended error hierarchy with `RateLimitError` (429 + Retry-After) and `APIError` (4xx/5xx), both in `SdkError` union
- Built `withRetry` with full-jitter exponential backoff, respecting `Retry-After` header and injectable sleep for zero-delay tests
- Defined `ClientOptions` interface with all 6 fields and `DEFAULT_OPTIONS` constant
- Created `Post`, `Profile`, `User` stub domain interfaces for Phase 4 expansion
- 104 total tests passing (up from 77), 96.8% statement coverage

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend error hierarchy, add ClientOptions and domain stubs** - `4e3ebf0` (feat)
2. **Task 2: Build exponential backoff retry utility with injectable sleep** - `3307866` (feat)

**Plan metadata:** (docs commit — created after summary)

## Files Created/Modified
- `packages/sdk/src/errors/index.ts` - Narrowed NetworkError.code, added RateLimitError + APIError, expanded SdkError union
- `packages/sdk/src/client/options.ts` - ClientOptions interface, ResolvedOptions type, DEFAULT_OPTIONS
- `packages/sdk/src/client/retry.ts` - calcBackoffMs, parseRetryAfterMs, withRetry
- `packages/sdk/src/client/index.ts` - Barrel export for all client module public APIs
- `packages/sdk/src/types/domain.ts` - Post, Profile, User stub interfaces
- `packages/sdk/src/types/index.ts` - Re-exports domain types
- `packages/sdk/tests/errors.test.ts` - Fixed RATE_LIMITED test, added 9 tests for new error classes
- `packages/sdk/tests/retry.test.ts` - 18 retry tests with injectable sleep, no real delays
- `packages/sdk/vitest.config.ts` - Added barrel/type-only files to coverage exclusion list

## Decisions Made
- `NetworkError.code` narrowed from `'FETCH_FAILED' | 'TIMEOUT' | 'RATE_LIMITED'` to `'FETCH_FAILED' | 'TIMEOUT'` — rate limiting is now `RateLimitError`'s responsibility, preventing two SdkError members sharing the same discriminant
- `withRetry` retries on statusCode 502 (Bad Gateway) in addition to 503 — both are transient upstream failures, not user errors
- `_sleep` injectable parameter preferred over mocking global timers — cleaner isolation, no global state contamination
- Barrel files and type-only files excluded from vitest coverage — same pattern as `src/index.ts` and `src/types/**` already established in Phase 02-01

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed existing test using removed NetworkError 'RATE_LIMITED' code**
- **Found during:** Task 1 (extend error hierarchy)
- **Issue:** `tests/errors.test.ts` line 144 used `new NetworkError({ code: 'RATE_LIMITED', message: 'rate limited' })` which became invalid after narrowing the union
- **Fix:** Changed to `new NetworkError({ code: 'FETCH_FAILED', message: 'fetch failed' })` and updated imports to include new classes
- **Files modified:** `packages/sdk/tests/errors.test.ts`
- **Verification:** All 86 tests pass after fix
- **Committed in:** `4e3ebf0` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added barrel/type-only files to coverage exclusion**
- **Found during:** Task 2 (retry utility)
- **Issue:** Adding `client/index.ts` and `client/options.ts` (pure re-exports and type declarations) pulled function coverage below 90% threshold — same class of problem as `auth/index.ts` which was already 0% covered
- **Fix:** Added `src/auth/index.ts`, `src/client/index.ts`, `src/client/options.ts` to vitest.config.ts exclude list
- **Files modified:** `packages/sdk/vitest.config.ts`
- **Verification:** Coverage for functions goes from 89.65% to 96.15%, all thresholds pass
- **Committed in:** `3307866` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `RateLimitError`, `APIError`, `withRetry`, `ClientOptions`, `DEFAULT_OPTIONS` all ready for Plan 03-02 (`HeyLolClient` implementation)
- Domain stubs ready for Phase 4 expansion with full field definitions
- No blockers — all verification checks pass (tests, typecheck, build)

---
*Phase: 03-http-client*
*Completed: 2026-03-01*
