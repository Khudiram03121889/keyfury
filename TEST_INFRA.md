# KeyFury Testing Infrastructure Specification
## Opaque-Box E2E Testing Suite for 2D Character Roster System

---

## 1. Executive Summary & Architecture

KeyFury is a real-time 1v1 cyberpunk typing combat duel built across a TypeScript monorepo (`packages/game-core`, `packages/protocol`, `apps/game-server`, `apps/web`). This document defines the testing architecture, methodology, and verification framework for the **2D Character Roster System**, covering all 15 features across 4 testing tiers.

### Core Objectives
1. **Opaque-Box Verification**: Validate all features through public interface contracts and observable state transitions without relying on internal implementation private variables.
2. **4-Tier Test Case Design Methodology**:
   - **Tier 1**: Feature Coverage (Happy Path for F1 through F15, $\ge 5$ test cases per feature).
   - **Tier 2**: Boundary, Corner & Adversarial Cases (Edge conditions, fallbacks, malformed inputs, $\ge 5$ test cases per feature).
   - **Tier 3**: Cross-Feature Combinations (Pairwise and multi-module integration pipelines).
   - **Tier 4**: Real-World Application Scenarios ($\ge 5$ end-to-end full user journey simulations).
3. **Deterministic & Isolated Execution**: Zero global side effects, hermetic mocks for browser APIs (`localStorage`, `CanvasRenderingContext2D`, `Phaser.GameObjects.Graphics`, `AudioContext`), and sub-millisecond execution speeds under Vitest.

---

## 2. 4-Tier Test Case Design Methodology

```
+-------------------------------------------------------------------------+
|                  TIER 4: REAL-WORLD APPLICATION SCENARIOS               |
|      Full User Journeys: Onboarding -> Champion Swap -> Quick Match ->   |
|         Bot Practice -> Heavy Strike VFX -> KO Ragdoll Victory          |
+-------------------------------------------------------------------------+
                                    ^
+-------------------------------------------------------------------------+
|                 TIER 3: CROSS-FEATURE INTEGRATION FLOWS                 |
|   Modal UI (F5) -> Storage (F8) -> Lobby Badge (F7) -> Protocol (F12)   |
|      -> Matchmaking (F13) -> Arena Ingestion (F14) -> Rigs & VFX (F9,11)|
+-------------------------------------------------------------------------+
                                    ^
+-------------------------------------------------------------------------+
|               TIER 2: BOUNDARY, CORNER & ADVERSARIAL CASES              |
|  Null/Undefined fallbacks, Proto Pollution, Stat Bounds [1-10], Malformed|
|    IDs, Extreme Particle Pools, Storage Quotas, Rapid Champion Spam    |
+-------------------------------------------------------------------------+
                                    ^
+-------------------------------------------------------------------------+
|                   TIER 1: PRIMARY FEATURE COVERAGE                      |
|  F1-F15 Happy Path Validation: Fighter Definitions, Registry API, SVGs, |
|    IK Solvers, Modular Rigs, Particle Bursts, Colyseus Rooms, Bot AI    |
+-------------------------------------------------------------------------+
```

---

## 3. Feature Inventory & Coverage Matrix (F1 to F15)

