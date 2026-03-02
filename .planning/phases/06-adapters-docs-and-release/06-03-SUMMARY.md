---
phase: 06-adapters-docs-and-release
plan: 03
subsystem: docs-and-release
tags: [readme, examples, cloudflare-workers, nextjs, x402, publish-pipeline, attw]
requirements-completed: [DOCS-02, DOCS-03, DOCS-04]

# Dependency graph
requires:
  - phase: 06-01
    provides: CloudflareClient, VercelClient, createNextjsMiddleware adapters
  - phase: 06-02
    provides: JSDoc/TSDoc on all public APIs
provides:
  - README.md with 5-minute quickstart
  - examples/cloudflare-ai-agent Cloudflare Worker example
  - examples/x402-service-provider x402 service lifecycle example
  - examples/nextjs-dashboard Next.js App Router example
  - Validated publish pipeline for all 5 packages
affects:
  - release (all packages publish-ready)

# Tech tracking
tech-stack:
  added:
    - "wrangler ^4.0.0 (devDep in cloudflare-ai-agent example)"
    - "@cloudflare/workers-types ^4.20260305.0 (devDep in cloudflare-ai-agent example)"
    - "next ^15.0.0 (dep in nextjs-dashboard example)"
    - "react ^19.0.0 + react-dom ^19.0.0 (dep in nextjs-dashboard example)"
  patterns:
    - "Example projects as workspace packages under examples/ — picked up by pnpm workspaces"
    - "next build as the build script for Next.js examples (full production build validates typechecking)"
    - "turbo build covers all 8 packages including 3 examples in parallel"
    - "pnpm publish --dry-run --no-git-checks for CI validation with unclean tree"

key-files:
  created:
    - README.md
    - examples/cloudflare-ai-agent/src/index.ts
    - examples/cloudflare-ai-agent/wrangler.jsonc
    - examples/cloudflare-ai-agent/package.json
    - examples/cloudflare-ai-agent/tsconfig.json
    - examples/x402-service-provider/src/index.ts
    - examples/x402-service-provider/package.json
    - examples/x402-service-provider/tsconfig.json
    - examples/nextjs-dashboard/app/page.tsx
    - examples/nextjs-dashboard/app/layout.tsx
    - examples/nextjs-dashboard/app/api/posts/route.ts
    - examples/nextjs-dashboard/middleware.ts
    - examples/nextjs-dashboard/package.json
    - examples/nextjs-dashboard/tsconfig.json
    - examples/nextjs-dashboard/next.config.ts
    - examples/nextjs-dashboard/.gitignore
  modified:
    - pnpm-lock.yaml

key-decisions:
  - "PostsResource has no list() method — route.ts GET handler uses get(id) with a query param instead; README API table corrected"
  - "nextjs-dashboard needs @heylol/sdk as direct dep — VercelClient is a peerDep consumer, type imports from @heylol/sdk need explicit dep"
  - "Next.js App Router requires a root layout file — app/layout.tsx added (Rule 3 auto-fix)"
  - ".gitignore for nextjs-dashboard excludes .next/ — prevents build artifacts from staging into git and choking Biome pre-commit hook"
  - "@cloudflare/workers-types bumped to ^4.20260305.0 — wrangler 4.69.0 requires this version as peer dep"
  - "pnpm publish --dry-run --no-git-checks required — working tree is unclean (pnpm-lock.yaml) during dry-run CI validation"

# Metrics
duration: 12min
completed: 2026-03-02
---

# Phase 6 Plan 03: README, Examples, and Publish Pipeline Summary

