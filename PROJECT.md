# Project: KeyFury 2D Character Roster System

## Architecture
KeyFury is a real-time 1v1 cyberpunk typing combat duel built with TypeScript monorepo architecture:
- `packages/game-core`: Unified source of truth for combat calculations, 2-bone IK solvers, ragdoll physics, typing decks, and the Character Registry.
- `packages/protocol`: Message schemas, Colyseus room state interfaces, snapshot data structures, and queue options.
- `apps/game-server`: Colyseus multiplayer authoritative server managing `CombatRoom` and `DuelRoom`, state synchronization, and bot matchmaking.
- `apps/web`: React 18 + Vite frontend with Phaser 3 combat arena (`StickFightScene`), procedural audio synthesis (`SoundManager`, `SoundSynth`), glassmorphism UI, and local state persistence.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | 4 Core Fighter Definitions | Data models for Shadow Ronin, Cyber Valkyrie, Volt Shinobi, Void Assassin with IDs, archetypes, lore, attributes, visual themes, and particle palettes | M1 | Survey |
| F2 | Character Registry & Lookup API | `CHARACTER_REGISTRY`, `getCharacterDefinition`, `getAllCharacters`, and `isValidCharacterId` with safe fallback to `shadow_ronin` | M1 | Survey |
| F3 | High-Resolution SVG Portrait Assets | 512x512 vector portrait art files for all 4 fighters in `apps/web/src/assets/characters/` with index map | M1 | Survey |
| F4 | Character Registry Unit Tests | Comprehensive test suite in `packages/game-core/tests/characters.test.ts` verifying registry completeness, stat bounds, and fallbacks | M1 | Survey |
| F5 | Character Select Modal UI | `apps/web/src/components/character/CharacterSelectModal.tsx` with carousel/grid cards, archetype badges, stats radar, and elemental borders | M2 | Survey |
| F6 | Live Strike Preview & Audio Feedback | Interactive "Test Strike" canvas animation triggering elemental particle bursts and procedural audio synthesis on selection | M2 | Survey |
| F7 | Active Champion Lobby Integration | Prominent Active Champion banner in `LobbyPage.tsx` displaying portrait, archetype, and quick-swap modal launcher | M2 | Survey |
| F8 | Local State & Profile Persistence | `localStorage` persistence under `keyfury_selected_character` integrated with `UserProfile` and `GuestProfile` | M2 | Survey |
| F9 | Modular 2D Skeletal Rigs & Vector Meshes | Dynamic vector rendering in `StickFightScene.ts` adapting helmets/visors, pauldrons, gauntlets, and scarves to each fighter | M3 | Survey |
| F10 | 100% Combat Mechanics Preservation | Flawless preservation of `solve2BoneIK`, `solveSpineCurve`, typing advance, all strike states (`jab`, `kick`, `jump_kick`, `uppercut`, `heavy`, `hit`), and `RagdollSystem` KO tumbling | M3 | Survey |
| F11 | Elemental Particle VFX via ObjectPool | Character-specific particle bursts (Azure Plasma, Crimson Energy, Electric Gold Lightning, Void Purple Wisps) via `ParticlePool` | M3 | Survey |
| F12 | Protocol & Server State Sync | `characterId` field in `packages/protocol` (`PlayerSnapshot`, `RankedQueueOptions`) and `apps/game-server` (`CombatRoom.ts` `PlayerState`) | M4 | Survey |
| F13 | Multiplayer Matchmaking & Bot Selection | `apps/web/src/lib/colyseus.ts` passing `characterId` across quick duels, challenge rooms, and AI bot duels (bot auto-selecting distinct character) | M4 | Survey |
| F14 | Match Arena Character Skin Ingestion | `MatchPage.tsx` extracting P1 and P2 `characterId` from session state and injecting into `StickFightScene` | M4 | Survey |
| F15 | End-to-End Test Suite & Verification | Comprehensive test suite (Tiers 1-4) covering registry, UI, physics, and multiplayer state + zero TypeScript errors on full build | M5 | Survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Fighter Definitions & SVG Character Art | `packages/game-core/src/characters/`, `packages/game-core/src/index.ts`, `apps/web/src/assets/characters/*.svg`, `packages/game-core/tests/characters.test.ts` | none | DONE |
| M2 | Character Selection UI & State Persistence | `apps/web/src/components/character/CharacterSelectModal.tsx`, `apps/web/src/pages/LobbyPage.tsx`, `apps/web/src/lib/supabase.ts` | M1 | DONE |
| M3 | Phaser 2D Skeletal Rigs & Elemental VFX | `apps/web/src/game/StickFightScene.ts`, `apps/web/src/game/scenes/CombatScene.ts`, `apps/web/src/render/ObjectPool.ts` | M1 | DONE |
| M4 | Colyseus Multiplayer Sync & Match Arena | `packages/protocol/src/messages.ts`, `apps/game-server/src/rooms/CombatRoom.ts`, `apps/game-server/src/rooms/DuelRoom.ts`, `apps/web/src/lib/colyseus.ts`, `apps/web/src/pages/MatchPage.tsx` | M1, M2, M3 | DONE |
| M5 | E2E Integration & Verification Hardening | Full workspace build (`pnpm build`), unit test suites pass, E2E test suite validation (Tiers 1-4), adversarial test hardening (Tier 5) | M1, M2, M3, M4 | DONE |

