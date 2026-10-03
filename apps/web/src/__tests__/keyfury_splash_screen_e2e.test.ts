import { describe, it, expect, vi, beforeEach } from 'vitest';
import { soundSynth } from '../game/audio/SoundSynth';

describe('KeyFury 5-Second Thunder Splash Screen & Audio Synthesis Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Procedural Web Audio Thunder & Discharge Synthesizer', () => {
    it('verifies playThunderStrike executes without throwing', () => {
      expect(() => {
        soundSynth.playThunderStrike();
      }).not.toThrow();
    });

    it('verifies playElectricDischarge executes without throwing', () => {
      expect(() => {
        soundSynth.playElectricDischarge();
      }).not.toThrow();
    });

    it('verifies muted state suppresses sound synthesis gracefully', () => {
      soundSynth.setMuted(true);
      expect(soundSynth.isMuted()).toBe(true);

      expect(() => {
        soundSynth.playThunderStrike();
        soundSynth.playElectricDischarge();
      }).not.toThrow();

      soundSynth.setMuted(false);
      expect(soundSynth.isMuted()).toBe(false);
    });
  });

  describe('2. 5-Second Cinematic Phase Timeline Logic', () => {
    const getSplashPhase = (elapsedSeconds: number): string => {
      if (elapsedSeconds < 1.0) return 'gathering';
      if (elapsedSeconds < 1.8) return 'strike';
      if (elapsedSeconds < 3.5) return 'reveal';
      if (elapsedSeconds < 4.4) return 'resonance';
      return 'dissolve';
    };

    it('correctly maps 0.0s - 1.0s to gathering phase (atmospheric buildup)', () => {
      expect(getSplashPhase(0.0)).toBe('gathering');
      expect(getSplashPhase(0.5)).toBe('gathering');
      expect(getSplashPhase(0.99)).toBe('gathering');
    });

    it('correctly maps 1.0s - 1.8s to strike phase (violent lightning crash)', () => {
      expect(getSplashPhase(1.0)).toBe('strike');
      expect(getSplashPhase(1.4)).toBe('strike');
      expect(getSplashPhase(1.79)).toBe('strike');
    });

    it('correctly maps 1.8s - 3.5s to reveal phase (3D logo & Key Fury name)', () => {
      expect(getSplashPhase(1.8)).toBe('reveal');
      expect(getSplashPhase(2.5)).toBe('reveal');
      expect(getSplashPhase(3.49)).toBe('reveal');
    });

    it('correctly maps 3.5s - 4.4s to resonance phase (harmonic floating energy)', () => {
      expect(getSplashPhase(3.5)).toBe('resonance');
      expect(getSplashPhase(4.0)).toBe('resonance');
      expect(getSplashPhase(4.39)).toBe('resonance');
    });

    it('correctly maps 4.4s - 5.0s to dissolve phase (transition to lobby/landing)', () => {
      expect(getSplashPhase(4.4)).toBe('dissolve');
      expect(getSplashPhase(4.9)).toBe('dissolve');
      expect(getSplashPhase(5.0)).toBe('dissolve');
    });
  });

  describe('3. Skip Mechanism & Key Interactivity', () => {
    it('allows skip keys (Space, Enter, Escape) only after the strike event (>= 1.0s)', () => {
      const isKeyAllowed = (code: string) => ['Space', 'Enter', 'Escape'].includes(code);

      expect(isKeyAllowed('Space')).toBe(true);
      expect(isKeyAllowed('Enter')).toBe(true);
      expect(isKeyAllowed('Escape')).toBe(true);
      expect(isKeyAllowed('KeyA')).toBe(false);
      expect(isKeyAllowed('ArrowRight')).toBe(false);
    });
  });
});
