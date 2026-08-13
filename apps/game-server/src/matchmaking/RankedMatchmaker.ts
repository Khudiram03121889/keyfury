import { matchMaker, Client } from 'colyseus';

export interface RankedQueueEntry {
  client: Client;
  sessionId: string;
  profileId: string;
  displayName: string;
  mmr: number;
  level: number;
  joinedAt: number;
  mmrTolerance: number;
  levelTolerance: number;
  searchRange?: number;
  status: 'queued' | 'locking' | 'matched';
  lockCancelled?: boolean;
  token?: string;
}

export class RankedMatchmaker {
  private queue: Map<string, RankedQueueEntry> = new Map();
  private profileToSession: Map<string, string> = new Map();
  private isProcessing: boolean = false;

  private baseMmrTolerance: number = 100;
  private mmrExpandStep: number = 50;
  private maxMmrTolerance: number = 1000;

  private baseLevelTolerance: number = 2;
  private levelExpandStep: number = 1;
  private maxLevelTolerance: number = 10;

  private rangeExpandIntervalMs: number = 3000;

  public addPlayer(
    entry: Partial<RankedQueueEntry> & { client: Client; sessionId: string; profileId: string; displayName: string },
    onEvictPlayer?: (evictedSessionId: string) => void
  ): RankedQueueEntry {
    const profileId = entry.profileId;

    // Profile Deduplication Index: If same profile joins while queued, evict previous session
    const existingSessionId = this.profileToSession.get(profileId);
    if (existingSessionId && existingSessionId !== entry.sessionId) {
      console.log(`[RankedMatchmaker] Profile ${profileId} re-joined queue. Evicting previous session ${existingSessionId}.`);
      this.removePlayer(existingSessionId);
      if (onEvictPlayer) {
        onEvictPlayer(existingSessionId);
      }
    }

    const now = Date.now();
    const joinedAt = entry.joinedAt ?? now;
    const tolerances = this.calculateTolerances(joinedAt, now);

    const fullEntry: RankedQueueEntry = {
      client: entry.client,
      sessionId: entry.sessionId,
      profileId,
      displayName: entry.displayName,
      mmr: entry.mmr ?? 1000,
      level: Math.max(1, entry.level ?? 1),
      joinedAt,
      mmrTolerance: entry.mmrTolerance ?? tolerances.mmrTolerance,
      levelTolerance: entry.levelTolerance ?? tolerances.levelTolerance,
      searchRange: entry.mmrTolerance ?? tolerances.mmrTolerance,
      status: 'queued',
      token: entry.token
    };

    this.queue.set(entry.sessionId, fullEntry);
    this.profileToSession.set(profileId, entry.sessionId);
    return fullEntry;
  }

  public removePlayer(sessionId: string): RankedQueueEntry | undefined {
    const entry = this.queue.get(sessionId);
    if (!entry) return undefined;

    // Disconnect Safety: If in 'locking' state, set cancellation flag to abort seat reservation
    if (entry.status === 'locking') {
      entry.lockCancelled = true;
      console.log(`[RankedMatchmaker] Session ${sessionId} marked as cancelled during locking state.`);
    }

    if (this.profileToSession.get(entry.profileId) === sessionId) {
      this.profileToSession.delete(entry.profileId);
    }

    this.queue.delete(sessionId);
    return entry;
  }

  public getPlayer(sessionId: string): RankedQueueEntry | undefined {
    return this.queue.get(sessionId);
  }

  public getQueueSize(): number {
    return this.queue.size;
  }

  /**
   * Returns queued players whose search duration has exceeded timeoutMs (default 20,000ms = 20s, R4 specification).
   */
  public getTimedOutPlayers(timeoutMs: number = 20000, now: number = Date.now()): RankedQueueEntry[] {
    const timedOut: RankedQueueEntry[] = [];
    this.queue.forEach((entry) => {
      if (entry.status === 'queued' && now - entry.joinedAt >= timeoutMs) {
        timedOut.push(entry);
      }
    });
    return timedOut;
  }

