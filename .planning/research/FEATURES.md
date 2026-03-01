# Feature Research

**Domain:** Developer SDK for social/API platform with payment integration
**Researched:** 2026-02-28
**Confidence:** MEDIUM — Web tools unavailable; findings based on training data (cutoff Aug 2025) covering well-documented, mature SDK ecosystems (Stripe, Discord.js, Octokit, Twilio). Core SDK design patterns are stable and unlikely to have changed significantly.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features developers assume exist. Missing these = SDK feels broken or amateur.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Typed client initialization** | Every modern SDK starts with `new Client({ apiKey })` or similar single-call setup | LOW | Stripe, Octokit, Discord.js all use this. Options object pattern beats positional args. |
| **Full TypeScript types** | Developers expect IntelliSense for every method and response shape — untyped SDK = hostile DX | MEDIUM | Types must be generated from actual API responses, not hand-rolled. Zod or similar can generate both types and validators. Branded types for IDs (PostId, UserId) prevent mixing. |
| **Auto-retry on transient errors** | Stripe retries on 429/503 automatically. Developers learn to expect this. | LOW | Exponential backoff, configurable max retries, jitter. Without it, developers add their own brittle retry loops. |
| **Idiomatic error handling** | Typed error classes with `.code`, `.message`, `.statusCode` — not raw HTTP responses | LOW | Stripe's `StripeError` hierarchy is the gold standard. Every SDK that ships raw errors gets bad reviews. |
| **Structured error hierarchy** | Different error types for auth failures, rate limits, API errors, network errors | MEDIUM | AuthError, RateLimitError, APIError, NetworkError. Developers use `instanceof` checks in catch blocks. |
| **Method-level JSDoc** | Hovering a method in editor shows params, return type, and a one-line description | LOW | Generated from OpenAPI spec if possible. At minimum, hand-document every public method. |
| **Per-method request/response types** | `sdk.posts.create(params: CreatePostParams): Promise<Post>` — not `any` | MEDIUM | Input types validated at compile time. Prevents class of bugs at zero runtime cost. |
| **Pagination support** | Social APIs return lists — developers expect cursor-based iteration to just work | MEDIUM | Octokit's `paginate()` and Stripe's `autoPagingEach()` / `autoPagingToArray()` are canonical patterns. |
| **Runtime environment safety** | SDK that crashes in Cloudflare Workers or Vercel Edge on `import` is a blocker | HIGH | This is the core constraint for hey.lol. No `process`, no `Buffer`, no `crypto.createHash`, no `fs`. Must use Web APIs exclusively in core. |
| **Clear README with 5-minute quickstart** | Developers evaluate SDKs in under 3 minutes by scanning the README. Missing quickstart = abandoned. | LOW | Code block showing install, init, first call, and expected output. Stripe's README is 200 lines and complete. |
| **Working examples** | At least one runnable example per major API group | LOW | `/examples` directory with Node.js and edge examples. Broken examples are worse than none. |
| **Semantic versioning with changelog** | Developers need to know what changed between versions before upgrading | LOW | CHANGELOG.md in Keep A Changelog format. Semver strictly. No breaking changes in minors. |

### Differentiators (Competitive Advantage)

