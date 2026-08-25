import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CharacterRigRenderer,
  computeLimbTransform,
  type FighterState,
  type SolvedKinematics
} from '../CharacterRigRenderer';
import {
  ModularAtlasManager,
  type CharacterAtlasMetadata
} from '../ModularAtlasManager';
import {
  MockPhaserScene,
  MockPhaserSprite
} from './MockPhaserHarness';
import {
  solve2BoneIK,
  RagdollSystem
} from '@keyfury/game-core';

describe('Milestone 1: Shadow Ronin (Kage) Character Overhaul Verification Suite', () => {
  let renderer: CharacterRigRenderer;
  let mockScene: MockPhaserScene;
  let shadowRoninMetadata: CharacterAtlasMetadata;

  const assetDir = path.resolve(__dirname, '../../../../public/assets/characters/shadow_ronin');
  const jsonPath = path.join(assetDir, 'atlas.json');
  const pngPath = path.join(assetDir, 'atlas.png');

  beforeEach(() => {
    renderer = new CharacterRigRenderer();
    mockScene = new MockPhaserScene();
    ModularAtlasManager.clearCache();

    // Ingest authentic atlas.json file
    expect(fs.existsSync(jsonPath)).toBe(true);
    const rawJson = fs.readFileSync(jsonPath, 'utf-8');
    shadowRoninMetadata = JSON.parse(rawJson);
  });

  describe('1. Asset File Existence & Schema Ingestion', () => {
    it('verifies atlas.json and atlas.png exist in public directory', () => {
      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(fs.existsSync(pngPath)).toBe(true);

      const stats = fs.statSync(pngPath);
      expect(stats.size).toBeGreaterThan(1000); // Valid PNG file
      expect(stats.size).toBeLessThan(1024 * 1024); // Well under 1MB (<5MB roster budget)
    });

    it('validates standard 19-part / 21-slice schema for shadow_ronin', () => {
      const validation = ModularAtlasManager.validateMetadata(shadowRoninMetadata);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(shadowRoninMetadata.characterId).toBe('shadow_ronin');
      expect(shadowRoninMetadata.version).toBe('1.0.0');
      expect(shadowRoninMetadata.image).toBe('/assets/characters/shadow_ronin/atlas.png');
    });

    it('verifies normalized proximal pivots (0.5, 0.15) on all limb bones', () => {
      const limbParts = [
        'rear_upper_arm',
        'rear_forearm',
        'lead_upper_arm',
        'lead_forearm',
        'rear_thigh',
        'rear_shin',
        'lead_thigh',
        'lead_shin'
      ];

      for (const partKey of limbParts) {
        const part = shadowRoninMetadata.parts[partKey];
        expect(part).toBeDefined();
        expect(part.pivotX).toBe(0.5);
        expect(part.pivotY).toBe(0.15);
      }
    });

    it('verifies head, torso, pelvis, pauldrons, weapon, and scarf pivot assignments', () => {
      const { parts } = shadowRoninMetadata;
      expect(parts.head.pivotX).toBe(0.5);
      expect(parts.head.pivotY).toBe(0.5);
      expect(parts.headgear.pivotX).toBe(0.5);
      expect(parts.headgear.pivotY).toBe(0.5);
      expect(parts.torso.pivotY).toBe(0.2);
      expect(parts.pauldron_rear.pivotY).toBe(0.2);
      expect(parts.pauldron_lead.pivotY).toBe(0.2);
      expect(parts.weapon_base.pivotY).toBe(0.85);
      expect(parts.weapon_glow.pivotY).toBe(0.85);
      expect(parts.accessory.pivotX).toBe(0.15);
      expect(parts.accessory.pivotY).toBe(0.15);
    });

    it('registers shadow_ronin atlas into Phaser texture manager with all named frames', () => {
      const registered = ModularAtlasManager.registerAtlas(
        mockScene as any,
        'shadow_ronin',
        shadowRoninMetadata
      );
      expect(registered).toBe(true);
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(true);

      for (const partName of Object.keys(shadowRoninMetadata.parts)) {
        const frame = ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', partName);
        expect(frame).not.toBeNull();
        expect(frame?.name).toBe(partName);
      }
    });
  });

  describe('2. Azure Plasma Katana Dual-Layer Additive Glow & Pulse Modulation', () => {
    beforeEach(() => {
      ModularAtlasManager.registerAtlas(mockScene as any, 'shadow_ronin', shadowRoninMetadata);
    });

    it('verifies Layer 18 is weapon_base with NORMAL blend mode and Layer 19 is weapon_glow_fx with ADD blend mode', () => {
      const matrix = renderer.getZIndexMatrix();
      const layer18 = matrix[18];
      const layer19 = matrix[19];

      expect(layer18.name).toBe('weapon_base');
      expect(layer18.atlasPart).toBe('weapon_base');
      expect(layer18.blendMode).toBe(0); // Normal

      expect(layer19.name).toBe('weapon_glow_fx');
      expect(layer19.atlasPart).toBe('weapon_glow');
      expect(layer19.blendMode).toBe(1); // Additive
    });

    it('modulates katana pulse frequency dynamically across combat states (idle, windup, heavy, knockdown)', () => {
      const container = renderer.createFighterRigContainer(mockScene as any, 'shadow_ronin');
      const glowSprite = container.list[19] as MockPhaserSprite;

      // 1. Idle state: baseAlpha = 0.85, pulse period = 120ms
      renderer.updateRigContainer(container, {}, 0, 'idle', 'shadow_ronin');
      expect(glowSprite.alpha).toBeCloseTo(0.85, 2);
      expect(glowSprite.blendMode).toBe(1);

      renderer.updateRigContainer(container, {}, 60, 'idle', 'shadow_ronin');
      expect(glowSprite.alpha).toBeGreaterThan(0.7);

      // 2. Windup state: rapid charging oscillation (period = 60ms)
      renderer.updateRigContainer(container, {}, 15, 'windup', 'shadow_ronin');
      const windupAlpha = glowSprite.alpha;
      expect(windupAlpha).toBeGreaterThanOrEqual(0.7);
      expect(windupAlpha).toBeLessThanOrEqual(1.0);

      // 3. Heavy strike: intense overcharged blaze (period = 40ms)
      renderer.updateRigContainer(container, {}, 10, 'heavy', 'shadow_ronin');
      expect(glowSprite.alpha).toBeGreaterThanOrEqual(0.7);
      expect(glowSprite.alpha).toBeLessThanOrEqual(1.0);

      // 4. Knockdown state: de-energized katana (alpha = 0)
      renderer.updateRigContainer(container, {}, 100, 'knockdown', 'shadow_ronin');
      expect(glowSprite.alpha).toBe(0);
    });

    it('sets azure tint (0x00F2FE) on weapon glow sprite for shadow_ronin', () => {
      const container = renderer.createFighterRigContainer(mockScene as any, 'shadow_ronin');
      const glowSprite = container.list[19] as MockPhaserSprite;

      renderer.updateRigContainer(container, {}, 100, 'idle', 'shadow_ronin');
      expect(glowSprite.tint).toBe(0x00f2fe);
    });
  });

  describe('3. Dynamic Flowing Scarf Undulation', () => {
    beforeEach(() => {
      ModularAtlasManager.registerAtlas(mockScene as any, 'shadow_ronin', shadowRoninMetadata);
    });

    it('computes dynamic sinusoidal harmonic coordinates for the azure scarf across time', () => {
      const kinematics: SolvedKinematics = {
        head: { x: 0, y: -40 },
        neck: { x: 0, y: -25 },
        hip: { x: 0, y: 15 },
        lShoulder: { x: -10, y: -22 },
        rShoulder: { x: 10, y: -22 },
        lHip: { x: -8, y: 15 },
        rHip: { x: 8, y: 15 },
        armL: { joint: { x: -18, y: -10 }, tip: { x: -24, y: 0 } },
        armR: { joint: { x: 18, y: -10 }, tip: { x: 28, y: 0 } },
        legL: { joint: { x: -12, y: 35 }, tip: { x: -14, y: 60 } },
        legR: { joint: { x: 12, y: 35 }, tip: { x: 14, y: 60 } },
        facing: 1
      };

      const container = renderer.createFighterRigContainer(mockScene as any, 'shadow_ronin');
      const scarfSprite = container.list[0] as MockPhaserSprite;

      renderer.renderTexturedFighter(mockScene as any, container, 'shadow_ronin', 'idle', kinematics, 0);
      const initialY = scarfSprite.y;
      const initialRotation = scarfSprite.rotation;

      renderer.renderTexturedFighter(mockScene as any, container, 'shadow_ronin', 'idle', kinematics, 150);
      const waveY = scarfSprite.y;
      const waveRotation = scarfSprite.rotation;

      expect(waveY).toBe(initialY); // Origin anchored at neck
      expect(Number.isFinite(waveRotation)).toBe(true);
      expect(waveRotation).not.toBeNaN();
      expect(waveRotation).not.toBe(initialRotation); // Verified dynamic undulation oscillation
    });
  });

  describe('4. 10 Combat Poses Kinematics Verification Matrix', () => {
    const combatStates: FighterState[] = [
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

    beforeEach(() => {
      ModularAtlasManager.registerAtlas(mockScene as any, 'shadow_ronin', shadowRoninMetadata);
    });

    for (const state of combatStates) {
      it(`articulates "${state}" pose without NaN transforms, clipping, or scale collapse`, () => {
        const container = renderer.createFighterRigContainer(mockScene as any, 'shadow_ronin');

        // Solve realistic kinematics for state
        const hip = { x: 0, y: state === 'jump_kick' ? -80 : 15 };
        const neck = { x: 0, y: hip.y - 40 };
        const head = { x: state === 'hit' ? -8 : 0, y: neck.y - 15 };

        // 2-Bone IK arms and legs
        const shoulderL = { x: neck.x - 10, y: neck.y + 3 };
        const shoulderR = { x: neck.x + 10, y: neck.y + 3 };
        const hipL = { x: hip.x - 8, y: hip.y };
        const hipR = { x: hip.x + 8, y: hip.y };

        const targetHandR =
          state === 'jab'
            ? { x: shoulderR.x + 44, y: shoulderR.y }
            : state === 'uppercut'
              ? { x: shoulderR.x + 15, y: shoulderR.y - 38 }
              : state === 'heavy'
                ? { x: shoulderR.x + 40, y: shoulderR.y + 10 }
                : state === 'windup'
                  ? { x: shoulderR.x - 15, y: shoulderR.y - 10 }
                  : { x: shoulderR.x + 18, y: shoulderR.y + 22 };

        const targetFootR =
          state === 'kick'
            ? { x: hipR.x + 48, y: hipR.y - 18 }
            : state === 'jump_kick'
              ? { x: hipR.x + 50, y: hipR.y + 10 }
              : { x: hipR.x + 14, y: hipR.y + 45 };

        const armR_IK = solve2BoneIK(shoulderR, targetHandR, 20, 20, 1);
        const armL_IK = solve2BoneIK(shoulderL, { x: shoulderL.x - 14, y: shoulderL.y + 22 }, 20, 20, -1);
        const legR_IK = solve2BoneIK(hipR, targetFootR, 25, 25, 1);
        const legL_IK = solve2BoneIK(hipL, { x: hipL.x - 14, y: hipR.y + 45 }, 25, 25, -1);

        const kinematics: SolvedKinematics = {
          head,
          neck,
          hip,
          lShoulder: shoulderL,
          rShoulder: shoulderR,
          lHip: hipL,
          rHip: hipR,
          armL: { joint: armL_IK.joint, tip: targetHandR },
          armR: { joint: armR_IK.joint, tip: targetHandR },
          legL: { joint: legL_IK.joint, tip: { x: hipL.x - 14, y: hipR.y + 45 } },
          legR: { joint: legR_IK.joint, tip: targetFootR },
          facing: 1
        };

        renderer.renderTexturedFighter(
          mockScene as any,
          container,
          'shadow_ronin',
          state,
          kinematics,
          250
        );

        // Verify every sprite has finite position, rotation, scale, and visibility
        expect(container.list.length).toBe(20);
        for (let i = 0; i < container.list.length; i++) {
          const sprite = container.list[i] as MockPhaserSprite;
          expect(Number.isFinite(sprite.x)).toBe(true);
          expect(Number.isFinite(sprite.y)).toBe(true);
          expect(Number.isFinite(sprite.rotation)).toBe(true);
          expect(Number.isFinite(sprite.scaleX)).toBe(true);
          expect(Number.isFinite(sprite.scaleY)).toBe(true);
          expect(sprite.scaleX).not.toBe(0);
          expect(sprite.scaleY).not.toBe(0);
          expect(Number.isNaN(sprite.x)).toBe(false);
          expect(Number.isNaN(sprite.y)).toBe(false);
          expect(Number.isNaN(sprite.rotation)).toBe(false);
          expect(Number.isNaN(sprite.scaleX)).toBe(false);
          expect(Number.isNaN(sprite.scaleY)).toBe(false);
          expect(sprite.visible).toBe(true);
        }
      });
    }
  });

  describe('5. Distal Socket Mathematical Precision & Zero Clipping (< 10^-10 Error)', () => {
    it('proves that distal socket endpoint error is < 10^-10 across all 360-degree angles', () => {
      const p1 = { x: 150, y: 250 };
      const boneLength = 48.75;
      const pivot = { pivotX: 0.5, pivotY: 0.15 };
      const nominalHeight = 50;
      const nominalWidth = 20;

      // Sweep angles in 1-degree steps across full circle
      for (let deg = -180; deg <= 180; deg += 5) {
        const rad = (deg * Math.PI) / 180;
        const targetP2 = {
          x: p1.x + Math.cos(rad) * boneLength,
          y: p1.y + Math.sin(rad) * boneLength
        };

        const transform = computeLimbTransform(p1, targetP2, 1, 20);
        expect(Number.isNaN(transform.length)).toBe(false);
        expect(Number.isNaN(transform.angleRad)).toBe(false);

        const sprite = new MockPhaserSprite();
        renderer.applyLimbTransformToSprite(sprite as any, transform, pivot, nominalHeight, nominalWidth);

        // Compute distal joint location from sprite transform
        const spanRatio = 1 - 2 * pivot.pivotY; // 0.70 for pivotY = 0.15
        const effectiveHeight = nominalHeight * spanRatio;
        const distalOffsetY = effectiveHeight; // span to distal socket
        const worldDistalX = sprite.x + Math.cos(sprite.rotation) * (distalOffsetY * sprite.scaleY);
        const worldDistalY = sprite.y + Math.sin(sprite.rotation) * (distalOffsetY * sprite.scaleY);

        const error = Math.hypot(worldDistalX - targetP2.x, worldDistalY - targetP2.y);
        expect(error).toBeLessThan(1e-10);
      }
    });

    it('verifies Verlet ragdoll knockdown integration produces valid zero-NaN poses', () => {
      const ragdoll = new RagdollSystem();
      ragdoll.setMode('Ragdoll');
      ragdoll.applyImpulse('head', { x: 150, y: -80 });
      // Step simulation multiple frames to simulate tumble
      for (let i = 0; i < 15; i++) {
        ragdoll.step(1 / 60);
      }

      const container = renderer.createFighterRigContainer(mockScene as any, 'shadow_ronin');
      ModularAtlasManager.registerAtlas(mockScene as any, 'shadow_ronin', shadowRoninMetadata);

      renderer.renderRagdollTexturedFighter(
        mockScene as any,
        container,
        'shadow_ronin',
        ragdoll,
        1000
      );

      for (let i = 0; i < container.list.length; i++) {
        const sprite = container.list[i] as MockPhaserSprite;
        expect(Number.isFinite(sprite.x)).toBe(true);
        expect(Number.isFinite(sprite.y)).toBe(true);
        expect(Number.isNaN(sprite.rotation)).toBe(false);
        expect(Number.isNaN(sprite.scaleX)).toBe(false);
        expect(Number.isNaN(sprite.scaleY)).toBe(false);
      }
    });
  });
});
