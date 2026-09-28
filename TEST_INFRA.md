# KeyFury 3D WebGL Combat Engine — Test Infrastructure Specification

**Document Version**: 1.0.0  
**Target Milestone**: E2E Testing Track (Tiers 1–4)  
**Test Suite Path**: `apps/web/src/__tests__/e2e_3d_combat_tiers.test.ts`  
**Execution Engine**: Vitest v2.1.9 (Headless Node Execution)  
**Total Test Count**: 165 Test Cases (100% Pass Rate)

---

## 1. Executive Summary & Design Philosophy

The KeyFury 3D WebGL Combat Engine test infrastructure provides a requirement-driven, opaque-box verification framework for the Blender-to-Browser 3D arena pipeline, 20-bone humanoid skeletal kinematics, procedural combat state machine, multi-angle camera system, and MatchPage bridge.

### Core Testing Pillars
1. **Opaque-Box Verification**: Tests interact strictly through public module interfaces, component ref handles (`ThreeCombatArenaRef`), and procedural animation controller contracts (`Character3DFighter`), validating behavior and mathematical invariants rather than internal implementation quirks.
2. **Deterministic & Headless**: All 165 test cases execute in headless Node.js without requiring physical GPU hardware or native WebGL contexts, using procedural Three.js mock scene generators and normalized quaternion / vector assertions.
3. **Progressive Testability**: Features are verified both in isolation (Tier 1) and under boundary stress (Tier 2), followed by cross-module pairwise combinations (Tier 3) and full match lifecycle simulations (Tier 4).
4. **Zero Flakiness**: Time progression is deterministic via explicit delta updates (`update(delta, elapsedTotal)`), eliminating timing races and asynchronous flakiness.

---

## 2. 4-Tier Test Architecture Breakdown

```
+-------------------------------------------------------------------------+
|                  4-TIER E2E TEST ARCHITECTURE                            |
+-------------------------------------------------------------------------+
| Tier 1: Feature Coverage (F1 to F15 Isolated Requirements)              |
|         75+ tests covering all 15 PROJECT.md inventory features         |
+-------------------------------------------------------------------------+
| Tier 2: Boundary & Corner Cases (Extreme Inputs & Error Recovery)       |
|         75+ tests covering extreme deltas, numerical limits, spam       |
+-------------------------------------------------------------------------+
| Tier 3: Cross-Feature Combinations (Pairwise Combination Matrix)        |
|         Characters (4x4) x Arenas (4) x Presets (5) x States (7)        |
+-------------------------------------------------------------------------+
| Tier 4: Real-World Application Scenarios (Full Match Duels)             |
|         8 full duel simulations: entrance -> countdown -> combat -> KO  |
+-------------------------------------------------------------------------+
```

