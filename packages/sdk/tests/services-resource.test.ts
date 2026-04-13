import { describe, expect, it, vi } from 'vitest';
import { ServicesResource } from '../src/resources/ServicesResource.js';
import { asUsername } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Mock client helper
// ---------------------------------------------------------------------------

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServicesResource', () => {
  describe('create()', () => {
    it('calls POST /services with body', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const params = { name: 'Test Service', endpoint_url: 'https://example.com/api', slug: 'test-svc' };
      client.post.mockResolvedValueOnce({ service: { id: 'svc-1', ...params } });

      await resource.create(params);

      expect(client.post).toHaveBeenCalledWith('/services', params);
    });
  });

  describe('list()', () => {
    it('calls GET /services with no params', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.get.mockResolvedValueOnce({ services: [] });

      await resource.list();

      expect(client.get).toHaveBeenCalledWith('/services');
    });
  });

  describe('update()', () => {
    it('calls PATCH /services/:id with body', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const params = { name: 'Updated Name' };
      client.patch.mockResolvedValueOnce({ service: { id: 'svc-1', name: 'Updated Name' } });

      await resource.update('svc-1', params);

      expect(client.patch).toHaveBeenCalledWith('/services/svc-1', params);
    });
  });

  describe('delete()', () => {
    it('calls DELETE /services/:id', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.delete.mockResolvedValueOnce(undefined);

      await resource.delete('svc-1');

      expect(client.delete).toHaveBeenCalledWith('/services/svc-1');
    });
  });

  describe('discover()', () => {
    it('calls GET /services/discover with params', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const params = { mode: 'trending' as const, limit: 10 };
      client.get.mockResolvedValueOnce({ services: [] });

      await resource.discover(params);

      expect(client.get).toHaveBeenCalledWith('/services/discover', params);
    });

    it('calls GET /services/discover with undefined when no params', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.get.mockResolvedValueOnce({ services: [] });

      await resource.discover();

      expect(client.get).toHaveBeenCalledWith('/services/discover', undefined);
    });
  });

  describe('search()', () => {
    it('calls GET /services/search with q and limit', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.get.mockResolvedValueOnce({ services: [] });

      await resource.search({ q: 'translate', limit: 5 });

      expect(client.get).toHaveBeenCalledWith('/services/search', { q: 'translate', limit: 5 });
    });
  });

  describe('userServices()', () => {
    it('calls GET /services/user/:username', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ services: [] });

      await resource.userServices(username);

      expect(client.get).toHaveBeenCalledWith('/services/user/alice');
    });
  });

  describe('execute()', () => {
    it('calls POST /services/:id/execute with body', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const params = { params: { text: 'hello' } };
      client.post.mockResolvedValueOnce({ execution_id: 'exec-1', output: 'hola', duration_ms: 42 });

      await resource.execute('svc-1', params);

      expect(client.post).toHaveBeenCalledWith('/services/svc-1/execute', params);
    });

    it('calls POST /services/:id/execute with undefined when no params', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.post.mockResolvedValueOnce({ execution_id: 'exec-2', output: 'pong', duration_ms: 5 });

      await resource.execute('svc-1');

      expect(client.post).toHaveBeenCalledWith('/services/svc-1/execute', undefined);
    });
  });

  describe('like()', () => {
    it('calls POST /services/:id/like', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.post.mockResolvedValueOnce({ liked: true, like_count: 1 });

      await resource.like('svc-1');

      expect(client.post).toHaveBeenCalledWith('/services/svc-1/like');
    });
  });

  describe('unlike()', () => {
    it('calls DELETE /services/:id/like', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.delete.mockResolvedValueOnce({ liked: false, like_count: 0 });

      await resource.unlike('svc-1');

      expect(client.delete).toHaveBeenCalledWith('/services/svc-1/like');
    });
  });

  describe('comments()', () => {
    it('calls GET /services/:id/comments with params', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const params = { limit: 10, cursor: 'abc' };
      client.get.mockResolvedValueOnce({ comments: [], next_cursor: null });

      await resource.comments('svc-1', params);

      expect(client.get).toHaveBeenCalledWith('/services/svc-1/comments', params);
    });

    it('calls GET /services/:id/comments with undefined when no params', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.get.mockResolvedValueOnce({ comments: [], next_cursor: null });

      await resource.comments('svc-1');

      expect(client.get).toHaveBeenCalledWith('/services/svc-1/comments', undefined);
    });
  });

  describe('comment()', () => {
    it('calls POST /services/:id/comments with body', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const params = { content: 'Great service!' };
      client.post.mockResolvedValueOnce({ comment: { id: 'cmt-1', content: 'Great service!' } });

      await resource.comment('svc-1', params);

      expect(client.post).toHaveBeenCalledWith('/services/svc-1/comments', params);
    });
  });
});
