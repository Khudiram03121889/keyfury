const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.text()));

  await page.goto('http://localhost:5173');
  await page.evaluate(() => {
    localStorage.setItem('keyfury_selected_arena', 'highland_sanctuary');
  });

  await page.click('button:has-text("Play a Duel")');
  await page.waitForTimeout(1200);

  // In lobby, check Highland Sanctuary card is selected or select it
  const highlandBtn = page.locator('div:has-text("Highland Sanctuary")').last();
  await highlandBtn.click();
  await page.waitForTimeout(500);

  // Click Start Bot Fight
  const startBot = page.locator('button:has-text("Start Bot Fight")');
  if (await startBot.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBot.click();
    await page.waitForTimeout(1000);
  }

  // If modal opened, click START FIGHT
  const startFight = page.locator('button:has-text("START FIGHT")');
  if (await startFight.isVisible({ timeout: 2000 }).catch(() => false)) {
    await startFight.click();
    await page.waitForTimeout(1000);
  }

  // In room, click Ready Up & Fight Bot!
  const readyBtn = page.locator('button:has-text("Ready Up & Fight Bot!"), button:has-text("Ready Up")').first();
  await readyBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Found Ready Up button, clicking...');
  await readyBtn.click();

  // Wait for canvas element
  console.log('Waiting for WebGL canvas...');
  await page.waitForSelector('canvas', { timeout: 15000 });
  console.log('Canvas mounted! Waiting for 3D assets to load and render...');
  await page.waitForTimeout(4000);

  await page.screenshot({ path: 'test_3d/real_match_highland_3d.png' });
  console.log('Captured test_3d/real_match_highland_3d.png');

  // Skip intro to capture combat mode
  try {
    const skipBtn = page.getByTestId('skip-intro-button');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }
  } catch (e) {}

  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test_3d/real_match_highland_combat.png' });
  console.log('Captured test_3d/real_match_highland_combat.png');

  await browser.close();
  console.log('All done!');
})();
