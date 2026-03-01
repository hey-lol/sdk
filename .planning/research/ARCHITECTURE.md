# Architecture Research

**Domain:** Multi-runtime TypeScript SDK monorepo with x402 payment auth
**Researched:** 2026-02-28
**Confidence:** HIGH (Node.js exports docs verified; x402 flow from Coinbase spec training data — MEDIUM; SDK patterns from well-known open-source SDKs — MEDIUM)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Consumer Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Node.js app │  │ CF Worker    │  │ Vercel Edge  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                      │
├─────────┼─────────────────┼──────────────────┼──────────────────────┤
│                    Adapter Layer                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   @heylol/   │  │   @heylol/   │  │   @heylol/   │              │
│  │ sdk/express  │  │sdk/cloudflare│  │ sdk/vercel   │              │
│  │ (middleware) │  │ (env binds)  │  │ (edge compat)│              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                      │
├─────────┼─────────────────┼──────────────────┼──────────────────────┤
│                    Services Layer                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    @heylol/sdk/services                       │   │
│  │  verifyPayment()  settlePayment()  create402Response()        │   │
│  │  withPayment() middleware wrapper  ServiceDefinition builder  │   │
│  └──────────────────────────────────┬───────────────────────────┘   │
│                                     │                               │
├─────────────────────────────────────┼───────────────────────────────┤
│                    Core Layer                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                       @heylol/sdk (core)                      │   │
│  │                                                               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │   │
│  │  │  HeyLolClient│  │  x402 Signer │  │  Solana Tx Builder  │  │   │
│  │  │  (API client)│  │ (Ed25519 +   │  │  (zero-amount dummy │  │   │
│  │  │              │  │  base58)     │  │   transactions)     │  │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘  │   │
│  │         │                 │                      │             │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │                   Shared Types & Utils                    │ │   │
│  │  │  PaymentPayload  X402Header  ApiResponse  BrandedTypes    │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `@heylol/sdk` (core) | x402 auth, API client, Solana signing, types | External: hey.lol API, facilitator |
| `@heylol/sdk/services` | Service creation, payment verification/settlement | Depends on: core types |
| `@heylol/sdk/cloudflare` | CF Workers adapter, KV cache, Durable Objects compatibility | Depends on: core, services |
| `@heylol/sdk/vercel` | Vercel Edge adapter, Next.js middleware helpers | Depends on: core, services |
| `@heylol/sdk/express` | Express middleware, req/res injection | Depends on: core, services |

---

## Monorepo Project Structure

```
heylol-sdk/
├── package.json                # Workspace root — scripts, devDependencies
├── pnpm-workspace.yaml         # pnpm workspace declaration
├── turbo.json                  # Build pipeline (build depends on core first)
├── tsconfig.base.json          # Shared TS config — strict, bundler resolution
│
├── packages/
│   ├── core/                   # @heylol/sdk
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts      # Dual ESM/CJS output
│   │   └── src/
│   │       ├── index.ts        # Public barrel — re-exports client, types
│   │       ├── client/
│   │       │   ├── HeyLolClient.ts   # Main class, fetch wrapper
│   │       │   ├── middleware.ts      # Auth injection, retry, rate limit
│   │       │   └── resources/        # posts.ts, profile.ts, social.ts, etc.
│   │       ├── auth/
│   │       │   ├── x402.ts           # Payment header construction
│   │       │   ├── signer.ts         # Ed25519 via @noble/curves
│   │       │   ├── solana.ts         # Zero-amount dummy tx serialization
│   │       │   └── keypair.ts        # Key loading, base58 encode/decode
│   │       └── types/
│   │           ├── x402.ts           # PaymentPayload, X402Header, etc.
│   │           ├── api.ts            # ApiResponse, PaginatedResponse
│   │           └── index.ts          # Re-export all types
│   │
│   ├── services/               # @heylol/sdk/services
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── verify.ts       # verifyPayment(request) → VerifyResult
│   │       ├── settle.ts       # settlePayment(payment) → SettleResult
│   │       ├── response.ts     # create402Response() → Response
│   │       ├── handler.ts      # withPayment() wrapper for any fetch handler
│   │       └── types.ts        # ServiceDefinition, PriceConfig, etc.
│   │
│   ├── cloudflare/             # @heylol/sdk/cloudflare
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts       # CloudflareClient extends HeyLolClient
│   │       └── middleware.ts   # CF-specific withPayment() for fetch handler
│   │
│   ├── vercel/                 # @heylol/sdk/vercel
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts       # VercelClient extends HeyLolClient
│   │       └── middleware.ts   # withPayment() for Next.js middleware
│   │
│   └── express/                # @heylol/sdk/express
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── src/
│           ├── index.ts
│           ├── client.ts       # ExpressClient extends HeyLolClient
│           └── middleware.ts   # paymentMiddleware(options) → Handler
│
├── examples/
│   ├── cloudflare-worker/      # Standalone CF Worker example
│   ├── next-app/               # Next.js with Edge runtime
│   └── express-server/         # Node.js Express example
│
└── docs/                       # Documentation source
```

