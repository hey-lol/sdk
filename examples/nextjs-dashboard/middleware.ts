import { createNextjsMiddleware } from '@heylol/adapter-vercel';

/**
 * Next.js Edge Middleware using createNextjsMiddleware.
 *
 * Sets x-heylol-ready: 1 on all matched requests so downstream
 * route handlers know HeyLol auth is available.
 *
 * Set HEYLOL_PRIVATE_KEY in your Vercel project environment variables
 * or in .env.local for local development.
 */
export const middleware = createNextjsMiddleware();

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
