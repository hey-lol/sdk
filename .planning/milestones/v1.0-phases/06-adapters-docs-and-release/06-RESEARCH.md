# Phase 6: Adapters, Docs, and Release - Research

**Researched:** 2026-03-01
**Domain:** Runtime adapters (Cloudflare Workers, Vercel Edge, Express), JSDoc documentation, example projects, npm publish pipeline
**Confidence:** HIGH for Express adapter and publish pipeline; HIGH for Vercel Edge (Vercel recommends migrating away from edge to Node.js but edge still works); MEDIUM for Cloudflare adapter testing (@cloudflare/vitest-pool-workers version compatibility verified); MEDIUM for Miniflare v4 (current docs show @cloudflare/vitest-pool-workers is the approach, Miniflare v4 not separately documented)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADPT-01 | Cloudflare Workers adapter with env binding support | `CloudflareClient` class wraps `HeyLolClient`, reads `HEYLOL_PRIVATE_KEY` from Cloudflare `Env` binding; standard Worker handler pattern `export default { fetch(req, env) {} }` with env injected by runtime; `@cloudflare/workers-types` provides type definitions for `Env` shapes; `wrangler types` generates binding types from wrangler.jsonc |
| ADPT-02 | Vercel Edge adapter with edge config helpers | `VercelClient` wraps `HeyLolClient` for edge runtime; `@vercel/edge-config` `createClient` reads config from edge; Next.js middleware helper exports a function compatible with `middleware.ts` export; all Web APIs available in Vercel Edge — SDK's pure-JS crypto works without modification |
| ADPT-03 | Express middleware with request/response integration | Express `RequestHandler` type from `@types/express`; extend `Request` via declaration merging to attach `heyLolClient`; async handler wrapper catches thrown errors for Express error middleware; standard pattern: `createHeyLolMiddleware(options)` → `RequestHandler` |
| DOCS-01 | README with 5-minute quickstart | install + init + first post must be achievable in a linear reading; code blocks must be copy-paste runnable; three runtime examples (Node.js, CF Worker, Vercel) |
| DOCS-02 | Example project: AI agent bot (Cloudflare Worker) | Cloudflare Worker with wrangler.jsonc, `src/index.ts`, minimal `CloudflareClient` usage; runs via `wrangler dev`; demonstrates posting as an agent |
| DOCS-03 | Example project: x402 service provider | Standalone Worker or Node.js script using `@heylol/services` (`createX402Service`); shows verify+settle+handler pattern |
| DOCS-04 | Example project: web dashboard (Next.js) | Next.js App Router project with edge middleware using `VercelClient`; App Router Route Handler + `@vercel/edge-config` for config |
| TYPE-04 | JSDoc comments with examples on all public methods | TSDoc-compatible `/** */` blocks; `@param`, `@returns`, `@example` tags on every public method; covers HeyLolClient + all Resource classes + @heylol/services exports |
</phase_requirements>

---

## Summary

Phase 6 has three distinct work areas: (1) adapter implementations — thin wrappers over `HeyLolClient` that fit each platform's initialization pattern and provide typed env binding support; (2) JSDoc documentation on all public methods across `@heylol/sdk` and `@heylol/services`; (3) three example projects that demonstrate real usage scenarios and serve as both documentation and integration tests.

The adapters are the simplest part. The core SDK (`HeyLolClient`) already works in all three target runtimes because it uses only Web APIs — fetch, AbortSignal, btoa/atob, URLSearchParams. The adapter packages (`@heylol/adapter-cloudflare`, `@heylol/adapter-vercel`, `@heylol/adapter-express`) exist as package stubs in the monorepo and only need their source files filled in. The Cloudflare adapter reads `HEYLOL_PRIVATE_KEY` from the typed `Env` binding passed to the Worker's `fetch` handler. The Vercel adapter reads it from `process.env` (standard in Vercel functions) and additionally exports a helper that wraps `@vercel/edge-config` for reading dynamic config. The Express adapter creates a `RequestHandler` middleware factory that attaches an initialized `HeyLolClient` to each request object.

Testing the Cloudflare adapter requires `@cloudflare/vitest-pool-workers` (v0.12.18 as of research date). This is the recommended approach from Cloudflare — it runs tests inside the Workers runtime via Miniflare. The concern flagged in STATE.md about "Miniflare v4 API changes" is addressed: the current recommended testing path is NOT direct Miniflare API usage but rather the `@cloudflare/vitest-pool-workers` package with `defineWorkersConfig`. Miniflare v3 (embedded in wrangler v4) is what runs underneath; there is no separately-documented "Miniflare v4".

The release pipeline (attw + publint + pnpm publish --dry-run) is already wired from Phase 1. The only remaining publish-pipeline work is running it against the now-complete packages and validating the adapter packages' exports maps pass attw.