### Tier 1: Feature Coverage (75+ Test Cases)
Each feature from `PROJECT.md § Feature Inventory` (F1 to F15) is tested with at least 5 isolated test cases:
- **F1 (WebGL Renderer & LookDev)**: ACES Filmic tone mapping (1.05 exposure), sRGB color space, PCF soft shadow maps, arena sky background, viewport resize aspect ratio update.
- **F2 (3D Arena Pipeline & Studio Lighting)**: 4-point studio rig, ambient intensities (0.65–0.75), key directional shadows (1.10–1.20), fill light (0.45, 0xddeeff), theme-tinted rim lights, raw Blender light stripping.
- **F3 (PBR Material Overrides & Anti-Blowout)**: Roughness clamp (>= 0.28), character suit metalness clamp (<= 0.30/0.45), facade darkening (emissive 0.2), magma/lava calibrations (2.0/2.8), crystal emissives (1.4), volcanic smoke roughness (0.95).
- **F4 (Ground Elevation & Platform Calibration)**: Map-specific floor calibrations (`fighterFloorY`), fighter `baseY` grounding, camera lookAt vertical offsets, over-shoulder chest anchoring, low-angle ground skimming.
- **F5 (20-Bone Humanoid Skeletal Hierarchy)**: Axial bones (Root, Hips, Spine, Chest, Neck, Head), upper appendicular bones (L/R Clavicle, UpperArm, Forearm, Hand), lower appendicular bones (L/R Thigh, Shin, Foot), rest quaternion caching, naming normalization.
- **F6 (Signature Weapons Socketing & FX)**: Shadow Ronin (Katana, cyan), Volt Shinobi (Dual Kunai, amber), Void Assassin (Dual Daggers, purple), Cyber Valkyrie (Glaive, crimson), signature point light aura attachment.
- **F7 (Procedural Martial Combat Animations)**: Idle breathing oscillation, lunging jab (+1.35m), roundhouse snap kick (+1.40m), jumping heavy slam (+0.32m Y, +1.65m X), knockout collapse (-90° tilt, -0.95m drop), victory salute.
- **F8 (Keystroke Micro-Lunges)**: 180ms responsive timer, +0.15m forward lunge along facing direction, spine/chest alert tension, aura intensity jump to 2.6+, smooth decay to rest stance.
- **F9 (Multi-Angle Camera System)**: 5 presets (2.5D Arena, Dynamic Action, Over-Shoulder, Dramatic Low, Aerial Stadium), exponential damping slerp interpolation.
- **F10 (In-Game Camera Switcher UI & Hotkey)**: UI switcher button, `[C]` hotkey listener, linear cycling, direct preset selection by ID, state decoupling from scene re-instantiation.
- **F11 (Map-Specific Cinematic Entrances)**: 4-act timeline (Stage, P1, P2, Standoff), Cyber Rooftop drop-in trajectory (`(1-p)^2 * 2.2`), Volcanic Caldera fissure emergence (`-max(0,(1-p*1.5)*0.8)`), spotlight banners, entrance flair (aura to 3.6).
- **F12 (Synchronized 3-2-1 Countdown)**: Countdown sequence ("3" -> "2" -> "1" -> "FIGHT!"), timing thresholds, `onIntroComplete` callback trigger, instant skip completion.
- **F13 (MatchPage.tsx Bridge & HUD Integration)**: Imperative ref handle (`ThreeCombatArenaRef`), attack dispatches, hit reactions, screen shake scaling (0.20 light/heavy, 0.28 heavy attack, 0.35 KO), zero React re-render overhead.
- **F14 (Performance & Legacy Deactivation)**: Deactivation of legacy Phaser 2D loop, delta clamping (0.1s max), linear screen shake decay, resource disposal (`dispose()`), event listener unmount cleanup.
- **F15 (E2E Testing Suite Integrity)**: Character and arena registries, bone quaternion normalization verification, headless environment execution, 100% contract coverage.

### Tier 2: Boundary & Corner Cases (75+ Test Cases)
Evaluates extreme inputs, invalid states, numerical limits, and rapid user interactions across all 15 features:
- **Canvas & Dimension Extremes**: 0x0 container dimensions, 16000x900 ultra-wide, 900x16000 portrait, WebGL context loss simulation, null container refs.
- **Arena & Lighting Extremes**: Empty, null, and unrecognized arena ID strings, zero ambient intensity, coordinates > 10,000, missing GLTF error recovery.
- **Material Extremes**: Unnamed materials, pre-existing high roughness (0.95), multi-material arrays, meshes without materials, non-mesh hierarchy nodes.
- **Elevation Extremes**: Floor heights at -50.0m, +50.0m, zero floor elevation, lookAt always above floor, dynamic arena floor swapping.
- **Rigging Extremes**: Partial skeletons missing arms, 0-bone empty meshes, non-identity bind pose quaternions, idempotent `resetBones()`, non-bone children filtering.
- **Aura & Weapon Extremes**: Zero aura intensity, 100.0 extreme intensity, relative position anchoring, fallback to Ronin profile on unknown character IDs, capitalization fuzzing.
- **State Machine Extremes**: Rapid state interruptions (jab interrupted by heavy, kick interrupted by hit, attacks overridden by KO), delta = 0, delta = 50.0s.
- **High-Speed Typing Bursts**: 20 keystrokes within 100ms (300+ WPM simulation), negative deltas, keystrokes during active attacks, keystrokes during KO, concurrent typing on both fighters.
- **Camera Interpolation Extremes**: Rapid cycling through all presets 50 times, delta = 0, delta = 10.0s, prevention of singular lookAt matrix, FOV interpolation deadzones.
- **Input & Hotkey Extremes**: Hotkey `C` ignored during entrance sequence, 100 rapid hotkey presses, unmapped keyboard keys ignored, invalid preset IDs, preset preservation across arena swaps.
- **Entrance Trajectory Extremes**: Negative entrance progress clamped to 0, excessive progress (> 1.0) clamped to target mark, idempotent `skipIntro()`, early skip (t=0.1s), late skip (t=7.49s).
- **Countdown Jitter Extremes**: Erratic delta sequences, monotonic progression, nullification of countdown overlay on combat start, zero remaining time handling.
- **Bridge & Ref Extremes**: Ref calls with null fighter instances, unknown attack tiers falling back to heavy, simultaneous attacks from both sides, screen shake stacking cap, simultaneous victory triggers.
- **Resource Disposal Extremes**: 60s tab suspension delta capping, screen shake floor at 0, rapid creation and disposal of 20 fighters, complete scene clearing, renderer disposal.
- **Contract Integrity Extremes**: Bone quaternion finiteness across all angles, null mock scene handling, scale strictly 1.0, height strictly 1.98m, test execution order independence.

