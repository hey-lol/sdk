import type { ZodType } from 'zod';
import type { PriceConfig, ServiceDefinition } from './types.js';

/**
 * Options for registering a service definition.
 */
export interface RegisterServiceOptions<TInput = unknown, TOutput = unknown> {
  /** Unique service identifier used to route calls to this service */
  id: string;
  /** Human-readable description shown in 402 payment responses */
  description?: string;
  /** Payment configuration: amount, currency, network, and recipient wallet */
  price: PriceConfig;
  /** Optional Zod schema to validate incoming request input */
  inputSchema?: ZodType<TInput>;
  /** Optional Zod schema to validate outgoing response output */
  outputSchema?: ZodType<TOutput>;
}

/**
 * Register a service definition with price, schema, and metadata.
 *
 * Returns an immutable `ServiceDefinition` object used by `createX402Service`
 * and `create402Response`. Supports optional Zod schemas for type-safe
 * input validation and output shaping.
 *
 * @param opts - Service registration options including id, price config, and optional schemas
 * @returns Typed `ServiceDefinition` used to configure x402 payment handling
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { registerService } from '@heylol/services';
 *
 * const translateService = registerService({
 *   id: 'translate',
 *   description: 'Translate text using AI',
 *   price: {
 *     amount: '0.001',
 *     currency: 'USDC',
 *     network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
 *     payTo: 'YOUR_WALLET_ADDRESS',
 *   },
 *   inputSchema: z.object({ text: z.string(), targetLanguage: z.string() }),
 *   outputSchema: z.object({ translated: z.string() }),
 * });
 * ```
 */
export const registerService = <TInput = unknown, TOutput = unknown>(
  opts: RegisterServiceOptions<TInput, TOutput>,
): ServiceDefinition<TInput, TOutput> => ({
  id: opts.id,
  description: opts.description,
  price: { ...opts.price },
  inputSchema: opts.inputSchema,
  outputSchema: opts.outputSchema,
});
