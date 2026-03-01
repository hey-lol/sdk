import { describe, expect, it } from 'vitest';
import { encodeCompactU16 } from '../src/auth/solana.js';

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
