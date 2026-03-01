# Pitfalls Research

**Domain:** Pure JS crypto SDK — x402 payments, Solana serialization, multi-runtime npm package
**Researched:** 2026-02-28
**Confidence:** HIGH (training knowledge current through Aug 2025 for these domains; confirmed against known CF Workers, @noble/curves, and npm packaging behavior)

---

## Critical Pitfalls

### Pitfall 1: Using `crypto.getRandomValues` or `TextEncoder` Without Guards

**What goes wrong:**
Code that uses `crypto` as a bare global works in browsers and Node.js 19+ but silently breaks in Node.js 18 where `globalThis.crypto` may not be populated depending on the ESM/CJS loading context. The `TextEncoder` global is similarly absent in some Deno edge environments if the runtime hasn't initialized it. The result is a `ReferenceError: crypto is not defined` or `TextEncoder is not defined` that only surfaces when a downstream user runs on a specific runtime.

**Why it happens:**
Developers test in Node.js 20 or Bun (both have `globalThis.crypto`), miss that Node.js 18's `globalThis.crypto` is only available via `--experimental-global-webcrypto` flag before 18.19. They write `crypto.subtle.digest(...)` and ship it.

**How to avoid:**
Use `@noble/curves` and `@noble/hashes` exclusively — they already handle the cross-runtime crypto shim. Never call `globalThis.crypto.subtle` directly in core package code. If you must call Web Crypto (e.g., for HMAC), write a helper: `const subtle = (globalThis.crypto ?? require('crypto').webcrypto).subtle` — but wrap in a runtime capability check first. Include Node.js 18 in CI matrix explicitly.

**Warning signs:**
- Any bare `crypto.subtle` or `crypto.getRandomValues` call in the codebase that isn't inside a try/catch with fallback
- Missing `"engines": {"node": ">=18.19"}` in package.json (if 18.x is supported)
- CI only testing Node.js 20+

**Phase to address:** Phase 1 — Core crypto foundation. Establish the "no bare globals" rule before writing any crypto code.

---

### Pitfall 2: Solana Transaction Byte Layout Errors That Produce Valid-Looking But Rejected Transactions

**What goes wrong:**
Manually serialized Solana transactions get silently accepted by the serializer but rejected by validators or the hey.lol API with opaque errors. The most common causes: (a) wrong compact-u16 encoding for array lengths — Solana uses a non-standard varint where values 0-127 use 1 byte but 128+ use 2 bytes in little-endian with the MSB set in the low byte, not standard protobuf varint; (b) account key deduplication not done before signing — accounts that appear in multiple instructions must be deduplicated in the account list with specific ordering rules (signers first, then non-signers, then readonly); (c) wrong signature order — the fee payer must be the first account and first signature slot even if it wasn't listed first in instruction accounts.

**Why it happens:**
Developers read the Solana transaction format docs but miss that `compact-u16` is documented separately from the main transaction doc. The deduplication + ordering rules are only fully specified in the Solana program library source code, not prominently in the docs. Off-by-one errors in buffer positions compound.

**How to avoid:**
Write byte-level unit tests against known-good transactions. Serialize a known transaction from Solana's test fixtures and compare byte-by-byte against your output. Specifically test: empty transaction (zero instructions), one instruction with two accounts, transaction where the same account appears in two instructions. For the zero-amount dummy transaction case, test that an all-zeros blockhash serializes to exactly the right 32 bytes in the right position. Use a reference implementation: the `@solana/transaction-messages` package from `@solana/kit` is pure JS and edge-compatible as a reference (not as a runtime dependency, but as a test oracle).

**Warning signs:**
- Any `ArrayBuffer` manipulation with magic number offsets (`buf[32] = ...`) without named constants for those offsets
- Compact-u16 encoding written inline rather than as a tested utility function
- No test that round-trips a serialized transaction through a known base64 decoder

**Phase to address:** Phase 2 — Solana transaction builder. Invest in byte-level tests before anything else in this phase.

---

### Pitfall 3: `Buffer` Usage Breaking Cloudflare Workers

**What goes wrong:**
`Buffer` is not available in Cloudflare Workers by default. `Buffer.from(hex, 'hex')`, `Buffer.alloc()`, and `buf.toString('base64')` all throw `ReferenceError: Buffer is not defined`. This is an extremely common breakage point because Node.js developers reach for `Buffer` by reflex, and it works in Bun, Deno, and Node.js — giving false confidence that the code is "edge compatible."

