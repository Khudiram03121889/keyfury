import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CharacterRigRenderer,
  computeLimbTransform,
  type LimbSegmentTransform
} from '../CharacterRigRenderer';
import {
  solve2BoneIK,
  solveSpineCurve,
  RagdollSystem,
  getCharacterDefinition
} from '@keyfury/game-core';
import {
  MockPhaserScene,
  MockPhaserContainer,
  MockPhaserSprite,
  MockPhaserGraphics
} from './MockPhaserHarness';
import { ModularAtlasManager } from '../ModularAtlasManager';

describe('CharacterRigRenderer Unit Test Suite', () => {
  let renderer: CharacterRigRenderer;
  let mockScene: MockPhaserScene;
  let mockContainer: MockPhaserContainer;

  beforeEach(() => {
    renderer = new CharacterRigRenderer();
    mockScene = new MockPhaserScene();
    mockContainer = new MockPhaserContainer();
    ModularAtlasManager.clearCache();
  });

  describe('1. Mathematical Quad Transforms & Endpoint Geometry', () => {
    it('computes exact transform for horizontal segment (0,0) -> (30,0)', () => {
      const transform = computeLimbTransform({ x: 0, y: 0 }, { x: 30, y: 0 }, 1, 20);
      expect(transform.length).toBeCloseTo(30, 4);
      expect(transform.angleRad).toBeCloseTo(0, 4);
      expect(transform.startX).toBe(0);
      expect(transform.startY).toBe(0);
      expect(transform.endX).toBe(30);
      expect(transform.endY).toBe(0);
    });

    it('computes exact transform for vertical downward segment (100,100) -> (100,140)', () => {
      const transform = computeLimbTransform({ x: 100, y: 100 }, { x: 100, y: 140 }, 1, 20);
      expect(transform.length).toBeCloseTo(40, 4);
      expect(transform.angleRad).toBeCloseTo(Math.PI / 2, 4);
    });

    it('computes exact transform for diagonal 3-4-5 segment (0,0) -> (30,40)', () => {
      const transform = computeLimbTransform({ x: 0, y: 0 }, { x: 30, y: 40 }, 1, 20);
      expect(transform.length).toBeCloseTo(50, 4);
      expect(transform.angleRad).toBeCloseTo(Math.atan2(40, 30), 4);
    });

    it('clamps zero-length collapsed limb segments gracefully without NaN or Infinity', () => {
      const transform = computeLimbTransform({ x: 50, y: 50 }, { x: 50, y: 50 }, 1, 20);
      expect(transform.length).toBeGreaterThanOrEqual(1e-5);
      expect(Number.isNaN(transform.angleRad)).toBe(false);
      expect(Number.isFinite(transform.angleRad)).toBe(true);
    });

    it('applies facing direction mirroring (facing = -1) accurately', () => {
      const rightTransform = computeLimbTransform({ x: 100, y: 100 }, { x: 130, y: 140 }, 1, 20);
      const leftTransform = computeLimbTransform({ x: 100, y: 100 }, { x: 70, y: 140 }, -1, 20);

      expect(rightTransform.length).toBeCloseTo(leftTransform.length, 4);
      expect(leftTransform.facing).toBe(-1);
    });
  });

  describe('2. Proximal Pivot & Concentric Joint Cap Overlap', () => {
    it('sets sprite origin strictly to proximal joint pivot (0.5, 0.15)', () => {
      const sprite = new MockPhaserSprite();
      renderer.applyLimbTransformToSprite(
        sprite as any,
        { startX: 100, startY: 200, endX: 130, endY: 200, length: 30, angleRad: 0, width: 20, facing: 1 },
        { pivotX: 0.5, pivotY: 0.15 }
      );

      expect(sprite.x).toBe(100);
      expect(sprite.y).toBe(200);
      expect(sprite.originX).toBe(0.5);
      expect(sprite.originY).toBe(0.15);
    });

    it('preserves concentric joint pivot center during 360-degree rotation sweep', () => {
      const angles = [-Math.PI, -Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, Math.PI];
      const start = { x: 200, y: 300 };

      for (const angle of angles) {
        const end = { x: start.x + Math.cos(angle) * 40, y: start.y + Math.sin(angle) * 40 };
        const transform = computeLimbTransform(start, end, 1, 20);
        const sprite = new MockPhaserSprite();
        renderer.applyLimbTransformToSprite(sprite as any, transform, { pivotX: 0.5, pivotY: 0.15 });

        expect(sprite.x).toBe(start.x);
        expect(sprite.y).toBe(start.y);
        const angleDiff = Math.atan2(Math.sin(sprite.rotation - angle), Math.cos(sprite.rotation - angle));
        expect(angleDiff).toBeCloseTo(0, 3);
      }
    });

    it('scales scaleY by effective bone span (1 - 2*pivotY) for exact distal socket positioning at bone endpoint', () => {
      const sprite = new MockPhaserSprite();
      const boneLength = 35;
      const nominalHeight = 50;
      const pivot = { pivotX: 0.5, pivotY: 0.15 }; // spanRatio = 1 - 2*0.15 = 0.70, effectiveBoneHeight = 35

      renderer.applyLimbTransformToSprite(
        sprite as any,
        { startX: 0, startY: 0, endX: 0, endY: boneLength, length: boneLength, angleRad: Math.PI / 2, width: 20, facing: 1 },
        pivot,
        nominalHeight,
        20
      );

      // S_y = 35 / (0.70 * 50) = 35 / 35 = 1.0
      expect(sprite.scaleY).toBeCloseTo(1.0, 4);

      // Distance from proximal pivot (0.15) to distal socket (0.85) in world space:
      // d = (0.85 - 0.15) * nominalHeight * scaleY = 0.70 * 50 * 1.0 = 35px = boneLength
      const distalWorldDistance = (0.85 - pivot.pivotY) * nominalHeight * sprite.scaleY;
      expect(distalWorldDistance).toBeCloseTo(boneLength, 4);
    });
  });

  describe('3. Kinematics & IK Output Alignment', () => {
    it('binds solve2BoneIK arm solutions directly to upper arm and forearm quads', () => {
      const shoulder = { x: 100, y: 200 };
      const handTarget = { x: 140, y: 210 };
      const ik = solve2BoneIK(shoulder, handTarget, 24, 24, 1);

      expect(ik.reached).toBe(true);

      const upperArm = computeLimbTransform(shoulder, ik.joint, 1, 16);
      const forearm = computeLimbTransform(ik.joint, ik.tip, 1, 14);

      expect(upperArm.length).toBeCloseTo(24, 2);
      expect(forearm.length).toBeCloseTo(24, 2);
      expect(forearm.startX).toBe(upperArm.endX);
      expect(forearm.startY).toBe(upperArm.endY);
    });

    it('binds solve2BoneIK leg solutions directly to thigh and shin quads', () => {
      const hip = { x: 100, y: 250 };
      const footTarget = { x: 120, y: 310 };
      const ik = solve2BoneIK(hip, footTarget, 30, 30, -1);

      const thigh = computeLimbTransform(hip, ik.joint, 1, 20);
      const shin = computeLimbTransform(ik.joint, ik.tip, 1, 18);

      expect(thigh.length).toBeCloseTo(30, 2);
      expect(shin.length).toBeCloseTo(30, 2);
      expect(shin.startX).toBe(thigh.endX);
      expect(shin.startY).toBe(thigh.endY);
    });

    it('binds 11 Verlet ragdoll nodes directly to quad skeleton in KO knockdown state', () => {
      const ragdoll = new RagdollSystem();
      ragdoll.initDefaultSkeleton({ x: 300, y: 400 }, 1.0);
      ragdoll.setMode('Ragdoll');
      ragdoll.step(0.016);

      const headNode = ragdoll.getNode('head')!;
      const neckNode = ragdoll.getNode('neck')!;
      const spineTransform = computeLimbTransform(neckNode, headNode, 1, 24);

      expect(spineTransform.length).toBeGreaterThan(0);
      expect(Number.isFinite(spineTransform.angleRad)).toBe(true);
    });
  });

  describe('4. 20-Layer Strict Z-Ordering Matrix', () => {
    it('enforces 20-layer ascending depth hierarchy across all rig components', () => {
      const expectedZMatrix = [
        { layer: 0, name: 'rear_accessory' },
        { layer: 1, name: 'rear_foot' },
        { layer: 2, name: 'rear_shin' },
        { layer: 3, name: 'rear_knee_cap' },
        { layer: 4, name: 'rear_thigh' },
        { layer: 5, name: 'rear_hand' },
        { layer: 6, name: 'rear_forearm' },
        { layer: 7, name: 'rear_elbow_cap' },
        { layer: 8, name: 'rear_upper_arm' },
        { layer: 9, name: 'rear_pauldron' },
        { layer: 10, name: 'pelvis_waist' },
        { layer: 11, name: 'torso_cuirass' },
        { layer: 12, name: 'headgear_base' },
        { layer: 13, name: 'visor_optics' },
        { layer: 14, name: 'lead_thigh' },
        { layer: 15, name: 'lead_shin_boot' },
        { layer: 16, name: 'lead_upper_arm_pauldron' },
        { layer: 17, name: 'lead_forearm_gauntlet' },
        { layer: 18, name: 'weapon_base' },
        { layer: 19, name: 'weapon_glow_fx' }
      ];

      const zIndexList = renderer.getZIndexMatrix();
      expect(zIndexList).toHaveLength(20);

      for (let i = 0; i < 20; i++) {
        expect(zIndexList[i].layer).toBe(i);
        expect(zIndexList[i].name).toBe(expectedZMatrix[i].name);
      }
    });
  });

  describe('5. Dual-Layer Additive Weapon Rendering', () => {
    it('applies Phaser.BlendModes.ADD strictly to Layer 19 and NORMAL to base quads', () => {
      const sprites = renderer.createRigSprites(mockScene as any);
      expect(sprites).toHaveLength(20);

      // Layers 0 to 18 must be NORMAL (0)
      for (let i = 0; i < 19; i++) {
        expect(sprites[i].blendMode).toBe(0);
      }

      // Layer 19 (Weapon Glow / Elemental Slash) must be ADD (1)
      expect(sprites[19].blendMode).toBe(1);
    });

    it('modulates weapon glow alpha on dynamic update', () => {
      const container = renderer.createFighterRigContainer(mockScene as any, 'shadow_ronin');
      renderer.updateRigContainer(container, {}, 100, 'windup');
      const glowSprite = container.list[19];
      expect(glowSprite.alpha).toBeGreaterThan(0);
    });
  });

  describe('6. Fallback to Procedural Vector Mesh', () => {
    it('delegates to vector graphics renderer when atlas is not loaded', () => {
      const fallbackSpy = vi.spyOn(renderer, 'renderVectorFallback');

      renderer.renderTexturedFighter(
        mockScene as any,
        mockContainer as any,
        'shadow_ronin',
        'idle',
        {} as any
      );

      expect(fallbackSpy).toHaveBeenCalled();
    });

    it('pools and reuses fallback graphics on container without leaking graphics across 60 frames', () => {
      const graphicsAddSpy = vi.spyOn(mockScene.add, 'graphics');

      // Simulate 60 frame updates with fallback rendering
      for (let f = 0; f < 60; f++) {
        renderer.renderVectorFallback(
          mockScene as any,
          mockContainer as any,
          'shadow_ronin',
          'idle',
          {} as any,
          f * 16.66
        );
      }

      // scene.add.graphics() should ONLY be called twice (once for body graphics, once for fx graphics)
      expect(graphicsAddSpy).toHaveBeenCalledTimes(2);
      expect((mockContainer as any).__fallbackGraphics).toBeDefined();
      expect((mockContainer as any).__fallbackFxGraphics).toBeDefined();
    });

    it('hides textured sprites on container when executing fallback mode', () => {
      const sprites = renderer.createRigSprites(mockScene as any);
      mockContainer.add(sprites);

      // Make all sprites visible initially
      sprites.forEach((s) => s.setVisible(true));

      // Execute renderTexturedFighter while atlas is not loaded
      renderer.renderTexturedFighter(
        mockScene as any,
        mockContainer as any,
        'shadow_ronin',
        'idle',
        {} as any
      );

      // Verify that all bone sprites in container are hidden
      const texturedSprites = mockContainer.list.filter(
        (item: any) => item !== (mockContainer as any).__fallbackGraphics && item !== (mockContainer as any).__fallbackFxGraphics
      );
      expect(texturedSprites.length).toBe(20);
      for (const sprite of texturedSprites) {
        expect(sprite.visible).toBe(false);
      }
    });

    it('clears fallback graphics when switching to textured mode', () => {
      // Create and attach fallback graphics
      const mockG = new MockPhaserGraphics();
      const mockFxG = new MockPhaserGraphics();
      const clearGSpy = vi.spyOn(mockG, 'clear');
      const clearFxGSpy = vi.spyOn(mockFxG, 'clear');

      (mockContainer as any).__fallbackGraphics = mockG;
      (mockContainer as any).__fallbackFxGraphics = mockFxG;

      // Register valid mock atlas so atlas is loaded
      ModularAtlasManager.registerAtlas(mockScene as any, 'shadow_ronin', {
        characterId: 'shadow_ronin',
        version: '1.0.0',
        image: 'atlas.png',
        parts: {
          head: { x: 0, y: 0, w: 50, h: 50, pivotX: 0.5, pivotY: 0.15 }
        }
      });

      renderer.renderTexturedFighter(
        mockScene as any,
        mockContainer as any,
        'shadow_ronin',
        'idle',
        {} as any
      );

      expect(clearGSpy).toHaveBeenCalled();
      expect(clearFxGSpy).toHaveBeenCalled();
    });
  });

  describe('7. Zero-Allocation Sprite Quad Object Pooling', () => {
    it('mutates existing sprite quads on successive frames without reallocating', () => {
      const sprites = renderer.createRigSprites(mockScene as any);
      mockContainer.add(sprites);

      const initialRefs = [...mockContainer.list];

      // Simulate 60 frame updates
      for (let f = 0; f < 60; f++) {
        renderer.updateRigContainer(mockContainer as any, {}, f * 16.66, 'idle');
      }

      // Exact same instances retained in container
      expect(mockContainer.list).toHaveLength(initialRefs.length);
      for (let i = 0; i < initialRefs.length; i++) {
        expect(mockContainer.list[i]).toBe(initialRefs[i]);
      }
    });
  });
});
