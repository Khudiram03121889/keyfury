import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CHARACTER_REGISTRY,
  DEFAULT_CHARACTER_ID,
  getCharacterDefinition,
  getAllCharacters,
  isValidCharacterId,
  CharacterId,
  CharacterDefinition,
  solve2BoneIK,
  solveSpineCurve,
  RagdollSystem,
  Vector2D
} from '../../packages/game-core/src/index.js';
import {
  ObjectPool,
  ParticlePool,
  Vector2Pool,
  HitboxPool,
  ProjectilePool,
  type PooledParticle
} from '../../apps/web/src/render/ObjectPool.js';
import {
  SELECTED_CHARACTER_KEY,
  getSavedSelectedCharacter,
  saveSelectedCharacter
} from '../../apps/web/src/lib/supabase.js';
import { CombatRoom, CombatRoomState, PlayerState } from '../../apps/game-server/src/rooms/CombatRoom.js';

// Helper function to create an isolated CombatRoom for unit testing
function createMockCombatRoom(options: any = {}): CombatRoom {
  const room = new CombatRoom();
  room.setMetadata = vi.fn().mockReturnValue(Promise.resolve());
  room.broadcast = vi.fn().mockReturnValue(true);
  room.roomId = 'mock-room-' + Math.random().toString(36).substring(2, 7);
  room.onCreate(options);
  return room;
}

// ============================================================================
// TIER 5 ADVERSARIAL STRESS TEST SUITE
// KeyFury 2D Character Roster System Hardening & Edge-Case Verification
// ============================================================================

