/**
 * CharacterRigKinematicsStress.test.ts
 * Rigorous empirical stress-testing suite for CharacterRigRenderer quad kinematics calculations.
 * 
 * Tests:
 * 1. Extreme angle sweep (-180° to +180°, 36,000 steps + singular angles) -> Distal endpoint error < 10^-5
 * 2. Zero-length and micro-length limb edge cases -> Robust clamping, no NaN/Inf
 * 3. FlipX facing switches (facing = 1 vs facing = -1) -> Invariant joint roots, symmetric reflection
 * 4. Concentric joint circle overlap -> Zero center displacement across all rotations
 * 5. All 10 combat states (Idle, Step, Windup, Jab, Kick, Jump Kick, Uppercut, Heavy, Hit, Knockdown)
 *    across all 4 characters (Shadow Ronin, Cyber Valkyrie, Volt Shinobi, Void Assassin)
 * 6. Verlet Ragdoll kinematics multi-step tumbling -> Zero distal endpoint divergence (< 10^-5)
 * 7. Multi-joint IK chain continuity and reachability convergence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CharacterRigRenderer,
  computeLimbTransform,
  computeBoneTransform,
  type LimbSegmentTransform,
  type FighterState,
  type SolvedKinematics,
  RIG_Z_INDEX_MATRIX
} from '../CharacterRigRenderer';
import {
  solve2BoneIK,
  solveSpineCurve,
  RagdollSystem,
  getCharacterDefinition,
  type CharacterId,
  type Vector2D
} from '@keyfury/game-core';
import {
  MockPhaserScene,
  MockPhaserContainer,
  MockPhaserSprite
} from './MockPhaserHarness';
import { ModularAtlasManager } from '../ModularAtlasManager';

const FIGHTER_IDS: CharacterId[] = [
  'shadow_ronin',
  'cyber_valkyrie',
  'volt_shinobi',
  'void_assassin'
];

const COMBAT_STATES: FighterState[] = [
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

/**
 * Reconstructs the distal endpoint from limb transform parameters.
 */
function reconstructDistalEndpoint(transform: LimbSegmentTransform): { x: number; y: number } {
  return {
    x: transform.startX + transform.length * Math.cos(transform.angleRad),
    y: transform.startY + transform.length * Math.sin(transform.angleRad)
  };
}

/**
 * Calculates Euclidean distance between two 2D points.
 */
function euclideanDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Helper to build solved kinematics for all 10 combat states matching StickFightScene kinematics.
 */