### Structure Rationale

- **`packages/core/` is the only zero-dependency entrypoint.** Adapters import from core but core never imports from adapters. This ensures bundle size and runtime compatibility constraints are enforced at the package boundary.
- **`packages/services/` is a sibling of core, not a wrapper.** It imports core types but doesn't import HeyLolClient. Service creators don't need the client — they're on the receiving end of requests.
- **`src/auth/` subdirectory in core** groups all x402 and Solana logic so it can be tested in isolation and swapped if the protocol evolves.
- **`src/client/resources/`** follows the pattern established by Stripe's Node.js SDK — one file per API resource group, each receiving a pre-configured request function rather than the full client.

---

## Package.json Exports Configuration

### Core Package (`packages/core/package.json`)

This is the single published package with one subpath (`@heylol/sdk`). The root of the monorepo is NOT published — each package publishes independently.

```json
{
  "name": "@heylol/sdk",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"]
}
```

**Why `main` and `module` fields still exist:** Legacy bundlers (Webpack 4, older Rollup) don't read `exports`. Including `main` (CJS) and `module` (ESM) ensures compatibility.

### Services Package (`packages/services/package.json`)

```json
{
  "name": "@heylol/sdk",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./services": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "peerDependencies": {
    "@heylol/sdk": "*"
  }
}
```

**Wait — this is wrong. Do not do this.** If `@heylol/sdk/services` resolves to a separately-published package, the subpath `./services` on that package would be `./services/services`, not `./services`. The correct approach:

**Option A — All subpaths in one published package (recommended for this SDK):**

Publish a single `@heylol/sdk` package with all subpath exports defined in its `package.json`, with the monorepo packages bundled into a single publishable package or built into subdirectories.

**Option B — Separate packages with subpath aliasing via publishConfig:**

Each monorepo package publishes under the same name `@heylol/sdk` with different subpaths using `publishConfig.exports`. npm 9+ and pnpm support this pattern.

**Recommended for hey.lol SDK: Option A with a single published package, multi-entry build.**

The monorepo structure is for development organization. At publish time, a single `@heylol/sdk` package is built with this exports map:

```json
{
  "name": "@heylol/sdk",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./services": {
      "types": "./dist/services/index.d.ts",
      "import": "./dist/services/index.js",
      "require": "./dist/services/index.cjs"
    },
    "./cloudflare": {
      "types": "./dist/cloudflare/index.d.ts",
      "import": "./dist/cloudflare/index.js",
      "require": "./dist/cloudflare/index.cjs"
    },
    "./vercel": {
      "types": "./dist/vercel/index.d.ts",
      "import": "./dist/vercel/index.js",
      "require": "./dist/vercel/index.cjs"
    },
    "./express": {
      "types": "./dist/express/index.d.ts",
      "import": "./dist/express/index.js",
      "require": "./dist/express/index.cjs"
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"]
}
```

**TypeScript tsconfig requirements:**

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2020",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`moduleResolution: "bundler"` is the modern choice — it reads `exports` field, doesn't require file extensions in imports, and is appropriate when tsup/esbuild handles final bundling. Use `"node16"` only if the SDK must work with `ts-node` or raw `tsc` Node execution without a bundler.

**Consumer tsconfig must also use `moduleResolution: "bundler"` or `"node16"` to resolve subpath exports.** Add this to SDK documentation as a requirement.

