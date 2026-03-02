import { create402Response, USDC_MINT } from './response.js';
import { settlePayment } from './settle.js';
import type { ServiceDefinition } from './types.js';
import { verifyPayment } from './verify.js';

export type ServiceHandler<TInput, TOutput> = (request: Request, input: TInput) => Promise<TOutput>;

export interface X402ServiceOptions {
  facilitatorUrl?: string;
}

// Helper: build PaymentRequirements object from ServiceDefinition
const buildRequirements = (definition: ServiceDefinition, resource: string) => ({
  x402Version: 2,
  accepts: [
    {
      scheme: 'exact' as const,
      network: definition.price.network,
      amount: definition.price.amount,
      asset: USDC_MINT[definition.price.network] ?? '',
      payTo: definition.price.payTo,
      maxTimeoutSeconds: 60,
      description: definition.description,
      resource,
    },
  ],
});

export const createX402Service = <TInput = unknown, TOutput = unknown>(
  definition: ServiceDefinition<TInput, TOutput>,
  handler: ServiceHandler<TInput, TOutput>,
  opts?: X402ServiceOptions,
): ((request: Request) => Promise<Response>) => {
  return async (request: Request): Promise<Response> => {
    // 1. Check for payment header (v2: payment-signature, v1 fallback: x-payment)
    const signatureHeader =
      request.headers.get('payment-signature') ?? request.headers.get('x-payment');

    // 2. No payment header -> return 402
    if (!signatureHeader) {
      return create402Response(definition, { resource: request.url });
    }

    // 3. Parse input (with optional Zod validation from definition)
    let input: TInput;
    try {
      const raw = request.method === 'GET' ? {} : await request.json();
      input = definition.inputSchema ? definition.inputSchema.parse(raw) : (raw as TInput);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Build requirements from definition
    const requirements = buildRequirements(definition, request.url);

    // 5. Verify payment
    const verifyResult = await verifyPayment(signatureHeader, requirements, opts?.facilitatorUrl);

    if (!verifyResult.valid) {
      return new Response(
        JSON.stringify({ error: 'Payment invalid', reason: verifyResult.reason }),
        { status: 402, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // 6. Execute handler BEFORE settlement (critical ordering)
    let output: TOutput;
    try {
      output = await handler(request, input);
    } catch {
      return new Response(JSON.stringify({ error: 'Handler error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 7. Settle payment AFTER handler success
    const settleResult = await settlePayment(
      verifyResult.paymentPayload,
      requirements,
      opts?.facilitatorUrl,
    );

    // 8. Build response with PAYMENT-RESPONSE header
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (settleResult.success && settleResult.txHash) {
      // Encode settlement proof per x402 v2 spec
      responseHeaders['PAYMENT-RESPONSE'] = btoa(
        JSON.stringify({
          success: true,
          transaction: settleResult.txHash,
          network: settleResult.network ?? '',
          payer: verifyResult.payer ?? '',
        }),
      );
    }

    return new Response(JSON.stringify(output), {
      status: 200,
      headers: responseHeaders,
    });
  };
};
