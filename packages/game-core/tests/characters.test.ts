import { describe, it, expect } from 'vitest';
import {
  CHARACTER_REGISTRY,
  DEFAULT_CHARACTER_ID,
  getCharacterDefinition,
  getAllCharacters,
  isValidCharacterId,
  CharacterId,
  CharacterDefinition
} from '../src/characters/index.js';

describe('Character Registry & Definitions', () => {
  const EXPECTED_CHARACTER_IDS: CharacterId[] = [
    'shadow_ronin',
    'cyber_valkyrie',
    'volt_shinobi',
    'void_assassin'
  ];

  it('contains all 4 core fighters in CHARACTER_REGISTRY', () => {
    const registryKeys = Object.keys(CHARACTER_REGISTRY) as CharacterId[];
    expect(registryKeys).toHaveLength(4);
    for (const id of EXPECTED_CHARACTER_IDS) {
      expect(CHARACTER_REGISTRY[id]).toBeDefined();
      expect(CHARACTER_REGISTRY[id].id).toBe(id);
    }
  });

  it('getAllCharacters returns all 4 character definitions', () => {
    const characters = getAllCharacters();
    expect(characters).toHaveLength(4);
    const ids = characters.map((c) => c.id);
    for (const id of EXPECTED_CHARACTER_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('has DEFAULT_CHARACTER_ID set to shadow_ronin', () => {
    expect(DEFAULT_CHARACTER_ID).toBe('shadow_ronin');
  });

  describe('Attribute Integrity & Bounds', () => {
    const characters = getAllCharacters();

    it.each(characters)('$name attributes are within bounds (1-10) and integer', (char: CharacterDefinition) => {
      const { speed, power, defense, comboMastery } = char.attributes;

      expect(Number.isInteger(speed)).toBe(true);
      expect(speed).toBeGreaterThanOrEqual(1);
      expect(speed).toBeLessThanOrEqual(10);

      expect(Number.isInteger(power)).toBe(true);
      expect(power).toBeGreaterThanOrEqual(1);
      expect(power).toBeLessThanOrEqual(10);

      expect(Number.isInteger(defense)).toBe(true);
      expect(defense).toBeGreaterThanOrEqual(1);
      expect(defense).toBeLessThanOrEqual(10);

      expect(Number.isInteger(comboMastery)).toBe(true);
      expect(comboMastery).toBeGreaterThanOrEqual(1);
      expect(comboMastery).toBeLessThanOrEqual(10);
    });
  });

  describe('Visual Theme & Color Validity', () => {
    const characters = getAllCharacters();
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

    it.each(characters)('$name has valid theme color formats', (char: CharacterDefinition) => {
      const { theme } = char;

      expect(theme.primaryColor).toMatch(hexColorRegex);
      expect(theme.secondaryColor).toMatch(hexColorRegex);
      expect(theme.accentColor).toMatch(hexColorRegex);

      expect(typeof theme.bodyColor).toBe('number');
      expect(theme.bodyColor).toBeGreaterThanOrEqual(0);
      expect(theme.bodyColor).toBeLessThanOrEqual(0xffffff);

      expect(typeof theme.gloveColor).toBe('number');
      expect(theme.gloveColor).toBeGreaterThanOrEqual(0);
      expect(theme.gloveColor).toBeLessThanOrEqual(0xffffff);

      expect(typeof theme.eyeColor).toBe('number');
      expect(theme.eyeColor).toBeGreaterThanOrEqual(0);
      expect(theme.eyeColor).toBeLessThanOrEqual(0xffffff);

      expect(typeof theme.glowColor).toBe('string');
      expect(theme.glowColor.length).toBeGreaterThan(0);

      expect(Array.isArray(theme.particlePalette)).toBe(true);
      expect(theme.particlePalette.length).toBeGreaterThanOrEqual(3);
      for (const color of theme.particlePalette) {
        expect(color).toMatch(hexColorRegex);
      }
    });
  });

  describe('Gear Specs & Lore Metadata Completeness', () => {
    const characters = getAllCharacters();

    it.each(characters)('$name has complete gear specifications', (char: CharacterDefinition) => {
      const { gear } = char;
      expect(typeof gear.headType).toBe('string');
      expect(gear.headType.length).toBeGreaterThan(0);
      expect(typeof gear.shoulderType).toBe('string');
      expect(gear.shoulderType.length).toBeGreaterThan(0);
      expect(typeof gear.gauntletType).toBe('string');
      expect(gear.gauntletType.length).toBeGreaterThan(0);
      expect(typeof gear.accessoryType).toBe('string');
      expect(gear.accessoryType.length).toBeGreaterThan(0);
      expect(typeof gear.waistType).toBe('string');
      expect(gear.waistType.length).toBeGreaterThan(0);
    });

    it.each(characters)('$name has complete lore and metadata', (char: CharacterDefinition) => {
      expect(char.name.length).toBeGreaterThan(0);
      expect(char.codename.length).toBeGreaterThan(0);
      expect(char.title.length).toBeGreaterThan(0);
      expect(char.archetype.length).toBeGreaterThan(0);
      expect(char.archetypeLabel.length).toBeGreaterThan(0);
      expect(char.tagline.length).toBeGreaterThan(0);
      expect(char.lore.length).toBeGreaterThan(0);
      expect(char.element.length).toBeGreaterThan(0);
      expect(char.signatureMove.length).toBeGreaterThan(0);
      expect(char.signatureQuote.length).toBeGreaterThan(0);
      expect(char.portraitAssetKey.length).toBeGreaterThan(0);
      expect(char.avatarIcon.length).toBeGreaterThan(0);
    });
  });

  describe('Lookup & Fallback Resiliency', () => {
    it('returns exact character for valid IDs', () => {
      for (const id of EXPECTED_CHARACTER_IDS) {
        const char = getCharacterDefinition(id);
        expect(char).toBeDefined();
        expect(char.id).toBe(id);
      }
    });

    it('falls back safely to default character (shadow_ronin) for null or undefined', () => {
      const nullResult = getCharacterDefinition(null);
      expect(nullResult).toEqual(CHARACTER_REGISTRY.shadow_ronin);

      const undefinedResult = getCharacterDefinition(undefined);
      expect(undefinedResult).toEqual(CHARACTER_REGISTRY.shadow_ronin);

      const emptyResult = getCharacterDefinition('');
      expect(emptyResult).toEqual(CHARACTER_REGISTRY.shadow_ronin);
    });

    it('falls back safely to default character for unknown or invalid IDs', () => {
      const unknownResult = getCharacterDefinition('unknown_fighter_id');
      expect(unknownResult).toEqual(CHARACTER_REGISTRY.shadow_ronin);

      const injectedResult = getCharacterDefinition('__proto__');
      expect(injectedResult).toEqual(CHARACTER_REGISTRY.shadow_ronin);

      const randomResult = getCharacterDefinition('cyber_ninja_999');
      expect(randomResult).toEqual(CHARACTER_REGISTRY.shadow_ronin);
    });
  });

  describe('Type Guard: isValidCharacterId', () => {
    it('returns true for all valid CharacterId values', () => {
      for (const id of EXPECTED_CHARACTER_IDS) {
        expect(isValidCharacterId(id)).toBe(true);
      }
    });

    it('returns false for invalid string values', () => {
      expect(isValidCharacterId('random_string')).toBe(false);
      expect(isValidCharacterId('shadow-ronin')).toBe(false); // kebab-case instead of snake_case
      expect(isValidCharacterId('')).toBe(false);
      expect(isValidCharacterId('toString')).toBe(false);
      expect(isValidCharacterId('__proto__')).toBe(false);
    });

    it('returns false for non-string types', () => {
      expect(isValidCharacterId(null)).toBe(false);
      expect(isValidCharacterId(undefined)).toBe(false);
      expect(isValidCharacterId(123)).toBe(false);
      expect(isValidCharacterId({})).toBe(false);
      expect(isValidCharacterId(['shadow_ronin'])).toBe(false);
      expect(isValidCharacterId(true)).toBe(false);
    });
  });
});