---

## Architectural Patterns

### Pattern 1: Constructor Injection for Auth

**What:** The client accepts a keypair or private key at construction time and internally builds all auth state. Consumers never touch signing internals.

**When to use:** Always — this is the standard pattern for SDKs with credential management (Stripe, AWS SDK, Octokit all do this).

**Trade-offs:** Simplicity for consumers at cost of flexibility — advanced users can't swap signing implementations without forking. Mitigate by accepting a `signer` interface.

```typescript
// Consumer-facing API
const client = new HeyLolClient({
  privateKey: process.env.HEYLOL_PRIVATE_KEY, // base58 Ed25519 private key
  baseUrl: 'https://api.hey.lol',
});

// Internal implementation
class HeyLolClient {
  private signer: Ed25519Signer;

  constructor(options: HeyLolClientOptions) {
    // Accept either raw private key bytes or base58 string
    const keyBytes = typeof options.privateKey === 'string'
      ? bs58.decode(options.privateKey)
      : options.privateKey;
    this.signer = new Ed25519Signer(keyBytes);
  }

  // All request methods automatically inject auth
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const authHeader = await this.buildPaymentHeader(path, init);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...init?.headers, 'X-Payment': authHeader },
    });
    return this.handleResponse<T>(response);
  }
}
```

### Pattern 2: 402 Retry Loop (Transparent x402 Handling)

**What:** The client makes a request, receives a 402, extracts the payment requirements, builds and signs the payment, retries with the `X-Payment` header. Consumer sees only the final successful response.

**When to use:** This is the core value proposition of the SDK — hiding x402 complexity.

**Trade-offs:** One extra round-trip on first request to a new endpoint. The payment requirements can be cached by endpoint to avoid the extra trip on subsequent calls.

```typescript
async request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${this.baseUrl}${path}`;

  // First attempt — no payment header
  const probe = await fetch(url, init);

  if (probe.status !== 402) {
    return this.handleResponse<T>(probe);
  }

  // Parse 402 payment requirements
  const requirements = await this.parse402Response(probe);

  // Build and sign payment
  const paymentHeader = await this.buildPaymentHeader(requirements);

  // Retry with payment header
  const paid = await fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      'X-Payment': paymentHeader,
    },
  });

  if (paid.status === 402) {
    // Payment was rejected — amount mismatch, network issue, etc.
    throw new PaymentRejectedError(await paid.json());
  }

  return this.handleResponse<T>(paid);
}
```

**Optimization — include payment preemptively when cache hit exists:**

```typescript
async request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${this.baseUrl}${path}`;
  const cached = this.requirementsCache.get(url);

  const headers: Headers = new Headers(init?.headers);
  if (cached) {
    headers.set('X-Payment', await this.buildPaymentHeader(cached));
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status === 402) {
    const requirements = await this.parse402Response(response);
    this.requirementsCache.set(url, requirements);
    return this.request(path, init); // Retry once — now has fresh cache
  }

  return this.handleResponse<T>(response);
}
```

### Pattern 3: Resource Classes (Stripe Pattern)

**What:** High-level API methods are organized into resource classes (`client.posts`, `client.profile`, `client.social`). Each resource class receives a bound `request` function, not the full client.

**When to use:** When the API surface is large enough that a flat namespace becomes unwieldy. For hey.lol with 6+ resource groups this is appropriate from day one.

**Trade-offs:** Small indirection cost; consumers type `client.posts.list()` instead of `client.listPosts()`. This is universally preferred in large SDKs.

```typescript
// Resource class — no dependency on HeyLolClient internals
class PostsResource {
  constructor(private request: RequestFunction) {}

  async list(params?: ListPostsParams): Promise<PaginatedResponse<Post>> {
    return this.request<PaginatedResponse<Post>>('/v1/posts', {
      method: 'GET',
      params,
    });
  }

  async create(body: CreatePostBody): Promise<Post> {
    return this.request<Post>('/v1/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

// HeyLolClient wires them together
class HeyLolClient {
  posts: PostsResource;
  profile: ProfileResource;
  social: SocialResource;

  constructor(options: HeyLolClientOptions) {
    const req = this.request.bind(this);
    this.posts = new PostsResource(req);
    this.profile = new ProfileResource(req);
    this.social = new SocialResource(req);
  }
}
```

