import type { ServiceDefinition } from './types.js';

/**
 * USDC token mint addresses keyed by CAIP-2 network identifier.
 *
 * Used by `create402Response` and `createX402Service` to resolve the
 * correct on-chain token address for the service's price network.
 *
 * @example
 * ```ts
 * import { USDC_MINT } from '@heylol/services';
 *
 * const mainnetMint = USDC_MINT['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'];
 * // 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
 * ```
 */
export const USDC_MINT: Record<string, string> = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mainnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG':
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // devnet
};

/**
 * Options for customizing the 402 Payment Required response.
 */
export interface Create402Options {
  /** Resource URL included in the payment requirements (defaults to undefined) */
  resource?: string;
  /** Description override for the payment requirement (defaults to definition.description) */
  description?: string;
}

/**
 * Generate a 402 Payment Required response with x402 v2 payment requirements.
 *
 * The response body is empty; the payment requirements are base64-encoded
 * JSON in the `PAYMENT-REQUIRED` header per the x402 v2 specification.
 *
 * @param definition - Service definition created via `registerService`
 * @param opts - Optional resource URL and description override
 * @returns A `Response` with status 402 and a `PAYMENT-REQUIRED` header
 *
 * @example
 * ```ts
 * import { registerService, create402Response } from '@heylol/services';
 *
 * const myService = registerService({
 *   id: 'summarize',
 *   price: { amount: '0.01', currency: 'USDC', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', payTo: 'WALLET' },
 * });
 *
 * // In a request handler:
 * const response = create402Response(myService, { resource: 'https://api.example.com/summarize' });
 * // response.status === 402
 * ```
 */
export const create402Response = (
  definition: ServiceDefinition,
  opts?: Create402Options,
): Response => {
  const paymentRequired = {
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: definition.price.network,
        amount: definition.price.amount,
        asset: USDC_MINT[definition.price.network] ?? '',
        payTo: definition.price.payTo,
        maxTimeoutSeconds: 60,
        description: opts?.description ?? definition.description,
        resource: opts?.resource,
      },
    ],
  };

  // base64-encode the JSON per x402 v2 spec
  // btoa is available in all target runtimes (browsers, Node 18+, Deno, Workers, Bun)
  const headerValue = btoa(JSON.stringify(paymentRequired));

  return new Response(null, {
    status: 402,
    headers: {
      'PAYMENT-REQUIRED': headerValue,
      'Content-Type': 'application/json',
    },
  });
};
