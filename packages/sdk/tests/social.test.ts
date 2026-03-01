import { describe, expect, it, vi } from 'vitest';
import { SocialResource } from '../src/resources/SocialResource.js';
import { asUserId } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Mock client helper
// ---------------------------------------------------------------------------

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SocialResource', () => {
  describe('follow()', () => {
    it('calls POST /users/:id/follow', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const id = asUserId('u-1');
      client.post.mockResolvedValueOnce(undefined);

      await resource.follow(id);

      expect(client.post).toHaveBeenCalledWith('/users/u-1/follow');
    });
  });

  describe('unfollow()', () => {
    it('calls DELETE /users/:id/follow', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const id = asUserId('u-1');
      client.delete.mockResolvedValueOnce(undefined);

      await resource.unfollow(id);

      expect(client.delete).toHaveBeenCalledWith('/users/u-1/follow');
    });
  });

  describe('followers()', () => {
    it('calls GET /users/:id/followers with no params', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const id = asUserId('u-1');
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.followers(id);

      expect(client.get).toHaveBeenCalledWith('/users/u-1/followers', undefined);
    });

    it('passes pagination params to GET /users/:id/followers', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const id = asUserId('u-1');
      client.get.mockResolvedValueOnce({ items: [], hasMore: false, nextCursor: 'abc' });

      await resource.followers(id, { cursor: 'abc', limit: 50 });

      expect(client.get).toHaveBeenCalledWith('/users/u-1/followers', {
        cursor: 'abc',
        limit: 50,
      });
    });
  });

  describe('following()', () => {
    it('calls GET /users/:id/following with pagination params', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const id = asUserId('u-2');
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.following(id, { cursor: 'xyz', limit: 20 });

      expect(client.get).toHaveBeenCalledWith('/users/u-2/following', {
        cursor: 'xyz',
        limit: 20,
      });
    });
  });
});