**Why it happens:**
`Buffer` is a Node.js built-in that CF Workers does not polyfill by default. Even with `nodejs_compat` compatibility flag, Buffer may or may not be present depending on the CF Workers version and compatibility date. Many dependencies (including old versions of `bs58`) internally use `Buffer`, which means the breakage can come transitively.

**How to avoid:**
Ban `Buffer` entirely in core package. Enforce with an ESLint rule (`no-restricted-globals: ['error', 'Buffer']`) or a build-time check that greps the output bundle for `Buffer`. Replace all uses: hex encode/decode via `Uint8Array` and a small hex utility, base64 via `btoa`/`atob` with a `Uint8Array`-to-string conversion helper, array operations via `Uint8Array` directly. Verify that `bs58` v6+ does not use `Buffer` internally (it uses `Uint8Array` natively). Pin or test the exact `bs58` version in CI.

**Warning signs:**
- Any `import { Buffer }` or `const { Buffer } = require('buffer')`
- `buf.toString('hex')` or `Buffer.from(str, 'base64')` anywhere in core or services packages
- Not running the CF Workers compatibility test in CI

**Phase to address:** Phase 1 — Establish as a foundational constraint. Add ESLint rule in project setup before any implementation.

---

### Pitfall 4: x402 Header Parsing Broken by Case Sensitivity or Whitespace

**What goes wrong:**
The `WWW-Authenticate` header returned by hey.lol contains the x402 challenge. HTTP headers are case-insensitive per spec, but JavaScript's `Headers` API (Fetch API) normalizes header names to lowercase, while some frameworks or proxy layers may not. If the parser does `headers.get('WWW-Authenticate')` it works, but `headers['WWW-Authenticate']` on a plain object (like Express's `req.headers`) returns `undefined` because Node.js lowercases them to `www-authenticate`. Additionally, the x402 v1 format and v2 format differ in how the JSON payload is embedded — v1 uses a base64-encoded JSON body directly in the header value after the scheme name, while v2 uses structured fields. Treating them identically causes silent parse failures.

**Why it happens:**
Developers test against one response format and don't build the multi-format parser until they hit the other in production. Header case is a known gotcha but frequently missed because browser DevTools and Postman normalize display.

**How to avoid:**
Always access headers via `.get()` on the Fetch `Headers` object, never via property access on plain objects. When working with Express `req.headers`, call `.toLowerCase()` on the key. Write explicit tests for both x402 v1 and v2 response parsing, with real header string fixtures copied from the actual hey.lol API responses (not synthetic ones). Test parsing with extra whitespace in header values.

**Warning signs:**
- Any `headers['WWW-Authenticate']` (bracket notation on plain object)
- Any `if (version === 'v1')` branch in the parser that was added after initial shipping
- Missing test fixtures for both x402 header formats

**Phase to address:** Phase 2 — x402 client implementation. Build a spec-compliant header parser with both format tests before building higher-level auth flow.

---

### Pitfall 5: Subpath Exports Package.json Configuration Causing Resolution Failures

**What goes wrong:**
`"exports"` in `package.json` is strict — if a path is not listed in the `exports` map, it is unreachable and throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. This is fine in principle but creates operational failures when: (a) TypeScript's `moduleResolution: "node"` (pre-bundler) doesn't read `exports` at all, causing `.d.ts` files to not resolve; (b) the `"types"` condition must come before `"import"` and `"require"` in the exports entry, or TypeScript ignores it; (c) Rollup, esbuild, and Vite each have slightly different behaviors when resolving `exports` with `"browser"` condition vs. `"worker"` condition — what works in Vite may fail in esbuild with the same package.

**Why it happens:**
The `exports` field spec was finalized in Node.js 12 but TypeScript support for it (via `moduleResolution: "bundler"` or `"node16"`) came later. Most tutorials still show the old `"main"` + `"module"` pattern. The condition ordering requirement (`"types"` first) is documented but buried.

**How to avoid:**
Use `"moduleResolution": "bundler"` in the SDK's `tsconfig.json`. In `package.json` exports, always put conditions in this order: `"types"`, `"import"`, `"require"`, `"default"`. Include `"browser"` and `"worker"` conditions where the implementation differs. Run `publint` and `@arethetypeswrong/cli` (attw) as part of the release pipeline — these tools catch exports misconfiguration before publish. Add a smoke test that does `import { something } from '@heylol/sdk/services'` in a fresh TypeScript project with `moduleResolution: "bundler"` and also `"node16"`.