  /**
   * Dynamic MMR & Level tolerance calculations based on queue duration.
   * - mmrTolerance: base 100 MMR, expands +50 MMR every 3s, max 1000 MMR.
   * - levelTolerance: base 2 levels, expands +1 level every 3s, max 10 levels.
   */
  public calculateTolerances(joinedAt: number, now: number = Date.now()): { mmrTolerance: number; levelTolerance: number } {
    const elapsedMs = Math.max(0, now - joinedAt);
    const intervals = Math.floor(elapsedMs / this.rangeExpandIntervalMs);

    const mmrTolerance = Math.min(this.maxMmrTolerance, this.baseMmrTolerance + intervals * this.mmrExpandStep);
    const levelTolerance = Math.min(this.maxLevelTolerance, this.baseLevelTolerance + intervals * this.levelExpandStep);

    return { mmrTolerance, levelTolerance };
  }

  public calculateSearchRange(joinedAt: number, now: number = Date.now()): number {
    return this.calculateTolerances(joinedAt, now).mmrTolerance;
  }

  public async processQueue(
    targetRoomName: string = 'battle_room',
    onMatchFound?: (p1: RankedQueueEntry, p2: RankedQueueEntry, roomId: string) => void,
    onMatchFailed?: (p1: RankedQueueEntry, p2: RankedQueueEntry) => void
  ): Promise<void> {
    if (this.isProcessing || this.queue.size < 2) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      const allEntries = Array.from(this.queue.values());

      // Update dynamic tolerances
      allEntries.forEach((entry) => {
        if (entry.status === 'queued') {
          const tolerances = this.calculateTolerances(entry.joinedAt, now);
          entry.mmrTolerance = tolerances.mmrTolerance;
          entry.levelTolerance = tolerances.levelTolerance;
          entry.searchRange = tolerances.mmrTolerance;
        }
      });

      // FIFO Queue Priority: Iterate candidates starting with longest waiting player (joinedAt ascending)
      const queuedEntries = allEntries
        .filter((e) => e.status === 'queued')
        .sort((a, b) => a.joinedAt - b.joinedAt);

      const matchPromises: Promise<void>[] = [];

      for (let i = 0; i < queuedEntries.length; i++) {
        const p1 = queuedEntries[i];
        if (p1.status !== 'queued' || p1.lockCancelled) continue;

        const candidateOpponents: { entry: RankedQueueEntry; mmrDiff: number; levelDiff: number; score: number }[] = [];

        for (let j = 0; j < queuedEntries.length; j++) {
          if (i === j) continue;
          const p2 = queuedEntries[j];
          if (p2.status !== 'queued' || p2.lockCancelled) continue;
          if (p1.profileId === p2.profileId) continue; // Prevent self-matching

          const mmrDiff = Math.abs(p1.mmr - p2.mmr);
          const levelDiff = Math.abs(p1.level - p2.level);

          const maxAllowedMmr = Math.max(p1.mmrTolerance, p2.mmrTolerance);
          const maxAllowedLevel = Math.max(p1.levelTolerance, p2.levelTolerance);

          // Dual-compatibility matching rule:
          // mmrDiff <= max(p1.mmrTolerance, p2.mmrTolerance) AND levelDiff <= max(p1.levelTolerance, p2.levelTolerance)
          if (mmrDiff <= maxAllowedMmr && levelDiff <= maxAllowedLevel) {
            // Closeness score: combined distance metric
            const score = mmrDiff + levelDiff * 25;
            candidateOpponents.push({ entry: p2, mmrDiff, levelDiff, score });
          }
        }

        if (candidateOpponents.length > 0) {
          // Select closest compatible opponent
          candidateOpponents.sort((a, b) => a.score - b.score);
          const bestMatch = candidateOpponents[0];
          const p2 = bestMatch.entry;

          // 2PL State Transition: Mark both entries as 'locking' before async operations
          p1.status = 'locking';
          p2.status = 'locking';

          matchPromises.push(
            this.createAndReserveMatch(p1, p2, targetRoomName, onMatchFound, onMatchFailed)
          );
        }
      }

      if (matchPromises.length > 0) {
        await Promise.all(matchPromises);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async createAndReserveMatch(
    p1: RankedQueueEntry,
    p2: RankedQueueEntry,
    targetRoomName: string,
    onMatchFound?: (p1: RankedQueueEntry, p2: RankedQueueEntry, roomId: string) => void,
    onMatchFailed?: (p1: RankedQueueEntry, p2: RankedQueueEntry) => void
  ): Promise<void> {
    if (p1.lockCancelled || p2.lockCancelled) {
      console.log(`[RankedMatchmaker] Lock cancelled prior to room creation: p1(${p1.displayName}, cancelled=${!!p1.lockCancelled}), p2(${p2.displayName}, cancelled=${!!p2.lockCancelled})`);
      this.rollbackLockingState(p1, p2, onMatchFailed);
      return;
    }

    try {
      const room = await matchMaker.createRoom(targetRoomName, { isRanked: true });

      if (p1.lockCancelled || p2.lockCancelled) {
        console.log(`[RankedMatchmaker] Lock cancelled after room creation: p1(${p1.displayName}), p2(${p2.displayName})`);
        this.rollbackLockingState(p1, p2, onMatchFailed);
        return;
      }

      const res1 = await matchMaker.reserveSeatFor(room, {
        profileId: p1.profileId,
        displayName: p1.displayName,
        mmr: p1.mmr,
        level: p1.level,
        token: p1.token
      });

      const res2 = await matchMaker.reserveSeatFor(room, {
        profileId: p2.profileId,
        displayName: p2.displayName,
        mmr: p2.mmr,
        level: p2.level,
        token: p2.token
      });

      if (p1.lockCancelled || p2.lockCancelled) {
        console.log(`[RankedMatchmaker] Lock cancelled after seat reservation: p1(${p1.displayName}), p2(${p2.displayName})`);
        this.rollbackLockingState(p1, p2, onMatchFailed);
        return;
      }

      // Successful 2PL transition to 'matched'
      p1.status = 'matched';
      p2.status = 'matched';

      this.queue.delete(p1.sessionId);
      this.queue.delete(p2.sessionId);

      if (this.profileToSession.get(p1.profileId) === p1.sessionId) {
        this.profileToSession.delete(p1.profileId);
      }
      if (this.profileToSession.get(p2.profileId) === p2.sessionId) {
        this.profileToSession.delete(p2.profileId);
      }

      if (p1.client && typeof p1.client.send === 'function') {
        p1.client.send('match_found', {
          roomId: room.roomId,
          seatReservation: res1
        });
      }

      if (p2.client && typeof p2.client.send === 'function') {
        p2.client.send('match_found', {
          roomId: room.roomId,
          seatReservation: res2
        });
      }

      if (onMatchFound) {
        onMatchFound(p1, p2, room.roomId);
      }

      console.log(`[RankedMatchmaker] Matched ${p1.displayName} (MMR:${p1.mmr}, Lvl:${p1.level}) vs ${p2.displayName} (MMR:${p2.mmr}, Lvl:${p2.level}) in room ${room.roomId}`);
    } catch (err) {
      console.error(`[RankedMatchmaker] Failed to create or reserve room ${targetRoomName}:`, err);
      this.rollbackLockingState(p1, p2, onMatchFailed);
    }
  }

  private rollbackLockingState(
    p1: RankedQueueEntry,
    p2: RankedQueueEntry,
    onMatchFailed?: (p1: RankedQueueEntry, p2: RankedQueueEntry) => void
  ): void {
    const isClient1Closed = p1.client && typeof (p1.client as any).readyState === 'number' && (p1.client as any).readyState > 1;
    if (!p1.lockCancelled && !isClient1Closed && this.queue.has(p1.sessionId)) {
      p1.status = 'queued';
    } else {
      this.queue.delete(p1.sessionId);
      if (this.profileToSession.get(p1.profileId) === p1.sessionId) {
        this.profileToSession.delete(p1.profileId);
      }
    }

    const isClient2Closed = p2.client && typeof (p2.client as any).readyState === 'number' && (p2.client as any).readyState > 1;
    if (!p2.lockCancelled && !isClient2Closed && this.queue.has(p2.sessionId)) {
      p2.status = 'queued';
    } else {
      this.queue.delete(p2.sessionId);
      if (this.profileToSession.get(p2.profileId) === p2.sessionId) {
        this.profileToSession.delete(p2.profileId);
      }
    }

    if (onMatchFailed) {
      onMatchFailed(p1, p2);
    }
  }
}
