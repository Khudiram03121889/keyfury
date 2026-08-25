/**
 * CharacterRigRenderer.ts
 * Modular 2D Skeletal Texture Atlas Quad Engine & Procedural Vector Mesh Renderer for KeyFury.
 * Binds textured sprite quads directly to analytical 2-bone IK (solve2BoneIK), spine curves (solveSpineCurve),
 * and Verlet ragdoll physics (RagdollSystem) with concentric circular joint caps at (0.5, 0.15),
 * a strict 20-layer Z-ordering matrix, dual-layer additive neon weapon glow, and graceful vector fallback.
 */

import type Phaser from 'phaser';
import {
  type CharacterDefinition,
  type Vector2D,
  getCharacterDefinition,
  type CharacterId,
  RagdollSystem
} from '@keyfury/game-core';
import { ModularAtlasManager } from './ModularAtlasManager';

export type FighterState =
  | 'idle'
  | 'step'
  | 'windup'
  | 'jab'
  | 'kick'
  | 'jump_kick'
  | 'uppercut'
  | 'heavy'
  | 'hit'
  | 'knockdown';

export interface LimbSegment {
  joint: Vector2D;
  tip: Vector2D;
}

export interface SkeletonPose {
  head: Vector2D;
  neck: Vector2D;
  hip: Vector2D;
  lShoulder: Vector2D;
  rShoulder: Vector2D;
  lHip: Vector2D;
  rHip: Vector2D;
  armL: LimbSegment;
  armR: LimbSegment;
  legL: LimbSegment;
  legR: LimbSegment;
}

export interface SolvedKinematics {
  pose?: SkeletonPose;
  head?: Vector2D;
  neck?: Vector2D;
  hip?: Vector2D;
  lShoulder?: Vector2D;
  rShoulder?: Vector2D;
  lHip?: Vector2D;
  rHip?: Vector2D;
  armL?: LimbSegment;
  armR?: LimbSegment;
  legL?: LimbSegment;
  legR?: LimbSegment;
  facing?: number;
  ragdoll?: RagdollSystem;
  stepToggle?: boolean;
  accessory?: number;
}

/**
 * Geometric parameters for an individual limb/bone segment quad transform.
 */
export interface LimbSegmentTransform {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  angleRad: number;
  width: number;
  facing: number;
}

/**
 * Strongly-typed bone / layer keys in the 20-layer rig hierarchy.
 */
export type RigBoneKey =
  | 'rear_accessory'
  | 'rear_foot'
  | 'rear_shin'
  | 'rear_knee_cap'
  | 'rear_thigh'
  | 'rear_hand'
  | 'rear_forearm'
  | 'rear_elbow_cap'
  | 'rear_upper_arm'
  | 'rear_pauldron'
  | 'pelvis_waist'
  | 'torso_cuirass'
  | 'headgear_base'
  | 'visor_optics'
  | 'lead_thigh'
  | 'lead_shin_boot'
  | 'lead_upper_arm_pauldron'
  | 'lead_forearm_gauntlet'
  | 'weapon_base'
  | 'weapon_glow_fx';

export interface RigZLayerInfo {
  layer: number;
  name: RigBoneKey;
  atlasPart: string;
  blendMode: number; // 0 = NORMAL, 1 = ADD
  nominalWidth: number;
  nominalHeight: number;
}

/**
 * The strict 20-layer Z-ordering matrix from background to foreground.
 */
export const RIG_Z_INDEX_MATRIX: ReadonlyArray<RigZLayerInfo> = [
  { layer: 0, name: 'rear_accessory', atlasPart: 'accessory', blendMode: 0, nominalWidth: 48, nominalHeight: 112 },
  { layer: 1, name: 'rear_foot', atlasPart: 'rear_boot', blendMode: 0, nominalWidth: 44, nominalHeight: 32 },
  { layer: 2, name: 'rear_shin', atlasPart: 'rear_shin', blendMode: 0, nominalWidth: 36, nominalHeight: 64 },
  { layer: 3, name: 'rear_knee_cap', atlasPart: 'rear_shin', blendMode: 0, nominalWidth: 24, nominalHeight: 24 },
  { layer: 4, name: 'rear_thigh', atlasPart: 'rear_thigh', blendMode: 0, nominalWidth: 40, nominalHeight: 68 },
  { layer: 5, name: 'rear_hand', atlasPart: 'rear_hand', blendMode: 0, nominalWidth: 32, nominalHeight: 32 },
  { layer: 6, name: 'rear_forearm', atlasPart: 'rear_forearm', blendMode: 0, nominalWidth: 28, nominalHeight: 52 },
  { layer: 7, name: 'rear_elbow_cap', atlasPart: 'rear_forearm', blendMode: 0, nominalWidth: 20, nominalHeight: 20 },
  { layer: 8, name: 'rear_upper_arm', atlasPart: 'rear_upper_arm', blendMode: 0, nominalWidth: 32, nominalHeight: 56 },
  { layer: 9, name: 'rear_pauldron', atlasPart: 'pauldron_rear', blendMode: 0, nominalWidth: 48, nominalHeight: 44 },
  { layer: 10, name: 'pelvis_waist', atlasPart: 'pelvis', blendMode: 0, nominalWidth: 56, nominalHeight: 40 },
  { layer: 11, name: 'torso_cuirass', atlasPart: 'torso', blendMode: 0, nominalWidth: 72, nominalHeight: 96 },
  { layer: 12, name: 'headgear_base', atlasPart: 'head', blendMode: 0, nominalWidth: 64, nominalHeight: 64 },
  { layer: 13, name: 'visor_optics', atlasPart: 'headgear', blendMode: 0, nominalWidth: 80, nominalHeight: 72 },
  { layer: 14, name: 'lead_thigh', atlasPart: 'lead_thigh', blendMode: 0, nominalWidth: 44, nominalHeight: 72 },
  { layer: 15, name: 'lead_shin_boot', atlasPart: 'lead_shin', blendMode: 0, nominalWidth: 40, nominalHeight: 68 },
  { layer: 16, name: 'lead_upper_arm_pauldron', atlasPart: 'lead_upper_arm', blendMode: 0, nominalWidth: 36, nominalHeight: 60 },
  { layer: 17, name: 'lead_forearm_gauntlet', atlasPart: 'lead_forearm', blendMode: 0, nominalWidth: 32, nominalHeight: 56 },
  { layer: 18, name: 'weapon_base', atlasPart: 'weapon_base', blendMode: 0, nominalWidth: 32, nominalHeight: 128 },
  { layer: 19, name: 'weapon_glow_fx', atlasPart: 'weapon_glow', blendMode: 1, nominalWidth: 40, nominalHeight: 136 }
];

/**
 * Pure mathematical closed-form limb quad transform calculation.
 * Computes endpoint displacement, Euclidean length, orientation angle,
 * and safe clamping against zero-length singularity.
 */
