---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [pnpm, turborepo, biome, vitest, typescript, monorepo]

# Dependency graph
requires: []
provides:
  - pnpm workspaces monorepo with 5 packages under packages/
  - Turborepo task graph (build/lint/test/typecheck/size-check/dev)
  - Biome v2 formatter and linter configuration
  - Root tsconfig.json with strict TypeScript settings
  - Shared vitest.config.ts with 90% coverage thresholds
  - Package stubs for sdk, services, adapter-cloudflare, adapter-vercel, adapter-express
  - pnpm catalog for shared dependency versioning
affects: [01-02, 01-03, 02-core, 03-adapters, 04-services, 05-examples, 06-ci]

# Tech tracking
tech-stack:
  added:
    - pnpm workspaces + catalog feature
    - turborepo 2.8.12
    - biome 2.4.4 (formatter + linter)
    - typescript 5.9.3
    - vitest 2.1.9 with @vitest/coverage-v8
    - husky + lint-staged (pre-commit hooks)
    - size-limit + @size-limit/preset-big-lib
    - @changesets/cli
  patterns:
    - pnpm catalog for shared dep versions (reference with catalog: in package.json)
    - turbo.json tasks key (not deprecated pipeline key)
    - vitest --config ../../vitest.config.ts in all package test scripts (not auto-inherited)
    - 90% coverage thresholds enforced via passWithNoTests (stubs pass with no tests)

key-files:
  created:
    - pnpm-workspace.yaml
    - package.json (root)
    - turbo.json
    - tsconfig.json (root)
    - biome.json
    - .gitignore
    - vitest.config.ts
    - packages/sdk/package.json
    - packages/sdk/tsconfig.json
    - packages/sdk/src/index.ts
    - packages/sdk/src/services.ts
    - packages/services/package.json
    - packages/services/tsconfig.json
    - packages/services/src/index.ts
    - packages/adapter-cloudflare/package.json
    - packages/adapter-cloudflare/tsconfig.json
    - packages/adapter-cloudflare/src/index.ts
    - packages/adapter-vercel/package.json
    - packages/adapter-vercel/tsconfig.json
    - packages/adapter-vercel/src/index.ts
    - packages/adapter-express/package.json
    - packages/adapter-express/tsconfig.json
    - packages/adapter-express/src/index.ts
  modified: []

key-decisions:
  - "Biome schema URL set to 2.4.4 to match installed version (auto-resolved from initial 2.0.0)"
  - "vitest catalog entries: vitest ^2.0.0 and @vitest/coverage-v8 ^2.0.0 (resolves to 2.1.9)"
  - "All packages: build script is placeholder (echo) — full tsup config in plan 02"
  - "9 root scripts: build/dev/lint/format/typecheck/test/size-check/changeset/prepare"

patterns-established:
  - "Catalog pattern: all shared devDeps declared in pnpm-workspace.yaml catalog, referenced via catalog: in package.json"
  - "Test script pattern: vitest run --coverage --config ../../vitest.config.ts (explicit root config path)"
  - "Package stub pattern: type module, version 1.0.0, license MIT, files dist, tsconfig extends ../../tsconfig.json"
  - "Turbo pattern: tasks key with ^build dependsOn for topological ordering"

requirements-completed: [INFRA-01]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 01 Plan 01: Monorepo Scaffold Summary

**pnpm workspaces monorepo with 5 package stubs, Turborepo task graph, Biome v2 config, and shared 90% vitest coverage gate**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T04:13:05Z
- **Completed:** 2026-03-01T04:15:01Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments
- Created pnpm workspace with catalog for shared dependency versioning across all 5 packages
- Configured Turborepo task graph with correct tasks key (not deprecated pipeline) for build/lint/test/typecheck/size-check/dev
- Set up Biome v2.4.4 with formatter (space indent, 100 char width, single quotes) and linter (recommended rules)
- Created all 5 package stubs (@heylol/sdk, @heylol/services, @heylol/adapter-cloudflare, @heylol/adapter-vercel, @heylol/adapter-express) with version 1.0.0
- Established shared vitest.config.ts with 90% coverage thresholds (lines/functions/branches/statements) and passWithNoTests for stub packages

## Task Commits

Each task was committed atomically:

1. **Task 1: Create root workspace configuration and Turborepo task graph** - `f08f94d` (chore)
2. **Task 2: Create all 5 package stubs with valid package.json and source files** - `02f7b09` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `pnpm-workspace.yaml` - Workspace definition with pnpm catalog for shared dep versions
- `package.json` - Root workspace with 9 scripts and lint-staged config
- `turbo.json` - Task graph for build/lint/test/typecheck/size-check/dev
- `tsconfig.json` - Root TypeScript config (ES2022, bundler resolution, strict)
- `biome.json` - Formatter + linter config (Biome v2.4.4)
- `.gitignore` - node_modules, dist, .turbo, coverage, *.tsbuildinfo
- `vitest.config.ts` - Shared test config with 90% coverage thresholds
- `packages/sdk/` - @heylol/sdk v1.0.0 with index.ts and services.ts stubs
- `packages/services/` - @heylol/services v1.0.0 with index.ts stub
- `packages/adapter-cloudflare/` - @heylol/adapter-cloudflare v1.0.0 stub
- `packages/adapter-vercel/` - @heylol/adapter-vercel v1.0.0 stub
- `packages/adapter-express/` - @heylol/adapter-express v1.0.0 stub

## Decisions Made
- Biome schema URL updated from `2.0.0` to `2.4.4` to match the installed version (2.4.4) — prevents IDE schema validation warnings
- Used `@biomejs/biome` scoped package name in catalog (not bare `biome`) per plan instructions
- Build scripts are placeholder echo commands — tsup build config is deferred to plan 02 per plan spec
- vitest versions in catalog set to `^2.0.0` which resolves to 2.1.9 (vitest 4.x not yet targeted)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated Biome schema URL to match installed version**
- **Found during:** Task 1 (root workspace configuration)
- **Issue:** biome.json created with schema `2.0.0` but pnpm resolved `@biomejs/biome@2.4.4`; mismatched schema URL causes IDE validation errors
- **Fix:** Updated `$schema` URL from `2.0.0` to `2.4.4` to match installed version
- **Files modified:** biome.json
- **Verification:** biome.json schema URL matches installed package version
- **Committed in:** f08f94d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 correctness fix)
**Impact on plan:** Minor schema URL correction. No scope creep.

## Issues Encountered
None - both tasks executed without blocking issues. pnpm install resolved all catalog dependencies on first attempt.

## User Setup Required
None - no external service configuration required. All tooling is installed locally.

## Next Phase Readiness
- Monorepo scaffold complete — all subsequent plans (01-02, 01-03) can build on this foundation
- Plan 01-02 can now configure tsup build scripts for each package
- Plan 01-03 can configure ESLint for Node.js import restrictions in @heylol/sdk
- CI workflow (plan 01-03 or later) can run `pnpm install` and `turbo build lint test typecheck` against this scaffold

---
*Phase: 01-foundation*
*Completed: 2026-03-01*
