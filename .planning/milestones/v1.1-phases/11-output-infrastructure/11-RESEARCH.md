# Phase 11: Output and Infrastructure - Research

**Researched:** 2026-03-02
**Domain:** Node.js CLI output contract — JSON/human formatting, TTY detection, exit codes, cursor pagination
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-02 | CLI outputs JSON to stdout by default for all successful responses | `process.stdout.write(JSON.stringify(data) + '\n')` pattern; output module's `printSuccess()` function called from every action handler |
| INFRA-03 | CLI outputs structured JSON errors `{error: {code, message}}` to stderr on all failures | `process.stderr.write(...)` with try/catch in every action handler; SDK errors map to typed codes via `isSdkError()` |
| INFRA-04 | CLI provides `--human` flag that formats output with colors and readable structure | Global `--human` option via commander `addOption`; picocolors for formatting; action handlers read `human` from `optsWithGlobals()` |
| INFRA-05 | CLI auto-detects TTY — human output at terminal, JSON when piped — explicit flags override | `process.stdout.isTTY` is `true` at terminal, `undefined` when piped; `--human` and `--json` flags override; logic in output module |
| INFRA-06 | CLI uses typed exit codes: 0=success, 1=general, 2=bad-args, 3=not-found, 4=auth, 5=rate-limited | `process.exit(code)` called in catch block; SDK error types map deterministically to exit code numbers |
| INFRA-09 | All list commands support `--cursor` and `--limit` flags with `nextCursor` in response | Commander `.option('--cursor <string>')` and `.option('--limit <number>', ..., parseInt)` added to every list subcommand; response shape includes SDK's `PaginatedList<T>` with `nextCursor` field |
</phase_requirements>

---

## Summary

Phase 11 replaces the stub `output.ts` from Phase 10 with a complete, contract-driven output module. The core problem is: every command handler needs to route data to the correct stream (stdout vs stderr), in the correct format (JSON vs human), with the correct exit code. Doing this per-command would create massive duplication and inconsistency — the solution is a centralized output module that encapsulates all output decisions.

The stack already contains all necessary tools: `picocolors@1.1.1` for TTY-aware human formatting, `commander@14.0.3` for adding global `--human`/`--json` flags and propagating them via `optsWithGlobals()`, and the SDK's `isSdkError()` + error class hierarchy for deterministic exit code mapping. Node's `process.stdout.isTTY` provides the TTY signal — it is `true` at an interactive terminal and `undefined` (falsy) when stdout is piped, which is exactly the auto-detect behavior required by INFRA-05.

The key architectural decision for this phase is that the output module must be **stateless and purely functional**: it accepts data and options at call time rather than reading global state. Each command action handler calls `output.success(data, opts)` or `output.failure(err, opts)`, where `opts` comes from `this.optsWithGlobals()`. This keeps the module testable and eliminates any singleton risk. The `GlobalContext` type in `context.ts` must be extended to include `human: boolean` and optionally `json: boolean`.

**Primary recommendation:** Build a single `src/output.ts` module with `success()`, `failure()`, and formatting helpers. Add `--human` as a global option on the root program. Wire TTY auto-detection in `output.ts` itself (not in each command). Map SDK error types to exit codes in one place and call `process.exit()` from `failure()` only.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| picocolors | 1.1.1 (installed) | ANSI color output for human format | Zero-dependency; auto-detects TTY; `createColors(enabled)` allows explicit enable/disable override |
| commander | 14.0.3 (installed) | `--human` global option; `optsWithGlobals()` propagation | Already in use; global options flow naturally to all subcommands |
| Node.js built-ins | — | `process.stdout`, `process.stderr`, `process.exit()`, `process.stdout.isTTY` | No additional dependencies needed for output routing and exit codes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @heylol/sdk error types | workspace:* | `isSdkError()`, `AuthError`, `RateLimitError`, `APIError`, `NetworkError` | In `failure()` — type narrowing to determine exit code |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| picocolors for human format | chalk | chalk is 14x larger, has similar API; picocolors is already installed and sufficient |
| `process.stdout.isTTY` | tty.isatty(1) | Both work; `process.stdout.isTTY` is simpler and idiomatic |
| Single `--human` flag | Both `--human` and `--json` flags | `--json` override useful for CI that defaults to human (terminal but scripted); adds safety valve |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

This phase modifies one existing file and adds one new option to the root program:

