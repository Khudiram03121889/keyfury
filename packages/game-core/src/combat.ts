import { AttackKind } from '@keyfury/protocol';

export const MATCH_RULES = {
  MATCH_DURATION_SECONDS: 90,
  STARTING_HEALTH: 200,
  // Damage is intentionally fixed by word-length bucket. A player never
  // receives a different base hit for completing the same prompt.
  JAB_BASE_DAMAGE: 2,
  KICK_BASE_DAMAGE: 4,
  HEAVY_BASE_DAMAGE: 6,
  COMBO_REQUIRED_WORDS: 6,
  MAX_COMBO_BONUS: 1,
  MAX_INPUTS_PER_SECOND: 60,
  TYPO_STUN_DURATION_MS: 500,
  // Practice AI should leave a real player enough time to read a prompt and
  // respond. It still follows the exact same server-side key and damage rules.
  BOT_INPUT_INTERVAL_MS: 900,
  RECONNECT_GRACE_SECONDS: 15,
  RULES_VERSION: '1.4.0'
} as const;

export type BotDifficulty = 'novice' | 'fighter' | 'pro' | 'adaptive';

export function getBotInputIntervalMs(difficulty: BotDifficulty = 'adaptive', playerWpm: number = 40): number {
  switch (difficulty) {
    case 'novice':
      return 350; // ~35 WPM
    case 'fighter':
      return 200; // ~60 WPM
    case 'pro':
      return 130; // ~90 WPM
    case 'adaptive': {
      // Dynamic scaling: aim for bot WPM matching player WPM (min 25 WPM, max 130 WPM)
      const targetWpm = Math.max(25, Math.min(130, playerWpm > 0 ? playerWpm : 40));
      const interval = Math.round(12000 / targetWpm);
      return Math.max(90, Math.min(500, interval));
    }
  }
}

export function getAttackKind(word: string): AttackKind {
  const len = word.trim().length;
  if (len <= 4) return 'jab';
  if (len <= 7) return 'kick';
  return 'heavy';
}

export function getBaseDamage(attackKind: AttackKind): number {
  switch (attackKind) {
    case 'jab':
      return MATCH_RULES.JAB_BASE_DAMAGE;
    case 'kick':
      return MATCH_RULES.KICK_BASE_DAMAGE;
    case 'heavy':
      return MATCH_RULES.HEAVY_BASE_DAMAGE;
  }
}

export function getWordBaseDamage(word: string): number {
  const length = word.trim().length;
  if (length <= 3) return 2;
  if (length === 4) return 2;
  if (length === 5) return 3;
  if (length === 6) return 4;
  if (length === 7) return 5;
  return 6;
}

export function calculateDamage(word: string, currentCombo: number): { attackKind: AttackKind; totalDamage: number; comboBonus: number } {
  const trimmed = word.trim();
  const attackKind = getAttackKind(trimmed);
  const base = getBaseDamage(attackKind);
  // A combo becomes active only after three consecutive completed prompts.
  // A typo removes the next-hit bonus instead of dealing invisible damage.
  const comboBonus = currentCombo >= MATCH_RULES.COMBO_REQUIRED_WORDS
    ? MATCH_RULES.MAX_COMBO_BONUS
    : 0;
  return {
    attackKind,
    totalDamage: base + comboBonus,
    comboBonus
  };
}

export interface PlayerCombatState {
  sessionId: string;
  health: number;
  activeWordIndex: number;
  wordTypedCharCount: number;
  combo: number;
  highestCombo: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  wordsCompleted: number;
  sentencesCompleted: number;
  lastKeyTimeMs: number;
  lastSeq: number;
  stunnedUntilMs?: number;
}

export function createInitialPlayerCombatState(sessionId: string): PlayerCombatState {
  return {
    sessionId,
    health: MATCH_RULES.STARTING_HEALTH,
    activeWordIndex: 0,
    wordTypedCharCount: 0,
    combo: 0,
    highestCombo: 0,
    totalKeystrokes: 0,
    correctKeystrokes: 0,
    wordsCompleted: 0,
    sentencesCompleted: 0,
    lastKeyTimeMs: 0,
    lastSeq: 0,
    stunnedUntilMs: 0
  };
}

export interface CombatEventLog {
  seq: number;
  sessionId: string;
  timeMs: number;
  key: string;
  type: 'accept' | 'complete' | 'error';
  wordIndex: number;
}

export type KeyIntentResult =
  | {
      success: true;
      type: 'char_advanced';
      charIndex: number;
      wordIndex: number;
      isWordComplete: false;
    }
  | {
      success: true;
      type: 'word_completed';
      wordIndex: number;
      word: string;
      attackKind: AttackKind;
      damageDealt: number;
      newCombo: number;
      isWordComplete: true;
    }
  | {
      success: false;
      type: 'error';
      reason: 'wrong_key' | 'rate_limited' | 'match_over' | 'invalid_seq' | 'stunned';
      comboReset: boolean;
    };

