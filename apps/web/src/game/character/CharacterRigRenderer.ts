/**
 * CharacterRigRenderer.ts
 * Modular 2D Skeletal Rigs & Procedural Vector Mesh Renderer for KeyFury
 * Renders custom vector anatomy, headgear, pauldrons, gauntlets, weapons,
 * and animated scarves/belts for all 4 core fighters:
 * - Shadow Ronin (Kage): Cyber-Kabuto with golden horns, horizontal azure plasma visor, sode pauldrons, plasma katana, azure obi sash.
 * - Cyber Valkyrie (Freya): Winged Valkyrie helm with crimson optic lenses, heavy titanium pauldrons, hydraulic boost gauntlets, exo-belt.
 * - Volt Shinobi (Raijin): Aerodynamic Shinobi mask with gold HUD visor, composite shoulder guards, lightning spark knuckles/kunai, dual gold ribbons.
 * - Void Assassin (Nyx): Stealth shadow cowl with purple slit eyes, shadow mantle pauldrons, wrist void daggers, undulating violet scarf.
 */

import type Phaser from 'phaser';
import type { CharacterDefinition, Vector2D } from '@keyfury/game-core';

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
    // Kabuto Helmet Dome & Flared Neck Guard (Shikoro)
    g.fillStyle(0x1e293b, 1);
    g.beginPath();
    g.arc(headX, headY - 2, headRadius + 1.5, Math.PI, 0, false);
    g.lineTo(headX + facing * (headRadius + 2), headY + 3);
    g.lineTo(headX - facing * (headRadius + 5), headY + 6); // Rear flared neck guard
    g.closePath();
    g.fillPath();

    g.lineStyle(1.5, 0x334155, 0.9);
    g.strokePath();

    // Golden Kuwagata Horn Crest (V-Horns on forehead)
    const crestBaseX = headX + facing * 4;
    const crestBaseY = headY - 14;
    g.fillStyle(0xfbbf24, 1); // Gold
    g.lineStyle(1.5, 0xd97706, 1);

    // Front horn
    g.beginPath();
    g.moveTo(crestBaseX, crestBaseY);
    g.lineTo(crestBaseX + facing * 12, crestBaseY - 14);
    g.lineTo(crestBaseX + facing * 6, crestBaseY - 10);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Rear horn
    g.beginPath();
    g.moveTo(crestBaseX - facing * 4, crestBaseY);
    g.lineTo(crestBaseX - facing * 2, crestBaseY - 12);
    g.lineTo(crestBaseX - facing * 6, crestBaseY - 8);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Golden forehead emblem
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(crestBaseX, crestBaseY, 3);

    // Horizontal Azure Plasma Visor Slit
    if (state !== 'knockdown') {
      const visorX = headX + facing * 5;
      const visorY = headY - 2;

      // Outer plasma glow
      g.lineStyle(4, 0x0284c7, 0.6);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY);
      g.lineTo(visorX + facing * 10, visorY);
      g.strokePath();

      // Sharp glowing azure blade visor line
      g.lineStyle(2, 0x00e5ff, 1);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY);
      g.lineTo(visorX + facing * 10, visorY);
      g.strokePath();

      // Hot core point
      g.fillStyle(0xffffff, 1);
      g.fillCircle(visorX + facing * 4, visorY, 1.5);
    }
  }

  // 2. Cyber Valkyrie (Freya): Winged Valkyrie Helm with Crimson Optic Lenses
  else if (headType === 'valkyrie_helm' || charDef.id === 'cyber_valkyrie') {
    // Titanium Valkyrie Helmet Shell
    g.fillStyle(0x334155, 1);
    g.beginPath();
    g.arc(headX, headY - 1, headRadius + 2, Math.PI * 0.9, Math.PI * 0.1, false);
    g.lineTo(headX + facing * 12, headY + 5);
    g.lineTo(headX - facing * 12, headY + 3);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.5, 0x64748b, 1);
    g.strokePath();

    // Angled Valkyrie Wing Crests (Swept back titanium wings)
    const wingBaseX = headX - facing * 2;
    const wingBaseY = headY - 12;

    // Wing Layer 1 (Upper primary feather)
    g.fillStyle(0x94a3b8, 1);
    g.lineStyle(1.5, 0xef4444, 0.9); // Crimson wing trim
    g.beginPath();
    g.moveTo(wingBaseX, wingBaseY);
    g.lineTo(wingBaseX - facing * 18, wingBaseY - 16);
    g.lineTo(wingBaseX - facing * 10, wingBaseY - 6);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Wing Layer 2 (Lower secondary feather)
    g.fillStyle(0x64748b, 1);
    g.beginPath();
    g.moveTo(wingBaseX - facing * 2, wingBaseY + 3);
    g.lineTo(wingBaseX - facing * 14, wingBaseY - 8);
    g.lineTo(wingBaseX - facing * 6, wingBaseY);
    g.closePath();
    g.fillPath();
    g.strokePath();

    // Dual Crimson Optic Lenses HUD
    if (state !== 'knockdown') {
      const eyeX = headX + facing * 6;
      const eyeY = headY - 2;

      // Outer Crimson Optic Glow
      g.fillStyle(0xef4444, 0.4);
      g.fillCircle(eyeX, eyeY, 5);
      g.fillCircle(eyeX + facing * 4, eyeY + 1, 4);

      // Core Crimson Optic Lenses
      g.fillStyle(0xf87171, 1);
      g.fillCircle(eyeX, eyeY, 3);
      g.fillCircle(eyeX + facing * 4, eyeY + 1, 2.2);

      // White optic iris glint
      g.fillStyle(0xffffff, 1);
      g.fillCircle(eyeX + facing * 1, eyeY - 0.5, 1);
    }
  }

  // 3. Volt Shinobi (Raijin): Aerodynamic Shinobi Mask with Gold HUD Visor
  else if (headType === 'shinobi_mask' || charDef.id === 'volt_shinobi') {
    // Aerodynamic Half-Mask / Mempo (Covers jaw and nose)
    g.fillStyle(0x18181b, 1);
    g.beginPath();
    g.moveTo(headX + facing * 14, headY);
    g.lineTo(headX + facing * 6, headY + 14);
    g.lineTo(headX - facing * 10, headY + 8);
    g.lineTo(headX - facing * 12, headY - 2);
    g.closePath();
    g.fillPath();
    g.lineStyle(1.5, 0xf59e0b, 0.8); // Gold trim
    g.strokePath();

    // Streamlined Gold HUD Visor
    if (state !== 'knockdown') {
      const visorX = headX + facing * 5;
      const visorY = headY - 4;

      // Angular Gold HUD Plate
      g.fillStyle(0xf59e0b, 0.9);
      g.beginPath();
      g.moveTo(visorX - facing * 3, visorY - 2);
      g.lineTo(visorX + facing * 11, visorY);
      g.lineTo(visorX + facing * 8, visorY + 5);
      g.lineTo(visorX - facing * 2, visorY + 4);
      g.closePath();
      g.fillPath();

      // High-voltage lightning optic line
      g.lineStyle(2, 0xfde047, 1);
      g.beginPath();
      g.moveTo(visorX - facing * 2, visorY + 1);
      g.lineTo(visorX + facing * 9, visorY + 2);
      g.strokePath();

      // Micro lightning spark point
      g.fillStyle(0xffffff, 1);
      g.fillCircle(visorX + facing * 4, visorY + 1.5, 1.5);
    }
  }

  // 4. Void Assassin (Nyx): Stealth Shadow Cowl/Hood with Glowing Purple Dual Slit Eyes
  else if (headType === 'shadow_hood' || charDef.id === 'void_assassin') {
    // Draped Shadow Cowl / Assassin Hood
    g.fillStyle(0x09090b, 1);
    g.beginPath();
    g.moveTo(headX + facing * 2, headY - 19); // Hood peak
    g.lineTo(headX + facing * 16, headY - 4);
    g.lineTo(headX + facing * 14, headY + 12);
    g.lineTo(headX - facing * 16, headY + 10);
    g.lineTo(headX - facing * 14, headY - 14);
    g.closePath();
    g.fillPath();

    // Hood contour folds with violet shimmer
    g.lineStyle(1.5, 0x7c3aed, 0.7);
    g.strokePath();

    // Inner cowl shadow deep well
    g.fillStyle(0x020205, 1);
    g.fillCircle(headX + facing * 4, headY, 10);

    // Glowing Purple Dual Slit Eyes
    if (state !== 'knockdown') {
      const eyeX = headX + facing * 6;
      const eyeY = headY - 1;

      // Amethyst outer eye glow
      g.fillStyle(0xa855f7, 0.4);
      g.fillCircle(eyeX, eyeY, 4.5);
      g.fillCircle(eyeX + facing * 4, eyeY - 1, 3.5);

      // Angled sharp slit eyes
      g.lineStyle(2.5, 0xc084fc, 1);
      g.beginPath();
      g.moveTo(eyeX - facing * 2, eyeY + 1);
      g.lineTo(eyeX + facing * 3, eyeY - 2);
      g.moveTo(eyeX + facing * 3, eyeY - 1);
      g.lineTo(eyeX + facing * 7, eyeY - 3);
      g.strokePath();

      // Slit eye pupil glints
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

  // Torso side outline
  g.lineStyle(1.5, theme.gloveColor, 0.3);
  g.strokePath();

  const chestMidX = (neckL.x + neckR.x) / 2;
  const chestMidY = (neckL.y + neckR.y) / 2 + 10;

  // 2. Custom Chest Armor Plate & Accents
  if (charDef.id === 'cyber_valkyrie' || shoulderType === 'heavy_pauldrons') {
    // Reinforced Titanium Exo-Chestplate
    g.fillStyle(0x334155, 1);
    g.fillRoundedRect(chestMidX - 7, chestMidY - 8, 14, 16, 3);
    g.lineStyle(1.5, 0x64748b, 0.9);
    g.strokeRoundedRect(chestMidX - 7, chestMidY - 8, 14, 16, 3);

    // Glowing Crimson Power Core
    const corePulse = Math.sin(time / 150) * 0.2 + 0.8;
    g.fillStyle(0xef4444, corePulse);
    g.fillCircle(chestMidX + facing * 1, chestMidY, 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(chestMidX + facing * 1, chestMidY, 1.5);
  } else if (charDef.id === 'shadow_ronin' || shoulderType === 'minimal_nanotech') {
    // Cyber-Samurai Lamellar Chest Plates with Azure Lines
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
    // High-Velocity Agile Harness with Gold Capacitors
    g.lineStyle(2, 0xf59e0b, 0.8);
    g.beginPath();
    g.moveTo(lShoulder.x, lShoulder.y);
    g.lineTo(hipR.x, hipR.y - 4);
    g.moveTo(rShoulder.x, rShoulder.y);
    g.lineTo(hipL.x, hipL.y - 4);
    g.strokePath();

    // Central Gold Kinetic Cell
    g.fillStyle(0xfde047, 1);
    g.fillCircle(chestMidX, chestMidY, 3);
  } else if (charDef.id === 'void_assassin' || shoulderType === 'shadow_shroud') {
    // Deep Violet Void Glyphs
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
  // A. Heavy Titanium Pauldrons (Cyber Valkyrie)
  if (shoulderType === 'heavy_pauldrons' || charDef.id === 'cyber_valkyrie') {
    // Lead Pauldron (Heavy trapezoid)
    g.fillStyle(0x475569, 1);
    g.beginPath();
    g.moveTo(rShoulder.x - facing * 6, rShoulder.y - 8);
    g.lineTo(rShoulder.x + facing * 12, rShoulder.y - 6);
    g.lineTo(rShoulder.x + facing * 10, rShoulder.y + 10);
    g.lineTo(rShoulder.x - facing * 4, rShoulder.y + 8);
    g.closePath();
    g.fillPath();

    g.lineStyle(2, 0xdc2626, 0.9); // Crimson edge
    g.strokePath();

    // Rear Pauldron
    g.fillStyle(0x334155, 1);
    g.beginPath();
    g.moveTo(lShoulder.x - facing * 8, lShoulder.y - 6);
    g.lineTo(lShoulder.x + facing * 6, lShoulder.y - 4);
    g.lineTo(lShoulder.x + facing * 4, lShoulder.y + 8);
    g.lineTo(lShoulder.x - facing * 6, lShoulder.y + 6);
    g.closePath();
    g.fillPath();
  }

  // B. Layered Samurai Sode Plates (Shadow Ronin)
  else if (shoulderType === 'minimal_nanotech' || charDef.id === 'shadow_ronin') {
    // Lead Sode (Tiered Samurai Plates)
    g.fillStyle(0x1e293b, 1);
    g.lineStyle(1.5, 0x00e5ff, 0.85); // Azure trim

    // Plate 1 (Top)
    g.fillRect(rShoulder.x - facing * 4, rShoulder.y - 6, 12, 6);
    g.strokeRect(rShoulder.x - facing * 4, rShoulder.y - 6, 12, 6);

    // Plate 2 (Mid)
    g.fillRect(rShoulder.x - facing * 2, rShoulder.y + 1, 10, 5);
    g.strokeRect(rShoulder.x - facing * 2, rShoulder.y + 1, 10, 5);

    // Rear Shoulder Guard
    g.fillStyle(0x0f172a, 1);
    g.fillRect(lShoulder.x - facing * 6, lShoulder.y - 4, 8, 5);
  }

  // C. Aerodynamic Composite Guards (Volt Shinobi)
  else if (shoulderType === 'light_mesh' || charDef.id === 'volt_shinobi') {
    // Streamlined curved guards
    g.fillStyle(0x27272a, 1);
    g.fillCircle(rShoulder.x + facing * 2, rShoulder.y, 6.5);
    g.lineStyle(1.5, 0xf59e0b, 1);
    g.strokeCircle(rShoulder.x + facing * 2, rShoulder.y, 6.5);

    g.fillCircle(lShoulder.x - facing * 2, lShoulder.y, 5);
  }

  // D. Shadow Mantle Pauldrons (Void Assassin)
  else if (shoulderType === 'shadow_shroud' || charDef.id === 'void_assassin') {
    // Jagged Shadow Mantle draped over shoulders
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

  // --- REAR HAND (armL.tip) ---
  g.fillStyle(theme.gloveColor, 1);
  g.fillCircle(armL.tip.x, armL.tip.y, 6.5);
  g.lineStyle(1.5, 0xffffff, 0.6);
  g.strokeCircle(armL.tip.x, armL.tip.y, 6.5);

  // --- LEAD HAND & WEAPON (armR.tip) ---

  // 1. Shadow Ronin: Plasma Katana Silhouette & Armored Strike Bracer
  if (gauntletType === 'plasma_strike' || charDef.id === 'shadow_ronin') {
    // Armored Strike Bracer
    g.fillStyle(0x0284c7, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 7.5);
    g.lineStyle(2, 0x00e5ff, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 7.5);

    // Ignited Plasma Katana Blade silhouette emitting from lead hand
    if (state !== 'knockdown') {
      const bladeAngle = state === 'uppercut' ? -Math.PI / 3 : state === 'heavy' ? Math.PI / 4 : 0;
      const bladeLen = 34;
      const bladeEndX = armR.tip.x + facing * Math.cos(bladeAngle) * bladeLen;
      const bladeEndY = armR.tip.y + Math.sin(bladeAngle) * bladeLen;

      // Outer Plasma Energy Aura
      fxG.lineStyle(5, 0x00e5ff, 0.6);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      // Sharp Cyan Katana Blade
      fxG.lineStyle(3, 0x38bdf8, 0.95);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      // White-Hot Katana Core
      fxG.lineStyle(1.5, 0xffffff, 1);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y);
      fxG.lineTo(bladeEndX, bladeEndY);
      fxG.strokePath();

      // Katana Tsuba (Guard)
      g.fillStyle(0xfbbf24, 1); // Gold tsuba
      g.fillRect(armR.tip.x - 2, armR.tip.y - 4, 4, 8);
    }
  }

  // 2. Cyber Valkyrie: Massive Hydraulic Boost Gauntlets
  else if (gauntletType === 'hydraulic_brawler' || charDef.id === 'cyber_valkyrie') {
    // Massive Industrial Fist Gauntlet (Radius 9.5px)
    g.fillStyle(0xdc2626, 1); // Heavy red
    g.fillCircle(armR.tip.x, armR.tip.y, 9.5);

    // Titanium Knuckle Plate & Bolts
    g.fillStyle(0x94a3b8, 1);
    g.fillRect(armR.tip.x + facing * 3 - 2, armR.tip.y - 5, 4, 10);

    g.lineStyle(2, 0xef4444, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 9.5);

    // Hydraulic Energy Conduits / Glow Vents
    if (state !== 'knockdown') {
      const heatPulse = Math.sin(time / 100) * 0.3 + 0.7;
      fxG.lineStyle(3, 0xef4444, heatPulse);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 11);
    }
  }

  // 3. Volt Shinobi: Lightning Spark Knuckles & High-Frequency Cyber Kunai
  else if (gauntletType === 'lightning_kunai' || charDef.id === 'volt_shinobi') {
    // Electric Gold Strike Glove
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 7.5);
    g.lineStyle(2, 0xfde047, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 7.5);

    // Cyber Kunai / Discharge Prongs extending from knuckles
    if (state !== 'knockdown') {
      const kunaiLen = 16;
      const kunaiTipX = armR.tip.x + facing * kunaiLen;
      const kunaiTipY = armR.tip.y - 1;

      // Kunai Blade
      g.fillStyle(0x27272a, 1);
      g.lineStyle(1.5, 0xf59e0b, 1);
      g.beginPath();
      g.moveTo(armR.tip.x, armR.tip.y - 3);
      g.lineTo(kunaiTipX, kunaiTipY);
      g.lineTo(armR.tip.x, armR.tip.y + 3);
      g.closePath();
      g.fillPath();
      g.strokePath();

      // High-frequency electric micro-discharge
      if (Math.random() < 0.4) {
        fxG.lineStyle(1.5, 0xfde047, 0.9);
        fxG.beginPath();
        fxG.moveTo(kunaiTipX, kunaiTipY);
        fxG.lineTo(kunaiTipX + (Math.random() - 0.5) * 8, kunaiTipY + (Math.random() - 0.5) * 8);
        fxG.strokePath();
      }
    }
  }

  // 4. Void Assassin: Wrist-Mounted Amethyst Void Daggers
  else if (gauntletType === 'void_daggers' || charDef.id === 'void_assassin') {
    // Dark Violet Bracer
    g.fillStyle(0x7c3aed, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 7);
    g.lineStyle(2, 0xc084fc, 1);
    g.strokeCircle(armR.tip.x, armR.tip.y, 7);

    // Ethereal Curved Void Daggers
    if (state !== 'knockdown') {
      const daggerLen = 22;
      const daggerTipX = armR.tip.x + facing * daggerLen;
      const daggerTipY = armR.tip.y - 4;

      // Outer Void Aura
      fxG.fillStyle(0xa855f7, 0.4);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 2);
      fxG.lineTo(daggerTipX, daggerTipY);
      fxG.lineTo(armR.tip.x, armR.tip.y - 5);
      fxG.closePath();
      fxG.fillPath();

      // Sharp Amethyst Dagger Blade
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
  const { theme, gear } = charDef;
  const waistType = gear.waistType;
  const accessoryType = gear.accessoryType;

  // 1. Waist Belts
  if (waistType === 'obi_sash' || charDef.id === 'shadow_ronin') {
    // Cyber-Obi Sash Belt
    g.fillStyle(0x0284c7, 1);
    g.fillRect(hipX - 6, hipY - 3, 12, 6);

    // Golden Obi Buckle
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(hipX, hipY, 2.5);

    // Flowing Double-Tail Obi Sash
    const obiWave = Math.sin(time / 100) * 4;
    g.lineStyle(2.5, 0x38bdf8, 1);
    g.beginPath();
    g.moveTo(hipX - facing * 4, hipY);
    g.lineTo(hipX - facing * 14, hipY + 12 + obiWave);
    g.moveTo(hipX - facing * 2, hipY);
    g.lineTo(hipX - facing * 10, hipY + 16 + obiWave * 0.8);
    g.strokePath();
  } else if (waistType === 'heavy_belt' || charDef.id === 'cyber_valkyrie') {
    // Heavy Titanium Combat Exo-Belt
    g.fillStyle(0x334155, 1);
    g.fillRect(hipX - 7, hipY - 4, 14, 8);
    g.lineStyle(2, 0xdc2626, 1); // Crimson buckle
    g.strokeRect(hipX - 7, hipY - 4, 14, 8);

    g.fillStyle(0xef4444, 1);
    g.fillCircle(hipX, hipY, 2.5);
  } else if (waistType === 'shinobi_belt' || charDef.id === 'volt_shinobi') {
    // Shinobi Tactical Utility Belt
    g.fillStyle(0x27272a, 1);
    g.fillRect(hipX - 6, hipY - 3, 12, 6);
    g.fillStyle(0xf59e0b, 1); // Gold buckle
    g.fillRect(hipX - 3, hipY - 2, 6, 4);
  } else if (waistType === 'rift_sash' || charDef.id === 'void_assassin') {
    // Dimensional Rift Sash
    g.fillStyle(0x7c3aed, 1);
    g.fillRect(hipX - 6, hipY - 3, 12, 6);
    g.fillStyle(0xc084fc, 1); // Singularity orb
    g.fillCircle(hipX, hipY, 3);
  }

  // 2. Animated Flowing Headband Scarves / Storm Ribbons / Void Cloaks
  if (state !== 'knockdown') {
    const bandX = headX - facing * 12;
    const bandY = headY - 3;

    // A. Shadow Ronin: Flowing Azure Scarf
    if (accessoryType === 'flowing_scarf' || charDef.id === 'shadow_ronin') {
      const scarfWave = Math.sin(time / 120) * 6;
      g.lineStyle(3.5, 0x00e5ff, 0.95);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 16, bandY + 4 + scarfWave);
      g.lineTo(bandX - facing * 28, bandY + 12 + scarfWave * 1.6);
      g.strokePath();

      // Scarf golden accent tip
      g.fillStyle(0xfbbf24, 1);
      g.fillCircle(bandX - facing * 28, bandY + 12 + scarfWave * 1.6, 2);
    }

    // B. Volt Shinobi: Dual Gold Ninja Storm Ribbons
    else if (accessoryType === 'storm_ribbon' || charDef.id === 'volt_shinobi') {
      const wave1 = Math.sin(time / 80) * 7;
      const wave2 = Math.cos(time / 70) * 5;

      g.lineStyle(2.5, 0xfde047, 1); // Bright gold ribbon 1
      g.beginPath();
      g.moveTo(bandX, bandY - 2);
      g.lineTo(bandX - facing * 18, bandY + 2 + wave1);
      g.lineTo(bandX - facing * 32, bandY + 8 + wave1 * 1.5);
      g.strokePath();

      g.lineStyle(2, 0xf59e0b, 0.9); // Amber gold ribbon 2
      g.beginPath();
      g.moveTo(bandX, bandY + 2);
      g.lineTo(bandX - facing * 14, bandY + 6 + wave2);
      g.lineTo(bandX - facing * 26, bandY + 14 + wave2 * 1.3);
      g.strokePath();
    }

    // C. Void Assassin: Undulating Violet Shadow Scarf
    else if (accessoryType === 'void_cloak' || charDef.id === 'void_assassin') {
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
    }

    // D. Cyber Valkyrie: Energy Exhaust Vents
    else if (accessoryType === 'energy_crest' || charDef.id === 'cyber_valkyrie') {
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

  // 1. HEAVY SLAM
  if (state === 'heavy') {
    if (charDef.id === 'shadow_ronin') {
      // Azure Plasma Cutting Arc
      fxG.lineStyle(6, 0x00e5ff, 0.95);
      fxG.beginPath();
      fxG.arc(neckX + facing * 10, neckY, 72, -Math.PI / 3, Math.PI / 3, false);
      fxG.strokePath();

      fxG.lineStyle(2.5, 0xffffff, 1);
      fxG.beginPath();
      fxG.arc(neckX + facing * 10, neckY, 72, -Math.PI / 4, Math.PI / 4, false);
      fxG.strokePath();
    } else if (charDef.id === 'cyber_valkyrie') {
      // Heavy Crimson Combustion Shockwave
      fxG.lineStyle(7, 0xef4444, 0.95);
      fxG.beginPath();
      fxG.arc(neckX + facing * 20, neckY + 10, 68, -Math.PI / 4, Math.PI / 2, false);
      fxG.strokePath();

      fxG.lineStyle(3, 0xfecaca, 1);
      fxG.strokeCircle(armR.tip.x, armR.tip.y, 18);
    } else if (charDef.id === 'volt_shinobi') {
      // Jagged Gold Zigzag Lightning Slam
      fxG.lineStyle(4, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(neckX, neckY - 20);
      fxG.lineTo(neckX + facing * 30, neckY + 10);
      fxG.lineTo(armR.tip.x + facing * 20, armR.tip.y + 20);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      // Swirling Amethyst Void Singularity Arc
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
  }

  // 2. SKY UPPERCUT
  else if (state === 'uppercut') {
    if (charDef.id === 'shadow_ronin') {
      // Vertical Azure Plasma Flash
      fxG.lineStyle(5, 0x00e5ff, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 25, 48, -Math.PI * 0.6, Math.PI * 0.4, false);
      fxG.strokePath();
    } else if (charDef.id === 'cyber_valkyrie') {
      // Hydraulic Crimson Blast Jet
      fxG.lineStyle(6, 0xef4444, 0.95);
      fxG.lineBetween(armR.tip.x, armR.tip.y + 35, armR.tip.x, armR.tip.y - 25);
    } else if (charDef.id === 'volt_shinobi') {
      // High-Voltage Lightning Surge
      fxG.lineStyle(4, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(armR.tip.x, armR.tip.y + 35);
      fxG.lineTo(armR.tip.x - facing * 8, armR.tip.y + 15);
      fxG.lineTo(armR.tip.x + facing * 6, armR.tip.y - 5);
      fxG.lineTo(armR.tip.x, armR.tip.y - 25);
      fxG.strokePath();
    } else if (charDef.id === 'void_assassin') {
      // Amethyst Void Rift
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
  }

  // 3. JUMP KICK / FLYING KICK
  else if (state === 'jump_kick') {
    fxG.lineStyle(5, primaryHex, 0.95);
    fxG.beginPath();
    fxG.lineBetween(hipX, hipY, legR.tip.x + facing * 24, legR.tip.y);
    fxG.strokePath();

    if (charDef.id === 'volt_shinobi') {
      // Micro electric arcs along kick line
      fxG.lineStyle(2, 0xfde047, 1);
      fxG.beginPath();
      fxG.moveTo(hipX, hipY);
      fxG.lineTo((hipX + legR.tip.x) / 2 + (Math.random() - 0.5) * 10, (hipY + legR.tip.y) / 2 - 8);
      fxG.lineTo(legR.tip.x + facing * 24, legR.tip.y);
      fxG.strokePath();
    }
  }

  // 4. ROUNDHOUSE KICK
  else if (state === 'kick') {
    fxG.lineStyle(4, accentHex, 0.9);
    fxG.beginPath();
    fxG.arc(hipX, hipY - 5, 45, -Math.PI / 3, Math.PI / 3, false);
    fxG.strokePath();
  }

  // 5. JAB
  else if (state === 'jab') {
    fxG.lineStyle(3, primaryHex, 0.85);
    fxG.lineBetween(armR.joint.x, armR.joint.y, armR.tip.x + facing * 12, armR.tip.y);
  }
}
