# Phase 8: CI & Type Integrity - Research

**Researched:** 2026-03-01
**Domain:** GitHub Actions CI configuration, TypeScript package type alignment, pnpm monorepo tooling, package exports validation
**Confidence:** HIGH

## Summary

Phase 8 is a cleanup and hardening phase that resolves five concrete gaps discovered in the v1.0 milestone audit. Every gap has a known root cause, a verified fix strategy, and most issues are isolated to specific files. This is not an architectural rethink — it is surgical correction of CI configuration, a phantom dependency, a type field name divergence, and a misleading SDK subpath.

The highest-value work is the CI pnpm version mismatch and the expanded attw coverage. Both are one-line or few-line changes to `.github/workflows/ci.yml` and `.github/workflows/release.yml`. The PaymentRequirements type inconsistency is the most technically interesting problem: the SDK's type was modeled on x402 v1 (`maxAmountRequired`), while x402 v2 and the services package use `amount`. Fixing it requires deciding the canonical field name and updating references.

The `@x402/core` phantom dependency and the vestigial `@heylol/sdk/services` subpath are removal tasks. The circular import in the client barrel is a two-line refactor. Every fix is independently deployable and none has broad blast radius.

**Primary recommendation:** Address each gap as a separate, atomic task. Do not combine the type fix with the CI fix — they have different risk profiles and different verification steps.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Monorepo configured with pnpm workspaces and turborepo | CI pnpm version fix ensures CI actually uses the version declared in packageManager field, making the monorepo config consistent end-to-end |
| INFRA-04 | Package.json exports map configured with correct types/import/require conditions | Removing the vestigial `./services` subpath from SDK exports map eliminates a misleading entry that exports only a version constant |
| INFRA-05 | publint and attw validate package exports in CI | Expanding attw to cover @heylol/services and all 3 adapter packages closes the gap where only @heylol/sdk was validated |
| AUTH-04 | SDK parses both x402 v1 and v2 response formats | PaymentRequirements type fix ensures the SDK's type reflects actual x402 v2 wire format (`amount` field) to prevent consumer confusion |
| SVC-01 | Developer can call an x402 service with typed input/output | @x402/core removal restores honest dependency declaration; the services package implements its own HTTP calls without needing @x402/core |
| SVC-02 | Developer can register a service with price and schema | Same as SVC-01 — removing phantom dependency doesn't change functionality |
| SVC-03 | Developer can verify incoming x402 payment headers | Same as SVC-01 |
| SVC-04 | Developer can settle payments on-chain | Same as SVC-01 |
| SVC-05 | Developer can generate 402 Payment Required responses | Same as SVC-01 |
| SVC-06 | Service handler wrapper (createX402Service) bundles verify + settle + handler | Same as SVC-01 |
| TYPE-01 | Full TypeScript types for all API methods, request params, and response objects | PaymentRequirements type alignment ensures the SDK's exported type matches the actual x402 v2 wire format that consumers receive |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm/action-setup | v4 | Install pnpm in GitHub Actions | Official pnpm GitHub Action; v4 supports reading version from `packageManager` field when `version` input is omitted |
| @arethetypeswrong/cli (attw) | ^0.18.2 | Validate package type exports across module resolution modes | Industry standard for detecting dual-package hazard and type resolution failures; already installed at workspace root |
| publint | ^0.3.17 | Validate package.json exports configuration | Catches mismatched file extensions, missing entry points; already installed at workspace root |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsup | ^8.5.1 | Bundle TypeScript packages | Already in use; only config changes needed when removing the services entry |
| TypeScript | ^5.7.0 | Type checking | Already in use; type changes verified via `tsc --noEmit` in each package |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Removing `@x402/core` from dependencies | Moving it to devDependencies | devDependencies makes more sense only if @x402/core types are used during development/testing. Since the source never imports it at all, full removal is correct. |
| Removing `./services` subpath | Making it re-export `@heylol/services` | Re-export requires adding `@heylol/services` as a dependency of `@heylol/sdk`, creating a circular workspace dependency. Removal is cleaner. |
| Adding `amount` to PaymentRequirements | Replacing `maxAmountRequired` with `amount` | Replacement is correct for v2 alignment; adding both creates confusing dual fields. See Architecture Patterns for the versioned union approach. |

## Architecture Patterns

### Pattern 1: pnpm/action-setup with packageManager Field

