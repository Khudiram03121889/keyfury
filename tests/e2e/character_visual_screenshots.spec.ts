import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Automated Playwright Browser Test Harness for On-Screen Character Combat Screenshots
 * KeyFury Character Rigging & Visual Overhaul
 *
 * Captures live browser gameplay screenshots for each character across Desktop and Mobile viewports
 * for combat states: Idle, Jab, Heavy Attack, Knockdown.
 *
 * Output: tests/e2e/screenshots/<characterId>/<viewport>_<state>.png
 */

const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 }
} as const;

type ViewportName = keyof typeof VIEWPORTS;

const COMBAT_STATES = ['idle', 'jab', 'heavy', 'knockdown'] as const;
type CombatState = typeof COMBAT_STATES[number];

const CHARACTERS = [
  { id: 'shadow_ronin', name: 'Shadow Ronin (Kage)', weapon: 'Azure Plasma Katana' },
  { id: 'cyber_valkyrie', name: 'Cyber Valkyrie (Freya)', weapon: 'Crimson Gauntlets' },
  { id: 'volt_shinobi', name: 'Volt Shinobi (Raijin)', weapon: 'Volt Lightning Kunai' },
  { id: 'void_assassin', name: 'Void Assassin (Nyx)', weapon: 'Void Daggers' }
] as const;

/**
 * Helper to ensure destination directory exists and return absolute screenshot path.
 */
function getScreenshotPath(characterId: string, viewport: ViewportName, state: CombatState): string {
  const outputDir = path.join(process.cwd(), 'tests', 'e2e', 'screenshots', characterId);
  fs.mkdirSync(outputDir, { recursive: true });
  return path.join(outputDir, `${viewport}_${state}.png`);
}

/**
 * Navigates to local KeyFury arena/duel scene and starts a bot match with the specified character.
 */
