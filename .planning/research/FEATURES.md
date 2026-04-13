# Feature Research

**Domain:** CLI tool for social platform API — agent-first wrapper over @heylol/sdk
**Researched:** 2026-03-02
**Confidence:** HIGH (core patterns from well-documented reference CLIs) / MEDIUM (social platform specifics)

---

## Context

This CLI is a thin wrapper over `@heylol/sdk`. It adds no new business logic — it translates commands to SDK method calls and serializes SDK responses to stdout. The SDK already handles: HTTP, x402 payment signing, retries, typed errors. The CLI adds: config file management, argument parsing, output formatting, and exit codes.

**Primary consumer: AI agents running bash commands.** JSON is the default output mode. Human-readable output is opt-in via `--human`.

**SDK methods available (all direct mappings):**
- `client.posts`: create, get, delete, like, unlike, reply
- `client.profile`: me, get, update
- `client.social`: follow, unfollow, followers, following
- `client.discovery`: search, trending, suggested
- `client.notifications`: list, markRead
- Error classes: AuthError, APIError, RateLimitError, NetworkError, PaymentRejectedError (all have `code` + `toJSON()`)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that must exist. Missing any of these makes the CLI feel broken to an agent or developer.

| Feature | Why Expected | Complexity | SDK Dependency | Notes |
|---------|--------------|------------|----------------|-------|
| **Auth: env var (`HEYLOL_PRIVATE_KEY`)** | Standard pattern for CI/agent environments. Every API CLI does this (gh, stripe, aws). | LOW | `HeyLolClient({ privateKey })` — direct | No new SDK logic. Read env → pass to SDK constructor. |
| **Auth: config file (`~/.heylol/config.json`)** | Persistent auth for developer machines. Avoids re-specifying key on every command. | LOW | Same SDK constructor | New CLI logic: read/write config file, validate key on save. Must NOT print key in output. |
| **`heylol auth setup`** | First-run experience. Without this, nobody knows how to configure the tool. | LOW | `loadKeypair()` for validation | New CLI logic: accept key input (`--key` flag or prompt), validate via `loadKeypair()`, write config file. |
| **`heylol auth verify`** | Agents need to confirm credentials work before running a workflow. Fails clearly if bad. | LOW | `client.profile.me()` — direct | Makes a real API call. Outputs `{"valid": true, "userId": "..."}` on success. |
| **Auth priority: env var overrides config file** | Agents in CI pass keys via env without requiring a config file to exist. | LOW | None | Resolution order: env var → config file → error with actionable message. |
| **JSON output by default** | Agents parse stdout. Human decoration (colors, spinners, tables) breaks piping and jq. | LOW | `error.toJSON()` already exists | `JSON.stringify(result, null, 2)` to stdout. All errors to stderr. |
| **Non-zero exit codes on all errors** | Agents check `$?` to detect failure. Exit 0 on error breaks every pipeline. | LOW | SDK error classes exist | Exit 0 = success, 1 = general error, 2 = bad args, 3 = not found (404), 4 = auth/payment failure, 5 = rate limited. |
| **`--help` on every command and subcommand** | Agents explore commands via `--help`. Without it, discoverability is zero. | LOW | None | CLI framework (commander/yargs/oclif) provides this automatically. Write clear per-command descriptions. |
| **`heylol posts create --content "text"`** | Creating posts is the primary write action. Any social CLI must have this. | LOW | `client.posts.create()` — direct | Map `--content`, `--media-url` (repeatable), `--paywall-teaser`, `--paywall-price` to `CreatePostParams`. |
| **`heylol posts reply <id> --content "text"`** | Reply threads are core social interaction. | LOW | `client.posts.reply()` — direct | Same shape as create, plus required parent post ID arg. |
| **`heylol posts get <id>`** | Read a post by ID — required for any read workflow. | LOW | `client.posts.get()` — direct | Wrap string arg as `asPostId()`. |
| **`heylol posts delete <id>`** | Agents need to clean up posts. Expected on any write-capable CLI. | LOW | `client.posts.delete()` — direct | SDK returns void (204). Output `{"deleted": true}` to indicate success. |
| **`heylol posts like <id>` / `heylol posts unlike <id>`** | Engagement operations. Expected on social platform CLIs. | LOW | `client.posts.like()` / `client.posts.unlike()` — direct | SDK returns void (204). Output `{"liked": true}` / `{"unliked": true}`. |
| **`heylol profile me`** | Verify which account you're authenticated as. Essential for auth debugging. | LOW | `client.profile.me()` — direct | |
| **`heylol profile get <id>`** | Look up any user's profile by ID. | LOW | `client.profile.get()` — direct | |
| **`heylol profile update`** | Update own profile from a script or agent. | LOW | `client.profile.update()` — direct | Flags: `--display-name`, `--bio`, `--avatar-url`, `--banner-url`. At least one required. |
| **`heylol social follow <id>` / `heylol social unfollow <id>`** | Graph write operations. Any social platform CLI needs these. | LOW | `client.social.follow()` / `client.social.unfollow()` — direct | |
| **`heylol social followers <id>` / `heylol social following <id>`** | Inspect the social graph. Required for any social automation. | LOW | `client.social.followers()` / `client.social.following()` — direct | Supports `--cursor` and `--limit` pagination flags. |
| **`heylol discovery search --query "text"`** | Find content and users. Table stakes for any social platform. | LOW | `client.discovery.search()` — direct | Supports `--type users\|posts\|all`, `--limit`, `--cursor`. |
| **`heylol discovery trending`** | Get trending posts. Expected on social platforms. | LOW | `client.discovery.trending()` — direct | |
| **`heylol discovery suggested`** | Suggested users to follow. Standard platform feature. | LOW | `client.discovery.suggested()` — direct | |
| **`heylol notifications list`** | Check notifications. Agents poll this to detect activity. | LOW | `client.notifications.list()` — direct | |
| **`heylol notifications mark-read`** | Mark all or specific notifications as read. | LOW | `client.notifications.markRead()` — direct | `--id` flag (repeatable) for specific IDs; no `--id` = mark all. |
| **Structured JSON error output to stderr** | Agents parse errors. Unstructured text in stderr is unparseable. | LOW | `error.toJSON()` already has `{name, code, message}` | Emit `{"error": {"code": "...", "message": "...", "statusCode": 404}}` to stderr. Never mix with stdout. |
| **`--cursor <token>` and `--limit <n>` on all list commands** | Consistent pagination interface. An agent writes one pagination loop and reuses it everywhere. | LOW | `PaginationParams` — direct | `nextCursor` included in every paginated response. Standardize across: social followers/following, notifications list, discovery trending/suggested/search. |

