import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  type CharacterId,
  type CombatState,
  type FighterBones,
} from '../game/character/Character3DController';

// ============================================================================
// HIERARCHICAL SKELETON BUILDER & SEGMENT INVARIANCE ORACLE
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

interface RiggedSkeletonTestRig {
  scene: THREE.Group;
  boneMap: Map<string, THREE.Bone>;
  localRestPositions: Map<string, THREE.Vector3>;
  restSegmentLengths: Map<string, number>; // childBoneName -> length to parent
  connectedPairs: { childName: string; parentName: string }[];
}

function buildHierarchicalSkeleton(archetype: CharacterId = 'ronin'): RiggedSkeletonTestRig {
  const scene = new THREE.Group();
  scene.name = `BlenderRig_${archetype}`;

  const boneMap = new Map<string, THREE.Bone>();
  const localRestPositions = new Map<string, THREE.Vector3>();
  const restSegmentLengths = new Map<string, number>();
  const connectedPairs: { childName: string; parentName: string }[] = [];

  // Create all bones
  HUMANOID_20_BONE_TREE.forEach((def) => {
    const bone = new THREE.Bone();
    bone.name = def.name;
    bone.position.set(def.offset[0], def.offset[1], def.offset[2]);
    bone.quaternion.identity();
    boneMap.set(def.name, bone);
    localRestPositions.set(def.name, bone.position.clone());
  });

  // Assemble parenting tree
  HUMANOID_20_BONE_TREE.forEach((def) => {
    const bone = boneMap.get(def.name)!;
    if (def.parent) {
      const parentBone = boneMap.get(def.parent)!;
      parentBone.add(bone);
      connectedPairs.push({ childName: def.name, parentName: def.parent });
    } else {
      scene.add(bone);
    }
  });

  // Skinned mesh with materials
  const meshGeom = new THREE.BoxGeometry(0.5, 1.8, 0.3);
  const meshMat = new THREE.MeshStandardMaterial({
    roughness: 0.45,
    metalness: 0.25,
    emissive: new THREE.Color(CHARACTER_PROFILES[archetype].primaryColor),
    emissiveIntensity: 1.0,
  });
  const mesh = new THREE.Mesh(meshGeom, meshMat);
  mesh.name = `BodyMesh_${archetype}`;
  scene.add(mesh);

  // Compute initial rest world transforms and segment lengths
  scene.updateMatrixWorld(true);
  connectedPairs.forEach(({ childName, parentName }) => {
    const child = boneMap.get(childName)!;
    const parent = boneMap.get(parentName)!;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    child.getWorldPosition(p1);
    parent.getWorldPosition(p2);
    const len = p1.distanceTo(p2);
    restSegmentLengths.set(childName, len);
  });

  return { scene, boneMap, localRestPositions, restSegmentLengths, connectedPairs };
}

function createLoaderWithRig(rig: RiggedSkeletonTestRig) {
  return {
    load: (url: string, onLoad: (gltf: any) => void) => {
      onLoad({ scene: rig.scene });
    },
  } as any;
}

// ============================================================================
// EMPIRICAL CHALLENGE SUITE: KINEMATICS & DISLOCATION STRESS HARNESS
// ============================================================================

