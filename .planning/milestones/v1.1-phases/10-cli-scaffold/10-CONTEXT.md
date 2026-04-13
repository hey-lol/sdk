# Phase 10: CLI Scaffold - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A working `heylol` binary wired into the monorepo — package structure, bin entry, tsup ESM-only build, workspace link to @heylol/sdk, and command registration with help output. Stack is locked: commander@14, conf@15, picocolors@1.1, tsup ESM-only. CLI is a thin wrapper over @heylol/sdk.

</domain>

<decisions>
## Implementation Decisions

### Command hierarchy
- Noun-verb grouping: `heylol posts list`, `heylol profile me`, `heylol auth verify`
- Command group names match SDK resource names exactly: auth, posts, profile, social, discovery, notifications
- No renaming or shortening for CLI ergonomics — consistency with SDK is the priority

### Help presentation
- Minimal and clean style — no ASCII banner, no logo. Think `gh --help`
- Just command names and descriptions, no visual clutter

### Global flags & env vars
- Two env vars at scaffold level: `HEYLOL_BASE_URL` (API override) and `HEYLOL_DEBUG=1` (verbose HTTP logging)
- Global flags mirror env vars: `--base-url` and `--debug` available as CLI flags
- Precedence: CLI flag wins over env var when both are set
- Color: auto TTY detection only — colors on in terminal, off when piped. No `--no-color` flag needed. Agents get plain output automatically

### Claude's Discretion
- Whether to register all subcommand groups as stubs now or incrementally per phase
- ID argument style (positional vs named flag) for resource-targeting commands
- Help description depth (one-liners vs examples)
- Version output format
- Unknown command error handling (fuzzy suggest vs help redirect)

</decisions>

<specifics>
## Specific Ideas

- CLI is targeted at AI agents (per milestone goal: "AI agents can use via bash") — piped/non-TTY usage is the primary mode
- Should feel like `gh` — minimal, professional, no unnecessary output

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-cli-scaffold*
*Context gathered: 2026-03-02*