function buildStateKinematics(
  state: FighterState,
  facing: 1 | -1 = 1,
  stepToggle: boolean = false,
  origin: Vector2D = { x: 400, y: 300 }
): SolvedKinematics {
  const x = origin.x;
  const y = origin.y;

  let headX = x;
  let headY = y - 48;
  let neckX = x;
  let neckY = y - 32;
  let hipX = x;
  let hipY = y;

  const shoulderWidth = 10;
  const hipWidth = 8;
  const lShoulderX = neckX - shoulderWidth;
  const lShoulderY = neckY + 3;
  const rShoulderX = neckX + shoulderWidth;
  const rShoulderY = neckY + 3;
  const lHipX = hipX - hipWidth;
  const rHipX = hipX + hipWidth;

  let lHandX = neckX - facing * 8;
  let lHandY = neckY + 8;
  let rHandX = neckX + facing * 12;
  let rHandY = neckY + 12;

  let lFootX = lHipX - facing * 12;
  let lFootY = y + 40;
  let rFootX = rHipX + facing * 20;
  let rFootY = y + 40;

  if (state === 'step') {
    if (stepToggle) {
      rHandX = neckX + facing * 36;
      rHandY = neckY + 2;
    } else {
      lHandX = neckX + facing * 30;
      lHandY = neckY + 4;
    }
  } else if (state === 'windup') {
    rHandX = neckX - facing * 8;
    rHandY = neckY + 8;
  } else if (state === 'jab') {
    rHandX = neckX + facing * 44;
    rHandY = neckY - 2;
    lHandX = neckX + facing * 6;
    lHandY = neckY + 8;
  } else if (state === 'kick') {
    neckX = x - facing * 2;
    headX = x - facing * 4;
    rFootX = hipX + facing * 48;
    rFootY = hipY - 18;
    lHandX = neckX - facing * 8;
    lHandY = neckY + 8;
  } else if (state === 'jump_kick') {
    rFootX = hipX + facing * 50;
    rFootY = hipY - 6;
    lFootX = hipX - facing * 18;
    lFootY = hipY + 20;
    rHandX = neckX - facing * 8;
    rHandY = neckY + 10;
    lHandX = neckX + facing * 16;
    lHandY = neckY - 4;
  } else if (state === 'uppercut') {
    rHandX = neckX + facing * 16;
    rHandY = neckY - 48;
    lHandX = neckX - facing * 8;
    lHandY = neckY + 8;
  } else if (state === 'heavy') {
    lHandX = neckX + facing * 38;
    lHandY = neckY - 6;
    rHandX = neckX + facing * 44;
    rHandY = neckY - 2;
    rFootX = hipX + facing * 24;
    rFootY = y + 40;
  } else if (state === 'hit') {
    neckX = x - facing * 6;
    headX = x - facing * 10;
    rHandX = headX - facing * 6;
    rHandY = headY + 18;
    lHandX = neckX - facing * 10;
    lHandY = neckY + 18;
  } else if (state === 'knockdown') {
    hipX = x - facing * 18;
    hipY = y - 8;
    neckX = x - facing * 54;
    neckY = y - 8;
    headX = x - facing * 72;
    headY = y - 8;
    lFootX = x + facing * 12;
    lFootY = y - 8;
    rFootX = x + facing * 24;
    rFootY = y - 8;
    lHandX = neckX + 6;
    lHandY = y - 6;
    rHandX = neckX - 10;
    rHandY = y - 6;
  }

  const armL = solve2BoneIK({ x: lShoulderX, y: lShoulderY }, { x: lHandX, y: lHandY }, 24, 24, facing as 1 | -1);
  const armR = solve2BoneIK({ x: rShoulderX, y: rShoulderY }, { x: rHandX, y: rHandY }, 24, 24, facing as 1 | -1);
  const legL = solve2BoneIK({ x: lHipX, y: hipY }, { x: lFootX, y: lFootY }, 30, 30, -facing as 1 | -1);
  const legR = solve2BoneIK({ x: rHipX, y: hipY }, { x: rFootX, y: rFootY }, 30, 30, -facing as 1 | -1);

  return {
    head: { x: headX, y: headY },
    neck: { x: neckX, y: neckY },
    hip: { x: hipX, y: hipY },
    lShoulder: { x: lShoulderX, y: lShoulderY },
    rShoulder: { x: rShoulderX, y: rShoulderY },
    lHip: { x: lHipX, y: hipY },
    rHip: { x: rHipX, y: hipY },
    armL: { joint: armL.joint, tip: armL.tip },
    armR: { joint: armR.joint, tip: armR.tip },
    legL: { joint: legL.joint, tip: legL.tip },
    legR: { joint: legR.joint, tip: legR.tip },
    facing,
    stepToggle
  };
}

