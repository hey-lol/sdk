import { describe, expect, it, vi } from 'vitest';
import { DMResource } from '../src/resources/DMResource.js';
import { asConversationId, asMessageId, asUserId } from '../src/types/index.js';

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

describe('DMResource', () => {
  describe('send()', () => {
    it('calls POST /dm/conversations when to field is present (new conversation)', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      const recipientId = asUserId('user-123');
      client.post.mockResolvedValueOnce({
        conversation: { id: 'conv-1' },
        message: { id: 'msg-1', content: 'Hello' },
      });

      await resource.send({
        to: recipientId,
        content: 'Hello',
        imageUrls: ['https://cdn.hey.lol/img.png'],
        gifUrl: 'https://cdn.hey.lol/funny.gif',
        lockPrice: '1.00',
      });

      expect(client.post).toHaveBeenCalledWith('/dm/conversations', {
        recipient_id: recipientId,
        content: 'Hello',
        image_urls: ['https://cdn.hey.lol/img.png'],
        gif_url: 'https://cdn.hey.lol/funny.gif',
        video_url: undefined,
        lock_price: '1.00',
      });
    });

    it('calls POST /dm/conversations/:id/messages when conversationId field is present', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      const convId = asConversationId('conv-abc');
      client.post.mockResolvedValueOnce({
        message: { id: 'msg-2', content: 'Follow-up' },
      });

      await resource.send({
        conversationId: convId,
        content: 'Follow-up',
        videoUrl: 'https://cdn.hey.lol/vid.mp4',
      });

      expect(client.post).toHaveBeenCalledWith('/dm/conversations/conv-abc/messages', {
        content: 'Follow-up',
        image_urls: undefined,
        gif_url: undefined,
        video_url: 'https://cdn.hey.lol/vid.mp4',
        lock_price: undefined,
      });
    });
  });

  describe('conversations()', () => {
    it('calls GET /dm/conversations with pagination params', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      client.get.mockResolvedValueOnce({ conversations: [], next_cursor: null });

      await resource.conversations({ cursor: 'abc', limit: 10 });

      expect(client.get).toHaveBeenCalledWith('/dm/conversations', {
        cursor: 'abc',
        limit: 10,
      });
    });

    it('calls GET /dm/conversations with no params', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      client.get.mockResolvedValueOnce({ conversations: [], next_cursor: null });

      await resource.conversations();

      expect(client.get).toHaveBeenCalledWith('/dm/conversations', undefined);
    });

    it('passes q search param to GET /dm/conversations', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      client.get.mockResolvedValueOnce({ conversations: [], next_cursor: null });

      await resource.conversations({ q: 'alice', limit: 20 });

      expect(client.get).toHaveBeenCalledWith('/dm/conversations', {
        q: 'alice',
        limit: 20,
      });
    });
  });

  describe('messages()', () => {
    it('calls GET /dm/conversations/:id/messages with conversationId and pagination', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      const convId = asConversationId('conv-xyz');
      client.get.mockResolvedValueOnce({ messages: [], next_cursor: null });

      await resource.messages(convId, { cursor: 'cursor-1', limit: 20 });

      expect(client.get).toHaveBeenCalledWith('/dm/conversations/conv-xyz/messages', {
        cursor: 'cursor-1',
        limit: 20,
      });
    });
  });

  describe('markRead()', () => {
    it('calls POST /dm/conversations/:id/read with last_read_message_id', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      const convId = asConversationId('conv-read');
      client.post.mockResolvedValueOnce({ success: true });

      await resource.markRead(convId, { lastReadMessageId: 'msg-99' });

      expect(client.post).toHaveBeenCalledWith('/dm/conversations/conv-read/read', {
        last_read_message_id: 'msg-99',
      });
    });
  });

  describe('deleteConversation()', () => {
    it('calls DELETE /dm/conversations/:id', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      const convId = asConversationId('conv-del');
      client.delete.mockResolvedValueOnce({ success: true });

      await resource.deleteConversation(convId);

      expect(client.delete).toHaveBeenCalledWith('/dm/conversations/conv-del');
    });
  });

  describe('deleteMessage()', () => {
    it('calls DELETE /dm/messages/:id', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      const msgId = asMessageId('msg-del');
      client.delete.mockResolvedValueOnce({ success: true });

      await resource.deleteMessage(msgId);

      expect(client.delete).toHaveBeenCalledWith('/dm/messages/msg-del');
    });
  });

  describe('unlockMessage()', () => {
    it('calls POST /dm/messages/:id/unlock', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      const msgId = asMessageId('msg-locked');
      client.post.mockResolvedValueOnce({
        unlocked: true,
        payment_id: 'pay-1',
        amount: '0.50',
      });

      await resource.unlockMessage(msgId);

      expect(client.post).toHaveBeenCalledWith('/dm/messages/msg-locked/unlock');
    });
  });

  describe('prepay()', () => {
    it('calls POST /payments/dm with to_user_id', async () => {
      const client = mockClient();
      const resource = new DMResource(client);
      client.post.mockResolvedValueOnce({
        payment_id: 'pay-2',
        status: 'completed',
        amount: '5.00',
      });

      await resource.prepay({ toUserId: 'user-456' });

      expect(client.post).toHaveBeenCalledWith('/payments/dm', {
        to_user_id: 'user-456',
      });
    });
  });
});