**Warning signs:**
- `tsconfig.json` using `"moduleResolution": "node"` (not "bundler" or "node16")
- No `publint` in CI
- Package published with `"main"` and `"module"` but no `"exports"` field
- Types failing to resolve for subpath imports

**Phase to address:** Phase 1 — Project setup. Configure `exports` correctly in the monorepo before writing any implementation.

---

### Pitfall 6: Ed25519 Signing Output Mutation Causing Intermittent Signature Failures

**What goes wrong:**
`@noble/curves` signing returns a `Uint8Array`. If that array is passed into a transaction builder that modifies it in-place (e.g., writing it into a larger buffer using `set()`), and the original reference is reused, the signature bytes can be overwritten mid-flow. This produces signatures that fail verification intermittently — the bug only manifests when the same key signs twice in rapid succession in the same JavaScript microtask queue, which happens in testing loops but rarely in production single-sign flows.

**Why it happens:**
JavaScript developers are accustomed to string immutability. `Uint8Array` is mutable and shared by reference. The `@noble/curves` API returns a new array each call, but if calling code caches the result in a closure and reuses it, subtle aliasing bugs emerge.

**How to avoid:**
Always copy signature bytes into the transaction buffer immediately and discard the source reference: `txBuffer.set(sig.slice(), offset)` not `txBuffer.set(sig, offset)`. Use `Object.freeze` on the signature array if you cache it at all (though this only prevents direct mutation, not `TypedArray.prototype.set` writes). Write a test that builds two transactions with the same key back-to-back and verifies both signatures are valid independently.

**Warning signs:**
- Any `const sig = sign(...)` followed by a reference passed around without `.slice()` copy
- Missing test for repeated signing with the same key
- Signature verification not tested independently of the signing call

**Phase to address:** Phase 2 — Solana transaction builder and x402 auth. This is a signing-layer concern.

---

### Pitfall 7: Zero-Amount Dummy Transaction All-Zeros Blockhash Rejected as Malformed

**What goes wrong:**
The zero-amount wallet identification flow uses a dummy Solana transaction with an all-zeros blockhash (`new Uint8Array(32).fill(0)`). Some validators and API validators reject this because they check `blockhash !== PublicKey.default.toBase58()` — i.e., they explicitly check that the blockhash is not all-zeros as a sanity check. If hey.lol's API server validates the blockhash field format (not just its validity on-chain), the entire zero-amount flow breaks silently if the API server is updated to add this check.

**Why it happens:**
The zero-amount pattern is a convention for wallet identification without payment — it's not part of the Solana protocol spec. It's a hey.lol-specific convention. If the API team tightens validation on their side, all SDKs built on this convention break at once.

**How to avoid:**
Document this as a known protocol assumption. Pin to a specific hey.lol API version or include a runtime check: before sending, call a lightweight API endpoint that confirms the zero-amount format is still accepted (a `HEAD` request to the auth endpoint). Build the dummy transaction construction in a single, isolated function (`buildDummyTransaction`) with a clear comment: "This format is hey.lol-specific and may change — see API changelog." Write an integration test that actually sends a zero-amount request to the hey.lol API (not mocked) in CI.

**Warning signs:**
- Zero-amount transaction building scattered across multiple files instead of isolated
- No integration test against the real API
- No comment in code referencing the hey.lol protocol convention

**Phase to address:** Phase 2 — Zero-amount wallet identification. Isolate and document the convention on day one of that phase.

---

### Pitfall 8: ESM/CJS Dual Package Hazard Causing Double Module Instances

**What goes wrong:**
Publishing a package as both ESM and CJS (dual package) without careful singleton management causes two instances of the module to load simultaneously in the same process. This is the "dual package hazard" documented in the Node.js docs. For a crypto SDK, the consequences are subtle: two separate copies of internal state (e.g., curve point caches in `@noble/curves`) double memory use, and any module-level singleton (e.g., a cached keypair or nonce manager) gets two separate instances that diverge.

**Why it happens:**
Tooling like `tsup` makes it easy to output both CJS and ESM. Developers do it "for compatibility" without understanding that when both are present and a consumer's bundler picks CJS for one import path and ESM for another, both load. The hazard is documented but rarely encountered in testing because test runners use one format consistently.

**How to avoid:**
Ship ESM-only for the core package. Provide a CJS wrapper only for the Express adapter (`@heylol/sdk-express`) where Node.js CJS-only environments are the actual target. Use the Node.js dual package hazard pattern if CJS must be supported: export a shared singleton from a separate `state.js` file that both ESM and CJS re-export, preventing divergence. Run the `are-the-types-wrong` tool to verify the package doesn't trigger the hazard.