**What:** When `version:` is omitted from pnpm/action-setup@v4, it reads the pnpm version from the `packageManager` field in the root `package.json`.

**When to use:** Always when you have a `packageManager` field — keeps CI and local environments in sync automatically.

**Example:**
```yaml
# Source: https://github.com/pnpm/action-setup (official)
# BEFORE (broken — forces pnpm v9, ignores packageManager: pnpm@10.21.0):
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 9

# AFTER (correct — reads pnpm@10.21.0 from package.json):
- name: Setup pnpm
  uses: pnpm/action-setup@v4
```

### Pattern 2: attw Loop Over All Packages

**What:** Run `attw --pack .` for every publishable package, not just one.

**When to use:** Every time CI validates exports — must cover all packages that go to npm.

**Example:**
```yaml
# Current (incomplete):
echo "=== attw: packages/sdk ==="
pnpm --filter @heylol/sdk exec attw --pack .

# Fixed (complete):
for pkg in packages/*/; do
  echo "=== attw: $pkg ==="
  pnpm --filter "./$pkg" exec attw --pack .
done
```

### Pattern 3: PaymentRequirements Type Alignment with x402 v2

**What:** The x402 protocol has two versions with different field names for the payment amount:
- v1 wire format: `maxAmountRequired` (string, smallest unit)
- v2 wire format: `amount` (string)

The SDK's `PaymentRequirements` type currently uses `maxAmountRequired`, modeling v1. The services package builds v2 payment required objects using `amount`. These need to align.

**Verified x402 v2 PaymentRequirements from `@x402/core@2.5.0`:**
```typescript
// Source: packages/services/node_modules/@x402/core/dist/esm/mechanisms-B8kct0J5.d.mts
type PaymentRequirements = {
  scheme: string;
  network: Network;   // CAIP-2 string in v2
  asset: string;      // token mint address
  amount: string;     // NOT maxAmountRequired
  payTo: string;
  maxTimeoutSeconds: number;
  extra: Record<string, unknown>;
};

// v1 PaymentRequirements (also from @x402/core):
type PaymentRequirementsV1 = {
  scheme: string;
  network: Network;
  maxAmountRequired: string;   // v1 field name
  resource: string;
  description: string;
  mimeType: string;
  outputSchema: Record<string, unknown>;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: Record<string, unknown>;
};
```

**Recommended fix:** Update `PaymentRequirements` in `packages/sdk/src/types/x402.ts` to use `amount` for v2 alignment, and add `maxAmountRequired?: string` as an optional v1 field (or create a versioned union). Since `parsePaymentRequirements` handles both v1 and v2 parsing, the returned type needs to work for both cases.

**Simplest correct approach:** Use `amount` as the canonical field (v2 is the current standard) and add `maxAmountRequired?: string` as a deprecated/optional alias for v1 compatibility. This is non-breaking for consumers since the field was `maxAmountRequired` before (old code using `.maxAmountRequired` continues to work; new code uses `.amount`).

### Pattern 4: Removing a Phantom Dependency

**What:** `@x402/core` is listed as a production dependency in `@heylol/services/package.json` but is never imported in any source file. It's also listed in `tsup.config.ts` as `external`.

**Evidence:** Search of all `.ts` files in `packages/services/src/` returns zero hits for `@x402/core`. The services package implements verify/settle via direct HTTP calls to the facilitator — it does not use @x402/core's client library.

