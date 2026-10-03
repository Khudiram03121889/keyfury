import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('renders programmatic 1:1 match card for victory and defeat', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as any).__generateMatchCardBlob === 'function', { timeout: 15000 });

  // 1. Victory scenario
  const victoryBase64: string = await page.evaluate(async () => {
    const res = await (window as any).__generateMatchCardBlob({
      playerName: 'Swift Falcon',
      opponentName: 'Shadow Ronin',
      isWinner: true,
      wpm: 124,
      accuracy: 98.5,
      maxCombo: 34,
      finalHealth: 88,
      wordsCompleted: 72,
      playerMmr: 1950,
      mmrDelta: 28,
      unlockedAchievements: [
        { id: 'century_club', title: 'Century Club', icon: '💯', description: 'Over 100 WPM reached' },
        { id: 'combo_master', title: 'Combo Master', icon: '🔥', description: '30+ combo streak' }
      ],
      matchId: 'KF-789012'
    });

    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(res.blob);
    });
  });

  expect(victoryBase64).toBeTruthy();
  const vImg = victoryBase64.split(';base64,').pop()!;
  const vPath = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/0b1a83f0-059e-4e0e-a3af-41d606e4627d/sample_card_victory.png');
  fs.writeFileSync(vPath, vImg, { encoding: 'base64' });

  // 2. Defeat scenario
  const defeatBase64: string = await page.evaluate(async () => {
    const res = await (window as any).__generateMatchCardBlob({
      playerName: 'Shadow Ronin',
      opponentName: 'Cyber Valkyrie',
      isWinner: false,
      wpm: 74,
      accuracy: 91.2,
      maxCombo: 12,
      finalHealth: 0,
      wordsCompleted: 38,
      playerMmr: 1420,
      mmrDelta: -16,
      matchId: 'KF-341908'
    });

    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(res.blob);
    });
  });

  expect(defeatBase64).toBeTruthy();
  const dImg = defeatBase64.split(';base64,').pop()!;
  const dPath = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/0b1a83f0-059e-4e0e-a3af-41d606e4627d/sample_card_defeat.png');
  fs.writeFileSync(dPath, dImg, { encoding: 'base64' });
});