Features that set this SDK apart from generic REST wrappers or hand-rolled fetch calls.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **x402 auth handled invisibly** | Developer provides a keypair; SDK handles all 402 challenge-response negotiation transparently | HIGH | This is the single biggest DX win. Without it, every developer must read the x402 spec. With it, the spec is irrelevant to them. Stripe's auth is similarly invisible. |
| **Zero-amount wallet identification built in** | Dummy transaction creation for wallet identity is an undocumented edge case — SDK abstracts it entirely | HIGH | Without this, developers hit a wall the first time they need wallet-only auth. Rate of abandonment at this step would be high. |
| **Runtime adapter pattern** | `import sdk from '@heylol/sdk/cloudflare'` vs `import sdk from '@heylol/sdk/node'` — one line swap | MEDIUM | Octokit does this well with `@octokit/core` plus environment-specific plugins. Gives developers a clear answer to "does this work in X?" without reading source code. |
| **Auto-pagination as first-class** | `for await (const post of sdk.posts.paginate({ userId }))` — cursor management invisible to caller | MEDIUM | Stripe's `autoPagingEach` is the gold standard. Twitter SDK's manual pagination is a frequent complaint. Differentiates from raw fetch-based wrappers. |
| **Service creation utilities** | `sdk.services.register()` and `sdk.services.call()` with built-in x402 payment verification | HIGH | This turns hey.lol from a social platform SDK into an agent monetization SDK. The 402-response generation utilities are table stakes for service providers but differentiating vs. generic social SDKs. |
| **Payment verification helpers** | `sdk.payments.verify(headers)` returns typed result with amount, currency, payer — not raw headers | MEDIUM | Service providers need this. Raw x402 header parsing is error-prone. A typed verifier with a clear interface prevents entire categories of bugs. |
| **Subpath exports for tree-shaking** | `@heylol/sdk/services`, `@heylol/sdk/payments` — unused modules never enter the bundle | LOW | Critical for edge runtimes with bundle size limits. Discord.js bundles everything; developers complain. Stripe's Node SDK doesn't need this because server-only. |
| **Fluent builder for 402 responses** | `new PaymentRequired().amount(0.01).currency('USDC').build()` vs raw header construction | MEDIUM | Service providers generating 402 responses will use this constantly. Builder pattern (like Stripe's `PaymentIntent.create`) is more discoverable than raw object construction. |
| **Readable validation errors** | When a method receives bad input, the error message says exactly what's wrong and how to fix it | MEDIUM | `sdk.posts.create({ content: '' })` should throw `ValidationError: content must be at least 1 character`. Zod provides this for free if used internally. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like good ideas but create maintenance burden, breakage, or wrong abstractions.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Global singleton / ambient client** | Convenience — `import { sdk } from '@heylol/sdk'` without init | Untestable, breaks multi-tenant usage, causes credential leakage in serverless (warm reuse), impossible to mock in tests | Explicit instantiation: `const sdk = new HeyLol({ keypair })`. Provide a factory helper if ergonomics matter. |
| **Automatic key management / storage** | Developers don't want to manage keypairs | SDK doesn't know the execution environment (env vars, KV store, secrets manager). Baking in key storage means baking in assumptions. | Provide `loadKeypairFromEnv()` and `loadKeypairFromBase58()` utility functions — composable, not mandatory. |
| **WebSocket / real-time subscriptions** | Social platforms suggest push updates | Not in hey.lol API v1. Adding a half-implemented real-time layer wastes scope and ships broken. WebSocket management in edge runtimes is non-trivial. | Polling helpers: `sdk.notifications.poll({ interval: 5000 })` for v1. Flag for v2 when API supports it. |
| **Caching layer built into SDK** | Performance — avoid redundant API calls | SDK doesn't know the caching infrastructure (Redis, KV, in-memory). Built-in cache causes stale data bugs that are hard to debug. | Document HTTP cache headers on responses. Let developers plug in their own cache. Provide cache-key generators as utilities if needed. |
| **Bulk/batch operation abstractions** | Efficiency — group multiple API calls | Premature abstraction. hey.lol API doesn't expose batch endpoints. A fake batch that's really serial loops misleads developers about actual throughput. | Document `Promise.all()` patterns for parallel calls. Add batch when API supports it natively. |
| **SDK-level rate limit enforcement** | Prevent hitting API rate limits | SDK doesn't know the actual rate limit state across concurrent instances (lambda fan-out). Local rate limiters give false confidence. | Expose rate limit headers from responses (`response.rateLimit.remaining`). Let developers implement the right strategy for their infrastructure. |
| **Automatic response caching with stale-while-revalidate** | Better performance for reads | Response freshness semantics vary per endpoint. Profile data can be cached differently from notifications. Universal caching policy is wrong for most callers. | Per-method `maxAge` option that sets `Cache-Control` on the outgoing request. Let the edge/CDN layer handle actual caching. |
| **Deep Solana wallet integration** | Convenience for Solana-native developers | Adds heavy Solana dependencies that break edge runtimes — directly contradicts the core constraint. SDK must stay pure JS. | Keep `@noble/curves` for signing only. Document that wallet management is the caller's responsibility. Provide a clear interface (`KeypairLike`) that any wallet adapter can implement. |

---

## Feature Dependencies

```
[x402 Auth Core]
    └──requires──> [Pure JS Ed25519 signing (@noble/curves)]
    └──requires──> [Zero-amount transaction builder]
    └──requires──> [x402 v1 + v2 response format parsers]

[API Wrappers (posts, profile, social, discovery, notifications)]
    └──requires──> [x402 Auth Core]
    └──requires──> [HTTP client abstraction (fetch-based)]
    └──requires──> [Typed error hierarchy]

[Auto-pagination]
    └──requires──> [API Wrappers]
    └──requires──> [Cursor-based response types]

[Service Utilities (register, call, verify, settle)]
    └──requires──> [x402 Auth Core]
    └──requires──> [Payment verification types]
    └──enhances──> [API Wrappers]

[Runtime Adapters (Cloudflare, Vercel, Express)]
    └──requires──> [HTTP client abstraction]
    └──enhances──> [x402 Auth Core] (provide environment fetch)

[TypeScript Types]
    └──underpins──> [All API Wrappers]
    └──underpins──> [Service Utilities]
    └──underpins──> [Error hierarchy]

[Subpath Exports / Tree-shaking]
    └──requires──> [Monorepo package structure]
    └──enhances──> [Runtime Adapters]

[Documentation + Examples]
    └──requires──> [All of the above working]
```

### Dependency Notes

- **x402 Auth Core requires Pure JS crypto:** The entire SDK collapses if this doesn't work in edge runtimes. Must be validated first, before any API wrappers.
- **API Wrappers require Auth Core:** No point building post/profile wrappers until auth is proven working.
- **Service Utilities require Auth Core:** Payment verification uses same x402 primitives as auth.
- **Runtime Adapters enhance, don't block:** Adapters can be added incrementally after core works in Node.js. Cloudflare Workers is highest priority due to AI agent use case.
- **Auto-pagination requires cursor-aware types:** Response types must carry `cursor` or `nextPage` fields, so pagination needs to be designed into the type layer upfront, not bolted on.
- **Subpath exports require monorepo structure:** This needs to be the repo structure from day one. Retrofitting hurts.

---

## MVP Definition

### Launch With (v1.0)

Minimum viable product — what's needed for developers to integrate with hey.lol today.

- [ ] **x402 auth + zero-amount wallet ID** — The irreducible core. Nothing else works without it.
- [ ] **Posts API** (`create`, `get`, `delete`, `like`, `unlike`, `reply`) — The primary social action surface. What most early agents will use.
- [ ] **Profile API** (`get`, `update`, `setAvatar`, `setBanner`) — Required for any agent that needs an identity.
- [ ] **Social API** (`follow`, `unfollow`, `getFollowers`, `getFollowing`) — Required for social graph navigation.
- [ ] **Discovery API** (`search`, `trending`, `suggestions`) — Required for agents to find content and users.
- [ ] **Notifications API** (`list`, `markRead`) — Required to build reactive agents.
- [ ] **Services API** (`call`, `register`) — The x402 payment layer. Core value prop for service providers.
- [ ] **Payment utilities** (`verify`, `settle`, `createPaymentRequired`) — Without these, service providers can't build monetized endpoints.
- [ ] **Full TypeScript types** for all of the above — Non-negotiable. Typed SDK vs untyped = entirely different product.
- [ ] **Node.js 18+ runtime support** — Baseline. All developers have this.
- [ ] **Typed error hierarchy** — SDK without typed errors generates bad developer reviews.
- [ ] **Auto-retry with exponential backoff** — Table stakes. Missing this means every production deployment breaks on first 429.
- [ ] **README quickstart** — 5-minute goal. Must be validated against a real developer following the steps cold.

### Add After Validation (v1.x)

Features to add once core API wrappers are confirmed working.

- [ ] **Cloudflare Workers adapter** — Highest priority after launch. Primary runtime for AI agents.
- [ ] **Vercel Edge adapter** — Next-highest. Full-stack app builders on Vercel.
- [ ] **Auto-pagination** (`posts.paginate()`, `notifications.paginate()`) — Add when first user asks "how do I get all posts?" which will happen within weeks.
- [ ] **Express adapter** — For legacy backend integrations. Lower priority than edge adapters.
- [ ] **Example projects** — At least one per major use case: agent posting, service provider, social reader.
- [ ] **Zod-powered input validation** (optional peer dep) — Add when developers start reporting confusing error messages on bad input.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Polling helper** (`notifications.poll()`) — Useful, but polling strategy is app-specific. Defer until pattern is clear.
- [ ] **Rate limit header exposure** — Useful but secondary. Add when rate limit issues surface in user feedback.
- [ ] **Deno / Bun official support** — Market size doesn't justify explicit adapter in v1. Web APIs compatibility usually makes these work anyway.
- [ ] **Browser runtime support** — Security risk (keypair exposure in client code). Requires explicit opt-in and warnings. Defer.
- [ ] **React / Vue hooks** (`useProfile()`, `usePosts()`) — Framework-specific. Out of SDK scope. May warrant separate `@heylol/react` package.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| x402 auth core | HIGH | HIGH | P1 |
| Zero-amount wallet ID | HIGH | HIGH | P1 |
| Posts API wrappers | HIGH | LOW | P1 |
| Profile API wrappers | HIGH | LOW | P1 |
| Full TypeScript types | HIGH | MEDIUM | P1 |
| Typed error hierarchy | HIGH | LOW | P1 |
| Social API wrappers | HIGH | LOW | P1 |
| Discovery API wrappers | MEDIUM | LOW | P1 |
| Notifications API wrappers | MEDIUM | LOW | P1 |
| Services API + payment utilities | HIGH | MEDIUM | P1 |
| Auto-retry + backoff | HIGH | LOW | P1 |
| README quickstart | HIGH | LOW | P1 |
| Cloudflare Workers adapter | HIGH | MEDIUM | P2 |
| Vercel Edge adapter | HIGH | MEDIUM | P2 |
| Auto-pagination | MEDIUM | MEDIUM | P2 |
| Express adapter | MEDIUM | LOW | P2 |
| Example projects | HIGH | LOW | P2 |
| Subpath exports / tree-shaking | MEDIUM | LOW | P2 |
| Zod input validation | MEDIUM | LOW | P2 |
| Polling helper | LOW | MEDIUM | P3 |
| Rate limit header exposure | LOW | LOW | P3 |
| Deno/Bun explicit support | LOW | LOW | P3 |
| Browser runtime support | LOW | HIGH | P3 |
| React/Vue hooks package | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.0 launch
- P2: Should have; add in v1.x after core validated
- P3: Nice to have; future consideration

---

## Competitor Feature Analysis

SDK patterns from Stripe, Discord.js, Octokit, and Twilio inform what developers expect.

| Feature | Stripe SDK | Discord.js | Octokit | Our Approach |
|---------|------------|------------|---------|--------------|
| **Initialization** | `new Stripe(key, opts)` | `new Client({ intents })` | `new Octokit({ auth })` | `new HeyLol({ keypair, network? })` — keypair is the auth primitive |
| **Error handling** | Typed class hierarchy (`StripeError`, `RateLimitError`) | Event-based errors | Typed `RequestError` | Class hierarchy: `HeyLolError`, `AuthError`, `RateLimitError`, `APIError` |
| **Pagination** | `autoPagingEach()`, `autoPagingToArray()` | Manual with `fetchMore()` | `paginate()` async iterator | Async iterator: `for await (const post of sdk.posts.paginate())` |
| **TypeScript** | Full types, separate `@types/stripe` historically; now bundled | Full types bundled | Full types bundled | Full types bundled from day one; no separate `@types` package |
| **Retry logic** | Built-in, configurable `maxNetworkRetries` | Not built-in | Not built-in | Built-in, configurable, with jitter |
| **Runtime support** | Node.js only (server SDK) | Node.js | Node.js + browser (`@octokit/core` works in browser) | All runtimes via adapter pattern |
| **Auth abstraction** | API key in header | Bot token in header | PAT or OAuth token | x402 challenge-response, fully invisible to caller |
| **Tree-shaking** | Not applicable (server-only) | Not applicable | Modular (`@octokit/rest`, `@octokit/graphql` separate) | Subpath exports: `@heylol/sdk/services`, `@heylol/sdk/cloudflare` |
| **Idempotency** | `idempotencyKey` option per request | N/A | N/A | Document idempotency; expose request ID from headers |
| **Webhook / event handling** | `stripe.webhooks.constructEvent()` | Event emitter pattern | `webhooks` plugin | Not in v1 scope; document polling alternative |

---

## SDK-Specific Quality Signals

Patterns from successful SDKs that developers notice and cite as reasons to trust a library:

**Initialization ergonomics (HIGH signal):**
- Single options object, not positional args
- Sensible defaults so `new HeyLol({ keypair })` works without additional config
- TypeScript narrows the options type so unknown keys are errors at compile time

**Error messages that tell you what to do (HIGH signal):**
- Bad: `Error: 400`
- Good: `AuthError: Keypair rejected by x402 challenge. Verify your keypair is correct and has sufficient USDC balance.`
- Stripe and Twilio do this well. Most SDKs don't.

**Methods return what you need, not raw HTTP (HIGH signal):**
- `sdk.posts.create()` returns a `Post` object, not `{ status: 200, body: { data: { post: {...} } } }`
- Unwrap the API's envelope internally; surface the domain object directly

**Consistent method signatures across API groups (MEDIUM signal):**
- `sdk.posts.get(id)`, `sdk.profile.get(userId)`, `sdk.notifications.list()` — same `get`/`list`/`create`/`delete` verbs everywhere
- Developers learn the pattern once and can guess unfamiliar method names

**Zero breaking changes in patch/minor versions (HIGH signal):**
- Semver violation = trust destruction
- Deprecation warnings before removal
- Add, don't change, in minors

**Bundle size transparency (MEDIUM signal for edge use):**
- Document the exact minified + gzipped size of each subpackage
- Edge developers care about this deeply; it's a frequent CI gate

---

## Sources

- **Stripe Node.js SDK** — Training data: Stripe's SDK design, retry logic, error hierarchy, pagination patterns (stripe-node GitHub, Stripe docs). HIGH confidence — stable, mature API.
- **Discord.js** — Training data: discord.js GitHub README, documentation. MEDIUM confidence — patterns stable but versions evolve.
- **Octokit.js** — Training data: octokit/octokit.js README, plugin architecture, pagination plugin. HIGH confidence — well-documented, widely cited patterns.
- **Twilio SDK** — Training data: twilio-node SDK design patterns. MEDIUM confidence.
- **Note:** WebSearch and WebFetch were unavailable during this research session. All findings rely on training data (cutoff Aug 2025). SDK design patterns covered here (Stripe, Octokit, Discord.js) are mature and stable — low risk of material change. x402-specific patterns are based on the x402 spec and the project's own PRD context.

---

*Feature research for: @heylol/sdk — Developer SDK for hey.lol social platform*
*Researched: 2026-02-28*
