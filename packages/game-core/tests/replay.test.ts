import { describe, it, expect } from 'vitest';
import { generateSeededDeck } from '../src/deck.js';
import {
  createInitialPlayerCombatState,
  processKeyIntent,
  CombatEventLog
} from '../src/combat.js';

describe('Event Stream Replay', () => {
  it('replaying a recorded event stream produces identical final state', () => {
    const deck = generateSeededDeck('replay-seed-456', 20);
    
    // Live run
    const liveP1 = createInitialPlayerCombatState('p1');
    const liveP2 = createInitialPlayerCombatState('p2');
    const logs: CombatEventLog[] = [];

    let seq = 1;
    const inputs = ['c', 'a', 't', 'd', 'o', 'g', 'z', 'a', 'r', 'm', 'y'];

    for (const key of inputs) {
      processKeyIntent(liveP1, liveP2, key, deck, 1000 + seq * 10, seq, logs);
      seq++;
    }

    // Replay run
    const replayP1 = createInitialPlayerCombatState('p1');
    const replayP2 = createInitialPlayerCombatState('p2');

    for (const log of logs) {
      processKeyIntent(replayP1, replayP2, log.key, deck, log.timeMs, log.seq);
    }

    expect(replayP1.health).toBe(liveP1.health);
    expect(replayP2.health).toBe(liveP2.health);
    expect(replayP1.combo).toBe(liveP1.combo);
    expect(replayP1.wordsCompleted).toBe(liveP1.wordsCompleted);
    expect(replayP1.activeWordIndex).toBe(liveP1.activeWordIndex);
  });
});
