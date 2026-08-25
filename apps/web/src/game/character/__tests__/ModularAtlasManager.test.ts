import { describe, it, expect, beforeEach } from 'vitest';
import {
  ModularAtlasManager,
  type CharacterAtlasMetadata,
  type AtlasPartRect
} from '../ModularAtlasManager';
import { MockPhaserScene } from './MockPhaserHarness';

describe('ModularAtlasManager Unit Test Suite', () => {
  let mockScene: MockPhaserScene;

  const validMetadataSample: CharacterAtlasMetadata = {
    characterId: 'shadow_ronin',
    version: '1.0.0',
    image: 'shadow_ronin_atlas.png',
    parts: {
      head: { x: 0, y: 0, w: 48, h: 48, pivotX: 0.5, pivotY: 0.5 },
      torso: { x: 48, y: 0, w: 40, h: 56, pivotX: 0.5, pivotY: 0.2 },
      pelvis: { x: 88, y: 0, w: 36, h: 28, pivotX: 0.5, pivotY: 0.5 },
      arm_upper_r: { x: 0, y: 48, w: 20, h: 44, pivotX: 0.5, pivotY: 0.15 },
      arm_lower_r: { x: 20, y: 48, w: 18, h: 40, pivotX: 0.5, pivotY: 0.15 },
      hand_r: { x: 38, y: 48, w: 16, h: 16, pivotX: 0.5, pivotY: 0.5 },
      arm_upper_l: { x: 54, y: 48, w: 20, h: 44, pivotX: 0.5, pivotY: 0.15 },
      arm_lower_l: { x: 74, y: 48, w: 18, h: 40, pivotX: 0.5, pivotY: 0.15 },
      hand_l: { x: 92, y: 48, w: 16, h: 16, pivotX: 0.5, pivotY: 0.5 },
      leg_upper_r: { x: 0, y: 92, w: 24, h: 50, pivotX: 0.5, pivotY: 0.15 },
      leg_lower_r: { x: 24, y: 92, w: 20, h: 48, pivotX: 0.5, pivotY: 0.15 },
      foot_r: { x: 44, y: 92, w: 22, h: 16, pivotX: 0.3, pivotY: 0.5 },
      leg_upper_l: { x: 66, y: 92, w: 24, h: 50, pivotX: 0.5, pivotY: 0.15 },
      leg_lower_l: { x: 90, y: 92, w: 20, h: 48, pivotX: 0.5, pivotY: 0.15 },
      foot_l: { x: 110, y: 92, w: 22, h: 16, pivotX: 0.3, pivotY: 0.5 },
      weapon_base: { x: 0, y: 142, w: 16, h: 72, pivotX: 0.5, pivotY: 0.8 },
      weapon_glow: { x: 16, y: 142, w: 24, h: 80, pivotX: 0.5, pivotY: 0.8 },
      accessory: { x: 40, y: 142, w: 32, h: 64, pivotX: 0.1, pivotY: 0.1 }
    }
  };

  beforeEach(() => {
    mockScene = new MockPhaserScene();
    ModularAtlasManager.clearCache();
  });

  describe('1. Metadata Schema Parsing & Validation', () => {
    it('validates a correct CharacterAtlasMetadata JSON schema for all 4 fighters', () => {
      const fighterIds: Array<'shadow_ronin' | 'cyber_valkyrie' | 'volt_shinobi' | 'void_assassin'> = [
        'shadow_ronin',
        'cyber_valkyrie',
        'volt_shinobi',
        'void_assassin'
      ];

      for (const id of fighterIds) {
        const metadata: CharacterAtlasMetadata = {
          ...validMetadataSample,
          characterId: id,
          image: `${id}_atlas.png`
        };
        const validation = ModularAtlasManager.validateMetadata(metadata);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }
    });

    it('validates AtlasPartRect geometry bounds and normalized pivot ranges [0, 1]', () => {
      for (const [partName, rect] of Object.entries(validMetadataSample.parts)) {
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.w).toBeGreaterThan(0);
        expect(rect.h).toBeGreaterThan(0);
        expect(rect.pivotX).toBeGreaterThanOrEqual(0);
        expect(rect.pivotX).toBeLessThanOrEqual(1);
        expect(rect.pivotY).toBeGreaterThanOrEqual(0);
        expect(rect.pivotY).toBeLessThanOrEqual(1);
      }

      // Check proximal limb pivots are specifically set to (0.5, 0.15)
      expect(validMetadataSample.parts.arm_upper_r.pivotY).toBe(0.15);
      expect(validMetadataSample.parts.arm_lower_r.pivotY).toBe(0.15);
      expect(validMetadataSample.parts.leg_upper_r.pivotY).toBe(0.15);
      expect(validMetadataSample.parts.leg_lower_r.pivotY).toBe(0.15);
    });

    it('detects and rejects malformed metadata schemas with detailed error list', () => {
      const badMetadata = {
        characterId: 'unknown_warrior',
        version: '0.9',
        parts: {
          head: { x: -10, y: 0, w: 0, h: -5, pivotX: 1.5, pivotY: -0.2 }
        }
      } as any;

      const validation = ModularAtlasManager.validateMetadata(badMetadata);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('ensures standard 18 anatomical part hierarchy coverage', () => {
      const requiredParts = [
        'head', 'torso', 'pelvis',
        'arm_upper_r', 'arm_lower_r', 'hand_r',
        'arm_upper_l', 'arm_lower_l', 'hand_l',
        'leg_upper_r', 'leg_lower_r', 'foot_r',
        'leg_upper_l', 'leg_lower_l', 'foot_l',
        'weapon_base', 'weapon_glow', 'accessory'
      ];

      for (const part of requiredParts) {
        expect(validMetadataSample.parts).toHaveProperty(part);
      }
    });
  });

  describe('2. Texture Atlas Loading Lifecycle & Preloader Integration', () => {
    it('isAtlasLoaded returns false before loading', () => {
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(false);
    });

    it('loads atlas JSON and registers frames into TextureManager', async () => {
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', validMetadataSample);

      const loadPromise = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');
      mockScene.load.start();
      const success = await loadPromise;

      expect(success).toBe(true);
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(true);
    });

    it('deduplicates concurrent load requests into a single promise', async () => {
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', validMetadataSample);

      const p1 = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');
      const p2 = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');

      expect(p1).toBe(p2); // Exact same in-flight promise reference

      mockScene.load.start();
      const [res1, res2] = await Promise.all([p1, p2]);
      expect(res1).toBe(true);
      expect(res2).toBe(true);
    });

    it('returns true immediately for an already cached atlas', async () => {
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', validMetadataSample);
      const first = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');
      mockScene.load.start();
      await first;

      const second = await ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');
      expect(second).toBe(true);
    });

    it('preloads in scene and registers preloaded atlases on create', () => {
      ModularAtlasManager.preloadInScene(mockScene as any, 'shadow_ronin');
      expect(mockScene.load.queuedFiles.length).toBeGreaterThan(0);

      mockScene.cache.json.add('char_atlas_json_shadow_ronin', validMetadataSample);
      ModularAtlasManager.registerPreloadedAtlases(mockScene as any);
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(true);
    });
  });

  describe('3. Frame Extraction & Pivot Registration', () => {
    beforeEach(async () => {
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', validMetadataSample);
      const load = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');
      mockScene.load.start();
      await load;
    });

    it('extracts valid Phaser Frame with exact UV crop bounds', () => {
      const frame = ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'arm_upper_r');
      expect(frame).not.toBeNull();
      expect(frame!.cutX).toBe(0);
      expect(frame!.cutY).toBe(48);
      expect(frame!.cutWidth).toBe(20);
      expect(frame!.cutHeight).toBe(44);
    });

    it('attaches custom proximal pivot (0.5, 0.15) to extracted frame metadata', () => {
      const frame = ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'arm_upper_r');
      expect((frame!.customData as any).pivotX).toBe(0.5);
      expect((frame!.customData as any).pivotY).toBe(0.15);
    });

    it('returns null when querying non-existent part', () => {
      const frame = ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'laser_blaster');
      expect(frame).toBeNull();
    });

    it('returns null when querying un-loaded character atlas', () => {
      const frame = ModularAtlasManager.getPartFrame(mockScene as any, 'cyber_valkyrie', 'head');
      expect(frame).toBeNull();
    });

    it('retrieves part metadata directly from cache', () => {
      const partMeta = ModularAtlasManager.getPartMetadata('shadow_ronin', 'torso');
      expect(partMeta).not.toBeNull();
      expect(partMeta!.w).toBe(40);
      expect(partMeta!.h).toBe(56);
      expect(partMeta!.pivotY).toBe(0.2);
    });
  });

  describe('4. Graceful Fallback & Error Resilience', () => {
    it('handles asset loading error gracefully and returns false without throw', async () => {
      mockScene.load.shouldFail = true;
      const loadPromise = ModularAtlasManager.loadAtlas(mockScene as any, 'void_assassin');
      mockScene.load.start();
      const success = await loadPromise;

      expect(success).toBe(false);
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'void_assassin')).toBe(false);
      expect(ModularAtlasManager.isAtlasFailed('void_assassin')).toBe(true);
    });

    it('unloads atlas and clears TextureManager entries cleanly', async () => {
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', validMetadataSample);
      const load = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');
      mockScene.load.start();
      await load;

      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(true);

      ModularAtlasManager.unloadAtlas(mockScene as any, 'shadow_ronin');
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(false);
      expect(ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'head')).toBeNull();
    });
  });
});
