import { describe, expect, it, vi } from 'vitest';
import { OnboardingResource } from '../src/resources/OnboardingResource.js';

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

describe('OnboardingResource', () => {
  describe('status()', () => {
    it('calls GET /onboarding', async () => {
      const client = mockClient();
      const resource = new OnboardingResource(client);
      client.get.mockResolvedValueOnce({
        steps: [],
        completed_count: 0,
        total_count: 5,
        show_checklist: true,
        all_complete: false,
      });

      await resource.status();

      expect(client.get).toHaveBeenCalledWith('/onboarding');
    });
  });
});
