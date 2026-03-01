/**
 * Solana legacy transaction serializer for zero-amount dummy transactions.
 *
 * Implements compact-u16 encoding (Solana's own format, NOT protobuf varint)
 * and builds a minimal Solana legacy transaction wire format for wallet
 * identification in the x402 auth flow.
 *
 * All crypto uses @noble/curves/ed25519.js — zero Node.js built-ins.
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { AuthError } from '../errors/index.js';

/**
 * Encodes a number (0–65535) using Solana's compact-u16 wire format.
 *
 * Solana compact-u16 encoding (NOT protobuf varint):
 * - 0–127 (0x7f): 1 byte  [value]
 * - 128–16383 (0x3fff): 2 bytes [(value & 0x7f) | 0x80, value >> 7]
 * - 16384–65535: 3 bytes  [(value & 0x7f) | 0x80, ((value >> 7) & 0x7f) | 0x80, value >> 14]
 */
export function encodeCompactU16(value: number): Uint8Array {
  if (value < 0 || value > 65535) {
    throw new AuthError({
      code: 'TRANSACTION_BUILD_FAILED',
      message: `compact-u16 value out of range: ${value} (must be 0–65535)`,
    });
  }

  if (value <= 0x7f) {
    return new Uint8Array([value]);
  }

  if (value <= 0x3fff) {
    return new Uint8Array([(value & 0x7f) | 0x80, value >> 7]);
  }

  return new Uint8Array([(value & 0x7f) | 0x80, ((value >> 7) & 0x7f) | 0x80, value >> 14]);
}

/**
 * Concatenates multiple Uint8Arrays into a single Uint8Array.
 * Uses .set() at computed offsets — no spread syntax (performance).
 */
function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Builds a zero-amount Solana legacy transaction for wallet identification.
 *
 * The transaction is a minimal "transfer 0 lamports to self" via the System
 * Program. It has no meaningful economic effect but provides a valid Ed25519
 * signature over a deterministic message, proving wallet ownership.
 *
 * Wire format (169 bytes for standard inputs):
 *   [1 byte]  compact-u16(1)      — 1 signature
 *   [64 bytes] signature           — Ed25519 signature over message
 *   [3 bytes]  header              — [1, 0, 1] (numReqSig, numROSigned, numROUnsigned)
 *   [1 byte]   compact-u16(2)      — 2 account keys
 *   [32 bytes] signerPublicKey     — account 0 (fee payer + signer)
 *   [32 bytes] systemProgram       — account 1 (all zeros)
 *   [32 bytes] recentBlockhash     — blockhash (defaults to all zeros)
 *   [1 byte]   compact-u16(1)      — 1 instruction
 *   [1 byte]   program_id_index=1  — system program at index 1
 *   [1 byte]   compact-u16(0)      — 0 account indices
 *   [1 byte]   compact-u16(0)      — 0 data bytes
 */
export function buildDummyTransaction(
  signerPublicKey: Uint8Array,
  secretKey: Uint8Array,
  recentBlockhash: Uint8Array = new Uint8Array(32),
): Uint8Array {
  try {
    const SYSTEM_PROGRAM = new Uint8Array(32); // all zeros

    // Build message
    const header = new Uint8Array([1, 0, 1]); // numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts
    const accountCount = encodeCompactU16(2);
    const blockhash = recentBlockhash;
    const instructionCount = encodeCompactU16(1);
    // Instruction: program_id_index=1, 0 accounts, 0 data bytes
    const instruction = concatBytes(
      new Uint8Array([1]), // program_id_index (system program at index 1)
      encodeCompactU16(0), // account indices count = 0
      encodeCompactU16(0), // data length = 0
    );

    const message = concatBytes(
      header,
      accountCount,
      signerPublicKey,
      SYSTEM_PROGRAM,
      blockhash,
      instructionCount,
      instruction,
    );

    // Sign the message
    const signature = ed25519.sign(message, secretKey);

    // Build full transaction: sig_count + signature + message
    return concatBytes(encodeCompactU16(1), signature, message);
  } catch (e) {
    if (e instanceof AuthError) throw e;
    throw new AuthError({
      code: 'TRANSACTION_BUILD_FAILED',
      message: `Failed to build dummy transaction: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}
