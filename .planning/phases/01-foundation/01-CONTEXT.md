# Phase 1: Foundation - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Monorepo infrastructure, build tooling, CI gates, and ESLint rules that guard every subsequent phase. A developer can clone the repo, run one command, and get a passing build with CI-enforced safety nets. No runtime code — just the scaffold that all packages build on.

</domain>

<decisions>
## Implementation Decisions

### Workspace layout
- Multi-package workspace with independent packages: @heylol/sdk (core), @heylol/services, @heylol/adapter-cloudflare, @heylol/adapter-vercel, @heylol/adapter-express
- Flat directory structure under `packages/` — all packages as siblings (packages/sdk/, packages/services/, packages/adapter-cloudflare/, etc.)
- Example projects live inside the monorepo under `examples/` — part of the workspace, tested in CI

### CI gate philosophy
- Warnings allowed, only errors block merges
- CI checks run in parallel (lint, build, test, size-check concurrently) for fastest feedback
- Gated on: size-limit (100KB core), publint, attw, and test coverage
- Test coverage gate: 90% minimum to merge

### Dev loop experience
- `pnpm dev` runs global watch & rebuild across all packages with TypeScript type-checking
- Comprehensive top-level scripts (6-8): dev, build, test, lint, format, typecheck, size-check, changeset
- Pre-commit hook via lint-staged — runs lint and format on staged files
- Biome for formatting (combined lint + format, faster than Prettier)

### Release & versioning
- Independent versioning per package (not lockstep)
- Initial version: 1.0.0 for all packages — signals stable from day one
- Changesets require a human-readable summary for every change
- Auto-publish on merge to main — every merge with changesets automatically publishes affected packages

### Claude's Discretion
- Build tool choice (tsup, unbuild, tsc, etc.)
- Test runner choice
- Exact ESLint rule configuration beyond the required Node.js built-in guards
- Biome configuration details
- CI platform and workflow file structure
- size-limit configuration approach

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-28*