**README quickstart (npm install to first post in under 5 minutes) plus three example projects demonstrating Cloudflare Workers, x402 service provider, and Next.js App Router patterns; all 5 publishable packages validated with attw and publish dry-run**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-02T02:56:24Z
- **Completed:** 2026-03-02T03:08:25Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- `README.md` — linear 5-minute quickstart: install, init (`new HeyLolClient`), first post; platform adapter section (Cloudflare/Vercel/Express); API overview table with all 6 resource namespaces; error handling section with typed errors; examples links
- `examples/cloudflare-ai-agent` — Cloudflare Worker using `createFromEnv(env)` factory; `Env extends HeyLolEnv`; `wrangler.jsonc` with secret instructions; `tsc --noEmit` passes
- `examples/x402-service-provider` — complete x402 service lifecycle: `registerService()` definition, handler function, `createX402Service()` wrapping the handler; exports as `export default { fetch: handleAiSummary }` compatible with Cloudflare Worker and Bun.serve
- `examples/nextjs-dashboard` — Next.js 15 App Router: `VercelClient` in `/api/posts` edge route handler (POST + GET), `createNextjsMiddleware()` in `middleware.ts`; full `next build` passes (typecheck + static generation)
- All 5 publishable packages pass `attw --pack . --ignore-rules cjs-resolves-to-esm` with zero errors across all module resolution modes (node10, node16 ESM/CJS, bundler)
- All 5 packages pass `pnpm publish --dry-run`
- Full CI: 18/18 turbo tasks green (`build`, `typecheck`, `test`); size-check 8/8 cached
- Total test count: **226 tests** (165 SDK + 40 services + 8 cloudflare + 8 vercel + 5 express)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create README quickstart and example projects** - `4392c34` (feat)
2. **Task 2: Validate publish pipeline** - no file changes (verification only; all packages already correct from Phase 06-01)

## Files Created/Modified

- `README.md` — project root, full quickstart + adapter + API docs
- `examples/cloudflare-ai-agent/src/index.ts` — Worker fetch handler using createFromEnv
- `examples/cloudflare-ai-agent/wrangler.jsonc` — Worker config with secret setup comments
- `examples/cloudflare-ai-agent/package.json` — private, wrangler devDep
- `examples/cloudflare-ai-agent/tsconfig.json` — extends root, includes @cloudflare/workers-types
- `examples/x402-service-provider/src/index.ts` — 4-step x402 lifecycle with comments
- `examples/x402-service-provider/package.json` — private, @heylol/services dep
- `examples/x402-service-provider/tsconfig.json` — extends root
- `examples/nextjs-dashboard/app/api/posts/route.ts` — edge POST/GET route using VercelClient
- `examples/nextjs-dashboard/app/layout.tsx` — required Next.js App Router root layout
- `examples/nextjs-dashboard/app/page.tsx` — minimal dashboard page component
- `examples/nextjs-dashboard/middleware.ts` — createNextjsMiddleware export
- `examples/nextjs-dashboard/next.config.ts` — minimal config
- `examples/nextjs-dashboard/package.json` — private, @heylol/adapter-vercel + @heylol/sdk + next deps
- `examples/nextjs-dashboard/tsconfig.json` — standard Next.js tsconfig (jsx: preserve, moduleResolution: bundler)
- `examples/nextjs-dashboard/.gitignore` — excludes .next/ build artifacts
- `pnpm-lock.yaml` — updated with wrangler, next, react, workers-types

## Decisions Made

- `PostsResource` has no `list()` method — GET route handler uses `posts.get(id)` with query param; README API overview table corrected to show accurate methods (`like`, `unlike`, `reply`)
- `@heylol/sdk` added as direct dep in nextjs-dashboard — adapter-vercel lists SDK as peerDep, so consumers importing types (`PostId`) directly need explicit dep
- `app/layout.tsx` required by Next.js 15 App Router — every app needs a root layout; added with minimal HTML structure
- `examples/nextjs-dashboard/.gitignore` excludes `.next/` — staging build artifacts triggered Biome on 81 compiled JS files, causing the pre-commit hook to run for 50+ minutes and stall

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PostsResource.list() does not exist**
- **Found during:** Task 1 (nextjs-dashboard next build typecheck)
- **Issue:** Route handler called `client.posts.list()` but `PostsResource` only has `create`, `get`, `delete`, `like`, `unlike`, `reply`. Build error: "Property 'list' does not exist on type 'PostsResource'"
- **Fix:** Changed GET handler to `posts.get(id)` with `searchParams.get('id')`; updated README API table to remove `list()` and show actual methods
- **Files modified:** `examples/nextjs-dashboard/app/api/posts/route.ts`, `README.md`
- **Committed in:** 4392c34

