# Stack Research

**Domain:** Pure JavaScript SDK — Edge-Runtime-Compatible Cryptographic API Client
**Researched:** 2026-02-28
**Confidence:** HIGH (all versions verified via npm registry; architecture rationale from dependency audits)

---

## Recommended Stack

### Core Runtime Dependencies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@noble/curves` | `^2.0.1` | Ed25519 signing, key generation | Zero native deps, audited, works in all edge runtimes. Exposes `./ed25519.js` as a tree-shakeable subpath — only pull the curve you need. The `@noble/hashes` peer dep is also zero-dep pure JS. The only correct choice for pure-JS Ed25519 in edge environments. |
| `@noble/hashes` | `^2.0.1` | SHA-256, SHA-512, HMAC (pulled as peer dep of curves) | Transitive dep of `@noble/curves`. Zero dependencies. Audited. Runs in Cloudflare Workers, Deno, Bun, browsers. |
| `@scure/base` | `^2.0.0` | Base58, base64, bech32 encoding/decoding | 100 KB unpacked, zero dependencies. Preferred over `bs58` v6 because `bs58` adds `base-x` as a dependency (doubling the dep tree), while `@scure/base` ships everything from the same zero-dep audit family as `@noble/*`. Use `@scure/base`'s `base58` export directly. |
| `@x402/core` | `^2.5.0` | x402 protocol types, client helpers, header parsing | The lowest-level Coinbase x402 package. Only dependency is `zod`. Provides the `./client` and `./facilitator` subpath exports needed for payment header logic. Avoids pulling in `viem`, `wagmi`, EVM codecs, and wallet adapters that the heavier `x402@1.1.0` (16 MB unpacked) drags in. |
| `zod` | `^4.3.6` | Runtime schema validation for API responses and x402 payloads | `@x402/core` already requires zod. Ships CJS + ESM + source maps. v4 is a peer dep, not bundled — declare as a peer dep in SDK packages that expose validated types. Zero runtime deps. |

### Monorepo Tooling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `pnpm` | `^10.30.3` | Workspace package manager | Workspace protocol (`workspace:*`) links packages without hoisting nightmares. Disk-efficient via content-addressed store. Native workspaces without extra config. Turbo works natively with pnpm workspaces. |
| `turbo` | `^2.8.12` | Task orchestration across packages | 39 KB install. Caches build outputs per-package. `turbo build` runs `tsup` in correct dependency order across all packages. No daemon required for CI. Better DX than Nx for pure JS SDK monorepos that don't need code generation. |
| `@changesets/cli` | `^2.29.8` | Versioning and npm publish coordination | The standard for monorepo package publishing. Changesets accumulate per-PR, `changeset version` bumps all affected packages correctly, `changeset publish` runs `npm publish` for each. Works with pnpm workspaces natively. |

### Build Tooling

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `typescript` | `^5.9.3` | Type generation, compilation | Current stable. Use `"moduleResolution": "bundler"` for subpath exports compatibility. Emit `.d.ts` alongside JS, not standalone DTS bundles. |
| `tsup` | `^8.5.1` | Bundle each package to CJS + ESM | Powered by esbuild (0.27.x) + rollup (4.x). Config is 10 lines. Outputs `dist/index.js` (CJS), `dist/index.mjs` (ESM), `dist/index.d.ts` (types) per package. `--format cjs,esm --dts` covers all consumers. |

### Testing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `vitest` | `^4.0.18` | Unit and integration tests | First-class TypeScript support, ESM-native, runs in-process without transpile step. Supports `@edge-runtime/vm` pool (see below) for edge simulation. v4 ships `@vitest/coverage-v8` at the same version. |
| `@edge-runtime/vm` | `^5.0.0` | Simulate Cloudflare Workers / Vercel Edge in vitest | Provided by Vercel. Implements the WinterTC WinterCG fetch + Web Crypto API in a V8 isolate. Pair with vitest's `pool: 'forks'` + environment config to run the same test file in Node and edge contexts. |

### Package Quality Gates

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `publint` | `^0.3.17` | Validate package.json exports fields | Catches broken `exports` maps before publish. Run in CI as `publint .` per package. Prevents the "works locally, broken for consumers" class of bugs. |
| `@arethetypeswrong/cli` | `^0.18.2` | Validate TypeScript types resolve correctly for all module formats | Checks that CJS consumers get `.d.ts`, ESM consumers get `.d.mts`, and that `moduleResolution: bundler` doesn't create phantom types. Run as `attw --pack .` per package. |
| `size-limit` | `^12.0.0` | Enforce < 100 KB core bundle budget | Add `@size-limit/preset-small-lib`. Fails CI if `@heylol/core` gzip exceeds budget. Prevent accidental dep additions from blowing bundle. |