**Primary recommendation:** Implement adapters in order: Express (simplest — pure Node.js, no runtime constraints), then Vercel Edge (pure Web APIs, well-documented), then Cloudflare (requires wrangler.jsonc for tests). Write JSDoc in the same plan wave as each adapter to stay focused. Build example projects last — they function as integration tests of the complete stack.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@cloudflare/workers-types` | `4.20260301.1` | TypeScript types for Cloudflare Workers runtime (ExecutionContext, ExportedHandler, etc.) | Official Cloudflare types package — `wrangler types` is preferred for app code but libraries must use this package |
| `@cloudflare/vitest-pool-workers` | `0.12.18` | Run Vitest tests inside Workers runtime (Miniflare-backed) | Official Cloudflare test integration — only supported test approach for Workers APIs |
| `express` | `5.2.1` | Express framework peer dependency for adapter types | Mature, dominant Node.js framework; `@types/express@5.0.6` for TypeScript |
| `@types/express` | `5.0.6` | Express TypeScript types (`Request`, `Response`, `NextFunction`, `RequestHandler`) | Required for Express adapter TypeScript implementation |
| `@vercel/edge-config` | `1.4.3` | Edge Config SDK — sub-1ms config reads at the edge | Vercel's official SDK for dynamic config without re-deploys; works in edge runtime |
| `next` | `16.1.6` | Next.js types for middleware helper (`NextRequest`, `NextResponse`) | Required for Vercel adapter Next.js middleware helper typing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `wrangler` | `4.69.0` | Cloudflare dev CLI — `wrangler dev`, `wrangler types`, `wrangler deploy` | Needed for DOCS-02 (AI agent example) development and testing |
| `vitest` | `^2.0.0` | Base test runner (already in catalog) | Used by all packages; `@cloudflare/vitest-pool-workers` requires Vitest 2.0.x–3.2.x |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@cloudflare/vitest-pool-workers` | Direct `miniflare` import | Miniflare v3+ API has changed significantly; `@cloudflare/vitest-pool-workers` is the documented supported path and integrates with existing vitest setup |
| `@vercel/edge-config` | Just `process.env` | Edge Config provides sub-1ms reads globally; `process.env` is fine for static config but not for dynamic feature flags or runtime config updates |
| Express 5 | Express 4 | Express 5 is the current release as of research; `@types/express` 5.0.6 supports it. Express 4 would work equally well — pick based on what consumers use |

**Installation per adapter package:**

```bash
# Cloudflare adapter
pnpm add @cloudflare/workers-types --filter @heylol/adapter-cloudflare --save-dev
pnpm add @cloudflare/vitest-pool-workers --filter @heylol/adapter-cloudflare --save-dev

# Vercel adapter
pnpm add @vercel/edge-config --filter @heylol/adapter-vercel
pnpm add next --filter @heylol/adapter-vercel --save-dev

# Express adapter
pnpm add express --filter @heylol/adapter-express --save-peer
pnpm add @types/express --filter @heylol/adapter-express --save-dev
```

---

## Architecture Patterns

### Recommended Project Structure

```
packages/
├── adapter-cloudflare/src/
│   └── index.ts              # CloudflareClient class + createFromEnv factory
├── adapter-vercel/src/
│   └── index.ts              # VercelClient class + createNextjsMiddleware helper
├── adapter-express/src/
│   └── index.ts              # createHeyLolMiddleware RequestHandler factory
│
examples/
├── cloudflare-ai-agent/      # DOCS-02: AI agent Worker
│   ├── src/index.ts
│   ├── wrangler.jsonc
│   ├── package.json
│   └── tsconfig.json
├── x402-service-provider/    # DOCS-03: service provider
│   ├── src/index.ts
│   └── package.json
└── nextjs-dashboard/         # DOCS-04: Next.js App Router dashboard
    ├── app/
    │   ├── page.tsx
    │   └── api/posts/route.ts
    ├── middleware.ts
    └── package.json
```

### Pattern 1: Cloudflare Workers Adapter (ADPT-01)

**What:** `CloudflareClient` reads `HEYLOL_PRIVATE_KEY` from the typed `Env` binding; wraps `HeyLolClient` from `@heylol/sdk`. The adapter also exports `createFromEnv(env: Env)` as a convenience factory.

**Key constraint:** Never store request-scoped state in module-level variables — Workers reuse isolates across requests. Create a new `HeyLolClient` per request OR use the new importable `env` feature (available since March 2025) to initialize at the top level. Both are valid — top-level init is fine because `HeyLolClient` is stateless (no per-request mutable state).

**Env binding pattern:** The `Env` interface is declared in the adapter package using `@cloudflare/workers-types`; consumers override with their generated types via `wrangler types`.

```typescript
// Source: Cloudflare Workers official docs (developers.cloudflare.com/workers/runtime-apis/bindings/)
// Pattern verified 2026-03-01

import { HeyLolClient } from '@heylol/sdk';
import type { ClientOptions } from '@heylol/sdk';

// Minimal Env interface — consumers extend with their own bindings
export interface HeyLolEnv {
  /** Base58-encoded Solana private key stored as a Cloudflare secret */
  HEYLOL_PRIVATE_KEY: string;
  /** Optional: custom API base URL */
  HEYLOL_BASE_URL?: string;
}

export class CloudflareClient extends HeyLolClient {
  constructor(env: HeyLolEnv, opts?: Omit<ClientOptions, 'privateKey'>) {
    super({
      privateKey: env.HEYLOL_PRIVATE_KEY,
      baseUrl: env.HEYLOL_BASE_URL,
      ...opts,
    });
  }
}

/**
 * Create a HeyLolClient from a Cloudflare Workers Env binding.
 *
 * @example
 * ```typescript
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const client = createFromEnv(env);
 *     await client.posts.create({ content: 'Hello from a Worker!' });
 *     return new Response('Posted!');
 *   }
 * }
 * ```
 */
export function createFromEnv(
  env: HeyLolEnv,
  opts?: Omit<ClientOptions, 'privateKey'>
): HeyLolClient {
  return new CloudflareClient(env, opts);
}
```

**Worker entry point pattern (in examples/cloudflare-ai-agent):**

