import { describe, expect, it, vi } from 'vitest';
import { ServicesResource } from '../src/resources/ServicesResource.js';

// ---------------------------------------------------------------------------
// Mock client helper
// ---------------------------------------------------------------------------

function mockClient() {
  return {
    post: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ServicesResource', () => {
  describe('call()', () => {
    it('delegates to client.post with correct provisional path', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.post.mockResolvedValueOnce({ result: 'ok' });

      await resource.call('my-service', { query: 'hello' });

      expect(client.post).toHaveBeenCalledWith('/services/my-service/call', { query: 'hello' });
    });

    it('passes serviceId into route template', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.post.mockResolvedValueOnce({});

      await resource.call('translate-text', { text: 'hello' });

      expect(client.post).toHaveBeenCalledWith('/services/translate-text/call', {
        text: 'hello',
      });
    });

    it('passes input as body', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const input = { prompt: 'Summarize this', maxTokens: 100 };
      client.post.mockResolvedValueOnce({ summary: 'done' });

      await resource.call('summarize', input);

      expect(client.post).toHaveBeenCalledWith('/services/summarize/call', input);
    });

    it('works without input (undefined body)', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      client.post.mockResolvedValueOnce({ status: 'pong' });

      await resource.call('ping');

      expect(client.post).toHaveBeenCalledWith('/services/ping/call', undefined);
    });

    it('returns typed output from client.post', async () => {
      const client = mockClient();
      const resource = new ServicesResource(client);
      const expected = { translated: 'hola', language: 'es' };
      client.post.mockResolvedValueOnce(expected);

      const result = await resource.call<
        { text: string },
        { translated: string; language: string }
      >('translate', { text: 'hello' });

      expect(result).toEqual(expected);
      expect(result.translated).toBe('hola');
      expect(result.language).toBe('es');
    });
  });
});
