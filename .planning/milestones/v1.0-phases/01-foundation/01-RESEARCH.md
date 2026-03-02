# Phase 1: Foundation - Research

**Researched:** 2026-02-28
**Domain:** Monorepo infrastructure, build tooling, CI gates, ESLint rules
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Workspace layout
- Multi-package workspace with independent packages: @heylol/sdk (core), @heylol/services, @heylol/adapter-cloudflare, @heylol/adapter-vercel, @heylol/adapter-express
- Flat directory structure under `packages/` — all packages as siblings (packages/sdk/, packages/services/, packages/adapter-cloudflare/, etc.)
- Example projects live inside the monorepo under `examples/` — part of the workspace, tested in CI

#### CI gate philosophy
- Warnings allowed, only errors block merges
- CI checks run in parallel (lint, build, test, size-check concurrently) for fastest feedback
- Gated on: size-limit (100KB core), publint, attw, and test coverage
- Test coverage gate: 90% minimum to merge

#### Dev loop experience
- `pnpm dev` runs global watch & rebuild across all packages with TypeScript type-checking
- Comprehensive top-level scripts (6-8): dev, build, test, lint, format, typecheck, size-check, changeset
- Pre-commit hook via lint-staged — runs lint and format on staged files
- Biome for formatting (combined lint + format, faster than Prettier)

#### Release & versioning
- Independent versioning per package (not lockstep)
- Initial version: 1.0.0 for all packages — signals stable from day one
- Changesets require a human-readable summary for every change
- Auto-publish on merge to main — every merge with changesets automatically publishes affected packages

### Claude's Discretion
- Build tool choice (tsup, unbuild, tsc, etc.)
- Test runner choice
- Exact ESLint rule configuration beyond the required Node.js built-in guards
- Biome configuration details
- CI platform and workflow file structure
- size-limit configuration approach

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Monorepo configured with pnpm workspaces and turborepo | pnpm-workspace.yaml pattern, turbo.json tasks config, pnpm catalog feature for shared dep versions |
| INFRA-02 | tsup builds produce ESM output with TypeScript declarations for all packages | tsup.config.ts with entry, format, dts, outExtension; verified multi-entry point patterns |
| INFRA-03 | ESLint rules ban Buffer, process, and Node.js crypto imports in core package | ESLint no-restricted-imports rule with flat config syntax; file-scoped overrides for per-package rules |
| INFRA-04 | Package.json exports map configured with correct types/import/require conditions | Correct exports map ordering (types first, default last); .d.mts/.d.cts for dual publish; subpath exports pattern |
| INFRA-05 | publint and attw validate package exports in CI | publint CLI in CI, attw --pack . command, .attw.json config to ignore node10 CJS checks |
| INFRA-06 | size-limit enforces < 100 KB core bundle | @size-limit/preset-big-lib for >10KB libs; .size-limit.json config; GitHub Actions size-limit-action |
| INFRA-07 | Changesets configured for semantic versioning and changelog generation | @changesets/cli init; independent versioning is the default (no fixed/linked); changesets/action@v1 for GitHub Actions auto-publish |
</phase_requirements>

---

## Summary

Phase 1 establishes a pnpm workspaces monorepo orchestrated by Turborepo, with tsup as the build tool, Biome for linting and formatting, and changesets for versioning. All of these tools are mature and in wide production use as of early 2026. The toolchain is well-documented and has no significant compatibility surprises for this use case.

The most nuanced area is the package.json exports map. A single wrong ordering of conditions (e.g., placing `types` after `default`) silently breaks TypeScript resolution for consumers. publint and attw exist precisely to catch these mistakes — running them in CI before every publish is the modern best practice, not a nice-to-have. Verified patterns from publint.dev and arethetypeswrong.github.io are included below.

The ESLint restriction for Node.js built-ins (Buffer, process, crypto) is the only place where ESLint and Biome must coexist. Biome handles formatting and general linting across all packages; ESLint handles only the per-package Node.js import restrictions on `@heylol/sdk`. This split avoids configuration complexity while satisfying both requirements. Biome v2 is stable as of mid-2025 (currently at v2.4) with improved monorepo support and nested config files.

