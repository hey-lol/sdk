# Phase 12: Auth Commands - Research

**Researched:** 2026-03-02
**Domain:** Node.js CLI credential management — conf@15, commander@14, HeyLolClient auth flow
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can authenticate via HEYLOL_PRIVATE_KEY environment variable | `process.env.HEYLOL_PRIVATE_KEY` read directly in `resolveKey()` helper; no commander option binding needed; env var check is first in priority chain |
| AUTH-02 | User can persist credentials via heylol auth setup to ~/.heylol/config.json | `conf@15` with `cwd: path.join(os.homedir(), '.heylol')` and `configName: 'config'` produces exactly `~/.heylol/config.json`; verified via live test |
| AUTH-03 | heylol auth setup --key base58 works non-interactively for CI/agent use | Commander `new Option('--key <base58>').env('HEYLOL_PRIVATE_KEY').makeOptionMandatory(true)` — accepts flag or env var, errors without either; no interactive prompts needed |
| AUTH-04 | User can verify credentials via heylol auth verify (calls profile.me) | `client.profile.me()` exists in ProfileResource; returns `Promise<Profile>`; `printSuccess(profile, opts)` then handles output; printFailure handles AuthError with exit code 4 |
| AUTH-05 | Env var takes priority over config file when both present | `resolveKey()` checks `process.env.HEYLOL_PRIVATE_KEY` first, then `conf.get('privateKey')`; env var wins unconditionally |
</phase_requirements>

---

## Summary

Phase 12 implements two auth subcommands (`auth setup` and `auth verify`) by wiring three components together: (1) a `config.ts` module that encapsulates `conf@15` for persistent credential storage and a `resolveKey()` function that enforces the env-var-wins priority, (2) the existing `makeAuthCommand()` stub in `commands/auth.ts`, and (3) the `HeyLolClient` constructor + `profile.me()` from `@heylol/sdk`.

The most important architectural decision is **where `resolveKey()` lives**. It must be a shared helper in `src/config.ts` rather than inline code, because every other command in Phases 13 and 14 will also need to resolve a key before constructing a `HeyLolClient`. The function reads `process.env.HEYLOL_PRIVATE_KEY` first (AUTH-05), then falls back to `conf.get('privateKey')`, then throws an `AuthError` with code `INVALID_PRIVATE_KEY` if neither is present. Using `AuthError` (from `@heylol/sdk`) ensures `resolveExitCode()` in `output.ts` maps missing-key to exit code 4, which satisfies the success criterion for `auth verify`.

The `conf` library must be configured with `cwd: path.join(os.homedir(), '.heylol')` and `configName: 'config'` to produce exactly `~/.heylol/config.json`. The default `conf` path on macOS is `~/Library/Preferences/heylol/config.json` — the `cwd` override is mandatory to satisfy AUTH-02. Using `configFileMode: 0o600` restricts file permissions to owner-only, which is appropriate for private key storage.

**Primary recommendation:** Create `src/config.ts` with a singleton `conf` instance and a `resolveKey()` function. Implement `auth setup` with a mandatory `--key` option (also env-backed) that validates the key via `loadKeypair()` before writing. Implement `auth verify` by calling `resolveKey()`, constructing a `HeyLolClient`, then `client.profile.me()`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| conf | 15.1.0 (installed) | Persist `privateKey` to `~/.heylol/config.json` | Already in `package.json`; ESM-native; atomic writes; auto-creates directory; sync API |
| commander | 14.0.3 (installed) | `--key <base58>` option with `.env()` + `.makeOptionMandatory()` | Already in use; env var satisfies mandatory option check |
| @heylol/sdk | workspace:* | `HeyLolClient`, `loadKeypair`, `AuthError`, `isSdkError` | All auth validation and API calls live in SDK |
| Node.js built-ins | — | `os.homedir()`, `path.join()`, `process.env` | No extra packages needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | 1.1.x (installed) | Human-mode output formatting | Already handled by `output.ts` — no direct use in auth commands |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `conf` with `cwd` override | `conf` default path | Default path is `~/Library/Preferences/heylol/` on macOS, not `~/.heylol/` — does not satisfy AUTH-02 |
| Throwing `AuthError` for missing key | Custom `Error` subclass | Custom error doesn't satisfy `isSdkError()`, maps to exit code 1 not 4 — breaks success criterion 5 |
| `loadKeypair()` validation on setup | Write key without validation | Writing an invalid key silently would break `auth verify` later with a confusing error |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

