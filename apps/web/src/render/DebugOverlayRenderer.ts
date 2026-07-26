/**
 * DebugOverlayRenderer.ts
 * Debug Overlay Renderer for OBB hitboxes, hurtboxes, and spatial hash grid visualizer.
 */

import type Phaser from 'phaser';
import type { DebugShape, OBBHitbox, CircleHurtbox, CapsuleHurtbox } from '@keyfury/game-core';

export interface DebugOverlayConfig {
  showHitboxes?: boolean;
  showHurtboxes?: boolean;
  showSpatialGrid?: boolean;
  gridCellSize?: number;
  arenaWidth?: number;
  arenaHeight?: number;
}

export class DebugOverlayRenderer {
  private config: DebugOverlayConfig;

  constructor(config?: DebugOverlayConfig) {
    this.config = {
      showHitboxes: config?.showHitboxes ?? true,
      showHurtboxes: config?.showHurtboxes ?? true,
      showSpatialGrid: config?.showSpatialGrid ?? false,
      gridCellSize: config?.gridCellSize ?? 64,
      arenaWidth: config?.arenaWidth ?? 1024,
      arenaHeight: config?.arenaHeight ?? 580
    };
  }

  /**
   * Renders debug shapes onto a Phaser Graphics instance.
   */
  public render(graphics: Phaser.GameObjects.Graphics, shapes: DebugShape[]): void {
    graphics.clear();

    if (this.config.showSpatialGrid) {
      this.renderSpatialGrid(graphics);
    }

    for (const shape of shapes) {
      if (shape.type === 'obb' && this.config.showHitboxes) {
        this.renderOBB(graphics, shape, shape.color || '#ff0000');
      } else if (shape.type === 'circle' && this.config.showHurtboxes) {
        this.renderCircle(graphics, shape, shape.color || '#00ff00');
      } else if (shape.type === 'capsule' && this.config.showHurtboxes) {
        this.renderCapsule(graphics, shape, shape.color || '#0000ff');
      } else if (shape.type === 'line') {
        graphics.lineStyle(2, this.colorStringToHex(shape.color), 1);
        graphics.lineBetween(shape.p1.x, shape.p1.y, shape.p2.x, shape.p2.y);
      }
    }
  }

  /**
   * Draws oriented bounding box (OBB) with rotation.
   */
  public renderOBB(
    graphics: Phaser.GameObjects.Graphics,
    obb: { center: { x: number; y: number }; extents: { x: number; y: number }; rotation: number },
    colorStr: string
  ): void {
    const colorHex = this.colorStringToHex(colorStr);
    graphics.lineStyle(2, colorHex, 0.9);
    graphics.fillStyle(colorHex, 0.2);

    const cos = Math.cos(obb.rotation);
    const sin = Math.sin(obb.rotation);

    const hx = obb.extents.x;
    const hy = obb.extents.y;

    const cornersLocal = [
      { x: -hx, y: -hy },
      { x: hx, y: -hy },
      { x: hx, y: hy },
      { x: -hx, y: hy }
    ];

    const cornersWorld = cornersLocal.map((pt) => ({
      x: obb.center.x + (pt.x * cos - pt.y * sin),
      y: obb.center.y + (pt.x * sin + pt.y * cos)
    }));

    graphics.beginPath();
    graphics.moveTo(cornersWorld[0]!.x, cornersWorld[0]!.y);
    for (let i = 1; i < cornersWorld.length; i++) {
      graphics.lineTo(cornersWorld[i]!.x, cornersWorld[i]!.y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    // Draw center point indicator
    graphics.fillStyle(colorHex, 1);
    graphics.fillCircle(obb.center.x, obb.center.y, 3);
  }

  /**
   * Draws circle hurtbox.
   */
  public renderCircle(
    graphics: Phaser.GameObjects.Graphics,
    circle: { center: { x: number; y: number }; radius: number },
    colorStr: string
  ): void {
    const colorHex = this.colorStringToHex(colorStr);
    graphics.lineStyle(2, colorHex, 0.9);
    graphics.fillStyle(colorHex, 0.15);
    graphics.fillCircle(circle.center.x, circle.center.y, circle.radius);
    graphics.strokeCircle(circle.center.x, circle.center.y, circle.radius);
  }

  /**
   * Draws capsule hurtbox.
   */
  public renderCapsule(
    graphics: Phaser.GameObjects.Graphics,
    capsule: { p1: { x: number; y: number }; p2: { x: number; y: number }; radius: number },
    colorStr: string
  ): void {
    const colorHex = this.colorStringToHex(colorStr);
    graphics.lineStyle(2, colorHex, 0.9);
    graphics.lineBetween(capsule.p1.x, capsule.p1.y, capsule.p2.x, capsule.p2.y);
    graphics.strokeCircle(capsule.p1.x, capsule.p1.y, capsule.radius);
    graphics.strokeCircle(capsule.p2.x, capsule.p2.y, capsule.radius);
  }

  /**
   * Draws spatial hash grid lines.
   */
  public renderSpatialGrid(graphics: Phaser.GameObjects.Graphics): void {
    const cellSize = this.config.gridCellSize || 64;
    const width = this.config.arenaWidth || 1024;
    const height = this.config.arenaHeight || 580;

    graphics.lineStyle(1, 0x334155, 0.35);

    for (let x = 0; x <= width; x += cellSize) {
      graphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
      graphics.lineBetween(0, y, width, y);
    }
  }

  public setConfig(config: Partial<DebugOverlayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private colorStringToHex(colorStr: string): number {
    if (colorStr.startsWith('#')) {
      return parseInt(colorStr.slice(1), 16);
    }
    return 0x00ff00;
  }
}
