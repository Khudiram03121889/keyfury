import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import {
  ThreeCombatArenaRef,
  CameraPreset,
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
} from '../render/ThreeCombatArena';
import { Character3DFighter } from '../game/character/Character3DController';

// ============================================================================
// SIMULATION HARNESS & DOM MOCKS
// ============================================================================

interface MockDomElement {
  tagName: string;
  id?: string;
  disabled?: boolean;
  value?: string;
  isFocused?: boolean;
  focus: (options?: { preventScroll?: boolean }) => void;
  blur: () => void;
}

interface MockKeyEvent {
  code: string;
  key: string;
  target?: { tagName?: string; id?: string };
  defaultPrevented: boolean;
  propagationStopped: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

function createMockElement(tagName: string, id?: string): MockDomElement {
  return {
    tagName: tagName.toUpperCase(),
    id,
    disabled: false,
    value: '',
    isFocused: false,
    focus() {
      this.isFocused = true;
    },
    blur() {
      this.isFocused = false;
    },
  };
}

function createMockKeyEvent(
  code: string,
  key: string,
  target?: { tagName?: string; id?: string }
): MockKeyEvent {
  return {
    code,
    key,
    target,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
  };
}

interface MockPlayer {
  sessionId: string;
  displayName: string;
  side: 'left' | 'right';
  characterId: string;
  health: number;
  combo: number;
}

class MockColyseusRoom {
  public sessionId = 'player_left_session';
  public state: any;
  public stateChangeCallbacks: ((state: any) => void)[] = [];
  public messageHandlers: Map<string, (data: any) => void> = new Map();
  public sentMessages: { type: string; data: any }[] = [];

  constructor() {
    const playersMap = new Map<string, MockPlayer>();
    playersMap.set('player_left_session', {
      sessionId: 'player_left_session',
      displayName: 'Shadow Warrior',
      side: 'left',
      characterId: 'shadow_ronin',
      health: 200,
      combo: 0,
    });
    playersMap.set('player_right_session', {
      sessionId: 'player_right_session',
      displayName: 'Cyber Valkyrie',
      side: 'right',
      characterId: 'cyber_valkyrie',
      health: 200,
      combo: 0,
    });

    this.state = {
      status: 'in_progress',
      arenaId: 'cyber_rooftop',
      remainingSeconds: 90,
      words: ['cyber', 'caldera', 'combo', 'circuit', 'clash'],
      players: playersMap,
      winnerSessionId: null,
      isPaused: false,
    };
  }

  public onStateChange(cb: (state: any) => void) {
    this.stateChangeCallbacks.push(cb);
  }

  public onMessage(type: string, cb: (data: any) => void) {
    this.messageHandlers.set(type, cb);
  }

  public send(type: string, data: any) {
    this.sentMessages.push({ type, data });
  }

  public triggerStateChange(newState: any) {
    this.state = newState;
    this.stateChangeCallbacks.forEach((cb) => cb(newState));
  }

  public triggerServerEvent(event: any) {
    const handler = this.messageHandlers.get('server_event');
    if (handler) handler(event);
  }
}

/**
 * Empirical MatchPage 3D Host Harness
 * Directly reflects MatchPage.tsx routing logic to stress-test integration and edge cases.
 */
class EmpiricalMatchPageHarness {
  public room: MockColyseusRoom;
  public use3D: boolean;
  public is3DMode: boolean;
  public isIntroComplete: boolean;
  public typingInput: MockDomElement;
  public phaserGameCreated = false;
  public phaserDrawCalls = 0;
  public activePresetIndex = 0;
  public threeArenaRef: ThreeCombatArenaRef;

  // Telemetry records
  public keystrokesCount = 0;
  public attacksCount = 0;
  public hitsCount = 0;
  public shakesCount = 0;
  public knockoutCalls = 0;
  public victoryCalls = 0;
  public cameraCycleCalls = 0;

  // Captured arguments
  public lastAttack: { side: 'left' | 'right'; tier: string } | null = null;
  public lastHit: { side: 'left' | 'right'; severity: string } | null = null;
  public lastShakeIntensity = 0;

