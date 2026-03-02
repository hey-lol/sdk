---
phase: 04-api-wrappers
plan: 02
subsystem: api
tags: [typescript, branded-types, resource-pattern, vitest]

# Dependency graph
requires:
  - phase: 04-01
    provides: PostId/UserId branded types, Post/Profile domain interfaces, CreatePostParams/ReplyPostParams/UpdateProfileParams

provides:
  - PostsResource class with create, get, delete, like, unlike, reply methods (POST-01 through POST-07)
  - ProfileResource class with me, get, update methods (PROF-01 through PROF-04)
  - Resource-class pattern with local HttpClient interface (no circular imports)
  - ROUTES constants pattern for centralizing path strings

affects:
  - 04-03 (remaining resource classes replicate this pattern)
  - plan-phase (wiring PostsResource/ProfileResource into HeyLolClient)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Resource class with injected HttpClient interface (avoids circular imports)
    - Local ROUTES constant object centralizing all path strings per resource
    - Single create() method handles multiple post variants via union params

key-files:
  created:
    - packages/sdk/src/resources/PostsResource.ts
    - packages/sdk/src/resources/ProfileResource.ts
    - packages/sdk/tests/posts.test.ts
    - packages/sdk/tests/profile.test.ts
  modified: []

key-decisions:
  - "Local HttpClient interface per resource class — avoids circular imports, each resource declares only the HTTP verbs it needs"
  - "Single create() covers text/media/paywalled posts — CreatePostParams union handles all variants, no overloads needed"
  - "ROUTES as const object with typed factory functions — template literals with branded types interpolate correctly since PostId/UserId extend string"
  - "ProfileResource.update() covers both PROF-03 and PROF-04 — UpdateProfileParams has four optional fields, one patch endpoint handles all update scenarios"

patterns-established:
  - "Resource HttpClient interface: define locally in each resource file with only the verbs that resource uses (get/post/delete vs get/patch)"
  - "ROUTES const: all path strings in one object at top of file, factory functions for parameterized paths"
  - "Mock client pattern in tests: vi.fn() for each verb, fresh instance per test, assert called-with for path and body"

requirements-completed:
  - POST-01
  - POST-02
  - POST-03
  - POST-04
  - POST-05
  - POST-06
  - POST-07
  - PROF-01
  - PROF-02
  - PROF-03
  - PROF-04

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 4 Plan 02: PostsResource and ProfileResource Summary

**PostsResource (6 methods, POST-01 through POST-07) and ProfileResource (3 methods, PROF-01 through PROF-04) implemented as injection-friendly resource classes using local HttpClient interfaces and ROUTES constants**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T22:31:35Z
- **Completed:** 2026-03-01T22:33:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- PostsResource delivers all 7 POST requirements: text posts, media posts, paywalled posts, get, delete, like/unlike, reply
- ProfileResource delivers all 4 PROF requirements: own profile (me), another user's profile (get), field updates and avatar/banner updates (update)
- Both resource classes use a local minimal HttpClient interface pattern that prevents circular imports with HeyLolClient
- 12 new tests (8 posts + 4 profile) all pass; total test suite at 140 tests with 100% resource coverage

## Task Commits

Each task was committed atomically:

1. **Task 1: PostsResource class with all post methods** - `d112ab9` (feat)
2. **Task 2: ProfileResource class with all profile methods** - `4afe4b3` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `packages/sdk/src/resources/PostsResource.ts` - PostsResource class with create, get, delete, like, unlike, reply; local HttpClient interface; ROUTES constant
- `packages/sdk/src/resources/ProfileResource.ts` - ProfileResource class with me, get, update; local HttpClient interface; ROUTES constant
- `packages/sdk/tests/posts.test.ts` - 8 tests verifying correct HTTP method, path, and body for every PostsResource method
- `packages/sdk/tests/profile.test.ts` - 4 tests verifying correct HTTP method, path, and body for every ProfileResource method

## Decisions Made

- **Local HttpClient interface per resource:** Each resource file defines only the HTTP verbs it needs (`get/post/delete` for posts, `get/patch` for profile). Keeps resource classes independently importable without pulling in full HeyLolClient, avoids circular dependency.
- **Single create() for all post variants:** `CreatePostParams` has optional `mediaUrls` and `paywall` fields — one method handles text, media, and paywalled posts without overloads or type narrowing.
- **ROUTES as const with factory functions:** All paths centralized in one object. Factory functions accept branded types and return template literals — works because `PostId`/`UserId` extend `string`.
- **update() covers PROF-03 and PROF-04:** `UpdateProfileParams` has four optional fields (displayName, bio, avatarUrl, bannerUrl) — one PATCH endpoint handles all profile update scenarios.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PostsResource and ProfileResource ready for wiring into HeyLolClient as `client.posts` and `client.profile` namespaces
- Resource-class pattern established for Plan 03 to replicate for remaining namespaces (feed, notifications, search)
- No blockers

---
*Phase: 04-api-wrappers*
*Completed: 2026-03-01*