export function computeLimbTransform(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  facing: number = 1,
  width: number = 20,
  nominalLength?: number
): LimbSegmentTransform {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let len = Math.sqrt(dx * dx + dy * dy);

  // Clamp near-zero collapsed segment to prevent NaN or division by zero
  if (len < 1e-5) {
    len = 1e-5;
  }

  const angleRad = Math.atan2(dy, dx);

  return {
    startX: p1.x,
    startY: p1.y,
    endX: p2.x,
    endY: p2.y,
    length: len,
    angleRad,
    width,
    facing
  };
}

/**
 * Extended bone transform computation including normalized proximal/distal pivots.
 */
export function computeBoneTransform(
  p1: Vector2D,
  p2: Vector2D,
  nominalLength: number,
  pivotX: number = 0.5,
  pivotY: number = 0.15,
  facing: number = 1,
  thicknessScale: number = 1
): LimbSegmentTransform {
  const transform = computeLimbTransform(p1, p2, facing, nominalLength * thicknessScale);
  return transform;
}

/**
 * CharacterRigRenderer
 * Unified modular skeletal quad renderer with 2-Bone IK / Ragdoll binding and vector fallback.
 */
export class CharacterRigRenderer {
  /**
   * Retrieves the full 20-layer Z-ordering matrix specification.
   */
  public getZIndexMatrix(): ReadonlyArray<RigZLayerInfo> {
    return RIG_Z_INDEX_MATRIX;
  }

  /**
   * Applies calculated limb transforms and normalized pivot origins to a Phaser Sprite.
   */
  public applyLimbTransformToSprite(
    sprite: Phaser.GameObjects.Sprite | any,
    transform: LimbSegmentTransform,
    pivot: { pivotX: number; pivotY: number } = { pivotX: 0.5, pivotY: 0.15 },
    nominalHeight: number = 50,
    nominalWidth: number = 20
  ): void {
    if (!sprite) return;

    // Position at proximal joint root P1
    if (typeof sprite.setPosition === 'function') {
      sprite.setPosition(transform.startX, transform.startY);
    } else {
      sprite.x = transform.startX;
      sprite.y = transform.startY;
    }

    // Set normalized proximal joint origin
    if (typeof sprite.setOrigin === 'function') {
      sprite.setOrigin(pivot.pivotX, pivot.pivotY);
    } else {
      sprite.originX = pivot.pivotX;
      sprite.originY = pivot.pivotY;
    }

    // Set world rotation angle
    if (typeof sprite.setRotation === 'function') {
      sprite.setRotation(transform.angleRad);
    } else {
      sprite.rotation = transform.angleRad;
    }

    // Effective bone span ratio between proximal socket (pivotY) and distal socket (1 - pivotY)
    // For standard limb slices with pivotY = 0.15, spanRatio = 1 - 2 * 0.15 = 0.70
    const spanRatio = pivot.pivotY < 0.5 ? Math.max(0.1, 1 - 2 * pivot.pivotY) : 1;
    const effectiveBoneHeight = nominalHeight > 0 ? nominalHeight * spanRatio : 50;
    const scaleY = effectiveBoneHeight > 0 ? transform.length / effectiveBoneHeight : 1;
    const scaleX = nominalWidth > 0 ? (transform.facing * transform.width) / nominalWidth : transform.facing;

    if (typeof sprite.setScale === 'function') {
      sprite.setScale(scaleX, scaleY);
    } else {
      sprite.scaleX = scaleX;
      sprite.scaleY = scaleY;
    }

    if (typeof sprite.setVisible === 'function') {
      sprite.setVisible(true);
    } else {
      sprite.visible = true;
    }
  }

  /**
   * Instantiates the 20 bone sprites with strict ascending depths and blend modes.
   */
  public createRigSprites(scene: Phaser.Scene): (Phaser.GameObjects.Sprite | any)[] {
    const sprites: (Phaser.GameObjects.Sprite | any)[] = [];

    for (let i = 0; i < RIG_Z_INDEX_MATRIX.length; i++) {
      const layer = RIG_Z_INDEX_MATRIX[i];
      let sprite: any;

      if (scene?.add?.sprite) {
        sprite = scene.add.sprite(0, 0, '');
      } else {
        sprite = {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          originX: 0.5,
          originY: 0.15,
          depth: layer.layer,
          visible: true,
          alpha: 1,
          blendMode: layer.blendMode,
          setPosition(x: number, y: number) { this.x = x; this.y = y; return this; },
          setRotation(r: number) { this.rotation = r; return this; },
          setScale(sx: number, sy: number = sx) { this.scaleX = sx; this.scaleY = sy; return this; },
          setOrigin(ox: number, oy: number = ox) { this.originX = ox; this.originY = oy; return this; },
          setDepth(d: number) { this.depth = d; return this; },
          setVisible(v: boolean) { this.visible = v; return this; },
          setAlpha(a: number) { this.alpha = a; return this; },
          setBlendMode(bm: number) { this.blendMode = bm; return this; },
          setTexture(key: string, frame: string) { return this; }
        };
      }

      if (typeof sprite.setDepth === 'function') {
        sprite.setDepth(layer.layer);
      } else {
        sprite.depth = layer.layer;
      }

      if (typeof sprite.setBlendMode === 'function') {
        sprite.setBlendMode(layer.blendMode);
      } else {
        sprite.blendMode = layer.blendMode;
      }

      sprites.push(sprite);
    }

    return sprites;
  }

  /**
   * Creates a dedicated container containing all 20 instantiated bone sprites.
   */
  public createFighterRigContainer(
    scene: Phaser.Scene,
    characterId: string
  ): Phaser.GameObjects.Container | any {
    const sprites = this.createRigSprites(scene);
    let container: any;

    if (scene?.add?.container) {
      container = scene.add.container(0, 0, sprites);
    } else {
      container = {
        list: sprites,
        depth: 0,
        visible: true,
        add(child: any) {
          if (Array.isArray(child)) this.list.push(...child);
          else this.list.push(child);
          return this;
        },
        removeAll() { this.list = []; return this; },
        setDepth(d: number) { this.depth = d; return this; },
        setVisible(v: boolean) { this.visible = v; return this; }
      };
    }

    return container;
  }

  /**
   * Zero-allocation in-place update for a rig container's bone sprites.
  /**
   * Zero-allocation in-place update for a rig container's bone sprites.
   */
  public updateRigContainer(
    container: Phaser.GameObjects.Container | any,
    transforms: Record<string, LimbSegmentTransform> = {},
    time: number = 0,
    state: FighterState = 'idle',
    characterId: string = 'shadow_ronin'
  ): void {
    if (!container || !container.list || container.list.length < 20) return;

    // Modulate weapon glow pulse alpha
    const glowSprite = container.list[19];
    if (glowSprite) {
      const pulseSpeed = state === 'heavy' ? 40 : state === 'windup' ? 60 : 120;
      const baseAlpha = state === 'knockdown' ? 0 : 0.85;
      const pulseAlpha = state === 'knockdown' ? 0 : 0.15 * Math.sin(time / pulseSpeed);
      const finalAlpha = Math.max(0, Math.min(1, baseAlpha + pulseAlpha));

      if (typeof glowSprite.setAlpha === 'function') {
        glowSprite.setAlpha(finalAlpha);
      } else {
        glowSprite.alpha = finalAlpha;
      }

      // Ensure additive blend mode (1 = Phaser.BlendModes.ADD)
      if (typeof glowSprite.setBlendMode === 'function') {
        glowSprite.setBlendMode(1);
      } else {
        glowSprite.blendMode = 1;
      }

      // Azure glow color (#00F2FE = 0x00F2FE = 62206) for Shadow Ronin
      if (characterId === 'shadow_ronin') {
        if (typeof glowSprite.setTint === 'function') {
          glowSprite.setTint(0x00f2fe);
        }
      }
    }
  }

