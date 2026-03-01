import { describe, expect, it, vi } from 'vitest';
import { PostsResource } from '../src/resources/PostsResource.js';
import { asPostId } from '../src/types/index.js';

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

describe('PostsResource', () => {
  describe('create()', () => {
    it('calls POST /posts with content body (text post)', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const params = { content: 'Hello world' };
      client.post.mockResolvedValueOnce({ id: asPostId('p-1'), content: 'Hello world' });

      await resource.create(params);

      expect(client.post).toHaveBeenCalledWith('/posts', params);
    });

    it('passes mediaUrls when provided (media post)', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const params = { content: 'Check this out', mediaUrls: ['https://cdn.hey.lol/img1.png'] };
      client.post.mockResolvedValueOnce({ id: asPostId('p-2'), content: 'Check this out' });

      await resource.create(params);

      expect(client.post).toHaveBeenCalledWith('/posts', {
        content: 'Check this out',
        mediaUrls: ['https://cdn.hey.lol/img1.png'],
      });
    });

    it('passes paywall options when provided (paywalled post)', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const params = {
        content: 'Premium content',
        paywall: { teaser: 'Read more...', price: '0.01' },
      };
      client.post.mockResolvedValueOnce({ id: asPostId('p-3'), content: 'Premium content' });

      await resource.create(params);

      expect(client.post).toHaveBeenCalledWith('/posts', {
        content: 'Premium content',
        paywall: { teaser: 'Read more...', price: '0.01' },
      });
    });
  });

  describe('get()', () => {
    it('calls GET /posts/:id with branded PostId', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const id = asPostId('p-1');
      client.get.mockResolvedValueOnce({ id, content: 'Hello' });

      await resource.get(id);

      expect(client.get).toHaveBeenCalledWith('/posts/p-1');
    });
  });

  describe('delete()', () => {
    it('calls DELETE /posts/:id', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const id = asPostId('p-1');
      client.delete.mockResolvedValueOnce(undefined);

      await resource.delete(id);

      expect(client.delete).toHaveBeenCalledWith('/posts/p-1');
    });
  });

  describe('like()', () => {
    it('calls POST /posts/:id/like', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const id = asPostId('p-1');
      client.post.mockResolvedValueOnce(undefined);

      await resource.like(id);

      expect(client.post).toHaveBeenCalledWith('/posts/p-1/like');
    });
  });

  describe('unlike()', () => {
    it('calls DELETE /posts/:id/like', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const id = asPostId('p-1');
      client.delete.mockResolvedValueOnce(undefined);

      await resource.unlike(id);

      expect(client.delete).toHaveBeenCalledWith('/posts/p-1/like');
    });
  });

  describe('reply()', () => {
    it('calls POST /posts/:id/replies with content body', async () => {
      const client = mockClient();
      const resource = new PostsResource(client);
      const id = asPostId('p-1');
      const params = { content: 'Great post!' };
      client.post.mockResolvedValueOnce({ id: asPostId('p-5'), content: 'Great post!' });

      await resource.reply(id, params);

      expect(client.post).toHaveBeenCalledWith('/posts/p-1/replies', params);
    });
  });
});
