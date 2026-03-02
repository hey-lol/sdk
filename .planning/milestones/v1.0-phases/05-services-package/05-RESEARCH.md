# Phase 5: Services Package - Research

**Researched:** 2026-03-01
**Domain:** x402 server-side payment verification, settlement, 402 response generation, typed service wrappers, service caller integration
**Confidence:** MEDIUM-HIGH (x402/core server APIs verified from unpkg source; facilitator flow MEDIUM; Solana SVM settlement pattern MEDIUM; `client.services.call()` API is heylol-specific — no public spec found — LOW)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SVC-01 | Developer can call an x402 service with typed input/output | `client.services.call()` must be added to `HeyLolClient` — pattern follows existing `PostsResource` delegation model; no reference for exact hey.lol service API endpoint format — needs investigation |
| SVC-02 | Developer can register a service with price and schema | `services.register()` in `@heylol/services` — builds a `ServiceDefinition` object with price config, schema, and network; mirrors `paymentMiddleware` config from `@x402/express` |
| SVC-03 | Developer can verify incoming x402 payment headers | `verifyPayment(header, requirements)` → typed `VerifyResult` — delegates to `HTTPFacilitatorClient.verify()` from `@x402/core/server`; decoding via `decodePaymentSignatureHeader` from `@x402/core/http` |
| SVC-04 | Developer can settle payments on-chain | `settlePayment(payload, requirements)` → `SettleResult` — delegates to `HTTPFacilitatorClient.settle()` from `@x402/core/server` |
| SVC-05 | Developer can generate 402 Payment Required responses | `create402Response(requirements)` → `Response` — encodes requirements via `encodePaymentRequiredHeader` from `@x402/core/http`, returns a `new Response(null, { status: 402, headers })` |
| SVC-06 | Service handler wrapper (createX402Service) bundles verify + settle + handler | `createX402Service(definition, handler)` — the orchestrator: extracts payment header, calls verify, calls handler, calls settle, returns response with PAYMENT-RESPONSE header |
</phase_requirements>

---

## Summary

Phase 5 builds the server-side complement to Phase 2-4's client-side implementation. Where the earlier phases made hey.lol API calls as a paying client, Phase 5 creates the tooling for developers to *receive* x402 payments — registering a service, verifying incoming payment headers, settling on-chain via a facilitator, and generating properly-structured 402 responses.

The core building blocks are already in the npm ecosystem. `@x402/core` (v2.5.0) provides `HTTPFacilitatorClient` for verify/settle, `encodePaymentRequiredHeader` / `decodePaymentSignatureHeader` for header encoding/decoding, and `x402ResourceServer` for the full orchestration flow. The challenge is that these are designed for EVM-first workflows with `@x402/evm` scheme servers, while this project uses Solana. The `@x402/svm` package exists but depends on `@solana/kit` — which violates the edge-runtime constraint from prior decisions (pure-JS crypto only). This means SVC-03 and SVC-04 cannot use `@x402/svm`'s settlement logic — custom Solana verification and settlement must be implemented using the same pure-JS approach already established in Phase 2.

The `@heylol/services` package already exists as an empty stub at `packages/services/src/index.ts`. The `@heylol/sdk` package already has the `./services` subpath export wired in `tsup.config.ts` and `package.json` — it currently exports a `SERVICES_VERSION` constant from `src/services.ts`. SVC-01 requires adding `client.services` to `HeyLolClient`, but the exact hey.lol service API endpoint (`/services/call`? `/services/{id}/call`?) is unknown — this is a gap that must be resolved against real API documentation or experimentation.

**Primary recommendation:** Build in this order: (1) types and service definition model, (2) 402 response generator (`create402Response`), (3) payment header decoder (`verifyPayment` — pure parsing without @x402/svm), (4) facilitator-based settlement (`settlePayment` using `HTTPFacilitatorClient`), (5) `createX402Service` wrapper that bundles verify + handler + settle, (6) `client.services.call()` on `HeyLolClient` (blocked on knowing the hey.lol service endpoint format). The `@heylol/services` package should house SVC-02 through SVC-06; SVC-01 lives in the `@heylol/sdk` core package as a new `ServicesResource`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@x402/core` | `2.5.0` | `HTTPFacilitatorClient` (verify/settle), `encodePaymentRequiredHeader`, `decodePaymentSignatureHeader`, `encodePaymentResponseHeader` | Already in ecosystem; provides the facilitator HTTP client and header encode/decode utilities — verified from unpkg source |
| `@noble/curves` | `2.0.1` | Ed25519 signature verification for Solana payment payloads (pure-JS, no @solana/kit) | Already in `@heylol/sdk` deps; same library used in Phase 2 for signing |
| `@scure/base` | `2.0.0` | base64 decode/encode for payment header values | Already in `@heylol/sdk` deps |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^3.24.2` | Runtime validation of incoming payment headers and service registration schemas | `@x402/core` already requires it; use as optional peer dep for `@heylol/services` per prior decision |

