# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Developers can go from npm install to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.
**Current focus:** Phase 2 — Core Crypto and Auth

## Current Position

Phase: 2 of 6 (Core Crypto and Auth)
Plan: 3 of 4 in current phase
Status: Phase 2 in progress — Plan 02-03 complete
Last activity: 2026-03-01 — Plan 02-03 complete (x402 response parser and header builder)

Progress: [██████░░░░] 32%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 3min
- Total execution time: 0.22 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 10min | 3min |
| 02-core-crypto-and-auth | 1 | 4min | 4min |

**Recent Trend:**
- Last 5 plans: 01-01 (2min), 01-02 (4min), 01-03 (4min), 02-01 (4min)
- Trend: Consistent 4min execution

*Updated after each plan completion*
| Phase 01-foundation P02 | 4min | 2 tasks | 12 files |
| Phase 01-foundation P03 | 4 | 2 tasks | 9 files |
| Phase 02-core-crypto-and-auth P01 | 4min | 2 tasks | 8 files |
| Phase 02-core-crypto-and-auth P02 | 2min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Setup]: Pure JS crypto via @noble/curves — @solana/web3.js breaks in edge runtimes
- [Setup]: Monorepo structure — allows independent versioning of adapters
- [Setup]: Zod as optional peer dep — service definitions need validation but core should not require it
- [Setup]: Subpath exports (@heylol/sdk/services) — tree-shaking, progressive disclosure
- [01-01]: Biome schema URL set to installed version (2.4.4) not catalog floor (2.0.0)
- [01-01]: vitest --config ../../vitest.config.ts required in all package test scripts (not auto-inherited)
- [01-01]: Build scripts are placeholder echo in plan 01 — tsup config deferred to plan 02
- [01-02]: tsup with type:module generates .d.ts (not .d.mts) for ESM — exports map import.types points to .d.ts
- [01-02]: Missing packageManager field in root package.json blocks Turborepo — added pnpm@10.21.0
- [01-02]: ESLint no-restricted-imports uses paths array wrapping with object-with-message form
- [Phase 01-02]: tsup with type:module generates .d.ts (not .d.mts) for ESM — exports map import.types should point to .d.ts for type:module packages
- [Phase 01-foundation]: typesVersions required in SDK for node10 subpath type resolution — attw fails without it for @heylol/sdk/services
- [Phase 01-foundation]: biome.json files.ignore is unknown in Biome 2.4.4 — use ignoreUnknown:true; dist exclusion via .gitignore and useIgnoreFile:true
- [Phase 01-foundation]: size-limit configured via .size-limit.json at workspace root for cleaner package.json
- [02-01]: ES2022 native class extends works correctly — Object.setPrototypeOf not needed (confirmed by instanceof tests)
- [02-01]: Local vitest.config.ts per-package needed to exclude stub files from coverage — prevents threshold failures from phase 1 placeholders
- [02-01]: @typescript-eslint/parser required in ESLint flat config — ESLint v9 default parser cannot parse TypeScript class body syntax
- [02-01]: loadKeypair dispatches on decoded.length (64 vs 32 bytes) — accepts both Solana CLI/Phantom and secret-only formats
- [Phase 02-02]: Solana compact-u16 differs from protobuf varint — 2-byte range uses (value & 0x7f) | 0x80, value >> 7
- [Phase 02-02]: buildDummyTransaction produces exactly 169 bytes for standard inputs — deterministic and verifiable via ed25519.verify
- [Phase 02-02]: concatBytes() uses .set() at computed offsets — avoids spread syntax overhead for Uint8Array concatenation

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: x402 facilitator payload format is LOW confidence — must validate against real API before implementing src/auth/x402.ts
- [Phase 2]: Zero-amount dummy transaction blockhash convention is LOW confidence — requires integration test against real API
- [Phase 6]: Miniflare v4 API may have changed since training cutoff (Aug 2025) — verify before Cloudflare adapter work

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 02-02-PLAN.md (Solana tx serializer)
Resume file: .planning/phases/02-core-crypto-and-auth/02-03-PLAN.md (x402 response parser)
