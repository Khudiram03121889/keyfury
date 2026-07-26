import { Room, Client } from 'colyseus';
import { Schema, type, MapSchema } from '@colyseus/schema';
import { RankedQueueOptions } from '@keyfury/protocol';
import { supabaseServer } from '../services/supabase.js';
import { RankedMatchmaker, RankedQueueEntry } from '../matchmaking/RankedMatchmaker.js';

export class QueuePlayerState extends Schema {
  @type('string') sessionId: string = '';
  @type('string') profileId: string = '';
  @type('string') displayName: string = '';
  @type('number') mmr: number = 1000;
  @type('number') level: number = 1;
  @type('number') joinedAt: number = 0;
  @type('number') mmrTolerance: number = 100;
  @type('number') levelTolerance: number = 2;
  @type('number') tolerance: number = 100;
  @type('string') status: string = 'queued';
}

export class MatchmakingRoomState extends Schema {
  @type({ map: QueuePlayerState }) queue = new MapSchema<QueuePlayerState>();
}

export class MatchmakingRoom extends Room<MatchmakingRoomState> {
  private matchmaker: RankedMatchmaker = new RankedMatchmaker();
  private isProcessing: boolean = false;

  async onAuth(_client: Client, options: any) {
    const token = options?.token || options?.auth?.token;
    if (token && supabaseServer) {
      const { data, error } = await supabaseServer.auth.getUser(token);
      if (error || !data?.user) {
        throw new Error('Unauthorized: Invalid JWT token');
      }
      return { user: data.user, userId: data.user.id };
    }
    return true;
  }

  onCreate() {
    this.setState(new MatchmakingRoomState());
    this.setSimulationInterval(() => this.processQueue(), 1000);
    console.log(`[MatchmakingRoom] Initialized matchmaking room ${this.roomId}`);
  }

  onJoin(client: Client, options: RankedQueueOptions) {
    const profileId = options.profileId || `guest-${client.sessionId}`;
    const displayName = options.displayName || `Challenger ${Math.floor(Math.random() * 900 + 100)}`;
    const mmr = options.mmr ?? 1000;
    const level = Math.max(1, options.level ?? 1);
    const now = Date.now();

    const entry = this.matchmaker.addPlayer(
      {
        client,
        sessionId: client.sessionId,
        profileId,
        displayName,
        mmr,
        level,
        joinedAt: now,
        token: options.token
      },
      (evictedSessionId) => {
        // Remove previous session of re-joining profile from Colyseus room state
        this.state.queue.delete(evictedSessionId);
      }
    );

    const playerState = new QueuePlayerState();
    playerState.sessionId = client.sessionId;
    playerState.profileId = profileId;
    playerState.displayName = displayName;
    playerState.mmr = mmr;
    playerState.level = level;
    playerState.joinedAt = now;
    playerState.mmrTolerance = entry.mmrTolerance;
    playerState.levelTolerance = entry.levelTolerance;
    playerState.tolerance = entry.mmrTolerance;
    playerState.status = 'queued';

    this.state.queue.set(client.sessionId, playerState);
    console.log(`[MatchmakingRoom] Player queued: ${displayName} (${profileId}) MMR:${mmr} Lvl:${level}`);
  }

  onLeave(client: Client) {
    this.matchmaker.removePlayer(client.sessionId);
    this.state.queue.delete(client.sessionId);
    console.log(`[MatchmakingRoom] Player left queue: ${client.sessionId}`);
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();

      // R4 Specification: Process 20-second queue search timeout and AI bot fallback for single queued players
      const timedOutEntries = this.matchmaker.getTimedOutPlayers(20000, now);
      for (const entry of timedOutEntries) {
        if (entry.client && typeof entry.client.send === 'function') {
          entry.client.send('queue_timeout_bot_fallback', {
            profileId: entry.profileId,
            reason: 'queue_timeout_20s',
            fallbackToBot: true
          });
        }
        this.matchmaker.removePlayer(entry.sessionId);
        this.state.queue.delete(entry.sessionId);
        console.log(`[MatchmakingRoom] Player ${entry.displayName} (${entry.sessionId}) timed out after 20s queue search -> Bot fallback.`);
      }

      if (this.matchmaker.getQueueSize() < 2) return;
      this.state.queue.forEach((stateEntry, sessionId) => {
        const playerEntry = this.matchmaker.getPlayer(sessionId);
        if (playerEntry) {
          const tolerances = this.matchmaker.calculateTolerances(stateEntry.joinedAt, now);
          stateEntry.mmrTolerance = tolerances.mmrTolerance;
          stateEntry.levelTolerance = tolerances.levelTolerance;
          stateEntry.tolerance = tolerances.mmrTolerance;
          stateEntry.status = playerEntry.status;
        }
      });

      await this.matchmaker.processQueue(
        'battle_room',
        (p1, p2) => {
          this.state.queue.delete(p1.sessionId);
          this.state.queue.delete(p2.sessionId);
        },
        (p1, p2) => {
          const s1 = this.state.queue.get(p1.sessionId);
          if (s1) {
            if (p1.status === 'queued') {
              s1.status = 'queued';
            } else {
              this.state.queue.delete(p1.sessionId);
            }
          }
          const s2 = this.state.queue.get(p2.sessionId);
          if (s2) {
            if (p2.status === 'queued') {
              s2.status = 'queued';
            } else {
              this.state.queue.delete(p2.sessionId);
            }
          }
        }
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
