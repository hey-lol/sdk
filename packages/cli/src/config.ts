/**
 * config.ts — Credential storage and resolution.
 *
 * Exports:
 * - store: Conf singleton at ~/.heylol/config.json
 * - resolveKey(): env-var-first priority chain, throws AuthError if no credentials
 * - createClient(): constructs HeyLolClient from resolved key + baseUrl
 */

import { AuthError, HeyLolClient } from '@heylol/sdk';
import Conf from 'conf';
import os from 'os';
import path from 'path';
import type { GlobalContext } from './context.js';

// ---------------------------------------------------------------------------
// Config shape
// ---------------------------------------------------------------------------

interface HeyLolConfig {
  privateKey?: string;
}

// ---------------------------------------------------------------------------
// Conf singleton
// ---------------------------------------------------------------------------

/**
 * Persistent credential store at ~/.heylol/config.json.
 * Uses `cwd` override so the path is exactly ~/.heylol/config.json on all platforms
 * (default conf path on macOS is ~/Library/Preferences/ which does not satisfy AUTH-02).
 * configFileMode: 0o600 restricts to owner-only permissions (private key protection).
 */
export const store = new Conf<HeyLolConfig>({
  cwd: path.join(os.homedir(), '.heylol'),
  configName: 'config',
  configFileMode: 0o600,
});

// ---------------------------------------------------------------------------
// resolveKey
// ---------------------------------------------------------------------------

/**
 * Resolve the private key with env-var-wins priority (AUTH-01, AUTH-05).
 *
 * Priority:
 * 1. process.env.HEYLOL_PRIVATE_KEY  (AUTH-01, AUTH-05 — env always wins)
 * 2. store.get('privateKey')          (AUTH-02 — persisted via auth setup)
 * 3. throw AuthError                  (exits with code 4 via printFailure)
 *
 * IMPORTANT: Must throw AuthError (not plain Error) so resolveExitCode() in
 * output.ts maps missing credentials to EXIT.AUTH (4), not EXIT.GENERAL (1).
 */
export function resolveKey(): string {
  const envKey = process.env.HEYLOL_PRIVATE_KEY;
  if (envKey) return envKey;

  const storedKey = store.get('privateKey');
  if (storedKey) return storedKey;

  throw new AuthError({
    code: 'INVALID_PRIVATE_KEY',
    message: 'No credentials found. Run: heylol auth setup --key <base58>',
  });
}

// ---------------------------------------------------------------------------
// createClient
// ---------------------------------------------------------------------------

/**
 * Create an authenticated HeyLolClient from resolved credentials.
 * Calls resolveKey() to get the private key, then constructs HeyLolClient.
 * Throws AuthError if no credentials are found or key is invalid.
 */
export function createClient(opts: Pick<GlobalContext, 'baseUrl'>): HeyLolClient {
  const privateKey = resolveKey();
  return new HeyLolClient({ privateKey, baseUrl: opts.baseUrl });
}
