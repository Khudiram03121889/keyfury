import { CharacterDefinition, CharacterId } from './CharacterTypes.js';

export const CHARACTER_REGISTRY: Record<CharacterId, CharacterDefinition> = {
  shadow_ronin: {
    id: 'shadow_ronin',
    name: 'Shadow Ronin',
    codename: 'Kage',
    title: 'The Azure Blade of Neo-Kyoto',
    archetype: 'precision_katana',
    archetypeLabel: 'Precision Katana Striker',
    tagline: 'Precision strikes cut cleaner than chrome.',
    lore: 'Exiled blade-master turned neural-link mercenary who channels concentrated azure plasma through cyber-forged katana strikes.',
    element: 'Azure Plasma',
    attributes: {
      speed: 9,
      power: 7,
      defense: 6,
      comboMastery: 8
    },
    theme: {
      primaryColor: '#38bdf8',
      secondaryColor: '#0284c7',
      accentColor: '#0ea5e9',
      bodyColor: 0x0f172a,
      gloveColor: 0x0284c7,
      eyeColor: 0x38bdf8,
      glowColor: 'rgba(56, 189, 248, 0.6)',
      particlePalette: ['#38bdf8', '#0ea5e9', '#0284c7', '#bae6fd']
    },
    gear: {
      headType: 'kabuto_visor',
      shoulderType: 'minimal_nanotech',
      gauntletType: 'plasma_strike',
      accessoryType: 'flowing_scarf',
      waistType: 'obi_sash'
    },
    signatureMove: 'Azure Plasma Flash',
    signatureQuote: 'One stroke. Zero latency.',
    portraitAssetKey: 'shadow-ronin',
    avatarIcon: 'Zap'
  },
  cyber_valkyrie: {
    id: 'cyber_valkyrie',
    name: 'Cyber Valkyrie',
    codename: 'Freya',
    title: 'Vanguard Heavy Exo-Brawler',
    archetype: 'heavy_brawler',
    archetypeLabel: 'Heavy Exo-Brawler',
    tagline: 'Unstoppable kinetic force, unbreakable titanium will.',
    lore: 'Former elite vanguard operative equipped with industrial crimson kinetic gauntlets and reinforced hydraulic exo-armor.',
    element: 'Crimson Core',
    attributes: {
      speed: 5,
      power: 10,
      defense: 9,
      comboMastery: 6
    },
    theme: {
      primaryColor: '#ef4444',
      secondaryColor: '#dc2626',
      accentColor: '#b91c1c',
      bodyColor: 0x1e1b4b,
      gloveColor: 0xdc2626,
      eyeColor: 0xf87171,
      glowColor: 'rgba(239, 68, 68, 0.6)',
      particlePalette: ['#ef4444', '#dc2626', '#b91c1c', '#fecaca']
    },
    gear: {
      headType: 'valkyrie_helm',
      shoulderType: 'heavy_pauldrons',
      gauntletType: 'hydraulic_brawler',
      accessoryType: 'energy_crest',
      waistType: 'heavy_belt'
    },
    signatureMove: 'Crimson Impact Overdrive',
    signatureQuote: 'Armor up or get shattered.',
    portraitAssetKey: 'cyber-valkyrie',
    avatarIcon: 'Shield'
  },
  volt_shinobi: {
    id: 'volt_shinobi',
    name: 'Volt Shinobi',
    codename: 'Raijin',
    title: 'High-Voltage Cyber Infiltrator',
    archetype: 'lightning_rushdown',
    archetypeLabel: 'Lightning Rushdown Ninja',
    tagline: 'Strikes before the thunder even registers.',
    lore: 'Syndicate covert infiltrator whose cybernetic nervous system discharges overclocked high-voltage electrical arcs on every strike.',
    element: 'Volt Lightning',
    attributes: {
      speed: 10,
      power: 6,
      defense: 5,
      comboMastery: 9
    },
    theme: {
      primaryColor: '#f59e0b',
      secondaryColor: '#d97706',
      accentColor: '#fbbf24',
      bodyColor: 0x18181b,
      gloveColor: 0xf59e0b,
      eyeColor: 0xfde047,
      glowColor: 'rgba(245, 158, 11, 0.6)',
      particlePalette: ['#f59e0b', '#eab308', '#fde047', '#fef3c7']
    },
    gear: {
      headType: 'shinobi_mask',
      shoulderType: 'light_mesh',
      gauntletType: 'lightning_kunai',
      accessoryType: 'storm_ribbon',
      waistType: 'shinobi_belt'
    },
    signatureMove: 'Thunder Tempest Surge',
    signatureQuote: 'You cannot block what you cannot track.',
    portraitAssetKey: 'volt-shinobi',
    avatarIcon: 'Flame'
  },
  void_assassin: {
    id: 'void_assassin',
    name: 'Void Assassin',
    codename: 'Nyx',
    title: 'Shadow Rift Dimensional Stalker',
    archetype: 'stealth_assassin',
    archetypeLabel: 'Shadow Stealth Stalker',
    tagline: 'Emerging from the dark, fading into silence.',
    lore: 'Ghost operative from the lower sprawl who harnesses dimensional rift energy to materialize lethal amethyst void daggers from thin air.',
    element: 'Amethyst Void',
    attributes: {
      speed: 8,
      power: 8,
      defense: 5,
      comboMastery: 9
    },
    theme: {
      primaryColor: '#a855f7',
      secondaryColor: '#7c3aed',
      accentColor: '#9333ea',
      bodyColor: 0x09090b,
      gloveColor: 0x7c3aed,
      eyeColor: 0xc084fc,
      glowColor: 'rgba(168, 85, 247, 0.6)',
      particlePalette: ['#a855f7', '#8b5cf6', '#7c3aed', '#f3e8ff']
    },
    gear: {
      headType: 'shadow_hood',
      shoulderType: 'shadow_shroud',
      gauntletType: 'void_daggers',
      accessoryType: 'void_cloak',
      waistType: 'rift_sash'
    },
    signatureMove: 'Void Eclipse Execution',
    signatureQuote: 'Look into the dark. It looks back.',
    portraitAssetKey: 'void-assassin',
    avatarIcon: 'Skull'
  }
};

export const DEFAULT_CHARACTER_ID: CharacterId = 'shadow_ronin';

export function getCharacterDefinition(id?: string | null): CharacterDefinition {
  if (id && Object.prototype.hasOwnProperty.call(CHARACTER_REGISTRY, id)) {
    return CHARACTER_REGISTRY[id as CharacterId];
  }
  return CHARACTER_REGISTRY[DEFAULT_CHARACTER_ID];
}

export function getAllCharacters(): CharacterDefinition[] {
  return Object.values(CHARACTER_REGISTRY);
}

export function isValidCharacterId(id: unknown): id is CharacterId {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(CHARACTER_REGISTRY, id);
}
