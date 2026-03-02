# Phase 2: Core Crypto and Auth - Research

**Researched:** 2026-02-28
**Domain:** Ed25519 signing, base58 key loading, x402 challenge-response, Solana transaction serialization, discriminated union errors
**Confidence:** MEDIUM-HIGH (crypto stack HIGH; x402 exact payload format MEDIUM; zero-amount dummy tx LOW — must validate against real API)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Developer can initialize client with a Solana private key (base58) | @scure/base `base58.decode()` decodes 64-byte keypair string → `Uint8Array`; `ed25519.getPublicKey(secretKey)` derives public key — both verified from official package sources |
| AUTH-02 | SDK automatically handles x402 challenge-response authentication on every API call | x402 v1/v2 header formats researched; 402 retry loop pattern documented; `X-Payment`/`PAYMENT-SIGNATURE` header construction verified |
| AUTH-03 | SDK builds zero-amount dummy Solana transaction for wallet identification | Solana legacy transaction wire format documented byte-by-byte; compact-u16 encoding scheme verified; **blockhash convention for zero-amount tx is LOW confidence — requires integration test** |
| AUTH-04 | SDK parses both x402 v1 and v2 response formats | v1: payment requirements in 402 response body as JSON; v2: payment requirements in `PAYMENT-REQUIRED` header as base64-encoded JSON; header name differences documented |
| AUTH-05 | SDK constructs valid X-Payment headers from x402 requirements | Payload structure verified: `base64(JSON({ x402Version, scheme, network, payload: { serializedTransaction } }))`; PAYMENT-SIGNATURE for v2 |
| AUTH-06 | All crypto operations use pure JS (@noble/curves, @scure/base) with zero Node.js built-ins | @noble/curves 2.0.1 and @scure/base 2.0.0 verified pure JS, zero native deps, edge-runtime safe |
| TYPE-03 | Discriminated union error types | TypeScript discriminated union pattern with `code` literal discriminant documented; error hierarchy pattern from established SDK patterns |
</phase_requirements>

---

## Summary

Phase 2 implements the cryptographic core that makes every subsequent phase work. Three technical domains must be built correctly: (1) Ed25519 key loading and signing via `@noble/curves`, (2) Solana legacy transaction serialization for the wallet identification payload, and (3) x402 challenge-response parsing and header construction. These are independent enough to build and test in isolation but are wired together into a single auth flow by the end of the phase.

The crypto stack is locked from prior research: `@noble/curves` 2.0.1 for Ed25519 signing, `@scure/base` 2.0.0 for base58 decode, both zero-dependency pure JS packages audited for web3 use. The x402 protocol structure is well-documented as a standard, and the v1/v2 format differences are clear. The **high-risk unknown** is the exact format hey.lol's facilitator expects for the Solana payment payload — specifically whether and how the zero-amount dummy transaction must be structured (blockhash, instruction set, account structure). This must be validated against the real API before `src/auth/x402.ts` is written, not after.

The discriminated union error types (TYPE-03) are straightforward TypeScript — define a base `HeyLolError` with a `code` string literal discriminant, extend it to `AuthError`, `PaymentRejectedError`, etc. The only decision is whether to use class inheritance (simpler try/catch) or plain objects (simpler narrowing). Class inheritance is recommended — it matches the established pattern of Stripe, Anthropic, and other TypeScript SDKs.

**Primary recommendation:** Build in this order: (1) keypair loading, (2) discriminated union errors, (3) Solana tx serializer with byte-level tests, (4) x402 parser for both v1/v2, (5) X-Payment header builder, (6) integration test against real hey.lol API to validate zero-amount tx format before finalizing implementation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@noble/curves` | `2.0.1` | Ed25519 signing, public key derivation | Zero native deps, audited by Cure53, only correct pure-JS choice for edge runtimes. v2 is current stable (released ~Aug 2025). Exposes `@noble/curves/ed25519.js` as tree-shakeable subpath. |
| `@scure/base` | `2.0.0` | Base58 decode for private key input, base64 encode for header payload | Zero deps, same audit family as @noble, handles base58/base64/bech32/base16 in one package. v2 released Aug 2025. |
| `@x402/core` | `2.5.0` | x402 TypeScript types and header parsing utilities | Coinbase's lowest-level x402 package, 881KB unpacked, only dep is `zod`. Provides type definitions for `PaymentRequirements`, `PaymentPayload`, `PaymentRequirements`. Published 3 days ago — actively maintained. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@noble/hashes` | `2.0.1` | SHA-256, SHA-512 (transitive dep of @noble/curves) | Already installed as peer dep of @noble/curves — no extra install needed. Use for any hashing needs. |
| `vitest` | catalog pin | Byte-level fixture testing for transaction serialization | Already in catalog. Use `expect(bytes).toEqual(new Uint8Array([...]))` for byte-level assertions. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@noble/curves/ed25519.js` | `@noble/ed25519` (standalone) | The standalone package is smaller but fewer features. @noble/curves is recommended when you also need hashing utilities (which @noble/hashes provides as a dep). For this phase, @noble/curves is already decided. |
| `@scure/base` | `bs58` | bs58 v6+ works but adds `base-x` as a dependency. @scure/base is zero-dep and from the same audit family. Already decided in prior research. |
| `@x402/core` | Raw x402 type definitions | Reinventing types that @x402/core already provides correctly. @x402/core is 881KB but only its type imports are used — zero runtime code if using type-only imports. |
| Class-based errors | Plain object discriminated unions | Classes allow `instanceof` checks and `try { } catch(e) { if (e instanceof AuthError) }` pattern. Plain objects allow better tree-shaking. SDK precedent (Stripe, Anthropic) uses classes. Use classes. |

**Installation:**
```bash
# Add to packages/sdk runtime deps
pnpm add @noble/curves @scure/base @x402/core --filter @heylol/sdk
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/sdk/src/
├── index.ts                    # Re-exports: HeyLolClient, error types, key utilities
├── services.ts                 # Re-exports: services subpath (unchanged from Phase 1 stub)
├── auth/
│   ├── keypair.ts              # loadKeypair(base58: string) → { secretKey, publicKey }
│   ├── solana.ts               # buildPaymentTransaction(...) → Uint8Array (the dummy tx builder)
│   ├── x402.ts                 # parsePaymentRequirements(), buildPaymentHeader()
│   └── index.ts                # Re-exports auth module
├── errors/
│   └── index.ts                # HeyLolError, AuthError, PaymentRejectedError, NetworkError
└── types/
    ├── x402.ts                 # PaymentRequirements, PaymentPayload, X402Header local types
    └── index.ts                # Re-exports types
