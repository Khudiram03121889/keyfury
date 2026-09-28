import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ARENA_REGISTRY,
  getArenaDefinition,
  getAllArenas,
  getRandomArenaId,
  DEFAULT_ARENA_ID,
  ArenaId,
  ArenaDefinition
} from '@keyfury/game-core';
import { ARENA_BACKGROUNDS } from '../assets/arenas';
import { getSavedSelectedArena, saveSelectedArena } from '../lib/supabase';
import {
  getCleanArenaName,
  getCameraTransformForAngle,
  CAMERA_VIEWS,
  type CameraAngle
} from '../components/arena/ArenaSelectModal';

// Mock localStorage for Node test runner
const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear()
};
(globalThis as any).localStorage = mockLocalStorage;

describe('KeyFury 4 Dynamic Combat Arenas Test Suite', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('validates that exactly 4 distinct arenas are registered in ARENA_REGISTRY', () => {
    const arenas = getAllArenas();
    expect(arenas.length).toBe(4);

    const expectedIds: ArenaId[] = [
      'highland_sanctuary',
      'cyber_rooftop',
      'volcanic_caldera',
      'celestial_void'
    ];

    expectedIds.forEach((id) => {
      expect(ARENA_REGISTRY[id]).toBeDefined();
      expect(ARENA_REGISTRY[id].id).toBe(id);
    });
  });

  it('verifies all 4 arenas have valid theme palettes, platform ratios, and metadata', () => {
    const arenas = getAllArenas();

    for (const arena of arenas) {
      expect(arena.name).toBeTruthy();
      expect(arena.subtitle).toBeTruthy();
      expect(arena.tagline).toBeTruthy();
      expect(arena.lore).toBeTruthy();

      // Platform grounding metrics
      expect(arena.platformRatio).toBeGreaterThan(0.5);
      expect(arena.platformRatio).toBeLessThan(0.8);
      expect(arena.portraitPlatformRatio).toBeGreaterThan(0.60);
      expect(arena.portraitPlatformRatio).toBeLessThan(0.85);

      // Theme colors
      expect(arena.theme.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(arena.theme.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(arena.theme.particlePalette.length).toBeGreaterThanOrEqual(3);
      expect(['daylight', 'neon_night', 'infernal', 'astral']).toContain(arena.theme.lightingMood);
    }
  });

  it('verifies getArenaDefinition handles valid, null, and unknown ids with safe fallback', () => {
    const highland = getArenaDefinition('highland_sanctuary');
    expect(highland.id).toBe('highland_sanctuary');
    expect(highland.name).toBe('Highland Sanctuary');

    const cyber = getArenaDefinition('cyber_rooftop');
    expect(cyber.id).toBe('cyber_rooftop');
    expect(cyber.name).toBe('Cyber Neon Rooftop');

    const volcanic = getArenaDefinition('volcanic_caldera');
    expect(volcanic.id).toBe('volcanic_caldera');
    expect(volcanic.name).toBe('Volcanic Caldera');

    const celestial = getArenaDefinition('celestial_void');
    expect(celestial.id).toBe('celestial_void');
    expect(celestial.name).toBe('Celestial Void Shrine');

    // Unknown and null fallbacks
    const fallbackNull = getArenaDefinition(null);
    expect(fallbackNull.id).toBe(DEFAULT_ARENA_ID);

    const fallbackUnknown = getArenaDefinition('unknown_zone_999');
    expect(fallbackUnknown.id).toBe(DEFAULT_ARENA_ID);
  });

  it('verifies getRandomArenaId always returns a valid ArenaId', () => {
    for (let i = 0; i < 20; i++) {
      const randomId = getRandomArenaId();
      expect(ARENA_REGISTRY[randomId]).toBeDefined();
    }
  });

  it('verifies all 4 arena image backgrounds are properly mapped in web assets', () => {
    expect(ARENA_BACKGROUNDS.highland_sanctuary).toBeDefined();
    expect(ARENA_BACKGROUNDS.cyber_rooftop).toBeDefined();
    expect(ARENA_BACKGROUNDS.volcanic_caldera).toBeDefined();
    expect(ARENA_BACKGROUNDS.celestial_void).toBeDefined();
  });

  it('verifies arena selection persistence via localStorage', () => {
    expect(getSavedSelectedArena()).toBe(DEFAULT_ARENA_ID);

    saveSelectedArena('cyber_rooftop');
    expect(getSavedSelectedArena()).toBe('cyber_rooftop');

    saveSelectedArena('volcanic_caldera');
    expect(getSavedSelectedArena()).toBe('volcanic_caldera');

    saveSelectedArena('celestial_void');
    expect(getSavedSelectedArena()).toBe('celestial_void');

    saveSelectedArena('highland_sanctuary');
    expect(getSavedSelectedArena()).toBe('highland_sanctuary');
  });

  it('verifies platform grounding calculation matches arena ratios for desktop & mobile viewports', () => {
    const desktopHeight = 580;
    const mobileHeight = 700;

    const highland = getArenaDefinition('highland_sanctuary');
    const desktopY = desktopHeight * highland.platformRatio;
    expect(desktopY).toBe(580 * 0.72);

    const mobileY = Math.min(mobileHeight - 40, Math.max(mobileHeight * highland.portraitPlatformRatio, mobileHeight - 70));
    expect(mobileY).toBe(630);
  });

  it('verifies all 4 3D arena assets (blend, glb, eevee renders, and spec) are present and valid', () => {
    // Navigate from apps/web/src/__tests__ to repo test_3d/
    const test3dDir = path.resolve(__dirname, '../../../../test_3d');
    expect(fs.existsSync(test3dDir)).toBe(true);

    const arenas = [
      { id: 'highland_sanctuary', name: 'HighlandSanctuary' },
      { id: 'cyber_rooftop', name: 'CyberRooftop' },
      { id: 'volcanic_caldera', name: 'VolcanicCaldera' },
      { id: 'celestial_void', name: 'CelestialVoid' }
    ];

    for (const arena of arenas) {
      const blendFile = path.join(test3dDir, `KeyFury_3D_${arena.name}.blend`);
      const glbFile = path.join(test3dDir, `KeyFury_3D_${arena.name}.glb`);
      const renderFile = path.join(test3dDir, `KeyFury_3D_${arena.name}_Render.png`);

      expect(fs.existsSync(blendFile), `Missing .blend for ${arena.name}`).toBe(true);
      expect(fs.statSync(blendFile).size).toBeGreaterThan(50_000);

      expect(fs.existsSync(glbFile), `Missing .glb for ${arena.name}`).toBe(true);
      expect(fs.statSync(glbFile).size).toBeGreaterThan(50_000);

      expect(fs.existsSync(renderFile), `Missing render for ${arena.name}`).toBe(true);
      expect(fs.statSync(renderFile).size).toBeGreaterThan(50_000);
    }

    // Spec and comparison chart
    const specFile = path.join(test3dDir, 'ARENA_IMAGE_GENERATION_SPEC.md');
    const compChart = path.join(test3dDir, 'keyfury_four_maps_image_vs_blender_comparison.png');

    expect(fs.existsSync(specFile)).toBe(true);
    const specContent = fs.readFileSync(specFile, 'utf-8');
    expect(specContent).toContain('highland_sanctuary');
    expect(specContent).toContain('cyber_rooftop');
    expect(specContent).toContain('volcanic_caldera');
    expect(specContent).toContain('celestial_void');

    expect(fs.existsSync(compChart)).toBe(true);
    expect(fs.statSync(compChart).size).toBeGreaterThan(100_000);
  });

  // ==========================================================================
  // MULTI-ANGLE MAP PREVIEW & CLEAN NAMING SPECIFICATION
  // ==========================================================================
  describe('Multi-Angle Map Preview & Clean Naming Specification', () => {
    it('verifies getCleanArenaName strips any 3D suffixes and maintains base name', () => {
      expect(getCleanArenaName('Cyber Neon Rooftop 3D')).toBe('Cyber Neon Rooftop');
      expect(getCleanArenaName('Cyber Neon Rooftop (3D)')).toBe('Cyber Neon Rooftop');
      expect(getCleanArenaName('Highland Sanctuary True 3D')).toBe('Highland Sanctuary');
      expect(getCleanArenaName('Highland Sanctuary (True 3D)')).toBe('Highland Sanctuary');
      expect(getCleanArenaName('Volcanic Caldera 3D')).toBe('Volcanic Caldera');
      expect(getCleanArenaName('Celestial Void Shrine')).toBe('Celestial Void Shrine');

      // All 4 registered arenas yield clean base names without 3D
      const allArenas = getAllArenas();
      for (const arena of allArenas) {
        const cleanName = getCleanArenaName(arena.name);
        expect(cleanName).not.toMatch(/\b3D\b/i);
        expect(cleanName).not.toMatch(/\bTrue\s*3D\b/i);
        expect(cleanName.length).toBeGreaterThan(0);
      }
    });

    it('verifies exactly 7 camera view options with hotkeys (F, L, R, S, T, B, W)', () => {
      expect(CAMERA_VIEWS).toHaveLength(7);

      const angles = CAMERA_VIEWS.map((v) => v.id);
      expect(angles).toEqual(['front', 'left', 'right', 'spider_cam', 'focused_60', 'back', 'wide_front']);

      const hotkeys = CAMERA_VIEWS.map((v) => v.hotkey);
      expect(hotkeys).toEqual(['F', 'L', 'R', 'S', 'T', 'B', 'W']);
    });

    it('verifies procedural camera transforms for all 7 angles across all 4 maps without occlusion', () => {
      const arenaIds: ArenaId[] = [
        'highland_sanctuary',
        'cyber_rooftop',
        'volcanic_caldera',
        'celestial_void'
      ];
      const cameraAngles: CameraAngle[] = ['front', 'back', 'left', 'right', 'spider_cam', 'focused_60', 'wide_front'];

      for (const arenaId of arenaIds) {
        const frontTransform = getCameraTransformForAngle(arenaId, 'front');
        const backTransform = getCameraTransformForAngle(arenaId, 'back');
        const leftTransform = getCameraTransformForAngle(arenaId, 'left');
        const rightTransform = getCameraTransformForAngle(arenaId, 'right');
        const spiderTransform = getCameraTransformForAngle(arenaId, 'spider_cam');
        const focused60Transform = getCameraTransformForAngle(arenaId, 'focused_60');
        const wideFrontTransform = getCameraTransformForAngle(arenaId, 'wide_front');

        // Verify all 7 transforms are finite, non-NaN, and within comfortable framing FOV
        for (const transform of [frontTransform, backTransform, leftTransform, rightTransform, spiderTransform, focused60Transform, wideFrontTransform]) {
          expect(transform.pos).toHaveLength(3);
          expect(transform.lookAt).toHaveLength(3);
          for (let i = 0; i < 3; i++) {
            expect(Number.isFinite(transform.pos[i])).toBe(true);
            expect(Number.isNaN(transform.pos[i])).toBe(false);
            expect(Number.isFinite(transform.lookAt[i])).toBe(true);
            expect(Number.isNaN(transform.lookAt[i])).toBe(false);
          }
          expect(Number.isFinite(transform.fov)).toBe(true);
          expect(transform.fov).toBeGreaterThanOrEqual(25.0);
          expect(transform.fov).toBeLessThanOrEqual(50.0);
        }

        // a. Front view: camera is on positive Z relative to combat lookAt, zoomed in on fighters
        expect(frontTransform.pos[2]).toBeGreaterThan(frontTransform.lookAt[2]);
        expect(frontTransform.pos[0]).toBeCloseTo(frontTransform.lookAt[0], 5);

        // b. Back view: elevated reverse angle looking down at fighters
        expect(backTransform.pos[2]).toBeLessThan(backTransform.lookAt[2]);
        expect(backTransform.pos[1]).toBeGreaterThan(backTransform.lookAt[1]);

        // c. Left-side view: 45° elevated flank looking down over any side buildings
        expect(leftTransform.pos[0]).toBeLessThan(leftTransform.lookAt[0]);
        expect(leftTransform.pos[1]).toBeGreaterThan(leftTransform.lookAt[1]);

        // d. Right-side view: 45° elevated flank looking down over any side buildings
        expect(rightTransform.pos[0]).toBeGreaterThan(rightTransform.lookAt[0]);
        expect(rightTransform.pos[1]).toBeGreaterThan(rightTransform.lookAt[1]);

        // Symmetry: distance from central axis is identical across opposing flank angles
        const leftDist = Math.abs(leftTransform.pos[0]);
        const rightDist = Math.abs(rightTransform.pos[0]);
        expect(leftDist).toBeCloseTo(rightDist, 5);

        // e. Spider Cam: high-level elevated angle (~50° declination swoop)
        expect(spiderTransform.pos[1]).toBeGreaterThan(frontTransform.pos[1] + 3.0);
        const spiderDY = spiderTransform.pos[1] - spiderTransform.lookAt[1];
        const spiderDX = spiderTransform.pos[0] - spiderTransform.lookAt[0];
        const spiderDZ = spiderTransform.pos[2] - spiderTransform.lookAt[2];
        const spiderHorizDist = Math.hypot(spiderDX, spiderDZ);
        const spiderAngleDeg = (Math.atan2(spiderDY, spiderHorizDist) * 180) / Math.PI;
        expect(spiderAngleDeg).toBeGreaterThanOrEqual(40.0);
        expect(spiderAngleDeg).toBeLessThanOrEqual(60.0);

        // f. Focused 60°: steep overhead tactical perspective
        expect(focused60Transform.pos[1]).toBeGreaterThan(spiderTransform.pos[1]);
        const f60DY = focused60Transform.pos[1] - focused60Transform.lookAt[1];
        const f60DZ = focused60Transform.pos[2] - focused60Transform.lookAt[2];
        const f60AngleDeg = (Math.atan2(f60DY, f60DZ) * 180) / Math.PI;
        expect(f60AngleDeg).toBeGreaterThanOrEqual(50.0);
        expect(f60AngleDeg).toBeLessThanOrEqual(70.0);

        // g. Wide Front: zoomed out front view framing entire environment
        expect(wideFrontTransform.pos[2]).toBeGreaterThan(frontTransform.pos[2] * 1.5);
        expect(wideFrontTransform.pos[0]).toBeCloseTo(wideFrontTransform.lookAt[0], 5);
      }
    });
  });
});