**Warning signs:**
- `tsup` config outputting both `dist/index.js` (CJS) and `dist/index.mjs` (ESM) without a `state.js` singleton
- Consumer imports where `require('@heylol/sdk')` and `import '@heylol/sdk'` both appear in the same build

**Phase to address:** Phase 1 — Build tooling and package structure setup.

---

### Pitfall 9: TypeScript Declaration Files Missing for Conditional Exports

**What goes wrong:**
The package works at runtime for all targets but TypeScript users get `Cannot find module '@heylol/sdk/services' or its corresponding type declarations`. This happens when the `exports` map has `"types"` pointing to a path that doesn't exist (off-by-one in the build output path), or when the `types` field in `package.json` root is set but doesn't account for subpath exports. TypeScript 4.7+ requires subpath export `"types"` conditions, but TypeScript 4.6 and earlier (still in common use) silently ignores them.

**Why it happens:**
Build tools like `tsup` generate `dist/services.d.ts` but the exports map says `"types": "./dist/services/index.d.ts"`. The mismatch is invisible until a user reports it. Developers don't test with older TypeScript versions.

**How to avoid:**
Run `attw` (are-the-types-wrong) in CI against the published tarball (use `npm pack` then `attw ./heylol-sdk-1.0.0.tgz`). Test type resolution with TypeScript 4.7, 5.0, and latest. In the exports map, use `"types"` as the first condition everywhere. Generate declarations with `tsc --declaration --emitDeclarationOnly` rather than relying on tsup's bundled `.d.ts` output, which can mangle re-exports.

**Warning signs:**
- `attw` not in CI
- `.d.ts` files generated by tsup's `dts: true` option without verification
- No test project importing the packed tarball

**Phase to address:** Phase 1 (build configuration) and Phase 5 (pre-release verification).

---

### Pitfall 10: `x402-axios` or `x402-fetch` Interceptor Pattern Copied Incorrectly

**What goes wrong:**
The x402 protocol requires a specific retry flow: make initial request, receive 402, parse `WWW-Authenticate`, build payment transaction, sign it, encode in `X-Payment` header, retry original request. Developers building their own interceptor often get the retry wrong: (a) they mutate the original request URL or body on retry instead of cloning the original; (b) they don't handle the case where the retry also returns 402 (a new challenge, not an infinite loop — hey.lol may issue a fresh nonce); (c) they forget that the `X-Payment` header must be on the *retry* request only, not the initial request.

**Why it happens:**
The x402 spec describes the flow at a high level. The edge cases (what if retry 402s?) are not prominently documented. Developers write a happy-path interceptor that works in testing but fails in production when the server issues a fresh challenge.

**How to avoid:**
Write an explicit retry state machine: `INITIAL → PENDING_PAYMENT → RETRY → SUCCESS | RETRY_FAILED`. Cap retries at 2 (initial + one retry with payment). On a second 402 after payment, surface a specific `X402RetryExceededError` not a generic failure. Always clone the original `Request` object for retry: `new Request(originalRequest, { headers: new Headers(originalRequest.headers) })`. Test the retry-with-fresh-challenge scenario with a mock server.

**Warning signs:**
- No retry cap logic
- `req.headers.set(...)` on the original request (mutation instead of clone)
- No test for "server returned 402 again after payment attempt"

