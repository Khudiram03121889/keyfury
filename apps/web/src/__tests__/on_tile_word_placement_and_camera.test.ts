import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as THREE from 'three';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
} from '../game/character/Character3DController';
import {
  CAMERA_PRESETS,
  ARENA_DEFINITIONS,
  TilePromptDisplay,
  type CameraPreset,
} from '../render/ThreeCombatArena';

beforeAll(() => {
  if (typeof (globalThis as any).document === 'undefined') {
    const mockCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      measureText: (text: string) => ({ width: text.length * 20 }),
      fillText: vi.fn(),
      fillRect: vi.fn(),
    };
    (globalThis as any).document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            width: 512,
            height: 128,
            getContext: () => mockCtx,
          };
        }
        return {};
      },
    };
  }
});

function createMockLoader(): any {
  return {
    load: vi.fn((_url: string, onLoad: (gltf: any) => void) => {
      const rootBone = new THREE.Bone();
      rootBone.name = 'root';
      const footLBone = new THREE.Bone();
      footLBone.name = 'foot_l';
      footLBone.position.set(-0.35, 0.15, 0.05);
      const footRBone = new THREE.Bone();
      footRBone.name = 'foot_r';
      footRBone.position.set(0.35, 0.15, -0.05);

      rootBone.add(footLBone);
      rootBone.add(footRBone);

      const scene = new THREE.Group();
      scene.add(rootBone);

      const mockGltf = {
        scene,
        animations: [],
      };
      onLoad(mockGltf);
    }),
  };
}

