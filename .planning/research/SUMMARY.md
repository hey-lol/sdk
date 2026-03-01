# Project Research Summary

**Project:** @heylol/sdk
**Domain:** Pure JavaScript SDK — Multi-Runtime x402 Payment Auth + Solana Signing + Social API Client
**Researched:** 2026-02-28
**Confidence:** MEDIUM-HIGH (stack HIGH, features MEDIUM, architecture MEDIUM-HIGH, pitfalls HIGH)

## Executive Summary

The hey.lol SDK is a TypeScript monorepo that ships a single npm package (`@heylol/sdk`) with subpath exports for a core client, service utilities, and runtime adapters (Cloudflare Workers, Vercel Edge, Express). The product's central constraint — and its biggest architectural differentiator — is that it must run in edge runtimes that lack Node.js built-ins. This forces a zero-compromise stack built entirely on Web Platform APIs and audited pure-JS crypto (`@noble/curves`, `@noble/hashes`, `@scure/base`). Every stack decision flows from this constraint: no `Buffer`, no `axios`, no `@solana/web3.js` v1, no `node:crypto`. The x402 payment protocol (HTTP 402 challenge-response) is both the authentication mechanism and the monetization primitive — invisible to developers using the SDK, transparent to service providers building on top of it.

The recommended approach is a dependency-layered monorepo built with pnpm workspaces + Turborepo, publishing a single `@heylol/sdk` package with explicit subpath exports (`./services`, `./cloudflare`, `./vercel`, `./express`). The build target is dual CJS + ESM for everything except core — core should be ESM-only to avoid the dual-package hazard. Stripe's SDK design patterns are the closest analogue: constructor injection for auth, resource classes for API surface (`client.posts`, `client.profile`), typed error hierarchy, auto-retry with exponential backoff, and async iterator pagination. The x402 handling must be completely invisible to callers — they provide a keypair and call methods; the 402 retry loop, Solana transaction construction, and payment header encoding are all internal.

The three highest-severity risks that must be addressed before shipping are: (1) edge runtime incompatibility from `Buffer` or `node:crypto` usage, which will silently break Cloudflare Workers deployments — enforce with ESLint and a CI bundle grep from day one; (2) Solana transaction byte layout errors in the zero-amount dummy transaction, which produce well-formed but rejected transactions with opaque errors — validate byte-for-byte against real API responses early; and (3) package.json `exports` misconfiguration breaking TypeScript declaration resolution for subpath imports — run `publint` and `attw` as CI gates, not afterthoughts.

---

## Key Findings

### Recommended Stack

The stack is narrow and intentional. At the core, `@noble/curves@^2.0.1` + `@noble/hashes@^2.0.1` handle all Ed25519 signing and hashing with zero native dependencies and full edge runtime compatibility. `@scure/base@^2.0.0` handles base58/base64/bech32 encoding from the same zero-dep audit family. `@x402/core@^2.5.0` provides x402 protocol types and header parsing helpers without pulling in the 16MB full `x402` package and its viem/wagmi/wallet adapter dependencies. `zod@^4.3.6` handles runtime schema validation and is already required by `@x402/core`.

Tooling is pnpm workspaces (`^10.30.3`) + Turborepo (`^2.8.12`) for task orchestration, `tsup@^8.5.1` for dual CJS/ESM output, `vitest@^4.0.18` for testing, and `@edge-runtime/vm@^5.0.0` for simulating edge runtimes in tests. Package quality gates — `publint@^0.3.17`, `@arethetypeswrong/cli@^0.18.2`, and `size-limit@^12.0.0` — must be CI-enforced from the first publish.

