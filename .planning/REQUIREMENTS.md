# Requirements: hey.lol SDK

**Defined:** 2026-02-28
**Core Value:** Developers can go from npm install to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Monorepo configured with pnpm workspaces and turborepo
- [x] **INFRA-02**: tsup builds produce ESM output with TypeScript declarations for all packages
- [x] **INFRA-03**: ESLint rules ban Buffer, process, and Node.js crypto imports in core package
- [x] **INFRA-04**: Package.json exports map configured with correct types/import/require conditions
- [x] **INFRA-05**: publint and attw validate package exports in CI
- [x] **INFRA-06**: size-limit enforces < 100 KB core bundle
- [x] **INFRA-07**: Changesets configured for semantic versioning and changelog generation

### Auth

- [x] **AUTH-01**: Developer can initialize client with a Solana private key (base58)
- [x] **AUTH-02**: SDK automatically handles x402 challenge-response authentication on every API call
- [x] **AUTH-03**: SDK builds zero-amount dummy Solana transaction for wallet identification
- [x] **AUTH-04**: SDK parses both x402 v1 and v2 response formats
- [x] **AUTH-05**: SDK constructs valid X-Payment headers from x402 requirements
- [x] **AUTH-06**: All crypto operations use pure JS (@noble/curves, @scure/base) with zero Node.js built-ins

### Client

- [x] **CLT-01**: Fetch-based HTTP client works in Node.js, Cloudflare Workers, Vercel Edge, and browsers
- [x] **CLT-02**: Auto-retry with exponential backoff and jitter on transient failures (429, 503)
- [x] **CLT-03**: Typed error hierarchy (HeyLolError, AuthError, RateLimitError, APIError, NetworkError)
- [x] **CLT-04**: Methods return domain objects (Post, Profile, User), not raw HTTP responses
- [x] **CLT-05**: Client accepts configurable options (retries, timeout, network)

### Posts

- [x] **POST-01**: Developer can create a text post
- [x] **POST-02**: Developer can create a post with media (images, video, GIF)
- [x] **POST-03**: Developer can get a post by ID
- [x] **POST-04**: Developer can delete own post
- [x] **POST-05**: Developer can like/unlike a post
- [x] **POST-06**: Developer can reply to a post
- [x] **POST-07**: Developer can create a paywalled post with teaser

### Profile

- [x] **PROF-01**: Developer can get own profile
- [x] **PROF-02**: Developer can get another user's profile
- [x] **PROF-03**: Developer can update profile fields
- [x] **PROF-04**: Developer can set avatar and banner URLs

### Social

- [x] **SOCL-01**: Developer can follow a user
- [x] **SOCL-02**: Developer can unfollow a user
- [x] **SOCL-03**: Developer can list followers of a user
- [x] **SOCL-04**: Developer can list users a user is following

### Discovery

- [x] **DISC-01**: Developer can search for users and posts
- [x] **DISC-02**: Developer can get trending posts
- [x] **DISC-03**: Developer can get suggested users

### Notifications

- [x] **NOTF-01**: Developer can list notifications
- [x] **NOTF-02**: Developer can mark notifications as read

### Services & Payments

- [ ] **SVC-01**: Developer can call an x402 service with typed input/output
- [ ] **SVC-02**: Developer can register a service with price and schema
- [ ] **SVC-03**: Developer can verify incoming x402 payment headers
- [ ] **SVC-04**: Developer can settle payments on-chain
- [ ] **SVC-05**: Developer can generate 402 Payment Required responses
- [ ] **SVC-06**: Service handler wrapper (createX402Service) bundles verify + settle + handler

### Types

- [x] **TYPE-01**: Full TypeScript types for all API methods, request params, and response objects
- [x] **TYPE-02**: Branded types for IDs (PostId, UserId) to prevent mixing
- [x] **TYPE-03**: Discriminated union error types
- [ ] **TYPE-04**: JSDoc comments with examples on all public methods

### Adapters

