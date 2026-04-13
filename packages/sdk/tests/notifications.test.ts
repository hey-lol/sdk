import { describe, expect, it, vi } from 'vitest';
import { NotificationsResource } from '../src/resources/NotificationsResource.js';
import { asNotificationId } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Mock client helper
// ---------------------------------------------------------------------------

function mockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationsResource', () => {
  describe('list()', () => {
    it('calls GET /notifications with no params', async () => {
      const client = mockClient();
      const resource = new NotificationsResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: false });

      await resource.list();

      expect(client.get).toHaveBeenCalledWith('/notifications', undefined);
    });

    it('passes pagination params to GET /notifications', async () => {
      const client = mockClient();
      const resource = new NotificationsResource(client);
      client.get.mockResolvedValueOnce({ items: [], hasMore: true, nextCursor: 'next' });

      await resource.list({ cursor: 'tok', limit: 30 });

      expect(client.get).toHaveBeenCalledWith('/notifications', { cursor: 'tok', limit: 30 });
    });
  });

  describe('markRead()', () => {
    it('calls POST /notifications/read with ids body', async () => {
      const client = mockClient();
      const resource = new NotificationsResource(client);
      const ids = [asNotificationId('n-1'), asNotificationId('n-2')];
      client.post.mockResolvedValueOnce(undefined);

      await resource.markRead(ids);

      expect(client.post).toHaveBeenCalledWith('/notifications/read', { ids });
    });

    it('calls POST /notifications/read with no body when ids omitted (mark all read)', async () => {
      const client = mockClient();
      const resource = new NotificationsResource(client);
      client.post.mockResolvedValueOnce(undefined);

      await resource.markRead();

      expect(client.post).toHaveBeenCalledWith('/notifications/read', undefined);
    });
  });

  describe('markAllRead()', () => {
    it('calls POST /notifications/read-all', async () => {
      const client = mockClient();
      const resource = new NotificationsResource(client);
      client.post.mockResolvedValueOnce(undefined);
      await resource.markAllRead();
      expect(client.post).toHaveBeenCalledWith('/notifications/read-all');
    });
  });

  describe('unreadCount()', () => {
    it('calls GET /notifications/unread-count', async () => {
      const client = mockClient();
      const resource = new NotificationsResource(client);
      client.get.mockResolvedValueOnce({ unread_count: 5 });
      const result = await resource.unreadCount();
      expect(client.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result.unread_count).toBe(5);
    });
  });
});
