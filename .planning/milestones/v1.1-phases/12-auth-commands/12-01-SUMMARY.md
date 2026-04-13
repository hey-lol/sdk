---
phase: 12-auth-commands
plan: 01
subsystem: auth
tags: [conf, commander, auth, cli, credentials, keypair]

# Dependency graph
requires:
  - phase: 11-output-infrastructure
    provides: printSuccess, printFailure, EXIT codes, structured JSON output
  - phase: 10-cli-scaffold
    provides: GlobalContext, Commander program structure, applyExitOverride pattern
provides:
  - config.ts with store (conf singleton at ~/.heylol/config.json), resolveKey(), createClient()
  - auth setup subcommand — validates and persists private key to ~/.heylol/config.json
  - auth verify subcommand — resolves key, calls profile.me(), prints profile JSON
affects: [13-posts-commands, 14-profile-commands, all future CLI commands needing createClient()]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolveKey() singleton in config.ts — env-var-first priority chain for all commands"
    - "validate-before-write — loadKeypair() before store.set() to surface invalid keys at setup time"
    - "async function(this: Command) action handler pattern — required for optsWithGlobals() this binding"
    - "makeOptionMandatory(true) + .env() — env var satisfies mandatory option check for CI/agent use"
    - "AuthError (not plain Error) thrown by resolveKey() — ensures exit code 4 via resolveExitCode()"

key-files:
  created:
    - packages/cli/src/config.ts
  modified:
    - packages/cli/src/commands/auth.ts

key-decisions:
  - "createClient() co-located in config.ts (not a separate client.ts) for simplicity — can extract if file grows in Phase 13/14"
  - "auth setup outputs { ok: true, path: store.path } — path field useful for agents to confirm write location"
  - "auth setup validates key format only (loadKeypair) not API connectivity — offline validation, auth verify is the connectivity check"
  - "resolveKey() reads process.env.HEYLOL_PRIVATE_KEY directly, not via Commander .env() — avoids --key option name conflict with auth setup"

patterns-established:
  - "Pattern: config.ts as the single source of truth for credential resolution — every command calls createClient(opts) not resolveKey() directly"
  - "Pattern: validate-before-write in auth setup — loadKeypair() throws AuthError before store.set() is reached on invalid input"
  - "Pattern: AuthError for missing/invalid credentials — isSdkError() returns true, resolveExitCode() maps to EXIT.AUTH (4)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 12 Plan 01: Auth Commands Summary

**conf@15 credential store at ~/.heylol/config.json with env-var-wins resolveKey() and auth setup/verify subcommands wired to HeyLolClient**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T03:10:43Z
- **Completed:** 2026-03-03T03:12:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `config.ts` with `store` (conf singleton at `~/.heylol/config.json`), `resolveKey()` (env-var-first priority, throws AuthError on missing credentials), and `createClient()` (constructs HeyLolClient from resolved key)
- Implemented `auth setup --key <base58>` — validates key via `loadKeypair()` before writing to conf, exits code 4 on invalid key format, exits code 2 on missing `--key` and missing env var
- Implemented `auth verify` — resolves key via `createClient()`, calls `client.profile.me()`, prints profile JSON on success, exits code 4 on any auth failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Create config.ts** - `a624613` (feat)
2. **Task 2: Implement auth setup and auth verify** - `120cecb` (feat)

## Files Created/Modified

- `packages/cli/src/config.ts` — Conf singleton at `~/.heylol/config.json`, `resolveKey()` with env-var-wins priority, `createClient()` constructing HeyLolClient
- `packages/cli/src/commands/auth.ts` — Full implementation replacing stub: `auth setup` with validate-before-write pattern, `auth verify` calling `profile.me()`

## Decisions Made

- **createClient() in config.ts**: Co-located with resolveKey() rather than a separate client.ts — simpler, no circular imports; can extract in Phase 13/14 if file grows
- **auth setup output shape**: `{ ok: true, path: store.path }` — path field confirms write location for agents, useful for `jq .ok` checks
- **auth setup validates format only**: `loadKeypair()` validates base58 decode, not API connectivity — keeps auth setup offline; auth verify is the API check
- **resolveKey reads env directly**: `process.env.HEYLOL_PRIVATE_KEY` read in `resolveKey()` (not as Commander global option) to avoid `--key` option name conflict with auth setup's own `--key`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all verification criteria passed on first run. TypeScript compiled with zero errors, build succeeded, all 6 exit-code/output verification tests matched expected behavior.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Auth infrastructure complete: every Phase 13/14 command imports `createClient(opts)` from `config.ts`
- `resolveKey()` handles all three credential scenarios: env var, stored config, missing (exit 4)
- `store.path` is `~/.heylol/config.json` on all platforms (cwd override verified)
- No blockers for Phase 13 (posts commands) or Phase 14 (profile commands)

---
*Phase: 12-auth-commands*
*Completed: 2026-03-03*
