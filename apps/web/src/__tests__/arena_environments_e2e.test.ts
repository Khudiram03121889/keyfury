import { describe, it, expect, beforeEach } from 'vitest';
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
      expect(arena.portraitPlatformRatio).toBeGreaterThan(0.65);
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
});
