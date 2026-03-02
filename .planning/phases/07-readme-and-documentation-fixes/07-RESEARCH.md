# Phase 7: README & Documentation Fixes - Research

**Researched:** 2026-03-01
**Domain:** Documentation correctness, SUMMARY frontmatter bookkeeping
**Confidence:** HIGH

## Summary

Phase 7 is a surgical gap-closure phase with a narrow, well-defined scope. The v1.0 milestone audit identified four failing requirements (DOCS-01..04). Three of them (DOCS-02, DOCS-03, DOCS-04) are verified satisfied in the codebase but are marked "partial" only because 06-03-SUMMARY.md is missing a `requirements-completed` frontmatter field. DOCS-01 is genuinely broken: two error-handling property names in the README error-handling example are wrong and will cause TypeScript errors.

The entire phase reduces to three concrete edits: (1) fix two wrong property names in the README error-handling code block, (2) add a `requirements-completed` frontmatter field to 06-03-SUMMARY.md. No new code, no new packages, no structural changes to the SDK or examples.

The Phase 6 SUMMARY's claim that `posts.list()` and `profile.get('me')` were broken is already resolved — those fixes were applied during Phase 6 Plan 03 execution and the current README file is correct on those points. The remaining DOCS-01 failures are limited to the error-handling section only.

**Primary recommendation:** Fix exactly two property names in README.md (`err.retryAfter` → `err.retryAfterMs`, `err.status` → `err.statusCode`), then add `requirements-completed: [DOCS-02, DOCS-03, DOCS-04]` to 06-03-SUMMARY.md frontmatter. That is the entire phase.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DOCS-01 | README with 5-minute quickstart (install, init, first post) | Two property names in the error-handling block are wrong: `err.retryAfter` must be `err.retryAfterMs` (actual field on RateLimitError), `err.status` must be `err.statusCode` (actual field on APIError). Both verified against packages/sdk/src/errors/index.ts. |
| DOCS-02 | Example project: AI agent bot (Cloudflare Worker) | examples/cloudflare-ai-agent/ is fully implemented and verified. The only gap is the missing frontmatter entry in 06-03-SUMMARY.md. No code changes needed. |
| DOCS-03 | Example project: x402 service provider | examples/x402-service-provider/ is fully implemented and verified. Same frontmatter-only gap. |
| DOCS-04 | Example project: web dashboard (Next.js) | examples/nextjs-dashboard/ is fully implemented and verified. Same frontmatter-only gap. |
</phase_requirements>

## Standard Stack

No new libraries or tools are needed for this phase. It is pure file editing.

### Core
| File | What changes | Why |
|------|-------------|-----|
| `README.md` | Fix 2 wrong property names in error-handling block | `err.retryAfter` does not exist; real field is `retryAfterMs`. `err.status` does not exist; real field is `statusCode`. |
| `.planning/phases/06-adapters-docs-and-release/06-03-SUMMARY.md` | Add `requirements-completed` to frontmatter | DOCS-02, DOCS-03, DOCS-04 are verified satisfied but omitted from the summary frontmatter, causing them to show "partial" in the audit. |

### Alternatives Considered
None — the scope is fully determined by the audit findings and success criteria.

## Architecture Patterns

This phase has no architectural patterns. It is a documentation correction task.

### Precise Edit Map

**README.md — Error Handling block (lines 166-176)**

Current broken code (lines 170-173):
```ts
} else if (err instanceof RateLimitError) {
  console.error(`Rate limited. Retry after ${err.retryAfter}s`);   // WRONG: retryAfter does not exist
} else if (err instanceof APIError) {
  console.error(`API error ${err.status}: ${err.message}`);         // WRONG: status does not exist
```

Correct code (verified against packages/sdk/src/errors/index.ts):
```ts
} else if (err instanceof RateLimitError) {
  console.error(`Rate limited. Retry after ${err.retryAfterMs}s`);  // retryAfterMs?: number
} else if (err instanceof APIError) {
  console.error(`API error ${err.statusCode}: ${err.message}`);     // statusCode: number
```

Source of truth — errors/index.ts:
- `RateLimitError.retryAfterMs?: number` (line 79 of errors/index.ts)
- `APIError.statusCode: number` (line 96 of errors/index.ts)

**06-03-SUMMARY.md — frontmatter**

Current frontmatter (no requirements-completed field):
```yaml
---
phase: 06-adapters-docs-and-release
plan: 03
subsystem: docs-and-release
tags: [readme, examples, cloudflare-workers, nextjs, x402, publish-pipeline, attw]
```

Required addition:
```yaml
requirements-completed: [DOCS-02, DOCS-03, DOCS-04]
```

This field is what the audit's 3-source cross-reference checks. Without it, the audit cannot confirm DOCS-02/03/04 are complete from the SUMMARY source, leaving them "partial" even though VERIFICATION and REQUIREMENTS.md both confirm them satisfied.

### Anti-Patterns to Avoid
- **Do not re-audit other README sections**: The quickstart, platform adapters, API Overview table, Services Package, and Examples sections are all correct. Only the error-handling block needs changes.
- **Do not add DOCS-01 to the 06-03-SUMMARY.md frontmatter**: DOCS-01 belongs to Phase 7. The 06-03-SUMMARY.md should only credit what Phase 6 actually completed.
- **Do not change example project files**: All three examples (cloudflare-ai-agent, x402-service-provider, nextjs-dashboard) are verified correct. Touch nothing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Verifying error property names | Manual inspection or guessing | Read packages/sdk/src/errors/index.ts | The class definitions are authoritative ground truth |
| Confirming examples are correct | Re-running builds | Trust Phase 6 VERIFICATION.md | Phase 6 VERIFICATION already ran tsc --noEmit and next build on all examples with VERIFIED status |