### Differentiators (Competitive Advantage)

Features that raise the bar for agent-friendly CLIs. Not expected, but valuable.

| Feature | Value Proposition | Complexity | SDK Dependency | Notes |
|---------|-------------------|------------|----------------|-------|
| **TTY auto-detection for output mode** | JSON when piped (agent context), human-readable at terminal. Zero config. Agents never accidentally get color codes. | LOW | None | `process.stdout.isTTY` — true → human mode default; false → JSON mode default. Explicit `--json` / `--human` always overrides. |
| **Typed exit codes per error class** | Agents can branch on `$?` without parsing JSON. Enables `if heylol posts like <id>; then` patterns without JSON parsing. | LOW | SDK error classes map cleanly | Exit 0 = success, 1 = general error, 2 = bad args, 3 = not found (404), 4 = auth/payment error (`AuthError`, `PaymentRejectedError`), 5 = rate limited (`RateLimitError`). |
| **`retryAfterMs` in rate limit error output** | Agents know exactly how long to wait before retrying. No guessing. | LOW | `RateLimitError.retryAfterMs` — already on the error class | Include in stderr JSON: `{"error": {"code": "RATE_LIMITED", "retryAfterMs": 5000}}`. |
| **`heylol auth setup --key <base58>` non-interactive mode** | Agents cannot respond to prompts. A non-interactive setup is required for CI/agent bootstrapping. | LOW | `loadKeypair()` for validation | `--key` flag writes config without prompting. Prompting only when stdin is a TTY and `--key` not provided. |
| **`HEYLOL_BASE_URL` env var** | Points CLI at staging/local server without code changes. Essential for testing workflows against non-production environments. | LOW | `ClientOptions.baseUrl` — direct passthrough | |
| **`--retries <n>` and `--timeout <ms>` global flags** | Agents in unreliable network conditions need control over retry behavior per invocation. | LOW | `ClientOptions.retries` / `ClientOptions.timeout` — direct passthrough | Make SDK defaults explicit in `--help` output. |
| **`NO_COLOR` env var + `--no-color` flag** | Respects the `NO_COLOR` community standard. Ensures agent pipelines receive clean output even in human mode. | LOW | None | Check `process.env.NO_COLOR` and `--no-color` flag before emitting any ANSI sequences. |
| **`nextCursor` always present in paginated output** | Agents reliably detect whether more pages exist. No ambiguity about whether `nextCursor: null` means "last page" or "error". | LOW | `PaginatedList.nextCursor` — already in SDK types | Output shape: `{"items": [...], "nextCursor": "abc" \| null, "hasMore": true \| false}`. Preserve SDK field names exactly. |
| **`--output-file <path>` global flag** | Large discovery/list responses can exceed buffer sizes that cause agent issues. Write directly to file instead. | LOW | None | New CLI logic: write JSON to file, output `{"written": "/path/to/file.json"}` to stdout. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem useful but create real problems for this specific CLI.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Interactive prompts for every command** | Feels friendly for humans. | Blocks agents forever when stdin is not a TTY. Hides required arguments from `--help`. Creates untestable code paths. | Use `--non-interactive` / `--key` for the one command that needs prompting (`auth setup`). All other commands are fully argument-driven. |
| **Global `--profile` flag for multiple accounts** | Developers want to switch between accounts without env var changes. | Out of scope for v1. Multi-profile config adds schema versioning, resolution logic, and migration complexity. | Use `HEYLOL_PRIVATE_KEY` env var to switch accounts in scripts. Documented workaround. Multi-profile deferred to v2. |
| **Streaming/watch mode (`--watch`, `--poll`)** | Agents polling for notifications might want a long-running process. | The SDK has no streaming endpoint. A polling loop is fragile in agent contexts (SIGINT handling, zombie processes, no guaranteed cleanup). | Use `notifications list` on a cron/agent loop instead. Document this pattern explicitly. |
| **Shell completion scripts** | Good developer ergonomics. | Significant implementation effort (per-shell generation, install instructions). Low agent value since agents use `--help`. | Defer to v2. Document `--help` as the discovery mechanism in v1. |
| **`--dry-run` flag** | Agents want to preview destructive operations. | SDK has no preview mode. A fake dry-run that skips the API call is misleading — it bypasses x402 payment signing and cannot predict real server responses. "Would delete post X" is not the same as "deletion would succeed". | Document destructive commands clearly. Pattern: `heylol posts get <id>` before `heylol posts delete <id>`. |
| **Colored JSON output by default** | Prettier for developers who read raw output. | ANSI codes in JSON corrupt every downstream `jq` pipeline or file write. The payload is the data, not the presentation. | TTY auto-detection enables human mode (with color) only at terminals. JSON mode is always colorless. `--human` flag enables color in non-TTY contexts explicitly. |
| **Bare `heylol` with no subcommand executes anything** | Magic shorthand feels productive. | No-argument invocation must print help and exit 0, not make API calls. Side effects on bare invocation break agent workflows that use `heylol` to probe availability. | Show `--help` by default. Zero side effects on bare invocation. |
| **Command aliases (e.g., `heylol post` = `heylol posts create`)** | Ergonomic shortcuts for frequent commands. | Aliases make `--help` ambiguous. Agents doing tree-search through `--help` see two paths to the same operation, which doubles exploration cost. Noun-verb is already compact. | Keep noun-verb canonical. No aliases in v1. Document full command in every example. |
| **Verbose error output with stack traces by default** | Developers want full context when debugging. | Stack traces leak SDK internals and are meaningless to agents. A 40-line stack trace in stderr is noise that consumes agent context window. | Output structured `{"code": "...", "message": "..."}` by default. Add `--verbose` / `--debug` flag that includes the stack trace as a separate optional field. |

