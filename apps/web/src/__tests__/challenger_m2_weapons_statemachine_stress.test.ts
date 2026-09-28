import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  type CharacterId,
  type CombatState,
  type FighterBones,
} from '../game/character/Character3DController';

// ============================================================================
// HIERARCHICAL SKELETON GENERATOR
// ============================================================================

interface BoneHierarchyDefinition {
  name: string;
  key: keyof FighterBones;
  parent?: string;
  offset: [number, number, number];
}

const HUMANOID_20_BONE_TREE: BoneHierarchyDefinition[] = [
  { name: 'Root', key: 'root', offset: [0, 0, 0] },
  { name: 'Hips', key: 'hips', parent: 'Root', offset: [0, 0.95, 0] },
  { name: 'Spine', key: 'spine', parent: 'Hips', offset: [0, 0.20, 0] },
  { name: 'Chest', key: 'chest', parent: 'Spine', offset: [0, 0.25, 0] },
  { name: 'Neck', key: 'neck', parent: 'Chest', offset: [0, 0.15, 0] },
  { name: 'Head', key: 'head', parent: 'Neck', offset: [0, 0.15, 0] },

  // Left Arm Chain
  { name: 'Shoulder.L', key: 'shoulderL', parent: 'Chest', offset: [-0.18, 0.10, 0] },
  { name: 'UpperArm.L', key: 'upperArmL', parent: 'Shoulder.L', offset: [-0.12, -0.05, 0] },
  { name: 'Forearm.L', key: 'forearmL', parent: 'UpperArm.L', offset: [0, -0.28, 0] },
  { name: 'Hand.L', key: 'handL', parent: 'Forearm.L', offset: [0, -0.22, 0] },

  // Right Arm Chain
  { name: 'Shoulder.R', key: 'shoulderR', parent: 'Chest', offset: [0.18, 0.10, 0] },
  { name: 'UpperArm.R', key: 'upperArmR', parent: 'Shoulder.R', offset: [0.12, -0.05, 0] },
  { name: 'Forearm.R', key: 'forearmR', parent: 'UpperArm.R', offset: [0, -0.28, 0] },
  { name: 'Hand.R', key: 'handR', parent: 'Forearm.R', offset: [0, -0.22, 0] },

  // Left Leg Chain
  { name: 'Thigh.L', key: 'thighL', parent: 'Hips', offset: [-0.12, -0.10, 0] },
  { name: 'Shin.L', key: 'shinL', parent: 'Thigh.L', offset: [0, -0.45, 0] },
  { name: 'Foot.L', key: 'footL', parent: 'Shin.L', offset: [0, -0.42, 0.08] },

  // Right Leg Chain
  { name: 'Thigh.R', key: 'thighR', parent: 'Hips', offset: [0.12, -0.10, 0] },
  { name: 'Shin.R', key: 'shinR', parent: 'Thigh.R', offset: [0, -0.45, 0] },
  { name: 'Foot.R', key: 'footR', parent: 'Shin.R', offset: [0, -0.42, 0.08] },
];

function buildTestRig(archetype: CharacterId = 'ronin') {
  const scene = new THREE.Group();
  scene.name = `Rig_${archetype}`;

  const boneMap = new Map<string, THREE.Bone>();
  HUMANOID_20_BONE_TREE.forEach((def) => {
    const bone = new THREE.Bone();
    bone.name = def.name;
    bone.position.set(def.offset[0], def.offset[1], def.offset[2]);
    bone.quaternion.identity();
    boneMap.set(def.name, bone);
  });

  HUMANOID_20_BONE_TREE.forEach((def) => {
    const bone = boneMap.get(def.name)!;
    if (def.parent) {
      boneMap.get(def.parent)!.add(bone);
    } else {
      scene.add(bone);
    }
  });

  const meshGeom = new THREE.BoxGeometry(0.5, 1.8, 0.3);
  const meshMat = new THREE.MeshStandardMaterial({
    roughness: 0.15, // Test clamping
    metalness: 0.90, // Test clamping
    emissive: new THREE.Color(CHARACTER_PROFILES[archetype].primaryColor),
    emissiveIntensity: 0.5,
  });
  const mesh = new THREE.Mesh(meshGeom, meshMat);
  scene.add(mesh);

  scene.updateMatrixWorld(true);

  const loader = {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      onLoad({ scene });
    },
  } as any;

  return { scene, boneMap, mesh, loader };
}

