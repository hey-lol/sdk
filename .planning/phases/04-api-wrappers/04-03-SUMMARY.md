---
phase: 04-api-wrappers
plan: 03
subsystem: api
tags: [typescript, resource-classes, sdk, social, discovery, notifications, barrel-exports]

requires:
  - phase: 04-api-wrappers/04-01
    provides: PostId/UserId/NotificationId branded types, PaginationParams/SearchParams/PaginatedList interfaces, HeyLolClient 204 guard + GET query params
  - phase: 04-api-wrappers/04-02
    provides: PostsResource and ProfileResource classes establishing the resource-class pattern

provides:
  - SocialResource class with follow/unfollow/followers/following (SOCL-01 through SOCL-04)
  - DiscoveryResource class with search/trending/suggested (DISC-01 through DISC-03)
  - NotificationsResource class with list/markRead (NOTF-01, NOTF-02)
  - resources/index.ts barrel re-exporting all 5 resource classes
  - HeyLolClient with readonly posts/profile/social/discovery/notifications namespace properties
  - All 5 resource classes exported from @heylol/sdk main entry point
  - 159 total tests passing with 97.97% overall coverage

affects:
  - 05-services (may use resource classes as usage examples)
  - 06-adapters (consumes HeyLolClient with full resource surface)

tech-stack:
  added: []
  patterns:
    - "Resource barrel pattern: src/resources/index.ts re-exports all resource classes, excluded from coverage"
    - "Structural typing for circular import prevention: each resource defines local HttpClient interface, HeyLolClient satisfies it without direct import"
    - "PaginationParams cast: pass params as Record<string, string | number | undefined> to typed get() method"
    - "markRead body guard: ids && ids.length > 0 before sending body — undefined body for mark-all-read"
    - "search() param mapping: params.query -> q query param key (not query)"

key-files:
  created:
    - packages/sdk/src/resources/SocialResource.ts
    - packages/sdk/src/resources/DiscoveryResource.ts
    - packages/sdk/src/resources/NotificationsResource.ts
    - packages/sdk/src/resources/index.ts
    - packages/sdk/tests/social.test.ts
    - packages/sdk/tests/discovery.test.ts
    - packages/sdk/tests/notifications.test.ts
  modified:
    - packages/sdk/src/client/HeyLolClient.ts
    - packages/sdk/src/index.ts
    - packages/sdk/vitest.config.ts
    - packages/sdk/tests/client.test.ts

key-decisions:
  - "search() maps params.query to q query param — API convention, consistent with REST search patterns (q= is the standard search parameter name)"
  - "markRead body guard: omit body entirely when ids is undefined/empty — POST /notifications/read with no body marks all read, avoiding server-side empty-array handling ambiguity"
  - "PaginationParams cast as Record<string, string | number | undefined> — PaginationParams has cursor?: string and limit?: number which structurally matches the get() signature"
  - "resources/index.ts excluded from coverage — barrel re-export with no runtime logic, same pattern as auth/index.ts and client/index.ts"
  - "DiscoveryResource HttpClient uses get-only interface (no post/delete) — minimal surface, correct for read-only discovery endpoints"

patterns-established:
  - "Resource barrel: src/resources/index.ts is the single import point for all resource classes in HeyLolClient and src/index.ts"
  - "Namespace wiring: HeyLolClient imports from resources/index.js, initializes all 5 via new XResource(this) in constructor"
  - "Integration test pattern: client.test.ts describes('resource namespaces') verifies instanceof and method presence for each namespace"

requirements-completed: [SOCL-01, SOCL-02, SOCL-03, SOCL-04, DISC-01, DISC-02, DISC-03, NOTF-01, NOTF-02]

duration: 6min
completed: 2026-03-01
---

# Phase 4 Plan 03: Complete API Wrapper Surface Summary

**SocialResource (follow/unfollow/followers/following), DiscoveryResource (search/trending/suggested), NotificationsResource (list/markRead) wired into HeyLolClient as readonly namespaces — full 5-resource API surface with 159 tests green**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T22:32:09Z
- **Completed:** 2026-03-01T22:37:29Z
- **Tasks:** 2
- **Files modified:** 10 (7 created, 3 modified, plus 1 updated existing test)

