import { ed25519 } from '@noble/curves/ed25519.js';
import { base58 } from '@scure/base';
import { describe, expect, it, vi } from 'vitest';
import { loadKeypair } from '../src/auth/keypair.js';
import { buildRealPayment } from '../src/auth/payment.js';
import type { PaymentRequirements } from '../src/types/x402.js';

// ---------------------------------------------------------------------------
// Test keypair — deterministic
// ---------------------------------------------------------------------------

const TEST_SECRET = new Uint8Array(32).fill(1);
const TEST_PUBLIC = ed25519.getPublicKey(TEST_SECRET);
const TEST_KEY = base58.encode(new Uint8Array([...TEST_SECRET, ...TEST_PUBLIC]));
const keypair = loadKeypair(TEST_KEY);

// ---------------------------------------------------------------------------
// Test payment requirements (matching what hey.lol API sends)
// ---------------------------------------------------------------------------

const SOLANA_MAINNET_REQUIREMENTS: PaymentRequirements = {
  scheme: 'exact',
  network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  amount: '10000', // $0.01 USDC
  maxAmountRequired: '10000',
  resource: '/agents/register',
  description: 'Agent registration fee: $0.01 USDC',
  payTo: '2Vgb83uPkms6JzfdwAzvhSZJPoXVhv6G1XP6rVxFYqBL',
  asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  extra: {
    name: 'USD Coin',
    version: '2',
    feePayer: 'FWBDexx2KaXQVgUc688rTBMyNktvByi8eoZJin9Co3Jy',
  },
};

describe('buildRealPayment', () => {
  it('returns a PaymentHeader with headerName and headerValue', async () => {
    const header = await buildRealPayment(SOLANA_MAINNET_REQUIREMENTS, keypair, 1);

    expect(header).toHaveProperty('headerName');
    expect(header).toHaveProperty('headerValue');
    expect(header.headerName).toBe('x-payment');
    expect(typeof header.headerValue).toBe('string');
  });

  it('headerValue is valid base64-encoded JSON', async () => {
    const header = await buildRealPayment(SOLANA_MAINNET_REQUIREMENTS, keypair, 1);

    const decoded = JSON.parse(atob(header.headerValue));
    expect(decoded).toHaveProperty('x402Version');
    expect(decoded).toHaveProperty('payload');
  });

  it('payload contains a serialized transaction', async () => {
    const header = await buildRealPayment(SOLANA_MAINNET_REQUIREMENTS, keypair, 1);

    const decoded = JSON.parse(atob(header.headerValue));
    // The payload should contain a transaction (either as serializedTransaction or transaction)
    const payload = decoded.payload;
    expect(payload).toBeDefined();
    const hasTx = 'serializedTransaction' in payload || 'transaction' in payload;
    expect(hasTx).toBe(true);
  });

  it('uses payment-signature header for v2', async () => {
    const header = await buildRealPayment(SOLANA_MAINNET_REQUIREMENTS, keypair, 2);

    expect(header.headerName).toBe('payment-signature');
  });

  it('throws AuthError with PAYMENT_BUILD_FAILED for invalid requirements', async () => {
    const badReqs: PaymentRequirements = {
      scheme: 'exact',
      network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      amount: '10000',
      // missing payTo and asset
    };

    await expect(buildRealPayment(badReqs, keypair, 1)).rejects.toThrow(
      /Failed to build x402 payment/,
    );
  });
});
