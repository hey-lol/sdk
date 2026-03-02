---
phase: 05-services-package
plan: 01
subsystem: payments
tags: [x402, zod, services, typescript, vitest]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Monorepo package structure, tsup/vitest build tooling patterns
provides:
  - PriceConfig, ServiceDefinition, VerifyResult, SettleResult TypeScript interfaces
  - registerService() factory function — typed ServiceDefinition constructor with price shallow-copy
  - create402Response() — generates x402 v2 compliant 402 Payment Required Response with base64-encoded PAYMENT-REQUIRED header
  - USDC_MINT constant — CAIP-2 network to USDC mint address map for Solana mainnet + devnet
affects:
  - 05-02-PLAN.md (middleware — imports ServiceDefinition, create402Response)
  - 05-03-PLAN.md (Zod validation — uses ServiceDefinition inputSchema/outputSchema)

# Tech tracking
tech-stack:
  added: [zod (optional peer dep, type-import only), "@x402/core (runtime dep, externalized in tsup)"]
  patterns:
    - Optional peer dep pattern — zod installed as devDep for build/types but declared as optional peer (v3||v4)
    - type-only imports erased at runtime (import type { ZodType }) — no zod runtime cost unless consumer uses schemas
    - btoa(JSON.stringify()) inline for x402 v2 base64 header encoding — avoids full @x402/core/http module pull

key-files:
  created:
    - packages/services/src/types.ts
    - packages/services/src/register.ts
    - packages/services/src/response.ts
    - packages/services/vitest.config.ts
    - packages/services/tests/register.test.ts
    - packages/services/tests/response.test.ts
  modified:
    - packages/services/package.json
    - packages/services/tsup.config.ts
    - packages/services/src/index.ts
    - pnpm-lock.yaml

key-decisions:
  - "Zod devDep at v4 (^4.3.6) with peerDependency ^3.24.0 || ^4.0.0 — installed latest, support both v3+v4 consumers"
  - "create402Response() inlines btoa(JSON.stringify()) rather than importing from @x402/core/http — avoids full module pull for trivial one-liner"
  - "types.ts excluded from coverage via vitest.config.ts — TypeScript interface-only file has no runtime code"
  - "@x402/core externalized in tsup external[] — consumers must provide it, prevents bundling"

patterns-established:
  - "Local vitest.config.ts per services package merges root config and excludes barrel/type files from coverage"
  - "Const arrow factory functions (registerService = <T>(opts) => ...) — zero runtime overhead, established pattern from Phase 04"

requirements-completed: [SVC-02, SVC-05]

# Metrics
duration: 3min
completed: 2026-03-02
---

# Phase 5 Plan 01: Services Package Foundation Summary

**PriceConfig/ServiceDefinition types, registerService() factory, and create402Response() x402 v2 generator for the @heylol/services package with full test coverage and @x402/core + optional Zod dependencies wired**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-02T01:04:39Z
- **Completed:** 2026-03-02T01:07:42Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Established complete type system: PriceConfig, ServiceDefinition (generic TInput/TOutput), VerifyResult, SettleResult interfaces all exported from @heylol/services
- Implemented registerService() factory — typed, const-arrow, shallow-copies price to prevent mutation of caller's object
- Implemented create402Response() — generates x402 v2 compliant 402 Response with base64-encoded PAYMENT-REQUIRED header and USDC_MINT lookup for Solana mainnet/devnet
- 12 tests across 2 test files; 100% coverage on all source files

## Task Commits

Each task was committed atomically:

1. **Task 1: Package setup, types, and registerService()** - `e0583df` (feat)
2. **Task 2: create402Response() and barrel export finalization** - `986be0a` (feat)

**Plan metadata:** `b00f75b` (docs: complete services-package foundation plan)

## Files Created/Modified
- `packages/services/src/types.ts` - PriceConfig, ServiceDefinition, VerifyResult, SettleResult interfaces
- `packages/services/src/register.ts` - registerService() factory with RegisterServiceOptions interface
- `packages/services/src/response.ts` - create402Response(), USDC_MINT, Create402Options interface
- `packages/services/src/index.ts` - Barrel re-exporting all public API (replaces VERSION stub)
- `packages/services/vitest.config.ts` - Local vitest config merging root config, excluding barrel/type files from coverage
- `packages/services/tests/register.test.ts` - 5 tests for registerService()
- `packages/services/tests/response.test.ts` - 7 tests for create402Response() and USDC_MINT
- `packages/services/package.json` - Added @x402/core dep, zod devDep + optional peerDep (v3||v4)
- `packages/services/tsup.config.ts` - Added external: ['zod', '@x402/core']
- `pnpm-lock.yaml` - Updated with new deps

## Decisions Made
- **Zod v4 devDep with v3||v4 peerDep:** pnpm resolved latest (v4.3.6); peerDependency updated to `^3.24.0 || ^4.0.0` to support consumers on either major version
- **btoa() inline:** create402Response() uses btoa(JSON.stringify()) directly rather than importing from @x402/core/http — the encode function does exactly this and inlining avoids pulling in the full module
- **types.ts coverage exclusion:** Interface-only files have no runtime code to cover; excluded via vitest.config.ts following Phase 02 pattern (src/types/**)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added zod as devDependency for DTS build**
- **Found during:** Task 1 (build verification)
- **Issue:** tsup DTS build failed with `TS2307: Cannot find module 'zod'` because `import type { ZodType }` in types.ts requires zod type declarations during .d.ts generation, even though the import is erased at runtime
- **Fix:** Installed zod as devDependency; updated peerDependency to support `^3.24.0 || ^4.0.0` since pnpm resolved v4.3.6
- **Files modified:** packages/services/package.json, pnpm-lock.yaml
- **Verification:** `pnpm --filter @heylol/services build` succeeds with DTS output; zod not bundled in dist (verified via grep)
- **Committed in:** e0583df (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for correct DTS generation. No scope creep.

## Issues Encountered
None beyond the zod DTS issue documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- @heylol/services foundation is complete: types, registerService(), create402Response() all working and tested
- Ready for Phase 05-02: middleware implementation (uses ServiceDefinition and create402Response)
- Ready for Phase 05-03: Zod validation integration (uses ServiceDefinition inputSchema/outputSchema)

---
*Phase: 05-services-package*
*Completed: 2026-03-02*

## Self-Check: PASSED

- All 9 source/test files: FOUND
- Commit e0583df (Task 1): FOUND
- Commit 986be0a (Task 2): FOUND
