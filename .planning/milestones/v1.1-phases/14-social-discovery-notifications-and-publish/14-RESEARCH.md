# Phase 14: Social, Discovery, Notifications, and Publish - Research

**Researched:** 2026-03-02
**Domain:** Commander.js CLI command implementation (social/discovery/notifications stubs → real handlers) + npm publish preflight for `npx heylol` from registry
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SOCL-01 | User can follow a user via `heylol social follow <id>` | `client.social.follow(asUserId(id))` returns `Promise<void>`; stub has `<id>` argument; pass `null` to `printSuccess` |
| SOCL-02 | User can unfollow a user via `heylol social unfollow <id>` | `client.social.unfollow(asUserId(id))` returns `Promise<void>`; stub has `<id>` argument; pass `null` to `printSuccess` |
| SOCL-03 | User can list followers via `heylol social followers <id>` | `client.social.followers(asUserId(id), { cursor, limit })` returns `Promise<PaginatedList<User>>`; stub has `<id>` argument + `--cursor` + `--limit` options already declared |
| SOCL-04 | User can list following via `heylol social following <id>` | `client.social.following(asUserId(id), { cursor, limit })` returns `Promise<PaginatedList<User>>`; stub has `<id>` argument + `--cursor` + `--limit` options already declared |
| DISC-01 | User can search via `heylol discovery search --query "text"` | `client.discovery.search({ query, cursor, limit })` returns `Promise<SearchResults>`; stub has `--query` as `requiredOption` + `--cursor` + `--limit` |
| DISC-02 | User can view trending via `heylol discovery trending` | `client.discovery.trending({ cursor, limit })` returns `Promise<PaginatedList<Post>>`; stub has `--cursor` + `--limit` options |
| DISC-03 | User can view suggested users via `heylol discovery suggested` | `client.discovery.suggested({ cursor, limit })` returns `Promise<PaginatedList<User>>`; stub has `--cursor` + `--limit` options |
| NOTF-01 | User can list notifications via `heylol notifications list` | `client.notifications.list({ cursor, limit })` returns `Promise<PaginatedList<Notification>>`; stub has `--cursor` + `--limit` options |
| NOTF-02 | User can mark notifications read via `heylol notifications mark-read` | `client.notifications.markRead(ids?)` returns `Promise<void>`; stub has no options (mark-all-read is the default behavior when no ids given); pass `null` to `printSuccess` |
</phase_requirements>

---

## Summary

Phase 14 splits into two independent work streams: (1) wiring nine remaining CLI command stubs to `@heylol/sdk` resource methods, and (2) publishing the `heylol` CLI package to npm so `npx heylol` works from a clean install.

The command wiring work is mechanically identical to Phase 13. All nine stubs in `commands/social.ts`, `commands/discovery.ts`, and `commands/notifications.ts` already have the correct command tree, argument declarations, and option declarations. Only the action handlers need replacing — `throw new Error('not implemented')` becomes a real four-line try/catch pattern. No new infrastructure, no new packages. The pattern is proven: `auth.ts` and the completed `posts.ts`/`profile.ts` serve as templates.

The publish work is the novel element of Phase 14. The `heylol` CLI package must be published to npm so that `npx heylol --version` succeeds from a clean directory with no local workspace. Key facts: `@heylol/sdk` is already published at `1.0.0`. The CLI bundle keeps `@heylol/sdk` as an external ESM import (not inlined), so npm will install it as a runtime dependency. `pnpm publish` handles the `workspace:*` → real version conversion automatically. The `bin` field, `files` array, and shebang are all correctly configured. The `npm publish --dry-run` preflight passes clean (no warnings, no errors).

