import { z } from 'zod';

export const PROTOCOL_VERSION = '1.0.0';

export const ClientMessageReadySchema = z.object({
  type: z.literal('ready')
});

export const ClientMessageKeyIntentSchema = z.object({
  type: z.literal('key_intent'),
  seq: z.number().int().nonnegative(),
  key: z.string().length(1),
  clientTimeMs: z.union([z.number(), z.bigint()]).transform((val) => Number(val))
});

export const ClientMessageRematchVoteSchema = z.object({
  type: z.literal('rematch_vote'),
  accepted: z.boolean()
});

export const ClientMessageLeaveMatchSchema = z.object({
  type: z.literal('leave_match')
});

export const ClientMessageTogglePauseSchema = z.object({
  type: z.literal('toggle_pause')
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientMessageReadySchema,
  ClientMessageKeyIntentSchema,
  ClientMessageRematchVoteSchema,
  ClientMessageLeaveMatchSchema,
  ClientMessageTogglePauseSchema
]);

export type ClientMessageReady = z.infer<typeof ClientMessageReadySchema>;
export type ClientMessageKeyIntent = z.infer<typeof ClientMessageKeyIntentSchema>;
export type ClientMessageRematchVote = z.infer<typeof ClientMessageRematchVoteSchema>;
export type ClientMessageLeaveMatch = z.infer<typeof ClientMessageLeaveMatchSchema>;
export type ClientMessageTogglePause = z.infer<typeof ClientMessageTogglePauseSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export type AttackKind = 'jab' | 'kick' | 'heavy';

export interface PlayerSnapshot {
  sessionId: string;
  profileId: string;
  displayName: string;
  side: 'left' | 'right';
  ready: boolean;
  health: number;
  activeWordIndex: number;
  wordTypedCharCount: number;
  combo: number;
  acceptedWpm: number;
  accuracy: number;
  highestCombo: number;
  wordsCompleted: number;
  connected: boolean;
  level?: number;
}

export interface MatchStateSnapshot {
  matchId: string;
  status: 'waiting' | 'countdown' | 'in_progress' | 'completed' | 'forfeit';
  deckSeed: string;
  words: string[];
  rulesVersion: string;
  countdownSeconds: number;
  remainingSeconds: number;
  players: Record<string, PlayerSnapshot>;
  winnerSessionId?: string;
  endReason?: 'time' | 'knockout' | 'forfeit' | 'disconnect' | 'draw';
}

export type ServerEvent =
  | { type: 'match_snapshot'; snapshot: MatchStateSnapshot }
  | { type: 'key_accepted'; playerId: string; seq: number; char: string; wordIndex: number; charIndex: number }
  | { type: 'key_error'; playerId: string; seq: number; comboReset: boolean; wordIndex: number; charIndex: number }
  | { type: 'word_completed'; playerId: string; word: string; wordIndex: number; nextWordIndex: number; nextCharIndex: number; attackKind: AttackKind; damage: number; newHealth: number; newCombo: number }
  | { type: 'player_disconnect'; playerId: string; gracePeriodSeconds: number }
  | { type: 'player_reconnect'; playerId: string }
  | { type: 'match_start'; countdownSeconds: number }
  | { type: 'match_end'; winnerSessionId?: string; reason: string; summary: MatchStateSnapshot }
  | { type: 'rematch_update'; votes: Record<string, boolean> }
  | { type: 'bot_fallback'; message: string };

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster';

export interface AuthPayload {
  token?: string;
  profileId?: string;
  displayName?: string;
}

export interface RankedQueueOptions {
  profileId: string;
  displayName: string;
  mmr?: number;
  level?: number;
  token?: string;
}

export interface EloResult {
  winnerRating: number;
  loserRating: number;
  winnerDelta: number;
  loserDelta: number;
  kFactor: number;
}

export interface PlayerProfile {
  id: string;
  profileId: string;
  displayName: string;
  mmr: number;
  level: number;
  rankTier: RankTier;
  matchesPlayed: number;
  matchesWon: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  profileId: string;
  displayName: string;
  mmr: number;
  rankTier: RankTier;
  winRate: number;
  matchesWon: number;
}

export interface PostMatchSummary {
  matchId: string;
  winnerSessionId?: string;
  winnerProfileId?: string;
  endReason: string;
  durationSeconds: number;
  mmrDeltas?: Record<string, number>;
  playerStats: Record<string, {
    wpm: number;
    accuracy: number;
    highestCombo: number;
    health: number;
  }>;
  integrityStatus: string;
}

