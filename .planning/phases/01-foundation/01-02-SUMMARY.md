---
phase: 01-foundation
plan: 02
subsystem: infra
tags: [tsup, eslint, esm, cjs, dual-format, exports-map, typescript, declarations]

# Dependency graph
requires:
  - phase: 01-01
    provides: package stubs with placeholder build scripts and pnpm catalog entries for tsup/eslint

provides:
  - tsup.config.ts for all 5 packages (sdk, services, adapter-cloudflare, adapter-vercel, adapter-express)
  - ESM (.mjs) + CJS (.cjs) dual-format builds with .d.ts/.d.cts TypeScript declarations
  - SDK dual entry-point build (index + services subpath)
  - Correct package.json exports maps with types-first, default-last ordering
  - ESLint flat config in SDK banning all 6 restricted Node.js import paths
  - Working typecheck (tsc --noEmit) in all 5 packages
  - packageManager field in root package.json (required for Turborepo workspace resolution)

affects: [01-03, 02-core, 03-adapters, 04-services, 05-examples, 06-ci]

# Tech tracking
tech-stack:
  added:
    - tsup 8.5.1 (build tool, resolved from catalog ^8.0.0)
    - eslint 9.x (flat config, restricted to SDK only, from catalog)
  patterns:
    - tsup.config.ts with outExtension for .mjs/.cjs output, dts:true for declarations
    - For type:module packages, tsup generates .d.ts (ESM) and .d.cts (CJS) — not .d.mts
    - Exports map: import.types -> .d.ts, require.types -> .d.cts for type:module packages
    - ESLint flat config (eslint.config.js) with files glob for per-package scoping
    - no-restricted-imports with paths array format for object-with-message restriction form

key-files:
  created:
    - packages/sdk/tsup.config.ts
    - packages/services/tsup.config.ts
    - packages/adapter-cloudflare/tsup.config.ts
    - packages/adapter-vercel/tsup.config.ts
    - packages/adapter-express/tsup.config.ts
    - packages/sdk/eslint.config.js
  modified:
    - package.json (root) — added packageManager field
    - packages/sdk/package.json — exports map, build/typecheck scripts, eslint devDep
    - packages/services/package.json — exports map, build/typecheck scripts
    - packages/adapter-cloudflare/package.json — exports map, build/typecheck scripts
    - packages/adapter-vercel/package.json — exports map, build/typecheck scripts
    - packages/adapter-express/package.json — exports map, build/typecheck scripts

key-decisions:
  - "tsup with type:module generates .d.ts (not .d.mts) for ESM — exports map import.types points to .d.ts, not .d.mts"
  - "Missing packageManager field in root package.json blocks Turborepo workspace resolution — added pnpm@10.21.0"
  - "ESLint no-restricted-imports uses paths array wrapping (not bare object) when using object-with-message form"
  - "SDK tsup.config.ts uses entry object (not array) for dual entry points to produce named outputs"

patterns-established:
  - "tsup pattern: entry object for named multi-entry, outExtension for .mjs/.cjs, dts:true, splitting:false for libraries"
  - "Exports map pattern: types-first within each condition block, default-last; .d.ts for import.types in type:module packages"
  - "ESLint SDK pattern: eslint.config.js at package root, files glob src/**/*.ts, no-restricted-imports with paths array"

requirements-completed: [INFRA-02, INFRA-03, INFRA-04]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 01 Plan 02: Build Tooling and Exports Summary

**tsup dual-format builds for all 5 packages with ESM+CJS+declarations and ESLint edge-runtime import guards on the SDK**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01T04:17:27Z
- **Completed:** 2026-03-01T04:21:27Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Configured tsup.config.ts for all 5 packages producing ESM (.mjs) + CJS (.cjs) with TypeScript declaration files (.d.ts/.d.cts)
- SDK has dual entry points: index (main) and services (./services subpath export) producing 12 dist files total
- All package.json exports maps use types-first, default-last ordering that passes publint/attw validation patterns
- ESLint flat config in @heylol/sdk bans all 6 restricted Node.js import paths (buffer/node:buffer, crypto/node:crypto, process/node:process) with descriptive edge-runtime error messages
- typecheck (tsc --noEmit) added to all 5 packages, all pass clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure tsup builds and package.json exports maps for all packages** - `8231f25` (feat)
2. **Task 2: Add ESLint Node.js import restrictions on SDK package** - `97ceade` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `packages/sdk/tsup.config.ts` - SDK build config with dual entry points (index + services), ESM+CJS, dts, outExtension
- `packages/services/tsup.config.ts` - Services build config with single entry, ESM+CJS, dts, outExtension
- `packages/adapter-cloudflare/tsup.config.ts` - Cloudflare adapter build config
- `packages/adapter-vercel/tsup.config.ts` - Vercel adapter build config
- `packages/adapter-express/tsup.config.ts` - Express adapter build config
- `packages/sdk/eslint.config.js` - ESLint flat config banning 6 Node.js built-in import paths
- `package.json` (root) - Added packageManager field (required for Turborepo)
- `packages/sdk/package.json` - Updated exports map, build/lint/typecheck scripts, added eslint devDep
- `packages/services/package.json` - Updated exports map and build/typecheck scripts
- `packages/adapter-cloudflare/package.json` - Updated exports map and build/typecheck scripts
- `packages/adapter-vercel/package.json` - Updated exports map and build/typecheck scripts
- `packages/adapter-express/package.json` - Updated exports map and build/typecheck scripts

