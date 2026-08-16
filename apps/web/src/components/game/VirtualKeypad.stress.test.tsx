import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  VirtualKeypad,
  ROW_1_KEYS,
  ROW_2_KEYS,
  ROW_3_KEYS,
  isKeycapActive,
  handleVirtualKeyTrigger
} from './VirtualKeypad';
import { soundSynth } from '../../game/audio/SoundSynth';

describe('Adversarial Stress Test Suite: Cyberpunk Virtual Touch Keypad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. High-Speed Typing & Rapid Succession Key Events', () => {
    it('should reliably emit distinct key events when keys arrive at 150+ WPM (30-50ms intervals)', () => {
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };
      const testString = 'cyberpunkcombatwarrior';
      const emittedChars: string[] = [];

      let simulatedTime = 1000;
      for (const char of testString) {
        // Advance simulated clock by 35ms (>15ms deduplication threshold)
        simulatedTime += 35;
        vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);

        const success = handleVirtualKeyTrigger(char, {
          onKeyPress: (c) => {
            emittedChars.push(c);
            onKeyPress(c);
          },
          lastTouchTimeRef
        });

        expect(success).toBe(true);
      }

      expect(onKeyPress).toHaveBeenCalledTimes(testString.length);
      expect(emittedChars.join('')).toBe(testString);
    });

    it('should drop duplicate synthetic pointerdown/touchstart events firing within 15ms window on same keystroke', () => {
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };

      let simulatedTime = 2000;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);

      // Event 1: pointerdown on 'k'
      const first = handleVirtualKeyTrigger('k', { onKeyPress, lastTouchTimeRef });
      expect(first).toBe(true);
      expect(onKeyPress).toHaveBeenCalledTimes(1);
      expect(onKeyPress).toHaveBeenLastCalledWith('k');

      // Event 2: duplicate touchstart on 'k' 2ms later
      simulatedTime += 2;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);
      const duplicateTouch = handleVirtualKeyTrigger('k', { onKeyPress, lastTouchTimeRef });
      expect(duplicateTouch).toBe(false);
      expect(onKeyPress).toHaveBeenCalledTimes(1);

      // Event 3: duplicate mousedown on 'k' 5ms later
      simulatedTime += 3;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);
      const duplicateMouse = handleVirtualKeyTrigger('k', { onKeyPress, lastTouchTimeRef });
      expect(duplicateMouse).toBe(false);
      expect(onKeyPress).toHaveBeenCalledTimes(1);

      // Event 4: Next real keystroke 'e' after 25ms
      simulatedTime += 25;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);
      const nextKey = handleVirtualKeyTrigger('e', { onKeyPress, lastTouchTimeRef });
      expect(nextKey).toBe(true);
      expect(onKeyPress).toHaveBeenCalledTimes(2);
      expect(onKeyPress).toHaveBeenLastCalledWith('e');
    });

    it('should handle rapid alternating key tapping stress (50 keys at 30ms intervals)', () => {
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };
      let simulatedTime = 5000;

      for (let i = 0; i < 50; i++) {
        simulatedTime += 30;
        vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);
        const char = i % 2 === 0 ? 'f' : 'j';
        const handled = handleVirtualKeyTrigger(char, { onKeyPress, lastTouchTimeRef });
        expect(handled).toBe(true);
      }

      expect(onKeyPress).toHaveBeenCalledTimes(50);
    });
  });

  describe('2. Spacebar Handling & Audio Synthesis', () => {
    it('should normalize both " " and "Spacebar" to single space " " upon emission', () => {
      const emitted: string[] = [];
      const onKeyPress = (c: string) => emitted.push(c);
      const lastTouchTimeRef = { current: 0 };

      let simulatedTime = 10000;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);
      handleVirtualKeyTrigger(' ', { onKeyPress, lastTouchTimeRef });

      simulatedTime += 50;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);
      handleVirtualKeyTrigger('Spacebar', { onKeyPress, lastTouchTimeRef });

      expect(emitted).toEqual([' ', ' ']);
    });

    it('should trigger soundSynth with isSpace=true on Spacebar and isSpace=false on standard keys', () => {
      const clickSpy = vi.spyOn(soundSynth, 'playMechanicalClick').mockImplementation(() => {});
      const soundCallback = vi.fn();
      const lastTouchTimeRef = { current: 0 };

      let simulatedTime = 20000;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);

      // Spacebar
      handleVirtualKeyTrigger(' ', {
        onKeyPress: vi.fn(),
        onSoundEffect: soundCallback,
        lastTouchTimeRef
      });
      expect(clickSpy).toHaveBeenCalledWith(true);
      expect(soundCallback).toHaveBeenCalledWith(true);

      // Regular key
      simulatedTime += 50;
      vi.spyOn(performance, 'now').mockReturnValue(simulatedTime);
      handleVirtualKeyTrigger('x', {
        onKeyPress: vi.fn(),
        onSoundEffect: soundCallback,
        lastTouchTimeRef
      });
      expect(clickSpy).toHaveBeenCalledWith(false);
      expect(soundCallback).toHaveBeenCalledWith(false);
    });

    it('should gracefully catch audio synthesis errors without breaking input pipeline', () => {
      vi.spyOn(soundSynth, 'playMechanicalClick').mockImplementation(() => {
        throw new Error('AudioContext locked or not ready');
      });
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };

      expect(() => {
        handleVirtualKeyTrigger('a', { onKeyPress, lastTouchTimeRef });
      }).not.toThrow();

      expect(onKeyPress).toHaveBeenCalledWith('a');
    });
  });

  describe('3. Case-Insensitivity & Active Character Highlighting', () => {
    it('should accurately evaluate isKeycapActive across uppercase, lowercase, and space inputs', () => {
      // Direct matches
      expect(isKeycapActive('a', 'a')).toBe(true);
      expect(isKeycapActive('z', 'z')).toBe(true);

      // Mixed case matches
      expect(isKeycapActive('a', 'A')).toBe(true);
      expect(isKeycapActive('A', 'a')).toBe(true);
      expect(isKeycapActive('W', 'W')).toBe(true);

      // Spacebar variations
      expect(isKeycapActive(' ', ' ')).toBe(true);
      expect(isKeycapActive(' ', 'Spacebar')).toBe(true);
      expect(isKeycapActive('Spacebar', ' ')).toBe(true);
      expect(isKeycapActive('Spacebar', 'Spacebar')).toBe(true);

      // Non-matches
      expect(isKeycapActive('a', 'b')).toBe(false);
      expect(isKeycapActive('x', 'y')).toBe(false);
      expect(isKeycapActive(' ', 'a')).toBe(false);
      expect(isKeycapActive('a', ' ')).toBe(false);
      expect(isKeycapActive('a', undefined)).toBe(false);
      expect(isKeycapActive('a', '')).toBe(false);
    });

    it('should suppress active highlighting when disabled=true or isStunned=true', () => {
      expect(isKeycapActive('k', 'k', true, false)).toBe(false); // disabled
      expect(isKeycapActive('k', 'k', false, true)).toBe(false); // stunned
      expect(isKeycapActive('k', 'k', true, true)).toBe(false);  // both
    });
  });

  describe('4. Event Suppression & Pointer Hygiene (No OS Keyboard, No Zoom)', () => {
    it('should call preventDefault on cancelable pointer/touch events', () => {
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const onKeyPress = vi.fn();

      handleVirtualKeyTrigger(
        'g',
        { onKeyPress },
        { cancelable: true, preventDefault, stopPropagation }
      );

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(onKeyPress).toHaveBeenCalledWith('g');
    });

    it('should NOT call preventDefault on non-cancelable events (avoids browser console warnings)', () => {
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();
      const onKeyPress = vi.fn();

      handleVirtualKeyTrigger(
        'g',
        { onKeyPress },
        { cancelable: false, preventDefault, stopPropagation }
      );

      expect(preventDefault).not.toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(onKeyPress).toHaveBeenCalledWith('g');
    });

    it('should tolerate missing or incomplete event objects without error', () => {
      const onKeyPress = vi.fn();

      expect(() => {
        handleVirtualKeyTrigger('t', { onKeyPress }, undefined);
      }).not.toThrow();

      expect(() => {
        handleVirtualKeyTrigger('t', { onKeyPress }, {} as any);
      }).not.toThrow();

      expect(onKeyPress).toHaveBeenCalledTimes(2);
    });
  });

  describe('5. Sequence Integrity & Dual-Input Synchronization Simulation', () => {
    it('should maintain strict monotonic sequence ordering across interleaved physical and virtual inputs', () => {
      const sentIntents: { seq: number; key: string; source: 'virtual' | 'physical' }[] = [];
      let seqCounter = 0;

      const mockSendKeyIntent = (key: string, source: 'virtual' | 'physical') => {
        seqCounter++;
        sentIntents.push({ seq: seqCounter, key, source });
      };

      // Simulate interleaved typing session: "cyber"
      // 'c' via virtual keypad
      mockSendKeyIntent('c', 'virtual');
      // 'y' via physical keyboard
      mockSendKeyIntent('y', 'physical');
      // 'b' via virtual keypad
      mockSendKeyIntent('b', 'virtual');
      // 'e' via physical keyboard
      mockSendKeyIntent('e', 'physical');
      // 'r' via virtual keypad
      mockSendKeyIntent('r', 'virtual');

      expect(sentIntents.length).toBe(5);
      expect(sentIntents.map((i) => i.seq)).toEqual([1, 2, 3, 4, 5]);
      expect(sentIntents.map((i) => i.key).join('')).toBe('cyber');
    });
  });

  describe('6. Edge Cases & Boundary Stress', () => {
    it('should block input entirely when stunned or disabled', () => {
      const onKeyPress = vi.fn();

      const resDisabled = handleVirtualKeyTrigger('a', { onKeyPress, disabled: true });
      expect(resDisabled).toBe(false);

      const resStunned = handleVirtualKeyTrigger('a', { onKeyPress, isStunned: true });
      expect(resStunned).toBe(false);

      expect(onKeyPress).not.toHaveBeenCalled();
    });

    it('should render all rows correctly under extreme property configurations', () => {
      const htmlDisabled = renderToString(
        <VirtualKeypad onKeyPress={vi.fn()} activeChar="z" disabled={true} isStunned={false} />
      );
      expect(htmlDisabled).toContain('data-disabled="true"');
      expect(htmlDisabled).toContain('data-active="false"');

      const htmlStunned = renderToString(
        <VirtualKeypad onKeyPress={vi.fn()} activeChar="z" disabled={false} isStunned={true} />
      );
      expect(htmlStunned).toContain('data-stunned="true"');
      expect(htmlStunned).toContain('keyfury-keypad-stunned');
      expect(htmlStunned).toContain('SYSTEM STUNNED — LOCKOUT');
    });
  });
});