**Primary recommendation:** Implement all nine command stubs using `posts.ts` as the exact template, then publish the CLI package with `pnpm publish --filter heylol --no-git-checks` after rebuilding. No new packages needed. No config changes needed. The only open question is whether `notifications mark-read` should accept optional `--ids` arguments — the SDK supports it but the success criteria only tests the no-argument (mark-all) case.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.0.3 (installed) | Subcommand routing, argument/option parsing | Already in use; all stubs define the command tree correctly |
| @heylol/sdk | workspace:* (local) / 1.0.0 (npm) | `SocialResource`, `DiscoveryResource`, `NotificationsResource`, branded ID types | All API logic lives here; CLI is a thin wrapper |
| picocolors | 1.1.x (installed) | Human-mode output coloring | Handled by `output.ts`; no direct use needed in command files |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pnpm | 10.21.0 (configured) | Workspace publish with protocol conversion | Use `pnpm publish --filter heylol` to handle `workspace:*` → `1.0.0` in published package.json |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `pnpm publish` for workspace:* conversion | `npm publish` | `npm publish` publishes the raw `workspace:*` string which breaks consumer installs; pnpm rewrites it to the real version automatically |
| External `@heylol/sdk` dependency | Bundle SDK into CLI with tsup `noExternal` | Bundling would create a self-contained binary (no runtime dep) but would require building SDK into CLI dist — more complex, not needed since SDK is already on npm |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

This phase modifies three existing stub files only:

```
packages/cli/src/
├── index.ts              # No changes needed
├── context.ts            # No changes needed
├── output.ts             # No changes needed (complete from Phase 11)
├── config.ts             # No changes needed (complete from Phase 12)
└── commands/
    ├── auth.ts           # No changes needed (reference template)
    ├── posts.ts          # No changes needed (reference template, completed Phase 13)
    ├── profile.ts        # No changes needed (completed Phase 13)
    ├── social.ts         # REPLACE 4 stubs: follow, unfollow, followers, following
    ├── discovery.ts      # REPLACE 3 stubs: search, trending, suggested
    └── notifications.ts  # REPLACE 2 stubs: list, mark-read
```

### Pattern 1: Standard Void Command (follow, unfollow, mark-read)

**What:** Commands that call SDK methods returning `Promise<void>`. Pass `null` (not `undefined`) to `printSuccess` for clean JSON output.

**When to use:** `social follow`, `social unfollow`, `notifications mark-read`.

```typescript
// Source: packages/cli/src/commands/posts.ts (established pattern, Phase 13)
// Reference: packages/sdk/src/resources/SocialResource.ts — follow/unfollow return Promise<void>

import { asUserId } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

cmd
  .command('follow')
  .description('Follow a user')
  .argument('<id>', 'user ID')
  .action(async function (this: Command, id: string) {
    const opts = this.optsWithGlobals<GlobalContext>();
    try {
      const client = createClient(opts);
      await client.social.follow(asUserId(id));
      printSuccess(null, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### Pattern 2: Paginated List Command (followers, following, trending, suggested, list)

**What:** Commands that call SDK methods returning `Promise<PaginatedList<T>>`. Options `--cursor` and `--limit` are already declared on the stubs; read them from `opts`.

**When to use:** `social followers`, `social following`, `discovery trending`, `discovery suggested`, `notifications list`.

```typescript
// Source: packages/cli/src/commands/posts.ts (--cursor/--limit pattern)
// Reference: packages/sdk/src/resources/SocialResource.ts — followers/following return PaginatedList<User>

