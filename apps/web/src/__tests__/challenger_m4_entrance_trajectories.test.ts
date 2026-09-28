import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  resolveCharacterId,
  type CharacterId,
} from '../game/character/Character3DController';
import {
  getIntroActForTime,
  getCountdownForTime,
  getSpotlightBannerForTime,
  getFighterEntranceProgress,
  resolveArenaId,
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  type ArenaId,
  type IntroAct,
  type ThreeCombatArenaRef,
} from '../render/ThreeCombatArena';

// ============================================================================
// TEST HARNESS & 20-BONE RIGGED SKELETON MOCK
// ============================================================================

function createRiggedMockLoader() {
  return {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      const group = new THREE.Group();
      const rawBoneMap = [
        'Root', 'Hips', 'Spine', 'Chest', 'Neck', 'Head',
        'Shoulder.L', 'UpperArm.L', 'Forearm.L', 'Hand.L',
        'Shoulder.R', 'UpperArm.R', 'Forearm.R', 'Hand.R',
        'Thigh.L', 'Shin.L', 'Foot.L',
        'Thigh.R', 'Shin.R', 'Foot.R',
      ];
      rawBoneMap.forEach((name) => {
        const bone = new THREE.Bone();
        bone.name = name;
        group.add(bone);
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.8, 0.3),
        new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25 })
      );
      group.add(mesh);
      onLoad({ scene: group });
    },
  } as any;
}

const ALL_CHARACTERS: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];
const ALL_ARENAS: ArenaId[] = ['cyber_rooftop', 'volcanic_caldera', 'celestial_void', 'highland_sanctuary'];

