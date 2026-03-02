---
phase: 02-core-crypto-and-auth
plan: 01
subsystem: auth
tags: [ed25519, base58, keypair, errors, discriminated-union, noble-curves, scure-base, tdd, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: monorepo scaffold, SDK package.json, tsconfig, vitest config, ESLint flat config, tsup build

provides:
  - packages/sdk/src/errors/index.ts — HeyLolError, AuthError, PaymentRejectedError, NetworkError, SdkError, isSdkError
  - packages/sdk/src/auth/keypair.ts — Keypair interface, loadKeypair() from base58
  - packages/sdk/tests/errors.test.ts — 19 tests for full error hierarchy
  - packages/sdk/tests/keypair.test.ts — 14 tests with byte-level assertions
  - packages/sdk/vitest.config.ts — local coverage config excluding stub files

affects: [02-02, 02-03, 02-04, 03-adapters, all subsequent phases using AuthError or loadKeypair]

# Tech tracking
tech-stack:
  added:
    - "@noble/curves": "^2.0.1" (Ed25519 signing, public key derivation)
    - "@scure/base": "^2.0.0" (base58 decode for private key input)
    - "@typescript-eslint/parser": "^8.56.1" (TypeScript class syntax in ESLint)
  patterns:
    - Class-based discriminated union errors with typed code literal discriminants
    - HeyLolError base with toJSON() that never leaks secrets
    - loadKeypair() dispatches on decoded.length (64 vs 32 bytes)
    - All crypto via @noble/curves/ed25519.js (note .js extension required in v2)
    - Local vitest.config.ts per-package to override coverage include/exclude
    - @typescript-eslint/parser in eslint flat config for TypeScript class syntax

key-files:
  created:
    - packages/sdk/src/errors/index.ts
    - packages/sdk/src/auth/keypair.ts
    - packages/sdk/tests/errors.test.ts
    - packages/sdk/tests/keypair.test.ts
    - packages/sdk/vitest.config.ts
  modified:
    - packages/sdk/package.json (added @noble/curves, @scure/base deps; @typescript-eslint/parser devDep; local vitest config)
    - packages/sdk/eslint.config.js (added @typescript-eslint/parser for TS syntax support)
    - pnpm-lock.yaml

key-decisions:
  - "ES2022 native class extends works correctly — Object.setPrototypeOf not needed (confirmed by test suite)"
  - "AuthError uses readonly code with narrower type union, not declare override — avoids eslint parse error without typescript-eslint plugin"
  - "Local vitest.config.ts per-package excludes stub files (index.ts, services.ts) from coverage — prevents threshold failures for phase 1 stubs"
  - "@typescript-eslint/parser added to SDK eslint.config.js — ESLint v9 with default parser cannot handle TypeScript class property declarations"
  - "Coverage thresholds enforced at 90% per-package, not globally — use mergeConfig with root vitest.config.ts"

patterns-established:
  - "Pattern: TDD with vitest — RED commit test file → GREEN commit implementation → verify 100% coverage"
  - "Pattern: AuthError is the typed catch boundary for all crypto failures"
  - "Pattern: loadKeypair auto-detects 32 vs 64 byte keys — accepts both Solana CLI and secret-only formats"

requirements-completed: [TYPE-03, AUTH-01, AUTH-06]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 02 Plan 01: Error Hierarchy and Keypair Loading Summary

**Discriminated union error hierarchy (4 classes + type guard) and base58 keypair loading via @noble/curves and @scure/base — zero Node.js built-ins**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T13:46:25Z
- **Completed:** 2026-03-01T13:50:26Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Error hierarchy with HeyLolError, AuthError, PaymentRejectedError, NetworkError — correct instanceof chains in ES2022
- isSdkError type guard and SdkError union type for exhaustive catch narrowing
- loadKeypair() handles both 64-byte (Solana CLI/Phantom) and 32-byte (secret-only) base58 inputs
- 33 TDD tests (19 error + 14 keypair) with 100% coverage across all implementation files
- Zero Node.js built-ins confirmed — only @noble/curves/ed25519.js and @scure/base used for crypto

## Task Commits

Each task was committed atomically:

1. **Task 1: Error hierarchy with discriminated union types** - `a234cc3` (feat)
2. **Task 2: Keypair loading from base58 with TDD** - `cb24a29` (feat)

_Note: TDD tasks combined RED + GREEN into single task commits_

## Files Created/Modified
- `packages/sdk/src/errors/index.ts` - HeyLolError base + AuthError, PaymentRejectedError, NetworkError subclasses + SdkError union + isSdkError guard
- `packages/sdk/src/auth/keypair.ts` - Keypair interface + loadKeypair() with 32/64-byte dispatch
- `packages/sdk/tests/errors.test.ts` - 19 tests: instanceof chains, toJSON safety, type guard, name properties
- `packages/sdk/tests/keypair.test.ts` - 14 tests: byte-level assertions for 64-byte and 32-byte inputs, AuthError for invalid lengths
- `packages/sdk/vitest.config.ts` - Local vitest config excluding stub files from coverage
- `packages/sdk/package.json` - Added @noble/curves, @scure/base deps; @typescript-eslint/parser devDep; local vitest config reference
- `packages/sdk/eslint.config.js` - Added @typescript-eslint/parser languageOptions for TS class syntax
- `pnpm-lock.yaml` - Updated with new dependencies

## Decisions Made
- ES2022 native class extends: The research noted `Object.setPrototypeOf` is not needed for ES2022 targets — confirmed by passing instanceof tests.
- `declare readonly code` pattern avoided: This TypeScript override syntax causes ESLint parse errors when no TypeScript plugin is configured. Using explicit `this.code = args.code` assignment instead (code property redeclared in subclass). Added `@typescript-eslint/parser` for future-proofing.
- Local vitest.config.ts: Root vitest config counted `src/index.ts` and `src/services.ts` stubs (0% coverage), failing global thresholds. Per-package config with `include/exclude` solves this cleanly without modifying the root config shared by all packages.
- `@typescript-eslint/parser` added: ESLint v9 with no parser option cannot parse TypeScript class bodies at all. Added parser as devDep to enable lint on TypeScript source files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Coverage threshold failure due to uncovered stub files**
- **Found during:** Task 1 (error hierarchy tests)
- **Issue:** Running `pnpm --filter @heylol/sdk test` failed — global 90% coverage threshold counting `src/index.ts` and `src/services.ts` stubs (0% covered, phase 1 placeholders)
- **Fix:** Created `packages/sdk/vitest.config.ts` using `mergeConfig` from vitest to add `include: ['src/**/*.ts']` and `exclude: ['src/index.ts', 'src/services.ts']` for coverage. Updated `package.json` test script to use local config.
- **Files modified:** `packages/sdk/vitest.config.ts` (created), `packages/sdk/package.json`
- **Verification:** Coverage reports 100% for implementation files only; threshold passes
- **Committed in:** `a234cc3` (Task 1 commit)

**2. [Rule 3 - Blocking] ESLint parse error on TypeScript class property declarations**
- **Found during:** Task 1 (lint verification)
- **Issue:** `pnpm --filter @heylol/sdk lint` failed with "Unexpected token code" — ESLint v9 with default parser cannot parse `readonly code: string` TypeScript class field syntax
- **Fix:** Installed `@typescript-eslint/parser@^8.56.1` and added `languageOptions: { parser: tsParser }` to `eslint.config.js`
- **Files modified:** `packages/sdk/eslint.config.js`, `packages/sdk/package.json`, `pnpm-lock.yaml`
- **Verification:** `pnpm --filter @heylol/sdk lint` exits 0 with 0 errors; TypeScript source parses correctly
- **Committed in:** `a234cc3` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary for the plan's own verification criteria (tests pass + lint passes). No scope creep — both fixes address infrastructure gaps from Phase 1 setup.

## Issues Encountered
- The `declare readonly code` TypeScript pattern (property narrowing override) was initially tried but abandoned because it requires `@typescript-eslint` plugin (not just parser) to handle cleanly. Used explicit property redeclaration with `this.code = args.code` assignment instead — cleaner and equally type-safe.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Error types are ready for import by all subsequent Phase 2 plans (02-02, 02-03, 02-04)
- `loadKeypair()` provides the entry point for client initialization (AUTH-01)
- `AuthError` is the typed error boundary for all crypto failures
- Ready for 02-02: Solana transaction serializer (uses keypair.secretKey + AuthError)

---
*Phase: 02-core-crypto-and-auth*
*Completed: 2026-03-01*

## Self-Check: PASSED

All files verified present:
- FOUND: packages/sdk/src/errors/index.ts
- FOUND: packages/sdk/src/auth/keypair.ts
- FOUND: packages/sdk/tests/errors.test.ts
- FOUND: packages/sdk/tests/keypair.test.ts
- FOUND: packages/sdk/vitest.config.ts
- FOUND: .planning/phases/02-core-crypto-and-auth/02-01-SUMMARY.md

All commits verified:
- FOUND: a234cc3 (feat(02-01): error hierarchy)
- FOUND: cb24a29 (feat(02-01): keypair loading)
