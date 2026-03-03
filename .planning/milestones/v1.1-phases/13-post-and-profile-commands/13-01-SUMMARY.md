---
phase: 13-post-and-profile-commands
plan: 01
subsystem: cli
tags: [commander, typescript, sdk, posts, profile, branded-types]

# Dependency graph
requires:
  - phase: 12-auth-commands
    provides: createClient in config.ts, GlobalContext, printSuccess/printFailure output pattern
  - phase: 11-output-infrastructure
    provides: printSuccess, printFailure, GlobalContext
  - phase: 10-cli-scaffold
    provides: posts.ts and profile.ts stub files with command structure
provides:
  - Six implemented posts subcommands: create, get, delete, like, unlike, reply
  - Three implemented profile subcommands: me, get, update
  - posts list stub left unchanged (not in scope)
affects: [14-services-commands, any future CLI command phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "async function(this: Command) for action handlers to enable optsWithGlobals() binding"
    - "Pass null (not undefined) to printSuccess for void SDK calls (delete/like/unlike)"
    - "asPostId()/asUserId() wrap raw CLI string args to satisfy branded type requirements"
    - "Build partial params object with conditional if-undefined checks for optional flags"

key-files:
  created: []
  modified:
    - packages/cli/src/commands/posts.ts
    - packages/cli/src/commands/profile.ts

key-decisions:
  - "Void commands (delete, like, unlike) pass null to printSuccess — JSON.stringify(undefined) produces 'undefined\\n', null produces 'null\\n'"
  - "--name CLI flag maps to displayName SDK field, --avatar to avatarUrl, --banner to bannerUrl for ergonomic CLI naming"
  - "update command accepts empty params object (server returns unchanged profile) — no guard for at least one flag needed"

patterns-established:
  - "Action handler pattern: optsWithGlobals<GlobalContext & {...}>() -> createClient(opts) -> SDK call -> printSuccess/printFailure"
  - "Branded ID coercion: always wrap CLI string args with asPostId()/asUserId() before SDK calls"

requirements-completed: [POST-01, POST-02, POST-03, POST-04, POST-05, POST-06, PROF-01, PROF-02, PROF-03]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 13 Plan 01: Post and Profile Commands Summary

**Nine SDK-backed CLI subcommands replacing all stubs: six posts (create/get/delete/like/unlike/reply) and three profile (me/get/update) using asPostId/asUserId branded types and the established auth.ts pattern**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T03:32:39Z
- **Completed:** 2026-03-03T03:33:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced 6 stub action handlers in posts.ts with real SDK-backed implementations
- Replaced 3 stub action handlers in profile.ts with real SDK-backed implementations
- Added four optional flags (--name, --bio, --avatar, --banner) to profile update command
- All 9 commands compile with zero TypeScript errors; build succeeds cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement six posts subcommands in posts.ts** - `7047d10` (feat)
2. **Task 2: Implement three profile subcommands in profile.ts** - `f245831` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `packages/cli/src/commands/posts.ts` - Six post subcommands implemented; list stub unchanged
- `packages/cli/src/commands/profile.ts` - Three profile subcommands implemented with update options

## Decisions Made
- Void commands (delete, like, unlike) pass `null` to `printSuccess` — `JSON.stringify(undefined)` produces the string `"undefined\n"` while `null` produces clean `"null\n"` JSON output
- `--name` CLI flag maps to `displayName` SDK field, `--avatar` to `avatarUrl`, `--banner` to `bannerUrl` for ergonomic CLI naming while matching SDK's field names
- `update` command accepts an empty params object (server returns unchanged profile) — no guard requiring at least one flag is needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 9 post and profile commands are implemented and type-safe
- Phase 14 (services commands) can now follow the identical pattern established here
- ServicesResource URL /services/{serviceId}/call remains provisional (requires integration test against real API — pre-existing blocker)

---
*Phase: 13-post-and-profile-commands*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: packages/cli/src/commands/posts.ts
- FOUND: packages/cli/src/commands/profile.ts
- FOUND: .planning/phases/13-post-and-profile-commands/13-01-SUMMARY.md
- FOUND: commit 7047d10 (Task 1)
- FOUND: commit f245831 (Task 2)