**Primary recommendation:** Use tsup (build), Biome v2 (format/lint), ESLint flat config (Node.js import restrictions on sdk only), Turborepo (task orchestration + caching), changesets (versioning), GitHub Actions (CI), size-limit with preset-big-lib (bundle gate).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pnpm | 9+ | Package manager with workspace support | Fastest installs, workspace: protocol, catalog feature for shared dep versions |
| turborepo | latest (v2+) | Monorepo task orchestration and caching | Vercel-backed, zero-config caching, parallel task execution, turbo.json `tasks` format |
| tsup | latest | TypeScript library bundler | Zero-config, wraps esbuild, generates ESM+CJS+.d.ts in one pass, outExtension support |
| biome | 2.x (currently 2.4) | Combined linter + formatter | 15x faster than ESLint+Prettier, native TypeScript support, monorepo-aware nested configs in v2 |
| @changesets/cli | latest | Semantic versioning + changelog | Industry standard for monorepo package versioning; independent mode is default |
| size-limit | latest | Bundle size enforcement | Blocks merges when core bundle exceeds threshold; GitHub Actions PR comment integration |
| publint | latest | Package export validation | Static analysis of package.json exports field; catches ordering and extension errors |
| @arethetypeswrong/cli | latest | TypeScript type resolution validation | Validates .d.ts files resolve correctly in all module systems; complements publint |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint | 9+ (flat config) | Node.js import restriction rules | Only for @heylol/sdk: ban Buffer, process, crypto imports — Biome cannot do import-path-specific per-package rules |
| husky | 9+ | Git hook management | Runs lint-staged pre-commit hook |
| lint-staged | latest | Run checks on staged files only | Pre-commit: runs `biome check --write` on staged JS/TS/JSON files |
| @size-limit/preset-big-lib | latest | size-limit preset for >10KB libs | Combines esbuild + file plugins; correct for 100KB target (use instead of preset-small-lib which is <10KB only) |
| changesets/action | v1 | GitHub Actions auto-publish | Creates version PRs automatically; publishes on merge to main |
| typescript | 5+ | Type checking | tsup handles build; tsc --noEmit used for typecheck-only step |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsup | unbuild | unbuild is more flexible for complex scenarios; tsup wins for simplicity and esbuild speed |
| tsup | tsc only | tsc is slower, no bundling/tree-shaking; tsup wraps esbuild for 10-100x faster builds |
| tsup | tsdown | tsdown is a newer tsup successor by the same author (egoist); still maturing in early 2026; tsup is safer choice today |
| biome | ESLint + Prettier | Biome v2 is stable and production-ready; ESLint still needed for no-restricted-imports per-package scoping |
| GitHub Actions | CircleCI / GitLab CI | GitHub Actions is the default for open-source projects; Turborepo docs have first-class GitHub Actions guide |
| @size-limit/preset-big-lib | @size-limit/preset-small-lib | preset-small-lib is for <10KB; 100KB target requires preset-big-lib (uses webpack, measures execution time too) |

**Installation:**
```bash
# Root workspace
pnpm add -Dw turbo typescript @changesets/cli biome husky lint-staged size-limit @size-limit/preset-big-lib publint @arethetypeswrong/cli eslint

# Per package (e.g., sdk)
pnpm add -D tsup typescript --filter @heylol/sdk
```

---

## Architecture Patterns

### Recommended Project Structure

