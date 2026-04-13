import { describe, expect, it, vi } from 'vitest';
import { FeedResource } from '../src/resources/FeedResource.js';
import { asUsername } from '../src/types/index.js';

// -----------------------------------------------------------------------
// Mock client helper
// -----------------------------------------------------------------------

function mockClient() {
  return {
    get: vi.fn(),
  };
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('FeedResource', () => {
  describe('home()', () => {
    it('calls GET /feed/ with no params', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: null });

      await resource.home();

      expect(client.get).toHaveBeenCalledWith('/feed/', undefined);
    });

    it('passes pagination params to GET /feed/', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: null });

      await resource.home({ cursor: 'abc', limit: 10 });

      expect(client.get).toHaveBeenCalledWith('/feed/', { cursor: 'abc', limit: 10 });
    });
  });

  describe('following()', () => {
    it('calls GET /feed/following', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: null });

      await resource.following();

      expect(client.get).toHaveBeenCalledWith('/feed/following', undefined);
    });
  });

  describe('recent()', () => {
    it('calls GET /feed/recent', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: null });

      await resource.recent();

      expect(client.get).toHaveBeenCalledWith('/feed/recent', undefined);
    });
  });

  describe('popular()', () => {
    it('calls GET /feed/popular', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: null });

      await resource.popular();

      expect(client.get).toHaveBeenCalledWith('/feed/popular', undefined);
    });
  });

  describe('user()', () => {
    it('calls GET /feed/user/:username', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: null });

      await resource.user(username);

      expect(client.get).toHaveBeenCalledWith('/feed/user/alice', undefined);
    });

    it('passes pagination params', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: 'xyz' });

      await resource.user(username, { limit: 20 });

      expect(client.get).toHaveBeenCalledWith('/feed/user/alice', { limit: 20 });
    });
  });

  describe('userReplies()', () => {
    it('calls GET /feed/user/:username/replies', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      const username = asUsername('bob');
      client.get.mockResolvedValueOnce({ posts: [], next_cursor: null });

      await resource.userReplies(username);

      expect(client.get).toHaveBeenCalledWith('/feed/user/bob/replies', undefined);
    });
  });

  describe('userLikes()', () => {
    it('calls GET /feed/user/:username/likes', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ posts: [] });
      await resource.userLikes(username);
      expect(client.get).toHaveBeenCalledWith('/feed/user/alice/likes', undefined);
    });

    it('passes pagination params', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ posts: [] });
      await resource.userLikes(username, { limit: 10, cursor: 'abc' });
      expect(client.get).toHaveBeenCalledWith('/feed/user/alice/likes', { limit: 10, cursor: 'abc' });
    });
  });

  describe('media()', () => {
    it('calls GET /agents/media with no params', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      client.get.mockResolvedValueOnce({ media: [], total: 0, limit: 20, offset: 0 });
      await resource.media();
      expect(client.get).toHaveBeenCalledWith('/agents/media', undefined);
    });

    it('passes media params', async () => {
      const client = mockClient();
      const resource = new FeedResource(client);
      client.get.mockResolvedValueOnce({ media: [], total: 0, limit: 10, offset: 0 });
      await resource.media({ type: 'image', limit: 10, offset: 0, sort: 'popular' });
      expect(client.get).toHaveBeenCalledWith('/agents/media', { type: 'image', limit: 10, offset: 0, sort: 'popular' });
    });
  });
});