### Do NOT Use

| Package | Reason |
|---------|--------|
| `@x402/svm` | Depends on `@solana/kit` which pulls in `@solana/errors` and other Node.js-incompatible packages — violates the edge-runtime constraint from prior decisions |
| `@x402/evm` | EVM-specific; this SDK is Solana-only |
| `@solana/web3.js` | Banned — breaks in edge runtimes (prior decision) |
| `x402` (the 16MB umbrella package) | Pulls in `viem`, `wagmi`, EVM codecs — overkill |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `HTTPFacilitatorClient` from `@x402/core` | Custom fetch calls to facilitator `/verify` and `/settle` | The HTTPFacilitatorClient is verified working (unpkg source reviewed); using it avoids re-implementing retry logic and auth header injection. Accept the `@x402/core` dep (zod only) |
| Custom header encoding | `encodePaymentRequiredHeader` from `@x402/core/http` | These utilities are one-liners (base64 of JSON.stringify) but correct — use them to stay in sync with the protocol spec |
| `@x402/svm` for Solana settlement | Pure-JS Solana transaction submission via RPC fetch | Must use pure-JS path — `@x402/svm` requires `@solana/kit`. The settlement call can be a direct fetch to a Solana JSON-RPC endpoint |

**Installation:**
```bash
# @heylol/services package — adds @x402/core as a runtime dep
pnpm add @x402/core --filter @heylol/services

# zod as optional peer dep (for service schema validation)
# Do not add to devDependencies — consumer must provide it
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/services/src/
├── index.ts               # Barrel: exports all public API
├── types.ts               # ServiceDefinition, PriceConfig, VerifyResult, SettleResult
├── register.ts            # registerService(opts) → ServiceDefinition
├── verify.ts              # verifyPayment(header, requirements) → Promise<VerifyResult>
├── settle.ts              # settlePayment(payload, requirements) → Promise<SettleResult>
├── response.ts            # create402Response(requirements) → Response
└── handler.ts             # createX402Service(definition, handler) → FetchHandler

packages/sdk/src/
├── services.ts            # Updated: re-exports from @heylol/services
├── resources/
│   └── ServicesResource.ts  # New: client.services.call() — SVC-01 (added to sdk, not services)
└── client/
    └── HeyLolClient.ts    # Updated: add `services: ServicesResource`
```

**Why `@heylol/services` is a separate package and not inside `@heylol/sdk` core:**
- Prior architecture decision: service creators don't need `HeyLolClient` — they're receivers, not callers
- Keeps the core bundle (which has a 100 KB limit) free of facilitator HTTP client and Zod
- Services have heavier server-oriented deps (`@x402/core`) that client-only users don't need

**Why SVC-01 (`client.services.call()`) lives in `@heylol/sdk` and not `@heylol/services`:**
- It's a client-side feature — making an HTTP call to an x402 service with typed I/O
- The existing `HeyLolClient.request()` already handles 402 retry loops — `services.call()` can reuse this
- `@heylol/services` is for service *providers*, not service *callers*

### Pattern 1: Service Definition Model

**What:** A `ServiceDefinition` describes a service endpoint — its price, accepted networks, and input/output schemas.
**When to use:** Call `registerService()` once at application startup; pass the result to `createX402Service()`.

```typescript
// Source: pattern derived from @x402/core middleware config (RouteConfig type)
// + prior ARCHITECTURE.md service layer design

export interface PriceConfig {
  amount: string;        // e.g. "0.001" (in USDC)
  currency: 'USDC';     // only USDC on Solana for now
  network: string;      // CAIP-2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
  payTo: string;        // recipient Solana wallet address (base58)
}

export interface ServiceDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  description?: string;
  price: PriceConfig;
  inputSchema?: ZodType<TInput>;   // optional — Zod optional peer dep
  outputSchema?: ZodType<TOutput>; // optional — for discovery
}

// Factory function — produces a typed ServiceDefinition
export function registerService<TInput, TOutput>(opts: {
  id: string;
  description?: string;
  price: PriceConfig;
  inputSchema?: ZodType<TInput>;
  outputSchema?: ZodType<TOutput>;
}): ServiceDefinition<TInput, TOutput>;
```

