import { test, expect } from '@playwright/test';

test('Practice vs AI Bot Duel Flow & Screenshot Capture', async ({ page }) => {
  page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.text()));

  // Navigate to home page
  await page.goto('http://localhost:5173');
  await page.click('button:has-text("Play a Duel")');
  await page.waitForTimeout(500);

  // Click Practice vs AI Bot
  await page.click('h3:has-text("Practice vs AI Bot")');
  await page.waitForTimeout(1000);

  // Click Ready Up & Fight Bot
  await page.click('button:has-text("Ready Up")');

  // Wait 4.5 seconds for countdown (3-2-1) to finish and match to start
  await page.waitForTimeout(4500);

  // Verify active typing banner is visible at the bottom
  const banner = page.locator('#active-typing-banner');
  await expect(banner).toBeVisible();

  // Send keys through the dedicated combat input; it remains focused above the Phaser canvas.
  const combatInput = page.getByLabel('Combat typing input');

  // Type 25 characters to trigger key steps, word completion attacks, combos, and attacks.
  for (let step = 0; step < 25; step++) {
    try {
      const caret = page.locator('.typing-caret').first();
      if (await caret.isVisible({ timeout: 200 })) {
        let char = await caret.innerText({ timeout: 200 });
        char = char.trim();
        if (char === '␣') char = ' ';

        if (char === ' ') {
          await page.keyboard.press('Space');
        } else if (char.length === 1) {
          await page.keyboard.press(char.toLowerCase());
        }
      }
    } catch (_error) {
      // Ignore transient caret updates
    }
    await page.waitForTimeout(180);
  }

  // Completing server-validated words must damage the bot or complete the match.
  const rightHealth = page.getByTestId('right-health');
  if (await rightHealth.isVisible().catch(() => false)) {
    await expect(rightHealth).not.toHaveText('100 / 100');
  } else {
    // Match completed via knockout
    await expect(page.locator('body')).toContainText(/Match Result|VICTORY|DEFEAT|KNOCKOUT/i);
  }

  // Take full page screenshot
  await page.screenshot({ path: 'match_gameplay_live.png', fullPage: true });
});
