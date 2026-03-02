import type { ClientOptions } from '@heylol/sdk';
import { HeyLolClient } from '@heylol/sdk';

/**
 * Cloudflare Workers env binding shape for HeyLol.
 *
 * Add this to your Worker's `Env` interface to get type-checked bindings.
 *
 * @example
 * ```ts
 * import type { HeyLolEnv } from '@heylol/adapter-cloudflare';
 *
 * interface Env extends HeyLolEnv {
 *   MY_KV: KVNamespace;
 * }
 * ```
 */
export interface HeyLolEnv {
  /** Base58-encoded Solana private key (required) */
  HEYLOL_PRIVATE_KEY: string;
  /** Override the API base URL (optional) */
  HEYLOL_BASE_URL?: string;
}

/**
 * A `HeyLolClient` pre-configured for Cloudflare Workers.
 *
 * Reads `HEYLOL_PRIVATE_KEY` (and optionally `HEYLOL_BASE_URL`) directly
 * from the Cloudflare env bindings object, giving you a fully initialised
 * client in one line of code.
 *
 * @example
 * ```ts
 * import { CloudflareClient } from '@heylol/adapter-cloudflare';
 *
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const client = new CloudflareClient(env);
 *     const profile = await client.profile.get('me');
 *     return Response.json(profile);
 *   },
 * };
 * ```
 */
export class CloudflareClient extends HeyLolClient {
  /**
   * @param env  - Cloudflare Workers env bindings object.
   * @param opts - Optional additional `ClientOptions` (all except `privateKey`).
   */
  constructor(env: HeyLolEnv, opts?: Omit<ClientOptions, 'privateKey'>) {
    super({
      privateKey: env.HEYLOL_PRIVATE_KEY,
      baseUrl: env.HEYLOL_BASE_URL,
      ...opts,
    });
  }
}

/**
 * Factory function that creates a `HeyLolClient` from Cloudflare env bindings.
 *
 * Equivalent to `new CloudflareClient(env, opts)` but returns the base
 * `HeyLolClient` type for consumers that prefer composition over inheritance.
 *
 * @param env  - Cloudflare Workers env bindings object.
 * @param opts - Optional additional `ClientOptions` (all except `privateKey`).
 * @returns A fully initialised `HeyLolClient`.
 *
 * @example
 * ```ts
 * import { createFromEnv } from '@heylol/adapter-cloudflare';
 *
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     const client = createFromEnv(env);
 *     const post = await client.posts.get('post-id');
 *     return Response.json(post);
 *   },
 * };
 * ```
 */
export function createFromEnv(
  env: HeyLolEnv,
  opts?: Omit<ClientOptions, 'privateKey'>,
): HeyLolClient {
  return new CloudflareClient(env, opts);
}
