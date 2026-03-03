# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Developers can go from npm install to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.
**Current focus:** v1.1 CLI — Phase 12: Auth Commands

## Current Position

Phase: 12 of 14 (Auth Commands)
Plan: 1 of 1 in current phase — COMPLETE
Status: In progress
Last activity: 2026-03-03 — Completed 12-01: Auth credential management (config.ts, auth setup, auth verify)

Progress: [███░░░░░░░] 30%

## Performance Metrics

**Velocity (v1.0 reference):**
- Total plans completed: 22
- Average duration: ~18 min
- Total execution time: ~6.6 hours

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | ~54 min | ~18 min |
| 2-9. (remaining) | 19 | ~5.7 hrs | ~18 min |

*v1.1 metrics start from Phase 10*
| Phase 10-cli-scaffold P01 | 4 | 2 tasks | 13 files |
| Phase 11-output-infrastructure P01 | 2 | 2 tasks | 7 files | 2 min |
| Phase 11-output-infrastructure P02 | 1 | 1 task | 2 files | 4 min |
| Phase 12-auth-commands P01 | 2 | 2 tasks | 2 files | 2 min |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- CLI is a thin wrapper over @heylol/sdk — every command maps 1-to-1 to existing SDK methods, no new API logic
- Stack locked: commander@14, conf@15, picocolors@1.1, tsup ESM-only output
- Scaffold and output module must be complete before any command logic (pitfalls research)
- Auth gates all other commands — Phase 12 must be solid before Phase 13/14
- tsup shebang injection requires banner.js not shebang:true option (shebang:true only chmod +x)
- outExtension() needed in tsup to produce .mjs extension matching bin field
- createRequire(import.meta.url) pattern for ESM-safe package.json version read (not dynamic import)
- @types/node required as devDependency for Node built-in type declarations in CLI packages
- printFailure returns never (calls process.exit) — type system enforces no code after failure
- TTY detection priority: json flag > human flag > process.stdout.isTTY — explicit flags always win
- EXIT codes as const object not enum — better tree-shaking, simpler TypeScript narrowing
- parseInt passed directly as argParser for --limit — avoids custom parser boilerplate
- exitOverride + configureOutput(writeErr noop) used together — exitOverride alone still leaks Commander's plaintext stderr before the throw
- applyExitOverride() recursively walks cmd.commands — copyInheritedSettings is one-level-only, subcommand children require explicit propagation
- CommanderError.exitCode === 0 guard handles --help and --version without special-casing error codes
- createClient() co-located in config.ts (not separate client.ts) for simplicity — import by all Phase 13/14 commands
- resolveKey() reads process.env.HEYLOL_PRIVATE_KEY directly (not via Commander .env()) to avoid --key option name conflict
- AuthError (not plain Error) thrown for missing credentials — ensures exit code 4 via resolveExitCode() in output.ts
- validate-before-write in auth setup: loadKeypair() before store.set() surfaces invalid keys at setup time

### Pending Todos

None.

### Blockers/Concerns

- ServicesResource URL /services/{serviceId}/call is provisional — requires integration test against real API (carried from v1.0)

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 12-01-PLAN.md (Auth credential management: config.ts with conf singleton, resolveKey env-var-first, auth setup/verify subcommands)
Resume file: .planning/phases/12-auth-commands/12-01-SUMMARY.md
