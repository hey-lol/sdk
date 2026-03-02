# Stack Research

**Domain:** CLI Tool — TypeScript binary wrapping @heylol/sdk in a pnpm monorepo
**Researched:** 2026-03-02
**Confidence:** HIGH (all versions verified via npm registry live queries; tsup/tsdown stability confirmed)

---

## Recommended Stack

### Core Technologies (New Additions Only)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `commander` | `^14.0.3` | Argument parsing, subcommand routing, help text | Dual CJS+ESM (`exports` map with both `require` and `import` conditions), zero runtime deps, Node >=20 (matches existing engine target). The most-downloaded Node.js CLI framework by a wide margin. v14 is stable and supports TypeScript directly. v15 will be ESM-only (May 2026) — staying on v14 now avoids a forced migration during this milestone. Ships its own `.d.ts` types. |
| `picocolors` | `^1.1.1` | ANSI terminal color output for `--human` mode | Zero dependencies, < 1 KB, supports both CJS require and ESM import (no `"type"` field, so tsup bundles it correctly regardless of output format). Actively maintained (e18e recommended). Use for simple color/bold in human-readable output. Sufficient for a CLI that only needs basic formatting. |
| `conf` | `^15.1.0` | Persist `~/.heylol/config.json` credential storage | ESM-only (acceptable: CLI package will be `"type":"module"`), Node >=20. Handles atomic file writes, JSON schema validation, cross-platform config dir resolution, and file permissions. Far safer than hand-rolling `fs.writeFileSync` for credentials. v15 is stable. |

### Supporting Libraries (Situational)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ansis` | `^4.2.0` | Advanced ANSI styling (256-color, chaining, truecolor) | Only if `--human` output needs nested/chained color styles (e.g., `red.bold`). Supports dual CJS+ESM natively. Otherwise stick with picocolors. |
| `@clack/prompts` | `^1.0.1` | Interactive prompts for first-run `heylol auth` setup | Only if interactive auth credential entry is in scope. ESM-compatible. Avoid if CLI is non-interactive by design (AI agents call it via bash). |

### Development Tools (Additions to Existing Setup)

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsup` | Build CLI binary to CJS+ESM+shebang | Already in catalog (`^8.5.1`). Use `banner: { js: '#!/usr/bin/env node' }` option to inject shebang into output. Set `entry: { cli: 'src/cli.ts' }` as a separate entry from `index`. No new install needed. |
| `publint` | Validate `bin` field and `files` in package.json | Already at workspace root. Add `--pack` check for CLI package before publish. |

---

## New Package Structure

The CLI lives as `packages/cli` in the existing monorepo. It is a separate publishable package named `heylol` (the binary name).

```
packages/cli/
├── src/
│   ├── cli.ts          # Entry point with #!/usr/bin/env node shebang
│   ├── commands/       # One file per subcommand
│   └── output.ts       # JSON vs --human formatting logic
├── package.json
└── tsup.config.ts
```

### `packages/cli/package.json` Key Fields

```json
{
  "name": "heylol",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "heylol": "./dist/cli.js"
  },
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/cli.js"
    }
  },
  "dependencies": {
    "@heylol/sdk": "workspace:*",
    "commander": "^14.0.3",
    "picocolors": "^1.1.1",
    "conf": "^15.1.0"
  }
}
```

Key decisions:
- `"type": "module"` — required for conf v15 (ESM-only) and matches existing package convention
- No CJS output needed — CLIs are invoked via binary, not `require()`'d by other packages
- `bin` points to `./dist/cli.js` (not `.mjs`) — correct for `"type":"module"` packages
- No `main`/`module` fields — CLI is not a library

### `packages/cli/tsup.config.ts`

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],            // CLIs don't need CJS output
  dts: false,                 // No type exports — not a library
  splitting: false,
  sourcemap: false,           // Smaller binary for distribution
  clean: true,
  banner: {
    js: '#!/usr/bin/env node', // Shebang injected by tsup banner option
  },
  outExtension() {
    return { js: '.js' };     // .js works because package is "type":"module"
  },
});
```

**Why not tsdown?** tsdown's latest tag is `0.21.0-beta.2` with no stable `latest` dist-tag. The existing project uses tsup (already in catalog). Migrating to a beta bundler mid-milestone adds risk without benefit. Reassess tsdown stability at next major version.

---

## Config File Strategy

Use `conf` v15 for credential storage:

```typescript
import Conf from 'conf';

const store = new Conf<{ privateKey: string }>({
  projectName: 'heylol',    // Stores at ~/.config/heylol/config.json (Linux/Mac)
  schema: {
    privateKey: { type: 'string' },
  },
});
```

**Auth precedence (implement in this order):**
1. `HEYLOL_PRIVATE_KEY` env var — checked first, allows CI/agent use without disk state
2. `~/.config/heylol/config.json` via `conf` — set by `heylol auth login`
3. Error with clear message if neither present

`conf` handles the `~/.heylol/config.json` path mentioned in the project brief via `cwd` option override:

```typescript
const store = new Conf({ cwd: path.join(os.homedir(), '.heylol') });
```

---

## Output Formatting Strategy

Default: JSON to stdout. This is what AI agents consume.

```typescript
// output.ts
const isHuman = process.argv.includes('--human');

export function output(data: unknown): void {
  if (isHuman) {
    // use picocolors for color, console.table / util.inspect for structure
    console.log(pc.green('Success'));
    console.dir(data, { depth: 4, colors: true });
  } else {
    // JSON by default — machine-readable
    process.stdout.write(JSON.stringify(data) + '\n');
  }
}

export function error(message: string, detail?: unknown): never {
  const payload = { error: message, detail };
  if (isHuman) {
    console.error(pc.red('Error: ') + message);
  } else {
    process.stderr.write(JSON.stringify(payload) + '\n');
  }
  process.exit(1);
}
```

