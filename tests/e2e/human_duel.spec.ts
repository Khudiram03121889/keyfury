import { test, expect } from '@playwright/test';

test('KeyFury 1v1 Human-vs-Human Duel Flow', async ({ page, context }) => {
  // Player A (Host) opens landing & navigates to lobby
  await page.goto('http://localhost:5173');
  await page.click('button:has-text("Play a Duel")');
  await page.waitForTimeout(500);

  // Player A creates challenge room
  await page.click('button:has-text("Challenge a Friend")');
  await page.waitForTimeout(1000);

  // Extract challenge room link
  const linkInput = page.locator('input[readonly]').first();
  const challengeUrl = await linkInput.inputValue();
  expect(challengeUrl).toContain('?room=');

  // Player B (Guest) opens challenge link
  const pageB = await context.newPage();
  await pageB.goto(challengeUrl);
  await pageB.waitForTimeout(1000);

  // Both players ready up
  await page.click('button:has-text("Click to Ready Up")');
  await pageB.click('button:has-text("Click to Ready Up")');

  // Wait 4 seconds for match countdown to finish
  await page.waitForTimeout(4000);

  // Type keys accurately by reading active caret character safely
  for (let step = 0; step < 30; step++) {
    try {
      const caret = page.locator('.typing-caret').first();
      if (await caret.isVisible({ timeout: 200 })) {
        let char = await caret.innerText({ timeout: 200 });
        char = char.trim();
        if (char === '␣' || char === '') char = ' ';

        if (char === ' ') {
          await page.keyboard.press('Space');
        } else if (char.length === 1) {
          await page.keyboard.press(char.toLowerCase());
        }
      }
    } catch (_e) {
      // Ignore transient caret DOM updates
    }
    await page.waitForTimeout(60);
  }

  // Verify match is actively in progress
  await expect(page.locator('#active-typing-banner')).toBeVisible();
});