### Pattern 2: 402 Response Generation (SVC-05)

**What:** Build a `Response` with HTTP 402 status and `PAYMENT-REQUIRED` header from a `ServiceDefinition`.
**When to use:** Call when a request arrives without a valid payment header.
**Source:** `encodePaymentRequiredHeader` verified from `@x402/core@2.5.0` unpkg source

```typescript
// Source: encodePaymentRequiredHeader from @x402/core/http (verified unpkg)
// Implementation: base64(JSON.stringify(paymentRequired))
import { encodePaymentRequiredHeader } from '@x402/core/http';

export function create402Response(
  definition: ServiceDefinition,
  opts?: { resource?: string; description?: string }
): Response {
  const paymentRequired = {
    x402Version: 2,
    accepts: [{
      scheme: 'exact',
      network: definition.price.network,
      amount: definition.price.amount,
      asset: USDC_ASSET_ADDRESS[definition.price.network],
      payTo: definition.price.payTo,
      maxTimeoutSeconds: 60,
      description: opts?.description ?? definition.description,
      resource: opts?.resource,
    }],
  };

  return new Response(null, {
    status: 402,
    headers: {
      'PAYMENT-REQUIRED': encodePaymentRequiredHeader(paymentRequired),
      'Content-Type': 'application/json',
    },
  });
}
```

**Key fact:** `PAYMENT-REQUIRED` header is used in x402 v2. `X-Payment-Required` is x402 v1. The SDK uses v2 (established in Phase 2).

### Pattern 3: Payment Header Verification (SVC-03)

**What:** Decode the incoming `PAYMENT-SIGNATURE` header and verify it through the hey.lol facilitator.
**When to use:** Called on every request to a service endpoint that has a payment header.
**Source:** `decodePaymentSignatureHeader` verified from `@x402/core@2.5.0` unpkg source; `HTTPFacilitatorClient.verify()` verified from unpkg

```typescript
// Source: decodePaymentSignatureHeader, HTTPFacilitatorClient from @x402/core (verified unpkg)
import { decodePaymentSignatureHeader, HTTPFacilitatorClient } from '@x402/core/http';

export interface VerifyResult {
  valid: boolean;
  reason?: string;         // set when valid === false
  payer?: string;          // payer address when valid
  paymentPayload?: unknown; // raw payload — pass to settlePayment
}

export async function verifyPayment(
  paymentSignatureHeader: string,
  requirements: PaymentRequirements,
  facilitatorUrl?: string
): Promise<VerifyResult> {
  try {
    const payload = decodePaymentSignatureHeader(paymentSignatureHeader);
    const client = new HTTPFacilitatorClient({
      url: facilitatorUrl ?? 'https://x402.org/facilitator'
    });
    const result = await client.verify(payload, requirements);
    return {
      valid: result.isValid,
      reason: result.invalidReason,
      payer: result.payer,
      paymentPayload: payload,
    };
  } catch (e) {
    return {
      valid: false,
      reason: e instanceof Error ? e.message : 'Verification failed',
    };
  }
}
```

**Note on `VerifyResponse` shape:** The facilitator returns `{ isValid: boolean, invalidReason?: string, payer?: string }`. This is derived from reviewing the `HTTPFacilitatorClient` source (MEDIUM confidence — extracted from compiled JS, not TypeScript source). The `VerifyError` type exposes `invalidReason`, `invalidMessage`, `payer` properties on the thrown error.

### Pattern 4: Settlement (SVC-04)

**What:** Settle a verified payment on-chain via the hey.lol facilitator's `/settle` endpoint.
**When to use:** Called after the handler succeeds — settle only if the handler doesn't throw.
**Source:** `HTTPFacilitatorClient.settle()` verified from unpkg source

```typescript
// Source: HTTPFacilitatorClient.settle() from @x402/core (verified unpkg)
import { HTTPFacilitatorClient } from '@x402/core/http';

export interface SettleResult {
  success: boolean;
  txHash?: string;
  network?: string;
  errorReason?: string;
}

export async function settlePayment(
  paymentPayload: unknown,
  requirements: PaymentRequirements,
  facilitatorUrl?: string
): Promise<SettleResult> {
  const client = new HTTPFacilitatorClient({
    url: facilitatorUrl ?? 'https://x402.org/facilitator'
  });
  try {
    const result = await client.settle(paymentPayload as PaymentPayload, requirements);
    return {
      success: result.success,
      txHash: result.transaction,
      network: result.network,
    };
  } catch (e) {
    // SettleError has .errorReason property
    return {
      success: false,
      errorReason: e instanceof Error ? e.message : 'Settlement failed',
    };
  }
}
```

