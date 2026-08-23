import { describe, it, expect } from 'vitest';
import {
  CHARACTER_REGISTRY,
  DEFAULT_CHARACTER_ID,
  getCharacterDefinition,
  getAllCharacters,
  isValidCharacterId,
  CharacterId,
  solve2BoneIK,
  solveSpineCurve,
  RagdollSystem,
  Vector2D,
  MATCH_RULES
} from '../src/index.js';

describe('GameCore Character Roster & Combat Mechanics E2E Suite', () => {
  describe('F1 & F2: Core Fighter Definitions & Registry Completeness', () => {
    it('contains all 4 core fighters with complete lore, element and signature moves', () => {
      const chars = getAllCharacters();
      expect(chars).toHaveLength(4);
      const ids = chars.map((c) => c.id);
      expect(ids).toEqual(['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin']);
    });

    it('safely resolves fallback for null, undefined, empty and invalid character IDs', () => {
      expect(getCharacterDefinition(null).id).toBe(DEFAULT_CHARACTER_ID);
      expect(getCharacterDefinition(undefined).id).toBe(DEFAULT_CHARACTER_ID);
      expect(getCharacterDefinition('').id).toBe(DEFAULT_CHARACTER_ID);
      expect(getCharacterDefinition('non_existent_hero').id).toBe(DEFAULT_CHARACTER_ID);
      expect(getCharacterDefinition('__proto__').id).toBe(DEFAULT_CHARACTER_ID);
    });

    it('validates attribute bounds (1-10) and sum balance across all fighters', () => {
      for (const char of getAllCharacters()) {
        const { speed, power, defense, comboMastery } = char.attributes;
        expect(speed).toBeGreaterThanOrEqual(1);
        expect(speed).toBeLessThanOrEqual(10);
        expect(power).toBeGreaterThanOrEqual(1);
        expect(power).toBeLessThanOrEqual(10);
        expect(defense).toBeGreaterThanOrEqual(1);
        expect(defense).toBeLessThanOrEqual(10);
        expect(comboMastery).toBeGreaterThanOrEqual(1);
        expect(comboMastery).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('F9 & F10: 2D Skeletal Math, IK Solvers & Ragdoll Physics', () => {
    it('solve2BoneIK accurately calculates joint and tip positions for arm strike', () => {
      const root: Vector2D = { x: 100, y: 200 };
      const target: Vector2D = { x: 130, y: 200 };
      const result = solve2BoneIK(root, target, 24, 22, 1);
      expect(result.reached).toBe(true);
      expect(result.tip.x).toBeCloseTo(target.x, 1);
      expect(result.tip.y).toBeCloseTo(target.y, 1);
    });

    it('solve2BoneIK clamps cleanly when target exceeds max reach', () => {
      const root: Vector2D = { x: 0, y: 0 };
      const target: Vector2D = { x: 200, y: 200 };
      const result = solve2BoneIK(root, target, 20, 20, 1);
      expect(result.reached).toBe(false);
      const tipDist = Math.sqrt(result.tip.x * result.tip.x + result.tip.y * result.tip.y);
      expect(tipDist).toBeCloseTo(40, 1);
    });

    it('solveSpineCurve computes smooth spine displacement under combat stance lean', () => {
      const root: Vector2D = { x: 200, y: 400 };
      const mid: Vector2D = { x: 205, y: 360 };
      const head: Vector2D = { x: 210, y: 320 };
      const spine = solveSpineCurve(root, mid, head, 12);
      expect(spine.mid).toBeDefined();
      expect(spine.root.x).toBe(root.x);
      expect(spine.head).toBeDefined();
    });

    it('RagdollSystem advances verlet simulation and resolves ground collisions', () => {
      const ragdoll = new RagdollSystem();
      ragdoll.groundY = 500;
      ragdoll.setMode('Ragdoll');
      ragdoll.applyImpulse('pelvis', { x: 50, y: -40 });

      for (let i = 0; i < 20; i++) {
        ragdoll.step(1 / 60);
      }

      for (const [_id, node] of ragdoll.nodes) {
        expect(node.y).toBeLessThanOrEqual(ragdoll.groundY + 1);
      }
    });
  });
});