Rules:
- Success data → `process.stdout` (JSON or human)
- Errors → `process.stderr` as JSON `{ error, detail }` — never mixed with stdout
- Exit code 0 = success, non-zero = failure (standard for shell scripting)

---

## Installation

```bash
# Add new CLI package to workspace (run from repo root)
mkdir -p packages/cli/src

# Install CLI runtime deps into the new package
pnpm add commander picocolors conf --filter heylol

# No additional dev deps needed — tsup already in catalog,
# vitest already in catalog, biome already at root
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `commander@14` | `yargs` | Yargs has more config power (coerce, middleware, strict mode) but is heavier (6 deps vs commander's 0). For a thin wrapper CLI with ≤10 subcommands, commander's simplicity wins. |
| `commander@14` | `clipanion` | Clipanion (powers Yarn Berry) is class-based and well-typed, but rc4 status and class-only API add more structure than needed here. Revisit if CLI grows to 20+ commands with complex option inheritance. |
| `commander@14` | `citty` | citty (UnJS) is minimal and ESM-first, but less documentation/ecosystem than commander. Reasonable alternative if the team prefers UnJS stack. |
| `picocolors` | `chalk v5` | Chalk v5 is ESM-only (compatible here since CLI is ESM) but 12.9 KB vs picocolors 1 KB. No additional features needed. Chalk 4 (CJS) should NOT be used. |
| `picocolors` | `kleur` | kleur was last updated 3+ years ago. Picocolors and ansis are the actively maintained alternatives. |
| `conf v15` | Hand-rolled fs.writeFileSync | Manual JSON I/O skips atomic writes — if the process is killed mid-write, config is corrupt. conf uses `atomically` package for safe writes. For credentials this matters. |
| `conf v15` | `cosmiconfig` | cosmiconfig is for project-level config (reads `.rc` files in cwd). conf is for user-level persisted data (reads from home dir). Wrong tool for credential storage. |
| `tsup` (existing) | `tsdown` | tsdown is faster and ESM-first, but latest npm tag is `0.21.0-beta.2` with no stable release. Keep tsup until tsdown ships a stable `1.x`. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `oclif` | Full plugin framework (SF CLI, Heroku CLI level). Brings TypeScript decorators, plugin architecture, test helpers. Massive overkill for a thin SDK wrapper CLI. | `commander` |
| `ink` | React for CLIs. Correct for rich interactive UIs (e.g., create-react-app). AI agents call this CLI via bash and parse JSON stdout — no UI layer needed. | Direct stdout/stderr with picocolors |
| `chalk@4` (CJS) | CJS-only chalk in an ESM package causes `ERR_REQUIRE_ESM` if any import path lands in a CJS context. | `picocolors` (works in both) or `chalk@5` (ESM-only, fine here) |
| `inquirer` | Interactive prompts library. Correct if the CLI is user-interactive. This CLI is designed for AI agent use — non-interactive by default. | `@clack/prompts` only if interactive auth is added; otherwise nothing |
| `dotenv` | Not applicable. Config comes from env var or conf file, not .env. Importing dotenv in a CLI silently does nothing if .env doesn't exist. | Native `process.env` reads |
| `chalk@5` + `"type":"commonjs"` | If you ever add a CJS output path, chalk@5 breaks. | Always keep CLI as ESM-only (`"type":"module"`) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `commander@14.0.3` | Node.js >=20 | Matches existing project engine target. v15 will drop CJS support. |
| `conf@15.1.0` | Node.js >=20 | ESM-only. Requires `"type":"module"` in CLI package.json — already planned. |
| `picocolors@1.1.1` | Any Node.js | No engine constraint. Works in ESM and CJS consumers via tsup bundling. |
| `tsup@8.5.1` | TypeScript >=4.5, Node >=18 | In catalog. CLI `banner` option confirmed working for shebang injection. |
| `@heylol/sdk@workspace:*` | Current monorepo | Workspace protocol — linked locally during development, resolved to published version for dist. |

---

## Sources

- npm registry live queries (`fetch('https://registry.npmjs.org/...')`) — versions verified 2026-03-02: commander@14.0.3, conf@15.1.0, picocolors@1.1.1, ansis@4.2.0, tsup@8.5.1, tsdown@0.21.0-beta.2
- [commander npm page](https://www.npmjs.com/package/commander) — dual CJS+ESM exports confirmed, zero deps, Node >=20
- [tsdown dist-tags query](https://registry.npmjs.org/tsdown) — `beta` and `latest` both point to pre-release versions, no stable `1.x` confirmed
- [tsup shebang handling](https://tsup.egoist.dev/) — `banner` option for hashbang injection, auto-chmod confirmed in docs
- [ansis vs picocolors comparison](https://dev.to/webdiscus/comparison-of-nodejs-libraries-to-colorize-text-in-terminal-4j3a) — MEDIUM confidence, single source but corroborated by e18e community endorsement
- [conf GitHub](https://github.com/sindresorhus/conf) — ESM-only, atomic writes via `atomically`, `cwd` override for custom config path confirmed
- [pnpm compiled bin in monorepo](https://webpro.nl/scraps/compiled-bin-in-typescript-monorepo) — pattern for bin field pointing to pre-built dist file confirmed
- [WebSearch: tsdown production readiness 2025](https://github.com/rolldown/tsdown/releases) — no stable tag, beta releases only

---

*Stack research for: `heylol` CLI — thin binary wrapper over @heylol/sdk*
*Researched: 2026-03-02*
