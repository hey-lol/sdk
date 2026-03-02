---
phase: 09-size-limit-fix-and-tech-debt-cleanup
plan: 01
subsystem: infra
tags: [size-limit, bundle, exports, api-surface]

# Dependency graph
requires:
  - phase: 08-ci-and-type-integrity
    provides: PaymentRequirements v2 type alignment and HeyLolClient circular import fix
provides:
  - Bundle size enforcement referencing only existing dist files (packages/sdk/dist/index.mjs)
  - Clean public API surface with encodeCompactU16 and PAYMENT_HEADERS removed from @heylol/sdk exports
  - Correct README retryAfterMs / 1000 display with s suffix
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - .size-limit.json
    - packages/sdk/src/auth/index.ts
    - packages/sdk/src/index.ts
    - README.md

key-decisions:
  - "encodeCompactU16 is an internal auth utility — it must not be exported from @heylol/sdk public API surface"
  - "PAYMENT_HEADERS is an internal constant — consumers should use buildPaymentHeader() not the raw header names"
  - "size-limit.json services.mjs entry was vestigial from Phase 8 cleanup that removed the /services subpath entry"

patterns-established: []

requirements-completed:
  - INFRA-06

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 9 Plan 01: Size-Limit Fix and Tech Debt Cleanup Summary

**Stale services.mjs removed from .size-limit.json, encodeCompactU16 and PAYMENT_HEADERS stripped from @heylol/sdk public exports, and README retryAfterMs display corrected to divide by 1000 before appending 's' suffix**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T16:43:40Z
- **Completed:** 2026-03-02T16:45:22Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Removed stale `services.mjs` entry from `.size-limit.json` — `pnpm turbo size-check` now passes (14.2 kB, well under 100 kB limit)
- Removed `encodeCompactU16` from `packages/sdk/src/auth/index.ts` barrel and `PAYMENT_HEADERS` from `packages/sdk/src/index.ts` public API — neither symbol appears in dist exports
- Fixed README error-handling example: `${err.retryAfterMs / 1000}s` instead of `${err.retryAfterMs}s`
- Full CI validation passed: 226 tests across all packages, lint, typecheck, and size-check all green

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix size-limit config and remove leaked public API exports** - `7e2ad82` (fix)
2. **Task 2: Fix README retryAfterMs display and verify SUMMARY frontmatter** - `611047a` (fix)
3. **Task 3: Full CI validation** - No commit (validation-only task — no files changed)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `.size-limit.json` - Removed `services.mjs` entry; single entry for `packages/sdk/dist/index.mjs` remains
- `packages/sdk/src/auth/index.ts` - Removed `encodeCompactU16` from named export on line 3
- `packages/sdk/src/index.ts` - Removed `PAYMENT_HEADERS` from auth re-export block
- `README.md` - Fixed error-handling example line 171: `err.retryAfterMs / 1000` with `s` suffix

## Decisions Made
- `encodeCompactU16` is intentionally internal — confirmed no other source file imports it from the auth barrel (only `solana.ts` uses it via local reference)
- `PAYMENT_HEADERS` is an internal constant (raw header name strings) — consumers use `buildPaymentHeader()` to construct the actual header values
- `04-02-SUMMARY.md` already had POST-01..07 and PROF-01..04 in requirements-completed — no edit needed
- `06-02-SUMMARY.md` already had TYPE-04 in requirements-completed — no edit needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All Phase 9 success criteria satisfied:
1. `pnpm turbo size-check` exits 0 (14.2 kB)
2. `04-02-SUMMARY.md` frontmatter contains POST-01..07, PROF-01..04
3. `06-02-SUMMARY.md` frontmatter contains TYPE-04
4. `encodeCompactU16` and `PAYMENT_HEADERS` not exported from `@heylol/sdk`
5. README displays `retryAfterMs / 1000` with `s` suffix

Phase 9 complete. All v1.0 milestone gap-closure items resolved.

## Self-Check: PASSED

- .size-limit.json: FOUND
- packages/sdk/src/auth/index.ts: FOUND
- packages/sdk/src/index.ts: FOUND
- 09-01-SUMMARY.md: FOUND
- Commit 7e2ad82: FOUND (fix - remove stale size-limit entry and leaked exports)
- Commit 611047a: FOUND (fix - README retryAfterMs display)

---
*Phase: 09-size-limit-fix-and-tech-debt-cleanup*
*Completed: 2026-03-02*