```
heylol/                              # Workspace root
├── pnpm-workspace.yaml              # Workspace definition + pnpm catalog
├── turbo.json                       # Turborepo task graph
├── biome.json                       # Root Biome config (formatter + general lint)
├── .changeset/                      # Changesets config + pending changesets
│   └── config.json
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint, build, test, size-check (parallel)
│       └── release.yml              # Changesets auto-publish on main merge
├── .husky/
│   └── pre-commit                   # lint-staged
├── .size-limit.json                 # Bundle size gate config
├── package.json                     # Root scripts (dev, build, test, lint, format, typecheck, size-check, changeset)
├── packages/
│   ├── sdk/                         # @heylol/sdk — core, ESLint Node.js import restrictions here
│   │   ├── package.json
│   │   ├── tsup.config.ts
│   │   ├── eslint.config.js         # Package-scoped ESLint: no Buffer/process/crypto
│   │   ├── biome.json               # Optional: extends root, "root": false
│   │   └── src/
│   │       ├── index.ts             # Main entrypoint
│   │       └── services.ts          # Subpath export entrypoint
│   ├── services/                    # @heylol/services
│   │   ├── package.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   ├── adapter-cloudflare/          # @heylol/adapter-cloudflare
│   ├── adapter-vercel/              # @heylol/adapter-vercel
│   └── adapter-express/             # @heylol/adapter-express
└── examples/
    ├── basic-node/
    └── cloudflare-worker/
```

### Pattern 1: pnpm-workspace.yaml with Catalogs

**What:** Single file declares workspace packages and shared dependency versions.
**When to use:** Always; pnpm 9.5+ catalogs reduce version drift across packages and eliminate merge conflicts in package.json files.

```yaml
# Source: https://pnpm.io/workspaces + https://pnpm.io/catalogs
packages:
  - "packages/*"
  - "examples/*"

catalog:
  typescript: ^5.7.0
  tsup: ^8.0.0
  biome: ^2.4.0
  "@changesets/cli": ^2.27.0
```

Packages reference catalog entries:
```json
{
  "devDependencies": {
    "typescript": "catalog:",
    "tsup": "catalog:"
  }
}
```

### Pattern 2: turbo.json Task Graph

