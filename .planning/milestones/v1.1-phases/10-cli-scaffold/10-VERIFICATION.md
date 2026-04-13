---
phase: 10-cli-scaffold
verified: 2026-03-02T22:10:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 10: CLI Scaffold Verification Report

**Phase Goal:** A working `heylol` binary exists, can be invoked via `npx heylol`, and the package is wired into the monorepo with correct build configuration.
**Verified:** 2026-03-02T22:10:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `pnpm --filter heylol build` produces `dist/cli.mjs` with a shebang line | VERIFIED | `packages/cli/dist/cli.mjs` exists; `head -1` returns `#!/usr/bin/env node` |
| 2 | `node packages/cli/dist/cli.mjs --help` prints all six command groups with descriptions | VERIFIED | Live output confirmed: auth, posts, profile, social, discovery, notifications all present with descriptions |
| 3 | `node packages/cli/dist/cli.mjs --version` prints a semver string | VERIFIED | Live output: `1.0.0` |
| 4 | `node packages/cli/dist/cli.mjs posts --help` lists all subcommands (list, create, get, delete, like, unlike, reply) | VERIFIED | Live output confirmed all 7 subcommands present |
| 5 | `HEYLOL_BASE_URL=https://custom.api node packages/cli/dist/cli.mjs --help` does not crash | VERIFIED | Exit code 0; full help printed |
| 6 | `node packages/cli/dist/cli.mjs --base-url https://custom.api --help` does not crash | VERIFIED | Exit code 0; full help printed |
| 7 | `node packages/cli/dist/cli.mjs xyz` triggers suggestion engine | VERIFIED | `showSuggestionAfterError(true)` is wired; confirmed working via `auuth` → "Did you mean auth?"; `xyz` has no close match so commander correctly emits no suggestion (expected behavior) |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/cli/package.json` | Package manifest with bin field, dependencies, workspace link to @heylol/sdk | VERIFIED | `bin: { heylol: ./dist/cli.mjs }`, `@heylol/sdk: workspace:*`, commander/conf/picocolors deps present |
| `packages/cli/tsup.config.ts` | ESM-only build config with shebang | VERIFIED | `format: ['esm']`, `banner: { js: '#!/usr/bin/env node' }`, `outExtension` → `.mjs`, `platform: node`, `external: ['conf']` |
| `packages/cli/tsconfig.json` | Extends root tsconfig, src/dist dirs | VERIFIED | Extends `../../tsconfig.json`, `outDir: dist`, `rootDir: src`, `include: [src]` |
| `packages/cli/src/index.ts` | CLI entry point with program definition, global options, command registration, parse() | VERIFIED | `program.parse()` present; 6 `addCommand()` calls; global options with `.env()` wiring |
| `packages/cli/src/context.ts` | GlobalContext type definition | VERIFIED | `GlobalContext` interface exported with `baseUrl: string; debug: boolean`; `GlobalOpts` alias exported |
| `packages/cli/src/commands/auth.ts` | Auth command group with setup and verify stubs | VERIFIED | `makeAuthCommand()` exported; setup, verify subcommands with descriptions and `throw new Error('not implemented')` actions |
| `packages/cli/src/commands/posts.ts` | Posts command group with 7 subcommand stubs | VERIFIED | `makePostsCommand()` exported; all 7 subcommands (list, create, get, delete, like, unlike, reply) with positional args and descriptions |
| `packages/cli/src/commands/profile.ts` | Profile command group with me, get, update stubs | VERIFIED | `makeProfileCommand()` exported; me, get, update subcommands present |
| `packages/cli/src/commands/social.ts` | Social command group with follow, unfollow, followers, following stubs | VERIFIED | `makeSocialCommand()` exported; all 4 subcommands with positional `<id>` args |
| `packages/cli/src/commands/discovery.ts` | Discovery command group with search, trending, suggested stubs | VERIFIED | `makeDiscoveryCommand()` exported; search with `--query` requiredOption, trending, suggested |
| `packages/cli/src/commands/notifications.ts` | Notifications command group with list, mark-read stubs | VERIFIED | `makeNotificationsCommand()` exported; list and mark-read subcommands present |
| `packages/cli/dist/cli.mjs` | Built ESM binary with shebang | VERIFIED | File exists, shebang line confirmed, binary executes correctly |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/cli/src/index.ts` | `packages/cli/src/commands/*.ts` | `addCommand()` calls registering all 6 command groups | WIRED | Lines 30, 34, 38, 42, 46, 50 in index.ts each call `program.addCommand()` after `copyInheritedSettings()` |
| `packages/cli/src/index.ts` | `commander` | `new Option().env()` for HEYLOL_BASE_URL and HEYLOL_DEBUG | WIRED | Lines 23 and 26: `.env('HEYLOL_BASE_URL')` and `.env('HEYLOL_DEBUG')` both present |
| `packages/cli/package.json` | `packages/cli/dist/cli.mjs` | bin field pointing to built output | WIRED | `"heylol": "./dist/cli.mjs"` in bin field; dist/cli.mjs confirmed to exist |
| `packages/cli/package.json` | `@heylol/sdk` | workspace:* dependency | WIRED | `"@heylol/sdk": "workspace:*"` in dependencies |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| INFRA-01 | 10-01-PLAN.md | User can install `heylol` globally via `npm install -g heylol` or run via `npx heylol` | SATISFIED | `bin` field in package.json maps `heylol` → `./dist/cli.mjs`; binary executes correctly; package name is `heylol` (unprefixed, installable globally); dist/cli.mjs exists with shebang |
| INFRA-07 | 10-01-PLAN.md | CLI provides `--help` on every command and subcommand with clear descriptions | SATISFIED | Verified via live execution: `--help` works at root, all 6 group levels, and all subcommand levels; every command has `.description()` |
| INFRA-08 | 10-01-PLAN.md | CLI supports `HEYLOL_BASE_URL` env var to override API base URL | SATISFIED | `new Option('--base-url <url>').env('HEYLOL_BASE_URL').default('https://api.hey.lol')` wired in index.ts; env var test exits 0 |

