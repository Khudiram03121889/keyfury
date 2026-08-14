import { Client as ColyseusClient, Room } from 'colyseus.js';
import { Capacitor } from '@capacitor/core';

export const SERVER_STORAGE_KEY = 'keyfury_game_server_url';
export const DEFAULT_DEV_SERVER = import.meta.env.VITE_GAME_SERVER_URL || 'ws://localhost:2567';

/**
 * Resolves the currently active Game Server URL.
 * Priority:
 * 1. User manual override in localStorage
 * 2. Environment variable (VITE_GAME_SERVER_URL)
 * 3. Default fallback (ws://localhost:2567)
 */
export function getGameServerUrl(): string {
  try {
    const saved = localStorage.getItem(SERVER_STORAGE_KEY) || localStorage.getItem('KEYFURY_SERVER_URL');
    if (saved && saved.trim()) {
      return normalizeWsUrl(saved.trim());
    }
  } catch (_err) {
    // LocalStorage unavailable (SSR / restricted sandbox)
  }

  return normalizeWsUrl(DEFAULT_DEV_SERVER);
}

/**
 * Normalizes input server addresses to valid WebSocket URLs.
 */
export function normalizeWsUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return 'ws://localhost:2567';

  // If user entered just an IP/host like "192.168.1.50:2567"
  if (!/^https?:\/\//i.test(url) && !/^wss?:\/\//i.test(url)) {
    url = `ws://${url}`;
  }

  // Convert http -> ws, https -> wss for Colyseus Client
  if (url.startsWith('https://')) {
    url = url.replace('https://', 'wss://');
  } else if (url.startsWith('http://')) {
    url = url.replace('http://', 'ws://');
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, '');
}

/**
 * Converts a WebSocket URL to its corresponding HTTP/HTTPS health endpoint URL.
 */
export function wsToHttpUrl(wsUrl: string): string {
  let url = normalizeWsUrl(wsUrl);
  if (url.startsWith('wss://')) {
    url = url.replace('wss://', 'https://');
  } else if (url.startsWith('ws://')) {
    url = url.replace('ws://', 'http://');
  }
  return url;
}

let activeColyseusClient: ColyseusClient = new ColyseusClient(getGameServerUrl());

export function getColyseusClient(): ColyseusClient {
  return activeColyseusClient;
}

export function setGameServerUrl(newUrl: string): string {
  const normalized = normalizeWsUrl(newUrl);
  try {
    localStorage.setItem(SERVER_STORAGE_KEY, normalized);
  } catch (_err) {}

  activeColyseusClient = new ColyseusClient(normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('keyfury_server_changed', { detail: { url: normalized } }));
  }
  return normalized;
}

export function resetGameServerUrl(): string {
  try {
    localStorage.removeItem(SERVER_STORAGE_KEY);
    localStorage.removeItem('KEYFURY_SERVER_URL');
  } catch (_err) {}

  const defaultUrl = normalizeWsUrl(DEFAULT_DEV_SERVER);
  activeColyseusClient = new ColyseusClient(defaultUrl);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('keyfury_server_changed', { detail: { url: defaultUrl } }));
  }
  return defaultUrl;
}

/**
 * Tests connectivity and latency to the specified or active game server.
 */
export async function testGameServerConnection(targetUrl?: string): Promise<{
  success: boolean;
  latencyMs?: number;
  error?: string;
  url: string;
}> {
  const wsUrl = targetUrl ? normalizeWsUrl(targetUrl) : getGameServerUrl();
  const httpUrl = wsToHttpUrl(wsUrl);
  const startTime = performance.now();

  try {
    // 1. Try fast HTTP health check first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(`${httpUrl}/health`, {
      method: 'GET',
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (res && res.ok) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { success: true, latencyMs, url: wsUrl };
    }

    // 2. Fallback to Colyseus client handshake test
    const testClient = new ColyseusClient(wsUrl);
    await Promise.race([
      testClient.getAvailableRooms('duel_room'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout (4000ms)')), 4000))
    ]);

    const latencyMs = Math.round(performance.now() - startTime);
    return { success: true, latencyMs, url: wsUrl };
  } catch (err: any) {
    const isNative = Capacitor.isNativePlatform();
    let message = err?.message || 'Failed to connect to game server';

    if (wsUrl.includes('localhost') && isNative) {
      message = 'Cannot connect to localhost from Android APK. Use your PC IP (e.g. ws://192.168.x.x:2567) or Emulator IP (ws://10.0.2.2:2567).';
    }

    return {
      success: false,
      error: message,
      url: wsUrl
    };
  }
}

export async function joinQuickQueue(profileId: string, displayName: string, mmr?: number): Promise<Room> {
  return await getColyseusClient().joinOrCreate('duel_room', {
    profileId,
    displayName,
    mmr,
    isChallenge: false
  });
}

export async function createChallengeRoom(profileId: string, displayName: string, mmr?: number): Promise<Room> {
  return await getColyseusClient().create('duel_room', {
    profileId,
    displayName,
    mmr,
    isChallenge: true
  });
}

export async function joinChallengeRoom(roomId: string, profileId: string, displayName: string, mmr?: number): Promise<Room> {
  return await getColyseusClient().joinById(roomId, {
    profileId,
    displayName,
    mmr
  });
}

export async function startBotDuel(
  profileId: string,
  displayName: string,
  botDifficulty: 'novice' | 'fighter' | 'pro' | 'adaptive' = 'adaptive',
  mmr?: number
): Promise<Room> {
  return await getColyseusClient().create('duel_room', {
    profileId,
    displayName,
    mmr,
    isChallenge: false,
    withBot: true,
    botDifficulty
  });
}

export async function fetchLiveServerStats(): Promise<{ onlineWarriors: number; activeDuels: number }> {
  try {
    const rooms = await getColyseusClient().getAvailableRooms('duel_room');

    // Strictly count active Quick Duel rooms (excluding AI Bot matches & private challenge lobbies)
    const quickDuelRooms = rooms.filter((r) => {
      const meta = r.metadata || {};
      const isQuick = meta.isQuickDuel !== undefined ? meta.isQuickDuel : (!meta.isChallenge && !meta.withBot);
      return isQuick && (r.clients || 0) > 0;
    });

    const activeDuels = quickDuelRooms.length;
    const roomPlayers = rooms.reduce((acc, r) => acc + (r.clients || 0), 0);
    const onlineWarriors = Math.max(1, roomPlayers + (activeDuels === 0 ? 1 : 0));

    return { onlineWarriors, activeDuels };
  } catch (_err) {
    return { onlineWarriors: 1, activeDuels: 0 };
  }
}
