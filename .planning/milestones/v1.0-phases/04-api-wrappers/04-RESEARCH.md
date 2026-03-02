# Phase 4: API Wrappers - Research

**Researched:** 2026-03-01
**Domain:** TypeScript SDK resource-class architecture, branded ID types, social platform REST API conventions, paginated list response design
**Confidence:** HIGH (patterns drawn from production SDKs: Anthropic, Stripe, Twitter API v2; branded types from TS compiler internals; Phase 3 codebase fully read)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POST-01 | Developer can create a text post | `client.posts.create({ content })` → typed `Post` response; `HeyLolClient.post<Post>()` already available from Phase 3 |
| POST-02 | Developer can create a post with media (images, video, GIF) | `client.posts.create({ content, media })` with `MediaAttachment[]` typed field; multipart OR URL-reference design decision needed (see Open Questions) |
| POST-03 | Developer can get a post by ID | `client.posts.get(postId: PostId)` → `Post`; branded `PostId` prevents string mixing |
| POST-04 | Developer can delete own post | `client.posts.delete(postId: PostId)` → `void`; uses `HeyLolClient.delete<void>()` |
| POST-05 | Developer can like/unlike a post | `client.posts.like(postId)` and `client.posts.unlike(postId)`; or single toggle `client.posts.setLike(postId, liked: boolean)` |
| POST-06 | Developer can reply to a post | `client.posts.reply(postId, { content })` — reply is a post with `parentId` set; same `Post` return type |
| POST-07 | Developer can create a paywalled post with teaser | `client.posts.create({ content, paywall: { teaser, price } })`; `PaywallOptions` interface needed |
| PROF-01 | Developer can get own profile | `client.profile.me()` → `Profile`; uses authenticated GET |
| PROF-02 | Developer can get another user's profile | `client.profile.get(userId: UserId)` → `Profile`; takes branded `UserId` |
| PROF-03 | Developer can update profile fields | `client.profile.update(fields: UpdateProfileParams)` → `Profile`; PATCH semantics |
| PROF-04 | Developer can set avatar and banner URLs | Covered by `client.profile.update({ avatarUrl, bannerUrl })` OR separate `client.profile.setAvatar(url)` methods |
| SOCL-01 | Developer can follow a user | `client.social.follow(userId: UserId)` → `void` |
| SOCL-02 | Developer can unfollow a user | `client.social.unfollow(userId: UserId)` → `void` |
| SOCL-03 | Developer can list followers of a user | `client.social.followers(userId, params?)` → `PaginatedList<User>` |
| SOCL-04 | Developer can list users a user is following | `client.social.following(userId, params?)` → `PaginatedList<User>` |
| DISC-01 | Developer can search for users and posts | `client.discovery.search(query, params?)` → `SearchResults` with `.users[]` and `.posts[]`; OR two methods |
| DISC-02 | Developer can get trending posts | `client.discovery.trending(params?)` → `PaginatedList<Post>` |
| DISC-03 | Developer can get suggested users | `client.discovery.suggested(params?)` → `User[]` |
| NOTF-01 | Developer can list notifications | `client.notifications.list(params?)` → `PaginatedList<Notification>` |
| NOTF-02 | Developer can mark notifications as read | `client.notifications.markRead(ids?: NotificationId[])` → `void`; omitting ids = mark all read |
| TYPE-01 | Full TypeScript types for all API methods, request params, and response objects | Achieved via resource-class method signatures + interfaces in `src/types/domain.ts` |
| TYPE-02 | Branded types for IDs (PostId, UserId) to prevent mixing | `type PostId = string & { readonly __brand: 'PostId' }` pattern; `asPostId(s: string): PostId` cast helpers |
</phase_requirements>

---

## Summary

Phase 4 takes the `HeyLolClient` from Phase 3 (which already has `get<T>`, `post<T>`, `patch<T>`, `delete<T>`) and wraps it with five resource-class namespaces: `posts`, `profile`, `social`, `discovery`, and `notifications`. Each namespace is a class that receives the client instance at construction and delegates all HTTP calls through `this._client.get<T>(path)` etc. The main `HeyLolClient` exposes these as readonly properties (initialized once in the constructor), mirroring the Anthropic SDK's `client.messages`, `client.models` pattern exactly.

