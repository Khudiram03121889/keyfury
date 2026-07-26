import { describe, it, expect } from 'vitest';
import { SENTENCE_SERIES } from '@keyfury/content';
import { generateSeededDeck } from '../src/deck.js';
import {
  createInitialPlayerCombatState,
  processKeyIntent,
  calculateDamage,
  getAttackKind,
  getTypingProgress,
  getActiveKeyHighlight,
  calculateMatchEndComparison,
  MATCH_RULES
} from '../src/combat.js';

describe('Deck Generation', () => {
  it('produces identical word sequence for the same seed', () => {
    const deck1 = generateSeededDeck('test-seed-123', 50);
    const deck2 = generateSeededDeck('test-seed-123', 50);
    expect(deck1).toEqual(deck2);
  });

  it('produces different word sequence for different seeds', () => {
    const deck1 = generateSeededDeck('seed-a', 50);
    const deck2 = generateSeededDeck('seed-b', 50);
    expect(deck1).not.toEqual(deck2);
  });

  it('includes symbols and capitalization in advanced and expert difficulty tiers', () => {
    const normalDeck = generateSeededDeck('tier-seed-99', 50, 'normal');
    const advancedDeck = generateSeededDeck('tier-seed-99', 50, 'advanced');
    const expertDeck = generateSeededDeck('tier-seed-99', 50, 'expert');

    expect(normalDeck.some((w) => /[^a-z ]/.test(w))).toBe(false);
    expect(advancedDeck.some((w) => /[^a-z ]/.test(w))).toBe(true);
    expect(expertDeck.some((w) => /[^a-z ]/.test(w))).toBe(true);
  });
});


describe('Combat Logic & Sequence Validation', () => {
  it('correctly maps word length to attack kinds and base damage', () => {
    expect(getAttackKind('cat')).toBe('jab');
    expect(getAttackKind('warrior')).toBe('kick'); // 7 chars -> kick
    expect(getAttackKind('keyboard')).toBe('heavy'); // 8 chars -> heavy

    expect(calculateDamage('cat', 0).totalDamage).toBe(MATCH_RULES.JAB_BASE_DAMAGE);
    expect(calculateDamage('warrior', 0).totalDamage).toBe(MATCH_RULES.KICK_BASE_DAMAGE);
    expect(calculateDamage('keyboard', 0).totalDamage).toBe(MATCH_RULES.HEAVY_BASE_DAMAGE);
  });

  it('applies the fixed +5 combo bonus only after more than five clean words (6th word onward)', () => {
    const beforeCombo = calculateDamage('cat', MATCH_RULES.COMBO_REQUIRED_WORDS - 1);
    expect(beforeCombo.totalDamage).toBe(MATCH_RULES.JAB_BASE_DAMAGE);

    const activeCombo = calculateDamage('cat', MATCH_RULES.COMBO_REQUIRED_WORDS);
    expect(activeCombo.totalDamage).toBe(MATCH_RULES.JAB_BASE_DAMAGE + MATCH_RULES.MAX_COMBO_BONUS);
  });

  it('deals the same damage when either fighter completes the same word', () => {
    const left = createInitialPlayerCombatState('left');
    const right = createInitialPlayerCombatState('right');
    const rematchLeft = createInitialPlayerCombatState('rematch-left');
    const rematchRight = createInitialPlayerCombatState('rematch-right');
    const word = 'keyboard ';

    for (const [index, char] of [...word].entries()) {
      processKeyIntent(left, right, char, [word], 100 + index, index + 1);
      processKeyIntent(rematchRight, rematchLeft, char, [word], 100 + index, index + 1);
    }

    expect(right.health).toBe(rematchLeft.health);
    expect(right.health).toBe(MATCH_RULES.STARTING_HEALTH - MATCH_RULES.HEAVY_BASE_DAMAGE);
  });

  it('rejects duplicate or non-increasing seq numbers', () => {
    const p1 = createInitialPlayerCombatState('p1');
    const p2 = createInitialPlayerCombatState('p2');
    const words = ['cat '];

    const res1 = processKeyIntent(p1, p2, 'c', words, Date.now(), 1);
    expect(res1.success).toBe(true);

    // Duplicate seq 1
    const res2 = processKeyIntent(p1, p2, 'a', words, Date.now(), 1);
    expect(res2.success).toBe(false);
    expect(res2.type).toBe('error');
    if (!res2.success) {
      expect(res2.reason).toBe('invalid_seq');
    }

    // Out-of-order lower seq
    const res3 = processKeyIntent(p1, p2, 'a', words, Date.now(), 0);
    expect(res3.success).toBe(false);
  });

  it('resets combo on wrong key input', () => {
    const p1 = createInitialPlayerCombatState('p1');
    const p2 = createInitialPlayerCombatState('p2');
    const words = ['cat ', 'dog '];

    p1.combo = 3;
    const res = processKeyIntent(p1, p2, 'z', words, Date.now(), 1);
    expect(res.success).toBe(false);
    expect(p1.combo).toBe(0);
  });

  it('advances character and completes word to deal damage', () => {
    const p1 = createInitialPlayerCombatState('p1');
    const p2 = createInitialPlayerCombatState('p2');
    const words = ['cat '];

    let res = processKeyIntent(p1, p2, 'c', words, Date.now(), 1);
    expect(res.type).toBe('char_advanced');
    expect(p1.wordTypedCharCount).toBe(1);

    res = processKeyIntent(p1, p2, 'a', words, Date.now(), 2);
    expect(res.type).toBe('char_advanced');
    expect(p1.wordTypedCharCount).toBe(2);

    res = processKeyIntent(p1, p2, 't', words, Date.now(), 3);
    expect(res.type).toBe('char_advanced');
    expect(p1.wordTypedCharCount).toBe(3);

    res = processKeyIntent(p1, p2, ' ', words, Date.now(), 4);
    expect(res.type).toBe('word_completed');
    expect(p1.activeWordIndex).toBe(1);
    expect(p1.wordsCompleted).toBe(1);
    expect(p2.health).toBe(MATCH_RULES.STARTING_HEALTH - MATCH_RULES.JAB_BASE_DAMAGE);
  });
});