describe('Empirical Kinematics Stress Harness: Quad Geometry & Joint Precision', () => {
  let renderer: CharacterRigRenderer;
  let mockScene: MockPhaserScene;

  beforeEach(() => {
    renderer = new CharacterRigRenderer();
    mockScene = new MockPhaserScene();
    ModularAtlasManager.clearCache();
  });

  describe('1. Distal Endpoint Mathematical Precision & 360-Degree Angle Sweep', () => {
    it('proves distal endpoint error is < 10^-5 across 36,000 dense angle steps from -180 deg to +180 deg', () => {
      const p1 = { x: 250.123, y: -180.456 };
      const limbLength = 47.89;
      let maxDistalError = 0;
      let worstAngle = 0;
      const numSteps = 36000;

      for (let i = 0; i <= numSteps; i++) {
        const deg = -180 + (360 * i) / numSteps;
        const rad = (deg * Math.PI) / 180;
        const p2 = {
          x: p1.x + limbLength * Math.cos(rad),
          y: p1.y + limbLength * Math.sin(rad)
        };

        const transform = computeLimbTransform(p1, p2, 1, 20);
        const p2Reconstructed = reconstructDistalEndpoint(transform);
        const error = euclideanDistance(p2, p2Reconstructed);

        if (error > maxDistalError) {
          maxDistalError = error;
          worstAngle = deg;
        }

        expect(error).toBeLessThan(1e-5);
      }

      // Assert worst-case floating point error over 36,000 angles
      expect(maxDistalError).toBeLessThan(1e-12);
    });

    it('proves distal endpoint error is < 10^-5 at mathematical singular angles (pi, -pi, 0, pi/2, -pi/2, pi/4, 3pi/4)', () => {
      const p1 = { x: 100, y: 200 };
      const singularAngles = [
        -Math.PI,
        -Math.PI + 1e-12,
        -Math.PI * 0.75,
        -Math.PI * 0.5,
        -Math.PI * 0.25,
        -1e-12,
        0,
        1e-12,
        Math.PI * 0.25,
        Math.PI * 0.5,
        Math.PI * 0.75,
        Math.PI - 1e-12,
        Math.PI
      ];

      for (const rad of singularAngles) {
        const len = 35.5;
        const p2 = { x: p1.x + len * Math.cos(rad), y: p1.y + len * Math.sin(rad) };
        const transform = computeLimbTransform(p1, p2, 1, 20);
        const p2Rec = reconstructDistalEndpoint(transform);
        const error = euclideanDistance(p2, p2Rec);

        expect(error).toBeLessThan(1e-5);
        expect(Number.isFinite(transform.angleRad)).toBe(true);
        expect(Number.isNaN(transform.angleRad)).toBe(false);
      }
    });

    it('proves distal endpoint precision across extreme coordinate ranges (-10^6 to +10^6) and lengths', () => {
      const coordinateMagnitudes = [0.01, 1, 50, 1000, 100000, 1000000];
      const lengths = [0.001, 0.1, 5, 24, 100, 5000];

      for (const mag of coordinateMagnitudes) {
        for (const len of lengths) {
          const p1 = { x: mag * 0.707, y: -mag * 0.707 };
          const angle = 1.23456789;
          const p2 = { x: p1.x + len * Math.cos(angle), y: p1.y + len * Math.sin(angle) };

          const transform = computeLimbTransform(p1, p2, 1, 20);
          const p2Rec = reconstructDistalEndpoint(transform);
          const error = euclideanDistance(p2, p2Rec);

          expect(error).toBeLessThan(1e-5);
          expect(transform.length).toBeCloseTo(len, 4);
        }
      }
    });
  });

  describe('2. Zero-Length, Micro-Length & Degenerate Boundary Conditions', () => {
    it('handles zero-length collapsed limbs (P1 == P2) gracefully without NaN or Inf', () => {
      const testOrigins = [
        { x: 0, y: 0 },
        { x: -500, y: 300 },
        { x: 1234.56, y: -789.12 }
      ];

      for (const p of testOrigins) {
        const transform = computeLimbTransform(p, p, 1, 20);

        expect(transform.length).toBeGreaterThanOrEqual(1e-5);
        expect(Number.isFinite(transform.length)).toBe(true);
        expect(Number.isNaN(transform.length)).toBe(false);
        expect(Number.isFinite(transform.angleRad)).toBe(true);
        expect(Number.isNaN(transform.angleRad)).toBe(false);

        const sprite = new MockPhaserSprite();
        renderer.applyLimbTransformToSprite(sprite as any, transform, { pivotX: 0.5, pivotY: 0.15 }, 50, 20);

        expect(Number.isFinite(sprite.scaleX)).toBe(true);
        expect(Number.isFinite(sprite.scaleY)).toBe(true);
        expect(Number.isFinite(sprite.rotation)).toBe(true);
      }
    });

    it('handles sub-epsilon micro-length limbs (10^-15 <= distance < 10^-5) stably', () => {
      const microDistances = [1e-15, 1e-12, 1e-8, 1e-6, 9.9e-6];
      const p1 = { x: 100, y: 100 };

      for (const dist of microDistances) {
        const p2 = { x: p1.x + dist, y: p1.y };
        const transform = computeLimbTransform(p1, p2, 1, 20);

        expect(transform.length).toBeGreaterThanOrEqual(1e-5);
        expect(Number.isFinite(transform.angleRad)).toBe(true);
        expect(Number.isNaN(transform.angleRad)).toBe(false);
      }
    });
  });

  describe('3. Concentric Joint Pivot Overlap & Seamless Articulation', () => {
    it('proves joint rotation pivot centers are mathematically concentric with 0 displacement across 360 degrees', () => {
      const jointCenter = { x: 300, y: 400 };
      const limbLength1 = 28;
      const limbLength2 = 24;

      // Sweep through relative angles of upper and lower limb
      for (let angleUpper = -Math.PI; angleUpper <= Math.PI; angleUpper += Math.PI / 12) {
        for (let angleLower = -Math.PI; angleLower <= Math.PI; angleLower += Math.PI / 12) {
          const root = {
            x: jointCenter.x - limbLength1 * Math.cos(angleUpper),
            y: jointCenter.y - limbLength1 * Math.sin(angleUpper)
          };
          const tip = {
            x: jointCenter.x + limbLength2 * Math.cos(angleLower),
            y: jointCenter.y + limbLength2 * Math.sin(angleLower)
          };

          const upperTransform = computeLimbTransform(root, jointCenter, 1, 20);
          const lowerTransform = computeLimbTransform(jointCenter, tip, 1, 16);

          // Upper limb distal endpoint must equal lower limb proximal root
          const upperDistal = reconstructDistalEndpoint(upperTransform);
          const lowerProximal = { x: lowerTransform.startX, y: lowerTransform.startY };

          const jointDisplacement = euclideanDistance(upperDistal, lowerProximal);
          expect(jointDisplacement).toBeLessThan(1e-5);

          // In sprite space, sprite origin positioned at proximal joint
          const upperSprite = new MockPhaserSprite();
          const lowerSprite = new MockPhaserSprite();

          renderer.applyLimbTransformToSprite(upperSprite as any, upperTransform, { pivotX: 0.5, pivotY: 0.15 });
          renderer.applyLimbTransformToSprite(lowerSprite as any, lowerTransform, { pivotX: 0.5, pivotY: 0.15 });

          expect(lowerSprite.x).toBe(jointCenter.x);
          expect(lowerSprite.y).toBe(jointCenter.y);
          expect(lowerSprite.originX).toBe(0.5);
          expect(lowerSprite.originY).toBe(0.15);
        }
      }
    });

    it('proves concentric overlap invariance when facing switches (facing = 1 vs facing = -1)', () => {
      const joint = { x: 500, y: 350 };
      const tipR = { x: joint.x + 30, y: joint.y + 10 };
      const tipL = { x: joint.x - 30, y: joint.y + 10 };

      const transformRight = computeLimbTransform(joint, tipR, 1, 20);
      const transformLeft = computeLimbTransform(joint, tipL, -1, 20);

      const spriteR = new MockPhaserSprite();
      const spriteL = new MockPhaserSprite();

      renderer.applyLimbTransformToSprite(spriteR as any, transformRight, { pivotX: 0.5, pivotY: 0.15 }, 50, 20);
      renderer.applyLimbTransformToSprite(spriteL as any, transformLeft, { pivotX: 0.5, pivotY: 0.15 }, 50, 20);

      // Pivot position in world space is identical (no lateral offset from flipX)
      expect(spriteR.x).toBe(joint.x);
      expect(spriteR.y).toBe(joint.y);
      expect(spriteL.x).toBe(joint.x);
      expect(spriteL.y).toBe(joint.y);

      // Symmetry of scaleX
      expect(spriteL.scaleX).toBe(-spriteR.scaleX);
      expect(spriteL.scaleY).toBe(spriteR.scaleY);
    });
  });

  describe('4. All 10 Combat States Kinematics & Distal Error (< 10^-5)', () => {
    for (const state of COMBAT_STATES) {
      for (const facing of [1, -1] as const) {
        it(`validates zero distal endpoint error (< 10^-5) and joint continuity for state: "${state}" (facing=${facing})`, () => {
          const kinematics = buildStateKinematics(state, facing, false, { x: 400, y: 300 });

          // Test all 4 limb chains: armL, armR, legL, legR
          const chains = [
            { name: 'armL', root: kinematics.lShoulder!, joint: kinematics.armL!.joint, tip: kinematics.armL!.tip, nominalL1: 24, nominalL2: 24 },
            { name: 'armR', root: kinematics.rShoulder!, joint: kinematics.armR!.joint, tip: kinematics.armR!.tip, nominalL1: 24, nominalL2: 24 },
            { name: 'legL', root: kinematics.lHip!, joint: kinematics.legL!.joint, tip: kinematics.legL!.tip, nominalL1: 30, nominalL2: 30 },
            { name: 'legR', root: kinematics.rHip!, joint: kinematics.legR!.joint, tip: kinematics.legR!.tip, nominalL1: 30, nominalL2: 30 }
          ];

          for (const chain of chains) {
            const upperTransform = computeLimbTransform(chain.root, chain.joint, facing, 20);
            const lowerTransform = computeLimbTransform(chain.joint, chain.tip, facing, 18);

            // 1. Reconstructed distal endpoints must match joint and tip within 10^-5
            const upperDistal = reconstructDistalEndpoint(upperTransform);
            const lowerDistal = reconstructDistalEndpoint(lowerTransform);

            const errUpper = euclideanDistance(chain.joint, upperDistal);
            const errLower = euclideanDistance(chain.tip, lowerDistal);

            expect(errUpper).toBeLessThan(1e-5);
            expect(errLower).toBeLessThan(1e-5);

            // 2. Proximal root of lower segment must match distal root of upper segment exactly
            const jointSeamDist = euclideanDistance(upperDistal, { x: lowerTransform.startX, y: lowerTransform.startY });
            expect(jointSeamDist).toBeLessThan(1e-5);

            // 3. Segment lengths must be positive and within physical stretch limits
            expect(upperTransform.length).toBeGreaterThan(0);
            expect(lowerTransform.length).toBeGreaterThan(0);
            expect(upperTransform.length).toBeLessThanOrEqual(chain.nominalL1 + 1e-4);
            expect(lowerTransform.length).toBeLessThanOrEqual(chain.nominalL2 + 1e-4);
          }

          // Test Spine / Torso and Neck / Head segments
          const torsoTransform = computeLimbTransform(kinematics.neck!, kinematics.hip!, facing, 24);
          const headTransform = computeLimbTransform(kinematics.neck!, kinematics.head!, facing, 20);

          const torsoDistal = reconstructDistalEndpoint(torsoTransform);
          const headDistal = reconstructDistalEndpoint(headTransform);

          expect(euclideanDistance(kinematics.hip!, torsoDistal)).toBeLessThan(1e-5);
          expect(euclideanDistance(kinematics.head!, headDistal)).toBeLessThan(1e-5);
        });
      }
    }
  });

  describe('5. Full Character Roster Textured Quad Binding Across 10 States', () => {
    for (const charId of FIGHTER_IDS) {
      it(`binds textured quads with zero errors for character "${charId}" across all 10 combat states`, () => {
        // Register mock atlas for character
        const mockMetadata = {
          characterId: charId,
          version: '1.0.0',
          image: `/assets/characters/${charId}/atlas.png`,
          parts: {
            head: { x: 0, y: 0, w: 64, h: 64, pivotX: 0.5, pivotY: 0.15 },
            headgear: { x: 64, y: 0, w: 80, h: 72, pivotX: 0.5, pivotY: 0.15 },
            torso: { x: 144, y: 0, w: 72, h: 96, pivotX: 0.5, pivotY: 0.15 },
            pelvis: { x: 216, y: 0, w: 56, h: 40, pivotX: 0.5, pivotY: 0.15 },
            rear_upper_arm: { x: 0, y: 64, w: 32, h: 56, pivotX: 0.5, pivotY: 0.15 },
            rear_forearm: { x: 32, y: 64, w: 28, h: 52, pivotX: 0.5, pivotY: 0.15 },
            rear_hand: { x: 60, y: 64, w: 32, h: 32, pivotX: 0.5, pivotY: 0.15 },
            rear_thigh: { x: 92, y: 64, w: 40, h: 68, pivotX: 0.5, pivotY: 0.15 },
            rear_shin: { x: 132, y: 64, w: 36, h: 64, pivotX: 0.5, pivotY: 0.15 },
            rear_boot: { x: 168, y: 64, w: 44, h: 32, pivotX: 0.5, pivotY: 0.15 },
            lead_upper_arm: { x: 0, y: 120, w: 36, h: 60, pivotX: 0.5, pivotY: 0.15 },
            lead_forearm: { x: 36, y: 120, w: 32, h: 56, pivotX: 0.5, pivotY: 0.15 },
            lead_hand: { x: 68, y: 120, w: 32, h: 32, pivotX: 0.5, pivotY: 0.15 },
            lead_thigh: { x: 100, y: 120, w: 44, h: 72, pivotX: 0.5, pivotY: 0.15 },
            lead_shin: { x: 144, y: 120, w: 40, h: 68, pivotX: 0.5, pivotY: 0.15 },
            lead_boot: { x: 184, y: 120, w: 44, h: 32, pivotX: 0.5, pivotY: 0.15 },
            pauldron_rear: { x: 0, y: 188, w: 48, h: 44, pivotX: 0.5, pivotY: 0.15 },
            pauldron_lead: { x: 48, y: 188, w: 48, h: 44, pivotX: 0.5, pivotY: 0.15 },
            weapon_base: { x: 96, y: 188, w: 32, h: 128, pivotX: 0.5, pivotY: 0.15 },
            weapon_glow: { x: 128, y: 188, w: 40, h: 136, pivotX: 0.5, pivotY: 0.15 },
            accessory: { x: 168, y: 188, w: 48, h: 112, pivotX: 0.5, pivotY: 0.15 }
          }
        };

        ModularAtlasManager.registerAtlas(mockScene as any, charId, mockMetadata as any);
        expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, charId)).toBe(true);

        const container = renderer.createFighterRigContainer(mockScene as any, charId);
        expect(container.list).toHaveLength(20);

        for (const state of COMBAT_STATES) {
          const kinematics = buildStateKinematics(state, 1, false, { x: 300, y: 400 });
          renderer.renderTexturedFighter(mockScene as any, container, charId, state, kinematics, 16.66);

          // All 20 sprites should have finite positions, rotations, scales
          for (let i = 0; i < 20; i++) {
            const sprite = container.list[i];
            expect(Number.isFinite(sprite.x)).toBe(true);
            expect(Number.isFinite(sprite.y)).toBe(true);
            expect(Number.isFinite(sprite.rotation)).toBe(true);
            expect(Number.isFinite(sprite.scaleX)).toBe(true);
            expect(Number.isFinite(sprite.scaleY)).toBe(true);
            expect(sprite.originX).toBe(0.5);
            expect(sprite.originY).toBe(0.15);
            expect(sprite.depth).toBe(RIG_Z_INDEX_MATRIX[i].layer);
          }
        }
      });
    }
  });

  describe('6. Verlet Ragdoll Kinematics Tumbling Stress Test (100 Timesteps)', () => {
    it('proves zero distal endpoint error (< 10^-5) across 100 physics steps of dynamic ragdoll tumbling', () => {
      const ragdoll = new RagdollSystem();
      ragdoll.initDefaultSkeleton({ x: 400, y: 300 }, 1.0);
      ragdoll.setMode('Ragdoll');

      // Apply explosive KO impulse
      ragdoll.applyImpulse('pelvis', { x: 350, y: -200 });

      let maxRagdollDistalError = 0;

      for (let step = 0; step < 100; step++) {
        ragdoll.step(0.016);

        const head = ragdoll.getNode('head')!;
        const neck = ragdoll.getNode('neck')!;
        const pelvis = ragdoll.getNode('pelvis')!;
        const elbowL = ragdoll.getNode('elbowL')!;
        const handL = ragdoll.getNode('handL')!;
        const elbowR = ragdoll.getNode('elbowR')!;
        const handR = ragdoll.getNode('handR')!;
        const kneeL = ragdoll.getNode('kneeL')!;
        const footL = ragdoll.getNode('footL')!;
        const kneeR = ragdoll.getNode('kneeR')!;
        const footR = ragdoll.getNode('footR')!;

        const segments = [
          { p1: neck, p2: head },
          { p1: neck, p2: pelvis },
          { p1: neck, p2: elbowL },
          { p1: elbowL, p2: handL },
          { p1: neck, p2: elbowR },
          { p1: elbowR, p2: handR },
          { p1: pelvis, p2: kneeL },
          { p1: kneeL, p2: footL },
          { p1: pelvis, p2: kneeR },
          { p1: kneeR, p2: footR }
        ];

        for (const seg of segments) {
          const transform = computeLimbTransform(seg.p1, seg.p2, 1, 20);
          const p2Rec = reconstructDistalEndpoint(transform);
          const error = euclideanDistance(seg.p2, p2Rec);

          if (error > maxRagdollDistalError) {
            maxRagdollDistalError = error;
          }

          expect(error).toBeLessThan(1e-5);
          expect(Number.isFinite(transform.angleRad)).toBe(true);
        }
      }

      expect(maxRagdollDistalError).toBeLessThan(1e-12);
    });
  });

  describe('7. Spine Bending Kinematics (solveSpineCurve) Quad Alignment', () => {
    it('proves spine curve solver generates smooth continuous segment quads with error < 10^-5', () => {
      const root = { x: 300, y: 400 };
      const mid = { x: 300, y: 350 };
      const head = { x: 300, y: 300 };

      const bendAmounts = [-50, -25, -10, 0, 10, 25, 50];

      for (const bend of bendAmounts) {
        const spine = solveSpineCurve(root, mid, head, bend);

        const lowerSpine = computeLimbTransform(spine.root, spine.mid, 1, 24);
        const upperSpine = computeLimbTransform(spine.mid, spine.head, 1, 24);

        const midRec = reconstructDistalEndpoint(lowerSpine);
        const headRec = reconstructDistalEndpoint(upperSpine);

        const errMid = euclideanDistance(spine.mid, midRec);
        const errHead = euclideanDistance(spine.head, headRec);

        expect(errMid).toBeLessThan(1e-5);
        expect(errHead).toBeLessThan(1e-5);

        // Spine continuity at mid joint
        const seamErr = euclideanDistance(midRec, { x: upperSpine.startX, y: upperSpine.startY });
        expect(seamErr).toBeLessThan(1e-5);
      }
    });
  });
});
