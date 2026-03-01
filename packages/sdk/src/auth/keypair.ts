/**
 * Keypair loading from base58-encoded Solana private keys.
 *
 * Accepts both formats:
 * - 64-byte base58: Solana CLI / Phantom / Backpack export format (secret + public concatenated)
 * - 32-byte base58: secret-only format (public key derived via ed25519.getPublicKey)
 *
 * Zero Node.js built-ins — uses @noble/curves for ed25519 and @scure/base for base58.
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { base58 } from '@scure/base';
import { AuthError } from '../errors/index.js';

/**
 * A loaded Solana keypair with readonly 32-byte keys.
 */
export interface Keypair {
  readonly secretKey: Uint8Array; // 32 bytes
  readonly publicKey: Uint8Array; // 32 bytes
}

/**
 * Load a Keypair from a base58-encoded Solana private key string.
 *
 * @param privateKeyBase58 - Base58-encoded private key (32 or 64 bytes)
 * @returns Keypair with 32-byte secretKey and publicKey
 * @throws AuthError with code INVALID_PRIVATE_KEY if the decoded length is not 32 or 64 bytes
 * @throws AuthError with code KEY_DECODE_FAILED if the base58 string is invalid
 */
export function loadKeypair(privateKeyBase58: string): Keypair {
  try {
    const decoded = base58.decode(privateKeyBase58);

    // Solana CLI keypair files are 64-byte: first 32 = secret, last 32 = public.
    // Phantom and Backpack export the same format.
    if (decoded.length === 64) {
      const secretKey = decoded.slice(0, 32);
      const publicKey = decoded.slice(32, 64);
      return { secretKey, publicKey };
    }

    // Some wallet exporters provide only the 32-byte secret key.
    // Derive the public key via ed25519.
    if (decoded.length === 32) {
      const secretKey = decoded;
      const publicKey = ed25519.getPublicKey(secretKey);
      return { secretKey, publicKey };
    }

    throw new AuthError({
      code: 'INVALID_PRIVATE_KEY',
      message: `Expected 32 or 64 byte base58 private key, got ${decoded.length} bytes`,
    });
  } catch (error) {
    // Re-throw AuthErrors as-is — they already have the right type and code
    if (error instanceof AuthError) {
      throw error;
    }
    // Wrap unexpected errors (e.g., invalid base58 decode) in a typed AuthError
    throw new AuthError({
      code: 'KEY_DECODE_FAILED',
      message: `Failed to decode base58 private key: ${String(error)}`,
    });
  }
}
