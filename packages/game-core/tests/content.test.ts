import { describe, it, expect } from 'vitest';
import { WORD_DECK_RAW, ADVANCED_WORD_DECK, EXPERT_WORD_DECK, CONTENT_VERSION } from '@keyfury/content';

describe('Word Deck Content Validation', () => {
  it('uses version en-us-v1', () => {
    expect(CONTENT_VERSION).toBe('en-us-v1');
  });

  it('contains at least 300 unique lowercase ASCII English words in raw pool', () => {
    expect(WORD_DECK_RAW.length).toBeGreaterThanOrEqual(300);

    const uniqueSet = new Set(WORD_DECK_RAW);
    expect(uniqueSet.size).toBe(WORD_DECK_RAW.length);

    WORD_DECK_RAW.forEach((word) => {
      expect(word).toMatch(/^[a-z]+$/);
      expect(word.length).toBeGreaterThanOrEqual(3);
      expect(word.length).toBeLessThanOrEqual(9);
    });
  });

  it('contains valid advanced (symbol-free) and expert (symbol-enabled) tier word decks', () => {
    expect(ADVANCED_WORD_DECK.length).toBeGreaterThan(0);
    expect(EXPERT_WORD_DECK.length).toBeGreaterThan(0);

    const hasSymbolAdvanced = ADVANCED_WORD_DECK.some((w) => /[^a-z]/.test(w));
    const hasSymbolExpert = EXPERT_WORD_DECK.some((w) => /[^a-z]/.test(w));

    expect(hasSymbolAdvanced).toBe(false);
    expect(hasSymbolExpert).toBe(true);
  });
});