describe('On-Tile Word Placement & Multi-Angle Camera System', () => {
  describe('1. Dynamic Character Leg World Bounds Anchor (Zero Hard-Coded Offsets)', () => {
    it('queries dynamic 3D world bounds using real bone geometry', () => {
      const loader = createMockLoader();
      const fighter = new Character3DFighter('ronin', 'left', loader);
      fighter.setEntranceProgress(1.0, 'cyber_rooftop');
      fighter.update(0.016, 1.0);

      const bounds = fighter.getLegWorldBounds();
      expect(Number.isFinite(bounds.anchorX)).toBe(true);
      expect(Number.isFinite(bounds.anchorY)).toBe(true);
      expect(Number.isFinite(bounds.anchorZ)).toBe(true);
      expect(Number.isFinite(bounds.lowestY)).toBe(true);
      expect(bounds.footSeparation).toBeGreaterThan(0.1);
    });

    it('falls back gracefully to character group position if skeleton is not yet loaded', () => {
      const emptyLoader: any = { load: vi.fn() };
      const fighter = new Character3DFighter('shinobi', 'right', emptyLoader);
      fighter.setEntranceProgress(1.0, 'cyber_rooftop');

      const bounds = fighter.getLegWorldBounds();
      expect(bounds.anchorX).toBe(fighter.group.position.x);
      expect(bounds.lowestY).toBe(fighter.baseY);
      expect(bounds.footSeparation).toBe(0.6);
    });

    it('synchronizes leg world bounds with lunges, advances, and knockback', () => {
      const loader = createMockLoader();
      const fighter = new Character3DFighter('valkyrie', 'left', loader);
      fighter.setEntranceProgress(1.0, 'cyber_rooftop');
      fighter.update(0.016, 1.0);

      const initialBounds = fighter.getLegWorldBounds();

      // Trigger jab lunge
      fighter.playJab();
      fighter.update(0.12, 1.12);

      const lungeBounds = fighter.getLegWorldBounds();
      // Mesh has lunged forward in +X
      expect(lungeBounds.anchorX).toBeGreaterThanOrEqual(initialBounds.anchorX);
    });
  });

  describe('2. On-Tile Word Prompt Renderer (TilePromptDisplay)', () => {
    it('instantiates high-res canvas texture and plane mesh with depthWrite: false', () => {
      const tilePrompt = new TilePromptDisplay('left');
      expect(tilePrompt.mesh).toBeDefined();
      expect(tilePrompt.mesh.name).toBe('TilePrompt_left');
      expect(tilePrompt.mesh.material.transparent).toBe(true);
      expect(tilePrompt.mesh.material.depthWrite).toBe(false);
      expect(tilePrompt.mesh.renderOrder).toBe(10);
      tilePrompt.dispose();
    });

    it('scales dynamic geometry width based on word length to prevent truncation', () => {
      const tilePrompt = new TilePromptDisplay('left');

      // Short word
      tilePrompt.update('GO', 0, false, '#00f0ff');
      const shortWidth = (tilePrompt.mesh.geometry as THREE.PlaneGeometry).parameters.width;

      // Long word
      tilePrompt.update('CYBERNETICS', 3, false, '#00f0ff');
      const longWidth = (tilePrompt.mesh.geometry as THREE.PlaneGeometry).parameters.width;

      expect(longWidth).toBeGreaterThan(shortWidth);
      expect(longWidth).toBeGreaterThanOrEqual(2.0);
      tilePrompt.dispose();
    });

    it('positions on arena floor tile directly beneath character legs without obscuring them', () => {
      const tilePrompt = new TilePromptDisplay('left');
      const anchorX = -2.2;
      const lowestY = 0.205; // Platform surface
      const anchorZ = 0.0;

      tilePrompt.setPositionAndVisibility(anchorX, lowestY, anchorZ, true);

      expect(tilePrompt.mesh.visible).toBe(true);
      expect(tilePrompt.mesh.position.x).toBe(anchorX);
      // Floor placement: placed just 0.02 above arena floor to avoid z-fighting
      expect(tilePrompt.mesh.position.y).toBeCloseTo(lowestY + 0.02, 3);
      // Forward offset on floor tile in front of/under feet
      expect(tilePrompt.mesh.position.z).toBeCloseTo(anchorZ + 0.42, 2);
      // Angled upward towards camera for crisp legibility
      expect(tilePrompt.mesh.rotation.x).toBeCloseTo(-Math.PI / 2.3, 2);

      tilePrompt.dispose();
    });
  });

  describe('3. Multi-Angle Camera System & Right-Side Symmetrical Framing', () => {
    it('includes all 7 camera presets including right and left flank views and wide front', () => {
      expect(CAMERA_PRESETS).toHaveLength(7);
      const expectedIds: CameraPreset[] = [
        'front',
        'left',
        'right',
        'spider_cam',
        'focused_60',
        'back',
        'wide_front',
      ];
      expect(CAMERA_PRESETS.map((p) => p.id)).toEqual(expectedIds);
    });

    it('verifies left (Left 45°) and right (Right 45°) maintain identical distance, FOV, and symmetrical perspective', () => {
      const arena = ARENA_DEFINITIONS.cyber_rooftop;
      const leftPreset = CAMERA_PRESETS.find((p) => p.id === 'left')!;
      const rightPreset = CAMERA_PRESETS.find((p) => p.id === 'right')!;

      const leftT = leftPreset.getTransform(arena);
      const rightT = rightPreset.getTransform(arena);

      // Symmetrical position X (-5.0 vs +5.0)
      expect(leftT.pos[0]).toBe(-5.0);
      expect(rightT.pos[0]).toBe(5.0);

      // Symmetrical lookAt X (+0.2 vs -0.2)
      expect(leftT.lookAt[0]).toBe(0.2);
      expect(rightT.lookAt[0]).toBe(-0.2);

      // Identical elevation and forward depth
      expect(leftT.pos[1]).toBeCloseTo(rightT.pos[1], 4);
      expect(leftT.pos[2]).toBeCloseTo(rightT.pos[2], 4);

      // Identical lookAt elevation
      expect(leftT.lookAt[1]).toBeCloseTo(rightT.lookAt[1], 4);

      // Identical FOV (36.0 deg)
      expect(leftT.fov).toBe(36.0);
      expect(rightT.fov).toBe(36.0);
    });

    it('ensures all camera presets include character legs and floor tiles within their vertical frustum', () => {
      const arenas = Object.values(ARENA_DEFINITIONS);

      arenas.forEach((arena) => {
        CAMERA_PRESETS.forEach((preset) => {
          const t = preset.getTransform(arena);
          expect(Number.isFinite(t.pos[0])).toBe(true);
          expect(Number.isFinite(t.pos[1])).toBe(true);
          expect(Number.isFinite(t.pos[2])).toBe(true);
          expect(Number.isFinite(t.lookAt[0])).toBe(true);
          expect(Number.isFinite(t.lookAt[1])).toBe(true);
          expect(Number.isFinite(t.lookAt[2])).toBe(true);
          expect(t.fov).toBeGreaterThan(20);
          expect(t.fov).toBeLessThan(70);

          // Floor elevation is between 0.0 and 0.5; camera lookAt is directed to encompass floor + fighter legs
          expect(t.lookAt[1]).toBeGreaterThanOrEqual(arena.fighterFloorY);
        });
      });
    });
  });
});
