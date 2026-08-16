// High-Performance Web Audio Utilities & Sound Synthesizer Exports for KeyFury
// Optimized Web Audio node pooling and static audio buffer caching

import { soundSynth, SoundSynth } from '../game/audio/SoundSynth';
import { soundManager, SoundManager } from '../audio/SoundManager';

export { soundSynth, SoundSynth, soundManager, SoundManager };

export function playMechanicalClick(isSpace: boolean = false): void {
  soundSynth.playMechanicalClick(isSpace);
}

export function playKeyError(): void {
  soundSynth.playKeyError();
}

export function playComboHit(comboCount: number): void {
  soundSynth.playComboHit(comboCount);
}

export function playHeavyImpact(isSpecial: boolean = false): void {
  soundSynth.playHeavyImpact(isSpecial);
}

export function playCriticalHit(): void {
  soundSynth.playCriticalHit();
}

export function playKOChime(isVictory: boolean): void {
  soundSynth.playKOChime(isVictory);
}

export default soundSynth;
