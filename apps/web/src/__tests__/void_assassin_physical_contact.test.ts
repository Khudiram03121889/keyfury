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

describe('Void Assassin (Nyx) Physical Contact & Combat Impact Verification', () => {
  it('VA-1: initializes Void Assassin with Dual Void Daggers and amethyst glow', () => {
    const prof = CHARACTER_PROFILES.void;
    expect(prof.name).toBe('Void Assassin');
    expect(prof.weapon).toBe('Dual Void Daggers');
    expect(prof.glowColor).toBe('#b5179e');

    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    expect(f.profile.id).toBe('void');
    expect(f.targetX).toBe(-1.50);
  });

  it('VA-2: Idle stance holds dual stiletto forward & reverse guard with ethereal drift', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.update(0.016, 1.0);

    // Void Assassin idle has right hand forward poised, left hand reverse-grip
    expect(f.bones.upperArmR).toBeDefined();
    expect(f.bones.forearmL).toBeDefined();
    // Arm bones should be rotated into dual stiletto guard
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.forearmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('VA-3: Jab combo 0 (Heart Thrust) lunges +1.72m closing 3.0m gap directly to defender', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playJab();

    // Peak strike frame at p ~= 0.35 (state duration ~= 0.34s, delta ~= 0.119s)
    f.update(0.119, 1.0);

    // Started at -1.50, local lungeOffset is >= 1.68m, reaching world X >= 0.18m into defender
    expect(f.meshObject).toBeDefined();
    expect(f.meshObject!.position.x).toBeGreaterThanOrEqual(1.67);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeCloseTo(0.18, 2);
    expect(worldX).toBeLessThan(0.35);
  });

  it('VA-4: Kick (Void Crescent Rift Whip) lunges +1.74m reaching defender chin/visor at Y = 1.62m', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playKick();

    // Advance to peak of whip kick extension (state duration 0.46s, peak at t ~= 0.29s, p ~= 0.63)
    f.update(0.29, 1.0);

    // Mesh local position x reflects 1.74m lunge, world X reaches > 0.20m
    expect(f.meshObject!.position.x).toBeGreaterThan(1.70);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeGreaterThan(0.20);

    // Foot reaches high chamber / whip angle
    expect(f.bones.thighR).toBeDefined();
    expect(f.bones.thighR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.shinR!.quaternion.w).toBeLessThan(1.0);
  });

  it('VA-5: Heavy (Abyssal Rift Plunge) leaps +0.55m Y into +1.78m downward chest plunge', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playHeavy();

    // Leap phase (t = 0.22s, p ~= 0.33 of 0.66s): airborne leap Y > 0.45m
    f.update(0.22, 1.0);
    expect(f.meshObject!.position.y).toBeGreaterThan(0.45);

    // Downward plunge impact phase (advance to t ~= 0.44s total, p ~= 0.66)
    f.update(0.22, 1.22);
    expect(f.meshObject!.position.x).toBeGreaterThan(1.72);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeGreaterThan(0.24);
    expect(f.meshObject!.position.y).toBeLessThan(0.10);
  });

  it('VA-6: Signature Weapon (Dimensional Execution: Blink Guillotine) lunges +1.82m in twin scissor X-slice', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playWeapon();

    // Advance to twin scissor slice phase (state duration 0.64s, peak at t = 0.43s, p ~= 0.67)
    f.update(0.43, 1.0);

    // Maximum forward blink lunge +1.82m reaches world X > 0.28m
    expect(f.meshObject!.position.x).toBeGreaterThan(1.78);
    const worldX = f.group.position.x + f.meshObject!.position.x;
    expect(worldX).toBeGreaterThan(0.28);

    // Arms crossed in scissor formation
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('VA-7: FloatingCombatTextManager spawns billboard sprites with damage and crit text', () => {
    const originalDocument = (global as any).document;
    const mockCtx = {
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: () => ({ width: 50 }),
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

    mgr.spawn(0, 1.5, 0, '-28', '#b5179e', true, 'CRIT!');
    expect(scene.children.length).toBe(4);

    const activeSprite = scene.children.find((c) => c.visible) as THREE.Sprite;
    expect(activeSprite).toBeDefined();
    expect(activeSprite.position.y).toBe(1.5);

    // Update step moves text upward
    mgr.update(0.1);
    expect(activeSprite.position.y).toBeGreaterThan(1.5);

    mgr.dispose();
    expect(scene.children.length).toBe(0);

    (global as any).document = originalDocument;
  });

  it('VA-8: Dynamic opponent contact calculator adapts lunge to close gap to opponent', () => {
    const loader = createMockLoader();
    const f1 = new Character3DFighter('void', 'left', loader);
    const f2 = new Character3DFighter('ronin', 'right', loader);
    f1.setEntranceProgress(1.0);
    f2.setEntranceProgress(1.0);
    f1.setOpponent(f2);
    f2.setOpponent(f1);

    // Initial gap between fighters is 3.0m (-1.50 to +1.50)
    expect(f1.group.position.x).toBe(-1.50);
    expect(f2.group.position.x).toBe(1.50);

    // Dynamic lunge for chest strike with 0.65m arm reach
    const requiredLunge = f1.getTargetLunge(0.65, 'chest', 1.72);
    expect(requiredLunge).toBeGreaterThan(2.0);

    // Test jab execution with opponent
    f1.playJab();
    f1.update(0.13, 1.0);
    expect(f1.meshObject!.position.x).toBeGreaterThan(2.0);

    // Test kick execution with opponent
    f1.playKick();
    f1.update(0.25, 1.0);
    expect(f1.meshObject!.position.x).toBeGreaterThan(1.9);

    // Test heavy dive plunge execution with opponent
    f1.playHeavy();
    f1.update(0.42, 1.0);
    expect(f1.meshObject!.position.x).toBeGreaterThan(2.0);

    // Test weapon scissor execution with opponent
    f1.playWeapon();
    f1.update(0.40, 1.0);
    expect(f1.meshObject!.position.x).toBeGreaterThan(2.0);
  });

  it('VA-9: Combo 1 (Low-to-high double throat puncture) and Combo 2 (Phantom blink double palm-stiletto) articulate distinct stiletto kinematics', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);

    // Trigger Combo 0
    f.playJab();
    expect(f.getComboStep()).toBe(0);

    // Trigger Combo 1 within reset timer
    f.playJab();
    expect(f.getComboStep()).toBe(1);
    // Peak frame at p ~= 0.35 (t = 0.119s)
    f.update(0.119, 1.0);
    expect(f.bones.handL).toBeDefined();
    // Hand L rotated upward for low-to-high throat puncture
    expect(f.bones.handL!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);

    // Advance to reset and trigger Combo 2
    f.playJab();
    expect(f.getComboStep()).toBe(2);
    f.update(0.119, 1.0);
    // Symmetrical forward extension for phantom blink double palm-stiletto strike
    expect(f.bones.upperArmR!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('VA-10: Universal KO Defeat executes Phase 1 airborne launch, Phase 2 gravity tumble, and Phase 3 flat dead corpse collapse', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playKnockout();

    // Phase 1: Airborne Knock-Up Arc (e.g. t = 0.21s, p = 0.07 of 3.0s)
    f.update(0.21, 1.0);
    expect(f.meshObject!.position.y).toBeGreaterThan(0.40); // Lifted high into the air
    expect(f.meshObject!.position.x).toBeLessThan(0); // Blown backward
    expect(f.meshObject!.rotation.x).toBeLessThan(0); // Arched back in mid-air shock

    // Phase 2: Slow Gravity Tumble (e.g. t = 0.70s, p = 0.23)
    f.update(0.49, 1.49);
    // Falling back down under gravity towards the deck
    expect(f.meshObject!.position.y).toBeLessThan(0.85);

    // Phase 3: Flat Dead Deck Collapse (e.g. t = 2.0s, p = 0.67)
    f.update(1.30, 2.79);
    expect(f.meshObject!.position.y).toBeCloseTo(-0.95, 2); // Slam flat onto deck surface
    expect(f.meshObject!.rotation.x).toBeCloseTo(-Math.PI / 2.1, 2); // Motionless horizontal corpse on back

    // Bones lie completely limp and flat along the ground
    expect(f.bones.spine!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.head!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.thighR!.quaternion.w).toBeLessThan(1.0);
  });

  it('VA-11: Universal KO Defeat Animation behaves identically across all 4 characters (Ronin, Shinobi, Valkyrie, Void Assassin)', () => {
    const loader = createMockLoader();
    const characters: Array<'ronin' | 'shinobi' | 'valkyrie' | 'void'> = ['ronin', 'shinobi', 'valkyrie', 'void'];

    characters.forEach((charId) => {
      const f = new Character3DFighter(charId, 'left', loader);
      f.setEntranceProgress(1.0);
      f.playKnockout();

      // Check Phase 1: Air launch
      f.update(0.21, 1.0);
      expect(f.meshObject!.position.y, `${charId} must launch airborne in Phase 1`).toBeGreaterThan(0.40);

      // Check Phase 3: Flat dead deck collapse at t = 2.0s
      f.update(1.79, 2.79);
      expect(f.meshObject!.position.y, `${charId} must lie flat at -0.95m`).toBeCloseTo(-0.95, 2);
      expect(f.meshObject!.rotation.x, `${charId} must lie flat at -Math.PI / 2.1`).toBeCloseTo(-Math.PI / 2.1, 2);
    });
  });

  it('VA-12: Verifies physical contact distance <= 0.15m at peak strike impact', () => {
    const loader = createMockLoader();
    const attacker = new Character3DFighter('void', 'left', loader);
    const defender = new Character3DFighter('ronin', 'right', loader);
    attacker.setEntranceProgress(1.0);
    defender.setEntranceProgress(1.0);
    attacker.setOpponent(defender);
    defender.setOpponent(attacker);

    // Defender chest position is at world X = +1.50m in mock loader
    const chestPos = defender.getChestWorldPosition();
    expect(chestPos.x).toBeCloseTo(1.50, 1);

    // Attacker dynamic lunge reaches defender with contact <= 0.15m
    const lunge = attacker.getTargetLunge(0.66, 'chest', 1.715);
    const attackerImpactWorldX = attacker.group.position.x + lunge + 0.66;
    const distanceToChestSurface = Math.abs(attackerImpactWorldX - chestPos.x);
    expect(distanceToChestSurface).toBeLessThanOrEqual(0.15);
  });

  it('VA-13: Acrobatic inverted corkscrew heel whip kick exhibits aerial leap, inverted pitch tilt, and dynamic corkscrew sway', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playKick();

    // Advance to peak of inverted corkscrew heel whip (t = 0.25s)
    f.update(0.25, 1.0);

    // Acrobatic aerial leap Y > 0.40m
    expect(f.meshObject!.position.y).toBeGreaterThan(0.40);
    // Inverted pitch rotation (< -0.40 rad)
    expect(f.meshObject!.rotation.x).toBeLessThan(-0.40);
    // Corkscrew rotation sway non-zero
    expect(Math.abs(f.meshObject!.rotation.y - Math.PI / 2)).toBeGreaterThan(0.01);
  });

  it('VA-14: Combo 1 and Combo 2 recovery interpolate both arms and wrists smoothly without popping', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);

    // Combo 1: Low-to-high double throat puncture
    f.playJab(); // Combo 0
    f.playJab(); // Combo 1
    // Peak frame at p ~= 0.35
    f.update(0.12, 1.0);
    expect(f.bones.handL).toBeDefined();

    // Enter recovery at p = 0.50 (t = 0.17s)
    f.update(0.05, 1.17);
    // Hand L and Upper Arm L should still maintain smooth interpolation in recovery
    expect(f.bones.handL!.quaternion.w).toBeLessThan(1.0);
    expect(f.bones.upperArmL!.quaternion.w).toBeLessThan(1.0);
  });

  it('VA-15: Fighter revival & reset cleanly recovers from KO state and restores strike responsiveness', () => {
    const loader = createMockLoader();
    const f = new Character3DFighter('void', 'left', loader);
    f.setEntranceProgress(1.0);
    f.playKnockout();
    f.update(2.0, 3.0);
    expect(f.getState()).toBe('ko');

    // While in KO, strikes are locked
    f.playJab();
    expect(f.getState()).toBe('ko');

    // Reset via setEntranceProgress(1.0) (e.g. rematch or round restart)
    f.setEntranceProgress(1.0);
    expect(f.getState()).toBe('idle');
    expect(f.meshObject!.rotation.x).toBe(0);
    expect(f.meshObject!.position.y).toBe(0);

    // Fighter is now responsive again
    f.playJab();
    expect(f.getState()).toBe('jab');

    // Reset via resetToIdle
    f.playKnockout();
    expect(f.getState()).toBe('ko');
    f.resetToIdle();
    expect(f.getState()).toBe('idle');
  });
});