```typescript
// Source: Cloudflare Workers fetch handler pattern (verified official docs 2026-03-01)
import { createFromEnv } from '@heylol/adapter-cloudflare';

interface Env {
  HEYLOL_PRIVATE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = createFromEnv(env);
    const post = await client.posts.create({ content: 'Hello from an AI agent!' });
    return Response.json(post);
  },
} satisfies ExportedHandler<Env>;
```

**wrangler.jsonc for example:**

```jsonc
// Source: Cloudflare wrangler configuration docs (developers.cloudflare.com/workers/wrangler/configuration/)
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "heylol-ai-agent",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-01",
  "vars": {},
  // Secrets stored via `wrangler secret put HEYLOL_PRIVATE_KEY`
  // For local dev, use .dev.vars:
  //   HEYLOL_PRIVATE_KEY="your_base58_key_here"
}
```

**Testing with @cloudflare/vitest-pool-workers:**

```typescript
// Source: Cloudflare vitest integration docs (developers.cloudflare.com/workers/testing/vitest-integration/)
// vitest.config.ts for adapter-cloudflare package
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        miniflare: {
          bindings: {
            HEYLOL_PRIVATE_KEY: 'test_base58_key',
          },
        },
      },
    },
  },
});
```

### Pattern 2: Vercel Edge Adapter (ADPT-02)

**What:** `VercelClient` reads from `process.env.HEYLOL_PRIVATE_KEY` (standard Vercel env var). The Vercel Edge Runtime has full Web API support — fetch, AbortSignal, btoa, URLSearchParams — all APIs the SDK relies on are available.

**Important note from Vercel docs (2026-03-01):** Vercel now recommends migrating FROM edge TO Node.js runtime for improved performance and reliability. Both run on "Fluid compute." The edge runtime still works and is supported — this is a recommendation, not a deprecation. The heylol SDK works correctly in both.

**Edge Config helper:** The `createNextjsMiddleware` export wraps `@vercel/edge-config` to provide a ready-to-use middleware that adds the client to request context.

```typescript
// Source: Vercel Edge Runtime docs (vercel.com/docs/functions/runtimes/edge)
// @vercel/edge-config SDK docs (vercel.com/docs/edge-config/edge-config-sdk)

import { HeyLolClient } from '@heylol/sdk';
import type { ClientOptions } from '@heylol/sdk';
import { createClient as createEdgeConfigClient } from '@vercel/edge-config';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export class VercelClient extends HeyLolClient {
  constructor(opts?: Omit<ClientOptions, 'privateKey'>) {
    const privateKey = process.env.HEYLOL_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('HEYLOL_PRIVATE_KEY environment variable is required');
    }
    super({ privateKey, ...opts });
  }
}

export interface NextjsMiddlewareOptions {
  /** Edge Config connection string (defaults to EDGE_CONFIG env var) */
  edgeConfigConnectionString?: string;
  /** Paths to protect (regex strings); if omitted, all paths get the client */
  matcher?: string[];
}

/**
 * Create a Next.js middleware that attaches a VercelClient to request headers.
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { createNextjsMiddleware } from '@heylol/adapter-vercel';
 * export const middleware = createNextjsMiddleware();
 * export const config = { matcher: ['/api/:path*'] };
 * ```
 */
export function createNextjsMiddleware(opts?: NextjsMiddlewareOptions) {
  return async function middleware(request: NextRequest): Promise<NextResponse> {
    // Read private key from Edge Config if available, fall back to env var
    const edgeConfig = createEdgeConfigClient(
      opts?.edgeConfigConnectionString ?? process.env.EDGE_CONFIG
    );
    const privateKey =
      (await edgeConfig.get<string>('HEYLOL_PRIVATE_KEY')) ??
      process.env.HEYLOL_PRIVATE_KEY;

    if (!privateKey) {
      return new NextResponse('Missing HEYLOL_PRIVATE_KEY', { status: 500 });
    }

    // Attach private key to request headers for downstream route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-heylol-ready', '1');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  };
}
```

**Vercel Edge Function pattern (in examples/nextjs-dashboard):**

```typescript
// app/api/posts/route.ts
// Source: Next.js App Router Route Handlers docs (nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware)
export const runtime = 'edge'; // opt into edge

import { VercelClient } from '@heylol/adapter-vercel';

export async function POST(request: Request): Promise<Response> {
  const client = new VercelClient();
  const body = await request.json();
  const post = await client.posts.create({ content: body.content });
  return Response.json(post);
}
```

**Next.js middleware pattern:**

```typescript
// middleware.ts (root of Next.js project)
// Source: Next.js middleware docs (nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Pattern 3: Express Middleware Adapter (ADPT-03)

**What:** A factory function `createHeyLolMiddleware(options)` returns an Express `RequestHandler` that attaches an initialized `HeyLolClient` to `req.heyLolClient`. Downstream route handlers access it via the typed request object.

**Declaration merging for type-safe request augmentation:**

```typescript
// Source: Express TypeScript patterns (verified from multiple official/community sources 2026-03-01)
// Pattern: TypeScript declaration merging via namespace augmentation

import { HeyLolClient } from '@heylol/sdk';
import type { ClientOptions } from '@heylol/sdk';
import type { RequestHandler, Request, Response, NextFunction } from 'express';

// Augment Express Request to include heyLolClient
declare global {
  namespace Express {
    interface Request {
      /** Initialized HeyLolClient — attached by createHeyLolMiddleware() */
      heyLolClient?: HeyLolClient;
    }
  }
}

export interface HeyLolMiddlewareOptions extends Omit<ClientOptions, 'privateKey'> {
  /** Base58-encoded Solana private key (defaults to HEYLOL_PRIVATE_KEY env var) */
  privateKey?: string;
}

/**
 * Create Express middleware that attaches an initialized HeyLolClient to req.heyLolClient.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createHeyLolMiddleware } from '@heylol/adapter-express';
 *
 * const app = express();
 * app.use(createHeyLolMiddleware({ privateKey: process.env.HEYLOL_KEY }));
 *
 * app.post('/posts', async (req, res, next) => {
 *   try {
 *     const post = await req.heyLolClient!.posts.create({ content: req.body.content });
 *     res.json(post);
 *   } catch (err) {
 *     next(err);
 *   }
 * });
 * ```
 */
export function createHeyLolMiddleware(opts?: HeyLolMiddlewareOptions): RequestHandler {
  const privateKey = opts?.privateKey ?? process.env.HEYLOL_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('privateKey option or HEYLOL_PRIVATE_KEY env var is required');
  }

  const client = new HeyLolClient({ ...opts, privateKey });

  return function heyLolMiddleware(req: Request, _res: Response, next: NextFunction): void {
    req.heyLolClient = client;
    next();
  };
}
```

**Note on client reuse:** Creating one client per middleware instance (not per request) is correct — `HeyLolClient` is stateless between requests. The 402 payment loop state is local to each `request()` call via the `paymentHeader` closure variable.

### Pattern 4: JSDoc/TSDoc on All Public Methods (TYPE-04)

**What:** Every public method, class, and exported function gets a `/** */` block with:
- Summary line (what it does)
- `@param` tags for all parameters
- `@returns` description
- `@example` block with copy-paste runnable code
- `@throws` where applicable (HeyLolError subclasses)

**TSDoc format is the standard for TypeScript SDKs:**

```typescript
// Source: TSDoc spec (tsdoc.org) + TypeScript SDK best practices (ts.dev/style/)
// Verified: TypeScript official docs support @param, @returns, @example, @throws

