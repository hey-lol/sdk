import { ed25519 } from '@noble/curves/ed25519.js';
import { base58 } from '@scure/base';
import { describe, expect, it } from 'vitest';
import { loadKeypair } from '../src/auth/keypair.js';
import { AuthError } from '../src/errors/index.js';

// Deterministic test fixtures — fixed 32-byte secret key
const SECRET_KEY = new Uint8Array(32).fill(1); // known 32-byte key
const PUBLIC_KEY = ed25519.getPublicKey(SECRET_KEY);
const KEYPAIR_64 = new Uint8Array([...SECRET_KEY, ...PUBLIC_KEY]);
const BASE58_64 = base58.encode(KEYPAIR_64);
const BASE58_32 = base58.encode(SECRET_KEY);

describe('loadKeypair', () => {
  describe('64-byte base58 input (Solana CLI / Phantom format)', () => {
    it('returns correct secretKey (first 32 bytes)', () => {
      const result = loadKeypair(BASE58_64);
      expect(result.secretKey).toEqual(SECRET_KEY);
    });

    it('returns correct publicKey (last 32 bytes)', () => {
      const result = loadKeypair(BASE58_64);
      expect(result.publicKey).toEqual(PUBLIC_KEY);
    });

    it('returns Uint8Array instances', () => {
      const result = loadKeypair(BASE58_64);
      expect(result.secretKey).toBeInstanceOf(Uint8Array);
      expect(result.publicKey).toBeInstanceOf(Uint8Array);
    });

    it('secretKey is exactly 32 bytes', () => {
      const result = loadKeypair(BASE58_64);
      expect(result.secretKey.length).toBe(32);
    });

    it('publicKey is exactly 32 bytes', () => {
      const result = loadKeypair(BASE58_64);
      expect(result.publicKey.length).toBe(32);
    });
  });

  describe('32-byte base58 input (secret-only format)', () => {
    it('derives correct publicKey via ed25519.getPublicKey', () => {
      const result = loadKeypair(BASE58_32);
      expect(result.publicKey).toEqual(ed25519.getPublicKey(SECRET_KEY));
    });

    it('returns the secretKey unchanged', () => {
      const result = loadKeypair(BASE58_32);
      expect(result.secretKey).toEqual(SECRET_KEY);
    });

    it('derived publicKey matches the 64-byte input publicKey', () => {
      const from32 = loadKeypair(BASE58_32);
      const from64 = loadKeypair(BASE58_64);
      expect(from32.publicKey).toEqual(from64.publicKey);
    });
  });

  describe('invalid input — throws AuthError', () => {
    it('throws AuthError for 16-byte input (wrong length)', () => {
      const shortKey = new Uint8Array(16).fill(2);
      const encoded = base58.encode(shortKey);
      expect(() => loadKeypair(encoded)).toThrow(AuthError);
    });

    it('thrown AuthError has code INVALID_PRIVATE_KEY', () => {
      const shortKey = new Uint8Array(16).fill(2);
      const encoded = base58.encode(shortKey);
      try {
        loadKeypair(encoded);
        expect.fail('should have thrown');
      } catch (e) {
        expect(e instanceof AuthError).toBe(true);
        expect((e as AuthError).code).toBe('INVALID_PRIVATE_KEY');
      }
    });

    it('throws AuthError for 1-byte input', () => {
      const tinyKey = new Uint8Array([0xff]);
      const encoded = base58.encode(tinyKey);
      expect(() => loadKeypair(encoded)).toThrow(AuthError);
    });

    it('throws for invalid base58 string (contains invalid characters)', () => {
      // Base58 excludes '0' (zero), 'O' (capital o), 'I' (capital i), 'l' (lowercase l)
      // A string with these characters should fail to decode
      expect(() => loadKeypair('0OIlINVALID')).toThrow();
    });

    it('error message mentions the actual byte length for wrong length', () => {
      const wrongLengthKey = new Uint8Array(48).fill(3);
      const encoded = base58.encode(wrongLengthKey);
      try {
        loadKeypair(encoded);
        expect.fail('should have thrown');
      } catch (e) {
        expect((e as AuthError).message).toContain('48');
      }
    });
  });

  describe('Keypair interface (TypeScript compile-time check)', () => {
    it('returned object has secretKey and publicKey properties', () => {
      const keypair = loadKeypair(BASE58_32);
      // TypeScript compile-time: readonly properties cannot be reassigned
      // keypair.secretKey = new Uint8Array(32); // would be a TypeScript error
      expect('secretKey' in keypair).toBe(true);
      expect('publicKey' in keypair).toBe(true);
    });
  });
});
