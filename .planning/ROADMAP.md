# Roadmap: hey.lol SDK

## Overview

Six phases build the `@heylol/sdk` from the ground up. Foundation establishes the monorepo and package infrastructure that every subsequent phase depends on. Core Crypto and Auth delivers the x402 authentication engine — the irreducible root that nothing else works without. The HTTP Client wraps auth into a callable interface with retry and error handling. API Wrappers expose the full hey.lol social surface (posts, profiles, social graph, discovery, notifications). Services Package gives service providers the tools to accept x402 payments. Adapters, Docs, and Release ships runtime adapters for Cloudflare Workers, Vercel Edge, and Express, complete examples, and validates the end-to-end publish pipeline.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Monorepo, build tooling, CI gates, and ESLint rules that guard every subsequent phase (completed 2026-03-01)
- [x] **Phase 2: Core Crypto and Auth** - Pure-JS Ed25519 signing, Solana tx builder, x402 challenge-response, and typed error hierarchy (completed 2026-03-01)
- [x] **Phase 3: HTTP Client** - HeyLolClient with 402 retry loop, auto-retry backoff, and typed error surface (completed 2026-03-01)
- [x] **Phase 4: API Wrappers** - Full social API surface: posts, profiles, social graph, discovery, and notifications (completed 2026-03-01)
- [x] **Phase 5: Services Package** - x402 service creation, payment verification, settlement, and 402 response generation (completed 2026-03-02)
- [ ] **Phase 6: Adapters, Docs, and Release** - Runtime adapters, example projects, quickstart documentation, and publish pipeline

## Phase Details

### Phase 1: Foundation
**Goal**: A developer can clone the repo, run one command, and get a passing build with CI-enforced safety nets that prevent the entire class of runtime bugs identified in research
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07
**Success Criteria** (what must be TRUE):
  1. `pnpm install && pnpm build` succeeds from a clean checkout with ESM output and `.d.ts` files emitted for all packages
  2. `pnpm lint` fails if any file in the core package imports `Buffer`, `process`, or Node.js `crypto`
  3. `pnpm --filter @heylol/sdk publish --dry-run` passes `publint` and `attw` checks with zero errors on all subpath exports
  4. `size-limit` check fails if core bundle exceeds 100 KB minified
  5. Changesets `pnpm changeset` creates a versioned changelog entry without errors
**Plans:** 3/3 plans complete
Plans:
- [ ] 01-01-PLAN.md — Monorepo scaffold: pnpm workspaces, Turborepo, Biome, and 5 package stubs
- [ ] 01-02-PLAN.md — Build tooling: tsup configs, exports maps, ESLint Node.js import restrictions
- [ ] 01-03-PLAN.md — CI gates: publint, attw, size-limit, changesets, GitHub Actions, husky

### Phase 2: Core Crypto and Auth
**Goal**: A developer can provide a base58 private key and the SDK will authenticate any request via x402 challenge-response using pure-JS crypto with zero Node.js built-ins
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, TYPE-03
**Success Criteria** (what must be TRUE):
  1. Developer initializes the client with a base58 private key and no crypto knowledge required
  2. SDK correctly parses both x402 v1 and v2 response formats from real API fixtures without case sensitivity errors
  3. SDK builds a valid zero-amount Solana dummy transaction and signs it with Ed25519 — byte-level tests pass against known fixture transactions
  4. SDK constructs a valid `X-Payment` header that hey.lol's facilitator accepts
  5. Thrown errors are typed discriminated unions (AuthError, PaymentRejectedError) with a `code` property on every error
**Plans:** 4/4 plans complete
Plans:
- [ ] 02-01-PLAN.md — Error hierarchy (TYPE-03) and keypair loading (AUTH-01, AUTH-06)
- [ ] 02-02-PLAN.md — Solana compact-u16 encoding and zero-amount dummy transaction builder (AUTH-03, AUTH-06)
- [ ] 02-03-PLAN.md — x402 v1/v2 response parser and payment header constructor (AUTH-02, AUTH-04, AUTH-05)
- [ ] 02-04-PLAN.md — Integration wiring: barrel exports, runtime deps, and full CI pipeline validation

### Phase 3: HTTP Client
**Goal**: Developers can make API calls that automatically handle authentication, retry transient failures, and return typed domain objects — with no visibility into the underlying 402 handshake
**Depends on**: Phase 2
**Requirements**: CLT-01, CLT-02, CLT-03, CLT-04, CLT-05
**Success Criteria** (what must be TRUE):
  1. A single client instance makes authenticated API calls in Node.js 18+, Cloudflare Workers, Vercel Edge, and browsers without modification
  2. A 429 or 503 response triggers automatic retry with exponential backoff and jitter; a permanent error throws a typed HeyLolError subclass
  3. API method return values are typed domain objects (Post, Profile, User), not raw Response or JSON
  4. Client accepts constructor options for retries, timeout, and network without requiring them