  /**
   * Primary textured rendering entry point.
   * Checks if atlas is loaded; renders textured skeletal quads if loaded,
   * or seamlessly falls back to procedural vector rendering if not.
   */
  public renderTexturedFighter(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container | any,
    characterId: string,
    state: FighterState,
    kinematics: SolvedKinematics,
    time: number = 0
  ): void {
    const isLoaded = ModularAtlasManager.isAtlasLoaded(scene, characterId);

    if (!isLoaded) {
      // Hide textured sprites if present in container
      if (container && container.list) {
        for (let i = 0; i < container.list.length; i++) {
          const item = container.list[i];
          if (item !== container.__fallbackGraphics && item !== container.__fallbackFxGraphics) {
            if (typeof item.setVisible === 'function') {
              item.setVisible(false);
            }
          }
        }
      }
      // Graceful fallback to procedural vector rendering
      this.renderVectorFallback(scene, container, characterId, state, kinematics, time);
      return;
    }

    // Clear fallback graphics if previously drawn
    if (container?.__fallbackGraphics && typeof container.__fallbackGraphics.clear === 'function') {
      container.__fallbackGraphics.clear();
    }
    if (container?.__fallbackFxGraphics && typeof container.__fallbackFxGraphics.clear === 'function') {
      container.__fallbackFxGraphics.clear();
    }

    // Ensure container has rig sprites
    if (!container.list || container.list.length < 20) {
      const sprites = this.createRigSprites(scene);
      if (typeof container.add === 'function') {
        container.add(sprites);
      }
    }

    const pose = kinematics.pose || kinematics;
    const facing = kinematics.facing ?? 1;
    const texKey = ModularAtlasManager.getTextureKey(characterId);

    const head = pose.head || { x: 0, y: -40 };
    const neck = pose.neck || { x: 0, y: -25 };
    const hip = pose.hip || { x: 0, y: 15 };
    const lShoulder = pose.lShoulder || { x: -10, y: -22 };
    const rShoulder = pose.rShoulder || { x: 10, y: -22 };
    const lHip = pose.lHip || { x: -8, y: 15 };
    const rHip = pose.rHip || { x: 8, y: 15 };

    const armL = pose.armL || { joint: { x: -18, y: -10 }, tip: { x: -24, y: 0 } };
    const armR = pose.armR || { joint: { x: 18, y: -10 }, tip: { x: 28, y: 0 } };
    const legL = pose.legL || { joint: { x: -12, y: 35 }, tip: { x: -14, y: 60 } };
    const legR = pose.legR || { joint: { x: 12, y: 35 }, tip: { x: 14, y: 60 } };

    // Update each sprite layer
    for (let i = 0; i < RIG_Z_INDEX_MATRIX.length; i++) {
      const layer = RIG_Z_INDEX_MATRIX[i];
      const sprite = container.list[i];
      if (!sprite) continue;

      let p1 = neck;
      let p2 = head;
      let width = layer.nominalWidth;

      switch (layer.name) {
        case 'rear_accessory': {
          p1 = neck;
          const scarfWave = state === 'knockdown' ? 2 : Math.sin(time / 120) * 6 + Math.cos(time / 75) * 3;
          p2 = { x: neck.x - facing * 28, y: neck.y + 12 + scarfWave };
          break;
        }
        case 'rear_foot':
          p1 = legL.tip;
          p2 = { x: legL.tip.x + facing * 8, y: legL.tip.y + 2 };
          break;
        case 'rear_shin':
          p1 = legL.joint;
          p2 = legL.tip;
          break;
        case 'rear_knee_cap':
          p1 = legL.joint;
          p2 = { x: legL.joint.x + 1, y: legL.joint.y };
          break;
        case 'rear_thigh':
          p1 = lHip;
          p2 = legL.joint;
          break;
        case 'rear_hand':
          p1 = armL.tip;
          p2 = { x: armL.tip.x + facing * 4, y: armL.tip.y };
          break;
        case 'rear_forearm':
          p1 = armL.joint;
          p2 = armL.tip;
          break;
        case 'rear_elbow_cap':
          p1 = armL.joint;
          p2 = { x: armL.joint.x + 1, y: armL.joint.y };
          break;
        case 'rear_upper_arm':
          p1 = lShoulder;
          p2 = armL.joint;
          break;
        case 'rear_pauldron':
          p1 = lShoulder;
          p2 = { x: lShoulder.x - facing * 4, y: lShoulder.y + 4 };
          break;
        case 'pelvis_waist':
          p1 = hip;
          p2 = { x: hip.x, y: hip.y + 5 };
          break;
        case 'torso_cuirass':
          p1 = neck;
          p2 = hip;
          break;
        case 'headgear_base':
          p1 = neck;
          p2 = head;
          break;
        case 'visor_optics':
          p1 = neck;
          p2 = head;
          break;
        case 'lead_thigh':
          p1 = rHip;
          p2 = legR.joint;
          break;
        case 'lead_shin_boot':
          p1 = legR.joint;
          p2 = legR.tip;
          break;
        case 'lead_upper_arm_pauldron':
          p1 = rShoulder;
          p2 = armR.joint;
          break;
        case 'lead_forearm_gauntlet':
          p1 = armR.joint;
          p2 = armR.tip;
          break;
        case 'weapon_base':
        case 'weapon_glow_fx': {
          p1 = armR.tip;
          if (state === 'knockdown') {
            p2 = { x: armR.tip.x + facing * 25, y: armR.tip.y + 10 };
          } else {
            const bladeAngle = state === 'uppercut' ? -Math.PI / 3 : state === 'heavy' ? Math.PI / 4 : state === 'windup' ? -Math.PI / 6 : 0;
            const bladeLen = 34;
            p2 = {
              x: armR.tip.x + facing * Math.cos(bladeAngle) * bladeLen,
              y: armR.tip.y + Math.sin(bladeAngle) * bladeLen
            };
          }
          break;
        }
      }

      const transform = computeLimbTransform(p1, p2, facing, width);
      const meta = ModularAtlasManager.getPartMetadata(characterId, layer.atlasPart);
      const pivot = meta ? { pivotX: meta.pivotX, pivotY: meta.pivotY } : { pivotX: 0.5, pivotY: 0.15 };

      this.applyLimbTransformToSprite(sprite, transform, pivot, layer.nominalHeight, layer.nominalWidth);

      if (typeof sprite.setTexture === 'function') {
        sprite.setTexture(texKey, layer.atlasPart);
      }
    }

    this.updateRigContainer(container, {}, time, state, characterId);
  }

