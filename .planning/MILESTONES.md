# Milestones

## v1.0 SDK Launch (Shipped: 2026-03-02)

**Phases:** 1-9 (22 plans)
**Timeline:** 3 days (2026-02-28 → 2026-03-02)
**Lines of code:** 5,769 TypeScript
**Files:** 173 changed, 31,312 insertions
**Requirements:** 55/55 satisfied

**Key accomplishments:**
1. Pure JS x402 auth engine — Ed25519 signing, Solana tx building, zero Node.js built-ins
2. Complete social API — posts, profiles, social graph, discovery, notifications with branded types
3. x402 service utilities — payment verification, on-chain settlement, 402 response generation
4. Runtime adapters — Cloudflare Workers, Vercel Edge, Express middleware
5. README quickstart + 3 example projects (AI agent, x402 service, Next.js dashboard)
6. CI pipeline — publint, attw, size-limit, changesets auto-publish

**Tech debt carried forward:**
- PAYMENT_HEADERS dead re-export in internal auth/index.ts barrel (Low)
- ServicesResource URL /services/{serviceId}/call is provisional (Info)
- Stale @cloudflare/workers-types devDep in adapter-cloudflare (Low)

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`

---

## v1.1 CLI (Shipped: 2026-03-03)

**Phases:** 10-14 (7 plans)
**Timeline:** 1 day (2026-03-02 → 2026-03-03)
**Lines of code:** 709 TypeScript (packages/cli/src/)
**Files:** 15 changed, 945 insertions
**Requirements:** 32/32 satisfied

**Key accomplishments:**
1. CLI binary `heylol` — commander-based program with 6 command groups, 22 subcommands
2. Structured output contract — JSON stdout, JSON stderr errors, TTY auto-detection, typed exit codes 0-5
3. Auth management — env var + config file credential resolution, non-interactive setup for CI/agents
4. Post and profile commands — create, reply, get, delete, like, unlike posts + view/update profiles
5. Social, discovery, and notifications — follow/unfollow, search/trending/suggested, notification management
6. Published to npm as `heylol@1.0.0` — works via `npx heylol` from any directory

**Tech debt carried forward:**
- PostsResource.list() uses divergent pagination pattern vs. other resources (Low)
- Dead code in index.ts catch block after printBadArgs (Low)
- ServicesResource URL /services/{serviceId}/call is provisional (carried from v1.0)

**Archive:** `.planning/milestones/v1.1-ROADMAP.md`, `.planning/milestones/v1.1-REQUIREMENTS.md`

---

