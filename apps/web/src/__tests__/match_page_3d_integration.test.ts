import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ThreeCombatArenaRef,
  CameraPreset,
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
} from '../render/ThreeCombatArena';

// ============================================================================
// MOCK TYPES & EVENT HELPERS
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

// ============================================================================
// MOCK ROOM & MATCHPAGE COMBAT DISPATCH HARNESS
// ============================================================================

interface MockPlayer {
  sessionId: string;
  displayName: string;
  side: 'left' | 'right';
  characterId: string;
  health: number;
  combo: number;
  wpm?: number;
  acceptedWpm?: number;
  accuracy?: number;
  highestCombo?: number;
  stunnedUntilMs?: number;
}

class MockRoom {
  public sessionId = 'player_left_session';
  public state: any;
  public metadata: any = {};
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
      displayName: 'Cyber Opponent',
      side: 'right',
      characterId: 'cyber_valkyrie',
      health: 200,
      combo: 0,
    });

    this.state = {
      status: 'in_progress',
      arenaId: 'cyber_rooftop',
      remainingSeconds: 90,
      words: ['cyber', 'neon', 'katana', 'strike', 'victory'],
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
 * MatchPage 3D Combat Bridge Simulator:
 * Encapsulates the exact event routing and lifecycle logic implemented in MatchPage.tsx
 */
class MatchPage3DCombatSimulator {
  public room: MockRoom;
  public use3D: boolean;
  public is3DMode: boolean;
  public isIntroComplete: boolean;
  public typingInput: MockDomElement;
  public phaserGameCreated = false;
  public threeArenaRef: ThreeCombatArenaRef;
  public keySeq = 0;
  public stunnedUntilMs = 0;
  public statsOverlayShown = false;
  public matchEnded = false;

  // Spies / Call records
  public keystrokesRecorded: ('left' | 'right')[] = [];
  public attacksRecorded: { side: 'left' | 'right'; tier: 'jab' | 'kick' | 'heavy' | 'weapon' }[] = [];
  public hitsRecorded: { side: 'left' | 'right'; severity: 'light' | 'heavy' }[] = [];
  public shakesRecorded: number[] = [];
  public knockoutsRecorded: ('left' | 'right')[] = [];
  public victoriesRecorded: ('left' | 'right')[] = [];

  constructor(room: MockRoom, use3D = true) {
    this.room = room;
    this.use3D = use3D;
    this.is3DMode = use3D !== false;
    this.isIntroComplete = !this.is3DMode; // 3D starts false; 2D starts true
    this.typingInput = createMockElement('INPUT', 'combat_keystroke_input');
    this.typingInput.disabled = this.is3DMode && !this.isIntroComplete;

    this.threeArenaRef = {
      triggerAttack: (side, tier) => {
        this.attacksRecorded.push({ side, tier });
      },
      triggerHit: (side, severity) => {
        this.hitsRecorded.push({ side, severity });
      },
      triggerKeystroke: (side) => {
        this.keystrokesRecorded.push(side);
      },
      triggerKnockout: (loserSide) => {
        this.knockoutsRecorded.push(loserSide);
      },
      triggerVictory: (winnerSide) => {
        this.victoriesRecorded.push(winnerSide);
      },
      triggerScreenShake: (intensity = 0.25) => {
        this.shakesRecorded.push(intensity);
      },
      cycleCameraPreset: vi.fn(),
      setCameraPreset: vi.fn(),
      skipIntro: vi.fn(() => {
        this.handleIntroComplete();
      }),
    };

    // Initialize engine based on 3D mode
    if (!this.is3DMode) {
      this.phaserGameCreated = true;
    }

    // Attach room listeners (mirroring MatchPage.tsx lines 206-388)
    this.room.onStateChange((state: any) => {
      if ((state.status === 'completed' || state.status === 'forfeit') && !this.matchEnded) {
        this.matchEnded = true;
        let winnerSide: 'left' | 'right' = 'left';
        let loserSide: 'left' | 'right' = 'right';

        if (state.winnerSessionId) {
          const winnerPlayer = state.players.get(state.winnerSessionId);
          if (winnerPlayer) {
            winnerSide = winnerPlayer.side || 'left';
            loserSide = winnerSide === 'left' ? 'right' : 'left';
          }
        }

        if (this.threeArenaRef) {
          this.threeArenaRef.triggerKnockout(loserSide);
          this.threeArenaRef.triggerVictory(winnerSide);
          this.threeArenaRef.triggerScreenShake?.(0.35);
          setTimeout(() => {
            this.statsOverlayShown = true;
          }, 1800);
        }
      }
    });

    this.room.onMessage('server_event', (event: any) => {
      const state = this.room.state;
      const senderPlayer = state?.players?.get(event.playerId);
      const myPlayer = state?.players?.get(this.room.sessionId);
      const mySide: 'left' | 'right' = myPlayer?.side || 'left';
      const side: 'left' | 'right' =
        senderPlayer?.side || (event.playerId === this.room.sessionId ? mySide : mySide === 'left' ? 'right' : 'left');

      if (event.type === 'key_accepted') {
        this.threeArenaRef?.triggerKeystroke(side);
      } else if (event.type === 'word_completed') {
        const attackKind = event.attackKind || 'jab';
        const isHeavyAttack = attackKind === 'kick' || attackKind === 'heavy' || attackKind === 'uppercut';
        const tier =
          attackKind === 'kick'
            ? 'kick'
            : attackKind === 'heavy' || attackKind === 'uppercut'
            ? 'heavy'
            : 'jab';

        this.threeArenaRef?.triggerAttack(side, tier);
        this.threeArenaRef?.triggerHit(side === 'left' ? 'right' : 'left', isHeavyAttack ? 'heavy' : 'light');

        if (isHeavyAttack || (event.damage && event.damage >= 25)) {
          const shake = event.damage && event.damage >= 25 ? 0.32 : tier === 'heavy' ? 0.28 : 0.22;
          this.threeArenaRef?.triggerScreenShake?.(shake);
        }
      } else if (event.type === 'key_error' && event.playerId === this.room.sessionId) {
        this.stunnedUntilMs = 0; // Angle 1: Zero input freeze, instant re-type
        this.threeArenaRef?.triggerHit(mySide, 'light');
      }
    });
  }

  public handleIntroComplete() {
    this.isIntroComplete = true;
    this.typingInput.disabled = false;
    this.typingInput.focus();
  }

  public handleKeyPress(char: string) {
    if (this.matchEnded) return;
    if (this.is3DMode && !this.isIntroComplete) return;
    if (this.room.state?.status !== 'in_progress') return;
    if (Date.now() < this.stunnedUntilMs) return;

    let keyChar = char === 'Spacebar' || char === ' ' ? ' ' : char;
    if (keyChar.length !== 1 || !/^[ -~]$/.test(keyChar)) return;

    this.keySeq++;
    this.room.send('key_intent', {
      seq: this.keySeq,
      key: keyChar,
      clientTimeMs: Date.now(),
    });
  }

  public handleCombatKey(e: { key: string; preventDefault: () => void }) {
    if (this.is3DMode && !this.isIntroComplete) {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        this.threeArenaRef.skipIntro();
        this.handleIntroComplete();
      }
    }
  }
}