  /**
   * Procedural vector fallback renderer invoked when texture atlases are unavailable.
   */
  public renderVectorFallback(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container | any,
    characterId: string,
    state: FighterState,
    kinematics: SolvedKinematics,
    time: number = 0
  ): void {
    const charDef = getCharacterDefinition(characterId);
    let g: Phaser.GameObjects.Graphics | null = null;
    let fxG: Phaser.GameObjects.Graphics | null = null;

    // Reuse or allocate container-attached fallback graphics (zero-allocation per frame)
    if (container) {
      if (!container.__fallbackGraphics && scene?.add?.graphics) {
        container.__fallbackGraphics = scene.add.graphics();
        container.__fallbackFxGraphics = scene.add.graphics();
        if (typeof container.add === 'function') {
          container.add([container.__fallbackGraphics, container.__fallbackFxGraphics]);
        }
      }
      g = container.__fallbackGraphics || null;
      fxG = container.__fallbackFxGraphics || null;
    } else if (scene?.add?.graphics) {
      g = scene.add.graphics();
      fxG = scene.add.graphics();
    }

    if (g && typeof g.clear === 'function') g.clear();
    if (fxG && typeof fxG.clear === 'function') fxG.clear();

    if (g && fxG) {
      const pose = kinematics.pose || kinematics;
      const facing = kinematics.facing ?? 1;
      const head = pose.head || { x: 0, y: -40 };
      const neck = pose.neck || { x: 0, y: -25 };
      const hip = pose.hip || { x: 0, y: 15 };
      const lShoulder = pose.lShoulder || { x: -10, y: -22 };
      const rShoulder = pose.rShoulder || { x: 10, y: -22 };
      const lHip = pose.lHip || { x: -8, y: 15 };
      const rHip = pose.rHip || { x: 8, y: 15 };
      const armL = pose.armL || { joint: { x: -18, y: -10 }, tip: { x: -24, y: 0 } };
      const armR = pose.armR || { joint: { x: 18, y: -10 }, tip: { x: 28, y: 0 } };
      const legL = pose.legL || { joint: { x: -12, y: 35 }, tip: { x: -14, y: 60 } };
      const legR = pose.legR || { joint: { x: 12, y: 35 }, tip: { x: 14, y: 60 } };

      const bodyColor = charDef.theme.bodyColor;

      // Draw rear limbs
      drawTaperedLimb(g, lHip, legL.joint, 11, 8, bodyColor);
      drawTaperedLimb(g, legL.joint, legL.tip, 8, 6, bodyColor);
      drawTaperedLimb(g, lShoulder, armL.joint, 9, 7, bodyColor);
      drawTaperedLimb(g, armL.joint, armL.tip, 7, 5, bodyColor);

      // Draw torso, headgear, waist
      drawCharacterPauldronsAndTorso(g, neck, neck, hip, hip, lShoulder, rShoulder, facing, charDef, state, time);
      drawCharacterWaistAndScarf(g, hip.x, hip.y, head.x, head.y, facing, charDef, state, time);
      drawCharacterHeadgear(g, head.x, head.y, facing, charDef, state, time);

      // Draw lead limbs
      drawTaperedLimb(g, rHip, legR.joint, 11, 8, bodyColor);
      drawTaperedLimb(g, legR.joint, legR.tip, 8, 6, bodyColor);
      drawTaperedLimb(g, rShoulder, armR.joint, 9, 7, bodyColor);
      drawTaperedLimb(g, armR.joint, armR.tip, 7, 5, bodyColor);

      // Draw weapons and attacks
      drawCharacterGauntletsAndWeapons(g, fxG, armL, armR, facing, charDef, state, time);
      drawCharacterAttackVFX(fxG, charDef, state, neck.x, neck.y, hip.x, hip.y, armR, legR, facing, time);
    }
  }

  /**
   * Ragdoll kinematics quad binding when a fighter is tumbling in KO knockdown.
   */
  public renderRagdollTexturedFighter(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container | any,
    characterId: string,
    ragdoll: RagdollSystem,
    time: number = 0
  ): void {
    if (!ragdoll) return;

    const headNode = ragdoll.getNode('head') || { x: 0, y: -40 };
    const neckNode = ragdoll.getNode('neck') || { x: 0, y: -25 };
    const pelvisNode = ragdoll.getNode('pelvis') || { x: 0, y: 15 };
    const shoulderL = { x: neckNode.x - 10, y: neckNode.y + 3 };
    const shoulderR = { x: neckNode.x + 10, y: neckNode.y + 3 };
    const elbowL = ragdoll.getNode('elbowL') || { x: -18, y: -10 };
    const elbowR = ragdoll.getNode('elbowR') || { x: 18, y: -10 };
    const handL = ragdoll.getNode('handL') || { x: -24, y: 0 };
    const handR = ragdoll.getNode('handR') || { x: 28, y: 0 };
    const hipL = { x: pelvisNode.x - 8, y: pelvisNode.y };
    const hipR = { x: pelvisNode.x + 8, y: pelvisNode.y };
    const kneeL = ragdoll.getNode('kneeL') || { x: -12, y: 35 };
    const kneeR = ragdoll.getNode('kneeR') || { x: 12, y: 35 };
    const footL = ragdoll.getNode('footL') || { x: -14, y: 60 };
    const footR = ragdoll.getNode('footR') || { x: 14, y: 60 };

    const kinematics: SolvedKinematics = {
      head: headNode,
      neck: neckNode,
      hip: pelvisNode,
      lShoulder: shoulderL,
      rShoulder: shoulderR,
      lHip: hipL,
      rHip: hipR,
      armL: { joint: elbowL, tip: handL },
      armR: { joint: elbowR, tip: handR },
      legL: { joint: kneeL, tip: footL },
      legR: { joint: kneeR, tip: footR },
      facing: 1,
      ragdoll
    };

    this.renderTexturedFighter(scene, container, characterId, 'knockdown', kinematics, time);
  }
}

// ---------------------------------------------------------------------------
// PRESERVED PROCEDURAL VECTOR RENDERING FUNCTIONS (100% BACKWARD-COMPATIBLE)
// ---------------------------------------------------------------------------

/**
 * Helper to draw sleek tapered vector limbs with joint caps and stroke highlights.
 */
export function drawTaperedLimb(
  g: Phaser.GameObjects.Graphics,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  w1: number,
  w2: number,
  fillColor: number,
  strokeColor?: number,
  strokeAlpha: number = 0.7
): void {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1e-5;

  const nx = -dy / len;
  const ny = dx / len;

  const hW1 = w1 / 2;
  const hW2 = w2 / 2;

  const v1 = { x: p1.x + nx * hW1, y: p1.y + ny * hW1 };
  const v2 = { x: p1.x - nx * hW1, y: p1.y - ny * hW1 };
  const v3 = { x: p2.x - nx * hW2, y: p2.y - ny * hW2 };
  const v4 = { x: p2.x + nx * hW2, y: p2.y + ny * hW2 };

  g.fillStyle(fillColor, 1);
  g.beginPath();
  g.moveTo(v1.x, v1.y);
  g.lineTo(v4.x, v4.y);
  g.lineTo(v3.x, v3.y);
  g.lineTo(v2.x, v2.y);
  g.closePath();
  g.fillPath();

  if (strokeColor !== undefined) {
    g.lineStyle(1.5, strokeColor, strokeAlpha);
    g.strokePath();
  }

  g.fillCircle(p1.x, p1.y, hW1);
  g.fillCircle(p2.x, p2.y, hW2);
}