This phase adds one new file and modifies one existing stub:

```
packages/cli/src/
├── index.ts              # No changes needed
├── context.ts            # No changes needed
├── output.ts             # No changes needed (already complete from Phase 11)
├── config.ts             # NEW: conf singleton + resolveKey() + createClient()
└── commands/
    └── auth.ts           # REPLACE stub: implement setup + verify actions
```

### Pattern 1: config.ts Module — Conf Singleton + resolveKey()

**What:** A shared module that owns all credential resolution logic. Every command that needs authentication imports `resolveKey()` from here.

**When to use:** Imported by every command action handler that needs to authenticate (auth.ts, and all Phase 13/14 commands).

```typescript
// Source: conf@15.1.0 API (verified from installed readme.md + types.d.ts)
// Source: @heylol/sdk loadKeypair (verified from packages/sdk/src/auth/keypair.ts)
// packages/cli/src/config.ts

import Conf from 'conf';
import os from 'os';
import path from 'path';
import { AuthError, HeyLolClient, loadKeypair } from '@heylol/sdk';
import type { GlobalContext } from './context.js';

// Shape of the config file at ~/.heylol/config.json
interface HeyLolConfig {
  privateKey?: string;
}

// Singleton conf instance — points to ~/.heylol/config.json
// conf creates the directory automatically if it doesn't exist
export const store = new Conf<HeyLolConfig>({
  cwd: path.join(os.homedir(), '.heylol'),
  configName: 'config',
  configFileMode: 0o600,  // owner read/write only — private key protection
});

/**
 * Resolve the private key with env-var-wins priority (AUTH-01, AUTH-05).
 *
 * Priority:
 * 1. process.env.HEYLOL_PRIVATE_KEY  (AUTH-01, AUTH-05)
 * 2. store.get('privateKey')          (AUTH-02)
 * 3. throw AuthError                  (exits with code 4 via printFailure)
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

/**
 * Create an authenticated HeyLolClient from resolved credentials.
 * Throws AuthError (code: INVALID_PRIVATE_KEY or KEY_DECODE_FAILED) if key is invalid.
 */
export function createClient(opts: Pick<GlobalContext, 'baseUrl'>): HeyLolClient {
  const privateKey = resolveKey();
  return new HeyLolClient({ privateKey, baseUrl: opts.baseUrl });
}
```

**Key facts verified:**
- `conf` auto-creates `~/.heylol/` directory if it doesn't exist (verified via live test)
- `store.get('privateKey')` returns `undefined` (not `null`) when key is absent — truthiness check `if (storedKey)` is safe
- `store.get('privateKey', null)` returns `null` as default — omit default to get `undefined`
- `configFileMode: 0o600` produces mode `600` on the file (verified via live test with `fs.statSync`)
- `conf` construction is synchronous and ~0ms (verified via live test)

### Pattern 2: auth setup Command

**What:** Accepts `--key <base58>` (also env-backed), validates the key via `loadKeypair()`, then writes to conf. Non-interactive — satisfies AUTH-03.

**When to use:** `heylol auth setup --key <base58>` or `HEYLOL_PRIVATE_KEY=<key> heylol auth setup`

```typescript
// Source: commander@14.0.3 Option API (verified from installed node_modules)
// Source: @heylol/sdk loadKeypair (packages/sdk/src/auth/keypair.ts)
// packages/cli/src/commands/auth.ts

import { Command, Option } from 'commander';
import { loadKeypair } from '@heylol/sdk';
import { store } from '../config.js';
import { printSuccess, printFailure, printBadArgs } from '../output.js';
import type { GlobalContext } from '../context.js';

cmd
  .command('setup')
  .description('Save credentials to ~/.heylol/config.json')
  .addOption(
    new Option('--key <base58>', 'base58-encoded private key')
      .env('HEYLOL_PRIVATE_KEY')
      .makeOptionMandatory(true),
  )
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & { key: string }>();
    try {
      // Validate key before storing — surface bad keys immediately
      loadKeypair(opts.key);
      store.set('privateKey', opts.key);
      printSuccess({ ok: true, path: store.path }, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

**Key facts verified:**
- `.makeOptionMandatory(true)` with `.env('HEYLOL_PRIVATE_KEY')`: env var satisfies the mandatory requirement (verified via live test — no error when env var is set, error when both absent)
- `store.set('privateKey', value)` writes synchronously; reads back immediately
- `loadKeypair()` throws `AuthError` on invalid base58 → `printFailure` maps to exit code 4

### Pattern 3: auth verify Command

**What:** Resolves key, constructs client, calls `client.profile.me()`, prints profile JSON. Exits with code 4 on any auth failure.

**When to use:** `heylol auth verify` or `HEYLOL_PRIVATE_KEY=<key> heylol auth verify`

```typescript
// Source: ProfileResource.me() (packages/sdk/src/resources/ProfileResource.ts — line 52)
// Source: resolveExitCode in output.ts — AuthError → EXIT.AUTH (4)
// packages/cli/src/commands/auth.ts

