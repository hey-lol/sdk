# Phase 13: Post and Profile Commands - Research

**Researched:** 2026-03-02
**Domain:** Commander.js CLI command implementation — thin wiring of `@heylol/sdk` PostsResource and ProfileResource into subcommands with structured JSON output
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POST-01 | User can create a post via `heylol posts create --content "text"` | `client.posts.create({ content })` in PostsResource — returns `Promise<Post>`; `--content` is already a `requiredOption` in the stub |
| POST-02 | User can reply to a post via `heylol posts reply <id> --content "text"` | `client.posts.reply(asPostId(id), { content })` in PostsResource — returns `Promise<Post>`; stub has both `<id>` argument and `--content` requiredOption |
| POST-03 | User can view a post via `heylol posts get <id>` | `client.posts.get(asPostId(id))` in PostsResource — returns `Promise<Post>`; stub has `<id>` argument |
| POST-04 | User can delete a post via `heylol posts delete <id>` | `client.posts.delete(asPostId(id))` in PostsResource — returns `Promise<void>` (204 No Content); stub has `<id>` argument; `printSuccess(undefined, opts)` produces `"OK"` in human mode or `null` in JSON mode |
| POST-05 | User can like a post via `heylol posts like <id>` | `client.posts.like(asPostId(id))` in PostsResource — returns `Promise<void>`; stub has `<id>` argument |
| POST-06 | User can unlike a post via `heylol posts unlike <id>` | `client.posts.unlike(asPostId(id))` in PostsResource — returns `Promise<void>`; stub has `<id>` argument |
| PROF-01 | User can view own profile via `heylol profile me` | `client.profile.me()` in ProfileResource — returns `Promise<Profile>`; stub has `me` subcommand |
| PROF-02 | User can view another user's profile via `heylol profile get <id>` | `client.profile.get(asUserId(id))` in ProfileResource — returns `Promise<Profile>`; stub has `<id>` argument |
| PROF-03 | User can update own profile via `heylol profile update` with name/bio/avatar/banner flags | `client.profile.update({ displayName?, bio?, avatarUrl?, bannerUrl? })` — all fields optional; stub has no options yet (must add them) |
</phase_requirements>

---

## Summary

Phase 13 is mechanically straightforward: replace seven `throw new Error('not implemented')` stubs in `commands/posts.ts` and three in `commands/profile.ts` with real implementations following the established pattern from `commands/auth.ts`. There is no new infrastructure to build — `config.ts` with `createClient()`, `output.ts` with `printSuccess`/`printFailure`, and the SDK resources are all complete and proven in Phase 12.

The two files requiring modification are exactly the existing stubs. Every command action follows the same four-line pattern: get opts via `optsWithGlobals()`, call `createClient(opts)`, await the SDK method, then `printSuccess` or `printFailure` in a try/catch. Branded ID types (`PostId`, `UserId`) require using `asPostId()` and `asUserId()` factory functions from `@heylol/sdk` to convert the raw string arguments coming from Commander.

The only non-trivial decision is `profile update` options: the stub has no options at all. All four `UpdateProfileParams` fields (`displayName`, `bio`, `avatarUrl`, `bannerUrl`) must be added as optional CLI flags, and at least one must be provided to make a meaningful call. The phase requirements and success criteria specify `--name` and `--bio` flags specifically (`heylol profile update --name "Alice" --bio "dev"`), and PROF-03 also mentions `avatar` and `banner`. A guard is needed to ensure at least one flag is provided, or the command should send an empty patch and return the unchanged profile — the latter is simpler and less surprising.

