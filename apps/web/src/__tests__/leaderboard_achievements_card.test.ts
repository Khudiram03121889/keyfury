import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfill localStorage and window/document for node vitest runner
const mockStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => mockStore.get(key) || null,
  setItem: (key: string, value: string) => { mockStore.set(key, String(value)); },
  removeItem: (key: string) => { mockStore.delete(key); },
  clear: () => { mockStore.clear(); }
};

if (typeof global.localStorage === 'undefined') {
  (global as any).localStorage = localStorageMock;
}

if (typeof global.window === 'undefined') {
  const eventListeners = new Map<string, Function[]>();
  (global as any).window = {
    addEventListener: (type: string, listener: Function) => {
      if (!eventListeners.has(type)) eventListeners.set(type, []);
      eventListeners.get(type)!.push(listener);
    },
    removeEventListener: (type: string, listener: Function) => {
      const arr = eventListeners.get(type) || [];
      eventListeners.set(type, arr.filter((l) => l !== listener));
    },
    dispatchEvent: (event: any) => {
      const arr = eventListeners.get(event.type) || [];
      arr.forEach((cb) => cb(event));
      return true;
    }
  };
  (global as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, options?: any) {
      this.type = type;
      this.detail = options?.detail;
    }
  };
}

if (typeof global.document === 'undefined') {
  (global as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            createLinearGradient: () => ({ addColorStop: vi.fn() }),
            createRadialGradient: () => ({ addColorStop: vi.fn() }),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            arc: vi.fn(),
            roundRect: vi.fn(),
            closePath: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            clip: vi.fn(),
            drawImage: vi.fn(),
            fillText: vi.fn(),
            measureText: (text: string) => ({ width: text.length * 12 }),
            set letterSpacing(v: any) {},
            set fillStyle(v: any) {},
            set strokeStyle(v: any) {},
            set lineWidth(v: any) {},
            set font(v: any) {},
            set textAlign(v: any) {},
            set shadowColor(v: any) {},
            set shadowBlur(v: any) {}
          }),
          toBlob: (cb: Function) => {
            cb(new Blob(['mock-png-bytes'], { type: 'image/png' }));
          }
        };
      }
      return {};
    },
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    }
  };
}

import {
  saveMatchStats,
  getUserProfile,
  getLeaderboard,
  getUserAchievements,
  UserProfile
} from '../lib/supabase';
import { generateMatchCardBlob } from '../lib/downloadMatchCard';