## Interface Contracts

### `packages/game-core` ↔ `apps/web` & `apps/game-server`
- `CharacterId`: `'shadow_ronin' | 'cyber_valkyrie' | 'volt_shinobi' | 'void_assassin'`
- `CharacterDefinition`: `{ id, name, codename, title, archetype, archetypeLabel, tagline, lore, element, attributes, theme, gear, signatureMove, signatureQuote, portraitAssetKey, avatarIcon }`
- `getCharacterDefinition(id?: string | null): CharacterDefinition`
- `getAllCharacters(): CharacterDefinition[]`
- `isValidCharacterId(id: unknown): id is CharacterId`

### `packages/protocol` ↔ `apps/game-server` ↔ `apps/web`
- `PlayerSnapshot`: includes `characterId?: string`
- `RankedQueueOptions`: includes `characterId?: string`
- `CombatRoom.onJoin(client, options)`: extracts `options.characterId`, stores in `PlayerState.characterId`
- `CombatRoom.spawnBotOpponent()`: assigns distinct `characterId` (e.g. `'cyber_valkyrie'`) to bot `PlayerState`

### `apps/web` UI ↔ Phaser `StickFightScene`
- `StickFightScene.setCharacterSkins(p1CharacterId: string, p2CharacterId: string): void`
- `StickFightScene.drawFighter(graphics, x, y, facing, pose, characterDef, isP1)`
- `StickFightScene.spawnImpactParticleBurst(x, y, palette, isHeavy, count)`

## Code Layout
- `packages/game-core/src/characters/CharacterTypes.ts` - TypeScript interfaces and types
- `packages/game-core/src/characters/CharacterRegistry.ts` - 4 core fighter configurations & helpers
- `packages/game-core/src/characters/index.ts` - Barrel exports
- `packages/game-core/src/index.ts` - Top-level package export
- `packages/game-core/tests/characters.test.ts` - Unit tests for registry
- `apps/web/src/assets/characters/shadow-ronin.svg` - Shadow Ronin portrait art
- `apps/web/src/assets/characters/cyber-valkyrie.svg` - Cyber Valkyrie portrait art
- `apps/web/src/assets/characters/volt-shinobi.svg` - Volt Shinobi portrait art
- `apps/web/src/assets/characters/void-assassin.svg` - Void Assassin portrait art
- `apps/web/src/assets/characters/index.ts` - Asset index mapping
- `apps/web/src/components/character/CharacterSelectModal.tsx` - Character select modal component
- `apps/web/src/pages/LobbyPage.tsx` - Lobby page with Active Champion badge
- `apps/web/src/lib/supabase.ts` - Storage helpers & user profile state
- `apps/web/src/game/StickFightScene.ts` - Phaser combat scene with 2D modular skeletal rigs & elemental VFX
- `apps/web/src/game/scenes/CombatScene.ts` - CombatScene wrapper
- `packages/protocol/src/messages.ts` - Colyseus protocol message schemas
- `apps/game-server/src/rooms/CombatRoom.ts` - Server room state and player character assignment
- `apps/game-server/src/rooms/DuelRoom.ts` - Server duel room export
- `apps/web/src/lib/colyseus.ts` - Matchmaking client functions passing characterId
- `apps/web/src/pages/MatchPage.tsx` - Match page extracting character IDs and passing to Phaser
