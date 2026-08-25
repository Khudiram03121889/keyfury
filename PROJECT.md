# Project: KeyFury Character Rigging & Visual Overhaul

## Architecture

KeyFury is a real-time 1v1 cyberpunk typing combat game built on Phaser 3 (WebGL/Canvas), React 19, TypeScript, and Colyseus.
This project overhauls all 4 core fighters (Shadow Ronin, Cyber Valkyrie, Volt Shinobi, Void Assassin) from procedural geometric vector stickmen into premier 2D high-fidelity realistic cybernetic warriors using a modular skeletal texture atlas quad pipeline bound directly to analytical 2-bone inverse kinematics (`solve2BoneIK`), spine curve solvers (`solveSpineCurve`), and Verlet ragdoll physics (`RagdollSystem`).

### High-Level Component Flow
1. **Asset Pipeline & Storage**:
   - High-fidelity 2D cybernetic textures packed into JSON-based texture atlases (`/assets/characters/<characterId>/atlas.png` + `atlas.json`) under `apps/web/public/assets/characters/`.
   - Atlas slices include 14-19 isolated anatomical parts per fighter: Head/Visor, Torso/Chest, Pelvis/Waist, Upper Arms (Lead/Rear), Forearms (Lead/Rear), Hands/Gauntlets, Thighs (Lead/Rear), Shins (Lead/Rear), Boots/Greaves, Pauldrons/Armor, Signature Weapon (Base + Glow), and Flowing Accessories (Scarf/Cape).
2. **Modular Skeletal Quad Renderer (`CharacterRigRenderer.ts`)**:
   - Computes 2D bone transforms using existing `@keyfury/game-core` kinematics (`solve2BoneIK`, `solveSpineCurve`, `RagdollSystem`).
   - Maps each anatomical part to a textured quad / sprite quad positioned at joint pivots with concentric circular joint caps at `(0.5, 0.15)` for seamless rotation without clipping or seams.
   - Enforces a 20-layer strict Z-ordering hierarchy (Rear Limbs -> Torso/Head -> Lead Limbs/Weapons -> Additive Glow).
   - Renders dual-layer energetic weapons with `Phaser.BlendModes.ADD` for vibrant neon weapon glows and triggers elemental particles via `ObjectPool.ts`.
3. **Kinematics & Gameplay Invariants**:
   - Zero modifications to core combat timing, typing advance distances, OBB CCD collision hitboxes, or ragdoll impulse transfers.
   - 100% backward-compatible fallback to vector rendering if texture atlases are loading or unavailable.
4. **Performance & Packaging Budget**:
   - WebGL draw calls $\le 2$ per fighter via batched sprite rendering.
   - CPU frame time $< 0.5\text{ms}$ at steady 60 FPS on desktop web and mobile WebView (Capacitor).
   - Total character asset payload $< 5\text{ MB}$.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Modular Skeletal Quad Engine | Texture quad mesh / sprite renderer bound to `solve2BoneIK` and `RagdollSystem` with concentric joint overlap | M0 | Survey R1 |
| 2 | Atlas Loading & Preloader Integration | Preload and parse character texture atlases in Phaser 3 with fallback handling | M0 | Survey R2 |
| 3 | 20-Layer Z-Order Matrix & Additive Glow | Strict depth layering and WebGL additive blending for signature weapons | M0 | Survey R1 |
| 4 | Shadow Ronin (Kage) Visual Atlas & Rigging | High-res cyber-samurai modular atlas (Kabuto helm, visor, cuirass, azure katana, scarf) | M1 | Survey R1/R3 |
| 5 | Shadow Ronin Visual & Combat Verification | Unit tests, 10 combat poses verification, azure plasma katana glow, zero IK clipping | M1 | Survey R3/R4 |
| 6 | Cyber Valkyrie (Freya) Visual Atlas & Rigging | High-res exo-brawler modular atlas (Winged helm, crimson power core, hydraulic fists, greaves) | M2 | Survey R1/R3 |
| 7 | Cyber Valkyrie Visual & Combat Verification | Unit tests, 10 combat poses verification, crimson hydraulic energy FX, zero IK clipping | M2 | Survey R3/R4 |
| 8 | Volt Shinobi (Raijin) Visual Atlas & Rigging | High-res cyber-ninja modular atlas (Mempo HUD visor, sleek stealth cuirass, lightning kunai, bracers) | M3 | Survey R1/R3 |
| 9 | Volt Shinobi Visual & Combat Verification | Unit tests, 10 combat poses verification, amber lightning sparks, zero IK clipping | M3 | Survey R3/R4 |
| 10 | Void Assassin (Nyx) Visual Atlas & Rigging | High-res void stalker modular atlas (Amethyst shadow cowl, stealth cuirass, dual void daggers, shadow cape) | M4 | Survey R1/R3 |
| 11 | Void Assassin Visual & Combat Verification | Unit tests, 10 combat poses verification, amethyst aura & void rift FX, zero IK clipping | M4 | Survey R3/R4 |
| 12 | 40-Pose Combat Visual Matrix Harness | Automated visual test harness verifying all 4 fighters $\times$ 10 combat states | M5 | Survey R4 |
| 13 | 60 FPS Combat Performance & WebGL Draw Call Benchmark | Benchmark sustaining 60 FPS, $< 1\text{ms}$ frame time, $\le 15$ total draw calls, zero GC allocations | M5 | Survey R4 |
| 14 | Monorepo Regression Gate & Final Polish | Pass 100% of Vitest suites (`packages/game-core`, `apps/web`, `apps/game-server`, root E2E) | M5 | Survey R4 |