**Phase to address:** Phase 3 — x402 interceptor and high-level API wrappers.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use `Buffer` polyfill in all environments | Works everywhere now | Polyfill adds ~10KB, breaks CF Workers without explicit polyfill flag | Never — ban it in core |
| Hardcode x402 field names as strings | Fast to write | Breaks silently when protocol changes field casing | MVP only if documented with a TODO and protocol version pin |
| Skip compact-u16 for known small arrays | Simpler code | Breaks for any instruction with >127 accounts | Never — always implement correctly |
| Single `index.ts` instead of subpath exports | Easier initial setup | Prevents tree-shaking, forces users to bundle everything | Never — set up subpaths from day one |
| Generate `.d.ts` with tsup default config | Zero config | Bundled declarations mangle complex re-exports | Only if verified with `attw` before each release |
| Mock hey.lol API in all tests | Fast CI | Never catches real protocol breakage | Acceptable for unit tests; must have at least one integration test suite against real API |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| hey.lol API — x402 v1 vs v2 | Assume v2 is always returned; break on v1 servers | Parse the `scheme` or version field first; branch explicitly; test both |
| @noble/curves Ed25519 | Import `ed25519` from `@noble/curves/ed25519` but forget to handle the return type difference between `sign()` (Uint8Array) and `getPublicKey()` (Uint8Array) — they look the same, easy to swap | Use branded types: `type PrivateKey = Branded<Uint8Array, 'PrivateKey'>` to prevent accidental pass-through |
| bs58 | Import from `bs58` which uses `Buffer` internally in v4 and earlier | Pin `bs58` to v6+; verify with `npm list bs58` |
| Solana RPC (if ever added) | Use `fetch` directly with JSON-RPC and assume stable response shape | Never add RPC in core; keep it in an optional `@heylol/sdk-rpc` package |
| Cloudflare Workers — KV / Durable Objects | Store private keys in Worker KV | Never. KV is not encrypted at rest. Document this explicitly. |
| Vercel Edge Functions | Assume `process.env` works | Vercel Edge supports `process.env` but Cloudflare Workers does not without bindings. Use a runtime-agnostic `getEnv(key)` helper. |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-deriving public key from private key on every request | Extra 1-3ms per request in CF Workers (subtle for single requests, visible at scale) | Cache derived public key at SDK init time | At ~50 req/s sustained on cold workers |
| Creating new `Uint8Array(1232)` (max Solana tx size) for every transaction regardless of actual size | Memory pressure in Workers (128MB limit) | Allocate exact needed size using pre-computed byte length | At ~1000 concurrent requests |
| Parsing x402 header JSON in the retry interceptor on every failed request | Adds JSON.parse overhead to every 402 response | Negligible in practice; don't optimize | N/A — not a real trap at this scale |
| Base58 encoding/decoding full 64-byte keypairs repeatedly | bs58 is not cheap | Encode once at SDK init, cache as string | At high signing frequency |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting private key as hex string in SDK API | Key logged in error messages, stored in memory as string longer than needed | Accept `Uint8Array` only; convert from hex at the app boundary, not inside the SDK |
| Logging the `X-Payment` header value | Payment transaction visible in logs; replay possible within validity window | Redact all headers containing `X-Payment` in any built-in logging helpers |
| Not validating the server's `WWW-Authenticate` challenge before signing | Signing arbitrary transactions from a malicious server that spoofs hey.lol | Validate that the transaction recipient address matches known hey.lol addresses; document expected addresses |
| Caching the signed payment transaction for reuse | Payment transactions have a blockhash validity window (~60s on Solana mainnet) | Never cache signed transactions; sign fresh on every 402 response |
| Exposing private key in error objects | Key leaks in Sentry/Datadog/logs | Implement `toJSON()` on keypair objects to return only the public key; never include private key in Error messages |
| Using predictable nonce in zero-amount transaction | Replay attack on wallet identification | Use `crypto.getRandomValues()` (via noble) for any nonce field, even in dummy transactions |

---

## UX Pitfalls (SDK Developer Experience)

| Pitfall | Developer Impact | Better Approach |
|---------|-----------------|-----------------|
| Opaque error: "Transaction failed" | Developer spends hours debugging serialization | Include the serialized transaction as hex in the error, with a link to a Solana transaction inspector |
| Returning `Uint8Array` everywhere with no helper | Developers don't know how to get a base58 address | Export utility functions: `toBase58(bytes)`, `fromBase58(str)`, `toHex(bytes)` |
| Silent x402 retry without exposing payment amount | Developer can't tell how much USDC was spent | Emit a `payment` event or callback with amount, recipient, txHash before retry |
| Throwing on missing private key instead of returning Result type | Breaks async error boundaries | Use `Result<T, E>` pattern or explicit `try/catch` boundaries; never let crypto errors propagate as unhandled rejections |
| No way to dry-run / inspect what would be signed | Developer can't audit payment before it happens | Expose `buildPaymentTransaction(challenge)` as a public API, separate from `sendWithPayment()` |

---

## "Looks Done But Isn't" Checklist