/**
 * Renders custom headgear, visors, and horns/wings according to CharacterGearSpec.
 */
export function drawCharacterHeadgear(
  g: Phaser.GameObjects.Graphics,
  headX: number,
  headY: number,
  facing: number,
  charDef: CharacterDefinition,
  state: FighterState,
  time: number
): void {
  const { theme, gear } = charDef;
  const headRadius = 15;
  const headType = gear.headType;

  // Base head skull mesh
  g.fillStyle(theme.bodyColor, 1);
  g.fillCircle(headX, headY, headRadius);

  // 1. Shadow Ronin (Kage): Cyber-Kabuto Helmet with Golden Horns & Horizontal Azure Plasma Visor
  if (headType === 'kabuto_visor' || charDef.id === 'shadow_ronin') {
    g.fillStyle(0x1e293b, 1);
    g.beginPath();
    g.arc(headX, headY - 2, headRadius + 1.5, Math.PI, 0, false);
    g.lineTo(headX + facing * (headRadius + 2), headY + 3);
    g.lineTo(headX - facing * (headRadius + 5), headY + 6);
    g.closePath();
    g.fillPath();

    g.lineStyle(1.5, 0x334155, 0.9);
    g.strokePath();

    const crestBaseX = headX + facing * 4;
    const crestBaseY = headY - 14;
    g.fillStyle(0xfbbf24, 1);
    g.lineStyle(1.5, 0xd97706, 1);

    g.beginPath();
    g.moveTo(crestBaseX, crestBaseY);
    g.lineTo(crestBaseX + facing * 12, crestBaseY - 14);
    g.lineTo(crestBaseX + facing * 6, crestBaseY - 10);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.beginPath();
    g.moveTo(crestBaseX - facing * 4, crestBaseY);
    g.lineTo(crestBaseX - facing * 2, crestBaseY - 12);
    g.lineTo(crestBaseX - facing * 6, crestBaseY - 8);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(crestBaseX, crestBaseY, 3);

    if (state !== 'knockdown') {
      const visorX = headX + facing * 5;
      const visorY = headY - 2;

      g.lineStyle(4, 0x0284c7, 0.6);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY);
      g.lineTo(visorX + facing * 10, visorY);
      g.strokePath();

      g.lineStyle(2, 0x00e5ff, 1);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY);
      g.lineTo(visorX + facing * 10, visorY);
      g.strokePath();

      g.fillStyle(0xffffff, 1);
      g.fillCircle(visorX + facing * 4, visorY, 1.5);
    }
  }

  // 2. Cyber Valkyrie (Freya): Winged Valkyrie Helm with Crimson Optic Lenses
  else if (headType === 'valkyrie_helm' || charDef.id === 'cyber_valkyrie') {
    g.fillStyle(0x334155, 1);
    g.beginPath();
    g.arc(headX, headY - 1, headRadius + 2, Math.PI * 0.9, Math.PI * 0.1, false);
    g.lineTo(headX + facing * 12, headY + 5);
    g.lineTo(headX - facing * 12, headY + 3);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.5, 0x64748b, 1);
    g.strokePath();

    const wingBaseX = headX - facing * 2;
    const wingBaseY = headY - 12;

    g.fillStyle(0x94a3b8, 1);
    g.lineStyle(1.5, 0xef4444, 0.9);
    g.beginPath();
    g.moveTo(wingBaseX, wingBaseY);
    g.lineTo(wingBaseX - facing * 18, wingBaseY - 16);
    g.lineTo(wingBaseX - facing * 10, wingBaseY - 6);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0x64748b, 1);
    g.beginPath();
    g.moveTo(wingBaseX - facing * 2, wingBaseY + 3);
    g.lineTo(wingBaseX - facing * 14, wingBaseY - 8);
    g.lineTo(wingBaseX - facing * 6, wingBaseY);
    g.closePath();
    g.fillPath();
    g.strokePath();

    if (state !== 'knockdown') {
      const eyeX = headX + facing * 6;
      const eyeY = headY - 2;

      g.fillStyle(0xef4444, 0.4);
      g.fillCircle(eyeX, eyeY, 5);
      g.fillCircle(eyeX + facing * 4, eyeY + 1, 4);

      g.fillStyle(0xf87171, 1);
      g.fillCircle(eyeX, eyeY, 3);
      g.fillCircle(eyeX + facing * 4, eyeY + 1, 2.2);

      g.fillStyle(0xffffff, 1);
      g.fillCircle(eyeX + facing * 1, eyeY - 0.5, 1);
    }
  }

  // 3. Volt Shinobi (Raijin): Aerodynamic Shinobi Mask with Gold HUD Visor
  else if (headType === 'shinobi_mask' || charDef.id === 'volt_shinobi') {
    g.fillStyle(0x18181b, 1);
    g.beginPath();
    g.moveTo(headX + facing * 14, headY);
    g.lineTo(headX + facing * 6, headY + 14);
    g.lineTo(headX - facing * 10, headY + 8);
    g.lineTo(headX - facing * 12, headY - 2);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.5, 0xf59e0b, 0.8);
    g.strokePath();

    if (state !== 'knockdown') {
      const visorX = headX + facing * 5;
      const visorY = headY - 4;

      g.fillStyle(0xf59e0b, 0.9);
      g.beginPath();
      g.moveTo(visorX - facing * 3, visorY - 2);
      g.lineTo(visorX + facing * 11, visorY);
      g.lineTo(visorX + facing * 8, visorY + 5);
      g.lineTo(visorX - facing * 2, visorY + 4);
      g.closePath();
      g.fillPath();

      g.lineStyle(2, 0xfde047, 1);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY + 1);
      g.lineTo(visorX + facing * 9, visorY + 2);
      g.strokePath();

      g.fillStyle(0xffffff, 1);
      g.fillCircle(visorX + facing * 4, visorY + 1.5, 1.5);
    }
  }

  // 4. Void Assassin (Nyx): Stealth Shadow Cowl/Hood with Glowing Purple Dual Slit Eyes
  else if (headType === 'shadow_hood' || charDef.id === 'void_assassin') {
    g.fillStyle(0x09090b, 1);
    g.beginPath();
    g.moveTo(headX + facing * 2, headY - 19);
    g.lineTo(headX + facing * 16, headY - 4);
    g.lineTo(headX + facing * 14, headY + 12);
    g.lineTo(headX - facing * 16, headY + 10);
    g.lineTo(headX - facing * 14, headY - 14);
    g.closePath();
    g.fillPath();

    g.lineStyle(1.5, 0x7c3aed, 0.7);
    g.strokePath();

    g.fillStyle(0x020205, 1);
    g.fillCircle(headX + facing * 4, headY, 10);

    if (state !== 'knockdown') {
      const eyeX = headX + facing * 6;
      const eyeY = headY - 1;

      g.fillStyle(0xa855f7, 0.4);
      g.fillCircle(eyeX, eyeY, 4.5);
      g.fillCircle(eyeX + facing * 4, eyeY - 1, 3.5);

      g.lineStyle(2.5, 0xc084fc, 1);
      g.beginPath();
      g.moveTo(eyeX - facing * 2, eyeY + 1);
      g.lineTo(eyeX + facing * 3, eyeY - 2);
      g.moveTo(eyeX + facing * 3, eyeY - 1);
      g.lineTo(eyeX + facing * 7, eyeY - 3);
      g.strokePath();

      g.fillStyle(0xffffff, 1);
      g.fillCircle(eyeX + facing * 1, eyeY - 0.5, 1.2);
    }
  }
}