---

## Feature Dependencies

```
[Auth: env var OR config file]
    └──required by──> [Every other command that calls the API]

[heylol auth setup]
    └──writes──> [Auth: config file]
    └──uses──> [loadKeypair() for validation — SDK auth module]

[heylol auth verify]
    └──requires──> [Auth: env var or config file]
    └──calls internally──> [client.profile.me()]

[--cursor and --limit flags]
    └──standardized across──> [social followers]
    └──standardized across──> [social following]
    └──standardized across──> [notifications list]
    └──standardized across──> [discovery trending]
    └──standardized across──> [discovery suggested]
    └──standardized across──> [discovery search]

[TTY auto-detection]
    └──enhances──> [JSON output default]
    └──conflicts with──> [--json flag] (explicit flag always wins)
    └──conflicts with──> [--human flag] (explicit flag always wins)

[Typed exit codes]
    └──depends on──> [SDK error classes: AuthError, APIError, RateLimitError, NetworkError, PaymentRejectedError]
    └──maps to──> [exit 3 for APIError.statusCode === 404]
    └──maps to──> [exit 4 for AuthError or PaymentRejectedError]
    └──maps to──> [exit 5 for RateLimitError]

[heylol auth setup --key flag]
    └──conflicts with──> [interactive prompt] (flag skips prompt entirely)
```