**What:** Declares task dependencies and outputs for caching. Uses `tasks` (not `pipeline` — that's the old v1 format).
**When to use:** Always; enables Turborepo to run lint/build/test in parallel and cache outputs.

```json
// Source: https://turborepo.dev/docs/reference/configuration
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "size-check": {
      "dependsOn": ["build"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "persistent": true,
      "cache": false
    }
  }
}
```

**Key:** `^build` means "all dependency packages must build first." `lint` has no dependsOn so it runs immediately in parallel with other tasks.

### Pattern 3: tsup.config.ts for Library Packages

**What:** Build config producing ESM+CJS with .d.ts and proper file extensions for consumers.
**When to use:** Each package in `packages/` needs its own tsup.config.ts.

```typescript
// Source: verified from LogRocket tsup guide + johnnyreilly.com dual publishing article
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    services: 'src/services.ts', // produces dist/services.js for @heylol/sdk/services subpath
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,   // set true only if sharing chunks between entrypoints is needed
  sourcemap: true,
  clean: true,
  outExtension({ format }) {
    return format === 'esm' ? { js: '.mjs' } : { js: '.cjs' };
  },
});
```

### Pattern 4: package.json Exports Map

**What:** Correct exports map ordering that passes both publint and attw checks.
**When to use:** Every published package. Order is critical — `types` must come first within each condition block; `default` must be last.

```json
// Source: https://publint.dev/rules + https://hirok.io/posts/package-json-exports
{
  "name": "@heylol/sdk",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./services": {
      "import": {
        "types": "./dist/services.d.mts",
        "default": "./dist/services.mjs"
      },
      "require": {
        "types": "./dist/services.d.cts",
        "default": "./dist/services.cjs"
      }
    }
  },
  "files": ["dist"]
}
```

**Critical rules (from publint.dev/rules):**
- `types` must be first within each condition block — if placed after, TypeScript ignores it
- `default` must be last in any condition block
- Type file extensions must match format: `.d.mts` for ESM, `.d.cts` for CJS
- Export paths must start with `./`

### Pattern 5: ESLint Flat Config for Node.js Import Restrictions

**What:** Package-scoped ESLint config banning Node.js built-in imports in core SDK only.
**When to use:** `packages/sdk/eslint.config.js` only. Do not apply globally — adapter-express legitimately uses Node.js APIs.

```javascript
// Source: https://eslint.org/docs/latest/rules/no-restricted-imports
// packages/sdk/eslint.config.js
export default [
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          name: 'buffer',
          message: 'Buffer is not available in edge runtimes. Use Uint8Array instead.',
        },
        {
          name: 'node:buffer',
          message: 'Buffer is not available in edge runtimes. Use Uint8Array instead.',
        },
        {
          name: 'crypto',
          message: 'Node.js crypto is not available in edge runtimes. Use @noble/curves instead.',
        },
        {
          name: 'node:crypto',
          message: 'Node.js crypto is not available in edge runtimes. Use @noble/curves instead.',
        },
        {
          name: 'process',
          message: 'process is not available in edge runtimes. Pass config explicitly.',
        },
        {
          name: 'node:process',
          message: 'process is not available in edge runtimes. Pass config explicitly.',
        },
      ],
    },
  },
];
```

**Note:** Both bare `'crypto'` and `'node:crypto'` forms must be banned — modern Node.js encourages `node:` prefix imports, so banning only the bare form leaves a bypass.

### Pattern 6: Biome Configuration

**What:** Root biome.json for formatting and general linting across all packages.
**When to use:** Root-level configuration; packages can have their own `biome.json` with `"root": false` to override specific rules.

```json
// Source: https://biomejs.dev/reference/configuration/
{
  "$schema": "https://biomejs.dev/schemas/2.4.0/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["**/dist/**", "**/node_modules/**", "**/.turbo/**"]
  },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  }
}
```

### Pattern 7: size-limit Configuration

**What:** Bundle size enforcement for the core SDK package.
**When to use:** Root-level `.size-limit.json`; run in CI after build.

```json
// Source: https://github.com/ai/size-limit
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

Use `@size-limit/preset-big-lib` (not `preset-small-lib`): preset-small-lib is documented for <10KB packages only. preset-big-lib uses webpack and also measures execution time, which is appropriate for a 100KB target.

### Pattern 8: Changesets Configuration

**What:** Independent versioning — the default changesets behavior when no `fixed` or `linked` arrays are specified.
**When to use:** `.changeset/config.json`, created by `pnpm changeset init`.

```json
// Source: https://github.com/changesets/changesets/blob/main/docs/config-file-options.md
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**Key:** Empty `fixed` and `linked` arrays = independent versioning. Each package bumps separately. This is the default from `pnpm changeset init` — no extra configuration needed.

### Pattern 9: GitHub Actions CI Workflow

**What:** Parallel CI jobs gating on lint, build, test, size-check, publint, attw.
**When to use:** `.github/workflows/ci.yml`.

```yaml
# Source: https://turborepo.dev/docs/guides/ci-vendors/github-actions
name: CI

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize]

jobs:
  ci:
    name: CI
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      # Turborepo runs lint, build, test, typecheck in parallel via task graph
      - run: pnpm turbo lint build typecheck test size-check
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}

      # publint and attw run after build; can be a separate step or a turbo task
      - name: Validate package exports
        run: |
          for pkg in packages/*/; do
            echo "Checking $pkg"
            pnpm --filter "./$pkg" exec publint
            pnpm --filter "./$pkg" exec attw --pack .
          done
```

### Pattern 10: Changesets Auto-Publish Workflow

**What:** GitHub Actions workflow that opens version PRs and auto-publishes on merge.
**When to use:** `.github/workflows/release.yml`.

```yaml
# Source: https://github.com/changesets/action
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          registry-url: https://registry.npmjs.org

      - run: pnpm install --frozen-lockfile

      - uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          title: "chore: version packages"
          commit: "chore: version packages"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Pattern 11: lint-staged + Husky Pre-Commit

**What:** Pre-commit hook running Biome on staged files only (fast — skips unstaged files).
**When to use:** Root package.json lint-staged config + .husky/pre-commit.

```json
// Root package.json
{
  "lint-staged": {
    "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}": [
      "biome check --files-ignore-unknown=true --no-errors-on-unmatched",
      "biome check --write --files-ignore-unknown=true --no-errors-on-unmatched"
    ]
  }
}
```

```bash
# .husky/pre-commit
lint-staged
```

```json
// Root package.json scripts
{
  "scripts": {
    "prepare": "husky"
  }
}
```

### Anti-Patterns to Avoid

- **Using `pipeline` key in turbo.json:** The `pipeline` key is the Turborepo v1 format. v2 uses `tasks`. Using `pipeline` still works but is deprecated.
- **Putting `types` condition after `default` in exports:** TypeScript ignores the `types` condition if it is not first. This is the #1 exports map mistake caught by publint (rule: `EXPORTS_TYPES_SHOULD_BE_FIRST`).
- **Using `.d.ts` for both ESM and CJS exports:** CJS exports need `.d.cts` type files. Sharing one `.d.ts` causes attw to report `false-cjs` or `false-esm` errors.
- **Banning only `'crypto'` without `'node:crypto'`:** Modern Node.js code uses `node:` prefix imports. Both forms must be restricted.
- **Using `preset-small-lib` for a 100KB target:** That preset is documented for <10KB libraries only. It uses esbuild without execution time measurement. Use `preset-big-lib`.
- **Setting `fixed` or `linked` in changesets config to achieve independent versioning:** The default (empty arrays) is already independent. Adding packages to `fixed` would couple their versions, which is the opposite of the goal.
- **Running `pnpm install` without `--frozen-lockfile` in CI:** Always use `--frozen-lockfile` in CI to prevent accidental lockfile mutations.
- **Global biome.json with `"root": true` blocking nested overrides:** Root biome.json should not set `"root": true` — this is reserved for nested package-specific configs using `"root": false`. The root config is automatically treated as root.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ESM + CJS + .d.ts bundle output | Custom esbuild/tsc scripts | tsup | Handles format detection, declaration bundling, chunk splitting, outExtension in ~10 lines of config |
| Package export map validation | Manual package.json review | publint + attw | Static analysis catches conditions-ordering bugs and type-extension mismatches that are invisible to the naked eye |
| Bundle size enforcement | Custom bundle analysis scripts | size-limit | Handles esbuild bundling, tree-shaking simulation, and CI integration out of the box |
| Monorepo task scheduling | Custom Makefile or shell scripts | Turborepo | Turborepo's task graph + caching prevents redundant rebuilds; hand-rolled scripts don't cache |
| Changelog generation | Manual CHANGELOG.md editing | Changesets | Changesets accumulates per-PR summaries and rolls them up into conventional changelog entries on version bump |
| Git hook management | Direct `.git/hooks/` scripts | Husky | Hooks in `.git/hooks/` are not committed; Husky makes hooks part of the repo and auto-installs via `prepare` |

**Key insight:** Every tool in this stack exists because the naive hand-rolled version has a specific class of failure that is hard to detect. publint/attw exist because exports map bugs are silent (packages publish successfully but break for consumers). size-limit exists because bundle bloat is cumulative and invisible until it's a problem.

---

## Common Pitfalls

### Pitfall 1: Exports Condition Ordering

**What goes wrong:** TypeScript consumers get "could not find declaration file" errors or pick up the wrong type file (e.g., CommonJS types in an ESM context).
**Why it happens:** The `types` condition resolves correctly only when placed first within its parent condition block. If `default` comes first, Node.js and TypeScript stop evaluating after `default` and never reach `types`.
**How to avoid:** Always order: `types` → other conditions → `default`. Run `pnpm exec publint` after every package.json exports map change.
**Warning signs:** `attw` reports `false-esm` or `false-cjs`; TypeScript shows "could not find module" even though the file exists in dist/.

### Pitfall 2: Missing `node:` Prefix in ESLint Restrictions

**What goes wrong:** The ESLint rule banning `'crypto'` passes, but code using `import { randomBytes } from 'node:crypto'` is not caught.
**Why it happens:** Node.js now recommends the `node:` prefix for built-in imports, and they are treated as separate import specifiers by ESLint's `no-restricted-imports` rule.
**How to avoid:** Always restrict both `'crypto'` and `'node:crypto'` (and similarly for `buffer`/`node:buffer`, `process`/`node:process`).
**Warning signs:** `pnpm lint` passes but the code fails in a Cloudflare Workers environment with "crypto is not defined."

### Pitfall 3: Declaration File Extension Mismatch

**What goes wrong:** `attw` reports errors; consumers using `"moduleResolution": "NodeNext"` get wrong type resolution.
**Why it happens:** When tsup generates `.d.ts` for both ESM and CJS outputs, TypeScript infers module format from the extension. `.d.ts` is ambiguous; `.d.mts` explicitly signals ESM and `.d.cts` signals CJS.
**How to avoid:** Use `outExtension` in tsup.config.ts to produce `.mjs`/`.cjs`; this causes tsup to automatically generate `.d.mts`/`.d.cts` when `dts: true`.
**Warning signs:** `attw --pack .` reports `false-cjs` or mismatched resolution modes.

### Pitfall 4: Turborepo `pipeline` vs `tasks` Key

**What goes wrong:** turbo.json using `pipeline` works initially but triggers deprecation warnings; future turbo versions may drop support.
**Why it happens:** Turborepo v2 renamed `pipeline` to `tasks`. Both work in current versions but documentation only covers `tasks`.
**How to avoid:** Use `tasks` from the start. Set `"$schema": "https://turborepo.dev/schema.json"` for IDE validation.
**Warning signs:** Turborepo logs a deprecation notice mentioning the `pipeline` key.

### Pitfall 5: pnpm `workspace:*` vs Catalog Drift

**What goes wrong:** Different packages in the monorepo use different versions of shared devDependencies (e.g., TypeScript 5.6 in sdk but 5.7 in services), causing subtle type errors that only appear in cross-package scenarios.
**Why it happens:** Each package.json specifies its own version range; a `pnpm update typescript` in one package doesn't update others.
**How to avoid:** Use pnpm catalogs in `pnpm-workspace.yaml` for all shared devDependencies. Reference with `catalog:` in each package.json.
**Warning signs:** `pnpm list typescript --recursive` shows different versions across packages.

### Pitfall 6: Changesets on Packages Without Changes

**What goes wrong:** `pnpm changeset publish` publishes a package even though no changes were made to it in a PR.
**Why it happens:** `updateInternalDependencies: "patch"` in changesets config causes downstream packages to bump when their dependencies bump.
**How to avoid:** This is expected and correct behavior — if @heylol/sdk bumps, adapters that depend on it get a patch bump. Accept this as the design. Use `ignore` in `.changeset/config.json` for packages you never want to publish automatically.
**Warning signs:** Version bump PRs include packages the developer didn't expect to see bumped.

### Pitfall 7: size-limit Running Before Build

**What goes wrong:** size-check task reports 0 bytes or fails to find the dist file.
**Why it happens:** `size-limit` reads the built file — if run before `build` completes, dist/ doesn't exist.
**How to avoid:** Add `"dependsOn": ["build"]` for the size-check task in turbo.json. Turborepo enforces build runs first.
**Warning signs:** CI fails with "No files found matching the pattern" in size-limit output.

---

## Code Examples

Verified patterns from official sources:

### Root package.json Scripts

```json
{
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "format": "biome format --write .",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "size-check": "size-limit",
    "changeset": "changeset",
    "prepare": "husky"
  }
}
```

### pnpm-workspace.yaml with Examples

```yaml
# Source: https://pnpm.io/workspaces + https://pnpm.io/catalogs
packages:
  - "packages/*"
  - "examples/*"

