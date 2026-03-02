import type { ServiceDefinition } from './types.js';

// USDC token mint addresses by CAIP-2 network identifier
export const USDC_MINT: Record<string, string> = {
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // mainnet
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG':
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // devnet
};

export interface Create402Options {
  resource?: string;
  description?: string;
}

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