| # | Feature Code | Feature Description | Tier 1 Tests | Tier 2 Tests | Tier 3 Integration | Tier 4 Journey |
|---|--------------|---------------------|--------------|--------------|--------------------|----------------|
| **F1** | `CORE_FIGHTERS` | 4 Core Fighter Definitions (`shadow_ronin`, `cyber_valkyrie`, `volt_shinobi`, `void_assassin`) | 5 | 5 | Yes | Journeys 1-5 |
| **F2** | `REGISTRY_API` | Character Registry & Lookup API (`getCharacterDefinition`, `getAllCharacters`, `isValidCharacterId`) | 5 | 5 | Yes | Journeys 1-5 |
| **F3** | `SVG_ASSETS` | High-Resolution SVG Portrait Assets (512x512 vector art & asset mapping) | 5 | 5 | Yes | Journeys 1, 2 |
| **F4** | `REGISTRY_TESTS` | Character Registry Unit Tests & Verification | 5 | 5 | Yes | Journeys 1-5 |
| **F5** | `SELECT_MODAL` | Character Select Modal UI (Carousel, Stats Radar, Badges, Glow Borders) | 5 | 5 | Yes (Pair 1) | Journeys 1, 4 |
| **F6** | `STRIKE_AUDIO` | Live Strike Preview Animation & Procedural Audio Feedback | 5 | 5 | Yes (Pair 9) | Journeys 1, 3 |
| **F7** | `LOBBY_BADGE` | Active Champion Lobby Integration Banner & Quick Swap Modal Launcher | 5 | 5 | Yes (Pair 2, 3) | Journeys 1, 4 |
| **F8** | `STORAGE_STATE`| Local Storage & User Profile State Persistence (`keyfury_selected_character`) | 5 | 5 | Yes (Pair 1, 2) | Journeys 1, 4 |
| **F9** | `MODULAR_RIGS` | Modular 2D Skeletal Rigs & Shaded Vector Meshes (Helmets, Pauldrons, Gauntlets) | 5 | 5 | Yes (Pair 6) | Journeys 2, 3, 5 |
| **F10**| `COMBAT_CORE` | 100% Combat Mechanics Preservation (`solve2BoneIK`, `solveSpineCurve`, Hitboxes, Ragdoll) | 5 | 5 | Yes (Pair 7, 10)| Journeys 2, 3, 5 |
| **F11**| `ELEMENTAL_VFX`| Elemental Particle VFX via ObjectPool (Azure, Crimson, Gold Lightning, Void) | 5 | 5 | Yes (Pair 8, 9) | Journeys 2, 3, 5 |
| **F12**| `PROTOCOL_SYNC`| Protocol & Server Room State Sync (`characterId` in snapshot & queue options) | 5 | 5 | Yes (Pair 3, 4) | Journeys 2, 4 |
| **F13**| `MATCHMAKING` | Multiplayer Matchmaking & AI Bot Character Assignment | 5 | 5 | Yes (Pair 4) | Journeys 2, 3, 4 |
| **F14**| `ARENA_INGEST` | Match Arena Character Skin Ingestion (`MatchPage` -> `StickFightScene`) | 5 | 5 | Yes (Pair 5, 6) | Journeys 2, 3, 5 |
| **F15**| `E2E_SUITE` | End-to-End Test Suite & TypeScript Verification | 5 | 5 | Yes (All) | Journeys 1-5 |
| **TOTAL** | | | **75 Tests** | **75 Tests** | **10 Pairs** | **5 Journeys** |

**Grand Total Test Cases**: **165+ Test Cases** across the unified test suite.

---

## 4. Test Suite Implementation Structure

The test suite is structured into clean modular specifications running under Vitest:

1. `tests/e2e/character-roster.test.ts`: Root E2E entry point covering Tiers 1-4 across all layers.
2. `packages/game-core/tests/character_roster_e2e.test.ts`: Core game engine, registry, IK math, and physics tests.
3. `apps/web/src/__tests__/character_roster_e2e.test.ts`: Frontend UI state, storage persistence, particle pooling, and skin ingestion.

### Execution Commands
```bash
# Run the complete character roster E2E suite
npx vitest run tests/e2e/character-roster.test.ts

# Run all test suites across the monorepo
pnpm test
```

---

## 5. Mock & Test Harness Architecture

### 1. Web Storage Mock
Hermetic in-memory `Storage` implementation supporting `getItem`, `setItem`, `removeItem`, `clear`, quota error simulation, and cross-tab storage event dispatching.

### 2. Audio & SoundSynth Mock
Procedural synthesizer test spy validating correct frequency, duration, and waveform triggers for Katana slashes, Crimson gauntlet impacts, Lightning sparks, and Void daggers without requiring hardware sound devices.

### 3. Vector Canvas & Phaser Graphics Mock
Lightweight 2D graphics spy tracking `lineStyle`, `fillStyle`, `beginPath`, `lineTo`, and `strokePath` calls to verify modular gear attachment coordinates and palette applications.

### 4. Colyseus Protocol & Room Simulation
Synchronous state machine mocking `CombatRoom` and `DuelRoom` state snapshots, client joins, player options parsing, and bot opponent skin assignments.
