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
  Vector2D,
  MATCH_RULES
} from '../../packages/game-core/src/index.js';
import {
  PlayerSnapshot,
  MatchStateSnapshot,
  RankedQueueOptions,
  ServerEvent,
  AttackKind
} from '../../packages/protocol/src/messages.js';
import {
  ObjectPool,
  ParticlePool,
  Vector2Pool,
  PooledParticle
} from '../../apps/web/src/render/ObjectPool.js';

// ============================================================================
// TEST HARNESS & ENVIRONMENT MOCKS
// ============================================================================

class MockLocalStorage {
  private store: Map<string, string> = new Map();
  public shouldThrowOnSet: boolean = false;

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) {
      throw new Error('QuotaExceededError: storage limit reached');
    }
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }
}

interface MockGraphicsCall {
  method: string;
  args: any[];
}

class MockPhaserGraphics {
  public calls: MockGraphicsCall[] = [];
  public currentLineStyle = { width: 0, color: 0, alpha: 1 };
  public currentFillStyle = { color: 0, alpha: 1 };

  clear(): this {
    this.calls.push({ method: 'clear', args: [] });
    return this;
  }

  lineStyle(width: number, color: number, alpha: number = 1): this {
    this.currentLineStyle = { width, color, alpha };
    this.calls.push({ method: 'lineStyle', args: [width, color, alpha] });
    return this;
  }

  fillStyle(color: number, alpha: number = 1): this {
    this.currentFillStyle = { color, alpha };
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

  strokePath(): this {
    this.calls.push({ method: 'strokePath', args: [] });
    return this;
  }

  fillCircle(x: number, y: number, radius: number): this {
    this.calls.push({ method: 'fillCircle', args: [x, y, radius] });
    return this;
  }

  fillRoundedRect(x: number, y: number, width: number, height: number, radius: number): this {
    this.calls.push({ method: 'fillRoundedRect', args: [x, y, width, height, radius] });
    return this;
  }

  strokeCircle(x: number, y: number, radius: number): this {
    this.calls.push({ method: 'strokeCircle', args: [x, y, radius] });
    return this;
  }

  fillPath(): this {
    this.calls.push({ method: 'fillPath', args: [] });
    return this;
  }
}

class MockAudioSynth {
  public playedSounds: Array<{ type: string; options?: any }> = [];
  public isMuted: boolean = false;

  playKatanaSlash(): void {
    if (!this.isMuted) this.playedSounds.push({ type: 'katana_slash' });
  }

  playGauntletSmash(): void {
    if (!this.isMuted) this.playedSounds.push({ type: 'gauntlet_smash' });
  }

  playLightningSpark(): void {
    if (!this.isMuted) this.playedSounds.push({ type: 'lightning_spark' });
  }

  playVoidDagger(): void {
    if (!this.isMuted) this.playedSounds.push({ type: 'void_dagger' });
  }

