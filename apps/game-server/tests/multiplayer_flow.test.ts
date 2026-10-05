import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import WebSocket from 'ws';
(globalThis as any).WebSocket = WebSocket;

import { Server, matchMaker } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client as ColyseusClient } from 'colyseus.js';
import http from 'http';
import { CombatRoom } from '../src/rooms/CombatRoom.js';
import { RankedMatchmaker } from '../src/matchmaking/RankedMatchmaker.js';

function waitForCondition(checkFn: () => boolean, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (checkFn()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for state condition'));
      }
    }, 40);
  });
}

describe('Multiplayer Matchmaking & Session Flow (Multiplayer Requirements)', () => {
  let server: http.Server;
  let gameServer: Server;
  const PORT = 2588;
  const SERVER_URL = `ws://localhost:${PORT}`;

  beforeAll(async () => {
    server = http.createServer();
    gameServer = new Server({
      transport: new WebSocketTransport({ server })
    });

    gameServer.define('duel_room', CombatRoom).filterBy(['isChallenge', 'arenaId']);

    await new Promise<void>((resolve) => {
      server.listen(PORT, () => resolve());
    });
  });

  afterAll(async () => {
    try {
      await gameServer.gracefullyShutdown();
    } catch (_) {}
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe('1. Matchmaking by Map & Level Constraints (RankedMatchmaker)', () => {
    it('groups only players who selected the same map and within skill level tolerance', async () => {
      const onMatchFound = vi.fn();
      const mm = new RankedMatchmaker();

      function createMockClient(sessionId: string) {
        return { sessionId, send: vi.fn() } as any;
      }

      // Player 1: Highland Sanctuary, Level 3, MMR 1000
      mm.addPlayer({
        client: createMockClient('s1'),
        sessionId: 's1',
        profileId: 'prof_1',
        displayName: 'Player One',
        mmr: 1000,
        level: 3,
        arenaId: 'highland_sanctuary'
      });

      // Player 2: Cyber Rooftop (DIFFERENT MAP), Level 3, MMR 1000
      mm.addPlayer({
        client: createMockClient('s2'),
        sessionId: 's2',
        profileId: 'prof_2',
        displayName: 'Player Two',
        mmr: 1000,
        level: 3,
        arenaId: 'cyber_rooftop'
      });

      // Process queue: should NOT match due to map mismatch
      await mm.processQueue('duel_room', onMatchFound);
      expect(onMatchFound).not.toHaveBeenCalled();

      // Check map counts
      const counts = mm.getMapCounts();
      expect(counts['highland_sanctuary']).toBe(1);
      expect(counts['cyber_rooftop']).toBe(1);

      // Player 3: Highland Sanctuary (SAME MAP), but Level 10 (GAP 7 > tolerance 2)
      mm.addPlayer({
        client: createMockClient('s3'),
        sessionId: 's3',
        profileId: 'prof_3',
        displayName: 'Player Three',
        mmr: 1000,
        level: 10,
        arenaId: 'highland_sanctuary'
      });

      await mm.processQueue('duel_room', onMatchFound);
      expect(onMatchFound).not.toHaveBeenCalled();

      // Player 4: Highland Sanctuary (SAME MAP), Level 4 (GAP 1 <= tolerance 2)
      mm.addPlayer({
        client: createMockClient('s4'),
        sessionId: 's4',
        profileId: 'prof_4',
        displayName: 'Player Four',
        mmr: 1000,
        level: 4,
        arenaId: 'highland_sanctuary'
      });

      await mm.processQueue('duel_room', onMatchFound);
      expect(onMatchFound).toHaveBeenCalledTimes(1);
      const [matchedP1, matchedP2, matchedRoomId] = onMatchFound.mock.calls[0];
      expect(matchedP1.arenaId).toBe('highland_sanctuary');
      expect(matchedP2.arenaId).toBe('highland_sanctuary');
      expect(typeof matchedRoomId).toBe('string');

      // Queue counts updated after match creation
      const updatedCounts = mm.getMapCounts();
      expect(updatedCounts['highland_sanctuary']).toBe(1); // Player 3 remains
      expect(updatedCounts['cyber_rooftop']).toBe(1); // Player 2 remains
    });
  });

  describe('2. Custom Timer Range Validation (60s – 120s)', () => {
    it('accepts valid custom durations between 60s and 120s and locks them in room state', async () => {
      const col = new ColyseusClient(SERVER_URL);

      // Test valid 90s duration in challenge room
      const room90 = await col.create('duel_room', {
        profileId: 'host_90',
        displayName: 'Host 90s',
        isChallenge: true,
        arenaId: 'highland_sanctuary',
        matchDuration: 90
      });

      await waitForCondition(() => room90.state?.matchDuration === 90);
      expect(room90.state.matchDuration).toBe(90);
      expect(room90.state.remainingSeconds).toBe(90);

      await room90.leave();

      // Test valid 120s maximum duration
      const room120 = await col.create('duel_room', {
        profileId: 'host_120',
        displayName: 'Host 120s',
        isChallenge: true,
        arenaId: 'highland_sanctuary',
        matchDuration: 120
      });

      await waitForCondition(() => room120.state?.matchDuration === 120);
      expect(room120.state.matchDuration).toBe(120);
      expect(room120.state.remainingSeconds).toBe(120);

      await room120.leave();
    });

    it('strictly rejects match durations outside the 60s – 120s range', async () => {
      const col = new ColyseusClient(SERVER_URL);

      // Value < 60s must fail
      await expect(col.create('duel_room', {
        profileId: 'host_invalid_low',
        displayName: 'Host Too Fast',
        isChallenge: true,
        arenaId: 'highland_sanctuary',
        matchDuration: 45
      })).rejects.toThrow();

      // Value > 120s must fail
      await expect(col.create('duel_room', {
        profileId: 'host_invalid_high',
        displayName: 'Host Too Long',
        isChallenge: true,
        arenaId: 'highland_sanctuary',
        matchDuration: 150
      })).rejects.toThrow();
    });
  });

  describe('3. Map Selection & Room Creation (Host vs Guest)', () => {
    it('allows host to change map before countdown, but forbids guest from changing map', async () => {
      const colHost = new ColyseusClient(SERVER_URL);
      const colGuest = new ColyseusClient(SERVER_URL);

      const hostRoom = await colHost.create('duel_room', {
        profileId: 'host_user',
        displayName: 'Room Creator Host',
        isChallenge: true,
        arenaId: 'highland_sanctuary',
        matchDuration: 60
      });

      const guestRoom = await colGuest.joinById(hostRoom.id, {
        profileId: 'guest_user',
        displayName: 'Joining Guest',
        characterId: 'cyber_valkyrie'
      });

      await waitForCondition(() => hostRoom.state.players.size === 2);
      expect(hostRoom.state.arenaId).toBe('highland_sanctuary');

      // Host changes map to volcanic_caldera -> succeeds
      hostRoom.send('update_options', { arenaId: 'volcanic_caldera' });
      await waitForCondition(() => hostRoom.state.arenaId === 'volcanic_caldera');
      expect(hostRoom.state.arenaId).toBe('volcanic_caldera');
      expect(guestRoom.state.arenaId).toBe('volcanic_caldera');

      // Guest attempts to alter the map -> rejected by server, map remains volcanic_caldera
      guestRoom.send('update_options', { arenaId: 'celestial_void' });
      // Short delay to verify no state change
      await new Promise((r) => setTimeout(r, 150));
      expect(hostRoom.state.arenaId).toBe('volcanic_caldera');
      expect(guestRoom.state.arenaId).toBe('volcanic_caldera');

      // Guest CAN select/update their character/avatar
      guestRoom.send('update_options', { characterId: 'volt_shinobi' });
      await waitForCondition(() => guestRoom.state.players.get(guestRoom.sessionId)?.characterId === 'volt_shinobi');
      expect(guestRoom.state.players.get(guestRoom.sessionId)?.characterId).toBe('volt_shinobi');

      await hostRoom.leave();
      await guestRoom.leave();
    });
  });

  describe('4. Intro Synchronization & Typing Block', () => {
    it('prevents typing until both players are ready and unlocks once opponent starts intro', async () => {
      const col1 = new ColyseusClient(SERVER_URL);
      const col2 = new ColyseusClient(SERVER_URL);

      const room1 = await col1.create('duel_room', {
        profileId: 'intro_p1',
        displayName: 'Player One',
        isChallenge: true,
        arenaId: 'cyber_rooftop',
        matchDuration: 60
      });

      const room2 = await col2.joinById(room1.id, {
        profileId: 'intro_p2',
        displayName: 'Player Two'
      });

      await waitForCondition(() => room1.state.players.size === 2);

      // Both players ready up to enter countdown
      room1.send('ready', {});
      room2.send('ready', {});
      await waitForCondition(() => room1.state.status === 'countdown');
      expect(room1.state.inputEnabled).toBe(false);
      expect(room2.state.inputEnabled).toBe(false);

      let p1SyncEventReceived: any = null;
      room1.onMessage('server_event', (e: any) => {
        if (e.type === 'intro_sync_update') {
          p1SyncEventReceived = e;
        }
      });

      // Player 1 clicks "Skip Intro"
      room1.send('skip_intro', {});

      // Player 1 should receive intro_sync_update with waitingForOpponent: true
      await waitForCondition(() => p1SyncEventReceived !== null);
      expect(p1SyncEventReceived.waitingForOpponent).toBe(true);

      // Match MUST NOT start yet; input remains strictly disabled
      expect(room1.state.status).toBe('countdown');
      expect(room1.state.inputEnabled).toBe(false);

      // Now Player 2 clicks "Skip Intro"
      room2.send('skip_intro', {});

      // Once Player 2 is ready, match transitions to in_progress and enables input
      await waitForCondition(() => room1.state.status === 'in_progress');
      expect(room1.state.status).toBe('in_progress');
      expect(room1.state.inputEnabled).toBe(true);
      expect(room2.state.inputEnabled).toBe(true);

      await room1.leave();
      await room2.leave();
    });
  });

  describe('5. Rematch Flow (Notification Delivery, Decline & Dual-Acceptance)', () => {
    it('handles rematch requests, notifications, declines, and dual-acceptance restarts', async () => {
      const col1 = new ColyseusClient(SERVER_URL);
      const col2 = new ColyseusClient(SERVER_URL);

      const room1 = await col1.create('duel_room', {
        profileId: 'rematch_p1',
        displayName: 'Rematch Fighter 1',
        isChallenge: true,
        arenaId: 'volcanic_caldera',
        matchDuration: 75
      });

      const room2 = await col2.joinById(room1.id, {
        profileId: 'rematch_p2',
        displayName: 'Rematch Fighter 2'
      });

      await waitForCondition(() => room1.state.players.size === 2);

      // Ready up and enter match
      room1.send('ready', {});
      room2.send('ready', {});
      await waitForCondition(() => room1.state.status === 'countdown');

      room1.send('skip_intro', {});
      room2.send('skip_intro', {});
      await waitForCondition(() => room1.state.status === 'in_progress');

      // Forfeit player 2 to trigger match completion
      room2.send('leave_match', {});
      await waitForCondition(() => room1.state.status === 'forfeit');

      let p2ReceivedRematchRequest: any = null;
      let p1DismissedEvent: any = null;

      room2.onMessage('server_event', (e: any) => {
        if (e.type === 'rematch_request') {
          p2ReceivedRematchRequest = e;
        }
      });

      room1.onMessage('server_event', (e: any) => {
        if (e.type === 'rematch_dismissed') {
          p1DismissedEvent = e;
        }
      });

      // Player 1 clicks "Rematch"
      room1.send('rematch_vote', { accepted: true });

      // Player 2 receives immediate notification ("[Player 1] wants to rematch")
      await waitForCondition(() => p2ReceivedRematchRequest !== null);
      expect(p2ReceivedRematchRequest.type).toBe('rematch_request');
      expect(p2ReceivedRematchRequest.requesterSessionId).toBe(room1.sessionId);
      expect(p2ReceivedRematchRequest.requesterDisplayName).toBe('Rematch Fighter 1');
      expect(p2ReceivedRematchRequest.timeoutSeconds).toBe(20);

      // Test Decline flow: Player 2 declines
      room2.send('rematch_vote', { accepted: false });
      await waitForCondition(() => p1DismissedEvent !== null);
      expect(p1DismissedEvent.type).toBe('rematch_dismissed');
      expect(p1DismissedEvent.reason).toBe('declined');

      // Test Dual-Acceptance flow: Both accept rematch
      room1.send('rematch_vote', { accepted: true });
      room2.send('rematch_vote', { accepted: true });

      // Match state restarts with countdown and locked custom match duration of 75s
      await waitForCondition(() => room1.state.status === 'countdown');
      expect(room1.state.status).toBe('countdown');
      expect(room1.state.remainingSeconds).toBe(75);
      expect(room1.state.matchDuration).toBe(75);
      expect(room1.state.players.get(room1.sessionId)?.health).toBe(200);
      expect(room1.state.players.get(room2.sessionId)?.health).toBe(200);

      await room1.leave();
      await room2.leave();
    });
  });
});
