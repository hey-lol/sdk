# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Developers can go from npm install to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.
**Current focus:** Phase 5 complete — Services Package (types, registerService, create402Response, middleware, ServicesResource all delivered)

## Current Position

Phase: 5 of 6 (Services Package)
Plan: 3 of 3 in current phase (COMPLETE)
Status: Phase 5 complete — ServicesResource wired on HeyLolClient with call<TInput, TOutput>() method, 165 SDK tests pass
Last activity: 2026-03-02 — Plan 05-03 complete (ServicesResource, client.services namespace, 5 new tests, full CI green)

Progress: [█████████░] 83%

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
| Phase 04-api-wrappers P02 | 2min | 2 tasks | 4 files |
| Phase 04-api-wrappers P03 | 6min | 2 tasks | 10 files |
| Phase 05-services-package P01 | 3min | 2 tasks | 10 files |
| Phase 05-services-package P03 | 2min | 1 tasks | 6 files |
| Phase 05-services-package P02 | 3min | 2 tasks | 7 files |

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
- [Phase 04-02]: Local HttpClient interface per resource class avoids circular imports — each resource declares only the HTTP verbs it needs
- [Phase 04-02]: Single create() handles text/media/paywalled post variants via CreatePostParams — no overloads needed
- [Phase 04-02]: ProfileResource.update() covers PROF-03 and PROF-04 — UpdateProfileParams four optional fields handle all update scenarios
- [Phase 04-03]: search() maps params.query to q query param — REST convention, avoids query= which conflicts with some server implementations
- [Phase 04-03]: markRead() body guard: ids && ids.length > 0 ? { ids } : undefined — undefined body means mark-all-read, avoids empty-array ambiguity
- [Phase 04-03]: PaginationParams cast as Record<string, string | number | undefined> for typed get() — structurally matches cursor?: string and limit?: number
- [Phase 04-03]: resources/index.ts excluded from coverage — barrel re-export pattern established for all boundary index files
- [05-01]: Zod devDep at v4 (^4.3.6) with peerDependency ^3.24.0 || ^4.0.0 — installed latest, support both v3+v4 consumers
- [05-01]: create402Response() inlines btoa(JSON.stringify()) rather than importing from @x402/core/http — avoids full module pull for trivial one-liner
- [05-01]: types.ts excluded from coverage via vitest.config.ts — TypeScript interface-only file has no runtime code
- [05-01]: @x402/core externalized in tsup external[] — consumers must provide it, prevents bundling
- [Phase 05-03]: Method-level generics on call<TInput, TOutput>() — single ServicesResource instance handles multiple service I/O types
- [Phase 05-03]: URL pattern /services/{serviceId}/call is provisional — documented as pending validation against hey.lol API docs
- [Phase 05-03]: Scope bounded to hey.lol identity-auth handshake (dummy Solana tx) — external x402 services requiring real USDC out of scope for v1
- [Phase 05-services-package]: Direct fetch to facilitator /verify and /settle — no HTTPFacilitatorClient import; keeps verify/settle modules minimal
- [Phase 05-services-package]: Settlement failure does not fail the response — handler output returned as 200 even if settle fails (best-effort)
- [Phase 05-services-package]: typeof result.isValid === 'boolean' guard in verifyPayment — prevents truthy string bypass

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Zero-amount dummy transaction blockhash convention is LOW confidence — requires integration test against real API
- [Phase 6]: Miniflare v4 API may have changed since training cutoff (Aug 2025) — verify before Cloudflare adapter work

## Session Continuity

Last session: 2026-03-02
Stopped at: Completed 05-03-PLAN.md (ServicesResource with call() method, HeyLolClient wiring, 5 tests, 165 total SDK tests, full CI green)
Resume file: .planning/phases/06-adapters/ (Phase 6 — Cloudflare/Express/Vercel adapters)
