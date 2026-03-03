---
phase: 11-output-infrastructure
verified: 2026-03-03T02:20:23Z
status: passed
score: 6/6 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 5/6
  gaps_closed:
    - "exit code is 0 on success, 4 on AuthError, 5 on RateLimitError, 3 on 404 APIError, 2 on bad args, 1 on general error"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Run heylol --not-a-flag at an interactive terminal (no --json or --human flags)"
    expected: "stderr shows colored 'Error: unknown option ...' with dim 'code: BAD_ARGS' line; process exits with code 2 (check with echo $?)"
    why_human: "process.stdout.isTTY is undefined in non-interactive contexts; TTY auto-detection path for the bad-args human format can only be confirmed at a live terminal"
---

# Phase 11: Output Infrastructure Verification Report

**Phase Goal:** All CLI output follows a consistent contract — JSON to stdout on success, JSON errors to stderr on failure, human-readable format when requested, correct exit codes always.
**Verified:** 2026-03-03T02:20:23Z
**Status:** passed
**Re-verification:** Yes — after gap closure (gap was EXIT.BAD_ARGS not wired to Commander)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | stdout from any successful command is valid JSON parseable by jq | VERIFIED | `printSuccess` writes `JSON.stringify(data, null, 2) + '\n'` to `process.stdout.write()`; `isHumanMode` gates all picocolors calls so no ANSI leaks into machine-mode stdout |
| 2 | stderr from any failed command contains `{error: {code, message}}` JSON | VERIFIED | `printFailure` handles SDK/general errors; Commander bad-args errors now intercepted via `exitOverride` + `CommanderError` catch and routed through `printBadArgs` which emits `{"error":{"code":"BAD_ARGS","message":"..."}}` to stderr; `configureOutput({writeErr: () => undefined})` suppresses Commander's own plain-text stderr writes |
| 3 | passing --human flag produces colored, readable output instead of raw JSON | VERIFIED | `--human` registered on root program; `isHumanMode()` priority chain respected; `printHuman()` emits `pc.dim('--- response ---')` header; `printFailure` and `printBadArgs` both emit `pc.red('Error: ')` + message in human mode |
| 4 | piping output to another program auto-selects JSON; running at terminal auto-selects human | VERIFIED | `isHumanMode()` returns `Boolean(process.stdout.isTTY)` as final fallback — `undefined` when piped (false = JSON), `true` at terminal (human); explicit `--json`/`--human` override flags both wired |
| 5 | exit code is 0 on success, 4 on AuthError, 5 on RateLimitError, 3 on 404 APIError, 2 on bad args, 1 on general error | VERIFIED | SDK error-to-exit-code mapping correct in `resolveExitCode()`; `EXIT.BAD_ARGS=2` now wired — `printBadArgs()` called from `CommanderError` handler in `parseAsync().catch()`; `applyExitOverride()` propagates `exitOverride` recursively to all subcommands so Commander throws rather than exits internally; TypeScript compiles clean |
| 6 | all list commands accept --cursor and --limit flags | VERIFIED | All 7 paginated subcommands confirmed with both flags; `parseInt` argParser for `--limit`; unchanged since initial verification |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/cli/src/output.ts` | Centralized output contract — printSuccess, printFailure, printBadArgs, EXIT codes, TTY detection | VERIFIED | 109 lines; exports `printSuccess`, `printFailure`, `printBadArgs`, `EXIT`, `OutputOpts`; no `console.log`/`console.error`; `printBadArgs` is `never`-returning, calls `process.exit(EXIT.BAD_ARGS)` |
| `packages/cli/src/context.ts` | GlobalContext extended with human and json boolean fields | VERIFIED | `human: boolean` and `json: boolean` present; `GlobalOpts` type alias present; unchanged from initial verification |
| `packages/cli/src/index.ts` | Root program with --human/--json options, exitOverride, configureOutput, recursive applyExitOverride, parseAsync with CommanderError catch | VERIFIED | All elements present: `program.exitOverride()` at line 23; `configureOutput({writeErr: () => undefined})` at line 24; `applyExitOverride(program)` at line 73 applies recursively to entire command tree; `parseAsync().catch()` checks `err instanceof CommanderError` and routes to `printBadArgs` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/cli/src/output.ts` | `@heylol/sdk` errors | `import { isSdkError, AuthError, RateLimitError, APIError }` | WIRED | Line 11; all four symbols used in `resolveExitCode()` and `buildErrorPayload()` |
| `packages/cli/src/index.ts` | `packages/cli/src/output.ts` | `import { EXIT, printBadArgs } from './output.js'` | WIRED | Line 10; `EXIT.GENERAL` used at line 87; `printBadArgs` called at line 82 |
| `packages/cli/src/index.ts` | `EXIT.BAD_ARGS` (exit code 2) | `exitOverride` + `applyExitOverride` + `CommanderError` catch + `printBadArgs` | WIRED | `program.exitOverride()` line 23; recursive `applyExitOverride(program)` line 73; `catch` block checks `err instanceof CommanderError` line 76; `printBadArgs(err.message, opts)` line 82 exits with code 2 |
| `packages/cli/src/output.ts` | `process.stdout.isTTY` | TTY auto-detection in `isHumanMode()` | WIRED | Line 40: `return Boolean(process.stdout.isTTY)` |
| Commander bad-args errors | structured JSON stderr + exit 2 | `configureOutput({writeErr: () => undefined})` suppresses plain-text; `CommanderError` catch emits via `printBadArgs` | WIRED | `writeErr: () => undefined` silences Commander's built-in stderr; `CommanderError` instances handled before GENERAL fallback |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-02 | 11-01-PLAN.md | CLI outputs JSON to stdout by default for all successful responses | SATISFIED | `printSuccess` writes `JSON.stringify(data, null, 2)` to `process.stdout.write()` in machine mode; no color codes injected |
| INFRA-03 | 11-01-PLAN.md | CLI outputs structured JSON errors `{error: {code, message}}` to stderr on all failures | SATISFIED | `printFailure` handles SDK/general errors; `printBadArgs` handles Commander errors — both emit `{"error":{"code":"...","message":"..."}}` in machine mode; `configureOutput` silences Commander's own plain-text writes |
| INFRA-04 | 11-01-PLAN.md | CLI provides `--human` flag that formats output with colors and readable structure | SATISFIED | `--human` registered; `printHuman()` uses `pc.dim` header; `printFailure` and `printBadArgs` use `pc.red`/`pc.dim` in human mode |
| INFRA-05 | 11-01-PLAN.md | CLI auto-detects TTY — human output at terminal, JSON when piped — explicit flags override | SATISFIED | `isHumanMode()` priority: `json=true` → false; `human=true` → true; else `Boolean(process.stdout.isTTY)` |
| INFRA-06 | 11-01-PLAN.md | CLI uses typed exit codes: 0=success, 1=general, 2=bad-args, 3=not-found, 4=auth, 5=rate-limited | SATISFIED | All six codes defined in `EXIT`; code 2 now wired via `printBadArgs` called from `CommanderError` handler; TypeScript compiles clean with no type errors (`tsc --noEmit` passes) |
| INFRA-09 | 11-01-PLAN.md | All list commands support `--cursor` and `--limit` flags with `nextCursor` in response | SATISFIED | All 7 paginated subcommands have both flags with `parseInt` argParser for `--limit` |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/cli/src/commands/posts.ts` | multiple | `throw new Error('not implemented')` | INFO | Expected stubs; command wiring deferred to Phase 13 per plan |
| `packages/cli/src/commands/social.ts` | multiple | `throw new Error('not implemented')` | INFO | Expected stubs; command wiring deferred to Phase 14 per plan |
| `packages/cli/src/commands/discovery.ts` | multiple | `throw new Error('not implemented')` | INFO | Expected stubs; command wiring deferred to Phase 14 per plan |
| `packages/cli/src/commands/notifications.ts` | multiple | `throw new Error('not implemented')` | INFO | Expected stubs; command wiring deferred to Phase 14 per plan |

No blockers found. The previously-identified BLOCKER (`No exitOverride or configureOutput`) has been resolved. All remaining INFO-level stubs are intentional infrastructure placeholders with implementations deferred to later phases.

---

### Human Verification Required

#### 1. TTY Auto-Detection for Bad-Args Errors at Real Terminal

**Test:** Run `heylol --not-a-flag` at an interactive terminal (no `--json` or `--human` flags). Then run `echo $?`.
**Expected:** stderr shows colored `Error: unknown option '--not-a-flag'` followed by a dim `code: BAD_ARGS` line; `echo $?` prints `2`.
**Why human:** `process.stdout.isTTY` is `undefined` in all non-interactive contexts. The human-mode path through `printBadArgs` (which uses `pc.red`/`pc.dim`) can only be confirmed at a live terminal where `isTTY` is `true`.

---

### Gap Closure Summary

**Gap closed:** INFRA-06 / EXIT.BAD_ARGS not wired to Commander's error handler.

The fix implemented three coordinated changes in `/Users/rawgroundbeef/Projects/heylol/packages/cli/src/index.ts`:

1. `program.exitOverride()` and `program.configureOutput({ writeErr: () => undefined })` on the root command (lines 23-27) — causes Commander to throw `CommanderError` instead of calling `process.exit(1)`, and suppresses its built-in plain-text stderr writes.

2. `applyExitOverride(program)` (lines 66-73) — recursive function that propagates both `exitOverride` and `configureOutput` to every node in the command tree, covering subcommands that `copyInheritedSettings` does not reach.

3. `parseAsync().catch()` handler updated (lines 75-88) — checks `err instanceof CommanderError`, skips version/help exits (`exitCode === 0`), and calls `printBadArgs(err.message, opts)` which emits structured JSON to stderr and exits with `EXIT.BAD_ARGS = 2`. Non-Commander errors fall through to the existing GENERAL handler.

A new `printBadArgs(message, opts): never` function was added to `/Users/rawgroundbeef/Projects/heylol/packages/cli/src/output.ts` (lines 100-109). It respects the same human/machine mode logic as `printFailure`, emits `{"error":{"code":"BAD_ARGS","message":"..."}}` in machine mode or colored text in human mode, and calls `process.exit(EXIT.BAD_ARGS)`.

TypeScript compiles clean (`tsc --noEmit` produced no output/errors). No regressions detected in any previously-passing truth or requirement.

---

_Verified: 2026-03-03T02:20:23Z_
_Verifier: Claude (gsd-verifier)_
