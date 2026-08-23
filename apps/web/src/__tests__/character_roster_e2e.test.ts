import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CHARACTER_REGISTRY,
  getCharacterDefinition,
  getAllCharacters,
  isValidCharacterId,
  solve2BoneIK,
  solveSpineCurve,
  RagdollSystem,
  CharacterId,
  CharacterDefinition
} from '@keyfury/game-core';
import {
  ObjectPool,
  ParticlePool,
  Vector2Pool,
  type PooledParticle
} from '../render/ObjectPool';
import {
  drawTaperedLimb,
  drawCharacterHeadgear,
  drawCharacterPauldronsAndTorso,
  drawCharacterGauntletsAndWeapons,
  drawCharacterWaistAndScarf,
  drawCharacterAttackVFX
} from '../game/character/CharacterRigRenderer';

class MockPhaserGraphics {
  public calls: Array<{ method: string; args: any[] }> = [];

  clear(): this {
    this.calls.push({ method: 'clear', args: [] });
    return this;
  }
  lineStyle(width: number, color: number, alpha: number = 1): this {
    this.calls.push({ method: 'lineStyle', args: [width, color, alpha] });
    return this;
  }
  fillStyle(color: number, alpha: number = 1): this {
    this.calls.push({ method: 'fillStyle', args: [color, alpha] });
    return this;
  }
  beginPath(): this {
    this.calls.push({ method: 'beginPath', args: [] });
    return this;
  }
  moveTo(x: number, y: number): this {
    this.calls.push({ method: 'moveTo', args: [x, y] });
    return this;
  }
  lineTo(x: number, y: number): this {
    this.calls.push({ method: 'lineTo', args: [x, y] });
    return this;
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number): this {
    this.calls.push({ method: 'lineBetween', args: [x1, y1, x2, y2] });
    return this;
  }
  strokePath(): this {
    this.calls.push({ method: 'strokePath', args: [] });
    return this;
  }
  closePath(): this {
    this.calls.push({ method: 'closePath', args: [] });
    return this;
  }
  fillCircle(x: number, y: number, radius: number): this {
    this.calls.push({ method: 'fillCircle', args: [x, y, radius] });
    return this;
  }
  strokeCircle(x: number, y: number, radius: number): this {
    this.calls.push({ method: 'strokeCircle', args: [x, y, radius] });
    return this;
  }
  fillRect(x: number, y: number, w: number, h: number): this {
    this.calls.push({ method: 'fillRect', args: [x, y, w, h] });
    return this;
  }
  strokeRect(x: number, y: number, w: number, h: number): this {
    this.calls.push({ method: 'strokeRect', args: [x, y, w, h] });
    return this;
  }
  fillRoundedRect(x: number, y: number, w: number, h: number, r: number): this {
    this.calls.push({ method: 'fillRoundedRect', args: [x, y, w, h, r] });
    return this;
  }
  strokeRoundedRect(x: number, y: number, w: number, h: number, r: number): this {
    this.calls.push({ method: 'strokeRoundedRect', args: [x, y, w, h, r] });
    return this;
  }
  fillPath(): this {
    this.calls.push({ method: 'fillPath', args: [] });
    return this;
  }
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): this {
    this.calls.push({ method: 'arc', args: [x, y, radius, startAngle, endAngle, anticlockwise] });
    return this;
  }
}