// ============================================================================
// EMPIRICAL CHALLENGE SUITE: WEAPONS PBR & STATE MACHINE GIMBAL LOCK HARNESS
// ============================================================================

describe('Empirical Challenge: Signature Weapons LookDev PBR & Combat State Machine', () => {
  const archetypes: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

  describe('1. Signature Weapons LookDev PBR Invariant Challenge', () => {
    archetypes.forEach((archetype) => {
      it(`verifies signature weapon LookDev PBR thresholds are enforced on tracked emissive materials for ${archetype}`, () => {
        const rig = buildTestRig(archetype);
        const fighter = new Character3DFighter(archetype, 'left', rig.loader);

        // Character3DFighter now tracks GLB emissive materials directly in weaponMaterials
        expect(fighter.weaponMaterials.length).toBeGreaterThan(0);

        const maxMetalness = archetype === 'valkyrie' ? 0.45 : 0.30;
        const minRoughness = 0.28;

        fighter.weaponMaterials.forEach((mat) => {
          expect(mat.isMeshStandardMaterial).toBe(true);
          const m = mat as THREE.MeshStandardMaterial;

          // PBR Threshold 1: metalness <= 0.30 (or <= 0.45 for valkyrie)
          expect(m.metalness).toBeLessThanOrEqual(maxMetalness);

          // PBR Threshold 2: roughness >= 0.28
          expect(m.roughness).toBeGreaterThanOrEqual(minRoughness);

          // Emissive check: weapons must have active emissive channel
          expect(m.emissive).toBeDefined();
          expect(m.emissiveIntensity).toBeGreaterThan(0);
        });

        fighter.dispose();
      });
    });

    it('verifies body mesh LookDev PBR clamping preserves thresholds on imported models', () => {
      archetypes.forEach((archetype) => {
        const rig = buildTestRig(archetype);
        const fighter = new Character3DFighter(archetype, 'left', rig.loader);

        const bodyMat = rig.mesh.material as THREE.MeshStandardMaterial;
        const maxMetalness = archetype === 'valkyrie' ? 0.45 : 0.30;

        // The raw model had metalness: 0.90, roughness: 0.15
        // Clamping must enforce metalness <= maxMetalness and roughness >= 0.28 (specifically 0.44)
        expect(bodyMat.metalness).toBeLessThanOrEqual(maxMetalness);
        expect(bodyMat.roughness).toBeGreaterThanOrEqual(0.28);

        fighter.dispose();
      });
    });

    it('prevents duplicate weapon tracking or memory leaks across multiple attach calls', () => {
      const rig = buildTestRig('ronin');
      const fighter = new Character3DFighter('ronin', 'left', rig.loader);

      const initialCount = fighter.weaponMaterials.length;
      expect(initialCount).toBe(1); // GLB emissive material should be tracked

      // Call attachWeaponSockets 5 times
      for (let i = 0; i < 5; i++) {
        fighter.attachWeaponSockets();
      }

      // Tracked materials should remain exactly 1
      expect(fighter.weaponMaterials.length).toBe(initialCount);

      fighter.dispose();
      expect(fighter.weaponMaterials.length).toBe(0);
    });
  });

  describe('2. Combat State Machine Gimbal Lock & Limb Flipping Challenge', () => {
    const states: { name: CombatState; trigger: (f: Character3DFighter) => void; duration: number }[] = [
      { name: 'entrance', trigger: (f) => f.setEntranceProgress(0.5, 'cyber_rooftop'), duration: 1.0 },
      { name: 'idle', trigger: (f) => f.setEntranceProgress(1.0), duration: 1.5 },
      { name: 'jab', trigger: (f) => f.playJab(), duration: 0.34 },
      { name: 'kick', trigger: (f) => f.playKick(), duration: 0.46 },
      { name: 'heavy', trigger: (f) => f.playHeavy(), duration: 0.68 },
      { name: 'hit_light', trigger: (f) => f.playHitLight(), duration: 0.24 },
      { name: 'hit_heavy', trigger: (f) => f.playHitHeavy(), duration: 0.46 },
      { name: 'ko', trigger: (f) => f.playKnockout(), duration: 3.0 },
      { name: 'victory', trigger: (f) => f.playVictory(), duration: 4.0 },
    ];

    archetypes.forEach((archetype) => {
      (['left', 'right'] as const).forEach((side) => {
        it(`verifies continuous smooth rotations and absence of gimbal lock/flipping for ${archetype} [${side}]`, () => {
          const rig = buildTestRig(archetype);
          const fighter = new Character3DFighter(archetype, side, rig.loader);

          states.forEach((action) => {
            action.trigger(fighter);

            const steps = 30; // High resolution sampling
            const dt = action.duration / steps;

            let prevQuats: Map<string, THREE.Quaternion> = new Map();

            for (let step = 0; step <= steps; step++) {
              fighter.update(dt, step * dt);
              rig.scene.updateMatrixWorld(true);

              // Verify each of the 20 bones
              rig.boneMap.forEach((bone, name) => {
                const q = bone.quaternion;

                // 1. No NaN, no Infinity
                expect(Number.isFinite(q.x)).toBe(true);
                expect(Number.isFinite(q.y)).toBe(true);
                expect(Number.isFinite(q.z)).toBe(true);
                expect(Number.isFinite(q.w)).toBe(true);

                // 2. Unit quaternion length
                expect(q.length()).toBeCloseTo(1.0, 3);

                // 3. Angular Continuity / Absence of 180° Limb Flipping:
                // Dot product of consecutive quaternions |q1 · q2| = cos(Δθ / 2).
                // A sudden 180° inversion would result in |q1 · q2| collapsing to 0 or negative.
                if (prevQuats.has(name)) {
                  const prevQ = prevQuats.get(name)!;
                  const dot = Math.abs(q.dot(prevQ));
                  // Smooth angular change per tick: dot product should remain >= 0.70 (Δθ < 90° per 1/30 duration step)
                  expect(dot).toBeGreaterThanOrEqual(0.70);
                }

                prevQuats.set(name, q.clone());
              });

              // Check whole-body meshObject orientation
              const meshRot = fighter.meshObject!.rotation;
              expect(Number.isFinite(meshRot.x)).toBe(true);
              expect(Number.isFinite(meshRot.y)).toBe(true);
              expect(Number.isFinite(meshRot.z)).toBe(true);
              expect(meshRot.order).toBe('YXZ');

              // Roll (Z) must remain zero to avoid roll-over tipping
              expect(meshRot.z).toBe(0);

              // Pitch (X) must remain bounded within [-Math.PI, Math.PI]
              expect(Math.abs(meshRot.x)).toBeLessThanOrEqual(Math.PI);
            }
          });

          fighter.dispose();
        });
      });
    });

    it('verifies KO collapse -90° pitch tilt produces stable floor resting pose without gimbal singularity', () => {
      const rig = buildTestRig('valkyrie');
      const fighter = new Character3DFighter('valkyrie', 'left', rig.loader);

      fighter.setEntranceProgress(1.0);
      fighter.update(0.016, 0);

      fighter.playKnockout();

      // Sample throughout the 3-second KO animation
      for (let t = 0; t <= 3.0; t += 0.1) {
        fighter.update(0.1, t);
        rig.scene.updateMatrixWorld(true);

        const meshRot = fighter.meshObject!.rotation;
        expect(Number.isFinite(meshRot.x)).toBe(true);
        expect(Number.isFinite(meshRot.y)).toBe(true);

        // At end of KO, pitchTilt is approximately -Math.PI / 2.1 (~ -1.496 rad = -85.7°)
        if (t >= 2.0) {
          expect(meshRot.x).toBeCloseTo(-Math.PI / 2.1, 2);
          expect(fighter.meshObject!.position.y).toBeCloseTo(-0.95, 2);
        }

        // Spine and knee buckle checks
        const shinR = rig.boneMap.get('Shin.R')!;
        const shinL = rig.boneMap.get('Shin.L')!;
        expect(shinR.quaternion.length()).toBeCloseTo(1.0, 3);
        expect(shinL.quaternion.length()).toBeCloseTo(1.0, 3);
      }

      fighter.dispose();
    });

    it('verifies facing flip maintains anatomical symmetry without limb inversion', () => {
      archetypes.forEach((archetype) => {
        const rigL = buildTestRig(archetype);
        const rigR = buildTestRig(archetype);

        const fighterL = new Character3DFighter(archetype, 'left', rigL.loader);
        const fighterR = new Character3DFighter(archetype, 'right', rigR.loader);

        fighterL.setEntranceProgress(1.0);
        fighterR.setEntranceProgress(1.0);

        fighterL.update(0.016, 0);
        fighterR.update(0.016, 0);

        expect(fighterL.facingSign).toBe(1);
        expect(fighterR.facingSign).toBe(-1);

        // Facing Y angle: Left faces +X (+PI/2), Right faces -X (-PI/2)
        expect(fighterL.meshObject!.rotation.y).toBeCloseTo(Math.PI / 2, 2);
        expect(fighterR.meshObject!.rotation.y).toBeCloseTo(-Math.PI / 2, 2);

        // Test jab forward extension direction
        fighterL.playJab();
        fighterR.playJab();

        fighterL.update(0.12, 0.12);
        fighterR.update(0.12, 0.12);

        // Left fighter lunges toward +X, Right fighter lunges toward -X
        expect(fighterL.meshObject!.position.x).toBeGreaterThan(0.5);
        expect(fighterR.meshObject!.position.x).toBeLessThan(-0.5);

        // Bone quaternions must remain valid on both sides
        const handL_R = rigL.boneMap.get('Hand.R')!;
        const handR_R = rigR.boneMap.get('Hand.R')!;
        expect(handL_R.quaternion.length()).toBeCloseTo(1.0, 3);
        expect(handR_R.quaternion.length()).toBeCloseTo(1.0, 3);

        fighterL.dispose();
        fighterR.dispose();
      });
    });

    it('survives rapid random combat state fuzzing without state machine lockup', () => {
      const rig = buildTestRig('shinobi');
      const fighter = new Character3DFighter('shinobi', 'left', rig.loader);
      fighter.setEntranceProgress(1.0);

      const actionPool = [
        () => fighter.playJab(),
        () => fighter.playKick(),
        () => fighter.playHeavy(),
        () => fighter.playHitLight(),
        () => fighter.playHitHeavy(),
        () => fighter.playKeystroke(),
        () => fighter.playKnockout(),
        () => fighter.playVictory(),
      ];

      // 300 rapid chaotic transitions
      for (let i = 0; i < 300; i++) {
        const trigger = actionPool[i % actionPool.length];
        trigger();

        const dt = (i % 10) * 0.02 + 0.005;
        fighter.update(dt, i * 0.016);
        rig.scene.updateMatrixWorld(true);

        // State must remain a valid CombatState
        const state = fighter.getState();
        expect(['entrance', 'idle', 'jab', 'kick', 'heavy', 'hit_light', 'hit_heavy', 'ko', 'victory']).toContain(state);

        // All bones must maintain valid transforms
        rig.boneMap.forEach((bone) => {
          expect(Number.isFinite(bone.quaternion.x)).toBe(true);
          expect(bone.quaternion.length()).toBeCloseTo(1.0, 3);
        });
      }

      fighter.dispose();
    });
  });
});