```
packages/cli/src/
├── index.ts          # Add --human (and optionally --json) to root program
├── context.ts        # Extend GlobalContext with human: boolean
├── output.ts         # REPLACE stub — full implementation lives here
└── commands/
    └── *.ts          # No structural changes; action handlers call output.*
```

### Pattern 1: Output Module Contract

**What:** A centralized module that owns all output decisions. Commands never call `console.log` or `process.exit` directly.

**When to use:** Every action handler in every command file.

```typescript
// Source: derived from clig.dev guidelines + SDK error hierarchy
// packages/cli/src/output.ts

import pc from 'picocolors';
import {
  isSdkError,
  AuthError,
  RateLimitError,
  NetworkError,
  APIError,
} from '@heylol/sdk';

// Exit codes (INFRA-06)
export const EXIT = {
  SUCCESS: 0,
  GENERAL: 1,
  BAD_ARGS: 2,
  NOT_FOUND: 3,
  AUTH: 4,
  RATE_LIMITED: 5,
} as const;

export type OutputOpts = {
  human?: boolean;  // explicit --human flag
  json?: boolean;   // explicit --json flag (override)
};

// Determine effective output mode:
// 1. explicit --json → JSON
// 2. explicit --human → human
// 3. auto: TTY → human, non-TTY → JSON
function isHumanMode(opts: OutputOpts): boolean {
  if (opts.json) return false;
  if (opts.human) return true;
  return Boolean(process.stdout.isTTY); // undefined when piped → false → JSON
}

// INFRA-02: success output to stdout
export function printSuccess(data: unknown, opts: OutputOpts = {}): void {
  if (isHumanMode(opts)) {
    printHuman(data);
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  }
}

// INFRA-03: failure output to stderr + exit with typed code
export function printFailure(err: unknown, opts: OutputOpts = {}): never {
  const code = resolveExitCode(err);
  const errorPayload = buildErrorPayload(err);

  if (isHumanMode(opts)) {
    // Human: colored error to stderr
    process.stderr.write(pc.red('Error: ') + errorPayload.error.message + '\n');
    if (errorPayload.error.code) {
      process.stderr.write(pc.dim(`  code: ${errorPayload.error.code}`) + '\n');
    }
  } else {
    // Machine: structured JSON to stderr (INFRA-03)
    process.stderr.write(JSON.stringify(errorPayload) + '\n');
  }

  process.exit(code);
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

// INFRA-06: exit code mapping
function resolveExitCode(err: unknown): number {
  if (!isSdkError(err)) return EXIT.GENERAL;
  if (err instanceof AuthError) return EXIT.AUTH;
  if (err instanceof RateLimitError) return EXIT.RATE_LIMITED;
  if (err instanceof APIError && err.statusCode === 404) return EXIT.NOT_FOUND;
  if (err instanceof NetworkError) return EXIT.GENERAL;
  return EXIT.GENERAL;
}

// Human-readable formatting (INFRA-04)
function printHuman(data: unknown): void {
  if (data === null || data === undefined) {
    process.stdout.write(pc.green('OK') + '\n');
    return;
  }
  // Default: pretty-printed JSON with color header
  process.stdout.write(pc.dim('--- response ---') + '\n');
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}
```

### Pattern 2: Extending GlobalContext for Output Options

**What:** Add `human` and `json` boolean fields to GlobalContext and add the flags to the root program.

**When to use:** `index.ts` (root program) and `context.ts` (type definition).

```typescript
// Source: commander@14 docs — optsWithGlobals() pattern
// packages/cli/src/context.ts
export interface GlobalContext {
  baseUrl: string;
  debug: boolean;
  human: boolean;  // ADD: --human flag
  json: boolean;   // ADD: --json flag (optional safety valve)
}

// packages/cli/src/index.ts — add to root program:
program
  .addOption(new Option('--human', 'format output for humans (colors, readable)').default(false))
  .addOption(new Option('--json', 'force JSON output even at a terminal').default(false));
```

### Pattern 3: Action Handler Pattern with Output Module

**What:** Every command action handler follows an identical try/catch + output call pattern. No direct console.log, no direct process.exit.