```

**File isolation rationale:**
- `auth/keypair.ts` is pure crypto — test without x402 knowledge
- `auth/solana.ts` is pure serialization — test byte-by-byte without network
- `auth/x402.ts` is the only file that requires hey.lol API knowledge — isolate LOW confidence code here
- `errors/index.ts` has no dependencies — build first, everything else can import from it

### Pattern 1: Keypair Loading from Base58

**What:** Decode base58 private key string to `Uint8Array` (64 bytes: 32-byte secret + 32-byte public), derive the 32-byte public key.
**When to use:** At SDK initialization — once, cached for all subsequent operations.
**Source:** Verified from @scure/base v2.0.0 and @noble/curves v2.0.1 README

```typescript
// Source: @scure/base v2.0.0 API + @noble/curves v2.0.1 README
import { base58 } from '@scure/base';
import { ed25519 } from '@noble/curves/ed25519.js';

export interface Keypair {
  readonly secretKey: Uint8Array; // 32 bytes
  readonly publicKey: Uint8Array; // 32 bytes
}

export function loadKeypair(privateKeyBase58: string): Keypair {
  const decoded = base58.decode(privateKeyBase58);

  // Solana CLI keypairs are 64-byte: first 32 = secret, last 32 = public
  // Phantom/Backpack export the same format
  if (decoded.length === 64) {
    const secretKey = decoded.slice(0, 32);
    const publicKey = decoded.slice(32, 64);
    return { secretKey, publicKey };
  }

  // Some exporters give only the 32-byte secret key
  if (decoded.length === 32) {
    const secretKey = decoded;
    const publicKey = ed25519.getPublicKey(secretKey);
    return { secretKey, publicKey };
  }

  throw new AuthError({
    code: 'INVALID_PRIVATE_KEY',
    message: `Expected 32 or 64 byte base58 private key, got ${decoded.length} bytes`,
  });
}
```

**Key facts verified:**
- `base58.decode()` returns `Uint8Array` (not Buffer) in @scure/base v2
- `ed25519.getPublicKey(secretKey)` accepts `Uint8Array` and returns `Uint8Array` (32 bytes)
- Solana CLI keypair files (`~/.config/solana/id.json`) are JSON arrays of 64 numbers — the base58 export from Phantom/Solflare encodes the same 64-byte structure

### Pattern 2: Ed25519 Signing

**What:** Sign a `Uint8Array` message with a 32-byte secret key.
**When to use:** Signing the Solana transaction message bytes.
**Source:** Verified from @noble/curves v2.0.1 GitHub README

```typescript
// Source: https://github.com/paulmillr/noble-curves (v2.0.1)
import { ed25519 } from '@noble/curves/ed25519.js';

export function signMessage(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  // sign() hashes the message internally (SHA-512) before signing
  // Returns 64-byte Uint8Array signature
  return ed25519.sign(message, secretKey);
}

