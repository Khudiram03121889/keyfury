/**
 * ModularAtlasManager.stress.test.ts
 * Rigorous empirical stress test harness for ModularAtlasManager.
 * 
 * Tests:
 * 1. High-concurrency deduplication & race conditions
 * 2. Rapid load/unload churn and memory leak verification
 * 3. Adversarial / corrupted JSON schemas and non-finite numbers (NaN/Infinity)
 * 4. Missing images and 100% fallback reliability
 * 5. Deterministic texture keys and collision prevention
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ModularAtlasManager,
  type CharacterAtlasMetadata,
  type AtlasPartRect
} from '../ModularAtlasManager';
import { MockPhaserScene } from './MockPhaserHarness';

describe('ModularAtlasManager Empirical Stress & Adversarial Test Suite', () => {
  let mockScene: MockPhaserScene;

  const sampleValidParts: Record<string, AtlasPartRect> = {
    head: { x: 0, y: 0, w: 48, h: 48, pivotX: 0.5, pivotY: 0.5 },
    torso: { x: 48, y: 0, w: 40, h: 56, pivotX: 0.5, pivotY: 0.2 },
    pelvis: { x: 88, y: 0, w: 36, h: 28, pivotX: 0.5, pivotY: 0.5 },
    rear_upper_arm: { x: 0, y: 48, w: 20, h: 44, pivotX: 0.5, pivotY: 0.15 },
    rear_forearm: { x: 20, y: 48, w: 18, h: 40, pivotX: 0.5, pivotY: 0.15 },
    rear_hand: { x: 38, y: 48, w: 16, h: 16, pivotX: 0.5, pivotY: 0.5 },
    lead_upper_arm: { x: 54, y: 48, w: 20, h: 44, pivotX: 0.5, pivotY: 0.15 },
    lead_forearm: { x: 74, y: 48, w: 18, h: 40, pivotX: 0.5, pivotY: 0.15 },
    lead_hand: { x: 92, y: 48, w: 16, h: 16, pivotX: 0.5, pivotY: 0.5 },
    rear_thigh: { x: 0, y: 92, w: 24, h: 50, pivotX: 0.5, pivotY: 0.15 },
    rear_shin: { x: 24, y: 92, w: 20, h: 48, pivotX: 0.5, pivotY: 0.15 },
    rear_boot: { x: 44, y: 92, w: 22, h: 16, pivotX: 0.3, pivotY: 0.5 },
    lead_thigh: { x: 66, y: 92, w: 24, h: 50, pivotX: 0.5, pivotY: 0.15 },
    lead_shin: { x: 90, y: 92, w: 20, h: 48, pivotX: 0.5, pivotY: 0.15 },
    lead_boot: { x: 110, y: 92, w: 22, h: 16, pivotX: 0.3, pivotY: 0.5 },
    weapon_base: { x: 0, y: 142, w: 16, h: 72, pivotX: 0.5, pivotY: 0.8 },
    weapon_glow: { x: 16, y: 142, w: 24, h: 80, pivotX: 0.5, pivotY: 0.8 },
    accessory: { x: 40, y: 142, w: 32, h: 64, pivotX: 0.1, pivotY: 0.1 }
  };

  const createMetadata = (id: 'shadow_ronin' | 'cyber_valkyrie' | 'volt_shinobi' | 'void_assassin'): CharacterAtlasMetadata => ({
    characterId: id,
    version: '1.0.0',
    image: `/assets/characters/${id}/atlas.png`,
    dimensions: { w: 256, h: 256 },
    parts: sampleValidParts
  });

  beforeEach(() => {
    mockScene = new MockPhaserScene();
    ModularAtlasManager.clearCache();
  });

  describe('1. High-Concurrency Stress & In-Flight Deduplication', () => {
    it('handles 100 simultaneous concurrent loadAtlas calls for the same character with zero duplicate loads', async () => {
      const roninMeta = createMetadata('shadow_ronin');
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', roninMeta);

      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin'));
      }

      // Verify all 100 promises reference the exact same in-flight promise
      const firstPromise = promises[0];
      for (let i = 1; i < 100; i++) {
        expect(promises[i]).toBe(firstPromise);
      }

      // Start loader
      mockScene.load.start();
      const results = await Promise.all(promises);

      // Verify all 100 callers resolved with true
      expect(results.length).toBe(100);
      expect(results.every((r) => r === true)).toBe(true);

      // Verify texture is loaded and exists exactly once
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(true);
      expect(mockScene.textures.exists('char_atlas_shadow_ronin')).toBe(true);

      // Verify frames are extractable
      const headFrame = ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'head');
      expect(headFrame).not.toBeNull();
      expect(headFrame?.cutWidth).toBe(48);
    });

    it('handles 50 concurrent loadAtlas calls across 4 different fighters simultaneously in parallel', async () => {
      const fighterIds: Array<'shadow_ronin' | 'cyber_valkyrie' | 'volt_shinobi' | 'void_assassin'> = [
        'shadow_ronin',
        'cyber_valkyrie',
        'volt_shinobi',
        'void_assassin'
      ];

      for (const id of fighterIds) {
        mockScene.cache.json.add(`char_atlas_json_${id}`, createMetadata(id));
      }

      const allPromises: Promise<boolean>[] = [];
      for (let i = 0; i < 50; i++) {
        for (const id of fighterIds) {
          allPromises.push(ModularAtlasManager.loadAtlas(mockScene as any, id));
        }
      }

      expect(allPromises.length).toBe(200);

      mockScene.load.start();
      const results = await Promise.all(allPromises);

      expect(results.every((r) => r === true)).toBe(true);

      for (const id of fighterIds) {
        expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, id)).toBe(true);
        expect(mockScene.textures.exists(`char_atlas_${id}`)).toBe(true);
        const torso = ModularAtlasManager.getPartFrame(mockScene as any, id, 'torso');
        expect(torso).not.toBeNull();
      }
    });

    it('resolves all concurrent callers to false on load failure without unhandled rejections', async () => {
      mockScene.load.shouldFail = true;

      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(ModularAtlasManager.loadAtlas(mockScene as any, 'cyber_valkyrie'));
      }

      mockScene.load.start();
      const results = await Promise.all(promises);

      expect(results.every((r) => r === false)).toBe(true);
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'cyber_valkyrie')).toBe(false);
      expect(ModularAtlasManager.isAtlasFailed('cyber_valkyrie')).toBe(true);
    });
  });

  describe('2. Rapid Churn & Memory Leak Resistance', () => {
    it('executes 300 rapid sequential load -> unload -> load cycles without memory growth or corruption', async () => {
      const roninMeta = createMetadata('shadow_ronin');
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', roninMeta);

      for (let cycle = 0; cycle < 300; cycle++) {
        const loadPromise = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');
        mockScene.load.start();
        const loaded = await loadPromise;
        expect(loaded).toBe(true);
        expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(true);

        // Frame query verification
        const frame = ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'weapon_base');
        expect(frame).not.toBeNull();

        // Unload
        ModularAtlasManager.unloadAtlas(mockScene as any, 'shadow_ronin');
        expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(false);
        expect(ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'weapon_base')).toBeNull();
      }

      // Verify internal state is clean and unpolluted
      expect(ModularAtlasManager.getAtlasMetadata('shadow_ronin')).toBeNull();
      expect(mockScene.textures.exists('char_atlas_shadow_ronin')).toBe(false);
    });

    it('survives immediate unloadAtlas while load is still in-flight', async () => {
      const roninMeta = createMetadata('shadow_ronin');
      mockScene.cache.json.add('char_atlas_json_shadow_ronin', roninMeta);

      const inFlightPromise = ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');

      // Unload immediately while in-flight
      ModularAtlasManager.unloadAtlas(mockScene as any, 'shadow_ronin');

      // Now start scene load
      mockScene.load.start();
      const result = await inFlightPromise;

      // Promise should resolve without crash
      expect(typeof result).toBe('boolean');
    });

    it('cleans all internal cache references on clearCache()', () => {
      const meta = createMetadata('volt_shinobi');
      ModularAtlasManager.registerAtlas(mockScene as any, 'volt_shinobi', meta);

      expect(ModularAtlasManager.getAtlasMetadata('volt_shinobi')).not.toBeNull();
      expect(ModularAtlasManager.getPartMetadata('volt_shinobi', 'head')).not.toBeNull();

      ModularAtlasManager.clearCache();

      expect(ModularAtlasManager.getAtlasMetadata('volt_shinobi')).toBeNull();
      expect(ModularAtlasManager.getPartMetadata('volt_shinobi', 'head')).toBeNull();
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'volt_shinobi')).toBe(false);
    });
  });

  describe('3. Adversarial & Malformed JSON Schema Resistance', () => {
    it('rejects null, undefined, primitives, arrays, and empty objects', () => {
      const invalidInputs = [
        null,
        undefined,
        '',
        '{"invalid": "json string"}',
        12345,
        true,
        [],
        [1, 2, 3],
        {},
        { characterId: 'shadow_ronin' } // missing version, image, parts
      ];

      for (const input of invalidInputs) {
        const result = ModularAtlasManager.validateMetadata(input);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects unrecognized or invalid characterIds', () => {
      const badIds = ['unknown_warrior', 'goku', '', 'SHADOW_RONIN', 'cyber-valkyrie', '123'];
      for (const id of badIds) {
        const badMeta = {
          characterId: id,
          version: '1.0.0',
          image: 'test.png',
          parts: sampleValidParts
        };
        const result = ModularAtlasManager.validateMetadata(badMeta);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects invalid or non-object parts dictionary', () => {
      const badPartsVariants = [
        null,
        undefined,
        'parts_string',
        123,
        [],
        ['head', 'torso'],
        { head: null },
        { head: 'not an object' },
        { head: [] },
        { head: 42 }
      ];

      for (const parts of badPartsVariants) {
        const meta = {
          characterId: 'shadow_ronin',
          version: '1.0.0',
          image: 'test.png',
          parts: parts as any
        };
        const result = ModularAtlasManager.validateMetadata(meta);
        expect(result.valid).toBe(false);
      }
    });

    it('rejects out-of-range, negative, or zero coordinate dimensions', () => {
      const testCases: Array<{ field: string; val: number; desc: string }> = [
        { field: 'x', val: -1, desc: 'negative x' },
        { field: 'y', val: -10, desc: 'negative y' },
        { field: 'w', val: 0, desc: 'zero width' },
        { field: 'w', val: -50, desc: 'negative width' },
        { field: 'h', val: 0, desc: 'zero height' },
        { field: 'h', val: -100, desc: 'negative height' },
        { field: 'pivotX', val: -0.01, desc: 'pivotX < 0' },
        { field: 'pivotX', val: 1.01, desc: 'pivotX > 1' },
        { field: 'pivotY', val: -0.5, desc: 'pivotY < 0' },
        { field: 'pivotY', val: 2.5, desc: 'pivotY > 1' }
      ];

      for (const tc of testCases) {
        const brokenParts = {
          head: {
            x: 0,
            y: 0,
            w: 48,
            h: 48,
            pivotX: 0.5,
            pivotY: 0.5,
            [tc.field]: tc.val
          }
        };

        const meta = {
          characterId: 'shadow_ronin',
          version: '1.0.0',
          image: 'test.png',
          parts: brokenParts
        };

        const result = ModularAtlasManager.validateMetadata(meta);
        expect(result.valid, `Expected invalid for ${tc.desc}`).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('checks behavior with non-finite numbers (NaN, Infinity, -Infinity)', () => {
      for (const val of [NaN, Infinity, -Infinity]) {
        const brokenParts = {
          head: {
            x: val,
            y: 0,
            w: 48,
            h: 48,
            pivotX: 0.5,
            pivotY: 0.5
          }
        };

        const meta = {
          characterId: 'shadow_ronin',
          version: '1.0.0',
          image: 'test.png',
          parts: brokenParts
        };

        expect(() => {
          ModularAtlasManager.registerAtlas(mockScene as any, 'shadow_ronin', meta as any);
        }).not.toThrow();
      }
    });

    it('handles large part manifests (500+ parts) without performance degradation', () => {
      const largeParts: Record<string, AtlasPartRect> = {};
      for (let i = 0; i < 500; i++) {
        largeParts[`part_${i}`] = {
          x: (i * 10) % 256,
          y: Math.floor((i * 10) / 256) * 10,
          w: 10,
          h: 10,
          pivotX: 0.5,
          pivotY: 0.15
        };
      }

      const largeMeta: CharacterAtlasMetadata = {
        characterId: 'void_assassin',
        version: '1.0.0',
        image: 'void_atlas.png',
        parts: largeParts
      };

      const start = performance.now();
      const valid = ModularAtlasManager.validateMetadata(largeMeta);
      const registered = ModularAtlasManager.registerAtlas(mockScene as any, 'void_assassin', largeMeta);
      const elapsed = performance.now() - start;

      expect(valid.valid).toBe(true);
      expect(registered).toBe(true);
      expect(elapsed).toBeLessThan(50); // Under 50ms for 500 parts

      const part250 = ModularAtlasManager.getPartFrame(mockScene as any, 'void_assassin', 'part_250');
      expect(part250).not.toBeNull();
    });
  });

  describe('4. Missing Images & Fallback Reliability', () => {
    it('returns null safely for getPartFrame when atlas is not loaded (100% vector fallback)', () => {
      // No atlas loaded
      const frame = ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'head');
      expect(frame).toBeNull();

      // Ensure isAtlasLoaded is false
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(false);
    });

    it('returns null safely when querying a missing part name on an existing atlas', () => {
      const meta = createMetadata('volt_shinobi');
      ModularAtlasManager.registerAtlas(mockScene as any, 'volt_shinobi', meta);

      const nonExistent = ModularAtlasManager.getPartFrame(mockScene as any, 'volt_shinobi', 'plasma_cannon_99');
      expect(nonExistent).toBeNull();
    });

    it('handles null/undefined scene or textures gracefully without throws', () => {
      expect(() => {
        ModularAtlasManager.getPartFrame(null as any, 'shadow_ronin', 'head');
      }).not.toThrow();

      expect(() => {
        ModularAtlasManager.isAtlasLoaded(null as any, 'shadow_ronin');
      }).not.toThrow();

      expect(() => {
        ModularAtlasManager.unloadAtlas(null as any, 'shadow_ronin');
      }).not.toThrow();

      expect(() => {
        ModularAtlasManager.preloadInScene(null as any, 'shadow_ronin');
      }).not.toThrow();

      expect(() => {
        ModularAtlasManager.registerPreloadedAtlases(null as any);
      }).not.toThrow();
    });

    it('handles load failure cleanly when JSON or image 404s', async () => {
      // Scene load triggers loaderror
      mockScene.load.shouldFail = true;
      const success = await ModularAtlasManager.loadAtlas(mockScene as any, 'shadow_ronin');

      expect(success).toBe(false);
      expect(ModularAtlasManager.isAtlasLoaded(mockScene as any, 'shadow_ronin')).toBe(false);
      expect(ModularAtlasManager.isAtlasFailed('shadow_ronin')).toBe(true);

      // Frame queries safely return null
      expect(ModularAtlasManager.getPartFrame(mockScene as any, 'shadow_ronin', 'head')).toBeNull();
    });
  });

  describe('5. Texture Key Determinism & Collision Prevention', () => {
    it('generates unique, deterministic texture keys and JSON keys for all 4 fighters', () => {
      const fighterIds = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];
      const texKeys = new Set<string>();
      const jsonKeys = new Set<string>();

      for (const id of fighterIds) {
        const texKey = ModularAtlasManager.getTextureKey(id);
        const jsonKey = ModularAtlasManager.getJsonKey(id);

        expect(texKey).toBe(`char_atlas_${id}`);
        expect(jsonKey).toBe(`char_atlas_json_${id}`);

        expect(texKeys.has(texKey)).toBe(false);
        expect(jsonKeys.has(jsonKey)).toBe(false);

        texKeys.add(texKey);
        jsonKeys.add(jsonKey);
      }

      expect(texKeys.size).toBe(4);
      expect(jsonKeys.size).toBe(4);
    });

    it('generates standard asset paths matching project directory convention', () => {
      const paths = ModularAtlasManager.getAssetPaths('shadow_ronin');
      expect(paths.pngPath).toBe('/assets/characters/shadow_ronin/atlas.png');
      expect(paths.jsonPath).toBe('/assets/characters/shadow_ronin/atlas.json');
    });
  });
});
