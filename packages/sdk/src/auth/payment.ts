/**
 * Real x402 payment builder using @x402/svm.
 *
 * Builds actual SPL token transfer transactions for paid endpoints.
 * The facilitator acts as fee payer — the agent only needs USDC, not SOL.
 */

import { createKeyPairSignerFromBytes } from '@solana/kit';
import { AuthError } from '../errors/index.js';
import type { PaymentHeader, PaymentRequirements } from '../types/x402.js';
import type { Keypair } from './keypair.js';
import { PAYMENT_HEADERS } from './x402.js';

/**
 * Build a real x402 payment for a paid endpoint.
 *
 * Uses @x402/svm to construct an SPL token transfer transaction
 * that the OpenFacilitator can verify and settle on-chain.
 *
 * @param requirements - Payment requirements from the 402 response
 * @param keypair - The agent's keypair (signs the USDC transfer)
 * @param version - x402 protocol version (1 or 2)
 * @returns PaymentHeader ready to attach to the retry request
 */
export async function buildRealPayment(
  requirements: PaymentRequirements,
  keypair: Keypair,
  version: 1 | 2 = 1,
): Promise<PaymentHeader> {
  try {
    // Reconstruct 64-byte keypair (secret + public) for @solana/kit
    const fullKey = new Uint8Array(64);
    fullKey.set(keypair.secretKey, 0);
    fullKey.set(keypair.publicKey, 32);

    const signer = await createKeyPairSignerFromBytes(fullKey);

    // Dynamic import to keep main bundle lighter
    const { ExactSvmScheme } = await import('@x402/svm/exact/client');

    const scheme = new ExactSvmScheme(signer);

    // Map SDK requirements to @x402/core PaymentRequirements (v2 format)
    // Server sends CAIP-2 network IDs (e.g. "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")
    const amount = requirements.amount || requirements.maxAmountRequired || '0';
    const x402Requirements = {
      scheme: requirements.scheme || 'exact',
      network: requirements.network || 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      amount,
      asset: requirements.asset || '',
      payTo: requirements.payTo || '',
      maxTimeoutSeconds: 300,
      extra: requirements.extra || {},
    };

    const paymentPayload = await scheme.createPaymentPayload(version, x402Requirements as any);

    const headerValue = btoa(JSON.stringify(paymentPayload));
    const headerName = version === 2 ? PAYMENT_HEADERS.SIGNATURE : PAYMENT_HEADERS.V1_PAYMENT;

    return { headerName, headerValue };
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError({
      code: 'PAYMENT_BUILD_FAILED',
      message: `Failed to build x402 payment: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