## Decisions Made
- For `"type": "module"` packages, tsup generates `.d.ts` (not `.d.mts`) for ESM format — the plan's exports map used `.d.mts` but tsup only generates `.d.mts` when the package does NOT have `"type": "module"`. Updated exports maps to reference `.d.ts` for import condition types, which is the correct and valid behavior.
- Added `packageManager: "pnpm@10.21.0"` to root package.json — Turborepo v2 requires this field to resolve workspaces; without it, `pnpm build` fails with "Missing packageManager field"
- ESLint `no-restricted-imports` uses `paths` array wrapping when specifying restrictions as objects with `name` + `message` fields (not bare objects at root level)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added packageManager field to root package.json**
- **Found during:** Task 1 (running pnpm build for first time)
- **Issue:** `turbo build` failed with "Could not resolve workspaces. Missing packageManager field in package.json" — Turborepo v2 requires explicit packageManager declaration
- **Fix:** Added `"packageManager": "pnpm@10.21.0"` to root package.json
- **Files modified:** package.json (root)
- **Verification:** `pnpm build` succeeds across all 5 packages after fix
- **Committed in:** 8231f25 (Task 1 commit)

**2. [Rule 1 - Bug] Updated exports map to use .d.ts instead of .d.mts for ESM imports**
- **Found during:** Task 1 (verifying dist output after build)
- **Issue:** Plan specified `.d.mts` for `import.types` condition but tsup v8.5.1 generates `.d.ts` (not `.d.mts`) when the package has `"type": "module"`. tsup only emits `.d.mts` when the package does NOT use `"type": "module"` (i.e., when ESM is non-default and needs explicit extension). Having `.d.mts` in exports map with no actual `.d.mts` file would break TypeScript resolution for consumers.
- **Fix:** Updated all 5 package.json exports maps to reference `./dist/index.d.ts` (SDK also `./dist/services.d.ts`) for the `import.types` condition
- **Files modified:** packages/sdk/package.json, packages/services/package.json, packages/adapter-cloudflare/package.json, packages/adapter-vercel/package.json, packages/adapter-express/package.json
- **Verification:** Build produces actual files matching exports map paths; `pnpm typecheck` passes for all packages
- **Committed in:** 8231f25 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking fix, 1 bug fix)
**Impact on plan:** Both auto-fixes necessary for correct operation. The .d.ts vs .d.mts deviation reflects tsup's actual behavior with type:module packages — this is the correct standard for modern ESM-native packages.

## Issues Encountered
- tsup v8.5.1 behavior with `"type": "module"` packages: generates `.d.ts` for ESM format (not `.d.mts`). This is correct per TypeScript module resolution — `.d.ts` in a `"type": "module"` package is unambiguously ESM. The RESEARCH.md note about `.d.mts` applies to packages without `"type": "module"` where the extension is needed to disambiguate.

## User Setup Required
None - no external service configuration required. All tooling is installed locally.

## Next Phase Readiness
- All 5 packages build cleanly with tsup producing distributable ESM+CJS+declarations
- SDK ./services subpath export is configured and working
- ESLint edge-runtime guard is active on @heylol/sdk — will catch Node.js built-in imports as code is added in Phase 2
- Plan 01-03 can now configure CI/CD workflows, publint, attw, and size-limit gates against these builds
- The dist/ output files in all packages are now ready for Phase 2 core SDK development

---
*Phase: 01-foundation*
*Completed: 2026-03-01*