**Primary recommendation:** Replace both stubs using `auth.ts` as the exact template. Add `import { asPostId, asUserId } from '@heylol/sdk'` for ID coercion. For `profile update`, add four optional flags; send whatever fields were provided (empty object is valid — server returns unchanged profile). No new files, no new packages, no new infrastructure.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 14.0.3 (installed) | Subcommand routing, argument/option parsing | Already in use; stubs define the command tree already |
| @heylol/sdk | workspace:* | `PostsResource`, `ProfileResource`, branded ID types, error classes | All business logic lives here; CLI is a thin wrapper |
| picocolors | 1.1.x (installed) | Human-mode output coloring | Handled by `output.ts`; no direct use in command files |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| conf | 15.1.0 (installed) | Credential persistence | Used indirectly via `createClient()` from `config.ts` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `asPostId(id)` factory | raw `id as PostId` cast | Both work at runtime; `asPostId()` is the exported API and self-documenting |
| Optional `--name` flag for profile update | `--display-name` | Commander converts `--display-name` to camelCase `displayName` in opts; `--name` is shorter but `displayName` is the SDK field name — keep `--name` for CLI ergonomics, map to `displayName` in opts |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

This phase modifies two existing stub files only:

```
packages/cli/src/
├── index.ts              # No changes needed
├── context.ts            # No changes needed
├── output.ts             # No changes needed (complete from Phase 11)
├── config.ts             # No changes needed (complete from Phase 12)
└── commands/
    ├── auth.ts           # No changes needed (complete from Phase 12)
    ├── posts.ts          # REPLACE stubs: implement 6 subcommands
    └── profile.ts        # REPLACE stubs: implement 3 subcommands + add options
```

### Pattern 1: Standard Command Action Handler

**What:** The established pattern from `auth.ts`. Every action handler follows this exact structure.

**When to use:** Every command in this phase.

```typescript
// Source: packages/cli/src/commands/auth.ts (verified, complete, working)
// Template for all Phase 13 command actions

cmd
  .command('get')
  .description('Get a post by ID')
  .argument('<id>', 'post ID')
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext>();
    try {
      const client = createClient(opts);
      const post = await client.posts.get(asPostId(opts.args[0]));
      // NOTE: argument values come from action function parameters, not opts
      printSuccess(post, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

**IMPORTANT — argument access pattern:** Commander passes positional arguments as parameters to the action handler, NOT via `opts`. The correct signature is:

```typescript
// Source: commander@14 API — argument values as action function parameters
.action(async function (this: Command, id: string) {
  const opts = this.optsWithGlobals<GlobalContext>();
  try {
    const client = createClient(opts);
    const post = await client.posts.get(asPostId(id));
    printSuccess(post, opts);
  } catch (err) {
    printFailure(err, opts);
  }
});
```

This is the correct approach: named parameters in the action function receive positional arguments in declaration order. Do NOT use `this.args` or `opts.args`.

### Pattern 2: Branded ID Coercion

**What:** Raw string from CLI argument → branded SDK type via factory function.

**When to use:** Any command taking a post ID or user ID argument.

```typescript
// Source: packages/sdk/src/types/domain.ts (verified)
// Source: packages/sdk/src/index.ts — asPostId, asUserId are exported value functions

import { asPostId, asUserId } from '@heylol/sdk';

// In a posts command action:
const post = await client.posts.get(asPostId(id));

// In a profile command action:
const profile = await client.profile.get(asUserId(id));
```

`asPostId` and `asUserId` are simple casts (`s as PostId`) — zero runtime overhead, purely TypeScript safety.

### Pattern 3: void-returning Commands

**What:** `delete`, `like`, and `unlike` all return `Promise<void>` (SDK maps 204 No Content to `undefined`). The output.ts `printSuccess` handles `undefined` data gracefully.

**When to use:** `posts delete`, `posts like`, `posts unlike`.

```typescript
// Source: packages/cli/src/output.ts (verified — printHuman checks null/undefined)
// Source: packages/sdk/src/resources/PostsResource.ts — delete/like/unlike return Promise<void>

// printHuman in output.ts (lines 47-54):
// if (data === null || data === undefined) {
//   process.stdout.write(pc.green('OK') + '\n');
// }

// In JSON mode, JSON.stringify(undefined) produces undefined (not printed),
// but the HeyLolClient returns undefined for 204 — printSuccess handles it.

