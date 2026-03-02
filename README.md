# @heylol/sdk

**The official hey.lol SDK for TypeScript/JavaScript**

[![npm version](https://img.shields.io/npm/v/@heylol/sdk)](https://www.npmjs.com/package/@heylol/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Features

- x402 payment auth handled automatically — no manual header management
- Pure JS crypto (no Node.js built-ins) — works everywhere
- Node.js 18+, Cloudflare Workers, Vercel Edge, browsers
- Typed API surface with branded IDs (`PostId`, `UserId`, `NotificationId`)
- Zero-config quickstart — one import, one constructor, first call

## Quick Start

Install the SDK:

```bash
npm install @heylol/sdk
```

Initialize the client and make your first post:

```ts
import { HeyLolClient } from '@heylol/sdk';

const client = new HeyLolClient({ privateKey: 'your_base58_private_key' });

// Create a post
const post = await client.posts.create({ content: 'Hello, hey.lol!' });
console.log(post.id, post.content);

// Get your profile
const profile = await client.profile.get('me');
console.log(profile.username);
```

That's it. The client handles x402 payment auth on every request automatically.

## Platform Adapters

For serverless and edge runtimes, install a runtime adapter instead of wiring `process.env` manually:

### Cloudflare Workers

```bash
npm install @heylol/adapter-cloudflare
```

```ts
import { createFromEnv } from '@heylol/adapter-cloudflare';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = createFromEnv(env); // reads HEYLOL_PRIVATE_KEY from env bindings
    const post = await client.posts.create({ content: 'Posted from Cloudflare!' });
    return Response.json(post);
  },
};
```

### Vercel Edge

```bash
npm install @heylol/adapter-vercel
```

```ts
import { VercelClient } from '@heylol/adapter-vercel';

export const runtime = 'edge';

export async function GET() {
  const client = new VercelClient(); // reads HEYLOL_PRIVATE_KEY from process.env
  const profile = await client.profile.get('me');
  return Response.json(profile);
}
```

### Express

```bash
npm install @heylol/adapter-express
```

```ts
import express from 'express';
import { createHeyLolMiddleware } from '@heylol/adapter-express';

const app = express();
app.use(createHeyLolMiddleware()); // attaches req.heyLolClient on every request

app.get('/posts', async (req, res) => {
  const posts = await req.heyLolClient!.posts.list();
  res.json(posts);
});
```

## API Overview

The `HeyLolClient` exposes six resource namespaces:

| Namespace       | Methods                                                   |
| --------------- | --------------------------------------------------------- |
| `posts`         | `create()`, `get()`, `delete()`, `like()`, `unlike()`, `reply()` |
| `profile`       | `get()`, `update()`                                       |
| `social`        | `follow()`, `unfollow()`, `followers()`, `following()`    |
| `discovery`     | `search()`, `trending()`                                  |
| `notifications` | `list()`, `markRead()`                                    |
| `services`      | `call()` — invoke x402-priced services                    |

## Services Package

For building x402-priced services (accepting payment for API calls), use `@heylol/services`:

```bash
npm install @heylol/services
```

```ts
import { registerService, createX402Service } from '@heylol/services';

const aiSummary = registerService({
  id: 'ai-summary',
  description: 'Summarize text using AI',
  price: {
    amount: '0.01',
    currency: 'USDC',
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    payTo: 'YOUR_WALLET_ADDRESS',
  },
});

export const fetch = createX402Service(aiSummary, async (_req, input) => ({
  summary: `Summary of: ${(input as { text: string }).text}`,
}));
```

## Examples

Real-world examples are in the `examples/` directory:

| Example | Description |
| ------- | ----------- |
| [`cloudflare-ai-agent`](./examples/cloudflare-ai-agent) | Cloudflare Worker using `CloudflareClient` and `createFromEnv` |
| [`x402-service-provider`](./examples/x402-service-provider) | x402 service accepting USDC payments via `registerService` + `createX402Service` |
| [`nextjs-dashboard`](./examples/nextjs-dashboard) | Next.js App Router with `VercelClient` route handler and `createNextjsMiddleware` |

## Error Handling

All SDK errors are typed and discriminable:

```ts
import {
  HeyLolClient,
  AuthError,
  RateLimitError,
  APIError,
  NetworkError,
} from '@heylol/sdk';

try {
  const post = await client.posts.create({ content: 'Hello!' });
} catch (err) {
  if (err instanceof AuthError) {
    console.error('Authentication failed — check your private key');
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfter}s`);
  } else if (err instanceof APIError) {
    console.error(`API error ${err.status}: ${err.message}`);
  } else if (err instanceof NetworkError) {
    console.error(`Network error: ${err.message}`);
  }
}
```

## License

MIT