**Core technologies:**
- `@noble/curves@^2.0.1`: Ed25519 signing — the only correct choice for pure-JS crypto in edge environments
- `@noble/hashes@^2.0.1`: SHA-256/SHA-512/HMAC — transitive dep of curves, zero external deps
- `@scure/base@^2.0.0`: Base58/base64/bech32 — preferred over `bs58` (which adds `base-x` dep)
- `@x402/core@^2.5.0`: x402 protocol types and header parsing — 881 KB vs 16 MB for full `x402`
- `zod@^4.3.6`: Runtime schema validation — already required by `@x402/core`
- `pnpm@^10.30.3` + `turbo@^2.8.12`: Workspace management and build orchestration
- `tsup@^8.5.1`: Dual CJS/ESM output, 10-line config, esbuild-powered
- `vitest@^4.0.18` + `@edge-runtime/vm@^5.0.0`: Testing with edge runtime simulation

**What NOT to use:** `@solana/web3.js` v1 (15+ deps, not edge-safe), full `x402` package, `axios`, `Buffer`, `node:crypto`, `dotenv`, `tweetnacl`.

See: `.planning/research/STACK.md`

### Expected Features

The feature dependency graph has a clear root: the x402 auth core cannot be skipped or deferred. Nothing else works without it. API wrappers (`posts`, `profile`, `social`, `discovery`, `notifications`) depend on auth. Service utilities (`verify`, `settle`, `create402Response`) share the same x402 primitives. Runtime adapters (Cloudflare, Vercel, Express) extend the core client and can be added incrementally.

**Must have (table stakes — v1.0):**
- Typed client initialization (`new HeyLol({ keypair })`) — developers expect this pattern
- x402 auth + zero-amount wallet identification — the irreducible auth core; nothing else works without it
- Full TypeScript types — untyped SDK is a different (worse) product
- Typed error hierarchy (`HeyLolError`, `AuthError`, `RateLimitError`, `APIError`) — Stripe's class hierarchy is the gold standard
- Auto-retry with exponential backoff + jitter — table stakes; missing it means production deployments break on first 429
- Posts, Profile, Social, Discovery, Notifications API wrappers — complete social action surface
- Services API + payment utilities (`verify`, `settle`, `createPaymentRequired`) — core value prop for service providers
- README quickstart (5-minute goal, validated cold)

**Should have (competitive — v1.x after core validated):**
- Cloudflare Workers adapter — highest priority for AI agent use case
- Vercel Edge adapter — next-highest for full-stack builders
- Auto-pagination (`for await (const post of sdk.posts.paginate())`) — first user request will come within weeks of launch
- Express adapter — legacy backend integrations
- Example projects (agent posting, service provider, social reader)
- Subpath exports / tree-shaking — critical for edge bundle budgets

**Defer (v2+):**
- Polling helper — app-specific; defer until pattern is clear
- Browser runtime support — security risk (keypair exposure); requires explicit opt-in
- Deno/Bun explicit adapters — Web API compatibility usually covers these
- React/Vue hooks package — separate `@heylol/react` scope if needed

**Anti-features to avoid:** global singleton client (untestable, credential leakage risk), automatic key management/storage (wrong abstraction), WebSocket subscriptions (not in v1 API), built-in caching layer (wrong abstraction — let caller control), SDK-level rate limiting (false confidence in serverless fan-out).

See: `.planning/research/FEATURES.md`

### Architecture Approach

The SDK uses a four-layer architecture: Consumer Code → Adapter Layer (`/cloudflare`, `/vercel`, `/express`) → Services Layer (`/services`) → Core Layer (main `@heylol/sdk`). The monorepo is organized with `packages/core`, `packages/services`, `packages/cloudflare`, `packages/vercel`, and `packages/express`, but publishes as a single `@heylol/sdk` package with explicit subpath exports. This is the correct choice — separate packages for each subpath would force consumers to manage multiple version dependencies and degrade the import ergonomics.

The core architectural patterns are: constructor injection for auth (Stripe model), 402 retry loop internal to `request()` (transparent to callers), resource classes for API surface (`client.posts`, `client.profile` each receiving a bound request function), and platform extension via class inheritance (`CloudflareClient extends HeyLolClient`). The x402 flow is: initial request → 402 response → parse requirements → build/sign zero-amount Solana tx → retry with `X-Payment` header → success. Requirements are cached per-endpoint (60s TTL) to avoid the probe round-trip on repeat calls.