export function processKeyIntent(
  player: PlayerCombatState,
  opponent: PlayerCombatState,
  key: string,
  words: string[],
  nowMs: number,
  seq: number,
  eventLog?: CombatEventLog[]
): KeyIntentResult {
  // Enforce strictly increasing sequence number
  if (seq <= player.lastSeq) {
    return { success: false, type: 'error', reason: 'invalid_seq', comboReset: false };
  }

  if (player.health <= 0 || opponent.health <= 0) {
    return { success: false, type: 'error', reason: 'match_over', comboReset: false };
  }

  // Check input stun lockout
  if (player.stunnedUntilMs && nowMs < player.stunnedUntilMs) {
    return { success: false, type: 'error', reason: 'stunned', comboReset: false };
  }

  const activeWord = words[player.activeWordIndex];
  if (!activeWord) {
    return { success: false, type: 'error', reason: 'match_over', comboReset: false };
  }

  player.lastSeq = seq;
  player.totalKeystrokes++;

  const expectedChar = activeWord[player.wordTypedCharCount];
  const isCorrectKey = key === expectedChar || (key.length === 1 && Boolean(expectedChar) && key.toLowerCase() === expectedChar.toLowerCase());
  if (!isCorrectKey) {
    player.combo = 0; // reset combo on error
    player.stunnedUntilMs = nowMs + MATCH_RULES.TYPO_STUN_DURATION_MS; // apply 500ms stun penalty
    if (eventLog) {
      eventLog.push({ seq, sessionId: player.sessionId, timeMs: nowMs, key, type: 'error', wordIndex: player.activeWordIndex });
    }
    return { success: false, type: 'error', reason: 'wrong_key', comboReset: true };
  }

  // Correct key
  player.correctKeystrokes++;
  player.wordTypedCharCount++;

  if (player.wordTypedCharCount < activeWord.length) {
    if (eventLog) {
      eventLog.push({ seq, sessionId: player.sessionId, timeMs: nowMs, key, type: 'accept', wordIndex: player.activeWordIndex });
    }
    return {
      success: true,
      type: 'char_advanced',
      charIndex: player.wordTypedCharCount,
      wordIndex: player.activeWordIndex,
      isWordComplete: false
    };
  }

  // Word complete!
  player.wordsCompleted++;
  if (/[.!?]$/.test(activeWord) || activeWord.includes(' ')) {
    player.sentencesCompleted++;
  }
  player.combo++;
  if (player.combo > player.highestCombo) {
    player.highestCombo = player.combo;
  }

  const damageInfo = calculateDamage(activeWord, player.combo);
  opponent.health = Math.max(0, opponent.health - damageInfo.totalDamage);

  const completedWordIndex = player.activeWordIndex;
  const completedWord = activeWord;

  // Advance word
  player.activeWordIndex++;
  player.wordTypedCharCount = 0;

  if (eventLog) {
    eventLog.push({ seq, sessionId: player.sessionId, timeMs: nowMs, key, type: 'complete', wordIndex: completedWordIndex });
  }

  return {
    success: true,
    type: 'word_completed',
    wordIndex: completedWordIndex,
    word: completedWord,
    attackKind: damageInfo.attackKind,
    damageDealt: damageInfo.totalDamage,
    newCombo: player.combo,
    isWordComplete: true
  };
}

export function calculateWpmAndAccuracy(player: PlayerCombatState, elapsedSeconds: number): { wpm: number; accuracy: number } {
  const accuracy = player.totalKeystrokes > 0 ? (player.correctKeystrokes / player.totalKeystrokes) * 100 : 100;
  const minutes = Math.max(elapsedSeconds, 1) / 60;
  const wpm = (player.correctKeystrokes / 5) / minutes;
  return {
    wpm: Math.round(wpm * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10
  };
}

export interface TypingProgress {
  typed: string;
  activeChar: string | null;
  remaining: string;
  percent: number;
  isComplete: boolean;
}

export function getTypingProgress(targetText: string, charCount: number): TypingProgress {
  const clampedCount = Math.min(Math.max(0, charCount), targetText.length);
  const typed = targetText.slice(0, clampedCount);
  const activeChar = clampedCount < targetText.length ? targetText[clampedCount] : null;
  const remaining = clampedCount < targetText.length ? targetText.slice(clampedCount + 1) : '';
  const percent = targetText.length > 0 ? Math.round((clampedCount / targetText.length) * 100) : 100;
  const isComplete = clampedCount >= targetText.length;
  return { typed, activeChar, remaining, percent, isComplete };
}

export function getActiveKeyHighlight(targetText: string, charCount: number): string | null {
  if (charCount < 0 || charCount >= targetText.length) return null;
  const char = targetText[charCount];
  return char ? char.toLowerCase() : null;
}

export interface PlayerMatchStats {
  sessionId: string;
  wpm: number;
  accuracy: number;
  maxCombo: number;
  wordsCompleted: number;
  sentencesCompleted: number;
}

export interface MatchComparisonSummary {
  player1Stats: PlayerMatchStats;
  player2Stats: PlayerMatchStats;
  winnerSessionId?: string;
  endReason?: string;
}

export function getPlayerMatchStats(player: PlayerCombatState, elapsedSeconds: number): PlayerMatchStats {
  const { wpm, accuracy } = calculateWpmAndAccuracy(player, elapsedSeconds);
  return {
    sessionId: player.sessionId,
    wpm,
    accuracy,
    maxCombo: player.highestCombo,
    wordsCompleted: player.wordsCompleted,
    sentencesCompleted: player.sentencesCompleted
  };
}

export function calculateMatchEndComparison(
  player1: PlayerCombatState,
  player2: PlayerCombatState,
  elapsedSeconds: number,
  winnerSessionId?: string,
  endReason?: string
): MatchComparisonSummary {
  return {
    player1Stats: getPlayerMatchStats(player1, elapsedSeconds),
    player2Stats: getPlayerMatchStats(player2, elapsedSeconds),
    winnerSessionId,
    endReason
  };
}

