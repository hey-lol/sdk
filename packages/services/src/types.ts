// Use ZodType from zod only as a type import (optional peer dep)
import type { ZodType } from 'zod';

export interface PriceConfig {
  amount: string; // e.g. "0.001" (in USDC)
  currency: 'USDC';
  network: string; // CAIP-2 identifier, e.g. "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
  payTo: string; // recipient wallet address (base58)
}

export interface ServiceDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  description?: string;
  price: PriceConfig;
  inputSchema?: ZodType<TInput>;
  outputSchema?: ZodType<TOutput>;
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  payer?: string;
  paymentPayload?: unknown;
}

export interface SettleResult {
  success: boolean;
  txHash?: string;
  network?: string;
  errorReason?: string;
}
