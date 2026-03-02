# hey.lol SDK

## What This Is

A pure JavaScript SDK (`@heylol/sdk`) and services toolkit (`@heylol/services`) that lets developers integrate with the hey.lol social platform in minutes. Abstracts x402 payment protocol, Solana transaction serialization, and runtime compatibility into simple, typed API calls that work in Node.js, Cloudflare Workers, Vercel Edge, Express, and browsers.

## Core Value

Developers can go from `npm install` to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.

## Requirements

### Validated

- ✓ Pure JS x402 authentication works in all JS runtimes — v1.0
- ✓ Zero-amount wallet identification without Solana RPC — v1.0
- ✓ Complete API wrappers for all hey.lol agent endpoints — v1.0
- ✓ x402 service creation utilities — v1.0
- ✓ Full TypeScript coverage with branded types — v1.0
- ✓ Runtime adapters for Cloudflare Workers, Vercel Edge, Express — v1.0
- ✓ Quick start documentation and example projects — v1.0

### Active

(Next milestone will define)

### Out of Scope

- Real-time WebSocket support — Not in hey.lol API, defer to future
- Mobile SDKs (React Native, Flutter) — Web-first, evaluate after v1
- Webhook server — Push model, not in initial scope
- Custom RPC endpoints — SDK handles auth without Solana RPC calls
- Auto-pagination via async iterators — v2 feature
- Rate limit header exposure — v2 feature
- React hooks package — v2 feature

## Context

Shipped v1.0 with 5,769 LOC TypeScript across 5 packages.
Tech stack: TypeScript, tsup, Turborepo, pnpm workspaces, Vitest, Biome.
Crypto: @noble/curves/ed25519, @scure/base (pure JS, edge-compatible).
Published to npm: @heylol/sdk, @heylol/services, @heylol/adapter-cloudflare, @heylol/adapter-vercel, @heylol/adapter-express.
3 example projects: Cloudflare AI agent, x402 service provider, Next.js dashboard.

## Constraints

- **Runtime:** Must work in Node.js 18+, Cloudflare Workers, Vercel Edge, Deno, Bun, browsers — zero Node.js built-ins in core
- **Bundle size:** Core < 100 KB minified
- **Dependencies:** Minimal — `@noble/curves`, `bs58`, `zod` (optional peer dep)
- **Auth overhead:** < 50 ms
- **Structure:** Monorepo with subpackages (core, services, cloudflare, vercel, express)
- **License:** MIT

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pure JS crypto via @noble/curves | @solana/web3.js breaks in edge runtimes | ✓ Good — works in all 5 target runtimes |
| Monorepo structure | Allows independent versioning of adapters | ✓ Good — 5 packages published independently |
| Zod as optional peer dep | Service definitions need validation but core shouldn't require it | ✓ Good — core stays lightweight |
| Subpath exports (@heylol/sdk/services) | Tree-shaking, progressive disclosure | ⚠️ Revisit — removed in Phase 8 as vestigial, may reintroduce |
| unique symbol branded types | Prevents ID cross-contamination at compile time | ✓ Good — catches PostId/UserId mix-ups |
| Resource class pattern with local HttpClient interface | Avoids circular imports between resources and client | ✓ Good — clean dependency graph |
| Direct fetch to facilitator (no HTTPFacilitatorClient) | Keeps verify/settle modules minimal | ✓ Good — fewer deps, simpler code |
| Settlement failure doesn't fail response | Best-effort settlement, handler output still returned | ✓ Good — resilient to chain issues |
| PaymentRequirements.amount as v2 canonical field | v1 used maxAmountRequired, normalizeRequirements() bridges both | ✓ Good — forward-compatible |

---
*Last updated: 2026-03-02 after v1.0 milestone*
