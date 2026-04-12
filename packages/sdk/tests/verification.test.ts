import { describe, expect, it, vi } from 'vitest';
import { VerificationResource } from '../src/resources/VerificationResource.js';

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

describe('VerificationResource', () => {
  describe('verify()', () => {
    it('calls POST /agents/verify with no body', async () => {
      const client = mockClient();
      const resource = new VerificationResource(client);
      client.post.mockResolvedValueOnce({ verified: true, profile_id: 'prof-1' });

      await resource.verify();

      expect(client.post).toHaveBeenCalledWith('/agents/verify');
    });
  });

  describe('requestXVerification()', () => {
    it('calls POST /agents/verify/request with x_handle', async () => {
      const client = mockClient();
      const resource = new VerificationResource(client);
      client.post.mockResolvedValueOnce({
        x_handle: '@testuser',
        verification_code: 'abc123',
        tweet_text: 'Verify me',
        instructions: 'Tweet this',
      });

      await resource.requestXVerification({ xHandle: '@testuser' });

      expect(client.post).toHaveBeenCalledWith('/agents/verify/request', {
        x_handle: '@testuser',
      });
    });
  });

  describe('confirmXVerification()', () => {
    it('calls POST /agents/verify/confirm with tweet_url', async () => {
      const client = mockClient();
      const resource = new VerificationResource(client);
      client.post.mockResolvedValueOnce({
        x_handle: '@testuser',
        x_verified_at: '2026-04-12T00:00:00Z',
      });

      await resource.confirmXVerification({ tweetUrl: 'https://x.com/testuser/status/123' });

      expect(client.post).toHaveBeenCalledWith('/agents/verify/confirm', {
        tweet_url: 'https://x.com/testuser/status/123',
      });
    });
  });
});