describe('Leaderboard & Achievement System Integration Tests', { timeout: 15000 }, () => {
  const TEST_USER_ID = 'test_warrior_123';

  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.setItem('keyfury_guest_id', TEST_USER_ID);
    localStorageMock.setItem('keyfury_guest_name', 'Test Warrior');
    vi.clearAllMocks();
  });

  describe('1. Leaderboard Synchronization & Profile Accuracy', () => {
    it('accurately updates win count, matches played, MMR and averages after a WIN', async () => {
      let eventFired = false;
      let eventDetail: any = null;
      window.addEventListener('keyfury_stats_updated', ((e: any) => {
        eventFired = true;
        eventDetail = e.detail;
      }) as any);

      const result1 = await saveMatchStats(TEST_USER_ID, {
        result: 'WIN',
        wpm: 85,
        accuracy: 96,
        maxCombo: 12,
        finalHealth: 80,
        wordsCompleted: 45,
        opponentName: 'Cyber Bot'
      });

      const profile1 = await getUserProfile(TEST_USER_ID);
      expect(profile1).not.toBeNull();
      expect(profile1?.matchesPlayed).toBe(1);
      expect(profile1?.wins).toBe(1);
      expect(profile1?.losses).toBe(0);
      expect(profile1?.peakWpm).toBe(85);
      expect(profile1?.avgWpm).toBe(85);
      expect(profile1?.accuracy).toBe(96);
      expect(profile1?.mmr).toBe(1024); // 1000 + 24 default
      expect(eventFired).toBe(true);
      expect(eventDetail?.mmr).toBe(1024);

      // Subsequent game (LOSS)
      const result2 = await saveMatchStats(TEST_USER_ID, {
        result: 'LOSS',
        wpm: 75,
        accuracy: 92,
        maxCombo: 8,
        finalHealth: 0,
        wordsCompleted: 35,
        opponentName: 'Volt Master'
      });

      const profile2 = await getUserProfile(TEST_USER_ID);
      expect(profile2?.matchesPlayed).toBe(2);
      expect(profile2?.wins).toBe(1);
      expect(profile2?.losses).toBe(1);
      expect(profile2?.peakWpm).toBe(85);
      expect(profile2?.avgWpm).toBe(80); // (85 + 75) / 2
      expect(profile2?.accuracy).toBe(94); // (96 + 92) / 2
      expect(profile2?.mmr).toBe(1008); // 1024 - 16
    });

    it('immediately reflects updated player stats on getLeaderboard ranking', async () => {
      // Register accounts
      const accounts = [
        { id: 'user_alpha', displayName: 'Alpha Warrior', email: 'alpha@test.com' },
        { id: 'user_beta', displayName: 'Beta Warrior', email: 'beta@test.com' }
      ];
      localStorageMock.setItem('keyfury_user_accounts', JSON.stringify(accounts));

      // Alpha plays and wins
      await saveMatchStats('user_alpha', {
        result: 'WIN',
        wpm: 110,
        accuracy: 98,
        maxCombo: 25,
        finalHealth: 95,
        wordsCompleted: 60,
        finalMmr: 1850
      });

      // Beta plays and loses
      await saveMatchStats('user_beta', {
        result: 'LOSS',
        wpm: 65,
        accuracy: 90,
        maxCombo: 6,
        finalHealth: 0,
        wordsCompleted: 30,
        finalMmr: 950
      });

      const leaderboard = await getLeaderboard();
      const alphaEntry = leaderboard.find((p) => p.id === 'user_alpha');
      const betaEntry = leaderboard.find((p) => p.id === 'user_beta');

      expect(alphaEntry).toBeDefined();
      expect(alphaEntry?.mmr).toBe(1850);
      expect(alphaEntry?.wins).toBe(1);
      expect(alphaEntry?.rankTier).toBe('Gold');

      expect(betaEntry).toBeDefined();
      expect(betaEntry?.mmr).toBe(950);
      expect(betaEntry?.losses).toBe(1);

      // Verify leaderboard is sorted in descending order by MMR
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].mmr).toBeGreaterThanOrEqual(leaderboard[i + 1].mmr);
      }
    });
  });

  describe('2. Strict Achievement Display & Deduplication Logic', () => {
    it('unlocks and displays achievements only once when criteria are met for the first time', async () => {
      // Match 1: 50 WPM, 92% Acc, WIN, 6 max combo
      const match1 = await saveMatchStats(TEST_USER_ID, {
        result: 'WIN',
        wpm: 50,
        accuracy: 92,
        maxCombo: 6,
        finalHealth: 50,
        wordsCompleted: 30,
        opponentName: 'Shadow Bot'
      });

      const unlockedIds1 = match1.newAchievements.map((a) => a.id);
      expect(unlockedIds1).toContain('first_blood');
      expect(unlockedIds1).toContain('first_victory');
      expect(unlockedIds1).toContain('warmup'); // >= 40 WPM
      expect(unlockedIds1).toContain('steady_fingers'); // >= 90% Acc
      expect(unlockedIds1).toContain('combo_starter'); // >= 5 combo

      const storedAchievements = await getUserAchievements(TEST_USER_ID);
      expect(storedAchievements.find((a) => a.achievementId === 'warmup')?.unlocked).toBe(true);

      // Match 2: Same conditions (55 WPM, 93% Acc, WIN)
      const match2 = await saveMatchStats(TEST_USER_ID, {
        result: 'WIN',
        wpm: 55,
        accuracy: 93,
        maxCombo: 7,
        finalHealth: 60,
        wordsCompleted: 35,
        opponentName: 'Shadow Bot'
      });

      // Crucial requirement: Must NOT display previously unlocked achievements again
      const unlockedIds2 = match2.newAchievements.map((a) => a.id);
      expect(unlockedIds2).not.toContain('first_blood');
      expect(unlockedIds2).not.toContain('first_victory');
      expect(unlockedIds2).not.toContain('warmup');
      expect(unlockedIds2).not.toContain('steady_fingers');
      expect(unlockedIds2).not.toContain('combo_starter');

      // But a newly reached milestone (e.g. speed_demon for >= 80 WPM) WILL unlock
      const match3 = await saveMatchStats(TEST_USER_ID, {
        result: 'WIN',
        wpm: 85,
        accuracy: 94,
        maxCombo: 10,
        finalHealth: 70,
        wordsCompleted: 40
      });
      const unlockedIds3 = match3.newAchievements.map((a) => a.id);
      expect(unlockedIds3).toContain('speed_demon');
      expect(unlockedIds3).not.toContain('warmup');
    });

    it('persists unlocked achievements across sessions and storage', async () => {
      await saveMatchStats(TEST_USER_ID, {
        result: 'WIN',
        wpm: 105,
        accuracy: 99,
        maxCombo: 22,
        finalHealth: 95,
        wordsCompleted: 50
      });

      const achievements = await getUserAchievements(TEST_USER_ID);
      const centuryClub = achievements.find((a) => a.achievementId === 'century_club');
      const sharpshooter = achievements.find((a) => a.achievementId === 'sharpshooter');
      const comboMaster = achievements.find((a) => a.achievementId === 'combo_master');
      const cleanFight = achievements.find((a) => a.achievementId === 'clean_fight');

      expect(centuryClub?.unlocked).toBe(true);
      expect(sharpshooter?.unlocked).toBe(true);
      expect(comboMaster?.unlocked).toBe(true);
      expect(cleanFight?.unlocked).toBe(true);
    });
  });

  describe('3. Result-Card Generation & Social Share Component', () => {
    it('generates a valid 1:1 square PNG blob containing player metrics and KeyFury branding', async () => {
      const { blob, filename } = await generateMatchCardBlob({
        playerName: 'Swift Falcon',
        opponentName: 'Neon Viper',
        isWinner: true,
        wpm: 124,
        accuracy: 98.5,
        maxCombo: 34,
        finalHealth: 88,
        wordsCompleted: 72,
        playerMmr: 1950,
        mmrDelta: 28,
        unlockedAchievements: [
          { id: 'century_club', title: 'Century Club', icon: '💯' },
          { id: 'combo_master', title: 'Combo Master', icon: '🔥' }
        ]
      });

      expect(blob).toBeDefined();
      expect(blob.type).toBe('image/png');
      expect(filename).toContain('keyfury-victory-swift-falcon-124wpm.png');
    });

    it('handles defeat scenarios with appropriate filename and formatting', async () => {
      const { blob, filename } = await generateMatchCardBlob({
        playerName: 'Shadow Ronin',
        opponentName: 'Cyber Valkyrie',
        isWinner: false,
        wpm: 68,
        accuracy: 89.2,
        maxCombo: 8,
        finalHealth: 0,
        wordsCompleted: 30,
        playerMmr: 1120,
        mmrDelta: -16
      });

      expect(blob).toBeDefined();
      expect(filename).toContain('keyfury-defeat-shadow-ronin-68wpm.png');
    });
  });
});