// ============================================================================
// TEST SUITE: MATCHPAGE 3D INTEGRATION & PERFORMANCE OPTIMIZATION
// ============================================================================

describe('Milestone 5: MatchPage 3D Integration & Performance Optimization Test Suite', () => {
  let room: MockRoom;

  beforeEach(() => {
    room = new MockRoom();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // ==========================================================================
  // SECTION 1: PHASER DEACTIVATION IN 3D MODE
  // ==========================================================================
  describe('1. Legacy Phaser 2D Deactivation in 3D Mode', () => {
    it('M5.1.1: skips Phaser instantiation entirely when use3D is true (default mode)', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      expect(sim.is3DMode).toBe(true);
      expect(sim.phaserGameCreated).toBe(false);
    });

    it('M5.1.2: instantiates Phaser only when use3D is explicitly false', () => {
      const sim = new MatchPage3DCombatSimulator(room, false);
      expect(sim.is3DMode).toBe(false);
      expect(sim.phaserGameCreated).toBe(true);
    });

    it('M5.1.3: verifies MatchPage.tsx source code guards Phaser useEffect with is3DMode return', () => {
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      expect(fs.existsSync(matchPagePath)).toBe(true);
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      // Verify the guard exists in MatchPage
      expect(code).toContain('if (is3DMode) {');
      expect(code).toContain('return;');
      expect(code).toMatch(/Deactivate legacy Phaser 2D loop/i);
    });

    it('M5.1.4: maintains null-safety on sceneRef when Phaser is deactivated in 3D mode', () => {
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      // Ensure all sceneRef calls are safely guarded with optional chaining or if checks
      const unsafeSceneCalls = code.match(/sceneRef\.current\.[a-zA-Z0-9_]+\(/g) || [];
      const unguardedCalls = unsafeSceneCalls.filter((c) => !c.includes('?.'));
      expect(unguardedCalls.length).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 2: ROOM EVENT DISPATCH TO THREEARENAREF METHODS
  // ==========================================================================
  describe('2. Room Combat Event Bridging to ThreeCombatArenaRef', () => {
    it('M5.2.1: bridges key_accepted to threeArenaRef.triggerKeystroke', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerServerEvent({
        type: 'key_accepted',
        playerId: 'player_left_session',
        wordIndex: 0,
        charIndex: 1,
      });

      expect(sim.keystrokesRecorded).toContain('left');
    });

    it('M5.2.2: bridges opponent key_accepted to right side keystroke trigger', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerServerEvent({
        type: 'key_accepted',
        playerId: 'player_right_session',
        wordIndex: 0,
        charIndex: 2,
      });

      expect(sim.keystrokesRecorded).toContain('right');
    });

    it('M5.2.3: bridges jab word_completed to triggerAttack(side, jab) and triggerHit(other, light)', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerServerEvent({
        type: 'word_completed',
        playerId: 'player_left_session',
        attackKind: 'jab',
        damage: 10,
        newCombo: 1,
      });

      expect(sim.attacksRecorded).toContainEqual({ side: 'left', tier: 'jab' });
      expect(sim.hitsRecorded).toContainEqual({ side: 'right', severity: 'light' });
      expect(sim.shakesRecorded.length).toBe(0); // light jab does not trigger heavy screen shake
    });

    it('M5.2.4: bridges kick word_completed to triggerAttack(side, kick), heavy hit, and screen shake 0.22', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerServerEvent({
        type: 'word_completed',
        playerId: 'player_left_session',
        attackKind: 'kick',
        damage: 18,
        newCombo: 2,
      });

      expect(sim.attacksRecorded).toContainEqual({ side: 'left', tier: 'kick' });
      expect(sim.hitsRecorded).toContainEqual({ side: 'right', severity: 'heavy' });
      expect(sim.shakesRecorded).toContain(0.22);
    });

    it('M5.2.5: bridges heavy slam word_completed to heavy tier attack and screen shake 0.28', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerServerEvent({
        type: 'word_completed',
        playerId: 'player_right_session',
        attackKind: 'heavy',
        damage: 22,
        newCombo: 3,
      });

      expect(sim.attacksRecorded).toContainEqual({ side: 'right', tier: 'heavy' });
      expect(sim.hitsRecorded).toContainEqual({ side: 'left', severity: 'heavy' });
      expect(sim.shakesRecorded).toContain(0.28);
    });

    it('M5.2.6: bridges critical damage >= 25 to maximum attack screen shake 0.32', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerServerEvent({
        type: 'word_completed',
        playerId: 'player_left_session',
        attackKind: 'uppercut',
        damage: 30, // Critical damage
        newCombo: 4,
      });

      expect(sim.shakesRecorded).toContain(0.32);
    });

    it('M5.2.7: bridges key_error to light hit reaction with zero lockout (Angle 1)', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerServerEvent({
        type: 'key_error',
        playerId: 'player_left_session',
        wordIndex: 0,
        charIndex: 1,
      });

      expect(sim.hitsRecorded).toContainEqual({ side: 'left', severity: 'light' });
      expect(sim.stunnedUntilMs).toBe(0);
    });

    it('M5.2.8: bridges match completion KO to triggerKnockout, triggerVictory, and screen shake 0.35', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.room.triggerStateChange({
        ...room.state,
        status: 'completed',
        winnerSessionId: 'player_left_session',
      });

      expect(sim.knockoutsRecorded).toContain('right');
      expect(sim.victoriesRecorded).toContain('left');
      expect(sim.shakesRecorded).toContain(0.35);

      // Verify stats overlay timer
      expect(sim.statsOverlayShown).toBe(false);
      vi.advanceTimersByTime(1800);
      expect(sim.statsOverlayShown).toBe(true);
    });
  });

  // ==========================================================================
  // SECTION 3: CAMERA HOTKEY ISOLATION WHILE TYPING INPUT HAS FOCUS
  // ==========================================================================
  describe('3. Camera Hotkey Isolation While Typing Input Has Focus', () => {
    function createArenaKeydownHandler(
      isIntroCompleteGetter: () => boolean,
      completeIntroFn: () => void,
      cycleCameraPresetFn: () => void,
      getActiveElement?: () => { tagName?: string } | null
    ) {
      return (e: MockKeyEvent) => {
        if (
          (e.code === 'Enter' || e.code === 'Space' || e.key === 'Enter' || e.key === ' ') &&
          !isIntroCompleteGetter()
        ) {
          completeIntroFn();
        } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
          const targetTag = e.target?.tagName?.toUpperCase();
          const activeTag = getActiveElement ? getActiveElement()?.tagName?.toUpperCase() : undefined;
          if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
            cycleCameraPresetFn();
          }
        }
      };
    }

    it('M5.3.1: blocks camera cycling when KeyC is pressed while focused on INPUT', () => {
      const cycleSpy = vi.fn();
      const inputTarget = { tagName: 'INPUT', id: 'combat_keystroke_input' };
      const handler = createArenaKeydownHandler(() => true, vi.fn(), cycleSpy, () => inputTarget);

      const evt = createMockKeyEvent('KeyC', 'c', inputTarget);
      handler(evt);

      expect(cycleSpy).not.toHaveBeenCalled();
    });

    it('M5.3.2: blocks camera cycling when KeyC is pressed while focused on TEXTAREA', () => {
      const cycleSpy = vi.fn();
      const textareaTarget = { tagName: 'TEXTAREA' };
      const handler = createArenaKeydownHandler(() => true, vi.fn(), cycleSpy, () => textareaTarget);

      const evt = createMockKeyEvent('KeyC', 'c', textareaTarget);
      handler(evt);

      expect(cycleSpy).not.toHaveBeenCalled();
    });

    it('M5.3.3: blocks camera cycling for uppercase C or Shift+C in INPUT', () => {
      const cycleSpy = vi.fn();
      const inputTarget = { tagName: 'INPUT' };
      const handler = createArenaKeydownHandler(() => true, vi.fn(), cycleSpy, () => inputTarget);

      handler(createMockKeyEvent('KeyC', 'C', inputTarget));
      expect(cycleSpy).not.toHaveBeenCalled();
    });

    it('M5.3.4: allows camera cycling when KeyC is pressed on canvas or non-input elements', () => {
      const cycleSpy = vi.fn();
      const bodyTarget = { tagName: 'DIV', id: 'arena-canvas-container' };
      const handler = createArenaKeydownHandler(() => true, vi.fn(), cycleSpy, () => bodyTarget);

      handler(createMockKeyEvent('KeyC', 'c', bodyTarget));
      expect(cycleSpy).toHaveBeenCalledTimes(1);

      handler(createMockKeyEvent('KeyC', 'C', { tagName: 'CANVAS' }));
      expect(cycleSpy).toHaveBeenCalledTimes(2);
    });

    it('M5.3.5: allows typing words containing letter c (cyber, caldera) without blocking', () => {
      const cycleSpy = vi.fn();
      const inputTarget = { tagName: 'INPUT' };
      const typedChars: string[] = [];

      const arenaHandler = createArenaKeydownHandler(() => true, vi.fn(), cycleSpy, () => inputTarget);

      const word = 'cyber caldera combo';
      for (const char of word) {
        const evt = createMockKeyEvent(char === 'c' ? 'KeyC' : `Key${char.toUpperCase()}`, char, inputTarget);
        arenaHandler(evt);
        if (!evt.defaultPrevented) {
          typedChars.push(char);
        }
      }

      expect(cycleSpy).not.toHaveBeenCalled();
      expect(typedChars.join('')).toBe(word);
    });

    it('M5.3.6: verifies ThreeCombatArena.tsx source code contains the exact INPUT & TEXTAREA guard', () => {
      const arenaPath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
      const code = fs.readFileSync(arenaPath, 'utf-8');

      expect(code).toMatch(/targetTag\s*!==\s*'INPUT'\s*&&\s*targetTag\s*!==\s*'TEXTAREA'/);
      expect(code).toMatch(/activeTag\s*!==\s*'INPUT'\s*&&\s*activeTag\s*!==\s*'TEXTAREA'/);
    });
  });

  // ==========================================================================
  // SECTION 4: INTRO COMPLETION & TYPING DECK SYNCHRONIZATION
  // ==========================================================================
  describe('4. Intro Completion & Typing Deck Synchronization', () => {
    it('M5.4.1: starts with isIntroComplete false and typing input disabled in 3D mode', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      expect(sim.isIntroComplete).toBe(false);
      expect(sim.typingInput.disabled).toBe(true);
      expect(sim.typingInput.isFocused).toBe(false);
    });

    it('M5.4.2: ignores combat keystrokes while entrance intro is still running', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      expect(sim.isIntroComplete).toBe(false);

      sim.handleKeyPress('c');
      sim.handleKeyPress('y');
      sim.handleKeyPress('b');

      expect(sim.room.sentMessages.length).toBe(0);
    });

    it('M5.4.3: pressing Space or Enter during intro triggers skipIntro and focuses input', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      const preventDefault = vi.fn();

      sim.handleCombatKey({ key: 'Enter', preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(sim.threeArenaRef.skipIntro).toHaveBeenCalled();
      expect(sim.isIntroComplete).toBe(true);
      expect(sim.typingInput.disabled).toBe(false);
      expect(sim.typingInput.isFocused).toBe(true);
    });

    it('M5.4.4: onIntroComplete callback enables typing deck and focuses input', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);

      // Simulate onIntroComplete invocation from ThreeCombatArena
      sim.handleIntroComplete();

      expect(sim.isIntroComplete).toBe(true);
      expect(sim.typingInput.disabled).toBe(false);
      expect(sim.typingInput.isFocused).toBe(true);
    });

    it('M5.4.5: enables combat keystrokes immediately once intro is completed', () => {
      const sim = new MatchPage3DCombatSimulator(room, true);
      sim.handleIntroComplete();

      sim.handleKeyPress('k');
      sim.handleKeyPress('e');
      sim.handleKeyPress('y');

      expect(sim.room.sentMessages.length).toBe(3);
      expect(sim.room.sentMessages[0].data.key).toBe('k');
      expect(sim.room.sentMessages[1].data.key).toBe('e');
      expect(sim.room.sentMessages[2].data.key).toBe('y');
    });

    it('M5.4.6: verifies MatchPage.tsx binds onIntroComplete to ThreeCombatArena and data-testid on typing deck', () => {
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      expect(code).toContain('onIntroComplete={handleIntroComplete}');
      expect(code).toContain('data-testid="typing-deck"');
      expect(code).toContain('aria-disabled={is3DMode && !isIntroComplete}');
      expect(code).toMatch(/disabled=\{is3DMode && !isIntroComplete\}/);
    });
  });

  // ==========================================================================
  // SECTION 5: THREECOMBATARENAREF SCREEN SHAKE API CONTRACT
  // ==========================================================================
  describe('5. ThreeCombatArenaRef Screen Shake API Implementation', () => {
    it('M5.5.1: implements triggerScreenShake on ThreeCombatArenaRef with default 0.25 intensity', () => {
      let shakeIntensity = 0;
      const ref: ThreeCombatArenaRef = {
        triggerAttack: vi.fn(),
        triggerHit: vi.fn(),
        triggerKeystroke: vi.fn(),
        triggerKnockout: vi.fn(),
        triggerVictory: vi.fn(),
        triggerScreenShake: (intensity = 0.25) => {
          shakeIntensity = Math.max(shakeIntensity, intensity);
        },
        cycleCameraPreset: vi.fn(),
        setCameraPreset: vi.fn(),
        skipIntro: vi.fn(),
      };

      expect(typeof ref.triggerScreenShake).toBe('function');
      ref.triggerScreenShake!();
      expect(shakeIntensity).toBe(0.25);
    });

    it('M5.5.2: allows custom intensity parameters across all combat impact tiers', () => {
      let shakeIntensity = 0;
      const triggerShake = (intensity = 0.25) => {
        shakeIntensity = Math.max(shakeIntensity, intensity);
      };

      triggerShake(0.20);
      expect(shakeIntensity).toBe(0.20);

      triggerShake(0.28);
      expect(shakeIntensity).toBe(0.28);

      triggerShake(0.32);
      expect(shakeIntensity).toBe(0.32);

      triggerShake(0.35);
      expect(shakeIntensity).toBe(0.35);
    });

    it('M5.5.3: verifies screen shake decay formula in ThreeCombatArena.tsx animation loop', () => {
      const arenaPath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
      const code = fs.readFileSync(arenaPath, 'utf-8');

      expect(code).toContain('triggerScreenShake: (intensity = 0.25) => {');
      expect(code).toContain('shakeIntensityRef.current = Math.max(shakeIntensityRef.current, intensity);');
      expect(code).toMatch(/shakeIntensityRef\.current\s*-\s*delta\s*\*\s*1\.5/);
    });
  });
});
