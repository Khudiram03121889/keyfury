import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ATLAS_WIDTH = 512;
const ATLAS_HEIGHT = 512;

// Standard 19-part / 21-slice metadata for Shadow Ronin
const atlasMetadata = {
  characterId: 'shadow_ronin',
  version: '1.0.0',
  image: '/assets/characters/shadow_ronin/atlas.png',
  dimensions: {
    w: 512,
    h: 512
  },
  parts: {
    head: { x: 0, y: 0, w: 64, h: 64, pivotX: 0.5, pivotY: 0.5 },
    headgear: { x: 64, y: 0, w: 80, h: 72, pivotX: 0.5, pivotY: 0.5 },
    torso: { x: 144, y: 0, w: 72, h: 96, pivotX: 0.5, pivotY: 0.2 },
    pelvis: { x: 216, y: 0, w: 56, h: 48, pivotX: 0.5, pivotY: 0.5 },
    pauldron_rear: { x: 272, y: 0, w: 48, h: 48, pivotX: 0.5, pivotY: 0.2 },
    pauldron_lead: { x: 320, y: 0, w: 48, h: 48, pivotX: 0.5, pivotY: 0.2 },
    rear_hand: { x: 368, y: 0, w: 32, h: 32, pivotX: 0.5, pivotY: 0.5 },
    lead_hand: { x: 400, y: 0, w: 32, h: 32, pivotX: 0.5, pivotY: 0.5 },
    rear_boot: { x: 432, y: 0, w: 48, h: 36, pivotX: 0.35, pivotY: 0.5 },
    lead_boot: { x: 432, y: 36, w: 48, h: 36, pivotX: 0.35, pivotY: 0.5 },
    rear_upper_arm: { x: 0, y: 100, w: 36, h: 60, pivotX: 0.5, pivotY: 0.15 },
    rear_forearm: { x: 36, y: 100, w: 32, h: 56, pivotX: 0.5, pivotY: 0.15 },
    lead_upper_arm: { x: 68, y: 100, w: 40, h: 64, pivotX: 0.5, pivotY: 0.15 },
    lead_forearm: { x: 108, y: 100, w: 36, h: 60, pivotX: 0.5, pivotY: 0.15 },
    rear_thigh: { x: 144, y: 100, w: 44, h: 72, pivotX: 0.5, pivotY: 0.15 },
    rear_shin: { x: 188, y: 100, w: 40, h: 68, pivotX: 0.5, pivotY: 0.15 },
    lead_thigh: { x: 228, y: 100, w: 48, h: 76, pivotX: 0.5, pivotY: 0.15 },
    lead_shin: { x: 276, y: 100, w: 44, h: 72, pivotX: 0.5, pivotY: 0.15 },
    weapon_base: { x: 0, y: 200, w: 36, h: 136, pivotX: 0.5, pivotY: 0.85 },
    weapon_glow: { x: 36, y: 200, w: 48, h: 144, pivotX: 0.5, pivotY: 0.85 },
    accessory: { x: 84, y: 200, w: 64, h: 128, pivotX: 0.15, pivotY: 0.15 }
  },
  customData: {
    theme: {
      primaryColor: '#38bdf8',
      secondaryColor: '#0284c7',
      accentColor: '#0ea5e9',
      glowColor: 'rgba(0, 242, 254, 0.6)',
      katanaGlowHex: 62206
    }
  }
};