### Pattern 4: Platform Extension via Class Inheritance (Not Plugin System)

**What:** Adapter packages extend `HeyLolClient` with platform-specific capabilities. Cloudflare adapter adds env binding support. Express adapter adds `req`/`res` injection.

**When to use:** When adapters need to override specific methods (like how fetch is called) and add new methods. Simpler than Octokit's plugin system, appropriate for a smaller surface area.

**Trade-offs:** Inheritance is less composable than plugins but far simpler for consumers. Octokit's plugin system is valuable when the plugin count is large (30+) and plugins come from third parties.

```typescript
// packages/cloudflare/src/client.ts
export class CloudflareClient extends HeyLolClient {
  constructor(
    private env: CloudflareEnv,
    options?: Partial<HeyLolClientOptions>
  ) {
    super({
      privateKey: env.HEYLOL_PRIVATE_KEY,
      baseUrl: env.HEYLOL_API_URL ?? 'https://api.hey.lol',
      ...options,
    });
  }
}

// packages/express/src/middleware.ts
export function createExpressMiddleware(client: HeyLolClient) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Attach client to request
    (req as any).heylol = client;
    next();
  };
}
```

### Pattern 5: Zero-Amount Dummy Transaction for Wallet Identification

**What:** When the payment amount is zero (free API calls that still require identity), the SDK constructs a minimal Solana transaction — enough to prove wallet ownership via Ed25519 signature, without an RPC call or SOL balance.

**When to use:** Any x402 request where `amount: 0`.

**Trade-offs:** The transaction must be well-formed enough to satisfy the hey.lol facilitator's verification, but does NOT need to be submittable to Solana mainnet. Pure binary serialization, no RPC dependency.

```typescript
// packages/core/src/auth/solana.ts

// Minimal Solana transaction: VersionedTransaction (v0) with one memo instruction
// Proves keypair ownership without SOL balance or RPC call
export function buildZeroAmountTransaction(
  feePayer: Uint8Array,    // Ed25519 public key bytes
  recentBlockhash: string, // Any valid base58 blockhash string (can be placeholder for zero-amount)
): Uint8Array {
  // Serialize compact Solana v0 transaction format
  // message_header + account_keys + recent_blockhash + instructions
  // Sign with Ed25519 private key
  // Return base64-encoded serialized transaction bytes
}
```

**Confidence note:** The exact zero-amount transaction format expected by hey.lol's facilitator requires validation against the actual API. The placeholder blockhash behavior is LOW confidence — test early.

---

## x402 Payment Auth Data Flow

```
Consumer Code
    │
    ├─ client.posts.list()
    │
    ▼
HeyLolClient.request('/v1/posts', { method: 'GET' })
    │
    ├─ Check requirementsCache for /v1/posts
    │   └─ MISS on first call
    │
    ▼
fetch('https://api.hey.lol/v1/posts')  ← No auth header
    │
    ▼
hey.lol API returns HTTP 402
    Body: {
      version: "x402-v1",
      accepts: [{
        scheme: "exact",
        network: "solana-mainnet",
        currency: "USDC",
        amount: "0",           ← zero-amount = wallet identification only
        address: "<treasury>",
        decimals: 6
      }]
    }
    │
    ▼
parse402Response(response)
    │
    ▼
buildPaymentHeader(requirements)
    │
    ├─ IF amount === "0":
    │   └─ buildZeroAmountTransaction(publicKey, placeholderBlockhash)
    │       Uses: @noble/curves/ed25519 for signing
    │             bs58 for encoding
    │
    ├─ IF amount > 0:
    │   └─ Build real USDC transfer transaction
    │       (requires SOL RPC or pre-built transaction from user)
    │
    ▼
Construct X-Payment header:
    base64(JSON.stringify({
      version: "x402-v1",
      scheme: "exact",
      network: "solana-mainnet",
      payload: {
        transaction: "<base64-serialized-tx>",
        message: "<optional-memo>"
      }
    }))
    │
    ▼
fetch('/v1/posts', { headers: { 'X-Payment': header } })
    │
    ▼
hey.lol API → Facilitator.verify(payment)
    │           Checks: signature valid, address matches, amount correct
    │
    ▼
200 OK + Response body
    │
    ▼
handleResponse<Post[]>(response)
    │
    ▼
Consumer receives typed Post[] result
```