cmd
  .command('verify')
  .description('Verify credentials by fetching your profile')
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext>();
    try {
      const client = createClient(opts);
      const profile = await client.profile.me();
      printSuccess(profile, opts);
    } catch (err) {
      printFailure(err, opts);  // AuthError → exit code 4
    }
  });
```

**Key facts verified:**
- `client.profile.me()` calls `GET /profile/me` (verified in ProfileResource.ts line 52)
- Returns `Promise<Profile>` — Profile type from SDK domain types
- `HeyLolClient` constructor throws `AuthError` on invalid key (verified via live test)
- `printFailure` with `AuthError` calls `process.exit(4)` via `resolveExitCode` in output.ts

### Pattern 4: Full makeAuthCommand() with Both Subcommands

**What:** Complete replacement of the stub in `commands/auth.ts`.

```typescript
// packages/cli/src/commands/auth.ts
import { Command, Option } from 'commander';
import { loadKeypair } from '@heylol/sdk';
import { store, createClient } from '../config.js';
import { printSuccess, printFailure } from '../output.js';
import type { GlobalContext } from '../context.js';

export function makeAuthCommand(): Command {
  const cmd = new Command('auth').description('Manage authentication');

  cmd
    .command('setup')
    .description('Save credentials to ~/.heylol/config.json')
    .addOption(
      new Option('--key <base58>', 'base58-encoded private key')
        .env('HEYLOL_PRIVATE_KEY')
        .makeOptionMandatory(true),
    )
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { key: string }>();
      try {
        loadKeypair(opts.key);           // validate before storing
        store.set('privateKey', opts.key);
        printSuccess({ ok: true, path: store.path }, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('verify')
    .description('Verify credentials by fetching your profile')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const profile = await client.profile.me();
        printSuccess(profile, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
```

### Anti-Patterns to Avoid

- **Storing the key without validation:** If an invalid key is written to config, `auth verify` fails with a confusing error later. Call `loadKeypair(opts.key)` before `store.set()`.
- **Using `conf` default path (no `cwd` override):** On macOS, the default is `~/Library/Preferences/heylol/config.json`, not `~/.heylol/config.json`. The `cwd` option is mandatory.
- **Throwing a plain `Error` for missing credentials:** `resolveExitCode()` in output.ts returns `EXIT.GENERAL` (1) for non-SDK errors. Must throw `AuthError` to get exit code 4.
- **Reading env var via Commander global option:** Adding `--key` as a global option on the root program conflicts with the `auth setup` command's own `--key` option (same name, different semantics). Read `process.env.HEYLOL_PRIVATE_KEY` directly in `resolveKey()`.
- **Creating conf instance per-command call:** Conf should be instantiated once as a module-level singleton in `config.ts`. Creating it per-call is wasteful (file I/O on each construction) and risks race conditions.
- **Not using `async function` in action handler:** Commander action handlers that `await` must use `async function`. Using `() =>` arrow functions loses the `this` binding needed for `optsWithGlobals()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config file location | Custom path resolution with `fs.mkdir` + `fs.writeFile` | `conf` with `cwd` option | conf handles atomic writes, directory creation, JSON serialization, and file permissions |
| Key validation | Custom base58 regex or length check | `loadKeypair()` from `@heylol/sdk` | SDK already validates both 32-byte and 64-byte formats, throws typed AuthError with correct code |
| Env-var-to-option binding | `process.env.X ?? flags.x` in every handler | `Option.env()` for options that need it, direct `process.env` for `resolveKey()` | Commander's `.env()` handles precedence for commander options; `resolveKey()` needs direct env access to avoid naming conflict |
| Exit-code-4 for auth failure | `process.exit(4)` in catch block | `printFailure(err, opts)` — already maps `AuthError` to `EXIT.AUTH` | output.ts resolveExitCode handles this; duplicating the logic in auth commands would break consistency |

**Key insight:** The auth implementation is thin: `config.ts` is ~30 lines, `commands/auth.ts` is ~35 lines. The heavy lifting (key validation, API calls, error mapping, exit codes) is all done by existing SDK and output infrastructure.

---

## Common Pitfalls

### Pitfall 1: conf Default Path Doesn't Match Requirement

**What goes wrong:** Creating `new Conf({ projectName: 'heylol' })` writes to `~/Library/Preferences/heylol/config.json` on macOS (or `~/.config/heylol/config.json` on Linux), not `~/.heylol/config.json`.
**Why it happens:** `conf` respects OS conventions for config directories. The requirement specifies a non-standard `~/.heylol/config.json` path.
**How to avoid:** Use `cwd: path.join(os.homedir(), '.heylol')` with `configName: 'config'`. Omit `projectName` when `cwd` is set (they're mutually exclusive in the sense that `cwd` overrides the derived path from `projectName`).
**Warning signs:** `store.path` doesn't equal `~/.heylol/config.json` when logged; SUCCESS CRITERIA 2 fails because the wrong file is checked.

### Pitfall 2: Missing Key Exits with Code 1 Instead of 4

**What goes wrong:** When no credentials are found, `resolveKey()` throws a plain `new Error('No credentials')`. `resolveExitCode()` returns `EXIT.GENERAL` (1) because `isSdkError(err)` returns false for plain `Error`.
**Why it happens:** `resolveExitCode` only maps SDK error classes to typed codes. Non-SDK errors always map to 1.
**How to avoid:** Throw `new AuthError({ code: 'INVALID_PRIVATE_KEY', message: '...' })` from `resolveKey()`. `AuthError` extends `HeyLolError` which satisfies `isSdkError()`, triggering `EXIT.AUTH` (4).
**Warning signs:** `echo $?` after `heylol auth verify` with no credentials returns 1 instead of 4; SUCCESS CRITERIA 5 fails.

### Pitfall 3: makeOptionMandatory Conflict with auth setup --key

**What goes wrong:** `auth setup` has a `--key` option. If `--key` is also registered as a global option on the root program (for auth resolution across all commands), Commander may conflict or require `--key` on every command.
**Why it happens:** Global options registered on the root program via `addOption` are inherited by all subcommands. A subcommand can't safely reuse the same option name.
**How to avoid:** Do NOT add `--key` as a global option. Keep `resolveKey()` reading `process.env.HEYLOL_PRIVATE_KEY` directly. The `auth setup` command is the only command with a `--key` option, and it's scoped to that subcommand only.
**Warning signs:** TypeScript error about duplicate option names; or all commands unexpectedly require `--key`.

### Pitfall 4: Key Written Without Validation

**What goes wrong:** `store.set('privateKey', opts.key)` is called before `loadKeypair(opts.key)`. If the user provides a malformed key, it gets written to config. Subsequent calls to `createClient()` fail with `AuthError`.
**Why it happens:** Writing to conf is decoupled from SDK validation — conf doesn't know what a valid key looks like.
**How to avoid:** Always call `loadKeypair(opts.key)` BEFORE `store.set()`. Since `loadKeypair` throws `AuthError` on failure, the store write is skipped and `printFailure` handles the error.
**Warning signs:** `heylol auth setup --key invalid` exits with code 0 and writes to config; next `heylol auth verify` fails with a confusing key decode error.

### Pitfall 5: conf Not Listed as External in tsup

**What goes wrong:** If `conf` is bundled into the CLI by tsup, the bundled conf may fail at runtime due to Node.js built-ins used internally by conf (path, fs, os, crypto).
**Why it happens:** tsup bundling Node.js packages that use native modules can cause runtime errors.
**How to avoid:** `conf` is already listed in `external: ['conf']` in the current `tsup.config.ts` (verified). No action needed — this pitfall is pre-avoided.
**Warning signs:** `cannot find module 'conf'` at runtime after build; or conf fails with `ERR_REQUIRE_ESM`.

### Pitfall 6: async Action Handler Without Error Catch

**What goes wrong:** `async function(this: Command) { const profile = await client.profile.me(); }` — if `profile.me()` rejects, the rejection escapes the action handler. Commander's `parseAsync()` may not catch it, and Node.js emits an unhandled rejection warning instead of a structured error.
**Why it happens:** async action handlers must have explicit try/catch; Commander doesn't add one automatically.
**How to avoid:** Every async action handler MUST wrap its body in try/catch calling `printFailure(err, opts)`. This is the established pattern from Phase 11.
**Warning signs:** `UnhandledPromiseRejectionWarning` in output instead of `{"error":{"code":"...","message":"..."}}` on stderr.

---

## Code Examples

Verified patterns from installed libraries and codebase:

### conf: Correct Path Setup (Verified via Live Test)

```typescript
// Source: conf@15.1.0 readme.md (installed) + live path verification
// ~/.heylol/config.json — exact path required by AUTH-02
import Conf from 'conf';
import os from 'os';
import path from 'path';

const store = new Conf<{ privateKey?: string }>({
  cwd: path.join(os.homedir(), '.heylol'),  // produces ~/.heylol/
  configName: 'config',                      // produces config.json
  configFileMode: 0o600,                     // owner-only permissions (verified: 600 mode)
});

// store.path === '/Users/you/.heylol/config.json' (verified via live test)
// Directory auto-created if absent (verified via live test)
```

### resolveKey Priority Chain (AUTH-01, AUTH-02, AUTH-05)

```typescript
// Source: requirements AUTH-01, AUTH-02, AUTH-05
// Source: @heylol/sdk AuthError (packages/sdk/src/errors/index.ts)
import { AuthError } from '@heylol/sdk';

export function resolveKey(): string {
  // Priority 1: env var (AUTH-01, AUTH-05 — env wins over config)
  const envKey = process.env.HEYLOL_PRIVATE_KEY;
  if (envKey) return envKey;

  // Priority 2: stored config (AUTH-02)
  const storedKey = store.get('privateKey');
  if (storedKey) return storedKey;

  // Priority 3: fail with typed error → printFailure maps to exit code 4
  throw new AuthError({
    code: 'INVALID_PRIVATE_KEY',
    message: 'No credentials found. Run: heylol auth setup --key <base58>',
  });
}
```

### auth setup: Mandatory Option with Env Fallback (AUTH-03, Verified)

```typescript
// Source: commander@14.0.3 Option API (verified from installed package)
// Verified: makeOptionMandatory(true) is satisfied by env var (live test)
// Verified: throws 'required option not specified' when both flag and env are absent
new Option('--key <base58>', 'base58-encoded private key')
  .env('HEYLOL_PRIVATE_KEY')
  .makeOptionMandatory(true)
```

### Validate-Before-Write Pattern

```typescript
// Source: @heylol/sdk loadKeypair (packages/sdk/src/auth/keypair.ts)
// Verified: loadKeypair throws AuthError({ code: 'KEY_DECODE_FAILED' }) on invalid base58
import { loadKeypair } from '@heylol/sdk';

loadKeypair(opts.key);       // throws AuthError if invalid — store.set skipped
store.set('privateKey', opts.key);  // only reached on valid key
```

### createClient Helper

```typescript
// Source: HeyLolClient constructor (packages/sdk/src/client/HeyLolClient.ts)
// Verified: constructor throws AuthError on invalid key (live test)
import { HeyLolClient } from '@heylol/sdk';

export function createClient(opts: Pick<GlobalContext, 'baseUrl'>): HeyLolClient {
  const privateKey = resolveKey();  // throws AuthError if missing
  return new HeyLolClient({ privateKey, baseUrl: opts.baseUrl });
  // HeyLolClient constructor also throws AuthError on bad key format
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `~/.config/toolname` (configstore) | OS-specific config dir or explicit `cwd` | conf@13+ | conf uses system default dirs; `cwd` override needed for non-standard paths |
| Interactive key prompt (readline) | Non-interactive `--key` flag + env var | Modern CI-first CLIs (2020+) | Agent/CI use without terminal input |
| `process.env.KEY \|\| flags.key` in each command | `resolveKey()` singleton in config.ts | CLI design best practice | Single-source-of-truth for auth resolution across all commands |
| Writing arbitrary string to config | Validate then write | Security best practice | Surfaces invalid keys at setup time, not at use time |

**Deprecated/outdated:**
- `configstore` (Sindre Sorhus): Predecessor to conf. Stored in `~/.config` (Linux convention) on all platforms, which had permission issues on macOS/Windows. `conf` is the intended replacement.
- Interactive `readline` prompts for CI-facing CLIs: The `--key` flag approach with `.makeOptionMandatory()` + `.env()` is the current standard for agent/CI compatibility.

---

## Open Questions

1. **Should `createClient()` be in config.ts or a separate module?**
   - What we know: `createClient()` depends on both `resolveKey()` (from config.ts) and `HeyLolClient` (from SDK). It will be imported by every Phase 13/14 command.
   - What's unclear: Whether to co-locate with config.ts (simpler) or separate into `client.ts` (cleaner separation).
   - Recommendation: Co-locate in `config.ts` for Phase 12. If the file grows unwieldy in Phase 13/14, extract to `client.ts`. No risk of circular imports since `config.ts` doesn't import from command files.

2. **Should `auth setup` print the stored path or just `{ ok: true }`?**
   - What we know: The success criterion says "writes credentials to `~/.heylol/config.json`" but doesn't specify output shape.
   - What's unclear: Whether agents want the path confirmed in stdout output.
   - Recommendation: Output `{ ok: true, path: store.path }` — the `path` field is useful for agents to confirm the write location and costs nothing. JSON output satisfies `jq .ok` checks cleanly.

3. **Should `auth setup` validate that the key can actually authenticate (call profile.me)?**
   - What we know: AUTH-03 says "save credentials" — it doesn't say "verify credentials". AUTH-04 is `auth verify`'s job.
   - What's unclear: Whether a user expects `auth setup` to fail immediately if the key is valid base58 but wrong (e.g., wrong account).
   - Recommendation: `auth setup` validates only key format (via `loadKeypair()`), not API connectivity. Keep it offline. Users who want API validation run `auth verify` afterward. This matches `gh auth login` behavior.

---

## Sources

### Primary (HIGH confidence)
- `packages/cli/node_modules/conf/readme.md` (conf@15.1.0 installed) — full API including `cwd`, `configName`, `configFileMode`, `get()`, `set()`, `has()`, `path`
- `packages/cli/node_modules/conf/dist/source/index.d.ts` — TypeScript types for Conf class (generics, method signatures)
- `packages/cli/node_modules/conf/dist/source/types.d.ts` — `Options<T>` interface (all constructor options)
- `packages/cli/node_modules/commander/esm.mjs` (commander@14.0.3) — `Option` class, `.env()`, `.makeOptionMandatory()` methods
- `packages/sdk/src/errors/index.ts` — `AuthError` class with valid code literals; `isSdkError()` type guard
- `packages/sdk/src/auth/keypair.ts` — `loadKeypair()` implementation; throws `AuthError` on invalid base58
- `packages/sdk/src/client/HeyLolClient.ts` — constructor throws `AuthError` on invalid key; `ClientOptions` interface
- `packages/sdk/src/resources/ProfileResource.ts` — `me()` method returns `Promise<Profile>`; confirmed line 52
- `packages/cli/src/output.ts` — `resolveExitCode()` maps `AuthError` → `EXIT.AUTH` (4); `printFailure` returns `never`
- `packages/cli/src/index.ts` — `exitOverride` + `configureOutput(writeErr noop)` pattern; `optsWithGlobals()` usage; `parseAsync()` with catch handler
- `packages/cli/tsup.config.ts` — `external: ['conf']` confirmed; conf is NOT bundled

### Verified via Live Tests (HIGH confidence)
- `conf` with `cwd: path.join(os.homedir(), '.heylol'), configName: 'config'` → `store.path === '/Users/you/.heylol/config.json'`
- `conf` auto-creates directory if absent (tested with `os.tmpdir()` path)
- `configFileMode: 0o600` → `fs.statSync(store.path).mode & 0o777 === 0o600`
- `store.get('privateKey')` returns `undefined` when absent (not null)
- Commander `Option.env('HEYLOL_PRIVATE_KEY').makeOptionMandatory(true)`: satisfied by env var (no error); errors when both flag and env absent
- `HeyLolClient({ privateKey: 'invalid' })` throws `AuthError({ code: 'KEY_DECODE_FAILED' })`
- SDK exports: `AuthError`, `loadKeypair`, `HeyLolClient`, `isSdkError` all confirmed present in `dist/index.mjs`

### Secondary (MEDIUM confidence)
- conf GitHub README and changelog — `cwd` option behavior documented as "overrides projectName"; atomic write behavior
- Commander.js docs — `optsWithGlobals()` merges all ancestor options; `async function(this: Command)` pattern for action handlers

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries installed and verified via live tests; no new packages needed
- Architecture: HIGH — config.ts pattern derived from codebase structure; resolveKey() priority chain directly from requirements; verified via code inspection
- Pitfalls: HIGH for conf path (live-tested), AuthError exit code mapping (code-verified), validation-before-write (logic-verified); MEDIUM for conf external in tsup (already configured correctly, just confirmed)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (conf and commander are stable; no ecosystem churn expected)
