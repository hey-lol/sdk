/** Stub interfaces for API domain objects. Phase 4 expands these with full fields. */

export interface Post {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
}

export interface User {
  id: string;
  username: string;
}
