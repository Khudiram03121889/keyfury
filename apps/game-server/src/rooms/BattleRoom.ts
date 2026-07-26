import { CombatRoom, CombatRoomState, PlayerState } from './CombatRoom.js';

/**
 * BattleRoom extends CombatRoom to provide full 1v1 ranked typing combat functionality,
 * including anti-cheat integrity checks, dynamic ELO calculations, and Supabase RPC persistence.
 */
export class BattleRoom extends CombatRoom {}

export { CombatRoomState as BattleRoomState, PlayerState as BattlePlayerState };
