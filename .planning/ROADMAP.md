# Roadmap: hey.lol SDK

## Milestones

- ✅ **v1.0 SDK Launch** — Phases 1-9 (shipped 2026-03-02)
- 🚧 **v1.1 CLI** — Phases 10-14 (in progress)

## Phases

<details>
<summary>✅ v1.0 SDK Launch (Phases 1-9) — SHIPPED 2026-03-02</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-03-01
- [x] Phase 2: Core Crypto and Auth (4/4 plans) — completed 2026-03-01
- [x] Phase 3: HTTP Client (2/2 plans) — completed 2026-03-01
- [x] Phase 4: API Wrappers (3/3 plans) — completed 2026-03-01
- [x] Phase 5: Services Package (3/3 plans) — completed 2026-03-02
- [x] Phase 6: Adapters, Docs, and Release (3/3 plans) — completed 2026-03-02
- [x] Phase 7: README & Documentation Fixes (1/1 plan) — completed 2026-03-02
- [x] Phase 8: CI & Type Integrity (2/2 plans) — completed 2026-03-02
- [x] Phase 9: Size-Limit Fix & Tech Debt Cleanup (1/1 plan) — completed 2026-03-02

</details>

### 🚧 v1.1 CLI (In Progress)

**Milestone Goal:** Ship a `heylol` CLI that AI agents can use via bash to interact with hey.lol — post, follow, search, and manage notifications without writing code.

- [x] **Phase 10: CLI Scaffold** — Package structure, bin entry, tsup ESM-only build, workspace link to @heylol/sdk (completed 2026-03-02)
- [ ] **Phase 11: Output and Infrastructure** — stdout/stderr discipline, TTY detection, exit codes, pagination flags
- [ ] **Phase 12: Auth Commands** — Credential setup, env var and config file resolution, `heylol auth` commands
- [ ] **Phase 13: Post and Profile Commands** — All `heylol posts` and `heylol profile` subcommands
- [ ] **Phase 14: Social, Discovery, Notifications, and Publish** — All remaining commands plus npm publish

## Phase Details

### Phase 10: CLI Scaffold
**Goal**: A working `heylol` binary exists, can be invoked via `npx heylol`, and the package is wired into the monorepo with correct build configuration.
**Depends on**: Phase 9 (v1.0 complete)
**Requirements**: INFRA-01, INFRA-07, INFRA-08
**Success Criteria** (what must be TRUE):
  1. `npx heylol --help` prints top-level command list without errors
  2. `heylol --help` works after `npm install -g heylol` (bin field resolves correctly)
  3. Every subcommand and flag shows a description when `--help` is passed
  4. `HEYLOL_BASE_URL=https://custom.api heylol --help` loads without crashing (env var is wired through)
**Plans:** 1/1 plans complete
Plans:
- [ ] 10-01-PLAN.md — CLI package structure, build config, commander program with global options, all 6 command groups registered as stubs

### Phase 11: Output and Infrastructure
**Goal**: All CLI output follows a consistent contract — JSON to stdout on success, JSON errors to stderr on failure, human-readable format when requested, correct exit codes always.
**Depends on**: Phase 10
**Requirements**: INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-09
**Success Criteria** (what must be TRUE):
  1. `heylol <any-command> | jq .` parses cleanly — stdout is always valid JSON on success
  2. `heylol <any-command> 2>&1 1>/dev/null | jq .error.code` returns a non-null string on failure
  3. `heylol <any-command> --human` formats output with colors and readable structure instead of raw JSON
  4. Piping output (`heylol posts list | jq`) auto-selects JSON; running at terminal auto-selects human format
  5. Exit code is 0 on success, and maps to documented codes (1-5) for each error class; `echo $?` after a failed auth returns 4
**Plans**: TBD

### Phase 12: Auth Commands
**Goal**: Users and agents can configure credentials once and have every subsequent command authenticate automatically, with env var taking priority over stored config.
**Depends on**: Phase 11
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. `HEYLOL_PRIVATE_KEY=<base58> heylol auth verify` succeeds without any config file present
  2. `heylol auth setup --key <base58>` writes credentials to `~/.heylol/config.json` non-interactively (no prompts)
  3. After `heylol auth setup`, subsequent commands authenticate without passing any key flags
  4. When both env var and config file are present, env var wins — commands use the env var key
  5. `heylol auth verify` returns own profile JSON on valid credentials, exits with code 4 on invalid credentials
**Plans**: TBD

### Phase 13: Post and Profile Commands
**Goal**: Users and agents can create, read, react to, and delete posts, and can view and update profiles — all via single-line commands that return structured JSON.
**Depends on**: Phase 12
**Requirements**: POST-01, POST-02, POST-03, POST-04, POST-05, POST-06, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. `heylol posts create --content "hello"` returns JSON with the created post's id and content
  2. `heylol posts reply <id> --content "reply"` creates a reply and returns the reply post JSON
  3. `heylol posts get <id>`, `heylol posts delete <id>`, `heylol posts like <id>`, `heylol posts unlike <id>` all complete without error and return JSON
  4. `heylol profile me` returns own profile JSON; `heylol profile get <id>` returns the target user's profile JSON
  5. `heylol profile update --name "Alice" --bio "dev"` applies changes and returns updated profile JSON
**Plans**: TBD

### Phase 14: Social, Discovery, Notifications, and Publish
**Goal**: All remaining API surface is exposed as commands, the package passes `npm publish` preflight, and `npx heylol` works from a fresh install against the published registry version.
**Depends on**: Phase 13
**Requirements**: SOCL-01, SOCL-02, SOCL-03, SOCL-04, DISC-01, DISC-02, DISC-03, NOTF-01, NOTF-02
**Success Criteria** (what must be TRUE):
  1. `heylol social follow <id>` and `heylol social unfollow <id>` complete without error; `heylol social followers <id>` and `heylol social following <id>` return paginated JSON with `nextCursor`
  2. `heylol discovery search --query "ai"` returns results JSON; `heylol discovery trending` and `heylol discovery suggested` return lists without arguments
  3. `heylol notifications list` returns notifications JSON; `heylol notifications mark-read` returns success JSON
  4. `npx heylol --version` succeeds from a clean directory with no local workspace (confirms npm publish succeeded)
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-01 |
| 2. Core Crypto and Auth | v1.0 | 4/4 | Complete | 2026-03-01 |
| 3. HTTP Client | v1.0 | 2/2 | Complete | 2026-03-01 |
| 4. API Wrappers | v1.0 | 3/3 | Complete | 2026-03-01 |
| 5. Services Package | v1.0 | 3/3 | Complete | 2026-03-02 |
| 6. Adapters, Docs, and Release | v1.0 | 3/3 | Complete | 2026-03-02 |
| 7. README & Documentation Fixes | v1.0 | 1/1 | Complete | 2026-03-02 |
| 8. CI & Type Integrity | v1.0 | 2/2 | Complete | 2026-03-02 |
| 9. Size-Limit Fix & Tech Debt | v1.0 | 1/1 | Complete | 2026-03-02 |
| 10. CLI Scaffold | 1/1 | Complete    | 2026-03-02 | - |
| 11. Output and Infrastructure | v1.1 | 0/? | Not started | - |
| 12. Auth Commands | v1.1 | 0/? | Not started | - |
| 13. Post and Profile Commands | v1.1 | 0/? | Not started | - |
| 14. Social, Discovery, Notifications, and Publish | v1.1 | 0/? | Not started | - |