class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = Buffer.alloc(width * height * 4); // RGBA
  }

  setPixel(x, y, r, g, b, a = 255) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) return;
    const idx = (iy * this.width + ix) * 4;

    const srcA = a / 255;
    const dstA = this.buffer[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);

    if (outA <= 0) return;

    const outR = Math.round((r * srcA + this.buffer[idx] * dstA * (1 - srcA)) / outA);
    const outG = Math.round((g * srcA + this.buffer[idx + 1] * dstA * (1 - srcA)) / outA);
    const outB = Math.round((b * srcA + this.buffer[idx + 2] * dstA * (1 - srcA)) / outA);

    this.buffer[idx] = Math.min(255, Math.max(0, outR));
    this.buffer[idx + 1] = Math.min(255, Math.max(0, outG));
    this.buffer[idx + 2] = Math.min(255, Math.max(0, outB));
    this.buffer[idx + 3] = Math.min(255, Math.max(0, Math.round(outA * 255)));
  }

  fillRect(x, y, w, h, [r, g, b, a = 255]) {
    for (let py = Math.floor(y); py < y + h; py++) {
      for (let px = Math.floor(x); px < x + w; px++) {
        this.setPixel(px, py, r, g, b, a);
      }
    }
  }

  fillCircle(cx, cy, radius, [r, g, b, a = 255]) {
    const r2 = radius * radius;
    const minX = Math.floor(cx - radius);
    const maxX = Math.ceil(cx + radius);
    const minY = Math.floor(cy - radius);
    const maxY = Math.ceil(cy + radius);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= r2) {
          const edgeDist = radius - Math.sqrt(dist2);
          const alpha = edgeDist < 1 ? a * Math.max(0, Math.min(1, edgeDist)) : a;
          this.setPixel(x, y, r, g, b, alpha);
        }
      }
    }
  }

  strokeCircle(cx, cy, radius, [r, g, b, a = 255], lineWidth = 1) {
    const minX = Math.floor(cx - radius - lineWidth);
    const maxX = Math.ceil(cx + radius + lineWidth);
    const minY = Math.floor(cy - radius - lineWidth);
    const maxY = Math.ceil(cy + radius + lineWidth);
    const halfW = lineWidth / 2;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const diff = Math.abs(dist - radius);
        if (diff <= halfW) {
          const alpha = diff > halfW - 0.5 ? a * (1 - (diff - (halfW - 0.5))) : a;
          this.setPixel(x, y, r, g, b, Math.max(0, alpha));
        }
      }
    }
  }

  drawLine(x0, y0, x1, y1, [r, g, b, a = 255], lineWidth = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1e-5;
    const steps = Math.ceil(len * 2);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const curX = x0 + dx * t;
      const curY = y0 + dy * t;
      if (lineWidth <= 1) {
        this.setPixel(curX, curY, r, g, b, a);
      } else {
        this.fillCircle(curX, curY, lineWidth / 2, [r, g, b, a]);
      }
    }
  }

  fillPolygon(points, [r, g, b, a = 255]) {
    if (points.length < 3) return;
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    minY = Math.floor(minY);
    maxY = Math.ceil(maxY);

    for (let y = minY; y <= maxY; y++) {
      const nodeX = [];
      let j = points.length - 1;
      for (let i = 0; i < points.length; i++) {
        const pi = points[i];
        const pj = points[j];
        if ((pi.y < y && pj.y >= y) || (pj.y < y && pi.y >= y)) {
          nodeX.push(pi.x + ((y - pi.y) / (pj.y - pi.y)) * (pj.x - pi.x));
        }
        j = i;
      }
      nodeX.sort((a, b) => a - b);
      for (let k = 0; k < nodeX.length; k += 2) {
        if (nodeX[k + 1] === undefined) break;
        const startX = Math.floor(nodeX[k]);
        const endX = Math.ceil(nodeX[k + 1]);
        for (let x = startX; x <= endX; x++) {
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  fillRoundedRect(x, y, w, h, radius, [r, g, b, a = 255]) {
    const rad = Math.min(radius, w / 2, h / 2);
    this.fillRect(x + rad, y, w - 2 * rad, h, [r, g, b, a]);
    this.fillRect(x, y + rad, rad, h - 2 * rad, [r, g, b, a]);
    this.fillRect(x + w - rad, y + rad, rad, h - 2 * rad, [r, g, b, a]);
    this.fillCircle(x + rad, y + rad, rad, [r, g, b, a]);
    this.fillCircle(x + w - rad, y + rad, rad, [r, g, b, a]);
    this.fillCircle(x + rad, y + h - rad, rad, [r, g, b, a]);
    this.fillCircle(x + w - rad, y + h - rad, rad, [r, g, b, a]);
  }

  strokeRoundedRect(x, y, w, h, radius, [r, g, b, a = 255], lineWidth = 1) {
    const rad = Math.min(radius, w / 2, h / 2);
    this.drawLine(x + rad, y, x + w - rad, y, [r, g, b, a], lineWidth);
    this.drawLine(x + rad, y + h, x + w - rad, y + h, [r, g, b, a], lineWidth);
    this.drawLine(x, y + rad, x, y + h - rad, [r, g, b, a], lineWidth);
    this.drawLine(x + w, y + rad, x + w, y + h - rad, [r, g, b, a], lineWidth);
  }
}

function renderShadowRoninAtlas() {
  const canvas = new PixelCanvas(ATLAS_WIDTH, ATLAS_HEIGHT);

  // Palette Constants
  const C_DARK_TITANIUM = [15, 23, 42, 255];   // #0f172a
  const C_SLATE_ARMOR   = [30, 41, 59, 255];   // #1e293b
  const C_LIGHT_TITANIUM= [51, 65, 85, 255];   // #334155
  const C_CYAN_NEON     = [0, 242, 254, 255];  // #00f2fe
  const C_SKY_AZURE     = [56, 189, 248, 255]; // #38bdf8
  const C_DEEP_AZURE    = [2, 132, 199, 255];  // #0284c7
  const C_OCEAN_BLUE    = [14, 165, 233, 255]; // #0ea5e9
  const C_GOLD_CREST    = [251, 191, 36, 255]; // #fbbf24
  const C_GOLD_DARK     = [217, 119, 6, 255];  // #d97706
  const C_WHITE_HOT     = [255, 255, 255, 255];// #ffffff
  const C_SILVER_EDGE   = [226, 232, 240, 255];// #e2e8f0

  // -------------------------------------------------------------
  // 1. HEAD (0, 0, 64, 64) - Pivot (0.5, 0.5) -> Center (32, 32)
  // -------------------------------------------------------------
  {
    const ox = 0, oy = 0;
    // Skull base circle
    canvas.fillCircle(ox + 32, oy + 32, 22, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 32, oy + 30, 20, C_SLATE_ARMOR);
    canvas.strokeCircle(ox + 32, oy + 32, 22, C_LIGHT_TITANIUM, 1.5);

    // Temple cyberware nodes
    canvas.fillCircle(ox + 13, oy + 32, 4, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 51, oy + 32, 4, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 13, oy + 32, 2, C_CYAN_NEON);
    canvas.fillCircle(ox + 51, oy + 32, 2, C_CYAN_NEON);

    // Seam lines & neck socket
    canvas.drawLine(ox + 32, oy + 12, ox + 32, oy + 26, C_OCEAN_BLUE, 1);
    canvas.drawLine(ox + 22, oy + 20, ox + 42, oy + 20, C_OCEAN_BLUE, 1);
    canvas.fillCircle(ox + 32, oy + 48, 8, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 2. HEADGEAR (64, 0, 80, 72) - Pivot (0.5, 0.5) -> Center (104, 36)
  // -------------------------------------------------------------
  {
    const ox = 64, oy = 0;
    // Kuwagata Golden Horns (V-horns)
    canvas.fillPolygon([
      { x: ox + 40, y: oy + 36 },
      { x: ox + 16, y: oy + 8 },
      { x: ox + 24, y: oy + 6 },
      { x: ox + 38, y: oy + 28 }
    ], C_GOLD_CREST);
    canvas.fillPolygon([
      { x: ox + 40, y: oy + 36 },
      { x: ox + 64, y: oy + 8 },
      { x: ox + 56, y: oy + 6 },
      { x: ox + 42, y: oy + 28 }
    ], C_GOLD_CREST);

    // Inner horn edge
    canvas.drawLine(ox + 40, oy + 36, ox + 16, oy + 8, C_GOLD_DARK, 1.5);
    canvas.drawLine(ox + 40, oy + 36, ox + 64, oy + 8, C_GOLD_DARK, 1.5);

    // Center Gold Crest Emblem
    canvas.fillCircle(ox + 40, oy + 34, 7, C_GOLD_CREST);
    canvas.fillCircle(ox + 40, oy + 34, 4, C_GOLD_DARK);

    // Kabuto brow plate
    canvas.fillPolygon([
      { x: ox + 14, y: oy + 38 },
      { x: ox + 66, y: oy + 38 },
      { x: ox + 60, y: oy + 48 },
      { x: ox + 20, y: oy + 48 }
    ], C_SLATE_ARMOR);
    canvas.drawLine(ox + 14, oy + 38, ox + 66, oy + 38, C_LIGHT_TITANIUM, 1.5);

    // Glowing Azure Visor HUD Slit
    canvas.fillRect(ox + 20, oy + 46, 40, 6, [0, 242, 254, 120]);
    canvas.drawLine(ox + 22, oy + 49, ox + 58, oy + 49, C_CYAN_NEON, 2.5);
    canvas.fillCircle(ox + 40, oy + 49, 2.5, C_WHITE_HOT);
  }

  // -------------------------------------------------------------
  // 3. TORSO (144, 0, 72, 96) - Pivot (0.5, 0.2) -> (180, 19.2)
  // -------------------------------------------------------------
  {
    const ox = 144, oy = 0;
    // V-taper titanium cuirass
    canvas.fillPolygon([
      { x: ox + 18, y: oy + 12 },
      { x: ox + 54, y: oy + 12 },
      { x: ox + 64, y: oy + 36 },
      { x: ox + 52, y: oy + 88 },
      { x: ox + 20, y: oy + 88 },
      { x: ox + 8, y: oy + 36 }
    ], C_DARK_TITANIUM);

    // Center Chestplate
    canvas.fillPolygon([
      { x: ox + 22, y: oy + 18 },
      { x: ox + 50, y: oy + 18 },
      { x: ox + 58, y: oy + 38 },
      { x: ox + 48, y: oy + 76 },
      { x: ox + 24, y: oy + 76 },
      { x: ox + 14, y: oy + 38 }
    ], C_SLATE_ARMOR);

    // Nanotech Energy Channels
    canvas.drawLine(ox + 22, oy + 24, ox + 36, oy + 50, C_OCEAN_BLUE, 2);
    canvas.drawLine(ox + 50, oy + 24, ox + 36, oy + 50, C_OCEAN_BLUE, 2);
    canvas.drawLine(ox + 36, oy + 50, ox + 36, oy + 82, C_CYAN_NEON, 2);
    canvas.fillCircle(ox + 36, oy + 50, 4, C_CYAN_NEON);
    canvas.fillCircle(ox + 36, oy + 50, 2, C_WHITE_HOT);

    // Proximal neck socket dome
    canvas.fillCircle(ox + 36, oy + 18, 9, C_LIGHT_TITANIUM);
  }

  // -------------------------------------------------------------
  // 4. PELVIS (216, 0, 56, 48) - Pivot (0.5, 0.5) -> (244, 24)
  // -------------------------------------------------------------
  {
    const ox = 216, oy = 0;
    // Armored groin plate
    canvas.fillPolygon([
      { x: ox + 10, y: oy + 10 },
      { x: ox + 46, y: oy + 10 },
      { x: ox + 40, y: oy + 42 },
      { x: ox + 16, y: oy + 42 }
    ], C_DARK_TITANIUM);
    canvas.fillPolygon([
      { x: ox + 14, y: oy + 14 },
      { x: ox + 42, y: oy + 14 },
      { x: ox + 36, y: oy + 38 },
      { x: ox + 20, y: oy + 38 }
    ], C_SLATE_ARMOR);

    // Obi Sash Band
    canvas.fillRect(ox + 8, oy + 6, 40, 10, C_DEEP_AZURE);
    canvas.drawLine(ox + 8, oy + 11, ox + 48, oy + 11, C_SKY_AZURE, 1.5);

    // Gold Buckle
    canvas.fillCircle(ox + 28, oy + 11, 5, C_GOLD_CREST);
    canvas.fillCircle(ox + 28, oy + 11, 2.5, C_GOLD_DARK);
  }

  // -------------------------------------------------------------
  // 5. PAULDRON_REAR (272, 0, 48, 48) - Pivot (0.5, 0.2)
  // -------------------------------------------------------------
  {
    const ox = 272, oy = 0;
    canvas.fillRoundedRect(ox + 8, oy + 8, 32, 32, 6, C_SLATE_ARMOR);
    canvas.strokeRoundedRect(ox + 8, oy + 8, 32, 32, 6, C_OCEAN_BLUE, 1.5);
    canvas.fillCircle(ox + 24, oy + 14, 4, C_CYAN_NEON);
  }

  // -------------------------------------------------------------
  // 6. PAULDRON_LEAD (320, 0, 48, 48) - Pivot (0.5, 0.2)
  // -------------------------------------------------------------
  {
    const ox = 320, oy = 0;
    // Tiered Sode plates
    canvas.fillRoundedRect(ox + 6, oy + 6, 36, 14, 3, C_SLATE_ARMOR);
    canvas.fillRoundedRect(ox + 8, oy + 18, 32, 14, 3, C_LIGHT_TITANIUM);
    canvas.fillRoundedRect(ox + 10, oy + 30, 28, 12, 3, C_DARK_TITANIUM);

    // Glowing cyan crest
    canvas.drawLine(ox + 14, oy + 13, ox + 34, oy + 13, C_CYAN_NEON, 2);
    canvas.fillCircle(ox + 24, oy + 25, 3, C_CYAN_NEON);
    canvas.fillCircle(ox + 24, oy + 25, 1.5, C_WHITE_HOT);
  }

  // -------------------------------------------------------------
  // 7. REAR_HAND (368, 0, 32, 32) - Pivot (0.5, 0.5)
  // -------------------------------------------------------------
  {
    const ox = 368, oy = 0;
    canvas.fillCircle(ox + 16, oy + 16, 11, C_DEEP_AZURE);
    canvas.fillCircle(ox + 16, oy + 16, 8, C_DARK_TITANIUM);
    canvas.drawLine(ox + 10, oy + 16, ox + 22, oy + 16, C_SKY_AZURE, 2);
  }

  // -------------------------------------------------------------
  // 8. LEAD_HAND (400, 0, 32, 32) - Pivot (0.5, 0.5)
  // -------------------------------------------------------------
  {
    const ox = 400, oy = 0;
    canvas.fillCircle(ox + 16, oy + 16, 12, C_DEEP_AZURE);
    canvas.fillCircle(ox + 16, oy + 16, 9, C_SLATE_ARMOR);
    canvas.strokeCircle(ox + 16, oy + 16, 12, C_CYAN_NEON, 1.5);
    canvas.fillCircle(ox + 16, oy + 16, 3, C_CYAN_NEON);
  }

  // -------------------------------------------------------------
  // 9. REAR_BOOT (432, 0, 48, 36) - Pivot (0.35, 0.5)
  // -------------------------------------------------------------
  {
    const ox = 432, oy = 0;
    canvas.fillPolygon([
      { x: ox + 10, y: oy + 6 },
      { x: ox + 26, y: oy + 6 },
      { x: ox + 42, y: oy + 26 },
      { x: ox + 6, y: oy + 26 }
    ], C_DARK_TITANIUM);
    canvas.fillRoundedRect(ox + 6, oy + 24, 38, 8, 2, C_SLATE_ARMOR);
    canvas.drawLine(ox + 6, oy + 30, ox + 44, oy + 30, C_CYAN_NEON, 2);
  }

  // -------------------------------------------------------------
  // 10. LEAD_BOOT (432, 36, 48, 36) - Pivot (0.35, 0.5)
  // -------------------------------------------------------------
  {
    const ox = 432, oy = 36;
    canvas.fillPolygon([
      { x: ox + 8, y: oy + 6 },
      { x: ox + 28, y: oy + 6 },
      { x: ox + 44, y: oy + 26 },
      { x: ox + 4, y: oy + 26 }
    ], C_SLATE_ARMOR);
    canvas.fillRoundedRect(ox + 4, oy + 24, 42, 8, 2, C_DARK_TITANIUM);
    canvas.drawLine(ox + 4, oy + 30, ox + 46, oy + 30, C_CYAN_NEON, 2);
    canvas.fillCircle(ox + 36, oy + 20, 3, C_CYAN_NEON);
  }

  // -------------------------------------------------------------
  // 11. REAR_UPPER_ARM (0, 100, 36, 60) - Pivot (0.5, 0.15) -> (18, 9)
  // -------------------------------------------------------------
  {
    const ox = 0, oy = 100;
    // Proximal joint cap dome
    canvas.fillCircle(ox + 18, oy + 9, 12, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 18, oy + 9, 9, C_SLATE_ARMOR);
    // Cylinder body
    canvas.fillRoundedRect(ox + 8, oy + 9, 20, 42, 5, C_DARK_TITANIUM);
    canvas.fillRoundedRect(ox + 11, oy + 12, 14, 36, 3, C_SLATE_ARMOR);
    canvas.drawLine(ox + 18, oy + 14, ox + 18, oy + 44, C_OCEAN_BLUE, 1.5);
    // Distal socket
    canvas.fillCircle(ox + 18, oy + 51, 6, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 12. REAR_FOREARM (36, 100, 32, 56) - Pivot (0.5, 0.15) -> (16, 8.4)
  // -------------------------------------------------------------
  {
    const ox = 36, oy = 100;
    canvas.fillCircle(ox + 16, oy + 8.4, 11, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 16, oy + 8.4, 8, C_SLATE_ARMOR);
    canvas.fillPolygon([
      { x: ox + 6, y: oy + 8.4 },
      { x: ox + 26, y: oy + 8.4 },
      { x: ox + 23, y: oy + 47.6 },
      { x: ox + 9, y: oy + 47.6 }
    ], C_SLATE_ARMOR);
    canvas.drawLine(ox + 16, oy + 12, ox + 16, oy + 44, C_SKY_AZURE, 1.5);
    canvas.fillCircle(ox + 16, oy + 47.6, 5, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 13. LEAD_UPPER_ARM (68, 100, 40, 64) - Pivot (0.5, 0.15) -> (20, 9.6)
  // -------------------------------------------------------------
  {
    const ox = 68, oy = 100;
    canvas.fillCircle(ox + 20, oy + 9.6, 14, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 20, oy + 9.6, 11, C_SLATE_ARMOR);
    canvas.fillRoundedRect(ox + 8, oy + 9.6, 24, 45, 6, C_SLATE_ARMOR);
    canvas.drawLine(ox + 20, oy + 14, ox + 20, oy + 48, C_CYAN_NEON, 2);
    canvas.fillCircle(ox + 20, oy + 54.4, 7, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 14. LEAD_FOREARM (108, 100, 36, 60) - Pivot (0.5, 0.15) -> (18, 9)
  // -------------------------------------------------------------
  {
    const ox = 108, oy = 100;
    canvas.fillCircle(ox + 18, oy + 9, 13, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 18, oy + 9, 10, C_SLATE_ARMOR);
    canvas.fillPolygon([
      { x: ox + 6, y: oy + 9 },
      { x: ox + 30, y: oy + 9 },
      { x: ox + 26, y: oy + 51 },
      { x: ox + 10, y: oy + 51 }
    ], C_SLATE_ARMOR);
    // Dual plasma rails
    canvas.drawLine(ox + 14, oy + 12, ox + 14, oy + 46, C_CYAN_NEON, 1.5);
    canvas.drawLine(ox + 22, oy + 12, ox + 22, oy + 46, C_CYAN_NEON, 1.5);
    canvas.fillCircle(ox + 18, oy + 51, 6, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 15. REAR_THIGH (144, 100, 44, 72) - Pivot (0.5, 0.15) -> (22, 10.8)
  // -------------------------------------------------------------
  {
    const ox = 144, oy = 100;
    canvas.fillCircle(ox + 22, oy + 10.8, 15, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 22, oy + 10.8, 11, C_SLATE_ARMOR);
    canvas.fillRoundedRect(ox + 8, oy + 10.8, 28, 51, 6, C_DARK_TITANIUM);
    canvas.fillRoundedRect(ox + 12, oy + 15, 20, 42, 4, C_SLATE_ARMOR);
    canvas.drawLine(ox + 22, oy + 16, ox + 22, oy + 54, C_OCEAN_BLUE, 2);
    canvas.fillCircle(ox + 22, oy + 61.2, 7, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 16. REAR_SHIN (188, 100, 40, 68) - Pivot (0.5, 0.15) -> (20, 10.2)
  // -------------------------------------------------------------
  {
    const ox = 188, oy = 100;
    canvas.fillCircle(ox + 20, oy + 10.2, 14, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 20, oy + 10.2, 10, C_SLATE_ARMOR);
    canvas.fillPolygon([
      { x: ox + 8, y: oy + 10.2 },
      { x: ox + 32, y: oy + 10.2 },
      { x: ox + 28, y: oy + 57.8 },
      { x: ox + 12, y: oy + 57.8 }
    ], C_SLATE_ARMOR);
    canvas.drawLine(ox + 20, oy + 14, ox + 20, oy + 52, C_SKY_AZURE, 1.5);
    canvas.fillCircle(ox + 20, oy + 57.8, 6, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 17. LEAD_THIGH (228, 100, 48, 76) - Pivot (0.5, 0.15) -> (24, 11.4)
  // -------------------------------------------------------------
  {
    const ox = 228, oy = 100;
    canvas.fillCircle(ox + 24, oy + 11.4, 17, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 24, oy + 11.4, 13, C_SLATE_ARMOR);
    canvas.fillRoundedRect(ox + 8, oy + 11.4, 32, 54, 7, C_SLATE_ARMOR);
    // Chevron markings
    canvas.drawLine(ox + 16, oy + 26, ox + 24, oy + 32, C_CYAN_NEON, 2);
    canvas.drawLine(ox + 32, oy + 26, ox + 24, oy + 32, C_CYAN_NEON, 2);
    canvas.drawLine(ox + 16, oy + 42, ox + 24, oy + 48, C_CYAN_NEON, 2);
    canvas.drawLine(ox + 32, oy + 42, ox + 24, oy + 48, C_CYAN_NEON, 2);
    canvas.fillCircle(ox + 24, oy + 64.6, 8, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 18. LEAD_SHIN (276, 100, 44, 72) - Pivot (0.5, 0.15) -> (22, 10.8)
  // -------------------------------------------------------------
  {
    const ox = 276, oy = 100;
    canvas.fillCircle(ox + 22, oy + 10.8, 16, C_DARK_TITANIUM);
    canvas.fillCircle(ox + 22, oy + 10.8, 12, C_SLATE_ARMOR);
    canvas.fillPolygon([
      { x: ox + 8, y: oy + 10.8 },
      { x: ox + 36, y: oy + 10.8 },
      { x: ox + 30, y: oy + 61.2 },
      { x: ox + 14, y: oy + 61.2 }
    ], C_SLATE_ARMOR);
    canvas.drawLine(ox + 22, oy + 14, ox + 22, oy + 56, C_CYAN_NEON, 2);
    canvas.fillCircle(ox + 22, oy + 61.2, 7, C_DARK_TITANIUM);
  }

  // -------------------------------------------------------------
  // 19. WEAPON_BASE (0, 200, 36, 136) - Pivot (0.5, 0.85) -> (18, 115.6)
  // -------------------------------------------------------------
  {
    const ox = 0, oy = 200;
    // Tsukamaki Wrapped Hilt (108 to 132)
    canvas.fillRect(ox + 14, oy + 108, 8, 24, C_DARK_TITANIUM);
    for (let y = 110; y < 130; y += 4) {
      canvas.drawLine(ox + 14, oy + y, ox + 22, oy + y + 2, C_DEEP_AZURE, 1);
    }
    // Pommel ring
    canvas.strokeCircle(ox + 18, oy + 132, 3, C_GOLD_CREST, 1.5);

    // Gold Dragon Tsuba Handguard (104 to 108)
    canvas.fillRoundedRect(ox + 6, oy + 104, 24, 5, 2, C_GOLD_CREST);
    canvas.strokeRoundedRect(ox + 6, oy + 104, 24, 5, 2, C_GOLD_DARK, 1);

    // High-carbon Blade Spine & Silver Cutting Edge (6 to 104)
    canvas.fillPolygon([
      { x: ox + 16, y: oy + 6 },
      { x: ox + 20, y: oy + 8 },
      { x: ox + 20, y: oy + 104 },
      { x: ox + 16, y: oy + 104 }
    ], C_DARK_TITANIUM);

    // Razor Silver Edge
    canvas.drawLine(ox + 16, oy + 6, ox + 16, oy + 104, C_SILVER_EDGE, 1.5);
    canvas.drawLine(ox + 17, oy + 8, ox + 17, oy + 102, C_WHITE_HOT, 1);
  }

  // -------------------------------------------------------------
  // 20. WEAPON_GLOW (36, 200, 48, 144) - Pivot (0.5, 0.85) -> (24, 122.4)
  // -------------------------------------------------------------
  {
    const ox = 36, oy = 200;
    // Outer Azure Plasma Halo (Additive Layer)
    for (let w = 18; w >= 2; w -= 2) {
      const alpha = Math.round(180 * (1 - w / 20));
      canvas.fillRect(ox + 24 - w / 2, oy + 6, w, 102, [0, 242, 254, alpha]);
    }

    // Concentrated Plasma Core
    canvas.fillRect(ox + 22, oy + 8, 4, 98, [56, 189, 248, 220]);
    // White-Hot Razor Center Beam
    canvas.fillRect(ox + 23, oy + 10, 2, 94, [255, 255, 255, 255]);

    // Emitter muzzle flare at base
    canvas.fillCircle(ox + 24, oy + 108, 6, [0, 242, 254, 200]);
    canvas.fillCircle(ox + 24, oy + 108, 3, C_WHITE_HOT);
  }

  // -------------------------------------------------------------
  // 21. ACCESSORY (84, 200, 64, 128) - Pivot (0.15, 0.15) -> (9.6, 19.2)
  // -------------------------------------------------------------
  {
    const ox = 84, oy = 200;
    // Flowing Azure Silk Scarf Streamer
    const points = [];
    const ribbonWidth = 10;
    for (let t = 0; t <= 30; t++) {
      const ratio = t / 30;
      const x = ox + 10 + ratio * 42 + Math.sin(ratio * Math.PI * 2) * 6;
      const y = oy + 18 + ratio * 96;
      points.push({ x, y });
    }

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      canvas.drawLine(p1.x, p1.y, p2.x, p2.y, C_CYAN_NEON, ribbonWidth);
      canvas.drawLine(p1.x + 1, p1.y, p2.x + 1, p2.y, C_SKY_AZURE, ribbonWidth - 3);
      canvas.drawLine(p1.x + 2, p1.y, p2.x + 2, p2.y, C_WHITE_HOT, 1.5);
    }

    // Terminal Weighted Gold Beads
    const lastP = points[points.length - 1];
    canvas.fillCircle(lastP.x, lastP.y, 4, C_GOLD_CREST);
    canvas.fillCircle(lastP.x, lastP.y, 2, C_GOLD_DARK);
  }

  return canvas;
}

function createPNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(typeStr, dataBuf) {
    const len = dataBuf.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(typeStr, 4, 4, 'ascii');
    dataBuf.copy(chunk, 8);
    const typeAndData = chunk.subarray(4, 8 + len);
    const crc = crc32(typeAndData);
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawScanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (width * 4 + 1);
    rawScanlines[rawOffset] = 0;
    const rgbaOffset = y * width * 4;
    rgbaBuffer.copy(rawScanlines, rawOffset + 1, rgbaOffset, rgbaOffset + width * 4);
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export function generateShadowRoninAssets(outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, 'atlas.json');
  fs.writeFileSync(jsonPath, JSON.stringify(atlasMetadata, null, 2), 'utf-8');
  console.log(`Generated: ${jsonPath}`);

  const canvas = renderShadowRoninAtlas();
  const pngBuffer = createPNG(ATLAS_WIDTH, ATLAS_HEIGHT, canvas.buffer);
  const pngPath = path.join(outputDir, 'atlas.png');
  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`Generated: ${pngPath} (${pngBuffer.length} bytes)`);

  return { jsonPath, pngPath, sizeBytes: pngBuffer.length };
}

// Direct execution
const targetDir = path.resolve('apps/web/public/assets/characters/shadow_ronin');
generateShadowRoninAssets(targetDir);
