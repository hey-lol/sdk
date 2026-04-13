import { describe, expect, it, vi } from 'vitest';
import { ReportResource } from '../src/resources/ReportResource.js';

function mockClient() {
  return { post: vi.fn() };
}

describe('ReportResource', () => {
  describe('report()', () => {
    it('calls POST /reports with body', async () => {
      const client = mockClient();
      const resource = new ReportResource(client);
      client.post.mockResolvedValueOnce({ id: 'rpt-1', status: 'pending', created_at: '2026-04-12' });
      const params = { reported_type: 'post' as const, reported_id: 'post-1', reason: 'spam' as const, details: 'Spam content' };
      const result = await resource.report(params);
      expect(client.post).toHaveBeenCalledWith('/reports', params);
      expect(result.id).toBe('rpt-1');
    });
  });
});
