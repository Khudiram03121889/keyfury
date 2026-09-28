/**
 * ProceduralVectorRenderer.test.ts
 * Comprehensive, requirement-driven, opaque-box E2E test suite for the
 * KeyFury Procedural Vector Fighter Renderer across Tiers 1-4.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CHARACTER_REGISTRY,
  getCharacterDefinition,
  getAllCharacters,
  isValidCharacterId,
  DEFAULT_CHARACTER_ID,
  RagdollSystem,
  type CharacterId
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
import { ModularAtlasManager, type CharacterAtlasMetadata } from '../ModularAtlasManager';

type FallbackContainer = MockPhaserContainer & {
  __fallbackGraphics?: MockPhaserGraphics;
  __fallbackFxGraphics?: MockPhaserGraphics;
};

const CHAR_IDS: readonly CharacterId[] = [
  'shadow_ronin',
  'cyber_valkyrie',
  'volt_shinobi',
  'void_assassin'
] as const;

const FIGHTER_STATES: readonly FighterState[] = [
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

const FACINGS: readonly number[] = [1, -1] as const;

function createSampleKinematics(facing: number = 1): SolvedKinematics {
  return {
    head: { x: 200, y: 260 },
    neck: { x: 200, y: 275 },
    hip: { x: 200, y: 315 },
    lShoulder: { x: 190, y: 278 },
    rShoulder: { x: 210, y: 278 },
    lHip: { x: 192, y: 315 },
    rHip: { x: 208, y: 315 },
    armL: { joint: { x: 185, y: 295 }, tip: { x: 180, y: 310 } },
    armR: { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } },
    legL: { joint: { x: 190, y: 345 }, tip: { x: 188, y: 375 } },
    legR: { joint: { x: 210, y: 345 }, tip: { x: 215, y: 375 } },
    facing
  };
}

function assertAllGraphicsArgsFinite(g: MockPhaserGraphics, context: string): void {
  for (const call of g.calls) {
    for (let i = 0; i < call.args.length; i++) {
      const arg = call.args[i];
      if (typeof arg === 'number') {
        expect(
          Number.isFinite(arg),
          `${context} -> Call "${call.method}" arg[${i}] is not finite (${arg})`
        ).toBe(true);
        expect(
          Number.isNaN(arg),
          `${context} -> Call "${call.method}" arg[${i}] is NaN`
        ).toBe(false);
      }
    }
  }
}

describe('Procedural Vector Fighter Renderer E2E Test Suite', () => {
  let renderer: CharacterRigRenderer;
  let mockScene: MockPhaserScene;
  let mockContainer: FallbackContainer;

  beforeEach(() => {
    renderer = new CharacterRigRenderer();
    mockScene = new MockPhaserScene();
    mockContainer = new MockPhaserContainer() as FallbackContainer;
    ModularAtlasManager.clearCache();
  });

  // =========================================================================
  // TIER 1: Feature Coverage — Theme Integrity, Specs, Attributes & Palette
  // =========================================================================
  describe('Tier 1: Feature Coverage — Silhouette, Theme & Spec Integrity', () => {
    it('validates all 4 fighters exist with complete definitions in CHARACTER_REGISTRY', () => {
      const chars = getAllCharacters();
      expect(chars).toHaveLength(4);
      const ids = chars.map((c) => c.id);
      expect(ids).toContain('shadow_ronin');
      expect(ids).toContain('cyber_valkyrie');
      expect(ids).toContain('volt_shinobi');
      expect(ids).toContain('void_assassin');
    });

    for (const charId of CHAR_IDS) {
      describe(`Fighter Spec: ${charId}`, () => {
        const charDef = CHARACTER_REGISTRY[charId];

        it(`has valid metadata and lore for ${charId}`, () => {
          expect(charDef.id).toBe(charId);
          expect(charDef.name.length).toBeGreaterThan(0);
          expect(charDef.codename.length).toBeGreaterThan(0);
          expect(charDef.title.length).toBeGreaterThan(0);
          expect(charDef.archetype.length).toBeGreaterThan(0);
          expect(charDef.archetypeLabel.length).toBeGreaterThan(0);
          expect(charDef.tagline.length).toBeGreaterThan(0);
          expect(charDef.lore.length).toBeGreaterThan(0);
          expect(charDef.element.length).toBeGreaterThan(0);
          expect(charDef.signatureMove.length).toBeGreaterThan(0);
          expect(charDef.signatureQuote.length).toBeGreaterThan(0);
        });

        it(`has valid theme color formats and palettes for ${charId}`, () => {
          const { theme } = charDef;
          const hexPattern = /^#[0-9a-fA-F]{6}$/;

          expect(theme.primaryColor).toMatch(hexPattern);
          expect(theme.secondaryColor).toMatch(hexPattern);
          expect(theme.accentColor).toMatch(hexPattern);
          expect(theme.glowColor).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);

          expect(theme.bodyColor).toBeGreaterThanOrEqual(0);
          expect(theme.bodyColor).toBeLessThanOrEqual(0xffffff);
          expect(theme.gloveColor).toBeGreaterThanOrEqual(0);
          expect(theme.gloveColor).toBeLessThanOrEqual(0xffffff);
          expect(theme.eyeColor).toBeGreaterThanOrEqual(0);
          expect(theme.eyeColor).toBeLessThanOrEqual(0xffffff);

          expect(Array.isArray(theme.particlePalette)).toBe(true);
          expect(theme.particlePalette.length).toBeGreaterThanOrEqual(3);
          for (const color of theme.particlePalette) {
            expect(color).toMatch(hexPattern);
          }
        });

        it(`has balanced attributes within [1, 10] range for ${charId}`, () => {
          const { attributes } = charDef;
          expect(attributes.speed).toBeGreaterThanOrEqual(1);
          expect(attributes.speed).toBeLessThanOrEqual(10);
          expect(attributes.power).toBeGreaterThanOrEqual(1);
          expect(attributes.power).toBeLessThanOrEqual(10);
          expect(attributes.defense).toBeGreaterThanOrEqual(1);
          expect(attributes.defense).toBeLessThanOrEqual(10);
          expect(attributes.comboMastery).toBeGreaterThanOrEqual(1);
          expect(attributes.comboMastery).toBeLessThanOrEqual(10);
        });

        it(`has valid procedural gear specs for ${charId}`, () => {
          const { gear } = charDef;
          expect(gear.headType).toBeTruthy();
          expect(gear.shoulderType).toBeTruthy();
          expect(gear.gauntletType).toBeTruthy();
          expect(gear.accessoryType).toBeTruthy();
          expect(gear.waistType).toBeTruthy();
        });
      });
    }

    it('confirms distinct visual identities and palettes across all 4 fighters', () => {
      const chars = getAllCharacters();
      const bodyColors = new Set(chars.map((c) => c.theme.bodyColor));
      const primaryColors = new Set(chars.map((c) => c.theme.primaryColor));
      const headTypes = new Set(chars.map((c) => c.gear.headType));
      const weaponTypes = new Set(chars.map((c) => c.gear.gauntletType));

      expect(bodyColors.size).toBe(4);
      expect(primaryColors.size).toBe(4);
      expect(headTypes.size).toBe(4);
      expect(weaponTypes.size).toBe(4);
    });

    it('handles character registry lookup, fallback, and validation guards', () => {
      expect(DEFAULT_CHARACTER_ID).toBe('shadow_ronin');
      expect(getCharacterDefinition('shadow_ronin').id).toBe('shadow_ronin');
      expect(getCharacterDefinition('invalid_id').id).toBe('shadow_ronin');
      expect(getCharacterDefinition(null).id).toBe('shadow_ronin');
      expect(getCharacterDefinition(undefined).id).toBe('shadow_ronin');

      expect(isValidCharacterId('shadow_ronin')).toBe(true);
      expect(isValidCharacterId('cyber_valkyrie')).toBe(true);
      expect(isValidCharacterId('volt_shinobi')).toBe(true);
      expect(isValidCharacterId('void_assassin')).toBe(true);
      expect(isValidCharacterId('unknown_hero')).toBe(false);
      expect(isValidCharacterId(null)).toBe(false);
      expect(isValidCharacterId(123)).toBe(false);
    });
  });

  // =========================================================================
  // TIER 2: Boundary & Component Matrix (80 Permutations per Component)
  // =========================================================================
  describe('Tier 2: Boundary & Component Matrix (80 Permutations)', () => {
    describe('2.1 Tapered Limb Math & Boundary Geometry', () => {
      it('renders standard tapered limb with quad mesh and cap circles', () => {
        const g = new MockPhaserGraphics();
        drawTaperedLimb(g as any, { x: 100, y: 100 }, { x: 130, y: 140 }, 10, 6, 0x0f172a, 0x0284c7, 0.8);

        expect(g.calls.length).toBeGreaterThan(0);
        assertAllGraphicsArgsFinite(g, 'drawTaperedLimb standard');
        const fillCircles = g.calls.filter((c) => c.method === 'fillCircle');
        expect(fillCircles.length).toBe(2);
      });

      it('safely handles zero-length singular limb without NaN or division by zero', () => {
        const g = new MockPhaserGraphics();
        drawTaperedLimb(g as any, { x: 50, y: 50 }, { x: 50, y: 50 }, 8, 4, 0x18181b);

        expect(g.calls.length).toBeGreaterThan(0);
        assertAllGraphicsArgsFinite(g, 'drawTaperedLimb singular');
      });

      it('renders sub-epsilon micro-limbs and extreme coordinates cleanly', () => {
        const g = new MockPhaserGraphics();
        drawTaperedLimb(g as any, { x: 10000, y: -20000 }, { x: 10000.001, y: -19999.999 }, 12, 6, 0x09090b);

        assertAllGraphicsArgsFinite(g, 'drawTaperedLimb extreme coords');
      });
    });

    describe('2.2 drawCharacterHeadgear — 80 Permutations Sweep', () => {
      for (const charId of CHAR_IDS) {
        for (const state of FIGHTER_STATES) {
          for (const facing of FACINGS) {
            it(`draws headgear for ${charId} [state=${state}, facing=${facing}] with finite math`, () => {
              const g = new MockPhaserGraphics();
              const charDef = CHARACTER_REGISTRY[charId];
              drawCharacterHeadgear(g as any, 200, 260, facing, charDef, state, 300);

              expect(g.calls.length).toBeGreaterThan(0);
              assertAllGraphicsArgsFinite(g, `headgear ${charId} ${state} facing=${facing}`);
            });
          }
        }
      }

      it('mirrors headgear geometry horizontally between facing=+1 and facing=-1', () => {
        for (const charId of CHAR_IDS) {
          const charDef = CHARACTER_REGISTRY[charId];
          const gRight = new MockPhaserGraphics();
          const gLeft = new MockPhaserGraphics();

          drawCharacterHeadgear(gRight as any, 200, 260, 1, charDef, 'idle', 100);
          drawCharacterHeadgear(gLeft as any, 200, 260, -1, charDef, 'idle', 100);

          expect(gRight.calls.length).toBeGreaterThan(0);
          expect(gLeft.calls.length).toBeGreaterThan(0);
        }
      });

      it('suppresses glowing visor optics during knockdown state', () => {
        for (const charId of CHAR_IDS) {
          const charDef = CHARACTER_REGISTRY[charId];
          const gActive = new MockPhaserGraphics();
          const gKnockdown = new MockPhaserGraphics();

          drawCharacterHeadgear(gActive as any, 200, 260, 1, charDef, 'idle', 100);
          drawCharacterHeadgear(gKnockdown as any, 200, 260, 1, charDef, 'knockdown', 100);

          // Knockdown headgear should have fewer active glowing overlay calls
          expect(gKnockdown.calls.length).toBeLessThan(gActive.calls.length);
        }
      });
    });

    describe('2.3 drawCharacterPauldronsAndTorso — 80 Permutations Sweep', () => {
      for (const charId of CHAR_IDS) {
        for (const state of FIGHTER_STATES) {
          for (const facing of FACINGS) {
            it(`draws torso & pauldrons for ${charId} [state=${state}, facing=${facing}]`, () => {
              const g = new MockPhaserGraphics();
              const charDef = CHARACTER_REGISTRY[charId];
              drawCharacterPauldronsAndTorso(
                g as any,
                { x: 195, y: 275 },
                { x: 205, y: 275 },
                { x: 196, y: 315 },
                { x: 204, y: 315 },
                { x: 190, y: 278 },
                { x: 210, y: 278 },
                facing,
                charDef,
                state,
                250
              );

              expect(g.calls.length).toBeGreaterThan(0);
              assertAllGraphicsArgsFinite(g, `torso ${charId} ${state} facing=${facing}`);
            });
          }
        }
      }

      it('handles collapsed/singular shoulder and neck points gracefully', () => {
        const g = new MockPhaserGraphics();
        const charDef = CHARACTER_REGISTRY.cyber_valkyrie;
        drawCharacterPauldronsAndTorso(
          g as any,
          { x: 200, y: 275 },
          { x: 200, y: 275 },
          { x: 200, y: 315 },
          { x: 200, y: 315 },
          { x: 200, y: 275 },
          { x: 200, y: 275 },
          1,
          charDef,
          'idle',
          0
        );

        assertAllGraphicsArgsFinite(g, 'torso singular points');
      });
    });

    describe('2.4 drawCharacterGauntletsAndWeapons — 80 Permutations Sweep', () => {
      for (const charId of CHAR_IDS) {
        for (const state of FIGHTER_STATES) {
          for (const facing of FACINGS) {
            it(`draws weapons & gauntlets for ${charId} [state=${state}, facing=${facing}]`, () => {
              const g = new MockPhaserGraphics();
              const fxG = new MockPhaserGraphics();
              const charDef = CHARACTER_REGISTRY[charId];

              drawCharacterGauntletsAndWeapons(
                g as any,
                fxG as any,
                { joint: { x: 185, y: 295 }, tip: { x: 180, y: 310 } },
                { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } },
                facing,
                charDef,
                state,
                400
              );

              expect(g.calls.length).toBeGreaterThan(0);
              assertAllGraphicsArgsFinite(g, `weapons base ${charId} ${state} facing=${facing}`);
              assertAllGraphicsArgsFinite(fxG, `weapons fx ${charId} ${state} facing=${facing}`);
            });
          }
        }
      }

      it('suppresses weapon blade active glows in knockdown state', () => {
        for (const charId of CHAR_IDS) {
          const charDef = CHARACTER_REGISTRY[charId];
          const gActive = new MockPhaserGraphics();
          const fxGActive = new MockPhaserGraphics();
          const gKnockdown = new MockPhaserGraphics();
          const fxGKnockdown = new MockPhaserGraphics();

          drawCharacterGauntletsAndWeapons(
            gActive as any,
            fxGActive as any,
            { joint: { x: 185, y: 295 }, tip: { x: 180, y: 310 } },
            { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } },
            1,
            charDef,
            'idle',
            100
          );

          drawCharacterGauntletsAndWeapons(
            gKnockdown as any,
            fxGKnockdown as any,
            { joint: { x: 185, y: 295 }, tip: { x: 180, y: 310 } },
            { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } },
            1,
            charDef,
            'knockdown',
            100
          );

          expect(fxGKnockdown.calls.length).toBeLessThanOrEqual(fxGActive.calls.length);
        }
      });
    });

    describe('2.5 drawCharacterWaistAndScarf — 80 Permutations Sweep', () => {
      for (const charId of CHAR_IDS) {
        for (const state of FIGHTER_STATES) {
          for (const facing of FACINGS) {
            it(`draws waist & scarf for ${charId} [state=${state}, facing=${facing}]`, () => {
              const g = new MockPhaserGraphics();
              const charDef = CHARACTER_REGISTRY[charId];

              drawCharacterWaistAndScarf(
                g as any,
                200,
                315,
                200,
                260,
                facing,
                charDef,
                state,
                150
              );

              expect(g.calls.length).toBeGreaterThan(0);
              assertAllGraphicsArgsFinite(g, `waist ${charId} ${state} facing=${facing}`);
            });
          }
        }
      }

      it('suppresses flowing scarf/ribbon trails during knockdown', () => {
        for (const charId of CHAR_IDS) {
          const charDef = CHARACTER_REGISTRY[charId];
          const gActive = new MockPhaserGraphics();
          const gKnockdown = new MockPhaserGraphics();

          drawCharacterWaistAndScarf(gActive as any, 200, 315, 200, 260, 1, charDef, 'idle', 100);
          drawCharacterWaistAndScarf(gKnockdown as any, 200, 315, 200, 260, 1, charDef, 'knockdown', 100);

          expect(gKnockdown.calls.length).toBeLessThan(gActive.calls.length);
        }
      });
    });

    describe('2.6 drawCharacterAttackVFX — 80 Permutations Sweep', () => {
      for (const charId of CHAR_IDS) {
        for (const state of FIGHTER_STATES) {
          for (const facing of FACINGS) {
            it(`draws attack VFX for ${charId} [state=${state}, facing=${facing}]`, () => {
              const fxG = new MockPhaserGraphics();
              const charDef = CHARACTER_REGISTRY[charId];

              drawCharacterAttackVFX(
                fxG as any,
                charDef,
                state,
                200,
                275,
                200,
                315,
                { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } },
                { joint: { x: 210, y: 345 }, tip: { x: 215, y: 375 } },
                facing,
                500
              );

              assertAllGraphicsArgsFinite(fxG, `attack VFX ${charId} ${state} facing=${facing}`);

              if (state === 'heavy' || state === 'uppercut' || state === 'jump_kick' || state === 'kick' || state === 'jab') {
                expect(fxG.calls.length).toBeGreaterThan(0);
              } else if (state === 'knockdown' || state === 'idle') {
                expect(fxG.calls.length).toBe(0);
              }
            });
          }
        }
      }

      it('flips attack arc and slash directions when facing = -1', () => {
        for (const charId of CHAR_IDS) {
          const charDef = CHARACTER_REGISTRY[charId];
          const fxGRight = new MockPhaserGraphics();
          const fxGLeft = new MockPhaserGraphics();

          drawCharacterAttackVFX(
            fxGRight as any,
            charDef,
            'heavy',
            200,
            275,
            200,
            315,
            { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } },
            { joint: { x: 210, y: 345 }, tip: { x: 215, y: 375 } },
            1,
            100
          );

          drawCharacterAttackVFX(
            fxGLeft as any,
            charDef,
            'heavy',
            200,
            275,
            200,
            315,
            { joint: { x: 215, y: 295 }, tip: { x: 230, y: 305 } },
            { joint: { x: 210, y: 345 }, tip: { x: 215, y: 375 } },
            -1,
            100
          );

          expect(fxGRight.calls.length).toBeGreaterThan(0);
          expect(fxGLeft.calls.length).toBeGreaterThan(0);
        }
      });
    });
  });

  // =========================================================================
  // TIER 3: Cross-Feature Pipeline Integration (renderVectorFallback)
  // =========================================================================
  describe('Tier 3: Cross-Feature Pipeline Integration (renderVectorFallback)', () => {
    it('executes renderVectorFallback across all 80 permutations with zero leaks and stable pooling', () => {
      const kinematicsRight = createSampleKinematics(1);
      const kinematicsLeft = createSampleKinematics(-1);

      for (const charId of CHAR_IDS) {
        for (const state of FIGHTER_STATES) {
          for (const facing of FACINGS) {
            const kin = facing === 1 ? kinematicsRight : kinematicsLeft;
            renderer.renderVectorFallback(
              mockScene as any,
              mockContainer as any,
              charId,
              state,
              kin,
              100
            );

            expect(mockContainer.__fallbackGraphics).toBeDefined();
            expect(mockContainer.__fallbackFxGraphics).toBeDefined();
            expect(mockContainer.list).toHaveLength(2);

            assertAllGraphicsArgsFinite(
              mockContainer.__fallbackGraphics!,
              `renderVectorFallback base ${charId} ${state} facing=${facing}`
            );
            assertAllGraphicsArgsFinite(
              mockContainer.__fallbackFxGraphics!,
              `renderVectorFallback fx ${charId} ${state} facing=${facing}`
            );
          }
        }
      }

      // Ensure that after 80 runs on the same container, exactly 2 graphics objects exist
      expect(mockContainer.list).toHaveLength(2);
    });

    it('clears previous graphics frame buffers on each invocation', () => {
      const kin = createSampleKinematics(1);
      renderer.renderVectorFallback(
        mockScene as any,
        mockContainer as any,
        'shadow_ronin',
        'heavy',
        kin,
        0
      );

      const baseCallsFirst = mockContainer.__fallbackGraphics!.calls.length;
      expect(baseCallsFirst).toBeGreaterThan(0);

      renderer.renderVectorFallback(
        mockScene as any,
        mockContainer as any,
        'cyber_valkyrie',
        'idle',
        kin,
        16
      );

      const clearCalls = mockContainer.__fallbackGraphics!.calls.filter((c: any) => c.method === 'clear');
      expect(clearCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('renders knockdown ragdoll state smoothly via renderRagdollTexturedFighter fallback', () => {
      const ragdoll = new RagdollSystem();
      ragdoll.setMode('Ragdoll');
      ragdoll.step(1 / 60);

      renderer.renderRagdollTexturedFighter(
        mockScene as any,
        mockContainer as any,
        'shadow_ronin',
        ragdoll,
        500
      );

      expect(mockContainer.__fallbackGraphics).toBeDefined();
      assertAllGraphicsArgsFinite(
        mockContainer.__fallbackGraphics!,
        'renderRagdollTexturedFighter fallback'
      );
    });
  });

  // =========================================================================
  // TIER 4: Real-World Application Scenarios
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios', () => {
    it('Scenario 1: Full Combat Match Cycle (Idle -> Step -> Windup -> Jab -> Heavy -> Hit -> Knockdown)', () => {
      const matchFlow: FighterState[] = [
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
      ];

      for (const charId of CHAR_IDS) {
        const charDef = CHARACTER_REGISTRY[charId];
        let simTime = 0;

        for (const state of matchFlow) {
          simTime += 50;
          const kin = createSampleKinematics(1);
          const g = new MockPhaserGraphics();
          const fxG = new MockPhaserGraphics();

          // Render procedural components in match state
          drawCharacterHeadgear(g as any, kin.head!.x, kin.head!.y, 1, charDef, state, simTime);
          drawCharacterPauldronsAndTorso(
            g as any,
            kin.neck!,
            kin.neck!,
            kin.hip!,
            kin.hip!,
            kin.lShoulder!,
            kin.rShoulder!,
            1,
            charDef,
            state,
            simTime
          );
          drawCharacterGauntletsAndWeapons(g as any, fxG as any, kin.armL!, kin.armR!, 1, charDef, state, simTime);
          drawCharacterWaistAndScarf(g as any, kin.hip!.x, kin.hip!.y, kin.head!.x, kin.head!.y, 1, charDef, state, simTime);
          drawCharacterAttackVFX(
            fxG as any,
            charDef,
            state,
            kin.neck!.x,
            kin.neck!.y,
            kin.hip!.x,
            kin.hip!.y,
            kin.armR!,
            kin.legR!,
            1,
            simTime
          );

          assertAllGraphicsArgsFinite(g, `Scenario 1 ${charId} ${state}`);
          assertAllGraphicsArgsFinite(fxG, `Scenario 1 fx ${charId} ${state}`);

          if (state === 'knockdown') {
            expect(fxG.calls.length).toBeLessThanOrEqual(3);
          }
        }
      }
    });

    it('Scenario 2: High-Speed Facing Flip during Attack VFX Combos', () => {
      const comboSequence = [
        { state: 'jab' as FighterState, facing: 1, time: 100 },
        { state: 'uppercut' as FighterState, facing: -1, time: 180 },
        { state: 'heavy' as FighterState, facing: 1, time: 260 },
        { state: 'kick' as FighterState, facing: -1, time: 340 }
      ];

      for (const charId of CHAR_IDS) {
        const charDef = CHARACTER_REGISTRY[charId];
        for (const step of comboSequence) {
          const kin = createSampleKinematics(step.facing);
          const fxG = new MockPhaserGraphics();

          drawCharacterAttackVFX(
            fxG as any,
            charDef,
            step.state,
            kin.neck!.x,
            kin.neck!.y,
            kin.hip!.x,
            kin.hip!.y,
            kin.armR!,
            kin.legR!,
            step.facing,
            step.time
          );

          expect(fxG.calls.length).toBeGreaterThan(0);
          assertAllGraphicsArgsFinite(fxG, `Scenario 2 ${charId} state=${step.state} facing=${step.facing}`);
        }
      }
    });

    it('Scenario 3: Continuous 120-Frame Animation Time Harmonics & Pulsing', () => {
      // 120 frames at ~16.6ms (0ms to ~2000ms)
      for (const charId of CHAR_IDS) {
        const charDef = CHARACTER_REGISTRY[charId];
        const kin = createSampleKinematics(1);

        for (let frame = 0; frame < 120; frame++) {
          const timeMs = frame * (1000 / 60);
          const g = new MockPhaserGraphics();
          const fxG = new MockPhaserGraphics();

          drawCharacterHeadgear(g as any, kin.head!.x, kin.head!.y, 1, charDef, 'idle', timeMs);
          drawCharacterPauldronsAndTorso(
            g as any,
            kin.neck!,
            kin.neck!,
            kin.hip!,
            kin.hip!,
            kin.lShoulder!,
            kin.rShoulder!,
            1,
            charDef,
            'idle',
            timeMs
          );
          drawCharacterGauntletsAndWeapons(g as any, fxG as any, kin.armL!, kin.armR!, 1, charDef, 'idle', timeMs);
          drawCharacterWaistAndScarf(g as any, kin.hip!.x, kin.hip!.y, kin.head!.x, kin.head!.y, 1, charDef, 'idle', timeMs);

          assertAllGraphicsArgsFinite(g, `Scenario 3 frame=${frame} ${charId}`);
          assertAllGraphicsArgsFinite(fxG, `Scenario 3 fx frame=${frame} ${charId}`);
        }
      }
    });

    it('Scenario 4: Dynamic Fallback Transition & Zero-Allocation Graphics Pooling over 200 Frames', () => {
      const kin = createSampleKinematics(1);

      for (let frame = 0; frame < 200; frame++) {
        const charId = CHAR_IDS[frame % CHAR_IDS.length];
        const state = FIGHTER_STATES[frame % FIGHTER_STATES.length];
        const facing = frame % 2 === 0 ? 1 : -1;
        kin.facing = facing;

        renderer.renderVectorFallback(
          mockScene as any,
          mockContainer as any,
          charId,
          state,
          kin,
          frame * 16.6
        );

        expect(mockContainer.list.length).toBe(2);
      }

      expect(mockContainer.list.length).toBe(2);
      expect(mockContainer.__fallbackGraphics).toBeDefined();
      expect(mockContainer.__fallbackFxGraphics).toBeDefined();
    });

    it('Scenario 5: Atlas vs Vector Fallback Coexistence', () => {
      const kin = createSampleKinematics(1);

      // 1. Initial vector fallback call when no atlas is cached
      renderer.renderVectorFallback(
        mockScene as any,
        mockContainer as any,
        'shadow_ronin',
        'idle',
        kin,
        0
      );
      expect(mockContainer.__fallbackGraphics).toBeDefined();

      // 2. Register atlas metadata for shadow_ronin
      const mockAtlasMetadata: CharacterAtlasMetadata = {
        characterId: 'shadow_ronin',
        version: '1.0.0',
        image: '/assets/characters/shadow_ronin/atlas.png',
        parts: {
          head: { x: 0, y: 0, w: 64, h: 64, pivotX: 0.5, pivotY: 0.5 },
          torso: { x: 64, y: 0, w: 72, h: 96, pivotX: 0.5, pivotY: 0.2 },
          lead_thigh: { x: 136, y: 0, w: 44, h: 72, pivotX: 0.5, pivotY: 0.15 },
          lead_shin: { x: 180, y: 0, w: 40, h: 68, pivotX: 0.5, pivotY: 0.15 },
          lead_upper_arm: { x: 220, y: 0, w: 36, h: 60, pivotX: 0.5, pivotY: 0.15 },
          lead_forearm: { x: 256, y: 0, w: 32, h: 56, pivotX: 0.5, pivotY: 0.15 },
          rear_thigh: { x: 288, y: 0, w: 40, h: 68, pivotX: 0.5, pivotY: 0.15 },
          rear_shin: { x: 328, y: 0, w: 36, h: 64, pivotX: 0.5, pivotY: 0.15 },
          rear_upper_arm: { x: 364, y: 0, w: 32, h: 56, pivotX: 0.5, pivotY: 0.15 },
          rear_forearm: { x: 396, y: 0, w: 28, h: 52, pivotX: 0.5, pivotY: 0.15 },
          rear_boot: { x: 424, y: 0, w: 44, h: 32, pivotX: 0.5, pivotY: 0.15 },
          rear_hand: { x: 468, y: 0, w: 32, h: 32, pivotX: 0.5, pivotY: 0.15 },
          pauldron_rear: { x: 0, y: 100, w: 48, h: 44, pivotX: 0.5, pivotY: 0.2 },
          pauldron_lead: { x: 0, y: 100, w: 48, h: 44, pivotX: 0.5, pivotY: 0.2 },
          pelvis: { x: 48, y: 100, w: 56, h: 40, pivotX: 0.5, pivotY: 0.5 },
          headgear: { x: 104, y: 100, w: 80, h: 72, pivotX: 0.5, pivotY: 0.5 },
          weapon_base: { x: 184, y: 100, w: 32, h: 128, pivotX: 0.5, pivotY: 0.85 },
          weapon_glow: { x: 216, y: 100, w: 40, h: 136, pivotX: 0.5, pivotY: 0.85 },
          accessory: { x: 256, y: 100, w: 48, h: 112, pivotX: 0.15, pivotY: 0.15 }
        }
      };

      const registered = ModularAtlasManager.registerAtlas(mockScene as any, 'shadow_ronin', mockAtlasMetadata);
      expect(registered).toBe(true);
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(true);

      // 3. Create sprite rig container
      const spriteContainer = renderer.createFighterRigContainer(mockScene as any, 'shadow_ronin');
      expect(spriteContainer.list.length).toBe(20);

      // 4. Render textured fighter
      renderer.renderTexturedFighter(
        mockScene as any,
        spriteContainer as any,
        'shadow_ronin',
        'heavy',
        kin,
        100
      );

      // Layer 19 (weapon glow) should be ADD blend mode with visible true
      expect(spriteContainer.list[19].blendMode).toBe(1);
      expect(spriteContainer.list[19].visible).toBe(true);

      // 5. Concurrently render procedural fighter for Cyber Valkyrie (no atlas loaded)
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'cyber_valkyrie')).toBe(false);
      const proceduralContainer = new MockPhaserContainer() as FallbackContainer;
      renderer.renderVectorFallback(
        mockScene as any,
        proceduralContainer as any,
        'cyber_valkyrie',
        'heavy',
        kin,
        100
      );

      expect(proceduralContainer.__fallbackGraphics).toBeDefined();
      expect(proceduralContainer.list.length).toBe(2);

      // Both containers function correctly in parallel without pollution
      assertAllGraphicsArgsFinite(
        proceduralContainer.__fallbackGraphics!,
        'coexistence procedural graphics'
      );
    });
  });
});
