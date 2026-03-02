# Phase 9: Size-Limit Fix & Tech Debt Cleanup - Research

**Researched:** 2026-03-02
**Domain:** Bundle size enforcement, TypeScript public API surface, documentation correctness, planning-doc frontmatter auditing
**Confidence:** HIGH

## Summary

Phase 9 is a cleanup and correctness phase with five discrete, surgically scoped tasks that have no mutual dependencies. Each success criterion maps 1:1 to a concrete file change. No new libraries are needed, no architecture decisions are open, and no external tooling research is required beyond confirming the behavior of the existing `size-limit` and `tsup` configuration.

The root cause of the CI failure is that `.size-limit.json` still references `packages/sdk/dist/services.mjs`, a file that no longer exists after Phase 8 removed the `@heylol/sdk/services` subpath entirely. The fix is a one-line deletion from `.size-limit.json`. The remaining four tasks are documentation and public-API correctness fixes: two SUMMARY.md frontmatter fields, two leaked internal exports, and one misleading README label.

**Primary recommendation:** Execute five independent, minimal edits. No install steps, no refactoring, no new files. Each edit has a clear before/after that can be verified immediately after the change.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-06 | size-limit enforces < 100 KB core bundle | `.size-limit.json` currently references a non-existent `services.mjs` file, causing `pnpm turbo size-check` to fail. Fix: remove the stale entry. The remaining entry (`packages/sdk/dist/index.mjs`) already enforces the 100 kB limit. No `size-limit` version or config-schema changes needed. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `size-limit` | `latest` (workspace root devDep) | Bundle size enforcement via `.size-limit.json` | Already installed and configured; no changes needed |
| `@size-limit/preset-big-lib` | `latest` (workspace root devDep) | Preset that provides bundler + minifier for library bundles | Already installed; preset used by existing config |
| `tsup` | `catalog:` (sdk devDep) | Bundles TypeScript packages to `dist/` | Already used; dist output is the input to size-limit |
| `turbo` | `latest` (workspace root devDep) | Runs `size-check` task with `dependsOn: ["build"]` | Already configured in `turbo.json` |

### Supporting
No additional libraries need to be installed for this phase.

### Alternatives Considered
None — all tooling is already in place.

---

## Architecture Patterns

### Pattern 1: size-limit Configuration (`.size-limit.json`)

**What:** A JSON array at the workspace root, each entry specifying a `path` (dist file) and `limit`. The `import: "*"` field tells size-limit to measure the full tree-shaken bundle.

**Current state (broken):**
```json
[
  {
    "path": "packages/sdk/dist/index.mjs",
    "limit": "100 kB",
    "import": "*"
  },
  {
    "path": "packages/sdk/dist/services.mjs",
    "limit": "100 kB",
    "import": "*"
  }
]
```

**Required state (fixed):**
```json
[
  {
    "path": "packages/sdk/dist/index.mjs",
    "limit": "100 kB",
    "import": "*"
  }
]
```

**Why:** `packages/sdk/dist/services.mjs` was removed when Phase 8 deleted the `@heylol/sdk/services` subpath. `size-limit` throws an error when a configured path does not exist. The `index.mjs` entry remains unchanged and continues to enforce the 100 kB limit for INFRA-06.

**Verification command:**
```bash
pnpm turbo size-check
```
Must exit 0.

---

### Pattern 2: Removing Leaked Exports from `src/index.ts`

**What:** The public barrel file at `packages/sdk/src/index.ts` is the sole source of the `@heylol/sdk` public API. Symbols not listed there are not exported. Two internal symbols currently appear in the public barrel and must be removed.

**Symbol 1 — `encodeCompactU16`:**
- Location: `packages/sdk/src/auth/solana.ts` (exported from file)
- Re-exported via: `packages/sdk/src/auth/index.ts` line 3
- Leaked into public API via: `packages/sdk/src/index.ts` line 6 (via `from './auth/index.js'`)

`encodeCompactU16` is a Solana wire-format encoding helper used internally by `buildDummyTransaction`. It is an implementation detail of the x402 auth flow with no consumer-facing use case.