**Note on `SettleResponse` shape:** From `SettleError` inspection, the settle response has `success`, `transaction`, `network`, `payer`, `errorReason`, `errorMessage` fields. Exact field names are MEDIUM confidence (from compiled JS inspection).

### Pattern 5: Service Handler Wrapper (SVC-06)

**What:** `createX402Service()` bundles the verify + handler + settle sequence into a single `FetchHandler`.
**When to use:** This is the primary integration point for service providers.

```typescript
// Pattern: mirrors @x402/core x402HTTPResourceServer.processHTTPRequest() structure
// but simplified for fetch-native environments (no express/hono deps)

type FetchHandler<TInput, TOutput> = (
  request: Request,
  input: TInput
) => Promise<TOutput>;

export function createX402Service<TInput, TOutput>(
  definition: ServiceDefinition<TInput, TOutput>,
  handler: FetchHandler<TInput, TOutput>,
  opts?: { facilitatorUrl?: string }
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    // 1. Check for payment header
    const signatureHeader =
      request.headers.get('payment-signature') ??  // v2
      request.headers.get('x-payment');            // v1 fallback

    // 2. No payment header → return 402
    if (!signatureHeader) {
      return create402Response(definition, { resource: request.url });
    }

    // 3. Parse input (with optional Zod validation)
    let input: TInput;
    try {
      const raw = request.method === 'GET' ? {} : await request.json();
      input = definition.inputSchema
        ? definition.inputSchema.parse(raw)
        : (raw as TInput);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Build requirements from definition
    const requirements = buildRequirementsFromDefinition(definition, request.url);

    // 5. Verify payment
    const verifyResult = await verifyPayment(
      signatureHeader,
      requirements,
      opts?.facilitatorUrl
    );

    if (!verifyResult.valid) {
      return new Response(
        JSON.stringify({ error: 'Payment invalid', reason: verifyResult.reason }),
        { status: 402 }
      );
    }

    // 6. Execute handler
    let output: TOutput;
    try {
      output = await handler(request, input);
    } catch {
      return new Response(JSON.stringify({ error: 'Handler error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Settle payment AFTER successful handler execution
    const settleResult = await settlePayment(
      verifyResult.paymentPayload,
      requirements,
      opts?.facilitatorUrl
    );

    // 8. Return response with PAYMENT-RESPONSE header
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (settleResult.success && settleResult.txHash) {
      responseHeaders['PAYMENT-RESPONSE'] = encodePaymentResponseHeader({
        success: true,
        transaction: settleResult.txHash,
        network: settleResult.network ?? '',
        payer: verifyResult.payer ?? '',
      });
    }

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: responseHeaders,
    });
  };
}
```

### Pattern 6: Client-Side Service Caller (SVC-01)

**What:** `client.services.call(serviceId, input)` makes an HTTP call to an x402-protected service endpoint and returns typed output.
**When to use:** Consumers of x402 services — not service providers.
**Note:** This requires knowing the hey.lol service endpoint URL format. **LOW CONFIDENCE** — no public spec found.

```typescript
// Pattern: mirrors PostsResource delegation model
// Lives in packages/sdk/src/resources/ServicesResource.ts
// Added to HeyLolClient as this.services = new ServicesResource(this)

interface HttpClient {
  post<T>(path: string, body?: unknown): Promise<T>;
  get<T>(path: string): Promise<T>;
}

export class ServicesResource {
  private readonly client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  // SVC-01: typed call to an x402 service
  // The 402 retry loop is already in HeyLolClient.request() — no additional logic needed here
  call<TInput, TOutput>(
    serviceId: string,
    input: TInput
  ): Promise<TOutput> {
    return this.client.post<TOutput>(`/services/${serviceId}/call`, input);
  }
}
```

**Critical unknown:** The hey.lol service endpoint URL (e.g., `/services/{id}/call`, `/v1/services/call`, etc.) is not in any public documentation found during research. This must be resolved before SVC-01 can be finalized.

### Anti-Patterns to Avoid