// Verification (for tests)
export function verifySignature(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return ed25519.verify(signature, message, publicKey);
}
```

**Breaking changes from v1.x to v2.0 (important):**
- Import path requires `.js` extension: `@noble/curves/ed25519.js` not `@noble/curves/ed25519`
- `privateKey` renamed to `secretKey` everywhere in v2
- `sign()` now expects `Uint8Array` — string hex inputs are prohibited in v2
- `randomPrivateKey` renamed to `randomSecretKey` in v2 utils

### Pattern 3: Solana Legacy Transaction Wire Format

**What:** Manually serialize a Solana transaction to bytes without web3.js.
**When to use:** Building the zero-amount dummy transaction for wallet identification.
**Source:** Verified from https://solana.com/docs/core/transactions/transaction-structure + Hugh Do's implementation guide

**Wire format (byte layout):**

```
[compact-u16: num signatures] [64 bytes: signature] ...
[1 byte: num_required_signatures]
[1 byte: num_readonly_signed_accounts]
[1 byte: num_readonly_unsigned_accounts]
[compact-u16: num account keys] [32 bytes: account pubkey] ...
[32 bytes: recent blockhash]
[compact-u16: num instructions]
  Per instruction:
    [1 byte: program_id_index]
    [compact-u16: num account indices]
    [1 byte: account_index] ...
    [compact-u16: data length]
    [N bytes: instruction data]
```

**Compact-u16 encoding:**
- Values 0-127: encoded as 1 byte
- Values 128-16383: encoded as 2 bytes (low byte with MSB set, high byte)
- NOT standard protobuf varint — Solana's is little-endian in the low byte with bit 7 as continuation

```typescript
// Source: Verified from Solana transaction-structure docs
function encodeCompactU16(value: number): Uint8Array {
  if (value < 0 || value > 65535) throw new Error('compact-u16 out of range');
  if (value <= 0x7f) return new Uint8Array([value]);
  if (value <= 0x3fff) {
    return new Uint8Array([
      (value & 0x7f) | 0x80, // low 7 bits + continuation bit
      value >> 7,             // high bits
    ]);
  }
  // 3-byte case (values 16384–65535)
  return new Uint8Array([
    (value & 0x7f) | 0x80,
    ((value >> 7) & 0x7f) | 0x80,
    value >> 14,
  ]);
}
```

**Zero-amount dummy transaction structure (LOW CONFIDENCE — validate against real API):**

Based on prior research and the x402 Solana payload convention, the dummy transaction:
- Is a legacy (non-versioned) Solana transaction
- Has 1 signer (the client's public key)
- The recent blockhash is `[0, 0, ..., 0]` (32 zero bytes) — LOW CONFIDENCE that hey.lol accepts this
- Has a minimal instruction set (possibly a no-op system program call or memo instruction)
- The client signs the serialized message bytes
- The signed transaction is base64-encoded for the X-Payment payload

```typescript
// Minimal zero-amount dummy transaction builder
// WARNING: blockhash convention is LOW CONFIDENCE — validate against hey.lol API
export function buildDummyTransaction(
  signerPublicKey: Uint8Array, // 32 bytes
  secretKey: Uint8Array,       // 32 bytes
  recentBlockhash: Uint8Array = new Uint8Array(32), // all zeros as placeholder
): Uint8Array {
  // Message header: 1 required sig, 0 readonly signed, 1 readonly unsigned (system program)
  const header = new Uint8Array([1, 0, 1]);

  // Account keys: [signer, system_program_id]
  const SYSTEM_PROGRAM = new Uint8Array(32); // all zeros = system program
  const accountKeys = new Uint8Array([
    ...encodeCompactU16(2),
    ...signerPublicKey,
    ...SYSTEM_PROGRAM,
  ]);

  // Empty instruction (no-op): program_id_index=1, no accounts, no data
  const instructions = new Uint8Array([
    ...encodeCompactU16(1), // 1 instruction
    1,                      // program_id_index = system program (index 1)
    ...encodeCompactU16(0), // 0 accounts
    ...encodeCompactU16(0), // 0 data bytes
  ]);

  // Assemble message (what gets signed)
  const message = new Uint8Array([
    ...header,
    ...accountKeys,
    ...recentBlockhash,     // 32 bytes
    ...instructions,
  ]);

  // Sign the message
  const signature = ed25519.sign(message, secretKey);

  // Prepend signatures array
  return new Uint8Array([
    ...encodeCompactU16(1), // 1 signature
    ...signature,           // 64 bytes
    ...message,
  ]);
}
```

### Pattern 4: x402 v1/v2 Response Parsing

**What:** Parse a 402 HTTP response to extract payment requirements, handling both v1 (body) and v2 (header) formats.
**When to use:** After receiving a 402 response from hey.lol.
**Source:** Verified from migration guide at docs.cdp.coinbase.com/x402/migration-guide + 7blocklabs.com x402 explainer

**v1 format:**
- 402 body is JSON: `{ x402Version: 1, accepts: [{ scheme, network, ... }] }`
- Request header for payment: `X-Payment: <base64-encoded JSON>`
- Response header after payment: `X-Payment-Response: <base64-encoded JSON>`

**v2 format:**
- 402 body is empty or plain text error description
- 402 response header: `PAYMENT-REQUIRED: <base64-encoded JSON with payment requirements>`
- Request header for payment: `PAYMENT-SIGNATURE: <base64-encoded JSON>`
- Response header after payment: `PAYMENT-RESPONSE: <base64-encoded JSON>`
- Network identifiers use CAIP-2 format: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` not `"solana-mainnet"`

