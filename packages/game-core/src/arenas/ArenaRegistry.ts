import { ArenaDefinition, ArenaId } from './ArenaTypes.js';

export const ARENA_REGISTRY: Record<ArenaId, ArenaDefinition> = {
  highland_sanctuary: {
    id: 'highland_sanctuary',
    name: 'Highland Sanctuary',
    subtitle: 'Ancient Runic Plateau',
    tagline: 'Where wind whispers ancient forgotten duels.',
    lore: 'A sacred high-altitude stone battle terrace carved with glowing ancient runes, overlooking verdant rolling highlands, crystal alpine lakes, and snow-capped peaks.',
    theme: {
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      accentColor: '#34d399',
      ambientGlow: 'rgba(16, 185, 129, 0.4)',
      groundParticleColor: '#6ee7b7',
      particlePalette: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
      lightingMood: 'daylight'
    },
    platformRatio: 0.64,
    portraitPlatformRatio: 0.74,
    icon: 'Trees'
  },
  cyber_rooftop: {
    id: 'cyber_rooftop',
    name: 'Cyber Neon Rooftop',
    subtitle: 'Neo-Kyoto Sky Deck',
    tagline: 'High above the neon mist, where milliseconds decide fate.',
    lore: 'A rain-slicked reinforced helicopter pad and server terrace atop an 80-story megacorp spire, ringed by pulsing holographic billboards and flying sky-traffic.',
    theme: {
      primaryColor: '#38bdf8',
      secondaryColor: '#0284c7',
      accentColor: '#ec4899',
      ambientGlow: 'rgba(56, 189, 248, 0.45)',
      groundParticleColor: '#f472b6',
      particlePalette: ['#38bdf8', '#06b6d4', '#ec4899', '#f43f5e'],
      lightingMood: 'neon_night'
    },
    platformRatio: 0.64,
    portraitPlatformRatio: 0.74,
    icon: 'Building2'
  },
  volcanic_caldera: {
    id: 'volcanic_caldera',
    name: 'Volcanic Caldera',
    subtitle: 'Infernal Magma Forge',
    tagline: 'Forged in raw heat, tempered by relentless fury.',
    lore: 'A massive chunk of floating obsidian rock suspended over a raging subterranean river of molten lava, shrouded in ember storms and smoke pluming from active volcanic peaks.',
    theme: {
      primaryColor: '#ef4444',
      secondaryColor: '#dc2626',
      accentColor: '#f97316',
      ambientGlow: 'rgba(239, 68, 68, 0.5)',
      groundParticleColor: '#fb923c',
      particlePalette: ['#ef4444', '#f97316', '#fbbf24', '#ffedd5'],
      lightingMood: 'infernal'
    },
    platformRatio: 0.64,
    portraitPlatformRatio: 0.74,
    icon: 'Flame'
  },
  celestial_void: {
    id: 'celestial_void',
    name: 'Celestial Void Shrine',
    subtitle: 'Astral Moonlit Temple',
    tagline: 'Beneath the shattered moon, eternity unfolds.',
    lore: 'A mystical temple plaza carved from astral marble and dark amethyst crystals, floating weightlessly inside a deep cosmos nebula where luminous cherry blossoms drift in zero gravity.',
    theme: {
      primaryColor: '#a855f7',
      secondaryColor: '#7c3aed',
      accentColor: '#c084fc',
      ambientGlow: 'rgba(168, 85, 247, 0.45)',
      groundParticleColor: '#e9d5ff',
      particlePalette: ['#a855f7', '#8b5cf6', '#c084fc', '#e9d5ff'],
      lightingMood: 'astral'
    },
    platformRatio: 0.64,
    portraitPlatformRatio: 0.74,
    icon: 'Moon'
  }
};

export const DEFAULT_ARENA_ID: ArenaId = 'highland_sanctuary';

export function getArenaDefinition(id?: string | null): ArenaDefinition {
  if (id && id in ARENA_REGISTRY) {
    return ARENA_REGISTRY[id as ArenaId];
  }
  return ARENA_REGISTRY[DEFAULT_ARENA_ID];
}

export function getAllArenas(): ArenaDefinition[] {
  return Object.values(ARENA_REGISTRY);
}

export function getRandomArenaId(): ArenaId {
  const ids = Object.keys(ARENA_REGISTRY) as ArenaId[];
  return ids[Math.floor(Math.random() * ids.length)];
}