**2. [Rule 3 - Blocking] Next.js App Router requires root layout**
- **Found during:** Task 1 (next build)
- **Issue:** `next build` failed with "page.tsx doesn't have a root layout" — App Router mandates a `layout.tsx` wrapping all pages
- **Fix:** Created `examples/nextjs-dashboard/app/layout.tsx` with minimal HTML/body structure
- **Files modified:** `examples/nextjs-dashboard/app/layout.tsx`
- **Committed in:** 4392c34

**3. [Rule 3 - Blocking] @heylol/sdk missing from nextjs-dashboard deps**
- **Found during:** Task 1 (next build typecheck after layout fix)
- **Issue:** `import type { PostId } from '@heylol/sdk'` failed — package not listed as dependency; SDK is a peerDep of adapter-vercel, not automatically available to consumers
- **Fix:** Added `"@heylol/sdk": "workspace:*"` to nextjs-dashboard dependencies
- **Files modified:** `examples/nextjs-dashboard/package.json`
- **Committed in:** 4392c34

**4. [Rule 3 - Blocking] @cloudflare/workers-types version mismatch**
- **Found during:** Task 1 (pnpm install)
- **Issue:** wrangler 4.69.0 requires `@cloudflare/workers-types ^4.20260305.0` but package.json had `^4.20250525.0`; peer dependency warning on install
- **Fix:** Bumped version to `^4.20260305.0`
- **Files modified:** `examples/cloudflare-ai-agent/package.json`
- **Committed in:** 4392c34

**5. [Rule 3 - Blocking] .gitignore added to nextjs-dashboard to exclude .next/**
- **Found during:** Task 1 (git commit)
- **Issue:** `git add examples/nextjs-dashboard/` inadvertently staged 97 `.next/` build artifact files; Biome pre-commit hook ran on all 81 compiled JS files and stalled (50+ minutes CPU time)
- **Fix:** Added `examples/nextjs-dashboard/.gitignore` excluding `.next/`; `git reset HEAD examples/nextjs-dashboard/.next/` to unstage artifacts; dropped stash and killed stuck process
- **Files modified:** `examples/nextjs-dashboard/.gitignore`
- **Committed in:** 4392c34

---

**Total deviations:** 5 auto-fixed (1 Rule 1 bug, 4 Rule 3 blockers)
**Impact on plan:** All auto-fixes necessary for correctness and build completion. No scope creep.

## Publish Pipeline Results

| Package | attw | publish --dry-run | Size |
|---------|------|-------------------|------|
| @heylol/sdk | No problems | + @heylol/sdk@1.0.0 | 258.7 kB unpacked |
| @heylol/services | No problems | + @heylol/services@1.0.0 | 72.3 kB unpacked |
| @heylol/adapter-cloudflare | No problems | + @heylol/adapter-cloudflare@1.0.0 | 13.7 kB unpacked |
| @heylol/adapter-vercel | No problems | + @heylol/adapter-vercel@1.0.0 | 19.1 kB unpacked |
| @heylol/adapter-express | No problems | + @heylol/adapter-express@1.0.0 | 13.5 kB unpacked |

## Issues Encountered

- Biome pre-commit hook stalled on 81 compiled `.next/` JS files (CPU at 685% for 52 minutes). Resolved by killing process, adding `.gitignore`, and resetting staged artifacts.

## Next Phase Readiness

- All 5 packages are publish-ready (attw clean, dry-run passes, tests pass)
- Phase 6 is complete — this is the final plan in the final phase
- Next step: actual `pnpm publish` to npm registry when ready for release

## Self-Check: PASSED

Files verified present:
- README.md - FOUND
- examples/cloudflare-ai-agent/src/index.ts - FOUND
- examples/cloudflare-ai-agent/wrangler.jsonc - FOUND
- examples/x402-service-provider/src/index.ts - FOUND
- examples/nextjs-dashboard/app/api/posts/route.ts - FOUND
- examples/nextjs-dashboard/middleware.ts - FOUND
- examples/nextjs-dashboard/app/layout.tsx - FOUND

Commits verified:
- 4392c34 (Task 1: README + examples) - FOUND

---
*Phase: 06-adapters-docs-and-release*
*Completed: 2026-03-02*
