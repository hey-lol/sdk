---
phase: 08-ci-and-type-integrity
plan: 01
subsystem: infra
tags: [ci, github-actions, pnpm, attw, tsup, monorepo]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: packageManager field in root package.json (pnpm@10.21.0)
  - phase: 05-services-package
    provides: @heylol/services and @heylol/sdk packages with tsup configs
provides:
  - CI workflows use correct pnpm version from packageManager field
  - attw validates all 5 publishable packages (not just SDK)
  - @heylol/services has no phantom dependencies
  - @heylol/sdk exports map is clean (root only, no vestigial subpaths)
affects: [08-02-ci-and-type-integrity, future release workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - pnpm/action-setup@v4 without version: field reads packageManager from root package.json
    - attw loop over packages/*/ validates all publishable packages in one step

key-files:
  created: []
  modified:
    - .github/workflows/ci.yml
    - .github/workflows/release.yml
    - packages/services/package.json
    - packages/services/tsup.config.ts
    - packages/sdk/package.json
    - packages/sdk/tsup.config.ts
  deleted:
    - packages/sdk/src/services.ts

key-decisions:
  - "pnpm/action-setup@v4 with no version: block reads packageManager field — removing hardcoded version: 9 fixes pnpm@10.21.0 mismatch"
  - "attw loop for pkg in packages/*/ validates all 5 packages — @heylol/adapter-cloudflare, @heylol/adapter-vercel, @heylol/adapter-express included alongside sdk and services"
  - "@x402/core was never imported in services source — phantom dep removed from both dependencies and tsup external array"
  - "@heylol/sdk/services subpath exported only SERVICES_VERSION constant — entirely vestigial, removed from exports/typesVersions/tsup entry/source"

patterns-established:
  - "CI attw validation: loop over packages/*/ for full monorepo coverage rather than per-package hardcoding"
  - "Phantom dependency audit: cross-check tsup external[] against actual imports before adding to dependencies"

requirements-completed: [INFRA-01, INFRA-04, INFRA-05]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 8 Plan 01: CI and Type Integrity — Configuration Fixes Summary

**CI pnpm version corrected to read from packageManager field, attw expanded to all 5 packages, phantom @x402/core dependency removed, and vestigial @heylol/sdk/services subpath fully cleaned up.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T15:38:58Z
- **Completed:** 2026-03-02T15:40:42Z
- **Tasks:** 2
- **Files modified:** 7 (including 1 deleted)

## Accomplishments
- Both CI workflows (ci.yml and release.yml) now omit version: override on pnpm/action-setup@v4, sourcing pnpm@10.21.0 from root packageManager field
- attw validation in CI now loops all packages/*/ covering all 5 publishable packages, not just @heylol/sdk
- @x402/core removed from @heylol/services dependencies and tsup external array — it was never imported in source code
- @heylol/sdk/services subpath completely removed: exports map, typesVersions, tsup entry, and src/services.ts (contained only SERVICES_VERSION constant)
- Both packages rebuild cleanly and pass attw validation with no problems

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix CI pnpm version and expand attw coverage** - `1694783` (chore)
2. **Task 2: Remove @x402/core phantom dependency and SDK services subpath** - `bba9e96` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `.github/workflows/ci.yml` - Removed version: 9 from Setup pnpm; replaced single-package attw with packages/*/ loop
- `.github/workflows/release.yml` - Removed version: 9 from Setup pnpm step
- `packages/services/package.json` - Removed @x402/core from dependencies (field now absent)
- `packages/services/tsup.config.ts` - Changed external from ['zod', '@x402/core'] to ['zod']
- `packages/sdk/package.json` - Removed ./services export entry and entire typesVersions field; fixed trailing comma
- `packages/sdk/tsup.config.ts` - Removed services: 'src/services.ts' entry from entry object
- `packages/sdk/src/services.ts` - **DELETED** (contained only `export const SERVICES_VERSION = '1.0.0'`)

## Decisions Made
- pnpm/action-setup@v4 reads packageManager when version: is omitted — removing the hardcoded `version: 9` block is sufficient to pick up pnpm@10.21.0
- attw loop pattern `for pkg in packages/*/` is more maintainable than per-package hardcoding as new adapters are added
- @x402/core was a phantom dependency — added historically when services was planned to use x402 internals, never imported in actual source
- @heylol/sdk/services existed only to provide SERVICES_VERSION; the subpath added complexity (exports map, typesVersions, separate tsup entry, separate source file) with zero consumer value

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Trailing comma in sdk/package.json after removing ./services entry**
- **Found during:** Task 2 (Remove SDK services subpath)
- **Issue:** The Edit tool left a trailing comma after the "." exports entry closing brace when removing the "./services" sibling key, producing invalid JSON that caused pnpm to error with `ERR_PNPM_JSON_PARSE`
- **Fix:** Removed the trailing comma from the exports object closing brace
- **Files modified:** packages/sdk/package.json
- **Verification:** `pnpm --filter @heylol/services build` succeeded after fix; both packages built and passed attw
- **Committed in:** bba9e96 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug introduced by edit operation)
**Impact on plan:** Single trailing comma in JSON — necessary fix, zero scope creep.

## Issues Encountered
- Trailing comma in package.json after removing ./services exports entry required immediate fix before builds could run. Diagnosed quickly from pnpm's ERR_PNPM_JSON_PARSE error message.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CI now validates all packages with correct pnpm version — ready for 08-02 (TypeScript strict mode and additional type integrity work)
- Both @heylol/sdk and @heylol/services pass attw cleanly after structural cleanup

---
*Phase: 08-ci-and-type-integrity*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: .planning/phases/08-ci-and-type-integrity/08-01-SUMMARY.md
- FOUND: .github/workflows/ci.yml
- FOUND: .github/workflows/release.yml
- FOUND deleted: packages/sdk/src/services.ts removed
- FOUND commit: 1694783 (Task 1)
- FOUND commit: bba9e96 (Task 2)