**When to use:** All command action handlers in commands/*.ts (Phase 12+ will fill these in, but the pattern is established in Phase 11 by wiring up the output module).

```typescript
// Source: derived from commander@14 action handler docs
// packages/cli/src/commands/posts.ts (illustrative — Phase 12 implements content)
cmd.command('list')
  .description('List posts in your feed')
  .option('--cursor <string>', 'pagination cursor')
  .option('--limit <number>', 'number of items per page', parseInt)
  .action(async function(this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
    try {
      const result = await client.posts.list({ cursor: opts.cursor, limit: opts.limit });
      printSuccess(result, opts);
    } catch (err) {
      printFailure(err, opts);  // exits with typed code
    }
  });
```

### Pattern 4: `--cursor` and `--limit` on List Commands (INFRA-09)

**What:** Every `list` subcommand gets two additional options. The SDK's `PaginationParams` interface uses `cursor?: string` and `limit?: number`, which maps directly to CLI flags.

**When to use:** posts list, social followers, social following, notifications list, discovery search.

```typescript
// Source: PaginationParams in packages/sdk/src/types/params.ts
cmd.command('list')
  .option('--cursor <string>', 'cursor for next page (from previous nextCursor)')
  .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
  .action(async function(this: Command) {
    // opts.cursor and opts.limit are auto-typed from these declarations
  });
```

The SDK's `PaginatedList<T>` response shape includes `nextCursor?: string` which will appear naturally in the JSON output — consumers pipe output to `jq '.nextCursor'` to chain requests.

### Pattern 5: TTY Detection Mechanics

**What:** `process.stdout.isTTY` is `true` at an interactive terminal and `undefined` (not `false`) when piped. This means the truthiness check `Boolean(process.stdout.isTTY)` correctly returns `false` in both piped and non-terminal contexts.

```typescript
// Source: Node.js TTY docs - https://nodejs.org/api/tty.html
// Verified by live test: node -e "console.log(process.stdout.isTTY)" | cat
// Returns: undefined (falsy) when piped

// Correct check:
const isTerminal = Boolean(process.stdout.isTTY); // true at terminal, false when piped

// WRONG - do not use strict equality:
const wrong = process.stdout.isTTY === true; // works, but verbose; Boolean() is cleaner
```

**Note on picocolors:** picocolors performs its own TTY detection for color support at import time and stores the result in `isColorSupported`. When the output module forces JSON mode (piped), colors aren't needed at all. When human mode is active, picocolors will already have detected the terminal correctly. There is no need to call `pc.createColors(false)` manually for JSON mode — JSON output never uses picocolors anyway.

### Pattern 6: Tsup `banner.js` vs `shebang:true` — Verified Behavior

**What:** The prior decisions note that `banner.js` must be used instead of `shebang:true`. This is verified: tsup does NOT expose `shebang: true` as a config option in the tsup.config.ts schema. The shebang plugin in tsup auto-detects `#!` at the start of the output file and sets chmod 755. The correct way to inject the shebang is via `banner: { js: '#!/usr/bin/env node' }` (already in place in the current tsup config).

The current `tsup.config.ts` is already correct for Phase 11 — no changes needed.

### Anti-Patterns to Avoid

- **`console.log` in command handlers:** Bypasses the output contract; data goes to stdout but is not properly routed based on format mode. Use `printSuccess()` instead.
- **`console.error` in command handlers:** Same issue — bypasses structured error format. Use `printFailure()` instead.
- **`process.exit()` in command handlers:** Must only be called from `printFailure()` in the output module. Calling it directly in handlers makes the exit code unpredictable and the handler untestable.
- **Checking TTY per-command:** TTY detection belongs exclusively in `output.ts`. If each command checks `process.stdout.isTTY` independently, the logic becomes inconsistent when `--human` or `--json` overrides are in play.
- **Calling `printFailure` without `return`:** `printFailure` returns `never` (it calls `process.exit`), but TypeScript may not infer this if the return type isn't annotated. Without the `never` return type, TypeScript may require additional code after the call.
- **Using picocolors for JSON output:** JSON must be clean bytes. Never apply ANSI codes to JSON output — `JSON.parse` will fail if any escape sequences leak in.
- **Outputting `{error: {code, message}}` to stdout:** INFRA-03 explicitly requires errors go to stderr. The `jq .error.code` check in the success criteria pipes stderr explicitly (`2>&1 1>/dev/null`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color detection | Manual `if (isTTY)` branches in each file | picocolors `isColorSupported` + `createColors()` | Handles NO_COLOR, FORCE_COLOR, CI env, TERM=dumb, --color/--no-color flags all at once |
| Error-to-exit-code mapping | Switch statement scattered in handlers | Single `resolveExitCode()` in output.ts | Must be consistent across all 20+ commands; one place to maintain |
| JSON serialization with indent | Template strings or custom serializer | `JSON.stringify(data, null, 2)` | Handles circular reference edge cases, undefined stripping, BigInt errors consistently |
| Exit code constants | Magic numbers `process.exit(4)` | Named `EXIT` object in output.ts | Self-documenting; prevents the wrong code from silently shipping |

**Key insight:** The entire output contract (INFRA-02 through INFRA-06) can be satisfied by one ~100 line `output.ts` file. Everything else is wiring global options and calling it. Resist the urge to add any output logic anywhere else.

---

## Common Pitfalls

### Pitfall 1: `process.stdout.isTTY` is `undefined`, not `false`, when piped

**What goes wrong:** Code like `if (process.stdout.isTTY === false)` to check for piped mode never triggers — the value is `undefined`, not `false`.
**Why it happens:** Node.js only sets `isTTY` to `true` when it IS a TTY. When it isn't, the property is absent (undefined).
**How to avoid:** Use `Boolean(process.stdout.isTTY)` or simply `if (!process.stdout.isTTY)` — both handle undefined correctly.
**Warning signs:** JSON output never appears even when piped; human format shows up in pipes.

### Pitfall 2: `--human` flag not propagated via `optsWithGlobals()`

**What goes wrong:** The `--human` flag is added to the root program, but command handlers access it via `this.opts()` (local options only) instead of `this.optsWithGlobals()`, so `human` is always undefined.
**Why it happens:** Commander's `opts()` returns only the current command's options. Global root options require `optsWithGlobals()`.
**How to avoid:** Every action handler must use `optsWithGlobals<GlobalContext>()`. This is already established pattern from Phase 10 — Phase 11 simply extends `GlobalContext` with `human: boolean`.
**Warning signs:** `opts.human` is `undefined` even when `--human` is passed; `--human` has no effect.

### Pitfall 3: picocolors colors appear in CI/piped output

**What goes wrong:** ANSI codes appear in JSON output when running in a CI environment because picocolors enables colors when `CI=true` in env, even if stdout is piped.
**Why it happens:** picocolors checks `!!env.CI` as a signal to enable colors (since CI terminals often don't set isTTY but DO support colors). However, this conflicts with piped output in CI.
**How to avoid:** The output module should NOT use picocolors for JSON output at all. Only use picocolors in the `printHuman()` path. When routing to JSON, use plain `JSON.stringify` with no color calls. This completely avoids the issue.
**Warning signs:** `jq` fails to parse output in CI; ANSI codes appear in `{ "content": "\u001b[32m..." }`.

### Pitfall 4: Error exit code doesn't trigger on async action handler exceptions

**What goes wrong:** Unhandled promise rejections in async action handlers don't call `process.exit()` — they print a deprecation warning in Node 20 and the process exits with code 0 or 1 unpredictably.
**Why it happens:** Commander's `parseAsync()` resolves the promise after all actions complete. Unhandled rejections inside action handlers are separate from the parse promise.
**How to avoid:** Every async action handler MUST have a try/catch that calls `printFailure(err, opts)`. No async action handler should be left without a catch block. Additionally, add a top-level `process.on('unhandledRejection')` handler as a safety net.
**Warning signs:** `echo $?` returns 0 after a failed command; error output appears as a deprecation warning rather than structured JSON.

### Pitfall 5: `printFailure` return type not `never`

**What goes wrong:** TypeScript doesn't know that `printFailure` always exits, so code after a `printFailure()` call generates unreachable code warnings, or worse — TypeScript requires returning a value even after calling `printFailure()`.
**Why it happens:** TypeScript only infers `never` for functions explicitly typed as returning `never`.
**How to avoid:** Annotate `printFailure` with `: never` return type. This tells TypeScript the function always throws or exits.
**Warning signs:** TypeScript errors about missing return statements in branches that end with `printFailure()`.

### Pitfall 6: `--limit` option value is string, not number

**What goes wrong:** Commander options are strings by default. `--limit 20` gives `opts.limit === '20'` (string), which causes the SDK to receive a string instead of a number.
**Why it happens:** CLI args are always strings; type coercion must be explicit.
**How to avoid:** Use `parseInt` as the argParser for `--limit`: `.option('--limit <number>', 'items per page', parseInt)`. This coerces to a number during parsing. Verify: `typeof opts.limit === 'number'`.
**Warning signs:** Pagination silently breaks; SDK receives `"20"` instead of `20`.

---

## Code Examples

Verified patterns from official sources and the codebase:

### Complete output.ts Module

```typescript
// Source: Node.js TTY docs, commander@14 docs, SDK error hierarchy, clig.dev guidelines
// packages/cli/src/output.ts

import pc from 'picocolors';
import {
  isSdkError,
  AuthError,
  RateLimitError,
  APIError,
} from '@heylol/sdk';

export const EXIT = {
  SUCCESS: 0,
  GENERAL: 1,
  BAD_ARGS: 2,
  NOT_FOUND: 3,
  AUTH: 4,
  RATE_LIMITED: 5,
} as const;

export type OutputOpts = {
  human?: boolean;
  json?: boolean;
};

function isHumanMode(opts: OutputOpts): boolean {
  if (opts.json) return false;
  if (opts.human) return true;
  return Boolean(process.stdout.isTTY);
}

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
    if (payload.error.code) {
      process.stderr.write(pc.dim(`  code: ${payload.error.code}`) + '\n');
    }
  } else {
    process.stderr.write(JSON.stringify(payload) + '\n');
  }

  process.exit(code);
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

function printHuman(data: unknown): void {
  if (data === null || data === undefined) {
    process.stdout.write(pc.green('OK') + '\n');
    return;
  }
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}
```

### GlobalContext Extension

```typescript
// Source: commander@14 optsWithGlobals() docs
// packages/cli/src/context.ts
export interface GlobalContext {
  baseUrl: string;
  debug: boolean;
  human: boolean;  // --human flag
  json: boolean;   // --json flag
}

export type GlobalOpts = GlobalContext;
```

### Root Program Global Options (index.ts addition)

```typescript
// Source: commander@14 Option API
// Add to program in packages/cli/src/index.ts:
program
  .addOption(new Option('--human', 'format output for humans').default(false))
  .addOption(new Option('--json', 'force JSON output').default(false));
```

### List Command with Cursor/Limit (INFRA-09)

```typescript
// Source: commander@14 option parsing; SDK PaginationParams interface
cmd.command('list')
  .description('List notifications')
  .option('--cursor <string>', 'cursor for next page')
  .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
  .action(async function(this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & {
      cursor?: string;
      limit?: number;
    }>();
    try {
      const result = await client.notifications.list({
        cursor: opts.cursor,
        limit: opts.limit,
      });
      printSuccess(result, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### Piped vs Terminal TTY Behavior (Verified)

```bash
# Source: live Node.js test
node -e "console.log(process.stdout.isTTY)"
# At terminal: true
# Piped (| cat): undefined

node -e "console.log(Boolean(process.stdout.isTTY))"
# At terminal: true
# Piped (| cat): false
```

### parseAsync with Top-Level Error Handler

```typescript
// Source: commander@14 parseAsync docs
// packages/cli/src/index.ts
program.parseAsync().catch((err) => {
  // Safety net for unhandled rejections that escape action handlers
  process.stderr.write(JSON.stringify({ error: { code: 'UNKNOWN_ERROR', message: String(err) } }) + '\n');
  process.exit(EXIT.GENERAL);
});
```

Note: The current `index.ts` uses `program.parse()` (synchronous). Since Phase 11 adds async action handlers (via try/catch with awaited SDK calls), this must change to `await program.parseAsync()` wrapped in an async IIFE or `main()` function.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `console.log` everywhere | Dedicated output module with `printSuccess`/`printFailure` | Modern CLI design (2020+) | Single-source-of-truth for format and exit code logic |
| `process.exit(1)` for all errors | Typed exit codes (0-5) mapped to error categories | GitHub CLI gh popularized typed codes | Scripts can distinguish auth failures from not-found from rate limiting |
| `--json` as opt-in flag | Auto-detect TTY, JSON by default when piped | clig.dev guidelines (2021+) | AI agents piping output automatically get JSON without flags |
| Chalk for colors | picocolors | 2021+ | 14x smaller, zero-dependency, equivalent API |
| Offset pagination (`--page`) | Cursor pagination (`--cursor`) | When APIs moved to cursor-based | Stable across mutations; compatible with server-side `PaginatedList<T>` shape |

**Deprecated/outdated:**
- `program.parse()`: Must become `program.parseAsync()` when action handlers are async. Synchronous parse doesn't await action handler promises — unhandled rejections will escape.
- `shebang: true` tsup option: Does not exist. Use `banner: { js: '#!/usr/bin/env node' }` (already in place).

---

## Open Questions

1. **Should `--json` be a global flag at all?**
   - What we know: `--human` is explicitly required (INFRA-04). `--json` is not mentioned in requirements but adds symmetry and a safety valve for scripted use from a terminal.
   - What's unclear: Whether adding `--json` violates the "thin wrapper" principle or adds unnecessary surface area.
   - Recommendation: Add `--json` as a global option with no description in help (`.hideHelp()`), or omit it. The auto-TTY detection (INFRA-05) already covers the machine-readable case. Only add `--json` if explicit override seems necessary. Default: omit for simplicity.

2. **Should `printSuccess` for void/204 responses output `{}` or `{"ok": true}`?**
   - What we know: Some SDK methods return `void` (delete, like, unlike, markRead). The success criteria require `heylol <any-command> | jq .` to parse cleanly. `{}` parses cleanly. `{"ok": true}` is more informative.
   - What's unclear: No explicit requirement on the shape for void operations.
   - Recommendation: Output `{"ok": true}` for void operations. It parses with jq, indicates success, and is a common CLI convention. Pass `{ ok: true }` as the data argument to `printSuccess` from void-returning command handlers.

3. **Human format: pretty-print JSON or custom rendering per resource type?**
   - What we know: INFRA-04 says "formats output with colors and readable structure." This is intentionally vague.
   - What's unclear: Does the planner expect custom per-resource human rendering (e.g., post content in bold, timestamps formatted) or just colored JSON?
   - Recommendation: For Phase 11, implement basic human format as pretty-printed JSON (same content, colorized dimly). Per-resource formatting would require knowledge of all resource types and can be a later enhancement. The success criteria only check that `--human` "formats output with colors and readable structure instead of raw JSON" — pretty-printed JSON with a color header satisfies this.

---

## Sources

### Primary (HIGH confidence)
- Commander.js README (installed at `packages/cli/node_modules/commander/Readme.md`) — `exitOverride`, `configureOutput`, `error()` method with exitCode, `optsWithGlobals()`, `parseAsync()`, `addOption(new Option(...).default())` — all verified against v14.0.3
- picocolors source (installed at `packages/cli/node_modules/picocolors/picocolors.js`) — TTY detection logic verified: checks `isTTY`, `NO_COLOR`, `FORCE_COLOR`, `CI`, `--color`/`--no-color` args; `createColors(enabled)` export confirmed
- picocolors TypeScript declarations (`picocolors.d.ts`, `types.d.ts`) — full color API surface confirmed
- Node.js TTY docs (https://nodejs.org/api/tty.html) — `process.stdout.isTTY` is `true` at terminal, absent (undefined) when piped; confirmed by live test
- SDK error hierarchy (`packages/sdk/src/errors/index.ts`) — `AuthError`, `RateLimitError`, `APIError`, `NetworkError`, `isSdkError()` — exact class names and code fields verified
- SDK types (`packages/sdk/src/types/params.ts`) — `PaginationParams` uses `cursor?: string` and `limit?: number`; SDK response `PaginatedList<T>` includes `nextCursor?: string`
- tsup dist (`packages/cli/node_modules/tsup/dist/index.js`) — shebang plugin confirmed: auto-detects `#!` prefix and sets mode 493 (chmod 755); `shebang: true` config option does NOT exist; `banner.js` is the correct injection mechanism

### Secondary (MEDIUM confidence)
- clig.dev (https://clig.dev/) — stdout/stderr separation guidelines, TTY detection, JSON output conventions
- Commander.js GitHub issues — `exitOverride` behavior, `parseAsync` vs `parse` for async handlers
- WebSearch: picocolors CI color issue (#41) — confirmed that picocolors enables colors when `CI=true` even if piped; JSON path must not use picocolors

### Tertiary (LOW confidence)
- WebSearch: typed exit code conventions (0=success, 1=general, 2=bad-args) — widely cited pattern but no single authoritative source; the INFRA-06 spec is the authoritative definition for this project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from installed sources; no new packages needed
- Architecture: HIGH — output module pattern derived from codebase examination; TTY detection verified by live test
- Pitfalls: HIGH for TTY undefined vs false (live-tested); HIGH for picocolors CI issue (GitHub issue confirmed); MEDIUM for parseAsync async safety net (multiple sources, not tested in this codebase)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (commander and picocolors are stable; no ecosystem churn expected)
