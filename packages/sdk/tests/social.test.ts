import { describe, expect, it, vi } from 'vitest';
import { SocialResource } from '../src/resources/SocialResource.js';
import { asUsername } from '../src/types/index.js';

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
    it('calls POST /users/:username/follow', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const username = asUsername('alice');
      client.post.mockResolvedValueOnce(undefined);

      await resource.follow(username);

      expect(client.post).toHaveBeenCalledWith('/users/alice/follow');
    });
  });

  describe('unfollow()', () => {
    it('calls DELETE /users/:username/follow', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const username = asUsername('alice');
      client.delete.mockResolvedValueOnce(undefined);

      await resource.unfollow(username);

      expect(client.delete).toHaveBeenCalledWith('/users/alice/follow');
    });
  });

  describe('followers()', () => {
    it('calls GET /users/:username/followers with no params', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.followers(username);

      expect(client.get).toHaveBeenCalledWith('/users/alice/followers', undefined);
    });

    it('passes pagination params to GET /users/:username/followers', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ items: [], hasMore: false, nextCursor: 'abc' });

      await resource.followers(username, { cursor: 'abc', limit: 50 });

      expect(client.get).toHaveBeenCalledWith('/users/alice/followers', {
        cursor: 'abc',
        limit: 50,
      });
    });
  });

  describe('following()', () => {
    it('calls GET /users/:username/following with pagination params', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const username = asUsername('bob');
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.following(username, { cursor: 'xyz', limit: 20 });

      expect(client.get).toHaveBeenCalledWith('/users/bob/following', {
        cursor: 'xyz',
        limit: 20,
      });
    });
  });

  describe('block()', () => {
    it('calls POST /users/:username/block', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const username = asUsername('bob');
      client.post.mockResolvedValueOnce(undefined);

      await resource.block(username);

      expect(client.post).toHaveBeenCalledWith('/users/bob/block');
    });
  });

  describe('unblock()', () => {
    it('calls DELETE /users/:username/block', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      const username = asUsername('bob');
      client.delete.mockResolvedValueOnce(undefined);

      await resource.unblock(username);

      expect(client.delete).toHaveBeenCalledWith('/users/bob/block');
    });
  });

  describe('blocks()', () => {
    it('calls GET /users/blocks', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.blocks();

      expect(client.get).toHaveBeenCalledWith('/users/blocks');
    });
  });

  describe('suggestions()', () => {
    it('calls GET /suggestions/ with no params', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.suggestions();

      expect(client.get).toHaveBeenCalledWith('/suggestions/', undefined);
    });

    it('passes pagination params to GET /suggestions/', async () => {
      const client = mockClient();
      const resource = new SocialResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.suggestions({ limit: 5 });

      expect(client.get).toHaveBeenCalledWith('/suggestions/', { limit: 5 });
    });
  });
});