async function launchCombatArena(page: Page, characterId: string, viewport: ViewportName) {
  // Configure viewport
  await page.setViewportSize(VIEWPORTS[viewport]);

  // Set selected character in localStorage before load
  await page.addInitScript((charId) => {
    localStorage.setItem('keyfury_selected_character', charId);
    localStorage.setItem('keyfury_selected_arena', 'highland_sanctuary');
  }, characterId);

  // 1. Navigate to home
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // 2. Click Play a Duel to open lobby
  const playBtn = page.locator('button:has-text("Play a Duel")').first();
  await expect(playBtn).toBeVisible({ timeout: 10000 });
  await playBtn.click();
  await page.waitForTimeout(800);

  // 3. Click Start Bot Fight
  const botFightBtn = page.locator('button:has-text("Start Bot Fight"), button:has-text("Practice vs AI Bot")').first();
  await expect(botFightBtn).toBeVisible({ timeout: 10000 });
  await botFightBtn.click();
  await page.waitForTimeout(800);

  // 4. Handle Arena Select Modal if open
  const startFightModalBtn = page.locator('button:has-text("START FIGHT")').first();
  if (await startFightModalBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startFightModalBtn.click();
    await page.waitForTimeout(800);
  }

  // 5. Click Ready Up & Fight Bot!
  const readyBtn = page.locator('button:has-text("Ready Up")').first();
  if (await readyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await readyBtn.click();
  }

  // 6. Wait for countdown (3-2-1) and combat arena canvas to be active
  await page.waitForSelector('#combat_keystroke_input', { timeout: 20000 });
  await page.waitForTimeout(4500);

  // 7. Verify canvas is rendered
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 10000 });

  // 8. Ensure character skin is active in StickFightScene
  await page.evaluate((targetCharId) => {
    function findStickFightScene(): any {
      if ((window as any).__stickFightScene) return (window as any).__stickFightScene;
      if ((window as any).Phaser?.GAMES?.[0]) {
        return (window as any).Phaser.GAMES[0].scene.getScene('StickFightScene');
      }
      const cnv = document.querySelector('canvas');
      if (!cnv || !cnv.parentElement) return null;
      const fiberKey = Object.keys(cnv.parentElement).find(
        (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (!fiberKey) return null;
      let fiber = (cnv.parentElement as any)[fiberKey];
      while (fiber) {
        let hook = fiber.memoizedState;
        while (hook) {
          if (hook.memoizedState && hook.memoizedState.current) {
            const currentObj = hook.memoizedState.current;
            if (currentObj.characterRigRenderer && typeof currentObj.setCharacterSkins === 'function') {
              return currentObj;
            }
            if (currentObj.scene && typeof currentObj.scene.getScene === 'function') {
              const sc = currentObj.scene.getScene('StickFightScene');
              if (sc) return sc;
            }
          }
          hook = hook.next;
        }
        fiber = fiber.return;
      }
      return null;
    }

    const scene = findStickFightScene();
    if (scene) {
      (window as any).__stickFightScene = scene;
      scene.setCharacterSkins(targetCharId, 'cyber_valkyrie');
      if (typeof scene.handleResize === 'function') {
        scene.handleResize();
      }
    }
  }, characterId);

  await page.waitForTimeout(300);
}

/**
 * Triggers a specific combat pose and captures a screenshot of the Phaser canvas / arena.
 */
async function capturePoseScreenshot(
  page: Page,
  characterId: string,
  viewport: ViewportName,
  state: CombatState
): Promise<string> {
  const screenshotFile = getScreenshotPath(characterId, viewport, state);

  // Trigger specific combat pose in the scene
  await page.evaluate((targetState) => {
    const scene = (window as any).__stickFightScene;
    if (!scene) return;

    if (scene.p1Timer) scene.p1Timer.remove();
    if (scene.p2Timer) scene.p2Timer.remove();

    if (targetState === 'idle') {
      scene.p1State = 'idle';
      scene.p2State = 'idle';
      scene.p1JumpY = 0;
      scene.p1DashOffset = 0;
    } else if (targetState === 'jab') {
      scene.triggerAttack('left', 'jab', 12, 1);
    } else if (targetState === 'heavy') {
      scene.triggerAttack('left', 'heavy', 30, 4);
    } else if (targetState === 'knockdown') {
      scene.triggerAttack('right', 'knockdown', 50, 0);
    }
  }, state);

  // Hold pose long enough to capture peak frame
  const holdMs = state === 'idle' ? 200 : state === 'jab' ? 120 : state === 'heavy' ? 180 : 350;
  await page.waitForTimeout(holdMs);

  // Capture canvas screenshot
  const canvas = page.locator('canvas').first();
  await canvas.screenshot({ path: screenshotFile });

  console.log(`[VISUAL SCREENSHOT CAPTURED] ${characterId} | ${viewport} | ${state} -> ${screenshotFile}`);
  return screenshotFile;
}

// ============================================================================
// CHARACTER VISUAL SCREENSHOT TEST SUITE
// ============================================================================

test.describe('KeyFury Character Combat Visual Screenshot Suite', () => {
  // Test Shadow Ronin (Kage) for Milestone 1 Verification
  test.describe('Shadow Ronin (Kage) — Visual Verification', () => {
    const char = CHARACTERS[0]; // shadow_ronin

    test('Desktop Viewport (1280x720) Combat Poses', async ({ page }) => {
      await launchCombatArena(page, char.id, 'desktop');

      for (const state of COMBAT_STATES) {
        const filePath = await capturePoseScreenshot(page, char.id, 'desktop', state);
        expect(fs.existsSync(filePath)).toBe(true);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(1000); // Valid non-empty PNG
      }
    });

    test('Mobile Viewport (390x844) Combat Poses', async ({ page }) => {
      await launchCombatArena(page, char.id, 'mobile');

      for (const state of COMBAT_STATES) {
        const filePath = await capturePoseScreenshot(page, char.id, 'mobile', state);
        expect(fs.existsSync(filePath)).toBe(true);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(1000); // Valid non-empty PNG
      }
    });
  });

  // Parameterized Test Runner for subsequent character rosters (Cyber Valkyrie, Volt Shinobi, Void Assassin)
  for (const char of CHARACTERS.slice(1)) {
    test.describe(`${char.name} — Visual Verification`, () => {
      test(`Desktop Viewport (1280x720) Combat Poses`, async ({ page }) => {
        await launchCombatArena(page, char.id, 'desktop');

        for (const state of COMBAT_STATES) {
          const filePath = await capturePoseScreenshot(page, char.id, 'desktop', state);
          expect(fs.existsSync(filePath)).toBe(true);
          const stats = fs.statSync(filePath);
          expect(stats.size).toBeGreaterThan(1000);
        }
      });

      test(`Mobile Viewport (390x844) Combat Poses`, async ({ page }) => {
        await launchCombatArena(page, char.id, 'mobile');

        for (const state of COMBAT_STATES) {
          const filePath = await capturePoseScreenshot(page, char.id, 'mobile', state);
          expect(fs.existsSync(filePath)).toBe(true);
          const stats = fs.statSync(filePath);
          expect(stats.size).toBeGreaterThan(1000);
        }
      });
    });
  }
});
