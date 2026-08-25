/**
 * ModularAtlasManager.ts
 * Centralized texture atlas loading, metadata parsing, caching, and fallback management
 * for KeyFury's 2D modular skeletal cybernetic character roster.
 */

import type Phaser from 'phaser';
import type { CharacterId } from '@keyfury/game-core';

/**
 * Standard anatomical part identifiers across all 4 fighters.
 */
export type CharacterAtlasPartName =
  | 'head'
  | 'headgear'
  | 'torso'
  | 'pelvis'
  | 'rear_upper_arm'
  | 'rear_forearm'
  | 'rear_hand'
  | 'rear_thigh'
  | 'rear_shin'
  | 'rear_boot'
  | 'lead_upper_arm'
  | 'lead_forearm'
  | 'lead_hand'
  | 'lead_thigh'
  | 'lead_shin'
  | 'lead_boot'
  | 'pauldron_rear'
  | 'pauldron_lead'
  | 'weapon_base'
  | 'weapon_glow'
  | 'accessory'
  | string;

/**
 * Slice coordinates and normalized pivot origin for an anatomical part.
 */
export interface AtlasPartRect {
  /** X position in texture atlas pixels */
  x: number;
  /** Y position in texture atlas pixels */
  y: number;
  /** Width in pixels */
  w: number;
  /** Height in pixels */
  h: number;
  /**
   * Normalized pivot X (0.0 to 1.0).
   * Default: 0.5 (center of bone axis).
   */
  pivotX: number;
  /**
   * Normalized pivot Y (0.0 to 1.0).
   * Default: 0.15 (proximal joint rotation socket).
   */
  pivotY: number;
  /** Optional original un-trimmed width */
  trimmed?: boolean;
  sourceW?: number;
  sourceH?: number;
}

/**
 * Metadata descriptor for a fighter's texture atlas.
 */
export interface CharacterAtlasMetadata {
  /** Fighter ID matching CharacterRegistry */
  characterId: CharacterId | string;
  /** Atlas format version, e.g. "1.0.0" */
  version: string;
  /** Relative asset URL or path to atlas image (e.g. "/assets/characters/shadow_ronin/atlas.png") */
  image: string;
  /** Total texture dimensions */
  dimensions?: {
    w: number;
    h: number;
  };
  /** Dictionary of part slice definitions */
  parts: Record<string, AtlasPartRect>;
  /** Optional custom socket or FX offsets */
  customData?: Record<string, unknown>;
}

/**
 * Internal tracking status for atlas loading lifecycle.
 */
export interface AtlasLoadStatus {
  state: 'unloaded' | 'loading' | 'loaded' | 'failed';
  error?: string;
  metadata?: CharacterAtlasMetadata;
}

export interface MetadataValidationResult {
  valid: boolean;
  errors: string[];
}

const KNOWN_FIGHTER_IDS: CharacterId[] = [
  'shadow_ronin',
  'cyber_valkyrie',
  'volt_shinobi',
  'void_assassin'
];

export class ModularAtlasManager {
  private static statusMap: Map<string, AtlasLoadStatus> = new Map();
  private static inFlightLoads: Map<string, Promise<boolean>> = new Map();
  private static metadataCache: Map<string, CharacterAtlasMetadata> = new Map();

  /**
   * Resolves the standard texture key for Phaser's TextureManager.
   * e.g. "char_atlas_shadow_ronin"
   */
  public static getTextureKey(characterId: string): string {
    return `char_atlas_${characterId}`;
  }

  /**
   * Resolves the standard JSON cache key.
   * e.g. "char_atlas_json_shadow_ronin"
   */
  public static getJsonKey(characterId: string): string {
    return `char_atlas_json_${characterId}`;
  }

  /**
   * Resolves default paths for a character's atlas PNG and JSON files.
   */
  public static getAssetPaths(
    characterId: string,
    basePath: string = '/assets/characters'
  ): { pngPath: string; jsonPath: string } {
    return {
      pngPath: `${basePath}/${characterId}/atlas.png`,
      jsonPath: `${basePath}/${characterId}/atlas.json`
    };
  }