/**
 * Renders custom pauldrons, chest armor, and torso gear according to CharacterGearSpec.
 */
export function drawCharacterPauldronsAndTorso(
  g: Phaser.GameObjects.Graphics,
  neckL: Vector2D,
  neckR: Vector2D,
  hipL: Vector2D,
  hipR: Vector2D,
  lShoulder: Vector2D,
  rShoulder: Vector2D,
  facing: number,
  charDef: CharacterDefinition,
  state: FighterState,
  time: number
): void {
  const { theme, gear } = charDef;
  const shoulderType = gear.shoulderType;

  // 1. Base V-Taper Athletic Torso
  g.fillStyle(theme.bodyColor, 1);
  g.beginPath();
  g.moveTo(neckL.x, neckL.y);
  g.lineTo(neckR.x, neckR.y);
  g.lineTo(hipR.x, hipR.y);
  g.lineTo(hipL.x, hipL.y);
  g.closePath();
  g.fillPath();

  g.lineStyle(1.5, theme.gloveColor, 0.3);
  g.strokePath();

  const chestMidX = (neckL.x + neckR.x) / 2;
  const chestMidY = (neckL.y + neckR.y) / 2 + 10;

  // 2. Custom Chest Armor Plate & Accents
  if (charDef.id === 'cyber_valkyrie' || shoulderType === 'heavy_pauldrons') {
    g.fillStyle(0x334155, 1);
    g.fillRoundedRect(chestMidX - 7, chestMidY - 8, 14, 16, 3);
    g.lineStyle(1.5, 0x64748b, 0.9);
    g.strokeRoundedRect(chestMidX - 7, chestMidY - 8, 14, 16, 3);

    const corePulse = Math.sin(time / 150) * 0.2 + 0.8;
    g.fillStyle(0xef4444, corePulse);
    g.fillCircle(chestMidX + facing * 1, chestMidY, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(chestMidX + facing * 1, chestMidY, 1.5);
  } else if (charDef.id === 'shadow_ronin' || shoulderType === 'minimal_nanotech') {
    g.lineStyle(2, 0x0ea5e9, 0.7);
    g.beginPath();
    g.moveTo(neckL.x + 2, neckL.y + 6);
    g.lineTo(chestMidX, chestMidY + 2);
    g.lineTo(neckR.x - 2, neckR.y + 6);
    g.moveTo(neckL.x + 3, neckL.y + 12);
    g.lineTo(chestMidX, chestMidY + 8);
    g.lineTo(neckR.x - 3, neckR.y + 12);
    g.strokePath();
  } else if (charDef.id === 'volt_shinobi' || shoulderType === 'light_mesh') {
    g.lineStyle(2, 0xf59e0b, 0.8);
    g.beginPath();
    g.moveTo(lShoulder.x, lShoulder.y);
    g.lineTo(hipR.x, hipR.y - 4);
    g.moveTo(rShoulder.x, rShoulder.y);
    g.lineTo(hipL.x, hipL.y - 4);
    g.strokePath();

    g.fillStyle(0xfde047, 1);
    g.fillCircle(chestMidX, chestMidY, 3);
  } else if (charDef.id === 'void_assassin' || shoulderType === 'shadow_shroud') {
    const voidPulse = Math.sin(time / 200) * 0.3 + 0.7;
    g.lineStyle(2, 0xa855f7, voidPulse);
    g.beginPath();
    g.moveTo(chestMidX, chestMidY - 8);
    g.lineTo(chestMidX + facing * 5, chestMidY);
    g.lineTo(chestMidX, chestMidY + 8);
    g.lineTo(chestMidX - facing * 5, chestMidY);
    g.closePath();
    g.strokePath();
  }

  // 3. Custom Shoulder Pauldrons
  if (shoulderType === 'heavy_pauldrons' || charDef.id === 'cyber_valkyrie') {
    g.fillStyle(0x475569, 1);
    g.beginPath();
    g.moveTo(rShoulder.x - facing * 6, rShoulder.y - 8);
    g.lineTo(rShoulder.x + facing * 12, rShoulder.y - 6);
    g.lineTo(rShoulder.x + facing * 10, rShoulder.y + 10);
    g.lineTo(rShoulder.x - facing * 4, rShoulder.y + 8);
    g.closePath();
    g.fillPath();

    g.lineStyle(2, 0xdc2626, 0.9);
    g.strokePath();

    g.fillStyle(0x334155, 1);
    g.beginPath();
    g.moveTo(lShoulder.x - facing * 8, lShoulder.y - 6);
    g.lineTo(lShoulder.x + facing * 6, lShoulder.y - 4);
    g.lineTo(lShoulder.x + facing * 4, lShoulder.y + 8);
    g.lineTo(lShoulder.x - facing * 6, lShoulder.y + 6);
    g.closePath();
    g.fillPath();
  } else if (shoulderType === 'minimal_nanotech' || charDef.id === 'shadow_ronin') {
    g.fillStyle(0x1e293b, 1);
    g.lineStyle(1.5, 0x00e5ff, 0.85);

    g.fillRect(rShoulder.x - facing * 4, rShoulder.y - 6, 12, 6);
    g.strokeRect(rShoulder.x - facing * 4, rShoulder.y - 6, 12, 6);

    g.fillRect(rShoulder.x - facing * 2, rShoulder.y + 1, 10, 5);
    g.strokeRect(rShoulder.x - facing * 2, rShoulder.y + 1, 10, 5);

    g.fillStyle(0x0f172a, 1);
    g.fillRect(lShoulder.x - facing * 6, lShoulder.y - 4, 8, 5);
  } else if (shoulderType === 'light_mesh' || charDef.id === 'volt_shinobi') {
    g.fillStyle(0x27272a, 1);
    g.fillCircle(rShoulder.x + facing * 2, rShoulder.y, 6.5);
    g.lineStyle(1.5, 0xf59e0b, 1);
    g.strokeCircle(rShoulder.x + facing * 2, rShoulder.y, 6.5);

    g.fillCircle(lShoulder.x - facing * 2, lShoulder.y, 5);
  } else if (shoulderType === 'shadow_shroud' || charDef.id === 'void_assassin') {
    g.fillStyle(0x09090b, 1);
    g.beginPath();
    g.moveTo(rShoulder.x - facing * 4, rShoulder.y - 8);
    g.lineTo(rShoulder.x + facing * 12, rShoulder.y - 2);
    g.lineTo(rShoulder.x + facing * 8, rShoulder.y + 12);
    g.lineTo(rShoulder.x, rShoulder.y + 6);
    g.closePath();
    g.fillPath();

    g.lineStyle(1.5, 0xa855f7, 0.8);
    g.strokePath();

    g.fillStyle(0x020205, 1);
    g.fillCircle(lShoulder.x - facing * 2, lShoulder.y, 5);
  }
}

/**
 * Renders custom strike gauntlets, plasma katana, hydraulic boost fists, lightning kunai, or void daggers.
 */
export function drawCharacterGauntletsAndWeapons(
  g: Phaser.GameObjects.Graphics,
  fxG: Phaser.GameObjects.Graphics,
  armL: LimbSegment,
  armR: LimbSegment,
  facing: number,
  charDef: CharacterDefinition,
  state: FighterState,
  time: number
): void {
  const { theme, gear } = charDef;
  const gauntletType = gear.gauntletType;

  // REAR HAND (armL.tip)
  g.fillStyle(theme.gloveColor, 1);
  g.fillCircle(armL.tip.x, armL.tip.y, 6.5);
  g.lineStyle(1.5, 0xffffff, 0.6);
  g.strokeCircle(armL.tip.x, armL.tip.y, 6.5);

  // LEAD HAND & WEAPON (armR.tip)
  if (gauntletType === 'plasma_strike' || charDef.id === 'shadow_ronin') {
    g.fillStyle(0x0284c7, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 7.5);
    g.lineStyle(2, 0x00e5ff, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 7.5);

    if (state !== 'knockdown') {
      const bladeAngle = state === 'uppercut' ? -Math.PI / 3 : state === 'heavy' ? Math.PI / 4 : 0;
      const bladeLen = 34;
      const bladeEndX = armR.tip.x + facing * Math.cos(bladeAngle) * bladeLen;
      const bladeEndY = armR.tip.y + Math.sin(bladeAngle) * bladeLen;

      fxG.lineStyle(5, 0x00e5ff, 0.6);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      fxG.lineStyle(3, 0x38bdf8, 0.95);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      fxG.lineStyle(1.5, 0xffffff, 1);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      g.fillStyle(0xfbbf24, 1);
      g.fillRect(armR.tip.x - 2, armR.tip.y - 4, 4, 8);
    }
  } else if (gauntletType === 'hydraulic_brawler' || charDef.id === 'cyber_valkyrie') {
    g.fillStyle(0xdc2626, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 9.5);

    g.fillStyle(0x94a3b8, 1);
    g.fillRect(armR.tip.x + facing * 3 - 2, armR.tip.y - 5, 4, 10);

    g.lineStyle(2, 0xef4444, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 9.5);

    if (state !== 'knockdown') {
      const heatPulse = Math.sin(time / 100) * 0.3 + 0.7;
      fxG.lineStyle(3, 0xef4444, heatPulse);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 11);
    }
  } else if (gauntletType === 'lightning_kunai' || charDef.id === 'volt_shinobi') {
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 7.5);
    g.lineStyle(2, 0xfde047, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 7.5);

    if (state !== 'knockdown') {
      const kunaiLen = 16;
      const kunaiTipX = armR.tip.x + facing * kunaiLen;
      const kunaiTipY = armR.tip.y - 1;

      g.fillStyle(0x27272a, 1);
      g.lineStyle(1.5, 0xf59e0b, 1);
      g.beginPath();
      g.moveTo(armR.tip.x, armR.tip.y - 3);
      g.lineTo(kunaiTipX, kunaiTipY);
      g.lineTo(armR.tip.x, armR.tip.y + 3);
      g.closePath();
      g.fillPath();
      g.strokePath();

      if (Math.random() < 0.4) {
        fxG.lineStyle(1.5, 0xfde047, 0.9);
        fxG.beginPath();
        fxG.moveTo(kunaiTipX, kunaiTipY);
        fxG.lineTo(kunaiTipX + (Math.random() - 0.5) * 8, kunaiTipY + (Math.random() - 0.5) * 8);
        fxG.strokePath();
      }
    }
  } else if (gauntletType === 'void_daggers' || charDef.id === 'void_assassin') {
    g.fillStyle(0x7c3aed, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 7);
    g.lineStyle(2, 0xc084fc, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 7);

    if (state !== 'knockdown') {
      const daggerLen = 22;
      const daggerTipX = armR.tip.x + facing * daggerLen;
      const daggerTipY = armR.tip.y - 4;

      fxG.fillStyle(0xa855f7, 0.4);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 2);
      fxG.lineTo(daggerTipX, daggerTipY);
      fxG.lineTo(armR.tip.x, armR.tip.y - 5);
      fxG.closePath();
      fxG.fillPath();

      fxG.lineStyle(2, 0xc084fc, 0.95);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 1);
      fxG.lineTo(daggerTipX, daggerTipY);
      fxG.lineTo(armR.tip.x, armR.tip.y - 3);
      fxG.closePath();
      fxG.strokePath();
    }
  }
}