The leak path is: `src/index.ts` imports from `./auth/index.js`, which re-exports `encodeCompactU16` from `./solana.js`. Removing `encodeCompactU16` from the `auth/index.ts` re-export OR removing it from the `src/index.ts` named-export block fixes the leak. The cleanest fix is to remove it from `src/auth/index.ts` (internal barrel) since no consumer-facing code needs it there, and to also remove it from `src/index.ts` if it appears there explicitly.

**Confirmed current `src/index.ts` state** (lines 5-12):
```typescript
export {
  buildDummyTransaction,
  buildPaymentHeader,
  getPaymentVersion,
  loadKeypair,
  PAYMENT_HEADERS,
  parsePaymentRequirements,
} from './auth/index.js';
```
`encodeCompactU16` is NOT listed in `src/index.ts` directly — it is re-exported via `src/auth/index.ts` which is imported as a namespace by tsup during bundling. Check: `src/auth/index.ts` line 3 has `export { buildDummyTransaction, encodeCompactU16 } from './solana.js';` — this means `encodeCompactU16` IS in the compiled output's exports unless the named-only import in `src/index.ts` prevents tree-shaking of unexported auth barrel members.

**Important clarification:** `src/index.ts` uses named imports from `./auth/index.js`, NOT `export * from './auth/index.js'`. This means only the explicitly-listed names (`buildDummyTransaction`, `buildPaymentHeader`, `getPaymentVersion`, `loadKeypair`, `PAYMENT_HEADERS`, `parsePaymentRequirements`) are re-exported from the public API. `encodeCompactU16` is NOT in that named list in `src/index.ts`. However, `src/auth/index.ts` re-exports it, making it importable via the internal barrel.

**Verification approach:** Check whether `encodeCompactU16` appears in the compiled `dist/index.mjs`. Since tsup bundles by following the explicit exports in `src/index.ts`, and that file does not list `encodeCompactU16`, it likely does NOT appear in the final bundle. The success criterion says "not exported from `@heylol/sdk` public API" — this needs to be verified against the actual dist output OR the source barrel.

**Safest fix:** Remove `encodeCompactU16` from `src/auth/index.ts` so it cannot be accidentally imported via any internal barrel path. This is the minimal, safe change.

**Symbol 2 — `PAYMENT_HEADERS`:**
- Location: `packages/sdk/src/auth/x402.ts` (exported from file)
- Re-exported via: `packages/sdk/src/auth/index.ts` lines 4-9
- Leaked into public API via: `packages/sdk/src/index.ts` line 10 (explicitly named: `PAYMENT_HEADERS`)

`PAYMENT_HEADERS` is a constant mapping of x402 protocol header name strings (`payment-required`, `payment-signature`, etc.). It is an internal implementation detail used by `getPaymentVersion`, `parsePaymentRequirements`, and `buildPaymentHeader`. Consumers have no reason to reference raw header names directly — they call the public functions.

**Fix:** Remove `PAYMENT_HEADERS` from the named-export block in `src/index.ts` (line 10). Also optionally remove from `src/auth/index.ts` to prevent internal re-use confusion, but the public API leak is solely driven by `src/index.ts`.

---

### Pattern 3: SUMMARY.md Frontmatter Auditing

**What:** Phase planning SUMMARY files carry a `requirements-completed` YAML frontmatter array. Two SUMMARY files are flagged as missing entries despite the work having been completed.

**04-02-SUMMARY.md — current state:** The frontmatter already contains `requirements-completed: [POST-01..07, PROF-01..04]` (verified in research). This criterion appears to already be satisfied. No change needed.

**06-02-SUMMARY.md — current state:** The frontmatter already contains `requirements-completed: [TYPE-04]` (verified in research). This criterion appears to already be satisfied. No change needed.

**Note to planner:** Both SUMMARY frontmatter criteria (success criteria 2 and 3) appear to already be met based on direct file inspection. Verification tasks should confirm this, not assume changes are needed.

---

