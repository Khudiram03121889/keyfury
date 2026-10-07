import { describe, it } from 'vitest';
import * as THREE from 'three';
import { Character3DFighter } from '../game/character/Character3DController';

describe('Inspect Kick Pose Bones', () => {
  it('inspects bones during kick', () => {
    const group = new THREE.Group();
    const boneNames = [
      'root', 'hips', 'spine', 'chest', 'neck', 'head',
      'shoulderL', 'upperArmL', 'forearmL', 'handL',
      'shoulderR', 'upperArmR', 'forearmR', 'handR',
      'thighL', 'shinL', 'footL',
      'thighR', 'shinR', 'footR',
    ];
    const bones: Record<string, THREE.Bone> = {};
    boneNames.forEach((bName) => {
      const bone = new THREE.Bone();
      bone.name = bName;
      bones[bName] = bone;
      group.add(bone);
    });

    const mockLoader = {
      load: (_url: string, onLoad: (gltf: any) => void) => {
        onLoad({ scene: group });
      },
    } as any;

    const f = new Character3DFighter('valkyrie', 'left', mockLoader);
    f.setEntranceProgress(1.0);
    f.update(0.016, 1.0); // idle

    console.log('--- IDLE BONES ---');
    console.log('head rot:', f.bones.head?.rotation);
    console.log('chest rot:', f.bones.chest?.rotation);
    console.log('neck rot:', f.bones.neck?.rotation);

    f.playKick();
    f.update(0.25, 1.0); // peak kick frame

    console.log('--- KICK FRAME (t=0.25) ---');
    console.log('head rot:', f.bones.head?.rotation);
    console.log('neck rot:', f.bones.neck?.rotation);
    console.log('chest rot:', f.bones.chest?.rotation);
    console.log('spine rot:', f.bones.spine?.rotation);
    console.log('thighR rot:', f.bones.thighR?.rotation);
    console.log('shinR rot:', f.bones.shinR?.rotation);
    console.log('meshObject rot:', f.meshObject?.rotation);
    console.log('meshObject pos:', f.meshObject?.position);
  });
});