catalog:
  typescript: ^5.7.0
  tsup: ^8.0.0
  "@changesets/cli": ^2.27.0
  biome: ^2.4.0
  eslint: ^9.0.0
  vitest: ^2.0.0
```

### publint and attw CI Commands

```bash
# Source: https://publint.dev + https://github.com/arethetypeswrong/arethetypeswrong.github.io
# Run after build, from package directory
npx publint

# Pack the package and check types
npx --yes @arethetypeswrong/cli --pack .

# Or with .attw.json config to suppress node10 CJS checks for modern packages
npx --yes @arethetypeswrong/cli --pack . --ignore-rules cjs-resolves-to-esm
```

### .attw.json for Modern ESM-first Package

```json
{
  "ignoreRules": ["cjs-resolves-to-esm"]
}
```

Note: Use `cjs-resolves-to-esm` only if intentionally not supporting CJS require. For dual ESM+CJS output (recommended), do not suppress this rule.

### Changeset Init Output (.changeset/config.json)

```json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| turbo.json `pipeline` key | turbo.json `tasks` key | Turborepo v2 (2024) | Old key deprecated; IDE schema validation now points to `tasks` |
| Prettier + ESLint separately | Biome v2 (combined) | Biome v2 stable (2025) | Single tool for format + lint; monorepo-native nested configs |
| `pnpm workspace:*` for shared deps | pnpm catalog feature | pnpm 9.5 (2024) | Centralized dep versions in pnpm-workspace.yaml; no package.json duplication |
| Separate `.d.ts` for ESM and CJS | `.d.mts` + `.d.cts` with matching extension | TypeScript 4.7+ / tsup | Type resolution now extension-aware; attw validates this |
| `changesets` `pipeline` mode | Independent versioning (default, no config needed) | Always been default | Empty `fixed`/`linked` arrays = independent; nothing to configure |
| `eslint.config.js` with plugins array | ESLint flat config (v9+) | ESLint 9 (2024) | `eslintrc.json` deprecated; flat config is now the default format |
| bundlesize | size-limit | 2018+ | size-limit is actively maintained with esbuild/webpack presets; bundlesize is largely abandoned |