### Pattern 4: README `retryAfterMs` Label Fix

**What:** The README error-handling example on line 171 reads:
```typescript
console.error(`Rate limited. Retry after ${err.retryAfterMs}s`);
```

The `s` suffix implies the value is in seconds, but `RateLimitError.retryAfterMs` (confirmed in `packages/sdk/src/errors/index.ts`) is in milliseconds. The misleading suffix will cause developers to display incorrect values (e.g., displaying 5000 when the actual wait is 5 seconds, making it look like 5000 seconds).

**Fix options:**
1. Change suffix `s` to `ms`: `Retry after ${err.retryAfterMs}ms` — correct, minimal
2. Convert to seconds: `Retry after ${err.retryAfterMs / 1000}s` — correct, user-friendly

**Recommendation:** Use option 2 (`${err.retryAfterMs / 1000}s`) — it's the most natural display format for end users seeing "Rate limited. Retry after 5s", which is what a developer would actually want to log. This is consistent with how Retry-After headers are typically shown to users.

**Actual fix location:** `README.md` line 171.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Checking if dist file exists before size-limit runs | Custom pre-check script | Just fix `.size-limit.json` | size-limit already validates paths; the error is the signal |
| New barrel structure for internal auth exports | Reorganized src/ | Simple named-export removal from existing files | Minimal blast radius, no downstream import breakage |

---

## Common Pitfalls

### Pitfall 1: Over-removing from auth barrel
**What goes wrong:** Removing `encodeCompactU16` from `src/auth/index.ts` may break internal imports if any other file within the package imports it from the barrel rather than from `./solana.js` directly.
**Why it happens:** Internal files sometimes import from the barrel for convenience.
**How to avoid:** Before removing from `src/auth/index.ts`, grep for `from './auth/index'` or `from '../auth/index'` usage of `encodeCompactU16` anywhere in the package.
**Verification:** `grep -r "encodeCompactU16" packages/sdk/src/` — currently only `solana.ts` (definition) and `auth/index.ts` (re-export). No other file imports it from the barrel.

### Pitfall 2: Removing PAYMENT_HEADERS from auth/index.ts prematurely
**What goes wrong:** `PAYMENT_HEADERS` is used internally in `x402.ts` directly (not via barrel import). Removing from `auth/index.ts` only removes the barrel re-export, not internal usage. The actual public leak is via `src/index.ts` named export.
**How to avoid:** The minimal safe fix is removing `PAYMENT_HEADERS` from `src/index.ts` only. Removing from `auth/index.ts` is optional cleanup.

### Pitfall 3: Assuming SUMMARY frontmatter needs updating when it already has the data
**What goes wrong:** Creating unnecessary edits to files that already satisfy the criteria, introducing diff noise.
**How to avoid:** Verify current frontmatter state first (already done in research — both files have the required fields).

### Pitfall 4: services.mjs entry removal breaks something else
**What goes wrong:** Some other CI step or script might reference the services size-limit entry.
**How to avoid:** The only consumer of `.size-limit.json` is the `size-check` script in root `package.json` which calls `size-limit` directly. `turbo.json` runs `size-check` but doesn't reference dist paths. No other config files reference `services.mjs`.

---

## Code Examples

### Fix 1: .size-limit.json (remove stale entry)

```json
// File: .size-limit.json (workspace root)
// BEFORE:
[
  { "path": "packages/sdk/dist/index.mjs", "limit": "100 kB", "import": "*" },
  { "path": "packages/sdk/dist/services.mjs", "limit": "100 kB", "import": "*" }
]

// AFTER:
[
  { "path": "packages/sdk/dist/index.mjs", "limit": "100 kB", "import": "*" }
]
```

### Fix 2: Remove encodeCompactU16 from auth/index.ts

```typescript
// File: packages/sdk/src/auth/index.ts
// BEFORE:
export { buildDummyTransaction, encodeCompactU16 } from './solana.js';

// AFTER:
export { buildDummyTransaction } from './solana.js';
```

### Fix 3: Remove PAYMENT_HEADERS from src/index.ts