cmd
  .command('followers')
  .description('List followers of a user')
  .argument('<id>', 'user ID')
  .option('--cursor <string>', 'cursor for next page')
  .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
  .action(async function (this: Command, id: string) {
    const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
    try {
      const client = createClient(opts);
      const result = await client.social.followers(asUserId(id), {
        cursor: opts.cursor,
        limit: opts.limit,
      });
      printSuccess(result, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### Pattern 3: Search Command (discovery search)

**What:** `discovery search` takes `--query` (required) plus optional `--cursor`/`--limit`. The SDK `SearchParams` has `query` field but also optional `type` filter (`'users' | 'posts' | 'all'`). The stub has no `--type` option — do not add it unless success criteria requires it (it does not).

**When to use:** `discovery search` only.

```typescript
// Source: packages/sdk/src/resources/DiscoveryResource.ts — search takes SearchParams
// Source: packages/sdk/src/types/params.ts — SearchParams { query: string; type?: '...' ; cursor?; limit? }

cmd
  .command('search')
  .description('Search for posts or users')
  .requiredOption('--query <text>', 'search query')
  .option('--cursor <string>', 'cursor for next page')
  .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & { query: string; cursor?: string; limit?: number }>();
    try {
      const client = createClient(opts);
      const result = await client.discovery.search({
        query: opts.query,
        cursor: opts.cursor,
        limit: opts.limit,
      });
      printSuccess(result, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### Pattern 4: No-Argument Paginated Commands (trending, suggested)

**What:** `discovery trending` and `discovery suggested` have no positional arguments — just optional `--cursor`/`--limit`. Same pattern as paginated list but without `asUserId()` wrapping.

**When to use:** `discovery trending`, `discovery suggested`.

```typescript
// Source: packages/sdk/src/resources/DiscoveryResource.ts — trending/suggested take PaginationParams?

cmd
  .command('trending')
  .description('View trending content')
  .option('--cursor <string>', 'cursor for next page')
  .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
    try {
      const client = createClient(opts);
      const result = await client.discovery.trending({ cursor: opts.cursor, limit: opts.limit });
      printSuccess(result, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### Pattern 5: npm Publish Preflight

**What:** The publish workflow for the CLI package. `pnpm publish` handles `workspace:*` → real version rewriting in the published `package.json`.

**Steps:**
1. Implement and commit all command stubs (SOCL-01 through NOTF-02)
2. Build the CLI: `pnpm build --filter heylol` (or `pnpm turbo build`)
3. Verify preflight: `npm publish --dry-run` from `packages/cli/` — must produce no warnings
4. Publish: `pnpm publish --filter heylol --no-git-checks` (if git is clean, omit `--no-git-checks`)
5. Verify from clean directory: `npx heylol@1.0.0 --version` (pinned version avoids cache issues)

```bash
# Build step (from repo root)
pnpm build --filter heylol

# Preflight check (from packages/cli)
cd packages/cli && npm publish --dry-run && cd -

# Publish (from repo root)
pnpm publish --filter heylol
```

**CRITICAL — workspace:* conversion:** The CLI `package.json` has `"@heylol/sdk": "workspace:*"`. When published via `pnpm publish`, this becomes `"@heylol/sdk": "1.0.0"` in the tarball's `package.json`. When published via raw `npm publish`, the string `workspace:*` is published as-is — npm consumers would get `EUNSUPPORTEDPROTOCOL` or `ETARGET` errors. Always use `pnpm publish`.

### Anti-Patterns to Avoid

- **Arrow functions for action handlers:** `async () => {}` loses `this` binding. MUST use `async function (this: Command)` to call `optsWithGlobals()`.
- **Accessing arguments via `opts`:** Positional arguments (like `<id>`) come as action function parameters, not via `optsWithGlobals()`.
- **Forgetting `asUserId()` wrapping:** `SocialResource.follow()`, `followers()`, and `following()` all take `UserId` branded type. Pass raw `string` and TypeScript errors at compile time.
- **Missing `await` on void SDK methods:** `follow` and `unfollow` return `Promise<void>`. Must `await`.
- **Passing `undefined` to `printSuccess` for void commands:** `JSON.stringify(undefined)` produces JS `undefined` — string concat gives `"undefined\n"` on stdout. Pass `null` instead.
- **Using `npm publish` directly:** Publishes raw `workspace:*` protocol string — breaks consumer installs. Always use `pnpm publish`.
- **Passing `{}` when limit/cursor are undefined:** `PaginationParams` accepts `undefined` values for both fields — the SDK filters them. Passing `{ cursor: undefined, limit: undefined }` is valid and equivalent to omitting the param object.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| workspace:* → version rewriting | Manual sed/replace in package.json | `pnpm publish` | pnpm handles this automatically; manual approach is fragile and error-prone |
| API call logic | Raw `fetch` calls | `client.social.*`, `client.discovery.*`, `client.notifications.*` | SDK handles auth, retries, 402 payment, error mapping |
| Error exit codes | `process.exit(N)` in catch blocks | `printFailure(err, opts)` | `resolveExitCode` in `output.ts` maps SDK error types to correct exit codes |
| Output formatting | Direct `console.log` / `JSON.stringify` | `printSuccess(data, opts)` | Handles TTY detection, --json/--human flags, null data |
| Client construction | `new HeyLolClient({ privateKey: ... })` | `createClient(opts)` from `config.ts` | Handles key resolution priority chain and AuthError |
| Paginated params | Separate null-checks for cursor/limit | Pass `{ cursor: opts.cursor, limit: opts.limit }` directly | SDK param types accept `undefined`; no guard needed |

**Key insight:** Phase 14 is pure wiring — zero new infrastructure. All complexity lives in the SDK. Each command action is 5-8 lines.

---

## Common Pitfalls

### Pitfall 1: Using `npm publish` Instead of `pnpm publish`

**What goes wrong:** `npm publish` publishes the literal string `"workspace:*"` as the `@heylol/sdk` version in `package.json`. Users who run `npx heylol` get: `npm error EUNSUPPORTEDPROTOCOL Unsupported URL Type "workspace:": workspace:*`

**Why it happens:** `workspace:*` is a pnpm-specific protocol. npm doesn't understand it. pnpm's publish step rewrites it to the actual resolved version before packaging.

**How to avoid:** Always publish with `pnpm publish --filter heylol`. Verify with `pnpm publish --filter heylol --dry-run --no-git-checks` and inspect the tarball contents to confirm the version was rewritten.

**Warning signs:** `npm publish --dry-run` output shows `"@heylol/sdk": "workspace:*"` in the package.json listed in tarball contents. The correct published version should show `"@heylol/sdk": "1.0.0"`.

### Pitfall 2: Publishing Without Rebuilding

**What goes wrong:** The new social/discovery/notifications command implementations exist only in `src/`. The `dist/cli.mjs` bundle still has the old `throw new Error('not implemented')` stubs. Publishing the stale dist means users get the old behavior.

**Why it happens:** tsup/turbo build is not automatic on publish. The `dist/` directory is what gets packaged (per the `"files": ["dist"]` field).

**How to avoid:** Always run `pnpm build --filter heylol` (or `pnpm turbo build`) before publish. The turbo `build` task has `"dependsOn": ["^build"]` so it will also rebuild `@heylol/sdk` if needed.

**Warning signs:** `node packages/cli/dist/cli.mjs social follow` throws `Error: not implemented` after source changes.

### Pitfall 3: Argument Access in Action Handler

**What goes wrong:** `const opts = this.optsWithGlobals<GlobalContext>(); const id = (opts as any).id` — `opts` does not contain positional argument values.

**Why it happens:** Commander separates positional arguments (from `.argument()`) and options (from `.option()`). `optsWithGlobals()` only returns options.

**How to avoid:** Declare arguments as parameters in the action callback: `.action(async function (this: Command, id: string) { ... })`.

### Pitfall 4: `void` Command JSON Output

**What goes wrong:** `printSuccess(undefined, opts)` in non-TTY mode writes `"undefined\n"` to stdout — not valid JSON.

**Why it happens:** `JSON.stringify(undefined, null, 2)` returns JS `undefined`. String concat with `+ '\n'` produces the string `"undefined\n"`.

**How to avoid:** Pass `null` to `printSuccess` for void-returning SDK methods. `JSON.stringify(null)` → `"null"`. Both human mode and JSON mode handle `null` correctly (human: prints "OK"; JSON: prints `null`).

### Pitfall 5: TypeScript Branded Type Mismatch

**What goes wrong:** `client.social.follow(id)` where `id` is `string` — TypeScript error: `Argument of type 'string' is not assignable to parameter of type 'UserId'`.

**Why it happens:** `UserId` is a branded type — `string & { readonly [__brand]: 'UserId' }`. Raw strings do not satisfy this.

**How to avoid:** Always wrap CLI argument strings: `client.social.follow(asUserId(id))`, `client.social.followers(asUserId(id), ...)`. Import `asUserId` from `@heylol/sdk`.

### Pitfall 6: Missing Import for `asUserId` / `asNotificationId`

**What goes wrong:** All three stub files (`social.ts`, `discovery.ts`, `notifications.ts`) currently have zero SDK imports. `asUserId` and `asNotificationId` are not imported.

**Why it happens:** The stubs were created without implementing action handlers. The imports are needed only when wiring real logic.

**How to avoid:** Add imports at the top of each file:

```typescript
// social.ts
import { asUserId } from '@heylol/sdk';

// discovery.ts — no branded ID wrapping needed (no ID arguments)
// notifications.ts — no branded ID wrapping needed for mark-read (no args in success criteria)
```

Note: `notifications mark-read` without `--ids` flag requires no `asNotificationId` import. If `--ids` is added later, it would need `asNotificationId`.

---

## Code Examples

Verified patterns from the installed codebase:

### social.ts — Complete Replacement

```typescript
// packages/cli/src/commands/social.ts
import { asUserId } from '@heylol/sdk';
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeSocialCommand(): Command {
  const cmd = new Command('social').description('Manage social connections');

  cmd
    .command('follow')
    .description('Follow a user')
    .argument('<id>', 'user ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.social.follow(asUserId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('unfollow')
    .description('Unfollow a user')
    .argument('<id>', 'user ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.social.unfollow(asUserId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('followers')
    .description('List followers of a user')
    .argument('<id>', 'user ID')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.social.followers(asUserId(id), {
          cursor: opts.cursor,
          limit: opts.limit,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('following')
    .description('List users followed by a user')
    .argument('<id>', 'user ID')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.social.following(asUserId(id), {
          cursor: opts.cursor,
          limit: opts.limit,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
```

### discovery.ts — Complete Replacement

```typescript
// packages/cli/src/commands/discovery.ts
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeDiscoveryCommand(): Command {
  const cmd = new Command('discovery').description('Search and discover content');

  cmd
    .command('search')
    .description('Search for posts or users')
    .requiredOption('--query <text>', 'search query')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { query: string; cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.discovery.search({
          query: opts.query,
          cursor: opts.cursor,
          limit: opts.limit,
        });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('trending')
    .description('View trending content')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.discovery.trending({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('suggested')
    .description('View suggested users')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.discovery.suggested({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
```

### notifications.ts — Complete Replacement

```typescript
// packages/cli/src/commands/notifications.ts
import { Command } from 'commander';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printFailure, printSuccess } from '../output.js';

export function makeNotificationsCommand(): Command {
  const cmd = new Command('notifications').description('Manage notifications');

  cmd
    .command('list')
    .description('List your notifications')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { cursor?: string; limit?: number }>();
      try {
        const client = createClient(opts);
        const result = await client.notifications.list({ cursor: opts.cursor, limit: opts.limit });
        printSuccess(result, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('mark-read')
    .description('Mark notifications as read')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.notifications.markRead();
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
```

### Publish Workflow

```bash
# Step 1: Build (from repo root)
pnpm turbo build

# Step 2: Preflight (from packages/cli)
cd packages/cli && npm publish --dry-run

# Expected output: no warnings, lists dist/cli.mjs, dist/cli.mjs.map, package.json
# pnpm publish handles workspace:* rewriting — use pnpm not npm for actual publish

# Step 3: Publish (from repo root)
pnpm publish --filter heylol --no-git-checks

# Step 4: Verify from clean install
npx heylol@1.0.0 --version
# Expected: 1.0.0
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `throw new Error('not implemented')` stubs | Real SDK-wired action handlers | Phase 13 (posts/profile) → Phase 14 (social/discovery/notifications) | Commands actually work |
| `npm publish` for monorepos | `pnpm publish` with workspace protocol | pnpm workspace convention | `workspace:*` rewrites to real version in published tarball |
| Bundle all deps into CLI | External runtime deps on npm | tsup `external: ['conf']` pattern | Smaller bundle; SDK separately installable; already working since SDK is on npm |

**Deprecated/outdated:**
- Arrow function action handlers: `() => {}` stubs in social/discovery/notifications — these are replaced by real `async function (this: Command, ...)` handlers.
- Publishing individual packages with `npm publish` in a pnpm workspace: Use `pnpm publish --filter <pkg>` instead.

---

## Open Questions

1. **Should `notifications mark-read` accept an optional `--ids` flag for selective marking?**
   - What we know: `NotificationsResource.markRead(ids?: NotificationId[])` supports selective marking. The stub currently has no options. The success criterion only tests `heylol notifications mark-read` with no arguments (mark-all behavior).
   - What's unclear: Whether NOTF-02 implies the full API surface should be exposed.
   - Recommendation: Implement mark-all only (no `--ids` flag) since the success criteria only tests the no-argument case and NOTF-02 says "mark notifications read" without specifying selective behavior. Adding `--ids` later is easy; it does not affect correctness of the base case.

2. **Should `discovery search` expose the `--type` filter (`users | posts | all`)?**
   - What we know: `SearchParams.type` allows filtering results. The stub has no `--type` option. The success criterion only tests `--query "ai"`.
   - What's unclear: Whether DISC-01 implies the full `SearchParams` API should be exposed.
   - Recommendation: Omit `--type` option. Success criteria only requires `--query`. Simpler stub, no behavior regression.

3. **Should the version be bumped before publishing?**
   - What we know: Both CLI and SDK are at `1.0.0`. The SDK is already published at `1.0.0`. npm will reject a re-publish of an already-published version. If the CLI `heylol` package is not yet on npm (confirmed: `npm info heylol` returns 404), `1.0.0` is available and correct.
   - What's unclear: Whether the project intends to publish the SDK and CLI at matching versions forever.
   - Recommendation: Publish CLI at `1.0.0`. No version bump needed. The CLI has not been published before.

---

## Sources

### Primary (HIGH confidence)

- `packages/cli/src/commands/social.ts` — existing stub with command tree, `<id>` arguments, and `--cursor`/`--limit` options already declared
- `packages/cli/src/commands/discovery.ts` — existing stub with command tree, `--query` requiredOption, and `--cursor`/`--limit` options
- `packages/cli/src/commands/notifications.ts` — existing stub with command tree, list options, and mark-read command
- `packages/cli/src/commands/posts.ts` — complete Phase 13 implementation; the canonical template for all Phase 14 patterns
- `packages/cli/src/commands/auth.ts` — complete Phase 12 implementation; reference for no-argument commands
- `packages/cli/src/output.ts` — `printSuccess`, `printFailure` signatures; null/undefined handling confirmed
- `packages/cli/src/config.ts` — `createClient()` function
- `packages/cli/src/context.ts` — `GlobalContext` interface
- `packages/cli/src/index.ts` — confirms all three command factories (`makeSocialCommand`, `makeDiscoveryCommand`, `makeNotificationsCommand`) are already imported and registered
- `packages/sdk/src/resources/SocialResource.ts` — `follow(id)`, `unfollow(id)`, `followers(id, params?)`, `following(id, params?)` signatures; all take `UserId` branded type
- `packages/sdk/src/resources/DiscoveryResource.ts` — `search(params)`, `trending(params?)`, `suggested(params?)` signatures; search takes `SearchParams { query, type?, cursor?, limit? }`
- `packages/sdk/src/resources/NotificationsResource.ts` — `list(params?)`, `markRead(ids?)` signatures; both return `Promise<PaginatedList<Notification>>` and `Promise<void>` respectively
- `packages/sdk/src/types/domain.ts` — `UserId`, `NotificationId` branded types; `asUserId`, `asNotificationId` factory functions
- `packages/sdk/src/index.ts` — confirms `asUserId`, `asNotificationId` are exported from `@heylol/sdk`
- `packages/cli/package.json` — `bin: { heylol: "dist/cli.mjs" }`, `files: ["dist"]`, `dependencies: { "@heylol/sdk": "workspace:*" }`
- `packages/cli/tsup.config.ts` — `external: ['conf']`; `@heylol/sdk` is NOT in external list, so it IS treated as external by default (not bundled); confirmed by inspecting `dist/cli.mjs` which has `import ... from "@heylol/sdk"`
- `npm info @heylol/sdk` — **confirmed: `@heylol/sdk@1.0.0` is already live on npm registry** (published 10 hours ago by rawgroundbeef)
- `npm info heylol` → 404 — **confirmed: `heylol` CLI is NOT yet on npm**; `1.0.0` is available
- `npm publish --dry-run` from `packages/cli/` — **passes clean** (no warnings, no errors in current state)
- `.changeset/config.json` — `"access": "public"` for all packages
- `pnpm-workspace.yaml` — workspace package structure

### Secondary (MEDIUM confidence)

- pnpm documentation behavior: `pnpm publish` rewrites `workspace:*` protocol to the actual resolved version in the tarball's `package.json`. Verified by comparing pnpm and npm dry-run package sizes (pnpm tarball: `557B` vs npm tarball: `568-570B` for package.json — size difference consistent with `workspace:*` string vs `1.0.0`).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries installed, all SDK methods confirmed typed correctly, all stubs inspected
- Architecture: HIGH — Phase 13 patterns are proven; stubs are identical in structure; complete replacement code provided
- Pitfalls: HIGH for CLI patterns (TypeScript enforced, argument access proven); HIGH for publish `workspace:*` issue (confirmed by npm vs pnpm dry-run comparison); MEDIUM for pnpm publish behavior (indirect evidence from tarball size difference, not inspected tarball content directly)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable stack; `@heylol/sdk@1.0.0` on npm is fixed; no ecosystem churn expected)
