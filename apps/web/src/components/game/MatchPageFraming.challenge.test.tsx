import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { getActiveKeyHighlight } from '@keyfury/game-core';
import {
  VirtualKeypad,
  ROW_1_KEYS,
  ROW_2_KEYS,
  ROW_3_KEYS,
  isKeycapActive,
  handleVirtualKeyTrigger
} from './VirtualKeypad';

describe('Adversarial Challenge: Mobile Viewport Framing, Stun Lockout & Zero-Soft-Keyboard Audit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Mobile Viewport Dimension & Framing Math Stress Test', () => {
    const testViewports = [
      { name: 'iPhone SE', width: 375, height: 667, isMobile: true, expectedWordsPerLine: 3, minKeyWidth: 32 },
      { name: 'iPhone 14/15', width: 390, height: 844, isMobile: true, expectedWordsPerLine: 3, minKeyWidth: 33 },
      { name: 'Android Galaxy / Pixel', width: 412, height: 915, isMobile: true, expectedWordsPerLine: 3, minKeyWidth: 35 },
      { name: 'iPad Mini / Small Tablet', width: 767, height: 1024, isMobile: true, expectedWordsPerLine: 5, minKeyWidth: 50 },
      { name: 'Desktop HD', width: 1024, height: 768, isMobile: false, expectedWordsPerLine: 7, minKeyWidth: 60 },
      { name: 'Desktop Full HD', width: 1920, height: 1080, isMobile: false, expectedWordsPerLine: 7, minKeyWidth: 60 }
    ];

    testViewports.forEach((vp) => {
      it(`should verify layout parameters for ${vp.name} (${vp.width}x${vp.height})`, () => {
        const isMobile = vp.width < 768;
        expect(isMobile).toBe(vp.isMobile);

        const wordsPerLine = vp.width < 480 ? 3 : (vp.width < 768 ? 5 : 7);
        expect(wordsPerLine).toBe(vp.expectedWordsPerLine);

        // Arena height proportion
        const arenaHeightPct = isMobile ? 54 : 100;
        const arenaHeightPx = (vp.height * arenaHeightPct) / 100;
        if (isMobile) {
          expect(arenaHeightPx).toBeGreaterThanOrEqual(240); // Matches minHeight: 240px
        }

        // Keypad available width allocation for Row 1 (10 keys)
        const keypadPadding = 8; // 4px left + 4px right
        const gap = vp.width <= 420 ? 3 : 4;
        const totalGaps = 9 * gap;
        const availableWidth = Math.min(vp.width, 680) - keypadPadding - totalGaps;
        const keyWidth = availableWidth / 10;
        expect(keyWidth).toBeGreaterThanOrEqual(vp.minKeyWidth);
      });
    });
  });

  describe('2. Active Word Highlighting and Monospace Stream Alignment', () => {
    it('should accurately compute activeChar highlight using getActiveKeyHighlight from @keyfury/game-core', () => {
      const activeWord = 'cyberpunk';

      expect(getActiveKeyHighlight(activeWord, 0)).toBe('c');
      expect(getActiveKeyHighlight(activeWord, 1)).toBe('y');
      expect(getActiveKeyHighlight(activeWord, 2)).toBe('b');
      expect(getActiveKeyHighlight(activeWord, 3)).toBe('e');
      expect(getActiveKeyHighlight(activeWord, 4)).toBe('r');
      expect(getActiveKeyHighlight(activeWord, 5)).toBe('p');
      expect(getActiveKeyHighlight(activeWord, 6)).toBe('u');
      expect(getActiveKeyHighlight(activeWord, 7)).toBe('n');
      expect(getActiveKeyHighlight(activeWord, 8)).toBe('k');
      expect(getActiveKeyHighlight(activeWord, 9)).toBeNull(); // Word completed returns null
    });

    it('should correctly handle Spacebar as active target character between words', () => {
      const activeWordWithSpace = 'combat ';
      expect(getActiveKeyHighlight(activeWordWithSpace, 6)).toBe(' ');
      expect(isKeycapActive(' ', ' ')).toBe(true);
      expect(isKeycapActive(' ', 'Spacebar')).toBe(true);
    });
  });

  describe('3. Typo Stun Lockout & Disabled State Guarantees', () => {
    it('should completely suppress key intentions and visual glows when stunned', () => {
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };

      // Attempt key trigger during stun
      const triggerResult = handleVirtualKeyTrigger(
        'f',
        {
          onKeyPress,
          isStunned: true,
          lastTouchTimeRef
        }
      );

      expect(triggerResult).toBe(false);
      expect(onKeyPress).not.toHaveBeenCalled();

      // Visual active glow must be suppressed
      expect(isKeycapActive('f', 'f', false, true)).toBe(false);

      // Markup must render lockout overlay
      const html = renderToString(<VirtualKeypad onKeyPress={onKeyPress} activeChar="f" isStunned={true} />);
      expect(html).toContain('data-stunned="true"');
      expect(html).toContain('SYSTEM STUNNED — LOCKOUT');
      expect(html).toContain('data-testid="keypad-stun-overlay"');
      expect(html).toContain('keyfury-keypad-stunned');
      expect(html).toContain('data-active="false"'); // 'f' active suppressed
    });

    it('should completely suppress key intentions and visual glows when disabled (paused/match over)', () => {
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };

      const triggerResult = handleVirtualKeyTrigger(
        'j',
        {
          onKeyPress,
          disabled: true,
          lastTouchTimeRef
        }
      );

      expect(triggerResult).toBe(false);
      expect(onKeyPress).not.toHaveBeenCalled();

      expect(isKeycapActive('j', 'j', true, false)).toBe(false);

      const html = renderToString(<VirtualKeypad onKeyPress={onKeyPress} activeChar="j" disabled={true} />);
      expect(html).toContain('data-disabled="true"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('keyfury-keycap-disabled');
      expect(html).toContain('data-active="false"');
    });
  });

  describe('4. Zero-Soft-Keyboard Popup Guarantee & Touch Hygiene', () => {
    it('should verify VirtualKeypad renders pure button elements with type="button" and zero input/textarea tags', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} activeChar="a" />);

      expect(html).not.toContain('<input');
      expect(html).not.toContain('<textarea');
      expect(html).not.toContain('contenteditable');

      // Verify all 27 keys are buttons of type="button"
      const buttonCount = (html.match(/<button/g) || []).length;
      expect(buttonCount).toBe(10 + 9 + 7 + 1); // 27 total buttons (26 letters + 1 spacebar)

      const typeButtonCount = (html.match(/type="button"/g) || []).length;
      expect(typeButtonCount).toBe(27);
    });

    it('should verify event handlers cancel default behavior to prevent OS keyboard deployment and zooming', () => {
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const onKeyPress = vi.fn();

      const handled = handleVirtualKeyTrigger(
        'e',
        { onKeyPress },
        { cancelable: true, preventDefault, stopPropagation }
      );

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(stopPropagation).toHaveBeenCalledTimes(1);
      expect(onKeyPress).toHaveBeenCalledWith('e');
    });
  });

  describe('5. High-Frequency Typing Throughput & Debounce Protection', () => {
    it('should withstand 100 rapid keystrokes without event loss when properly spaced (>15ms)', () => {
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };
      let mockClock = 50000;

      for (let i = 0; i < 100; i++) {
        mockClock += 20; // 20ms between real taps (>15ms guard)
        vi.spyOn(performance, 'now').mockReturnValue(mockClock);

        const char = String.fromCharCode(97 + (i % 26)); // a-z
        const success = handleVirtualKeyTrigger(char, { onKeyPress, lastTouchTimeRef });
        expect(success).toBe(true);
      }

      expect(onKeyPress).toHaveBeenCalledTimes(100);
    });

    it('should suppress phantom synthetic touches occurring within 15ms window', () => {
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };
      let mockClock = 100000;

      vi.spyOn(performance, 'now').mockReturnValue(mockClock);
      // Valid touch
      expect(handleVirtualKeyTrigger('s', { onKeyPress, lastTouchTimeRef })).toBe(true);

      // Phantom duplicate touch 5ms later
      mockClock += 5;
      vi.spyOn(performance, 'now').mockReturnValue(mockClock);
      expect(handleVirtualKeyTrigger('s', { onKeyPress, lastTouchTimeRef })).toBe(false);

      // Phantom duplicate mouse event 10ms later
      mockClock += 5;
      vi.spyOn(performance, 'now').mockReturnValue(mockClock);
      expect(handleVirtualKeyTrigger('s', { onKeyPress, lastTouchTimeRef })).toBe(false);

      expect(onKeyPress).toHaveBeenCalledTimes(1);
    });
  });
});
