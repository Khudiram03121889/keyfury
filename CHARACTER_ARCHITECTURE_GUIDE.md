# KeyFury Character Architecture & Mechanics Guide

This document provides a comprehensive technical breakdown of how characters are designed, structured, rigged, animated, and simulated across the entire **KeyFury** codebase.

---

## 1. High-Level System Overview

KeyFury uses a **Hybrid Modular Skeletal Pipeline**:
* **Visuals** are rendered on the frontend using Phaser 3 WebGL with textured modular quads.
* **Movement & Attack Kinematics** (punches, kicks, weapon swings) are solved procedurally using **2-Bone Inverse Kinematics (IK)** in `@keyfury/game-core`.
* **Combat Validation** runs authoritatively on the Node.js/Colyseus server to ensure fairness and prevent tampering.

```mermaid
flowchart TD
    subgraph Frontend ["apps/web (Client)"]
        UI[React UI / Keystroke Input]
        Atlas[Modular Texture Atlas (PNG + JSON)]
        RigRenderer[CharacterRigRenderer.ts]
        PhaserCanvas[Phaser 3 WebGL Scene]
    end

    subgraph CoreEngine ["packages/game-core (Shared)"]
        Registry[CharacterRegistry.ts]
        IK[IKSystem.ts (2-Bone IK)]
        Moves[MoveSetManager.ts]
        Hitbox[HitboxManager.ts (OBB CCD)]
        Ragdoll[RagdollSystem.ts (Verlet Physics)]
    end

    subgraph Backend ["apps/game-server (Server)"]
        ColyseusRoom[CombatRoom.ts]
        StateSync[Binary State Sync (@colyseus/schema)]
        DB[(Supabase Match Persistence)]
    end

    UI -->|Keystroke & Moves| ColyseusRoom
    ColyseusRoom -->|Validate with| CoreEngine
    ColyseusRoom -->|Broadcast State| StateSync
    StateSync -->|Receive Coordinates & State| RigRenderer
    Atlas --> RigRenderer
    IK --> RigRenderer
    RigRenderer --> PhaserCanvas
    ColyseusRoom --> DB
```

---

## 2. Character Roster & Archetype Definitions

Characters are defined in `packages/game-core/src/characters/CharacterRegistry.ts`.

Each character archetype defines base stats, signature weapons, primary colors, and elemental attributes:

| Character | Class / Archetype | Signature Weapon | Elemental Affinity | Key Attribute |
| :--- | :--- | :--- | :--- | :--- |
| **Shadow Ronin (Kage)** | Balanced Cyber-Samurai | Azure Plasma Katana | Plasma / Cyan (`#00f0ff`) | High range, fluid combo flow |
| **Volt Shinobi (Raijin)** | Agility Cyber-Ninja | Lightning Kunai | Electric / Amber (`#ffbe0b`) | Rapid startup, high speed |
| **Void Assassin (Nyx)** | Burst Void Stalker | Dual Void Daggers | Void / Amethyst (`#b5179e`) | Critical damage, stealth strike |
| **Cyber Valkyrie (Freya)** | Heavy Vanguard | Hard-Light Glaive | Light / Gold (`#ff0055`) | Heavy stagger, defensive reach |

---

## 3. Visual Asset & Texture Atlas Pipeline

Character textures reside under `apps/web/public/assets/characters/<characterId>/`:
* `atlas.png`: High-resolution sprite sheet containing individual body parts.
* `atlas.json`: Metadata defining slice coordinates and rotation pivot points.

### Anatomical Slices (14–19 parts per fighter)
1. **Head & Visor**: Helm, cybernetic HUD, eyes.
2. **Torso & Waist**: Upper chest cuirass, abdomen, pelvis.
3. **Limbs (Lead & Rear separated)**:
   - Upper Arm (Shoulder $\to$ Elbow)
   - Forearm (Elbow $\to$ Wrist)
   - Gauntlet / Hand
   - Thigh (Hip $\to$ Knee)
   - Shin (Knee $\to$ Ankle)
   - Boot / Greave
4. **Signature Weapons**: Weapon base quad + Additive glow quad.
5. **Flowing Accessories**: Dynamic scarves, capes, ribbons.

### Concentric Joint Cap Geometry
To prevent gaps or seams when limbs rotate at extreme angles, each limb segment is authored with a circular joint cap whose pivot is set to `(0.5, 0.15)`.

