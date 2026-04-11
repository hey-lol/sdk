import { describe, expect, it, vi } from 'vitest';
import { ProfileResource } from '../src/resources/ProfileResource.js';
import { asUserId, asUsername } from '../src/types/index.js';

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
    it('calls GET /profile/', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.get.mockResolvedValueOnce({ id: asUserId('u-1'), username: 'alice' });

      await resource.me();

      expect(client.get).toHaveBeenCalledWith('/profile/');
    });
  });

  describe('get()', () => {
    it('calls GET /profile/:username with branded Username', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      const username = asUsername('alice');
      client.get.mockResolvedValueOnce({ id: asUserId('u-1'), username: 'alice' });

      await resource.get(username);

      expect(client.get).toHaveBeenCalledWith('/profile/alice');
    });
  });

  describe('update()', () => {
    it('calls PATCH /profile/ with field params', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      const params = { displayName: 'New Name', bio: 'New bio' };
      client.patch.mockResolvedValueOnce({ id: asUserId('u-1'), displayName: 'New Name' });

      await resource.update(params);

      expect(client.patch).toHaveBeenCalledWith('/profile/', {
        displayName: 'New Name',
        bio: 'New bio',
      });
    });

    it('passes avatarUrl and bannerUrl when provided', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      const params = {
        avatarUrl: 'https://cdn.hey.lol/avatar.png',
        bannerUrl: 'https://cdn.hey.lol/banner.png',
      };
      client.patch.mockResolvedValueOnce({ id: asUserId('u-1'), avatarUrl: params.avatarUrl });

      await resource.update(params);

      expect(client.patch).toHaveBeenCalledWith('/profile/', {
        avatarUrl: 'https://cdn.hey.lol/avatar.png',
        bannerUrl: 'https://cdn.hey.lol/banner.png',
      });
    });
  });

  describe('register()', () => {
    it('calls POST /profile/ with registration params', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      const params = { username: 'newuser', display_name: 'New User' };
      client.post.mockResolvedValueOnce({ id: asUserId('u-2'), username: 'newuser' });

      await resource.register(params);

      expect(client.post).toHaveBeenCalledWith('/profile/', {
        username: 'newuser',
        display_name: 'New User',
      });
    });
  });

  describe('delete()', () => {
    it('calls DELETE /profile/', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.delete.mockResolvedValueOnce(undefined);

      await resource.delete();

      expect(client.delete).toHaveBeenCalledWith('/profile/');
    });
  });

  describe('checkUsername()', () => {
    it('calls GET /profile/check-username/:username', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.get.mockResolvedValueOnce({ available: true });

      await resource.checkUsername('testuser');

      expect(client.get).toHaveBeenCalledWith('/profile/check-username/testuser');
    });
  });

  describe('uploadAvatar()', () => {
    it('calls POST /profile/avatar/upload-url with file type', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.post.mockResolvedValueOnce({
        uploadUrl: 'https://storage.example.com/upload',
        storagePath: 'avatars/test.png',
        publicUrl: 'https://cdn.example.com/avatars/test.png',
        token: 'tok_123',
      });

      await resource.uploadAvatar({ fileType: 'image/png' });

      expect(client.post).toHaveBeenCalledWith('/profile/avatar/upload-url', {
        fileType: 'image/png',
      });
    });
  });

  describe('confirmAvatar()', () => {
    it('calls POST /profile/avatar/confirm with storage path', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.post.mockResolvedValueOnce({
        avatar_url: 'https://cdn.example.com/avatars/test.png',
        profile: { id: asUserId('u-1') },
      });

      await resource.confirmAvatar({ storagePath: 'avatars/test.png' });

      expect(client.post).toHaveBeenCalledWith('/profile/avatar/confirm', {
        storagePath: 'avatars/test.png',
      });
    });
  });

  describe('uploadBanner()', () => {
    it('calls POST /profile/banner/upload-url with file type', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.post.mockResolvedValueOnce({
        uploadUrl: 'https://storage.example.com/upload',
        storagePath: 'banners/test.jpg',
        publicUrl: 'https://cdn.example.com/banners/test.jpg',
        token: 'tok_456',
      });

      await resource.uploadBanner({ fileType: 'image/jpeg' });

      expect(client.post).toHaveBeenCalledWith('/profile/banner/upload-url', {
        fileType: 'image/jpeg',
      });
    });
  });

  describe('confirmBanner()', () => {
    it('calls POST /profile/banner/confirm with storage path', async () => {
      const client = mockClient();
      const resource = new ProfileResource(client);
      client.post.mockResolvedValueOnce({
        banner_url: 'https://cdn.example.com/banners/test.jpg',
        profile: { id: asUserId('u-1') },
      });

      await resource.confirmBanner({ storagePath: 'banners/test.jpg' });

      expect(client.post).toHaveBeenCalledWith('/profile/banner/confirm', {
        storagePath: 'banners/test.jpg',
      });
    });
  });
});
