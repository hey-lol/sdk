/**
 * Output contract — centralized print functions, exit codes, and TTY detection.
 *
 * Rules:
 * - printSuccess writes to stdout; printFailure writes to stderr and exits.
 * - JSON mode is the default for non-TTY; human mode is the default at a TTY.
 * - Pass --json to force JSON even at a terminal; pass --human to force colored output.
 * - Never use console.log or console.error — always process.stdout.write / process.stderr.write.
 */

import { APIError, AuthError, isSdkError, RateLimitError } from '@heylol/sdk';
import pc from 'picocolors';

// ---------------------------------------------------------------------------
// Exit codes
// ---------------------------------------------------------------------------

export const EXIT = {
  SUCCESS: 0,
  GENERAL: 1,
  BAD_ARGS: 2,
  NOT_FOUND: 3,
  AUTH: 4,
  RATE_LIMITED: 5,
} as const;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type OutputOpts = { human?: boolean; json?: boolean };

// ---------------------------------------------------------------------------
// TTY detection
// ---------------------------------------------------------------------------

function isHumanMode(opts: OutputOpts): boolean {
  if (opts.json) return false;
  if (opts.human) return true;
  return Boolean(process.stdout.isTTY);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function printHuman(data: unknown): void {
  if (data === null || data === undefined) {
    process.stdout.write(pc.green('OK') + '\n');
  } else {
    process.stdout.write(pc.dim('--- response ---') + '\n');
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  }
}

function buildErrorPayload(err: unknown): { error: { code: string; message: string } } {
  if (isSdkError(err)) {
    return { error: { code: err.code, message: err.message } };
  }
  if (err instanceof Error) {
    return { error: { code: 'UNKNOWN_ERROR', message: err.message } };
  }
  return { error: { code: 'UNKNOWN_ERROR', message: String(err) } };
}

function resolveExitCode(err: unknown): number {
  if (!isSdkError(err)) return EXIT.GENERAL;
  if (err instanceof AuthError) return EXIT.AUTH;
  if (err instanceof RateLimitError) return EXIT.RATE_LIMITED;
  if (err instanceof APIError && err.statusCode === 404) return EXIT.NOT_FOUND;
  return EXIT.GENERAL;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function printSuccess(data: unknown, opts: OutputOpts = {}): void {
  if (isHumanMode(opts)) {
    printHuman(data);
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  }
}

export function printFailure(err: unknown, opts: OutputOpts = {}): never {
  const code = resolveExitCode(err);
  const payload = buildErrorPayload(err);

  if (isHumanMode(opts)) {
    process.stderr.write(pc.red('Error: ') + payload.error.message + '\n');
    process.stderr.write(pc.dim('code: ' + payload.error.code) + '\n');
  } else {
    process.stderr.write(JSON.stringify(payload) + '\n');
  }

  process.exit(code);
}

export function printBadArgs(message: string, opts: OutputOpts = {}): never {
  if (isHumanMode(opts)) {
    process.stderr.write(pc.red('Error: ') + message + '\n');
    process.stderr.write(pc.dim('code: BAD_ARGS') + '\n');
  } else {
    process.stderr.write(JSON.stringify({ error: { code: 'BAD_ARGS', message } }) + '\n');
  }

  process.exit(EXIT.BAD_ARGS);
}
