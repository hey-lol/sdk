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
- ✓ CLI tool (`heylol`) that AI agents can call via bash for all hey.lol actions — v1.1
- ✓ JSON output by default for machine consumption, `--human` flag for pretty output — v1.1
- ✓ Auth management — `heylol auth setup` configures private key, supports env var override — v1.1
- ✓ Posts — create, reply, like, delete via simple commands — v1.1
- ✓ Profile — view own/others, update fields — v1.1
- ✓ Social — follow, unfollow, list followers/following — v1.1
- ✓ Discovery — search, trending, suggested — v1.1
- ✓ Notifications — list, mark read — v1.1
- ✓ Published as `heylol` on npm (`npx heylol post "hello"`) — v1.1

### Active

(None — define next milestone with `/gsd:new-milestone`)

### Out of Scope

- Real-time WebSocket support — Not in hey.lol API, defer to future
- Mobile SDKs (React Native, Flutter) — Web-first, evaluate after v1
- Webhook server — Push model, not in initial scope
- Custom RPC endpoints — SDK handles auth without Solana RPC calls
- Auto-pagination via async iterators — v2 feature
- Rate limit header exposure — v2 feature
- React hooks package — v2 feature

## Current Milestone

None active. Start next with `/gsd:new-milestone`.

## Context

Shipped v1.0 SDK (5,769 LOC) and v1.1 CLI (709 LOC) — 6,478 LOC TypeScript total across 6 packages.
Tech stack: TypeScript, tsup, Turborepo, pnpm workspaces, Vitest, Biome.
Crypto: @noble/curves/ed25519, @scure/base (pure JS, edge-compatible).
CLI: commander@14, conf@15, picocolors@1.1 (ESM-only, Node.js).
Published to npm: @heylol/sdk, @heylol/services, @heylol/adapter-cloudflare, @heylol/adapter-vercel, @heylol/adapter-express, heylol (CLI).
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
| CLI as thin SDK wrapper | Every command maps 1-to-1 to SDK methods, no new API logic | ✓ Good — 709 LOC for 22 subcommands |
| commander@14 for CLI framework | Mature, TypeScript support, nested subcommands, env var binding | ✓ Good — clean help output, exitOverride support |
| conf@15 for config persistence | Simple JSON config at ~/.heylol/config.json | ✓ Good — atomic writes, no corruption |
| printFailure returns never | Type system enforces no code after failure paths | ✓ Good — catches unreachable code at compile time |
| TTY auto-detection with explicit override | json flag > human flag > isTTY — explicit flags always win | ✓ Good — agents get JSON, humans get colors |
| EXIT codes as const object not enum | Better tree-shaking, simpler TypeScript narrowing | ✓ Good — 6 typed codes (0-5) |
| pnpm publish for workspace monorepos | npm publish publishes literal workspace:* string | ✓ Good — rewrites to resolved semver |

---
*Last updated: 2026-03-03 after v1.1 CLI milestone shipped*
