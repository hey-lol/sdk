export interface ClientOptions {
  /** Base58-encoded Solana private key (required) */
  privateKey: string;
  /** API base URL (default: 'https://api.hey.lol') */
  baseUrl?: string;
  /** Max retry attempts for transient failures (default: 3) */
  retries?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Injectable fetch function for testing and runtime portability (default: globalThis.fetch) */
  network?: typeof fetch;
  /** @internal — for testing only. Overrides the delay function in retry logic to avoid real sleeps in tests. */
  _sleep?: (ms: number) => Promise<void>;
}

/** Resolved options with all defaults applied (privateKey remains string, not resolved) */
export type ResolvedOptions = Required<Omit<ClientOptions, 'network' | '_sleep'>> & {
  network: typeof fetch;
  _sleep?: (ms: number) => Promise<void>;
};

export const DEFAULT_OPTIONS = {
  baseUrl: 'https://api.hey.lol',
  retries: 3,
  timeout: 30_000,
} as const satisfies Omit<Required<ClientOptions>, 'privateKey' | 'network' | '_sleep'>;