/**
 * Renders custom waist belts and animated scarves, ribbons, and cloaks.
 */
export function drawCharacterWaistAndScarf(
  g: Phaser.GameObjects.Graphics,
  hipX: number,
  hipY: number,
  headX: number,
  headY: number,
  facing: number,
  charDef: CharacterDefinition,
  state: FighterState,
  time: number
): void {
  const { gear } = charDef;
  const waistType = gear.waistType;
  const accessoryType = gear.accessoryType;

  // 1. Waist Belts
  if (waistType === 'obi_sash' || charDef.id === 'shadow_ronin') {
    g.fillStyle(0x0284c7, 1);
    g.fillRect(hipX - 6, hipY - 3, 12, 6);

    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(hipX, hipY, 2.5);

    const obiWave = Math.sin(time / 100) * 4;
    g.lineStyle(2.5, 0x38bdf8, 1);
    g.beginPath();
    g.moveTo(hipX - facing * 4, hipY);
    g.lineTo(hipX - facing * 14, hipY + 12 + obiWave);
    g.moveTo(hipX - facing * 2, hipY);
    g.lineTo(hipX - facing * 10, hipY + 16 + obiWave * 0.8);
    g.strokePath();
  } else if (waistType === 'heavy_belt' || charDef.id === 'cyber_valkyrie') {
    g.fillStyle(0x334155, 1);
    g.fillRect(hipX - 7, hipY - 4, 14, 8);
    g.lineStyle(2, 0xdc2626, 1);
    g.strokeRect(hipX - 7, hipY - 4, 14, 8);

    g.fillStyle(0xef4444, 1);
    g.fillCircle(hipX, hipY, 2.5);
  } else if (waistType === 'shinobi_belt' || charDef.id === 'volt_shinobi') {
    g.fillStyle(0x27272a, 1);
    g.fillRect(hipX - 6, hipY - 3, 12, 6);
    g.fillStyle(0xf59e0b, 1);
    g.fillRect(hipX - 3, hipY - 2, 6, 4);
  } else if (waistType === 'rift_sash' || charDef.id === 'void_assassin') {
    g.fillStyle(0x7c3aed, 1);
    g.fillRect(hipX - 6, hipY - 3, 12, 6);
    g.fillStyle(0xc084fc, 1);
    g.fillCircle(hipX, hipY, 3);
  }

  // 2. Animated Flowing Headband Scarves / Storm Ribbons / Void Cloaks
  if (state !== 'knockdown') {
    const bandX = headX - facing * 12;
    const bandY = headY - 3;

    if (accessoryType === 'flowing_scarf' || charDef.id === 'shadow_ronin') {
      const scarfWave = Math.sin(time / 120) * 6;
      g.lineStyle(3.5, 0x00e5ff, 0.95);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 16, bandY + 4 + scarfWave);
      g.lineTo(bandX - facing * 28, bandY + 12 + scarfWave * 1.6);
      g.strokePath();

      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(bandX - facing * 28, bandY + 12 + scarfWave * 1.6, 2);
    } else if (accessoryType === 'storm_ribbon' || charDef.id === 'volt_shinobi') {
      const wave1 = Math.sin(time / 80) * 7;
      const wave2 = Math.cos(time / 70) * 5;

      g.lineStyle(2.5, 0xfde047, 1);
      g.beginPath();
      g.moveTo(bandX, bandY - 2);
      g.lineTo(bandX - facing * 18, bandY + 2 + wave1);
      g.lineTo(bandX - facing * 32, bandY + 8 + wave1 * 1.5);
      g.strokePath();

      g.lineStyle(2, 0xf59e0b, 0.9);
      g.beginPath();
      g.moveTo(bandX, bandY + 2);
      g.lineTo(bandX - facing * 14, bandY + 6 + wave2);
      g.lineTo(bandX - facing * 26, bandY + 14 + wave2 * 1.3);
      g.strokePath();
    } else if (accessoryType === 'void_cloak' || charDef.id === 'void_assassin') {
      const voidWave = Math.sin(time / 140) * 7;
      g.lineStyle(3.5, 0xa855f7, 0.85);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 18, bandY + 6 + voidWave);
      g.lineTo(bandX - facing * 32, bandY + 16 + voidWave * 1.4);
      g.strokePath();

      g.lineStyle(1.5, 0xc084fc, 0.7);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 18, bandY + 6 + voidWave);
      g.lineTo(bandX - facing * 32, bandY + 16 + voidWave * 1.4);
      g.strokePath();
    } else if (accessoryType === 'energy_crest' || charDef.id === 'cyber_valkyrie') {
      const ventPulse = Math.sin(time / 90) * 3;
      g.lineStyle(2, 0xef4444, 0.7);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 8, bandY - 6 + ventPulse);
      g.strokePath();
    }
  }
}