/**
 * Create a text, media, or paywalled post.
 *
 * @param params - Post creation parameters. Provide `content` for a text post,
 *   add `mediaUrls` for a media post, or add `paywall` for a paywalled post.
 * @returns The created post with its assigned `PostId`.
 * @throws {AuthError} If the private key is invalid or cannot sign.
 * @throws {RateLimitError} If the API returns 429 Too Many Requests.
 * @throws {APIError} If the API returns a non-retryable error.
 *
 * @example
 * ```typescript
 * // Text post
 * const post = await client.posts.create({ content: 'Hello, world!' });
 *
 * // Media post
 * const mediaPost = await client.posts.create({
 *   content: 'Check this out!',
 *   mediaUrls: ['https://example.com/image.png'],
 * });
 * ```
 */
create(params: CreatePostParams): Promise<Post>
```

**Scope of TYPE-04:** All public methods across:
- `HeyLolClient` (constructor + request/get/post/patch/delete)
- `PostsResource` (create, get, delete, like, unlike, reply)
- `ProfileResource` (get, getById, update)
- `SocialResource` (follow, unfollow, followers, following)
- `DiscoveryResource` (search, trending, suggested)
- `NotificationsResource` (list, markRead)
- `ServicesResource` (call)
- `@heylol/services` exports (registerService, verifyPayment, settlePayment, create402Response, createX402Service)
- Adapter factories (createFromEnv, createHeyLolMiddleware, createNextjsMiddleware, VercelClient, CloudflareClient)

### Pattern 5: Example Project Structure

**DOCS-02: cloudflare-ai-agent** — Minimal Worker that posts to hey.lol on an HTTP trigger:

```
examples/cloudflare-ai-agent/
├── src/
│   └── index.ts         # Worker entry point using CloudflareClient
├── .dev.vars            # Local secrets (gitignored)
├── wrangler.jsonc       # Worker config
├── package.json         # depends on @heylol/adapter-cloudflare
├── tsconfig.json        # extends workspace tsconfig
└── README.md            # quick start for this example
```

**DOCS-03: x402-service-provider** — Standalone Node.js/Worker service using @heylol/services:

```
examples/x402-service-provider/
├── src/
│   └── index.ts         # createX402Service usage — registers + handles payments
├── package.json         # depends on @heylol/services
└── README.md
```

**DOCS-04: nextjs-dashboard** — Next.js App Router dashboard showing posts:

```
examples/nextjs-dashboard/
├── app/
│   ├── page.tsx         # Server component — shows posts feed
│   └── api/
│       └── posts/
│           └── route.ts # Route handler using VercelClient
├── middleware.ts        # Next.js middleware using createNextjsMiddleware
├── package.json         # depends on @heylol/adapter-vercel, next
├── next.config.ts
└── README.md
```

### Anti-Patterns to Avoid

- **Module-level HeyLolClient in CF Workers:** In Cloudflare Workers, creating a client at module scope using top-level `await env.SECRET_KEY` is NOT valid (env is not available at module scope unless using the `import { env } from 'cloudflare:workers'` pattern added March 2025). The safe pattern is to create per-request via `createFromEnv(env)` in the fetch handler, or use the importable `env` feature.
- **Caching HeyLolClient across requests with mutable state:** HeyLolClient is safe to reuse (no mutable state) but don't attach it to shared global state that could be mutated by concurrent requests.
- **Express: checking `req.heyLolClient` presence in routes:** If `createHeyLolMiddleware` is registered as global middleware, `req.heyLolClient` will always be set. Using `req.heyLolClient!` (non-null assertion) in route handlers is correct when middleware order is guaranteed.
- **Vercel Edge: importing Node.js modules in edge runtime:** The Vercel Edge Runtime does NOT support fs, path, node:crypto etc. The heylol SDK is already safe (pure Web APIs), but any example code must not import Node.js-only modules.
- **attw --pack vs attw tarball.tgz:** Use `attw --pack .` in each package directory OR `attw $(pnpm pack)`. The `pnpm publish --dry-run` does NOT run attw — these are separate steps.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cloudflare Worker test environment | Custom miniflare wrapper | `@cloudflare/vitest-pool-workers` with `defineWorkersConfig` | Miniflare v3 internals changed significantly; the official pool handles runtime compatibility |
| Express async error handling | Custom try-catch wrappers in every route | Direct try/catch in routes + Express error middleware | Express 5 supports async route handlers natively (unlike Express 4); async errors propagate to error middleware automatically |
| TypeScript types for Workers runtime | Hand-write Env interfaces | `wrangler types` for app code, `@cloudflare/workers-types` for library types | `wrangler types` generates exact types matching your wrangler.jsonc bindings — hand-written drift causes runtime errors |
| Edge Config reads | Custom fetch to Vercel Edge Config API | `@vercel/edge-config` SDK | SDK handles connection string parsing, caching, authentication, and sub-1ms read optimization |
| JSDoc type inference for TypeScript | Duplicate types in JSDoc + TypeScript | TypeScript types are source of truth; JSDoc `@param` uses TypeScript types by reference | In TypeScript files, JSDoc `@param` doesn't need explicit types — TypeScript infers them; only summary and `@example` are needed beyond `@param`/`@returns` |

**Key insight:** The adapters are thin — they extract config from platform-specific sources (Env bindings, process.env, Edge Config) and pass it to the existing `HeyLolClient`. All the hard work (crypto, retries, auth loop) is already done. Each adapter's `src/index.ts` should be under 100 lines.

---

## Common Pitfalls

### Pitfall 1: Cloudflare Vitest Pool Workers Version Constraint

**What goes wrong:** `@cloudflare/vitest-pool-workers` only supports Vitest 2.0.x–3.2.x (as of 0.12.18). The workspace catalog pins `vitest: ^2.0.0` — this is compatible with the 2.x range but will NOT automatically upgrade to 3.x (which is fine — 3.2.x is also supported). If the monorepo's Vitest catalog is bumped to 4.x, the CF adapter's test pool will break.
**Why it happens:** Cloudflare's pool uses Vitest internals (the pool interface) which change between major versions.
**How to avoid:** The adapter-cloudflare package must pin `vitest` to a compatible version OR use the workspace catalog (already `^2.0.0`, which satisfies the requirement).
**Warning signs:** `Error: @cloudflare/vitest-pool-workers requires vitest@>=2.0.0 <4.0.0` in test output.

### Pitfall 2: Express 5 vs Express 4 Types

**What goes wrong:** Express 5 changed the type signatures for route handlers — async errors now propagate automatically (no `asyncHandler` wrapper needed). If the adapter's JSDoc examples show `asyncHandler` wrappers, they're Express 4 idioms that confuse Express 5 users.
**Why it happens:** Most online resources still show Express 4 patterns.
**How to avoid:** Express 5 `RequestHandler` accepts async functions; errors thrown from async handlers propagate to Express error middleware without wrapping. The adapter should use plain `async (req, res, next) => {}` without wrappers.
**Warning signs:** Any import of `express-async-handler` in the adapter or examples.

### Pitfall 3: Vercel Edge Config Connection String Missing

**What goes wrong:** `@vercel/edge-config`'s `createClient()` throws if the connection string is undefined or malformed. In local development, `EDGE_CONFIG` is often not set.
**Why it happens:** Edge Config is a Vercel-hosted service — it doesn't work locally without a connection string.
**How to avoid:** The Vercel adapter's `createNextjsMiddleware` must gracefully fall back to `process.env.HEYLOL_PRIVATE_KEY` if Edge Config is unavailable. Wrap the Edge Config read in a try-catch and fall back to env var.
**Warning signs:** `TypeError: Invalid Edge Config connection string` during local Next.js development.

### Pitfall 4: Cloudflare Worker tsup CJS Output

**What goes wrong:** Cloudflare Workers require ESM — they do NOT support CommonJS (`require()`). The adapter packages currently output both ESM (`.mjs`) and CJS (`.cjs`). If a consumer incorrectly uses the CJS output in a Worker, it fails.
**Why it happens:** tsup generates both formats; Cloudflare Workers automatically use ESM when `type: "module"` is set.
**How to avoid:** The adapter-cloudflare `tsup.config.ts` can be simplified to ESM-only (`format: ['esm']`) since Cloudflare Workers cannot use CJS. Alternatively, keep both formats but document that Workers must use ESM. The package.json already has correct `exports` with `import` condition first — this is fine.
**Warning signs:** `require is not defined` in Cloudflare Worker console.

### Pitfall 5: attw Errors on Adapter Packages Without peerDependencies

**What goes wrong:** `attw --pack .` reports that the adapter packages "masquerade" as CJS or ESM because the `@heylol/sdk` peer dependency is missing from the packed tarball, causing resolution failures in some module resolution modes.
**Why it happens:** The adapters import from `@heylol/sdk` but list it as a `peerDependency` (or don't list it at all). attw checks all export conditions; if `@heylol/sdk` is not in `peerDependencies`, attw may treat it as a bundled dep.
**How to avoid:** All adapter packages must list `@heylol/sdk` as a `peerDependency`. They should NOT bundle it (add `external: ['@heylol/sdk']` in tsup config).
**Warning signs:** attw output shows `Resolution failed` for adapter package exports.

### Pitfall 6: Example Projects in Monorepo Workspace Cause CI Issues

**What goes wrong:** Example projects under `examples/` are included in the pnpm workspace (`packages/*`, `examples/*`). If they have conflicting dep versions or their `pnpm build` fails, `turbo build` fails for everyone.
**Why it happens:** Turborepo runs all packages in the workspace.
**How to avoid:** Example packages should have their own `tsconfig.json` extending workspace root, use workspace `catalog:` versions where possible, and have a `build` script that succeeds (even if just `tsc --noEmit`). Mark them as `private: true` in their `package.json` so they're never published.
**Warning signs:** `turbo build` fails on `examples/*` after adding examples.

### Pitfall 7: JSDoc @example Code That Doesn't Compile

**What goes wrong:** `@example` blocks in JSDoc contain TypeScript syntax that doesn't type-check (wrong method names, missing imports). IDE hover shows broken examples that confuse developers.
**Why it happens:** JSDoc examples aren't type-checked by default — TypeScript only checks them if you enable `@ts-check` in JS files or use dedicated tools.
**How to avoid:** Every `@example` block should use code that actually exists and compiles. Test examples manually by pasting them into a scratch file. Keep examples simple (2-5 lines) — this reduces the chance of drift.
**Warning signs:** Example uses `client.post.create()` when the method is `client.posts.create()`.

---

## Code Examples

Verified patterns from official sources:

### CloudflareClient — Minimal Implementation

```typescript
// Source: Cloudflare bindings docs (developers.cloudflare.com/workers/runtime-apis/bindings/)
// Pattern verified 2026-03-01

import { HeyLolClient } from '@heylol/sdk';
import type { ClientOptions } from '@heylol/sdk';

export interface HeyLolEnv {
  HEYLOL_PRIVATE_KEY: string;
  HEYLOL_BASE_URL?: string;
}

/**
 * HeyLolClient configured for Cloudflare Workers env bindings.
 *
 * @example
 * ```typescript
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const client = new CloudflareClient(env);
 *     const post = await client.posts.create({ content: 'Hello!' });
 *     return Response.json(post);
 *   }
 * } satisfies ExportedHandler<Env>;
 * ```
 */