No orphaned requirements. INFRA-01, INFRA-07, INFRA-08 are the only requirements mapped to Phase 10 in REQUIREMENTS.md traceability table.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| All command files | multiple | `throw new Error('not implemented')` in action handlers | Info | Intentional stubs — expected for Phase 10 scaffold. Phase 12-14 wire real logic. No impact on binary execution or help output. |

No blocker or warning anti-patterns found. The `throw new Error('not implemented')` pattern is documented in the PLAN as intentional design for the scaffold phase.

---

### Human Verification Required

**1. npx invocation**

**Test:** Run `npx heylol --help` from a directory outside the monorepo (or after publishing to npm).
**Expected:** Binary resolves and prints full help output.
**Why human:** npx invocation path requires either publishing to npm or symlinking via `npm link` — cannot verify programmatically in the current monorepo context without side effects.

**2. Global install path**

**Test:** Run `npm install -g heylol@1.0.0` (after publish) then `heylol --help`.
**Expected:** Binary is available globally and prints help.
**Why human:** Requires publishing to npm registry, which is outside automated verification scope.

Note: Both of these are post-publish scenarios. The in-monorepo binary (`node packages/cli/dist/cli.mjs`) is fully verified and works correctly. The npx/global-install path depends only on correct `bin` field (verified) and npm publish (out of scope for this phase).

---

### Gaps Summary

None. All must-haves are verified. The phase goal is achieved:

- The `heylol` binary exists at `packages/cli/dist/cli.mjs` with correct shebang.
- The package is wired into the monorepo via `pnpm-workspace.yaml` (`packages/*` glob) with correct `turbo.json` build pipeline (`dependsOn: ["^build"]`).
- The bin field correctly maps `heylol` to `./dist/cli.mjs` for npm/npx resolution.
- All 6 command groups are registered and produce complete help trees.
- Global options (`--base-url` / `HEYLOL_BASE_URL`, `--debug` / `HEYLOL_DEBUG`) are wired with correct precedence via commander.
- Both task commits (1edffcc, e6d40cc) are verified present in git history.

---

_Verified: 2026-03-02T22:10:00Z_
_Verifier: Claude (gsd-verifier)_
