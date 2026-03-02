# Pitfalls Research

**Domain:** CLI tool added to existing TypeScript SDK monorepo (pnpm + Turborepo + tsup)
**Researched:** 2026-03-02
**Confidence:** HIGH for npm bin/shebang/tsup mechanics (well-documented, reproducible); HIGH for JSON stdout/stderr patterns (CLI best-practices literature is consistent); MEDIUM for config file atomicity (Node.js docs + community); MEDIUM for Turborepo build-order with new package (known patterns, project-specific tuning needed)

---

## Critical Pitfalls

### Pitfall 1: Shebang Stripped or Duplicated by tsup When Bundling CLI Entry

**What goes wrong:**
tsup automatically detects a `#!/usr/bin/env node` shebang in the entry file and makes the output executable. However, if the CLI is bundled into both ESM and CJS formats (matching the SDK's tsup config of `format: ['esm', 'cjs']`), the shebang appears on both `dist/cli.mjs` and `dist/cli.cjs`. The `bin` field in `package.json` can only point to one file. Pointing `"heylol": "./dist/cli.mjs"` works in Node.js 18+ ESM mode but fails in environments where `.mjs` is not understood. Pointing to `dist/cli.cjs` works universally but requires the shebang to be on that file specifically. If the tsup config uses `outExtension` to produce `.mjs`/`.cjs` (as the SDK does), the shebang placement must be verified manually after every build because tsup applies the shebang to the entry-matched output — it may not carry to all format variants.

**Why it happens:**
The SDK's tsup config produces dual-format output for library consumers. Developers copying that config verbatim for the CLI package get a dual-format binary. The `bin` field then points ambiguously. tsup's auto-shebang behavior is format-aware but the documentation is sparse on what happens with dual format + outExtension.

**How to avoid:**
The CLI entry should use a **single format: `'cjs'`** in its own `tsup.config.ts`. CJS is universally supported in Node.js 18+ without flags, works with `#!/usr/bin/env node`, and eliminates format ambiguity. Do not reuse the SDK's tsup config. Create a separate `packages/cli/tsup.config.ts` with:
```ts
export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['cjs'],
  platform: 'node',
  target: 'node18',
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [],   // bundle workspace dep @heylol/sdk entirely
  clean: true,
});
```
The `banner` option injects the shebang even if the source file doesn't have one, and it's always placed correctly on CJS output. Verify after build: `head -1 dist/cli.cjs` must be `#!/usr/bin/env node`.

**Warning signs:**
- `tsup.config.ts` for CLI has `format: ['esm', 'cjs']` copied from the SDK config
- `bin` field points to a `.mjs` file
- `head -1 dist/cli.cjs` shows something other than `#!/usr/bin/env node`
- `node dist/cli.cjs` works but `heylol` (installed binary) does not

**Phase to address:** Phase 1 — CLI package scaffold. Establish the correct tsup config before writing any command logic.

---

### Pitfall 2: Binary Not Executable After Install (chmod +x Missing from Published File)

**What goes wrong:**
`npm publish` includes the binary file but the file permission bit `0o755` is not set. The binary is installed to `node_modules/.bin/heylol` but fails to execute with `Permission denied`. This is distinct from the shebang issue — the file is present and valid, but the OS refuses to run it because the executable bit is absent.

**Why it happens:**
On Unix systems, tsup sets the executable bit when it detects a shebang in the source entry. However, if the shebang is added via the `banner` option (not in the source file), tsup may not set the bit automatically in all versions. Additionally, if the file is created on a Windows machine (e.g., CI running on Windows runners), the executable bit is not preserved by `git` or `npm pack` because Windows has no equivalent concept. Developers test with `node dist/cli.cjs` directly (which ignores the bit) and don't notice until after install.

**How to avoid:**
Always add the shebang to the **source file** `src/cli.ts` as `#!/usr/bin/env node` on the first line — this is the primary signal tsup uses to set the executable bit. Use the `banner` option as a secondary guarantee. Add a post-build verification step:
```bash
node -e "const {statSync} = require('fs'); const m = statSync('dist/cli.cjs').mode; process.exit((m & 0o111) ? 0 : 1)" \
  || (chmod +x dist/cli.cjs)
```
Run `npm pack --dry-run` and inspect the output — look for the `x` permission bit on the binary file. On Windows CI runners, explicitly run `chmod +x dist/cli.cjs` as a build step.

**Warning signs:**
- CI runs only on Windows (GitHub Actions `windows-latest`) and never on `ubuntu-latest`
- `ls -la dist/cli.cjs` shows `-rw-r--r--` (no `x` bit)
- `npx heylol` works (npx sets the bit) but `heylol` after `npm install -g` does not
- Build step does not include a chmod or verification

**Phase to address:** Phase 1 — Build tooling. Add the permission check to the `build` script before publishing any version.

---

### Pitfall 3: `@heylol/sdk` Workspace Dependency Not Built Before CLI Build

**What goes wrong:**
Turborepo's `"build": { "dependsOn": ["^build"] }` means "build all workspace dependencies before me." When `packages/cli` declares `"@heylol/sdk": "workspace:*"` as a dependency, Turborepo will build `@heylol/sdk` first. However, if the CLI is added to `packages/` but the workspace dependency is declared incorrectly (e.g., using a version range like `"^1.0.0"` instead of `"workspace:*"`), pnpm resolves it from the npm registry rather than the local workspace. The locally modified SDK is never seen by the CLI build — the published (potentially older) version is used instead. The bug is subtle: the build succeeds, but the CLI uses stale types and code.

**Why it happens:**
Developers copy the `dependencies` block from examples or the README which shows `"@heylol/sdk": "^1.0.0"`. In application code outside the monorepo this is correct. Inside the monorepo, the workspace protocol must be used.

**How to avoid:**
In `packages/cli/package.json`, declare the SDK dependency as `"@heylol/sdk": "workspace:*"`. Verify with:
```bash
pnpm list --filter heylol @heylol/sdk
```
The output should show the local workspace path, not a registry version. Add a CI step that runs `pnpm install --frozen-lockfile` and verifies the lockfile does not resolve `@heylol/sdk` to a registry URL.

**Warning signs:**
- `pnpm-lock.yaml` shows `@heylol/sdk` resolving to a registry tarball URL instead of `link:../sdk`
- CLI type errors that don't match the local SDK source
- Changes to `packages/sdk/src/*.ts` not reflected in CLI behavior without a manual reinstall
- `packages/cli/package.json` has `"@heylol/sdk": "^1.0.0"` (semver range, not workspace protocol)

**Phase to address:** Phase 1 — Monorepo package setup. Get the workspace link right before writing any command logic.

---

### Pitfall 4: `files` Field Omits `dist/` or `bin` — Binary Not Shipped in Published Package

**What goes wrong:**
`npm publish` ships only files matching the `files` array in `package.json`. If `files` is set to `["dist"]` but the CLI entry was renamed or the tsup output path changed, the binary file is absent from the tarball. npm does not validate that files referenced in the `bin` field actually exist in the package. The package publishes successfully, users install it, and `heylol` fails with `env: node: No such file or directory` or a module-not-found error.

**Why it happens:**
npm's publish pipeline silently succeeds when `bin` references a missing path. The `files` field was set once and never updated when the build output path changed (e.g., from `dist/index.cjs` to `dist/cli.cjs`). Developers don't run `npm pack --dry-run` before publishing.

**How to avoid:**
Keep the `files` field explicit: `["dist", "README.md"]`. Before every publish, run `npm pack --dry-run` and verify the output includes the binary path referenced in `bin`. Better yet, run `publint` which specifically checks that `bin` entries exist on disk. Add a CI step:
```bash
cd packages/cli && npx publint .
```
publint catches missing bin files and mis-declared exports before they reach the registry.

**Warning signs:**
- No `npm pack --dry-run` step in CI before publish
- `publint` not in the CLI package's CI workflow
- `files` field lists a directory that was renamed in a tsup config change
- `npm install -g heylol` completes but `heylol --version` gives `Cannot find module`

**Phase to address:** Phase 1 (scaffold) and every release — add `publint` to the Turborepo `build` task output verification.

---

### Pitfall 5: Mixed stdout/stderr Output Breaking JSON Pipe Consumers

**What goes wrong:**
The CLI is designed for machine consumption: JSON on stdout, errors on stderr. But diagnostic messages, warnings, and progress indicators leak onto stdout, breaking JSON pipes. The most common forms: (a) a `console.log('Authenticating...')` left in auth setup code; (b) SDK internals that write to stdout instead of stderr; (c) error paths that call `console.error(err)` which writes the full `Error` object with a stack trace — the agent parsing stderr sees `Error: ...` followed by a multi-line stack, not a JSON error object; (d) the human-readable `--human` flag accidentally also enabled on the JSON code path due to a conditional bug.

**Why it happens:**
JavaScript's `console.log` defaults to stdout. Developers habitually use it for debugging and forget to remove it. The SDK's error classes have `toJSON()` methods, but `console.error(err)` calls `err.toString()` (or the V8 Error formatter), not `toJSON()`. The distinction between stdout and stderr is easy to verify manually but hard to enforce without tests.

**How to avoid:**
Strict rule: **all user-facing output goes through a single `Output` module** that routes based on mode:
- JSON mode: `process.stdout.write(JSON.stringify(result) + '\n')` for success; `process.stderr.write(JSON.stringify(errorObj) + '\n')` for errors
- Human mode: formatted text to stdout, formatted errors to stderr

Never call `console.log` or `console.error` in command handlers — route through the Output module. Write an integration test that pipes CLI output through `JSON.parse()` for every command and asserts valid JSON:
```bash
heylol profile get | jq . # must succeed with exit 0
```

**Warning signs:**
- Any `console.log` in `packages/cli/src/commands/`
- Error handler that does `console.error(err)` instead of `output.error(err.toJSON())`
- `heylol --version 2>/dev/null | jq .` fails (stdout contains non-JSON)
- `--human` flag logic implemented as a global mutable variable rather than passed through the Output module

**Phase to address:** Phase 2 — Command implementation. Establish the Output module as the first thing before writing any command, and add stdout-must-be-JSON tests to CI.

---

### Pitfall 6: Non-Zero Exit Code Not Set on Error — Agent Misreads Failure as Success

**What goes wrong:**
The CLI throws an error (network failure, auth failure, API error) but exits with code `0` because the error was caught but `process.exit(1)` was not called, or because Node.js's unhandled rejection behavior (Node 15+) terminates with a non-zero code but the stderr output is not a JSON object — it's a raw error string. Agent automation checks exit codes before parsing stdout: if exit code is `0` and stdout has content, the agent treats it as success. If the actual JSON output is `{}` or missing a field because an error was silently swallowed, the agent proceeds with incorrect data.

**Why it happens:**
Async command handlers that `throw` propagate rejections. In some frameworks, the top-level CLI runner catches those rejections and logs them but exits `0` (treating logging as "handled"). Developers test the happy path and miss that the error path's exit code is wrong.

**How to avoid:**
Map all error types to specific exit codes and always call `process.exit()` explicitly at the top-level error boundary:

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | General / unexpected error |
| 2 | Invalid arguments / usage error |
| 3 | Auth failure (bad key, missing key) |
| 4 | Network failure |
| 5 | API error (4xx/5xx from hey.lol) |

The top-level handler pattern:
```ts
main().catch((err) => {
  output.error(err.toJSON?.() ?? { code: 'UNKNOWN', message: String(err) });
  process.exit(getExitCode(err));
});
```
Add integration tests that check `$?` after failed invocations:
```bash
HEYLOL_PRIVATE_KEY=invalid heylol profile get; test $? -eq 3
```

**Warning signs:**
- Top-level CLI runner uses `.catch(console.error)` without `process.exit`
- CI tests only check stdout content, never `$?`
- `heylol invalid-command; echo $?` prints `0`
- Error boundary catches `SdkError` but doesn't differentiate AuthError from NetworkError for exit code

**Phase to address:** Phase 2 — The exit code map and top-level error boundary must be defined before any command is considered "done."

---

### Pitfall 7: Private Key Leaking into Error Messages, Logs, or Stack Traces

**What goes wrong:**
The CLI reads a private key from `~/.heylol/config.json` or `HEYLOL_PRIVATE_KEY`. If an error occurs during auth (e.g., `loadKeypair` throws with an invalid key), the thrown error's message may contain the raw key string if the developer does `throw new Error(`Invalid key: ${privateKey}`)`. Even if the SDK's `AuthError.toJSON()` is clean (and it is — verified in the SDK source), the CLI layer may expose the key by: (a) logging the full environment variable in debug output; (b) including the private key string in a "did you mean...?" suggestion; (c) the Node.js unhandled rejection handler printing the full `cause` chain.

**Why it happens:**
Developers add diagnostic context to help users fix problems: "The key you provided was: [key]..." This is natural for debugging but catastrophic for a private key. The SDK's `AuthError` is intentionally clean, but CLI code that wraps it and adds "helpful" context can undo this safety.

**How to avoid:**
Define a firm rule: **the private key value never appears in any string that gets written to stdout, stderr, or any log**. Enforce with a test:
```ts
// After a failed auth attempt, verify the key is not in stderr
const result = spawnSync('heylol', ['profile', 'get'], {
  env: { HEYLOL_PRIVATE_KEY: 'TESTKEYVALUE123' }
});
assert(!result.stderr.toString().includes('TESTKEYVALUE123'));
```
In error messages, reference the key source ("the key loaded from HEYLOL_PRIVATE_KEY"), not the key value. Truncate to first/last 4 chars maximum if any reference is needed for debugging: `key[0:4]...key[-4:]`. Never log `process.env` wholesale.

**Warning signs:**
- Any error message template literal that interpolates a variable that could be a private key
- `console.error(process.env)` or similar env dumps in debug paths
- Error handler that includes `cause.message` from `AuthError` without inspecting whether the message contains key material
- Missing test that verifies the key value doesn't appear in error output

**Phase to address:** Phase 2 — Auth command implementation. Add the key-leak test to the auth setup phase specifically.

---

### Pitfall 8: Config File Write Race Condition and Permissions

**What goes wrong:**
`heylol auth setup` writes the private key to `~/.heylol/config.json`. If two instances run simultaneously (unlikely for a user CLI, but possible in CI/CD), or if the write is interrupted by a signal, the config file is left partially written or truncated. A truncated JSON file causes all subsequent commands to fail with a `SyntaxError: Unexpected end of JSON input` that looks like a bug in the CLI, not a write failure. Additionally, if `~/.heylol/` is created without explicit mode `0o700` and `config.json` without `0o600`, other users on a shared system can read the private key.

**Why it happens:**
`fs.writeFileSync(path, JSON.stringify(config))` is not atomic — if the process is killed mid-write, the file is truncated. `fs.mkdirSync('~/.heylol')` uses a default umask that may be `0o755` (world-readable directory). Developers test on single-user dev machines and don't notice permission issues.

**How to avoid:**
Write atomically: write to a temp file, then `fs.renameSync(tmpPath, configPath)` — rename is atomic on POSIX. Set explicit permissions:
```ts
import { writeFileSync, mkdirSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Create directory with restricted permissions
mkdirSync(configDir, { recursive: true, mode: 0o700 });

// Write atomically
const tmp = join(tmpdir(), `heylol-config-${process.pid}.json`);
writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
renameSync(tmp, configPath);
```
On read, catch `SyntaxError` from `JSON.parse` and show a clear error: "Config file is corrupted. Run `heylol auth setup` to reconfigure." Check that the config directory and file have correct permissions at startup, warn if not (don't block, warn).

**Warning signs:**
- `fs.writeFileSync(configPath, ...)` without a temp-file-and-rename pattern
- `mkdirSync` without explicit `mode: 0o700`
- No `try/catch` around `JSON.parse(configContent)` in config read path
- `ls -la ~/.heylol/` shows `drwxr-xr-x` (world-readable) or `-rw-r--r--` (world-readable file)

**Phase to address:** Phase 2 — Auth config command. Get the atomic write and permission modes right from the start; retrofitting is easy to forget.

---

### Pitfall 9: `noExternal` Bundling Pulls in Node.js-Only Code from SDK Into "Universal" Bundle

**What goes wrong:**
The CLI uses `noExternal: ['@heylol/sdk']` in tsup to bundle the SDK into the CLI binary (avoiding the need for users to install the SDK separately). However, the SDK is designed to be edge-compatible — it has zero Node.js built-ins. The CLI itself uses Node.js built-ins (`fs`, `os`, `path`, `process`). If `noExternal` is not carefully combined with `platform: 'node'`, esbuild may attempt to resolve node built-ins as browser equivalents, producing a broken bundle. Conversely, if `platform` is set correctly but any transitive dep of `@heylol/sdk` happens to have a conditional `require('node:fs')` (for Node.js environments), it gets bundled in unnecessarily.

**Why it happens:**
The SDK was built edge-first. Its transitive deps (`@noble/curves`, `@scure/base`) are pure JS. But esbuild's bundling of `@heylol/sdk` may pull in type-only imports or conditional branches that reference node builtins. Developers set `noExternal` to simplify distribution without checking what gets bundled.

**How to avoid:**
Set `platform: 'node'` and `target: 'node18'` explicitly in the CLI tsup config. List `@heylol/sdk` in `noExternal` to bundle it, but mark node built-ins as external (they're available in Node.js anyway). Check the bundle output for unintended inclusions:
```bash
# Inspect what's bundled
node -e "const s = require('fs').readFileSync('dist/cli.cjs','utf8'); console.log(s.length)"
# Bundle should be <2MB for a thin CLI wrapper
```
Run `npx bundlesize` or just check `ls -lh dist/cli.cjs` — if the CLI bundle is >5MB, something is being pulled in unexpectedly.

**Warning signs:**
- `dist/cli.cjs` is larger than 2MB (the pure SDK + CLI code should be well under this)
- Bundle contains `__webpack_require__` or other bundler artifacts (wrong tool in the chain)
- CLI requires installing `@heylol/sdk` separately as a peer dependency
- `node dist/cli.cjs` works but produces different output than `heylol` after global install

**Phase to address:** Phase 1 — tsup configuration. Verify bundle size and contents before adding any commands.

---

### Pitfall 10: Turborepo Caches Stale CLI Build When SDK Changes

**What goes wrong:**
Turborepo caches the `build` output of each package. If the CLI's `package.json` `turbo.json` pipeline is misconfigured, Turborepo may serve a cached CLI build even after `@heylol/sdk` has changed. The cache key for the CLI package includes the SDK's output hash only if the CLI declares a proper `dependsOn: ["^build"]` task dependency. If the CLI package doesn't have a `build` script in its `turbo.json` task map, or if it's not listed in the root `turbo.json`, the CLI build is never invalidated when the SDK changes.

**Why it happens:**
Adding a new package to a Turborepo monorepo requires registering it in the pipeline. Developers add `packages/cli` but forget that Turborepo discovers tasks by `package.json` script names — if the CLI `package.json` has a `build` script but the root `turbo.json` doesn't include a `"build"` task config, it runs without caching. This can mean the CLI builds fine but never benefits from parallelism or caching.

**How to avoid:**
Verify the CLI package appears correctly in `turbo run build --dry-run`:
```bash
pnpm turbo build --dry-run 2>&1 | grep cli
```
The output must show `packages/cli#build` with `@heylol/sdk#build` as an upstream dependency. If the CLI build is listed as having 0 dependencies, the workspace link is wrong. Add a `"size-check"` task entry to turbo.json if a size gate is desired, following the same `dependsOn: ["build"]` pattern as other packages.

**Warning signs:**
- `pnpm turbo build --dry-run` does not list `packages/cli#build` at all
- After changing `packages/sdk/src/*.ts`, `pnpm build` doesn't rebuild the CLI
- CLI binary behavior doesn't change after SDK changes without running `pnpm -C packages/cli build` manually

**Phase to address:** Phase 1 — Turborepo configuration. Verify the full dependency graph before writing any command logic.

---

### Pitfall 11: Changesets Converts `workspace:*` to Real Version But Package Name `heylol` (Not `@heylol/cli`) Has a Name Collision Risk

**What goes wrong:**
Two distinct issues at publish time: (a) the `heylol` package name on npm is unscoped — if another package already owns `heylol` on the registry, publish fails with a 403. This must be verified before starting implementation, not at publish time. (b) Changesets automatically converts `"@heylol/sdk": "workspace:*"` to the resolved version (`"@heylol/sdk": "1.0.0"`) during publish. This is correct. However, if the CLI has not been added to the changesets workflow (no `.changeset/` entry), it will not be versioned or published by `changeset publish` — it just gets skipped silently.

**Why it happens:**
Developers create the package and write code but never run `pnpm changeset add` to register an initial changeset. Changeset publish skips packages with no pending changeset and no version bump. The package exists in the monorepo but is never published.

**How to avoid:**
Before writing code: check npm registry for the `heylol` name:
```bash
npm view heylol 2>&1 | head -5
```
If taken, the package name must be chosen now (e.g., `@heylol/cli` with a bin alias, or a different unscoped name). Create an initial changeset for the CLI package as part of the scaffold phase:
```bash
pnpm changeset add  # select packages/cli, bump minor (new feature)
```
Verify the CLI appears in `pnpm changeset status`.

**Warning signs:**
- `pnpm changeset status` does not list `heylol` (or whatever the package is named)
- `npm view heylol` returns an existing package from another author
- CI publish step shows "No changed packages to publish" despite new CLI code

**Phase to address:** Phase 1 — Package scaffold. Check npm name availability on day one and add the initial changeset.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy SDK's `tsup.config.ts` for CLI | Zero config work | Dual format binary causes shebang/permissions issues; dual-format CLI has no consumer benefit | Never — CLI needs its own CJS-only config |
| Use `console.log` for output instead of an Output module | Faster initial development | stdout/stderr discipline breaks instantly; JSON output corrupted by stray logs | Never — establish the Output module before first command |
| Hardcode exit code 1 everywhere | Simple | Agent consumers can't distinguish auth failures from network failures from bad args | Only in very first scaffold; fix before any public release |
| Skip atomic writes for config file | Simpler code | Corrupted config on interrupt causes confusing failures | Never — the atomic rename is 2 lines and prevents a bad class of bugs |
| Bundle `@heylol/sdk` into CLI vs. listing as peerDep | Simpler user install (one package) | Bundle must be checked for size regressions at every SDK change | Acceptable if a size check is in CI; bundling is the right choice for a CLI |
| Accept private key as CLI argument (`heylol --key <base58>`) | Convenient for testing | Key appears in shell history, `ps aux`, and `~/.bash_history` | Never — environment variable or config file only |
| Single output format for both `--human` and JSON (e.g., always-JSON) | Simpler code | Human operators can't use the tool without piping through `jq` | Never — the `--human` flag is necessary for interactive use |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@heylol/sdk` from CLI | Import SDK types with `import type` but accidentally import value at runtime, causing bundler to not tree-shake | Use explicit value imports only for what is needed; verify bundle does not contain unused SDK methods |
| `HeyLolClient` init in CLI | Create a new client on every command invocation (which is correct — CLI is ephemeral) but forget to pass `fetch` override, using `globalThis.fetch` which is always available in Node.js 18+ | No fix needed for Node 18+; but document minimum Node version in CLI README and `"engines"` field |
| `loadKeypair` from SDK | CLI calls `loadKeypair(key)` without a try/catch and the thrown `AuthError` propagates to Node.js's unhandled rejection handler, producing a raw error on stderr instead of a JSON error object | Always wrap `loadKeypair` in try/catch in the CLI layer; convert to JSON error before writing to stderr |
| `process.env.HEYLOL_PRIVATE_KEY` | Read at module load time, not at command execution time — if the env var is set after the CLI module loads (unusual but possible in some test harnesses), the key is `undefined` | Read env var inside the command handler function, not at top-level module scope |
| Config file path | Use `~/.heylol/config.json` literally with `~` — `fs` does not expand tilde on all platforms | Use `path.join(os.homedir(), '.heylol', 'config.json')` explicitly |
| `JSON.stringify` in output | `JSON.stringify(result)` produces compact output; piping through `jq` is readable but `jq .` output is not what the test fixture expects | Use `JSON.stringify(result)` (compact, one line per object) for stdout — agents parse this; `JSON.stringify(result, null, 2)` for `--human` mode |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| CLI startup time >500ms due to bundled SDK size | Users notice delay; `time heylol --version` is slow | Bundle only what is needed; avoid pulling in all SDK resources if only auth is needed at startup | If bundle exceeds ~3MB; at sub-1MB with tree-shaking this is not an issue |
| Re-reading config file on every sub-command call | No user-visible symptom; minor I/O | Read config once, pass as context to all command handlers | Not an issue at CLI scale — file reads are <1ms |
| Spawning `heylol` from another CLI tool with `spawnSync` | Synchronous blocking of parent process | Use `spawn` (async) with stream handling in parent | When orchestrating many `heylol` calls in parallel |
| Sending private key over any network boundary (e.g., proxied requests) | Key exposed in logs on proxy | Ensure `fetch` calls in SDK never include auth header on non-hey.lol domains | At deploy time — verify no proxy rewriting |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing private key in config file without `0o600` permissions | Any user on the machine can read the key | `writeFileSync(path, content, { mode: 0o600 })`; check permissions on read |
| Accepting private key as a positional argument (`heylol setup <key>`) | Key appears in `ps aux`, `~/.bash_history`, shell logs | Only accept from env var or interactive stdin prompt (with `readline` in no-echo mode) |
| Config file in a world-readable directory | Key readable if file permissions are wrong | Create `~/.heylol/` with `mode: 0o700` |
| Including full error stack trace in JSON error output | Leaks internal file paths, node_modules structure | Catch errors at boundary, output `{ code, message }` only — no `stack` field in JSON mode |
| `JSON.stringify(client)` or `JSON.stringify(keypair)` in debug output | Private key bytes appear in logs | SDK's `HeyLolError.toJSON()` is already safe; verify `JSON.stringify(new HeyLolClient({ privateKey }))` does not include key material |
| Env var `HEYLOL_PRIVATE_KEY` printed in `--verbose` mode | Key in CI logs | Redact all `HEYLOL_*` env vars from any verbose output; print `HEYLOL_PRIVATE_KEY=[REDACTED]` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| JSON error on stdout instead of stderr | Agent downstream gets error mixed with data; `jq` parsing fails | All errors to stderr as JSON; success data to stdout as JSON |
| Exit 0 with empty JSON `{}` on auth failure | Agent treats auth failure as empty successful result | Exit code 3 with `{ "error": { "code": "AUTH_FAILED", "message": "..." } }` on stderr |
| `--human` flag producing ANSI color codes that appear in redirected output | CI logs full of escape codes | Use `chalk` with `chalk.level = 0` when `!process.stdout.isTTY`; or use `picocolors` which auto-detects TTY |
| No `--version` flag | Agent can't identify CLI version in bug reports | Always implement `heylol --version` outputting `{ "version": "x.y.z" }` |
| Silent success (exit 0, empty stdout) | Agent can't confirm the action occurred | All successful commands output at minimum `{ "ok": true }` or the created resource |
| Deeply nested JSON output for simple actions | Agent must navigate nested paths like `.data.result.post.id` | Keep output flat: `{ "id": "...", "content": "...", "createdAt": "..." }` directly at root |

---

## "Looks Done But Isn't" Checklist

- [ ] **Shebang:** `head -1 dist/cli.cjs` returns exactly `#!/usr/bin/env node` — verified after clean build
- [ ] **Executable bit:** `ls -la dist/cli.cjs` shows `x` for owner — not just present but executable
- [ ] **Workspace link:** `pnpm list --filter heylol @heylol/sdk` shows local link, not registry version
- [ ] **JSON purity:** `heylol profile get 2>/dev/null | jq .` succeeds — stdout is always valid JSON on success
- [ ] **Exit codes:** `HEYLOL_PRIVATE_KEY=invalid heylol profile get; echo $?` prints `3` (or chosen auth error code), not `0` or `1`
- [ ] **Key safety:** Error output when given invalid key does not contain the key value — verified by test
- [ ] **Config permissions:** `~/.heylol/config.json` has mode `0600`, `~/.heylol/` has mode `0700` after `heylol auth setup`
- [ ] **Tilde expansion:** Config path uses `os.homedir()`, not literal `~` — verified on Windows path
- [ ] **Bundle size:** `dist/cli.cjs` is under 2MB (or established budget) — checked in CI
- [ ] **Turborepo registration:** `pnpm turbo build --dry-run` lists `packages/cli#build` with SDK as dependency
- [ ] **Changeset registered:** `pnpm changeset status` shows `heylol` (CLI package) pending for publish
- [ ] **npm name:** `npm view heylol` either 404s (name available) or is the team's own package
- [ ] **No stray console.log:** `grep -r 'console\.log' packages/cli/src/` returns empty
- [ ] **Human flag isolation:** `heylol --human profile get | jq .` fails (human output is not JSON) — confirms modes are separate

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Shebang missing from published binary | LOW | Ship patch — update tsup config with `banner`, republish; existing installs need `npm install -g heylol@latest` |
| Binary not executable in published package | LOW | Ship patch with `chmod +x` in postinstall script; republish |
| Wrong npm package name (taken) | HIGH | Must rename; all existing `npm install heylol` instructions wrong; choose scoped name `@heylol/cli` early |
| stdout/stderr contamination discovered post-release | MEDIUM | Audit all `console.log` calls; ship minor with Output module; agents need to update |
| Private key leaked in error message (discovered in logs) | CRITICAL | Treat as security incident; rotate key; ship emergency patch; audit log retention |
| Config file corruption on interrupted write | LOW | Clear user messaging ("Run `heylol auth setup` again"); ship patch with atomic write |
| `workspace:*` not converted on publish (wrong version pinned) | MEDIUM | changesets handles this automatically; if using manual publish, add pre-publish check |
| Turborepo cache stale (wrong CLI shipped) | LOW | `pnpm turbo build --force`; verify pipeline config; add pipeline verification to CI |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Shebang missing or duplicated | Phase 1 — tsup config | `head -1 dist/cli.cjs` check in build script |
| Binary not executable | Phase 1 — build tooling | `ls -la dist/cli.cjs` check; CI on `ubuntu-latest` |
| SDK workspace link wrong | Phase 1 — package scaffold | `pnpm list --filter heylol @heylol/sdk` |
| `files` field omits binary | Phase 1 — package scaffold; every release | `publint` in CI |
| Mixed stdout/stderr | Phase 2 — command implementation | JSON pipe test for every command |
| Wrong or missing exit codes | Phase 2 — error boundary | `$?` tests for failure paths |
| Private key in error output | Phase 2 — auth command | Key-leak test in auth command suite |
| Config file permissions | Phase 2 — auth config command | `stat ~/.heylol/config.json` mode check |
| `noExternal` bundling issues | Phase 1 — tsup config | Bundle size check < 2MB |
| Turborepo cache invalidation | Phase 1 — Turborepo config | `pnpm turbo build --dry-run` output check |
| npm name collision + changeset gap | Phase 1 — pre-scaffold | `npm view heylol` + `changeset status` |

---

## Sources

- tsup documentation (tsup.egoist.dev) — shebang auto-detection, `banner` option, `platform`, `noExternal` — HIGH confidence
- npm documentation — `bin` field behavior, `files` field, publish pipeline, no bin file existence validation — HIGH confidence (confirmed via npm/npm GitHub issue #18554)
- pnpm workspace documentation (pnpm.io/workspaces) — `workspace:*` protocol, version conversion on publish — HIGH confidence
- Turborepo documentation — `dependsOn: ["^build"]` task dependency semantics — HIGH confidence
- clig.dev CLI best practices — stdout/stderr separation, exit codes, JSON output — HIGH confidence (authoritative community standard)
- Node.js fs documentation — `writeFileSync` mode option, `mkdirSync` mode, `renameSync` atomicity — HIGH confidence
- write-file-atomic npm package docs — atomic write pattern — HIGH confidence
- MITRE ATT&CK T1552.003 and shell history documentation — private key shell history leak — HIGH confidence
- Changesets GitHub and pnpm workspace protocol conversion behavior — MEDIUM confidence (multiple corroborating sources, standard monorepo pattern)
- Claude Code CLI GitHub issues (anthropics/claude-code) — JSON truncation and partial output patterns in agent-consumed CLIs — MEDIUM confidence (specific to Claude Code but pattern generalizes)

---
*Pitfalls research for: heylol CLI tool — adding binary to existing TypeScript SDK monorepo*
*Researched: 2026-03-02*