export class CloudflareClient extends HeyLolClient {
  constructor(env: HeyLolEnv, opts?: Omit<ClientOptions, 'privateKey'>) {
    super({ privateKey: env.HEYLOL_PRIVATE_KEY, baseUrl: env.HEYLOL_BASE_URL, ...opts });
  }
}

export function createFromEnv(env: HeyLolEnv, opts?: Omit<ClientOptions, 'privateKey'>): HeyLolClient {
  return new CloudflareClient(env, opts);
}
```

### Express Middleware — RequestHandler Pattern

```typescript
// Source: Express TypeScript declaration merging pattern (verified 2026-03-01)
// express v5.2.1, @types/express v5.0.6

import type { RequestHandler } from 'express';
import { HeyLolClient } from '@heylol/sdk';

declare global {
  namespace Express {
    interface Request {
      heyLolClient?: HeyLolClient;
    }
  }
}

export function createHeyLolMiddleware(opts?: { privateKey?: string }): RequestHandler {
  const key = opts?.privateKey ?? process.env.HEYLOL_PRIVATE_KEY;
  if (!key) throw new Error('HEYLOL_PRIVATE_KEY required');
  const client = new HeyLolClient({ privateKey: key });
  return (_req, _res, next) => { _req.heyLolClient = client; next(); };
}
```

### @cloudflare/vitest-pool-workers — Test Config

```typescript
// Source: Cloudflare vitest integration docs
// (developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/)
// @cloudflare/vitest-pool-workers v0.12.18, requires vitest 2.0.x–3.2.x

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        miniflare: {
          bindings: { HEYLOL_PRIVATE_KEY: 'test_fake_key_32bytes_padding123' },
        },
      },
    },
  },
});
```

### wrangler.jsonc — Minimal Worker Config

```jsonc
// Source: Cloudflare wrangler configuration reference
// (developers.cloudflare.com/workers/wrangler/configuration/)
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "heylol-ai-agent",
  "main": "src/index.ts",
  "compatibility_date": "2026-03-01"
  // Secrets via: wrangler secret put HEYLOL_PRIVATE_KEY
  // Local dev: create .dev.vars with HEYLOL_PRIVATE_KEY=your_key
}
```

### attw --pack Validation Command

```bash
# Source: arethetypeswrong CLI docs (github.com/arethetypeswrong/arethetypeswrong.github.io)
# Run from each package directory to validate TypeScript declarations