**Fix:** Remove `@x402/core` from `dependencies` in `packages/services/package.json`. Also remove it from `external` in `packages/services/tsup.config.ts` (it doesn't need to be externalized if it's not imported). Also remove it from `devDependencies` if present (it's in `devDependencies` as `zod: ^4.3.6` only, so no).

```json
// packages/services/package.json — BEFORE:
"dependencies": {
  "@x402/core": "^2.5.0"
}

// packages/services/package.json — AFTER:
"dependencies": {}
// or omit the field entirely if empty
```

### Pattern 5: Removing a Vestigial Subpath Export

**What:** `@heylol/sdk/services` exports only `export const SERVICES_VERSION = '1.0.0';` — this is misleading. A developer importing `@heylol/sdk/services` expecting service functionality gets a version constant.

**Fix requires three coordinated changes:**
1. Remove `services` entry from `entry` in `packages/sdk/tsup.config.ts`
2. Remove `"./services"` entry from `exports` in `packages/sdk/package.json`
3. Remove `typesVersions` from `packages/sdk/package.json` (it only exists to support the services subpath for node10 resolution)
4. Delete `packages/sdk/src/services.ts`

**Verification:** After these changes, `attw --pack .` must still pass for `@heylol/sdk`. Run it locally before committing.

### Pattern 6: Breaking a Circular Barrel Import

**What:** `packages/sdk/src/client/HeyLolClient.ts` line 39 imports from `'./index.js'`, which is the client barrel. The client barrel (`packages/sdk/src/client/index.ts`) re-exports `HeyLolClient`. This creates a cycle: `HeyLolClient.ts → client/index.ts → HeyLolClient.ts`.

**Why it works currently:** ESM and Node.js handle circular imports via lazy binding — by the time the circular reference is resolved at runtime, the class is already defined. But it's a latent hazard and makes the dependency graph unclear.

**Fix:** In `HeyLolClient.ts`, replace the barrel import with direct module imports:

```typescript
// BEFORE (line 39 in HeyLolClient.ts):
import { DEFAULT_OPTIONS, parseRetryAfterMs, withRetry } from './index.js';

// AFTER (direct imports, no cycle):
import { DEFAULT_OPTIONS } from './options.js';
import { parseRetryAfterMs, withRetry } from './retry.js';
```

### Anti-Patterns to Avoid

- **Adding a new subpath instead of removing**: Don't add `@heylol/sdk/services` re-exporting from `@heylol/services` — it creates a hard dependency between packages that should remain independent.
- **Keeping `@x402/core` in devDependencies "for types"**: The services package never imports @x402/core types either. Full removal is correct.
- **Making PaymentRequirements changes breaking**: Adding `amount` as required and removing `maxAmountRequired` is a breaking type change for any existing consumer using `.maxAmountRequired`. Use optional field + deprecation pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Package export validation | Custom script checking dist files | `attw --pack .` | attw handles all module resolution modes (node10, node16, bundler), CJS/ESM dual hazard detection, and type resolution |
| pnpm version enforcement | Custom CI script comparing versions | `pnpm/action-setup@v4` without `version:` input | Action reads `packageManager` field natively; no custom parsing needed |
| Detecting phantom dependencies | Grep-based import scanner | Check manually or use `depcheck` | For this phase, manual verification is sufficient since there is exactly one known phantom dependency |

**Key insight:** The tooling (attw, publint, pnpm/action-setup) already handles the hard problems. Every gap in this phase is a configuration gap, not a capability gap.

## Common Pitfalls

### Pitfall 1: Forgetting release.yml When Fixing ci.yml

**What goes wrong:** The pnpm version fix is applied to `ci.yml` but not to `release.yml`. Release workflows run pnpm v9, lockfile format v9 conflict with pnpm@10 behavior.

**Why it happens:** Both workflows have `version: 9` but reviewers often only check `ci.yml`.

**How to avoid:** Apply the pnpm version fix to BOTH `.github/workflows/ci.yml` and `.github/workflows/release.yml` in the same commit.

**Warning signs:** CI passes but release workflow fails with lockfile errors.

### Pitfall 2: Breaking typesVersions When Removing services Subpath

**What goes wrong:** The `typesVersions` field in `packages/sdk/package.json` is removed, but the `./services` entry in `exports` is left in place (or vice versa). `attw` will report a resolution failure.

**Why it happens:** Three changes need to happen together (tsup config, exports map, typesVersions) and it's easy to miss one.

**How to avoid:** After removing all three, run `pnpm --filter @heylol/sdk build` then `pnpm --filter @heylol/sdk exec attw --pack .` locally before committing.

**Warning signs:** `attw` shows a broken entry for `"@heylol/sdk/services"` after the removal.

### Pitfall 3: PaymentRequirements Type Change Doesn't Propagate

**What goes wrong:** `PaymentRequirements` type is updated in `packages/sdk/src/types/x402.ts`, but the SDK's `parsePaymentRequirements` still returns the old structure (the parsed JSON will have `amount` from v2 but the type says `maxAmountRequired`).

**Why it happens:** The type and the parser need to be updated together. The parser does a cast (`as { accepts: PaymentRequirements[] }`) without runtime field mapping.

**How to avoid:** For v2 responses, the parser reads `decoded.accepts` which has `amount` (not `maxAmountRequired`). If the TypeScript type now says `amount`, the cast is correct. If you keep `maxAmountRequired` in the type, the cast is correct for v1 but misleading for v2. The simplest correct fix is to update the type to match what the wire actually delivers, then update any SDK code that accesses `requirements.maxAmountRequired` to use `requirements.amount` instead.

**Check:** `grep -r "maxAmountRequired" packages/sdk/src/` — currently only appears in the type definition itself, not in any runtime access. This means the type change is safe and requires zero runtime changes to the parser.

**Warning signs:** TypeScript errors on `requirements.maxAmountRequired` after the type change (indicates consuming code that needs updating).

### Pitfall 4: pnpm Lockfile Format After Version Upgrade

**What goes wrong:** Switching from pnpm v9 to pnpm@10.21.0 in CI might conflict with an existing lockfile generated by pnpm v9.

**Why it happens:** pnpm v9 and v10 use lockfile version `9.0` (same format — no conflict expected based on `head -5 pnpm-lock.yaml` showing `lockfileVersion: '9.0'`).

**Confidence:** MEDIUM — pnpm v10 maintains backward compatibility with v9 lockfile format. Verified by checking the current lockfile version is already `9.0`, which both pnpm v9 and v10 read. CI uses `--frozen-lockfile` so any mismatch would fail install rather than silently regenerate.

**How to avoid:** Run `pnpm install --frozen-lockfile` locally after the CI change to confirm no lockfile format issue.

### Pitfall 5: @x402/core Removal Causes Build Failure

**What goes wrong:** Removing `@x402/core` from `packages/services/package.json` and `tsup.config.ts` might cause issues if `@x402/core` types were being picked up implicitly.

**Why it's unlikely:** Full source search confirms `@x402/core` is never imported in `packages/services/src/`. The `external: ['zod', '@x402/core']` in tsup config only matters during bundling when the import is present. Removing it from `external` when there are no imports has no effect on output.

**How to avoid:** After removing from package.json, run `pnpm --filter @heylol/services build` and `pnpm --filter @heylol/services typecheck` to confirm no errors.

## Code Examples

Verified patterns from official sources and the codebase:

### CI Workflow — Fixed pnpm Setup Step
```yaml
# Apply to both ci.yml and release.yml
# Source: https://github.com/pnpm/action-setup (v4 omitting version reads packageManager field)
- name: Setup pnpm
  uses: pnpm/action-setup@v4
  # No `version:` input — reads "pnpm@10.21.0" from root package.json packageManager field
```

### CI Workflow — Expanded attw Coverage
```yaml
- name: Validate package exports (publint + attw)
  run: |
    for pkg in packages/*/; do
      echo "=== publint: $pkg ==="
      pnpm --filter "./$pkg" exec publint
    done
    for pkg in packages/*/; do
      echo "=== attw: $pkg ==="
      pnpm --filter "./$pkg" exec attw --pack .
    done
```

### SDK PaymentRequirements Type — v2 Aligned
```typescript
// packages/sdk/src/types/x402.ts
// Source: @x402/core@2.5.0 mechanisms-B8kct0J5.d.mts (verified from installed package)
/** Payment requirements extracted from a 402 response */
export interface PaymentRequirements {
  scheme: string;           // e.g., "exact"
  network: string;          // v2: CAIP-2 "solana:5eykt4..." | v1: "solana-mainnet"
  amount: string;           // v2 field name (replaces v1 maxAmountRequired)
  maxAmountRequired?: string; // v1 compat alias — deprecated, use `amount`
  resource?: string;        // the URL being accessed (v1 required, v2 in PaymentRequired wrapper)
  description?: string;     // human-readable description
  mimeType?: string;        // expected response MIME type
  payTo?: string;           // recipient address
  asset?: string;           // token mint address (v2 field)
  extra?: Record<string, unknown>;
}
```

### SDK Direct Client Imports (No Circular Barrel)
```typescript
// packages/sdk/src/client/HeyLolClient.ts
// REPLACE line 39:
// import { DEFAULT_OPTIONS, parseRetryAfterMs, withRetry } from './index.js';
// WITH:
import { DEFAULT_OPTIONS } from './options.js';
import { parseRetryAfterMs, withRetry } from './retry.js';
```

### Removing @x402/core from Services
```json
// packages/services/package.json — remove @x402/core from dependencies
{
  "dependencies": {}
}
```
```typescript
// packages/services/tsup.config.ts — remove @x402/core from external
external: ['zod'],  // was: ['zod', '@x402/core']
```

### Removing SDK services Subpath
```typescript
// packages/sdk/tsup.config.ts — BEFORE:
entry: {
  index: 'src/index.ts',
  services: 'src/services.ts',
},

// AFTER:
entry: {
  index: 'src/index.ts',
},
```

```json
// packages/sdk/package.json — remove from exports and typesVersions
// BEFORE:
{
  "exports": {
    ".": { ... },
    "./services": {
      "import": { "types": "./dist/services.d.ts", "default": "./dist/services.mjs" },
      "require": { "types": "./dist/services.d.cts", "default": "./dist/services.cjs" }
    }
  },
  "typesVersions": {
    "*": { "services": ["./dist/services.d.ts"] }
  }
}

// AFTER:
{
  "exports": {
    ".": { ... }
  }
}
// typesVersions field removed entirely
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pnpm/action-setup with explicit `version:` | Omit `version:` — reads from `packageManager` field | pnpm/action-setup v4 (current) | CI and local dev use identical pnpm version |
| attw validates only primary package | attw loops all publishable packages | Best practice, always | Catches dual-package hazard in adapters |
| `maxAmountRequired` (x402 v1 field) | `amount` (x402 v2 field) | x402 spec v2 | Services and SDK types agree on the canonical field |

**Deprecated/outdated:**
- `typesVersions` field in package.json: Required for node10 module resolution of subpaths — only needed when you actually have subpaths. Remove with the subpath.
- `@x402/core` as production dependency of `@heylol/services`: Never was actually used; was presumably scaffolded before the services package was implemented as direct HTTP calls.

## Open Questions

1. **Should `maxAmountRequired` be kept as a deprecated field or removed entirely?**
   - What we know: `maxAmountRequired` is currently used only as a type definition in `packages/sdk/src/types/x402.ts` — no runtime code accesses it via that name. `buildPaymentHeader` takes a `PaymentRequirements` arg but only uses `scheme`, `network`, and `payload`.
   - What's unclear: Whether any external consumers (examples, tests) are relying on `requirements.maxAmountRequired`.
   - Recommendation: Check examples and test files for `maxAmountRequired` usage. If none found, safe to rename to `amount` without deprecation alias. If found, add `amount` and keep `maxAmountRequired` as optional.
   - **Search to run:** `grep -r "maxAmountRequired" /Users/rawgroundbeef/Projects/heylol/` — if only the type definition appears, full rename is safe.

2. **Should the services subpath be removed or given real content?**
   - What we know: `@heylol/sdk/services` currently exports `SERVICES_VERSION = '1.0.0'` only.
   - What's unclear: Whether a future version of the SDK should bridge to `@heylol/services`.
   - Recommendation: Remove the subpath. Adding `@heylol/services` as a dependency of `@heylol/sdk` to re-export it would create coupling. Developers who want services functionality install `@heylol/services` directly.

## Sources

### Primary (HIGH confidence)
- `@x402/core@2.5.0` installed at `packages/services/node_modules/@x402/core/` — verified `PaymentRequirements` type has `amount` field (v2), `PaymentRequirementsV1` has `maxAmountRequired` field
- `packages/sdk/src/` — full source inspection, confirmed `encodeCompactU16` not in main index exports, circular barrel import confirmed
- `packages/services/src/` — full source inspection, confirmed `@x402/core` never imported
- `.github/workflows/ci.yml` + `release.yml` — `version: 9` hardcoded in both, `packageManager: pnpm@10.21.0` in root `package.json`
- `.planning/v1.0-MILESTONE-AUDIT.md` — authoritative list of all known gaps
- Live `attw --pack .` run for all 5 packages — all pass with no problems (INFRA-05 already satisfied locally; gap is only in CI)

### Secondary (MEDIUM confidence)
- pnpm/action-setup GitHub issue #86 + WebSearch: Omitting `version:` from pnpm/action-setup@v4 reads from `packageManager` field. Multiple sources agree.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already installed and verified working locally
- Architecture: HIGH — all fixes verified against actual source files
- Pitfalls: HIGH for CI/removal tasks; MEDIUM for lockfile format compatibility

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (pnpm/action-setup v4 behavior is stable)