  /**
   * Validates a CharacterAtlasMetadata object structure and coordinate ranges.
   */
  public static validateMetadata(metadata: unknown): MetadataValidationResult {
    const errors: string[] = [];

    if (!metadata || typeof metadata !== 'object') {
      return { valid: false, errors: ['Metadata must be a non-null object'] };
    }

    const meta = metadata as Partial<CharacterAtlasMetadata>;

    if (!meta.characterId || typeof meta.characterId !== 'string') {
      errors.push('Missing or invalid "characterId"');
    } else if (!KNOWN_FIGHTER_IDS.includes(meta.characterId as CharacterId)) {
      errors.push(`Unknown characterId: "${meta.characterId}". Expected one of: ${KNOWN_FIGHTER_IDS.join(', ')}`);
    }

    if (!meta.version || typeof meta.version !== 'string') {
      errors.push('Missing or invalid "version"');
    }

    if (!meta.image || typeof meta.image !== 'string') {
      errors.push('Missing or invalid "image" path');
    }

    if (!meta.parts || typeof meta.parts !== 'object' || Array.isArray(meta.parts)) {
      errors.push('Missing or invalid "parts" dictionary');
    } else {
      for (const [partKey, rect] of Object.entries(meta.parts)) {
        if (!rect || typeof rect !== 'object') {
          errors.push(`Part "${partKey}" must be an object`);
          continue;
        }

        const r = rect as Partial<AtlasPartRect>;
        if (typeof r.x !== 'number' || r.x < 0) {
          errors.push(`Part "${partKey}" has invalid x coordinate: ${r.x}`);
        }
        if (typeof r.y !== 'number' || r.y < 0) {
          errors.push(`Part "${partKey}" has invalid y coordinate: ${r.y}`);
        }
        if (typeof r.w !== 'number' || r.w <= 0) {
          errors.push(`Part "${partKey}" has invalid width: ${r.w}`);
        }
        if (typeof r.h !== 'number' || r.h <= 0) {
          errors.push(`Part "${partKey}" has invalid height: ${r.h}`);
        }
        if (typeof r.pivotX !== 'number' || r.pivotX < 0 || r.pivotX > 1) {
          errors.push(`Part "${partKey}" has invalid pivotX: ${r.pivotX} (must be in [0, 1])`);
        }
        if (typeof r.pivotY !== 'number' || r.pivotY < 0 || r.pivotY > 1) {
          errors.push(`Part "${partKey}" has invalid pivotY: ${r.pivotY} (must be in [0, 1])`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Declarative preloading for Phaser scenes during scene.preload().
   * Queues image and JSON files into scene.load.
   */
  public static preloadInScene(
    scene: Phaser.Scene,
    characterId: string,
    basePath: string = '/assets/characters'
  ): void {
    if (!scene || !scene.load) return;

    const texKey = this.getTextureKey(characterId);
    const jsonKey = this.getJsonKey(characterId);
    const paths = this.getAssetPaths(characterId, basePath);

    // Queue json and image
    if (typeof (scene.load as any).json === 'function') {
      (scene.load as any).json(jsonKey, paths.jsonPath);
    }
    if (typeof (scene.load as any).image === 'function') {
      (scene.load as any).image(texKey, paths.pngPath);
    }

    this.statusMap.set(characterId, { state: 'loading' });
  }

  /**
   * Post-preload registration called in scene.create().
   * Ingests JSON metadata from Phaser's cache and registers frame slices on the texture.
   */
  public static registerPreloadedAtlases(scene: Phaser.Scene): void {
    if (!scene) return;

    for (const characterId of KNOWN_FIGHTER_IDS) {
      const jsonKey = this.getJsonKey(characterId);
      const texKey = this.getTextureKey(characterId);

      let metadata: CharacterAtlasMetadata | undefined;

      // Check scene cache.json
      if (scene.cache && scene.cache.json) {
        if (typeof (scene.cache.json as any).has === 'function' && (scene.cache.json as any).has(jsonKey)) {
          metadata = (scene.cache.json as any).get(jsonKey);
        } else if (typeof (scene.cache.json as any).get === 'function') {
          metadata = (scene.cache.json as any).get(jsonKey);
        }
      }

      if (!metadata) {
        // Check fallback keys e.g. atlas_metadata_<characterId>
        const fallbackKey = `atlas_metadata_${characterId}`;
        if (scene.cache?.json?.has?.(fallbackKey) || scene.cache?.json?.get?.(fallbackKey)) {
          metadata = scene.cache.json.get(fallbackKey);
        }
      }

      if (metadata) {
        this.registerAtlas(scene, characterId, metadata);
      }
    }
  }

  /**
   * Programmatically slices and adds named frames to a loaded Phaser texture.
   */
  public static registerAtlas(
    scene: Phaser.Scene,
    characterId: string,
    metadata: CharacterAtlasMetadata
  ): boolean {
    const validation = this.validateMetadata(metadata);
    if (!validation.valid) {
      console.warn(`[ModularAtlasManager] Invalid atlas metadata for "${characterId}":`, validation.errors);
      this.statusMap.set(characterId, {
        state: 'failed',
        error: validation.errors.join('; ')
      });
      return false;
    }

    const texKey = this.getTextureKey(characterId);

    // Cache metadata
    this.metadataCache.set(characterId, metadata);

    // Check if texture exists in TextureManager
    if (!scene?.textures?.exists(texKey)) {
      // In mock/headless or if texture is not yet created, create texture if possible
      if (typeof (scene?.textures as any)?.addAtlas === 'function') {
        (scene.textures as any).addAtlas(texKey, null, metadata);
        this.statusMap.set(characterId, { state: 'loaded', metadata });
        return true;
      }
      // If textures manager has add or mock support
      if (typeof (scene?.textures as any)?.addBase64 === 'function' || typeof (scene?.textures as any)?.get === 'function') {
        const texture = scene.textures.get(texKey);
        if (!texture) {
          // Texture image not yet loaded into TextureManager
          this.statusMap.set(characterId, { state: 'loaded', metadata });
          return true;
        }
      }
    }

    const texture = scene?.textures?.get(texKey);
    if (texture) {
      for (const [partName, rect] of Object.entries(metadata.parts)) {
        if (typeof (texture as any).add === 'function') {
          const frame = (texture as any).add(partName, 0, rect.x, rect.y, rect.w, rect.h);
          if (frame) {
            frame.customData = {
              ...(frame.customData || {}),
              pivotX: rect.pivotX,
              pivotY: rect.pivotY,
              trimmed: rect.trimmed ?? false,
              sourceW: rect.sourceW ?? rect.w,
              sourceH: rect.sourceH ?? rect.h
            };
          }
        }
      }
    }

    this.statusMap.set(characterId, {
      state: 'loaded',
      metadata
    });

    return true;
  }

  /**
   * Asynchronously loads a character atlas at runtime (outside preload).
   * Includes in-flight deduplication, error handling, and metadata registration.
   */
  public static loadAtlas(
    scene: Phaser.Scene,
    characterId: string,
    basePath: string = '/assets/characters'
  ): Promise<boolean> {
    // 1. Check for in-flight load deduplication first
    const inFlight = this.inFlightLoads.get(characterId);
    if (inFlight) {
      return inFlight;
    }

    // 2. Check if already loaded
    if (this.isAtlasLoaded(scene, characterId)) {
      return Promise.resolve(true);
    }

    let resolvePromise!: (val: boolean) => void;
    const loadPromise = new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });

    this.inFlightLoads.set(characterId, loadPromise);
    this.statusMap.set(characterId, { state: 'loading' });

    // If scene.load is available (Phaser scene loader)
    if (scene?.load) {
      const texKey = this.getTextureKey(characterId);
      const jsonKey = this.getJsonKey(characterId);
      const fallbackKey = `atlas_metadata_${characterId}`;
      const paths = this.getAssetPaths(characterId, basePath);

      let completed = false;

      const onComplete = () => {
        if (completed) return;
        completed = true;
        this.inFlightLoads.delete(characterId);

        let meta: CharacterAtlasMetadata | undefined;
        if (scene.cache?.json?.get) {
          meta = scene.cache.json.get(jsonKey) || scene.cache.json.get(fallbackKey);
        }

        if (meta) {
          const ok = this.registerAtlas(scene, characterId, meta);
          resolvePromise(ok);
        } else {
          // Check if textures already registered
          if (scene.textures?.exists(texKey)) {
            this.statusMap.set(characterId, { state: 'loaded' });
            resolvePromise(true);
          } else {
            this.statusMap.set(characterId, {
              state: 'failed',
              error: 'Metadata not found in cache after load'
            });
            resolvePromise(false);
          }
        }
      };

      const onError = (file?: any) => {
        if (completed) return;
        completed = true;
        this.inFlightLoads.delete(characterId);
        this.statusMap.set(characterId, {
          state: 'failed',
          error: `Failed to load asset files for ${characterId}: ${file?.key || 'unknown'}`
        });
        resolvePromise(false);
      };

      if (typeof scene.load.on === 'function') {
        scene.load.on('complete', onComplete);
        scene.load.on('loaderror', onError);
      }

      // Queue files if not already queued
      if (typeof (scene.load as any).json === 'function') {
        (scene.load as any).json(jsonKey, paths.jsonPath);
      }
      if (typeof (scene.load as any).image === 'function') {
        (scene.load as any).image(texKey, paths.pngPath);
      }

      // Trigger loader on microtask if scene has start()
      if (typeof (scene.load as any).start === 'function') {
        queueMicrotask(() => {
          if (!completed && !(scene.load as any).isLoading?.()) {
            (scene.load as any).start();
          }
        });
      }
    } else {
      this.inFlightLoads.delete(characterId);
      this.statusMap.set(characterId, {
        state: 'failed',
        error: 'No Phaser loader or cache available'
      });
      resolvePromise(false);
    }

    return loadPromise;
  }

  /**
   * Retrieves a specific anatomical part frame from Phaser's TextureManager.
   * Returns null if atlas is not loaded or frame does not exist.
   */
  public static getPartFrame(
    scene: Phaser.Scene,
    characterId: string,
    partName: string
  ): Phaser.Textures.Frame | null {
    if (!this.isAtlasLoaded(scene, characterId)) {
      return null;
    }

    const texKey = this.getTextureKey(characterId);
    if (!scene?.textures) return null;

    if (typeof scene.textures.getFrame === 'function') {
      const frame = scene.textures.getFrame(texKey, partName);
      if (frame) return frame;
    }

    if (typeof scene.textures.get === 'function') {
      const texture = scene.textures.get(texKey);
      if (texture && typeof (texture as any).get === 'function') {
        const frame = (texture as any).get(partName);
        if (frame) return frame;
      }
    }

    return null;
  }

  /**
   * Retrieves the raw AtlasPartRect metadata (including pivot coordinates).
   */
  public static getPartMetadata(
    characterId: string,
    partName: string
  ): AtlasPartRect | null {
    const meta = this.metadataCache.get(characterId);
    if (!meta || !meta.parts) return null;
    return meta.parts[partName] || null;
  }

  /**
   * Checks if an atlas is fully loaded and ready for textured rendering.
   */
  public static isAtlasLoaded(
    scene: Phaser.Scene,
    characterId: string
  ): boolean {
    const status = this.statusMap.get(characterId);
    if (!status || status.state !== 'loaded') {
      return false;
    }

    const texKey = this.getTextureKey(characterId);
    if (scene?.textures?.exists) {
      return scene.textures.exists(texKey);
    }

    return true;
  }

  /**
   * Checks if an atlas previously failed to load.
   */
  public static isAtlasFailed(characterId: string): boolean {
    const status = this.statusMap.get(characterId);
    return status?.state === 'failed';
  }

  /**
   * Retrieves parsed metadata for a character.
   */
  public static getAtlasMetadata(characterId: string): CharacterAtlasMetadata | null {
    return this.metadataCache.get(characterId) || null;
  }

  /**
   * Cleans up textures and memory when destroying or unloading.
   */
  public static unloadAtlas(scene: Phaser.Scene, characterId: string): void {
    const texKey = this.getTextureKey(characterId);
    if (scene?.textures?.remove) {
      scene.textures.remove(texKey);
    }
    this.statusMap.delete(characterId);
    this.inFlightLoads.delete(characterId);
    this.metadataCache.delete(characterId);
  }

  /**
   * Resets internal status maps and cache (for test suites and hot reload).
   */
  public static clearCache(): void {
    this.statusMap.clear();
    this.inFlightLoads.clear();
    this.metadataCache.clear();
  }

  /**
   * Alias for clearCache.
   */
  public static reset(): void {
    this.clearCache();
  }
}