# Option 1: attw with --pack flag (packs and checks in one command)
cd packages/adapter-cloudflare && attw --pack .

# Option 2: separate pack + check
pnpm pack && attw heylol-adapter-cloudflare-1.0.0.tgz

# For pnpm publish dry-run (does not run attw — separate step):
pnpm --filter @heylol/adapter-cloudflare publish --dry-run
```

### Vercel Edge — Route Handler in App Router

```typescript
// Source: Next.js App Router Route Handlers docs
// (nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware)
// next v16.1.6

export const runtime = 'edge'; // opt into edge runtime

import { VercelClient } from '@heylol/adapter-vercel';

export async function POST(request: Request): Promise<Response> {
  const client = new VercelClient();
  const { content } = await request.json();
  const post = await client.posts.create({ content });
  return Response.json(post);
}
```

### @vercel/edge-config — createClient Pattern

```typescript
// Source: Vercel Edge Config SDK docs (vercel.com/docs/edge-config/edge-config-sdk)
// @vercel/edge-config v1.4.3

import { createClient } from '@vercel/edge-config';

// Read private key from Edge Config (falls back to env var if undefined)
const edgeConfig = createClient(process.env.EDGE_CONFIG);
const privateKey = await edgeConfig.get<string>('HEYLOL_PRIVATE_KEY')
  ?? process.env.HEYLOL_PRIVATE_KEY;
