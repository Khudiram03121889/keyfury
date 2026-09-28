import { test, expect } from '@playwright/test';

test('Practice vs AI Bot Duel Flow & Screenshot Capture', async ({ page }) => {
  test.setTimeout(120000);
  page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.text()));

  // Navigate to home page
  await page.goto('http://localhost:5173');
  await page.click('button:has-text("Play a Duel")');
  await page.waitForTimeout(800);

  // Click Start Bot Fight
  await page.click('button:has-text("Start Bot Fight")');
  await page.waitForTimeout(1000);

  // If Arena Selection Modal appears, click START FIGHT
  const startFight = page.locator('button:has-text("START FIGHT")');
  if (await startFight.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startFight.click();
    await page.waitForTimeout(1000);
  }

  // If Character Selection Modal appears, click START MATCH
  const startMatch = page.locator('button:has-text("START MATCH")');
  if (await startMatch.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startMatch.click();
    await page.waitForTimeout(1000);
  }

  // Click Ready Up & Fight Bot if lobby subview is shown
  const readyBtn = page.locator('button:has-text("Ready Up")');
  if (await readyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await readyBtn.click();
  }

  // Wait for Skip Intro button and click it to immediately activate combat
  const skipIntro = page.getByTestId('skip-intro-button');
  try {
    await skipIntro.waitFor({ state: 'visible', timeout: 8000 });
    await skipIntro.click();
  } catch (_e) {
    await page.keyboard.press('Enter');
  }

  // Send keys through the dedicated combat input
  const combatInput = page.getByLabel('Combat typing input');
  await expect(combatInput).toBeEnabled({ timeout: 15000 });

  // Verify active typing banner is visible at the bottom
  const banner = page.locator('#active-typing-banner');
  await expect(banner).toBeVisible();

  // Wait for combat input to become enabled and ready
  await page.waitForTimeout(1000);

  // Type characters cleanly to trigger key steps, word completion attacks, and tiered combo finishers.
  for (let step = 0; step < 45; step++) {
    const char = await page.evaluate(() => {
      const caret = document.querySelector('.typing-caret');
      return caret ? caret.textContent : null;
    });

    if (char !== null) {
      if (char === '\u00A0' || char === '␣' || char === ' ' || !char || char.trim() === '') {
        await page.keyboard.press('Space');
      } else {
        await page.keyboard.press(char.trim().toLowerCase());
      }
    }
    await page.waitForTimeout(80);
  }

  // Completing server-validated words must damage the bot or complete the match.
  const rightHealth = page.getByTestId('right-health');
  if (await rightHealth.isVisible().catch(() => false)) {
    await expect(rightHealth).not.toHaveText('200 / 200');
  } else {
    // Match completed via knockout
    await expect(page.locator('body')).toContainText(/Match Result|VICTORY|DEFEAT|KNOCKOUT/i);
  }

  // Trigger visual hit feedback to capture active impact frame (particles, shockwave, hit flash)
  await page.evaluate(() => {
    if (typeof (window as any).__triggerHit === 'function') {
      (window as any).__triggerHit('right', 'heavy');
    }
  });
  await page.waitForTimeout(60);

  // Take full page screenshot of active combat with visible hit interaction
  await page.screenshot({ path: 'match_gameplay_live.png', fullPage: true });
});
