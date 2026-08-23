import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  isMobile: true,
  hasTouch: true
});

test('Mobile Portrait Fight Viewport & Typo Error Test', async ({ page }) => {
  page.on('console', (msg) => console.log('[MOBILE CONSOLE]', msg.text()));

  // 1. Open mobile web app
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // 2. Click Play a Duel to go to Lobby
  await page.click('button:has-text("Play a Duel")');
  await page.waitForTimeout(1000);

  // 3. Start Bot Duel
  await page.click('button:has-text("Start Bot Fight")');
  await page.waitForTimeout(1000);

  // Click Ready Up & Fight Bot!
  const readyBtn = page.locator('button:has-text("Ready Up")').first();
  if (await readyBtn.isVisible({ timeout: 3000 })) {
    await readyBtn.click();
  }

  // Wait 4.5 seconds for countdown (3-2-1)
  await page.waitForTimeout(4500);

  // Take screenshot of initial mobile duel arena
  await page.screenshot({ path: 'mobile_fight_arena_initial.png' });

  // 4. Simulate mobile soft keyboard opening (visualViewport resize: 844px -> 460px)
  await page.setViewportSize({ width: 390, height: 460 });
  await page.waitForTimeout(600);

  // 5. Deliberately type WRONG keys to trigger typo error and stun!
  await page.keyboard.press('z');
  await page.waitForTimeout(100);
  await page.keyboard.press('q');
  await page.waitForTimeout(200);

  // Capture screenshot during error state to confirm arena is NOT turning black!
  await page.screenshot({ path: 'mobile_fight_error_flash.png' });

  // Wait for 500ms stun to clear
  await page.waitForTimeout(600);

  // Type correct combat keys
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('a');
    await page.waitForTimeout(80);
    await page.keyboard.press('Space');
    await page.waitForTimeout(80);
  }

  // 6. Take screenshot of mobile arena with keyboard active after error recovery
  await page.screenshot({ path: 'mobile_fight_arena_with_keyboard.png' });
  console.log('MOBILE TYPO ERROR AND FRAMING TEST COMPLETED SUCCESSFULLY!');
});
