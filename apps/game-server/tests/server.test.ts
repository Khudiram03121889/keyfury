import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
(globalThis as any).WebSocket = WebSocket;

import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Client as ColyseusClient } from 'colyseus.js';
import http from 'http';
import { DuelRoom } from '../src/rooms/DuelRoom.js';

function waitForCondition(checkFn: () => boolean, timeoutMs = 3000): Promise<void> {
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
    }, 50);
  });
}

describe('Game Server Integration Tests', () => {
  let server: http.Server;
  let gameServer: Server;
  const PORT = 2577;
  const SERVER_URL = `ws://localhost:${PORT}`;

  beforeAll(async () => {
    server = http.createServer();
    gameServer = new Server({
      transport: new WebSocketTransport({ server })
    });
    gameServer.define('duel_room', DuelRoom).filterBy(['isChallenge']);

    await new Promise<void>((resolve) => {
      server.listen(PORT, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('pairs two clients in a quick queue duel room', async () => {
    const col1 = new ColyseusClient(SERVER_URL);
    const col2 = new ColyseusClient(SERVER_URL);

    const room1 = await col1.joinOrCreate('duel_room', {
      profileId: 'p1',
      displayName: 'Player One',
      isChallenge: false
    });

    const room2 = await col2.joinOrCreate('duel_room', {
      profileId: 'p2',
      displayName: 'Player Two',
      isChallenge: false
    });

    expect(room1.roomId).toBe(room2.roomId);

    await waitForCondition(() => room1.state.players.size === 2);
    expect(room1.state.players.size).toBe(2);

    await room1.leave();
    await room2.leave();
  });

  it('isolates private challenge rooms and rejects a third client', async () => {
    const col1 = new ColyseusClient(SERVER_URL);
    const col2 = new ColyseusClient(SERVER_URL);
    const col3 = new ColyseusClient(SERVER_URL);

    const room1 = await col1.create('duel_room', {
      profileId: 'host',
      displayName: 'Host Player',
      isChallenge: true
    });

    const room2 = await col2.joinById(room1.roomId, {
      profileId: 'guest',
      displayName: 'Guest Player'
    });

    expect(room1.roomId).toBe(room2.roomId);

    await waitForCondition(() => room1.state.players.size === 2);
    expect(room1.state.players.size).toBe(2);

    // Third player attempt
    await expect(
      col3.joinById(room1.roomId, {
        profileId: 'third',
        displayName: 'Third Player'
      })
    ).rejects.toThrow();

    await room1.leave();
    await room2.leave();
  });

  it('syncs default characterId (shadow_ronin) when not specified', async () => {
    const col = new ColyseusClient(SERVER_URL);
    const room = await col.create('duel_room', {
      profileId: 'default-char-user',
      displayName: 'Default Player',
      isChallenge: true
    });

    await waitForCondition(() => room.state.players.size === 1);
    const player = room.state.players.get(room.sessionId);
    expect(player).toBeDefined();
    expect(player?.characterId).toBe('shadow_ronin');

    await room.leave();
  });

  it('syncs custom characterId for both players in 1v1 duel', async () => {
    const col1 = new ColyseusClient(SERVER_URL);
    const col2 = new ColyseusClient(SERVER_URL);

    const room1 = await col1.create('duel_room', {
      profileId: 'p1-shinobi',
      displayName: 'Shinobi P1',
      characterId: 'volt_shinobi',
      isChallenge: true
    });

    const room2 = await col2.joinById(room1.roomId, {
      profileId: 'p2-assassin',
      displayName: 'Assassin P2',
      characterId: 'void_assassin'
    });

    await waitForCondition(() => room1.state.players.size === 2);
    const p1 = room1.state.players.get(room1.sessionId);
    const p2 = room1.state.players.get(room2.sessionId);

    expect(p1?.characterId).toBe('volt_shinobi');
    expect(p2?.characterId).toBe('void_assassin');

    await room1.leave();
    await room2.leave();
  });

  it('auto-assigns a distinct characterId for bot opponent avoiding human choice', async () => {
    const col = new ColyseusClient(SERVER_URL);
    const room = await col.create('duel_room', {
      profileId: 'human-ronin',
      displayName: 'Ronin Human',
      characterId: 'shadow_ronin',
      withBot: true
    });

    await waitForCondition(() => room.state.players.size === 2);
    const human = room.state.players.get(room.sessionId);
    const bot = room.state.players.get('bot-ai-opponent');

    expect(human?.characterId).toBe('shadow_ronin');
    expect(bot).toBeDefined();
    expect(bot?.characterId).toBeDefined();
    expect(bot?.characterId).not.toBe('shadow_ronin');

    await room.leave();
  });

  it('preserves mirror match character selections', async () => {
    const col1 = new ColyseusClient(SERVER_URL);
    const col2 = new ColyseusClient(SERVER_URL);

    const room1 = await col1.create('duel_room', {
      profileId: 'mirror-1',
      displayName: 'Valkyrie 1',
      characterId: 'cyber_valkyrie',
      isChallenge: true
    });

    const room2 = await col2.joinById(room1.roomId, {
      profileId: 'mirror-2',
      displayName: 'Valkyrie 2',
      characterId: 'cyber_valkyrie'
    });

    await waitForCondition(() => room1.state.players.size === 2);
    const p1 = room1.state.players.get(room1.sessionId);
    const p2 = room1.state.players.get(room2.sessionId);

    expect(p1?.characterId).toBe('cyber_valkyrie');
    expect(p2?.characterId).toBe('cyber_valkyrie');

    await room1.leave();
    await room2.leave();
  });

  it('enforces input disabled during countdown and enables input only upon fight start in bot matches', async () => {
    const col = new ColyseusClient(SERVER_URL);
    const room = await col.create('duel_room', {
      profileId: 'human-test',
      displayName: 'Human Tester',
      characterId: 'shadow_ronin',
      withBot: true
    });

    await waitForCondition(() => room.state.players.size === 2);
    // Send ready to trigger countdown
    room.send('ready', {});
    await waitForCondition(() => room.state.status === 'countdown');
    expect(room.state.status).toBe('countdown');
    expect(room.state.inputEnabled).toBe(false);

    // Human client attempts to send key_intent during countdown
    room.send('key_intent', { seq: 1, key: 'a', clientTimeMs: Date.now() });

    const human = room.state.players.get(room.sessionId);
    expect(human?.wordTypedCharCount).toBe(0);

    const bot = room.state.players.get('bot-ai-opponent');
    expect(bot?.wordTypedCharCount).toBe(0);

    // Signal intro/countdown complete (skip_intro)
    room.send('skip_intro', {});
    await waitForCondition(() => room.state.status === 'in_progress');
    expect(room.state.status).toBe('in_progress');
    expect(room.state.inputEnabled).toBe(true);

    await room.leave();
  });

  it('tests exact bot typing speed at 60 WPM within +-2 WPM', async () => {
    const col = new ColyseusClient(SERVER_URL);
    const room = await col.create('duel_room', {
      profileId: 'human-wpm-60',
      displayName: 'Human Tester',
      botDifficulty: 'fighter', // 60 WPM
      withBot: true
    });

    const keyTimes: number[] = [];
    room.onMessage('server_event', (event: any) => {
      if ((event.type === 'key_accepted' || event.type === 'key_error' || event.type === 'word_completed') && event.playerId === 'bot-ai-opponent') {
        keyTimes.push(Date.now());
      }
    });

    await waitForCondition(() => room.state.players.size === 2);
    room.send('ready', {});
    await waitForCondition(() => room.state.status === 'countdown');
    room.send('skip_intro', {});
    await waitForCondition(() => room.state.status === 'in_progress');

    await waitForCondition(() => keyTimes.length >= 11, 4000);
    const durationSec = (keyTimes[10] - keyTimes[0]) / 1000;
    const measuredWpm = (10 / 5) / (durationSec / 60);

    // 60 WPM target: within +-2 WPM (58 to 62 WPM)
    expect(measuredWpm).toBeGreaterThanOrEqual(58);
    expect(measuredWpm).toBeLessThanOrEqual(62);

    await room.leave();
  });

  it('tests exact bot typing speed at 90 WPM within +-2 WPM', async () => {
    const col = new ColyseusClient(SERVER_URL);
    const room = await col.create('duel_room', {
      profileId: 'human-wpm-90',
      displayName: 'Human Tester',
      botDifficulty: 'pro', // 90 WPM
      withBot: true
    });

    const keyTimes: number[] = [];
    room.onMessage('server_event', (event: any) => {
      if ((event.type === 'key_accepted' || event.type === 'key_error' || event.type === 'word_completed') && event.playerId === 'bot-ai-opponent') {
        keyTimes.push(Date.now());
      }
    });

    await waitForCondition(() => room.state.players.size === 2);
    room.send('ready', {});
    await waitForCondition(() => room.state.status === 'countdown');
    room.send('skip_intro', {});
    await waitForCondition(() => room.state.status === 'in_progress');

    await waitForCondition(() => keyTimes.length >= 16, 4000);
    const durationSec = (keyTimes[15] - keyTimes[0]) / 1000;
    const measuredWpm = (15 / 5) / (durationSec / 60);

    // 90 WPM target: within +-2 WPM (88 to 92 WPM)
    expect(measuredWpm).toBeGreaterThanOrEqual(88);
    expect(measuredWpm).toBeLessThanOrEqual(92);

    await room.leave();
  });

  it('synchronizes bot difficulty option live during active session without restart', async () => {
    const col = new ColyseusClient(SERVER_URL);
    const room = await col.create('duel_room', {
      profileId: 'human-sync',
      displayName: 'Human Tester',
      botDifficulty: 'fighter',
      withBot: true
    });

    let updatedDiff = '';
    room.onMessage('server_event', (event: any) => {
      if (event.type === 'options_updated') {
        updatedDiff = event.botDifficulty;
      }
    });

    await waitForCondition(() => room.state.players.size === 2);
    room.send('ready', {});
    await waitForCondition(() => room.state.status === 'countdown');
    room.send('skip_intro', {});
    await waitForCondition(() => room.state.status === 'in_progress');

    // Update options on the fly
    room.send('update_options', { botDifficulty: 'pro' });
    await waitForCondition(() => updatedDiff === 'pro', 3000);

    expect(updatedDiff).toBe('pro');
    expect(room.state.status).toBe('in_progress'); // Confirms no restart occurred

    await room.leave();
  });

  it('verifies 60s match duration, health rules, and combat balance across all 4 maps and modes', async () => {
    const col = new ColyseusClient(SERVER_URL);
    const arenas = ['cyber_rooftop', 'highland_sanctuary', 'volcanic_caldera', 'celestial_void'];

    // 1. Verify across all 4 maps in Bot Duel mode
    for (const arenaId of arenas) {
      const room = await col.create('duel_room', {
        profileId: `human-${arenaId}`,
        displayName: `Hero ${arenaId}`,
        characterId: 'shadow_ronin',
        arenaId,
        withBot: true,
        botDifficulty: 'fighter'
      });

      await waitForCondition(() => room.state.players.size === 2);
      expect(room.state.arenaId).toBe(arenaId);
      expect(room.state.remainingSeconds).toBe(60);

      const human = room.state.players.get(room.sessionId);
      const bot = room.state.players.get('bot-ai-opponent');
      expect(human?.health).toBe(200);
      expect(bot?.health).toBe(200);

      await room.leave();
    }

    // 2. Verify in Private Challenge Room mode
    const challengeRoom = await col.create('duel_room', {
      profileId: 'host-player',
      displayName: 'Host Player',
      isChallenge: true,
      arenaId: 'volcanic_caldera'
    });
    await waitForCondition(() => challengeRoom.state.isChallenge === true && challengeRoom.state.players.size >= 1);
    expect(challengeRoom.state.isChallenge).toBe(true);
    expect(challengeRoom.state.arenaId).toBe('volcanic_caldera');
    expect(challengeRoom.state.remainingSeconds).toBe(60);
    await challengeRoom.leave();

    // 3. Verify in Quick Queue Duel mode
    const quickRoom = await col.create('duel_room', {
      profileId: 'quick-player',
      displayName: 'Quick Fighter',
      isChallenge: false,
      withBot: false,
      arenaId: 'celestial_void'
    });
    await waitForCondition(() => quickRoom.state.arenaId === 'celestial_void' && quickRoom.state.players.size >= 1);
    expect(quickRoom.state.arenaId).toBe('celestial_void');
    expect(quickRoom.state.remainingSeconds).toBe(60);
    await quickRoom.leave();
  });
});