**Major components:**
1. `@heylol/sdk` (core): x402 auth, API client, Ed25519 signing, Solana tx builder, shared types
2. `@heylol/sdk/services`: Service creation, payment verification/settlement, 402 response generation
3. `@heylol/sdk/cloudflare`: CF Workers adapter, env binding support
4. `@heylol/sdk/vercel`: Vercel Edge adapter, Next.js middleware helpers
5. `@heylol/sdk/express`: Express middleware, req/res injection

**Build order (Turborepo enforces this):** core → services → cloudflare + vercel + express (in parallel)

**Critical architecture decision:** A single published package (`@heylol/sdk`) with subpath exports is correct. Do NOT publish separate packages per adapter. Monorepo is for dev organization only.

See: `.planning/research/ARCHITECTURE.md`

### Critical Pitfalls

The pitfalls research identified 10 critical issues. The top 5 with highest business impact:

1. **`Buffer` usage breaking Cloudflare Workers** — `Buffer` is not available in CF Workers. Enforce a ban with ESLint (`no-restricted-globals: ['error', 'Buffer']`) and a CI grep against `dist/`. Replace all uses with `Uint8Array`, `TextEncoder`/`TextDecoder`, `btoa`/`atob`. Also check transitive deps (`bs58` v4 and earlier use Buffer internally — pin v6+). Address in Phase 1 before any implementation.

2. **Solana compact-u16 byte layout errors producing silently invalid transactions** — Solana's compact-u16 varint encoding is non-standard and not prominent in docs. Wrong encoding produces well-formed-looking but validator-rejected transactions. Mitigation: write byte-level unit tests against known fixture transactions; test compact-u16 as an isolated utility. Address in Phase 2 before building higher-level auth flow.

3. **x402 header parsing broken by case sensitivity and v1/v2 format differences** — HTTP headers are case-insensitive but JavaScript `Headers.get()` normalizes to lowercase, while Express `req.headers` uses lowercase too — but plain object bracket notation (`headers['WWW-Authenticate']`) returns `undefined`. Test both x402 v1 and v2 formats with real header fixtures. Address in Phase 2.

4. **Subpath exports `package.json` misconfiguration causing TypeScript resolution failures** — If `"types"` condition is not listed first in exports map, or if paths don't match actual `dist/` output, TypeScript users get "Cannot find module" errors. Run `publint` and `attw` as CI gates. Address in Phase 1.

5. **ESM/CJS dual package hazard with singleton divergence** — Publishing both CJS and ESM for core creates risk of two module instances loading simultaneously. Ship core as ESM-only. Only provide CJS output for the Express adapter where it's actually needed. Address in Phase 1.

Additional high-severity pitfalls (see full PITFALLS.md): bare `crypto` global references breaking Node.js 18 (Phase 1), Ed25519 signature Uint8Array mutation in transaction builder (Phase 2), zero-amount blockhash convention that hey.lol may tighten validation on (Phase 2), x402 retry state machine missing retry cap or cloning the original request (Phase 3), TypeScript declarations missing for conditional exports (Phase 1 + Phase 5).

See: `.planning/research/PITFALLS.md`

---

## Implications for Roadmap

The feature dependency graph is the primary driver of phase order. x402 auth is the root — no other work is meaningful without it. The architecture research confirms that core must build before services, and services before adapters. The pitfalls research maps specific risks to specific phases, which determines where the validation gates must be placed.

### Phase 1: Monorepo Foundation + Package Infrastructure

