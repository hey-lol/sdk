import type { ClientOptions, HeyLolClient } from '@heylol/sdk';
import { HeyLolClient as HeyLolClientImpl } from '@heylol/sdk';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Augments the Express `Request` object to include a `heyLolClient` property
 * set by the {@link createHeyLolMiddleware} middleware.
 */
declare global {
  namespace Express {
    interface Request {
      heyLolClient?: HeyLolClient;
    }
  }
}

/**
 * Options for the {@link createHeyLolMiddleware} factory.
 *
 * Extends all `ClientOptions` except `privateKey` (which is resolved from
 * either this object or `HEYLOL_PRIVATE_KEY` environment variable).
 */
export interface HeyLolMiddlewareOptions extends Omit<ClientOptions, 'privateKey'> {
  /**
   * Base58-encoded Solana private key.
   * Falls back to `process.env.HEYLOL_PRIVATE_KEY` when omitted.
   */
  privateKey?: string;
}

/**
 * Creates an Express `RequestHandler` middleware that initialises a single
 * `HeyLolClient` instance and attaches it to `req.heyLolClient` for every
 * incoming request.
 *
 * The client is created once at middleware construction time (stateless,
 * safe to reuse across requests).
 *
 * @param opts - Optional middleware options. `privateKey` falls back to
 *   `process.env.HEYLOL_PRIVATE_KEY` when not provided.
 * @returns Express `RequestHandler` that attaches `req.heyLolClient` and calls `next()`.
 * @throws {Error} If neither `opts.privateKey` nor `HEYLOL_PRIVATE_KEY` env var is set.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createHeyLolMiddleware } from '@heylol/adapter-express';
 *
 * const app = express();
 *
 * // Option A: use HEYLOL_PRIVATE_KEY env var
 * app.use(createHeyLolMiddleware());
 *
 * // Option B: pass key explicitly
 * app.use(createHeyLolMiddleware({ privateKey: process.env.MY_KEY }));
 *
 * app.get('/post/:id', (req, res) => {
 *   const client = req.heyLolClient!;
 *   client.posts.get(req.params.id).then((post) => res.json(post));
 * });
 * ```
 */
export function createHeyLolMiddleware(opts?: HeyLolMiddlewareOptions): RequestHandler {
  const privateKey = opts?.privateKey ?? process.env.HEYLOL_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('privateKey option or HEYLOL_PRIVATE_KEY env var is required');
  }

  const { privateKey: _omitted, ...rest } = (opts ?? {}) as HeyLolMiddlewareOptions & {
    privateKey?: string;
  };

  const client = new HeyLolClientImpl({ privateKey, ...rest });

  return (_req: Request, _res: Response, next: NextFunction): void => {
    _req.heyLolClient = client;
    next();
  };
}
