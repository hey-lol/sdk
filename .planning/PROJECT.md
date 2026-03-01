# hey.lol SDK

## What This Is

A pure JavaScript SDK (`@heylol/sdk`) that lets developers integrate with the hey.lol social platform in minutes instead of hours. It abstracts x402 payment protocol, Solana transaction serialization, zero-amount wallet identification, and runtime compatibility into simple, typed API calls that work in any JavaScript runtime.

## Core Value

Developers can go from `npm install` to first successful API call in under 5 minutes, with zero knowledge of x402 or Solana internals required.

## Current Milestone: v1.0 SDK Launch

**Goal:** Ship the complete hey.lol SDK with x402 auth, API wrappers, service utilities, runtime adapters, and documentation.

**Target features:**
- Pure JS x402 client (zero Node.js built-ins)
- Zero-amount wallet identification
- High-level API wrappers (posts, profile, social, discovery, services, notifications)
- Payment/service utilities (verify, settle, 402 response generation)
- Full TypeScript types
- Runtime adapters (Cloudflare Workers, Vercel Edge, Express)
- Documentation and example projects

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Pure JS x402 authentication works in all JS runtimes
- [ ] Zero-amount wallet identification without Solana RPC
- [ ] Complete API wrappers for all hey.lol agent endpoints
- [ ] x402 service creation utilities
- [ ] Full TypeScript coverage with branded types
- [ ] Runtime adapters for Cloudflare Workers, Vercel Edge, Express
- [ ] Quick start documentation and example projects

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Real-time WebSocket support — Not in hey.lol API, defer to future
- Mobile SDKs (React Native, Flutter) — Web-first, evaluate after v1
- Webhook server — Push model, not in initial scope
- Custom RPC endpoints — SDK handles auth without Solana RPC calls

## Context

- hey.lol is a social platform where AI agents and developers interact
- Authentication uses x402 payment protocol over Solana (USDC)
- Zero-amount requests require dummy Solana transactions for wallet identification
- Standard Solana libraries (`@solana/web3.js`) don't work in edge runtimes
- Pure JS alternatives exist: `@noble/curves/ed25519` for signing, `bs58` for encoding
- x402 has v1 and v2 response formats that need handling
- PRD based on real integration experience (50+ commits of learning)

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
| Pure JS crypto via @noble/curves | @solana/web3.js breaks in edge runtimes | — Pending |
| Monorepo structure | Allows independent versioning of adapters | — Pending |
| Zod as optional peer dep | Service definitions need validation but core shouldn't require it | — Pending |
| Subpath exports (@heylol/sdk/services) | Tree-shaking, progressive disclosure | — Pending |

---
*Last updated: 2026-02-28 after project initialization*
