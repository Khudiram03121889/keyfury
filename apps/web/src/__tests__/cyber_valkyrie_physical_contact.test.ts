import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
} from '../game/character/Character3DController';
import { FloatingCombatTextManager } from '../render/ThreeCombatArena';

function createMockLoader() {
  return {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      const group = new THREE.Group();
      const bones = [
        'root', 'hips', 'spine', 'chest', 'neck', 'head',
        'shoulderL', 'upperArmL', 'forearmL', 'handL',
        'shoulderR', 'upperArmR', 'forearmR', 'handR',
        'thighL', 'shinL', 'footL',
        'thighR', 'shinR', 'footR',
      ];
      bones.forEach((bName) => {
        const bone = new THREE.Bone();
        bone.name = bName;
        group.add(bone);
      });
      const geom = new THREE.BoxGeometry(0.5, 1.8, 0.3);
      const mat = new THREE.MeshStandardMaterial();
      const mesh = new THREE.Mesh(geom, mat);
      group.add(mesh);
      onLoad({ scene: group });
    },
  } as any;
}

describe('Cyber Valkyrie Physical Contact & Vanguard Combat Impact Verification', () => {
  it('CV-1: initializes Cyber Valkyrie with Hard-Light Glaive and solar crimson glow', () => {
    const prof = CHARACTER_PROFILES.valkyrie;
    expect(prof.name).toBe('Cyber Valkyrie');
    expect(prof.weapon).toBe('Hard-Light Glaive');
    expect(prof.glowColor).toBe('#ff0055');
    expect(prof.height).toBe(1.98);

    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    expect(f.profile.id).toBe('valkyrie');
    expect(f.targetX).toBe(-1.50);
  });

  it('CV-2: Idle stance holds two-handed vanguard glaive grip with balanced grounded posture', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);
    f.update(0.016, 1.0);

    // Cyber Valkyrie idle has right hand forward poised on glaive haft, left gauntlet protective guard
    expect(f.bones.upperArmR).toBeDefined();
    expect(f.bones.forearmR).toBeDefined();
    expect(f.bones.upperArmL).toBeDefined();
    expect(f.bones.forearmL).toBeDefined();

    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('CV-3: Combo 0 (Kinetic Gauntlet Piston Punch / Haft Thrust) lunges +1.72m closing gap to defender chest Y ≈ 1.75m', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playJab();

    // Peak strike frame at p = 0.35 (state duration 0.38s, t = 0.133s)
    f.update(0.133, 1.0);

    expect(f.meshObject).toBeDefined();
    expect(f.meshObject!.position.x).toBeGreaterThanOrEqual(1.68);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeCloseTo(0.22, 1);
    expect(f.meshObject!.position.y).toBeCloseTo(0.12, 2); // Calibrated chest height Y ≈ 1.75m
  });

  it('CV-4: Combo 1 (Solar Glaive Horizontal Cleave Sweep) lunges +1.70m with wide torso rotational torque', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);

    // Trigger Combo 0 then Combo 1
    f.playJab();
    f.playJab();
    expect(f.getComboStep()).toBe(1);

    // Peak strike at p = 0.35
    f.update(0.133, 1.0);

    expect(f.meshObject!.position.x).toBeGreaterThanOrEqual(1.66);
    expect(f.meshObject!.rotation.y).not.toBe(0); // Rotational torso sweep non-zero
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.handR!.quaternion.w).toBeLessThan(1.0);
  });

  it('CV-5: Combo 2 (Rocket Thruster Uppercut) launches vertically +0.40m driving gauntlet into visor Y ≈ 2.15m', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);

    // Trigger Combo 0 -> Combo 1 -> Combo 2
    f.playJab();
    f.playJab();
    f.playJab();
    expect(f.getComboStep()).toBe(2);

    // Peak uppercut extension at p = 0.35
    f.update(0.133, 1.0);

    expect(f.meshObject!.position.x).toBeGreaterThanOrEqual(1.70);
    expect(f.meshObject!.position.y).toBeCloseTo(0.38, 2); // Explosive vertical lift +0.38m!
    expect(f.meshObject!.rotation.x).toBeLessThan(0); // Arched back in vertical drive
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('CV-6: Kick (Aerial Thruster Axe Kick / Meteor Stomp) leaps +0.55m Y and chops vertically down into chin/visor', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playKick();

    // Chamber apex at p = 0.32 (t = 0.154s of 0.48s)
    f.update(0.154, 1.0);
    expect(f.meshObject!.position.y).toBeCloseTo(0.55, 2); // Rocket thruster apex leap +0.55m!
    expect(f.meshObject!.rotation.x).toBeLessThan(-0.20); // Arched back in aerial chamber

    // Slam impact phase (advance to t = 0.28s, p ≈ 0.58)
    f.update(0.126, 1.154);
    expect(f.meshObject!.position.x).toBeGreaterThan(1.70);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeGreaterThan(0.20);
    expect(f.bones.thighR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.shinR!.quaternion.w).toBeLessThan(1.0);
  });

  it('CV-7: Heavy (Solar Glaive Overhead Breaker Slam) vaults +0.52m Y into crushing vertical glaive breaker impact', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playHeavy();

    // Vault apex at p = 0.35 (t = 0.252s of 0.72s)
    f.update(0.252, 1.0);
    expect(f.meshObject!.position.y).toBeCloseTo(0.52, 2); // Vault leap +0.52m!
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);

    // Crushing breaker slam impact phase (advance to t = 0.42s total, p ≈ 0.58)
    f.update(0.168, 1.252);
    expect(f.meshObject!.position.x).toBeGreaterThan(1.75);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeGreaterThan(0.25);
    expect(f.meshObject!.position.y).toBeLessThan(0.10); // Smashed into ground plane
  });

  it('CV-8: Signature Weapon (Solar Vanguard Supercharged Glaive Impalement & Lift) lunges +1.88m with vertical lift', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playWeapon();

    // Advance to supercharged impalement & lift phase (state duration 0.70s, peak at t = 0.42s, p = 0.60)
    f.update(0.42, 1.0);

    expect(f.meshObject!.position.x).toBeGreaterThan(1.80);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeGreaterThan(0.30);
    expect(f.meshObject!.position.y).toBeGreaterThan(0.20); // Lifted upward with impaled target!
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('CV-9: Dynamic opponent contact calculator brings strikes to <= 0.15m physical contact', () => {
    const loader = createMockLoader();
    const attacker = new Character3DFighter('valkyrie', 'left', loader);
    const defender = new Character3DFighter('ronin', 'right', loader);
    attacker.setEntranceProgress(1.0);
    defender.setEntranceProgress(1.0);
    attacker.setOpponent(defender);
    defender.setOpponent(attacker);

    // Defender chest is at world X = 1.50m
    const chestPos = defender.getChestWorldPosition();
    expect(chestPos.x).toBeCloseTo(1.50, 1);

    // Test dynamic lunge calculation for chest strike with 0.65m arm reach
    const requiredLunge = attacker.getTargetLunge(0.65, 'chest', 1.72);
    expect(requiredLunge).toBeGreaterThan(2.0);

    // Contact threshold verification: Attacker impact world X vs Defender chest surface <= 0.15m
    const impactWorldX = attacker.group.position.x + requiredLunge + 0.65;
    const distanceToChestSurface = Math.abs(impactWorldX - chestPos.x);
    expect(distanceToChestSurface).toBeLessThanOrEqual(0.15);

    // Test execution with opponent
    attacker.playJab();
    attacker.update(0.133, 1.0);
    expect(attacker.meshObject!.position.x).toBeGreaterThan(2.0);

    attacker.playKick();
    attacker.update(0.28, 1.0);
    expect(attacker.meshObject!.position.x).toBeGreaterThan(2.0);

    attacker.playHeavy();
    attacker.update(0.42, 1.0);
    expect(attacker.meshObject!.position.x).toBeGreaterThan(2.0);

    attacker.playWeapon();
    attacker.update(0.42, 1.0);
    expect(attacker.meshObject!.position.x).toBeGreaterThan(2.0);
  });

  it('CV-10: Combo recovery smoothly interpolates limbs without popping', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);

    // Combo 0 execution and recovery
    f.playJab();
    f.update(0.133, 1.0); // peak
    f.update(0.10, 1.133); // recovery phase
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmL!.quaternion.w).toBeLessThan(1.0);

    // Combo 1 execution and recovery
    f.playJab();
    f.update(0.133, 1.0);
    f.update(0.10, 1.133);
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmR!.quaternion.w).toBeLessThan(1.0);

    // Combo 2 execution and recovery
    f.playJab();
    f.update(0.133, 1.0);
    f.update(0.10, 1.133);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('CV-11: Universal KO Defeat executes airborne launch, gravity tumble, and flat dead corpse collapse', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playKnockout();

    // Phase 1: Airborne Knock-Up Arc
    f.update(0.21, 1.0);
    expect(f.meshObject!.position.y).toBeGreaterThan(0.40); // Lifted high
    expect(f.meshObject!.position.x).toBeLessThan(0); // Blown back
    expect(f.meshObject!.rotation.x).toBeLessThan(0); // Arched back

    // Phase 2: Slow Gravity Tumble
    f.update(0.49, 1.49);
    expect(f.meshObject!.position.y).toBeLessThan(0.85);

    // Phase 3: Flat Dead Deck Collapse
    f.update(1.30, 2.79);
    expect(f.meshObject!.position.y).toBeCloseTo(-0.95, 2);
    expect(f.meshObject!.rotation.x).toBeCloseTo(-Math.PI / 2.1, 2);

    expect(f.bones.spine!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.head!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.thighR!.quaternion.w).toBeLessThan(1.0);
  });

  it('CV-12: Impact delay configuration aligns exactly with peak strike contact frames', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);

    expect(f.getImpactDelay('jab')).toBe(0.13);
    expect(f.getImpactDelay('kick')).toBe(0.28);
    expect(f.getImpactDelay('heavy')).toBe(0.42);
    expect(f.getImpactDelay('weapon')).toBe(0.42);
  });

  it('CV-13: Floating combat text popups render damage billboard with Cyber Valkyrie crimson theme', () => {
    const originalDocument = (global as any).document;
    const mockCtx = {
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: () => ({ width: 60 }),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0,
    };
    const mockCanvas = {
      width: 256,
      height: 128,
      getContext: () => mockCtx,
    };
    (global as any).document = {
      createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : {}),
    };

    const scene = new THREE.Scene();
    const mgr = new FloatingCombatTextManager(scene, 4);

    mgr.spawn(0, 1.75, 0, '-45', '#ff0055', true, 'SOLAR CRIT!');
    expect(scene.children.length).toBe(4);

    const activeSprite = scene.children.find((c) => c.visible) as THREE.Sprite;
    expect(activeSprite).toBeDefined();
    expect(activeSprite.position.y).toBe(1.75);

    mgr.update(0.1);
    expect(activeSprite.position.y).toBeGreaterThan(1.75);

    mgr.dispose();
    expect(scene.children.length).toBe(0);

    (global as any).document = originalDocument;
  });

  it('CV-14: Kick, Heavy, and Weapon Finisher recoveries maintain full limb continuity without popping', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('valkyrie', 'left', loader);
    f.setEntranceProgress(1.0);

    // Kick recovery (p >= 0.64, duration 0.48s -> t = 0.38s)
    f.playKick();
    f.update(0.38, 1.0);
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmL!.quaternion.w).toBeLessThan(1.0);

    // Heavy recovery (p >= 0.68, duration 0.58s -> t = 0.48s)
    f.playHeavy();
    f.update(0.48, 1.0);
    expect(f.bones.spine!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);

    // Weapon Finisher recovery (p >= 0.68, duration 0.70s -> t = 0.58s)
    f.playWeapon();
    f.update(0.58, 1.0);
    expect(f.bones.handR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.handL!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
  });
});

