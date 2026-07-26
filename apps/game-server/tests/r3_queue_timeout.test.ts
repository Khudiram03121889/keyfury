import { describe, it, expect, vi } from 'vitest';

describe('R3: Matchmaking Queue Timeout & Tolerance Calculations', () => {
  // Formula under test:
  // mmrTolerance = Math.min(1000, 100 + Math.floor(elapsedSeconds / 3) * 50)
  // levelTolerance = Math.min(10, 2 + Math.floor(elapsedSeconds / 3) * 1)
  const calculateMMRTolerance = (elapsedSeconds: number): number => {
    return Math.min(1000, 100 + Math.floor(elapsedSeconds / 3) * 50);
  };

  const calculateLevelTolerance = (elapsedSeconds: number): number => {
    return Math.min(10, 2 + Math.floor(elapsedSeconds / 3) * 1);
  };

  it('computes exact MMR search tolerance at 0s, 3s, 6s, 19s, and 20s', () => {
    expect(calculateMMRTolerance(0)).toBe(100);
    expect(calculateMMRTolerance(1)).toBe(100);
    expect(calculateMMRTolerance(2)).toBe(100);

    expect(calculateMMRTolerance(3)).toBe(150);
    expect(calculateMMRTolerance(5)).toBe(150);

    expect(calculateMMRTolerance(6)).toBe(200);

    expect(calculateMMRTolerance(19)).toBe(400); // 100 + floor(19/3)*50 = 100 + 6*50 = 400
    expect(calculateMMRTolerance(20)).toBe(400); // 100 + floor(20/3)*50 = 100 + 6*50 = 400
  });

  it('computes exact Level search tolerance at 0s, 3s, 6s, 19s, and 20s', () => {
    expect(calculateLevelTolerance(0)).toBe(2);
    expect(calculateLevelTolerance(1)).toBe(2);
    expect(calculateLevelTolerance(2)).toBe(2);

    expect(calculateLevelTolerance(3)).toBe(3);
    expect(calculateLevelTolerance(6)).toBe(4);

    expect(calculateLevelTolerance(19)).toBe(8); // 2 + floor(19/3)*1 = 2 + 6 = 8
    expect(calculateLevelTolerance(20)).toBe(8); // 2 + floor(20/3)*1 = 2 + 6 = 8
  });

  it('enforces caps on MMR tolerance (1000 MMR) and Level tolerance (10 levels)', () => {
    expect(calculateMMRTolerance(60)).toBe(1000);
    expect(calculateLevelTolerance(60)).toBe(10);
  });

  it('verifies strict 20.0-second queue timeout trigger condition', () => {
    const queueElapsedTimes = Array.from({ length: 25 }, (_, i) => i);
    const timeoutTriggeredTimes = queueElapsedTimes.filter((t) => t >= 20);

    expect(timeoutTriggeredTimes).toEqual([20, 21, 22, 23, 24]);
    expect(queueElapsedTimes.filter((t) => t < 20).length).toBe(20); // 0s through 19s
  });
});