---

## 4. Skeletal Rigging & Inverse Kinematics (IK)

Rather than rigid frame-by-frame sprite sheets, the character limbs bend dynamically using analytical geometry:

### A. Analytical 2-Bone IK (`packages/game-core/src/physics/IKSystem.ts`)
Given a root position (Shoulder/Hip) and a target end-effector position (Hand/Foot):
1. Calculates the straight-line distance $D$ to the target.
2. Clamps $D$ to maximum arm/leg reach: $L_{\text{max}} = L_1 + L_2$.
3. Uses the **Law of Cosines** to calculate interior angles:
   $$\cos(\alpha) = \frac{L_1^2 + D^2 - L_2^2}{2 L_1 D}$$
   $$\cos(\beta) = \frac{L_1^2 + L_2^2 - D^2}{2 L_1 L_2}$$
4. Applies bend direction constraints (e.g., human knees only bend backward, elbows bend inward).

### B. 20-Layer Z-Ordering Matrix (`apps/web/src/game/character/CharacterRigRenderer.ts`)
Fighters render across 20 strict depth layers to ensure natural perspective:

```
[Back]
Layer 00-03: Rear Leg (Thigh -> Shin -> Boot)
Layer 04-06: Rear Arm (Upper -> Forearm -> Hand)
Layer 07-09: Torso & Head (Pelvis -> Chest -> Head/Visor)
Layer 10-12: Lead Leg (Thigh -> Shin -> Boot)
Layer 13-15: Lead Arm (Upper -> Forearm -> Hand)
Layer 16-17: Primary Weapon (Base Sprite)
Layer 18-19: Weapon Plasma Glow & FX (Phaser.BlendModes.ADD)
[Front]
```

---

## 5. Combat Mechanics & Move Execution

Every combat action in KeyFury is tied directly to typing input:

### Move Tiers & Frame Data (`packages/game-core/src/combat/MoveSetManager.ts`)

| Action | Word Length | Base Damage | Startup Frames | Active Frames | Recovery | Pushback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Jab** | 2–4 letters | 5 HP | 3 frames | 2 frames | 4 frames | Minimal |
| **Kick** | 5–7 letters | 8 HP | 6 frames | 3 frames | 7 frames | Medium |
| **Heavy Strike** | 8+ letters | 12 HP | 10 frames | 4 frames | 12 frames | Large |
| **Special / Finisher** | Metric word combo | 20+ HP | 14 frames | 6 frames | 18 frames | Knockdown |

### Hitboxes & Collision Detection (`packages/game-core/src/combat/HitboxManager.ts`)
* Attacks generate **Oriented Bounding Boxes (OBBs)** along weapon blades and striking limbs.
* Uses **Continuous Collision Detection (CCD)**: Computes swept volumes between frames to guarantee attacks never tunnel through opponent hurtboxes during high-speed lunges.

---

## 6. Knockout & Ragdoll Physics

When a fighter's HP reaches 0, the modular skeletal rig is handed off to `packages/game-core/src/physics/RagdollSystem.ts`:

1. **Verlet Integration**: Each joint point is simulated as a point mass subject to gravity:
   $$x_{n+1} = 2x_n - x_{n-1} + a \cdot \Delta t^2$$
2. **Distance Constraints**: Bones maintain fixed lengths through iterative relaxation passes.
3. **Impulse Transfer**: The final hit's impact velocity is transferred directly to the corresponding bone (e.g., a high kick imparts upward/rearward force to the head and torso).
4. **Arena Boundaries**: Point masses collide against arena floors and boundary walls with restitution bounce factors.

---

## 7. Client-Server Synchronization Flow

1. **Player Types Input**: The web client captures keystrokes and validates them against the target word stream generated deterministically by `packages/game-core/src/deck.ts`.
2. **Action Dispatch**: The client sends the word completion message to the Colyseus `CombatRoom`.
3. **Server Verification**: The server verifies word accuracy, cooldowns, and timing.
4. **State Broadcast**: The server updates the synchronized game state schema (`PlayerState`, `CombatState`, `HP`, `ComboMultiplier`).
5. **Client Render**: Phaser 3 receives the state, computes 2-Bone IK targets, adjusts visual bone transforms, and triggers elemental particle emitters and camera shake.
6. **Persistence**: At duel conclusion, the server records the final score, WPM, accuracy, and ELO update to Supabase.
