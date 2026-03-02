/**
 * Output utilities — stubs for Phase 11.
 * Phase 11 replaces these with the full output contract (TTY detection, exit codes, structured errors).
 */

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printError(message: string): void {
  console.error(JSON.stringify({ error: { message } }));
}