- [ ] **ADPT-01**: Cloudflare Workers adapter with env binding support
- [ ] **ADPT-02**: Vercel Edge adapter with edge config helpers
- [ ] **ADPT-03**: Express middleware with request/response integration

### Documentation

- [ ] **DOCS-01**: README with 5-minute quickstart (install, init, first post)
- [ ] **DOCS-02**: Example project: AI agent bot (Cloudflare Worker)
- [ ] **DOCS-03**: Example project: x402 service provider
- [ ] **DOCS-04**: Example project: web dashboard (Next.js)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Pagination

- **PAG-01**: Auto-pagination via async iterators (for await...of)
- **PAG-02**: Cursor-based pagination helpers for list endpoints

### Observability

- **OBS-01**: Rate limit header exposure on responses
- **OBS-02**: Request/response hooks for logging and telemetry

### Extended Runtime

- **EXT-01**: Official Deno runtime support
- **EXT-02**: Official Bun runtime support
- **EXT-03**: Browser runtime support with keypair safety warnings

### Framework Integration

- **FRM-01**: React hooks package (@heylol/react)
- **FRM-02**: Vue composables package

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time WebSocket support | Not in hey.lol API; adds complexity without current value |
| Global singleton client | Untestable, breaks multi-tenant, causes credential leakage in serverless |
| Built-in caching layer | SDK doesn't know caching infrastructure; causes stale data bugs |
| Automatic key management/storage | SDK can't assume execution environment; provide utilities instead |
| Deep Solana wallet integration | Adds heavy deps that break edge runtimes; contradicts core constraint |
| Bulk/batch operation abstractions | hey.lol API doesn't expose batch endpoints; fake batch misleads on throughput |
| SDK-level rate limit enforcement | Can't track state across concurrent instances; gives false confidence |
| Mobile SDKs (React Native, Flutter) | Web-first; evaluate after v1 adoption |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| INFRA-06 | Phase 1 | Complete |
| INFRA-07 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| TYPE-03 | Phase 2 | Complete |
| CLT-01 | Phase 3 | Complete |
| CLT-02 | Phase 3 | Complete |
| CLT-03 | Phase 3 | Complete |
| CLT-04 | Phase 3 | Complete |
| CLT-05 | Phase 3 | Complete |
| POST-01 | Phase 4 | Complete |
| POST-02 | Phase 4 | Complete |
| POST-03 | Phase 4 | Complete |
| POST-04 | Phase 4 | Complete |
| POST-05 | Phase 4 | Complete |
| POST-06 | Phase 4 | Complete |
| POST-07 | Phase 4 | Complete |
| PROF-01 | Phase 4 | Complete |
| PROF-02 | Phase 4 | Complete |
| PROF-03 | Phase 4 | Complete |
| PROF-04 | Phase 4 | Complete |
| SOCL-01 | Phase 4 | Complete |
| SOCL-02 | Phase 4 | Complete |
| SOCL-03 | Phase 4 | Complete |
| SOCL-04 | Phase 4 | Complete |
| DISC-01 | Phase 4 | Complete |
| DISC-02 | Phase 4 | Complete |
| DISC-03 | Phase 4 | Complete |
| NOTF-01 | Phase 4 | Complete |
| NOTF-02 | Phase 4 | Complete |
| TYPE-01 | Phase 4 | Complete |
| TYPE-02 | Phase 4 | Complete |
| SVC-01 | Phase 5 | Pending |
| SVC-02 | Phase 5 | Pending |
| SVC-03 | Phase 5 | Pending |
| SVC-04 | Phase 5 | Pending |
| SVC-05 | Phase 5 | Pending |
| SVC-06 | Phase 5 | Pending |
| ADPT-01 | Phase 6 | Pending |
| ADPT-02 | Phase 6 | Pending |
| ADPT-03 | Phase 6 | Pending |
| DOCS-01 | Phase 6 | Pending |
| DOCS-02 | Phase 6 | Pending |
| DOCS-03 | Phase 6 | Pending |
| DOCS-04 | Phase 6 | Pending |
| TYPE-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 55
- Unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after roadmap creation — all 55 requirements mapped*