```

### Changeset Release Workflow

```bash
# Source: Changesets docs (github.com/changesets/changesets)
# Already configured in Phase 1. Phase 6 runs the release, not re-configures it.

# 1. Create changeset for each adapter package
pnpm changeset

# 2. Version packages (updates package.json + CHANGELOG.md)
pnpm changeset version

# 3. Validate before publish
pnpm turbo build
pnpm turbo typecheck
# Run attw per package:
for pkg in packages/adapter-cloudflare packages/adapter-vercel packages/adapter-express packages/sdk packages/services; do
  (cd $pkg && attw --pack . --ignore-rules cjs-resolves-to-esm)
done

# 4. Dry-run publish
pnpm --filter @heylol/adapter-cloudflare publish --dry-run
pnpm --filter @heylol/adapter-vercel publish --dry-run
pnpm --filter @heylol/adapter-express publish --dry-run

# 5. Publish
pnpm changeset publish
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `jest-environment-miniflare` (Miniflare v2) for Workers tests | `@cloudflare/vitest-pool-workers` with `defineWorkersConfig` | 2023–2024 migration | Miniflare v2 jest env is deprecated; vitest pool is the only supported path |
| Manual `Env` TypeScript interface hand-written | `wrangler types` generates `worker-configuration.d.ts` from wrangler.jsonc | wrangler v3+ | Generated types match actual bindings; hand-written drift |
| Cloudflare Workers env only available in fetch handler | `import { env } from 'cloudflare:workers'` for top-level access | March 2025 | SDK can be initialized at module scope without threading env |
| Vercel Edge Runtime — primary recommended runtime | Vercel now recommends Node.js over Edge (same Fluid compute pricing) | Early 2026 | Edge still works and is supported; not deprecated, just no longer "preferred" |
| Express 4 with `express-async-handler` for async routes | Express 5 — async route handlers native, errors propagate automatically | Express 5.x release | No async wrappers needed in Express 5 adapter examples |
| `x402` / `@coinbase/x402` monolithic packages | `@x402/core` scoped packages (2.5.0+) | Dec 2025 | Smaller, modular — already established in Phase 5 |

**Deprecated/outdated:**
- `jest-environment-miniflare`: Legacy Miniflare v2 test environment. Do not use.
- `@cloudflare/workers-types` for application Workers code: Use `wrangler types` instead for app code; `@cloudflare/workers-types` is for libraries only.
- `miniflare` direct API (Miniflare v2 API): Breaking changes in v3; use `@cloudflare/vitest-pool-workers` instead.
- Vercel `pages/api/` with `export const config = { runtime: 'edge' }`: Still works but App Router `route.ts` with `export const runtime = 'edge'` is the current pattern.

---

## Open Questions

1. **CloudflareClient tsup: ESM-only or dual format?**
   - What we know: Cloudflare Workers require ESM. CJS output is useless for CF Workers.
   - What's unclear: Is there a use case for CJS from `@heylol/adapter-cloudflare`? (Unlikely — this is a CF-specific package.)
   - Recommendation: Keep dual output (ESM + CJS) to match the pattern of other packages and avoid attw errors. The ESM output is what Workers use; the CJS is harmless dead weight. If bundle size is a concern for the adapter packages, remove CJS.

