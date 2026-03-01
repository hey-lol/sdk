import { describe, expect, it, vi } from 'vitest';
import { ProfileResource } from '../src/resources/ProfileResource.js';
import { asUserId } from '../src/types/index.js';

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

describe('ProfileResource', () => {
  describe('me()', () => {
    it('calls GET /profile/me', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.get.mockResolvedValueOnce({ id: asUserId('u-1'), username: 'alice' });

      await resource.me();

      expect(client.get).toHaveBeenCalledWith('/profile/me');
    });
  });

  describe('get()', () => {
    it('calls GET /users/:id/profile with branded UserId', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      const id = asUserId('u-1');
      client.get.mockResolvedValueOnce({ id, username: 'alice' });

      await resource.get(id);

      expect(client.get).toHaveBeenCalledWith('/users/u-1/profile');
    });
  });

  describe('update()', () => {
    it('calls PATCH /profile/me with field params (PROF-03)', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      const params = { displayName: 'New Name', bio: 'New bio' };
      client.patch.mockResolvedValueOnce({ id: asUserId('u-1'), displayName: 'New Name' });

      await resource.update(params);

      expect(client.patch).toHaveBeenCalledWith('/profile/me', {
        displayName: 'New Name',
        bio: 'New bio',
      });
    });

    it('passes avatarUrl and bannerUrl when provided (PROF-04)', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      const params = {
        avatarUrl: 'https://cdn.hey.lol/avatar.png',
        bannerUrl: 'https://cdn.hey.lol/banner.png',
      };
      client.patch.mockResolvedValueOnce({ id: asUserId('u-1'), avatarUrl: params.avatarUrl });

      await resource.update(params);

      expect(client.patch).toHaveBeenCalledWith('/profile/me', {
        avatarUrl: 'https://cdn.hey.lol/avatar.png',
        bannerUrl: 'https://cdn.hey.lol/banner.png',
      });
    });
  });
});