### Service Data Flow (services package — server-side)

```
Incoming HTTP Request (to developer's service)
    │
    ▼
withPayment(handler, { price: "0.01", currency: "USDC" })
    │
    ├─ Extract X-Payment header from request
    │
    ├─ IF no header:
    │   └─ Return 402 with payment requirements
    │       create402Response({ price, currency, address })
    │
    ├─ IF header present:
    │   └─ verifyPayment(payment, requirements)
    │       Calls: hey.lol facilitator /verify endpoint
    │       Returns: { valid: boolean, payer: string }
    │
    ├─ IF invalid:
    │   └─ Return 402 with error details
    │
    ├─ IF valid:
    │   └─ Call settlePayment(payment)
    │       Calls: hey.lol facilitator /settle endpoint
    │       Broadcasts transaction to Solana
    │
    ▼
handler(request, { payment: VerifiedPayment })
    │
    ▼
Developer's business logic runs
```

---

## Build Order Considerations

Dependencies flow in one direction. Build order must respect this:

```
1. core              — No internal dependencies
        ↓
2. services          — Imports types from core
        ↓
3. cloudflare        — Imports core + services
   vercel            — Imports core + services  (can build in parallel with cloudflare)
   express           — Imports core + services  (can build in parallel)
```

**Turborepo `turbo.json` pipeline:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

`"^build"` means "build all packages this package depends on first." Turborepo resolves the graph automatically from workspace `dependencies` in each `package.json`.

**pnpm workspace references:**

In `packages/services/package.json`:
```json
{
  "dependencies": {
    "@heylol/core": "workspace:*"
  }
}
```

During development, `workspace:*` resolves to the local package. At publish time, pnpm replaces it with the actual published version.

---

## Integration Points

### Internal Package Boundaries

| Boundary | Communication | Contract |
|----------|---------------|----------|
| core → services | Types only (no runtime import) | `PaymentPayload`, `X402Requirements` interfaces in `core/src/types/x402.ts` |
| core → adapters | Adapter imports `HeyLolClient` class and extends it | Client constructor options interface must be stable |
| services → adapters | Adapters import `withPayment`, `create402Response` from services | Handler wrapper function signature |
| adapters → adapters | No cross-adapter imports | Each adapter is independent |

### External Service Integration

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| hey.lol API | fetch with X-Payment header | Base URL configurable for testing |
| x402 Facilitator | fetch to /verify and /settle endpoints | Facilitator URL comes from 402 response body |
| Solana network | NOT directly called by SDK | Facilitator handles broadcast; SDK only serializes txs |
| @noble/curves | Direct import, tree-shakes to only ed25519 | No dynamic imports needed |
| bs58 | Direct import | Tiny library, always included in core bundle |

---

## Anti-Patterns

### Anti-Pattern 1: Importing Platform APIs in Core

**What people do:** Use `Buffer`, `process.env`, `crypto.createHash` (Node.js globals) in core package code.

**Why it's wrong:** Core breaks in Cloudflare Workers, Vercel Edge, Deno, browsers. These runtimes don't have Node.js built-ins. This is the #1 cause of "works locally, fails in production" for edge-deployed SDKs.

**Do this instead:** Use only Web Platform APIs — `globalThis.crypto.subtle` for crypto (or @noble/curves which is pure JS), `fetch` for HTTP, `TextEncoder`/`TextDecoder` for encoding. If a Node.js API is unavoidable, put it in the `express` adapter (Node-only) not core.

### Anti-Pattern 2: Publishing Separate Packages for Each Subpath

**What people do:** Publish `@heylol/sdk-core`, `@heylol/sdk-services`, `@heylol/sdk-cloudflare` as separate npm packages to get independent versioning.

**Why it's wrong:** Consumers must manage multiple package versions. A breaking change to core types causes a coordination problem across all dependent packages. The `@heylol/sdk/services` subpath import UX is better than `@heylol/sdk-services`.

