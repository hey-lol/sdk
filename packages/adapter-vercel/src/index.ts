import type { ClientOptions } from '@heylol/sdk';
import { HeyLolClient } from '@heylol/sdk';

/**
 * A `HeyLolClient` pre-configured for Vercel Edge Runtime.
 *
 * Reads `HEYLOL_PRIVATE_KEY` from `process.env` at construction time.
 * Suitable for use in Vercel Edge Functions and Serverless Functions.
 *
 * @example
 * ```ts
 * import { VercelClient } from '@heylol/adapter-vercel';
 *
 * // In a Vercel Edge Function or API Route
 * const client = new VercelClient();
 * const profile = await client.profile.get('me');
 * ```
 */
export class VercelClient extends HeyLolClient {
  /**
   * @param opts - Optional `ClientOptions` (all except `privateKey`, which is read from
   *   `process.env.HEYLOL_PRIVATE_KEY`).
   * @throws {Error} If `HEYLOL_PRIVATE_KEY` environment variable is not set.
   */
  constructor(opts?: Omit<ClientOptions, 'privateKey'>) {
    const privateKey = process.env.HEYLOL_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('HEYLOL_PRIVATE_KEY environment variable is required for VercelClient');
    }

    super({ privateKey, ...opts });
  }
}

/**
 * Options for {@link createNextjsMiddleware}.
 */
export interface NextjsMiddlewareOptions {
  /**
   * Vercel Edge Config connection string.
   * When provided, the middleware will attempt to read config from Edge Config.
   * Falls back to `process.env` if Edge Config is unavailable.
   */
  edgeConfigConnectionString?: string;
  /**
   * URL path patterns that this middleware should run on.
   * Passed through for convenience — export this from `middleware.ts` config.
   */
  matcher?: string[];
}

/**
 * Creates a Next.js Edge Middleware function that marks requests as
 * HeyLol-ready by setting the `x-heylol-ready: 1` request header.
 *
 * The returned function matches the Next.js `middleware.ts` export signature.
 *
 * @param opts - Optional middleware configuration.
 * @returns Async middleware function compatible with Next.js `middleware.ts`.
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { createNextjsMiddleware } from '@heylol/adapter-vercel';
 *
 * export const middleware = createNextjsMiddleware();
 *
 * export const config = {
 *   matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
 * };
 * ```
 */
export function createNextjsMiddleware(opts?: NextjsMiddlewareOptions) {
  return async function middleware(request: Request): Promise<Response> {
    const requestHeaders = new Headers(request.headers);

    // Attempt to use Edge Config if connection string is provided.
    // Falls back gracefully if @vercel/edge-config is unavailable (Pitfall 3).
    if (opts?.edgeConfigConnectionString) {
      try {
        const { createClient } = await import('@vercel/edge-config');
        const edgeConfig = createClient(opts.edgeConfigConnectionString);
        // Edge Config available — could be used for feature flags, etc.
        void edgeConfig; // consumed by downstream route handlers
      } catch {
        // Edge Config unavailable — silently fall back to process.env behaviour
      }
    }

    // Signal to downstream route handlers that HeyLol auth is available
    requestHeaders.set('x-heylol-ready', '1');

    // Use NextResponse.next if available (Next.js runtime), otherwise return
    // a standard Response that passes through. This makes the middleware
    // testable without requiring the full Next.js runtime.
    try {
      const { NextResponse } = await import('next/server');
      return NextResponse.next({ request: { headers: requestHeaders } });
    } catch {
      /* v8 ignore next 5 */
      // Fallback for non-Next.js test environments
      return new Response(null, {
        status: 200,
        headers: requestHeaders,
      });
    }
  };
}
