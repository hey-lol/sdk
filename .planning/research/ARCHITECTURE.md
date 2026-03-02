# Architecture Research

**Domain:** Multi-runtime TypeScript SDK monorepo with x402 payment auth + CLI package integration
**Researched:** 2026-03-02 (CLI section added; original SDK sections from 2026-02-28)
**Confidence:** HIGH (CLI integration — verified from existing codebase; SDK sections — see original confidence notes)

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
│   ├── express/                # @heylol/sdk/express
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   │           ├── index.ts
│   │           ├── client.ts       # ExpressClient extends HeyLolClient
│   │           └── middleware.ts   # paymentMiddleware(options) → Handler
│   │
│   └── cli/                    # NEW — heylol (binary package)
│       ├── package.json        # name: heylol, bin: { heylol: ./dist/cli.cjs }
│       ├── tsconfig.json       # extends ../../tsconfig.json
│       ├── tsup.config.ts      # entry: src/cli.ts, format: ['cjs'], banner: shebang
│       └── src/
│           ├── cli.ts          # entry — Commander program setup + parseAsync
│           ├── client.ts       # createClient() — reads config, constructs HeyLolClient
│           ├── config.ts       # loadConfig() — reads env var or ~/.config/heylol/
│           ├── output.ts       # formatPost(), formatProfile(), formatList(), printJson()
│           └── commands/
│               ├── post.ts
│               ├── profile.ts
│               ├── social.ts
│               ├── discovery.ts
│               └── notifications.ts
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
- **`packages/cli/` follows the adapter pattern:** It is a consumer of `@heylol/sdk`, not a modifier. It lives in `packages/` under the `packages/*` glob that pnpm-workspace.yaml already covers. No workspace config changes needed.

---

## CLI Integration Architecture (NEW)

### CLI Package Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        packages/cli                             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │post cmds │  │profile   │  │social    │  │discovery │        │
│  │          │  │cmds      │  │cmds      │  │cmds      │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│  ┌────┴─────────────┴─────────────┴─────────────┴──────────┐   │
│  │              Commander.js program (cli.ts)               │   │
│  └────────────────────────────┬────────────────────────────┘   │
│                                │                                │
│  ┌─────────────────────────────┴──────────────────────────┐    │
│  │                   client factory (client.ts)            │    │
│  │        (reads config/env → new HeyLolClient())          │    │
│  └─────────────────────────────┬──────────────────────────┘    │
│                                │                                │
│  ┌─────────────────────────────┴──────────────────────────┐    │
│  │                  output formatters (output.ts)          │    │
│  │              (JSON / human-readable table)              │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────┬───────────────────────────┘
                                      │ import { HeyLolClient }
                                      │ from '@heylol/sdk'