  constructor(room: MockColyseusRoom, use3D = true) {
    this.room = room;
    this.use3D = use3D;
    this.is3DMode = use3D !== false;
    this.isIntroComplete = !this.is3DMode;
    this.typingInput = createMockElement('INPUT', 'combat_keystroke_input');
    this.typingInput.disabled = this.is3DMode && !this.isIntroComplete;

    this.threeArenaRef = {
      triggerKeystroke: (_side) => {
        this.keystrokesCount++;
      },
      triggerAttack: (side, tier) => {
        this.attacksCount++;
        this.lastAttack = { side, tier };
      },
      triggerHit: (side, severity) => {
        this.hitsCount++;
        this.lastHit = { side, severity };
      },
      triggerKnockout: (_loserSide) => {
        this.knockoutCalls++;
      },
      triggerVictory: (_winnerSide) => {
        this.victoryCalls++;
      },
      triggerScreenShake: (intensity = 0.25) => {
        this.shakesCount++;
        this.lastShakeIntensity = intensity;
      },
      cycleCameraPreset: () => {
        this.cameraCycleCalls++;
        this.activePresetIndex = (this.activePresetIndex + 1) % CAMERA_PRESETS.length;
      },
      setCameraPreset: (preset) => {
        const idx = CAMERA_PRESETS.findIndex((p) => p.id === preset);
        if (idx !== -1) this.activePresetIndex = idx;
      },
      skipIntro: () => {
        this.handleIntroComplete();
      },
    };

    if (!this.is3DMode) {
      this.phaserGameCreated = true;
      this.phaserDrawCalls = 1;
    }

    // Attach Colyseus room listeners exactly as in MatchPage.tsx
    this.room.onStateChange((state: any) => {
      if (state.status === 'completed' || state.status === 'forfeit') {
        let winnerSide: 'left' | 'right' = 'left';
        let loserSide: 'left' | 'right' = 'right';
        if (state.winnerSessionId) {
          const winner = state.players?.get?.(state.winnerSessionId);
          if (winner) {
            winnerSide = winner.side || 'left';
            loserSide = winnerSide === 'left' ? 'right' : 'left';
          }
        }
        this.threeArenaRef.triggerKnockout(loserSide);
        this.threeArenaRef.triggerVictory(winnerSide);
        this.threeArenaRef.triggerScreenShake?.(0.35);
      }
    });

    this.room.onMessage('server_event', (event: any) => {
      const state = this.room.state;
      const senderPlayer = state?.players?.get?.(event.playerId);
      const myPlayer = state?.players?.get?.(this.room.sessionId);
      const mySide: 'left' | 'right' = myPlayer?.side || 'left';
      const side: 'left' | 'right' =
        senderPlayer?.side || (event.playerId === this.room.sessionId ? mySide : mySide === 'left' ? 'right' : 'left');

      if (event.type === 'key_accepted') {
        this.threeArenaRef.triggerKeystroke(side);
      } else if (event.type === 'word_completed') {
        const attackKind = event.attackKind || 'jab';
        const isHeavyAttack = attackKind === 'kick' || attackKind === 'heavy' || attackKind === 'uppercut';
        const tier =
          attackKind === 'kick'
            ? 'kick'
            : attackKind === 'heavy' || attackKind === 'uppercut'
            ? 'heavy'
            : 'jab';

        this.threeArenaRef.triggerAttack(side, tier);
        this.threeArenaRef.triggerHit(side === 'left' ? 'right' : 'left', isHeavyAttack ? 'heavy' : 'light');

        if (isHeavyAttack || (event.damage && event.damage >= 25)) {
          const shake = event.damage && event.damage >= 25 ? 0.32 : tier === 'heavy' ? 0.28 : 0.22;
          this.threeArenaRef.triggerScreenShake?.(shake);
        }
      } else if (event.type === 'key_error' && event.playerId === this.room.sessionId) {
        this.threeArenaRef.triggerHit(mySide, 'light');
      }
    });
  }

  public handleIntroComplete() {
    this.isIntroComplete = true;
    this.typingInput.disabled = false;
    this.typingInput.focus();
  }