```typescript
// File: packages/sdk/src/index.ts
// BEFORE:
export {
  buildDummyTransaction,
  buildPaymentHeader,
  getPaymentVersion,
  loadKeypair,
  PAYMENT_HEADERS,
  parsePaymentRequirements,
} from './auth/index.js';

// AFTER:
export {
  buildDummyTransaction,
  buildPaymentHeader,
  getPaymentVersion,
  loadKeypair,
  parsePaymentRequirements,
} from './auth/index.js';
```

### Fix 4: README retryAfterMs label

```typescript
// File: README.md (line 171)
// BEFORE:
console.error(`Rate limited. Retry after ${err.retryAfterMs}s`);

// AFTER:
console.error(`Rate limited. Retry after ${err.retryAfterMs / 1000}s`);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@heylol/sdk/services` subpath with SERVICES_VERSION constant | Subpath removed entirely (Phase 8) | Phase 8 | `.size-limit.json` still references the now-deleted `dist/services.mjs`, causing CI failure |
| `err.retryAfter` in README | `err.retryAfterMs` in README | Phase 7 (07-01) | Property name is now correct but unit suffix is wrong (`s` instead of `ms`) |

---

## Open Questions

1. **Is `encodeCompactU16` currently in the compiled dist/index.mjs?**
   - What we know: `src/index.ts` uses named imports, NOT `export *`, so only explicitly listed symbols appear in the public API barrel. `encodeCompactU16` is NOT in the named-export list of `src/index.ts`.
   - What's unclear: tsup may still include it in the bundle as a non-exported internal if it's reachable from `buildDummyTransaction`. Being in the bundle is different from being in the exports.
   - Recommendation: The success criterion is "not exported from public API" — this is satisfied by verifying it is not in `src/index.ts`'s named exports. The fix (removing from `auth/index.ts`) is still the right hygienic change regardless.

2. **Are both SUMMARY frontmatter criteria already satisfied?**
   - What we know: Direct inspection of `04-02-SUMMARY.md` and `06-02-SUMMARY.md` confirms both have the required `requirements-completed` entries.
   - Recommendation: Verification task should confirm and mark criteria as already passing, not attempt to re-edit the files.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `/Users/rawgroundbeef/Projects/heylol/.size-limit.json` — confirmed `services.mjs` stale entry
- Direct file inspection: `/Users/rawgroundbeef/Projects/heylol/packages/sdk/dist/` — confirmed `services.mjs` does not exist
- Direct file inspection: `/Users/rawgroundbeef/Projects/heylol/packages/sdk/src/index.ts` — confirmed `PAYMENT_HEADERS` explicitly listed, `encodeCompactU16` NOT listed
- Direct file inspection: `/Users/rawgroundbeef/Projects/heylol/packages/sdk/src/auth/index.ts` — confirmed `encodeCompactU16` re-exported from auth barrel
- Direct file inspection: `/Users/rawgroundbeef/Projects/heylol/packages/sdk/src/errors/index.ts` — confirmed `retryAfterMs` is in milliseconds (property name, JSDoc context)
- Direct file inspection: `/Users/rawgroundbeef/Projects/heylol/README.md` line 171 — confirmed `${err.retryAfterMs}s` (seconds suffix is wrong)
- Direct file inspection: `.planning/phases/04-api-wrappers/04-02-SUMMARY.md` — confirmed POST-01..07 and PROF-01..04 already in `requirements-completed`
- Direct file inspection: `.planning/phases/06-adapters-docs-and-release/06-02-SUMMARY.md` — confirmed TYPE-04 already in `requirements-completed`

### Secondary (MEDIUM confidence)
- None needed — all findings are from direct codebase inspection.

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing tooling, no new dependencies
- Architecture: HIGH — all changes are surgical edits to existing files with confirmed locations
- Pitfalls: HIGH — verified via grep that no other files depend on the symbols being removed
- SUMMARY frontmatter: HIGH — direct file inspection confirms both criteria already satisfied

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable — no fast-moving dependencies)
