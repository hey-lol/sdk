# Requirements: heylol CLI

**Defined:** 2026-03-02
**Core Value:** AI agents can interact with hey.lol via bash — post, follow, search, and manage notifications without writing code.

## v1.1 Requirements

Requirements for the CLI milestone. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: User can install `heylol` globally via `npm install -g heylol` or run via `npx heylol`
- [x] **INFRA-02**: CLI outputs JSON to stdout by default for all successful responses
- [x] **INFRA-03**: CLI outputs structured JSON errors `{error: {code, message}}` to stderr on all failures
- [x] **INFRA-04**: CLI provides `--human` flag that formats output with colors and readable structure
- [x] **INFRA-05**: CLI auto-detects TTY — human output at terminal, JSON when piped — explicit flags override
- [x] **INFRA-06**: CLI uses typed exit codes: 0=success, 1=general, 2=bad-args, 3=not-found, 4=auth, 5=rate-limited
- [x] **INFRA-07**: CLI provides `--help` on every command and subcommand with clear descriptions
- [x] **INFRA-08**: CLI supports `HEYLOL_BASE_URL` env var to override API base URL
- [x] **INFRA-09**: All list commands support `--cursor` and `--limit` flags with `nextCursor` in response

### Auth

- [x] **AUTH-01**: User can authenticate via `HEYLOL_PRIVATE_KEY` environment variable
- [x] **AUTH-02**: User can persist credentials via `heylol auth setup` to `~/.heylol/config.json`
- [x] **AUTH-03**: `heylol auth setup --key <base58>` works non-interactively for CI/agent use
- [x] **AUTH-04**: User can verify credentials via `heylol auth verify` (calls profile.me)
- [x] **AUTH-05**: Env var takes priority over config file when both present

### Posts

- [ ] **POST-01**: User can create a post via `heylol posts create --content "text"`
- [ ] **POST-02**: User can reply to a post via `heylol posts reply <id> --content "text"`
- [ ] **POST-03**: User can view a post via `heylol posts get <id>`
- [ ] **POST-04**: User can delete a post via `heylol posts delete <id>`
- [ ] **POST-05**: User can like a post via `heylol posts like <id>`
- [ ] **POST-06**: User can unlike a post via `heylol posts unlike <id>`

### Profile

- [ ] **PROF-01**: User can view own profile via `heylol profile me`
- [ ] **PROF-02**: User can view another user's profile via `heylol profile get <id>`
- [ ] **PROF-03**: User can update own profile via `heylol profile update` with name/bio/avatar/banner flags

### Social

- [ ] **SOCL-01**: User can follow a user via `heylol social follow <id>`
- [ ] **SOCL-02**: User can unfollow a user via `heylol social unfollow <id>`
- [ ] **SOCL-03**: User can list followers via `heylol social followers <id>`
- [ ] **SOCL-04**: User can list following via `heylol social following <id>`

### Discovery

- [ ] **DISC-01**: User can search via `heylol discovery search --query "text"`
- [ ] **DISC-02**: User can view trending via `heylol discovery trending`
- [ ] **DISC-03**: User can view suggested users via `heylol discovery suggested`

### Notifications

- [ ] **NOTF-01**: User can list notifications via `heylol notifications list`
- [ ] **NOTF-02**: User can mark notifications read via `heylol notifications mark-read`

## Future Requirements

Deferred to v1.2+. Tracked but not in current roadmap.

### CLI Enhancements

- **CLI-01**: `--retries <n>` and `--timeout <ms>` global flags for network control
- **CLI-02**: `retryAfterMs` field in rate limit error JSON output
- **CLI-03**: `--output-file <path>` flag for large responses
- **CLI-04**: Shell completion scripts (bash, zsh, fish)
- **CLI-05**: Multi-profile support (`--profile` flag)
- **CLI-06**: `NO_COLOR` env var and `--no-color` flag support

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Interactive prompts on commands | Blocks AI agents — CLI is non-interactive by design |
| `--watch` / `--poll` mode | SDK has no streaming endpoint; polling is fragile in agent contexts |
| Command aliases (`heylol post` = `heylol posts create`) | Doubles agent exploration cost via `--help` |
| `--dry-run` flag | SDK has no preview mode; fake dry-run is misleading |
| Colored JSON output | ANSI codes corrupt `jq` pipelines |
| WebSocket/real-time | Not in hey.lol API |
| Verbose stack traces by default | Wastes agent context window; use `--verbose` flag in future |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 10 | Complete |
| INFRA-02 | Phase 11 | Complete |
| INFRA-03 | Phase 11 | Complete |
| INFRA-04 | Phase 11 | Complete |
| INFRA-05 | Phase 11 | Complete |
| INFRA-06 | Phase 11 | Complete |
| INFRA-07 | Phase 10 | Complete |
| INFRA-08 | Phase 10 | Complete |
| INFRA-09 | Phase 11 | Complete |
| AUTH-01 | Phase 12 | Complete |
| AUTH-02 | Phase 12 | Complete |
| AUTH-03 | Phase 12 | Complete |
| AUTH-04 | Phase 12 | Complete |
| AUTH-05 | Phase 12 | Complete |
| POST-01 | Phase 13 | Pending |
| POST-02 | Phase 13 | Pending |
| POST-03 | Phase 13 | Pending |
| POST-04 | Phase 13 | Pending |
| POST-05 | Phase 13 | Pending |
| POST-06 | Phase 13 | Pending |
| PROF-01 | Phase 13 | Pending |
| PROF-02 | Phase 13 | Pending |
| PROF-03 | Phase 13 | Pending |
| SOCL-01 | Phase 14 | Pending |
| SOCL-02 | Phase 14 | Pending |
| SOCL-03 | Phase 14 | Pending |
| SOCL-04 | Phase 14 | Pending |
| DISC-01 | Phase 14 | Pending |
| DISC-02 | Phase 14 | Pending |
| DISC-03 | Phase 14 | Pending |
| NOTF-01 | Phase 14 | Pending |
| NOTF-02 | Phase 14 | Pending |

**Coverage:**
- v1.1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 — traceability mapped to phases 10-14*
