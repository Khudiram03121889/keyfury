import { test, expect } from '@playwright/test';

test.describe('KeyFury E2E Flow', () => {
  test('Landing page renders hero heading and play button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2 })).toContainText('Type words. Land hits.');
    await expect(page.getByRole('button', { name: /Play a Duel/i })).toBeVisible();
  });

  test('Visitor can navigate from landing to lobby', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Play a Duel/i }).click();
    await expect(page.getByRole('heading', { name: /Choose Duel Mode/i })).toBeVisible();
  });
});
