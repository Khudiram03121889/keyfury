import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  resolveCharacterId,
  CHARACTER_PROFILES,
  Character3DFighter,
  type CharacterId,
} from '../game/character/Character3DController';
import {
  resolveArenaId,
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  type ArenaId,
  type CameraPreset,
} from '../render/ThreeCombatArena';

describe('ThreeCombatArena & 3D Character Kinematics E2E Test Suite', () => {
  describe('1. Character Archetypes, Profiles & Weapons Configuration', () => {
    it('resolves character IDs with fuzzy matching', () => {
      expect(resolveCharacterId('shadow_ronin')).toBe('ronin');
      expect(resolveCharacterId('KAGE')).toBe('ronin');
      expect(resolveCharacterId('volt_shinobi')).toBe('shinobi');
      expect(resolveCharacterId('Raijin_Storm')).toBe('shinobi');
      expect(resolveCharacterId('void_assassin')).toBe('void');
      expect(resolveCharacterId('Nyx')).toBe('void');
      expect(resolveCharacterId('cyber_valkyrie')).toBe('valkyrie');
      expect(resolveCharacterId('Freya_Heavy')).toBe('valkyrie');
      expect(resolveCharacterId(undefined)).toBe('ronin');
    });

    it('contains all 4 character definitions with signature weapons and GLB asset paths', () => {
      const fighters: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];
      fighters.forEach((id) => {
        const prof = CHARACTER_PROFILES[id];
        expect(prof).toBeDefined();
        expect(prof.name).toBeTruthy();
        expect(prof.weapon).toBeTruthy();
        expect(prof.modelFile).toContain('/assets/3d/');
        expect(prof.modelFile).toMatch(/\.glb$/);
        expect(prof.primaryColor).toBeGreaterThan(0);
        expect(prof.scale).toBeGreaterThan(0);
      });

      expect(CHARACTER_PROFILES.ronin.weapon).toBe('Azure Plasma Katana');
      expect(CHARACTER_PROFILES.shinobi.weapon).toBe('Dual Lightning Kunai');
      expect(CHARACTER_PROFILES.void.weapon).toBe('Dual Void Daggers');
      expect(CHARACTER_PROFILES.valkyrie.weapon).toBe('Hard-Light Glaive');
    });
  });

  describe('2. 3D Map Environments & LookDev Arena Definitions', () => {
    it('resolves arena IDs with fuzzy matching', () => {
      expect(resolveArenaId('cyber_rooftop')).toBe('cyber_rooftop');
      expect(resolveArenaId('neon_rooftop')).toBe('cyber_rooftop');
      expect(resolveArenaId('volcanic_caldera')).toBe('volcanic_caldera');
      expect(resolveArenaId('volcano')).toBe('volcanic_caldera');
      expect(resolveArenaId('celestial_void')).toBe('celestial_void');
      expect(resolveArenaId('void_shrine')).toBe('celestial_void');
      expect(resolveArenaId('highland_sanctuary')).toBe('highland_sanctuary');
      expect(resolveArenaId(undefined)).toBe('cyber_rooftop');
    });

    it('configures studio LookDev lighting and camera transforms for all arenas', () => {
      const arenas: ArenaId[] = ['cyber_rooftop', 'volcanic_caldera', 'celestial_void', 'highland_sanctuary'];
      arenas.forEach((id) => {
        const arena = ARENA_DEFINITIONS[id];
        expect(arena).toBeDefined();
        expect(arena.name).toBeTruthy();
        expect(arena.glb).toMatch(/\.glb$/);
        expect(arena.camPos).toHaveLength(3);
        expect(arena.camLookAt).toHaveLength(3);
        expect(arena.camFov).toBeGreaterThan(20);
        expect(arena.ambientIntensity).toBeGreaterThan(0);
        expect(arena.keyIntensity).toBeGreaterThan(0);
        expect(arena.rimIntensity).toBeGreaterThan(0);
        expect(arena.entranceFlair).toBeTruthy();
      });
    });
  });

  describe('3. Multi-Angle Camera System & Presets', () => {
    it('provides all 7 camera presets with distinct transforms', () => {
      expect(CAMERA_PRESETS).toHaveLength(7);
      const presetIds: CameraPreset[] = ['front', 'left', 'right', 'spider_cam', 'focused_60', 'back', 'wide_front'];
      presetIds.forEach((id) => {
        const found = CAMERA_PRESETS.find((p) => p.id === id);
        expect(found).toBeDefined();
        expect(found?.label).toBeTruthy();
        expect(found?.icon).toBeTruthy();
      });

      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      const frontPreset = CAMERA_PRESETS[0].getTransform(arenaDef);
      const leftPreset = CAMERA_PRESETS[1].getTransform(arenaDef);
      const rightPreset = CAMERA_PRESETS[2].getTransform(arenaDef);
      const spiderPreset = CAMERA_PRESETS[3].getTransform(arenaDef);
      const focused60Preset = CAMERA_PRESETS[4].getTransform(arenaDef);

      expect(frontPreset.pos[2]).toBe(7.8);
      expect(leftPreset.pos[0]).toBe(-5.0); // Elevated Left Side flank
      expect(rightPreset.pos[0]).toBe(5.0); // Elevated Right Side flank
      expect(spiderPreset.pos[1]).toBeGreaterThan(frontPreset.pos[1]); // Higher altitude for spider cam
      expect(focused60Preset.pos[1]).toBeGreaterThan(spiderPreset.pos[1]); // Steepest tactical view
    });
  });

  describe('4. Character 3D Kinematics Controller & State Machine', () => {
    it('instantiates Character3DFighter and initializes state machine cleanly', () => {
      const mockLoader: any = { load: () => {} };
      const fighter = new Character3DFighter('ronin', 'left', mockLoader);

      expect(fighter.side).toBe('left');
      expect(fighter.facingSign).toBe(1);
      expect(fighter.profile.id).toBe('ronin');
      expect(fighter.group).toBeInstanceOf(THREE.Group);

      // Verify all move triggering methods exist and do not throw
      expect(() => fighter.playJab()).not.toThrow();
      expect(() => fighter.playKick()).not.toThrow();
      expect(() => fighter.playHeavy()).not.toThrow();
      expect(() => fighter.playHitLight()).not.toThrow();
      expect(() => fighter.playHitHeavy()).not.toThrow();
      expect(() => fighter.playKeystroke()).not.toThrow();
      expect(() => fighter.playVictory()).not.toThrow();
      expect(() => fighter.playKnockout()).not.toThrow();
      expect(() => fighter.setEntranceProgress(0.5, 'cyber_rooftop')).not.toThrow();
      expect(() => fighter.triggerEntranceFlair()).not.toThrow();

      // Verify update cycle
      expect(() => fighter.update(0.016, 1.0)).not.toThrow();

      // Verify cleanup
      expect(() => fighter.dispose()).not.toThrow();
    });

    it('supports map-specific entrance trajectory calculations', () => {
      const mockLoader: any = { load: () => {} };
      const fighter = new Character3DFighter('shinobi', 'right', mockLoader);

      expect(fighter.side).toBe('right');
      expect(fighter.facingSign).toBe(-1);

      // Cyber Rooftop Drop-In trajectory
      fighter.setEntranceProgress(0.0, 'cyber_rooftop');
      fighter.update(0.016, 0.0);
      expect(fighter.group.position.x).toBe(6.5); // Starts at right wing

      fighter.setEntranceProgress(1.0, 'cyber_rooftop');
      fighter.update(0.016, 1.0);
      expect(fighter.group.position.x).toBe(1.50); // Lands on combat mark
    });
  });
});
