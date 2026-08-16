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

describe('Milestone 2: Cyberpunk Virtual Touch Keypad Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Virtual Keypad QWERTY Layout & Keycap Rendering', () => {
    it('should render the complete 4-row QWERTY keyboard structure', () => {
      const onKeyPress = vi.fn();
      const html = renderToString(<VirtualKeypad onKeyPress={onKeyPress} />);

      // Verify container and testids
      expect(html).toContain('data-testid="virtual-keypad"');
      expect(html).toContain('data-testid="key-row-1"');
      expect(html).toContain('data-testid="key-row-2"');
      expect(html).toContain('data-testid="key-row-3"');
      expect(html).toContain('data-testid="key-row-4"');
    });

    it('should render all 10 keycaps in Row 1 (Q, W, E, R, T, Y, U, I, O, P)', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} />);

      ROW_1_KEYS.forEach((char) => {
        expect(html).toContain(`data-key="${char}"`);
        expect(html).toContain(`Key ${char.toUpperCase()}`);
      });
    });

    it('should render all 9 keycaps in Row 2 (A, S, D, F, G, H, J, K, L)', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} />);

      ROW_2_KEYS.forEach((char) => {
        expect(html).toContain(`data-key="${char}"`);
        expect(html).toContain(`Key ${char.toUpperCase()}`);
      });
    });

    it('should render all 7 keycaps in Row 3 (Z, X, C, V, B, N, M)', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} />);

      ROW_3_KEYS.forEach((char) => {
        expect(html).toContain(`data-key="${char}"`);
        expect(html).toContain(`Key ${char.toUpperCase()}`);
      });
    });

    it('should render the wide Spacebar keycap in Row 4', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} />);

      expect(html).toContain('data-key=" "');
      expect(html).toContain('SPACEBAR');
      expect(html).toContain('aria-label="Spacebar"');
    });
  });

  describe('2. Active Target Character Highlighting (Cyan Neon Pulse)', () => {
    it('should calculate active key state using isKeycapActive', () => {
      expect(isKeycapActive('k', 'k')).toBe(true);
      expect(isKeycapActive('k', 'K')).toBe(true);
      expect(isKeycapActive('K', 'k')).toBe(true);
      expect(isKeycapActive('j', 'k')).toBe(false);
      expect(isKeycapActive(' ', ' ')).toBe(true);
      expect(isKeycapActive(' ', 'Spacebar')).toBe(true);
      expect(isKeycapActive('a', undefined)).toBe(false);
      expect(isKeycapActive('a', 'a', true, false)).toBe(false); // disabled
      expect(isKeycapActive('a', 'a', false, true)).toBe(false); // stunned
    });

    it('should highlight the matching keycap in rendered markup when activeChar is provided', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} activeChar="k" />);

      expect(html).toMatch(/data-key="k"[^>]*data-active="true"/);
      expect(html).toMatch(/data-key="k"[^>]*keyfury-keycap-active/);
      expect(html).toMatch(/data-key="j"[^>]*data-active="false"/);
    });

    it('should perform case-insensitive matching for uppercase activeChar', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} activeChar="R" />);

      expect(html).toMatch(/data-key="r"[^>]*data-active="true"/);
      expect(html).toMatch(/data-key="r"[^>]*keyfury-keycap-active/);
    });

    it('should highlight Spacebar when activeChar is a space character', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} activeChar=" " />);

      expect(html).toMatch(/data-key=" "[^>]*data-active="true"/);
      expect(html).toMatch(/data-key=" "[^>]*keyfury-keycap-active/);
    });

    it('should highlight Spacebar when activeChar is "Spacebar"', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} activeChar="Spacebar" />);

      expect(html).toMatch(/data-key=" "[^>]*data-active="true"/);
      expect(html).toMatch(/data-key=" "[^>]*keyfury-keycap-active/);
    });

    it('should suppress active highlighting when keypad is disabled', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} activeChar="a" disabled={true} />);

      expect(html).toMatch(/data-key="a"[^>]*data-active="false"/);
    });

    it('should suppress active highlighting when keypad is stunned', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} activeChar="a" isStunned={true} />);

      expect(html).toMatch(/data-key="a"[^>]*data-active="false"/);
    });
  });

  describe('3. Disabled and Typo Stun Lockout States', () => {
    it('should render disabled attributes and classes when disabled=true', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} disabled={true} />);

      expect(html).toContain('data-disabled="true"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('keyfury-keycap-disabled');
    });

    it('should render lockout banner and stunned classes when isStunned=true', () => {
      const html = renderToString(<VirtualKeypad onKeyPress={vi.fn()} isStunned={true} />);

      expect(html).toContain('data-stunned="true"');
      expect(html).toContain('keyfury-keypad-stunned');
      expect(html).toContain('data-testid="keypad-stun-overlay"');
      expect(html).toContain('SYSTEM STUNNED — LOCKOUT');
    });
  });

  describe('4. Zero-Latency Pointer Events & Sound Synth Dispatches', () => {
    it('should trigger soundSynth.playMechanicalClick and preventDefault on key trigger', () => {
      const playClickSpy = vi.spyOn(soundSynth, 'playMechanicalClick').mockImplementation(() => {});
      const onKeyPress = vi.fn();
      const soundCallback = vi.fn();
      const preventDefault = vi.fn();
      const stopPropagation = vi.fn();

      const lastTouchTimeRef = { current: 0 };
      const handled = handleVirtualKeyTrigger(
        'q',
        {
          onKeyPress,
          onSoundEffect: soundCallback,
          lastTouchTimeRef
        },
        {
          cancelable: true,
          preventDefault,
          stopPropagation
        }
      );

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
      expect(onKeyPress).toHaveBeenCalledWith('q');
      expect(playClickSpy).toHaveBeenCalledWith(false);
      expect(soundCallback).toHaveBeenCalledWith(false);
    });

    it('should pass isSpace=true to soundSynth when Spacebar is touched', () => {
      const playClickSpy = vi.spyOn(soundSynth, 'playMechanicalClick').mockImplementation(() => {});
      const onKeyPress = vi.fn();
      const soundCallback = vi.fn();
      const preventDefault = vi.fn();

      const lastTouchTimeRef = { current: 0 };
      const handled = handleVirtualKeyTrigger(
        ' ',
        {
          onKeyPress,
          onSoundEffect: soundCallback,
          lastTouchTimeRef
        },
        {
          cancelable: true,
          preventDefault
        }
      );

      expect(handled).toBe(true);
      expect(preventDefault).toHaveBeenCalled();
      expect(onKeyPress).toHaveBeenCalledWith(' ');
      expect(playClickSpy).toHaveBeenCalledWith(true);
      expect(soundCallback).toHaveBeenCalledWith(true);
    });

    it('should NOT dispatch onKeyPress when disabled=true', () => {
      const playClickSpy = vi.spyOn(soundSynth, 'playMechanicalClick').mockImplementation(() => {});
      const onKeyPress = vi.fn();

      const handled = handleVirtualKeyTrigger(
        'q',
        {
          onKeyPress,
          disabled: true
        }
      );

      expect(handled).toBe(false);
      expect(onKeyPress).not.toHaveBeenCalled();
      expect(playClickSpy).not.toHaveBeenCalled();
    });

    it('should NOT dispatch onKeyPress when isStunned=true', () => {
      const playClickSpy = vi.spyOn(soundSynth, 'playMechanicalClick').mockImplementation(() => {});
      const onKeyPress = vi.fn();

      const handled = handleVirtualKeyTrigger(
        'q',
        {
          onKeyPress,
          isStunned: true
        }
      );

      expect(handled).toBe(false);
      expect(onKeyPress).not.toHaveBeenCalled();
      expect(playClickSpy).not.toHaveBeenCalled();
    });

    it('should deduplicate rapid triggers within 15ms', () => {
      const playClickSpy = vi.spyOn(soundSynth, 'playMechanicalClick').mockImplementation(() => {});
      const onKeyPress = vi.fn();
      const lastTouchTimeRef = { current: 0 };

      // First trigger
      const first = handleVirtualKeyTrigger('w', { onKeyPress, lastTouchTimeRef });
      expect(first).toBe(true);
      expect(onKeyPress).toHaveBeenCalledTimes(1);

      // Second trigger at exact same millisecond (duplicate pointerdown + touchstart)
      const second = handleVirtualKeyTrigger('w', { onKeyPress, lastTouchTimeRef });
      expect(second).toBe(false);
      expect(onKeyPress).toHaveBeenCalledTimes(1);
    });
  });
});