```typescript
// Source: Migration guide + 7blocklabs.com x402 explainer
// Headers API always returns lowercase header names
export function parsePaymentRequirements(response: Response): PaymentRequirements[] {
  // Try v2 first: PAYMENT-REQUIRED header
  const v2Header = response.headers.get('payment-required'); // Fetch API lowercases
  if (v2Header) {
    const decoded = JSON.parse(atob(v2Header));
    return decoded.accepts; // array of PaymentRequirements
  }

  // Fallback to v1: body JSON
  // Note: body must be cloned before reading if response may be consumed elsewhere
  // The caller is responsible for passing the cloned response
  return []; // actual parsing deferred to implementation — body read is async
}

// Header name constants — both cases must be handled
export const PAYMENT_HEADER = {
  // v2 names (current standard)
  REQUIRED: 'payment-required',
  SIGNATURE: 'payment-signature',
  RESPONSE: 'payment-response',
  // v1 names (legacy fallback)
  V1_PAYMENT: 'x-payment',
  V1_RESPONSE: 'x-payment-response',
} as const;
```

**Case sensitivity note:** The Fetch API's `Headers.get()` normalizes all header names to lowercase. Always use `.get()` on a `Headers` object, never bracket notation on a plain object (which is case-sensitive in Node.js `req.headers`).

### Pattern 5: X-Payment Header Construction

**What:** Build the base64-encoded JSON payload for the payment header.
**When to use:** After parsing payment requirements and building the signed transaction.
**Source:** Verified from Solana x402 guide + 7blocklabs.com

**Payload structure (applies to both v1 X-Payment and v2 PAYMENT-SIGNATURE):**

```typescript
// Source: solana-com/apps/docs/content/guides/getstarted/intro-to-x402.mdx
// + 7blocklabs.com x402 explainer
interface PaymentPayload {
  x402Version: number;         // 1 for v1 response, 2 for v2 response
  scheme: string;              // e.g., "exact"
  network: string;             // v1: "solana-mainnet" | v2: CAIP-2 "solana:5eykt4..."
  payload: {
    serializedTransaction: string; // base64-encoded signed Solana transaction bytes
  };
}

export function buildPaymentHeader(
  requirements: PaymentRequirements,
  signedTx: Uint8Array,
  version: 1 | 2 = 1,
): string {
  const paymentPayload: PaymentPayload = {
    x402Version: version,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      serializedTransaction: btoa(String.fromCharCode(...signedTx)),
    },
  };

  return btoa(JSON.stringify(paymentPayload));
}
```

**Important:** Use `btoa()` for base64 encoding — universally available in all target runtimes (browsers, CF Workers, Node 18+, Deno, Bun). Never use `Buffer.from(...).toString('base64')`.

### Pattern 6: Discriminated Union Error Types (TYPE-03)

**What:** Define a typed error hierarchy with a `code` literal string discriminant that TypeScript can narrow.
**When to use:** All errors thrown by the SDK.
**Source:** Established SDK pattern (Stripe, Anthropic TypeScript SDKs); TypeScript discriminated union docs

```typescript
// src/errors/index.ts

// Base error — all SDK errors extend this
export class HeyLolError extends Error {
  readonly code: string;

  constructor({ code, message }: { code: string; message: string }) {
    super(message);
    this.name = 'HeyLolError';
    this.code = code;
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    // NEVER include private key in JSON representation
    return { name: this.name, code: this.code, message: this.message };
  }
}

// Auth errors — Phase 2 responsibility
export class AuthError extends HeyLolError {
  readonly code:
    | 'INVALID_PRIVATE_KEY'
    | 'KEY_DECODE_FAILED'
    | 'SIGNING_FAILED'
    | 'X402_PARSE_FAILED'
    | 'TRANSACTION_BUILD_FAILED';

  constructor(args: { code: AuthError['code']; message: string }) {
    super(args);
    this.name = 'AuthError';
  }
}

// Payment rejection — happens when payment is sent but facilitator rejects it
export class PaymentRejectedError extends HeyLolError {
  readonly code: 'PAYMENT_REJECTED' | 'INSUFFICIENT_FUNDS' | 'INVALID_SIGNATURE' | 'AMOUNT_MISMATCH';
  readonly reason?: string;

  constructor(args: { code: PaymentRejectedError['code']; message: string; reason?: string }) {
    super(args);
    this.name = 'PaymentRejectedError';
    this.reason = args.reason;
  }
}

// Network errors (for Phase 3, defined now for completeness)
export class NetworkError extends HeyLolError {
  readonly code: 'FETCH_FAILED' | 'TIMEOUT' | 'RATE_LIMITED';
  readonly statusCode?: number;

  constructor(args: { code: NetworkError['code']; message: string; statusCode?: number }) {
    super(args);
    this.name = 'NetworkError';
    this.statusCode = args.statusCode;
  }
}

// Type union for exhaustive narrowing
export type SdkError = AuthError | PaymentRejectedError | NetworkError;

// Type guard for narrowing in catch blocks
export function isSdkError(e: unknown): e is SdkError {
  return e instanceof HeyLolError;
}
```

