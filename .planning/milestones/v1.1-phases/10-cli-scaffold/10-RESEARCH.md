# Phase 10: CLI Scaffold - Research

**Researched:** 2026-03-02
**Domain:** Node.js CLI tooling — commander@14, tsup ESM-only, pnpm workspace binary, conf@15, picocolors
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Command hierarchy
- Noun-verb grouping: `heylol posts list`, `heylol profile me`, `heylol auth verify`
- Command group names match SDK resource names exactly: auth, posts, profile, social, discovery, notifications
- No renaming or shortening for CLI ergonomics — consistency with SDK is the priority

#### Help presentation
- Minimal and clean style — no ASCII banner, no logo. Think `gh --help`
- Just command names and descriptions, no visual clutter

#### Global flags & env vars
- Two env vars at scaffold level: `HEYLOL_BASE_URL` (API override) and `HEYLOL_DEBUG=1` (verbose HTTP logging)
- Global flags mirror env vars: `--base-url` and `--debug` available as CLI flags
- Precedence: CLI flag wins over env var when both are set
- Color: auto TTY detection only — colors on in terminal, off when piped. No `--no-color` flag needed. Agents get plain output automatically

### Claude's Discretion
- Whether to register all subcommand groups as stubs now or incrementally per phase
- ID argument style (positional vs named flag) for resource-targeting commands
- Help description depth (one-liners vs examples)
- Version output format
- Unknown command error handling (fuzzy suggest vs help redirect)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | User can install `heylol` globally via `npm install -g heylol` or run via `npx heylol` | Package.json `bin` field with shebang entry point; tsup ESM-only build producing `dist/cli.mjs`; `files` array includes `dist` |
| INFRA-07 | CLI provides `--help` on every command and subcommand with clear descriptions | Commander auto-generates help from `.description()` calls; every `.command()` and `.option()` needs a description string; `showSuggestionAfterError()` handles typos |
| INFRA-08 | CLI supports `HEYLOL_BASE_URL` env var to override API base URL | Commander `new Option(...).env('HEYLOL_BASE_URL')` with `.default('https://api.hey.lol')` on the `--base-url` global option; confirmed precedence: CLI flag beats env var |
</phase_requirements>

---

## Summary

This phase establishes the `heylol` CLI package in the monorepo — a new `packages/cli` directory with its own `package.json`, a tsup ESM-only build, a shebang entry point, and commander-based command structure wired to @heylol/sdk. The CLI is a thin shell: no business logic lives here, every command delegates to the SDK.

The stack is locked and well-understood. Commander@14.0.3 (current stable) is the right choice for this project scale — it gives automatic help generation, env-var-to-option linking via `.env()`, and v14's new help grouping API for clean `gh`-style output. The existing monorepo already uses tsup@8.5.1 (pinned in the workspace catalog), so the CLI just needs an ESM-only variant of the established config pattern with `shebang: true` to make the output executable. All other packages use dual ESM+CJS; the CLI is the first ESM-only package and needs its own tsup config rather than copying the existing pattern.

The most important architectural decision for this scaffold is the **global context object pattern**: the root `program` parses `--base-url` and `--debug` globally, and each command's action handler calls `.optsWithGlobals()` to merge its local options with the root options before constructing the HeyLolClient. This is the only safe pattern in commander for propagating root-level options down into nested subcommands. Getting this wiring wrong is the most common rewrite-causing mistake in commander CLIs.