**Key insight:** This phase is bookkeeping and a two-line text fix, not development. The hard work was done in Phase 6.

## Common Pitfalls

### Pitfall 1: Over-fixing the README
**What goes wrong:** Planner adds extra fixes to other README sections that appear "wrong" during review.
**Why it happens:** README review often surfaces subjective improvements unrelated to TypeScript correctness.
**How to avoid:** Scope strictly to the audit's identified errors. Only fix what the audit flagged as causing TypeScript errors.
**Warning signs:** Any task that touches Quick Start, Platform Adapters, API Overview, or Services sections.

### Pitfall 2: Mis-scoping the frontmatter fix
**What goes wrong:** Adding `requirements-completed: [DOCS-01, DOCS-02, DOCS-03, DOCS-04]` to 06-03-SUMMARY.md (including DOCS-01).
**Why it happens:** DOCS-01 is being closed in Phase 7, not Phase 6. The 06-03-SUMMARY.md is a historical record of Phase 6 work. DOCS-01 was NOT completed by Phase 6.
**How to avoid:** Add only `requirements-completed: [DOCS-02, DOCS-03, DOCS-04]` to 06-03-SUMMARY.md.
**Warning signs:** Any attempt to backfill DOCS-01 into the Phase 6 summary.

### Pitfall 3: Confusing `retryAfter` vs `retryAfterMs`
**What goes wrong:** Fixing `err.retryAfter` to `err.retryAfter` (adding Ms suffix) but leaving `err.retryAfter` elsewhere, or changing the wrong property.
**Why it happens:** Property name is similar enough to the wrong name that a casual fix misses the suffix.
**How to avoid:** Grep README.md for `retryAfter` and confirm only one occurrence exists; change it to `retryAfterMs`.

### Pitfall 4: Fixing `err.status` to `err.status` (staying wrong)
**What goes wrong:** Confusing HTTP status codes with the `statusCode` property.
**Why it happens:** Many HTTP libraries use `.status`. The hey.lol SDK uses `.statusCode` to match Node.js Error conventions.
**How to avoid:** Verify against errors/index.ts — `APIError.statusCode: number` on line 96.

## Code Examples

Verified patterns from official sources:

### RateLimitError correct usage
```typescript
// Source: packages/sdk/src/errors/index.ts, line 77-87
export class RateLimitError extends HeyLolError {
  readonly code: 'RATE_LIMITED';
  readonly retryAfterMs?: number;  // <-- the actual field name
  //...
}

// Correct README example:
} else if (err instanceof RateLimitError) {
  console.error(`Rate limited. Retry after ${err.retryAfterMs}s`);
}
```

### APIError correct usage
```typescript
// Source: packages/sdk/src/errors/index.ts, line 90-100
export class APIError extends HeyLolError {
  readonly code: 'API_ERROR';
  readonly statusCode: number;  // <-- the actual field name (NOT .status)
  //...
}

// Correct README example:
} else if (err instanceof APIError) {
  console.error(`API error ${err.statusCode}: ${err.message}`);
}
```

### 06-03-SUMMARY.md frontmatter after fix
```yaml
---
phase: 06-adapters-docs-and-release
plan: 03
subsystem: docs-and-release
tags: [readme, examples, cloudflare-workers, nextjs, x402, publish-pipeline, attw]
requirements-completed: [DOCS-02, DOCS-03, DOCS-04]
```

## State of the Art

| Old State | Current State | Changed In | Impact |
|-----------|---------------|------------|--------|
| README had `posts.list()` (non-existent) | README has `posts.create()` | Phase 6 Plan 03 | Already fixed — no action needed |
| README had `profile.get('me')` (wrong type) | README has `profile.me()` | Phase 6 Plan 03 | Already fixed — no action needed |
| README API table missing `me()`, `suggested()` | Both present in table | Phase 6 Plan 03 | Already fixed — no action needed |
| README has `err.retryAfter` | Still wrong | Phase 7 (pending) | Must fix: actual field is `retryAfterMs` |
| README has `err.status` | Still wrong | Phase 7 (pending) | Must fix: actual field is `statusCode` |
| 06-03-SUMMARY.md missing `requirements-completed` | Still missing | Phase 7 (pending) | Must add: DOCS-02, DOCS-03, DOCS-04 |

## Open Questions

None. All gaps are precisely identified with exact file locations and correct values verified from source.

## Sources

### Primary (HIGH confidence)
- `packages/sdk/src/errors/index.ts` — authoritative source for all error class property names. `RateLimitError.retryAfterMs` on line 79, `APIError.statusCode` on line 96.
- `README.md` (current state) — read directly, confirmed `err.retryAfter` (line 171) and `err.status` (line 173) are still wrong.
- `.planning/v1.0-MILESTONE-AUDIT.md` — audit report identifying all 4 gaps with exact line numbers and correct values.
- `.planning/phases/06-adapters-docs-and-release/06-VERIFICATION.md` — Phase 6 verification confirming DOCS-02/03/04 satisfied with evidence.
- `.planning/phases/06-adapters-docs-and-release/06-03-SUMMARY.md` — confirmed: no `requirements-completed` field in frontmatter.

### Secondary (MEDIUM confidence)
- None needed — all facts verifiable from primary sources.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- What needs to change: HIGH — confirmed by direct file inspection against audit
- Exact correct values: HIGH — verified from error class source code
- Scope boundaries: HIGH — audit precisely identifies 3 blockers, all other sections verified correct
- Risk: HIGH confidence LOW risk — two-line text fix plus one YAML field addition

**Research date:** 2026-03-01
**Valid until:** Stable indefinitely (no external dependencies; all facts are internal to the codebase)
