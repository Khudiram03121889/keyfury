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
});