**Primary recommendation:** Build `packages/cli` with one tsup ESM-only entry (`src/index.ts`), register all six command groups as named stubs now (so help output is complete at scaffold completion), wire global options via `.env()` + `.optsWithGlobals()`, and keep every action handler as a one-liner stub throwing "not implemented".

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.0.3 | Argument parsing, subcommand routing, help generation | Dominant Node.js CLI framework; auto-generates help; v14 adds help grouping and requires Node 20+ (matches monorepo target) |
| tsup | 8.5.1 (catalog) | Bundle TypeScript to ESM for distribution | Already in workspace catalog; `shebang: true` makes output executable automatically |
| conf | 15.x | Persist user config (credentials, defaults) to `~/.config/heylol` | ESM-native; atomic writes; used in Auth phase (Phase 12) — scaffold only needs the dependency declared |
| picocolors | 1.1.x | ANSI color output in TTY | Zero-dependency; auto-detects `process.stdout.isTTY` and `NO_COLOR`; fastest color lib |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @heylol/sdk | workspace:* | All API logic | Every command action handler — CLI never calls fetch directly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | yargs | Yargs has more built-ins (middleware, coerce) but heavier and config-heavy; commander is simpler for noun-verb CLIs |
| tsup | tsdown | tsdown is the successor but is newer/less battle-tested; tsup is locked by user decision and still works correctly at 8.5.1 |
| conf | cosmiconfig | cosmiconfig is for project configs not user credentials; conf writes to OS config dir which is correct for CLI auth |

**Installation:**
```bash
pnpm add commander@14 picocolors@^1.1
pnpm add conf@^15
pnpm add -D tsup typescript
```

(All added inside `packages/cli`, not the root. tsup and typescript are already in the workspace catalog.)

---

## Architecture Patterns

### Recommended Project Structure
```
packages/cli/
├── package.json          # name: heylol, bin: {heylol: ./dist/cli.mjs}
├── tsup.config.ts        # ESM-only, shebang: true, external: [@heylol/sdk, conf]
├── tsconfig.json         # extends ../../tsconfig.json
└── src/
    ├── index.ts          # entry: creates program, registers commands, calls parse()
    ├── context.ts        # GlobalContext type + createContext() — builds HeyLolClient
    ├── commands/
    │   ├── auth.ts       # makeAuthCommand() → Command
    │   ├── posts.ts      # makePostsCommand() → Command
    │   ├── profile.ts    # makeProfileCommand() → Command
    │   ├── social.ts     # makeSocialCommand() → Command
    │   ├── discovery.ts  # makeDiscoveryCommand() → Command
    │   └── notifications.ts  # makeNotificationsCommand() → Command
    └── output.ts         # printJson(), printError() — Phase 11 fills this out
```

### Pattern 1: ESM-Only tsup Config with Shebang

**What:** CLI packages in this monorepo are ESM-only (no CJS dual output needed). Tsup's `shebang: true` auto-inserts `#!/usr/bin/env node` and sets the output file executable.

**When to use:** Any package that produces a runnable binary, not a library.

```typescript
// Source: tsup docs + existing monorepo tsup.config.ts patterns
// packages/cli/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/index.ts' },
  format: ['esm'],           // ESM-only — no CJS for CLI
  dts: false,                // No type declarations needed for a binary
  splitting: false,
  sourcemap: true,
  clean: true,
  shebang: true,             // Inserts #!/usr/bin/env node and chmod +x
  platform: 'node',
  external: ['conf'],        // conf has native deps; keep external
  // @heylol/sdk is a workspace dep — bundle it in OR keep external
  // Keep external so the workspace link works: consumers get the real build
  noExternal: [],
});
```

**Note on `external` vs bundling:** `@heylol/sdk` should be listed in `dependencies` (not `devDependencies`) so it ships with the published package. When kept external, pnpm resolves it through the workspace link during development and through npm during installation. This is the same pattern used by `adapter-express` with `@heylol/sdk`.

### Pattern 2: Package.json for a Publishable CLI Binary

**What:** The `bin` field registers the binary name. For ESM-only tsup output, the output file is `dist/cli.mjs`. The `files` field limits what ships to npm.

```json
{
  "name": "heylol",
  "version": "1.0.0",
  "description": "hey.lol CLI for AI agents and developers",
  "type": "module",
  "license": "MIT",
  "bin": {
    "heylol": "./dist/cli.mjs"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "dev": "tsup --watch"
  },
  "dependencies": {
    "@heylol/sdk": "workspace:*",
    "commander": "^14.0.0",
    "conf": "^15.0.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "tsup": "catalog:",
    "typescript": "catalog:"
  }
}
```

