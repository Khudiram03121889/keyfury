import { test, expect } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  isMobile: true,
  hasTouch: true
});

test('Mobile Portrait Fight Viewport & Keyboard Framing Test', async ({ page }) => {
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

  // Take screenshot of initial mobile duel arena (full screen before typing)
  await page.screenshot({ path: 'mobile_fight_arena_initial.png' });

  // 4. Simulate mobile soft keyboard opening (visualViewport resize: 844px -> 460px)
  await page.setViewportSize({ width: 390, height: 460 });
  await page.waitForTimeout(800);

  // Type characters into combat input
  for (let step = 0; step < 20; step++) {
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
    }
    await page.waitForTimeout(150);
  }

  // 5. Take screenshot of mobile arena with keyboard active
  await page.screenshot({ path: 'mobile_fight_arena_with_keyboard.png' });
  console.log('MOBILE VISUAL SCREENSHOTS CAPTURED SUCCESSFULLY!');
});
