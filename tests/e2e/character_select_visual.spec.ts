import { test, expect } from '@playwright/test';

test('Character Selection, Interactive Preview & Live Gameplay Visual Test', async ({ page }) => {
  page.on('console', (msg) => console.log('[BROWSER CONSOLE]', msg.text()));

  // 1. Open home page
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // 2. Navigate to Lobby
  await page.click('button:has-text("Play a Duel")');
  await page.waitForTimeout(1000);

  // 3. Take screenshot of Lobby with Active Champion Badge
  await page.screenshot({ path: 'character_select_lobby_initial.png', fullPage: true });

  // 4. Open Character Selection Modal
  const changeCharBtn = page.locator('button:has-text("Change Champion"), button:has-text("Select Fighter"), button:has-text("Change Fighter"), [data-testid="change-character-btn"]').first();
  if (await changeCharBtn.isVisible({ timeout: 2000 })) {
    await changeCharBtn.click();
  } else {
    const championCard = page.locator('text=Active Champion').first();
    if (await championCard.isVisible({ timeout: 2000 })) {
      await championCard.click();
    }
  }

  await page.waitForTimeout(1000);

  // 5. Screenshot of Character Select Modal showing initial state
  await page.screenshot({ path: 'character_select_modal_initial.png', fullPage: true });

  // 6. Test clicking on each fighter card using data-testid
  const charIds = ['cyber-valkyrie', 'volt-shinobi', 'void-assassin', 'shadow-ronin'];
  for (const id of charIds) {
    const card = page.locator(`[data-testid="character-card-${id}"]`);
    if (await card.isVisible({ timeout: 2000 })) {
      await card.click({ force: true });
      await page.waitForTimeout(500);

      // Trigger Test Strike button
      const strikeBtn = page.locator('button:has-text("Test Strike")').first();
      if (await strikeBtn.isVisible({ timeout: 1000 })) {
        await strikeBtn.click();
        await page.waitForTimeout(350);
      }
    }
  }

  // Select Volt Shinobi (Electric Gold theme)
  const voltCard = page.locator('[data-testid="character-card-volt-shinobi"]');
  if (await voltCard.isVisible({ timeout: 2000 })) {
    await voltCard.click({ force: true });
    await page.waitForTimeout(500);
  }

  // Take screenshot of focused Volt Shinobi card with stats & lore
  await page.screenshot({ path: 'character_select_modal_shinobi.png', fullPage: true });

  // Click Confirm / Select Champion
  const confirmBtn = page.locator('[data-testid="confirm-character-selection-btn"]').first();
  if (await confirmBtn.isVisible({ timeout: 2000 })) {
    await confirmBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }

  // 7. Screenshot of Lobby with updated selected champion
  await page.screenshot({ path: 'character_select_lobby_updated.png', fullPage: true });

  // 8. Start Practice vs AI Bot
  await page.click('button:has-text("Start Bot Fight")');
  await page.waitForTimeout(1000);

  // Click Ready Up & Fight Bot!
  const readyBtn = page.locator('button:has-text("Ready Up")').first();
  if (await readyBtn.isVisible({ timeout: 3000 })) {
    await readyBtn.click();
  }

  // Wait 4.5 seconds for countdown (3-2-1)
  await page.waitForTimeout(4500);

  // 9. Send typing keystrokes during live combat
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
    }
    await page.waitForTimeout(150);
  }

  // 10. Capture live in-game duel screenshot with custom character skin and VFX
  await page.screenshot({ path: 'character_match_gameplay_live.png', fullPage: true });
  console.log('ALL VISUAL SCREENSHOTS CAPTURED SUCCESSFULLY!');
});