/**
 * Dynamic Elemental Strike Slash Arcs rendered per character theme on attack moves.
 */
export function drawCharacterAttackVFX(
  fxG: Phaser.GameObjects.Graphics,
  charDef: CharacterDefinition,
  state: FighterState,
  neckX: number,
  neckY: number,
  hipX: number,
  hipY: number,
  armR: LimbSegment,
  legR: LimbSegment,
  facing: number,
  time: number
): void {
  const { theme } = charDef;
  const primaryHex = parseInt(theme.primaryColor.replace('#', '0x'), 16);
  const accentHex = parseInt(theme.accentColor.replace('#', '0x'), 16);

  if (state === 'heavy') {
    if (charDef.id === 'shadow_ronin') {
      fxG.lineStyle(6, 0x00e5ff, 0.95);
      fxG.beginPath();
      fxG.arc(neckX + facing * 10, neckY, 72, -Math.PI / 3, Math.PI / 3, false);
      fxG.strokePath();

      fxG.lineStyle(2.5, 0xffffff, 1);
      fxG.beginPath();
      fxG.arc(neckX + facing * 10, neckY, 72, -Math.PI / 4, Math.PI / 4, false);
      fxG.strokePath();
    } else if (charDef.id === 'cyber_valkyrie') {
      fxG.lineStyle(7, 0xef4444, 0.95);
      fxG.beginPath();
      fxG.arc(neckX + facing * 20, neckY + 10, 68, -Math.PI / 4, Math.PI / 2, false);
      fxG.strokePath();

      fxG.lineStyle(3, 0xfecaca, 1);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 18);
    } else if (charDef.id === 'volt_shinobi') {
      fxG.lineStyle(4, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(neckX, neckY - 20);
      fxG.lineTo(neckX + facing * 30, neckY + 10);
      fxG.lineTo(armR.tip.x + facing * 20, armR.tip.y + 20);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      fxG.lineStyle(5, 0xa855f7, 0.95);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 24);
      fxG.lineStyle(2, 0xc084fc, 1);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 14);
    } else {
      fxG.lineStyle(6, primaryHex, 0.95);
      fxG.beginPath();
      fxG.arc(neckX, neckY, 70, -Math.PI / 4, Math.PI / 3, false);
      fxG.strokePath();
    }
  } else if (state === 'uppercut') {
    if (charDef.id === 'shadow_ronin') {
      fxG.lineStyle(5, 0x00e5ff, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 25, 48, -Math.PI * 0.6, Math.PI * 0.4, false);
      fxG.strokePath();
    } else if (charDef.id === 'cyber_valkyrie') {
      fxG.lineStyle(6, 0xef4444, 0.95);
      fxG.lineBetween(armR.tip.x, armR.tip.y + 35, armR.tip.x, armR.tip.y - 25);
    } else if (charDef.id === 'volt_shinobi') {
      fxG.lineStyle(4, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 35);
      fxG.lineTo(armR.tip.x - facing * 8, armR.tip.y + 15);
      fxG.lineTo(armR.tip.x + facing * 6, armR.tip.y - 5);
      fxG.lineTo(armR.tip.x, armR.tip.y - 25);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      fxG.lineStyle(5, 0xa855f7, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 25, 42, -Math.PI / 2, Math.PI / 2, false);
      fxG.strokePath();
    } else {
      fxG.lineStyle(5, primaryHex, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 30, 45, -Math.PI / 2, Math.PI / 2, false);
      fxG.strokePath();
    }
  } else if (state === 'jump_kick') {
    fxG.lineStyle(5, primaryHex, 0.95);
    fxG.beginPath();
    fxG.lineBetween(hipX, hipY, legR.tip.x + facing * 24, legR.tip.y);
    fxG.strokePath();

    if (charDef.id === 'volt_shinobi') {
      fxG.lineStyle(2, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(hipX, hipY);
      fxG.lineTo((hipX + legR.tip.x) / 2 + (Math.random() - 0.5) * 10, (hipY + legR.tip.y) / 2 - 8);
      fxG.lineTo(legR.tip.x + facing * 24, legR.tip.y);
      fxG.strokePath();
    }
  } else if (state === 'kick') {
    fxG.lineStyle(4, accentHex, 0.9);
    fxG.beginPath();
    fxG.arc(hipX, hipY - 5, 45, -Math.PI / 3, Math.PI / 3, false);
    fxG.strokePath();
  } else if (state === 'jab') {
    fxG.lineStyle(3, primaryHex, 0.85);
    fxG.lineBetween(armR.joint.x, armR.joint.y, armR.tip.x + facing * 12, armR.tip.y);
  }
}
