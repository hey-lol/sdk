# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Developers can go from npm install to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.
**Current focus:** Phase 4 in progress — API Wrappers (resource classes, branded types)

## Current Position

Phase: 4 of 6 (API Wrappers)
Plan: 1 of 3 in current phase
Status: Phase 4 Plan 1 complete — branded ID types, domain interfaces, client 204 guard + query params
Last activity: 2026-03-01 — Plan 04-01 complete (PostId/UserId/NotificationId brands, domain types, params, 128 tests passing)

Progress: [████████░░] 53%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 3min
- Total execution time: 0.28 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 10min | 3min |
| 02-core-crypto-and-auth | 1 | 4min | 4min |
| 03-http-client | 2 | 5min | 2.5min |
| 04-api-wrappers | 1 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 02-04 (2min), 03-01 (2min), 03-02 (3min), 04-01 (2min)
- Trend: Consistent 2-4min execution

*Updated after each plan completion*
| Phase 01-foundation P02 | 4min | 2 tasks | 12 files |
| Phase 01-foundation P03 | 4 | 2 tasks | 9 files |
| Phase 02-core-crypto-and-auth P01 | 4min | 2 tasks | 8 files |
| Phase 02-core-crypto-and-auth P02 | 2min | 2 tasks | 2 files |
| Phase 02-core-crypto-and-auth P03 | 3min | 1 task | 4 files |
| Phase 02-core-crypto-and-auth P04 | 2min | 2 tasks | 3 files |
| Phase 03-http-client P01 | 2min | 2 tasks | 9 files |
| Phase 03-http-client P02 | 3min | 2 tasks | 4 files |
| Phase 04-api-wrappers P01 | 2min | 2 tasks | 5 files |

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
- [02-03]: parsePaymentRequirements is async because v1 requires await response.json() — return type is Promise<PaymentRequirements[]>
- [02-03]: btoa/atob used for base64 (available in all edge runtimes) — no Buffer or Node.js crypto needed
- [02-03]: src/types/** excluded from coverage — TypeScript interface-only files have no runtime code to cover
- [Phase 02-04]: Barrel exports at auth/ and types/ boundaries enable organized re-export without coupling index.ts to internal file structure
- [Phase 02-04]: encodeCompactU16 exported from auth/index.ts but not from main index.ts — internal utility exposed only for advanced users
- [03-01]: NetworkError.code narrowed to 'FETCH_FAILED' | 'TIMEOUT' — RATE_LIMITED moved to dedicated RateLimitError to prevent discriminant collision
- [03-01]: withRetry retries on 502 in addition to 503 — both are transient upstream failures
- [03-01]: Injectable _sleep pattern preferred over mocking global timers — cleaner test isolation, no global state contamination
- [03-01]: Barrel/type-only client files excluded from coverage (client/index.ts, client/options.ts) — same pattern as auth/index.ts and src/types/**
- [03-02]: 402 payment loop implemented inline in request() closure — paymentHeader guard variable prevents infinite loops; second 402 throws PaymentRejectedError
- [03-02]: getPaymentVersion() null-coalesced to version 1 on 402 — permissive fallback for servers that omit version header
- [03-02]: Static analysis test for Web API portability checks literal word absence — source comment wording must not mention forbidden node globals by name
- [04-01]: unique symbol brand key used over string __brand property — prevents brand forgery across modules, matches Anthropic and Stripe production SDK patterns
- [04-01]: Factory functions as const arrows (asPostId = (s) => s as PostId) — zero runtime overhead, sole safe entry point for branded values
- [04-01]: URLSearchParams for GET query serialization — Web API available in all target runtimes without polyfills
- [04-01]: 204 guard checks both status===204 and content-length==='0' — defensive against both explicit 204 and 200+empty body patterns

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Zero-amount dummy transaction blockhash convention is LOW confidence — requires integration test against real API
- [Phase 6]: Miniflare v4 API may have changed since training cutoff (Aug 2025) — verify before Cloudflare adapter work

## Session Continuity

Last session: 2026-03-01
Stopped at: Completed 04-01-PLAN.md (branded types, domain interfaces, client 204 guard + query params, 128 tests)
Resume file: .planning/phases/04-api-wrappers/04-02-PLAN.md (PostsResource and ProfileResource)