**Critical:** `"type": "module"` is required so Node treats `.js` files as ESM. The `bin` entry points to `.mjs` — this works regardless of `type` field because `.mjs` extension is always ESM.

### Pattern 3: Commander Root Program with Global Options via `.env()`

**What:** Commander's `.env()` method on an `Option` links it to an environment variable. Commander enforces the precedence automatically: if the CLI flag is provided, it takes priority; if only the env var is set, it uses that; if neither, the default applies.

```typescript
// Source: https://github.com/tj/commander.js/blob/master/examples/options-env.js
// packages/cli/src/index.ts
import { Command, Option } from 'commander';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../package.json') as { version: string };

export const program = new Command();

program
  .name('heylol')
  .description('hey.lol CLI')
  .version(version, '-V, --version')
  .showSuggestionAfterError(true)
  .addOption(
    new Option('--base-url <url>', 'override API base URL')
      .env('HEYLOL_BASE_URL')
      .default('https://api.hey.lol')
  )
  .addOption(
    new Option('--debug', 'enable verbose HTTP logging')
      .env('HEYLOL_DEBUG')
  );

// Register command groups
program.addCommand(makeAuthCommand());
program.addCommand(makePostsCommand());
program.addCommand(makeProfileCommand());
program.addCommand(makeSocialCommand());
program.addCommand(makeDiscoveryCommand());
program.addCommand(makeNotificationsCommand());

program.parse();
```

**Note on version import:** ESM does not support `import pkg from '../package.json'` without `--experimental-json-modules` in older Node. The safe pattern for Node 20 is `createRequire` or reading with `readFileSync` + `JSON.parse`. Alternatively, hardcode the version string and keep it in sync via changeset tooling.

### Pattern 4: Global Context via `optsWithGlobals()`

**What:** Each subcommand's action handler must access the root-level `--base-url` and `--debug` options. Commander's `.optsWithGlobals()` merges the command's own options with all ancestor options into one flat object.

```typescript
// Source: Commander.js docs - optsWithGlobals()
// packages/cli/src/commands/posts.ts
import { Command } from 'commander';
import { HeyLolClient } from '@heylol/sdk';

export function makePostsCommand(): Command {
  const posts = new Command('posts')
    .description('Manage posts');

  posts
    .command('list')
    .description('List posts in your feed')
    .action(function(this: Command) {
      const opts = this.optsWithGlobals<{ baseUrl: string; debug: boolean }>();
      // Scaffold stub — Phase 13 fills this in
      throw new Error('not implemented');
    });

  return posts;
}
```

**Why `optsWithGlobals` not `program.opts()`:** Importing the `program` singleton into command modules creates a circular dependency. `optsWithGlobals()` on `this` (the command instance) walks up the parent chain — no import needed.

### Pattern 5: Noun-Verb Subcommand Structure (All Groups Registered as Stubs)

**What:** Register all six command groups at scaffold time so `heylol --help` shows the complete command surface. Each subcommand within a group is a stub that throws "not implemented".