describe('Empirical Challenger: 20-Bone Skeletal Kinematics & Weapon Sockets Stress', () => {
  const archetypes: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

  describe('1. Challenge Joint Dislocation & Bone Segment Invariance', () => {
    archetypes.forEach((archetype) => {
      (['left', 'right'] as const).forEach((side) => {
        it(`guarantees zero joint dislocation and rigid segment lengths for ${archetype} [${side}] across all combat states`, () => {
          const rig = buildHierarchicalSkeleton(archetype);
          const loader = createLoaderWithRig(rig);
          const fighter = new Character3DFighter(archetype, side, loader);

          // All combat actions to stress-test
          const actions: { name: CombatState; trigger: () => void; duration: number }[] = [
            { name: 'entrance', trigger: () => fighter.setEntranceProgress(0.5, 'cyber_rooftop'), duration: 1.0 },
            { name: 'idle', trigger: () => fighter.setEntranceProgress(1.0), duration: 2.0 },
            { name: 'jab', trigger: () => fighter.playJab(), duration: 0.34 },
            { name: 'kick', trigger: () => fighter.playKick(), duration: 0.46 },
            { name: 'heavy', trigger: () => fighter.playHeavy(), duration: 0.68 },
            { name: 'hit_light', trigger: () => fighter.playHitLight(), duration: 0.24 },
            { name: 'hit_heavy', trigger: () => fighter.playHitHeavy(), duration: 0.46 },
            { name: 'ko', trigger: () => fighter.playKnockout(), duration: 3.0 },
            { name: 'victory', trigger: () => fighter.playVictory(), duration: 4.0 },
          ];

          actions.forEach((action) => {
            action.trigger();
            const stepCount = 15;
            const dt = action.duration / stepCount;

            for (let i = 0; i <= stepCount; i++) {
              fighter.update(dt, i * dt);
              rig.scene.updateMatrixWorld(true);

              // 1. Verify child bone local .position is NEVER mutated (pure rotation)
              rig.boneMap.forEach((bone, boneName) => {
                const restLocalPos = rig.localRestPositions.get(boneName)!;
                expect(bone.position.x).toBeCloseTo(restLocalPos.x, 5);
                expect(bone.position.y).toBeCloseTo(restLocalPos.y, 5);
                expect(bone.position.z).toBeCloseTo(restLocalPos.z, 5);
              });

              // 2. Verify physical world Euclidean distance between joints is strictly invariant
              rig.connectedPairs.forEach(({ childName, parentName }) => {
                const child = rig.boneMap.get(childName)!;
                const parent = rig.boneMap.get(parentName)!;
                const pChild = new THREE.Vector3();
                const pParent = new THREE.Vector3();
                child.getWorldPosition(pChild);
                parent.getWorldPosition(pParent);
                const currentWorldDistance = pChild.distanceTo(pParent);
                const expectedRestDistance = rig.restSegmentLengths.get(childName)!;

                expect(currentWorldDistance).toBeCloseTo(expectedRestDistance, 4);
              });

              // 3. Verify no NaN or Infinity appears in quaternions
              rig.boneMap.forEach((bone) => {
                expect(Number.isFinite(bone.quaternion.x)).toBe(true);
                expect(Number.isFinite(bone.quaternion.y)).toBe(true);
                expect(Number.isFinite(bone.quaternion.z)).toBe(true);
                expect(Number.isFinite(bone.quaternion.w)).toBe(true);
                // Quaternion must be normalized unit length
                expect(bone.quaternion.length()).toBeCloseTo(1.0, 4);
              });
            }
          });

          fighter.dispose();
        });
      });
    });
  });

  describe('2. Challenge Weapon Socket Parenting & Rigidity Under Rapid State Interrupts', () => {
    archetypes.forEach((archetype) => {
      it(`preserves socketWeaponR and socketWeaponL parenting and relative offsets for ${archetype} under chaotic interrupts`, () => {
        const rig = buildHierarchicalSkeleton(archetype);
        const loader = createLoaderWithRig(rig);
        const fighter = new Character3DFighter(archetype, 'left', loader);

        expect(fighter.socketWeaponR).toBeDefined();
        expect(fighter.socketWeaponL).toBeDefined();
        expect(fighter.socketWeaponR.userData.socket).toBe('socketWeaponR');
        expect(fighter.socketWeaponL.userData.socket).toBe('socketWeaponL');
        expect(fighter.socketWeaponR.userData.archetype).toBe(archetype);

        const handR = rig.boneMap.get('Hand.R')!;
        const handL = rig.boneMap.get('Hand.L')!;

        // Sockets must be children of hand bones
        expect(fighter.socketWeaponR.parent).toBe(handR);
        expect(fighter.socketWeaponL.parent).toBe(handL);

        // Record initial local offsets
        const offsetR = fighter.socketWeaponR.position.clone();
        const offsetL = fighter.socketWeaponL.position.clone();

        // Chaotic Rapid State Interrupt Stress: 200 random state interrupts with fractional ticks
        const triggers = [
          () => fighter.playJab(),
          () => fighter.playKick(),
          () => fighter.playHeavy(),
          () => fighter.playHitLight(),
          () => fighter.playHitHeavy(),
          () => fighter.playKeystroke(),
          () => fighter.playVictory(),
          () => fighter.playKnockout(),
          () => fighter.setEntranceProgress(Math.random()),
        ];

        for (let iter = 0; iter < 200; iter++) {
          // Trigger random interrupt
          const pick = triggers[iter % triggers.length];
          pick();

          // Advance with irregular delta time
          const dt = 0.005 + (iter % 7) * 0.008;
          fighter.update(dt, iter * 0.016);
          rig.scene.updateMatrixWorld(true);

          // Sockets must remain strictly parented to Hand.R and Hand.L
          expect(fighter.socketWeaponR.parent).toBe(handR);
          expect(fighter.socketWeaponL.parent).toBe(handL);

          // Local offset of socket relative to hand must remain invariant
          expect(fighter.socketWeaponR.position.x).toBeCloseTo(offsetR.x, 5);
          expect(fighter.socketWeaponR.position.y).toBeCloseTo(offsetR.y, 5);
          expect(fighter.socketWeaponR.position.z).toBeCloseTo(offsetR.z, 5);

          expect(fighter.socketWeaponL.position.x).toBeCloseTo(offsetL.x, 5);
          expect(fighter.socketWeaponL.position.y).toBeCloseTo(offsetL.y, 5);
          expect(fighter.socketWeaponL.position.z).toBeCloseTo(offsetL.z, 5);

          // World distance between hand and socket must exactly match local offset length
          const handRWorld = new THREE.Vector3();
          const sockRWorld = new THREE.Vector3();
          handR.getWorldPosition(handRWorld);
          fighter.socketWeaponR.getWorldPosition(sockRWorld);
          expect(sockRWorld.distanceTo(handRWorld)).toBeCloseTo(offsetR.length(), 4);

          const handLWorld = new THREE.Vector3();
          const sockLWorld = new THREE.Vector3();
          handL.getWorldPosition(handLWorld);
          fighter.socketWeaponL.getWorldPosition(sockLWorld);
          expect(sockLWorld.distanceTo(handLWorld)).toBeCloseTo(offsetL.length(), 4);
        }

        fighter.dispose();
      });
    });
  });

  describe('3. Challenge Keystroke Micro-Lunge Kinematics & Timing Oracle', () => {
    (['left', 'right'] as const).forEach((side) => {
      it(`empirically verifies +0.15m micro-lunge trajectory and facing direction for side [${side}]`, () => {
        const rig = buildHierarchicalSkeleton('ronin');
        const loader = createLoaderWithRig(rig);
        const fighter = new Character3DFighter('ronin', side, loader);

        // Put fighter into idle state
        fighter.setEntranceProgress(1.0);
        fighter.update(0.016, 0.0);

        const expectedFacingSign = side === 'left' ? 1 : -1;
        expect(fighter.facingSign).toBe(expectedFacingSign);

        // Trigger keystroke micro-lunge
        fighter.playKeystroke();

        // Sample through the 0.18s window
        const samples = 18;
        const dt = 0.18 / samples;
        let maxAdvance = 0;
        let peakSignedDisplacement = 0;

        for (let i = 1; i <= samples; i++) {
          fighter.update(dt, i * dt);
          const meshX = fighter.meshObject!.position.x;
          if (Math.abs(meshX) > maxAdvance) {
            maxAdvance = Math.abs(meshX);
            peakSignedDisplacement = meshX;
          }
        }

        // Peak micro-advance must reach approximately 0.15m in the correct facing direction
        expect(maxAdvance).toBeCloseTo(0.15, 2);
        if (expectedFacingSign > 0) {
          expect(peakSignedDisplacement).toBeGreaterThan(0.14);
        } else {
          expect(peakSignedDisplacement).toBeLessThan(-0.14);
        }

        // After window expires (> 0.18s), lunge offset returns to 0
        fighter.update(0.05, 0.25);
        expect(fighter.meshObject!.position.x).toBeCloseTo(0, 4);

        fighter.dispose();
      });
    });
  });

  describe('4. Challenge Weapon Aura Flare & Emissive Scaling Under Input Spam', () => {
    it('intensifies weapon emissive during attacks/keystrokes and dims on knockout', () => {
      const rig = buildHierarchicalSkeleton('valkyrie');
      const loader = createLoaderWithRig(rig);
      const fighter = new Character3DFighter('valkyrie', 'left', loader);
      fighter.setEntranceProgress(1.0);

      // Baseline idle
      fighter.update(0.016, 0.0);
      expect(fighter.weaponMaterials.length).toBeGreaterThan(0);
      const baseMat = fighter.weaponMaterials[0] as THREE.MeshStandardMaterial;
      const baseEmissive = fighter.baseWeaponEmissiveIntensities[0] ?? 1.0;
      expect(baseMat.emissiveIntensity).toBeCloseTo(baseEmissive, 1);

      // Keystroke twitch flare
      fighter.playKeystroke();
      fighter.update(0.001, 0.05); // near peak
      expect(baseMat.emissiveIntensity).toBeGreaterThan(baseEmissive);

      // Attack boost during jab
      fighter.playJab();
      fighter.update(0.01, 0.1);
      expect(baseMat.emissiveIntensity).toBeGreaterThan(baseEmissive);

      // Total dim on knockout
      fighter.playKnockout();
      fighter.update(2.0, 3.0); // well into KO
      expect(baseMat.emissiveIntensity).toBeLessThan(baseEmissive * 0.2);

      fighter.dispose();
    });
  });

  describe('5. Challenge Numerical Robustness: Extreme Delays, Delta Jitters & Multiple Disposals', () => {
    it('survives delta=0, delta=100s, negative delta, and duplicate disposal cleanly', () => {
      const rig = buildHierarchicalSkeleton('void');
      const loader = createLoaderWithRig(rig);
      const fighter = new Character3DFighter('void', 'left', loader);

      // Delta = 0
      expect(() => fighter.update(0, 0)).not.toThrow();

      // Delta = 100s (lag spike)
      fighter.playHeavy();
      expect(() => fighter.update(100.0, 100.0)).not.toThrow();
      expect(fighter.getState()).toBe('idle'); // Should have cleanly settled to idle

      // Negative delta
      expect(() => fighter.update(-1.0, 0)).not.toThrow();

      // Multiple attachWeaponSockets calls
      expect(() => {
        fighter.attachWeaponSockets();
        fighter.attachWeaponSockets();
      }).not.toThrow();

      // Ensure sockets remain unique and correctly parented
      const handR = rig.boneMap.get('Hand.R')!;
      expect(fighter.socketWeaponR.parent).toBe(handR);

      // Multiple dispose calls
      expect(() => {
        fighter.dispose();
        fighter.dispose();
      }).not.toThrow();
    });
  });
});
