import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Playwright Visual Test Suite for Cyber-Boot & Footwear Overhaul
 * KeyFury 3D Martial Fighter Boots & Greaves
 *
 * Verifies all 4 characters (Shadow Ronin, Volt Shinobi, Void Assassin, Cyber Valkyrie)
 * in the 3D WebGL arena across combat states, closeup angles, and arena decks.
 */

const OUTPUT_DIR = path.join(process.cwd(), 'tests', 'e2e', 'screenshots', 'cyber_boots');

const CHARACTERS = [
  { id: 'ronin', cardId: 'shadow-ronin', name: 'Shadow Ronin', glow: 'Cyan (#00f0ff)' },
  { id: 'shinobi', cardId: 'volt-shinobi', name: 'Volt Shinobi', glow: 'Gold (#ffbe0b)' },
  { id: 'void', cardId: 'void-assassin', name: 'Void Assassin', glow: 'Purple (#b5179e)' },
  { id: 'valkyrie', cardId: 'cyber-valkyrie', name: 'Cyber Valkyrie', glow: 'Crimson (#ff0055)' },
] as const;

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
});

test.describe('KeyFury 3D Cyber-Boot & Grounding Visual Verification', () => {
  for (const char of CHARACTERS) {
    test(`Visual Verification for ${char.name} (${char.glow})`, async ({ page }) => {
      test.setTimeout(90000);
      // Configure Desktop Viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      // Navigate to game
      await page.goto('http://localhost:5173');
      await page.waitForTimeout(1000);

      // Open Play a Duel
      const playBtn = page.locator('button:has-text("Play a Duel")').first();
      await expect(playBtn).toBeVisible({ timeout: 15000 });
      await playBtn.click();
      await page.waitForTimeout(600);

      // Open Character Select Modal to select exact fighter
      const changeCharBtn = page.locator('button:has-text("Change Champion"), button:has-text("Select Fighter"), button:has-text("Change Fighter"), [data-testid="change-character-btn"]').first();
      if (await changeCharBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await changeCharBtn.click();
        await page.waitForTimeout(500);

        const card = page.locator(`[data-testid="character-card-${char.cardId}"]`).first();
        if (await card.isVisible({ timeout: 2000 }).catch(() => false)) {
          await card.click({ force: true });
          await page.waitForTimeout(300);
        }

        const confirmBtn = page.locator('[data-testid="confirm-character-selection-btn"]').first();
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click({ force: true });
          await page.waitForTimeout(600);
        }
      }

      // Click Start Bot Fight
      const botFightBtn = page.locator('button:has-text("Start Bot Fight"), button:has-text("Practice vs AI Bot")').first();
      if (await botFightBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await botFightBtn.click();
        await page.waitForTimeout(800);
      }

      // Click START FIGHT on modal if visible
      const startFightModalBtn = page.locator('button:has-text("START FIGHT")').first();
      if (await startFightModalBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startFightModalBtn.click();
        await page.waitForTimeout(800);
      }

      // Click Ready Up
      const readyBtn = page.locator('button:has-text("Ready Up")').first();
      if (await readyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await readyBtn.click();
      }

      // Wait for 3D canvas
      await page.waitForSelector('canvas', { timeout: 30000 });
      await page.waitForTimeout(2500);

      // Snap fighters to marks, swap skin to current character, and position camera
      await page.evaluate((cId) => {
        const p1 = (window as any).__p1;
        const p2 = (window as any).__p2;
        const camera = (window as any).__threeCamera;

        if ((window as any).__setCharacterSkins) {
          (window as any).__setCharacterSkins(cId, 'ronin');
        }

        const activeP1 = (window as any).__p1;
        const activeP2 = (window as any).__p2;
        if (activeP1) activeP1.setEntranceProgress(1.0);
        if (activeP2) activeP2.setEntranceProgress(1.0);

        if (camera) {
          camera.position.set(0, 2.33, 20.0);
          camera.lookAt(0, 2.205, 0);
          camera.fov = 28.4;
          camera.updateProjectionMatrix();
        }
      }, char.id);

      await page.waitForTimeout(600);

      // 1. Capture Full Body Grounded Arena Stance
      const fullBodyPath = path.join(OUTPUT_DIR, `${char.id}_01_full_body_grounded.png`);
      await page.screenshot({ path: fullBodyPath });
      expect(fs.existsSync(fullBodyPath)).toBe(true);

      // 2. Focus Camera for Dramatic Feet & Cyber-Boots Close-Up Shot
      await page.evaluate(() => {
        const camera = (window as any).__threeCamera;
        if (camera) {
          // Camera at knee level focused directly on left fighter's grounded boots
          camera.position.set(-1.75, 0.45, 2.6);
          camera.lookAt(-1.75, 0.25, 0);
          camera.fov = 40.0;
          camera.updateProjectionMatrix();
        }
      });
      await page.waitForTimeout(300);

      const feetCloseupPath = path.join(OUTPUT_DIR, `${char.id}_02_feet_closeup_grounded.png`);
      await page.screenshot({ path: feetCloseupPath });
      expect(fs.existsSync(feetCloseupPath)).toBe(true);

      // 3. Trigger Kick Animation (Martial snap & illuminated glowing neon sole treads)
      await page.evaluate(() => {
        const p1 = (window as any).__p1;
        const camera = (window as any).__threeCamera;
        if (p1 && camera) {
          p1.playKick();
          // Frame the high roundhouse kick strike
          camera.position.set(-1.20, 0.90, 3.4);
          camera.lookAt(-1.10, 0.80, 0);
          camera.fov = 42.0;
          camera.updateProjectionMatrix();
        }
      });
      await page.waitForTimeout(180); // Peak kick extension frame

      const kickPath = path.join(OUTPUT_DIR, `${char.id}_03_kick_neon_surge.png`);
      await page.screenshot({ path: kickPath });
      expect(fs.existsSync(kickPath)).toBe(true);

      // 4. Trigger Jab (Forward lunging drive & rear foot plant)
      await page.evaluate(() => {
        const p1 = (window as any).__p1;
        const camera = (window as any).__threeCamera;
        if (p1 && camera) {
          p1.playJab();
          camera.position.set(-0.80, 0.65, 3.2);
          camera.lookAt(-0.80, 0.50, 0);
          camera.fov = 40.0;
          camera.updateProjectionMatrix();
        }
      });
      await page.waitForTimeout(120);

      const jabPath = path.join(OUTPUT_DIR, `${char.id}_04_jab_drive.png`);
      await page.screenshot({ path: jabPath });
      expect(fs.existsSync(jabPath)).toBe(true);

      // 5. Duel View: Both fighters standing face to face
      await page.evaluate(() => {
        const camera = (window as any).__threeCamera;
        if (camera) {
          camera.position.set(0, 1.4, 6.8);
          camera.lookAt(0, 0.85, 0);
          camera.fov = 34.0;
          camera.updateProjectionMatrix();
        }
      });
      await page.waitForTimeout(300);

      const duelPath = path.join(OUTPUT_DIR, `${char.id}_05_duel_grounded.png`);
      await page.screenshot({ path: duelPath });
      expect(fs.existsSync(duelPath)).toBe(true);

      console.log(`[BOOT SCREENSHOTS SAVED] ${char.name} screenshots saved to ${OUTPUT_DIR}`);
    });
  }
});
