import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  sendBrowserNotification,
  sendFriendRequest
} from '../lib/friends';
import { soundManager } from '../audio/SoundManager';

describe('Friends & Challenge System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification Permission API Handling', () => {
    it('returns permission status correctly in browser environment', () => {
      const status = getNotificationPermissionStatus();
      expect(['default', 'granted', 'denied', 'unsupported']).toContain(status);
    });

    it('handles requestNotificationPermission gracefully', async () => {
      const origNotification = globalThis.Notification;
      // Mock Notification object
      globalThis.Notification = {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted')
      } as any;

      const res = await requestNotificationPermission();
      expect(res).toBe('granted');

      // Restore
      globalThis.Notification = origNotification;
    });

    it('triggers browser notification when permission is granted', () => {
      const origNotification = globalThis.Notification;
      const mockOnClick = vi.fn();
      let capturedInstance: any = null;

      class MockNotification {
        static permission = 'granted';
        title: string;
        options: any;
        onclick: any;
        constructor(title: string, options: any) {
          this.title = title;
          this.options = options;
          capturedInstance = this;
        }
        close = vi.fn();
      }

      globalThis.Notification = MockNotification as any;

      const notif = sendBrowserNotification(
        '⚔️ KeyFury Duel Challenge!',
        { body: 'Sameer challenged you to a 1v1 duel!' },
        mockOnClick
      );

      expect(notif).toBeDefined();
      expect(capturedInstance.title).toBe('⚔️ KeyFury Duel Challenge!');
      expect(capturedInstance.options.body).toBe('Sameer challenged you to a 1v1 duel!');

      // Simulate click
      capturedInstance.onclick();
      expect(mockOnClick).toHaveBeenCalled();
      expect(capturedInstance.close).toHaveBeenCalled();

      // Restore
      globalThis.Notification = origNotification;
    });

    it('does not trigger notification when permission is not granted', () => {
      const origNotification = globalThis.Notification;
      class MockNotification {
        static permission = 'denied';
      }
      globalThis.Notification = MockNotification as any;

      const notif = sendBrowserNotification('Test', { body: 'Test' });
      expect(notif).toBeNull();

      globalThis.Notification = origNotification;
    });
  });

  describe('Friend Request Validation', () => {
    it('rejects sending friend request to yourself', async () => {
      const myId = '566d8216-8cbd-41ce-8700-b0ef6e885d5b';
      const result = await sendFriendRequest(myId, myId);
      expect(result.success).toBe(false);
      expect(result.message).toContain('You cannot add yourself');
    });

    it('rejects sending friend request with empty query', async () => {
      const myId = '566d8216-8cbd-41ce-8700-b0ef6e885d5b';
      const result = await sendFriendRequest(myId, '   ');
      expect(result.success).toBe(false);
      expect(result.message).toContain('valid Player ID or name');
    });
  });

  describe('Sound Manager Challenge Alert', () => {
    it('executes playChallengeAlert without throwing error', () => {
      expect(() => {
        soundManager.playChallengeAlert();
      }).not.toThrow();
    });
  });
});