await client.posts.delete(asPostId(id));
printSuccess(undefined, opts);  // human: "OK\n", JSON: "null\n" (JSON.stringify(undefined) → undefined → null fallback needed)
```

**Clarification on JSON output for void commands:** `JSON.stringify(undefined)` returns `undefined` (not a string), so `process.stdout.write(JSON.stringify(undefined, null, 2) + '\n')` would write `"undefined\n"`. Check `output.ts` printSuccess carefully — it passes data directly to `JSON.stringify`. For void commands, `null` may be more appropriate to pass to `printSuccess` for clean JSON output (`JSON.stringify(null)` → `"null"`). However, `printSuccess(undefined, opts)` as used in auth.ts for void-returning operations is the established pattern — verify what the actual output is.

**Actual behavior in output.ts (lines 78-84):**
```typescript
export function printSuccess(data: unknown, opts: OutputOpts = {}): void {
  if (isHumanMode(opts)) {
    printHuman(data);        // undefined → "OK\n" (green)
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    // JSON.stringify(undefined) === undefined, so this writes "undefined\n"
    // This is a known behavior — check if any prior command handles void differently
  }
}
```

For JSON mode with `undefined`, `JSON.stringify(undefined, null, 2)` returns `undefined` (the JS value, not the string). String concatenation `undefined + '\n'` produces `"undefined\n"`. This is likely a minor bug in the output layer for 204 responses. Pass `null` explicitly for void commands to get clean `null` JSON output: `printSuccess(null, opts)`.

### Pattern 4: profile update — Optional Flag Handling

**What:** `profile update` needs four optional CLI flags mapping to `UpdateProfileParams`. The stub has no options — they must be added.

**When to use:** `heylol profile update` subcommand.

```typescript
// Source: packages/sdk/src/types/params.ts (verified)
// UpdateProfileParams: { displayName?: string; bio?: string; avatarUrl?: string; bannerUrl?: string }

// Success criteria specifies: heylol profile update --name "Alice" --bio "dev"
// Note: --name maps to displayName in UpdateProfileParams

