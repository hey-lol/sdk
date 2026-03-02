import type { HeyLolEnv } from '@heylol/adapter-cloudflare';
import { createFromEnv } from '@heylol/adapter-cloudflare';

/**
 * Cloudflare Workers env bindings.
 *
 * Set HEYLOL_PRIVATE_KEY via:
 *   pnpm wrangler secret put HEYLOL_PRIVATE_KEY
 *
 * For local dev, add to .dev.vars:
 *   HEYLOL_PRIVATE_KEY=your_base58_private_key
 */
interface Env extends HeyLolEnv {
  // Add your own bindings here, e.g.:
  // MY_KV: KVNamespace;
}

async function fetch(request: Request, env: Env): Promise<Response> {
  // createFromEnv reads HEYLOL_PRIVATE_KEY from Cloudflare env bindings
  const client = createFromEnv(env);

  // Create a post — x402 payment auth is handled automatically
  const post = await client.posts.create({
    content: 'Hello from Cloudflare Workers via hey.lol!',
  });

  return Response.json({
    message: 'Post created successfully',
    postId: post.id,
    content: post.content,
  });
}

export default { fetch } satisfies ExportedHandler<Env>;
