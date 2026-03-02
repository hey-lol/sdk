import type { ZodType } from 'zod';
import type { PriceConfig, ServiceDefinition } from './types.js';

export interface RegisterServiceOptions<TInput = unknown, TOutput = unknown> {
  id: string;
  description?: string;
  price: PriceConfig;
  inputSchema?: ZodType<TInput>;
  outputSchema?: ZodType<TOutput>;
}

export const registerService = <TInput = unknown, TOutput = unknown>(
  opts: RegisterServiceOptions<TInput, TOutput>,
): ServiceDefinition<TInput, TOutput> => ({
  id: opts.id,
  description: opts.description,
  price: { ...opts.price },
  inputSchema: opts.inputSchema,
  outputSchema: opts.outputSchema,
});
