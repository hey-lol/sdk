---
phase: 11-output-infrastructure
plan: 01
subsystem: infra
tags: [commander, picocolors, output, exit-codes, tty, pagination]

# Dependency graph
requires:
  - phase: 10-cli-scaffold
    provides: commander program structure with 6 command groups and ESM binary
  - phase: sdk-errors
    provides: isSdkError, AuthError, RateLimitError, APIError error hierarchy
provides:
  - Centralized output contract with printSuccess, printFailure, EXIT codes, TTY auto-detection
  - GlobalContext extended with human and json boolean fields for flag propagation
  - Root commander program with --human and --json global options
  - parseAsync safety net replacing synchronous parse()
  - --cursor and --limit pagination flags on all 7 list/paginated subcommands
affects: [12-auth-command, 13-posts-profile-commands, 14-social-discovery-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - printSuccess/printFailure as the single output interface for all command handlers
    - TTY auto-detection with explicit --json/--human override flags
    - process.stdout.write and process.stderr.write exclusively (no console.log/console.error)
    - SDK error instanceof chain maps to specific exit codes (AUTH=4, RATE_LIMITED=5, NOT_FOUND=3)
    - parseInt argParser for --limit to coerce commander string to number

key-files:
  created: []
  modified:
    - packages/cli/src/output.ts
    - packages/cli/src/context.ts
    - packages/cli/src/index.ts
    - packages/cli/src/commands/posts.ts
    - packages/cli/src/commands/social.ts
    - packages/cli/src/commands/discovery.ts
    - packages/cli/src/commands/notifications.ts

key-decisions:
  - "printFailure returns never (calls process.exit) — type system enforces no code after failure"
  - "TTY detection fallback: json flag > human flag > process.stdout.isTTY — explicit flags always win"
  - "EXIT codes as const object not enum — better tree-shaking, simpler TypeScript narrowing"
  - "parseInt passed directly as argParser for --limit — avoids custom parser boilerplate"

patterns-established:
  - "Output contract: all stdout via printSuccess, all stderr via printFailure, never console.*"
  - "Exit codes: SUCCESS=0, GENERAL=1, BAD_ARGS=2, NOT_FOUND=3, AUTH=4, RATE_LIMITED=5"
  - "Pagination flags: every list command gets --cursor <string> and --limit <number> with parseInt"
  - "Human mode: colored output to stderr on failure, green OK or dim response block on success"

requirements-completed: [INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-09]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 11 Plan 01: Output Infrastructure Summary

**Contract-driven output module with TTY/JSON auto-detection, SDK error-to-exit-code mapping via picocolors, and --cursor/--limit pagination flags on all 7 list commands**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T01:03:18Z
- **Completed:** 2026-03-03T01:05:34Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Replaced output.ts stubs with full 99-line contract module: printSuccess, printFailure, EXIT codes, TTY auto-detection, SDK error mapping, picocolors human formatting
- Extended GlobalContext interface with `human: boolean` and `json: boolean` fields for flag propagation to all command handlers
- Added --human and --json global options to root commander program; switched from program.parse() to program.parseAsync() with error safety net
- Added --cursor and --limit pagination flags (with parseInt coercion) to all 7 paginated subcommands across posts, social, discovery, and notifications commands

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement output module, extend GlobalContext, wire global options** - `80e7fa2` (feat)
2. **Task 2: Add --cursor and --limit pagination flags to all list commands** - `5cb7e45` (feat)

## Files Created/Modified
- `packages/cli/src/output.ts` - Full output contract: printSuccess, printFailure, EXIT codes, TTY detection, SDK error-to-exit-code mapping, human/JSON mode formatting
- `packages/cli/src/context.ts` - GlobalContext extended with human: boolean and json: boolean
- `packages/cli/src/index.ts` - Added --human and --json global options; parseAsync() with safety net
- `packages/cli/src/commands/posts.ts` - Added --cursor and --limit to list subcommand
- `packages/cli/src/commands/social.ts` - Added --cursor and --limit to followers and following subcommands
- `packages/cli/src/commands/discovery.ts` - Added --cursor and --limit to search, trending, and suggested subcommands
- `packages/cli/src/commands/notifications.ts` - Added --cursor and --limit to list subcommand

## Decisions Made
- `printFailure` returns `never` — the TypeScript return type enforces that callers cannot have unreachable code after a failure call; process.exit() is the only exit path
- TTY detection priority: `--json` flag first (force machine), then `--human` flag (force colored), then `process.stdout.isTTY` (auto-detect piped vs terminal)
- `EXIT` exported as `as const` object rather than TypeScript enum — avoids enum runtime overhead, provides cleaner narrowing
- `parseInt` passed directly as commander argParser for `--limit` — standard approach, avoids custom parser boilerplate, coerces string to number at parse time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Output contract fully established; all Phase 12-14 command handlers can call `printSuccess(data, ctx)` and `printFailure(err, ctx)` directly
- GlobalContext has `human` and `json` fields ready for handlers to pass as `OutputOpts`
- All list commands have --cursor and --limit flags, ready for pagination wiring in Phases 13-14
- No blockers

## Self-Check: PASSED

All files exist and all commits verified:
- packages/cli/src/output.ts — FOUND
- packages/cli/src/context.ts — FOUND
- packages/cli/src/index.ts — FOUND
- .planning/phases/11-output-infrastructure/11-01-SUMMARY.md — FOUND
- Commit 80e7fa2 — FOUND
- Commit 5cb7e45 — FOUND

---
*Phase: 11-output-infrastructure*
*Completed: 2026-03-03*