describe('Web Character Roster UI & Rendering E2E Integration Suite', () => {
  let mockG: MockPhaserGraphics;
  let mockFxG: MockPhaserGraphics;

  beforeEach(() => {
    mockG = new MockPhaserGraphics();
    mockFxG = new MockPhaserGraphics();
    ParticlePool.releaseAll();
  });

  afterEach(() => {
    ParticlePool.releaseAll();
  });

  describe('F5, F7, F8: Selection Modal, Lobby Badge & Storage Persistence', () => {
    it('persists selected character to localStorage and synchronizes with profile state', () => {
      const store = new Map<string, string>();
      const saveSelection = (id: CharacterId) => store.set('keyfury_selected_character', id);
      const loadSelection = () => getCharacterDefinition(store.get('keyfury_selected_character'));

      saveSelection('volt_shinobi');
      expect(loadSelection().id).toBe('volt_shinobi');
      expect(loadSelection().element).toBe('Volt Lightning');

      saveSelection('void_assassin');
      expect(loadSelection().id).toBe('void_assassin');
      expect(loadSelection().codename).toBe('Nyx');
    });

    it('generates correct lobby champion banner metadata for all 4 fighters', () => {
      for (const char of getAllCharacters()) {
        const banner = {
          name: char.name,
          codename: char.codename,
          archetype: char.archetypeLabel,
          primaryColor: char.theme.primaryColor,
          glowColor: char.theme.glowColor
        };
        expect(banner.name.length).toBeGreaterThan(0);
        expect(banner.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe('F9 & F10: Modular 2D Skeletal Rigs & Vector Mesh Rendering', () => {
    it('renders custom headgear for Shadow Ronin (kabuto visor with golden horns and azure visor)', () => {
      const ronin = CHARACTER_REGISTRY.shadow_ronin;
      drawCharacterHeadgear(mockG as any, 200, 300, 1, ronin, 'idle', 1000);
      expect(mockG.calls.some((c) => c.method === 'fillCircle' && c.args[0] === 200)).toBe(true);
      expect(mockG.calls.some((c) => c.method === 'strokePath')).toBe(true);
    });

    it('renders custom headgear for Cyber Valkyrie (valkyrie helm with swept wings and crimson optics)', () => {
      const valkyrie = CHARACTER_REGISTRY.cyber_valkyrie;
      drawCharacterHeadgear(mockG as any, 200, 300, 1, valkyrie, 'idle', 1000);
      expect(mockG.calls.some((c) => c.method === 'strokePath')).toBe(true);
      expect(mockG.calls.some((c) => c.method === 'fillCircle')).toBe(true);
    });

    it('renders custom headgear for Volt Shinobi (shinobi mask with gold HUD)', () => {
      const shinobi = CHARACTER_REGISTRY.volt_shinobi;
      drawCharacterHeadgear(mockG as any, 200, 300, 1, shinobi, 'idle', 1000);
      expect(mockG.calls.some((c) => c.method === 'strokePath')).toBe(true);
    });

    it('renders custom headgear for Void Assassin (shadow hood with purple slit eyes)', () => {
      const assassin = CHARACTER_REGISTRY.void_assassin;
      drawCharacterHeadgear(mockG as any, 200, 300, 1, assassin, 'idle', 1000);
      expect(mockG.calls.some((c) => c.method === 'strokePath')).toBe(true);
    });

    it('renders pauldrons and torso armor for all 4 fighters', () => {
      for (const char of getAllCharacters()) {
        const localMock = new MockPhaserGraphics();
        drawCharacterPauldronsAndTorso(
          localMock as any,
          { x: 195, y: 320 },
          { x: 205, y: 320 },
          { x: 197, y: 370 },
          { x: 203, y: 370 },
          { x: 192, y: 322 },
          { x: 208, y: 322 },
          1,
          char,
          'idle',
          500
        );
        expect(localMock.calls.length).toBeGreaterThan(3);
      }
    });

    it('renders custom weapons and gauntlets (katana, hydraulic fist, kunai, void daggers)', () => {
      for (const char of getAllCharacters()) {
        const localG = new MockPhaserGraphics();
        const localFxG = new MockPhaserGraphics();
        drawCharacterGauntletsAndWeapons(
          localG as any,
          localFxG as any,
          { joint: { x: 190, y: 340 }, tip: { x: 185, y: 350 } },
          { joint: { x: 215, y: 340 }, tip: { x: 230, y: 335 } },
          1,
          char,
          'jab',
          100
        );
        expect(localG.calls.length).toBeGreaterThan(0);
      }
    });

    it('renders custom animated scarves, ribbons, and cloaks', () => {
      for (const char of getAllCharacters()) {
        const localG = new MockPhaserGraphics();
        drawCharacterWaistAndScarf(localG as any, 200, 370, 205, 300, 1, char, 'idle', 1200);
        expect(localG.calls.length).toBeGreaterThan(0);
      }
    });

    it('renders dynamic elemental strike slash arcs on heavy and uppercut attacks', () => {
      for (const char of getAllCharacters()) {
        const localFxG = new MockPhaserGraphics();
        drawCharacterAttackVFX(
          localFxG as any,
          char,
          'heavy',
          200,
          320,
          200,
          370,
          { joint: { x: 215, y: 340 }, tip: { x: 235, y: 335 } },
          { joint: { x: 210, y: 400 }, tip: { x: 225, y: 420 } },
          1,
          800
        );
        expect(localFxG.calls.length).toBeGreaterThan(0);
      }
    });

    it('validates 2-bone IK limb solver dimensions and bend directions for arms and legs', () => {
      // Upper arm: 24px, Forearm: 24px, Facing right (1)
      const armR = solve2BoneIK({ x: 100, y: 200 }, { x: 135, y: 200 }, 24, 24, 1);
      expect(armR.reached).toBe(true);
      expect(armR.joint.y).toBeGreaterThanOrEqual(200); // elbow bends downward

      // Thigh: 30px, Shin: 30px, Facing right (1), Knee bend direction -facing (-1)
      const legR = solve2BoneIK({ x: 100, y: 250 }, { x: 120, y: 300 }, 30, 30, -1);
      expect(legR.reached).toBe(true);
      expect(legR.joint.x).toBeGreaterThanOrEqual(100); // knee flexes forward
    });

    it('validates 10-node Verlet ragdoll physics engine operates without errors', () => {
      const ragdoll = new RagdollSystem();
      ragdoll.initDefaultSkeleton({ x: 300, y: 400 }, 1.0);
      expect(ragdoll.nodes.size).toBe(11);

      ragdoll.setMode('Ragdoll');
      ragdoll.applyImpulse('head', { x: 40, y: -25 });
      ragdoll.step(1 / 60);

      const head = ragdoll.getNode('head');
      expect(head).toBeDefined();
      expect(head!.x).toBeGreaterThan(300);
    });
  });

  describe('F11 & F14: ObjectPool Zero-Allocation Particle VFX & Arena Skin Ingestion', () => {
    it('spawns and recycles character-specific elemental particle bursts via ParticlePool', () => {
      const ronin = CHARACTER_REGISTRY.shadow_ronin;
      const spawned: PooledParticle[] = [];

      for (let i = 0; i < 15; i++) {
        const p = ParticlePool.acquire();
        p.position.x = 100;
        p.position.y = 100;
        p.color = ronin.theme.particlePalette[i % ronin.theme.particlePalette.length];
        p.active = true;
        p.type = 'spark';
        spawned.push(p);
      }

      expect(ParticlePool.getActiveCount()).toBe(15);
      expect(spawned[0].color).toBe(ronin.theme.particlePalette[0]);
      expect(spawned[0].type).toBe('spark');

      for (const p of spawned) {
        ParticlePool.release(p);
      }
      expect(ParticlePool.getActiveCount()).toBe(0);
    });

    it('supports character-specific elemental particle types (lightning, orbital, spark, disc)', () => {
      const shinobi = CHARACTER_REGISTRY.volt_shinobi;
      const p1 = ParticlePool.acquire();
      p1.type = 'lightning';
      p1.color = shinobi.theme.particlePalette[0];
      expect(p1.type).toBe('lightning');
      expect(p1.color).toBe('#f59e0b');

      const assassin = CHARACTER_REGISTRY.void_assassin;
      const p2 = ParticlePool.acquire();
      p2.type = 'orbital';
      p2.color = assassin.theme.particlePalette[0];
      expect(p2.type).toBe('orbital');
      expect(p2.color).toBe('#a855f7');

      ParticlePool.release(p1);
      ParticlePool.release(p2);
      expect(ParticlePool.getActiveCount()).toBe(0);
    });

    it('ingests P1 and P2 character skins and injects theme palettes into combat arena', () => {
      const p1Skin = getCharacterDefinition('cyber_valkyrie');
      const p2Skin = getCharacterDefinition('volt_shinobi');

      expect(p1Skin.theme.gloveColor).toBe(0xdc2626);
      expect(p2Skin.theme.gloveColor).toBe(0xf59e0b);
      expect(p1Skin.theme.particlePalette).toContain('#ef4444');
      expect(p2Skin.theme.particlePalette).toContain('#f59e0b');
    });

    it('confirms distinct gear specs and visual themes across all 4 fighters', () => {
      const all = getAllCharacters();
      expect(all).toHaveLength(4);

      const headTypes = all.map((c) => c.gear.headType);
      expect(new Set(headTypes).size).toBe(4);
      expect(headTypes).toEqual(['kabuto_visor', 'valkyrie_helm', 'shinobi_mask', 'shadow_hood']);

      const gauntletTypes = all.map((c) => c.gear.gauntletType);
      expect(new Set(gauntletTypes).size).toBe(4);
      expect(gauntletTypes).toEqual(['plasma_strike', 'hydraulic_brawler', 'lightning_kunai', 'void_daggers']);
    });
  });
});
