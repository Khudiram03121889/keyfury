export type CharacterId =
  | 'shadow_ronin'
  | 'cyber_valkyrie'
  | 'volt_shinobi'
  | 'void_assassin';

export type CombatArchetype =
  | 'precision_katana'
  | 'heavy_brawler'
  | 'lightning_rushdown'
  | 'stealth_assassin';

export interface CharacterAttributes {
  speed: number;       // 1 - 10
  power: number;       // 1 - 10
  defense: number;     // 1 - 10
  comboMastery: number;// 1 - 10
}

export interface CharacterVisualTheme {
  primaryColor: string;      // e.g. '#38bdf8'
  secondaryColor: string;    // e.g. '#0284c7'
  accentColor: string;       // e.g. '#0ea5e9'
  bodyColor: number;         // Hex number for Phaser Graphics (e.g. 0x0f172a)
  gloveColor: number;        // Hex number for Phaser Graphics (e.g. 0x0284c7)
  eyeColor: number;          // Hex number for Phaser Graphics (e.g. 0x38bdf8)
  glowColor: string;         // CSS glow / particle aura
  particlePalette: string[]; // List of hex color strings for ObjectPool particles
}

export interface CharacterGearSpec {
  headType: 'kabuto_visor' | 'valkyrie_helm' | 'shinobi_mask' | 'shadow_hood';
  shoulderType: 'minimal_nanotech' | 'heavy_pauldrons' | 'light_mesh' | 'shadow_shroud';
  gauntletType: 'plasma_strike' | 'hydraulic_brawler' | 'lightning_kunai' | 'void_daggers';
  accessoryType: 'flowing_scarf' | 'energy_crest' | 'storm_ribbon' | 'void_cloak';
  waistType: 'obi_sash' | 'heavy_belt' | 'shinobi_belt' | 'rift_sash';
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  codename: string;
  title: string;
  archetype: CombatArchetype;
  archetypeLabel: string;
  tagline: string;
  lore: string;
  element: 'Azure Plasma' | 'Crimson Core' | 'Volt Lightning' | 'Amethyst Void';
  attributes: CharacterAttributes;
  theme: CharacterVisualTheme;
  gear: CharacterGearSpec;
  signatureMove: string;
  signatureQuote: string;
  portraitAssetKey: string;
  avatarIcon: string;
}
