# Project: KeyFury Procedural Vector Fighter Renderer Polish

## Architecture
KeyFury is a fast-paced typing combat fighter game built on Phaser 3 and TypeScript. The character rendering system utilizes a dual-path architecture:
1. **Atlas-Based Sprite Quad Renderer (`renderTexturedFighter`)**: Ingests JSON texture atlases and binds sprite quads across a strict 20-layer Z-index matrix (`RIG_Z_INDEX_MATRIX`) with additive weapon glow layers and proximal pivots.
2. **Procedural Vector Renderer (`renderVectorFallback` & standalone drawing functions)**: Performs dynamic vector drawing using Phaser 3 `Graphics` primitives (`fillStyle`, `beginPath`, `lineTo`, `arc`, `fillCircle`, `fillRoundedRect`, etc.) without bitmap textures. It generates athletic stylized stick fighters at ~100-120px in-game scale.

### Core Data Flow
`StickFightScene` -> evaluates fighter state and animations -> solves 2-bone analytical IK (`solve2BoneIK`) -> passes `SolvedKinematics` + `FighterState` + `time` (ms) -> `CharacterRigRenderer` / procedural drawing functions -> outputs to container base graphics (`__fallbackGraphics`) and VFX graphics (`__fallbackFxGraphics`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Base Geometry & Facing Symmetry | Fix torso quad width collapse in `renderVectorFallback`, fix arc flipping and `fillRect` symmetry for `facing = -1`. | M1 | Survey |
| 2 | Limb Tapering & Anatomical Proportions | Enhanced `drawTaperedLimb` with character-specific limb thickness profiles (e.g. bulkier Valkyrie, lean Shinobi). | M1 | Survey |
| 3 | Shadow Ronin Polish | Faceted golden Kuwagata horns, Kabuto cowl with cyan visor, cyber-samurai Do cuirass & Sode pauldrons, multi-layer curved plasma katana with Tsuka/Tsuba/Kissaki, layered Obi sash & waving cyan scarf. | M2 | Survey |
| 4 | Shadow Ronin Azure Plasma VFX | Signature Azure Plasma attack VFX (72px dual-layer cyan/white heavy arc, uppercut crescent, jab beam, kick sweeps) with correct left/right facing. | M2 | Survey |
| 5 | Cyber Valkyrie Polish | Bulkier brawler limbs & combat greaves, gold swept wing helm crown with red visor, titanium carapace with pulsing diamond reactor core & exhaust vents, heavy hydraulic power gauntlet with heat aura. | M3 | Survey |
| 6 | Cyber Valkyrie Crimson Core VFX | Signature Crimson Core attack VFX (heavy kinetic blast arc & impact ring, vertical piledriver beam, red thruster trails). | M3 | Survey |
| 7 | Volt Shinobi Polish | Sleek ninja limbs with amber tactical wraps, faceted Shinobi mask with gold HUD visor, tactical Shozoku vest with lightning chevrons, electrified dual lightning kunai with continuous harmonic pulse, dual storm ribbons. | M4 | Survey |
| 8 | Volt Shinobi Volt Lightning VFX | Signature Volt Lightning attack VFX (zigzagging electrical discharge bolts, jagged uppercut arcs, electric jump kick trails). | M4 | Survey |
| 9 | Void Assassin Polish | Stealth silhouette with dark limbs & rift energy, volumetric stealth shadow cowl with glowing amethyst dual slit eyes, shadow shroud mantle with pulsing Void Rift chest sigil, dual glowing void daggers, billowing void cloak. | M5 | Survey |
| 10 | Void Assassin Amethyst Void VFX | Signature Amethyst Void attack VFX (dual concentric swirling void rings, amethyst rift portal crescent, purple shadow warp lines). | M5 | Survey |
| 11 | Combat State Responsiveness & Knockdown Suppression | State-responsive visuals across all 10 states (`idle`, `step`, `windup`, `jab`, `kick`, `jump_kick`, `uppercut`, `heavy`, `hit`, `knockdown`); complete suppression of weapon glow & attack VFX during knockdown. | M1 | Survey |
| 12 | Zero Regression & API Preservation | Invariant public method signatures on `CharacterRigRenderer` and 6 exported drawing functions; 100% passing unit & integration test suites in `apps/web` and `packages/game-core`. | M6 | Survey |
| 13 | Comprehensive E2E Test Suite | 4-tier requirement-driven opaque-box test suite verifying all 80 permutations (4 fighters × 10 states × 2 facings), finite math, and color themes. | E2E Track | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Base Geometry, Symmetry & State Framework | Fix torso quad collapse, facing arc inversion, `fillRect` symmetry, limb tapering, and state reactivity framework in `CharacterRigRenderer.ts`. | none | DONE |
| M2 | Shadow Ronin Character Polish | Complete procedural vector polish for Shadow Ronin (Kabuto, Kuwagata, Do cuirass, Sode, Katana, Obi/Scarf, Azure Plasma VFX). | M1 | IN_PROGRESS |
| M3 | Cyber Valkyrie Character Polish | Complete procedural vector polish for Cyber Valkyrie (Wings helm, Carapace & Reactor, Hydraulic Gauntlets, Greaves, Crimson Core VFX). | M1 | PLANNED |
| M4 | Volt Shinobi Character Polish | Complete procedural vector polish for Volt Shinobi (Mask & HUD, Shozoku vest, Lightning Kunai, Storm Ribbons, Volt Lightning VFX). | M1 | PLANNED |
| M5 | Void Assassin Character Polish | Complete procedural vector polish for Void Assassin (Shadow Cowl, Rift Sigil & Shroud, Dual Void Daggers, Void Cloak, Amethyst Void VFX). | M1 | PLANNED |
| M6 | Final Integration & Adversarial Verification | Full test suite execution across all tiers, 100% E2E test pass, zero regressions, and adversarial coverage hardening. | M1, M2, M3, M4, M5, E2E Track | PLANNED |

## Interface Contracts
### `CharacterRigRenderer` API Contract (Strictly Invariant)
```typescript
export class CharacterRigRenderer {
  public getZIndexMatrix(): ReadonlyArray<RigZLayerInfo>;
  public applyLimbTransformToSprite(sprite: any, transform: LimbSegmentTransform, pivot?: { pivotX: number; pivotY: number }, nominalHeight?: number, nominalWidth?: number): void;
  public createRigSprites(scene: Phaser.Scene): any[];
  public createFighterRigContainer(scene: Phaser.Scene, characterId: string): any;
  public updateRigContainer(container: any, transforms?: Record<string, LimbSegmentTransform>, time?: number, state?: FighterState, characterId?: string): void;
  public renderTexturedFighter(scene: Phaser.Scene, container: any, characterId: string, state: FighterState, kinematics: SolvedKinematics, time?: number): void;
  public renderVectorFallback(scene: Phaser.Scene, container: any, characterId: string, state: FighterState, kinematics: SolvedKinematics, time?: number): void;
  public renderRagdollTexturedFighter(scene: Phaser.Scene, container: any, characterId: string, ragdoll: RagdollSystem, time?: number): void;
}
```

### Exported Drawing Functions Contract (Strictly Invariant)
```typescript
export function drawTaperedLimb(g: Phaser.GameObjects.Graphics, p1: { x: number; y: number }, p2: { x: number; y: number }, r1: number, r2: number, color: number): void;
export function drawCharacterHeadgear(g: Phaser.GameObjects.Graphics, headX: number, headY: number, facing: number, charDef: CharacterDefinition, state?: FighterState, time?: number): void;
export function drawCharacterPauldronsAndTorso(g: Phaser.GameObjects.Graphics, neckL: { x: number; y: number }, neckR: { x: number; y: number }, hipL: { x: number; y: number }, hipR: { x: number; y: number }, shoulderL: { x: number; y: number }, shoulderR: { x: number; y: number }, facing: number, charDef: CharacterDefinition, state?: FighterState, time?: number): void;
export function drawCharacterGauntletsAndWeapons(g: Phaser.GameObjects.Graphics, fxG: Phaser.GameObjects.Graphics, armL: { joint: { x: number; y: number }; tip: { x: number; y: number } }, armR: { joint: { x: number; y: number }; tip: { x: number; y: number } }, facing: number, charDef: CharacterDefinition, state?: FighterState, time?: number): void;
export function drawCharacterWaistAndScarf(g: Phaser.GameObjects.Graphics, hipX: number, hipY: number, headX: number, headY: number, facing: number, charDef: CharacterDefinition, state?: FighterState, time?: number): void;
export function drawCharacterAttackVFX(fxG: Phaser.GameObjects.Graphics, charDef: CharacterDefinition, state: FighterState, neckX: number, neckY: number, hipX: number, hipY: number, armR: { joint: { x: number; y: number }; tip: { x: number; y: number } }, legR: { joint: { x: number; y: number }; tip: { x: number; y: number } }, facing: number, time?: number): void;
```

## Code Layout
- `apps/web/src/game/character/CharacterRigRenderer.ts` — Primary procedural vector and atlas renderer.
- `apps/web/src/game/StickFightScene.ts` — Game scene managing fighter animation, IK solving, and rendering dispatch.
- `packages/game-core/src/characters/CharacterRegistry.ts` — Character definitions, themes, and gear specs.
- `packages/game-core/src/characters/CharacterTypes.ts` — TypeScript definitions for characters and themes.
- `apps/web/src/game/character/__tests__/` — Web unit, integration, and stress tests for renderer and kinematics.