┌─────────────────────────────────────┴───────────────────────────┐
│                        packages/sdk                             │
│  HeyLolClient                                                   │
│    .posts   .profile   .social   .discovery                     │
│    .notifications   .services                                   │
└─────────────────────────────────────────────────────────────────┘
```

### New vs Modified Components

| Component | New / Modified | Notes |
|-----------|---------------|-------|
| `packages/cli/` | **NEW** | Entire package. Does not modify any existing package. |
| `packages/sdk/` | **NO CHANGE** | CLI imports SDK as a consumer. No SDK-specific code added to SDK. |
| Root `turbo.json` | **NO CHANGE** | `"dependsOn": ["^build"]` automatically handles CLI-after-SDK build order. |
| Root `pnpm-workspace.yaml` | **NO CHANGE** | `packages/*` glob already covers `packages/cli`. |
| Root `tsconfig.json` | **NO CHANGE** | CLI's `tsconfig.json` extends root config the same way adapters do. |

### CLI Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `cli.ts` | Shebang, program registration, `program.parseAsync()` | Commander `new Command()` root |
| `commands/post.ts` | Post subcommands: create, get, delete, like, unlike, reply | Commander `.command()` chains |
| `commands/profile.ts` | Profile subcommands: me, get, update | Commander `.command()` chains |
| `commands/social.ts` | Social subcommands: follow, unfollow, followers, following | Commander `.command()` chains |
| `commands/discovery.ts` | Discovery subcommands: search, trending, suggested | Commander `.command()` chains |
| `commands/notifications.ts` | Notification subcommands: list, mark-read | Commander `.command()` chains |
| `client.ts` | `createClient()` factory — resolves private key, constructs `HeyLolClient` | Single exported function |
| `config.ts` | `loadConfig()` — reads `HEYLOL_PRIVATE_KEY` env var or `~/.config/heylol/config.json` | fs + JSON parse, XDG path |
| `output.ts` | Converts SDK response objects to stdout text or JSON | Pure functions, no I/O |

---

## Package.json Exports Configuration

### Core Package (`packages/core/package.json`) — Existing

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

### CLI Package (`packages/cli/package.json`) — NEW

```json
{
  "name": "heylol",
  "version": "1.0.0",
  "license": "MIT",
  "bin": {
    "heylol": "./dist/cli.cjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --coverage --config ../../vitest.config.ts"
  },
  "dependencies": {
    "@heylol/sdk": "workspace:*",
    "commander": "^14.0.0"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "catalog:",
    "tsup": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

**Key differences from adapter packages:**
- `bin` field instead of `exports` — this is a binary, not a library
- `"type": "module"` is intentionally omitted — CJS bundle with explicit `.cjs` extension avoids conflicts
- `commander` is a runtime dependency (not dev-only) — it is shipped to consumers who `npx heylol`
- `@heylol/sdk` is `dependencies` (not `devDependencies`) — must be installed when the CLI package is installed

### Services Package (`packages/services/package.json`) — Existing

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

### Pattern 1: Constructor Injection for Auth (SDK)

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
```

### Pattern 5: CLI-Only CJS Bundle (not dual-format)

**What:** The CLI is bundled as a single CJS file with a shebang injected via tsup's `banner` option. No ESM, no dual format, no type declarations.

**When to use:** Always for Node.js CLI binaries. No browser/runtime portability needed. CJS avoids `"type": "module"` conflicts with hashbang. A `bin` field can only point to one file anyway.

**Trade-offs:** No tree-shaking of unused SDK exports. Acceptable because CLI startup time is dominated by Node.js init overhead, not module parse size.

**Example:**
```typescript
// packages/cli/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['cjs'],      // CLI only — no ESM needed
  dts: false,           // no type declarations for a binary
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['@heylol/sdk'],   // do NOT bundle the SDK — it's a runtime dep
  banner: {
    js: '#!/usr/bin/env node',  // tsup injects shebang at bundle top
  },
  outExtension() {
    return { js: '.cjs' };      // dist/cli.cjs
  },
});
```

### Pattern 6: Client Factory with Credential Resolution (CLI)

**What:** Commands never directly construct `HeyLolClient`. A `createClient()` factory resolves the private key from environment variables or a config file and returns a ready client. Commands receive it via call.

**When to use:** Always. This pattern decouples auth from command logic, enables testing by injecting a mock client, and centralizes the "where is my key?" error into one place.

**Example:**
```typescript
// src/config.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface CliConfig {
  privateKey: string;
}

export function loadConfig(): CliConfig {
  // 1. Env var takes precedence
  if (process.env.HEYLOL_PRIVATE_KEY) {
    return { privateKey: process.env.HEYLOL_PRIVATE_KEY };
  }
  // 2. XDG config file fallback
  const configDir = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
  const configPath = join(configDir, 'heylol', 'config.json');
  try {
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CliConfig>;
    if (parsed.privateKey) return { privateKey: parsed.privateKey };
  } catch {
    // file doesn't exist — fall through to error
  }
  throw new Error(
    'No private key found. Set HEYLOL_PRIVATE_KEY env var or run: heylol auth login'
  );
}

// src/client.ts
import { HeyLolClient } from '@heylol/sdk';
import { loadConfig } from './config.js';

export function createClient(): HeyLolClient {
  const config = loadConfig();
  return new HeyLolClient({ privateKey: config.privateKey });
}
```

### Pattern 7: Commander.js Subcommand Structure Mirrors SDK Resources

**What:** Each SDK resource becomes a Commander subcommand group. Each resource method becomes a subcommand within that group. Commands are registered via module-level functions injected into the root `program`.

**When to use:** Always — this is the direct mapping strategy. It produces predictable, discoverable command names aligned with SDK documentation.

**Trade-offs:** Commands are `heylol post create` (two levels deep) rather than flat `heylol post`. This is necessary to accommodate multiple operations per resource without flag-based dispatch. All major CLIs (git, npm, gh) use this pattern.

**Example:**
```typescript
// src/commands/post.ts
import { Command } from 'commander';
import { createClient } from '../client.js';
import { formatPost, printJson } from '../output.js';
import { asPostId } from '@heylol/sdk';

export function registerPostCommands(program: Command): void {
  const post = program.command('post').description('Manage posts');

  post
    .command('create')
    .description('Create a new post')
    .argument('<content>', 'Post content')
    .option('--json', 'Output raw JSON')
    .action(async (content: string, opts) => {
      const client = createClient();
      const result = await client.posts.create({ content });
      opts.json ? printJson(result) : formatPost(result);
    });

  post
    .command('get')
    .description('Get a post by ID')
    .argument('<id>', 'Post ID')
    .option('--json', 'Output raw JSON')
    .action(async (id: string, opts) => {
      const client = createClient();
      const result = await client.posts.get(asPostId(id));
      opts.json ? printJson(result) : formatPost(result);
    });
}

// src/cli.ts  (note: shebang is injected by tsup banner — not needed in source)
import { Command } from 'commander';
import { registerPostCommands } from './commands/post.js';
import { registerProfileCommands } from './commands/profile.js';
import { registerSocialCommands } from './commands/social.js';
import { registerDiscoveryCommands } from './commands/discovery.js';
import { registerNotificationCommands } from './commands/notifications.js';

const program = new Command()
  .name('heylol')
  .version('1.0.0')
  .description('hey.lol CLI');

registerPostCommands(program);
registerProfileCommands(program);
registerSocialCommands(program);
registerDiscoveryCommands(program);
registerNotificationCommands(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

---

## Data Flow

### Command Invocation Flow (CLI)

```
User runs: heylol post create "hello world"
    |
    v
Node.js executes dist/cli.cjs (shebang directs to node)
    |
    v
Commander.js parser
  → matches "post" subcommand → "create" sub-subcommand
  → extracts positional arg "hello world"
    |
    v
createClient()
  → loadConfig()
    → reads HEYLOL_PRIVATE_KEY env var  [or]
    → reads ~/.config/heylol/config.json
  → new HeyLolClient({ privateKey })
    |
    v
client.posts.create({ content: 'hello world' })
  → HeyLolClient.post('/posts', { content: 'hello world' })
  → [x402 auth handshake — 402 probe → sign → retry]
  → HTTP POST to https://api.hey.lol/posts
    |
    v
Post response object (typed: Post)
    |
    v
Output formatter
  → --json: printJson(post) → console.log(JSON.stringify(post, null, 2))
  → default: formatPost(post) → human-readable stdout
    |
    v
process.exit(0)
```

### Credential Resolution Precedence

```
HEYLOL_PRIVATE_KEY env var  (highest priority — set in shell or CI)
    |
    v  (not set)
~/.config/heylol/config.json  ("privateKey" field — written by heylol auth login)
    |
    v  (not found / parse failure)
Error: "No private key found. Set HEYLOL_PRIVATE_KEY or run: heylol auth login"
    → process.exit(1)
```

### x402 Payment Auth Data Flow (SDK, used by CLI)

```
Consumer Code (CLI command or library user)
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
    Body: { version: "x402-v1", accepts: [{ amount: "0", ... }] }
    │
    ▼
parse402Response(response) → requirements
buildPaymentHeader(requirements)
  → buildDummyTransaction(publicKey, secretKey)  [zero-amount = wallet identity]
  → base64-encodes signed transaction
    │
    ▼
fetch('/v1/posts', { headers: { 'X-Payment': header } })
    │
    ▼
hey.lol API → Facilitator.verify(payment) → 200 OK
    │
    ▼
Consumer receives typed response
```

### Key Data Flows

1. **SDK response → CLI output:** SDK methods return typed objects (`Post`, `Profile`, `User`). Formatter functions in `output.ts` consume those types directly. The `--json` path bypasses formatters entirely, printing `JSON.stringify` directly.
2. **Error propagation in CLI:** SDK errors (`APIError`, `AuthError`, `NetworkError`) propagate out of command `.action()` handlers and are caught by the top-level `program.parseAsync().catch()` handler. This prints the error message to stderr and calls `process.exit(1)`. Per-command try/catch is avoided to keep command files thin.
3. **Branded IDs:** SDK methods like `client.posts.get(id)` require branded `PostId` values created via `asPostId()`. CLI commands accept plain strings from argv and call `asPostId(id)` before passing to the SDK — the conversion happens inside the command's `.action()` handler.

---

## SDK Command Mapping (CLI)

| CLI Command | SDK Call | Notes |
|-------------|----------|-------|
| `heylol post create <content>` | `client.posts.create({ content })` | `--paywall-teaser` + `--paywall-price` flags map to `paywall: { teaser, price }` |
| `heylol post get <id>` | `client.posts.get(asPostId(id))` | Plain string → branded type via `asPostId()` |
| `heylol post delete <id>` | `client.posts.delete(asPostId(id))` | |
| `heylol post like <id>` | `client.posts.like(asPostId(id))` | |
| `heylol post unlike <id>` | `client.posts.unlike(asPostId(id))` | |
| `heylol post reply <id> <content>` | `client.posts.reply(asPostId(id), { content })` | |
| `heylol profile me` | `client.profile.me()` | |
| `heylol profile get <id>` | `client.profile.get(asUserId(id))` | |
| `heylol profile update` | `client.profile.update(params)` | `--display-name`, `--bio`, `--avatar-url`, `--banner-url` flags |
| `heylol social follow <id>` | `client.social.follow(asUserId(id))` | |
| `heylol social unfollow <id>` | `client.social.unfollow(asUserId(id))` | |
| `heylol social followers <id>` | `client.social.followers(asUserId(id), pagination)` | `--limit`, `--cursor` flags |
| `heylol social following <id>` | `client.social.following(asUserId(id), pagination)` | `--limit`, `--cursor` flags |
| `heylol discovery search <query>` | `client.discovery.search({ query })` | `--type users\|posts\|all` |
| `heylol discovery trending` | `client.discovery.trending(pagination)` | `--limit`, `--cursor` |
| `heylol discovery suggested` | `client.discovery.suggested(pagination)` | `--limit`, `--cursor` |
| `heylol notifications list` | `client.notifications.list(pagination)` | `--limit`, `--cursor` |
| `heylol notifications mark-read [ids...]` | `client.notifications.markRead(ids?)` | No args = mark all read; space-separated IDs = mark specific |

---

## Build Order Considerations

Dependencies flow in one direction. Build order must respect this:

```
1. packages/sdk           — No internal monorepo dependencies
        ↓
2. packages/services      — Imports types from sdk
        ↓
3. packages/adapter-*     — Import sdk + services (parallel)
   packages/cli           — Imports sdk only (parallel with adapters)
```

**Turborepo handles this automatically.** `turbo.json` uses `"dependsOn": ["^build"]` which means "build all packages I depend on first." Because `packages/cli/package.json` lists `"@heylol/sdk": "workspace:*"` in `dependencies`, Turborepo knows to build SDK before CLI.

**pnpm workspace references in `packages/cli/package.json`:**
```json
{
  "dependencies": {
    "@heylol/sdk": "workspace:*"
  }
}
```

During development, `workspace:*` resolves to the local `packages/sdk` directory. At publish time, pnpm replaces it with the actual published semver range.

---

## Integration Points

### Internal Package Boundaries

| Boundary | Communication | Contract |
|----------|---------------|----------|
| core → services | Types only (no runtime import) | `PaymentPayload`, `X402Requirements` interfaces in `core/src/types/x402.ts` |
| core → adapters | Adapter imports `HeyLolClient` class and extends it | Client constructor options interface must be stable |
| services → adapters | Adapters import `withPayment`, `create402Response` from services | Handler wrapper function signature |
| adapters → adapters | No cross-adapter imports | Each adapter is independent |
| **cli → sdk** | **CLI imports `HeyLolClient`, branded ID factories (`asPostId`, etc.), error types** | **Public API only. No reaching into SDK internals.** |
| **cli commands → client factory** | **`createClient()` returns `HeyLolClient`** | **All credential logic stays in `client.ts`** |
| **cli commands → output formatters** | **Functions accept typed SDK response objects** | **Formatters are pure functions; no I/O other than `console.log`** |

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

### Anti-Pattern 1: Importing Platform APIs in Core (SDK)

**What people do:** Use `Buffer`, `process.env`, `crypto.createHash` (Node.js globals) in core package code.

**Why it's wrong:** Core breaks in Cloudflare Workers, Vercel Edge, Deno, browsers. These runtimes don't have Node.js built-ins. This is the #1 cause of "works locally, fails in production" for edge-deployed SDKs.

**Do this instead:** Use only Web Platform APIs — `globalThis.crypto.subtle` for crypto (or @noble/curves which is pure JS), `fetch` for HTTP, `TextEncoder`/`TextDecoder` for encoding. If a Node.js API is unavoidable, put it in the `express` adapter (Node-only) not core.

**Note:** The CLI CAN use Node.js APIs (`fs`, `os`, `path`) freely because it only runs in Node.js.

### Anti-Pattern 2: Bundling `@heylol/sdk` Into the CLI

**What people do:** Omit `external: ['@heylol/sdk']` from the CLI's tsup config, causing the SDK source to be inlined into the CLI bundle.

**Why it's wrong:** The SDK is already a workspace dependency. Bundling it doubles the CLI bundle size and breaks any future workspace-linking optimizations. SDK updates require a CLI rebuild even if CLI code didn't change.

**Do this instead:** Always mark `@heylol/sdk` as external in `tsup.config.ts`. Let pnpm install it as a `node_modules` dependency at runtime. This is the exact pattern `packages/adapter-cloudflare` already uses (`external: ['@heylol/sdk']`).

### Anti-Pattern 3: Dual ESM+CJS for the CLI Binary

**What people do:** Copy the SDK's tsup config (`format: ['esm', 'cjs']`) into the CLI, producing both `cli.mjs` and `cli.cjs`.

**Why it's wrong:** A binary is consumed by Node.js directly, not imported by other packages. ESM output adds no value and the `bin` field can only point to one file. CJS with explicit `.cjs` extension is simpler and has zero interop issues.

**Do this instead:** Use `format: ['cjs']` only with `banner: { js: '#!/usr/bin/env node' }`.

### Anti-Pattern 4: Credential Resolution Inside Command Handlers

**What people do:** Call `new HeyLolClient({ privateKey: process.env.HEYLOL_PRIVATE_KEY! })` directly inside each command's `.action()` handler.

**Why it's wrong:** Credential logic gets scattered across all command files. Changing how keys are resolved (e.g., adding config file support) requires touching every command. Testing requires mocking `process.env` in every test.

**Do this instead:** Use the `createClient()` factory pattern. All commands call `createClient()` and receive a fully configured client. Tests inject a stub client.

### Anti-Pattern 5: `"type": "module"` in the CLI package.json

**What people do:** Set `"type": "module"` in `packages/cli/package.json` to match the SDK package.

**Why it's wrong:** When `"type": "module"` is set, Node.js treats all `.js` files as ESM. tsup's CJS output uses `.cjs` extension specifically to avoid this, but the conflicting `"type": "module"` creates confusion in tools and can cause interop issues. More importantly, there is no benefit — the CLI is not imported by anything else.

**Do this instead:** Omit `"type": "module"` from the CLI package entirely. Use `outExtension: () => ({ js: '.cjs' })` in tsup.

### Anti-Pattern 6: Publishing Separate Packages for Each SDK Subpath

**What people do:** Publish `@heylol/sdk-core`, `@heylol/sdk-services`, `@heylol/sdk-cloudflare` as separate npm packages.

**Why it's wrong:** Consumers must manage multiple package versions. A breaking change to core types causes a coordination problem across all dependent packages.

**Do this instead:** Publish a single `@heylol/sdk` package with subpath exports. Use semver normally. If adapters truly need independent versioning later, split them out then.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–100 consumers | Single published package, manual publish workflow |
| 100–1k consumers | Add `publint` and `attw` (Are the Types Wrong?) to CI to catch export misconfiguration before publish |
| 1k+ consumers | Consider splitting CF/Vercel adapters to separate packages if they accumulate platform-specific dependencies that bloat installs for non-CF users |

**CLI-specific:**

| Concern | Now | As SDK Grows |
|---------|-----|--------------|
| New SDK resource | Add one `commands/*.ts` file + register in `cli.ts` | Pattern is established; low friction |
| Changing output format | Modify `output.ts` | Single file change affects all commands |
| Adding `--json` globally | Already done at Commander root level | No per-command changes |
| Config file format changes | Modify `config.ts` | Isolated from command files |

---

## Sources

- Existing `packages/adapter-cloudflare/tsup.config.ts` — `external: ['@heylol/sdk']` pattern: HIGH confidence (directly observed in codebase)
- Existing `packages/sdk/tsup.config.ts` — dual format baseline for comparison: HIGH confidence (directly observed)
- Existing `turbo.json` `"dependsOn": ["^build"]` pattern: HIGH confidence (directly observed)
- Existing `packages/adapter-cloudflare/package.json` — `peerDependencies: { "@heylol/sdk": "workspace:*" }` pattern: HIGH confidence (directly observed)
- tsup documentation — `banner` option for shebang injection: [tsup.egoist.dev](https://tsup.egoist.dev/) — MEDIUM confidence (WebSearch-verified behavior)
- Commander.js — current package: [github.com/tj/commander.js](https://github.com/tj/commander.js) — HIGH confidence (actively maintained, v14 current as of 2026)
- [Creating a TypeScript CLI for Your Monorepo — DEV Community](https://dev.to/zirkelc/creating-a-typescript-cli-for-your-monorepo-5aa) — MEDIUM confidence
- [How to use a compiled bin in a TypeScript monorepo with pnpm](https://webpro.nl/scraps/compiled-bin-in-typescript-monorepo) — MEDIUM confidence
- [Node.js CLI Apps Best Practices — lirantal](https://github.com/lirantal/nodejs-cli-apps-best-practices) — MEDIUM confidence (XDG config pattern, credential storage)
- Node.js Package Exports documentation: https://nodejs.org/api/packages.html#subpath-exports — HIGH confidence for exports field syntax

---

*Architecture research for: hey.lol SDK — multi-runtime TypeScript monorepo + CLI package integration*
*Researched: 2026-03-02*