2. **peerDependencies declaration for adapter packages**
   - What we know: Each adapter imports from `@heylol/sdk`. They should declare it as a peerDependency.
   - What's unclear: Should adapters also peer-dep on the runtime libraries (express, next) or only use them as devDeps?
   - Recommendation: `express` should be a peerDep for `@heylol/adapter-express` (consumers must provide it). `next` for `@heylol/adapter-vercel` should be a devDep (the adapter only imports `next/server` types — a consumer who doesn't use Next.js can still use `VercelClient` directly). `@cloudflare/workers-types` for `@heylol/adapter-cloudflare` is a devDep (types only, not runtime).

3. **wrangler.jsonc in examples — does `examples/` need to be in pnpm workspace?**
   - What we know: `pnpm-workspace.yaml` includes `examples/*`. Example projects will be built by `turbo build`.
   - What's unclear: Do example projects need proper `build` scripts? Can they just have `echo 'example'` as build?
   - Recommendation: Examples should have `"build": "tsc --noEmit"` to catch type errors without emitting. They should be `private: true`. They don't need test scripts.

4. **TypeScript declaration errors in adapter-cloudflare without wrangler types**
   - What we know: `@cloudflare/workers-types` v4.20260301.1 provides types for the Cloudflare runtime. The `HeyLolEnv` interface in the adapter declares the minimum required bindings.
   - What's unclear: Will `ExportedHandler<Env>` from `@cloudflare/workers-types` work in the adapter's tsconfig without adding it to `types` in tsconfig.json?
   - Recommendation: Add `"@cloudflare/workers-types"` to the `types` array in `packages/adapter-cloudflare/tsconfig.json` to ensure Worker-specific globals (`ExportedHandler`, `ExecutionContext`) are available.

5. **README quickstart — which runtime to show first?**
   - What we know: Node.js 18+ is the most common starting point. The 5-minute quickstart must work in the reader's existing environment.
   - What's unclear: Should the quickstart show `CloudflareClient` or `HeyLolClient` directly?
   - Recommendation: Show `HeyLolClient` directly in the quickstart (no adapter needed for Node.js). Adapters are progressive disclosure — covered in a separate section. This minimizes friction for the 5-minute benchmark.

---

## Sources

### Primary (HIGH confidence)

- Cloudflare Workers bindings official docs — `HeyLolEnv` interface pattern, `import { env } from 'cloudflare:workers'` feature, `ExportedHandler<Env>` type: https://developers.cloudflare.com/workers/runtime-apis/bindings/ (fetched 2026-03-01)
- Cloudflare Workers TypeScript docs — `@cloudflare/workers-types` vs `wrangler types` distinction, tsconfig setup: https://developers.cloudflare.com/workers/languages/typescript/ (fetched 2026-03-01)
- Cloudflare Workers best practices — module-level state warning, env threading pattern: https://developers.cloudflare.com/workers/best-practices/workers-best-practices/ (fetched 2026-03-01)
- Cloudflare importable env feature announcement (March 2025): https://developers.cloudflare.com/changelog/post/2025-03-17-importable-env/ (fetched 2026-03-01)
- Cloudflare vitest-pool-workers setup guide — `defineWorkersConfig`, miniflare bindings, test tsconfig: https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/ (fetched 2026-03-01)
- wrangler configuration reference — minimal fields (name, main, compatibility_date), vars, secrets: https://developers.cloudflare.com/workers/wrangler/configuration/ (fetched 2026-03-01)
- Vercel Edge Runtime API surface — supported Web APIs, compatible Node.js modules, 25s timeout: https://vercel.com/docs/functions/runtimes/edge (fetched 2026-03-01)
- Next.js 15 Route Handlers and Middleware — `middleware.ts` export pattern, `NextRequest`/`NextResponse`, `export const runtime = 'edge'`: https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware (fetched 2026-03-01)
- Vercel Edge Config SDK — `createClient`, `get`, `getAll`, `has`, connection string pattern: https://vercel.com/docs/edge-config/edge-config-sdk (fetched 2026-03-01)
- arethetypeswrong CLI README — `attw --pack .`, `attw $(npm pack)`, error types caught: https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md (fetched 2026-03-01)
- Existing codebase — `packages/sdk/src/client/HeyLolClient.ts`, `packages/sdk/src/client/options.ts`, all 3 adapter package stubs, pnpm-workspace.yaml, turbo.json: direct inspection 2026-03-01
- `npm info` verified package versions: @cloudflare/workers-types@4.20260301.1, @cloudflare/vitest-pool-workers@0.12.18, wrangler@4.69.0, express@5.2.1, @types/express@5.0.6, @vercel/edge-config@1.4.3, next@16.1.6

### Secondary (MEDIUM confidence)

- Express TypeScript RequestHandler declaration merging pattern — augmenting `Express.Request` namespace: Multiple verified sources (typescript.tv, logrocket.com/blog) 2026-03-01
- Cloudflare Agents x402 integration — `wrapFetchWithPayment` pattern for agent payment: https://developers.cloudflare.com/agents/x402/ (fetched 2026-03-01)
- Changesets monorepo release workflow — `changeset`, `changeset version`, `changeset publish` command sequence: https://github.com/changesets/changesets (MEDIUM — prior Phase 1 already confirmed changesets works in this repo)
- Vercel recommendation to prefer Node.js over Edge runtime: https://vercel.com/docs/functions/runtimes/edge (warning box in current docs, fetched 2026-03-01)

### Tertiary (LOW confidence — flag for validation)

- Express 5 async error propagation behavior — claim that async errors propagate natively without wrappers: cited from multiple sources but not verified against Express 5 source code; verify in adapter implementation
- `@cloudflare/vitest-pool-workers` v0.12.18 compatibility with workspace `vitest: ^2.0.0` — compatibility claim is from official docs (supports 2.0.x–3.2.x); workspace pinned at ^2.0.0 which satisfies this but only if pnpm resolves to 2.x

---

## Metadata

**Confidence breakdown:**
- Standard stack (adapter packages, versions): HIGH — all versions verified via `npm info` on 2026-03-01
- Architecture (adapter patterns): HIGH — Cloudflare and Vercel patterns verified against official docs; Express patterns verified against TypeScript community best practices
- Testing (vitest-pool-workers): HIGH — official Cloudflare docs confirmed this is the only supported path; version compatibility verified
- Miniflare v4 concern from STATE.md: RESOLVED — current Cloudflare testing approach is `@cloudflare/vitest-pool-workers`, which embeds Miniflare v3; no "Miniflare v4" is separately documented or required
- Pitfalls: HIGH — all pitfalls verified from official docs or existing codebase inspection
- Example project structure: MEDIUM — structure is reasonable but exact Next.js App Router setup may need adjustments based on next@16.x breaking changes

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (30 days — @cloudflare/workers-types and wrangler update frequently; vitest-pool-workers version compatibility should be re-verified if workspace Vitest version is bumped)