**Why classes over plain objects:** `instanceof` checks work in catch blocks without type predicates. The `Object.setPrototypeOf(this, new.target.prototype)` call is required to make `instanceof` work correctly when extending built-in `Error` in TypeScript/ES5 targets.

### Anti-Patterns to Avoid

- **Using Buffer for base64/hex encoding:** `Buffer.from(bytes).toString('base64')` breaks in CF Workers. Use `btoa(String.fromCharCode(...bytes))` for small payloads or a `Uint8Array`-to-base64 utility.
- **Importing `@noble/curves/ed25519` without the `.js` extension:** v2 requires explicit ESM file extensions. `@noble/curves/ed25519` (no `.js`) will fail in pure ESM environments. Always use `@noble/curves/ed25519.js`.
- **Caching signed transactions for reuse:** Solana transaction signatures are tied to a specific blockhash. For zero-amount dummy transactions with a static blockhash this is less of a concern, but caching creates subtle replay risk. Sign fresh each time.
- **Using string concatenation for byte arrays:** Never do `hexStr += byte.toString(16)`. Build `Uint8Array` directly with `new Uint8Array([...])` or `set()`.
- **Not copying signature bytes before embedding in transaction buffer:** `@noble/curves` returns a new `Uint8Array` each call, but if the reference is passed to `txBuffer.set(sig, offset)`, it works in the normal case. Still use `.slice()` defensively to prevent aliasing issues.
- **Accessing 402 response headers with bracket notation:** `response.headers['x-payment']` returns `undefined` because `Headers` is an object, not a map. Always use `response.headers.get('x-payment')`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Base58 decode | Custom base58 alphabet decoder | `@scure/base` `base58.decode()` | O(n²) complexity pitfalls; alphabet selection bugs; @scure/base handles Solana's specific alphabet correctly |
| Ed25519 signing | WebCrypto `SubtleCrypto.sign` with ECDH | `@noble/curves/ed25519.js` | Web Crypto API's Ed25519 support is not universally available in CF Workers (as of 2025); @noble/curves is pure JS and works everywhere |
| Base64 encode/decode from Uint8Array | Custom bit-shifting encoder | `btoa`/`atob` with a Uint8Array adapter | Single-line helpers; built into every target runtime |
| compact-u16 encoding | Skip implementing and hardcode 1-byte arrays | Implement `encodeCompactU16()` correctly | Hardcoding breaks for >127 accounts; compact-u16 is not optional — it's in the wire format specification |
| x402 type definitions | Redefine `PaymentRequirements`, `PaymentPayload` interfaces | Import from `@x402/core` | @x402/core is Coinbase's reference implementation; type definitions are kept in sync with the protocol spec |

**Key insight:** The Solana transaction serializer is the only component that must be hand-rolled — because the full `@solana/web3.js` is forbidden (Node.js deps) and the `@solana/kit` transaction packages are edge-compatible but still pull in `@solana/errors` and other sub-packages. For a transaction that is ~100 bytes and has a fixed structure, a bespoke serializer is < 50 lines and fully testable at the byte level. The alternative (@solana/transactions) is correct but adds ~3 sub-packages to the dependency tree.

---

## Common Pitfalls

### Pitfall 1: @noble/curves v2 Breaking Changes from v1.x

**What goes wrong:** Code written for @noble/curves v1.x silently fails or throws type errors with v2.0.1 because of renamed identifiers and prohibited string inputs.
**Why it happens:** v2 was a major refactor (released ~Aug 2025). Many tutorials and Stack Overflow answers reference v1.x patterns.
**How to avoid:** Use only these verified v2 APIs:
- Import: `import { ed25519 } from '@noble/curves/ed25519.js'` (`.js` required)
- Key generation: `ed25519.keygen()` returns `{ secretKey, publicKey }` (not `privateKey`)
- Signing: `ed25519.sign(message, secretKey)` — `secretKey` not `privateKey`
- Public key derivation: `ed25519.getPublicKey(secretKey)`
- All inputs must be `Uint8Array` — string hex rejected in v2
**Warning signs:** Any code using `privateKey` parameter name, any string passed to `sign()`, any import without `.js` extension.

### Pitfall 2: x402 Header Case Sensitivity

**What goes wrong:** `response.headers['X-Payment']` returns `undefined`. The parser branch for v1 never runs.
**Why it happens:** Fetch API `Headers` object normalizes names to lowercase; bracket property access on it doesn't call `.get()`.
**How to avoid:** Always use `response.headers.get('payment-required')` — lowercase — never bracket notation. Test parser with real fixture headers from the hey.lol API.
**Warning signs:** Any `headers['X-Payment']` or `headers['PAYMENT-REQUIRED']` in code.

### Pitfall 3: Solana compact-u16 Encoding