**Rationale:** Every other phase depends on correct package structure, build tooling, and ESLint rules. Getting this wrong creates compounding costs. The pitfalls research flags 5 critical issues (Buffer ban, ESLint rules, ESM-only core, subpath exports config, `publint`/`attw` CI gates) that must be established before any implementation code is written.
**Delivers:** Working pnpm workspace, Turborepo pipeline, `tsup` dual-output builds, correct `package.json` exports map, CI with `publint` + `attw` + `size-limit`, ESLint rules banning `Buffer` and `globalThis.crypto` direct usage, base TypeScript config.
**Addresses:** Typed client initialization (shell), subpath exports / tree-shaking, project skeleton for all packages.
**Avoids:** Buffer in CF Workers, subpath export misconfiguration, ESM/CJS dual package hazard, TypeScript declaration failures.
**Research flag:** Standard patterns — no additional research needed. Node.js exports docs + Turborepo docs are authoritative.

### Phase 2: Core Crypto and x402 Auth

**Rationale:** This is the technical root of the entire SDK. All API wrappers, all adapters, all service utilities depend on x402 auth working correctly. The pitfalls research identifies 4 critical issues specific to this phase: compact-u16 Solana serialization, x402 header v1/v2 parsing, Ed25519 signature mutation, and zero-amount dummy transaction format. Invest heavily in tests before moving on.
**Delivers:** Ed25519 key pair generation + signing (`@noble/curves`), base58 encode/decode (`@scure/base`), zero-amount Solana dummy transaction builder with byte-level tests, x402 header parser (v1 + v2 formats, real fixtures), `X-Payment` header construction, typed error hierarchy (`HeyLolError`, `AuthError`, `PaymentRejectedError`).
**Uses:** `@noble/curves@^2.0.1`, `@noble/hashes@^2.0.1`, `@scure/base@^2.0.0`, `@x402/core@^2.5.0`.
**Avoids:** Solana compact-u16 layout bugs, x402 header case sensitivity failures, Ed25519 Uint8Array mutation, zero-amount blockhash rejection.
**Research flag:** Needs per-phase research. The zero-amount transaction format and exact x402 payload expected by hey.lol's facilitator are LOW confidence — need to validate against the real API before implementation. Run `gsd:research-phase` on the x402 facilitator integration specifically.

### Phase 3: HeyLolClient + API Resource Wrappers

**Rationale:** With auth proven working, the API client can be built on top. The 402 retry loop, requirements cache, and resource class pattern (Stripe model) all belong here. API wrappers are individually low complexity but collectively table stakes.
**Delivers:** `HeyLolClient` with constructor injection, 402 retry state machine (with retry cap, request cloning, `X402RetryExceededError`), requirements cache (60s TTL), resource classes — `posts`, `profile`, `social`, `discovery`, `notifications` — with typed request/response pairs. Auto-retry with exponential backoff + jitter. Async iterator pagination (`posts.paginate()`).
**Addresses:** All social API features from FEATURES.md must-have list (Posts, Profile, Social, Discovery, Notifications), auto-pagination, auto-retry, JSDoc on every public method.
**Avoids:** x402 retry interceptor errors (no retry cap, request mutation instead of clone), opaque errors (every error has a `code` property).
**Research flag:** Standard patterns for resource classes and retry logic — Stripe SDK is the reference. No additional research needed. Pagination async iterator is well-documented.

### Phase 4: Services Package + Payment Utilities

**Rationale:** Service providers need independent tooling from the API consumer client. `verifyPayment`, `settlePayment`, `create402Response`, and `withPayment` middleware are separate concerns that build on core types but don't depend on `HeyLolClient`.
**Delivers:** `@heylol/sdk/services` — `verifyPayment(request)`, `settlePayment(payment)`, `create402Response({ price, currency, address })`, `withPayment()` middleware wrapper for any fetch handler. Fluent builder for 402 responses. Payment verification helpers with typed `VerifyResult`. `ServiceDefinition` builder.
**Uses:** Core types from Phase 2 (`PaymentPayload`, `X402Requirements`); facilitator fetch calls.
**Avoids:** Raw x402 header construction exposed to consumers, payment transactions cached for reuse (cached signed transactions expire in ~60s on Solana), private key appearing in error messages.
**Research flag:** Standard patterns. No additional research needed — the service verification flow is documented in ARCHITECTURE.md data flow diagrams.

