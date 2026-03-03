# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Developers can go from npm install to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.
**Current focus:** v1.1 CLI — Phase 14: Social, Discovery, Notifications, and Publish

## Current Position

Phase: 14 of 14 (Social, Discovery, Notifications, and Publish)
Plan: 2 of 2 in current phase — COMPLETE
Status: COMPLETE
Last activity: 2026-03-03 — Completed 14-02: Published heylol@1.0.0 to npm; npx heylol@1.0.0 --version prints 1.0.0; @heylol/sdk@1.0.0 dependency rewritten correctly by pnpm publish

Progress: [██████████] 100%

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
| Phase 13-post-and-profile-commands P01 | 2 | 2 tasks | 2 files |
| Phase 14-social-discovery-notifications P01 | 1 | 1 task | 3 files | 1 min |
| Phase 14-social-discovery-notifications P02 | 2 | 2 tasks | 2 files | 5 min |

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
- [Phase 13-post-and-profile-commands]: Void commands (delete, like, unlike) pass null to printSuccess — JSON.stringify(undefined) produces undefined string, null produces clean null JSON
- [Phase 13-post-and-profile-commands]: --name CLI flag maps to displayName SDK field, --avatar to avatarUrl, --banner to bannerUrl for ergonomic CLI naming
- [Phase 13-post-and-profile-commands]: profile update command accepts empty params object — no guard for at least one flag, server returns unchanged profile
- [Phase 14-social-discovery-notifications]: notifications mark-read implements mark-all only (no --ids flag) — success criteria only tests no-argument case; selective marking deferred
- [Phase 14-social-discovery-notifications]: discovery search omits --type filter option — success criteria only requires --query; simpler implementation without scope creep
- [Phase 14-publish]: pnpm publish (not npm publish) required for workspace monorepos — npm publish publishes literal workspace:* string breaking consumer installs; pnpm publish rewrites to resolved semver
- [Phase 14-publish]: posts list() auto-fixed during preflight — was returning raw API response object instead of .posts array

### Pending Todos

None.

### Blockers/Concerns

- ServicesResource URL /services/{serviceId}/call is provisional — requires integration test against real API (carried from v1.0)

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 14-02-PLAN.md — heylol@1.0.0 published to npm. All Phase 14 plans complete. v1.1 CLI milestone complete.
Resume file: .planning/phases/14-social-discovery-notifications-and-publish/14-02-SUMMARY.md