- **Settling before handler completes:** Settle ONLY after the handler returns successfully. If the handler throws, do not settle — the client would pay for a failed request.
- **Catching and silencing SettleError:** If settlement fails, log it but still return the 200 response with the handler output. The client's payment may have already been verified; failure to settle is an infrastructure problem, not the caller's fault.
- **Using `@x402/svm` for Solana verification:** It depends on `@solana/kit` which breaks in edge runtimes. Use `HTTPFacilitatorClient` instead — the facilitator handles the Solana-side verification.
- **Creating a new `HTTPFacilitatorClient` per request:** Instantiate once at startup, reuse. The client holds no per-request state.
- **Hardcoding `https://x402.org/facilitator`:** The Coinbase CDP facilitator is `https://api.cdp.coinbase.com/platform/v2/x402` for production. The testnet facilitator is `https://x402.org/facilitator`. Accept `facilitatorUrl` as configuration.
- **Building `VerifyResult` from raw facilitator JSON without type guards:** The facilitator response JSON is typed only loosely. Add a `typeof result.isValid === 'boolean'` guard before returning.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment header base64 encode/decode | Custom `btoa`/`atob` wrappers for payment objects | `encodePaymentRequiredHeader`, `decodePaymentSignatureHeader` from `@x402/core/http` | These match the protocol spec exactly and handle edge cases in the base64 encoding |
| Facilitator HTTP calls | Custom `fetch` to `/verify` and `/settle` | `HTTPFacilitatorClient` from `@x402/core/server` | Includes auth header injection, BigInt-safe JSON serialization, retry on 429 |
| x402 version detection on incoming requests | Custom header sniffing | Check `payment-signature` (v2) then `x-payment` (v1) — simple two-check logic is fine | Already established in Phase 2 for the client-side; same logic on server side |
| Solana transaction signature verification | Custom Ed25519 verify loop over transaction bytes | `HTTPFacilitatorClient.verify()` — delegate to facilitator | The facilitator handles Solana-specific instruction parsing, amount verification, and timeout checks |

**Key insight:** On the server side, you do NOT need to do any Solana transaction parsing or Ed25519 signature verification yourself. The facilitator's `/verify` endpoint does all of this. Your server's job is: (1) decode the header, (2) POST to `/verify`, (3) if valid run handler, (4) POST to `/settle`. This is much simpler than the client-side which must build and sign transactions.

---

## Common Pitfalls

### Pitfall 1: Settle vs. Verify Order

**What goes wrong:** Developer calls `settlePayment()` immediately after `verifyPayment()`, before running the handler. The client pays for a request that fails at the handler layer.
**Why it happens:** The verify→settle→respond pattern sounds logical, but the correct order is verify→handle→settle→respond.
**How to avoid:** Always execute the handler between verify and settle. `createX402Service()` enforces this order.
**Warning signs:** Any code path where `settlePayment()` is called before `await handler()`.

### Pitfall 2: HTTPFacilitatorClient Depends on @x402/core Which Depends on Zod

**What goes wrong:** Adding `@x402/core` to `@heylol/services` brings in Zod as a transitive dependency. If `@heylol/services` was supposed to have Zod as a peer dep only, this creates a conflict.
**Why it happens:** `@x402/core`'s package.json lists `zod: "^3.24.2"` as a direct dependency (verified from npm info). Zod will be bundled if tsup does not externalize it.
**How to avoid:** In `tsup.config.ts` for `@heylol/services`, add `external: ['zod']` to prevent Zod from being bundled. The consumer must provide Zod. Note: `@x402/core` bundles Zod internally — the question is whether tsup externalizes it when building `@heylol/services`. Test this explicitly.
**Warning signs:** The `@heylol/services` bundle size growing unexpectedly; `bundle-size` CI check failing.

### Pitfall 3: PAYMENT-REQUIRED vs. payment-required Case Sensitivity

**What goes wrong:** When setting the 402 response header, `new Response(null, { headers: { 'payment-required': ... } })` works in Fetch API contexts (lowercase is normalized), but some frameworks (Express) case-sensitively compare headers. When reading incoming headers, `request.headers.get('payment-signature')` always works because Fetch API `Headers.get()` lowercases automatically.
**Why it happens:** The Fetch API `Headers` object normalizes to lowercase on read. Setting headers via plain object works regardless of case. But developers copy from x402 docs which show uppercase `PAYMENT-REQUIRED` and may not realize the Fetch API normalizes on read.
**How to avoid:** Use `request.headers.get('payment-signature')` (lowercase) for reading. Set response headers consistently — either always uppercase (e.g., `'PAYMENT-REQUIRED'`) for consistency with x402 spec, or lowercase. Document the choice. Test with a real client that checks both.
**Warning signs:** Any `request.headers['PAYMENT-SIGNATURE']` (bracket notation — always undefined on Fetch Headers objects).

