// Web Audio API Sound Manager for KeyFury
// Procedural audio synthesis using oscillators and noise buffer (no external media assets needed)

import { soundSynth } from '../game/audio/SoundSynth';

export type ComboTier = 'Double Kill' | 'Triple Kill' | 'Hyper Speed' | number;

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // Check saved mute preference
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('keyfury_sound_muted');
      this.muted = savedMute === 'true';
    }
  }

  private initCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.8;
        this.masterGain.connect(this.ctx.destination);
      }
    } catch (err) {
      console.warn('[SoundManager] Web Audio API init failed:', err);
    }
    return this.ctx;
  }

  public ensureUnlocked(): void {
    soundSynth.ensureUnlocked();
    const ctx = this.initCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    soundSynth.setMuted(muted);
    if (typeof window !== 'undefined') {
      localStorage.setItem('keyfury_sound_muted', String(muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // --- 1. UI Click Sound ---
  public playClick(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.ensureUnlocked();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // --- 2. Typing Keypress Sound ---
  public playKeypress(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.ensureUnlocked();

    const now = ctx.currentTime;
    // Slight random pitch shift for realistic mechanical key feel
    const pitchOffset = (Math.random() - 0.5) * 60;
    const startFreq = 750 + pitchOffset;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  // --- 3. Damage Hit Sound ---
  public playHit(isHeavy: boolean = false): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.ensureUnlocked();

    const now = ctx.currentTime;

    // Punchy low synth impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isHeavy ? 'sawtooth' : 'square';
    const startFreq = isHeavy ? 280 : 200;
    const endFreq = isHeavy ? 40 : 55;
    const duration = isHeavy ? 0.22 : 0.14;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(isHeavy ? 0.5 : 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain || ctx.destination);

    osc.start(now);
    osc.stop(now + duration);

    // Add punchy noise pop for impact thud
    this.playNoisePop(duration, isHeavy ? 0.4 : 0.2);
  }

  private playNoisePop(duration: number, volume: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain || this.ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  // --- 4. Combo Streak Sounds ---
  public playComboStreak(tier: ComboTier): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.ensureUnlocked();

    let notes: number[] = [523.25, 659.25]; // Default Double (C5, E5)
    let noteDuration = 0.08;

    if (typeof tier === 'string') {
      if (tier === 'Double Kill') {
        notes = [523.25, 659.25]; // C5, E5
      } else if (tier === 'Triple Kill') {
        notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      } else if (tier === 'Hyper Speed') {
        notes = [659.25, 783.99, 987.77, 1046.5, 1318.5]; // E5, G5, B5, C6, E6
        noteDuration = 0.06;
      }
    } else {
      const count = tier;
      if (count >= 10) {
        notes = [659.25, 783.99, 987.77, 1046.5, 1318.5];
        noteDuration = 0.06;
      } else if (count >= 6) {
        notes = [523.25, 659.25, 783.99, 1046.5];
      } else if (count >= 3) {
        notes = [523.25, 659.25];
      } else {
        return;
      }
    }

    const now = ctx.currentTime;
    notes.forEach((freq, idx) => {
      const noteTime = now + idx * noteDuration;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.12);
    });
  }

  // --- 5. Round Start Bell ---
  public playRoundStart(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.ensureUnlocked();

    const now = ctx.currentTime;
    // Resonant brass bell synthesis with harmonics (440Hz + 880Hz + 1320Hz)
    const fundamental = 440;
    const harmonics = [1, 2, 3.01, 4.1];
    const duration = 1.2;

    harmonics.forEach((h, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * h, now);

      const vol = 0.4 / (idx + 1);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // --- 6. Match Victory Jingle ---
  public playVictory(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.ensureUnlocked();

    const now = ctx.currentTime;
    // Ascending major fanfare (C5, E5, G5, C6) with ending chord hold
    const sequence = [
      { freq: 523.25, time: 0, dur: 0.12 },   // C5
      { freq: 659.25, time: 0.12, dur: 0.12 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.12 }, // G5
      { freq: 1046.5, time: 0.36, dur: 0.6 }   // C6 (hold)
    ];

    sequence.forEach(({ freq, time, dur }) => {
      const noteTime = now + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.35, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + dur);
    });
  }

  // --- 7. Match Defeat Jingle ---
  public playDefeat(): void {
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    this.ensureUnlocked();

    const now = ctx.currentTime;
    // Descending minor chord (A4, F4, D4, A3)
    const sequence = [
      { freq: 440.0, time: 0, dur: 0.18 },    // A4
      { freq: 349.23, time: 0.18, dur: 0.18 }, // F4
      { freq: 293.66, time: 0.36, dur: 0.18 }, // D4
      { freq: 220.0, time: 0.54, dur: 0.7 }    // A3 (hold)
    ];

    sequence.forEach(({ freq, time, dur }) => {
      const noteTime = now + time;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

      osc.connect(gain);
      gain.connect(this.masterGain || ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + dur);
    });
  }
}

export const soundManager = new SoundManager();
export default soundManager;
