import { describe, expect, it } from 'vitest';
import {
  AuthError,
  HeyLolError,
  isSdkError,
  NetworkError,
  PaymentRejectedError,
} from '../src/errors/index.js';

describe('HeyLolError', () => {
  it('has correct code, message and name', () => {
    const err = new HeyLolError({ code: 'TEST', message: 'msg' });
    expect(err.code).toBe('TEST');
    expect(err.message).toBe('msg');
    expect(err.name).toBe('HeyLolError');
  });

  it('is instanceof Error', () => {
    const err = new HeyLolError({ code: 'TEST', message: 'msg' });
    expect(err instanceof Error).toBe(true);
    expect(err instanceof HeyLolError).toBe(true);
  });

  it('toJSON returns name, code, message only', () => {
    const err = new HeyLolError({ code: 'TEST', message: 'msg' });
    const json = err.toJSON();
    expect(json).toEqual({ name: 'HeyLolError', code: 'TEST', message: 'msg' });
    // Verify no extra keys (no secret leakage)
    expect(Object.keys(json)).toEqual(['name', 'code', 'message']);
  });
});

describe('AuthError', () => {
  it('instanceof chain: AuthError > HeyLolError > Error', () => {
    const err = new AuthError({ code: 'INVALID_PRIVATE_KEY', message: 'bad key' });
    expect(err instanceof AuthError).toBe(true);
    expect(err instanceof HeyLolError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('has correct name and code', () => {
    const err = new AuthError({ code: 'INVALID_PRIVATE_KEY', message: 'bad key' });
    expect(err.name).toBe('AuthError');
    expect(err.code).toBe('INVALID_PRIVATE_KEY');
    expect(err.message).toBe('bad key');
  });

  it('toJSON does not leak secrets', () => {
    const err = new AuthError({ code: 'KEY_DECODE_FAILED', message: 'decode failed' });
    const json = err.toJSON();
    expect(json).toEqual({
      name: 'AuthError',
      code: 'KEY_DECODE_FAILED',
      message: 'decode failed',
    });
  });

  // TypeScript compile-time check (documented):
  // The following would cause a TypeScript error:
  // new AuthError({ code: 'WRONG_CODE', message: 'bad' })
  // Because code is typed as a string literal union, not arbitrary string.
});

describe('PaymentRejectedError', () => {
  it('has reason property and correct instanceof chain', () => {
    const err = new PaymentRejectedError({
      code: 'PAYMENT_REJECTED',
      message: 'rejected',
      reason: 'bad sig',
    });
    expect(err.reason).toBe('bad sig');
    expect(err instanceof PaymentRejectedError).toBe(true);
    expect(err instanceof HeyLolError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('has correct name', () => {
    const err = new PaymentRejectedError({
      code: 'PAYMENT_REJECTED',
      message: 'rejected',
      reason: 'bad sig',
    });
    expect(err.name).toBe('PaymentRejectedError');
  });

  it('reason is optional', () => {
    const err = new PaymentRejectedError({ code: 'INSUFFICIENT_FUNDS', message: 'no funds' });
    expect(err.reason).toBeUndefined();
  });

  it('toJSON does not include reason (no secret leakage)', () => {
    const err = new PaymentRejectedError({
      code: 'PAYMENT_REJECTED',
      message: 'rejected',
      reason: 'bad sig',
    });
    const json = err.toJSON();
    expect(json).toEqual({
      name: 'PaymentRejectedError',
      code: 'PAYMENT_REJECTED',
      message: 'rejected',
    });
  });
});

describe('NetworkError', () => {
  it('has statusCode property and correct instanceof chain', () => {
    const err = new NetworkError({ code: 'TIMEOUT', message: 'timed out', statusCode: 408 });
    expect(err.statusCode).toBe(408);
    expect(err instanceof NetworkError).toBe(true);
    expect(err instanceof HeyLolError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('has correct name', () => {
    const err = new NetworkError({ code: 'TIMEOUT', message: 'timed out', statusCode: 408 });
    expect(err.name).toBe('NetworkError');
  });

  it('statusCode is optional', () => {
    const err = new NetworkError({ code: 'FETCH_FAILED', message: 'failed' });
    expect(err.statusCode).toBeUndefined();
  });

  it('toJSON does not include statusCode', () => {
    const err = new NetworkError({ code: 'TIMEOUT', message: 'timed out', statusCode: 408 });
    const json = err.toJSON();
    expect(json).toEqual({ name: 'NetworkError', code: 'TIMEOUT', message: 'timed out' });
  });
});

describe('isSdkError', () => {
  it('returns true for AuthError', () => {
    const err = new AuthError({ code: 'SIGNING_FAILED', message: 'sign failed' });
    expect(isSdkError(err)).toBe(true);
  });

  it('returns true for PaymentRejectedError', () => {
    const err = new PaymentRejectedError({ code: 'PAYMENT_REJECTED', message: 'rejected' });
    expect(isSdkError(err)).toBe(true);
  });

  it('returns true for NetworkError', () => {
    const err = new NetworkError({ code: 'RATE_LIMITED', message: 'rate limited' });
    expect(isSdkError(err)).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isSdkError(new Error('plain'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isSdkError(null)).toBe(false);
    expect(isSdkError(undefined)).toBe(false);
    expect(isSdkError('string')).toBe(false);
    expect(isSdkError(42)).toBe(false);
  });
});
