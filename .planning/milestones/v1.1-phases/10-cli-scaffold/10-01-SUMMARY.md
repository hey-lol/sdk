---
phase: 10-cli-scaffold
plan: 01
subsystem: infra
tags: [commander, conf, picocolors, tsup, esm, cli, binary]

# Dependency graph
requires: []
provides:
  - "packages/cli/ directory with working heylol binary"
  - "ESM-only tsup build producing dist/cli.mjs with shebang"
  - "commander-based program with global --base-url and --debug options wired via env vars"
  - "All 6 command groups registered as stubs: auth, posts, profile, social, discovery, notifications"
  - "GlobalContext type for optsWithGlobals pattern used in all subsequent phases"
  - "printJson/printError output stubs for Phase 11 to complete"
affects: [11-output-module, 12-auth-command, 13-resource-commands, 14-discovery-notifications]

# Tech tracking
tech-stack:
  added: [commander@14, conf@15, picocolors@1.1, "@types/node@22"]
  patterns:
    - "optsWithGlobals<GlobalContext>() for accessing global options in subcommands"
    - "copyInheritedSettings(program) on each command group before addCommand() to propagate settings"
    - "createRequire(import.meta.url) for safe ESM JSON import of package.json version"
    - "tsup banner.js for shebang injection, outExtension for .mjs output"
    - "Factory function pattern: make{Name}Command() returning Command instance"

key-files:
  created:
    - packages/cli/package.json
    - packages/cli/tsup.config.ts
    - packages/cli/tsconfig.json
    - packages/cli/src/index.ts
    - packages/cli/src/context.ts
    - packages/cli/src/output.ts
    - packages/cli/src/commands/auth.ts
    - packages/cli/src/commands/posts.ts
    - packages/cli/src/commands/profile.ts
    - packages/cli/src/commands/social.ts
    - packages/cli/src/commands/discovery.ts
    - packages/cli/src/commands/notifications.ts
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "Used tsup banner.js for shebang instead of shebang:true (tsup shebang option only chmod +x, not insert)"
  - "Added @types/node as devDependency for Node built-in type declarations (createRequire from module)"
  - "Used outExtension() in tsup config to produce .mjs extension matching bin field"
  - "Used createRequire(import.meta.url) pattern for ESM-safe package.json version read"
  - "All stubs throw Error('not implemented') — clean failure mode before Phase 12 wires real logic"

patterns-established:
  - "make{Name}Command() factory pattern: each command group file exports a single factory function"
  - "copyInheritedSettings pattern: call before addCommand() to propagate showSuggestionAfterError"
  - "Positional <id> arguments for resource-targeting commands (not --id flags)"
  - "requiredOption for required inputs like --content on create/reply"

requirements-completed: [INFRA-01, INFRA-07, INFRA-08]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 10 Plan 01: CLI Scaffold Summary

**commander-based heylol binary with 6 command groups (38 subcommand stubs), global env var wiring, ESM-only tsup build producing dist/cli.mjs with shebang**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-02T21:45:17Z
- **Completed:** 2026-03-02T21:48:54Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Created packages/cli/ as a new workspace package with working heylol binary (bin field, pnpm workspace link to @heylol/sdk)
- Wired all global options: --base-url via HEYLOL_BASE_URL, --debug via HEYLOL_DEBUG, with CLI flag > env var > default precedence handled by commander
- Registered all 6 command groups with 38 total subcommand stubs, full help tree working at every level

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CLI package structure with build config and entry point** - `1edffcc` (feat)
2. **Task 2: Register all six command groups with complete subcommand stubs** - `e6d40cc` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `packages/cli/package.json` - Package manifest with bin field, workspace SDK link, commander/conf/picocolors/tsup deps
- `packages/cli/tsup.config.ts` - ESM-only build, shebang via banner.js, .mjs extension, conf external
- `packages/cli/tsconfig.json` - Extends root tsconfig, src/dist dirs, @types/node installed
- `packages/cli/src/index.ts` - Entry point: program setup, global options, 6 command group registrations, program.parse()
- `packages/cli/src/context.ts` - GlobalContext interface and GlobalOpts alias for optsWithGlobals pattern
- `packages/cli/src/output.ts` - printJson/printError stubs (Phase 11 fills these out)
- `packages/cli/src/commands/auth.ts` - makeAuthCommand(): setup, verify stubs
- `packages/cli/src/commands/posts.ts` - makePostsCommand(): list, create, get, delete, like, unlike, reply stubs (7)
- `packages/cli/src/commands/profile.ts` - makeProfileCommand(): me, get, update stubs
- `packages/cli/src/commands/social.ts` - makeSocialCommand(): follow, unfollow, followers, following stubs
- `packages/cli/src/commands/discovery.ts` - makeDiscoveryCommand(): search, trending, suggested stubs
- `packages/cli/src/commands/notifications.ts` - makeNotificationsCommand(): list, mark-read stubs
- `pnpm-lock.yaml` - Updated with commander, conf, picocolors, @types/node

## Decisions Made

- Used `tsup banner: { js: '#!/usr/bin/env node' }` for shebang insertion (the `shebang: true` config option in tsup only marks the file chmod +x when one already exists — it does not insert the shebang text)
- Used `outExtension() { return { js: '.mjs' } }` to produce the `.mjs` extension matching the `bin` field
- Added `@types/node` as a devDependency so TypeScript resolves `import { createRequire } from 'module'`
- Used `createRequire(import.meta.url)` to read package.json version — the ESM-safe pattern avoiding dynamic import() which would make version async

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed tsup shebang option — use banner instead**
- **Found during:** Task 1 (build verification)
- **Issue:** `shebang: true` in tsup config did not insert `#!/usr/bin/env node` into output; output was `cli.js` not `cli.mjs` with no shebang
- **Fix:** Replaced `shebang: true` with `banner: { js: '#!/usr/bin/env node' }` and added `outExtension() { return { js: '.mjs' } }` to produce correct filename
- **Files modified:** packages/cli/tsup.config.ts
- **Verification:** `head -1 dist/cli.mjs` shows `#!/usr/bin/env node`, file is `dist/cli.mjs`
- **Committed in:** 1edffcc (Task 1 commit)

**2. [Rule 3 - Blocking] Added @types/node devDependency**
- **Found during:** Task 1 (typecheck step)
- **Issue:** `tsc --noEmit` failed with "Cannot find module 'module'" — Node built-in type declarations missing
- **Fix:** Added `"@types/node": "^22.0.0"` to devDependencies, ran `pnpm install`
- **Files modified:** packages/cli/package.json, pnpm-lock.yaml
- **Verification:** `pnpm --filter heylol typecheck` exits 0
- **Committed in:** 1edffcc (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for correct binary output and TypeScript compilation. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CLI scaffold complete: `heylol --help` shows full command surface, all 6 groups with all subcommands
- Build pipeline works: `pnpm --filter heylol build` and `turbo build` (via Turborepo dependency ordering)
- Phase 11 (output module) can now fill out printJson/printError in src/output.ts
- Phase 12 (auth command) can wire real logic into commands/auth.ts setup/verify stubs
- Phase 13 (resource commands) can implement the posts/profile/social stubs
- Phase 14 (discovery/notifications) can implement those stubs
- No blockers

---
*Phase: 10-cli-scaffold*
*Completed: 2026-03-02*
