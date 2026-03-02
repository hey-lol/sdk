---
phase: 04-api-wrappers
plan: 01
subsystem: api
tags: [typescript, branded-types, domain-types, sdk, http-client]

requires:
  - phase: 03-http-client
    provides: HeyLolClient with get/post/patch/delete typed methods, 402 payment loop, retry infrastructure

provides:
  - PostId/UserId/NotificationId branded string types via unique symbol — compile-time cross-brand rejection
  - asPostId/asUserId/asNotificationId factory functions as sole entry points for branded values
  - Expanded Post/Profile/User/Notification domain interfaces with full fields and branded IDs
  - PaginatedList<T> and SearchResults collection types
  - PaginationParams, CreatePostParams, PaywallOptions, ReplyPostParams, UpdateProfileParams, SearchParams request param interfaces
  - HeyLolClient 204 No Content guard — returns undefined for empty responses
  - HeyLolClient.get() query params support via URLSearchParams serialization

affects:
  - 04-02 (PostsResource and ProfileResource depend on these types for method signatures)
  - 04-03 (SocialResource, DiscoveryResource, NotificationsResource depend on these types)

tech-stack:
  added: []
  patterns:
    - "Branded ID types via unique symbol intersection — Brand<T, B> = T & { readonly [__brand]: B }"
    - "Factory function pattern for branded values — asPostId(s) is the only way to create PostId"
    - "Barrel re-export pattern for types/index.ts and src/index.ts with separate type vs value exports"
    - "URLSearchParams for query string serialization with undefined-value filtering"

key-files:
  created:
    - packages/sdk/src/types/params.ts
  modified:
    - packages/sdk/src/types/domain.ts
    - packages/sdk/src/types/index.ts
    - packages/sdk/src/index.ts
    - packages/sdk/src/client/HeyLolClient.ts
    - packages/sdk/tests/client.test.ts

key-decisions:
  - "unique symbol brand key (__brand) used over string key — prevents brand forgery across modules, matches production SDK patterns (Anthropic, Stripe)"
  - "Factory functions as const arrow functions (asPostId = (s) => s as PostId) — zero runtime overhead, sole safe entry point for branded values"
  - "URLSearchParams for query serialization — Web API available in all target runtimes (browser, Node 18+, Deno, Workers, Bun)"
  - "204 guard checks both status === 204 and content-length === '0' — handles both explicit 204 and 200+empty responses"

patterns-established:
  - "Branded ID pattern: declare const __brand: unique symbol; type Brand<T, B> = T & { readonly [__brand]: B }"
  - "Factory pattern: export const asPostId = (s: string): PostId => s as PostId"
  - "Test fixture pattern: Post objects must use asPostId/asUserId for branded ID fields"

requirements-completed: [TYPE-01, TYPE-02]

duration: 2min
completed: 2026-03-01
---

# Phase 4 Plan 01: Type System Foundation Summary

**Branded PostId/UserId/NotificationId types via unique symbol with full domain interfaces (Post, Profile, User, Notification, PaginatedList), request param interfaces, and HeyLolClient 204 guard + GET query params**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T22:25:46Z
- **Completed:** 2026-03-01T22:27:46Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- Branded ID types (PostId, UserId, NotificationId) with compile-time enforcement — TypeScript rejects `const x: PostId = asUserId('u-1')` with a type error
- Full domain interfaces: Post (10 fields with branded IDs), Profile (9 fields), User (4 fields), Notification (6 fields), PaginatedList<T>, SearchResults
- Request param interfaces: PaginationParams, CreatePostParams, PaywallOptions, ReplyPostParams, UpdateProfileParams, SearchParams
- HeyLolClient.request() now safely returns undefined for 204 No Content and zero content-length responses
- HeyLolClient.get() now accepts optional query params and serializes via URLSearchParams with undefined-value filtering
- All 128 tests pass (123 existing + 5 new), build clean, zero typecheck errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Branded ID types, expanded domain interfaces, and request param interfaces** - `9ea8f14` (feat)
2. **Task 2: HeyLolClient 204 No Content guard and query params support** - `8b5c888` (feat)

## Files Created/Modified

- `packages/sdk/src/types/domain.ts` - Rewrote: Brand<T,B> infrastructure, PostId/UserId/NotificationId types and factories, expanded Post/Profile/User/Notification interfaces, PaginatedList<T>, SearchResults
- `packages/sdk/src/types/params.ts` - Created: PaginationParams, CreatePostParams, PaywallOptions, ReplyPostParams, UpdateProfileParams, SearchParams
- `packages/sdk/src/types/index.ts` - Updated barrel: re-exports all domain types, factories, and param interfaces alongside existing x402 types
- `packages/sdk/src/index.ts` - Updated main barrel: adds all new types (type exports) and factory functions (value exports)
- `packages/sdk/src/client/HeyLolClient.ts` - Added 204 guard before response.json(), changed get<T>() signature to accept optional params, added private buildQueryString() helper
- `packages/sdk/tests/client.test.ts` - Updated Post fixture to use asPostId/asUserId with full expanded fields; added 5 new tests (204, content-length=0, query params, undefined filtering, no params)

## Decisions Made

- Used `unique symbol` brand key (not `__brand: string`) — symbol-keyed brands cannot be fabricated from object literals outside the module, matching Anthropic and Stripe production SDK patterns
- Factory functions as const arrows — `export const asPostId = (s: string): PostId => s as PostId` — zero runtime overhead, the only safe entry point
- URLSearchParams for query string serialization — available in all target runtimes without polyfills
- Combined 204 status check with content-length: '0' check — defensive guard against both explicit 204 and 200+empty body patterns

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All types ready for Plans 02 and 03 resource class method signatures and return types
- PostsResource and ProfileResource can now use PostId, UserId, CreatePostParams, ReplyPostParams, UpdateProfileParams
- SocialResource and DiscoveryResource can use PaginatedList<User>, PaginatedList<Post>, PaginationParams, SearchParams
- NotificationsResource can use PaginatedList<Notification>, NotificationId, markRead pattern
- HeyLolClient.delete<void>() and post<void>() now correctly return undefined without JSON parse errors
- HeyLolClient.get<T>(path, params) ready for paginated list endpoints

---
*Phase: 04-api-wrappers*
*Completed: 2026-03-01*
