---
phase: 08-ci-and-type-integrity
plan: 02
subsystem: api
tags: [x402, typescript, types, circular-imports]

# Dependency graph
requires:
  - phase: 02-core-crypto-and-auth
    provides: parsePaymentRequirements and PaymentRequirements type that this plan updates
  - phase: 03-http-client
    provides: HeyLolClient.ts which has the circular barrel import this plan fixes
provides:
  - PaymentRequirements type with `amount` as required v2 canonical field and `maxAmountRequired` as optional deprecated v1 alias
  - normalizeRequirements() helper ensuring `amount` is always populated regardless of wire format version
  - HeyLolClient.ts with direct imports from ./options.js and ./retry.js (no circular barrel dependency)
affects: [consumers of PaymentRequirements type, any phase using HeyLolClient imports]

# Tech tracking
tech-stack:
  added: []
  patterns: [v2-first type design with v1 backward-compat alias, normalizer function for wire format differences]

key-files:
  created: []
  modified:
    - packages/sdk/src/types/x402.ts
    - packages/sdk/src/auth/x402.ts
    - packages/sdk/tests/x402.test.ts
    - packages/sdk/tests/client.test.ts
    - packages/sdk/src/client/HeyLolClient.ts

key-decisions:
  - "PaymentRequirements.amount is the v2 canonical required field; maxAmountRequired is optional deprecated alias for v1 compat"
  - "normalizeRequirements() ensures amount is always set on parsed output — v1 wire data falls back from maxAmountRequired"
  - "resource: string -> resource?: string because v2 puts this in the PaymentRequired wrapper, not per-requirement"
  - "asset?: string added for v2 token mint address field"
  - "HeyLolClient.ts imports DEFAULT_OPTIONS from ./options.js and retry functions from ./retry.js directly — no barrel cycle"

patterns-established:
  - "Wire format normalization: add helper function that ensures canonical fields are always populated, with fallback for older wire formats"
  - "Direct sub-module imports: when a file is re-exported by a barrel, import from the source file directly to avoid circular deps"

requirements-completed: [AUTH-04, TYPE-01]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 08 Plan 02: Type Alignment and Circular Import Fix Summary

**PaymentRequirements type aligned to x402 v2 wire format (`amount` canonical field, `maxAmountRequired` deprecated alias) and HeyLolClient barrel circular import eliminated via direct sub-module imports**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T15:39:11Z
- **Completed:** 2026-03-02T15:41:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `PaymentRequirements` interface now uses `amount: string` as the required canonical field (x402 v2 aligned) with `maxAmountRequired?: string` as the optional deprecated v1 alias
- `parsePaymentRequirements()` gains a `normalizeRequirements()` helper that ensures `amount` is always populated on the parsed output (v1 wire data falls back from `maxAmountRequired` via `??`); both v1 and v2 parse paths use it
- `HeyLolClient.ts` circular dependency resolved by replacing `import ... from './index.js'` with direct imports from `./options.js` and `./retry.js`
- All 165 tests pass; typecheck exits 0; build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Align PaymentRequirements type with x402 v2 and update tests** - `4743584` (feat)
2. **Task 2: Break circular barrel import in HeyLolClient** - `30f7ca9` (fix)

## Files Created/Modified

- `packages/sdk/src/types/x402.ts` - `amount: string` required, `maxAmountRequired?: string` deprecated alias, `resource?: string` optional, `asset?: string` added
- `packages/sdk/src/auth/x402.ts` - `normalizeRequirements()` helper added; both v1 and v2 parse paths updated to use it
- `packages/sdk/tests/x402.test.ts` - `FIXTURE_REQUIREMENTS` and `FIXTURE_REQUIREMENTS_V2` updated to include `amount: '0'`; assertion changed from `maxAmountRequired` to `amount`
- `packages/sdk/tests/client.test.ts` - `v1_402` and `v2_402()` wire fixtures updated to include `amount: '0'`
- `packages/sdk/src/client/HeyLolClient.ts` - Direct imports from `./options.js` and `./retry.js` replace circular `./index.js` import

## Decisions Made

- `amount` is the v2 canonical required field on `PaymentRequirements`; `maxAmountRequired` becomes optional deprecated alias — keeps v1 responses representable while forcing callers to use the v2 field name
- `normalizeRequirements()` is defensive normalization: even if a v2 server sends v1-style field names, the parsed output always has `amount` set
- `resource` made optional because x402 v2 puts the resource URL in the outer `PaymentRequired` wrapper, not per-requirement
- Direct imports in `HeyLolClient.ts` are the correct fix for barrel circular dependencies — each module imports from the file that defines the symbol, not from the re-exporting barrel

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed trailing comma in packages/sdk/package.json causing JSON parse error**
- **Found during:** Task 1 (typecheck step)
- **Issue:** `exports` object had a trailing comma making `package.json` invalid JSON; pnpm errored with `Expected double-quoted property name`
- **Fix:** Trailing comma removed (detected and fixed automatically by the Biome pre-commit hook during file writing)
- **Files modified:** `packages/sdk/package.json`
- **Verification:** `pnpm --filter @heylol/sdk typecheck` succeeded after fix
- **Committed in:** 4743584 (Task 1 commit — Biome applied fix automatically)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** The package.json trailing comma was a pre-existing issue blocking the typecheck step; Biome auto-corrected it during commit. No scope creep.

## Issues Encountered

None beyond the auto-fixed trailing comma in package.json.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PaymentRequirements type is now fully v2-aligned; any downstream code that accesses `requirements.amount` will work correctly
- Circular import eliminated; tree-shaking tools and bundlers targeting HeyLolClient will no longer see the cycle
- All 165 SDK tests green; build artifacts regenerated cleanly

---
*Phase: 08-ci-and-type-integrity*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: packages/sdk/src/types/x402.ts
- FOUND: packages/sdk/src/auth/x402.ts
- FOUND: packages/sdk/src/client/HeyLolClient.ts
- FOUND: .planning/phases/08-ci-and-type-integrity/08-02-SUMMARY.md
- FOUND commit: 4743584 (feat(08-02): align PaymentRequirements type)
- FOUND commit: 30f7ca9 (fix(08-02): break circular barrel import)