### Phase 5: Runtime Adapters (Cloudflare, Vercel, Express)

**Rationale:** Adapters are thin wrappers (<5 KB each). Cloudflare Workers is highest priority because it's the primary runtime for AI agents, which is the core hey.lol use case. Vercel Edge is second for full-stack app builders. Express is third for legacy Node.js backends.
**Delivers:** `@heylol/sdk/cloudflare` — `CloudflareClient extends HeyLolClient` with env binding support + CF-specific `withPayment()`. `@heylol/sdk/vercel` — `VercelClient` + Next.js middleware helper. `@heylol/sdk/express` — Express `RequestHandler` middleware. Miniflare-based integration tests for CF Workers adapter.
**Avoids:** Private keys stored in Cloudflare KV (not encrypted at rest — document explicitly), `process.env` in CF Workers context (use env bindings pattern), `node:crypto` or `node:buffer` leaking into adapter code through inheritance.
**Research flag:** Miniflare/Wrangler v4 API patterns may need verification. Run `gsd:research-phase` for Cloudflare Workers adapter specifics (Miniflare v4 API, CF Workers compatibility flags, Durable Objects interactions).

### Phase 6: Examples, Documentation, and Release Pipeline

**Rationale:** SDK without examples has no adoption. Documentation must be validated by a developer following the README cold. The release pipeline (changesets, `publint` + `attw` against packed tarball, size-limit) must be proven end-to-end before any public release.
**Delivers:** Three example projects (Cloudflare Worker posting agent, Express service provider, Next.js social reader). README with 5-minute quickstart. `@changesets/cli` publish workflow. Release checklist including `attw --pack .` against packed tarball, CF Workers wrangler dev smoke test, subpath import test in fresh TypeScript project.
**Addresses:** README quickstart, working examples, semantic versioning with changelog.
**Avoids:** TypeScript declaration failures discovered post-publish (catch with `attw` gate), broken examples (worse than none — test against packed tarball not monorepo workspace).
**Research flag:** Standard patterns. `@changesets/cli` docs are authoritative. No additional research needed.

### Phase Ordering Rationale

- Phases 1 → 2 → 3 → 4 are strictly ordered by dependency. Infrastructure before crypto, crypto before client, client before services (services need core types to be stable).
- Phase 5 (adapters) could start in parallel with Phase 4 (services) since adapters depend on Phase 3 core client, not on Phase 4 services. However, sequential ordering reduces coordination cost for a small team.
- Phase 6 (documentation + release) is last because it requires all features to be working. Examples built against broken subpath exports or missing adapters mislead users.
- The pitfalls research maps directly to phase gates: Phase 1 gates are ESLint + build tooling (prevent entire classes of runtime bugs). Phase 2 gates are byte-level crypto tests (prevent silent payment failures). Phase 3 gates are retry state machine tests. Phase 5 gates are Wrangler dev tests.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 2:** x402 facilitator integration — exact payload format hey.lol expects (zero-amount transaction, blockhash convention, v1 vs v2 response format). LOW confidence in ARCHITECTURE.md — must verify against real API before implementing the Solana tx builder.
- **Phase 5:** Cloudflare Workers adapter — Miniflare v4 API, Workers compatibility flags (`nodejs_compat` exact behavior in 2026), Durable Objects and KV integration patterns. MEDIUM confidence — runtime has evolved rapidly.