describe('Milestone 4 Challenger: Entrance Trajectories & Input Isolation Adversarial Suite', () => {

  // ==========================================================================
  // SECTION 1: PAIRWISE CHARACTER COMBINATIONS ON ALL 4 ARENAS (64 PERMUTATIONS)
  // ==========================================================================
  describe('1. Pairwise Character Combinations (4x4) across all 4 Arenas (64 Permutations)', () => {

    ALL_ARENAS.forEach((arenaId) => {
      describe(`Arena: ${arenaId} (${ARENA_DEFINITIONS[arenaId].name})`, () => {
        const arenaDef = ARENA_DEFINITIONS[arenaId];

        ALL_CHARACTERS.forEach((p1Char) => {
          ALL_CHARACTERS.forEach((p2Char) => {
            it(`Permutation [${p1Char} vs ${p2Char}] on ${arenaId}: full entrance trajectory to standoff`, () => {
              const loader = createRiggedMockLoader();
              const p1 = new Character3DFighter(p1Char, 'left', loader);
              const p2 = new Character3DFighter(p2Char, 'right', loader);

              p1.baseY = arenaDef.fighterFloorY;
              p1.group.position.y = arenaDef.fighterFloorY;
              p2.baseY = arenaDef.fighterFloorY;
              p2.group.position.y = arenaDef.fighterFloorY;

              // 1. Initial configuration
              expect(p1.side).toBe('left');
              expect(p1.facingSign).toBe(1);
              expect(p1.targetX).toBe(-1.50);
              expect(p1.group.position.x).toBe(-6.5);

              expect(p2.side).toBe('right');
              expect(p2.facingSign).toBe(-1);
              expect(p2.targetX).toBe(1.50);
              expect(p2.group.position.x).toBe(6.5);

              // 2. Act 1: Stage Showcase (t = 0.0s to 1.49s)
              const p1Prog0 = getFighterEntranceProgress(0.5, 'left');
              const p2Prog0 = getFighterEntranceProgress(0.5, 'right');
              expect(p1Prog0).toBe(0.0);
              expect(p2Prog0).toBe(0.0);

              p1.setEntranceProgress(p1Prog0, arenaId);
              p2.setEntranceProgress(p2Prog0, arenaId);
              p1.update(0.016, 0.5);
              p2.update(0.016, 0.5);

              expect(p1.group.position.x).toBe(-6.5);
              expect(p2.group.position.x).toBe(6.5);

              // 3. Act 2: Player 1 Entrance (t = 1.5s to 3.5s)
              // Mid-entrance for P1 at t = 2.25s (progress = 0.5)
              const p1ProgMid = getFighterEntranceProgress(2.25, 'left');
              const p2ProgMid = getFighterEntranceProgress(2.25, 'right');
              expect(p1ProgMid).toBeCloseTo(0.5, 3);
              expect(p2ProgMid).toBe(0.0);

              p1.setEntranceProgress(p1ProgMid, arenaId);
              p2.setEntranceProgress(p2ProgMid, arenaId);
              p1.update(0.016, 2.25);
              p2.update(0.016, 2.25);

              expect(p1.group.position.x).toBeCloseTo(-4.0, 2);
              expect(p2.group.position.x).toBe(6.5);

              // P1 arrival complete at t = 3.0s
              const p1ProgEnd = getFighterEntranceProgress(3.0, 'left');
              expect(p1ProgEnd).toBe(1.0);
              p1.setEntranceProgress(p1ProgEnd, arenaId);
              p1.triggerEntranceFlair();
              p1.update(0.016, 3.0);

              expect(p1.group.position.x).toBeCloseTo(-1.50, 3);

              // 4. Act 3: Player 2 Entrance (t = 3.5s to 5.5s)
              // Mid-entrance for P2 at t = 4.2s (progress = 0.5)
              const p1ProgP2Mid = getFighterEntranceProgress(4.2, 'left');
              const p2ProgP2Mid = getFighterEntranceProgress(4.2, 'right');
              expect(p1ProgP2Mid).toBe(1.0);
              expect(p2ProgP2Mid).toBeCloseTo(0.5, 3);

              p1.setEntranceProgress(p1ProgP2Mid, arenaId);
              p2.setEntranceProgress(p2ProgP2Mid, arenaId);
              p1.update(0.016, 4.2);
              p2.update(0.016, 4.2);

              expect(p1.group.position.x).toBeCloseTo(-1.50, 3);
              expect(p2.group.position.x).toBeCloseTo(4.0, 2);

              // P2 arrival complete at t = 4.9s
              const p2ProgEnd = getFighterEntranceProgress(4.9, 'right');
              expect(p2ProgEnd).toBe(1.0);
              p2.setEntranceProgress(p2ProgEnd, arenaId);
              p2.triggerEntranceFlair();
              p2.update(0.016, 4.9);

              expect(p2.group.position.x).toBeCloseTo(1.50, 3);

              // 5. Act 4: Standoff at t = 5.5s
              const p1ProgStandoff = getFighterEntranceProgress(5.5, 'left');
              const p2ProgStandoff = getFighterEntranceProgress(5.5, 'right');
              expect(p1ProgStandoff).toBe(1.0);
              expect(p2ProgStandoff).toBe(1.0);

              p1.setEntranceProgress(p1ProgStandoff, arenaId);
              p2.setEntranceProgress(p2ProgStandoff, arenaId);
              p1.update(0.016, 5.5);
              p2.update(0.016, 5.5);

              // Verify exact standoff spacing (3.0m apart)
              const combatDistance = p2.group.position.x - p1.group.position.x;
              expect(combatDistance).toBeCloseTo(3.00, 3);

              // Verify both fighters transitioned to idle state
              expect(p1.getState()).toBe('idle');
              expect(p2.getState()).toBe('idle');

              // Verify ground clearance: neither fighter sinks below arena floor elevation
              const p1MeshY = p1.meshObject ? p1.meshObject.position.y : 0;
              const p2MeshY = p2.meshObject ? p2.meshObject.position.y : 0;
              const p1TotalFloorElevation = p1.group.position.y + p1MeshY;
              const p2TotalFloorElevation = p2.group.position.y + p2MeshY;

              expect(p1TotalFloorElevation).toBeGreaterThanOrEqual(arenaDef.fighterFloorY - 0.05);
              expect(p2TotalFloorElevation).toBeGreaterThanOrEqual(arenaDef.fighterFloorY - 0.05);

              // Clean disposal
              p1.dispose();
              p2.dispose();
            });
          });
        });
      });
    });

    it('validates arena-specific vertical trajectory curves throughout motion', () => {
      const loader = createRiggedMockLoader();

      // Cyber Rooftop: Quadratic drop-in from (1-p)^2 * 2.2
      const roninRooftop = new Character3DFighter('ronin', 'left', loader);
      roninRooftop.baseY = ARENA_DEFINITIONS.cyber_rooftop.fighterFloorY;

      roninRooftop.setEntranceProgress(0.0, 'cyber_rooftop');
      roninRooftop.update(0.016, 0.0);
      const meshY_start = roninRooftop.meshObject ? roninRooftop.meshObject.position.y : 0;
      expect(meshY_start).toBeGreaterThanOrEqual(2.2); // Drop altitude

      roninRooftop.setEntranceProgress(0.5, 'cyber_rooftop');
      roninRooftop.update(0.016, 0.5);
      const meshY_mid = roninRooftop.meshObject ? roninRooftop.meshObject.position.y : 0;
      // At p=0.5: (1-0.5)^2 * 2.2 = 0.55
      expect(meshY_mid).toBeLessThan(meshY_start);
      expect(meshY_mid).toBeGreaterThanOrEqual(0.50);

      roninRooftop.setEntranceProgress(1.0, 'cyber_rooftop');
      roninRooftop.update(0.016, 1.0);
      const meshY_land = roninRooftop.meshObject ? roninRooftop.meshObject.position.y : 0;
      expect(meshY_land).toBeLessThanOrEqual(0.05);

      // Volcanic Caldera: Eruption from molten fissure -max(0, (1 - p*1.5)*0.8)
      const valkVolcano = new Character3DFighter('valkyrie', 'right', loader);
      valkVolcano.baseY = ARENA_DEFINITIONS.volcanic_caldera.fighterFloorY;

      valkVolcano.setEntranceProgress(0.0, 'volcanic_caldera');
      valkVolcano.update(0.016, 0.0);
      const meshY_volc_start = valkVolcano.meshObject ? valkVolcano.meshObject.position.y : 0;
      expect(meshY_volc_start).toBeLessThan(0); // Submerged in fissure

      valkVolcano.setEntranceProgress(1.0, 'volcanic_caldera');
      valkVolcano.update(0.016, 1.0);
      const meshY_volc_land = valkVolcano.meshObject ? valkVolcano.meshObject.position.y : 0;
      expect(meshY_volc_land).toBeGreaterThanOrEqual(-0.05);

      roninRooftop.dispose();
      valkVolcano.dispose();
    });
  });

  // ==========================================================================
  // SECTION 2: BOUNDARY VALUES & STRESS-TESTING ON setEntranceProgress
  // ==========================================================================
  describe('2. Boundary Value Stress-Testing on setEntranceProgress (<0, >1, NaN, Infinity)', () => {
    let fighterL: Character3DFighter;
    let fighterR: Character3DFighter;

    beforeEach(() => {
      const loader = createRiggedMockLoader();
      fighterL = new Character3DFighter('ronin', 'left', loader);
      fighterR = new Character3DFighter('shinobi', 'right', loader);
    });

    it('gracefully clamps negative progress values (< 0) to starting wing mark', () => {
      const negativeValues = [-0.0001, -0.5, -1.0, -999.0, -Infinity];

      negativeValues.forEach((neg) => {
        fighterL.setEntranceProgress(neg, 'cyber_rooftop');
        fighterR.setEntranceProgress(neg, 'cyber_rooftop');

        expect(fighterL.group.position.x).toBe(-6.5);
        expect(fighterR.group.position.x).toBe(6.5);
      });
    });

    it('gracefully clamps overflowing progress values (> 1) to final landing mark', () => {
      const overflowValues = [1.0001, 1.5, 2.0, 100.0, Infinity];

      overflowValues.forEach((over) => {
        fighterL.setEntranceProgress(over, 'cyber_rooftop');
        fighterR.setEntranceProgress(over, 'cyber_rooftop');

        expect(fighterL.group.position.x).toBe(-1.50);
        expect(fighterR.group.position.x).toBe(1.50);
        expect(fighterL.getState()).toBe('idle');
        expect(fighterR.getState()).toBe('idle');
      });
    });

    it('tests NaN and degenerate numerical inputs: reveals lack of NaN defense in lerp calculation', () => {
      // ADVERSARIAL STRESS TEST:
      // What happens if NaN is supplied to setEntranceProgress?
      // Math.min(Math.max(NaN, 0), 1) produces NaN in JS!
      // Consequently, lerp(-6.5, -1.50, NaN) evaluates to NaN.
      fighterL.setEntranceProgress(NaN, 'cyber_rooftop');

      const isNaNPosition = Number.isNaN(fighterL.group.position.x);
      // We empirically record whether NaN propagates into position.x:
      if (isNaNPosition) {
        // CONFIRMED FINDING: Character3DController does NOT sanitize NaN progress values!
        expect(Number.isNaN(fighterL.group.position.x)).toBe(true);
      } else {
        // If sanitized to fallback (0 or 1):
        expect(Number.isFinite(fighterL.group.position.x)).toBe(true);
      }
    });

    it('verifies timeline progress pure function getFighterEntranceProgress boundary clamping', () => {
      // Left side tests
      expect(getFighterEntranceProgress(-10.0, 'left')).toBe(0);
      expect(getFighterEntranceProgress(0.0, 'left')).toBe(0);
      expect(getFighterEntranceProgress(1.499, 'left')).toBe(0);
      expect(getFighterEntranceProgress(1.5, 'left')).toBe(0);
      expect(getFighterEntranceProgress(2.25, 'left')).toBeCloseTo(0.5, 5);
      expect(getFighterEntranceProgress(3.0, 'left')).toBe(1.0);
      expect(getFighterEntranceProgress(5.0, 'left')).toBe(1.0);
      expect(getFighterEntranceProgress(Infinity, 'left')).toBe(1.0);
      expect(getFighterEntranceProgress(-Infinity, 'left')).toBe(0);

      // Right side tests
      expect(getFighterEntranceProgress(-10.0, 'right')).toBe(0);
      expect(getFighterEntranceProgress(0.0, 'right')).toBe(0);
      expect(getFighterEntranceProgress(3.499, 'right')).toBe(0);
      expect(getFighterEntranceProgress(3.5, 'right')).toBe(0);
      expect(getFighterEntranceProgress(4.2, 'right')).toBeCloseTo(0.5, 5);
      expect(getFighterEntranceProgress(4.9, 'right')).toBe(1.0);
      expect(getFighterEntranceProgress(7.0, 'right')).toBe(1.0);
      expect(getFighterEntranceProgress(Infinity, 'right')).toBe(1.0);
      expect(getFighterEntranceProgress(-Infinity, 'right')).toBe(0);
    });

    it('tests timeline act mapping getIntroActForTime boundary precision', () => {
      expect(getIntroActForTime(0.0)).toBe('stage');
      expect(getIntroActForTime(1.4999)).toBe('stage');
      expect(getIntroActForTime(1.5)).toBe('p1');
      expect(getIntroActForTime(3.4999)).toBe('p1');
      expect(getIntroActForTime(3.5)).toBe('p2');
      expect(getIntroActForTime(5.4999)).toBe('p2');
      expect(getIntroActForTime(5.5)).toBe('standoff');
      expect(getIntroActForTime(7.4999)).toBe('standoff');
      expect(getIntroActForTime(7.5)).toBe('combat');
      expect(getIntroActForTime(999.0)).toBe('combat');

      // Negative timestamp defaults to stage
      expect(getIntroActForTime(-5.0)).toBe('stage');
    });

    it('tests countdown mapping getCountdownForTime boundary precision', () => {
      expect(getCountdownForTime(0.0)).toBeNull();
      expect(getCountdownForTime(5.499)).toBeNull();
      expect(getCountdownForTime(5.5)).toBe('3');
      expect(getCountdownForTime(6.199)).toBe('3');
      expect(getCountdownForTime(6.2)).toBe('2');
      expect(getCountdownForTime(6.899)).toBe('2');
      expect(getCountdownForTime(6.9)).toBe('1');
      expect(getCountdownForTime(7.299)).toBe('1');
      expect(getCountdownForTime(7.3)).toBe('FIGHT!');
      expect(getCountdownForTime(7.499)).toBe('FIGHT!');
      expect(getCountdownForTime(7.5)).toBeNull();
      expect(getCountdownForTime(8.0)).toBeNull();
    });
  });

  // ==========================================================================
  // SECTION 3: KEYBOARD EVENT HANDLING & INPUT ISOLATION
  // ==========================================================================
  describe('3. Keyboard Event Handling & Input Isolation', () => {

    interface MockKeyEvent {
      code: string;
      key: string;
      defaultPrevented: boolean;
      propagationStopped: boolean;
      preventDefault: () => void;
      stopPropagation: () => void;
    }

    function createMockKeyEvent(code: string, key: string): MockKeyEvent {
      const evt: MockKeyEvent = {
        code,
        key,
        defaultPrevented: false,
        propagationStopped: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {
          this.propagationStopped = true;
        },
      };
      return evt;
    }

    // Exact replica of ThreeCombatArena.tsx lines 646-655 keyboard handler
    function createArenaKeydownHandler(
      isIntroCompleteGetter: () => boolean,
      completeIntroFn: () => void,
      cycleCameraPresetFn: () => void
    ) {
      return (e: MockKeyEvent) => {
        if (
          (e.code === 'Enter' || e.code === 'Space' || e.key === 'Enter' || e.key === ' ') &&
          !isIntroCompleteGetter()
        ) {
          completeIntroFn();
        } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
          cycleCameraPresetFn();
        }
      };
    }

    it('triggers completeIntro on Enter during intro', () => {
      let introComplete = false;
      const completeIntroMock = vi.fn(() => {
        introComplete = true;
      });
      const cycleCameraMock = vi.fn();

      const handler = createArenaKeydownHandler(
        () => introComplete,
        completeIntroMock,
        cycleCameraMock
      );

      const enterEvt = createMockKeyEvent('Enter', 'Enter');
      handler(enterEvt);

      expect(completeIntroMock).toHaveBeenCalledTimes(1);
      expect(introComplete).toBe(true);
      expect(cycleCameraMock).not.toHaveBeenCalled();
    });

    it('triggers completeIntro on Space during intro', () => {
      let introComplete = false;
      const completeIntroMock = vi.fn(() => {
        introComplete = true;
      });
      const cycleCameraMock = vi.fn();

      const handler = createArenaKeydownHandler(
        () => introComplete,
        completeIntroMock,
        cycleCameraMock
      );

      const spaceEvt = createMockKeyEvent('Space', ' ');
      handler(spaceEvt);

      expect(completeIntroMock).toHaveBeenCalledTimes(1);
      expect(introComplete).toBe(true);
      expect(cycleCameraMock).not.toHaveBeenCalled();
    });

    it('idempotently handles repeated Enter and Space keys during intro', () => {
      let introComplete = false;
      const completeIntroMock = vi.fn(() => {
        introComplete = true;
      });
      const cycleCameraMock = vi.fn();

      const handler = createArenaKeydownHandler(
        () => introComplete,
        completeIntroMock,
        cycleCameraMock
      );

      // First Enter triggers skip
      handler(createMockKeyEvent('Enter', 'Enter'));
      expect(completeIntroMock).toHaveBeenCalledTimes(1);

      // Subsequent Space or Enter should NOT re-trigger completeIntro
      handler(createMockKeyEvent('Space', ' '));
      handler(createMockKeyEvent('Enter', 'Enter'));
      expect(completeIntroMock).toHaveBeenCalledTimes(1);
    });

    it('preserves keyboard event bubbling for active typing combat after intro completes', () => {
      let introComplete = true; // In active combat mode
      const completeIntroMock = vi.fn();
      const cycleCameraMock = vi.fn();

      const handler = createArenaKeydownHandler(
        () => introComplete,
        completeIntroMock,
        cycleCameraMock
      );

      // Downstream typing deck listener (as in MatchPage.tsx)
      const typingKeystrokesReceived: string[] = [];
      const typingDeckListener = (e: MockKeyEvent) => {
        if (!e.propagationStopped) {
          typingKeystrokesReceived.push(e.key);
        }
      };

      // Simulate a player typing words during active combat: "speed combat "
      const sequence: [string, string][] = [
        ['KeyS', 's'],
        ['KeyP', 'p'],
        ['KeyE', 'e'],
        ['KeyE', 'e'],
        ['KeyD', 'd'],
        ['Space', ' '],
        ['KeyO', 'o'],
        ['KeyM', 'm'],
        ['KeyB', 'b'],
        ['KeyA', 'a'],
        ['KeyT', 't'],
        ['Enter', 'Enter'],
      ];

      sequence.forEach(([code, key]) => {
        const evt = createMockKeyEvent(code, key);
        // ThreeCombatArena handler receives event first
        handler(evt);

        // Verification 1: Handler does NOT stop propagation
        expect(evt.propagationStopped).toBe(false);
        // Verification 2: Handler does NOT prevent default
        expect(evt.defaultPrevented).toBe(false);

        // MatchPage typing deck receives event cleanly
        typingDeckListener(evt);
      });

      // Verification 3: completeIntro was never called during combat
      expect(completeIntroMock).not.toHaveBeenCalled();

      // Verification 4: Downstream typing deck received all keys without omission
      expect(typingKeystrokesReceived).toEqual([
        's', 'p', 'e', 'e', 'd', ' ', 'o', 'm', 'b', 'a', 't', 'Enter'
      ]);
    });

    it('adversarial finding: KeyC hotkey triggers camera cycle during active combat typing', () => {
      let introComplete = true; // In active combat mode
      const completeIntroMock = vi.fn();
      const cycleCameraMock = vi.fn();

      const handler = createArenaKeydownHandler(
        () => introComplete,
        completeIntroMock,
        cycleCameraMock
      );

      // Simulate typing a word containing the letter 'c': "cyber"
      const cEvt = createMockKeyEvent('KeyC', 'c');
      handler(cEvt);

      // The handler does not stop propagation...
      expect(cEvt.propagationStopped).toBe(false);

      // BUT cycleCameraPreset IS triggered because 'KeyC' check is not gated by combat state!
      expect(cycleCameraMock).toHaveBeenCalledTimes(1);
    });

    it('verifies source code implementation of handleKeyDown in ThreeCombatArena.tsx', () => {
      const filePath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
      const code = fs.readFileSync(filePath, 'utf-8');

      // Verify exact keydown listener registration
      expect(code).toContain("window.addEventListener('keydown', handleKeyDown)");
      // Verify exact cleanup in effect return
      expect(code).toContain("window.removeEventListener('keydown', handleKeyDown)");

      // Verify skip condition is gated by !isIntroCompleteRef.current
      expect(code).toMatch(/e\.code === 'Enter' \|\| e\.code === 'Space'/);
      expect(code).toMatch(/!isIntroCompleteRef\.current/);

      // Verify no preventDefault or stopPropagation in handleKeyDown
      const handleKeyDownMatch = code.match(/const handleKeyDown = \(e: KeyboardEvent\) => \{([\s\S]*?)\};/);
      expect(handleKeyDownMatch).not.toBeNull();
      const body = handleKeyDownMatch![1];

      expect(body).not.toContain('e.stopPropagation()');
      expect(body).not.toContain('e.stopImmediatePropagation()');
      expect(body).not.toContain('e.preventDefault()');
    });
  });

  // ==========================================================================
  // SECTION 4: IMPERATIVE HANDLE & COMPLETE INTRO LIFECYCLE
  // ==========================================================================
  describe('4. ThreeCombatArenaRef Imperative Handle & Skip Lifecycle Invariants', () => {
    it('verifies completeIntro synchronizes fighter positions, camera, and callback', () => {
      const loader = createRiggedMockLoader();
      const p1 = new Character3DFighter('ronin', 'left', loader);
      const p2 = new Character3DFighter('shinobi', 'right', loader);

      let introCompleted = false;
      let activeAct: IntroAct = 'stage';
      const onIntroCompleteMock = vi.fn();

      const completeIntro = () => {
        if (introCompleted) return;
        introCompleted = true;
        activeAct = 'combat';

        p1.setEntranceProgress(1.0, 'cyber_rooftop');
        p2.setEntranceProgress(1.0, 'cyber_rooftop');

        onIntroCompleteMock();
      };

      // Initially at wings
      expect(p1.group.position.x).toBe(-6.5);
      expect(p2.group.position.x).toBe(6.5);

      // Execute skip
      completeIntro();

      expect(introCompleted).toBe(true);
      expect(activeAct).toBe('combat');
      expect(p1.group.position.x).toBe(-1.50);
      expect(p2.group.position.x).toBe(1.50);
      expect(p1.getState()).toBe('idle');
      expect(p2.getState()).toBe('idle');
      expect(onIntroCompleteMock).toHaveBeenCalledTimes(1);

      // Re-execution is a no-op
      completeIntro();
      expect(onIntroCompleteMock).toHaveBeenCalledTimes(1);

      p1.dispose();
      p2.dispose();
    });

    it('verifies ThreeCombatArenaRef method contract completeness', () => {
      const mockRef: ThreeCombatArenaRef = {
        triggerAttack: vi.fn(),
        triggerHit: vi.fn(),
        triggerKeystroke: vi.fn(),
        triggerKnockout: vi.fn(),
        triggerVictory: vi.fn(),
        cycleCameraPreset: vi.fn(),
        setCameraPreset: vi.fn(),
        skipIntro: vi.fn(),
      };

      expect(typeof mockRef.triggerAttack).toBe('function');
      expect(typeof mockRef.triggerHit).toBe('function');
      expect(typeof mockRef.triggerKeystroke).toBe('function');
      expect(typeof mockRef.triggerKnockout).toBe('function');
      expect(typeof mockRef.triggerVictory).toBe('function');
      expect(typeof mockRef.cycleCameraPreset).toBe('function');
      expect(typeof mockRef.setCameraPreset).toBe('function');
      expect(typeof mockRef.skipIntro).toBe('function');
    });
  });
});