### Pitfall 4: @x402/svm Edge-Runtime Incompatibility

**What goes wrong:** Developer imports from `@x402/svm` for Solana payment verification thinking it's analogous to `@x402/evm`. The package depends on `@solana/kit` which requires Node.js built-ins (`node:crypto`, `node:fs`, etc.), causing failures in CF Workers and Vercel Edge.
**Why it happens:** `@x402/svm`'s npm page doesn't prominently warn about the Node.js dependency chain. The package name suggests it would work the same as `@x402/evm`.
**How to avoid:** Never import from `@x402/svm`. Use `HTTPFacilitatorClient` for all verification and settlement — it uses only `fetch`, which works everywhere.
**Warning signs:** Any `import ... from '@x402/svm'` in the codebase.

### Pitfall 5: Missing PAYMENT-RESPONSE Header After Settlement

**What goes wrong:** The server settles successfully but doesn't include the `PAYMENT-RESPONSE` header in the 200 response. The client receives the resource but has no proof-of-settlement for its records. Some x402 client implementations check for this header and retry if missing.
**Why it happens:** Developers focus on the happy path (return the data) and forget the protocol requires settlement confirmation in the response.
**How to avoid:** `createX402Service()` must always set `PAYMENT-RESPONSE` header on successful settlement using `encodePaymentResponseHeader`. The settlement result contains `txHash` and `network` — include both.
**Warning signs:** Any 200 response from a service handler that doesn't have a `PAYMENT-RESPONSE` header.

### Pitfall 6: SVC-01 Client Services URL — Unknown API Endpoint

**What goes wrong:** `client.services.call(serviceId, input)` uses the wrong URL path because the hey.lol services API endpoint format is not documented publicly.
**Why it happens:** This feature (`client.services.call()`) is marked as a success criterion but no public documentation or hey.lol API spec was found for it during research.
**How to avoid:** This must be resolved by inspecting actual hey.lol API responses or developer documentation before implementing `ServicesResource`. Do not guess the URL format.
**Warning signs:** This pitfall has no warning signs — it's a gap, not a bug pattern.

---

## Code Examples

Verified patterns from official sources:

### @x402/core/http: Encode/Decode Headers

```typescript
// Source: unpkg.com/@x402/core@2.5.0/dist/esm/chunk-FHAPZPSN.mjs (verified 2026-03-01)

// encodePaymentRequiredHeader: base64(JSON.stringify(paymentRequired))
import { encodePaymentRequiredHeader, decodePaymentSignatureHeader } from '@x402/core/http';

// Build 402 response header value
const headerValue = encodePaymentRequiredHeader({
  x402Version: 2,
  accepts: [{ scheme: 'exact', network: 'solana:...', amount: '1000', asset: '...', payTo: '...', maxTimeoutSeconds: 60 }]
});

// Decode incoming PAYMENT-SIGNATURE header
const payload = decodePaymentSignatureHeader(request.headers.get('payment-signature')!);
// Returns: { x402Version: 2, resource?: ..., accepted: ..., payload: ..., extensions?: ... }
```

### @x402/core/server: HTTPFacilitatorClient Verify and Settle

```typescript
// Source: unpkg.com/@x402/core@2.5.0/dist/esm/chunk-FHAPZPSN.mjs (verified 2026-03-01)
import { HTTPFacilitatorClient } from '@x402/core/server';

const facilitator = new HTTPFacilitatorClient({
  url: 'https://x402.org/facilitator', // or https://api.cdp.coinbase.com/platform/v2/x402
  // createAuthHeaders?: () => Promise<{ headers: Record<string, string> }> — optional CDP API key auth
});

// Verify
const verifyResult = await facilitator.verify(paymentPayload, requirements);
// Returns: { isValid: boolean, invalidReason?: string, payer?: string }

// Settle
const settleResult = await facilitator.settle(paymentPayload, requirements);
// Returns: { success: boolean, transaction?: string, network?: string, payer?: string }

// Supported kinds (initialize once)
const supported = await facilitator.getSupported();
// Returns: { kinds: [...], extensions: [...], signers: [...] }
```

### 402 Response Pattern

```typescript
// Source: pattern derived from x402HTTPResourceServer.processHTTPRequest() in @x402/core (verified 2026-03-01)
// Returns a proper 402 Response using Fetch API primitives only

function create402Response(paymentRequired: object): Response {
  return new Response(null, {
    status: 402,
    headers: {
      'PAYMENT-REQUIRED': btoa(JSON.stringify(paymentRequired)),
      'Content-Type': 'application/json',
    },
  });
}
```