**Do this instead:** Publish a single `@heylol/sdk` package with subpath exports. Use semver normally. If adapters truly need independent versioning later (they're on major version N+2 due to CF API changes), split them out then — premature splitting adds complexity now.

### Anti-Pattern 3: Signing in the Hot Path Without Caching

**What people do:** Build a fresh signed payment for every single API request, including retries.

**Why it's wrong:** Ed25519 signing via @noble/curves is fast (~1ms) but payment headers are request-specific (include endpoint, amount). The 402 round-trip overhead is the real cost — not the signing. However, payment *requirements* (what the server expects) CAN be cached per endpoint.

**Do this instead:** Cache `X402Requirements` (the 402 response body) per endpoint URL. On cache hit, skip the probe request and go directly to signed request. Cache TTL should be short (60 seconds) since payment requirements can change.

### Anti-Pattern 4: Exposing Raw Transaction Bytes to Consumers

**What people do:** Surface the Solana transaction construction as a public API so consumers can "customize" it.

**Why it's wrong:** It leaks x402/Solana internals that the SDK is supposed to hide. Consumers shouldn't need to know a transaction exists.

**Do this instead:** The transaction builder is internal to `src/auth/solana.ts`. The public API is `new HeyLolClient({ privateKey })`. If advanced users need custom transaction logic, accept a `transactionBuilder` option in the constructor — a function, not raw bytes.

### Anti-Pattern 5: Using `exports["./*"]` Glob Instead of Explicit Subpaths

**What people do:** Use `"./*": "./dist/*/index.js"` to lazily expose all subfolders as subpaths.

**Why it's wrong:** TypeScript's module resolution doesn't resolve glob subpaths correctly in all configurations. It also exposes internal paths unintentionally. IDE autocomplete doesn't work with globs.

**Do this instead:** List each subpath explicitly. For this SDK there are only 5 subpaths — the verbosity is worth the correctness.

---

## Scaling Considerations

This is an SDK, not a server — "scaling" means adoption-time concerns:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–100 consumers | Single published package, manual publish workflow |
| 100–1k consumers | Add `publint` and `attw` (Are the Types Wrong?) to CI to catch export misconfiguration before publish |
| 1k+ consumers | Consider splitting CF/Vercel adapters to separate packages if they accumulate platform-specific dependencies that bloat installs for non-CF users |

### Bundle Size Checkpoints

- Core bundle target: < 100 KB minified (per PROJECT.md constraint)
- `@noble/curves/ed25519` alone is ~25 KB minified. Leaves ~75 KB for client, auth, types.
- `bs58` is ~3 KB. Well within budget.
- Services adds ~10 KB (verify/settle/response logic). Acceptable.
- Adapters should each be < 5 KB since they're thin wrappers.

---

## Sources

- Node.js Package Exports documentation (verified): https://nodejs.org/api/packages.html#subpath-exports — HIGH confidence for exports field syntax and conditional exports specification
- TypeScript `moduleResolution` documentation (training data, Medium confidence): `bundler` mode reads `exports`, `node16` requires explicit extensions
- Stripe Node.js SDK architecture (training data, Medium confidence) — Resource class pattern, constructor injection, retry loop
- Octokit SDK architecture (training data, Medium confidence) — Plugin composition pattern (noted but not recommended for this SDK's scale)
- Turborepo pipeline `^build` pattern (training data, Medium confidence) — Standard for monorepo dependency-aware builds
- x402 protocol specification by Coinbase (training data, Medium confidence) — HTTP 402 flow, X-Payment header format, facilitator verify/settle pattern
- @noble/curves Ed25519 API (training data, Medium confidence) — Pure JS signing, no platform dependencies

**Gaps requiring validation:**
- Exact x402 payload format that hey.lol's facilitator expects (LOW confidence — verify against actual API)
- Zero-amount transaction serialization format (LOW confidence — test against real facilitator)
- Whether hey.lol uses x402 v1 or v2 response format (LOW confidence — check API docs or existing integration code)
- Whether `moduleResolution: "bundler"` consumers can resolve `@heylol/sdk/services` without additional tsconfig (verify during Phase 1 development)

---

*Architecture research for: hey.lol SDK — multi-runtime TypeScript monorepo*
*Researched: 2026-02-28*
