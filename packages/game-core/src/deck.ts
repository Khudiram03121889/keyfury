import { ADVANCED_WORD_DECK, EXPERT_WORD_DECK, SENTENCE_SERIES, WORD_DECK_RAW } from '@keyfury/content';

/**
 * Mulberry32 PRNG for deterministic deck generation.
 */
function createPrng(seedString: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 16777619);
  }
  let s = h >>> 0;

  return function random(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DeckDifficulty = 'normal' | 'advanced' | 'expert';

/**
 * Generate a deterministic list of 100 balanced individual words from a seed string.
 * Supports tier-based difficulty ('normal', 'advanced', 'expert') to include symbols, punctuation,
 * and capitalization for high MMR / high difficulty matches.
 * Each word includes a trailing space so the player explicitly types space to transition between words.
 */
export function generateSeededDeck(
  seed: string,
  count: number = 100,
  difficulty: DeckDifficulty = 'normal'
): string[] {
  const prng = createPrng(seed);

  let rawPool: string[] = [];

  if (difficulty === 'expert') {
    rawPool = [
      ...SENTENCE_SERIES.flatMap((sentence) => sentence.split(/\s+/)),
      ...WORD_DECK_RAW,
      ...ADVANCED_WORD_DECK,
      ...EXPERT_WORD_DECK
    ];
  } else if (difficulty === 'advanced') {
    rawPool = [
      ...SENTENCE_SERIES.flatMap((sentence) => sentence.split(/\s+/)),
      ...WORD_DECK_RAW,
      ...ADVANCED_WORD_DECK
    ];
  } else {
    rawPool = [
      ...SENTENCE_SERIES.flatMap((sentence) => sentence.split(/\s+/)),
      ...WORD_DECK_RAW
    ];
  }

  let uniqueWords: string[];
  if (difficulty === 'normal') {
    uniqueWords = Array.from(
      new Set(
        rawPool
          .map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))
          .filter((w) => w.length >= 3 && w.length <= 9)
      )
    );
  } else {
    // Preserve symbols, capitalization, and numbers for advanced & expert tiers
    uniqueWords = Array.from(
      new Set(
        rawPool
          .map((w) => w.trim())
          .filter((w) => w.length >= 3 && w.length <= 14)
      )
    );
  }

  // Group into length buckets (jabs: 3-4, kicks: 5-7, heavies: 8+)
  const jabWords = uniqueWords.filter((w) => w.length >= 3 && w.length <= 4);
  const kickWords = uniqueWords.filter((w) => w.length >= 5 && w.length <= 7);
  const heavyWords = uniqueWords.filter((w) => w.length >= 8);

  function shuffle<T>(array: T[]): T[] {
    const res = [...array];
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [res[i], res[j]] = [res[j], res[i]];
    }
    return res;
  }

  const sJab = shuffle(jabWords.length > 0 ? jabWords : uniqueWords);
  const sKick = shuffle(kickWords.length > 0 ? kickWords : uniqueWords);
  const sHeavy = shuffle(heavyWords.length > 0 ? heavyWords : uniqueWords);

  const deck: string[] = [];
  let jIdx = 0, kIdx = 0, hIdx = 0;

  // Intermix word length buckets continuously right from word 1 (index 0) through word 100
  // Pattern ratio per 6 words: 3 Jabs (short), 2 Kicks (med), 1 Heavy (long)
  for (let i = 0; i < count; i++) {
    const step = i % 6;
    let word = '';
    if (step === 0 || step === 2 || step === 5) {
      word = sJab[jIdx % sJab.length];
      jIdx++;
    } else if (step === 1 || step === 4) {
      word = sKick[kIdx % sKick.length];
      kIdx++;
    } else {
      word = sHeavy[hIdx % sHeavy.length];
      hIdx++;
    }
    deck.push(word + ' ');
  }

  return deck;
}