### USDC Asset Address by Network

```typescript
// USDC token mint addresses on Solana — needed for PaymentRequirements.asset
// Source: Solana docs / x402 Solana guide (MEDIUM confidence — verify before use)
const USDC_MINT = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mainnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // devnet
} as const;
```

### ServicesResource on HeyLolClient (SVC-01)

```typescript
// packages/sdk/src/resources/ServicesResource.ts
// The 402 retry loop is ALREADY in HeyLolClient.request() — no additional logic needed

interface HttpClient {
  post<T>(path: string, body?: unknown): Promise<T>;
}

export class ServicesResource {
  private readonly client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

  // SVC-01: call an x402 service with typed I/O
  // URL FORMAT IS UNKNOWN — needs real API investigation
  call<TInput, TOutput>(serviceId: string, input: TInput): Promise<TOutput> {
    return this.client.post<TOutput>(`/services/${serviceId}/call`, input);
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| x402 payment requirements in 402 body (v1) | `PAYMENT-REQUIRED` header base64 JSON (v2) | x402 v2 launch (Dec 2025) | Server must emit v2 format; client must handle both |
| `X-Payment` header for payment submission | `PAYMENT-SIGNATURE` header (v2) | x402 v2 launch (Dec 2025) | Read both on incoming requests for backward compat |
| `@coinbase/x402` (16 MB EVM-heavy package) | `@x402/core` (2.5.0, zod-only dep) | Dec 2025 restructure | Much smaller dep footprint; clean separation of core/evm/svm |
| Direct Solana transaction parsing on server | Delegate to facilitator `/verify` | x402 facilitator model | Servers don't need Solana SDK — facilitator handles it |

**Deprecated/outdated:**
- `x402@1.1.0` (the monolithic package): 16 MB unpacked, EVM-first. Do not use.
- `@coinbase/x402@2.1.0`: Earlier version of the scoped package, frozen at 2.1.0. Use `@x402/core@2.5.0`.
- `x402-express`, `x402-hono` (without `@x402/` scope prefix): Legacy 1.x versions, replaced by `@x402/express`, `@x402/hono`. The scoped packages are current.

---

## Open Questions

1. **hey.lol services API endpoint format (SVC-01) — LOW CONFIDENCE**
   - What we know: The success criterion says `client.services.call()` exists. No public documentation found for hey.lol's `/services` endpoint.
   - What's unclear: Is the endpoint `/services/{id}/call`? `/v1/services/call`? Does it use GET or POST? How is the service identified?
   - Recommendation: Check hey.lol developer docs or API reference before implementing `ServicesResource`. If hey.lol doesn't have a `/services` API at all, SVC-01 may be calling third-party x402 services (not hey.lol's own), in which case the URL is passed in by the developer — no hardcoded path.

2. **Facilitator URL for Solana on hey.lol — MEDIUM confidence**
   - What we know: Two facilitators exist: `https://x402.org/facilitator` (testnet, open) and `https://api.cdp.coinbase.com/platform/v2/x402` (Coinbase CDP, requires API key). Hey.lol may run its own facilitator.
   - What's unclear: Which facilitator URL should `@heylol/services` default to? Does hey.lol have its own `/facilitator` endpoint? Does it require CDP API key auth?
   - Recommendation: Accept `facilitatorUrl` as a required or defaulted configuration option. Default to `https://x402.org/facilitator` for the testnet case. Document that production Solana requires either the Coinbase CDP facilitator or a custom one.

3. **VerifyResponse and SettleResponse exact field names — MEDIUM confidence**
   - What we know: From `VerifyError` constructor: `invalidReason`, `invalidMessage`, `payer` fields. From `SettleError` constructor: `errorReason`, `errorMessage`, `payer`, `transaction`, `network` fields. The non-error path likely mirrors these.
   - What's unclear: Whether the success response uses `isValid: true` or `success: true`; whether `transaction` is the tx hash string or an object.
   - Recommendation: Write tests against the real testnet facilitator to capture actual response shapes before finalizing `VerifyResult` and `SettleResult` types.

4. **Zod bundling from @x402/core — MEDIUM confidence**
   - What we know: `@x402/core@2.5.0` has `zod: "^3.24.2"` as a direct dependency. Tsup by default bundles all dependencies.
   - What's unclear: If `@heylol/services` imports from `@x402/core`, will tsup include Zod in the output bundle? This would exceed the size budget and violate the "Zod as optional peer dep" decision.
   - Recommendation: Add `external: ['zod']` and `external: ['@x402/core']` to `packages/services/tsup.config.ts`. Mark `@x402/core` as a `peerDependency` in `@heylol/services/package.json` so consumers must install it. Test bundle size after build.