**What goes wrong:** Transaction serializer encodes array lengths as standard protobuf varints, producing transactions that look valid but are rejected as malformed.
**Why it happens:** Solana's compact-u16 uses a different bit layout than protobuf varints in the 2-byte case. The docs describe it but the difference is subtle.
**How to avoid:** Write `encodeCompactU16()` as a standalone tested function. Add explicit unit tests: `encodeCompactU16(0) === [0x00]`, `encodeCompactU16(127) === [0x7f]`, `encodeCompactU16(128) === [0x80, 0x01]`, `encodeCompactU16(255) === [0xff, 0x01]`.
**Warning signs:** Any inline number-to-bytes conversion in the transaction serializer.

### Pitfall 4: btoa() with Uint8Array Containing Values > 127

**What goes wrong:** `btoa(String.fromCharCode(...bytes))` fails with `InvalidCharacterError` for bytes > 127 when the string contains characters outside the Latin-1 range.
**Why it happens:** `btoa()` only accepts Latin-1 strings. `String.fromCharCode()` produces the right code points for bytes 0-255, but if any byte is treated as a multi-byte UTF-16 character, `btoa` rejects it.
**How to avoid:** Use `String.fromCharCode(...new Uint8Array(bytes))` explicitly with spread to force single code points. For larger Uint8Arrays (>100KB) use chunked approach to avoid stack overflow in spread. The transaction is always well under 1232 bytes so this is not a concern here.
**Warning signs:** Any `btoa(bytes.toString())` or `btoa(new TextDecoder().decode(bytes))`.

### Pitfall 5: Zero-Amount Blockhash Convention — LOW CONFIDENCE

**What goes wrong:** The dummy transaction with all-zeros blockhash is rejected by hey.lol's facilitator, causing the entire auth flow to fail on the first API call.
**Why it happens:** The zero-amount convention is hey.lol-specific, not a Solana protocol standard. The facilitator's validation rules are not publicly documented. Some facilitators explicitly check that blockhash !== all-zeros.
**How to avoid:** This MUST be validated against the real API in an integration test before `src/auth/x402.ts` is finalized. If all-zeros is rejected, the fallback is to use a static "fake" valid-looking blockhash (any 32 non-zero bytes) or request a recent blockhash from a Solana RPC endpoint at SDK init time.
**Warning signs:** No integration test for zero-amount flow against the real hey.lol API before releasing Phase 2.

### Pitfall 6: Ed25519 Signature Mutation via Shared Reference

**What goes wrong:** Signing the same message twice in rapid succession produces a corrupted second signature because the first signature's `Uint8Array` reference was aliased into the transaction buffer.
**Why it happens:** `Uint8Array` is mutable. If the returned signature reference is reused without copying (`.slice()`), subsequent writes to the same buffer position corrupt it.
**How to avoid:** Always use `txBuffer.set(sig.slice(), offset)` when embedding the signature. Write a test that signs two different messages with the same key back-to-back and verifies both signatures independently.
**Warning signs:** Any `txBuffer.set(sig, offset)` without `.slice()`.

### Pitfall 7: `Object.setPrototypeOf` Missing on Custom Errors

