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
   * Positions Freya's non-bone armour pieces at their sockets.  The atlas is
   * deliberately made from complete armour components, so these pieces need a
   * physical display size rather than being stretched along a near-zero helper
   * line (for example the pelvis and shoulder plate used to become 5px tall).
   * Returning true means the caller must not use the generic bone transform.
   */
  private placeCyberValkyrieSocketPart(
    sprite: Phaser.GameObjects.Sprite | any,
    layer: RigBoneKey,
    pose: SkeletonPose,
    facing: number,
    state: FighterState,
    time: number
  ): boolean {
    const rearShoulder = {
      x: pose.lShoulder.x,
      y: pose.lShoulder.y
    };
    const leadShoulder = {
      x: pose.rShoulder.x,
      y: pose.rShoulder.y
    };
    const rearHip = {
      x: pose.lHip.x,
      y: pose.lHip.y
    };
    const leadHip = {
      x: pose.rHip.x,
      y: pose.rHip.y
    };
    const setPart = (
      x: number,
      y: number,
      width: number,
      height: number,
      rotation = 0,
      visible = true,
      originX = 0.5,
      originY = 0.5
    ) => {
      const effOriginX = facing < 0 ? (1 - originX) : originX;
      if (typeof sprite.setOrigin === 'function') sprite.setOrigin(effOriginX, originY);
      if (typeof sprite.setPosition === 'function') sprite.setPosition(x, y);
      if (typeof sprite.setRotation === 'function') sprite.setRotation(rotation);
      if (typeof sprite.setDisplaySize === 'function') sprite.setDisplaySize(width, height);
      if (typeof sprite.setFlipX === 'function') sprite.setFlipX(facing < 0);
      if (typeof sprite.setVisible === 'function') sprite.setVisible(visible);
      else sprite.visible = visible;
    };
    const setLimb = (
      start: Vector2D,
      end: Vector2D,
      width: number,
      extraLength = 0,
      lateralOffset = 0
    ) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      setPart(
        (start.x + end.x) / 2 + lateralOffset,
        (start.y + end.y) / 2,
        width,
        length + extraLength,
        Math.atan2(dy, dx) - Math.PI / 2
      );
    };
    const setHand = (
      forearmStart: Vector2D,
      wrist: Vector2D,
      width: number,
      height: number,
      lateralOffset = 0,
      verticalOffset = 0
    ) => {
      const dx = wrist.x - forearmStart.x;
      const dy = wrist.y - forearmStart.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const directionX = dx / length;
      const directionY = dy / length;
      setPart(
        wrist.x + directionX * height * 0.36 + lateralOffset,
        wrist.y + directionY * height * 0.36 + verticalOffset,
        width,
        height,
        Math.atan2(dy, dx) - Math.PI / 2
      );
    };

    const setLimbJoint = (
      start: Vector2D,
      end: Vector2D,
      width: number,
      pivotY = 0.12,
      pivotX = 0.5,
      aspectMultiplier = 1.12
    ) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const boneLength = Math.max(1, Math.hypot(dx, dy));
      const displayHeight = boneLength * aspectMultiplier;
      setPart(
        start.x,
        start.y,
        width,
        displayHeight,
        Math.atan2(dy, dx) - Math.PI / 2,
        true,
        pivotX,
        pivotY
      );
    };

    switch (layer) {
      case 'rear_accessory':
      case 'visor_optics':
      case 'rear_knee_cap':
      case 'rear_elbow_cap':
      case 'weapon_glow_fx':
        setPart(0, 0, 1, 1, 0, false);
        return true;
      case 'rear_foot':
        setPart(pose.legL.tip.x + facing * 2, pose.legL.tip.y, 32, 22, 0, true, 0.45, 0.35);
        return true;
      case 'rear_hand': {
        const dx = pose.armL.tip.x - pose.armL.joint.x;
        const dy = pose.armL.tip.y - pose.armL.joint.y;
        setPart(pose.armL.tip.x, pose.armL.tip.y, 20, 26, Math.atan2(dy, dx) - Math.PI / 2, true, 0.5, 0.20);
        return true;
      }
      case 'rear_pauldron':
        setPart(rearShoulder.x, rearShoulder.y - 2, 32, 38, 0, true, 0.50, 0.35);
        return true;
      case 'pelvis_waist':
        setPart(pose.hip.x, pose.hip.y - 14, 42, 32, 0, true, 0.50, 0.10);
        return true;
      case 'torso_cuirass':
        setPart(pose.neck.x, pose.neck.y - 2, 42, 56, 0, true, 0.45, 0.05);
        return true;
      case 'headgear_base':
        setPart(pose.neck.x - facing * 2, pose.neck.y - 4, 38, 42, 0, true, 0.50, 0.90);
        return true;
      case 'weapon_base': {
        const dx = pose.armR.tip.x - pose.armR.joint.x;
        const dy = pose.armR.tip.y - pose.armR.joint.y;
        setPart(pose.armR.tip.x, pose.armR.tip.y, 20, 26, Math.atan2(dy, dx) - Math.PI / 2, true, 0.5, 0.20);
        return true;
      }
      case 'rear_shin':
        setLimbJoint(pose.legL.joint, pose.legL.tip, 20, 0.10, 0.5, 1.15);
        return true;
      case 'rear_thigh':
        setLimbJoint(rearHip, pose.legL.joint, 22, 0.12, 0.5, 1.15);
        return true;
      case 'rear_forearm':
        setLimbJoint(pose.armL.joint, pose.armL.tip, 18, 0.15, 0.5, 1.15);
        return true;
      case 'rear_upper_arm':
        setLimbJoint(rearShoulder, pose.armL.joint, 20, 0.15, 0.5, 1.15);
        return true;
      case 'lead_thigh':
        setLimbJoint(leadHip, pose.legR.joint, 22, 0.12, 0.5, 1.15);
        return true;
      case 'lead_shin_boot':
        setLimbJoint(pose.legR.joint, pose.legR.tip, 20, 0.10, 0.5, 1.15);
        return true;
      case 'lead_upper_arm_pauldron':
        setLimbJoint(leadShoulder, pose.armR.joint, 20, 0.15, 0.5, 1.15);
        return true;
      case 'lead_forearm_gauntlet':
        setLimbJoint(pose.armR.joint, pose.armR.tip, 18, 0.15, 0.5, 1.15);
        return true;
      default:
        return false;
    }
  }

  /**
   * Draw Freya's arms and legs as high-contrast armour segments at the live
   * IK joints. At the in-game fighter scale, this stays readable where a
   * second set of photo-detail limb slices turns into an indistinct clump.
   * The head/chest/hips remain the high-detail core sprite; these graphics are
   * the genuinely animated limbs for every combat state.
   */
  private renderCyberValkyrieAnimatedLimbs(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container | any,
    pose: SkeletonPose,
    facing: number,
    state: FighterState
  ): void {
    const createGraphics = (key: '__cyberRearGraphics' | '__cyberFrontGraphics', depth: number) => {
      let graphics = container[key];
      if (!graphics && scene?.add?.graphics) {
        graphics = scene.add.graphics();
        graphics.setDepth?.(depth);
        container[key] = graphics;
      }
      return graphics;
    };
    const rear = createGraphics('__cyberRearGraphics', 8);
    const front = createGraphics('__cyberFrontGraphics', 11);
    if (!rear || !front) return;
    rear.clear();
    front.clear();
    rear.setVisible?.(state !== 'knockdown');
    front.setVisible?.(state !== 'knockdown');
    if (state === 'knockdown') return;

    const drawSegment = (
      graphics: Phaser.GameObjects.Graphics | any,
      start: Vector2D,
      end: Vector2D,
      startWidth: number,
      endWidth: number,
      color: number,
      accent: number
    ) => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;
      graphics.fillStyle(0x10131b, 1);
      graphics.beginPath();
      graphics.moveTo(start.x + nx * (startWidth + 2), start.y + ny * (startWidth + 2));
      graphics.lineTo(end.x + nx * (endWidth + 2), end.y + ny * (endWidth + 2));
      graphics.lineTo(end.x - nx * (endWidth + 2), end.y - ny * (endWidth + 2));
      graphics.lineTo(start.x - nx * (startWidth + 2), start.y - ny * (startWidth + 2));
      graphics.closePath();
      graphics.fillPath();
      graphics.lineStyle(1.5, 0x6b0d14, 1);
      graphics.strokePath();

      graphics.fillStyle(color, 1);
      graphics.beginPath();
      graphics.moveTo(start.x + nx * startWidth, start.y + ny * startWidth);
      graphics.lineTo(end.x + nx * endWidth, end.y + ny * endWidth);
      graphics.lineTo(end.x - nx * endWidth, end.y - ny * endWidth);
      graphics.lineTo(start.x - nx * startWidth, start.y - ny * startWidth);
      graphics.closePath();
      graphics.fillPath();
      graphics.lineStyle(1.25, accent, 0.95);
      graphics.beginPath();
      graphics.moveTo(start.x + nx * Math.max(1, startWidth - 2), start.y + ny * Math.max(1, startWidth - 2));
      graphics.lineTo(end.x + nx * Math.max(1, endWidth - 2), end.y + ny * Math.max(1, endWidth - 2));
      graphics.strokePath();
    };
    const drawJoint = (graphics: Phaser.GameObjects.Graphics | any, point: Vector2D, radius: number) => {
      graphics.fillStyle(0x171923, 1);
      graphics.fillCircle(point.x, point.y, radius + 2);
      graphics.lineStyle(1.5, 0xf43f5e, 1);
      graphics.strokeCircle(point.x, point.y, radius + 1);
      graphics.fillStyle(0xef4444, 1);
      graphics.fillCircle(point.x, point.y, Math.max(2, radius - 2));
    };
    const drawBoot = (graphics: Phaser.GameObjects.Graphics | any, foot: Vector2D, rearFoot: boolean) => {
      const toe = foot.x + facing * (rearFoot ? 13 : 16);
      graphics.fillStyle(0x10131b, 1);
      graphics.fillRoundedRect(Math.min(foot.x, toe) - 4, foot.y - 9, Math.abs(toe - foot.x) + 9, 12, 3);
      graphics.fillStyle(0x7f1d1d, 1);
      graphics.fillRoundedRect(Math.min(foot.x, toe) - 2, foot.y - 7, Math.abs(toe - foot.x) + 6, 7, 2);
      graphics.lineStyle(1.3, 0xfbbf24, 0.9);
      graphics.lineBetween(foot.x - facing * 2, foot.y - 4, toe, foot.y - 3);
    };

    // Kinetic wings are intentionally simple silhouettes so they sit behind
    // the body instead of obscuring its human outline.
    rear.fillStyle(0x240b11, 1);
    rear.lineStyle(2, 0xef4444, 0.95);
    rear.beginPath();
    rear.moveTo(pose.neck.x - facing * 8, pose.neck.y + 8);
    rear.lineTo(pose.neck.x - facing * 38, pose.neck.y - 6);
    rear.lineTo(pose.neck.x - facing * 28, pose.neck.y + 17);
    rear.lineTo(pose.neck.x - facing * 47, pose.neck.y + 28);
    rear.lineTo(pose.neck.x - facing * 12, pose.neck.y + 22);
    rear.closePath();
    rear.fillPath();
    rear.strokePath();

    // Rear limbs stay behind the connected body core.
    drawSegment(rear, pose.lHip, pose.legL.joint, 11, 9, 0x5f151f, 0xef4444);
    drawSegment(rear, pose.legL.joint, pose.legL.tip, 9, 7, 0x33141b, 0xf97316);
    drawJoint(rear, pose.legL.joint, 5);
    drawBoot(rear, pose.legL.tip, true);
    drawSegment(rear, pose.lShoulder, pose.armL.joint, 9, 7, 0x501923, 0xef4444);
    drawSegment(rear, pose.armL.joint, pose.armL.tip, 7, 6, 0x33141b, 0xfbbf24);
    drawJoint(rear, pose.armL.joint, 4);

    // Lead limbs are crisp and prominent for every jab, kick and heavy.
    drawSegment(front, pose.rHip, pose.legR.joint, 12, 10, 0x8f1d27, 0xfbbf24);
    drawSegment(front, pose.legR.joint, pose.legR.tip, 10, 8, 0x4b1720, 0xef4444);
    drawJoint(front, pose.legR.joint, 6);
    drawBoot(front, pose.legR.tip, false);
    drawSegment(front, pose.rShoulder, pose.armR.joint, 11, 8, 0x9f2029, 0xfbbf24);
    drawSegment(front, pose.armR.joint, pose.armR.tip, 8, 7, 0x5f151f, 0xef4444);
    drawJoint(front, pose.armR.joint, 5);
    drawJoint(front, pose.armR.tip, 7);
    drawJoint(rear, pose.armL.tip, 6);
  }

  /** Draw a readable helmet, chest and hips between Freya's live limbs. */
  private renderCyberValkyrieAnimatedCore(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container | any,
    pose: SkeletonPose,
    facing: number,
    state: FighterState,
    time: number
  ): void {
    let graphics = container.__cyberCoreGraphics;
    if (!graphics && scene?.add?.graphics) {
      graphics = scene.add.graphics();
      graphics.setDepth?.(10);
      container.__cyberCoreGraphics = graphics;
    }
    if (!graphics) return;
    graphics.clear();
    graphics.setVisible?.(state !== 'knockdown');
    if (state === 'knockdown') return;

    const neck = pose.neck;
    const hip = pose.hip;
    const head = pose.head;
    const coreX = (neck.x + hip.x) / 2;
    const chestY = neck.y + 21;
    const waistY = hip.y - 7;
    const shoulderY = neck.y + 6;
    const pulse = 0.75 + Math.sin(time / 120) * 0.2;

    // A narrow upper torso and wider shoulders/hips create an unmistakable
    // human armoured stance at the 100px gameplay scale.
    graphics.fillStyle(0x11131b, 1);
    graphics.beginPath();
    graphics.moveTo(coreX - 25, shoulderY);
    graphics.lineTo(coreX + 25, shoulderY);
    graphics.lineTo(coreX + 17, waistY);
    graphics.lineTo(coreX + 21, hip.y + 8);
    graphics.lineTo(coreX - 21, hip.y + 8);
    graphics.lineTo(coreX - 17, waistY);
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(2, 0x7f1d1d, 1);
    graphics.strokePath();

    graphics.fillStyle(0x7f1d1d, 1);
    graphics.beginPath();
    graphics.moveTo(coreX - 20, shoulderY + 4);
    graphics.lineTo(coreX, chestY - 4);
    graphics.lineTo(coreX + 20, shoulderY + 4);
    graphics.lineTo(coreX + 14, waistY - 3);
    graphics.lineTo(coreX, waistY + 2);
    graphics.lineTo(coreX - 14, waistY - 3);
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(1.4, 0xfbbf24, 0.9);
    graphics.strokePath();
    graphics.lineStyle(1.1, 0xf87171, 0.8);
    graphics.lineBetween(coreX - 15, chestY, coreX - 3, waistY - 4);
    graphics.lineBetween(coreX + 15, chestY, coreX + 3, waistY - 4);

    // Shoulder plates make the torso visibly connect with the arm roots.
    graphics.fillStyle(0x991b1b, 1);
    graphics.fillRoundedRect(coreX - 31, shoulderY - 6, 17, 16, 5);
    graphics.fillRoundedRect(coreX + 14, shoulderY - 6, 17, 16, 5);
    graphics.lineStyle(1.5, 0xfbbf24, 1);
    graphics.strokeRoundedRect(coreX - 31, shoulderY - 6, 17, 16, 5);
    graphics.strokeRoundedRect(coreX + 14, shoulderY - 6, 17, 16, 5);

    // Pelvis plate bridges the torso to both moving thighs.
    graphics.fillStyle(0x3f1722, 1);
    graphics.beginPath();
    graphics.moveTo(coreX - 19, hip.y - 6);
    graphics.lineTo(coreX + 19, hip.y - 6);
    graphics.lineTo(coreX + 15, hip.y + 12);
    graphics.lineTo(coreX, hip.y + 17);
    graphics.lineTo(coreX - 15, hip.y + 12);
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(1.5, 0xef4444, 1);
    graphics.strokePath();

    // Helmet and illuminated visor.
    graphics.fillStyle(0x11131b, 1);
    graphics.fillRoundedRect(head.x - 13, head.y - 15, 26, 29, 8);
    graphics.lineStyle(1.8, 0xfbbf24, 0.9);
    graphics.strokeRoundedRect(head.x - 13, head.y - 15, 26, 29, 8);
    graphics.fillStyle(0x991b1b, 1);
    graphics.fillRoundedRect(head.x - 10, head.y - 12, 20, 10, 4);
    graphics.lineStyle(2.2, 0xfca5a5, pulse);
    graphics.lineBetween(head.x - 8, head.y - 7, head.x + 8, head.y - 7);
    graphics.fillStyle(0xfbbf24, 1);
    graphics.fillTriangle(head.x, head.y - 25, head.x - 4, head.y - 14, head.x + 4, head.y - 14);

    // Pulsing kinetic chest reactor, tied to the combat core.
    graphics.fillStyle(0x2b0710, 1);
    graphics.fillCircle(coreX, chestY + 5, 7);
    graphics.lineStyle(1.6, 0xfbbf24, 0.9);
    graphics.strokeCircle(coreX, chestY + 5, 7);
    graphics.fillStyle(0xef4444, pulse);
    graphics.fillCircle(coreX, chestY + 5, 4);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(coreX + facing, chestY + 4, 1.2);
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

    if (!isLoaded || characterId === 'cyber_valkyrie') {
      // Hide texture rig sprites when using procedural fallback
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

    if (characterId === 'cyber_valkyrie') {
      // Cyber Valkyrie is a fully articulated atlas rig. The individual
      // armour components follow the live fight skeleton so punches, kicks,
      // recoil and knockdowns move actual limbs rather than a static body.
      container.__cyberReferenceBody?.setVisible?.(false);
      // Do not layer a cropped reference body over the articulated rig. It
      // slices through the waist and hides limbs; every visible body section
      // must instead be an independently placed atlas component.
      container.__cyberCoreSprite?.setVisible?.(false);
      container.__cyberRearGraphics?.clear?.();
      container.__cyberFrontGraphics?.clear?.();
      container.__cyberCoreGraphics?.clear?.();
    } else if (container.__cyberCoreSprite) {
      container.__cyberCoreSprite.setVisible?.(false);
      container.__cyberRearGraphics?.clear?.();
      container.__cyberFrontGraphics?.clear?.();
      container.__cyberCoreGraphics?.clear?.();
    }

    // Update each sprite layer
    for (let i = 0; i < RIG_Z_INDEX_MATRIX.length; i++) {
      const layer = RIG_Z_INDEX_MATRIX[i];
      const sprite = container.list[i];
      if (!sprite) continue;
      // Freya's front lower leg is a single shin-and-boot art piece.  Keep
      // the original frame name for every other character, whose atlas uses
      // `lead_shin`, so this dedicated part cannot produce cross-character
      // missing-frame warnings.
      const atlasPart = layer.atlasPart;

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
      const meta = ModularAtlasManager.getPartMetadata(characterId, atlasPart);
      const pivot = { pivotX: meta?.pivotX ?? 0.5, pivotY: meta?.pivotY ?? 0.15 };
      const sourceHeight = meta?.h ?? layer.nominalHeight;
      const sourceWidth = meta?.w ?? layer.nominalWidth;

      this.applyLimbTransformToSprite(sprite, transform, pivot, sourceHeight, sourceWidth);

      // Vertical sprite alignment: sprites painted along the vertical axis (Y-down)
      // require a -90 deg rotation offset to align with 2D IK angleRad (where 0 rad is +X).
      // Head, pelvis, pauldrons, and horizontal boots stay level (rotation = 0).
      const isLevelLayer =
        layer.name === 'headgear_base' ||
        layer.name === 'visor_optics' ||
        layer.name === 'pelvis_waist' ||
        layer.name === 'rear_pauldron' ||
        layer.name === 'rear_foot';

      const rot = isLevelLayer ? 0 : transform.angleRad - Math.PI / 2;
      if (typeof sprite.setRotation === 'function') {
        sprite.setRotation(rot);
      } else {
        sprite.rotation = rot;
      }

      if (typeof sprite.setTexture === 'function') {
        sprite.setTexture(texKey, atlasPart);
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
      if (container.list) {
        for (let i = 0; i < container.list.length; i++) {
          const item = container.list[i];
          if (item !== container.__fallbackGraphics && item !== container.__fallbackFxGraphics) {
            if (typeof item.setVisible === 'function') {
              item.setVisible(false);
            }
          }
        }
      }
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

      let thighW1 = 11;
      let thighW2 = 8;
      let shinW1 = 8;
      let shinW2 = 6;
      let armW1 = 9;
      let armW2 = 7;
      let forearmW1 = 7;
      let forearmW2 = 5;

      if (charDef.id === 'cyber_valkyrie') {
        thighW1 = 14;
        thighW2 = 10;
        shinW1 = 10;
        shinW2 = 8;
        armW1 = 12;
        armW2 = 9;
        forearmW1 = 9;
        forearmW2 = 7;
      } else if (charDef.id === 'volt_shinobi') {
        thighW1 = 10;
        thighW2 = 7;
        shinW1 = 7;
        shinW2 = 5;
        armW1 = 8;
        armW2 = 6;
        forearmW1 = 6;
        forearmW2 = 4.5;
      } else if (charDef.id === 'void_assassin') {
        thighW1 = 10;
        thighW2 = 7;
        shinW1 = 7;
        shinW2 = 4.5;
        armW1 = 8;
        armW2 = 5.5;
        forearmW1 = 5.5;
        forearmW2 = 4;
      }

      // Draw rear limbs (Layer 1 - Behind Torso)
      drawTaperedLimb(g, lHip, legL.joint, thighW1, thighW2, bodyColor);
      drawTaperedLimb(g, legL.joint, legL.tip, shinW1, shinW2, bodyColor);

      // Rear Foot (Clean grounded silhouette foot)
      g.fillStyle(bodyColor, 1);
      g.beginPath();
      g.moveTo(legL.tip.x - facing * 5, legL.tip.y - 2);
      g.lineTo(legL.tip.x + facing * 8, legL.tip.y - 1);
      g.lineTo(legL.tip.x + facing * 11, legL.tip.y + 4);
      g.lineTo(legL.tip.x - facing * 6, legL.tip.y + 4);
      g.closePath();
      g.fillPath();

      drawTaperedLimb(g, lShoulder, armL.joint, armW1, armW2, bodyColor);
      drawTaperedLimb(g, armL.joint, armL.tip, forearmW1, forearmW2, bodyColor);

      // Draw torso, headgear, waist (Layer 2)
      const neckL = { x: neck.x - facing * 7, y: neck.y };
      const neckR = { x: neck.x + facing * 7, y: neck.y };
      const hipL = { x: hip.x - facing * 5, y: hip.y };
      const hipR = { x: hip.x + facing * 5, y: hip.y };
      drawCharacterPauldronsAndTorso(g, neckL, neckR, hipL, hipR, lShoulder, rShoulder, facing, charDef, state, time);
      drawCharacterWaistAndScarf(g, hip.x, hip.y, head.x, head.y, facing, charDef, state, time);
      drawCharacterHeadgear(g, head.x, head.y, facing, charDef, state, time);

      // Draw lead limbs (Layer 3 - In Front of Torso)
      drawTaperedLimb(g, rHip, legR.joint, thighW1, thighW2, bodyColor);
      drawTaperedLimb(g, legR.joint, legR.tip, shinW1, shinW2, bodyColor);

      // Lead Foot (Clean grounded silhouette foot)
      g.fillStyle(bodyColor, 1);
      g.beginPath();
      g.moveTo(legR.tip.x - facing * 5, legR.tip.y - 2);
      g.lineTo(legR.tip.x + facing * 9, legR.tip.y - 1);
      g.lineTo(legR.tip.x + facing * 13, legR.tip.y + 4);
      g.lineTo(legR.tip.x - facing * 6, legR.tip.y + 4);
      g.closePath();
      g.fillPath();

      drawTaperedLimb(g, rShoulder, armR.joint, armW1, armW2, bodyColor);
      drawTaperedLimb(g, armR.joint, armR.tip, forearmW1, forearmW2, bodyColor);

      // Draw weapons and attacks (suppressed during knockdown — fxG must stay clear-only)
      if (state !== 'knockdown') {
        drawCharacterGauntletsAndWeapons(g, fxG, armL, armR, facing, charDef, state, time);
        drawCharacterAttackVFX(fxG, charDef, state, neck.x, neck.y, hip.x, hip.y, armR, legR, facing, time);
      }
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
  state: FighterState = 'idle',
  time: number = 0
): void {
  const { theme, gear } = charDef;
  const headRadius = 15;
  const headType = gear.headType;

  // Base head skull mesh
  g.fillStyle(theme.bodyColor, 1);
  g.fillCircle(headX, headY, headRadius);

  // 1. Shadow Ronin (Kage): Sleek Cyber-Kabuto Helmet Silhouette with Faceted Gold Kuwagata Horns & Glowing Azure Visor
  if (headType === 'kabuto_visor' || charDef.id === 'shadow_ronin') {
    // Upper Kabuto helmet shell (solid dark silhouette)
    g.fillStyle(theme.bodyColor, 1);
    g.beginPath();
    const startAngle = facing > 0 ? Math.PI : 0;
    const endAngle = facing > 0 ? 0 : Math.PI;
    g.arc(headX, headY - 2, headRadius + 1.5, startAngle, endAngle, facing < 0);
    g.lineTo(headX + facing * (headRadius + 2), headY + 3);
    g.lineTo(headX - facing * (headRadius + 5), headY + 6);
    g.closePath();
    g.fillPath();

    // Shikoro neck guard rim in silhouette
    g.fillStyle(theme.bodyColor, 1);
    g.beginPath();
    g.moveTo(headX - facing * (headRadius + 4), headY + 3);
    g.lineTo(headX - facing * (headRadius + 7), headY + 12);
    g.lineTo(headX - facing * (headRadius - 2), headY + 10);
    g.closePath();
    g.fillPath();

    // Faceted Golden Kuwagata Horns (Maedate crest)
    const crestBaseX = headX + facing * 4;
    const crestBaseY = headY - 14;

    g.fillStyle(0xfbbf24, 1);
    g.beginPath();
    g.moveTo(crestBaseX, crestBaseY);
    g.lineTo(crestBaseX + facing * 14, crestBaseY - 16);
    g.lineTo(crestBaseX + facing * 6, crestBaseY - 10);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xd97706, 1);
    g.beginPath();
    g.moveTo(crestBaseX - facing * 4, crestBaseY);
    g.lineTo(crestBaseX - facing * 2, crestBaseY - 13);
    g.lineTo(crestBaseX - facing * 6, crestBaseY - 8);
    g.closePath();
    g.fillPath();

    // Center Maedate Crest Jewel
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(crestBaseX, crestBaseY, 3);

    // Glowing Azure Plasma Visor Slit
    if (state !== 'knockdown') {
      const visorX = headX + facing * 5;
      const visorY = headY - 2;

      g.lineStyle(3, 0x00e5ff, 1);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY);
      g.lineTo(visorX + facing * 9, visorY);
      g.strokePath();

      g.fillStyle(0xffffff, 1);
      g.fillCircle(visorX + facing * 3.5, visorY, 1.5);
    }
  }

  // 2. Cyber Valkyrie (Freya): Winged Titanium Helm Silhouette with Glowing Crimson Visor
  else if (headType === 'valkyrie_helm' || charDef.id === 'cyber_valkyrie') {
    // Base helmet shell
    g.fillStyle(theme.bodyColor, 1);
    g.beginPath();
    const valkStart = facing > 0 ? Math.PI * 0.85 : Math.PI * 0.15;
    const valkEnd = facing > 0 ? Math.PI * 0.15 : Math.PI * 0.85;
    g.arc(headX, headY - 1, headRadius + 2.5, valkStart, valkEnd, facing < 0);
    g.lineTo(headX + facing * 14, headY + 6);
    g.lineTo(headX - facing * 10, headY + 8);
    g.closePath();
    g.fillPath();

    // Valkyrie Swept Golden Wings Crest
    const wingX = headX - facing * 3;
    const wingY = headY - 14;

    g.fillStyle(0xfbbf24, 1);
    g.beginPath();
    g.moveTo(wingX, wingY);
    g.lineTo(wingX - facing * 20, wingY - 16);
    g.lineTo(wingX - facing * 10, wingY - 4);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xf59e0b, 1);
    g.beginPath();
    g.moveTo(wingX - facing * 2, wingY + 3);
    g.lineTo(wingX - facing * 16, wingY - 7);
    g.lineTo(wingX - facing * 7, wingY + 2);
    g.closePath();
    g.fillPath();

    // Center Gold Crest Boss
    g.fillStyle(0xfef08a, 1);
    g.fillCircle(wingX + facing * 2, wingY + 2, 2.5);

    // Glowing Crimson HUD Visor Slit
    if (state !== 'knockdown') {
      const visorX = headX + facing * 6;
      const visorY = headY - 1;

      g.lineStyle(3, 0xff1744, 1);
      g.beginPath();
      g.moveTo(visorX - facing * 3, visorY);
      g.lineTo(visorX + facing * 8, visorY + 1);
      g.strokePath();

      g.fillStyle(0xffffff, 1);
      g.fillCircle(visorX + facing * 2, visorY + 0.5, 1.6);
    }
  }

  // 3. Volt Shinobi (Raijin): Aerodynamic Shinobi Mask Silhouette with Gold Forehead Plate & Amber Visor
  else if (headType === 'shinobi_mask' || charDef.id === 'volt_shinobi') {
    // Faceted Shinobi Mask Cowl
    g.fillStyle(theme.bodyColor, 1);
    g.beginPath();
    g.moveTo(headX + facing * 15, headY - 2);
    g.lineTo(headX + facing * 7, headY + 14);
    g.lineTo(headX - facing * 10, headY + 9);
    g.lineTo(headX - facing * 13, headY - 4);
    g.closePath();
    g.fillPath();

    // Gold Forehead Protector Plate
    const plateX = headX + facing * 3;
    const plateY = headY - 11;
    g.fillStyle(0xfbbf24, 1);
    g.beginPath();
    g.moveTo(plateX - facing * 7, plateY - 2);
    g.lineTo(plateX + facing * 7, plateY - 2);
    g.lineTo(plateX + facing * 5, plateY + 3);
    g.lineTo(plateX - facing * 5, plateY + 3);
    g.closePath();
    g.fillPath();

    // Glowing Golden HUD Visor
    if (state !== 'knockdown') {
      const visorX = headX + facing * 5;
      const visorY = headY - 4;

      g.lineStyle(2.5, 0xfde047, 1);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY + 1);
      g.lineTo(visorX + facing * 9, visorY + 2);
      g.strokePath();

      g.fillStyle(0xffffff, 1);
      g.fillCircle(visorX + facing * 3.5, visorY + 1.5, 1.4);
    }
  }

  // 4. Void Assassin (Nyx): Stealth Shadow Cowl with Glowing Amethyst Dual Slit Eyes
  else if (headType === 'shadow_hood' || charDef.id === 'void_assassin') {
    // Volumetric Shadow Hood Cowl Silhouette
    g.fillStyle(theme.bodyColor, 1);
    g.beginPath();
    g.moveTo(headX + facing * 2, headY - 20);
    g.lineTo(headX + facing * 17, headY - 4);
    g.lineTo(headX + facing * 15, headY + 13);
    g.lineTo(headX - facing * 17, headY + 11);
    g.lineTo(headX - facing * 15, headY - 15);
    g.closePath();
    g.fillPath();

    // Glowing Amethyst Dual Slit Eyes
    if (state !== 'knockdown') {
      const eyeX = headX + facing * 6;
      const eyeY = headY - 1;

      g.lineStyle(2.5, 0xc084fc, 1);
      g.beginPath();
      g.moveTo(eyeX - facing * 2, eyeY + 1);
      g.lineTo(eyeX + facing * 3, eyeY - 2);
      g.moveTo(eyeX + facing * 3, eyeY - 1);
      g.lineTo(eyeX + facing * 8, eyeY - 3);
      g.strokePath();

      g.fillStyle(0xffffff, 1);
      g.fillCircle(eyeX + facing * 1, eyeY - 0.5, 1.2);
      g.fillCircle(eyeX + facing * 5.5, eyeY - 2, 1.0);
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
  state: FighterState = 'idle',
  time: number = 0
): void {
  const { theme, gear } = charDef;
  const shoulderType = gear.shoulderType;

  // 1. Solid V-Taper Athletic Silhouette Torso
  g.fillStyle(theme.bodyColor, 1);
  g.beginPath();
  g.moveTo(neckL.x, neckL.y);
  g.lineTo(neckR.x, neckR.y);
  g.lineTo(hipR.x, hipR.y);
  g.lineTo(hipL.x, hipL.y);
  g.closePath();
  g.fillPath();

  const chestMidX = (neckL.x + neckR.x) / 2;
  const chestMidY = (neckL.y + neckR.y) / 2 + 10;

  // 2. Character Signature Chest Inlay & Pulsing Core
  if (charDef.id === 'cyber_valkyrie' || shoulderType === 'heavy_pauldrons') {
    // Pulsing diamond kinetic reactor core
    const corePulse = Math.sin(time / 120) * 0.25 + 0.75;
    g.fillStyle(0xff1744, corePulse);
    g.beginPath();
    g.moveTo(chestMidX + facing * 1, chestMidY - 5);
    g.lineTo(chestMidX + facing * 5, chestMidY);
    g.lineTo(chestMidX + facing * 1, chestMidY + 5);
    g.lineTo(chestMidX - facing * 3, chestMidY);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(chestMidX + facing * 1, chestMidY, 1.8);

    // Shoulder flares in silhouette
    g.fillStyle(theme.bodyColor, 1);
    g.beginPath();
    g.moveTo(rShoulder.x - facing * 6, rShoulder.y - 8);
    g.lineTo(rShoulder.x + facing * 12, rShoulder.y - 6);
    g.lineTo(rShoulder.x + facing * 10, rShoulder.y + 10);
    g.lineTo(rShoulder.x - facing * 5, rShoulder.y + 8);
    g.closePath();
    g.fillPath();
  } else if (charDef.id === 'shadow_ronin' || shoulderType === 'minimal_nanotech') {
    // Cyan Power Circuit Inlay
    g.lineStyle(1.5, 0x00e5ff, 0.85);
    g.beginPath();
    g.moveTo(neckL.x + 2, neckL.y + 7);
    g.lineTo(chestMidX, chestMidY + 2);
    g.lineTo(neckR.x - 2, neckR.y + 7);
    g.strokePath();

    // Sleek Sode shoulder flare in silhouette
    g.fillStyle(theme.bodyColor, 1);
    const rPlateX = facing > 0 ? rShoulder.x - facing * 4 : rShoulder.x - facing * 4 - 10;
    g.fillRect(rPlateX, rShoulder.y - 5, 10, 6);
  } else if (charDef.id === 'volt_shinobi' || shoulderType === 'light_mesh') {
    // Central Lightning Battery Core
    g.fillStyle(0xfde047, 1);
    g.fillCircle(chestMidX, chestMidY, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(chestMidX, chestMidY, 1.2);

    // Sleek shoulder curves in silhouette
    g.fillStyle(theme.bodyColor, 1);
    g.fillCircle(rShoulder.x + facing * 2, rShoulder.y, 6);
  } else if (charDef.id === 'void_assassin' || shoulderType === 'shadow_shroud') {
    // Pulsing Amethyst Void Rift Sigil
    const voidPulse = Math.sin(time / 200) * 0.3 + 0.7;
    g.lineStyle(1.5, 0xa855f7, voidPulse);
    g.beginPath();
    g.moveTo(chestMidX, chestMidY - 7);
    g.lineTo(chestMidX + facing * 5, chestMidY);
    g.lineTo(chestMidX, chestMidY + 7);
    g.lineTo(chestMidX - facing * 5, chestMidY);
    g.closePath();
    g.strokePath();

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(chestMidX, chestMidY, 1.2);

    // Shadow Shroud Mantle Drape in silhouette
    g.fillStyle(theme.bodyColor, 1);
    g.beginPath();
    g.moveTo(rShoulder.x - facing * 4, rShoulder.y - 8);
    g.lineTo(rShoulder.x + facing * 12, rShoulder.y - 2);
    g.lineTo(rShoulder.x + facing * 8, rShoulder.y + 11);
    g.lineTo(rShoulder.x, rShoulder.y + 6);
    g.closePath();
    g.fillPath();
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
  state: FighterState = 'idle',
  time: number = 0
): void {
  const { theme, gear } = charDef;
  const gauntletType = gear.gauntletType;

  // REAR HAND (armL.tip) - Solid Dark Silhouette Hand
  g.fillStyle(theme.bodyColor, 1);
  g.fillCircle(armL.tip.x, armL.tip.y, 6);

  // LEAD HAND & WEAPONS (armR.tip)
  if (gauntletType === 'plasma_strike' || charDef.id === 'shadow_ronin') {
    // Solid Dark Silhouette Hand
    g.fillStyle(theme.bodyColor, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 6);

    if (state !== 'knockdown') {
      // Calculate blade orientation from forearm IK with stance offset
      const dx = armR.tip.x - armR.joint.x;
      const dy = armR.tip.y - armR.joint.y;
      const forearmAngle = Math.atan2(dy, dx);
      const stanceOffset = state === 'uppercut' ? -0.5 : state === 'heavy' ? 0.4 : state === 'windup' ? -0.35 : 0.12;
      const bladeAngle = forearmAngle + facing * stanceOffset;
      const bladeLen = 36;
      const cosA = Math.cos(bladeAngle);
      const sinA = Math.sin(bladeAngle);
      const bladeEndX = armR.tip.x + cosA * bladeLen;
      const bladeEndY = armR.tip.y + sinA * bladeLen;

      // Tsuka (Katana Hilt Grip) extending backward
      const hiltLen = 8;
      const hiltEndX = armR.tip.x - cosA * hiltLen;
      const hiltEndY = armR.tip.y - sinA * hiltLen;

      // Dark wrapped Tsuka hilt
      g.lineStyle(2.5, 0x0f172a, 1);
      g.beginPath();
      g.moveTo(armR.tip.x, armR.tip.y);
      g.lineTo(hiltEndX, hiltEndY);
      g.strokePath();

      // Gold Kashira (pommel) & Tsuba (guard)
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(hiltEndX, hiltEndY, 2);

      // Gold Tsuba disc perpendicular to blade
      const perpX = -sinA * 4;
      const perpY = cosA * 4;
      g.lineStyle(2.5, 0xfbbf24, 1);
      g.beginPath();
      g.moveTo(armR.tip.x - perpX, armR.tip.y - perpY);
      g.lineTo(armR.tip.x + perpX, armR.tip.y + perpY);
      g.strokePath();

      // Glowing Azure Plasma Blade (Outer cyan aura, inner white hot cutting edge)
      fxG.lineStyle(4.5, 0x00e5ff, 0.85);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      fxG.lineStyle(2, 0xffffff, 1);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      // Sharp Kissaki tip flare
      fxG.fillStyle(0x00e5ff, 0.9);
      fxG.fillCircle(bladeEndX, bladeEndY, 2);
      fxG.fillStyle(0xffffff, 1);
      fxG.fillCircle(bladeEndX, bladeEndY, 1);
    }
  } else if (gauntletType === 'hydraulic_brawler' || charDef.id === 'cyber_valkyrie') {
    // Solid Dark Brawler Fist in silhouette
    g.fillStyle(theme.bodyColor, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 8.5);

    // Glowing Crimson Hydraulic Knuckle Accent
    g.fillStyle(0xef4444, 1);
    g.fillCircle(armR.tip.x + facing * 2, armR.tip.y, 3);

    // Pulsating Kinetic Heat Aura
    if (state !== 'knockdown') {
      const heatPulse = Math.sin(time / 80) * 0.35 + 0.65;
      fxG.lineStyle(3.5, 0xff1744, heatPulse);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 11);
      fxG.fillStyle(0xffffff, heatPulse * 0.6);
      fxG.fillCircle(armR.tip.x + facing * 2, armR.tip.y, 2.5);
    }
  } else if (gauntletType === 'lightning_kunai' || charDef.id === 'volt_shinobi') {
    // Solid Dark Silhouette Hand
    g.fillStyle(theme.bodyColor, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 6);

    if (state !== 'knockdown') {
      const kunaiLen = 18;
      const kunaiAngle = state === 'uppercut' ? -Math.PI / 3 : state === 'heavy' ? Math.PI / 4 : 0;
      const cosK = Math.cos(kunaiAngle);
      const sinK = Math.sin(kunaiAngle);
      const kunaiTipX = armR.tip.x + facing * cosK * kunaiLen;
      const kunaiTipY = armR.tip.y + sinK * kunaiLen;

      // Faceted Cyber Kunai Body
      g.fillStyle(theme.bodyColor, 1);
      g.beginPath();
      g.moveTo(armR.tip.x, armR.tip.y - 3);
      g.lineTo(kunaiTipX, kunaiTipY);
      g.lineTo(armR.tip.x, armR.tip.y + 3);
      g.closePath();
      g.fillPath();

      // Glowing Amber Edge
      g.lineStyle(1.5, 0xf59e0b, 1);
      g.strokePath();

      // Continuous Harmonic Pulse Electric Discharge
      const sparkPhase = Math.sin(time / 50);
      const sparkPhase2 = Math.cos(time / 35);
      if (Math.abs(sparkPhase) > 0.2) {
        fxG.lineStyle(1.5, 0xfde047, 0.9);
        fxG.beginPath();
        fxG.moveTo(kunaiTipX, kunaiTipY);
        fxG.lineTo(kunaiTipX + facing * 6 * sparkPhase, kunaiTipY + sparkPhase2 * 5);
        fxG.strokePath();
      }
    }
  } else if (gauntletType === 'void_daggers' || charDef.id === 'void_assassin') {
    // Solid Dark Silhouette Hand
    g.fillStyle(theme.bodyColor, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 6);

    if (state !== 'knockdown') {
      const daggerLen = 22;
      const daggerAngle = state === 'uppercut' ? -Math.PI / 3 : state === 'heavy' ? Math.PI / 4 : -Math.PI / 8;
      const cosD = Math.cos(daggerAngle);
      const sinD = Math.sin(daggerAngle);
      const daggerTipX = armR.tip.x + facing * cosD * daggerLen;
      const daggerTipY = armR.tip.y + sinD * daggerLen;

      // Glowing Amethyst Void Blade Core
      fxG.fillStyle(0xa855f7, 0.5);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 2);
      fxG.lineTo(daggerTipX, daggerTipY);
      fxG.lineTo(armR.tip.x, armR.tip.y - 3);
      fxG.closePath();
      fxG.fillPath();

      // Sharp Neon Purple Edge
      fxG.lineStyle(2, 0xc084fc, 0.95);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 1);
      fxG.lineTo(daggerTipX, daggerTipY);
      fxG.lineTo(armR.tip.x, armR.tip.y - 2);
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
  state: FighterState = 'idle',
  time: number = 0
): void {
  const { theme, gear } = charDef;
  const waistType = gear.waistType;
  const accessoryType = gear.accessoryType;

  // 1. Waist Belts (Solid Silhouette with Centered Energy Node)
  g.fillStyle(theme.bodyColor, 1);
  g.fillRect(hipX - 5, hipY - 2.5, 10, 5);

  if (waistType === 'obi_sash' || charDef.id === 'shadow_ronin') {
    // Gold Buckle Crest
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(hipX, hipY, 2);

    // Dual Sash Knot Tails
    const obiWave = Math.sin(time / 100) * 4;
    g.lineStyle(2, 0x00e5ff, 0.9);
    g.beginPath();
    g.moveTo(hipX - facing * 3, hipY);
    g.lineTo(hipX - facing * 12, hipY + 11 + obiWave);
    g.strokePath();
  } else if (waistType === 'heavy_belt' || charDef.id === 'cyber_valkyrie') {
    // Crimson Core Buckle
    g.fillStyle(0xef4444, 1);
    g.fillCircle(hipX, hipY, 2.5);
  } else if (waistType === 'shinobi_belt' || charDef.id === 'volt_shinobi') {
    // Amber Center Buckle
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(hipX, hipY, 2);
  } else if (waistType === 'rift_sash' || charDef.id === 'void_assassin') {
    // Amethyst Orb Buckle
    g.fillStyle(0xc084fc, 1);
    g.fillCircle(hipX, hipY, 2.5);
  }

  // 2. Animated Flowing Headband Scarves / Storm Ribbons / Void Cloaks
  if (state !== 'knockdown') {
    const bandX = headX - facing * 12;
    const bandY = headY - 3;

    if (accessoryType === 'flowing_scarf' || charDef.id === 'shadow_ronin') {
      // Primary Cyan Ribbon
      const scarfWave = Math.sin(time / 120) * 6;
      g.lineStyle(3.5, 0x00e5ff, 0.95);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 16, bandY + 4 + scarfWave);
      g.lineTo(bandX - facing * 28, bandY + 12 + scarfWave * 1.6);
      g.strokePath();

      // Gold End-Cap Bead (Primary)
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(bandX - facing * 28, bandY + 12 + scarfWave * 1.6, 2.5);

      // Secondary Cyan Ribbon
      const scarfWave2 = Math.cos(time / 110) * 4;
      g.lineStyle(2, 0x0ea5e9, 0.8);
      g.beginPath();
      g.moveTo(bandX, bandY + 3);
      g.lineTo(bandX - facing * 12, bandY + 8 + scarfWave2);
      g.lineTo(bandX - facing * 22, bandY + 18 + scarfWave2 * 1.4);
      g.strokePath();

      // Gold End-Cap Bead (Secondary)
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(bandX - facing * 22, bandY + 18 + scarfWave2 * 1.4, 2);
    } else if (accessoryType === 'storm_ribbon' || charDef.id === 'volt_shinobi') {
      // Dual Glowing Golden / Amber Storm Ribbons with Harmonic Sine Waves
      const wave1 = Math.sin(time / 80) * 7;
      const wave2 = Math.cos(time / 70) * 5;

      // Primary Yellow Storm Ribbon
      g.lineStyle(2.5, 0xfde047, 1);
      g.beginPath();
      g.moveTo(bandX, bandY - 2);
      g.lineTo(bandX - facing * 18, bandY + 2 + wave1);
      g.lineTo(bandX - facing * 32, bandY + 8 + wave1 * 1.5);
      g.strokePath();

      // Golden Ribbon Tip
      g.fillStyle(0xfef08a, 1);
      g.fillCircle(bandX - facing * 32, bandY + 8 + wave1 * 1.5, 1.8);

      // Secondary Amber Storm Ribbon
      g.lineStyle(2, 0xf59e0b, 0.9);
      g.beginPath();
      g.moveTo(bandX, bandY + 2);
      g.lineTo(bandX - facing * 14, bandY + 6 + wave2);
      g.lineTo(bandX - facing * 26, bandY + 14 + wave2 * 1.3);
      g.strokePath();

      // Amber Ribbon Tip
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(bandX - facing * 26, bandY + 14 + wave2 * 1.3, 1.5);
    } else if (accessoryType === 'void_cloak' || charDef.id === 'void_assassin') {
      // Multi-Layered Billowing Void Cloak Trailing Shadow Waves
      const voidWave = Math.sin(time / 140) * 7;

      // Outer Void Shadow Cape
      g.lineStyle(4, 0xa855f7, 0.85);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 18, bandY + 6 + voidWave);
      g.lineTo(bandX - facing * 32, bandY + 16 + voidWave * 1.4);
      g.strokePath();

      // Inner Spectral Void Edge
      g.lineStyle(1.5, 0xc084fc, 0.7);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 18, bandY + 6 + voidWave);
      g.lineTo(bandX - facing * 32, bandY + 16 + voidWave * 1.4);
      g.strokePath();

      // Shadow Wisp Node
      g.fillStyle(0x7c3aed, 0.6);
      g.fillCircle(bandX - facing * 32, bandY + 16 + voidWave * 1.4, 2.5);
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
  time: number = 0
): void {
  // Suppress all attack VFX during knockdown or non-attack states
  if (state === 'knockdown' || state === 'idle' || state === 'hit' || state === 'windup' || state === 'step') {
    return;
  }

  const { theme } = charDef;
  const primaryHex = parseInt(theme.primaryColor.replace('#', '0x'), 16);
  const accentHex = parseInt(theme.accentColor.replace('#', '0x'), 16);

  if (state === 'heavy') {
    if (charDef.id === 'shadow_ronin') {
      // 72px Dual-Layer Concentric Azure Plasma Slash Arc
      const startAngle1 = facing > 0 ? -Math.PI / 3 : Math.PI * 2 / 3;
      const endAngle1 = facing > 0 ? Math.PI / 3 : Math.PI * 4 / 3;
      fxG.lineStyle(6, 0x00e5ff, 0.95);
      fxG.beginPath();
      fxG.arc(neckX + facing * 10, neckY, 72, startAngle1, endAngle1, false);
      fxG.strokePath();

      const startAngle2 = facing > 0 ? -Math.PI / 4 : Math.PI * 3 / 4;
      const endAngle2 = facing > 0 ? Math.PI / 4 : Math.PI * 5 / 4;
      fxG.lineStyle(2.5, 0xffffff, 1);
      fxG.beginPath();
      fxG.arc(neckX + facing * 10, neckY, 72, startAngle2, endAngle2, false);
      fxG.strokePath();
    } else if (charDef.id === 'cyber_valkyrie') {
      // 68px Heavy Kinetic Blast Arc & 18px Impact Ring
      const startAngle = facing > 0 ? -Math.PI / 4 : Math.PI / 2;
      const endAngle = facing > 0 ? Math.PI / 2 : Math.PI * 1.25;
      fxG.lineStyle(7, 0xef4444, 0.95);
      fxG.beginPath();
      fxG.arc(neckX + facing * 20, neckY + 10, 68, startAngle, endAngle, false);
      fxG.strokePath();

      // Kinetic Impact Ring at Fist Tip
      fxG.lineStyle(3, 0xfecaca, 1);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 18);
      fxG.fillStyle(0xffffff, 0.8);
      fxG.fillCircle(armR.tip.x, armR.tip.y, 4);
    } else if (charDef.id === 'volt_shinobi') {
      // Zigzagging Electrical Discharge Bolts
      fxG.lineStyle(4, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(neckX, neckY - 20);
      fxG.lineTo(neckX + facing * 30, neckY + 10);
      fxG.lineTo(armR.tip.x + facing * 20, armR.tip.y + 20);
      fxG.strokePath();

      fxG.lineStyle(2, 0xffffff, 0.9);
      fxG.beginPath();
      fxG.moveTo(neckX, neckY - 20);
      fxG.lineTo(neckX + facing * 28, neckY + 8);
      fxG.lineTo(armR.tip.x + facing * 18, armR.tip.y + 18);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      // Dual Concentric Swirling Dimensional Void Rings
      fxG.lineStyle(5, 0xa855f7, 0.95);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 24);
      fxG.lineStyle(2, 0xc084fc, 1);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 14);
      fxG.fillStyle(0x020205, 0.7);
      fxG.fillCircle(armR.tip.x, armR.tip.y, 8);
      fxG.fillStyle(0xffffff, 0.9);
      fxG.fillCircle(armR.tip.x, armR.tip.y, 2);
    } else {
      const startAngle = facing > 0 ? -Math.PI / 4 : Math.PI * 2 / 3;
      const endAngle = facing > 0 ? Math.PI / 3 : Math.PI * 5 / 4;
      fxG.lineStyle(6, primaryHex, 0.95);
      fxG.beginPath();
      fxG.arc(neckX + facing * 10, neckY, 70, startAngle, endAngle, false);
      fxG.strokePath();
    }
  } else if (state === 'uppercut') {
    if (charDef.id === 'shadow_ronin') {
      // 48px Vertical Rising Plasma Crescent Arc
      const startAngle = facing > 0 ? -Math.PI * 0.6 : Math.PI * 0.6;
      const endAngle = facing > 0 ? Math.PI * 0.4 : Math.PI * 1.6;
      fxG.lineStyle(5, 0x00e5ff, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 25, 48, startAngle, endAngle, false);
      fxG.strokePath();

      fxG.lineStyle(2, 0xffffff, 1);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 25, 48, startAngle + (facing > 0 ? 0.2 : -0.2), endAngle - (facing > 0 ? 0.2 : -0.2), false);
      fxG.strokePath();
    } else if (charDef.id === 'cyber_valkyrie') {
      // 6px Thick Vertical Kinetic Piledriver Beam
      fxG.lineStyle(6, 0xef4444, 0.95);
      fxG.lineBetween(armR.tip.x, armR.tip.y + 35, armR.tip.x, armR.tip.y - 25);
      fxG.lineStyle(2, 0xffffff, 1);
      fxG.lineBetween(armR.tip.x, armR.tip.y + 30, armR.tip.x, armR.tip.y - 20);
    } else if (charDef.id === 'volt_shinobi') {
      // Multi-Segment Jagged Lightning Discharge
      fxG.lineStyle(4, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 35);
      fxG.lineTo(armR.tip.x - facing * 8, armR.tip.y + 15);
      fxG.lineTo(armR.tip.x + facing * 6, armR.tip.y - 5);
      fxG.lineTo(armR.tip.x, armR.tip.y - 25);
      fxG.strokePath();

      fxG.lineStyle(1.5, 0xffffff, 1);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 30);
      fxG.lineTo(armR.tip.x - facing * 6, armR.tip.y + 15);
      fxG.lineTo(armR.tip.x + facing * 4, armR.tip.y - 5);
      fxG.lineTo(armR.tip.x, armR.tip.y - 20);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      // 42px Semi-Circular Amethyst Rift Portal Slash Arc
      const startAngle = facing > 0 ? -Math.PI / 2 : Math.PI / 2;
      const endAngle = facing > 0 ? Math.PI / 2 : Math.PI * 1.5;
      fxG.lineStyle(5, 0xa855f7, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 25, 42, startAngle, endAngle, false);
      fxG.strokePath();

      fxG.lineStyle(2, 0xc084fc, 1);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 25, 42, startAngle, endAngle, false);
      fxG.strokePath();
    } else {
      const startAngle = facing > 0 ? -Math.PI / 2 : Math.PI / 2;
      const endAngle = facing > 0 ? Math.PI / 2 : Math.PI * 1.5;
      fxG.lineStyle(5, primaryHex, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 30, 45, startAngle, endAngle, false);
      fxG.strokePath();
    }
  } else if (state === 'jump_kick') {
    // Linear Elemental Propulsion Streak Connecting Hip to Boot Tip
    fxG.lineStyle(5, primaryHex, 0.95);
    fxG.beginPath();
    fxG.lineBetween(hipX, hipY, legR.tip.x + facing * 24, legR.tip.y);
    fxG.strokePath();

    if (charDef.id === 'shadow_ronin') {
      fxG.lineStyle(2, 0x00e5ff, 1);
      fxG.lineBetween(hipX, hipY, legR.tip.x + facing * 24, legR.tip.y);
    } else if (charDef.id === 'cyber_valkyrie') {
      fxG.lineStyle(2.5, 0xff1744, 1);
      fxG.lineBetween(hipX, hipY, legR.tip.x + facing * 24, legR.tip.y);
      fxG.fillStyle(0xffffff, 0.9);
      fxG.fillCircle(legR.tip.x + facing * 24, legR.tip.y, 3);
    } else if (charDef.id === 'volt_shinobi') {
      fxG.lineStyle(2, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(hipX, hipY);
      fxG.lineTo((hipX + legR.tip.x) / 2 + facing * 5, (hipY + legR.tip.y) / 2 - 8);
      fxG.lineTo(legR.tip.x + facing * 24, legR.tip.y);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      fxG.lineStyle(2, 0xc084fc, 1);
      fxG.lineBetween(hipX, hipY, legR.tip.x + facing * 24, legR.tip.y);
    }
  } else if (state === 'kick') {
    // 45px Mid-Level Roundhouse Sweep Arc
    const startAngle = facing > 0 ? -Math.PI / 3 : Math.PI * 2 / 3;
    const endAngle = facing > 0 ? Math.PI / 3 : Math.PI * 4 / 3;
    fxG.lineStyle(4, accentHex, 0.9);
    fxG.beginPath();
    fxG.arc(hipX + facing * 5, hipY - 5, 45, startAngle, endAngle, false);
    fxG.strokePath();

    if (charDef.id === 'shadow_ronin') {
      fxG.lineStyle(1.5, 0x00e5ff, 1);
      fxG.beginPath();
      fxG.arc(hipX + facing * 5, hipY - 5, 45, startAngle, endAngle, false);
      fxG.strokePath();
    } else if (charDef.id === 'cyber_valkyrie') {
      fxG.lineStyle(2, 0xff1744, 1);
      fxG.beginPath();
      fxG.arc(hipX + facing * 5, hipY - 5, 45, startAngle, endAngle, false);
      fxG.strokePath();
    } else if (charDef.id === 'volt_shinobi') {
      fxG.lineStyle(1.5, 0xfde047, 1);
      fxG.beginPath();
      fxG.arc(hipX + facing * 5, hipY - 5, 45, startAngle, endAngle, false);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      fxG.lineStyle(1.5, 0xc084fc, 1);
      fxG.beginPath();
      fxG.arc(hipX + facing * 5, hipY - 5, 45, startAngle, endAngle, false);
      fxG.strokePath();
    }
  } else if (state === 'jab') {
    // Straight Piercing Beam / Thrust Line
    fxG.lineStyle(3, primaryHex, 0.85);
    fxG.lineBetween(armR.joint.x, armR.joint.y, armR.tip.x + facing * 12, armR.tip.y);
    fxG.lineStyle(1.5, 0xffffff, 0.95);
    fxG.lineBetween(armR.joint.x, armR.joint.y, armR.tip.x + facing * 10, armR.tip.y);
  }
}
