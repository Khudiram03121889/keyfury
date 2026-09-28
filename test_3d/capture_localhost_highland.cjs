const { chromium } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  const consoleLogs = [];
  page.on('console', msg => {
    console.log('[BROWSER]', msg.type(), msg.text());
    consoleLogs.push({ type: msg.type(), text: msg.text() });
  });
  page.on('pageerror', err => {
    console.log('[BROWSER ERROR]', err.message);
    consoleLogs.push({ type: 'error', text: err.message });
  });

  // 1. Visit homepage first to set localStorage
  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(1000);

  // Take screenshot of landing page
  await page.screenshot({ path: 'test_3d/localhost_landing.png' });
  console.log('Saved localhost_landing.png');

  // Set selected arena to highland_sanctuary
  await page.evaluate(() => {
    localStorage.setItem('keyfury_selected_arena', 'highland_sanctuary');
  });

  // Click Play a Duel to go to lobby
  await page.click('button:has-text("Play a Duel")');
  await page.waitForTimeout(1200);

  // Take screenshot of lobby
  await page.screenshot({ path: 'test_3d/localhost_lobby.png' });
  console.log('Saved localhost_lobby.png');

  // Click Start Bot Fight
  const botBtn = page.locator('button:has-text("Start Bot Fight")');
  if (await botBtn.isVisible()) {
    await botBtn.click();
    await page.waitForTimeout(1000);
  }

  // If Arena Select Modal is open, select Highland Sanctuary
  const highlandCard = page.locator('text=Highland Sanctuary');
  if (await highlandCard.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Selecting Highland Sanctuary in modal...');
    await highlandCard.click();
    await page.waitForTimeout(500);
    const startFightBtn = page.locator('button:has-text("START FIGHT")');
    if (await startFightBtn.isVisible()) {
      await startFightBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Click Ready Up
  const readyBtn = page.locator('button:has-text("Ready Up")');
  if (await readyBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
    console.log('Clicking Ready Up...');
    await readyBtn.click();
  }

  // Wait for 3D arena to load and start intro/combat
  await page.waitForTimeout(3000);

  // Screenshot during intro
  await page.screenshot({ path: 'test_3d/localhost_match_intro.png' });
  console.log('Saved localhost_match_intro.png');

  // Skip intro
  try {
    const skipBtn = page.getByTestId('skip-intro-button');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }
  } catch (e) {}

  await page.waitForTimeout(2000);

  // Screenshot during active combat
  await page.screenshot({ path: 'test_3d/localhost_match_combat.png' });
  console.log('Saved localhost_match_combat.png');

  fs.writeFileSync('test_3d/browser_console_logs.json', JSON.stringify(consoleLogs, null, 2));

  await browser.close();
  console.log('Done!');
})();
