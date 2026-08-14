import { Client as ColyseusClient, Room } from 'colyseus.js';

const serverUrl = import.meta.env.VITE_GAME_SERVER_URL || 'ws://localhost:2567';

export const colyseusClient = new ColyseusClient(serverUrl);

export async function joinQuickQueue(profileId: string, displayName: string, mmr?: number): Promise<Room> {
  return await colyseusClient.joinOrCreate('duel_room', {
    profileId,
    displayName,
    mmr,
    isChallenge: false
  });
}

export async function createChallengeRoom(profileId: string, displayName: string, mmr?: number): Promise<Room> {
  return await colyseusClient.create('duel_room', {
    profileId,
    displayName,
    mmr,
    isChallenge: true
  });
}

export async function joinChallengeRoom(roomId: string, profileId: string, displayName: string, mmr?: number): Promise<Room> {
  return await colyseusClient.joinById(roomId, {
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
  return await colyseusClient.create('duel_room', {
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
    const rooms = await colyseusClient.getAvailableRooms('duel_room');

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