### Dependency Notes

- **All API commands require auth resolution first.** The `HeyLolClient` constructor requires a `privateKey`. Auth resolution must run before any SDK client is instantiated. Commands fail with exit 4 and an actionable message if no key is found.
- **`auth verify` is `profile me` with friendlier output.** No separate SDK method needed. The CLI wraps the call and reformats the response.
- **Pagination flags are a cross-cutting concern.** Implement `--cursor` and `--limit` parsing once in a shared utility, apply identically to all list commands. Any inconsistency in behavior across commands will confuse agents.
- **TTY detection conflicts with explicit flags.** If `--json` is passed, always use JSON regardless of TTY state. If `--human` is passed, always use human format. TTY auto-detection only activates when neither flag is set.
- **Exit codes depend on SDK error class identity.** Use `instanceof` checks against SDK error classes. Do NOT key on string message contents, which can change. The `error.code` field is stable.

---

## MVP Definition

### Launch With (v1)

Minimum viable — an agent can authenticate, write posts, manage its profile, and read the social graph.

- [ ] **Auth resolution (env var + config file)** — without this, nothing works
- [ ] **`auth setup` and `auth verify`** — onboarding and credential validation
- [ ] **`posts create`, `posts reply`, `posts get`, `posts delete`, `posts like`, `posts unlike`** — core write + read operations
- [ ] **`profile me`, `profile get`, `profile update`** — identity operations
- [ ] **`social follow`, `social unfollow`, `social followers`, `social following`** — social graph operations
- [ ] **`notifications list`, `notifications mark-read`** — notification management
- [ ] **`discovery search`, `discovery trending`, `discovery suggested`** — content discovery
- [ ] **JSON output by default, `--human` flag for pretty output** — agent-first output mode
- [ ] **Non-zero exit codes on all errors, structured JSON errors to stderr** — agent-safe error handling
- [ ] **`--cursor` and `--limit` on all list commands** — consistent pagination
- [ ] **`--help` on all commands** — discoverability

### Add After Validation (v1.x)

- [ ] **TTY auto-detection for output mode** — improves developer ergonomics. Add once v1 is stable and usage patterns are confirmed.
- [ ] **`HEYLOL_BASE_URL` env var** — add when staging/testing workflows are needed.
- [ ] **`--retries` and `--timeout` global flags** — add when network reliability issues surface.
- [ ] **`retryAfterMs` in rate limit error JSON** — add when agent rate-limit handling is needed.
- [ ] **`--output-file` flag** — add when large response payloads cause agent issues.

### Future Consideration (v2+)

- [ ] **Multi-profile support** — defer until multi-account use case is validated with real users.
- [ ] **Shell completion scripts** — low agent value; add when developer adoption grows.
- [ ] **`NO_COLOR` / `--no-color` support** — implement if ANSI complaints surface. Low risk since JSON mode has no ANSI.

---

## Feature Prioritization Matrix

| Feature | Agent Value | Implementation Cost | Priority |
|---------|-------------|---------------------|----------|
| Auth resolution (env var + config file) | HIGH | LOW | P1 |
| `auth setup` / `auth verify` | HIGH | LOW | P1 |
| JSON output by default | HIGH | LOW | P1 |
| Structured JSON errors to stderr | HIGH | LOW | P1 |
| Typed exit codes | HIGH | LOW | P1 |
| `posts create/reply/get/delete/like/unlike` | HIGH | LOW | P1 |
| `profile me/get/update` | HIGH | LOW | P1 |
| `social follow/unfollow/followers/following` | HIGH | LOW | P1 |
| `notifications list/mark-read` | HIGH | LOW | P1 |
| `discovery search/trending/suggested` | HIGH | LOW | P1 |
| `--cursor` and `--limit` pagination flags | HIGH | LOW | P1 |
| `--help` on all commands | HIGH | LOW | P1 |
| TTY auto-detection | MEDIUM | LOW | P2 |
| `HEYLOL_BASE_URL` env var | MEDIUM | LOW | P2 |
| `--retries` / `--timeout` global flags | MEDIUM | LOW | P2 |
| `retryAfterMs` in rate limit error output | MEDIUM | LOW | P2 |
| `--output-file` flag | LOW | LOW | P2 |
| `NO_COLOR` / `--no-color` | LOW | LOW | P2 |
| Multi-profile support | LOW | MEDIUM | P3 |
| Shell completions | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have; add once core is validated
- P3: Nice to have; future consideration