**Plans:** 2/2 plans complete
Plans:
- [ ] 03-01-PLAN.md — Error hierarchy extension (RateLimitError, APIError), retry utility, ClientOptions, domain type stubs
- [ ] 03-02-PLAN.md — HeyLolClient class with 402 loop, typed HTTP methods, barrel exports, CI validation

### Phase 4: API Wrappers
**Goal**: Developers have a complete, typed API surface for all hey.lol social actions — creating posts, managing profiles, following users, searching, and reading notifications
**Depends on**: Phase 3
**Requirements**: POST-01, POST-02, POST-03, POST-04, POST-05, POST-06, POST-07, PROF-01, PROF-02, PROF-03, PROF-04, SOCL-01, SOCL-02, SOCL-03, SOCL-04, DISC-01, DISC-02, DISC-03, NOTF-01, NOTF-02, TYPE-01, TYPE-02
**Success Criteria** (what must be TRUE):
  1. Developer creates a text post, a media post, a reply, a paywalled post with teaser, likes/unlikes a post, and deletes a post — all via `client.posts.*` with typed parameters
  2. Developer reads own and other users' profiles, updates profile fields, and sets avatar/banner URLs via `client.profile.*`
  3. Developer follows and unfollows users and lists followers and following via `client.social.*`
  4. Developer searches users and posts, retrieves trending posts, and gets suggested users via `client.discovery.*`
  5. Developer lists and marks notifications as read via `client.notifications.*`, and all IDs (PostId, UserId) are branded types that TypeScript rejects when mixed
**Plans:** 3/3 plans complete
Plans:
- [ ] 04-01-PLAN.md — Branded ID types, expanded domain interfaces, request params, HeyLolClient 204 guard and query params
- [ ] 04-02-PLAN.md — PostsResource and ProfileResource with full test coverage
- [ ] 04-03-PLAN.md — SocialResource, DiscoveryResource, NotificationsResource, HeyLolClient wiring, barrel exports

### Phase 5: Services Package
**Goal**: Service providers can accept x402 payments by verifying incoming payment headers, settling on-chain, and generating 402 Payment Required responses — all without handling raw x402 protocol details
**Depends on**: Phase 2
**Requirements**: SVC-01, SVC-02, SVC-03, SVC-04, SVC-05, SVC-06
**Success Criteria** (what must be TRUE):
  1. Developer calls an x402 service via `client.services.call()` with typed input/output
  2. Developer registers a service with a price, currency, and schema via `sdk.services.register()`
  3. Developer verifies an incoming `X-Payment` header and receives a typed `VerifyResult` — valid or rejected with reason
  4. Developer settles a verified payment on-chain via `sdk.services.settle()`
  5. Developer generates a `402 Payment Required` response and wraps a handler with `createX402Service()` that bundles verify, settle, and handler dispatch
**Plans:** 3/3 plans complete
Plans:
- [ ] 05-01-PLAN.md — Types, service registration (registerService), and 402 response generation (create402Response)
- [ ] 05-02-PLAN.md — Payment verification (verifyPayment), settlement (settlePayment), and service handler wrapper (createX402Service)
- [ ] 05-03-PLAN.md — ServicesResource on HeyLolClient (client.services.call) and SDK wiring

### Phase 6: Adapters, Docs, and Release
**Goal**: Developers on Cloudflare Workers, Vercel Edge, and Express can integrate the SDK with platform-native patterns, and any developer can go from npm install to first API call in under 5 minutes by following the README
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: ADPT-01, ADPT-02, ADPT-03, DOCS-01, DOCS-02, DOCS-03, DOCS-04, TYPE-04
**Success Criteria** (what must be TRUE):
  1. A Cloudflare Worker using `CloudflareClient` with env binding support builds and deploys via `wrangler dev` without errors
  2. A Vercel Edge function using `VercelClient` and the Next.js middleware helper compiles without TypeScript errors
  3. An Express app using the Express `RequestHandler` middleware processes authenticated requests end-to-end
  4. A developer unfamiliar with the project follows the README quickstart and completes a first post in under 5 minutes
  5. All public methods have JSDoc with examples, and `pnpm publish --dry-run` against a packed tarball passes `attw --pack .` with zero TypeScript declaration errors

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | Complete    | 2026-03-01 |
| 2. Core Crypto and Auth | 3/4 | Complete    | 2026-03-01 |
| 3. HTTP Client | 2/2 | Complete   | 2026-03-01 |
| 4. API Wrappers | 2/3 | Complete    | 2026-03-01 |
| 5. Services Package | 2/3 | Complete    | 2026-03-02 |
| 6. Adapters, Docs, and Release | 0/TBD | Not started | - |