---

## Supporting Libraries (Per Subpackage)

| Library | Version | Package | Purpose | Notes |
|---------|---------|---------|---------|-------|
| `hono` | latest stable | `@heylol/express`, `@heylol/cloudflare` | HTTP middleware helpers | If building middleware wrappers. Only if needed — these adapters may be thin wrappers over fetch. |
| `miniflare` | `^4.20260305.0` | dev | Local Cloudflare Workers simulation for integration tests | Wrangler v4 ships Miniflare internally. Use for end-to-end tests of the `@heylol/cloudflare` subpackage. |

---

## Installation

```bash
# Workspace root — no runtime deps here
pnpm add -D turbo typescript @changesets/cli -w

# packages/core
pnpm add @noble/curves @noble/hashes @scure/base @x402/core --filter @heylol/core
pnpm add -D tsup vitest @edge-runtime/vm publint @arethetypeswrong/cli size-limit @size-limit/preset-small-lib --filter @heylol/core

# packages/services (adds zod for response validation)
pnpm add zod --filter @heylol/services

# packages/cloudflare
pnpm add miniflare -D --filter @heylol/cloudflare
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@scure/base` | `bs58` | Never for this project. `bs58` v6 adds `base-x` as a dep; `@scure/base` does base58, base64, bech32, base16 all in one zero-dep 100 KB package from the same audit family as `@noble/*`. |
| `@x402/core` | `x402` (full) | `x402@1.1.0` is 16 MB unpacked and pulls in `viem`, `wagmi`, `@solana/kit`, EVM codecs, and wallet adapters. Appropriate if building a full payment gateway server, not an API SDK client. |
| `tsup` | `unbuild` | `unbuild` is better for Nuxt/Nitro ecosystems. `tsup` is simpler config, more battle-tested for pure TS library monorepos, and has first-class `--dts` support. |
| `turbo` | `nx` | Nx is better when you need code generation, Angular, or workspace generators. For a pure SDK monorepo, Nx adds 100+ MB of tooling overhead. Turbo is 39 KB installed and does exactly what's needed. |
| `vitest` | `jest` | Jest requires babel/ts-jest transpilation, doesn't support ESM natively without hacks, and has no edge runtime pool support. Vitest runs TypeScript directly and has `@edge-runtime/vm` pool built in. |
| `pnpm workspaces` | `npm workspaces` | npm workspaces have no workspace protocol, no disk deduplication, and slower installs. pnpm's `workspace:*` protocol prevents version drift between internal packages. |
| `@changesets/cli` | `release-it` | `release-it` is good for single-package repos. Changesets is purpose-built for monorepo versioning where multiple packages need coordinated but independent version bumps. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@solana/web3.js` v1 | 15+ npm dependencies including `node-fetch`, `@babel/runtime`, `jayson`, `rpc-websockets`, `buffer` polyfill — none of which are edge-runtime safe. Unpacked size exceeds the entire SDK budget. Requires `node:` built-ins polyfilled. The Solana Foundation deprecated v1 in favor of the `@solana/kit` modular packages. | For Solana transaction serialization, use `@solana/transactions@6.1.0` + `@solana/addresses@6.1.0` + `@solana/codecs-*@6.1.0` — the modular v2 kit has pure dependency trees (only `@solana/errors` and `@solana/nominal-types` internal deps). But evaluate whether you even need these: if the SDK only builds transaction bytes for wallet identification (not submits transactions), a hand-rolled borsh encoder using `@noble/curves` and `@scure/base` may be < 1 KB and fully under your control. |
| `@solana/kit` (full) | The umbrella package pulls in RPC, signers, sysvars, programs, offchain-messages — 20+ sub-packages for a monolith experience. Fine for apps, wrong for an SDK that only needs transaction byte construction. | Import individual `@solana/*` packages at `6.1.0` only for what you use. Tree-shaking does not work well when the import graph is dense internal cross-deps. |
| `tweetnacl` | Last published 2021. Does not export Ed25519 as a subpath. No tree-shaking. Not audited by a third party for the web3 context. | `@noble/curves/ed25519` |
| Node.js `crypto` built-in (`require('crypto')`) | Not available in Cloudflare Workers, Vercel Edge Runtime, or browser. Any code path that imports `node:crypto` will fail silently or throw at worker boot time. | `@noble/curves` for signing (pure JS), `globalThis.crypto.subtle` for hashing in runtimes that support Web Crypto API (all modern targets), `@noble/hashes` as fallback. |
| `axios` | Brings in many Node.js-specific internals. Not edge-safe without adapter config. | Native `fetch` — available globally in all target runtimes (Node 18+, Cloudflare Workers, Deno, Bun, browsers). |
| `dotenv` | Not applicable in edge runtimes where secrets come from runtime bindings. Pollutes the SDK bundle if imported by mistake. | Never import from SDK packages. Document that consumers set `process.env` or platform-specific bindings. |
| `Buffer` (global) | Not available in Cloudflare Workers without polyfill. Any `Buffer.from()` call breaks edge builds. | `Uint8Array` throughout. Use `TextEncoder`/`TextDecoder` for string-to-bytes. These are globally available in all WinterTC-compliant runtimes. |

---

## Stack Patterns by Subpackage

**`packages/core` — The only package with runtime crypto deps:**
- Depends on: `@noble/curves`, `@noble/hashes`, `@scure/base`, `@x402/core`
- Exports: Ed25519 key pair generation, signing, base58 encode/decode, x402 header parsing
- Must pass size-limit check: < 50 KB gzip (core crypto is the budget holder)
- Zero peer dependencies — must work standalone

**`packages/services` — API wrappers, typed responses:**
- Depends on: `@heylol/core` (workspace), `zod` (peer dep — consumers who want validation install it)
- Exports: Typed fetch wrappers for hey.lol API endpoints
- Pattern: Export both raw fetch functions and zod-validated variants as separate entry points

**`packages/cloudflare` — Cloudflare Workers adapter:**
- Depends on: `@heylol/core` (workspace)
- Exports: `handleX402` middleware function typed for Cloudflare `Request`/`Response`
- Dev: `miniflare` for local Worker simulation in tests

**`packages/vercel` — Vercel Edge Runtime adapter:**
- Depends on: `@heylol/core` (workspace)
- Exports: `withX402` middleware for Next.js Edge API routes and Vercel Edge Functions
- Dev: `@edge-runtime/vm` already in core test suite — reuse

**`packages/express` — Node.js/Express adapter:**
- Depends on: `@heylol/core` (workspace)
- Exports: Express `RequestHandler` middleware
- This package alone can use Node.js built-ins if needed — but avoid them anyway for consistency

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@noble/curves@2.0.1` | `@noble/hashes@2.0.1` | Curves v2 pins hashes v2 exactly. Do not install hashes v1 alongside. |
| `@x402/core@2.5.0` | `zod@^3.24.2` or `zod@^4.x` | `@x402/core` specifies `^3.24.2` but zod v4 ships a `./v3` compatibility shim. Either works. Recommend zod v4 for tree-shaking improvements. |
| `tsup@8.5.1` | `typescript@>=4.5.0` | No upper bound on TS. Works with TS 5.9.x. |
| `vitest@4.0.18` | `@vitest/coverage-v8@4.0.18` | Must be same major.minor.patch version. Pin both. |
| `@solana/transactions@6.1.0` | All other `@solana/*@6.1.0` | All `@solana/kit` sub-packages must be the same version. Cross-version usage causes type brand errors. |

---

## Sources

- npm registry (`npm info`) — all version numbers verified directly, 2026-02-28
- `@noble/curves` npm metadata — confirms `@noble/hashes@2.0.1` peer dep, zero external deps, ed25519 subpath export
- `@noble/hashes` npm metadata — "0-dependency JS implementation", confirms edge compatibility
- `@scure/base` npm metadata — "0-dep implementation of base64, bech32, base58, base32 & base16"
- `@x402/core` npm metadata — only dependency is `zod`, 881 KB unpacked vs 16 MB for `x402` full
- `x402@1.1.0` npm metadata — dependency audit showing viem, wagmi, @solana/kit, wallet adapters
- `@solana/web3.js@1.98.4` npm metadata — dependency audit confirming node-fetch, @babel/runtime, buffer polyfill
- `@solana/transactions@6.1.0` npm metadata — dependency audit confirming clean tree (only @solana/* internals)
- `bs58@6.0.0` npm metadata — `base-x@^5.0.0` runtime dependency confirmed
- `tsup@8.5.1` npm metadata — esbuild@^0.27.0 + rollup@^4.34.8 confirmed as underlying bundlers
- Node.js v22.19.0 — `globalThis.crypto.subtle` verified available (Web Crypto global since Node 18)

---

*Stack research for: @heylol/sdk — Pure JS edge-runtime-compatible Solana/x402 SDK*
*Researched: 2026-02-28*
