// Web Audio API Audio Synthesizer for KeyFury
// Procedural real-time sound synthesis for tactile keyboard clicks, combo pitch scaling, & combat chimes

export interface SoundSynthOptions {
  muted?: boolean;
  volume?: number;
}

export class SoundSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.8;

  // Web Audio Node Pooling & Buffer Caching for High-Speed Typing (>100 WPM)
  private cachedNoiseBuffer: AudioBuffer | null = null;
  private clickGainNode: GainNode | null = null;
  private noiseFilterNode: BiquadFilterNode | null = null;
  private noiseGainNode: GainNode | null = null;

  constructor(options: SoundSynthOptions = {}) {
    this.muted = options.muted ?? false;
    this.volume = options.volume ?? 0.8;

    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('keyfury_sound_muted');
      if (savedMute !== null) {
        this.muted = savedMute === 'true';
      }
    }
  }

  private initPersistentNodes(ctx: AudioContext): void {
    if (!this.masterGain) return;

    // 1. Static AudioBuffer cache for tactile release transient (pre-allocated once)
    if (!this.cachedNoiseBuffer) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.015);
      this.cachedNoiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = this.cachedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    // 2. Persistent GainNode for click snap pitch drop
    if (!this.clickGainNode) {
      this.clickGainNode = ctx.createGain();
      this.clickGainNode.connect(this.masterGain);
    }

    // 3. Persistent GainNode & FilterNode for noise transient
    if (!this.noiseGainNode) {
      this.noiseGainNode = ctx.createGain();
      this.noiseGainNode.connect(this.masterGain);
    }

    if (!this.noiseFilterNode) {
      this.noiseFilterNode = ctx.createBiquadFilter();
      this.noiseFilterNode.type = 'bandpass';
      this.noiseFilterNode.connect(this.noiseGainNode);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    if (typeof window === 'undefined') return null;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    } catch (err) {
      console.warn('[SoundSynth] AudioContext initialization failed:', err);
    }
    return this.ctx;
  }

  public ensureUnlocked(): void {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('keyfury_sound_muted', String(muted));
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /**
   * Tactile Mechanical Keyboard Click sound
   * Simulates a tactile mechanical switch (Cherry MX Blue/Brown snap + bottoming out)
   * Uses pooled Web Audio gain/filter nodes & static cached noise buffer
   */
  public playMechanicalClick(isSpace: boolean = false): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    this.initPersistentNodes(ctx);
    const now = ctx.currentTime;
    const pitchOffset = (Math.random() - 0.5) * 80;
    const baseFreq = isSpace ? 450 + pitchOffset : 780 + pitchOffset;

    // 1. High frequency metallic click snap (reuses persistent clickGainNode)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.025);

    this.clickGainNode!.gain.setValueAtTime(isSpace ? 0.35 : 0.28, now);
    this.clickGainNode!.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(this.clickGainNode!);
    osc.start(now);
    osc.stop(now + 0.025);

    // 2. High-pass noise transient (reuses cachedNoiseBuffer, persistent noiseFilterNode & noiseGainNode)
    if (this.cachedNoiseBuffer && this.noiseFilterNode && this.noiseGainNode) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.cachedNoiseBuffer;

      this.noiseFilterNode.frequency.setValueAtTime(isSpace ? 1800 : 3200, now);
      this.noiseFilterNode.Q.setValueAtTime(1.5, now);

      this.noiseGainNode.gain.setValueAtTime(0.18, now);
      this.noiseGainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      noise.connect(this.noiseFilterNode);
      noise.start(now);
      noise.stop(now + 0.015);
    }
  }

  /**
   * Subtle key error / typing mistake feedback sound
   * Low dull thud + minor buzzing pitch for instant tactile mistake awareness
   */
  public playKeyError(): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Combo Hits Rising Pitch Tones
   * As combo increases, produces progressively higher pentatonic pitches & arpeggio sweeps
   */
  public playComboHit(comboCount: number): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    // Pentatonic scale steps: C5, D5, E5, G5, A5, C6, D6, E6, G6, A6...
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];
    const index = Math.min(scale.length - 1, Math.max(0, comboCount - 1));
    const targetFreq = scale[index];

    // Single bright synth note with harmonics
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = comboCount > 5 ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(targetFreq * 0.85, now);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.04);

    const volume = Math.min(0.45, 0.2 + comboCount * 0.02);
    const duration = comboCount > 7 ? 0.18 : 0.12;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);

    // High combo tier multi-note chime flourish (every 5 combo levels)
    if (comboCount % 5 === 0 && comboCount > 0) {
      const extraFreq = targetFreq * 1.5; // Perfect 5th harmonic
      const extraOsc = ctx.createOscillator();
      const extraGain = ctx.createGain();

      extraOsc.type = 'sine';
      extraOsc.frequency.setValueAtTime(extraFreq, now + 0.03);

      extraGain.gain.setValueAtTime(0.25, now + 0.03);
      extraGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      extraOsc.connect(extraGain);
      extraGain.connect(this.masterGain);

      extraOsc.start(now + 0.03);
      extraOsc.stop(now + 0.2);
    }
  }

  /**
   * Floating Feedback / Critical Hit Sparkle Sound
   */
  public playCriticalHit(): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    // Dual rising frequency sweep (C6 -> E6 -> G6)
    const freqs = [1046.5, 1318.51, 1567.98];
    freqs.forEach((freq, i) => {
      const noteTime = now + i * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.3, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.15);
    });
  }

  /**
   * Heavy Attack & Special Move Sub-Bass Impact
   */
  public playHeavyImpact(isSpecial: boolean = false): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const duration = isSpecial ? 0.35 : 0.22;

    // 1. Sub-bass frequency drop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isSpecial ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isSpecial ? 340 : 260, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + duration);

    gain.gain.setValueAtTime(isSpecial ? 0.55 : 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);

    // 2. Punchy lowpass noise pop
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isSpecial ? 1200 : 700, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(isSpecial ? 0.45 : 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * KO Victory Fanfare / Defeat Chime Synthesizer
   */
  public playKOChime(isVictory: boolean): void {
    if (this.muted) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    if (isVictory) {
      // Ascending Victory Major Fanfare
      const notes = [
        { freq: 523.25, time: 0, dur: 0.14 }, // C5
        { freq: 659.25, time: 0.14, dur: 0.14 }, // E5
        { freq: 783.99, time: 0.28, dur: 0.14 }, // G5
        { freq: 1046.5, time: 0.42, dur: 0.7 } // C6 (hold)
      ];

      notes.forEach(({ freq, time, dur }) => {
        const noteTime = now + time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.38, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(noteTime);
        osc.stop(noteTime + dur);
      });
    } else {
      // Descending Defeat Minor Chime
      const notes = [
        { freq: 440.0, time: 0, dur: 0.2 }, // A4
        { freq: 349.23, time: 0.2, dur: 0.2 }, // F4
        { freq: 293.66, time: 0.4, dur: 0.2 }, // D4
        { freq: 220.0, time: 0.6, dur: 0.8 } // A3 (hold)
      ];

      notes.forEach(({ freq, time, dur }) => {
        const noteTime = now + time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.32, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(noteTime);
        osc.stop(noteTime + dur);
      });
    }
  }
}

export const soundSynth = new SoundSynth();
export default soundSynth;
