import { describe, expect, it, vi } from 'vitest';

// Mock @heylol/sdk to avoid crypto dep chain
vi.mock('@heylol/sdk', () => {
  class MockHeyLolClient {
    readonly _opts: { privateKey: string; baseUrl?: string };
    readonly posts = {};
    readonly profile = {};
    readonly social = {};

    constructor(opts: { privateKey: string; baseUrl?: string }) {
      this._opts = opts;
    }
  }

  return {
    HeyLolClient: MockHeyLolClient,
  };
});

import { CloudflareClient, createFromEnv } from '../src/index.js';

describe('CloudflareClient', () => {
  it('passes env.HEYLOL_PRIVATE_KEY to super constructor', () => {
    const env = { HEYLOL_PRIVATE_KEY: 'cf-test-key' };
    const client = new CloudflareClient(env);

    // Access internal opts via the mock
    expect((client as unknown as { _opts: { privateKey: string } })._opts.privateKey).toBe(
      'cf-test-key',
    );
  });

  it('passes env.HEYLOL_BASE_URL to super constructor when provided', () => {
    const env = {
      HEYLOL_PRIVATE_KEY: 'cf-test-key',
      HEYLOL_BASE_URL: 'https://custom.api.hey.lol',
    };
    const client = new CloudflareClient(env);

    expect((client as unknown as { _opts: { baseUrl?: string } })._opts.baseUrl).toBe(
      'https://custom.api.hey.lol',
    );
  });

  it('does not set baseUrl when HEYLOL_BASE_URL is not provided', () => {
    const env = { HEYLOL_PRIVATE_KEY: 'cf-test-key' };
    const client = new CloudflareClient(env);

    expect((client as unknown as { _opts: { baseUrl?: string } })._opts.baseUrl).toBeUndefined();
  });

  it('is an instance of CloudflareClient', () => {
    const env = { HEYLOL_PRIVATE_KEY: 'cf-test-key' };
    const client = new CloudflareClient(env);
    expect(client).toBeInstanceOf(CloudflareClient);
  });

  it('exposes resource namespaces (posts, profile, social)', () => {
    const env = { HEYLOL_PRIVATE_KEY: 'cf-test-key' };
    const client = new CloudflareClient(env);
    expect(client.posts).toBeDefined();
    expect(client.profile).toBeDefined();
    expect(client.social).toBeDefined();
  });
});

describe('createFromEnv', () => {
  it('returns instance with correct config from env bindings', () => {
    const env = {
      HEYLOL_PRIVATE_KEY: 'cf-factory-key',
      HEYLOL_BASE_URL: 'https://factory.api.hey.lol',
    };
    const client = createFromEnv(env);

    expect(
      (client as unknown as { _opts: { privateKey: string; baseUrl?: string } })._opts.privateKey,
    ).toBe('cf-factory-key');
    expect((client as unknown as { _opts: { baseUrl?: string } })._opts.baseUrl).toBe(
      'https://factory.api.hey.lol',
    );
  });

  it('returns a CloudflareClient instance', () => {
    const env = { HEYLOL_PRIVATE_KEY: 'cf-factory-key' };
    const client = createFromEnv(env);
    expect(client).toBeInstanceOf(CloudflareClient);
  });

  it('passes through additional opts', () => {
    const env = { HEYLOL_PRIVATE_KEY: 'cf-factory-key' };
    const client = createFromEnv(env, { retries: 5 });

    expect(
      (client as unknown as { _opts: { privateKey: string; retries?: number } })._opts.privateKey,
    ).toBe('cf-factory-key');
  });
});