**Deprecated/outdated:**
- `eslintrc.json`/`.eslintrc.js`: Deprecated in ESLint 9, removed support planned. Use flat config (`eslint.config.js`).
- `turbo.json` `pipeline` key: Deprecated. Use `tasks`.
- `@size-limit/preset-small-lib` for bundles >10KB: Wrong preset; use `preset-big-lib`.
- Biome v1.x: v2 is current; v2 has breaking changes in monorepo config (`extends: "//"` syntax).

---

## Open Questions

1. **ESM-only vs dual ESM+CJS for adapter packages**
   - What we know: The core SDK decision favors edge-runtime compatibility (ESM-only intent); adapters like adapter-express run in Node.js where CJS is fine
   - What's unclear: Whether adapter-express should publish CJS for better Node.js compatibility with older consumers, or ESM-only to match the SDK philosophy
   - Recommendation: Default to dual ESM+CJS publishing for all packages (matches industry standard as of 2025 per lirantal.com analysis); this avoids needing to revisit later if CJS consumers emerge

2. **Biome vs ESLint scope for general lint rules**
   - What we know: Biome v2 has 340+ rules covering most of what typescript-eslint provides; ESLint is required for `no-restricted-imports` with per-package file scoping
   - What's unclear: Whether any lint rules the project needs beyond Node.js import restrictions are available in Biome but not yet stable, requiring ESLint as a fallback
   - Recommendation: Start with Biome recommended rules + ESLint for import restrictions only; add ESLint rules only if Biome has a coverage gap discovered during development

