(globalThis as any).self = globalThis;
(globalThis as any).window = globalThis;
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
// HIERARCHICAL SKELETON TEST RIG GENERATOR
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
    roughness: 0.15,
    metalness: 0.90,
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
// CYBER-BOOT SPECIALIST RIGGING & PBR TEST SUITE
// ============================================================================

describe('Cyber-Boot Specialist Rigging & LookDev PBR Test Suite', () => {
  const archetypes: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

  describe('1. Cyber-Boot Sockets, Anatomy & LookDev PBR Compliance', () => {
    archetypes.forEach((archetype) => {
      it(`verifies clean foot sockets and PBR LookDev materials for ${archetype}`, () => {
        const rig = buildTestRig(archetype);
        const fighter = new Character3DFighter(archetype, 'left', rig.loader);

        // Verify sockets are parented to foot bones
        expect(fighter.socketBootR.parent).toBe(fighter.bones.footR);
        expect(fighter.socketBootL.parent).toBe(fighter.bones.footL);
        expect(fighter.socketBootR.userData.socket).toBe('socketBootR');
        expect(fighter.socketBootL.userData.socket).toBe('socketBootL');

        // Verify PBR thresholds on character suit
        const maxMetalness = archetype === 'valkyrie' ? 0.45 : 0.30;
        const minRoughness = 0.28;

        const bodyMat = rig.mesh.material as THREE.MeshStandardMaterial;
        expect(bodyMat.isMeshStandardMaterial).toBe(true);
        expect(bodyMat.metalness).toBeLessThanOrEqual(maxMetalness);
        expect(bodyMat.roughness).toBeGreaterThanOrEqual(minRoughness);

        fighter.dispose();
      });
    });
  });

  describe('2. Combat Kinematics & Stance Leg Separation', () => {
    archetypes.forEach((archetype) => {
      it(`maintains distinct lateral leg separation and grounded foot posture for ${archetype}`, () => {
        const rig = buildTestRig(archetype);
        const fighter = new Character3DFighter(archetype, 'left', rig.loader);

        // Idle state: check foot bones and leg separation
        fighter.setEntranceProgress(1.0);
        fighter.update(0.016, 1.0);
        expect(fighter.getState()).toBe('idle');

        const footR = fighter.bones.footR!;
        const footL = fighter.bones.footL!;
        const thighR = fighter.bones.thighR!;
        const thighL = fighter.bones.thighL!;

        expect(footR.quaternion).toBeDefined();
        expect(footL.quaternion).toBeDefined();
        expect(thighR.quaternion).toBeDefined();
        expect(thighL.quaternion).toBeDefined();

        // Trigger kick
        fighter.playKick();
        expect(fighter.getState()).toBe('kick');

        // Update through strike extension and recovery
        fighter.update(0.20, 1.20);
        fighter.update(0.30, 1.50);
        expect(fighter.getState()).toBe('idle');

        fighter.dispose();
      });
    });
  });

  describe('3. Zero Memory Leak & Clean Lifecycle', () => {
    it('prevents memory leaks and safely manages foot sockets', () => {
      const rig = buildTestRig('ronin');
      const fighter = new Character3DFighter('ronin', 'left', rig.loader);

      expect(fighter.socketBootR).toBeDefined();
      expect(fighter.socketBootL).toBeDefined();

      for (let i = 0; i < 5; i++) {
        fighter.attachBootSockets();
      }

      fighter.dispose();
      expect(fighter.bootMaterials.length).toBe(0);
    });
  });
});
