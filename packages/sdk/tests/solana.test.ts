import { ed25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it } from 'vitest';
import { buildDummyTransaction, encodeCompactU16 } from '../src/auth/solana.js';

// Deterministic keypair for testing
const SECRET_KEY = new Uint8Array(32).fill(1);
const PUBLIC_KEY = ed25519.getPublicKey(SECRET_KEY);

describe('encodeCompactU16', () => {
  it('encodes 0 as single byte 0x00', () => {
    expect(encodeCompactU16(0)).toEqual(new Uint8Array([0x00]));
  });

  it('encodes 1 as single byte 0x01', () => {
    expect(encodeCompactU16(1)).toEqual(new Uint8Array([0x01]));
  });

  it('encodes 127 as single byte 0x7f', () => {
    expect(encodeCompactU16(127)).toEqual(new Uint8Array([0x7f]));
  });

  it('encodes 128 as two bytes [0x80, 0x01]', () => {
    expect(encodeCompactU16(128)).toEqual(new Uint8Array([0x80, 0x01]));
  });

  it('encodes 255 as two bytes [0xff, 0x01]', () => {
    expect(encodeCompactU16(255)).toEqual(new Uint8Array([0xff, 0x01]));
  });

  it('encodes 300 as two bytes [0xac, 0x02]', () => {
    expect(encodeCompactU16(300)).toEqual(new Uint8Array([0xac, 0x02]));
  });

  it('encodes 16383 as two bytes [0xff, 0x7f]', () => {
    expect(encodeCompactU16(16383)).toEqual(new Uint8Array([0xff, 0x7f]));
  });

  it('encodes 16384 as three bytes [0x80, 0x80, 0x01]', () => {
    expect(encodeCompactU16(16384)).toEqual(new Uint8Array([0x80, 0x80, 0x01]));
  });

  it('encodes 65535 as three bytes [0xff, 0xff, 0x03]', () => {
    expect(encodeCompactU16(65535)).toEqual(new Uint8Array([0xff, 0xff, 0x03]));
  });

  it('throws AuthError for negative values', () => {
    expect(() => encodeCompactU16(-1)).toThrow();
  });

  it('throws AuthError for values > 65535', () => {
    expect(() => encodeCompactU16(65536)).toThrow();
  });
});

describe('buildDummyTransaction', () => {
  it('returns a Uint8Array', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('first byte is 0x01 (compact-u16 of 1 = single signature)', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    expect(result[0]).toBe(0x01);
  });

  it('signature is 64 bytes at offset 1-64 and is non-zero', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const signature = result.slice(1, 65);
    expect(signature.length).toBe(64);
    expect(signature.some((b) => b !== 0)).toBe(true);
  });

  it('signature verifies against the message using ed25519.verify', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const signature = result.slice(1, 65);
    const message = result.slice(65); // everything after sig_count + signature
    expect(ed25519.verify(signature, message, PUBLIC_KEY)).toBe(true);
  });

  it('message header is [1, 0, 1] (numReqSig, numROSigned, numROUnsigned)', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const message = result.slice(65);
    expect(message[0]).toBe(1); // numRequiredSignatures
    expect(message[1]).toBe(0); // numReadonlySignedAccounts
    expect(message[2]).toBe(1); // numReadonlyUnsignedAccounts
  });

  it('account count byte is 0x02 (compact-u16 of 2)', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const message = result.slice(65);
    // header = 3 bytes, then account count
    expect(message[3]).toBe(0x02);
  });

  it('signer public key is at message offset 4..36 (32 bytes)', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const message = result.slice(65);
    const signerKey = message.slice(4, 36); // header(3) + accountCount(1) + signer(32)
    expect(signerKey).toEqual(PUBLIC_KEY);
  });

  it('system program at message offset 36..68 is all zeros', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const message = result.slice(65);
    const systemProgram = message.slice(36, 68);
    expect(systemProgram.every((b) => b === 0)).toBe(true);
  });

  it('default blockhash at message offset 68..100 is all zeros', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const message = result.slice(65);
    const blockhash = message.slice(68, 100);
    expect(blockhash.every((b) => b === 0)).toBe(true);
  });

  it('custom blockhash is used at the correct position', () => {
    const customBlockhash = new Uint8Array(32).fill(0xab);
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY, customBlockhash);
    const message = result.slice(65);
    const blockhash = message.slice(68, 100);
    expect(blockhash).toEqual(customBlockhash);
  });

  it('instruction count is 0x01 (compact-u16 of 1)', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const message = result.slice(65);
    expect(message[100]).toBe(0x01);
  });

  it('instruction structure: program_id_index=1, 0 accounts, 0 data', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const message = result.slice(65);
    // instruction starts at offset 101: program_id_index
    expect(message[101]).toBe(1); // program_id_index = 1 (system program)
    expect(message[102]).toBe(0); // account indices count = 0
    expect(message[103]).toBe(0); // data length = 0
  });

  it('total transaction length is exactly 169 bytes', () => {
    const result = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    // 1 (sig count) + 64 (sig) + 3 (header) + 1 (account count) + 32 (signer) + 32 (system)
    // + 32 (blockhash) + 1 (instruction count) + 1 (program_id_index) + 1 (account indices=0) + 1 (data=0)
    expect(result.length).toBe(169);
  });

  it('output is deterministic for same inputs', () => {
    const result1 = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    const result2 = buildDummyTransaction(PUBLIC_KEY, SECRET_KEY);
    expect(result1).toEqual(result2);
  });
});
