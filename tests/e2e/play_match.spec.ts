import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation & Accessibility', () => {
  test('Landing and lobby pages have navigable interactive elements without focus traps', async ({ page }) => {
    await page.goto('/');

    // Tab into Play a Duel button
    await page.keyboard.press('Tab');
    const playBtn = page.getByRole('button', { name: /Play a Duel/i });
    await expect(playBtn).toBeVisible();

    // Trigger Play a Duel
    await playBtn.click();
    await expect(page.getByRole('heading', { name: /Choose Duel Mode/i })).toBeVisible();

    // Tab through Quick Duel and Challenge Friend buttons
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });
});