cmd
  .command('update')
  .description('Update your profile')
  .option('--name <string>', 'display name')
  .option('--bio <string>', 'profile bio')
  .option('--avatar <url>', 'avatar image URL')
  .option('--banner <url>', 'banner image URL')
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & {
      name?: string;
      bio?: string;
      avatar?: string;
      banner?: string;
    }>();
    try {
      const client = createClient(opts);
      const params: UpdateProfileParams = {};
      if (opts.name !== undefined) params.displayName = opts.name;
      if (opts.bio !== undefined) params.bio = opts.bio;
      if (opts.avatar !== undefined) params.avatarUrl = opts.avatar;
      if (opts.banner !== undefined) params.bannerUrl = opts.banner;
      const profile = await client.profile.update(params);
      printSuccess(profile, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

**Flag name mapping:** The SDK uses `displayName` but the success criteria specifies `--name`. Commander converts kebab-case to camelCase but `--name` → `opts.name` (simple). Map `opts.name` → `params.displayName` in the action handler.

**Empty params behavior:** Sending `PATCH /profile/me` with `{}` is valid — the server returns the unchanged profile. No guard needed for "at least one field" unless the phase requirements explicitly call for an error. They do not.

### Anti-Patterns to Avoid

- **Arrow functions for action handlers:** `async () => {}` loses `this` binding. MUST use `async function (this: Command)` to call `optsWithGlobals()`.
- **Accessing arguments via `opts` or `this.args`:** Commander passes positional arguments as named parameters to the action callback. Declare them: `.action(async function (this: Command, id: string) {...})`.
- **Forgetting `asPostId()` / `asUserId()` wrapping:** The SDK resource methods require branded types. Passing a raw `string` where `PostId` is expected causes a TypeScript compile error.
- **Calling `printSuccess` without try/catch:** Any async SDK method can throw. Every action handler MUST wrap in try/catch with `printFailure(err, opts)` in the catch block.
- **Missing `await` on void SDK methods:** `delete`, `like`, `unlike` return promises. Forgetting `await` means the handler returns before the operation completes.
- **Using `console.log` / `console.error`:** All output MUST go through `printSuccess` / `printFailure` / `printBadArgs` from `output.ts`. This is enforced by the output contract established in Phase 11.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID type safety | Custom `PostId = string` alias or manual cast | `asPostId()` from `@heylol/sdk` | SDK already exports factory functions; branded types prevent PostId/UserId confusion at compile time |
| API call logic | Raw `fetch` calls | `client.posts.*` / `client.profile.*` | SDK handles auth, retries, 402 payment flow, error mapping |
| Error exit codes | `process.exit(N)` in catch blocks | `printFailure(err, opts)` | output.ts `resolveExitCode` already maps SDK error types to correct exit codes |
| Output formatting | Direct `console.log` / `JSON.stringify` calls | `printSuccess(data, opts)` | output.ts handles TTY detection, --json/--human flags, and null/undefined data |
| Client construction | `new HeyLolClient({ privateKey: ... })` in each command | `createClient(opts)` from `config.ts` | config.ts handles key resolution priority chain (env var wins) and AuthError on missing credentials |

**Key insight:** This phase is pure wiring — zero new infrastructure. Every problem is already solved by Phase 11 (output.ts), Phase 12 (config.ts + SDK patterns). Each command is 6-8 lines of action handler code.

---

## Common Pitfalls

### Pitfall 1: Argument Access in Action Handler

**What goes wrong:** `const opts = this.optsWithGlobals<GlobalContext>(); const id = opts.id` — `opts` does not contain positional argument values. `opts.id` is `undefined`.

**Why it happens:** Commander separates positional arguments (from `.argument()`) and options (from `.option()`/`.requiredOption()`). `optsWithGlobals()` only returns options.

**How to avoid:** Declare arguments as parameters in the action callback:
```typescript
.action(async function (this: Command, id: string) {
  // id is the value of the <id> argument
})
```

**Warning signs:** TypeScript `opts.id` is typed as `any` or `undefined`; runtime behavior is that the ID is never sent to the SDK and the call uses an empty string.

### Pitfall 2: void Command JSON Output

**What goes wrong:** `printSuccess(undefined, opts)` in non-TTY mode writes `"undefined\n"` to stdout (because `JSON.stringify(undefined)` returns the JS `undefined` value, and string concatenation coerces it to the string `"undefined"`).

**Why it happens:** `JSON.stringify(undefined, null, 2)` is `undefined` in JavaScript. The `+` operator then coerces to string `"undefined"`.

**How to avoid:** Pass `null` instead of `undefined` to `printSuccess` for void-returning SDK methods:
```typescript
await client.posts.delete(asPostId(id));
printSuccess(null, opts);  // JSON: "null\n", human: "OK\n"
```

`printHuman` already handles `null` as `"OK\n"` (line 48-50 in output.ts: `if (data === null || data === undefined)`). JSON output of `null` is clean and parseable.

**Warning signs:** `heylol posts delete <id> | jq .` fails with parse error; stdout contains the literal string `"undefined"`.

### Pitfall 3: TypeScript Branded Type Mismatch

**What goes wrong:** Passing a raw `string` where `PostId` is required:
```typescript
const post = await client.posts.get(id);  // TypeScript error: Argument of type 'string' is not assignable to parameter of type 'PostId'
```

**Why it happens:** `PostId` is a branded type — `string & { readonly [__brand]: 'PostId' }`. Raw strings do not satisfy this.

**How to avoid:** Always wrap CLI argument strings with the appropriate factory:
```typescript
const post = await client.posts.get(asPostId(id));
const profile = await client.profile.get(asUserId(id));
```

**Warning signs:** TypeScript compile error `Argument of type 'string' is not assignable to parameter of type 'PostId'`.

### Pitfall 4: Missing UpdateProfileParams Import

**What goes wrong:** `const params: UpdateProfileParams = {}` fails TypeScript if `UpdateProfileParams` is not imported.

**Why it happens:** `profile.ts` currently has no SDK imports at all. The type must be imported alongside the factory functions.

**How to avoid:** Import everything needed at the top of each command file:
```typescript
// posts.ts
import { asPostId } from '@heylol/sdk';

// profile.ts
import { asUserId } from '@heylol/sdk';
import type { UpdateProfileParams } from '@heylol/sdk';
```

**Warning signs:** TypeScript `Cannot find name 'UpdateProfileParams'` error.

### Pitfall 5: Forgetting async on Action Handlers

**What goes wrong:** Action handler declared as `function (this: Command, id: string)` (not `async`), then `await` used inside — TypeScript error; or worse, the promise is returned without being awaited.

**Why it happens:** All SDK resource methods return `Promise<T>`. `await` requires `async`.

**How to avoid:** Always declare action handlers as `async function (this: Command, ...)`. Every handler in this phase awaits at least one SDK call.

---

## Code Examples

Verified patterns from the installed codebase:

### posts create — returns Post

```typescript
// Source: packages/sdk/src/resources/PostsResource.ts line 75
// Source: packages/sdk/src/types/params.ts — CreatePostParams { content: string }
// Source: packages/cli/src/commands/auth.ts — established action handler pattern

import { Command } from 'commander';
import { asPostId } from '@heylol/sdk';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printSuccess, printFailure } from '../output.js';

cmd
  .command('create')
  .description('Create a new post')
  .requiredOption('--content <text>', 'post content')
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & { content: string }>();
    try {
      const client = createClient(opts);
      const post = await client.posts.create({ content: opts.content });
      printSuccess(post, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### posts reply — takes <id> argument + --content option

```typescript
// Source: packages/sdk/src/resources/PostsResource.ts line 169
// Note: reply takes PostId + ReplyPostParams { content: string }

cmd
  .command('reply')
  .description('Reply to a post')
  .argument('<id>', 'post ID')
  .requiredOption('--content <text>', 'reply content')
  .action(async function (this: Command, id: string) {
    const opts = this.optsWithGlobals<GlobalContext & { content: string }>();
    try {
      const client = createClient(opts);
      const reply = await client.posts.reply(asPostId(id), { content: opts.content });
      printSuccess(reply, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### posts get — takes <id> argument, returns Post

```typescript
// Source: packages/sdk/src/resources/PostsResource.ts line 94

cmd
  .command('get')
  .description('Get a post by ID')
  .argument('<id>', 'post ID')
  .action(async function (this: Command, id: string) {
    const opts = this.optsWithGlobals<GlobalContext>();
    try {
      const client = createClient(opts);
      const post = await client.posts.get(asPostId(id));
      printSuccess(post, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### posts delete / like / unlike — void return

```typescript
// Source: packages/sdk/src/resources/PostsResource.ts lines 112, 130, 148
// All return Promise<void> (SDK maps 204 No Content to undefined)
// Pass null to printSuccess for clean JSON output

cmd
  .command('delete')
  .description('Delete a post')
  .argument('<id>', 'post ID')
  .action(async function (this: Command, id: string) {
    const opts = this.optsWithGlobals<GlobalContext>();
    try {
      const client = createClient(opts);
      await client.posts.delete(asPostId(id));
      printSuccess(null, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });

// like and unlike follow the identical pattern with client.posts.like / client.posts.unlike
```

### profile me — no arguments

```typescript
// Source: packages/sdk/src/resources/ProfileResource.ts line 52
// Already proven in auth verify: client.profile.me() returns Promise<Profile>

cmd
  .command('me')
  .description('View your own profile')
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
```

### profile get — takes <id> argument

```typescript
// Source: packages/sdk/src/resources/ProfileResource.ts line 71
// Note: asUserId not asPostId

import { asUserId } from '@heylol/sdk';

cmd
  .command('get')
  .description('View a user profile')
  .argument('<id>', 'user ID')
  .action(async function (this: Command, id: string) {
    const opts = this.optsWithGlobals<GlobalContext>();
    try {
      const client = createClient(opts);
      const profile = await client.profile.get(asUserId(id));
      printSuccess(profile, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### profile update — optional flags, builds partial params object

```typescript
// Source: packages/sdk/src/types/params.ts — UpdateProfileParams
// Source: packages/sdk/src/resources/ProfileResource.ts line 94 — PATCH /profile/me

import type { UpdateProfileParams } from '@heylol/sdk';

cmd
  .command('update')
  .description('Update your profile')
  .option('--name <string>', 'display name')
  .option('--bio <string>', 'profile bio')
  .option('--avatar <url>', 'avatar image URL')
  .option('--banner <url>', 'banner image URL')
  .action(async function (this: Command) {
    const opts = this.optsWithGlobals<GlobalContext & {
      name?: string;
      bio?: string;
      avatar?: string;
      banner?: string;
    }>();
    try {
      const client = createClient(opts);
      const params: UpdateProfileParams = {};
      if (opts.name !== undefined) params.displayName = opts.name;
      if (opts.bio !== undefined) params.bio = opts.bio;
      if (opts.avatar !== undefined) params.avatarUrl = opts.avatar;
      if (opts.banner !== undefined) params.bannerUrl = opts.banner;
      const profile = await client.profile.update(params);
      printSuccess(profile, opts);
    } catch (err) {
      printFailure(err, opts);
    }
  });
```

### Complete posts.ts replacement

```typescript
// packages/cli/src/commands/posts.ts
import { Command } from 'commander';
import { asPostId } from '@heylol/sdk';
import { createClient } from '../config.js';
import type { GlobalContext } from '../context.js';
import { printSuccess, printFailure } from '../output.js';

export function makePostsCommand(): Command {
  const cmd = new Command('posts').description('Manage posts');

  cmd
    .command('list')
    .description('List posts in your feed')
    .option('--cursor <string>', 'cursor for next page')
    .option('--limit <number>', 'items per page (default 20, max 100)', parseInt)
    .action(() => { throw new Error('not implemented'); });  // Phase 14

  cmd
    .command('create')
    .description('Create a new post')
    .requiredOption('--content <text>', 'post content')
    .action(async function (this: Command) {
      const opts = this.optsWithGlobals<GlobalContext & { content: string }>();
      try {
        const client = createClient(opts);
        const post = await client.posts.create({ content: opts.content });
        printSuccess(post, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('get')
    .description('Get a post by ID')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        const post = await client.posts.get(asPostId(id));
        printSuccess(post, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('delete')
    .description('Delete a post')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.posts.delete(asPostId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('like')
    .description('Like a post')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.posts.like(asPostId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('unlike')
    .description('Unlike a post')
    .argument('<id>', 'post ID')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext>();
      try {
        const client = createClient(opts);
        await client.posts.unlike(asPostId(id));
        printSuccess(null, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  cmd
    .command('reply')
    .description('Reply to a post')
    .argument('<id>', 'post ID')
    .requiredOption('--content <text>', 'reply content')
    .action(async function (this: Command, id: string) {
      const opts = this.optsWithGlobals<GlobalContext & { content: string }>();
      try {
        const client = createClient(opts);
        const reply = await client.posts.reply(asPostId(id), { content: opts.content });
        printSuccess(reply, opts);
      } catch (err) {
        printFailure(err, opts);
      }
    });

  return cmd;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `fetch` in CLI | SDK resource methods (`client.posts.create()`) | SDK-first architecture | CLI has zero HTTP knowledge; all edge cases (auth, retries, 402) are in SDK |
| `process.argv[N]` for argument parsing | Commander `.argument('<id>')` with named action param | Modern CLI frameworks | Type-safe argument declarations; automatic `--help` generation |
| `console.log(JSON.stringify(result))` | `printSuccess(result, opts)` | Phase 11 output infrastructure | TTY detection, --json/--human flags, consistent error format |
| Direct `process.exit(N)` | `printFailure(err, opts)` returning `never` | Phase 11 output infrastructure | Exit codes derived from SDK error types; TypeScript knows no code follows |

**Deprecated/outdated:**
- `throw new Error('not implemented')` in action handlers: These are the stubs this phase replaces. They exist in `posts.ts` and `profile.ts` for all non-`list` subcommands.
- Arrow functions for Commander action handlers: `() => {}` loses `this` context needed for `optsWithGlobals()`.

---

## Open Questions

1. **Should void commands (`delete`, `like`, `unlike`) pass `null` or `undefined` to `printSuccess`?**
   - What we know: `printHuman` checks `data === null || data === undefined` and outputs `"OK\n"` for both. `JSON.stringify(undefined)` returns JS `undefined`, causing `"undefined\n"` string output. `JSON.stringify(null)` returns `"null"` — valid JSON.
   - What's unclear: Whether any downstream tooling (agent scripts, tests) would break on `"undefined\n"` vs `"null\n"`.
   - Recommendation: Pass `null` for void commands. It's parseable JSON, semantically appropriate for "no data", and avoids the `undefined` serialization edge case. Both human and JSON modes handle it correctly.

2. **Should `profile update` guard against empty params (no flags provided)?**
   - What we know: The SDK sends `PATCH /profile/me` with `{}` and the server returns the unchanged profile. This is valid behavior and matches success criteria exactly.
   - What's unclear: Whether a user who runs `heylol profile update` with no flags expects an error or a no-op.
   - Recommendation: Allow empty update — return unchanged profile. No guard. Simpler code, less surprising behavior, and the success criteria only tests that flags work, not that empty fails.

3. **What is the `posts list` stub status?**
   - What we know: `posts.ts` has a `list` subcommand stub with `--cursor` and `--limit` options but `throw new Error('not implemented')`. Phase 13 requirements do not include a `list` requirement ID.
   - What's unclear: Whether Phase 13 should implement `list` or leave it for a later phase.
   - Recommendation: Leave `list` as `throw new Error('not implemented')` — it is not in the Phase 13 requirement IDs (POST-01 through POST-06 cover create/reply/get/delete/like/unlike only). Implement only the six required commands.

---

## Sources

### Primary (HIGH confidence)

- `packages/cli/src/commands/posts.ts` — existing stub with command structure, option declarations, and argument names
- `packages/cli/src/commands/profile.ts` — existing stub with command structure
- `packages/cli/src/commands/auth.ts` — complete working implementation; the canonical template for Phase 13 patterns
- `packages/cli/src/output.ts` — `printSuccess`, `printFailure`, `printBadArgs` signatures and behaviors; `printHuman` null/undefined handling
- `packages/cli/src/config.ts` — `createClient()` function signature and behavior
- `packages/cli/src/context.ts` — `GlobalContext` interface (baseUrl, debug, human, json)
- `packages/sdk/src/resources/PostsResource.ts` — all six post methods with signatures and return types
- `packages/sdk/src/resources/ProfileResource.ts` — all three profile methods with signatures and return types
- `packages/sdk/src/types/domain.ts` — `Post`, `Profile`, `PostId`, `UserId` types; `asPostId`, `asUserId` factory functions
- `packages/sdk/src/types/params.ts` — `CreatePostParams`, `ReplyPostParams`, `UpdateProfileParams`
- `packages/sdk/src/index.ts` — confirms `asPostId`, `asUserId`, `UpdateProfileParams` are all exported from `@heylol/sdk`
- `packages/cli/src/index.ts` — confirms `makePostsCommand` and `makeProfileCommand` are already registered on the program

### Secondary (MEDIUM confidence)

- Commander.js documented behavior: positional arguments passed as action function parameters in declaration order (consistent with observed stub structure and the existing `auth.ts` pattern)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries installed, all SDK methods confirmed present and typed
- Architecture: HIGH — `auth.ts` is a proven working template; all patterns are derived from codebase inspection, not assumptions
- Pitfalls: HIGH for branded ID types (TypeScript enforced), argument access pattern (Commander API), and void output (JS behavior of `JSON.stringify(undefined)`); MEDIUM for empty `profile update` behavior (server behavior assumed to return 200 with unchanged profile — not verified against a live server)

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable stack; no ecosystem churn expected)
