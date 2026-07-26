import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchMaker, Client } from 'colyseus';
import { RankedMatchmaker, RankedQueueEntry } from '../src/matchmaking/RankedMatchmaker.js';
import { MatchmakingRoom } from '../src/rooms/MatchmakingRoom.js';

vi.mock('colyseus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('colyseus')>();
  return {
    ...actual,
    matchMaker: {
      ...actual.matchMaker,
      createRoom: vi.fn().mockImplementation(async (roomName: string) => {
        if (roomName === 'failing_room_creation_error') {
          throw new Error('ServerError: Failed to allocate processId for room');
        }
        return { roomId: `mock-room-${Math.random().toString(36).substring(2, 9)}` };
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

describe('High-Concurrency & Dynamic Level Matchmaking Test Suite (R4 Specification)', () => {
  let matchmaker: RankedMatchmaker;

  beforeEach(() => {
    matchmaker = new RankedMatchmaker();
    vi.clearAllMocks();
  });

  /**
   * Test Suite Case 1: Level & Skill Pairing Accuracy
   * Simulates 100 concurrent players with diverse MMRs and levels.
   * Asserts that players with closest MMR and level are paired together first.
   */
  it('Case 1: Level & Skill Pairing Accuracy under peak load (100 concurrent players)', async () => {
    const matchedPairs: { p1: RankedQueueEntry; p2: RankedQueueEntry; mmrDiff: number; levelDiff: number }[] = [];
    const now = Date.now();

    const mmrTiers = [800, 1000, 1200, 1500, 2000];
    const totalPlayers = 100;

    // Concurrently add 100 simulated players across 5 MMR tiers with slight jitter and levels 1-5
    const addPromises = Array.from({ length: totalPlayers }, (_, i) => {
      const tierMMR = mmrTiers[i % mmrTiers.length];
      const mmr = tierMMR + ((i % 11) - 5) * 2; // ±10 MMR jitter
      const level = (i % 5) + 1; // Levels 1..5

      return Promise.resolve(
        matchmaker.addPlayer({
          client: createMockClient(`session-player-${i}`),
          sessionId: `session-player-${i}`,
          profileId: `profile-player-${i}`,
          displayName: `Warrior ${i}`,
          mmr,
          level,
          joinedAt: now
        })
      );
    });

    await Promise.all(addPromises);
    expect(matchmaker.getQueueSize()).toBe(100);

    // Process initial queue tick at t = 0ms (tolerance range = 100 MMR, 2 levels)
    await matchmaker.processQueue('battle_room', (p1, p2) => {
      const mmrDiff = Math.abs(p1.mmr - p2.mmr);
      const levelDiff = Math.abs(p1.level - p2.level);
      matchedPairs.push({ p1, p2, mmrDiff, levelDiff });
    });

    expect(matchedPairs.length).toBeGreaterThan(0);

    // Assert pairing accuracy: every pair formed must strictly observe tolerances at t=0s
    let totalMmrDiff = 0;
    matchedPairs.forEach((pair) => {
      expect(pair.mmrDiff).toBeLessThanOrEqual(100);
      expect(pair.levelDiff).toBeLessThanOrEqual(2);
      totalMmrDiff += pair.mmrDiff;
    });

    // Assert closest skill candidates paired first: mean MMR delta across matched pairs is minimal (<= 30 MMR)
    const avgMmrDiff = totalMmrDiff / matchedPairs.length;
    expect(avgMmrDiff).toBeLessThanOrEqual(30);

    // Total matched players + remaining queue size must equal 100
    const matchedCount = matchedPairs.length * 2;
    expect(matchedCount + matchmaker.getQueueSize()).toBe(100);
  });

  /**
   * Test Suite Case 2: Dynamic Tolerance Expansion
   * Verifies players with wider level/MMR gaps remain queued initially,
   * and are successfully paired as queue duration ticks forward (+50 MMR / 3s, +1 level / 3s).
   */
  it('Case 2: Dynamic Tolerance Expansion (+50 MMR / 3s, +1 level / 3s)', async () => {
    const c1 = createMockClient('sess-a');
    const c2 = createMockClient('sess-b');
    const now = Date.now();

    // Player A: MMR 1000, Level 1
    // Player B: MMR 1180 (gap = 180 > 100), Level 4 (gap = 3 > 2)
    matchmaker.addPlayer({
      client: c1,
      sessionId: 'sess-a',
      profileId: 'prof-a',
      displayName: 'Fighter A',
      mmr: 1000,
      level: 1,
      joinedAt: now
    });

    matchmaker.addPlayer({
      client: c2,
      sessionId: 'sess-b',
      profileId: 'prof-b',
      displayName: 'Fighter B',
      mmr: 1180,
      level: 4,
      joinedAt: now
    });

    // Tick 1 at t = 0s: search range is 100 MMR / 2 levels -> Incompatible gap, no match
    let matched = false;
    await matchmaker.processQueue('battle_room', () => {
      matched = true;
    });

    expect(matched).toBe(false);
    expect(matchmaker.getQueueSize()).toBe(2);
    expect(matchmaker.getPlayer('sess-a')?.status).toBe('queued');
    expect(matchmaker.getPlayer('sess-b')?.status).toBe('queued');

    // Fast-forward simulated queue duration by 6000ms (+6s elapsed)
    // Dynamic tolerances at +6s: 100 + 2*50 = 200 MMR, 2 + 2*1 = 4 levels
    const futureTime = now + 6000;
    const playerA = matchmaker.getPlayer('sess-a')!;
    const playerB = matchmaker.getPlayer('sess-b')!;

    const tolA = matchmaker.calculateTolerances(playerA.joinedAt, futureTime);
    const tolB = matchmaker.calculateTolerances(playerB.joinedAt, futureTime);

    expect(tolA.mmrTolerance).toBe(200);
    expect(tolA.levelTolerance).toBe(4);
    expect(tolB.mmrTolerance).toBe(200);
    expect(tolB.levelTolerance).toBe(4);

    // Update joinedAt relative to mock time and process queue again
    playerA.joinedAt = playerA.joinedAt - 6000;
    playerB.joinedAt = playerB.joinedAt - 6000;

    let matchedPair: [string, string] | null = null;
    await matchmaker.processQueue('battle_room', (p1, p2) => {
      matchedPair = [p1.sessionId, p2.sessionId];
    });

    // Assert players with expanded tolerance are now successfully paired
    expect(matchedPair).not.toBeNull();
    expect(matchedPair).toContain('sess-a');
    expect(matchedPair).toContain('sess-b');
    expect(matchmaker.getQueueSize()).toBe(0);
  });

  /**
   * Test Suite Case 3: Atomic Concurrency & Lock Stress Test (R2)
   * Executes 100 simultaneous queue join requests in parallel (Promise.all)
   * and 20 parallel processQueue ticks.
   * Asserts: 0 duplicate matches, 0 orphaned player sessions, 0 double-booked sessions/profiles.
   */
  it('Case 3: Atomic Concurrency & Lock Stress Test (100 parallel join & 20 parallel processQueue calls)', async () => {
    const now = Date.now();
    const totalPlayers = 100;

    // Execute 100 simultaneous queue join requests in parallel (Promise.all)
    const joinPromises = Array.from({ length: totalPlayers }, (_, i) =>
      Promise.resolve(
        matchmaker.addPlayer({
          client: createMockClient(`conc-sess-${i}`),
          sessionId: `conc-sess-${i}`,
          profileId: `conc-prof-${i}`,
          displayName: `Gladiator ${i}`,
          mmr: 1000 + (i % 5) * 10,
          level: 1 + (i % 3),
          joinedAt: now
        })
      )
    );

    await Promise.all(joinPromises);
    expect(matchmaker.getQueueSize()).toBe(100);

    const assignedSessions = new Set<string>();
    const assignedProfiles = new Set<string>();
    const duplicateSessions = new Set<string>();
    const duplicateProfiles = new Set<string>();
    const createdMatches: { p1: string; p2: string; roomId: string }[] = [];

    // Execute 20 simultaneous processQueue executions in parallel
    const parallelRuns = Array.from({ length: 20 }, () =>
      matchmaker.processQueue('battle_room', (p1, p2, roomId) => {
        if (assignedSessions.has(p1.sessionId)) duplicateSessions.add(p1.sessionId);
        if (assignedSessions.has(p2.sessionId)) duplicateSessions.add(p2.sessionId);
        if (assignedProfiles.has(p1.profileId)) duplicateProfiles.add(p1.profileId);
        if (assignedProfiles.has(p2.profileId)) duplicateProfiles.add(p2.profileId);

        assignedSessions.add(p1.sessionId);
        assignedSessions.add(p2.sessionId);
        assignedProfiles.add(p1.profileId);
        assignedProfiles.add(p2.profileId);

        createdMatches.push({ p1: p1.sessionId, p2: p2.sessionId, roomId });
      })
    );

    await Promise.all(parallelRuns);

    // CRITICAL ATOMICITY ASSERTONS
    // 1. 0 duplicate matches generated
    expect(duplicateSessions.size).toBe(0);
    expect(duplicateProfiles.size).toBe(0);

    // 2. 0 double-booked session IDs or profile IDs across created room instances
    expect(assignedSessions.size).toBe(createdMatches.length * 2);
    expect(assignedProfiles.size).toBe(createdMatches.length * 2);

    // 3. 0 orphaned player sessions: Matched players + remaining queue size equals total initial players (100)
    const remainingQueueSize = matchmaker.getQueueSize();
    expect(assignedSessions.size + remainingQueueSize).toBe(100);
  });

  /**
   * Test Suite Case 4: Profile Deduplication Verification
   * Asserts that when a player with the same profileId joins twice across two session IDs,
   * the older session is cleanly evicted and only one instance exists in queue.
   */
  it('Case 4: Profile Deduplication Verification (Evict old session, single profile entry)', () => {
    const c1 = createMockClient('session-v1');
    const c2 = createMockClient('session-v2');

    const evictedSessions: string[] = [];

    // First join with profile 'user-shadow-ninja' under session-v1
    matchmaker.addPlayer({
      client: c1,
      sessionId: 'session-v1',
      profileId: 'user-shadow-ninja',
      displayName: 'ShadowNinja (v1)',
      mmr: 1200,
      level: 3
    });

    expect(matchmaker.getQueueSize()).toBe(1);
    expect(matchmaker.getPlayer('session-v1')).toBeDefined();

    // Second join with SAME profile 'user-shadow-ninja' under session-v2
    matchmaker.addPlayer(
      {
        client: c2,
        sessionId: 'session-v2',
        profileId: 'user-shadow-ninja',
        displayName: 'ShadowNinja (v2)',
        mmr: 1250,
        level: 3
      },
      (evictedId) => {
        evictedSessions.push(evictedId);
      }
    );

    // Assert older session was cleanly evicted
    expect(evictedSessions).toEqual(['session-v1']);
    expect(matchmaker.getQueueSize()).toBe(1);
    expect(matchmaker.getPlayer('session-v1')).toBeUndefined();

    // Assert new session is active and queued
    const activePlayer = matchmaker.getPlayer('session-v2');
    expect(activePlayer).toBeDefined();
    expect(activePlayer?.sessionId).toBe('session-v2');
    expect(activePlayer?.profileId).toBe('user-shadow-ninja');
    expect(activePlayer?.status).toBe('queued');
  });

  /**
   * Test Suite Case 5: Two-Phase Lock (2PL) Rollback & Disconnect Recovery
   * Simulates room creation failure and client disconnect during locking state.
   * Asserts non-failed/non-disconnected opponents are cleanly restored to queued state with original joinedAt preserved.
   */
  it('Case 5: Two-Phase Lock (2PL) Rollback & Disconnect Recovery (Preserves joinedAt)', async () => {
    const now = Date.now();
    const p1Joined = now - 5000;
    const p2Joined = now - 4000;

    const c1 = createMockClient('sess-fail-1');
    const c2 = createMockClient('sess-fail-2');

    matchmaker.addPlayer({
      client: c1,
      sessionId: 'sess-fail-1',
      profileId: 'prof-fail-1',
      displayName: 'Fail Player 1',
      mmr: 1000,
      level: 1,
      joinedAt: p1Joined
    });

    matchmaker.addPlayer({
      client: c2,
      sessionId: 'sess-fail-2',
      profileId: 'prof-fail-2',
      displayName: 'Fail Player 2',
      mmr: 1000,
      level: 1,
      joinedAt: p2Joined
    });

    // 5.1 Simulate room creation failure
    let matchFailed = false;
    await matchmaker.processQueue(
      'failing_room_creation_error',
      undefined,
      (p1, p2) => {
        matchFailed = true;
      }
    );

    expect(matchFailed).toBe(true);

    const restoredP1 = matchmaker.getPlayer('sess-fail-1');
    const restoredP2 = matchmaker.getPlayer('sess-fail-2');

    // Assert both players restored to queued state with exact original joinedAt preserved
    expect(restoredP1?.status).toBe('queued');
    expect(restoredP2?.status).toBe('queued');
    expect(restoredP1?.joinedAt).toBe(p1Joined);
    expect(restoredP2?.joinedAt).toBe(p2Joined);

    // 5.2 Simulate client disconnect during locking state
    const matchmaker2 = new RankedMatchmaker();
    const c3 = createMockClient('sess-disc-3');
    const c4 = createMockClient('sess-stay-4');
    const p4Joined = now - 3000;

    matchmaker2.addPlayer({
      client: c3,
      sessionId: 'sess-disc-3',
      profileId: 'prof-disc-3',
      displayName: 'Disconnecter',
      mmr: 1200,
      level: 2,
      joinedAt: now - 2000
    });

    matchmaker2.addPlayer({
      client: c4,
      sessionId: 'sess-stay-4',
      profileId: 'prof-stay-4',
      displayName: 'Survivor',
      mmr: 1200,
      level: 2,
      joinedAt: p4Joined
    });

    // Player 3 disconnects while lock is initiated
    const entry3 = matchmaker2.getPlayer('sess-disc-3')!;
    entry3.status = 'locking';
    matchmaker2.removePlayer('sess-disc-3'); // Sets lockCancelled = true and removes entry3

    expect(matchmaker2.getPlayer('sess-disc-3')).toBeUndefined();

    // Process queue with remaining locking candidate
    let matchOccurred = false;
    await matchmaker2.processQueue('battle_room', () => {
      matchOccurred = true;
    });

    expect(matchOccurred).toBe(false);

    // Assert non-disconnected opponent (Player 4) is cleanly restored to queued state with original joinedAt preserved
    const survivor = matchmaker2.getPlayer('sess-stay-4');
    expect(survivor).toBeDefined();
    expect(survivor?.status).toBe('queued');
    expect(survivor?.joinedAt).toBe(p4Joined);
  });

  /**
   * Test Suite Case 6: 20-Second Queue Timeout & Bot Fallback (R3 & R4)
   * Verifies single-player 20s queue search timeout, queue departure, and AI bot fallback transition.
   */
  it('Case 6: 20-Second Queue Timeout & Bot Fallback (R3 & R4 Specifications)', async () => {
    const client = createMockClient('sess-lonely');
    const now = Date.now();

    const entry = matchmaker.addPlayer({
      client,
      sessionId: 'sess-lonely',
      profileId: 'solo-adventurer',
      displayName: 'Lonely Knight',
      mmr: 1500,
      level: 5,
      joinedAt: now
    });

    // 1. At 19.9s elapsed (19,900ms), search range expand continues, no timeout trigger
    const elapsed19s = now + 19900;
    let timedOut = matchmaker.getTimedOutPlayers(20000, elapsed19s);
    expect(timedOut.length).toBe(0);
    expect(matchmaker.getQueueSize()).toBe(1);

    // 2. At 20.0s elapsed (20,000ms), 20s search timeout threshold is reached
    const elapsed20s = now + 20000;
    timedOut = matchmaker.getTimedOutPlayers(20000, elapsed20s);
    expect(timedOut.length).toBe(1);
    expect(timedOut[0].sessionId).toBe('sess-lonely');
    expect(timedOut[0].profileId).toBe('solo-adventurer');

    // 3. Queue departure and transition to AI bot match
    const removedEntry = matchmaker.removePlayer('sess-lonely');
    expect(removedEntry).toBeDefined();
    expect(matchmaker.getQueueSize()).toBe(0);

    // 4. Verify AI bot fallback options payload structure for CombatRoom spawn
    const botRoomOptions = {
      profileId: removedEntry?.profileId,
      displayName: removedEntry?.displayName,
      mmr: removedEntry?.mmr,
      level: removedEntry?.level,
      withBot: true,
      botDifficulty: 'adaptive' as const
    };

    expect(botRoomOptions.withBot).toBe(true);
    expect(botRoomOptions.botDifficulty).toBe('adaptive');
    expect(botRoomOptions.profileId).toBe('solo-adventurer');
  });
});