Phases with well-documented, standard patterns (skip research-phase):
- **Phase 1:** pnpm workspaces + Turborepo + tsup + exports map — all HIGH confidence, stable tooling.
- **Phase 3:** HeyLolClient resource class pattern + retry loop — Stripe SDK is the reference; patterns are well-established.
- **Phase 4:** Services package verification/settlement flow — documented in x402 spec and ARCHITECTURE.md data flow.
- **Phase 6:** Changesets publish workflow + README structure — standard patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version numbers verified against npm registry on 2026-02-28. Rationale from dependency audits and known edge runtime constraints. |
| Features | MEDIUM | Patterns from Stripe, Octokit, Discord.js are mature and stable. x402-specific feature design is novel — limited external precedent. WebSearch was unavailable during research; training data cutoff Aug 2025. |
| Architecture | MEDIUM-HIGH | Package exports config and Turborepo pipeline are HIGH confidence (verified docs). x402 payload format and zero-amount tx convention are MEDIUM-LOW confidence — project-specific, must validate against real API. |
| Pitfalls | HIGH | CF Workers constraints, Node.js 18 crypto globals, Solana compact-u16, dual package hazard — all well-documented, stable behavior through training data cutoff. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

These are the specific unknowns that will surface during implementation and should be validated early:

- **x402 facilitator payload format (LOW confidence):** The exact JSON structure that hey.lol's facilitator expects in the `X-Payment` header, and whether it uses x402 v1 or v2 response format. Verify against actual API responses before writing `src/auth/x402.ts`. If the API has a sandbox or test environment, use it in Phase 2.
- **Zero-amount dummy transaction serialization (LOW confidence):** Whether an all-zeros blockhash is accepted by hey.lol's facilitator, or whether a valid-looking but synthetic blockhash is required. This is a hey.lol-specific convention, not a Solana protocol standard. Test early with a real integration test — mock tests won't catch this.
- **TypeScript `moduleResolution: "bundler"` consumer compatibility (MEDIUM confidence):** Verify that consumers using `moduleResolution: "bundler"` can resolve `@heylol/sdk/services` without additional tsconfig configuration. Also verify `"node16"` compatibility. Run against packed tarball in Phase 1.
- **Miniflare v4 API changes (MEDIUM confidence):** Wrangler v4 bundles Miniflare internally and the API surface may have changed since Aug 2025 training cutoff. Verify before Phase 5 implementation.
- **x402 zero-amount wallet identification as a hey.lol convention:** If hey.lol tightens blockhash validation in a future API update, all SDKs built on this convention break simultaneously. Recommend: build `buildDummyTransaction` as a fully isolated function with a prominent comment referencing the convention, and add an integration test that runs against the real API in CI.

---

## Sources

### Primary (HIGH confidence)
- npm registry — all version numbers for `@noble/curves`, `@noble/hashes`, `@scure/base`, `@x402/core`, `zod`, `pnpm`, `turbo`, `tsup`, `vitest`, etc. verified via `npm info` on 2026-02-28
- Node.js Package Exports documentation — `exports` field syntax, conditional exports, `ERR_PACKAGE_PATH_NOT_EXPORTED` behavior
- Cloudflare Workers runtime documentation — `Buffer` availability, `nodejs_compat` flag, Web Crypto API support
- Node.js v18 release notes — `globalThis.crypto` availability requirements
- Solana transaction binary format specification — compact-u16 encoding, account deduplication ordering rules
- Node.js dual package hazard documentation — `state.js` singleton pattern

### Secondary (MEDIUM confidence)
- Stripe Node.js SDK (training data) — resource class pattern, retry loop, error hierarchy, pagination
- Octokit SDK (training data) — plugin pattern (noted but not recommended), async iterator pagination
- TypeScript `moduleResolution: "bundler"` docs (training data) — subpath export resolution behavior
- x402 protocol specification by Coinbase (training data) — HTTP 402 flow, X-Payment header format, facilitator pattern
- `publint` and `@arethetypeswrong/cli` behavior (training data, community usage through Aug 2025)

### Tertiary (LOW confidence — validate during implementation)
- x402 v1 vs v2 header format differences as applied to hey.lol specifically — verify against real API
- Zero-amount Solana transaction as hey.lol convention — project-specific, no external precedent
- hey.lol facilitator `/verify` and `/settle` endpoint request/response shapes — verify against API docs or existing integration code

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