3. **Test runner choice (Claude's Discretion)**
   - What we know: Vitest is the current standard for TypeScript monorepos (ESM-native, fast, Turborepo-friendly); Jest requires additional ESM configuration
   - What's unclear: Whether any specific test patterns for edge-runtime simulation are needed in Phase 1 (vs later phases)
   - Recommendation: Use Vitest; add to catalog in pnpm-workspace.yaml; configure coverage threshold in vitest.config.ts (90% gate from CI decisions)

4. **Turborepo remote caching necessity for Phase 1**
   - What we know: Remote caching (TURBO_TOKEN + TURBO_TEAM env vars) requires a Vercel account or self-hosted cache; local caching works without any account
   - What's unclear: Whether remote caching is needed for a solo/small team project at Phase 1 stage
   - Recommendation: Configure TURBO_TOKEN/TURBO_TEAM as optional CI env vars now (workflow references them if set); remote caching can be enabled later without workflow changes

---

## Sources

### Primary (HIGH confidence)

- `https://turborepo.dev/docs/reference/configuration` — turbo.json tasks format, outputs, dependsOn, schema URL
- `https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository` — workspace layout, pnpm-workspace.yaml pattern
- `https://turborepo.dev/docs/guides/ci-vendors/github-actions` — GitHub Actions workflow for Turborepo
- `https://pnpm.io/workspaces` — pnpm-workspace.yaml syntax, workspace protocol
- `https://pnpm.io/catalogs` — pnpm catalog feature, catalog: protocol in package.json
- `https://pnpm.io/using-changesets` — changesets setup with pnpm, release workflow
- `https://publint.dev/rules` — publint rule list; EXPORTS_TYPES_SHOULD_BE_FIRST, EXPORTS_DEFAULT_SHOULD_BE_LAST, EXPORTS_TYPES_INVALID_FORMAT
- `https://eslint.org/docs/latest/rules/no-restricted-imports` — no-restricted-imports flat config syntax, object-with-message form
- `https://biomejs.dev/reference/configuration/` — biome.json structure, monorepo extends, vcs integration
- `https://biomejs.dev/recipes/git-hooks/` — lint-staged + husky configuration with Biome
- `https://github.com/changesets/changesets/blob/main/docs/config-file-options.md` — changesets config.json options, fixed/linked/independent distinction
- `https://github.com/changesets/action` — changesets/action@v1 GitHub Actions inputs, publish workflow
- `https://github.com/ai/size-limit` — .size-limit.json format, preset-big-lib vs preset-small-lib, GitHub Actions integration
- `https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/packages/cli/README.md` — attw CLI flags, .attw.json config, --pack usage

### Secondary (MEDIUM confidence)

- `https://hirok.io/posts/package-json-exports` — Verified exports map pattern with subpath exports; confirms types-first ordering and .d.mts/.d.cts extensions (cross-referenced with publint.dev rules)
- `https://johnnyreilly.com/dual-publishing-esm-cjs-modules-with-tsup-and-are-the-types-wrong` — tsup + attw workflow; package.json exports map example (cross-referenced with official attw docs)
- `https://blog.logrocket.com/tsup/` — tsup.config.ts with entry object, outExtension, dts:true patterns
- `https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing` — 2025 assessment of dual CJS+ESM publishing as still recommended; exports map structure

### Tertiary (LOW confidence — flag for validation)

- WebSearch result: Biome v2.4 released February 2026 (mentioned in Medium article title, not directly verified against official Biome blog) — flagged for validation; schema URL in config example should be confirmed against current Biome release
- WebSearch result: `pnpm action-setup@v4` version in GitHub Actions YAML — should be verified against current pnpm/action-setup release tag

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified against official docs or GitHub READMEs; versions cross-referenced
- Architecture patterns: HIGH — patterns derived from official docs examples; exports map rules sourced directly from publint.dev/rules
- Pitfalls: HIGH — pitfalls derived from official rule descriptions (publint), TypeScript module resolution docs (extension-awareness), and verified tool behavior
- Biome v2 version: MEDIUM — v2 is confirmed stable by multiple sources (Biome blog, InfoQ, Medium articles); exact minor version in schema URL should be confirmed on first install

**Research date:** 2026-02-28
**Valid until:** 2026-05-28 (stable toolchain; 90 days reasonable given Biome minor releases and pnpm/turborepo active development)