**Recommendation (Claude's Discretion — register all stubs now):** This ensures `heylol --help` and `heylol posts --help` both produce complete, correct output at the end of Phase 10. Incrementally registering commands per phase would leave help output incomplete and break the success criteria.

```typescript
// packages/cli/src/commands/auth.ts
import { Command } from 'commander';

export function makeAuthCommand(): Command {
  const auth = new Command('auth').description('Authentication commands');

  auth.command('setup').description('Save credentials to config file');
  auth.command('verify').description('Verify current credentials');

  return auth;
}
```

**All six groups and their stubs:**
| Group | Stubs |
|-------|-------|
| `auth` | `setup`, `verify` |
| `posts` | `list`, `create`, `get`, `delete`, `like`, `unlike`, `reply` |
| `profile` | `me`, `get`, `update` |
| `social` | `follow`, `unfollow`, `followers`, `following` |
| `discovery` | `search`, `trending`, `suggested` |
| `notifications` | `list`, `mark-read` |

### Anti-Patterns to Avoid

- **Importing `program` singleton into command files:** Creates circular deps and makes testing impossible. Use `optsWithGlobals()` on `this` instead.
- **Constructing HeyLolClient inside `index.ts`:** Makes it impossible to test command handlers in isolation. Use a `createContext()` factory and pass it via closure.
- **Using `program.opts()` in subcommand actions:** Returns only the subcommand's own options, not root-level globals. Always use `optsWithGlobals()`.
- **CJS-style `require()` for main entry:** The CLI entry must use `import` statements. `createRequire` is only acceptable for JSON files.
- **No action handler on group commands:** Commander will error on unknown subcommands if the group command itself has no action. Either register an action that shows help, or let commander handle it (default behavior shows help on `heylol posts` with no subcommand).
- **`"type": "module"` missing from package.json:** Without this, `.js` files are treated as CJS and `import` statements fail at runtime.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Argument parsing | Custom argv parser | commander@14 | Edge cases: quoted strings, `--`, option-argument ambiguity with negative numbers (v14 fixes this natively) |
| Env var to option wiring | Manual `process.env` reads in action handlers | `new Option(...).env('VAR')` | Commander handles precedence (flag > env > default) and type coercion automatically |
| Help text formatting | Custom help renderer | commander's built-in + `.configureHelp()` | Commander generates usage, args, options, subcommands automatically from declarations |
| Config persistence | `fs.writeFileSync(homedir() + '/.heylol')` | conf@15 | Conf handles OS-appropriate paths, atomic writes, JSON schema validation, file watching |
| TTY color detection | `if (process.stdout.isTTY)` checks sprinkled everywhere | picocolors | Picocolors checks `isTTY`, `NO_COLOR`, `FORCE_COLOR`, `CI`, `TERM=dumb`, and `--no-color` flag in one place |
| Fuzzy command suggestions | Levenshtein distance impl | `program.showSuggestionAfterError(true)` | Commander v14 uses Damerau-Levenshtein distance built-in |

**Key insight:** Commander's declarative model means correct help, env-var wiring, and error handling are free — but only if the API is used as designed. The single biggest trap is bypassing commander's option system with manual `process.env` reads.

---

## Common Pitfalls

### Pitfall 1: CJS-style JSON import in ESM entry point
**What goes wrong:** `import pkg from '../package.json' assert { type: 'json' }` fails on some Node 20 versions; `require('../package.json')` fails in ESM without `createRequire`.
**Why it happens:** ESM and JSON imports have had unstable Node support through several versions.
**How to avoid:** Use `createRequire(import.meta.url)` to get a `require()` function for JSON, or hardcode the version string.
**Warning signs:** `ERR_IMPORT_ASSERTION_TYPE_JSON` or `ERR_REQUIRE_ESM` at startup.

```typescript
// Safe pattern for reading package.json version in ESM:
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
```

### Pitfall 2: `addCommand()` does not inherit parent settings
**What goes wrong:** Commands created with `new Command()` and added with `addCommand()` do not automatically copy the parent's settings (e.g., `showSuggestionAfterError`, `configureHelp`). Commands created with `.command('name')` do copy inherited settings.
**Why it happens:** Commander documents this as intentional — `addCommand()` is for pre-configured standalone commands.
**How to avoid:** Call `.copyInheritedSettings(program)` on each command object before passing to `addCommand()`, OR use `.command('name')` for inline creation and `.addCommand(makeXCommand())` only for factory functions, calling `copyInheritedSettings` explicitly.
**Warning signs:** Subcommands don't show suggestions after error even though root has `showSuggestionAfterError(true)`.

### Pitfall 3: `dist/cli.mjs` not executable after build
**What goes wrong:** `npx heylol` works but `heylol` after global install fails with `permission denied` or the file is treated as text.
**Why it happens:** npm sets permissions on `bin` entries during install, but the file still needs the `#!/usr/bin/env node` shebang line to be treated as executable by the OS.
**How to avoid:** Use `shebang: true` in tsup config — this inserts the shebang AND marks the output file as executable (chmod +x). Without this option, tsup does NOT add the shebang.
**Warning signs:** `env: node\r: No such file or directory` (Windows line endings) or `SyntaxError: Unexpected token '<'` if file isn't being treated as JS.

### Pitfall 4: `optsWithGlobals()` returns camelCase keys
**What goes wrong:** `--base-url` option is accessed as `opts.baseUrl` not `opts['base-url']`.
**Why it happens:** Commander converts kebab-case flags to camelCase in the opts object by default.
**How to avoid:** Always use camelCase when reading from `opts`. Declare a type: `{ baseUrl: string; debug: boolean }`.
**Warning signs:** `opts.baseUrl` is undefined; `opts['base-url']` would be the value.

### Pitfall 5: `@heylol/sdk` not built when running CLI in dev
**What goes wrong:** `import { HeyLolClient } from '@heylol/sdk'` throws `ERR_MODULE_NOT_FOUND` or imports stale code.
**Why it happens:** The workspace link resolves to the package directory, which requires `dist/` to exist. If the SDK hasn't been built, or was modified without rebuilding, the CLI gets stale exports.
**How to avoid:** The turbo.json build task already has `"dependsOn": ["^build"]` — this ensures `@heylol/sdk` builds before the CLI. For development, run `turbo dev` from the root not `tsup --watch` in the CLI package directly.
**Warning signs:** Module resolution errors on SDK imports; TypeScript picks up types but runtime fails.

### Pitfall 6: Registering bin entry in pnpm workspace without building first
**What goes wrong:** `pnpm install` creates the symlink to `dist/cli.mjs` before the file exists, so `heylol` command fails with `ENOENT`.
**Why it happens:** pnpm links bin entries at install time regardless of whether the file exists.
**How to avoid:** Always run `pnpm build` (or `turbo build`) after adding the CLI package to the workspace and before testing the binary. A `prepare` script (`"prepare": "tsup"`) in package.json ensures the build runs on install.
**Warning signs:** `heylol: command not found` or `ENOENT dist/cli.mjs` when the package is installed.

---

## Code Examples

Verified patterns from official sources:

### Commander Global Options with Env Var Wiring
```typescript
// Source: https://github.com/tj/commander.js/blob/master/examples/options-env.js
import { Command, Option } from 'commander';

const program = new Command();

program
  .name('heylol')
  .description('hey.lol CLI')
  .version('1.0.0', '-V, --version', 'print version number')
  .showSuggestionAfterError(true)
  .addOption(
    new Option('--base-url <url>', 'override API base URL')
      .env('HEYLOL_BASE_URL')
      .default('https://api.hey.lol')
  )
  .addOption(
    new Option('--debug', 'enable verbose HTTP logging')
      .env('HEYLOL_DEBUG')
  );
```

### Commander Help Grouping (v14 API)
```typescript
// Source: https://github.com/tj/commander.js/blob/master/examples/help-groups.js
// Applied to heylol's command registration pattern:

program.commandsGroup('Commands:');
program.addCommand(makeAuthCommand());
program.addCommand(makePostsCommand());

program.commandsGroup('Resource Commands:');
program.addCommand(makeProfileCommand());
program.addCommand(makeSocialCommand());
// ...
```

### Nested Command Group (Factory Pattern)
```typescript
// Source: https://github.com/tj/commander.js/blob/master/examples/nestedCommands.js
// packages/cli/src/commands/posts.ts
import { Command } from 'commander';

export function makePostsCommand(): Command {
  const posts = new Command('posts')
    .description('Manage posts');

  posts
    .command('list')
    .description('List posts in your feed')
    .action(function(this: Command) {
      const { baseUrl, debug } = this.optsWithGlobals<{
        baseUrl: string;
        debug: boolean;
      }>();
      // stub
    });

  posts
    .command('create')
    .description('Create a new post')
    .requiredOption('--content <text>', 'post content')
    .action(function(this: Command) {
      const opts = this.optsWithGlobals<{
        baseUrl: string;
        debug: boolean;
        content: string;
      }>();
      // stub
    });

  return posts;
}
```

### Picocolors TTY-Aware Usage
```typescript
// Source: https://github.com/alexeyraspopov/picocolors/blob/main/picocolors.js
// picocolors auto-detects TTY — no manual isTTY check needed
import pc from 'picocolors';

// In a TTY: colored output. When piped: plain text. Automatic.
console.error(pc.red('Error: ') + message);
console.log(pc.green('OK'));
```

### tsup ESM-Only CLI Config
```typescript
// Source: tsup documentation + existing monorepo patterns (packages/sdk/tsup.config.ts adapted)
// packages/cli/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/index.ts' },
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  shebang: true,       // inserts #!/usr/bin/env node, chmod +x
  platform: 'node',
  external: ['conf'],  // conf has native/platform-specific code; keep external
  // @heylol/sdk: listed in dependencies, external by default (not bundled)
});
```

### pnpm Workspace Package.json for CLI
```json
{
  "name": "heylol",
  "version": "1.0.0",
  "description": "hey.lol CLI for AI agents and developers",
  "type": "module",
  "license": "MIT",
  "bin": { "heylol": "./dist/cli.mjs" },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "prepare": "tsup"
  },
  "dependencies": {
    "@heylol/sdk": "workspace:*",
    "commander": "^14.0.0",
    "conf": "^15.0.0",
    "picocolors": "^1.1.0"
  },
  "devDependencies": {
    "tsup": "catalog:",
    "typescript": "catalog:"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `yargs` for complex CLIs | `commander` for most CLIs | 2022-2024 | Commander's simpler API won adoption for medium-complexity CLIs |
| Manual `.env()` reads in action handlers | `new Option().env('VAR')` | commander v9+ | Declarative env wiring with automatic precedence |
| Custom help formatters | `.configureHelp()` + help grouping | commander v14 (May 2025) | First-class grouped help without subclassing |
| ESM + CJS dual build for CLI | ESM-only for Node 20+ CLIs | 2024+ | Node 20 LTS (commander v14 minimum) makes CJS unnecessary for CLIs |
| `chalk` for colors | `picocolors` | 2021+ | picocolors is 10x smaller, auto-TTY-aware, zero-dependency |
| `tsup` | `tsdown` (future) | Author deprecation notice Aug 2025 | tsup still works; tsdown is the migration target but not needed here since stack is locked |

**Deprecated/outdated:**
- `wrap()` method on Help class: Removed in commander v14. Replaced by `formatItem()` and `boxWrap()`. (Relevant only if customizing help rendering.)
- `commander.program` global singleton: Still works but local `new Command()` instance is the recommended pattern for testability.

---

## Discretion Recommendations

These are areas left to Claude's Discretion in CONTEXT.md. Recommendations based on research:

### Register all stubs now vs incrementally
**Recommendation: Register all stubs now.** Success criteria require `heylol --help` shows a complete top-level command list (INFRA-07). Registering all six groups with empty subcommands now means the help output is complete at the end of Phase 10, which is verifiable. Incremental registration means each phase produces broken help output until that phase completes.

### ID argument style (positional vs flag)
**Recommendation: Positional for single-resource commands.** `heylol posts get <id>` reads more naturally than `heylol posts get --id <id>` and matches `gh` conventions. Commander supports positional arguments via `.argument('<id>', 'post ID')`. For commands that take an ID plus options (e.g., `heylol posts reply <id> --content "text"`), positional ID is cleaner.

### Help description depth
**Recommendation: One-liners only.** Matches the `gh --help` style locked by the user. No usage examples in help — examples belong in documentation. Keep each description under 60 characters.

### Version output format
**Recommendation: Plain semver only.** `heylol -V` outputs `1.0.0`. No `v` prefix, no extra text. Commander's default `--version` format with a custom flags string `-V, --version` (hides the default `-V`) — or use `.version(version, '-V, --version', 'print version number')` for clean output.

### Unknown command error handling
**Recommendation: Use `showSuggestionAfterError(true)`.** Commander's built-in fuzzy suggestion uses Damerau-Levenshtein distance. This is free (one-liner) and sufficient. No custom help redirect needed. If user types `heylol pots list`, commander outputs `error: unknown command 'pots'. (Did you mean posts?)` automatically.

---

## Open Questions

1. **`conf` usage in scaffold phase vs auth phase**
   - What we know: conf@15 is in the locked stack. The scaffold phase wires up the package structure. Auth functionality (Phase 12) actually reads/writes config.
   - What's unclear: Should conf be imported and instantiated in the scaffold, or just listed as a dependency for Phase 12 to use?
   - Recommendation: Declare conf as a dependency in package.json during scaffold. Create a minimal `src/config.ts` that exports a `getConfig()` function stub (returns the Conf instance). Phase 12 fills in the actual read/write logic. This avoids Phase 12 having to add a dependency.

2. **tsup `external` for `@heylol/sdk` — bundle vs external**
   - What we know: In development, pnpm workspace links resolve `@heylol/sdk` to `packages/sdk/dist/`. When published to npm, `@heylol/sdk` would need to be on npm too OR bundled into the CLI.
   - What's unclear: Is `heylol` CLI intended to be published as a standalone binary (bundle everything) or as a package with `@heylol/sdk` as a peer/dependency on npm?
   - Recommendation: Keep `@heylol/sdk` as a `dependency` (external to the bundle). This means when the CLI is published, npm installs `@heylol/sdk` alongside it. This is the simplest model and consistent with how `adapter-express` handles SDK dependency. Revisit if a single-file binary is ever needed.

---

## Sources

### Primary (HIGH confidence)
- Commander.js GitHub README (raw) — subcommand API, `.addCommand()`, `.env()`, `.optsWithGlobals()`, `.showSuggestionAfterError()`
- Commander.js CHANGELOG.md — confirmed v14.0.3 is current, v14 breaking changes (Node 20+, Help class refactor)
- jsDocs.io/package/commander — `.version()` signature, `.configureHelp()` options, `.optsWithGlobals()` type signature
- Commander.js examples/help-groups.js — confirmed `.commandsGroup()`, `.optionsGroup()`, `.helpGroup()` API
- Commander.js examples/options-env.js — confirmed `.env()` wiring pattern with precedence
- Commander.js examples/nestedCommands.js — confirmed `.addCommand()` factory pattern
- picocolors source (GitHub main) — confirmed TTY detection logic checks `isTTY`, `NO_COLOR`, `FORCE_COLOR`, `CI`, `TERM=dumb`
- jsDocs.io/package/tsup — confirmed tsup 8.5.1 is current, `format`, `external`, `noExternal`, `platform` options
- Existing monorepo tsup configs (`packages/sdk/tsup.config.ts`, `packages/adapter-express/tsup.config.ts`) — established patterns for external deps and workspace linking
- `packages/sdk/src/client/options.ts` — `ClientOptions` interface; `baseUrl` is the correct option name; default is `'https://api.hey.lol'`

### Secondary (MEDIUM confidence)
- WebSearch: tsup `shebang: true` option auto-inserts shebang and chmod +x — verified by multiple blog sources, consistent with tsup docs behavior description
- WebSearch: tsup README maintenance notice (author deprecated in favor of tsdown) — confirmed by GitHub search results, multiple migration articles from Aug 2025 onward
- webpro.nl/scraps/compiled-bin-in-typescript-monorepo — pnpm workspace CLI bin setup pattern (wrapper file approach)

### Tertiary (LOW confidence)
- `createRequire` for JSON import in ESM — widely cited pattern but exact behavior in Node 20 with tsup-bundled output is unverified. Should be tested at build time.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — commander v14.0.3 confirmed, tsup 8.5.1 in workspace catalog, picocolors TTY behavior verified from source
- Architecture: HIGH — commander API verified against official examples; patterns derived from existing monorepo conventions
- Pitfalls: HIGH for commander pitfalls (official docs); MEDIUM for build/shebang pitfalls (verified by multiple sources but not tested in this specific monorepo)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (commander and tsup are stable; tsdown migration is the only ecosystem movement to watch)
