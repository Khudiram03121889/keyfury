export type ArenaId = 'highland_sanctuary' | 'cyber_rooftop' | 'volcanic_caldera' | 'celestial_void';

export interface ArenaTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  ambientGlow: string;
  groundParticleColor: string;
  particlePalette: string[];
  lightingMood: 'daylight' | 'neon_night' | 'infernal' | 'astral';
}

export interface ArenaDefinition {
  id: ArenaId;
  name: string;
  subtitle: string;
  tagline: string;
  lore: string;
  theme: ArenaTheme;
  platformRatio: number;
  portraitPlatformRatio: number;
  icon: string;
}