---

## Competitor Feature Analysis

Reference CLIs analyzed for patterns (pattern sources, not direct competitors).

| Feature | GitHub CLI (`gh`) | Stripe CLI | AWS CLI | Our Approach |
|---------|-------------------|------------|---------|--------------|
| Auth | `gh auth login` (browser OAuth or token) | `stripe login` or `STRIPE_API_KEY` env | `aws configure` or env vars | `heylol auth setup` (key input) or `HEYLOL_PRIVATE_KEY` env. No browser flow — Solana keypair is already a credential. |
| Auth verify | `gh auth status` | `stripe whoami` | `aws sts get-caller-identity` | `heylol auth verify` — calls `profile me`, outputs `{"valid": true, "userId": "..."}` |
| Output default | Human-readable | Human-readable | JSON | JSON by default (agent-first). Invert the convention. |
| Human output | Default behavior | Default behavior | `--output text` | `--human` flag or TTY auto-detection |
| Error format | Human text to stderr | Human text to stderr | JSON to stderr (with `--output json`) | Always JSON to stderr with `code` field regardless of output mode |
| Pagination | `--limit` flag, cursor in response | `--limit`, response has `has_more` | `--max-items`, `--starting-token` | `--cursor` and `--limit` flags, `nextCursor` + `hasMore` in every paginated response |
| Command naming | `gh pr create`, `gh issue list` (noun-verb) | `stripe charges list` (noun-verb) | `aws s3 ls` (noun-verb) | `heylol posts create`, `heylol social follow` — consistent noun-verb |
| Config file | `~/.config/gh/hosts.yml` | `~/.config/stripe/config.toml` | `~/.aws/credentials` | `~/.heylol/config.json` — single-file, JSON, no TOML parser dependency |
| Non-interactive | `--yes` flag on confirmations | `--no-confirm` | `-y` / `--yes` | `--key` flag on `auth setup`; all other commands are non-interactive by design |

---

## Sources

- [Writing CLI Tools That AI Agents Actually Want to Use — DEV Community](https://dev.to/uenyioha/writing-cli-tools-that-ai-agents-actually-want-to-use-39no) — exit code conventions, stdout/stderr contract, flat JSON for agents
- [CLI Is the New API and MCP — jonnyzzz.com](https://jonnyzzz.com/blog/2026/02/20/cli-tools-for-ai-agents/) — noun-verb pattern, agent discoverability via --help
- [Why CLIs Beat MCP for AI Agents — Medium](https://lalatenduswain.medium.com/why-clis-beat-mcp-for-ai-agents-and-how-to-build-your-own-cli-army-8db9e0467dd8) — token efficiency, Unix composability, binary distribution
- [CLI Style Guide — Heroku Dev Center](https://devcenter.heroku.com/articles/cli-style-guide) — `--json` and `--terse` conventions, usability before machine-readability
- [Command Line Interface Guidelines — clig.dev](https://clig.dev/) — stdout/stderr contract, TTY detection, JSON as API contract
- [Making your CLI agent-friendly — Speakeasy](https://www.speakeasy.com/blog/engineering-agent-friendly-cli) — structured output, documentation of machine-readable modes
- [GitHub CLI Manual — cli.github.com](https://cli.github.com/manual/) — auth flow reference, command structure, flag conventions
- [Pagination — MCP Specification](https://modelcontextprotocol.io/specification/2024-11-05/server/utilities/pagination) — cursor pagination design for agent-consumed interfaces
- [XDG Base Directory Specification — ArchWiki](https://wiki.archlinux.org/title/XDG_Base_Directory) — config file location conventions (`~/.config` vs `~/.[tool]`)
- [AI Workflow Patterns in Go: CLI to Agents — dasroot.net](https://dasroot.net/posts/2026/02/ai-workflow-patterns-go-cli-tools-agents/) — agent-first CLI design rationale

---

*Feature research for: heylol CLI (agent-first social platform API CLI wrapper)*
*Researched: 2026-03-02*