describe('Highland Arena Sentence & Typing Progress Features', () => {
  it('starts sentence series with "Who will fight?"', () => {
    expect(SENTENCE_SERIES[0]).toBe('Who will fight?');
  });

  it('calculates character-by-character typing progress correctly', () => {
    const progress = getTypingProgress('Who will fight?', 4);
    expect(progress.typed).toBe('Who ');
    expect(progress.activeChar).toBe('w');
    expect(progress.remaining).toBe('ill fight?');
    expect(progress.isComplete).toBe(false);

    const full = getTypingProgress('Who will fight?', 15);
    expect(full.isComplete).toBe(true);
    expect(full.activeChar).toBe(null);
  });

  it('provides active key highlighting char (lowercased)', () => {
    expect(getActiveKeyHighlight('Who will fight?', 0)).toBe('w');
    expect(getActiveKeyHighlight('Who will fight?', 4)).toBe('w');
    expect(getActiveKeyHighlight('Who will fight?', 15)).toBe(null);
  });

  it('tracks sentences completed and generates end-of-match comparison statistics', () => {
    const p1 = createInitialPlayerCombatState('p1');
    const p2 = createInitialPlayerCombatState('p2');

    const sentence = SENTENCE_SERIES[0]; // "Who will fight?"
    let seq = 1;
    for (const char of sentence) {
      processKeyIntent(p1, p2, char, [sentence], Date.now(), seq++);
    }

    expect(p1.wordsCompleted).toBe(1);
    expect(p1.sentencesCompleted).toBe(1);

    const stats = calculateMatchEndComparison(p1, p2, 60, 'p1', 'knockout');
    expect(stats.player1Stats.sessionId).toBe('p1');
    expect(stats.player1Stats.sentencesCompleted).toBe(1);
    expect(stats.player1Stats.wordsCompleted).toBe(1);
    expect(stats.player1Stats.maxCombo).toBe(1);
    expect(stats.player1Stats.wpm).toBeGreaterThan(0);
    expect(stats.player1Stats.accuracy).toBe(100);
    expect(stats.winnerSessionId).toBe('p1');
  });
});

