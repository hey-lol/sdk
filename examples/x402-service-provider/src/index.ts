import { createX402Service, registerService } from '@heylol/services';

/**
 * Step 1: Register the service definition.
 *
 * This creates an immutable ServiceDefinition describing your service's
 * price, payment network, and recipient wallet.
 *
 * Replace 'YOUR_WALLET_ADDRESS' with your actual Solana wallet address.
 */
const aiSummaryService = registerService({
  id: 'ai-summary',
  description: 'Summarize any text using AI — powered by hey.lol',
  price: {
    amount: '0.01',
    currency: 'USDC',
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    payTo: 'YOUR_WALLET_ADDRESS',
  },
});

/**
 * Step 2: Define the service handler.
 *
 * Called only after payment verification succeeds.
 * `input` is the parsed request body (or `{}` for GET requests).
 */
const summaryHandler = async (_req: Request, input: unknown): Promise<{ summary: string }> => {
  const { text } = input as { text: string };
  // In production: call your AI model here
  return {
    summary: `Summary of: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}"`,
  };
};

/**
 * Step 3: Create the x402 service handler.
 *
 * createX402Service bundles the full x402 lifecycle:
 *   1. No payment header → return 402 with PAYMENT-REQUIRED
 *   2. Verify payment with facilitator
 *   3. Parse and validate input
 *   4. Execute handler
 *   5. Settle payment (best-effort)
 *   6. Return 200 with output + PAYMENT-RESPONSE header
 */
export const handleAiSummary = createX402Service(aiSummaryService, summaryHandler);

/**
 * Step 4: Export as a Cloudflare Worker or use with Bun.serve.
 *
 * Cloudflare Worker:
 *   export default { fetch: handleAiSummary };
 *
 * Bun:
 *   Bun.serve({ port: 3000, fetch: handleAiSummary });
 */
export default { fetch: handleAiSummary };
