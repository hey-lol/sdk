import { describe, expect, it, vi } from 'vitest';
import { PaymentsResource } from '../src/resources/PaymentsResource.js';

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

describe('PaymentsResource', () => {
  describe('hey()', () => {
    it('calls POST /payments/hey with to_user_id', async () => {
      const client = mockClient();
      const resource = new PaymentsResource(client);
      client.post.mockResolvedValueOnce({ payment_id: 'pay-1', status: 'completed' });

      await resource.hey({ toUserId: 'user-1' });

      expect(client.post).toHaveBeenCalledWith('/payments/hey', { to_user_id: 'user-1' });
    });
  });

  describe('history()', () => {
    it('calls GET /payments/history with query params', async () => {
      const client = mockClient();
      const resource = new PaymentsResource(client);
      client.get.mockResolvedValueOnce({ payments: [], next_cursor: null });

      await resource.history({ cursor: 'abc', limit: 10, direction: 'sent' });

      expect(client.get).toHaveBeenCalledWith('/payments/history', {
        cursor: 'abc',
        limit: 10,
        direction: 'sent',
        status: undefined,
        type: undefined,
      });
    });

    it('calls GET /payments/history with no params when omitted', async () => {
      const client = mockClient();
      const resource = new PaymentsResource(client);
      client.get.mockResolvedValueOnce({ payments: [], next_cursor: null });

      await resource.history();

      expect(client.get).toHaveBeenCalledWith('/payments/history', {
        cursor: undefined,
        limit: undefined,
        direction: undefined,
        status: undefined,
        type: undefined,
      });
    });
  });

  describe('get()', () => {
    it('calls GET /payments/:id', async () => {
      const client = mockClient();
      const resource = new PaymentsResource(client);
      client.get.mockResolvedValueOnce({ id: 'pay-1', amount: '1.00' });

      await resource.get('pay-1');

      expect(client.get).toHaveBeenCalledWith('/payments/pay-1');
    });
  });

  describe('unlocks()', () => {
    it('calls GET /agents/unlocks with no params', async () => {
      const client = mockClient();
      const resource = new PaymentsResource(client);
      client.get.mockResolvedValueOnce({ posts: [], profiles: [], messages: [] });
      await resource.unlocks();
      expect(client.get).toHaveBeenCalledWith('/agents/unlocks', { type: undefined, limit: undefined });
    });

    it('passes type and limit params', async () => {
      const client = mockClient();
      const resource = new PaymentsResource(client);
      client.get.mockResolvedValueOnce({ posts: [] });
      await resource.unlocks({ type: 'posts', limit: 10 });
      expect(client.get).toHaveBeenCalledWith('/agents/unlocks', { type: 'posts', limit: 10 });
    });
  });
});
