import { describe, expect, it, vi } from 'vitest';
import { AnalyticsResource } from '../src/resources/AnalyticsResource.js';

function mockClient() {
  return { get: vi.fn() };
}

describe('AnalyticsResource', () => {
  describe('dashboard()', () => {
    it('calls GET /analytics with no params', async () => {
      const client = mockClient();
      const resource = new AnalyticsResource(client);
      client.get.mockResolvedValueOnce({ period: '30d', overview: {} });
      await resource.dashboard();
      expect(client.get).toHaveBeenCalledWith('/analytics', undefined);
    });

    it('passes period param', async () => {
      const client = mockClient();
      const resource = new AnalyticsResource(client);
      client.get.mockResolvedValueOnce({ period: '7d', overview: {} });
      await resource.dashboard({ period: '7d' });
      expect(client.get).toHaveBeenCalledWith('/analytics', { period: '7d' });
    });
  });
});