The biggest decision point is the `__brand` pattern for TYPE-02. There are two syntactic variants in the ecosystem — `{ __brand: T }` and `{ readonly [symbol]: T }`. Both work; the symbol variant is theoretically more leakproof (the symbol can't be faked via object literals), but it requires `declare const` module-level symbols and is harder to inspect. For a developer-facing SDK where simplicity and inspectability matter, `{ readonly __brand: 'PostId' }` with a `declare const __brand: unique symbol` keyed approach is the production-standard choice (verified from Anthropic and Stripe patterns).

The hey.lol public API documentation is not publicly accessible at `docs.hey.lol` (ECONNREFUSED) and there are no API schema files in the codebase. The `baseUrl` in `ClientOptions` is `https://api.hey.lol`. **The specific endpoint paths and request/response shapes must be assumed from standard social platform REST conventions.** These assumptions are flagged as LOW confidence and must be validated against the real API during integration testing. All method signatures and URL conventions follow Twitter API v2 and industry-standard social REST APIs, which map cleanly to the requirements.

**Primary recommendation:** Build as three plans: (1) branded types + expanded domain types + resource-class infrastructure, (2) `PostsResource` and `ProfileResource` with tests, (3) `SocialResource`, `DiscoveryResource`, `NotificationsResource` with tests + HeyLolClient wiring + barrel exports.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native TypeScript type system | Built-in | Branded types via `unique symbol` intersection | Zero runtime overhead; compile-time enforcement; no library needed |
| `HeyLolClient` (Phase 3) | workspace | Typed HTTP methods `get<T>`, `post<T>`, `patch<T>`, `delete<T>` | Already built with 402 retry, backoff, error hierarchy |
| `vitest` + `vi.fn()` | catalog | Mock `HeyLolClient.get/post` for resource class tests | Same test infrastructure used in Phase 3; injectable client |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new | — | — | Phase 4 adds no new runtime dependencies |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `{ readonly __brand: 'PostId' }` phantom property | `unique symbol` key via `declare const` | Symbol key is theoretically un-fakeable from outside module; string key `__brand` is simpler and inspectable; both work equally well in practice for this SDK |
| Inline resource methods on `HeyLolClient` | Separate resource classes attached as properties | Inline methods create a monolithic 500+ line client class that becomes hard to organize; resource classes enable split files and isolated tests |
| Getter-based lazy resource init | Constructor-initialized readonly properties | Lazy getters avoid instantiation if namespace is never used; for a social API where all namespaces are almost always used, constructor init is simpler and avoids the `private _posts?: PostsResource` dance |

**Installation:** No new dependencies. All primitives are from Phase 3 or native TypeScript.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── client/
│   ├── HeyLolClient.ts     # MODIFY: add readonly resource properties
│   ├── options.ts           # Unchanged
│   ├── retry.ts             # Unchanged
│   └── index.ts             # Unchanged
├── resources/               # NEW: one file per resource namespace
│   ├── PostsResource.ts
│   ├── ProfileResource.ts
│   ├── SocialResource.ts
│   ├── DiscoveryResource.ts
│   ├── NotificationsResource.ts
│   └── index.ts             # Barrel: re-exports all resource classes
├── types/
│   ├── domain.ts            # EXPAND: full Post, Profile, User, Notification + branded IDs
│   ├── params.ts            # NEW: request param interfaces (CreatePostParams, etc.)
│   └── index.ts             # EXPAND: re-export all new types
├── errors/
│   └── index.ts             # Unchanged
├── auth/                    # Unchanged from Phase 2
└── index.ts                 # EXPAND: add resource class exports + type exports
```

### Pattern 1: Resource Class with Client Injection

**What:** Each resource namespace is a class that stores a reference to `HeyLolClient` and delegates HTTP calls through it. The main client holds readonly references to resource instances, initialized in the constructor.

**When to use:** Anytime you have more than 3-4 methods grouped around a single REST resource. Keeps class files small and individually testable.

**Example (verified from Anthropic SDK source + Phase 3 client):**

```typescript
// src/resources/PostsResource.ts
import type { HeyLolClient } from '../client/HeyLolClient.js';
import type { Post, PostId } from '../types/index.js';
import type { CreatePostParams } from '../types/params.js';

export class PostsResource {
  constructor(private readonly _client: HeyLolClient) {}

  async create(params: CreatePostParams): Promise<Post> {
    return this._client.post<Post>('/posts', params);
  }

  async get(id: PostId): Promise<Post> {
    return this._client.get<Post>(`/posts/${id}`);
  }

  async delete(id: PostId): Promise<void> {
    return this._client.delete<void>(`/posts/${id}`);
  }

  async like(id: PostId): Promise<void> {
    return this._client.post<void>(`/posts/${id}/like`);
  }

  async unlike(id: PostId): Promise<void> {
    return this._client.delete<void>(`/posts/${id}/like`);
  }

  async reply(id: PostId, params: ReplyPostParams): Promise<Post> {
    return this._client.post<Post>(`/posts/${id}/replies`, params);
  }
}
```

```typescript
// src/client/HeyLolClient.ts — ADDITIONS to constructor body
import { PostsResource } from '../resources/PostsResource.js';
import { ProfileResource } from '../resources/ProfileResource.js';
// ... etc

export class HeyLolClient {
  // ... existing fields ...
  readonly posts: PostsResource;
  readonly profile: ProfileResource;
  readonly social: SocialResource;
  readonly discovery: DiscoveryResource;
  readonly notifications: NotificationsResource;

  constructor(opts: ClientOptions) {
    // ... existing initialization ...
    this.posts = new PostsResource(this);
    this.profile = new ProfileResource(this);
    this.social = new SocialResource(this);
    this.discovery = new DiscoveryResource(this);
    this.notifications = new NotificationsResource(this);
  }
}
```

### Pattern 2: Branded ID Types

**What:** Intersect primitive `string` with a phantom property keyed by a `unique symbol`. The symbol exists only in the type system — zero runtime overhead. Factory functions are the only entry point for creating branded values.

**When to use:** Any API that has multiple ID types where mix-ups would cause silent bugs (wrong resource fetched, wrong user followed, etc.).

**Example (verified from egghead.io branded types article + TS compiler behavior):**

```typescript
// src/types/domain.ts

// The brand property key — unique symbol prevents forgery across modules
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// Branded ID types — TypeScript rejects mixing these
export type PostId = Brand<string, 'PostId'>;
export type UserId = Brand<string, 'UserId'>;
export type NotificationId = Brand<string, 'NotificationId'>;

// Factory functions — the only way to create branded values
// Use these when parsing API responses
export function asPostId(s: string): PostId { return s as PostId; }
export function asUserId(s: string): UserId { return s as UserId; }
export function asNotificationId(s: string): NotificationId { return s as NotificationId; }

// Domain types using branded IDs
export interface Post {
  id: PostId;
  authorId: UserId;
  content: string;
  teaser?: string;          // Present on paywalled posts
  paywalled: boolean;
  mediaUrls: string[];      // Empty array for text-only posts
  parentId?: PostId;        // Present if this is a reply
  likeCount: number;
  replyCount: number;
  createdAt: string;        // ISO 8601
}

export interface Profile {
  id: UserId;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  bannerUrl?: string;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface User {
  id: UserId;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Notification {
  id: NotificationId;
  type: 'like' | 'reply' | 'follow' | 'mention' | 'paywall_unlock';
  read: boolean;
  actorId: UserId;
  postId?: PostId;          // Present for like/reply/mention notifications
  createdAt: string;
}
```

### Pattern 3: Paginated List Response

**What:** List endpoints (followers, following, trending, notifications) return a consistent envelope with `items` array and optional `nextCursor`. No total count — cursor-based pagination only. Matches standard social API conventions.

**When to use:** Any endpoint that returns a variable-length collection.

**Example:**

```typescript
// src/types/params.ts

export interface PaginationParams {
  cursor?: string;
  limit?: number;          // Default 20, max 100 on most endpoints
}

// src/types/domain.ts (addition)
export interface PaginatedList<T> {
  items: T[];
  nextCursor?: string;     // Absent on last page
  hasMore: boolean;
}
```

### Pattern 4: Request Parameter Interfaces

**What:** Each mutating method gets a dedicated params interface named `<Verb><Noun>Params`. Read methods that take only an ID don't need a params interface — the ID is passed directly as a typed argument.

**Example:**

```typescript
// src/types/params.ts

export interface CreatePostParams {
  content: string;
  mediaUrls?: string[];     // Optional media attachments
  paywall?: PaywallOptions;
}

export interface PaywallOptions {
  teaser: string;           // Preview text shown to non-paying readers
  price: string;            // Amount as string (e.g. "0.01" USDC)
}

export interface ReplyPostParams {
  content: string;
  mediaUrls?: string[];
}

export interface UpdateProfileParams {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}

export interface SearchParams extends PaginationParams {
  type?: 'users' | 'posts' | 'all';
}

export interface SearchResults {
  users: User[];
  posts: Post[];
}
```

### Pattern 5: Resource Method Testing with Mock Client

**What:** Inject a mock `HeyLolClient` (or a minimal duck-typed mock) into the resource class constructor. No HTTP calls are made — just verify the resource calls the right `_client.get/post/delete` with the right path and body.

**Example:**

```typescript
// tests/posts.test.ts
import { describe, expect, it, vi } from 'vitest';
import { PostsResource } from '../src/resources/PostsResource.js';
import type { Post } from '../src/types/index.js';
import { asPostId } from '../src/types/domain.js';

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

describe('PostsResource', () => {
  it('get() calls GET /posts/:id', async () => {
    const client = mockClient();
    const post: Post = { id: asPostId('p-1'), authorId: asUserId('u-1'), content: 'hi', paywalled: false, mediaUrls: [], likeCount: 0, replyCount: 0, createdAt: '2026-01-01T00:00:00Z' };
    client.get.mockResolvedValueOnce(post);

    const resource = new PostsResource(client as any);
    const result = await resource.get(asPostId('p-1'));

    expect(client.get).toHaveBeenCalledWith('/posts/p-1');
    expect(result).toEqual(post);
  });
});
```

### Anti-Patterns to Avoid

- **Making resource classes extend `HeyLolClient`:** Resource classes are NOT subclasses of the client. They are injected consumers of it. Inheritance here would be a category error.
- **Putting resource methods directly on `HeyLolClient`:** The client class would balloon to 50+ methods. Resource classes keep concerns separated.
- **Using `any` for resource method return types:** Every method must have an explicit return type annotation. TypeScript infers from `_client.get<T>()` but explicit annotations document the contract.
- **Passing raw strings where branded IDs are expected:** `resource.get('p-123')` should fail type-checking. The API surface must accept `PostId`, forcing callers to use `asPostId()` when constructing from raw strings.
- **Omitting the `readonly` modifier on resource properties in `HeyLolClient`:** Without `readonly`, callers can reassign `client.posts = something` which breaks the contract.
- **Cursor pagination with page-number logic:** Social platforms use cursors. Do not add `page: number` to pagination params — cursors and pages are mutually incompatible conventions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Branded ID type enforcement | Custom validation class or Map registry | TypeScript `unique symbol` intersection type | Zero runtime overhead; enforcement is pure compile-time; no instanceof needed |
| HTTP method routing | New fetch logic in resource classes | `this._client.get/post/patch/delete` from Phase 3 | Phase 3 already handles 402 retry, backoff, error hierarchy — resource classes are pure wrappers |
| Pagination helper class | Custom iterator/PageFetcher class | Simple `PaginatedList<T>` interface returned directly | Async iterators are out of scope for Phase 4; simple cursor-in/cursor-out is sufficient and interoperable |
| Request serialization | Custom serializer | `JSON.stringify` via `HeyLolClient.post(path, body)` | Phase 3 client already serializes body; resource classes pass typed objects, client serializes them |
| Response validation | Zod schema in resource classes | TypeScript cast via `_client.get<Post>()` | Zod is an optional peer dep per prior decision; Phase 4 does not add Zod as required dep |

**Key insight:** Resource classes are thin delegation wrappers. Every line that isn't `this._client.X(path, body)` is overhead worth questioning.

---

## Common Pitfalls

### Pitfall 1: Circular Import Between HeyLolClient and Resource Classes

**What goes wrong:** `HeyLolClient.ts` imports `PostsResource`, `PostsResource.ts` imports `HeyLolClient` for the type annotation on `_client` — circular dependency. TypeScript compiles it (type imports are erased), but some bundlers/runtimes error.

**Why it happens:** Tight coupling between client and resources when using `HeyLolClient` as the type of `_client` in resource class constructors.

**How to avoid:** In resource class files, type the constructor parameter as a minimal interface rather than the full `HeyLolClient` class:

```typescript
// src/resources/PostsResource.ts
interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

export class PostsResource {
  constructor(private readonly _client: HttpClient) {}
  // ...
}
```

This breaks the circular import — `PostsResource` no longer imports `HeyLolClient`. `HeyLolClient` still imports `PostsResource` (one-way dependency). The `HttpClient` interface is satisfied structurally by `HeyLolClient`, so `new PostsResource(this)` in the client constructor type-checks correctly.

**Warning signs:** Node.js prints `Cannot access 'PostsResource' before initialization` or `HeyLolClient is undefined` at startup.

### Pitfall 2: Branded Types Not Exported Correctly

**What goes wrong:** `PostId` is defined in `types/domain.ts` but the `asPostId` factory is not exported from the main `index.ts`. Developers get the type but cannot create branded values — they resort to `as PostId` casts scattered everywhere.

**Why it happens:** Forgetting that brands need both the type AND the factory in the public API.

**How to avoid:** Export both type and factory from `src/index.ts`:

```typescript
export type { PostId, UserId, NotificationId } from './types/index.js';
export { asPostId, asUserId, asNotificationId } from './types/index.js';
```

**Warning signs:** Developer code contains `post.id as PostId` or `user.id as UserId` — this means the factory wasn't exported.

### Pitfall 3: Applying Brands to Raw API Response Data

**What goes wrong:** The API returns `{ id: "p-123", ... }`. The response is typed as `Post` with `id: PostId`. But `response.json()` gives `{ id: string }`. TypeScript allows the cast `as Post` even though `id` is technically `string`, not `PostId` — so PostId branded guarantees only work inside the SDK, not at the response boundary.

**Why it happens:** TypeScript's `as T` cast is structurally permissive for intersections.

**How to avoid:** Accept this limitation consciously. The branded guarantee is that method _parameters_ (e.g., `posts.get(id: PostId)`) enforce correct types. The API response casting is a known structural cast. Document this in the types comment: "PostId is a brand type — guaranteed at method call sites; response data is cast via `as Post`."

**Warning signs:** Writing a runtime validator to enforce PostId at the response boundary — that's Zod territory, which is out of scope.

### Pitfall 4: stub `Post`, `Profile`, `User` Types in Phase 3 Break Phase 4

**What goes wrong:** Phase 3 defined minimal stubs: `Post { id: string; authorId: string; content: string; createdAt: string }`. Phase 4 expands them with `id: PostId`, `authorId: UserId`, etc. Code that used `Post.id` and assigned it to a `string` variable now fails type-checking.

**Why it happens:** Upgrading `id: string` to `id: PostId` is a breaking structural change.

**How to avoid:** In Phase 4's Plan 1 (types expansion), include a test that verifies existing client.test.ts still passes after the domain type upgrade. Update any test fixtures that directly create `Post` objects to use `asPostId()` / `asUserId()` for ID fields.

**Warning signs:** `client.test.ts` fails after Phase 4 Plan 1 with "string is not assignable to PostId".

### Pitfall 5: Missing `void` Return Type on Mutation Methods

**What goes wrong:** `posts.delete()` and `posts.like()` return `Promise<void>` but are typed `Promise<unknown>`. Callers cannot chain or use `await` cleanly without type errors.

**Why it happens:** `_client.delete<void>('/posts/id')` with `response.json() as void` is nonsensical — JSON parsing a successful 204 No Content body throws.

**How to avoid:** The `HeyLolClient.delete<void>` method must handle empty bodies. The client's `response.json()` fallback should check `response.status === 204` (or `Content-Length: 0`) and return `undefined` for void methods. Verify Phase 3 client handles this. If not, add a guard:

```typescript
// In HeyLolClient.request():
if (response.status === 204 || response.headers.get('content-length') === '0') {
  return undefined as T;
}
return response.json() as Promise<T>;
```

**Warning signs:** `like()` or `delete()` tests throw `SyntaxError: Unexpected end of JSON input`.

### Pitfall 6: hey.lol API Endpoint Paths Unknown

**What goes wrong:** The hey.lol API docs are not publicly accessible. Endpoint paths are assumed from REST conventions (`/posts`, `/posts/:id`, `/users/:id/followers`). Real paths may differ.

**Why it happens:** No API schema exists in the codebase. The `baseUrl` is `https://api.hey.lol` but no route map is documented.

**How to avoid:** Make all paths configurable through resource class constants, not string literals scattered across methods. Define a single `ROUTES` object or use string template patterns so paths can be updated in one place when the real API is validated:

```typescript
const ROUTES = {
  posts: '/posts',
  post: (id: string) => `/posts/${id}`,
  postLike: (id: string) => `/posts/${id}/like`,
  postReplies: (id: string) => `/posts/${id}/replies`,
  // etc.
} as const;
```

**Warning signs:** Integration test against real API returns 404 on assumed paths — update the constant, not 20 scattered string literals.

---

## Code Examples

Verified patterns from production SDK sources and Phase 3 codebase:

### Branded ID Types (Full Implementation)

```typescript
// src/types/domain.ts
// Source: egghead.io branded types article + TS unique symbol behavior

// unique symbol ensures brand key cannot be fabricated from another module
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type PostId = Brand<string, 'PostId'>;
export type UserId = Brand<string, 'UserId'>;
export type NotificationId = Brand<string, 'NotificationId'>;

// Factory functions — only way to create branded values from raw strings
export const asPostId = (s: string): PostId => s as PostId;
export const asUserId = (s: string): UserId => s as UserId;
export const asNotificationId = (s: string): NotificationId => s as NotificationId;

// Compile-time verification that brands reject mixing:
// const uid: UserId = asUserId('u-1');
// const pid: PostId = asPostId('p-1');
// const wrong: PostId = uid; // TS ERROR: Type 'UserId' is not assignable to type 'PostId'
```

### Resource Class with Minimal HttpClient Interface

```typescript
// src/resources/PostsResource.ts
// Source: Anthropic SDK resource class pattern (APIResource extends base client pattern)

import type { PaginatedList, Post, PostId } from '../types/domain.js';
import type { CreatePostParams, PaginationParams, ReplyPostParams } from '../types/params.js';

interface HttpClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

const R = {
  posts: '/posts',
  post: (id: PostId) => `/posts/${id}`,
  postLike: (id: PostId) => `/posts/${id}/like`,
  postReplies: (id: PostId) => `/posts/${id}/replies`,
} as const;

export class PostsResource {
  constructor(private readonly _client: HttpClient) {}

  async create(params: CreatePostParams): Promise<Post> {
    return this._client.post<Post>(R.posts, params);
  }

  async get(id: PostId): Promise<Post> {
    return this._client.get<Post>(R.post(id));
  }

  async delete(id: PostId): Promise<void> {
    return this._client.delete<void>(R.post(id));
  }

  async like(id: PostId): Promise<void> {
    return this._client.post<void>(R.postLike(id));
  }

  async unlike(id: PostId): Promise<void> {
    return this._client.delete<void>(R.postLike(id));
  }

  async reply(id: PostId, params: ReplyPostParams): Promise<Post> {
    return this._client.post<Post>(R.postReplies(id), params);
  }
}
```

### HeyLolClient Resource Property Addition

```typescript
// src/client/HeyLolClient.ts — additions only

import { DiscoveryResource } from '../resources/DiscoveryResource.js';
import { NotificationsResource } from '../resources/NotificationsResource.js';
import { PostsResource } from '../resources/PostsResource.js';
import { ProfileResource } from '../resources/ProfileResource.js';
import { SocialResource } from '../resources/SocialResource.js';

export class HeyLolClient {
  // ... existing private fields ...

  // Resource namespaces — initialized in constructor
  readonly posts: PostsResource;
  readonly profile: ProfileResource;
  readonly social: SocialResource;
  readonly discovery: DiscoveryResource;
  readonly notifications: NotificationsResource;

  constructor(opts: ClientOptions) {
    // ... existing initialization ...
    this.posts = new PostsResource(this);
    this.profile = new ProfileResource(this);
    this.social = new SocialResource(this);
    this.discovery = new DiscoveryResource(this);
    this.notifications = new NotificationsResource(this);
  }
}
```

### ProfileResource (PROF-01 through PROF-04)

```typescript
// src/resources/ProfileResource.ts

import type { Profile, UserId } from '../types/domain.js';
import type { UpdateProfileParams } from '../types/params.js';

interface HttpClient {
  get<T>(path: string): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
}

export class ProfileResource {
  constructor(private readonly _client: HttpClient) {}

  // PROF-01: own profile
  async me(): Promise<Profile> {
    return this._client.get<Profile>('/profile/me');
  }

  // PROF-02: another user's profile
  async get(id: UserId): Promise<Profile> {
    return this._client.get<Profile>(`/users/${id}/profile`);
  }

  // PROF-03 + PROF-04: update fields including avatarUrl/bannerUrl
  async update(params: UpdateProfileParams): Promise<Profile> {
    return this._client.patch<Profile>('/profile/me', params);
  }
}
```

### SocialResource (SOCL-01 through SOCL-04)

```typescript
// src/resources/SocialResource.ts

import type { PaginatedList, User, UserId } from '../types/domain.js';
import type { PaginationParams } from '../types/params.js';

interface HttpClient {
  get<T>(path: string, params?: Record<string, string>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

export class SocialResource {
  constructor(private readonly _client: HttpClient) {}

  async follow(id: UserId): Promise<void> {
    return this._client.post<void>(`/users/${id}/follow`);
  }

  async unfollow(id: UserId): Promise<void> {
    return this._client.delete<void>(`/users/${id}/follow`);
  }

  async followers(id: UserId, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(`/users/${id}/followers`, params as any);
  }

  async following(id: UserId, params?: PaginationParams): Promise<PaginatedList<User>> {
    return this._client.get<PaginatedList<User>>(`/users/${id}/following`, params as any);
  }
}
```

### 204 No Content Guard (Phase 3 Client Fix)

```typescript
// Addition to HeyLolClient.request() before response.json()
// Handles DELETE endpoints and like/unlike that return 204

if (response.status === 204 || response.headers.get('content-length') === '0') {
  return undefined as T;
}
return response.json() as Promise<T>;
```

### Vitest Mock Pattern for Resource Tests

```typescript
// Standard mock client for resource class tests
function mockClient() {
  return {
    get: vi.fn<[string, ...unknown[]], Promise<unknown>>(),
    post: vi.fn<[string, ...unknown[]], Promise<unknown>>(),
    patch: vi.fn<[string, ...unknown[]], Promise<unknown>>(),
    delete: vi.fn<[string, ...unknown[]], Promise<unknown>>(),
  };
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic client with all methods | Resource class namespace pattern | Stripe SDK ~2018, Anthropic SDK 2023 | Organized code, isolated tests per resource, smaller files |
| `number` IDs | Branded `string` IDs | TypeScript 2.7 `unique symbol` (2018), widely adopted 2022+ | Compile-time ID safety, no runtime overhead |
| Numeric pagination (`page: number`) | Cursor-based pagination | Twitter/X API v2 (2020), most social APIs since 2021 | Consistent performance regardless of dataset size; no off-by-one page issues |
| `interface` only for params | Dedicated params interfaces + response interfaces | SDK generator tooling era (2022-2024) | Better IntelliSense, cleaner method signatures, easier to extend |
| Mutable resource properties on client | `readonly` resource properties | Good TypeScript hygiene, enforced in Anthropic SDK | Prevents accidental reassignment of `client.posts` |

**Deprecated/outdated:**
- Axios-based SDK wrappers: Not viable in edge runtimes; Phase 3 already uses native fetch.
- `Object.setPrototypeOf` in brand helpers: Not needed — `unique symbol` intersection handles branding at type level only.
- Page-number pagination: Use cursors for social platform list endpoints.

---

## Open Questions

1. **Actual hey.lol REST endpoint paths**
   - What we know: `baseUrl` is `https://api.hey.lol`; docs are not publicly accessible
   - What's unclear: All specific paths (`/posts`, `/posts/:id/like`, `/users/:id/followers`, `/profile/me`, etc.) are assumed from industry conventions
   - Recommendation: Use `ROUTES` constant object so paths can be updated centrally; mark all assumed paths with `// TODO: validate against real API` comments; integration test phase will surface mismatches

2. **Media attachment: URL reference vs multipart upload**
   - What we know: POST-02 requires creating posts with images/video/GIF; hey.lol is a social platform
   - What's unclear: Does `POST /posts` accept `mediaUrls: string[]` (pre-uploaded media), or does it require multipart `FormData` with file bytes? Multipart changes the client significantly (no JSON body, different Content-Type).
   - Recommendation: Assume URL-reference model (`mediaUrls: string[]`) for Phase 4 — simpler, no multipart needed; if real API requires multipart, add a separate `uploadMedia(file: Blob | File): Promise<MediaUploadResult>` method on `PostsResource` as a follow-up

3. **Does `HeyLolClient.get<T>()` support query params?**
   - What we know: Phase 3's `get<T>(path: string)` only accepts a path string; no query params
   - What's unclear: Pagination (`cursor`, `limit`), search (`q`, `type`) need to be passed as query parameters
   - Recommendation: Phase 4 Plan 1 must extend `HeyLolClient.get<T>(path: string, params?: Record<string, string | number>)` to serialize query params into the URL; this is a Phase 3 client addition required by Phase 4 but small enough to do in Plan 1

4. **Notification mark-as-read: single endpoint or bulk?**
   - What we know: NOTF-02 says "mark notifications as read" — could be per-notification or bulk
   - What's unclear: Does the API have `POST /notifications/:id/read` (per-notification), `POST /notifications/read` with an array of IDs (bulk), or `POST /notifications/read-all` (mark all)?
   - Recommendation: Implement `markRead(ids?: NotificationId[]): Promise<void>` — if `ids` is provided it's bulk by ID; if omitted it marks all. Map to whatever the real endpoint turns out to be by updating the route constant.

5. **204 No Content vs 200 with empty body for delete/like/unfollow**
   - What we know: Phase 3's `HeyLolClient.request()` calls `response.json()` unconditionally on `response.ok` — this throws on 204 No Content
   - What's unclear: Does hey.lol return 204 or 200+`{}` for mutation-with-no-body responses?
   - Recommendation: Add the 204 guard to `HeyLolClient.request()` in Phase 4 Plan 1 (it's a one-line fix); return `undefined as T` for 204; this is safe whether the real API uses 204 or 200+`{}`

---

## Sources

### Primary (HIGH confidence)

- Phase 3 codebase (`packages/sdk/src/client/HeyLolClient.ts`, `src/errors/index.ts`, `src/types/domain.ts`) — fully read; Phase 4 builds directly on these
- Anthropic SDK TypeScript source (`github.com/anthropics/anthropic-sdk-typescript`) — resource class pattern (`Messages extends APIResource`, `client.messages`, `client.messages.batches`); constructor-initialized readonly properties; `this._client.post()` delegation
- egghead.io Branded Types article — `declare const __brand: unique symbol; type Brand<T, B extends string> = T & { readonly [__brand]: B }` pattern; factory function cast; compile-time rejection of wrong-brand types verified
- Azure TypeScript SDK Design Guidelines (`azure.github.io/azure-sdk/typescript_design.html`) — method naming conventions (`create`, `get`, `list`, `update`, `delete`); `<MethodName>Options` naming; `PagedAsyncIterableIterator` pagination standard

### Secondary (MEDIUM confidence)

- Twitter API v2 `node-twitter-api-v2` SDK architecture — hierarchical namespace pattern (`client.v2.tweet()`), paginator design, read-only client restriction pattern; verified from GitHub README
- Speakeasy TypeScript SDK methodology — namespace sub-SDK organization, dual-schema (inbound/outbound) Zod validation approach, tree-shaking via named imports; verified from official Speakeasy docs
- DEV Community "Preventing Accidental Interchangeability" — confirms `__brand` string-key variant works correctly; TS rejects cross-brand assignment
- LogRocket branded types article — confirms zero runtime overhead; `as` cast is only way to create branded values
- WebFetch of `hey.lol` homepage — confirmed Next.js social platform with posts, profiles, search, notifications, messages, wallet features; no API routes exposed

### Tertiary (LOW confidence)

- GeeksforGeeks social media REST API guide — basic endpoint conventions (`POST /posts`, `DELETE /posts/:id`); introductory only, not hey.lol specific
- Standard REST social API conventions (follower/following patterns, notification mark-read) — inferred from Twitter, Mastodon, and Bluesky API designs; not verified against actual hey.lol API

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new deps; Phase 3 client is the foundation; patterns from production SDKs
- Architecture (resource classes, branded IDs, client wiring): HIGH — directly verified from Anthropic SDK source and TS branded type documentation
- Specific hey.lol endpoint paths: LOW — API docs inaccessible; all paths assumed from conventions
- Media upload model: LOW — unknown whether URL-reference or multipart
- 204 vs 200 response behavior: LOW — unverified against real API

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable patterns; low-confidence items must be validated with real API integration tests)