- [ ] **x402 Parser:** Handles both v1 and v2 formats — verify by testing against real response fixtures from hey.lol, not synthetic ones.
- [ ] **Solana Transaction Builder:** Compact-u16 encoding tested against known byte sequences, not just "it looks right."
- [ ] **Zero-amount transaction:** Integration test against real hey.lol API, not just a mock. Servers can silently change validation.
- [ ] **CF Workers compatibility:** Package tested in a real Wrangler dev environment, not just assumed to work because no `Buffer` appears in source. Transitive dependencies may still use `Buffer`.
- [ ] **TypeScript declarations:** Run `attw` against the actual packed tarball (`npm pack`), not the source tree.
- [ ] **Subpath exports:** Test `import { X } from '@heylol/sdk/services'` in a separate TypeScript project consuming the packed tarball — not the monorepo workspace.
- [ ] **Signing correctness:** Ed25519 signature verified by an independent verifier (e.g., `@noble/curves` `verify()`) after every `sign()` call in tests.
- [ ] **Private key safety:** `console.log(sdk)` and `JSON.stringify(sdk)` do not expose the private key in their output.
- [ ] **Error messages:** Every thrown error has a `code` property for programmatic handling (not just a message string).
- [ ] **Retry cap:** x402 retry interceptor tested against a server that 402s twice in a row; verify `X402RetryExceededError` is thrown.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Buffer usage discovered post-publish | MEDIUM | Add `nodejs_compat` flag documentation; ship patch with polyfill; long-term remove Buffer in next minor |
| Solana byte layout wrong in v1.0 | HIGH | All existing integrations break silently; requires a v1.1 with breaking change to serialization; add format version to error messages to ease debugging |
| x402 header parser only handles v1 | LOW | Ship a patch; v2 parser is additive |
| Subpath exports broken for TypeScript | MEDIUM | Ship a patch release; existing JS users are unaffected but TypeScript users can't use types until update |
| Dual package hazard with singleton divergence | HIGH | Requires major version bump if CJS was shipped; add the `state.js` singleton pattern in a breaking patch |
| Private key exposed in logs | CRITICAL | Rotate all affected keys immediately; ship emergency patch with key redaction; notify affected users |
| Signed transaction cached and replayed | HIGH | Revoke/report the payments if possible; audit all signed transactions in logs; ship emergency patch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Bare crypto globals (`crypto`, `TextEncoder`) | Phase 1 — Project setup + ESLint rules | Run in CF Workers wrangler dev; no errors |
| Solana compact-u16 / byte layout | Phase 2 — Transaction builder | Byte-for-byte comparison against known fixture |
| `Buffer` in any form | Phase 1 — ESLint + build check | `grep -r "Buffer" dist/` returns empty |
| x402 header case sensitivity + v1/v2 | Phase 2 — x402 parser | Tests with real header fixtures, both formats |
| Subpath exports misconfiguration | Phase 1 — Package setup | `attw` passes against packed tarball |
| Ed25519 signature mutation | Phase 2 — Signing layer | Double-sign test verifies both outputs |
| Zero-amount blockhash rejection | Phase 2 — Dummy transaction | Integration test against real API |
| ESM/CJS dual package hazard | Phase 1 — Build tooling | No CJS output from core package |
| TypeScript declarations missing | Phase 1 (config) + Phase 5 (release) | `attw` clean on every release |
| x402 retry interceptor errors | Phase 3 — API wrappers | Mock server test with double-402 scenario |
| Private key in error objects | Phase 2 — Crypto layer | `JSON.stringify(keypair)` test shows no private bytes |
| Transaction caching | Phase 2 + Phase 3 | Code review gate: no `const` caching of signed tx |

---

## Sources

- Cloudflare Workers runtime documentation (Web Crypto API support, `nodejs_compat` flag, Buffer availability) — HIGH confidence from known CF Workers behavior
- Node.js v18 release notes and `globalThis.crypto` availability — HIGH confidence (this is a well-documented breaking point)
- `@noble/curves` and `@noble/hashes` API design and return types — HIGH confidence (reviewed source)
- Solana transaction binary format specification (compact-u16 encoding, account deduplication rules) — HIGH confidence (this is stable and well-documented in Solana docs and program library source)
- Node.js dual package hazard documentation — HIGH confidence (official Node.js docs)
- npm `exports` field and TypeScript `moduleResolution` interaction — HIGH confidence (TypeScript 4.7+ docs)
- `publint` and `are-the-types-wrong` tooling behavior — MEDIUM confidence (behavior verified from community usage patterns through Aug 2025)
- x402 protocol v1 vs v2 header differences — MEDIUM confidence (based on x402 spec and known implementations; verify against current hey.lol API responses)
- hey.lol zero-amount transaction convention — MEDIUM confidence (project-specific; based on project context that this is a real API convention, not a Solana protocol standard)

---
*Pitfalls research for: hey.lol SDK — pure JS crypto, x402, Solana serialization, multi-runtime npm*
*Researched: 2026-02-28*