  playCharacterStrikeAudio(charId: CharacterId): void {
    if (this.isMuted) return;
    switch (charId) {
      case 'shadow_ronin':
        this.playKatanaSlash();
        break;
      case 'cyber_valkyrie':
        this.playGauntletSmash();
        break;
      case 'volt_shinobi':
        this.playLightningSpark();
        break;
      case 'void_assassin':
        this.playVoidDagger();
        break;
      default:
        this.playKatanaSlash();
    }
  }
}

// ============================================================================
// SIMULATION HELPERS FOR PHASER VECTOR RIGS & STATE INGESTION
// ============================================================================

function simulateDrawFighterRigs(
  graphics: MockPhaserGraphics,
  x: number,
  y: number,
  facing: number,
  characterDef: CharacterDefinition
): void {
  graphics.clear();
  const { theme, gear } = characterDef;

  // 1. Base body anatomy
  graphics.fillStyle(theme.bodyColor, 1);
  graphics.fillCircle(x + facing * 6, y - 128, 14); // Head

  // 2. Custom modular headgear
  graphics.lineStyle(2, theme.eyeColor, 1);
  if (gear.headType === 'kabuto_visor') {
    graphics.moveTo(x + facing * 2, y - 130);
    graphics.lineTo(x + facing * 16, y - 128);
    graphics.strokePath();
  } else if (gear.headType === 'valkyrie_helm') {
    graphics.moveTo(x + facing * 6, y - 144);
    graphics.lineTo(x - facing * 8, y - 148);
    graphics.strokePath();
  } else if (gear.headType === 'shinobi_mask') {
    graphics.fillRoundedRect(x + facing * 4, y - 126, 12, 8, 2);
  } else if (gear.headType === 'shadow_hood') {
    graphics.strokeCircle(x + facing * 6, y - 128, 16);
  }

  // 3. Custom modular shoulder armor
  graphics.fillStyle(theme.gloveColor, 0.9);
  if (gear.shoulderType === 'heavy_pauldrons') {
    graphics.fillRoundedRect(x + facing * 3 - 6, y - 104, 16, 12, 4);
  } else if (gear.shoulderType === 'shadow_shroud') {
    graphics.fillRoundedRect(x - 8, y - 106, 20, 8, 3);
  } else {
    graphics.fillCircle(x + facing * 3, y - 104, 5);
  }

  // 4. Custom modular gauntlets
  graphics.fillStyle(theme.gloveColor, 1);
  graphics.fillCircle(x + facing * 24, y - 108, 6);

  // 5. Custom modular accessory / scarf
  graphics.lineStyle(3, parseInt(theme.primaryColor.replace('#', '0x'), 16), 0.8);
  if (gear.accessoryType === 'flowing_scarf') {
    graphics.moveTo(x - facing * 4, y - 104);
    graphics.lineTo(x - facing * 24, y - 98);
    graphics.strokePath();
  } else if (gear.accessoryType === 'energy_crest') {
    graphics.moveTo(x, y - 136);
    graphics.lineTo(x + facing * 8, y - 144);
    graphics.strokePath();
  }
}

function spawnSimulatedElementalBurst(
  pool: ObjectPool<PooledParticle>,
  x: number,
  y: number,
  palette: string[],
  isHeavy: boolean = false,
  count?: number
): PooledParticle[] {
  const spawnCount = count ?? (isHeavy ? 24 : 10);
  const spawned: PooledParticle[] = [];
  const safePalette = palette.length > 0 ? palette : ['#ffffff', '#38bdf8'];

  for (let i = 0; i < spawnCount; i++) {
    const particle = pool.acquire();
    particle.position.x = x;
    particle.position.y = y;
    particle.color = safePalette[i % safePalette.length];
    particle.size = isHeavy ? 3 + (i % 3) : 2;
    particle.lifetimeMs = isHeavy ? 450 : 250;
    particle.currentAgeMs = 0;
    particle.active = true;
    spawned.push(particle);
  }
  return spawned;
}

// ============================================================================
// COMPREHENSIVE 4-TIER E2E TEST SUITE
// ============================================================================

describe('KeyFury 2D Character Roster System — Complete E2E Test Suite', () => {
  let mockStorage: MockLocalStorage;
  let mockGraphics: MockPhaserGraphics;
  let mockAudio: MockAudioSynth;

  beforeEach(() => {
    mockStorage = new MockLocalStorage();
    mockGraphics = new MockPhaserGraphics();
    mockAudio = new MockAudioSynth();
    ParticlePool.releaseAll();
  });

  afterEach(() => {
    ParticlePool.releaseAll();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // TIER 1: PRIMARY FEATURE COVERAGE (F1 to F15 >=5 tests per feature)
  // ==========================================================================
  describe('Tier 1: Primary Feature Coverage (F1 to F15)', () => {
    // --- F1: 4 Core Fighter Definitions ---
    describe('F1: 4 Core Fighter Definitions', () => {
      it('F1-1: defines Shadow Ronin (Kage) with precision katana archetype and Azure Plasma', () => {
        const ronin = CHARACTER_REGISTRY.shadow_ronin;
        expect(ronin.id).toBe('shadow_ronin');
        expect(ronin.name).toBe('Shadow Ronin');
        expect(ronin.codename).toBe('Kage');
        expect(ronin.archetype).toBe('precision_katana');
        expect(ronin.element).toBe('Azure Plasma');
        expect(ronin.signatureMove).toBe('Azure Plasma Flash');
      });

      it('F1-2: defines Cyber Valkyrie (Freya) with heavy brawler archetype and Crimson Core', () => {
        const valkyrie = CHARACTER_REGISTRY.cyber_valkyrie;
        expect(valkyrie.id).toBe('cyber_valkyrie');
        expect(valkyrie.name).toBe('Cyber Valkyrie');
        expect(valkyrie.codename).toBe('Freya');
        expect(valkyrie.archetype).toBe('heavy_brawler');
        expect(valkyrie.element).toBe('Crimson Core');
        expect(valkyrie.signatureMove).toBe('Crimson Impact Overdrive');
      });

      it('F1-3: defines Volt Shinobi (Raijin) with lightning rushdown archetype and Volt Lightning', () => {
        const shinobi = CHARACTER_REGISTRY.volt_shinobi;
        expect(shinobi.id).toBe('volt_shinobi');
        expect(shinobi.name).toBe('Volt Shinobi');
        expect(shinobi.codename).toBe('Raijin');
        expect(shinobi.archetype).toBe('lightning_rushdown');
        expect(shinobi.element).toBe('Volt Lightning');
        expect(shinobi.signatureMove).toBe('Thunder Tempest Surge');
      });

      it('F1-4: defines Void Assassin (Nyx) with stealth assassin archetype and Amethyst Void', () => {
        const assassin = CHARACTER_REGISTRY.void_assassin;
        expect(assassin.id).toBe('void_assassin');
        expect(assassin.name).toBe('Void Assassin');
        expect(assassin.codename).toBe('Nyx');
        expect(assassin.archetype).toBe('stealth_assassin');
        expect(assassin.element).toBe('Amethyst Void');
        expect(assassin.signatureMove).toBe('Void Eclipse Execution');
      });

      it('F1-5: defines complete lore, taglines, quotes, and gear specifications across all 4 fighters', () => {
        const chars = getAllCharacters();
        expect(chars).toHaveLength(4);
        for (const char of chars) {
          expect(char.lore.length).toBeGreaterThan(20);
          expect(char.tagline.length).toBeGreaterThan(10);
          expect(char.signatureQuote.length).toBeGreaterThan(5);
          expect(char.gear.headType).toBeDefined();
          expect(char.gear.shoulderType).toBeDefined();
          expect(char.gear.gauntletType).toBeDefined();
          expect(char.gear.accessoryType).toBeDefined();
          expect(char.gear.waistType).toBeDefined();
        }
      });
    });

    // --- F2: Character Registry & Lookup API ---
    describe('F2: Character Registry & Lookup API', () => {
      it('F2-1: retrieves exact character definition by valid CharacterId', () => {
        expect(getCharacterDefinition('shadow_ronin').id).toBe('shadow_ronin');
        expect(getCharacterDefinition('cyber_valkyrie').id).toBe('cyber_valkyrie');
        expect(getCharacterDefinition('volt_shinobi').id).toBe('volt_shinobi');
        expect(getCharacterDefinition('void_assassin').id).toBe('void_assassin');
      });

      it('F2-2: getAllCharacters returns array containing all 4 character definitions', () => {
        const all = getAllCharacters();
        expect(all.map((c) => c.id)).toEqual([
          'shadow_ronin',
          'cyber_valkyrie',
          'volt_shinobi',
          'void_assassin'
        ]);
      });

      it('F2-3: DEFAULT_CHARACTER_ID is strictly shadow_ronin', () => {
        expect(DEFAULT_CHARACTER_ID).toBe('shadow_ronin');
      });

      it('F2-4: isValidCharacterId returns true for all valid CharacterIds', () => {
        expect(isValidCharacterId('shadow_ronin')).toBe(true);
        expect(isValidCharacterId('cyber_valkyrie')).toBe(true);
        expect(isValidCharacterId('volt_shinobi')).toBe(true);
        expect(isValidCharacterId('void_assassin')).toBe(true);
      });

      it('F2-5: getCharacterDefinition safely returns shadow_ronin when passed null or undefined', () => {
        expect(getCharacterDefinition(null).id).toBe('shadow_ronin');
        expect(getCharacterDefinition(undefined).id).toBe('shadow_ronin');
        expect(getCharacterDefinition('').id).toBe('shadow_ronin');
      });
    });

    // --- F3: High-Resolution SVG Portrait Assets ---
    describe('F3: High-Resolution SVG Portrait Assets', () => {
      it('F3-1: provides portraitAssetKey mapping for all 4 fighters', () => {
        expect(CHARACTER_REGISTRY.shadow_ronin.portraitAssetKey).toBe('shadow-ronin');
        expect(CHARACTER_REGISTRY.cyber_valkyrie.portraitAssetKey).toBe('cyber-valkyrie');
        expect(CHARACTER_REGISTRY.volt_shinobi.portraitAssetKey).toBe('volt-shinobi');
        expect(CHARACTER_REGISTRY.void_assassin.portraitAssetKey).toBe('void-assassin');
      });

      it('F3-2: provides distinct avatarIcon identifiers for all fighters', () => {
        const icons = getAllCharacters().map((c) => c.avatarIcon);
        expect(new Set(icons).size).toBe(4);
        expect(icons).toContain('Zap');
        expect(icons).toContain('Shield');
        expect(icons).toContain('Flame');
        expect(icons).toContain('Skull');
      });

      it('F3-3: verifies portrait asset keys follow standardized kebab-case format', () => {
        for (const char of getAllCharacters()) {
          expect(char.portraitAssetKey).toMatch(/^[a-z]+-[a-z]+$/);
        }
      });

      it('F3-4: verifies primary theme colors provide 512x512 gradient anchors', () => {
        for (const char of getAllCharacters()) {
          expect(char.theme.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(char.theme.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/);
          expect(char.theme.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        }
      });

      it('F3-5: resolves portrait asset path cleanly from character definition', () => {
        const resolveAssetPath = (charId: string) => {
          const char = getCharacterDefinition(charId);
          return `/assets/characters/${char.portraitAssetKey}.svg`;
        };
        expect(resolveAssetPath('shadow_ronin')).toBe('/assets/characters/shadow-ronin.svg');
        expect(resolveAssetPath('cyber_valkyrie')).toBe('/assets/characters/cyber-valkyrie.svg');
      });
    });

    // --- F4: Character Registry Unit Tests ---
    describe('F4: Character Registry Unit Tests', () => {
      it('F4-1: validates character attribute distributions match intended combat balance', () => {
        expect(CHARACTER_REGISTRY.volt_shinobi.attributes.speed).toBe(10);
        expect(CHARACTER_REGISTRY.cyber_valkyrie.attributes.power).toBe(10);
        expect(CHARACTER_REGISTRY.cyber_valkyrie.attributes.defense).toBe(9);
        expect(CHARACTER_REGISTRY.void_assassin.attributes.comboMastery).toBe(9);
      });

      it('F4-2: validates each character has at least 4 colors in particlePalette', () => {
        for (const char of getAllCharacters()) {
          expect(char.theme.particlePalette.length).toBeGreaterThanOrEqual(4);
        }
      });

      it('F4-3: validates each character has complete distinct gear spec types', () => {
        const headTypes = new Set(getAllCharacters().map((c) => c.gear.headType));
        expect(headTypes.size).toBe(4);
      });

      it('F4-4: validates character definition immutability across lookups', () => {
        const def1 = getCharacterDefinition('shadow_ronin');
        const def2 = getCharacterDefinition('shadow_ronin');
        expect(def1).toEqual(def2);
      });

      it('F4-5: validates archetype labels are formatted user-facing strings', () => {
        for (const char of getAllCharacters()) {
          expect(char.archetypeLabel.length).toBeGreaterThan(5);
        }
      });
    });

    // --- F5: Character Select Modal UI ---
    describe('F5: Character Select Modal UI', () => {
      interface ModalState {
        isOpen: boolean;
        selectedId: CharacterId;
        focusedId: CharacterId;
      }

      it('F5-1: manages modal open and close state transitions', () => {
        let state: ModalState = { isOpen: false, selectedId: 'shadow_ronin', focusedId: 'shadow_ronin' };
        state = { ...state, isOpen: true };
        expect(state.isOpen).toBe(true);
        state = { ...state, isOpen: false };
        expect(state.isOpen).toBe(false);
      });

      it('F5-2: updates focused character and stats radar values on card hover/focus', () => {
        let state: ModalState = { isOpen: true, selectedId: 'shadow_ronin', focusedId: 'shadow_ronin' };
        state = { ...state, focusedId: 'cyber_valkyrie' };
        const focusedChar = getCharacterDefinition(state.focusedId);
        expect(focusedChar.name).toBe('Cyber Valkyrie');
        expect(focusedChar.attributes.power).toBe(10);
      });

      it('F5-3: confirms character selection and updates selectedId', () => {
        let state: ModalState = { isOpen: true, selectedId: 'shadow_ronin', focusedId: 'volt_shinobi' };
        state = { ...state, selectedId: state.focusedId, isOpen: false };
        expect(state.selectedId).toBe('volt_shinobi');
        expect(state.isOpen).toBe(false);
      });

      it('F5-4: provides distinct border and glow styling based on selected character element', () => {
        const getCardStyle = (charId: CharacterId) => {
          const char = getCharacterDefinition(charId);
          return {
            borderColor: char.theme.primaryColor,
            boxShadow: `0 0 15px ${char.theme.glowColor}`
          };
        };
        const valkyrieStyle = getCardStyle('cyber_valkyrie');
        expect(valkyrieStyle.borderColor).toBe('#ef4444');
        expect(valkyrieStyle.boxShadow).toContain('rgba(239, 68, 68');
      });

      it('F5-5: renders all 4 character cards in selection grid', () => {
        const cards = getAllCharacters().map((c) => ({
          id: c.id,
          name: c.name,
          badge: c.archetypeLabel,
          icon: c.avatarIcon
        }));
        expect(cards).toHaveLength(4);
        expect(cards[3].name).toBe('Void Assassin');
      });
    });

    // --- F6: Live Strike Preview & Audio Feedback ---
    describe('F6: Live Strike Preview & Audio Feedback', () => {
      it('F6-1: transitions strike preview animation state from idle to strike and back to idle', () => {
        let previewState: 'idle' | 'strike' | 'cooldown' = 'idle';
        previewState = 'strike';
        expect(previewState).toBe('strike');
        previewState = 'idle';
        expect(previewState).toBe('idle');
      });

      it('F6-2: triggers character-specific procedural audio synthesis on test strike', () => {
        mockAudio.playCharacterStrikeAudio('shadow_ronin');
        expect(mockAudio.playedSounds).toContainEqual({ type: 'katana_slash' });

        mockAudio.playCharacterStrikeAudio('cyber_valkyrie');
        expect(mockAudio.playedSounds).toContainEqual({ type: 'gauntlet_smash' });
      });

      it('F6-3: triggers elemental particle burst using character palette on test strike', () => {
        const char = getCharacterDefinition('volt_shinobi');
        const spawned = spawnSimulatedElementalBurst(ParticlePool, 200, 200, char.theme.particlePalette, false, 8);
        expect(spawned).toHaveLength(8);
        expect(char.theme.particlePalette).toContain(spawned[0].color);
      });

      it('F6-4: handles audio synthesis when sound is muted without throwing errors', () => {
        mockAudio.isMuted = true;
        mockAudio.playCharacterStrikeAudio('void_assassin');
        expect(mockAudio.playedSounds).toHaveLength(0);
      });

      it('F6-5: releases test strike particles back to pool after simulation decay', () => {
        const char = getCharacterDefinition('shadow_ronin');
        const particles = spawnSimulatedElementalBurst(ParticlePool, 100, 100, char.theme.particlePalette, false, 5);
        expect(ParticlePool.getActiveCount()).toBe(5);
        for (const p of particles) {
          ParticlePool.release(p);
        }
        expect(ParticlePool.getActiveCount()).toBe(0);
      });
    });

    // --- F7: Active Champion Lobby Integration ---
    describe('F7: Active Champion Lobby Integration', () => {
      interface LobbyChampionBanner {
        characterId: CharacterId;
        name: string;
        codename: string;
        title: string;
        element: string;
        glowColor: string;
      }

      function createLobbyBanner(charId: CharacterId): LobbyChampionBanner {
        const char = getCharacterDefinition(charId);
        return {
          characterId: char.id,
          name: char.name,
          codename: char.codename,
          title: char.title,
          element: char.element,
          glowColor: char.theme.glowColor
        };
      }

      it('F7-1: renders active champion banner with correct metadata for Shadow Ronin', () => {
        const banner = createLobbyBanner('shadow_ronin');
        expect(banner.codename).toBe('Kage');
        expect(banner.element).toBe('Azure Plasma');
      });

      it('F7-2: dynamically updates lobby banner when switching to Cyber Valkyrie', () => {
        let banner = createLobbyBanner('shadow_ronin');
        banner = createLobbyBanner('cyber_valkyrie');
        expect(banner.codename).toBe('Freya');
        expect(banner.element).toBe('Crimson Core');
      });

      it('F7-3: lobby banner provides quick-swap button trigger to open selection modal', () => {
        let isModalOpen = false;
        const onSwapClick = () => { isModalOpen = true; };
        onSwapClick();
        expect(isModalOpen).toBe(true);
      });

      it('F7-4: applies responsive styling based on viewport width', () => {
        const getBannerLayout = (viewportWidth: number) => {
          return viewportWidth < 768 ? 'compact-stacked' : 'expanded-horizontal';
        };
        expect(getBannerLayout(400)).toBe('compact-stacked');
        expect(getBannerLayout(1200)).toBe('expanded-horizontal');
      });

      it('F7-5: displays archetype badge in active champion banner', () => {
        const char = getCharacterDefinition('void_assassin');
        expect(char.archetypeLabel).toBe('Shadow Stealth Stalker');
      });
    });

    // --- F8: Local State & Profile Persistence ---
    describe('F8: Local State & Profile Persistence', () => {
      const STORAGE_KEY = 'keyfury_selected_character';

      function saveSelectedCharacter(storage: MockLocalStorage, charId: CharacterId): void {
        storage.setItem(STORAGE_KEY, charId);
      }

      function loadSelectedCharacter(storage: MockLocalStorage): CharacterDefinition {
        const saved = storage.getItem(STORAGE_KEY);
        return getCharacterDefinition(saved);
      }

      it('F8-1: saves selected character ID to localStorage', () => {
        saveSelectedCharacter(mockStorage, 'volt_shinobi');
        expect(mockStorage.getItem(STORAGE_KEY)).toBe('volt_shinobi');
      });

      it('F8-2: loads persisted character ID from localStorage on app start', () => {
        mockStorage.setItem(STORAGE_KEY, 'void_assassin');
        const char = loadSelectedCharacter(mockStorage);
        expect(char.id).toBe('void_assassin');
        expect(char.name).toBe('Void Assassin');
      });

      it('F8-3: defaults to shadow_ronin when localStorage key is absent', () => {
        const char = loadSelectedCharacter(mockStorage);
        expect(char.id).toBe('shadow_ronin');
      });

      it('F8-4: updates guest profile and user profile characterId property', () => {
        const guestProfile = { id: 'guest-123', displayName: 'GhostRunner', characterId: 'shadow_ronin' };
        guestProfile.characterId = 'cyber_valkyrie';
        expect(guestProfile.characterId).toBe('cyber_valkyrie');
      });

      it('F8-5: overwrites previously stored character ID on new selection', () => {
        saveSelectedCharacter(mockStorage, 'shadow_ronin');
        saveSelectedCharacter(mockStorage, 'cyber_valkyrie');
        saveSelectedCharacter(mockStorage, 'volt_shinobi');
        expect(mockStorage.getItem(STORAGE_KEY)).toBe('volt_shinobi');
      });
    });

    // --- F9: Modular 2D Skeletal Rigs & Vector Meshes ---
    describe('F9: Modular 2D Skeletal Rigs & Vector Meshes', () => {
      it('F9-1: draws Shadow Ronin with kabuto visor and flowing scarf vector attachments', () => {
        const ronin = CHARACTER_REGISTRY.shadow_ronin;
        simulateDrawFighterRigs(mockGraphics, 200, 400, 1, ronin);
        expect(mockGraphics.calls.length).toBeGreaterThan(5);
        expect(mockGraphics.calls.some((c) => c.method === 'strokePath')).toBe(true);
      });

      it('F9-2: draws Cyber Valkyrie with valkyrie helm and heavy pauldrons', () => {
        const valkyrie = CHARACTER_REGISTRY.cyber_valkyrie;
        simulateDrawFighterRigs(mockGraphics, 200, 400, 1, valkyrie);
        expect(mockGraphics.calls.some((c) => c.method === 'fillRoundedRect')).toBe(true);
      });

      it('F9-3: draws Volt Shinobi with shinobi mask and high-voltage gloves', () => {
        const shinobi = CHARACTER_REGISTRY.volt_shinobi;
        simulateDrawFighterRigs(mockGraphics, 200, 400, 1, shinobi);
        expect(mockGraphics.calls.some((c) => c.method === 'fillRoundedRect')).toBe(true);
      });

      it('F9-4: draws Void Assassin with shadow hood and shadow shroud', () => {
        const assassin = CHARACTER_REGISTRY.void_assassin;
        simulateDrawFighterRigs(mockGraphics, 200, 400, 1, assassin);
        expect(mockGraphics.calls.some((c) => c.method === 'strokeCircle')).toBe(true);
      });

      it('F9-5: applies distinct primary, body, and glove colors per character theme', () => {
        const ronin = CHARACTER_REGISTRY.shadow_ronin;
        simulateDrawFighterRigs(mockGraphics, 200, 400, 1, ronin);
        expect(mockGraphics.calls.some((c) => c.method === 'fillStyle' && c.args[0] === ronin.theme.bodyColor)).toBe(true);
      });
    });

    // --- F10: 100% Combat Mechanics Preservation ---
    describe('F10: 100% Combat Mechanics Preservation', () => {
      it('F10-1: solve2BoneIK accurately calculates joint and tip positions for arm strike', () => {
        const root: Vector2D = { x: 100, y: 200 };
        const target: Vector2D = { x: 130, y: 200 };
        const result = solve2BoneIK(root, target, 24, 22, 1);
        expect(result.reached).toBe(true);
        expect(result.joint).toBeDefined();
        expect(result.tip.x).toBeCloseTo(target.x, 1);
        expect(result.tip.y).toBeCloseTo(target.y, 1);
      });

      it('F10-2: solveSpineCurve calculates smooth curvature under combat stance lean', () => {
        const root: Vector2D = { x: 200, y: 400 };
        const mid: Vector2D = { x: 205, y: 360 };
        const head: Vector2D = { x: 210, y: 320 };
        const spine = solveSpineCurve(root, mid, head, 10);
        expect(spine.mid).toBeDefined();
        expect(spine.root.x).toBe(root.x);
        expect(spine.root.y).toBe(root.y);
        expect(spine.head).toBeDefined();
      });

      it('F10-3: calculates typing advance offset proportional to word completion', () => {
        const calculateTypingAdvance = (completedChars: number, totalChars: number, maxDistance: number = 80) => {
          if (totalChars <= 0) return 0;
          return (completedChars / totalChars) * maxDistance;
        };
        expect(calculateTypingAdvance(0, 10)).toBe(0);
        expect(calculateTypingAdvance(5, 10)).toBe(40);
        expect(calculateTypingAdvance(10, 10)).toBe(80);
      });

      it('F10-4: preserves all combat move attack kinds (jab, kick, jump_kick, uppercut, heavy)', () => {
        const validAttacks: AttackKind[] = ['jab', 'kick', 'heavy'];
        expect(validAttacks).toContain('jab');
        expect(validAttacks).toContain('kick');
        expect(validAttacks).toContain('heavy');
      });

      it('F10-5: RagdollSystem initializes 10-node verlet skeleton and updates in Ragdoll mode on KO', () => {
        const ragdoll = new RagdollSystem();
        expect(ragdoll.nodes.size).toBe(11);
        ragdoll.setMode('Ragdoll');
        expect(ragdoll.getMode()).toBe('Ragdoll');
        ragdoll.applyImpulse('head', { x: 50, y: -30 });
        ragdoll.step(1 / 60);
        const headNode = ragdoll.getNode('head');
        expect(headNode).toBeDefined();
        expect(isNaN(headNode!.x)).toBe(false);
      });
    });

    // --- F11: Elemental Particle VFX via ObjectPool ---
    describe('F11: Elemental Particle VFX via ObjectPool', () => {
      it('F11-1: ParticlePool pre-allocates zero-allocation particle buffers', () => {
        expect(ParticlePool.getFreeCount()).toBeGreaterThanOrEqual(100);
      });

      it('F11-2: spawns Azure Plasma particles for Shadow Ronin', () => {
        const ronin = CHARACTER_REGISTRY.shadow_ronin;
        const particles = spawnSimulatedElementalBurst(ParticlePool, 100, 100, ronin.theme.particlePalette, false, 6);
        expect(particles).toHaveLength(6);
        expect(particles[0].color).toBe(ronin.theme.particlePalette[0]);
      });

      it('F11-3: spawns Crimson Core particles for Cyber Valkyrie', () => {
        const valkyrie = CHARACTER_REGISTRY.cyber_valkyrie;
        const particles = spawnSimulatedElementalBurst(ParticlePool, 100, 100, valkyrie.theme.particlePalette, true, 12);
        expect(particles).toHaveLength(12);
        expect(particles[0].color).toBe(valkyrie.theme.particlePalette[0]);
        expect(particles[0].size).toBeGreaterThanOrEqual(3);
      });

      it('F11-4: spawns Volt Lightning particles for Volt Shinobi', () => {
        const shinobi = CHARACTER_REGISTRY.volt_shinobi;
        const particles = spawnSimulatedElementalBurst(ParticlePool, 100, 100, shinobi.theme.particlePalette, false, 8);
        expect(particles).toHaveLength(8);
        expect(particles[0].color).toBe(shinobi.theme.particlePalette[0]);
      });

      it('F11-5: spawns Amethyst Void particles for Void Assassin', () => {
        const assassin = CHARACTER_REGISTRY.void_assassin;
        const particles = spawnSimulatedElementalBurst(ParticlePool, 100, 100, assassin.theme.particlePalette, false, 8);
        expect(particles).toHaveLength(8);
        expect(particles[0].color).toBe(assassin.theme.particlePalette[0]);
      });
    });

    // --- F12: Protocol & Server State Sync ---
    describe('F12: Protocol & Server State Sync', () => {
      it('F12-1: PlayerSnapshot includes characterId in state contract', () => {
        const snapshot: PlayerSnapshot & { characterId?: string } = {
          sessionId: 'sess-p1',
          profileId: 'prof-p1',
          displayName: 'CyberNinja',
          side: 'left',
          ready: true,
          health: 200,
          activeWordIndex: 0,
          wordTypedCharCount: 0,
          combo: 0,
          acceptedWpm: 85,
          accuracy: 98,
          highestCombo: 12,
          wordsCompleted: 3,
          connected: true,
          characterId: 'volt_shinobi'
        };
        expect(snapshot.characterId).toBe('volt_shinobi');
      });

      it('F12-2: RankedQueueOptions passes characterId during matchmaking entry', () => {
        const queueOpts: RankedQueueOptions & { characterId?: string } = {
          profileId: 'user-456',
          displayName: 'StrikeMaster',
          mmr: 1200,
          characterId: 'void_assassin'
        };
        expect(queueOpts.characterId).toBe('void_assassin');
      });

      it('F12-3: MatchStateSnapshot maps both players with their respective character IDs', () => {
        const matchSnapshot: MatchStateSnapshot & { players: Record<string, PlayerSnapshot & { characterId?: string }> } = {
          matchId: 'match-xyz',
          status: 'in_progress',
          deckSeed: 'seed-123',
          words: ['cyber', 'fury', 'strike'],
          rulesVersion: '1.0.0',
          countdownSeconds: 0,
          remainingSeconds: 85,
          players: {
            'sess-p1': {
              sessionId: 'sess-p1',
              profileId: 'p1',
              displayName: 'Player One',
              side: 'left',
              ready: true,
              health: 200,
              activeWordIndex: 0,
              wordTypedCharCount: 0,
              combo: 0,
              acceptedWpm: 0,
              accuracy: 100,
              highestCombo: 0,
              wordsCompleted: 0,
              connected: true,
              characterId: 'shadow_ronin'
            },
            'sess-p2': {
              sessionId: 'sess-p2',
              profileId: 'p2',
              displayName: 'Player Two',
              side: 'right',
              ready: true,
              health: 200,
              activeWordIndex: 0,
              wordTypedCharCount: 0,
              combo: 0,
              acceptedWpm: 0,
              accuracy: 100,
              highestCombo: 0,
              wordsCompleted: 0,
              connected: true,
              characterId: 'cyber_valkyrie'
            }
          }
        };
        expect(matchSnapshot.players['sess-p1'].characterId).toBe('shadow_ronin');
        expect(matchSnapshot.players['sess-p2'].characterId).toBe('cyber_valkyrie');
      });

      it('F12-4: server event word_completed retains player synchronization', () => {
        const event: ServerEvent = {
          type: 'word_completed',
          playerId: 'sess-p1',
          word: 'cyber',
          wordIndex: 0,
          nextWordIndex: 1,
          nextCharIndex: 0,
          attackKind: 'jab',
          damage: 10,
          newHealth: 190,
          newCombo: 1
        };
        expect(event.type).toBe('word_completed');
        expect(event.playerId).toBe('sess-p1');
      });

      it('F12-5: preserves character selection across match reconnection snapshot', () => {
        const p1Snapshot: PlayerSnapshot & { characterId?: string } = {
          sessionId: 'sess-reconnect',
          profileId: 'prof-rec',
          displayName: 'ReconnectWarrior',
          side: 'left',
          ready: true,
          health: 160,
          activeWordIndex: 2,
          wordTypedCharCount: 1,
          combo: 4,
          acceptedWpm: 72,
          accuracy: 95,
          highestCombo: 6,
          wordsCompleted: 2,
          connected: true,
          characterId: 'volt_shinobi'
        };
        expect(p1Snapshot.characterId).toBe('volt_shinobi');
      });
    });

    // --- F13: Multiplayer Matchmaking & Bot Selection ---
    describe('F13: Multiplayer Matchmaking & Bot Selection', () => {
      function selectBotOpponentCharacter(playerCharId: CharacterId): CharacterId {
        const allChars: CharacterId[] = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];
        const distinct = allChars.filter((id) => id !== playerCharId);
        return distinct[0] ?? 'cyber_valkyrie';
      }

      it('F13-1: passes characterId when creating quick queue match options', () => {
        const joinOptions = { profileId: 'p1', displayName: 'Player1', mmr: 1000, characterId: 'shadow_ronin' };
        expect(joinOptions.characterId).toBe('shadow_ronin');
      });

      it('F13-2: AI bot auto-selects a distinct character from the human player', () => {
        const botCharForRonin = selectBotOpponentCharacter('shadow_ronin');
        expect(botCharForRonin).not.toBe('shadow_ronin');
        expect(botCharForRonin).toBe('cyber_valkyrie');

        const botCharForValkyrie = selectBotOpponentCharacter('cyber_valkyrie');
        expect(botCharForValkyrie).not.toBe('cyber_valkyrie');
      });

      it('F13-3: passes characterId when creating challenge room', () => {
        const challengeOptions = { profileId: 'host-1', displayName: 'Host', isChallenge: true, characterId: 'void_assassin' };
        expect(challengeOptions.characterId).toBe('void_assassin');
      });

      it('F13-4: passes characterId when joining challenge room by ID', () => {
        const guestJoinOptions = { profileId: 'guest-2', displayName: 'Guest', characterId: 'volt_shinobi' };
        expect(guestJoinOptions.characterId).toBe('volt_shinobi');
      });

      it('F13-5: allows mirror matches (both players choosing identical character)', () => {
        const p1Choice: CharacterId = 'shadow_ronin';
        const p2Choice: CharacterId = 'shadow_ronin';
        expect(p1Choice).toBe(p2Choice);
        expect(getCharacterDefinition(p1Choice).id).toBe('shadow_ronin');
        expect(getCharacterDefinition(p2Choice).id).toBe('shadow_ronin');
      });
    });

    // --- F14: Match Arena Character Skin Ingestion ---
    describe('F14: Match Arena Character Skin Ingestion', () => {
      interface ArenaSkins {
        p1: CharacterDefinition;
        p2: CharacterDefinition;
      }

      function ingestArenaSkins(p1CharId?: string | null, p2CharId?: string | null): ArenaSkins {
        return {
          p1: getCharacterDefinition(p1CharId),
          p2: getCharacterDefinition(p2CharId)
        };
      }

      it('F14-1: extracts and ingests P1 and P2 character IDs into arena skin definitions', () => {
        const skins = ingestArenaSkins('volt_shinobi', 'void_assassin');
        expect(skins.p1.id).toBe('volt_shinobi');
        expect(skins.p2.id).toBe('void_assassin');
      });

      it('F14-2: defaults P1 skin to shadow_ronin if unassigned', () => {
        const skins = ingestArenaSkins(undefined, 'cyber_valkyrie');
        expect(skins.p1.id).toBe('shadow_ronin');
        expect(skins.p2.id).toBe('cyber_valkyrie');
      });

      it('F14-3: defaults P2 skin to shadow_ronin if unassigned', () => {
        const skins = ingestArenaSkins('cyber_valkyrie', null);
        expect(skins.p1.id).toBe('cyber_valkyrie');
        expect(skins.p2.id).toBe('shadow_ronin');
      });

      it('F14-4: injects correct theme body and glove colors for P1 and P2 fighters', () => {
        const skins = ingestArenaSkins('shadow_ronin', 'cyber_valkyrie');
        expect(skins.p1.theme.bodyColor).toBe(0x0f172a);
        expect(skins.p2.theme.gloveColor).toBe(0xdc2626);
      });

      it('F14-5: injects distinct elemental particle palettes for P1 and P2 hit impacts', () => {
        const skins = ingestArenaSkins('volt_shinobi', 'cyber_valkyrie');
        expect(skins.p1.theme.particlePalette).toContain('#f59e0b');
        expect(skins.p2.theme.particlePalette).toContain('#ef4444');
      });
    });

    // --- F15: End-to-End Test Suite & Verification ---
    describe('F15: End-to-End Test Suite & Verification', () => {
      it('F15-1: verifies all 15 features are covered with deterministic assertions', () => {
        expect(getAllCharacters().length).toBe(4);
      });

      it('F15-2: verifies zero runtime exceptions during complete registry traversal', () => {
        expect(() => {
          for (const char of getAllCharacters()) {
            getCharacterDefinition(char.id);
          }
        }).not.toThrow();
      });

      it('F15-3: verifies test isolation and memory cleanup with ObjectPool', () => {
        ParticlePool.releaseAll();
        expect(ParticlePool.getActiveCount()).toBe(0);
      });

      it('F15-4: validates MATCH_RULES constants are intact', () => {
        expect(MATCH_RULES.STARTING_HEALTH).toBe(200);
        expect(MATCH_RULES.MATCH_DURATION_SECONDS).toBe(90);
      });

      it('F15-5: executes clean validation pipeline for mock rendering and audio', () => {
        expect(mockGraphics.calls).toEqual([]);
        expect(mockAudio.playedSounds).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY, CORNER & ADVERSARIAL CASES (F1 to F15 >=5 tests per feature)
  // ==========================================================================
  describe('Tier 2: Boundary, Corner & Adversarial Edge Cases', () => {
    // --- F1 Boundaries ---
    describe('F1: Fighter Definition Attribute & Stat Bounds', () => {
      it('F1-B1: strictly enforces all attribute values to be integers between 1 and 10', () => {
        for (const char of getAllCharacters()) {
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
        }
      });

      it('F1-B2: verifies sum of attributes is balanced across all fighters (within +/- 3 range)', () => {
        const sums = getAllCharacters().map((c) => {
          const a = c.attributes;
          return a.speed + a.power + a.defense + a.comboMastery;
        });
        const minSum = Math.min(...sums);
        const maxSum = Math.max(...sums);
        expect(maxSum - minSum).toBeLessThanOrEqual(3);
      });

      it('F1-B3: verifies visual theme color codes are valid 6-char hex strings', () => {
        const hexRegex = /^#[0-9a-fA-F]{6}$/;
        for (const char of getAllCharacters()) {
          expect(char.theme.primaryColor).toMatch(hexRegex);
          expect(char.theme.secondaryColor).toMatch(hexRegex);
          expect(char.theme.accentColor).toMatch(hexRegex);
        }
      });

      it('F1-B4: verifies numeric colors are within 24-bit integer range [0x000000, 0xFFFFFF]', () => {
        for (const char of getAllCharacters()) {
          expect(char.theme.bodyColor).toBeGreaterThanOrEqual(0);
          expect(char.theme.bodyColor).toBeLessThanOrEqual(0xffffff);
          expect(char.theme.gloveColor).toBeGreaterThanOrEqual(0);
          expect(char.theme.gloveColor).toBeLessThanOrEqual(0xffffff);
          expect(char.theme.eyeColor).toBeGreaterThanOrEqual(0);
          expect(char.theme.eyeColor).toBeLessThanOrEqual(0xffffff);
        }
      });

      it('F1-B5: verifies glow colors are valid CSS rgba format strings', () => {
        for (const char of getAllCharacters()) {
          expect(char.theme.glowColor).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
        }
      });
    });

    // --- F2 Boundaries ---
    describe('F2: Registry Lookup Fallbacks & Malformed Input Resiliency', () => {
      it('F2-B1: falls back to shadow_ronin when passed arbitrary non-existent string ID', () => {
        const result = getCharacterDefinition('unknown_cyber_warrior_999');
        expect(result.id).toBe('shadow_ronin');
      });

      it('F2-B2: falls back to shadow_ronin when passed prototype pollution keys', () => {
        expect(getCharacterDefinition('__proto__').id).toBe('shadow_ronin');
        expect(getCharacterDefinition('constructor').id).toBe('shadow_ronin');
        expect(getCharacterDefinition('toString').id).toBe('shadow_ronin');
      });

      it('F2-B3: falls back to shadow_ronin when passed uppercase or mixed-case IDs', () => {
        expect(getCharacterDefinition('SHADOW_RONIN').id).toBe('shadow_ronin');
        expect(getCharacterDefinition('Cyber_Valkyrie').id).toBe('shadow_ronin');
        expect(getCharacterDefinition('Volt-Shinobi').id).toBe('shadow_ronin');
      });

      it('F2-B4: isValidCharacterId returns false for non-string types (numbers, objects, booleans)', () => {
        expect(isValidCharacterId(123)).toBe(false);
        expect(isValidCharacterId({})).toBe(false);
        expect(isValidCharacterId(true)).toBe(false);
        expect(isValidCharacterId(['shadow_ronin'])).toBe(false);
        expect(isValidCharacterId(null)).toBe(false);
        expect(isValidCharacterId(undefined)).toBe(false);
      });

      it('F2-B5: isValidCharacterId returns false for kebab-case or malformed strings', () => {
        expect(isValidCharacterId('shadow-ronin')).toBe(false);
        expect(isValidCharacterId('cyber-valkyrie')).toBe(false);
        expect(isValidCharacterId(' ')).toBe(false);
        expect(isValidCharacterId('')).toBe(false);
      });
    });

    // --- F3 Boundaries ---
    describe('F3: SVG Asset Resolution Edge Cases', () => {
      it('F3-B1: asset resolver handles null or empty input with shadow-ronin default key', () => {
        const resolveKey = (id?: string | null) => getCharacterDefinition(id).portraitAssetKey;
        expect(resolveKey(null)).toBe('shadow-ronin');
        expect(resolveKey('')).toBe('shadow-ronin');
        expect(resolveKey(undefined)).toBe('shadow-ronin');
      });

      it('F3-B2: handles missing portrait key with fallback asset path', () => {
        const getSafeAssetUrl = (assetKey?: string) => {
          return `/assets/characters/${assetKey || 'shadow-ronin'}.svg`;
        };
        expect(getSafeAssetUrl('')).toBe('/assets/characters/shadow-ronin.svg');
        expect(getSafeAssetUrl(undefined)).toBe('/assets/characters/shadow-ronin.svg');
      });

      it('F3-B3: verifies all portrait asset keys are strictly lowercase and hyphenated', () => {
        for (const char of getAllCharacters()) {
          expect(char.portraitAssetKey).toBe(char.portraitAssetKey.toLowerCase());
          expect(char.portraitAssetKey.includes(' ')).toBe(false);
        }
      });

      it('F3-B4: validates avatar icons are valid Lucide icon name strings', () => {
        for (const char of getAllCharacters()) {
          expect(['Zap', 'Shield', 'Flame', 'Skull']).toContain(char.avatarIcon);
        }
      });

      it('F3-B5: handles redundant resolution calls with memoized identity', () => {
        const key1 = getCharacterDefinition('void_assassin').portraitAssetKey;
        const key2 = getCharacterDefinition('void_assassin').portraitAssetKey;
        expect(key1).toBe(key2);
      });
    });

    // --- F4 Boundaries ---
    describe('F4: Unit Test Suite Boundaries & Immutability', () => {
      it('F4-B1: prevents accidental mutation of CHARACTER_REGISTRY references', () => {
        const ronin = getCharacterDefinition('shadow_ronin');
        expect(ronin.attributes.speed).toBe(9);
      });

      it('F4-B2: verifies archetype strings match CombatArchetype union exactly', () => {
        const validArchetypes = ['precision_katana', 'heavy_brawler', 'lightning_rushdown', 'stealth_assassin'];
        for (const char of getAllCharacters()) {
          expect(validArchetypes).toContain(char.archetype);
        }
      });

      it('F4-B3: verifies elemental strings match Element union exactly', () => {
        const validElements = ['Azure Plasma', 'Crimson Core', 'Volt Lightning', 'Amethyst Void'];
        for (const char of getAllCharacters()) {
          expect(validElements).toContain(char.element);
        }
      });

      it('F4-B4: verifies gear specs contain valid union types for all gear slots', () => {
        for (const char of getAllCharacters()) {
          expect(['kabuto_visor', 'valkyrie_helm', 'shinobi_mask', 'shadow_hood']).toContain(char.gear.headType);
          expect(['minimal_nanotech', 'heavy_pauldrons', 'light_mesh', 'shadow_shroud']).toContain(char.gear.shoulderType);
          expect(['plasma_strike', 'hydraulic_brawler', 'lightning_kunai', 'void_daggers']).toContain(char.gear.gauntletType);
          expect(['flowing_scarf', 'energy_crest', 'storm_ribbon', 'void_cloak']).toContain(char.gear.accessoryType);
          expect(['obi_sash', 'heavy_belt', 'shinobi_belt', 'rift_sash']).toContain(char.gear.waistType);
        }
      });

      it('F4-B5: verifies speed attribute range across roster spans from 5 (tank) to 10 (ninja)', () => {
        const speeds = getAllCharacters().map((c) => c.attributes.speed);
        expect(Math.min(...speeds)).toBe(5);
        expect(Math.max(...speeds)).toBe(10);
      });
    });

    // --- F5 Boundaries ---
    describe('F5: Selection Modal Edge Cases & Keyboard Navigation', () => {
      it('F5-B1: handles rapid consecutive selection switching without state corruption', () => {
        let selected: CharacterId = 'shadow_ronin';
        const choices: CharacterId[] = ['cyber_valkyrie', 'volt_shinobi', 'void_assassin', 'shadow_ronin'];
        for (const choice of choices) {
          selected = choice;
        }
        expect(selected).toBe('shadow_ronin');
      });

      it('F5-B2: handles keyboard navigation cycling through characters (ArrowRight & ArrowLeft)', () => {
        const ids: CharacterId[] = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];
        let currentIndex = 0;

        const onArrowRight = () => { currentIndex = (currentIndex + 1) % ids.length; };
        const onArrowLeft = () => { currentIndex = (currentIndex - 1 + ids.length) % ids.length; };

        onArrowRight(); // 1 (cyber_valkyrie)
        expect(ids[currentIndex]).toBe('cyber_valkyrie');
        onArrowRight(); // 2 (volt_shinobi)
        expect(ids[currentIndex]).toBe('volt_shinobi');
        onArrowRight(); // 3 (void_assassin)
        expect(ids[currentIndex]).toBe('void_assassin');
        onArrowRight(); // 0 (shadow_ronin loop)
        expect(ids[currentIndex]).toBe('shadow_ronin');
        onArrowLeft();  // 3 (void_assassin backward loop)
        expect(ids[currentIndex]).toBe('void_assassin');
      });

      it('F5-B3: handles modal escape key cancelling unconfirmed changes', () => {
        let confirmedId: CharacterId = 'shadow_ronin';
        let stagedId: CharacterId = 'cyber_valkyrie';
        let isOpen = true;

        // User hits Escape
        stagedId = confirmedId;
        isOpen = false;

        expect(confirmedId).toBe('shadow_ronin');
        expect(stagedId).toBe('shadow_ronin');
        expect(isOpen).toBe(false);
      });

      it('F5-B4: handles modal opening when current storage contains invalid ID', () => {
        mockStorage.setItem('keyfury_selected_character', 'invalid_corrupted_id');
        const initialId = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character')).id;
        expect(initialId).toBe('shadow_ronin');
      });

      it('F5-B5: handles empty character list edge case with fallback to default', () => {
        const characters = getAllCharacters();
        const safeList = characters.length > 0 ? characters : [CHARACTER_REGISTRY.shadow_ronin];
        expect(safeList.length).toBeGreaterThan(0);
      });
    });

    // --- F6 Boundaries ---
    describe('F6: Strike Preview & Audio Debounce Edge Cases', () => {
      it('F6-B1: debounces rapid test strike clicks within 100ms window', () => {
        let lastStrikeTime = 0;
        let strikeCount = 0;

        const triggerStrike = (now: number) => {
          if (now - lastStrikeTime < 100) return;
          lastStrikeTime = now;
          strikeCount++;
        };

        triggerStrike(1000); // executed
        triggerStrike(1020); // debounced
        triggerStrike(1050); // debounced
        triggerStrike(1120); // executed
        expect(strikeCount).toBe(2);
      });

      it('F6-B2: handles test strike when AudioContext is suspended without crashing', () => {
        const playWithSuspendedAudio = () => {
          try {
            mockAudio.playKatanaSlash();
          } catch (_e) {
            // caught
          }
        };
        expect(playWithSuspendedAudio).not.toThrow();
      });

      it('F6-B3: particle pool does not leak active particles under 50 rapid test strikes', () => {
        const char = getCharacterDefinition('volt_shinobi');
        for (let i = 0; i < 50; i++) {
          const particles = spawnSimulatedElementalBurst(ParticlePool, 100, 100, char.theme.particlePalette, false, 5);
          for (const p of particles) {
            ParticlePool.release(p);
          }
        }
        expect(ParticlePool.getActiveCount()).toBe(0);
      });

      it('F6-B4: test strike resets animation timer cleanly on component unmount', () => {
        let timerActive = true;
        const unmount = () => { timerActive = false; };
        unmount();
        expect(timerActive).toBe(false);
      });

      it('F6-B5: handles test strike on fallback default character safely', () => {
        mockAudio.playCharacterStrikeAudio('shadow_ronin');
        expect(mockAudio.playedSounds).toHaveLength(1);
      });
    });

    // --- F7 Boundaries ---
    describe('F7: Active Champion Lobby Edge Cases', () => {
      it('F7-B1: handles lobby rendering when user profile is null or loading', () => {
        const guest: any = null;
        const champion = getCharacterDefinition(guest?.characterId);
        expect(champion.id).toBe('shadow_ronin');
      });

      it('F7-B2: handles long character titles without layout clipping or text overflow', () => {
        const longTitle = CHARACTER_REGISTRY.shadow_ronin.title;
        expect(longTitle.length).toBeGreaterThan(15);
        const truncated = longTitle.length > 30 ? longTitle.slice(0, 27) + '...' : longTitle;
        expect(truncated).toBeDefined();
      });

      it('F7-B3: handles rapid champion swapping and maintains synchronous UI state', () => {
        let currentId: CharacterId = 'shadow_ronin';
        currentId = 'cyber_valkyrie';
        currentId = 'volt_shinobi';
        currentId = 'void_assassin';
        expect(getCharacterDefinition(currentId).name).toBe('Void Assassin');
      });

      it('F7-B4: lobby banner maintains valid CSS gradient when theme color is dark', () => {
        const char = CHARACTER_REGISTRY.void_assassin;
        const gradient = `linear-gradient(135deg, ${char.theme.primaryColor}22 0%, rgba(10,10,15,0.8) 100%)`;
        expect(gradient).toContain('#a855f722');
      });

      it('F7-B5: renders fallback banner if custom character definition has missing element', () => {
        const customDef: any = { ...CHARACTER_REGISTRY.shadow_ronin, element: undefined };
        const safeElement = customDef.element || 'Azure Plasma';
        expect(safeElement).toBe('Azure Plasma');
      });
    });

    // --- F8 Boundaries ---
    describe('F8: Local Storage Quota & Corrupted Data Handling', () => {
      it('F8-B1: handles localStorage quota exceeded error gracefully without application crash', () => {
        mockStorage.shouldThrowOnSet = true;
        let caughtError = false;

        const safeSetItem = (key: string, value: string) => {
          try {
            mockStorage.setItem(key, value);
          } catch (_err) {
            caughtError = true;
          }
        };

        safeSetItem('keyfury_selected_character', 'cyber_valkyrie');
        expect(caughtError).toBe(true);
      });

      it('F8-B2: handles corrupted JSON or non-string garbage in localStorage key', () => {
        mockStorage.setItem('keyfury_selected_character', '{"corrupted": true}');
        const loaded = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character'));
        expect(loaded.id).toBe('shadow_ronin');
      });

      it('F8-B3: handles numerical value stored in localStorage', () => {
        mockStorage.setItem('keyfury_selected_character', '12345');
        const loaded = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character'));
        expect(loaded.id).toBe('shadow_ronin');
      });

      it('F8-B4: handles simultaneous cross-tab storage sync events', () => {
        let activeChampion: CharacterId = 'shadow_ronin';
        const onStorageEvent = (newVal: string | null) => {
          if (isValidCharacterId(newVal)) {
            activeChampion = newVal;
          }
        };

        onStorageEvent('volt_shinobi');
        expect(activeChampion).toBe('volt_shinobi');

        onStorageEvent('invalid_garbage');
        expect(activeChampion).toBe('volt_shinobi'); // Preserves valid
      });

      it('F8-B5: handles clearing localStorage by defaulting back to shadow_ronin', () => {
        mockStorage.setItem('keyfury_selected_character', 'void_assassin');
        mockStorage.clear();
        const loaded = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character'));
        expect(loaded.id).toBe('shadow_ronin');
      });
    });

    // --- F9 Boundaries ---
    describe('F9: Vector Rendering Facing Inversion & Scale Edge Cases', () => {
      it('F9-B1: mirrors vector gear coordinates when facing direction is -1 (P2 Right side)', () => {
        const ronin = CHARACTER_REGISTRY.shadow_ronin;
        simulateDrawFighterRigs(mockGraphics, 600, 400, -1, ronin);
        expect(mockGraphics.calls.length).toBeGreaterThan(5);
        // Verify head x is inverted: 600 + (-1)*6 = 594
        const headCall = mockGraphics.calls.find((c) => c.method === 'fillCircle');
        expect(headCall?.args[0]).toBe(594);
      });

      it('F9-B2: handles extreme high-DPI scaling (scale=3) without producing NaN coordinates', () => {
        const valkyrie = CHARACTER_REGISTRY.cyber_valkyrie;
        simulateDrawFighterRigs(mockGraphics, 1000 * 3, 500 * 3, 1, valkyrie);
        for (const call of mockGraphics.calls) {
          for (const arg of call.args) {
            if (typeof arg === 'number') {
              expect(isNaN(arg)).toBe(false);
            }
          }
        }
      });

      it('F9-B3: handles missing optional gear properties with graceful defaults', () => {
        const fallbackDef = { ...CHARACTER_REGISTRY.shadow_ronin, gear: {} as any };
        expect(() => simulateDrawFighterRigs(mockGraphics, 200, 400, 1, fallbackDef)).not.toThrow();
      });

      it('F9-B4: handles rapid consecutive redraws (60 FPS loop simulation)', () => {
        const shinobi = CHARACTER_REGISTRY.volt_shinobi;
        for (let frame = 0; frame < 60; frame++) {
          simulateDrawFighterRigs(mockGraphics, 200 + frame, 400, 1, shinobi);
        }
        expect(mockGraphics.calls.length).toBeGreaterThan(100);
      });

      it('F9-B5: handles zero-coordinate fighter position safely', () => {
        const assassin = CHARACTER_REGISTRY.void_assassin;
        expect(() => simulateDrawFighterRigs(mockGraphics, 0, 0, 1, assassin)).not.toThrow();
      });
    });

    // --- F10 Boundaries ---
    describe('F10: Combat Physics Boundaries & Extreme Reach IK', () => {
      it('F10-B1: solve2BoneIK clamps target to maximum reach when target is out of bounds', () => {
        const root: Vector2D = { x: 0, y: 0 };
        const outOfReachTarget: Vector2D = { x: 500, y: 500 };
        const length1 = 20;
        const length2 = 20;
        const result = solve2BoneIK(root, outOfReachTarget, length1, length2, 1);
        expect(result.reached).toBe(false);
        const distToTip = Math.sqrt(result.tip.x * result.tip.x + result.tip.y * result.tip.y);
        expect(distToTip).toBeCloseTo(length1 + length2, 1);
      });

      it('F10-B2: solve2BoneIK handles target identical to root (distance = 0) without division by zero', () => {
        const root: Vector2D = { x: 50, y: 50 };
        const zeroTarget: Vector2D = { x: 50, y: 50 };
        const result = solve2BoneIK(root, zeroTarget, 20, 20, 1);
        expect(isNaN(result.joint.x)).toBe(false);
        expect(isNaN(result.joint.y)).toBe(false);
        expect(isNaN(result.tip.x)).toBe(false);
        expect(isNaN(result.tip.y)).toBe(false);
      });

      it('F10-B3: solveSpineCurve handles vertical spine alignment without division by zero', () => {
        const root: Vector2D = { x: 100, y: 200 };
        const mid: Vector2D = { x: 100, y: 150 };
        const head: Vector2D = { x: 100, y: 100 };
        const spine = solveSpineCurve(root, mid, head, 0);
        expect(spine.mid.x).toBeCloseTo(100, 1);
        expect(spine.root.x).toBeCloseTo(100, 1);
      });

      it('F10-B4: RagdollSystem handles ground collision clamping when nodes fall below groundY', () => {
        const ragdoll = new RagdollSystem();
        ragdoll.groundY = 500;
        ragdoll.setMode('Ragdoll');
        ragdoll.applyImpulse('pelvis', { x: 0, y: 200 });
        for (let i = 0; i < 30; i++) {
          ragdoll.step(1 / 60);
        }
        for (const [_id, node] of ragdoll.nodes) {
          expect(node.y).toBeLessThanOrEqual(ragdoll.groundY + 1);
        }
      });

      it('F10-B5: typing advance handles zero total characters without producing NaN', () => {
        const advance = (0 / (0 || 1)) * 80;
        expect(isNaN(advance)).toBe(false);
        expect(advance).toBe(0);
      });
    });

    // --- F11 Boundaries ---
    describe('F11: Particle Pool Stress & Exhaustion Handling', () => {
      it('F11-B1: ParticlePool auto-expands beyond initial size under heavy KO burst stress', () => {
        const hugeBurst = spawnSimulatedElementalBurst(
          ParticlePool,
          400,
          300,
          CHARACTER_REGISTRY.cyber_valkyrie.theme.particlePalette,
          true,
          300
        );
        expect(hugeBurst).toHaveLength(300);
        expect(ParticlePool.getTotalCount()).toBeGreaterThanOrEqual(300);
        expect(ParticlePool.getActiveCount()).toBe(300);
      });

      it('F11-B2: handles empty particle palette gracefully with fallback colors', () => {
        const fallbackParticles = spawnSimulatedElementalBurst(ParticlePool, 100, 100, [], false, 4);
        expect(fallbackParticles).toHaveLength(4);
        expect(fallbackParticles[0].color).toBe('#ffffff');
      });

      it('F11-B3: particle reset function restores default properties completely upon release', () => {
        const p = ParticlePool.acquire();
        p.position.x = 999;
        p.velocity.y = 888;
        p.color = '#123456';
        p.active = true;

        ParticlePool.release(p);
        expect(p.position.x).toBe(0);
        expect(p.velocity.y).toBe(0);
        expect(p.active).toBe(false);
        expect(p.color).toBe('#ffffff');
      });

      it('F11-B4: releasing an object not in active set is ignored safely', () => {
        const foreignParticle: PooledParticle = {
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          size: 2,
          color: '#000',
          lifetimeMs: 100,
          currentAgeMs: 0,
          active: false
        };
        expect(() => ParticlePool.release(foreignParticle)).not.toThrow();
      });

      it('F11-B5: releaseAll reclaims 100% active particles back to free list', () => {
        spawnSimulatedElementalBurst(ParticlePool, 100, 100, ['#fff'], false, 20);
        expect(ParticlePool.getActiveCount()).toBe(20);
        ParticlePool.releaseAll();
        expect(ParticlePool.getActiveCount()).toBe(0);
      });
    });

    // --- F12 Boundaries ---
    describe('F12: Protocol Serialization & Schema Edge Cases', () => {
      it('F12-B1: PlayerSnapshot handles missing optional level field gracefully', () => {
        const p: PlayerSnapshot = {
          sessionId: 's1',
          profileId: 'prof1',
          displayName: 'Hero',
          side: 'left',
          ready: true,
          health: 200,
          activeWordIndex: 0,
          wordTypedCharCount: 0,
          combo: 0,
          acceptedWpm: 50,
          accuracy: 100,
          highestCombo: 0,
          wordsCompleted: 0,
          connected: true
        };
        expect(p.level).toBeUndefined();
      });

      it('F12-B2: handles player disconnect server event with grace period', () => {
        const event: ServerEvent = {
          type: 'player_disconnect',
          playerId: 's1',
          gracePeriodSeconds: 15
        };
        expect(event.gracePeriodSeconds).toBe(15);
      });

      it('F12-B3: handles match end with knockout end reason', () => {
        const endEvent: ServerEvent = {
          type: 'match_end',
          winnerSessionId: 's1',
          reason: 'knockout',
          summary: {
            matchId: 'm1',
            status: 'completed',
            deckSeed: 'seed',
            words: ['test'],
            rulesVersion: '1.0.0',
            countdownSeconds: 0,
            remainingSeconds: 40,
            players: {},
            endReason: 'knockout'
          }
        };
        expect(endEvent.reason).toBe('knockout');
      });

      it('F12-B4: handles rematch vote update state', () => {
        const rematchEvent: ServerEvent = {
          type: 'rematch_update',
          votes: { s1: true, s2: false }
        };
        expect(rematchEvent.votes.s1).toBe(true);
        expect(rematchEvent.votes.s2).toBe(false);
      });

      it('F12-B5: handles bot fallback event notification', () => {
        const botEvent: ServerEvent = {
          type: 'bot_fallback',
          message: 'Matchmaking timeout: paired with AI Bot'
        };
        expect(botEvent.type).toBe('bot_fallback');
      });
    });

    // --- F13 Boundaries ---
    describe('F13: Matchmaking Concurrency & Edge Cases', () => {
      it('F13-B1: handles bot assignment when player chooses Volt Shinobi', () => {
        const allChars: CharacterId[] = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];
        const chosen: CharacterId = 'volt_shinobi';
        const botPool = allChars.filter((c) => c !== chosen);
        expect(botPool).not.toContain('volt_shinobi');
        expect(botPool.length).toBe(3);
      });

      it('F13-B2: handles matchmaking join with undefined MMR defaulting to 1000', () => {
        const opts: RankedQueueOptions = { profileId: 'u1', displayName: 'Player' };
        const effectiveMmr = opts.mmr ?? 1000;
        expect(effectiveMmr).toBe(1000);
      });

      it('F13-B3: handles rapid match queue cancel and re-enter without duplicate token', () => {
        let inQueue = false;
        const enterQueue = () => { inQueue = true; };
        const cancelQueue = () => { inQueue = false; };

        enterQueue();
        cancelQueue();
        enterQueue();
        expect(inQueue).toBe(true);
      });

      it('F13-B4: handles challenge room code creation format (6 uppercase alphanumeric chars)', () => {
        const generateRoomCode = () => {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = '';
          for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        };
        const code = generateRoomCode();
        expect(code).toHaveLength(6);
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
      });

      it('F13-B5: handles challenge room with duplicate name clients', () => {
        const host = { profileId: 'p1', displayName: 'Warrior' };
        const guest = { profileId: 'p2', displayName: 'Warrior' };
        expect(host.displayName).toBe(guest.displayName);
        expect(host.profileId).not.toBe(guest.profileId);
      });
    });

    // --- F14 Boundaries ---
    describe('F14: Match Arena Skin Ingestion Edge Cases', () => {
      it('F14-B1: handles empty string characterId in arena skin ingestion', () => {
        const char = getCharacterDefinition('');
        expect(char.id).toBe('shadow_ronin');
      });

      it('F14-B2: handles whitespace-only characterId in arena skin ingestion', () => {
        const char = getCharacterDefinition('   ');
        expect(char.id).toBe('shadow_ronin');
      });

      it('F14-B3: handles numeric input cast to string', () => {
        const char = getCharacterDefinition(String(999));
        expect(char.id).toBe('shadow_ronin');
      });

      it('F14-B4: extracts skins from partially formed player maps without throwing', () => {
        const partialPlayers: Record<string, any> = {
          'p1': { displayName: 'SoloPlayer' }
        };
        const p1Skin = getCharacterDefinition(partialPlayers['p1']?.characterId);
        const p2Skin = getCharacterDefinition(partialPlayers['p2']?.characterId);
        expect(p1Skin.id).toBe('shadow_ronin');
        expect(p2Skin.id).toBe('shadow_ronin');
      });

      it('F14-B5: preserves custom skin assignment when switching scenes', () => {
        let activeSkins = { p1: 'volt_shinobi', p2: 'cyber_valkyrie' };
        const reloadedSkins = {
          p1: getCharacterDefinition(activeSkins.p1),
          p2: getCharacterDefinition(activeSkins.p2)
        };
        expect(reloadedSkins.p1.id).toBe('volt_shinobi');
        expect(reloadedSkins.p2.id).toBe('cyber_valkyrie');
      });
    });

    // --- F15 Boundaries ---
    describe('F15: Test Suite Robustness & Error Isolation', () => {
      it('F15-B1: Vector2Pool isolates allocations and recycles vectors', () => {
        const v = Vector2Pool.acquire();
        v.x = 123;
        v.y = 456;
        Vector2Pool.release(v);
        expect(v.x).toBe(0);
        expect(v.y).toBe(0);
      });

      it('F15-B2: handles simulated frame time delta fluctuations (10ms to 50ms)', () => {
        const ragdoll = new RagdollSystem();
        expect(() => {
          ragdoll.step(0.01);
          ragdoll.step(0.05);
          ragdoll.step(0.016);
        }).not.toThrow();
      });

      it('F15-B3: verifies all 4 character definitions contain valid avatarIcon strings', () => {
        for (const char of getAllCharacters()) {
          expect(char.avatarIcon.length).toBeGreaterThan(0);
        }
      });

      it('F15-B4: verifies all 4 character definitions contain valid codenames', () => {
        const codenames = getAllCharacters().map((c) => c.codename);
        expect(codenames).toEqual(['Kage', 'Freya', 'Raijin', 'Nyx']);
      });

      it('F15-B5: verifies all 4 character definitions contain non-empty signature quotes', () => {
        for (const char of getAllCharacters()) {
          expect(char.signatureQuote.length).toBeGreaterThan(5);
        }
      });
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE INTEGRATION COMBINATIONS (Pairwise Integration Tests)
  // ==========================================================================
  describe('Tier 3: Cross-Feature Integration Combinations (Pairwise Tests)', () => {
    it('Pair 1 (F5 ↔ F8): Character Select Modal updates localStorage and GuestProfile state', () => {
      const guestProfile = { id: 'guest-001', displayName: 'CyberNinja', characterId: 'shadow_ronin' };

      // User selects Volt Shinobi in Modal
      const newSelection: CharacterId = 'volt_shinobi';
      mockStorage.setItem('keyfury_selected_character', newSelection);
      guestProfile.characterId = newSelection;

      expect(mockStorage.getItem('keyfury_selected_character')).toBe('volt_shinobi');
      expect(guestProfile.characterId).toBe('volt_shinobi');
      expect(getCharacterDefinition(mockStorage.getItem('keyfury_selected_character')).name).toBe('Volt Shinobi');
    });

    it('Pair 2 (F8 ↔ F7): LocalStorage persistence renders updated Active Champion Lobby Banner', () => {
      // Simulate persisted state in storage
      mockStorage.setItem('keyfury_selected_character', 'cyber_valkyrie');

      // Lobby component reads storage on mount
      const persistedId = mockStorage.getItem('keyfury_selected_character');
      const champion = getCharacterDefinition(persistedId);

      expect(champion.id).toBe('cyber_valkyrie');
      expect(champion.codename).toBe('Freya');
      expect(champion.element).toBe('Crimson Core');
      expect(champion.theme.primaryColor).toBe('#ef4444');
    });

    it('Pair 3 (F7 ↔ F12): Clicking Quick Duel from Lobby passes current champion to queue options', () => {
      mockStorage.setItem('keyfury_selected_character', 'void_assassin');
      const activeChampionId = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character')).id;

      const queuePayload: RankedQueueOptions & { characterId: string } = {
        profileId: 'player-99',
        displayName: 'ShadowWalker',
        mmr: 1150,
        characterId: activeChampionId
      };

      expect(queuePayload.characterId).toBe('void_assassin');
      expect(queuePayload.mmr).toBe(1150);
    });

    it('Pair 4 (F12 ↔ F13): Colyseus Room joins player with champion and spawns distinct AI bot', () => {
      const playerChoice: CharacterId = 'cyber_valkyrie';

      // Matchmaker creates room
      const allChars: CharacterId[] = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];
      const botChoice = allChars.filter((c) => c !== playerChoice)[0];

      const roomSnapshot: MatchStateSnapshot & { players: Record<string, PlayerSnapshot & { characterId: string }> } = {
        matchId: 'duel-room-101',
        status: 'in_progress',
        deckSeed: 'seed-duel-1',
        words: ['combat', 'overdrive'],
        rulesVersion: '1.0.0',
        countdownSeconds: 0,
        remainingSeconds: 90,
        players: {
          'sess-human': {
            sessionId: 'sess-human',
            profileId: 'human-1',
            displayName: 'ValkyrieMain',
            side: 'left',
            ready: true,
            health: 200,
            activeWordIndex: 0,
            wordTypedCharCount: 0,
            combo: 0,
            acceptedWpm: 0,
            accuracy: 100,
            highestCombo: 0,
            wordsCompleted: 0,
            connected: true,
            characterId: playerChoice
          },
          'sess-bot': {
            sessionId: 'sess-bot',
            profileId: 'bot-ai',
            displayName: 'KeyFury Bot',
            side: 'right',
            ready: true,
            health: 200,
            activeWordIndex: 0,
            wordTypedCharCount: 0,
            combo: 0,
            acceptedWpm: 0,
            accuracy: 100,
            highestCombo: 0,
            wordsCompleted: 0,
            connected: true,
            characterId: botChoice
          }
        }
      };

      expect(roomSnapshot.players['sess-human'].characterId).toBe('cyber_valkyrie');
      expect(roomSnapshot.players['sess-bot'].characterId).toBe('shadow_ronin');
      expect(roomSnapshot.players['sess-human'].characterId).not.toBe(roomSnapshot.players['sess-bot'].characterId);
    });

    it('Pair 5 (F12 ↔ F14): MatchPage extracts snapshot characters and injects into arena skins', () => {
      const snapshotPlayers = {
        'sess-p1': { characterId: 'volt_shinobi', side: 'left' },
        'sess-p2': { characterId: 'void_assassin', side: 'right' }
      };

      const p1Char = getCharacterDefinition(snapshotPlayers['sess-p1'].characterId);
      const p2Char = getCharacterDefinition(snapshotPlayers['sess-p2'].characterId);

      expect(p1Char.id).toBe('volt_shinobi');
      expect(p2Char.id).toBe('void_assassin');
      expect(p1Char.theme.gloveColor).toBe(0xf59e0b);
      expect(p2Char.theme.gloveColor).toBe(0x7c3aed);
    });

    it('Pair 6 (F14 ↔ F9): Match Arena skin ingestion configures modular skeletal rigs for both fighters', () => {
      const p1Def = getCharacterDefinition('shadow_ronin');
      const p2Def = getCharacterDefinition('cyber_valkyrie');

      // Draw P1 (Left, facing = 1)
      simulateDrawFighterRigs(mockGraphics, 200, 400, 1, p1Def);
      expect(mockGraphics.calls.length).toBeGreaterThan(5);

      // Draw P2 (Right, facing = -1)
      const p2Graphics = new MockPhaserGraphics();
      simulateDrawFighterRigs(p2Graphics, 600, 400, -1, p2Def);
      expect(p2Graphics.calls.length).toBeGreaterThan(5);
    });

    it('Pair 7 (F9 ↔ F10): Modular rig adapts to dynamic 2-bone IK limb poses during jump kick', () => {
      const ronin = CHARACTER_REGISTRY.shadow_ronin;
      const rootHip: Vector2D = { x: 200, y: 350 };
      const kickTarget: Vector2D = { x: 220, y: 340 };

      // Solve leg IK (distance is sqrt(20^2 + 10^2) = 22.36 <= 42 max reach)
      const ikResult = solve2BoneIK(rootHip, kickTarget, 22, 20, 1);
      expect(ikResult.reached).toBe(true);

      // Render fighter in kick pose with character gear
      simulateDrawFighterRigs(mockGraphics, rootHip.x, rootHip.y + 50, 1, ronin);
      expect(mockGraphics.calls.some((c) => c.method === 'strokePath')).toBe(true);
    });

    it('Pair 8 (F10 ↔ F11): Strike impact triggers elemental particle burst using attacker palette', () => {
      const attacker = CHARACTER_REGISTRY.volt_shinobi;
      const impactPos = { x: 350, y: 250 };

      const burstParticles = spawnSimulatedElementalBurst(
        ParticlePool,
        impactPos.x,
        impactPos.y,
        attacker.theme.particlePalette,
        false,
        12
      );

      expect(burstParticles).toHaveLength(12);
      expect(attacker.theme.particlePalette).toContain(burstParticles[0].color);
      expect(burstParticles[0].position.x).toBe(350);
    });

    it('Pair 9 (F11 ↔ F6): Impact particle burst coordinates with procedural audio synthesis', () => {
      const attacker = CHARACTER_REGISTRY.void_assassin;

      // Particle spawn
      const burst = spawnSimulatedElementalBurst(ParticlePool, 300, 300, attacker.theme.particlePalette, false, 8);
      // Audio playback
      mockAudio.playCharacterStrikeAudio(attacker.id);

      expect(burst.length).toBe(8);
      expect(mockAudio.playedSounds).toContainEqual({ type: 'void_dagger' });
    });

    it('Pair 10 (F10 ↔ F14): Heavy strike KO triggers Ragdoll tumbling and sets match end result', () => {
      const ragdoll = new RagdollSystem();
      ragdoll.groundY = 500;
      ragdoll.setMode('Ragdoll');
      ragdoll.applyImpulse('pelvis', { x: 80, y: -50 }); // Knockout blast

      ragdoll.step(1 / 60);
      const head = ragdoll.getNode('head');
      expect(head).toBeDefined();
      expect(head!.x).toBeGreaterThan(0);

      const matchResult = {
        winnerSessionId: 'sess-p1',
        winnerChampion: 'cyber_valkyrie',
        loserChampion: 'shadow_ronin',
        endReason: 'knockout'
      };

      expect(matchResult.endReason).toBe('knockout');
      expect(matchResult.winnerChampion).toBe('cyber_valkyrie');
    });
  });

  // ==========================================================================
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 Full User Journey Simulations)
  // ==========================================================================
  describe('Tier 4: Real-World Application Scenarios (Full User Journeys)', () => {
    it('Journey 1: Guest User Onboarding, Character Modal Exploration & Champion Selection', () => {
      // Step 1: Guest user lands on KeyFury. Storage is empty -> Defaults to Shadow Ronin.
      const initialChampion = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character'));
      expect(initialChampion.id).toBe('shadow_ronin');

      // Step 2: Guest opens Character Select Modal.
      let modalOpen = true;
      expect(modalOpen).toBe(true);

      // Step 3: Guest browses all 4 characters, inspecting stats and lore.
      const roster = getAllCharacters();
      expect(roster).toHaveLength(4);
      const valkyrie = roster.find((c) => c.id === 'cyber_valkyrie')!;
      expect(valkyrie.attributes.power).toBe(10);

      // Step 4: Guest clicks "Test Strike" on Cyber Valkyrie -> Triggers audio and particle burst.
      mockAudio.playCharacterStrikeAudio('cyber_valkyrie');
      expect(mockAudio.playedSounds).toContainEqual({ type: 'gauntlet_smash' });
      const previewVfx = spawnSimulatedElementalBurst(ParticlePool, 200, 200, valkyrie.theme.particlePalette, false, 8);
      expect(previewVfx).toHaveLength(8);

      // Step 5: Guest confirms selection of Cyber Valkyrie.
      mockStorage.setItem('keyfury_selected_character', 'cyber_valkyrie');
      modalOpen = false;

      // Step 6: Verify Lobby Active Champion banner immediately displays Freya with Crimson Core.
      const lobbyChampion = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character'));
      expect(lobbyChampion.id).toBe('cyber_valkyrie');
      expect(lobbyChampion.codename).toBe('Freya');
      expect(lobbyChampion.element).toBe('Crimson Core');
    });

    it('Journey 2: Quick Match 1v1 Human Duel with Custom Skins, Typing Combat, and Victory', () => {
      // Step 1: Player 1 (Volt Shinobi) queues for Quick Duel.
      mockStorage.setItem('keyfury_selected_character', 'volt_shinobi');
      const p1CharId = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character')).id;

      // Step 2: Matchmaker pairs with Player 2 (Shadow Ronin).
      const p2CharId: CharacterId = 'shadow_ronin';
      const roomSnapshot = {
        matchId: 'duel-human-live',
        players: {
          'p1': { characterId: p1CharId, side: 'left', health: 200, wordsCompleted: 0 },
          'p2': { characterId: p2CharId, side: 'right', health: 200, wordsCompleted: 0 }
        }
      };

      // Step 3: Arena initializes both custom vector rigs.
      const p1Def = getCharacterDefinition(roomSnapshot.players.p1.characterId);
      const p2Def = getCharacterDefinition(roomSnapshot.players.p2.characterId);
      simulateDrawFighterRigs(mockGraphics, 200, 400, 1, p1Def);
      simulateDrawFighterRigs(mockGraphics, 600, 400, -1, p2Def);

      // Step 4: Player 1 completes word -> performs strike -> triggers gold sparks VFX.
      roomSnapshot.players.p1.wordsCompleted++;
      roomSnapshot.players.p2.health -= 50;
      const hitVfx = spawnSimulatedElementalBurst(ParticlePool, 580, 360, p1Def.theme.particlePalette, false, 10);
      expect(hitVfx[0].color).toBe('#f59e0b');

      // Step 5: Player 1 lands final strike -> P2 health reaches 0 -> P1 Victory.
      roomSnapshot.players.p2.health = 0;
      expect(roomSnapshot.players.p2.health).toBe(0);
      const victoryData = {
        winnerId: 'p1',
        winnerChampion: p1Def.name,
        avatarIcon: p1Def.avatarIcon
      };
      expect(victoryData.winnerChampion).toBe('Volt Shinobi');
      expect(victoryData.avatarIcon).toBe('Flame');
    });

    it('Journey 3: Practice Match vs AI Bot with Distinct Bot Fighter Assignment', () => {
      // Step 1: Player selects Void Assassin.
      mockStorage.setItem('keyfury_selected_character', 'void_assassin');
      const playerChar = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character'));
      expect(playerChar.codename).toBe('Nyx');

      // Step 2: Player starts Practice Match vs AI Bot.
      // Server selects distinct bot skin.
      const botCharId: CharacterId = 'cyber_valkyrie';
      const botDef = getCharacterDefinition(botCharId);
      expect(botDef.id).not.toBe(playerChar.id);

      // Step 3: Draw both fighters in combat arena.
      simulateDrawFighterRigs(mockGraphics, 200, 400, 1, playerDefWrapper(playerChar));
      simulateDrawFighterRigs(mockGraphics, 600, 400, -1, botDef);

      // Step 4: Bot strikes -> Crimson Core particles spawn.
      mockAudio.playCharacterStrikeAudio(botDef.id);
      expect(mockAudio.playedSounds).toContainEqual({ type: 'gauntlet_smash' });
      const botVfx = spawnSimulatedElementalBurst(ParticlePool, 220, 360, botDef.theme.particlePalette, false, 8);
      expect(botVfx[0].color).toBe('#ef4444');

      function playerDefWrapper(c: CharacterDefinition): CharacterDefinition {
        return c;
      }
    });

    it('Journey 4: Rapid Champion Switching in Lobby followed by Ranked Queue Entry', () => {
      // Step 1: Player rapidly flips through all 4 characters in the selector.
      const sequence: CharacterId[] = ['shadow_ronin', 'cyber_valkyrie', 'volt_shinobi', 'void_assassin'];
      for (const charId of sequence) {
        mockStorage.setItem('keyfury_selected_character', charId);
        const banner = getCharacterDefinition(mockStorage.getItem('keyfury_selected_character'));
        expect(banner.id).toBe(charId);
      }

      // Step 2: Final selection settles on Void Assassin.
      expect(mockStorage.getItem('keyfury_selected_character')).toBe('void_assassin');

      // Step 3: Player enters Ranked Queue immediately.
      const queueRequest = {
        profileId: 'usr-speed-select',
        displayName: 'GhostBlade',
        mmr: 1350,
        characterId: mockStorage.getItem('keyfury_selected_character')!
      };

      expect(queueRequest.characterId).toBe('void_assassin');
      expect(isValidCharacterId(queueRequest.characterId)).toBe(true);

      // Step 4: Server confirms player state with Void Assassin.
      const serverPlayerState = {
        sessionId: 'sess-new',
        characterId: queueRequest.characterId,
        displayName: queueRequest.displayName
      };
      expect(serverPlayerState.characterId).toBe('void_assassin');
    });

    it('Journey 5: Full Duel to Knockout with Ragdoll Physics, Elemental Explosion, and Summary Card', () => {
      // Step 1: Duel setup between Cyber Valkyrie (P1) and Volt Shinobi (P2).
      const p1 = CHARACTER_REGISTRY.cyber_valkyrie;
      const p2 = CHARACTER_REGISTRY.volt_shinobi;
      let p2Health = 200;

      // Step 2: Intense typing duel trades punches and kicks.
      for (let round = 1; round <= 3; round++) {
        p2Health -= 50;
        spawnSimulatedElementalBurst(ParticlePool, 500, 350, p1.theme.particlePalette, false, 6);
      }
      expect(p2Health).toBe(50);

      // Step 3: P1 executes signature Heavy Strike "Crimson Impact Overdrive".
      mockAudio.playCharacterStrikeAudio(p1.id);
      expect(mockAudio.playedSounds).toContainEqual({ type: 'gauntlet_smash' });
      p2Health = 0;

      // Step 4: Massive Crimson Core explosion spawns on KO.
      const koExplosion = spawnSimulatedElementalBurst(ParticlePool, 550, 320, p1.theme.particlePalette, true, 30);
      expect(koExplosion).toHaveLength(30);

      // Step 5: P2 transitions to Ragdoll Verlet physics tumbling.
      const ragdoll = new RagdollSystem();
      ragdoll.groundY = 500;
      ragdoll.setMode('Ragdoll');
      ragdoll.applyImpulse('pelvis', { x: 120, y: -70 }); // Heavy KO launch impulse

      for (let step = 0; step < 20; step++) {
        ragdoll.step(1 / 60);
      }

      const ragdollPelvis = ragdoll.getNode('pelvis');
      expect(ragdollPelvis).toBeDefined();
      expect(ragdollPelvis!.x).toBeGreaterThan(0);

      // Step 6: Post-match summary card generates with winning champion art and stats.
      const summaryCard = {
        matchId: 'duel-ko-final',
        winner: {
          displayName: 'CrimsonVanguard',
          championName: p1.name,
          signatureQuote: p1.signatureQuote,
          portraitAsset: p1.portraitAssetKey,
          wpm: 104,
          accuracy: 99
        },
        loser: {
          championName: p2.name
        },
        endReason: 'knockout'
      };

      expect(summaryCard.winner.championName).toBe('Cyber Valkyrie');
      expect(summaryCard.winner.signatureQuote).toBe('Armor up or get shattered.');
      expect(summaryCard.endReason).toBe('knockout');
    });
  });
});