**What goes wrong:** `instanceof AuthError` returns `false` even when the error was created with `new AuthError()`. `catch (e) { if (e instanceof AuthError)` never matches.
**Why it happens:** TypeScript compiles `class X extends Error` to ES5 code that loses the prototype chain when `target` is `ES5`. The `instanceof` check fails because the prototype is `Error.prototype` not `AuthError.prototype`.
**How to avoid:** Include `Object.setPrototypeOf(this, new.target.prototype)` in every custom error constructor. Alternatively, set `"target": "ES2015"` in tsconfig (class inheritance is native in ES2015 and doesn't have this issue).
**Warning signs:** Any custom Error class without `Object.setPrototypeOf`; tsconfig `target` lower than `"ES2015"`.

---

## Code Examples

Verified patterns from official sources:

### @scure/base: Base58 Decode

```typescript
// Source: https://github.com/paulmillr/scure-base (v2.0.0)
import { base58 } from '@scure/base';

const encoded = '5MaiiCavjCmn9Hs1o3eznqDEhRwxo7pXiAYez7keQUviUkauRiTMD8DrESdrNjN8zd9mTmVjJAs2X26q2qDBhfY';
const decoded = base58.decode(encoded); // Uint8Array (64 bytes for Solana keypair)
```

### @noble/curves: Ed25519 Sign and Verify

```typescript
// Source: https://github.com/paulmillr/noble-curves (v2.0.1)
import { ed25519 } from '@noble/curves/ed25519.js';

const secretKey = new Uint8Array(32); // 32-byte private key
const message = new Uint8Array([1, 2, 3]); // message to sign

const signature = ed25519.sign(message, secretKey);     // 64-byte Uint8Array
const publicKey = ed25519.getPublicKey(secretKey);       // 32-byte Uint8Array
const isValid = ed25519.verify(signature, message, publicKey); // boolean
```

### btoa/atob for Uint8Array (edge-safe base64)

```typescript
// No external dep needed — btoa/atob available in all target runtimes
// Node.js 18+, CF Workers, Deno, Bun, browsers

// Encode Uint8Array → base64 string
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// Decode base64 string → Uint8Array
function base64ToUint8Array(b64: string): Uint8Array {
  return new Uint8Array(
    atob(b64).split('').map(c => c.charCodeAt(0))
  );
}
```

### Discriminated Union Error Narrowing in Consumer Code

```typescript
import { isSdkError, AuthError, PaymentRejectedError } from '@heylol/sdk';

try {
  const result = await client.posts.list();
} catch (e) {
  if (e instanceof AuthError) {
    console.error(`Auth failed [${e.code}]: ${e.message}`);
  } else if (e instanceof PaymentRejectedError) {
    console.error(`Payment rejected [${e.code}]: ${e.reason}`);
  } else {
    throw e; // re-throw unknown errors
  }
}
```

### x402 Header Name Detection (v1/v2)

```typescript
// Detect x402 version from response headers and parse requirements
function getPaymentVersion(response: Response): 1 | 2 | null {
  if (response.status !== 402) return null;
  // v2: payment requirements in header
  if (response.headers.get('payment-required')) return 2;
  // v1: payment requirements in body (content-type: application/json)
  if (response.headers.get('content-type')?.includes('application/json')) return 1;
  return null;
}
```

### Vitest Byte-Level Testing Pattern

```typescript
// Byte-level test for compact-u16 encoding
import { describe, it, expect } from 'vitest';
import { encodeCompactU16 } from '../src/auth/solana.ts';

describe('encodeCompactU16', () => {
  it('encodes 0 as single zero byte', () => {
    expect(encodeCompactU16(0)).toEqual(new Uint8Array([0x00]));
  });
  it('encodes 127 as single byte', () => {
    expect(encodeCompactU16(127)).toEqual(new Uint8Array([0x7f]));
  });
  it('encodes 128 as two bytes with continuation bit', () => {
    expect(encodeCompactU16(128)).toEqual(new Uint8Array([0x80, 0x01]));
  });
  it('encodes 255 correctly', () => {
    expect(encodeCompactU16(255)).toEqual(new Uint8Array([0xff, 0x01]));
  });
  it('encodes 300 correctly', () => {
    expect(encodeCompactU16(300)).toEqual(new Uint8Array([0xac, 0x02]));
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@noble/curves/ed25519` (no extension) | `@noble/curves/ed25519.js` (with extension) | @noble/curves v2.0.0 (Aug 2025) | Required in strict ESM; skip `.js` → silent failures in some bundlers |
| `privateKey` parameter in @noble/curves | `secretKey` parameter | @noble/curves v2.0.0 | All v1.x code must update variable names |
| x402 payment requirements in 402 body (v1) | `PAYMENT-REQUIRED` header as base64 JSON (v2) | x402 v2 launch (Dec 2025) | SDK must handle both; v1 still in use during transition |
| `X-Payment` / `X-Payment-Response` headers | `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE` headers | x402 v2 launch (Dec 2025) | Both must be supported; test with real API to see what hey.lol returns |
| Network identifiers like `"solana-mainnet"` | CAIP-2 format `"solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"` | x402 v2 launch (Dec 2025) | Parser must handle both formats; v1 servers still use string names |
| String inputs to @noble/curves | Uint8Array inputs only | @noble/curves v2.0.0 | Any string-based crypto code breaks at runtime |

**Deprecated/outdated:**
- `@noble/curves v1.x`: Still on npm but v2.0.1 is latest. New code should use v2. If 1.x code exists in the repo, `randomPrivateKey` → `randomSecretKey`, add `.js` to import, `privateKey` → `secretKey`.
- `tweetnacl`: Last published 2021, no tree-shaking, not audited for web3 context. Do not use.
- `@solana/web3.js v1`: Deprecated by Solana Foundation, pulls in 15+ Node.js-incompatible deps. Do not use.
- `bs58 < v6`: Uses `Buffer` internally. Pin to v6+ or use `@scure/base` (recommended).

---

## Open Questions

1. **Exact hey.lol x402 payload format (LOW CONFIDENCE)**
   - What we know: Standard x402 Solana payload has `{ x402Version, scheme, network, payload: { serializedTransaction: base64 } }`. The transaction is a partially-signed Solana transaction.
   - What's unclear: Does hey.lol use v1 or v2 response format? What network identifier string does it use? Does it accept the `x-payment` or `payment-signature` header? What does the zero-amount transaction look like to their facilitator?
   - Recommendation: **Write a raw `fetch` probe against `https://api.hey.lol` before implementing `src/auth/x402.ts`.** Capture the raw 402 response headers and body. Build fixture files from real responses. Only then implement the parser.

2. **Zero-amount transaction blockhash convention (LOW CONFIDENCE)**
   - What we know: The dummy transaction for wallet identification must be a valid Solana transaction structure. The blockhash field is 32 bytes. No Solana protocol restriction on all-zeros blockhash value.
   - What's unclear: Does hey.lol's facilitator validate that the blockhash is non-zero? Does it require a recent blockhash from mainnet? Does it use a memo instruction, system program noop, or something else for the instruction?
   - Recommendation: **Integration test against real API is mandatory before this is considered done.** If all-zeros blockhash is rejected, fall back to a static non-zero 32-byte value (e.g., `Uint8Array.from({length: 32}, (_, i) => i + 1)`).

3. **@x402/core import strategy**
   - What we know: @x402/core 2.5.0 provides TypeScript types for x402. It only dep is `zod@^3.24.2`.
   - What's unclear: Whether the type-only imports from @x402/core survive tree-shaking and don't add runtime code to the bundle. Whether the types match the exact fields hey.lol returns.
   - Recommendation: Use `import type { PaymentRequirements } from '@x402/core'` (type-only import). Verify types match real API response fixtures before trusting them. Check bundle size impact with size-limit.

4. **64-byte vs 32-byte private key input (AUTH-01 scope)**
   - What we know: Solana CLI exports 64-byte base58 keypairs (secret + public concatenated). Phantom/Backpack export the same format. Some wallet exporters give only the 32-byte secret.
   - What's unclear: What format does hey.lol's onboarding flow tell developers to use?
   - Recommendation: Accept both 32-byte and 64-byte inputs. Detect by length after base58 decode. If 64 bytes, split. If 32 bytes, derive public key.

5. **@noble/curves v2 bundle size impact**
   - What we know: @noble/curves v1.6 was ~25KB minified for ed25519 subpath. v2.0.1 may differ.
   - What's unclear: Whether size-limit will flag the core bundle after adding @noble/curves + @scure/base + @x402/core types.
   - Recommendation: Run size-limit check in CI from the first commit in this phase. The 100KB budget should be sufficient but confirm early.

---

## Sources

### Primary (HIGH confidence)

- `@noble/curves` v2.0.1 GitHub README — Ed25519 API, import paths, v2 breaking changes: https://github.com/paulmillr/noble-curves
- `@noble/curves` v2.0.0 release notes — full breaking change list: https://github.com/paulmillr/noble-curves/releases/tag/2.0.0
- `@scure/base` v2.0.0 GitHub README — base58.decode() API: https://github.com/paulmillr/scure-base
- `npm info @noble/curves` — version 2.0.1, deps: @noble/hashes@2.0.1 (verified 2026-02-28)
- `npm info @scure/base` — version 2.0.0, zero deps (verified 2026-02-28)
- `npm info @x402/core` — version 2.5.0, dep: zod@^3.24.2 (verified 2026-02-28)
- Solana transaction structure documentation — wire format, message header, compact-u16: https://solana.com/docs/core/transactions/transaction-structure
- Hugh Do's "Create a Solana transaction without client libraries" — practical byte-level implementation guide: https://www.hughdo.dev/blog/create-a-solana-transaction-without-using-any-client-libraries

### Secondary (MEDIUM confidence)

- x402 v1→v2 migration guide at docs.cdp.coinbase.com — header name changes, PAYMENT-REQUIRED format: verified against search results from multiple sources
- 7blocklabs.com x402 SDK embedding guide — X-Payment payload structure, v1/v2 handling pattern: https://www.7blocklabs.com/blog/embedding-x402-in-sdks-making-pay-required-developer-friendly
- Solana x402 intro guide at solana.com — `{ serializedTransaction: base64 }` payload structure inside x402 payload.payload field: https://solana.com/developers/guides/getstarted/intro-to-x402
- JSR @noble/curves — version 2.0.1 confirmed, method signatures confirmed: https://jsr.io/@noble/curves
- Prior research STACK.md and ARCHITECTURE.md — stack decisions and architecture from project setup phase (2026-02-28)
- Prior research PITFALLS.md — pitfalls 2, 4, 6, 7 directly relevant to this phase (2026-02-28)

### Tertiary (LOW confidence — flag for validation)

- x402 zero-amount dummy transaction blockhash convention — no official documentation found; inferred from prior research ARCHITECTURE.md pattern 5 (hey.lol-specific convention)
- Exact hey.lol facilitator payload format — not publicly documented; must be verified against real API
- Whether hey.lol uses x402 v1 or v2 response format — inferred from "hey.lol uses @openfacilitator/sdk" (from hey.lol/developers page) which is not a public package; unclear

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry on 2026-02-28; API methods verified from GitHub source
- Architecture patterns: HIGH for keypair loading, error types; MEDIUM for x402 parsing (standard is clear, hey.lol-specific behavior is not)
- Solana tx serializer: HIGH for wire format spec; LOW for zero-amount dummy tx convention
- Pitfalls: HIGH — all pitfalls either verified from official docs or from prior project research

**Research date:** 2026-02-28
**Valid until:** 2026-04-28 (60 days — @noble/curves and x402 protocol are active; hey.lol-specific format must be validated against real API at implementation time regardless of research freshness)
