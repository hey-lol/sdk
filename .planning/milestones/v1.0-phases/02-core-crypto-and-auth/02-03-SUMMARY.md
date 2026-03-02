---
phase: 02-core-crypto-and-auth
plan: 03
subsystem: auth
tags: [x402, payment-required, base64, response-parsing, header-builder, btoa, atob, tdd, typescript, web-api]

# Dependency graph
requires:
  - phase: 02-core-crypto-and-auth
    plan: 01
    provides: AuthError with X402_PARSE_FAILED code, error hierarchy

provides:
  - packages/sdk/src/types/x402.ts — PaymentRequirements, PaymentPayload, PaymentHeader interfaces
  - packages/sdk/src/auth/x402.ts — getPaymentVersion, parsePaymentRequirements, buildPaymentHeader, PAYMENT_HEADERS
  - packages/sdk/tests/x402.test.ts — 19 TDD tests for x402 parsing and header construction

affects: [02-04, 03-adapters, all plans using x402 response parsing or payment header construction]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - x402 version auto-detection via getPaymentVersion() inspecting response headers before body
    - Async parsePaymentRequirements() to support both v1 JSON body (.json()) and v2 header (atob/JSON.parse)
    - buildPaymentHeader() as pure function — no side effects, returns PaymentHeader struct
    - btoa/atob (Web API) for base64 encoding/decoding — zero Node.js built-ins
    - Type-only files (src/types/**) excluded from coverage thresholds

key-files:
  created:
    - packages/sdk/src/types/x402.ts
    - packages/sdk/src/auth/x402.ts
    - packages/sdk/tests/x402.test.ts
  modified:
    - packages/sdk/vitest.config.ts (added src/types/** to coverage exclude)

key-decisions:
  - "parsePaymentRequirements is async because v1 requires await response.json() — return type is Promise<PaymentRequirements[]>"
  - "btoa/atob used for base64 (available in all edge runtimes) — no Buffer or Node.js crypto needed"
  - "getPaymentVersion returns null for ambiguous 402 responses — caller must handle null explicitly"
  - "src/types/** excluded from coverage — TypeScript interface-only files have no runtime code to cover"
  - "PAYMENT_HEADERS constant uses as const for typed string literals accessible by callers"

patterns-established:
  - "Pattern: x402 auto-detection — check header before body, v2 takes priority over v1"
  - "Pattern: all x402 parse failures throw AuthError with code X402_PARSE_FAILED (try/catch wraps both paths)"
  - "Pattern: buildPaymentHeader is pure — takes requirements + signedTx + version, returns {headerName, headerValue}"

requirements-completed: [AUTH-02, AUTH-04, AUTH-05]

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 02 Plan 03: x402 Response Parser and Header Builder Summary

**x402 v1/v2 auto-detecting response parser and payment header constructor using Web API btoa/atob — zero Node.js built-ins**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T13:53:15Z
- **Completed:** 2026-03-01T13:56:00Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- `getPaymentVersion()` auto-detects x402 protocol version from Response headers (v2: `payment-required` header, v1: `content-type: application/json`)
- `parsePaymentRequirements()` async parser handles both v2 base64 header and v1 JSON body, throws `AuthError(X402_PARSE_FAILED)` for all invalid inputs
- `buildPaymentHeader()` pure function constructs base64-encoded JSON payload with correct header name (`x-payment` for v1, `payment-signature` for v2)
- 19 TDD tests covering version detection, parsing (v1/v2/multi-accepts/error cases), and header construction (base64 round-trip, header names, versioning)
- Zero Node.js built-ins — all base64 operations via `btoa`/`atob` (Web API)

## Task Commits

Each task was committed atomically (TDD Red+Green):

1. **RED: x402 type definitions and failing tests** - `c969e1f` (test)
2. **GREEN: x402 parser and header builder implementation** - `e1e6e11` (feat)

_Note: TDD tasks split into RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `packages/sdk/src/types/x402.ts` - PaymentRequirements, PaymentPayload, PaymentHeader TypeScript interfaces
- `packages/sdk/src/auth/x402.ts` - PAYMENT_HEADERS constant, getPaymentVersion(), parsePaymentRequirements(), buildPaymentHeader()
- `packages/sdk/tests/x402.test.ts` - 19 TDD tests with inline fixtures for v1/v2 mock responses
- `packages/sdk/vitest.config.ts` - Added `src/types/**` to coverage exclude list (interface-only files)

## Decisions Made
- `parsePaymentRequirements` is `async` because v1 protocol requires `await response.json()`. Both paths (v1 and v2) are async for consistent API.
- `btoa`/`atob` chosen for base64 encoding — available in all edge runtimes (V8 Isolates, Deno, browser). No Node.js `Buffer` needed.
- `getPaymentVersion` returns `null` not `throw` for non-x402 responses — callers can check the version before calling `parsePaymentRequirements`.
- `src/types/**` added to vitest coverage exclude — TypeScript interfaces compile away to nothing, 0% coverage is expected and not meaningful.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Coverage threshold failure due to type-only file included in coverage**
- **Found during:** Task 1 (GREEN phase — running full test suite)
- **Issue:** `src/types/x402.ts` contains only TypeScript interfaces which compile to no runtime code. Coverage tool reported 0% for all metrics on this file, pulling overall coverage below the 90% threshold.
- **Fix:** Added `src/types/**` to the coverage `exclude` list in `packages/sdk/vitest.config.ts`. This matches the existing pattern used for `src/index.ts` and `src/services.ts` (stub files).
- **Files modified:** `packages/sdk/vitest.config.ts`
- **Verification:** All 77 tests pass, overall coverage 96.92% (above 90% threshold)
- **Committed in:** `e1e6e11` (GREEN task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix necessary for the plan's own verification criteria (coverage threshold). No scope creep — pattern consistent with how other non-implementation files are excluded.

## Issues Encountered
- The plan's verify command `pnpm --filter @heylol/sdk test -- x402.test` uses a test-name filter. When only x402-named tests run, `buildDummyTransaction` tests in `solana.test.ts` don't execute, dropping coverage. Resolved by running `pnpm --filter @heylol/sdk test` (no filter) for coverage verification — all 77 tests pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `parsePaymentRequirements` and `buildPaymentHeader` are ready for use in 02-04 (HTTP client integration)
- `PAYMENT_HEADERS` constants available for HTTP client to send/receive correct header names
- All x402 v1/v2 protocol logic is isolated in `auth/x402.ts` — HTTP client does not need to know protocol internals
- `AuthError(X402_PARSE_FAILED)` is the typed error boundary for all parse failures

---
*Phase: 02-core-crypto-and-auth*
*Completed: 2026-03-01*

## Self-Check: PASSED

All files verified present:
- FOUND: packages/sdk/src/types/x402.ts
- FOUND: packages/sdk/src/auth/x402.ts
- FOUND: packages/sdk/tests/x402.test.ts
- FOUND: .planning/phases/02-core-crypto-and-auth/02-03-SUMMARY.md

All commits verified:
- FOUND: c969e1f (test(02-03): RED — failing x402 tests)
- FOUND: e1e6e11 (feat(02-03): GREEN — x402 implementation)
- FOUND: 510570c (docs(02-03): complete plan)
