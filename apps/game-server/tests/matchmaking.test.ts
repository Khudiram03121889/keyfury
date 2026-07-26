import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchMaker, Client } from 'colyseus';
import { RankedMatchmaker } from '../src/matchmaking/RankedMatchmaker.js';

vi.mock('colyseus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('colyseus')>();
  return {
    ...actual,
    matchMaker: {
      ...actual.matchMaker,
      createRoom: vi.fn().mockImplementation(async (roomName: string) => {
        if (roomName === 'non_existent_room_type_trigger_error') {
          throw new Error('ServerError: no processId available to create room');
        }
        return { roomId: 'mock-room-123' };
      }),
      reserveSeatFor: vi.fn().mockImplementation(async (_room: any, options: any) => {
        return { seatId: `seat-${options.profileId}` };
      })
    }
  };
});

function createMockClient(sessionId: string): Client {
  return {
    sessionId,
    send: vi.fn()
  } as unknown as Client;
}

describe('RankedMatchmaker Engine (R1 & R2)', () => {
  let matchmaker: RankedMatchmaker;

  beforeEach(() => {
    matchmaker = new RankedMatchmaker();
    vi.clearAllMocks();
  });

  describe('R1: Dynamic Tolerance Calculations', () => {
    it('expands mmrTolerance and levelTolerance dynamically over duration', () => {
      const joinedAt = 1000;

      // At 0s elapsed: mmrTol = 100, levelTol = 2
      let tol = matchmaker.calculateTolerances(joinedAt, 1000);
      expect(tol.mmrTolerance).toBe(100);
      expect(tol.levelTolerance).toBe(2);

      // At 3s elapsed: mmrTol = 150, levelTol = 3
      tol = matchmaker.calculateTolerances(joinedAt, 4000);
      expect(tol.mmrTolerance).toBe(150);
      expect(tol.levelTolerance).toBe(3);

      // At 6s elapsed: mmrTol = 200, levelTol = 4
      tol = matchmaker.calculateTolerances(joinedAt, 7000);
      expect(tol.mmrTolerance).toBe(200);
      expect(tol.levelTolerance).toBe(4);

      // At 60s elapsed: capped at maxMmr (1000) and maxLevel (10)
      tol = matchmaker.calculateTolerances(joinedAt, 61000);
      expect(tol.mmrTolerance).toBe(1000);
      expect(tol.levelTolerance).toBe(10);
    });

    it('enforces dual-compatibility: MMR and Level limits', async () => {
      const client1 = createMockClient('s1');
      const client2 = createMockClient('s2');
      const client3 = createMockClient('s3');
      const now = Date.now();

      // p1: MMR 1000, Level 1
      matchmaker.addPlayer({ client: client1, sessionId: 's1', profileId: 'p1', displayName: 'P1', mmr: 1000, level: 1, joinedAt: now });
      // p2: MMR 1050 (diff 50 <= 100), Level 5 (diff 4 > 2) -> Incompatible level
      matchmaker.addPlayer({ client: client2, sessionId: 's2', profileId: 'p2', displayName: 'P2', mmr: 1050, level: 5, joinedAt: now });

      let matched = false;
      await matchmaker.processQueue('battle_room', () => { matched = true; });
      expect(matched).toBe(false);

      // Add p3: MMR 1020 (diff 20 <= 100), Level 2 (diff 1 <= 2) -> Compatible with p1!
      matchmaker.addPlayer({ client: client3, sessionId: 's3', profileId: 'p3', displayName: 'P3', mmr: 1020, level: 2, joinedAt: now });

      let matchedPair: string[] = [];
      await matchmaker.processQueue('battle_room', (p1Entry, p2Entry) => {
        matchedPair = [p1Entry.sessionId, p2Entry.sessionId];
      });

      expect(matchedPair).toContain('s1');
      expect(matchedPair).toContain('s3');
    });

    it('selects the closest compatible opponent for the longest waiting player (FIFO)', async () => {
      const c1 = createMockClient('s1');
      const c2 = createMockClient('s2');
      const c3 = createMockClient('s3');
      const now = Date.now();

      // s1: oldest (joinedAt: now - 3000), MMR 1000, level 1
      matchmaker.addPlayer({ client: c1, sessionId: 's1', profileId: 'p1', displayName: 'P1', mmr: 1000, level: 1, joinedAt: now - 3000 });
      // s2: joinedAt now - 2000, MMR 1080, level 2 (score: 80 + 25 = 105)
      matchmaker.addPlayer({ client: c2, sessionId: 's2', profileId: 'p2', displayName: 'P2', mmr: 1080, level: 2, joinedAt: now - 2000 });
      // s3: joinedAt now - 1000, MMR 1010, level 1 (score: 10 + 0 = 10 -> closer!)
      matchmaker.addPlayer({ client: c3, sessionId: 's3', profileId: 'p3', displayName: 'P3', mmr: 1010, level: 1, joinedAt: now - 1000 });

      let matchedPair: string[] = [];
      await matchmaker.processQueue('battle_room', (e1, e2) => {
        matchedPair = [e1.sessionId, e2.sessionId];
      });

      // s1 should match with s3 because s3 is closer than s2
      expect(matchedPair).toEqual(['s1', 's3']);
    });
  });

  describe('R2: Profile Deduplication Index & Atomic 2PL Concurrency', () => {
    it('evicts previous session if player with same profileId re-joins', () => {
      const c1 = createMockClient('s1');
      const c2 = createMockClient('s2');

      const evicted: string[] = [];
      matchmaker.addPlayer({ client: c1, sessionId: 's1', profileId: 'prof_alpha', displayName: 'Alpha 1' });
      expect(matchmaker.getQueueSize()).toBe(1);
      expect(matchmaker.getPlayer('s1')).toBeDefined();

      matchmaker.addPlayer(
        { client: c2, sessionId: 's2', profileId: 'prof_alpha', displayName: 'Alpha 2' },
        (oldId) => evicted.push(oldId)
      );

      expect(evicted).toEqual(['s1']);
      expect(matchmaker.getQueueSize()).toBe(1);
      expect(matchmaker.getPlayer('s1')).toBeUndefined();
      expect(matchmaker.getPlayer('s2')).toBeDefined();
    });

    it('prevents self-matching if same profile is queued under different entries', async () => {
      const c1 = createMockClient('s1');
      matchmaker.addPlayer({ client: c1, sessionId: 's1', profileId: 'same_profile', displayName: 'P1', mmr: 1000, level: 1 });

      let matched = false;
      await matchmaker.processQueue('battle_room', () => { matched = true; });
      expect(matched).toBe(false);
    });

    it('reverts entries to queued state preserving original joinedAt on room creation failure', async () => {
      const c1 = createMockClient('s1');
      const c2 = createMockClient('s2');
      const now = Date.now();

      const p1Joined = now - 5000;
      const p2Joined = now - 4000;

      matchmaker.addPlayer({ client: c1, sessionId: 's1', profileId: 'p1', displayName: 'P1', mmr: 1000, level: 1, joinedAt: p1Joined });
      matchmaker.addPlayer({ client: c2, sessionId: 's2', profileId: 'p2', displayName: 'P2', mmr: 1000, level: 1, joinedAt: p2Joined });

      let failed = false;
      await matchmaker.processQueue(
        'non_existent_room_type_trigger_error',
        undefined,
        (errP1, errP2) => {
          failed = true;
        }
      );

      expect(failed).toBe(true);

      const checkP1 = matchmaker.getPlayer('s1');
      const checkP2 = matchmaker.getPlayer('s2');

      expect(checkP1).toBeDefined();
      expect(checkP2).toBeDefined();
      expect(checkP1?.status).toBe('queued');
      expect(checkP2?.status).toBe('queued');
      expect(checkP1?.joinedAt).toBe(p1Joined);
      expect(checkP2?.joinedAt).toBe(p2Joined);
    });

    it('handles disconnect safety during locking state', async () => {
      const c1 = createMockClient('s1');
      const c2 = createMockClient('s2');
      const now = Date.now();

      matchmaker.addPlayer({ client: c1, sessionId: 's1', profileId: 'p1', displayName: 'P1', mmr: 1000, level: 1, joinedAt: now - 3000 });
      matchmaker.addPlayer({ client: c2, sessionId: 's2', profileId: 'p2', displayName: 'P2', mmr: 1000, level: 1, joinedAt: now - 2000 });

      // Player 1 disconnects/leaves while matchmaker is in locking state
      const entry1 = matchmaker.getPlayer('s1');
      if (entry1) entry1.status = 'locking';
      matchmaker.removePlayer('s1'); // Flags lockCancelled and deletes s1

      expect(matchmaker.getPlayer('s1')).toBeUndefined();

      let matched = false;
      await matchmaker.processQueue('battle_room', () => { matched = true; });
      expect(matched).toBe(false);
      expect(matchmaker.getPlayer('s2')?.status).toBe('queued');
    });
  });
});
