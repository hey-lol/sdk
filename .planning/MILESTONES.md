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