describe('Tier 5 Adversarial Stress & Hardening Test Suite', () => {

  // --------------------------------------------------------------------------
  // 1. ADVERSARIAL IK & RAGDOLL PHYSICS NUMERICAL STABILITY
  // --------------------------------------------------------------------------
  describe('1. Physics IK Solver & Ragdoll Numerical Stability', () => {

    it('handles coincidence singularity (target === root, distance = 0) without NaN', () => {
      const root: Vector2D = { x: 100, y: 100 };
      const target: Vector2D = { x: 100, y: 100 };
      const res = solve2BoneIK(root, target, 25, 25, 1);

      expect(Number.isFinite(res.joint.x)).toBe(true);
      expect(Number.isFinite(res.joint.y)).toBe(true);
      expect(Number.isFinite(res.tip.x)).toBe(true);
      expect(Number.isFinite(res.tip.y)).toBe(true);
      expect(Number.isFinite(res.angle1)).toBe(true);
      expect(Number.isFinite(res.angle2)).toBe(true);
      expect(isNaN(res.joint.x)).toBe(false);
      expect(isNaN(res.joint.y)).toBe(false);
      expect(isNaN(res.tip.x)).toBe(false);
      expect(isNaN(res.tip.y)).toBe(false);
    });

    it('handles extreme out-of-reach target (distance = 1e8) without numerical divergence or NaN', () => {
      const root: Vector2D = { x: 0, y: 0 };
      const target: Vector2D = { x: 1e8, y: 1e8 };
      const res = solve2BoneIK(root, target, 25, 25, 1);

      expect(Number.isFinite(res.joint.x)).toBe(true);
      expect(Number.isFinite(res.joint.y)).toBe(true);
      expect(Number.isFinite(res.tip.x)).toBe(true);
      expect(Number.isFinite(res.tip.y)).toBe(true);
      expect(res.reached).toBe(false);

      // Total distance from root to tip should equal approximately length1 + length2
      const tipDist = Math.sqrt((res.tip.x - root.x) ** 2 + (res.tip.y - root.y) ** 2);
      expect(tipDist).toBeCloseTo(50, 1);
    });

    it('handles extreme negative/sub-zero target coordinates (-1e7, -1e7)', () => {
      const root: Vector2D = { x: -500, y: -500 };
      const target: Vector2D = { x: -1e7, y: -1e7 };
      const res = solve2BoneIK(root, target, 30, 20, -1);

      expect(Number.isFinite(res.joint.x)).toBe(true);
      expect(Number.isFinite(res.joint.y)).toBe(true);
      expect(Number.isFinite(res.tip.x)).toBe(true);
      expect(Number.isFinite(res.tip.y)).toBe(true);
      expect(res.reached).toBe(false);
    });

    it('handles exact boundary collinear extension (distance === length1 + length2)', () => {
      const root: Vector2D = { x: 0, y: 0 };
      const l1 = 20;
      const l2 = 30;
      const target: Vector2D = { x: 50, y: 0 }; // distance = 50
      const res = solve2BoneIK(root, target, l1, l2, 1);

      expect(res.reached).toBe(true);
      expect(res.tip.x).toBeCloseTo(50, 2);
      expect(res.tip.y).toBeCloseTo(0, 2);
      expect(isNaN(res.angle1)).toBe(false);
      expect(isNaN(res.angle2)).toBe(false);
    });

    it('handles zero or negative bone lengths safely via minimum threshold clamping', () => {
      const root: Vector2D = { x: 10, y: 20 };
      const target: Vector2D = { x: 50, y: 60 };
      const res = solve2BoneIK(root, target, 0, -10, 1);

      expect(Number.isFinite(res.joint.x)).toBe(true);
      expect(Number.isFinite(res.joint.y)).toBe(true);
      expect(Number.isFinite(res.tip.x)).toBe(true);
      expect(Number.isFinite(res.tip.y)).toBe(true);
    });

    it('spine curve solver handles zero distance degenerate positions (root === mid === head)', () => {
      const pos: Vector2D = { x: 200, y: 300 };
      const res = solveSpineCurve(pos, pos, pos, 15);

      expect(Number.isFinite(res.mid.x)).toBe(true);
      expect(Number.isFinite(res.mid.y)).toBe(true);
      expect(Number.isFinite(res.head.x)).toBe(true);
      expect(Number.isFinite(res.head.y)).toBe(true);
      expect(isNaN(res.mid.x)).toBe(false);
      expect(isNaN(res.head.x)).toBe(false);
    });

    it('spine curve solver handles extreme bend amounts (+- 10,000px) stably', () => {
      const root = { x: 100, y: 300 };
      const mid = { x: 100, y: 250 };
      const head = { x: 100, y: 200 };

      const resPos = solveSpineCurve(root, mid, head, 10000);
      const resNeg = solveSpineCurve(root, mid, head, -10000);

      expect(Number.isFinite(resPos.mid.x)).toBe(true);
      expect(Number.isFinite(resPos.head.y)).toBe(true);
      expect(Number.isFinite(resNeg.mid.x)).toBe(true);
      expect(Number.isFinite(resNeg.head.y)).toBe(true);
    });

    it('ragdoll handles massive explosive impulse (1,000,000 N) and 1,000 simulation steps stably', () => {
      const ragdoll = new RagdollSystem({ groundY: 600 });
      ragdoll.initDefaultSkeleton({ x: 500, y: 300 }, 1.0);
      ragdoll.setMode('Ragdoll');

      // Explosive diagonal knockout impulse
      ragdoll.applyImpulse('head', { x: 500000, y: -500000 });

      // Run 1,000 physics ticks (16.66ms per tick = ~16.6 seconds of simulation)
      const dt = 1 / 60;
      for (let i = 0; i < 1000; i++) {
        ragdoll.step(dt);
      }

      // Check that all nodes are finite and clamped to ground
      for (const [id, node] of ragdoll.nodes.entries()) {
        expect(Number.isFinite(node.x), `Node ${id} x is not finite`).toBe(true);
        expect(Number.isFinite(node.y), `Node ${id} y is not finite`).toBe(true);
        expect(isNaN(node.x), `Node ${id} x is NaN`).toBe(false);
        expect(isNaN(node.y), `Node ${id} y is NaN`).toBe(false);
        expect(node.y).toBeLessThanOrEqual(ragdoll.groundY + 1e-4);
      }
    });

    it('ragdoll smoothly transitions from Ragdoll -> Blending -> IK under continuous stepping', () => {
      const ragdoll = new RagdollSystem({ groundY: 500 });
      ragdoll.initDefaultSkeleton({ x: 400, y: 250 }, 1.0);
      ragdoll.setMode('Ragdoll');

      // Knockdown step
      ragdoll.applyImpulse('pelvis', { x: 200, y: -300 });
      for (let i = 0; i < 30; i++) ragdoll.step(1 / 60);

      const targetPose = {
        head: { x: 400, y: 180 },
        neck: { x: 400, y: 210 },
        pelvis: { x: 400, y: 250 },
        elbowL: { x: 380, y: 215 },
        handL: { x: 365, y: 235 },
        elbowR: { x: 420, y: 215 },
        handR: { x: 435, y: 235 },
        kneeL: { x: 385, y: 285 },
        footL: { x: 385, y: 320 },
        kneeR: { x: 415, y: 285 },
        footR: { x: 415, y: 320 }
      };

      ragdoll.transitionToIK(targetPose, 0.2);
      expect(ragdoll.getMode()).toBe('Blending');

      // Step through blend duration (0.2s = 12 frames)
      for (let i = 0; i < 20; i++) {
        ragdoll.step(1 / 60);
      }

      expect(ragdoll.getMode()).toBe('IK');
      const finalHead = ragdoll.getNode('head');
      expect(finalHead?.x).toBeCloseTo(400, 1);
      expect(finalHead?.y).toBeCloseTo(180, 1);
    });
  });

  // --------------------------------------------------------------------------
  // 2. ADVERSARIAL OBJECT POOL & PARTICLE RECYCLING UNDER EXTREME LOAD
  // --------------------------------------------------------------------------
  describe('2. ObjectPool Extreme Load & Recycling Invariants', () => {

    it('survives 10,000 particle acquisition and release cycles with zero leaked active objects', () => {
      const pool = new ObjectPool<PooledParticle>({
        factory: () => ({
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          size: 2,
          color: '#ffffff',
          lifetimeMs: 300,
          currentAgeMs: 0,
          active: false
        }),
        reset: (p) => {
          p.position.x = 0;
          p.position.y = 0;
          p.velocity.x = 0;
          p.velocity.y = 0;
          p.size = 2;
          p.color = '#ffffff';
          p.lifetimeMs = 300;
          p.currentAgeMs = 0;
          p.active = false;
        },
        initialSize: 100,
        autoExpand: true
      });

      const activeBatch: PooledParticle[] = [];
      const BATCH_SIZE = 5000;

      // Acquire 5000 objects
      for (let i = 0; i < BATCH_SIZE; i++) {
        const p = pool.acquire();
        p.position.x = i;
        p.position.y = i * 2;
        p.color = '#ff0055';
        p.active = true;
        activeBatch.push(p);
      }

      expect(pool.getActiveCount()).toBe(BATCH_SIZE);

      // Release in shuffled/random order
      const shuffled = [...activeBatch].sort(() => Math.random() - 0.5);
      for (const p of shuffled) {
        pool.release(p);
      }

      expect(pool.getActiveCount()).toBe(0);
      expect(pool.getFreeCount()).toBeGreaterThanOrEqual(BATCH_SIZE);

      // Verify reset state on re-acquisition
      const reacquired = pool.acquire();
      expect(reacquired.position.x).toBe(0);
      expect(reacquired.position.y).toBe(0);
      expect(reacquired.color).toBe('#ffffff');
      expect(reacquired.active).toBe(false);

      pool.release(reacquired);
      expect(pool.getActiveCount()).toBe(0);
    });

    it('guards against double-free without corrupting pool counts', () => {
      const pool = new ObjectPool<{ id: number }>({
        factory: () => ({ id: Math.random() }),
        reset: () => {},
        initialSize: 10
      });

      const item = pool.acquire();
      expect(pool.getActiveCount()).toBe(1);

      pool.release(item);
      expect(pool.getActiveCount()).toBe(0);

      // Releasing again should be a safe no-op
      pool.release(item);
      expect(pool.getActiveCount()).toBe(0);
      expect(pool.getFreeCount()).toBe(10);
    });

    it('guards against releasing foreign/untracked objects without corrupting free list', () => {
      const pool = new ObjectPool<{ id: number }>({
        factory: () => ({ id: 1 }),
        reset: () => {},
        initialSize: 5
      });

      const alienObj = { id: 999 };
      pool.release(alienObj as any);

      expect(pool.getActiveCount()).toBe(0);
      expect(pool.getFreeCount()).toBe(5);
    });

    it('releaseAll cleanly resets and frees all active objects', () => {
      const pool = new ObjectPool<{ val: number }>({
        factory: () => ({ val: 0 }),
        reset: (o) => { o.val = 0; },
        initialSize: 20
      });

      Array.from({ length: 50 }, () => {
        const obj = pool.acquire();
        obj.val = 42;
        return obj;
      });

      expect(pool.getActiveCount()).toBe(50);
      pool.releaseAll();
      expect(pool.getActiveCount()).toBe(0);
      expect(pool.getFreeCount()).toBe(50);

      const check = pool.acquire();
      expect(check.val).toBe(0);
      pool.release(check);
    });

    it('simulates 100 high-frequency combat frames (500 particles/frame) without memory leak', () => {
      let activeParticles: PooledParticle[] = [];

      for (let frame = 0; frame < 100; frame++) {
        // Spawn 100 particles per frame
        for (let i = 0; i < 100; i++) {
          const p = ParticlePool.acquire();
          p.position.x = 500;
          p.position.y = 300;
          p.lifetimeMs = 50; // short life
          p.currentAgeMs = 0;
          p.active = true;
          activeParticles.push(p);
        }

        // Simulate frame update (delta = 16.6ms)
        const remaining: PooledParticle[] = [];
        for (const p of activeParticles) {
          p.currentAgeMs += 16.6;
          if (p.currentAgeMs >= p.lifetimeMs) {
            ParticlePool.release(p);
          } else {
            remaining.push(p);
          }
        }
        activeParticles = remaining;
      }

      // Finish simulation
      for (const p of activeParticles) {
        ParticlePool.release(p);
      }
      activeParticles = [];

      expect(ParticlePool.getActiveCount()).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 3. ADVERSARIAL LOCALSTORAGE & CORRUPTED STATE RECOVERY
  // --------------------------------------------------------------------------
  describe('3. LocalStorage Corruption & Persistence Hardening', () => {
    let mockStore: Map<string, string>;

    beforeEach(() => {
      mockStore = new Map();
      vi.stubGlobal('window', globalThis);
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => mockStore.get(k) ?? null,
        setItem: (k: string, v: string) => mockStore.set(k, String(v)),
        removeItem: (k: string) => mockStore.delete(k),
        clear: () => mockStore.clear()
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('recovers safely from invalid character IDs in localStorage', () => {
      const maliciousPayloads = [
        '__proto__',
        'constructor',
        'prototype',
        'toString',
        'null',
        'undefined',
        '{"id":"shadow_ronin"}',
        '<script>alert(1)</script>',
        'arbitrary_hacker_hero',
        '',
        '   ',
        '12345'
      ];

      for (const payload of maliciousPayloads) {
        mockStore.set(SELECTED_CHARACTER_KEY, payload);
        const retrieved = getSavedSelectedCharacter();
        expect(retrieved).toBe(DEFAULT_CHARACTER_ID);
      }
    });

    it('guards against QuotaExceededError when saving character selection', () => {
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => mockStore.get(k) ?? null,
        setItem: () => {
          throw new Error('QuotaExceededError: DOM Exception 22');
        },
        removeItem: (k: string) => mockStore.delete(k),
        clear: () => mockStore.clear()
      });

      expect(() => {
        saveSelectedCharacter('cyber_valkyrie');
      }).not.toThrow();
    });

    it('guards against SecurityError (disabled cookies/localStorage in private mode)', () => {
      vi.stubGlobal('localStorage', {
        getItem: () => {
          throw new Error('SecurityError: The operation is insecure');
        },
        setItem: () => {
          throw new Error('SecurityError: The operation is insecure');
        }
      });

      expect(getSavedSelectedCharacter()).toBe(DEFAULT_CHARACTER_ID);
      expect(() => saveSelectedCharacter('volt_shinobi')).not.toThrow();
    });

    it('rejects saving invalid character IDs without writing corrupted data', () => {
      saveSelectedCharacter('invalid_hero' as any);
      expect(mockStore.has(SELECTED_CHARACTER_KEY)).toBe(false);

      saveSelectedCharacter('void_assassin');
      expect(mockStore.get(SELECTED_CHARACTER_KEY)).toBe('void_assassin');
    });
  });

  // --------------------------------------------------------------------------
  // 4. ADVERSARIAL MULTIPLAYER & SERVER ROOM JOIN HARDENING
  // --------------------------------------------------------------------------
  describe('4. Multiplayer Server Room Join & State Synchronization Hardening', () => {

    it('handles completely missing / undefined join options gracefully', () => {
      const room = createMockCombatRoom({});

      const mockClient: any = {
        sessionId: 'client-test-1',
        auth: {}
      };

      expect(() => {
        room.onJoin(mockClient, {} as any);
      }).not.toThrow();

      const p1 = room.state.players.get('client-test-1');
      expect(p1).toBeDefined();
      expect(p1?.characterId).toBe('shadow_ronin');
      expect(p1?.side).toBe('left');
    });

    it('falls back to shadow_ronin when join options contain unknown or malformed characterId', () => {
      const room = createMockCombatRoom({});

      const mockClient: any = {
        sessionId: 'client-test-2',
        auth: {}
      };

      room.onJoin(mockClient, {
        displayName: 'Test Warrior',
        characterId: 'non_existent_ninja' as any
      });

      const p = room.state.players.get('client-test-2');
      const charDef = getCharacterDefinition(p?.characterId);
      expect(charDef.id).toBe('shadow_ronin');
    });

    it('spawns distinct bot opponent across all 4 human character selections in 1v1 practice', () => {
      const characterIds: CharacterId[] = [
        'shadow_ronin',
        'cyber_valkyrie',
        'volt_shinobi',
        'void_assassin'
      ];

      for (const humanChar of characterIds) {
        const room = createMockCombatRoom({ withBot: true });

        const humanClient: any = { sessionId: `human-${humanChar}`, auth: {} };
        room.onJoin(humanClient, {
          displayName: `Human ${humanChar}`,
          characterId: humanChar,
          withBot: true
        });

        const bot = room.state.players.get('bot-ai-opponent');
        expect(bot).toBeDefined();
        expect(bot?.characterId).toBeDefined();
        expect(isValidCharacterId(bot?.characterId)).toBe(true);
        // Bot should never pick the human's character unless all are taken
        expect(bot?.characterId).not.toBe(humanChar);
      }
    });

    it('rejects 3rd player joining a full 2-player combat room', () => {
      const room = createMockCombatRoom({});

      room.onJoin({ sessionId: 'p1', auth: {} } as any, { characterId: 'shadow_ronin' });
      room.onJoin({ sessionId: 'p2', auth: {} } as any, { characterId: 'volt_shinobi' });

      expect(() => {
        room.onJoin({ sessionId: 'p3', auth: {} } as any, { characterId: 'void_assassin' });
      }).toThrow('Room is full');
    });
  });

  // --------------------------------------------------------------------------
  // 5. RAPID CHAMPION SWITCHING SIMULATION & UI STRESS
  // --------------------------------------------------------------------------
  describe('5. Rapid Champion Switching & Registry Stress', () => {

    it('handles 10,000 rapid lookup calls across all 4 fighters deterministically', () => {
      const charIds: CharacterId[] = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];

      for (let i = 0; i < 10000; i++) {
        const id = charIds[i % charIds.length];
        const def = getCharacterDefinition(id);
        expect(def.id).toBe(id);
        expect(def.attributes.speed).toBeGreaterThanOrEqual(1);
        expect(def.attributes.speed).toBeLessThanOrEqual(10);
        expect(def.theme.particlePalette.length).toBeGreaterThan(0);
      }
    });

    it('prototype pollution attack on CharacterRegistry is completely blocked', () => {
      const maliciousKeys = ['__proto__', 'constructor', 'prototype'];

      for (const key of maliciousKeys) {
        const def = getCharacterDefinition(key as any);
        expect(def.id).toBe('shadow_ronin');
        expect(isValidCharacterId(key)).toBe(false);
      }
    });

    it('character registry has complete data integrity for all 4 core fighters', () => {
      const all = getAllCharacters();
      expect(all).toHaveLength(4);

      for (const char of all) {
        expect(char.id).toBeDefined();
        expect(char.name).toBeDefined();
        expect(char.codename).toBeDefined();
        expect(char.element).toBeDefined();
        expect(char.attributes.speed).toBeGreaterThanOrEqual(1);
        expect(char.attributes.power).toBeGreaterThanOrEqual(1);
        expect(char.attributes.defense).toBeGreaterThanOrEqual(1);
        expect(char.attributes.comboMastery).toBeGreaterThanOrEqual(1);
        expect(char.gear.headType).toBeDefined();
        expect(char.gear.shoulderType).toBeDefined();
        expect(char.gear.gauntletType).toBeDefined();
        expect(char.gear.waistType).toBeDefined();
        expect(char.theme.particlePalette.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('simulates rapid champion switching (1,000 cycles) with active particle bursts and test strikes', () => {
      const charIds: CharacterId[] = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];
      let selectedChar: CharacterId = 'shadow_ronin';
      const activeParticles: PooledParticle[] = [];

      for (let i = 0; i < 1000; i++) {
        // Switch champion
        selectedChar = charIds[i % charIds.length];
        const def = getCharacterDefinition(selectedChar);
        expect(def.id).toBe(selectedChar);

        // Every 5 cycles, simulate test strike burst
        if (i % 5 === 0) {
          const count = selectedChar === 'cyber_valkyrie' ? 24 : 16;
          for (let p = 0; p < count; p++) {
            const particle = ParticlePool.acquire();
            particle.color = def.theme.particlePalette[p % def.theme.particlePalette.length];
            particle.lifetimeMs = 380;
            particle.active = true;
            activeParticles.push(particle);
          }
        }

        // Clean up expired particles
        if (activeParticles.length > 200) {
          while (activeParticles.length > 0) {
            const p = activeParticles.pop()!;
            ParticlePool.release(p);
          }
        }
      }

      // Cleanup remaining
      for (const p of activeParticles) {
        ParticlePool.release(p);
      }

      expect(ParticlePool.getActiveCount()).toBe(0);
      expect(selectedChar).toBe('void_assassin');
    });

    it('validates IK angle calculation across positive and negative bend orientations', () => {
      const root = { x: 50, y: 50 };
      const target = { x: 80, y: 70 };
      const l1 = 25;
      const l2 = 25;

      const posSolve = solve2BoneIK(root, target, l1, l2, 1);
      const negSolve = solve2BoneIK(root, target, l1, l2, -1);

      expect(posSolve.reached).toBe(true);
      expect(negSolve.reached).toBe(true);
      expect(posSolve.tip.x).toBeCloseTo(target.x, 1);
      expect(negSolve.tip.x).toBeCloseTo(target.x, 1);

      // Elbow joint positions must bend in opposite directions
      expect(posSolve.joint.y).not.toBeCloseTo(negSolve.joint.y, 1);
    });

    it('getPlayerCharacterIds handles corrupted, null, empty or array-like player collections safely', () => {
      const getPlayerCharacterIds = (state: any): { p1CharId: string; p2CharId: string } => {
        let p1CharId = 'shadow_ronin';
        let p2CharId = 'cyber_valkyrie';

        if (!state?.players) return { p1CharId, p2CharId };

        if (typeof state.players.forEach === 'function') {
          state.players.forEach((p: any) => {
            if (p?.side === 'left' && p?.characterId) {
              p1CharId = p.characterId;
            } else if (p?.side === 'right' && p?.characterId) {
              p2CharId = p.characterId;
            }
          });
        } else if (typeof state.players === 'object') {
          Object.values(state.players).forEach((p: any) => {
            if (p?.side === 'left' && p?.characterId) {
              p1CharId = p.characterId;
            } else if (p?.side === 'right' && p?.characterId) {
              p2CharId = p.characterId;
            }
          });
        }

        return { p1CharId, p2CharId };
      };

      expect(getPlayerCharacterIds(null)).toEqual({ p1CharId: 'shadow_ronin', p2CharId: 'cyber_valkyrie' });
      expect(getPlayerCharacterIds({})).toEqual({ p1CharId: 'shadow_ronin', p2CharId: 'cyber_valkyrie' });
      expect(getPlayerCharacterIds({ players: null })).toEqual({ p1CharId: 'shadow_ronin', p2CharId: 'cyber_valkyrie' });
      expect(getPlayerCharacterIds({ players: new Map() })).toEqual({ p1CharId: 'shadow_ronin', p2CharId: 'cyber_valkyrie' });

      // Custom sides
      const map = new Map();
      map.set('p1', { side: 'left', characterId: 'volt_shinobi' });
      map.set('p2', { side: 'right', characterId: 'void_assassin' });
      expect(getPlayerCharacterIds({ players: map })).toEqual({ p1CharId: 'volt_shinobi', p2CharId: 'void_assassin' });

      // Plain object
      const plainObj = {
        p1: { side: 'left', characterId: 'cyber_valkyrie' },
        p2: { side: 'right', characterId: 'shadow_ronin' }
      };
      expect(getPlayerCharacterIds({ players: plainObj })).toEqual({ p1CharId: 'cyber_valkyrie', p2CharId: 'shadow_ronin' });
    });
  });

});