## Accomplishments

- Three new resource classes: SocialResource (4 methods), DiscoveryResource (3 methods), NotificationsResource (2 methods) — all using local HttpClient interfaces to prevent circular imports
- All 9 new requirements covered: SOCL-01 through SOCL-04, DISC-01 through DISC-03, NOTF-01, NOTF-02
- HeyLolClient wired with all 5 resource namespaces as readonly properties (`client.posts`, `client.profile`, `client.social`, `client.discovery`, `client.notifications`)
- resources/index.ts barrel re-exports all 5 resource classes; excluded from coverage measurement
- All resource classes exported from @heylol/sdk main entry — `import { SocialResource } from '@heylol/sdk'` works
- 159 total tests pass (up from 140), 97.97% overall coverage, full CI green (16/16 turbo tasks)

## Task Commits

Each task was committed atomically:

1. **Task 1: SocialResource, DiscoveryResource, NotificationsResource with tests** - `d60d1b1` (feat)
2. **Task 2: Wire all resources into HeyLolClient, barrel exports, full CI** - `515faf4` (feat)

## Files Created/Modified

- `packages/sdk/src/resources/SocialResource.ts` - Created: follow/unfollow (POST/DELETE /users/:id/follow), followers/following with PaginationParams
- `packages/sdk/src/resources/DiscoveryResource.ts` - Created: search (GET /search, query->q mapping), trending/suggested with pagination
- `packages/sdk/src/resources/NotificationsResource.ts` - Created: list with pagination, markRead with optional ids body
- `packages/sdk/src/resources/index.ts` - Created: barrel re-exporting all 5 resource classes
- `packages/sdk/tests/social.test.ts` - Created: 5 tests (follow, unfollow, followers no-params, followers with-params, following with-params)
- `packages/sdk/tests/discovery.test.ts` - Created: 5 tests (search with query, search with type+pagination, trending no-params, trending with-params, suggested)
- `packages/sdk/tests/notifications.test.ts` - Created: 4 tests (list no-params, list with-params, markRead with ids, markRead no ids/mark-all)
- `packages/sdk/src/client/HeyLolClient.ts` - Modified: import all 5 resource classes, add 5 readonly properties, initialize in constructor
- `packages/sdk/src/index.ts` - Modified: added Resources section exporting all 5 classes from resources/index.js
- `packages/sdk/vitest.config.ts` - Modified: added src/resources/index.ts to coverage exclude list
- `packages/sdk/tests/client.test.ts` - Modified: import 5 resource classes, added describe('resource namespaces') with 5 instanceof + method-presence tests

## Decisions Made

- `search()` maps `params.query` to `q` query param (not `query=`) — matches standard REST search conventions; all other params pass through unchanged
- `markRead()` body guard: `ids && ids.length > 0 ? { ids } : undefined` — sending empty array could be misinterpreted by server as "mark none", omitting body is unambiguously "mark all"
- `PaginationParams` cast as `Record<string, string | number | undefined>` for typed `get()` — structurally correct since PaginationParams has only `cursor?: string` and `limit?: number`
- `DiscoveryResource.HttpClient` interface is get-only (no post/delete) — minimal required surface for read-only discovery endpoints
- `resources/index.ts` excluded from coverage — barrel re-export file with no runtime logic, same pattern established by `auth/index.ts` and `client/index.ts`

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 4 complete: all 5 resource namespaces accessible on `HeyLolClient` as readonly typed properties
- `client.posts.*`, `client.profile.*`, `client.social.*`, `client.discovery.*`, `client.notifications.*` all callable with full branded type enforcement
- All resource classes and types importable from `@heylol/sdk`
- Phase 5 (Services/Zod validation) can reference resource method signatures as examples of the established pattern
- Phase 6 (Adapters) can construct `HeyLolClient` and access the full resource surface

---
*Phase: 04-api-wrappers*
*Completed: 2026-03-01*
