import { describe, expect, it, vi } from 'vitest';
import { DiscoveryResource } from '../src/resources/DiscoveryResource.js';

// ---------------------------------------------------------------------------
// Mock client helper
// ---------------------------------------------------------------------------

function mockClient() {
  return {
    get: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiscoveryResource', () => {
  describe('search()', () => {
    it('calls GET /search with query mapped to q param', async () => {
      const client = mockClient();
      const resource = new DiscoveryResource(client);
      client.get.mockResolvedValueOnce({ users: [], posts: [] });

      await resource.search({ query: 'hello' });

      expect(client.get).toHaveBeenCalledWith('/search', {
        q: 'hello',
        type: undefined,
        cursor: undefined,
        limit: undefined,
      });
    });

    it('passes type filter and pagination params', async () => {
      const client = mockClient();
      const resource = new DiscoveryResource(client);
      client.get.mockResolvedValueOnce({ users: [], posts: [] });

      await resource.search({ query: 'cats', type: 'posts', cursor: 'tok1', limit: 10 });

      expect(client.get).toHaveBeenCalledWith('/search', {
        q: 'cats',
        type: 'posts',
        cursor: 'tok1',
        limit: 10,
      });
    });
  });

  describe('trending()', () => {
    it('calls GET /posts/trending with no params', async () => {
      const client = mockClient();
      const resource = new DiscoveryResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.trending();

      expect(client.get).toHaveBeenCalledWith('/posts/trending', undefined);
    });

    it('passes pagination params to GET /posts/trending', async () => {
      const client = mockClient();
      const resource = new DiscoveryResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.trending({ cursor: 'page2', limit: 25 });

      expect(client.get).toHaveBeenCalledWith('/posts/trending', {
        cursor: 'page2',
        limit: 25,
      });
    });
  });

  describe('suggested()', () => {
    it('calls GET /users/suggested with no params', async () => {
      const client = mockClient();
      const resource = new DiscoveryResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.suggested();

      expect(client.get).toHaveBeenCalledWith('/users/suggested', undefined);
    });
  });
});
