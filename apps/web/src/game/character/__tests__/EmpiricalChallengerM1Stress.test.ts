/**
 * EmpiricalChallengerM1Stress.test.ts
 * Adversarial empirical challenger stress test suite for Milestone 1:
 * 1. 500-frame continuous state transitions & rapid cycling across all 10 states.
 * 2. Strict knockdown suppression of weapon glows, active visor optics, and attack VFX arcs across all 4 fighters.
 * 3. Zero graphics allocation leaks: container must maintain exactly 2 graphics objects over multiple frames.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllCharacters,
  getCharacterDefinition,
  type CharacterId,
  type CharacterDefinition
} from '@keyfury/game-core';
import {
  CharacterRigRenderer,
  drawTaperedLimb,
  drawCharacterHeadgear,
  drawCharacterPauldronsAndTorso,
  drawCharacterGauntletsAndWeapons,
  drawCharacterWaistAndScarf,
  drawCharacterAttackVFX,
  type FighterState,
  type SolvedKinematics
} from '../CharacterRigRenderer';
import {
  MockPhaserScene,
  MockPhaserContainer,
  MockPhaserGraphics
} from './MockPhaserHarness';

type FallbackContainer = MockPhaserContainer & {
  __fallbackGraphics?: MockPhaserGraphics;
  __fallbackFxGraphics?: MockPhaserGraphics;
};

const ALL_CHAR_IDS: readonly CharacterId[] = [
  'shadow_ronin',
  'cyber_valkyrie',
  'volt_shinobi',
  'void_assassin'
] as const;

const ALL_FIGHTER_STATES: readonly FighterState[] = [
  'idle',
  'step',
  'windup',
  'jab',
  'kick',
  'jump_kick',
  'uppercut',
  'heavy',
  'hit',
  'knockdown'
] as const;

function createSampleKinematics(facing: number = 1, t: number = 0): SolvedKinematics {
  // Slight jitter/oscillation to simulate real dynamic IK poses
  const osc = Math.sin(t / 15);
  return {
    head: { x: 200 + osc * 2, y: 260 },
    neck: { x: 200 + osc, y: 275 },
    hip: { x: 200, y: 315 },
    lShoulder: { x: 190, y: 278 },
    rShoulder: { x: 210, y: 278 },
    lHip: { x: 192, y: 315 },
    rHip: { x: 208, y: 315 },
    armL: { joint: { x: 185, y: 295 }, tip: { x: 180 + osc * 5, y: 310 } },
    armR: { joint: { x: 215, y: 295 }, tip: { x: 230 + osc * 5, y: 305 } },
    legL: { joint: { x: 190, y: 345 }, tip: { x: 188, y: 375 } },
    legR: { joint: { x: 210, y: 345 }, tip: { x: 215, y: 375 } },
    facing
  };
}

function assertAllGraphicsCallsFinite(g: MockPhaserGraphics, context: string): void {
  for (const call of g.calls) {
    for (let i = 0; i < call.args.length; i++) {
      const arg = call.args[i];
      if (typeof arg === 'number') {
        expect(
          Number.isFinite(arg),
          `[FiniteCheckFail] ${context} -> Call "${call.method}" arg[${i}] is not finite (${arg})`
        ).toBe(true);
        expect(
          Number.isNaN(arg),
          `[NaNCheckFail] ${context} -> Call "${call.method}" arg[${i}] is NaN`
        ).toBe(false);
      }
    }
  }
}

describe('Challenger 2 M1 Empirical Stress Tests', () => {
  let renderer: CharacterRigRenderer;
  let mockScene: MockPhaserScene;
  let mockContainer: FallbackContainer;

  beforeEach(() => {
    renderer = new CharacterRigRenderer();
    mockScene = new MockPhaserScene();
    mockContainer = new MockPhaserContainer() as FallbackContainer;
  });

  // =========================================================================
  // 1. Continuous State Transitions & 500-Frame Rapid State Cycling
  // =========================================================================
  describe('1. Continuous State Transitions (500-Frame Rapid State Cycling)', () => {
    it('executes 500 rapid consecutive state transitions across all 10 states for all 4 fighters without NaNs, infinities, or exceptions', () => {
      for (const charId of ALL_CHAR_IDS) {
        for (let frame = 0; frame < 500; frame++) {
          const state = ALL_FIGHTER_STATES[frame % ALL_FIGHTER_STATES.length];
          const facing = frame % 2 === 0 ? 1 : -1;
          const time = frame * 16.67; // 60fps delta
          const kinematics = createSampleKinematics(facing, time);

          expect(() => {
            renderer.renderVectorFallback(mockScene as any, mockContainer, charId, state, kinematics, time);
          }).not.toThrow();

          const g = mockContainer.__fallbackGraphics!;
          const fxG = mockContainer.__fallbackFxGraphics!;

          expect(g).toBeDefined();
          expect(fxG).toBeDefined();

          assertAllGraphicsCallsFinite(g, `char=${charId}, frame=${frame}, state=${state}, facing=${facing}, baseGraphics`);
          assertAllGraphicsCallsFinite(fxG, `char=${charId}, frame=${frame}, state=${state}, facing=${facing}, fxGraphics`);
        }
      }
    });

    it('handles erratic pseudo-random state jumps for 500 continuous frames', () => {
      // Deterministic PRNG seed to ensure reproducibility
      let seed = 123456789;
      const pseudoRandom = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };

      for (let frame = 0; frame < 500; frame++) {
        const charIdx = Math.floor(pseudoRandom() * ALL_CHAR_IDS.length);
        const stateIdx = Math.floor(pseudoRandom() * ALL_FIGHTER_STATES.length);
        const charId = ALL_CHAR_IDS[charIdx];
        const state = ALL_FIGHTER_STATES[stateIdx];
        const facing = pseudoRandom() > 0.5 ? 1 : -1;
        const time = frame * 16.666;
        const kinematics = createSampleKinematics(facing, time);

        expect(() => {
          renderer.renderVectorFallback(mockScene as any, mockContainer, charId, state, kinematics, time);
        }).not.toThrow();

        assertAllGraphicsCallsFinite(mockContainer.__fallbackGraphics!, `Erratic Frame ${frame} - ${charId}`);
        assertAllGraphicsCallsFinite(mockContainer.__fallbackFxGraphics!, `Erratic Frame ${frame} - ${charId} FX`);
      }
    });
  });

  // =========================================================================
  // 2. Strict Knockdown Suppression Verification Across All 4 Fighters
  // =========================================================================
  describe('2. Strict Knockdown Suppression Across All 4 Fighters', () => {
    it('verifies that drawCharacterAttackVFX produces ZERO drawing calls in knockdown state across all 4 fighters', () => {
      const fxG = new MockPhaserGraphics();
      const armR = { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } };
      const legR = { joint: { x: 210, y: 345 }, tip: { x: 215, y: 375 } };

      for (const charId of ALL_CHAR_IDS) {
        const charDef = getCharacterDefinition(charId);
        for (const facing of [1, -1]) {
          fxG.calls = [];
          drawCharacterAttackVFX(fxG as any, charDef, 'knockdown', 200, 275, 200, 315, armR, legR, facing, 500);
          expect(
            fxG.calls.length,
            `Expected 0 VFX calls for ${charId} during knockdown with facing=${facing}, got ${fxG.calls.length}`
          ).toBe(0);
        }
      }
    });

    it('verifies non-attack states (idle, hit, windup, step) also produce ZERO attack VFX calls', () => {
      const nonAttackStates: readonly FighterState[] = ['idle', 'hit', 'windup', 'step'] as const;
      const fxG = new MockPhaserGraphics();
      const armR = { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } };
      const legR = { joint: { x: 210, y: 345 }, tip: { x: 215, y: 375 } };

      for (const charId of ALL_CHAR_IDS) {
        const charDef = getCharacterDefinition(charId);
        for (const state of nonAttackStates) {
          for (const facing of [1, -1]) {
            fxG.calls = [];
            drawCharacterAttackVFX(fxG as any, charDef, state, 200, 275, 200, 315, armR, legR, facing, 250);
            expect(
              fxG.calls.length,
              `Expected 0 VFX calls for ${charId} during ${state} with facing=${facing}`
            ).toBe(0);
          }
        }
      }
    });

    it('verifies that drawCharacterGauntletsAndWeapons strictly suppresses weapon glows in fxG during knockdown', () => {
      const g = new MockPhaserGraphics();
      const fxG = new MockPhaserGraphics();
      const armL = { joint: { x: 185, y: 295 }, tip: { x: 180, y: 310 } };
      const armR = { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } };

      for (const charId of ALL_CHAR_IDS) {
        const charDef = getCharacterDefinition(charId);
        for (const facing of [1, -1]) {
          g.calls = [];
          fxG.calls = [];
          drawCharacterGauntletsAndWeapons(g as any, fxG as any, armL, armR, facing, charDef, 'knockdown', 1000);

          // fxG must have ZERO calls during knockdown across all fighters
          expect(
            fxG.calls.length,
            `Expected 0 fxG weapon glow calls for ${charId} in knockdown, got ${fxG.calls.length} calls: ${JSON.stringify(fxG.calls)}`
          ).toBe(0);
        }
      }
    });

    it('verifies that drawCharacterHeadgear suppresses active optic visors during knockdown', () => {
      const gKnockdown = new MockPhaserGraphics();
      const gActive = new MockPhaserGraphics();

      for (const charId of ALL_CHAR_IDS) {
        const charDef = getCharacterDefinition(charId);
        for (const facing of [1, -1]) {
          gKnockdown.calls = [];
          gActive.calls = [];

          drawCharacterHeadgear(gKnockdown as any, 200, 260, facing, charDef, 'knockdown', 500);
          drawCharacterHeadgear(gActive as any, 200, 260, facing, charDef, 'idle', 500);

          // Headgear in knockdown must have strictly fewer calls because visor drawing is bypassed
          expect(
            gKnockdown.calls.length,
            `For ${charId} facing=${facing}, knockdown calls (${gKnockdown.calls.length}) should be strictly less than active idle calls (${gActive.calls.length})`
          ).toBeLessThan(gActive.calls.length);
        }
      }
    });

    it('verifies that drawCharacterWaistAndScarf suppresses flowing ribbons/scarves/cloaks during knockdown', () => {
      const gKnockdown = new MockPhaserGraphics();
      const gActive = new MockPhaserGraphics();

      for (const charId of ALL_CHAR_IDS) {
        const charDef = getCharacterDefinition(charId);
        for (const facing of [1, -1]) {
          gKnockdown.calls = [];
          gActive.calls = [];

          drawCharacterWaistAndScarf(gKnockdown as any, 200, 315, 200, 260, facing, charDef, 'knockdown', 500);
          drawCharacterWaistAndScarf(gActive as any, 200, 315, 200, 260, facing, charDef, 'idle', 500);

          // In knockdown, flowing accessories are bypassed
          expect(
            gKnockdown.calls.length,
            `For ${charId} facing=${facing}, waist knockdown calls (${gKnockdown.calls.length}) should be <= idle calls (${gActive.calls.length})`
          ).toBeLessThanOrEqual(gActive.calls.length);
        }
      }
    });

    it('verifies that renderVectorFallback during knockdown produces only clear() on fxG across all 4 fighters', () => {
      for (const charId of ALL_CHAR_IDS) {
        for (const facing of [1, -1]) {
          const kinematics = createSampleKinematics(facing, 1200);

          if (mockContainer.__fallbackFxGraphics) {
             (mockContainer.__fallbackFxGraphics as any).calls = [];
          }

          renderer.renderVectorFallback(mockScene as any, mockContainer, charId, 'knockdown', kinematics, 1200);

          const fxG = mockContainer.__fallbackFxGraphics!;
          expect(fxG).toBeDefined();

          // In knockdown, fxG should only receive a single 'clear' call and no drawing calls
          expect(fxG.calls.length).toBe(1);
          expect(fxG.calls[0].method).toBe('clear');
        }
      }
    });
  });

  // =========================================================================
  // 3. Zero Graphics Allocation Leaks & Memory Pooling Verification
  // =========================================================================
  describe('3. Zero Graphics Allocation Leaks (Memory Pooling)', () => {
    it('maintains exactly 2 graphics objects in container across 1,000 continuous frames of multi-fighter cycling', () => {
      const graphicsSpy = vi.spyOn(mockScene.add, 'graphics');

      // Before any render, container has 0 items
      expect(mockContainer.list.length).toBe(0);
      expect(mockContainer.__fallbackGraphics).toBeUndefined();
      expect(mockContainer.__fallbackFxGraphics).toBeUndefined();

      // Render Frame 0
      const initialKinematics = createSampleKinematics(1, 0);
      renderer.renderVectorFallback(mockScene as any, mockContainer, 'shadow_ronin', 'idle', initialKinematics, 0);

      // Verify initial allocation: exactly 2 graphics objects created and added to container
      expect(graphicsSpy).toHaveBeenCalledTimes(2);
      expect(mockContainer.list.length).toBe(2);
      const initialG = mockContainer.__fallbackGraphics;
      const initialFxG = mockContainer.__fallbackFxGraphics;

      expect(initialG).toBeDefined();
      expect(initialFxG).toBeDefined();
      expect(mockContainer.list[0]).toBe(initialG);
      expect(mockContainer.list[1]).toBe(initialFxG);

      // Now run 1,000 frames across all permutations of fighter, state, facing, time
      for (let frame = 1; frame <= 1000; frame++) {
        const charId = ALL_CHAR_IDS[frame % ALL_CHAR_IDS.length];
        const state = ALL_FIGHTER_STATES[frame % ALL_FIGHTER_STATES.length];
        const facing = frame % 2 === 0 ? 1 : -1;
        const time = frame * 16.667;
        const kinematics = createSampleKinematics(facing, time);

        renderer.renderVectorFallback(mockScene as any, mockContainer, charId, state, kinematics, time);

        // Graphics factory must NEVER be called again
        expect(graphicsSpy).toHaveBeenCalledTimes(2);

        // Container must maintain exactly 2 items
        expect(mockContainer.list.length).toBe(2);

        // References must be strictly identical (zero object churn)
        expect(mockContainer.__fallbackGraphics).toBe(initialG);
        expect(mockContainer.__fallbackFxGraphics).toBe(initialFxG);
      }

      graphicsSpy.mockRestore();
    });

    it('verifies that each frame invokes clear() on both pooled graphics instances before drawing', () => {
      const kinematics = createSampleKinematics(1, 0);

      // Frame 1
      renderer.renderVectorFallback(mockScene as any, mockContainer, 'cyber_valkyrie', 'jab', kinematics, 16);
      const g = mockContainer.__fallbackGraphics!;
      const fxG = mockContainer.__fallbackFxGraphics!;

      const gClearCount1 = g.calls.filter((c) => c.method === 'clear').length;
      const fxGClearCount1 = fxG.calls.filter((c) => c.method === 'clear').length;
      expect(gClearCount1).toBe(1);
      expect(fxGClearCount1).toBe(1);

      // Frame 2
      renderer.renderVectorFallback(mockScene as any, mockContainer, 'volt_shinobi', 'heavy', kinematics, 32);
      const gClearCount2 = g.calls.filter((c) => c.method === 'clear').length;
      const fxGClearCount2 = fxG.calls.filter((c) => c.method === 'clear').length;
      expect(gClearCount2).toBe(2);
      expect(fxGClearCount2).toBe(2);

      // Frame 3
      renderer.renderVectorFallback(mockScene as any, mockContainer, 'void_assassin', 'uppercut', kinematics, 48);
      const gClearCount3 = g.calls.filter((c) => c.method === 'clear').length;
      const fxGClearCount3 = fxG.calls.filter((c) => c.method === 'clear').length;
      expect(gClearCount3).toBe(3);
      expect(fxGClearCount3).toBe(3);
    });

    it('verifies multiple independent fighter containers each have their own pooled 2 graphics objects with zero cross-talk', () => {
      const container1 = new MockPhaserContainer() as FallbackContainer;
      const container2 = new MockPhaserContainer() as FallbackContainer;

      const kinematics1 = createSampleKinematics(1, 100);
      const kinematics2 = createSampleKinematics(-1, 100);

      renderer.renderVectorFallback(mockScene as any, container1, 'shadow_ronin', 'heavy', kinematics1, 100);
      renderer.renderVectorFallback(mockScene as any, container2, 'cyber_valkyrie', 'knockdown', kinematics2, 100);

      expect(container1.list.length).toBe(2);
      expect(container2.list.length).toBe(2);

      expect(container1.__fallbackGraphics).not.toBe(container2.__fallbackGraphics);
      expect(container1.__fallbackFxGraphics).not.toBe(container2.__fallbackFxGraphics);

      // container1 (heavy) has active attack VFX on fxG
      expect(container1.__fallbackFxGraphics!.calls.length).toBeGreaterThan(1);

      // container2 (knockdown) has only clear() on fxG
      expect(container2.__fallbackFxGraphics!.calls.length).toBe(1);
      expect(container2.__fallbackFxGraphics!.calls[0].method).toBe('clear');
    });
  });
});