5. **services.call() with 402 payment loop — already handled?**
   - What we know: `HeyLolClient.request()` already implements the full 402 retry loop (payment header → retry). Adding `ServicesResource.call()` that delegates to `this.client.post()` would automatically get the 402 retry for free.
   - What's unclear: Does calling an external x402 service via `client.services.call()` with a hey.lol-authenticated client make sense? The payment header that `HeyLolClient` builds is the wallet-identity dummy transaction for hey.lol authentication. Calling an *external* x402 service would need a *real* payment transaction (actual funds transfer), not a zero-amount dummy.
   - Recommendation: If `client.services.call()` is for calling external x402 services (not hey.lol's own API), the existing 402 retry loop using dummy transactions will NOT work — external services expect real USDC transfers. This is a critical design question that must be resolved before implementing SVC-01. The services call API may not reuse `HeyLolClient.request()` at all.

---

## Sources

### Primary (HIGH confidence)

- `@x402/core@2.5.0` unpkg source — `HTTPFacilitatorClient.verify()`, `HTTPFacilitatorClient.settle()`, `encodePaymentRequiredHeader`, `decodePaymentSignatureHeader`, `encodePaymentResponseHeader` implementations: https://unpkg.com/@x402/core@2.5.0/dist/esm/chunk-FHAPZPSN.mjs (fetched 2026-03-01)
- `@x402/core@2.5.0` npm info — version, exports map, zod dep: verified via `npm info @x402/core@2.5.0` (2026-03-01)
- `@x402/core@2.5.0` schemas module — PaymentRequirements v1/v2 field shapes: https://unpkg.com/@x402/core@2.5.0/dist/esm/schemas/index.mjs (fetched 2026-03-01)
- Existing codebase — `packages/sdk/src/auth/x402.ts`, `packages/sdk/src/client/HeyLolClient.ts`, `packages/sdk/package.json`, `packages/services/package.json`: direct inspection (2026-03-01)
- Prior research ARCHITECTURE.md — service layer design, package structure decisions: `.planning/research/ARCHITECTURE.md` (2026-02-28)

### Secondary (MEDIUM confidence)

- Coinbase x402 docs (quickstart for sellers, how it works) — facilitator URL, verify/settle flow: https://docs.cdp.coinbase.com/x402/welcome (fetched 2026-03-01)
- x402 custom server example — `verifyPayment`/`settlePayment`/`buildPaymentRequirements` method names on `x402ResourceServer`: https://github.com/coinbase/x402/tree/main/examples/typescript/servers/custom (fetched 2026-03-01)
- `@x402/core` facilitator module — `x402Facilitator` class, hook system: https://unpkg.com/@x402/core@2.5.0/dist/cjs/facilitator/index.d.ts (fetched 2026-03-01)
- Solana x402 guide — payment requirements structure, network identifiers, USDC mint addresses: https://solana.com/developers/guides/getstarted/intro-to-x402 (fetched 2026-03-01)
- `@x402/svm@2.5.0` npm info — deps on @solana/kit confirming edge-runtime incompatibility: verified via `npm info @x402/svm@2.5.0 dependencies` (2026-03-01)

### Tertiary (LOW confidence — flag for validation)

- SVC-01 (`client.services.call()`) hey.lol API endpoint format — no public documentation found
- VerifyResponse success response field names (`isValid` vs `success`) — inferred from error class fields only
- USDC mint addresses for Solana networks — standard values from ecosystem, verify before use
- Whether `@x402/core`'s Zod import affects bundle size when externalized in tsup — requires empirical test

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — @x402/core version and API verified from npm and unpkg; exclusion of @x402/svm confirmed via npm dep inspection
- Architecture: HIGH — builds on verified patterns from phases 2-4; service provider pattern matches @x402/core custom server example
- SVC-03/SVC-04 (verify/settle): MEDIUM — HTTP shapes inferred from compiled JS and error class inspection; not from TypeScript source
- SVC-01 (client.services.call): LOW — hey.lol service API endpoint format not found in any public source
- Pitfalls: HIGH — all pitfalls verified from code inspection or prior project research

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (30 days — @x402/core is actively maintained and versions change frequently; SVC-01 endpoint format must be resolved before implementation regardless of research freshness)