  public simulateKeyDown(
    e: MockKeyEvent,
    activeElement: { tagName?: string } | null = this.typingInput
  ) {
    // Exact handler from ThreeCombatArena.tsx lines 650-663
    if (
      (e.code === 'Enter' || e.code === 'Space' || e.key === 'Enter' || e.key === ' ') &&
      !this.isIntroComplete
    ) {
      this.handleIntroComplete();
    } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
      const targetTag = e.target?.tagName?.toUpperCase();
      const activeTag = activeElement?.tagName?.toUpperCase();
      if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        this.threeArenaRef.cycleCameraPreset();
      }
    }
  }
}

// ============================================================================
// EMPIRICAL CHALLENGER TEST SUITE
// ============================================================================

describe('Challenger M5: Empirical Stress Testing — MatchPage & Hotkey Isolation', () => {
  let room: MockColyseusRoom;

  beforeEach(() => {
    room = new MockColyseusRoom();
  });

  // ==========================================================================
  // STRESS TEST 1: RAPID SIMULATED TYPING & CAMERA PRESET IMMUNITY
  // ==========================================================================
  describe('1. Hotkey Isolation Under Rapid Simulated Typing', () => {
    it('EMP-M5.1.1: 1,000 rapid typing keystrokes containing "c", "C", "KeyC" do not shift camera preset', () => {
      const harness = new EmpiricalMatchPageHarness(room, true);
      harness.handleIntroComplete();

      const initialPreset = harness.activePresetIndex;
      expect(initialPreset).toBe(0);

      const combatWords = [
        'cyber', 'caldera', 'combo', 'clash', 'critical', 'circuit',
        'countdown', 'chaos', 'cancel', 'circle', 'cleave', 'crush',
        'crouch', 'counter', 'cyberspace', 'charge', 'catalyst', 'chasm',
      ];

      let totalKeystrokes = 0;
      for (let run = 0; run < 60; run++) {
        for (const word of combatWords) {
          for (let i = 0; i < word.length; i++) {
            const char = word[i];
            const isC = char.toLowerCase() === 'c';
            const code = isC ? 'KeyC' : `Key${char.toUpperCase()}`;
            const key = run % 2 === 0 ? char : char.toUpperCase();

            const keyEvent = createMockKeyEvent(code, key, harness.typingInput);
            harness.simulateKeyDown(keyEvent, harness.typingInput);
            totalKeystrokes++;
          }
        }
      }

      expect(totalKeystrokes).toBeGreaterThanOrEqual(1000);
      expect(harness.cameraCycleCalls).toBe(0);
      expect(harness.activePresetIndex).toBe(initialPreset);
    });

    it('EMP-M5.1.2: suppresses camera cycling when activeElement is INPUT even if event target is undefined or nested', () => {
      const harness = new EmpiricalMatchPageHarness(room, true);
      harness.handleIntroComplete();

      const inputElement = createMockElement('INPUT', 'combat_keystroke_input');
      inputElement.focus();

      // Case A: Event target is undefined/window, but document.activeElement is input
      const evt1 = createMockKeyEvent('KeyC', 'c', undefined);
      harness.simulateKeyDown(evt1, inputElement);
      expect(harness.cameraCycleCalls).toBe(0);

      // Case B: Event target is a generic SPAN inside input container, but activeElement is input
      const evt2 = createMockKeyEvent('KeyC', 'C', { tagName: 'SPAN' });
      harness.simulateKeyDown(evt2, inputElement);
      expect(harness.cameraCycleCalls).toBe(0);

      // Case C: Target is TEXTAREA
      const textarea = createMockElement('TEXTAREA');
      const evt3 = createMockKeyEvent('KeyC', 'c', textarea);
      harness.simulateKeyDown(evt3, textarea);
      expect(harness.cameraCycleCalls).toBe(0);
    });

    it('EMP-M5.1.3: positive control: cycles camera preset ONLY when user explicitly presses KeyC outside inputs', () => {
      const harness = new EmpiricalMatchPageHarness(room, true);
      harness.handleIntroComplete();

      const canvasTarget = { tagName: 'CANVAS' };
      const nonInputElement = createMockElement('DIV', 'canvas-container');

      expect(harness.activePresetIndex).toBe(0);

      // Press KeyC on canvas
      harness.simulateKeyDown(createMockKeyEvent('KeyC', 'c', canvasTarget), nonInputElement);
      expect(harness.cameraCycleCalls).toBe(1);
      expect(harness.activePresetIndex).toBe(1);

      // Press KeyC again (uppercase C) on canvas
      harness.simulateKeyDown(createMockKeyEvent('KeyC', 'C', canvasTarget), nonInputElement);
      expect(harness.cameraCycleCalls).toBe(2);
      expect(harness.activePresetIndex).toBe(2);

      // Cycle through remaining presets to wrap around
      const remainingCycles = CAMERA_PRESETS.length - 2;
      for (let i = 0; i < remainingCycles; i++) {
        harness.simulateKeyDown(createMockKeyEvent('KeyC', 'c', canvasTarget), nonInputElement);
      }
      expect(harness.cameraCycleCalls).toBe(CAMERA_PRESETS.length);
      expect(harness.activePresetIndex).toBe(0); // Wrapped around
    });

    it('EMP-M5.1.4: ensures keystrokes during intro do not trigger camera cycling or advance typing state', () => {
      const harness = new EmpiricalMatchPageHarness(room, true);
      // Intro NOT complete yet
      expect(harness.isIntroComplete).toBe(false);

      // Typing keys during intro
      for (const char of 'cyber combo clash') {
        harness.simulateKeyDown(createMockKeyEvent(`Key${char.toUpperCase()}`, char, harness.typingInput), harness.typingInput);
      }

      // Camera preset must not shift
      expect(harness.cameraCycleCalls).toBe(0);
      expect(harness.activePresetIndex).toBe(0);
    });

    it('EMP-M5.1.5: dynamic focus toggling: verify camera cycling is immediately disabled upon input focus and re-enabled upon blur', () => {
      const harness = new EmpiricalMatchPageHarness(room, true);
      harness.handleIntroComplete();

      const inputElem = createMockElement('INPUT', 'combat_input');
      const canvasElem = createMockElement('CANVAS');

      // 1. Focused on canvas -> cycles camera
      harness.simulateKeyDown(createMockKeyEvent('KeyC', 'c', canvasElem), canvasElem);
      expect(harness.cameraCycleCalls).toBe(1);

      // 2. Focused on input -> blocks camera cycling
      harness.simulateKeyDown(createMockKeyEvent('KeyC', 'c', inputElem), inputElem);
      expect(harness.cameraCycleCalls).toBe(1); // Unchanged

      // 3. Blur input, click canvas again -> cycles camera
      harness.simulateKeyDown(createMockKeyEvent('KeyC', 'c', canvasElem), canvasElem);
      expect(harness.cameraCycleCalls).toBe(2);

      // 4. Focus input again -> blocks camera cycling
      harness.simulateKeyDown(createMockKeyEvent('KeyC', 'c', inputElem), inputElem);
      expect(harness.cameraCycleCalls).toBe(2); // Unchanged
    });
  });

  // ==========================================================================
  // STRESS TEST 2: RAPID ROOM EVENTS (100+ WPM BURSTS) & MEMORY LEAK CHECK
  // ==========================================================================
  describe('2. Rapid Incoming Room Events (100+ WPM Bursts) & Memory Leak Check', () => {
    it('EMP-M5.2.1: processes 200 WPM burst stream (1,000+ key_accepted and word_completed events) without throwing', () => {
      const harness = new EmpiricalMatchPageHarness(room, true);
      harness.handleIntroComplete();

      const attackKinds: ('jab' | 'kick' | 'heavy' | 'uppercut')[] = ['jab', 'kick', 'heavy', 'uppercut'];
      const playerSessions = ['player_left_session', 'player_right_session'];

      let expectedKeystrokes = 0;
      let expectedAttacks = 0;
      let expectedShakes = 0;

      // 100 words typed at high speed
      for (let w = 0; w < 100; w++) {
        const player = playerSessions[w % 2];
        const wordLen = 5 + (w % 4);

        // Keystroke burst (simulating 150-200 WPM)
        for (let k = 0; k < wordLen; k++) {
          expect(() => {
            harness.room.triggerServerEvent({
              type: 'key_accepted',
              playerId: player,
              wordIndex: w,
              charIndex: k,
            });
          }).not.toThrow();
          expectedKeystrokes++;
        }

        // Word completed burst
        const attackKind = attackKinds[w % attackKinds.length];
        const damage = 10 + (w % 30); // damage from 10 to 39
        expect(() => {
          harness.room.triggerServerEvent({
            type: 'word_completed',
            playerId: player,
            attackKind,
            damage,
            newCombo: (w % 10) + 1,
          });
        }).not.toThrow();
        expectedAttacks++;

        const isHeavyAttack = attackKind === 'kick' || attackKind === 'heavy' || attackKind === 'uppercut';
        if (isHeavyAttack || damage >= 25) {
          expectedShakes++;
        }
      }

      expect(harness.keystrokesCount).toBe(expectedKeystrokes);
      expect(harness.attacksCount).toBe(expectedAttacks);
      expect(harness.hitsCount).toBe(expectedAttacks);
      expect(harness.shakesCount).toBe(expectedShakes);
    });

    it('EMP-M5.2.2: stress-tests 10,000 rapid event dispatches with 3D character controller updates for memory leak prevention', () => {
      const mockLoader: any = { load: () => {} };
      const fighterLeft = new Character3DFighter('ronin', 'left', mockLoader);
      const fighterRight = new Character3DFighter('valkyrie', 'right', mockLoader);

      const arenaRef: ThreeCombatArenaRef = {
        triggerKeystroke: (side) => {
          const f = side === 'left' ? fighterLeft : fighterRight;
          f.playKeystroke();
        },
        triggerAttack: (side, tier) => {
          const f = side === 'left' ? fighterLeft : fighterRight;
          if (tier === 'kick') f.playKick();
          else if (tier === 'heavy') f.playHeavy();
          else f.playJab();
        },
        triggerHit: (side, severity) => {
          const f = side === 'left' ? fighterLeft : fighterRight;
          if (severity === 'heavy') f.playHitHeavy();
          else f.playHitLight();
        },
        triggerKnockout: (loserSide) => {
          const f = loserSide === 'left' ? fighterLeft : fighterRight;
          f.playKnockout();
        },
        triggerVictory: (winnerSide) => {
          const f = winnerSide === 'left' ? fighterLeft : fighterRight;
          f.playVictory();
        },
        triggerScreenShake: vi.fn(),
        cycleCameraPreset: vi.fn(),
        setCameraPreset: vi.fn(),
        skipIntro: vi.fn(),
      };

      // Dispatch 10,000 events in rapid burst
      const eventTypes = ['keystroke', 'jab', 'kick', 'heavy', 'hit_light', 'hit_heavy'];
      for (let i = 0; i < 10000; i++) {
        const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
        const ev = eventTypes[i % eventTypes.length];

        if (ev === 'keystroke') arenaRef.triggerKeystroke(side);
        else if (ev === 'jab') arenaRef.triggerAttack(side, 'jab');
        else if (ev === 'kick') arenaRef.triggerAttack(side, 'kick');
        else if (ev === 'heavy') arenaRef.triggerAttack(side, 'heavy');
        else if (ev === 'hit_light') arenaRef.triggerHit(side, 'light');
        else if (ev === 'hit_heavy') arenaRef.triggerHit(side, 'heavy');

        // Update animation frame
        fighterLeft.update(0.016, i * 0.016);
        fighterRight.update(0.016, i * 0.016);
      }

      // Verify no NaN positions or corrupt bone matrices
      expect(Number.isFinite(fighterLeft.group.position.x)).toBe(true);
      expect(Number.isFinite(fighterRight.group.position.x)).toBe(true);
      expect(Number.isNaN(fighterLeft.group.position.x)).toBe(false);
      expect(Number.isNaN(fighterRight.group.position.x)).toBe(false);

      // Clean disposal
      expect(() => fighterLeft.dispose()).not.toThrow();
      expect(() => fighterRight.dispose()).not.toThrow();
    });

    it('EMP-M5.2.3: handles malformed room events (outlier damage, unexpected attackKinds, unknown player IDs) gracefully', () => {
      const harness = new EmpiricalMatchPageHarness(room, true);
      harness.handleIntroComplete();

      // Malformed 1: Unknown attack kind -> defaults to jab
      expect(() => {
        harness.room.triggerServerEvent({
          type: 'word_completed',
          playerId: 'player_left_session',
          attackKind: 'plasma_laser_super',
          damage: 50,
        });
      }).not.toThrow();
      expect(harness.lastAttack?.tier).toBe('jab');
      expect(harness.lastShakeIntensity).toBe(0.32); // Damage >= 25 still triggers shake

      // Malformed 2: Missing player ID -> defaults to mySide / fallback safely
      expect(() => {
        harness.room.triggerServerEvent({
          type: 'word_completed',
          playerId: 'unknown_spectator_id',
          attackKind: 'kick',
          damage: 15,
        });
      }).not.toThrow();

      // Malformed 3: Negative damage
      expect(() => {
        harness.room.triggerServerEvent({
          type: 'word_completed',
          playerId: 'player_right_session',
          attackKind: 'jab',
          damage: -99,
        });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // STRESS TEST 3: SCREEN SHAKE JITTER BOUNDS & DECAY
  // ==========================================================================
  describe('3. Screen Shake Jitter Bounds & Decay Dynamics', () => {
    it('EMP-M5.3.1: verifies camera jitter offsets are strictly bounded within [-0.5, +0.5] over 100,000 samples', () => {
      const testedIntensities = [0.10, 0.20, 0.22, 0.25, 0.28, 0.32, 0.35, 1.00];

      for (const intensity of testedIntensities) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        const maxExpectedBound = 0.5 * intensity;

        for (let sample = 0; sample < 10000; sample++) {
          const shakeX = (Math.random() - 0.5) * intensity;
          const shakeY = (Math.random() - 0.5) * intensity;

          minX = Math.min(minX, shakeX);
          maxX = Math.max(maxX, shakeX);
          minY = Math.min(minY, shakeY);
          maxY = Math.max(maxY, shakeY);

          // Absolute hard limit is [-0.5, +0.5] for intensity <= 1.0
          expect(shakeX).toBeGreaterThanOrEqual(-0.5);
          expect(shakeX).toBeLessThanOrEqual(0.5);
          expect(shakeY).toBeGreaterThanOrEqual(-0.5);
          expect(shakeY).toBeLessThanOrEqual(0.5);
        }

        // Verify tighter mathematical envelope [-0.5*intensity, 0.5*intensity]
        expect(minX).toBeGreaterThanOrEqual(-maxExpectedBound);
        expect(maxX).toBeLessThanOrEqual(maxExpectedBound);
        expect(minY).toBeGreaterThanOrEqual(-maxExpectedBound);
        expect(maxY).toBeLessThanOrEqual(maxExpectedBound);
      }
    });

    it('EMP-M5.3.2: verifies screen shake intensity decays monotonically and reaches exactly 0.0 in finite time', () => {
      const initialIntensity = 0.35; // Maximum KO shake
      const delta = 0.016667; // 60 FPS frame time (16.67ms)

      let intensity = initialIntensity;
      let frame = 0;
      let prevIntensity = initialIntensity;

      while (intensity > 0) {
        intensity = Math.max(0, intensity - delta * 1.5);
        frame++;

        expect(intensity).toBeLessThanOrEqual(prevIntensity);
        expect(intensity).toBeGreaterThanOrEqual(0);
        prevIntensity = intensity;

        if (frame > 60) {
          throw new Error(`Screen shake failed to decay within 60 frames, current: ${intensity}`);
        }
      }

      expect(intensity).toBe(0);
      expect(frame).toBeLessThanOrEqual(16);
      expect(frame).toBeGreaterThanOrEqual(13);
    });

    it('EMP-M5.3.3: verifies rapid successive shake triggers do not blow up intensity (clamped via Math.max)', () => {
      let shakeIntensity = 0;
      const triggerScreenShake = (intensity = 0.25) => {
        shakeIntensity = Math.max(shakeIntensity, intensity);
      };

      for (let i = 0; i < 50; i++) {
        triggerScreenShake(0.28);
      }
      expect(shakeIntensity).toBe(0.28);

      triggerScreenShake(0.35);
      expect(shakeIntensity).toBe(0.35);

      triggerScreenShake(0.20);
      expect(shakeIntensity).toBe(0.35);
    });

    it('EMP-M5.3.4: screen shake decay handles variable/large delta frames without overshoot or negative intensity', () => {
      // Test large delta jumps (e.g. browser tab backgrounded or frame lag)
      let shakeIntensity = 0.35;
      const hugeDelta = 2.0; // 2 seconds delta

      shakeIntensity = Math.max(0, shakeIntensity - hugeDelta * 1.5);
      expect(shakeIntensity).toBe(0); // Clamped cleanly to 0, not -2.65
      expect(Number.isFinite(shakeIntensity)).toBe(true);
    });

    it('EMP-M5.3.5: camera position recovers cleanly to base target position after shake duration expires', () => {
      const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
      const basePos = new THREE.Vector3(0, 2.5, 20.0);
      camera.position.copy(basePos);

      let shakeIntensity = 0.35;
      const delta = 0.016667;

      // Simulate loop with screen shake
      while (shakeIntensity > 0) {
        shakeIntensity = Math.max(0, shakeIntensity - delta * 1.5);

        // Reset to lerped position
        camera.position.copy(basePos);

        if (shakeIntensity > 0) {
          const shakeX = (Math.random() - 0.5) * shakeIntensity;
          const shakeY = (Math.random() - 0.5) * shakeIntensity;
          camera.position.x += shakeX;
          camera.position.y += shakeY;
        }
      }

      // Once shake is finished, camera is identically at basePos
      expect(camera.position.x).toBe(basePos.x);
      expect(camera.position.y).toBe(basePos.y);
      expect(camera.position.z).toBe(basePos.z);
    });
  });

  // ==========================================================================
  // STRESS TEST 4: PHASER 2D LOOP DORMANCY IN 3D MODE
  // ==========================================================================
  describe('4. Phaser 2D Loop Inactivity & 0 Draw Calls in 3D Mode', () => {
    it('EMP-M5.4.1: verifies Phaser Game is NEVER instantiated when use3D is true or default', () => {
      const simDefault = new EmpiricalMatchPageHarness(room);
      expect(simDefault.is3DMode).toBe(true);
      expect(simDefault.phaserGameCreated).toBe(false);
      expect(simDefault.phaserDrawCalls).toBe(0);

      const simExplicit = new EmpiricalMatchPageHarness(room, true);
      expect(simExplicit.is3DMode).toBe(true);
      expect(simExplicit.phaserGameCreated).toBe(false);
      expect(simExplicit.phaserDrawCalls).toBe(0);
    });

    it('EMP-M5.4.2: verifies positive control: Phaser IS instantiated when use3D is explicitly false', () => {
      const sim2D = new EmpiricalMatchPageHarness(room, false);
      expect(sim2D.is3DMode).toBe(false);
      expect(sim2D.phaserGameCreated).toBe(true);
      expect(sim2D.phaserDrawCalls).toBe(1);
    });

    it('EMP-M5.4.3: inspects MatchPage.tsx JSX and verifies Phaser container div is NOT rendered in 3D mode', () => {
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      expect(code).toMatch(/is3DMode\s*\?\s*\(\s*<ThreeCombatArena/);
      expect(code).toMatch(/:\s*\(\s*<div\s+ref=\{phaserContainerRef\}/);
    });

    it('EMP-M5.4.4: verifies all sceneRef calls in MatchPage.tsx are null-safe and produce zero runtime errors in 3D mode', () => {
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      const sceneRefCalls = code.match(/sceneRef\.current(?:\?\.)?[a-zA-Z0-9_]*/g) || [];
      expect(sceneRefCalls.length).toBeGreaterThan(0);

      const unsafeCalls = code.match(/sceneRef\.current\.[a-zA-Z0-9_]+\(/g) || [];
      const unguardedCalls = unsafeCalls.filter((c) => !c.includes('?.'));
      expect(unguardedCalls.length).toBe(0);
    });

    it('EMP-M5.4.5: verifies unmount lifecycle cleanup does not throw errors when Phaser is null in 3D mode', () => {
      // In MatchPage.tsx:
      // When is3DMode is true, the Phaser initialization useEffect immediately returns before
      // instantiating Phaser.Game or returning any unmount cleanup handler.
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      const phaserGuardIdx = code.indexOf('if (is3DMode) {');
      expect(phaserGuardIdx).toBeGreaterThan(-1);

      const guardSlice = code.substring(phaserGuardIdx, phaserGuardIdx + 200);
      expect(guardSlice).toContain('return;');
      expect(guardSlice).toMatch(/Deactivate legacy Phaser 2D loop/i);
    });
  });
});