---

## Milestones

| # | Name | Scope | Dependencies | Status | Key Outputs |
|---|------|-------|-------------|--------|-------------|
| M0 | Core Modular Skeletal Texture Engine | Implement `ModularAtlasManager`, textured quad limb/torso/head binding in `CharacterRigRenderer`, joint cap overlap, Z-order layering, and additive blend pipeline | none | **DONE** | `ModularAtlasManager.ts`, `CharacterRigRenderer.ts`, 49 unit tests, 0 build errors |
| M1 | Shadow Ronin (Kage) Character Overhaul | Generate & slice high-res Kage atlas, bind to skeletal rig, configure azure plasma katana glow & scarf physics, verify 10 combat poses & unit tests | M0 | **DONE** | `/assets/characters/shadow_ronin/` (PNG+JSON), 57 Kage tests, visual screenshots |
| M2 | Cyber Valkyrie (Freya) Character Overhaul | Generate & slice high-res Freya atlas, bind to skeletal rig, configure crimson hydraulic gauntlets & power core, verify 10 combat poses & unit tests | M1 | **IN_PROGRESS** | `/assets/characters/cyber_valkyrie/`, Freya test suites, visual verification |
| M3 | Volt Shinobi (Raijin) Character Overhaul | Generate & slice high-res Raijin atlas, bind to skeletal rig, configure amber lightning kunai & mempo HUD, verify 10 combat poses & unit tests | M2 | PLANNED | `/assets/characters/volt_shinobi/`, Raijin test suites, visual screenshots |
| M4 | Void Assassin (Nyx) Character Overhaul | Generate & slice high-res Nyx atlas, bind to skeletal rig, configure amethyst void daggers & shadow cowl, verify 10 combat poses & unit tests | M3 | PLANNED | `/assets/characters/void_assassin/`, Nyx test suites, visual screenshots |
| M5 | E2E Visual Matrix, 60 FPS Benchmark & Polish | 40-pose visual regression test suite, 60 FPS / WebGL draw call performance benchmarks, monorepo test suite pass with 0 regressions | M4 | PLANNED | `tests/e2e/`, 60 FPS benchmarks, clean builds |

---

## Interface Contracts

### 1. `ModularAtlasManager` (`apps/web/src/game/character/ModularAtlasManager.ts`)
```typescript
export interface AtlasPartRect {
  x: number;
  y: number;
  w: number;
  h: number;
  pivotX: number;
  pivotY: number;
}

export interface CharacterAtlasMetadata {
  characterId: 'shadow_ronin' | 'cyber_valkyrie' | 'volt_shinobi' | 'void_assassin';
  version: string;
  image: string;
  parts: Record<string, AtlasPartRect>;
}

export class ModularAtlasManager {
  static loadAtlas(scene: Phaser.Scene, characterId: string): Promise<boolean>;
  static preloadInScene(scene: Phaser.Scene, characterId: string): void;
  static registerPreloadedAtlases(scene: Phaser.Scene): void;
  static getPartFrame(scene: Phaser.Scene, characterId: string, partName: string): Phaser.Textures.Frame | null;
  static isAtlasLoaded(scene: Phaser.Scene, characterId: string): boolean;
  static unloadAtlas(scene: Phaser.Scene, characterId: string): void;
}
```

### 2. `CharacterRigRenderer` Quad Binding Contract (`apps/web/src/game/character/CharacterRigRenderer.ts`)
```typescript
export class CharacterRigRenderer {
  renderTexturedFighter(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    characterId: string,
    state: FighterCombatState,
    kinematics: SolvedKinematics
  ): void;
}
```