### Tier 3: Cross-Feature Combinations (Pairwise Matrix)
- **All 16 Character Matchups**: Complete 4x4 pairwise matrix (including mirror matches: Ronin vs Ronin, Valkyrie vs Valkyrie) verifying facing orientation (+1 vs -1) and non-overlapping positioning.
- **All 16 Character-Arena Combinations**: All 4 characters grounded across all 4 arena platforms (`cyber_rooftop`, `volcanic_caldera`, `celestial_void`, `highland_sanctuary`).
- **All 20 Arena-Camera Combinations**: All 4 arenas evaluated across all 5 camera presets verifying valid coordinates and FOV limits.
- **All 28 Character-State Combinations**: All 4 characters evaluated across all combat states (jab, kick, heavy, hit_light, hit_heavy, ko, victory) ensuring zero NaN/Infinity coordinates.
- **Cross-Feature Interactivity**: Camera switching during active attacks on specific maps (e.g. switching to Low Angle during a heavy cleave on Volcanic Caldera).
- **Facing Direction Inversion**: Mathematical verification of symmetric mirrored strike translations (+X for left fighter, -X for right fighter).

### Tier 4: Real-World Application Scenarios (8 Full Match Duels)
- **T4.1 (Cyber Neon Rooftop — Ronin vs Shinobi)**: Rooftop drop-in -> countdown -> typing micro-lunges -> heavy slam -> recoil -> KO collapse -> victory pose.
- **T4.2 (Volcanic Caldera Core — Valkyrie vs Void)**: Molten fissure emergence -> 150 WPM typing burst -> roundhouse kick counter -> heavy cleave KO -> victory salute.
- **T4.3 (Celestial Void Shrine — Ronin vs Void)**: Astral vortex glide -> dramatic low camera switch -> mutual jab trade -> heavy slash KO.
- **T4.4 (Highland Sanctuary — Rapid Camera Combo)**: Jab in Dynamic -> Kick in Over-Shoulder -> Heavy in Low-Angle on Highland plateau.
- **T4.5 (Bot Match Simulation via MatchPage Bridge)**: P1 typing stream -> P2 bot cadence -> health trade -> KO trigger -> victory trigger -> post-match state persistence.
- **T4.6 (Instant Intro Skip Duel)**: User presses Space/Enter at t=0.05s -> instant snap to combat positions -> immediate attack execution.
- **T4.7 (60 FPS Frame-by-Frame Simulation)**: 60 continuous frames (16.6ms intervals) asserting numerical finiteness and continuity across all bones and mesh translations.
- **T4.8 (Asymmetric Knockout & Match Reset)**: Heavy attack -> heavy hit -> KO collapse -> full scene disposal -> clean rematch instantiation at wings.

---

## 3. Verification & Execution Commands

### Run the Complete 4-Tier Suite
```bash
npx vitest run apps/web/src/__tests__/e2e_3d_combat_tiers.test.ts
```

### Run All Test Suites across Web Workspace
```bash
cd apps/web && npx vitest run
```

---

## 4. Test Metric Summary
- **Total Test Cases**: 165
- **Pass Rate**: 100% (165 passed, 0 failed)
- **Execution Time**: ~238ms (tests execution) / ~7.39s (full process lifecycle)
- **Memory Leaks**: 0 (verified through repeated disposal and scene clear cycles)
- **Implementation Code Modifications**: 0 (strictly opaque-box test code)
