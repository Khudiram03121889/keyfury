import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MatchPageInputProcessor } from './soft_keyboard_input_stress.test';

describe('Challenger Empirical Stress Test: shouldProcessInput & Soft Keyboard Deduplication', () => {
  let processor: MatchPageInputProcessor;

  beforeEach(() => {
    processor = new MatchPageInputProcessor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('1. Edge-Case Characters & Symbol Handling', () => {
    it('should correctly process all printable ASCII symbols', () => {
      const symbols = "!@#$%^&*()_+-=[]{}|;:'\",.<>/?~`";
      for (const char of symbols) {
        const processed = processor.shouldProcessInput(char);
        expect(processed).toBe(true);
        processor.handleKeyPress(char);
      }

      expect(processor.sentIntents).toHaveLength(symbols.length);
      const resultKeys = processor.sentIntents.map(i => i.key).join('');
      expect(resultKeys).toBe(symbols);
    });

    it('should normalize and process spaces (" " and "Spacebar")', () => {
      expect(processor.shouldProcessInput(' ')).toBe(true);
      processor.handleKeyPress(' ');

      // Advance time by 60ms for second space tap
      vi.advanceTimersByTime(60);

      expect(processor.shouldProcessInput(' ')).toBe(true);
      processor.handleKeyPress('Spacebar');

      expect(processor.sentIntents).toHaveLength(2);
      expect(processor.sentIntents[0].key).toBe(' ');
      expect(processor.sentIntents[1].key).toBe(' ');
    });

    it('should reject empty or whitespace-only nullish inputs in shouldProcessInput', () => {
      expect(processor.shouldProcessInput('')).toBe(false);
      expect(processor.shouldProcessInput(null as any)).toBe(false);
      expect(processor.shouldProcessInput(undefined as any)).toBe(false);
      expect(processor.sentIntents).toHaveLength(0);
    });

    it('should handle multi-character pasted text in processInputText', () => {
      const pasteData = 'keyfury123!';
      if (processor.shouldProcessInput(pasteData)) {
        processor.processInputText(pasteData);
      }
      expect(processor.sentIntents).toHaveLength(pasteData.length);
      expect(processor.sentIntents.map(i => i.key).join('')).toBe(pasteData);
    });
  });

  describe('2. Backspace, Delete, and Non-Printable Controls', () => {
    it('should not emit intents for Backspace, Delete, Enter, Escape, or Tab keys', () => {
      const controlKeys = ['Backspace', 'Delete', 'Enter', 'Escape', 'Tab', 'Shift', 'Control', 'Alt'];
      for (const key of controlKeys) {
        processor.handleCombatKey({ key, preventDefault: vi.fn() });
      }
      expect(processor.sentIntents).toHaveLength(0);
    });

    it('should safely handle Gboard backspace (nativeEvent.data is null/empty)', () => {
      const preventDefaultBeforeInput = vi.fn();
      // Gboard backspace event: beforeinput with data: null, target value: ''
      processor.handleBeforeInput({
        nativeEvent: { data: undefined },
        preventDefault: preventDefaultBeforeInput
      });

      processor.handleInputEvent({
        target: { value: '' },
        nativeEvent: { data: undefined }
      });

      expect(processor.sentIntents).toHaveLength(0);
      expect(preventDefaultBeforeInput).not.toHaveBeenCalled();
    });
  });

  describe('3. Rapid IME Event Sequences & Soft Keyboard Triple-Trigger Prevention', () => {
    it('should handle mobile input event for single tap', () => {
      const charTap = 'm';

      // 1. input event
      processor.handleInputEvent({
        target: { value: charTap },
        nativeEvent: { data: charTap }
      });

      expect(processor.sentIntents).toHaveLength(1);
      expect(processor.sentIntents[0].key).toBe(charTap);
    });

    it('should handle Gboard composition stream without duplicate intents', () => {
      // Gboard composition: beforeinput('a') -> input('a') -> beforeinput('b') -> input('b')
      processor.handleBeforeInput({ nativeEvent: { data: 'a' }, preventDefault: vi.fn() });
      processor.handleInputEvent({ target: { value: 'a' }, nativeEvent: { data: 'a' } });

      processor.handleBeforeInput({ nativeEvent: { data: 'b' }, preventDefault: vi.fn() });
      processor.handleInputEvent({ target: { value: 'b' }, nativeEvent: { data: 'b' } });

      expect(processor.sentIntents).toHaveLength(2);
      expect(processor.sentIntents.map(i => i.key).join('')).toBe('ab');
    });
  });

  describe('4. High-Speed Rapid Tap Sequences & Consecutive Keystrokes', () => {
    it('should NOT throttle rapid typing of DIFFERENT consecutive characters even within 5ms', () => {
      const fastWord = 'quickfight';
      for (const char of fastWord) {
        const allowed = processor.shouldProcessInput(char);
        expect(allowed).toBe(true);
        processor.processInputText(char);
      }

      expect(processor.sentIntents).toHaveLength(fastWord.length);
      expect(processor.sentIntents.map(i => i.key).join('')).toBe(fastWord);
    });

    it('should allow fast consecutive character taps without throttling', () => {
      const char = 'z';

      // First tap at t=0
      expect(processor.shouldProcessInput(char)).toBe(true);
      processor.processInputText(char);

      // Fast second tap 5ms later
      vi.advanceTimersByTime(5);
      expect(processor.shouldProcessInput(char)).toBe(true);
      processor.processInputText(char);

      expect(processor.sentIntents).toHaveLength(2);
      expect(processor.sentIntents[0].key).toBe('z');
      expect(processor.sentIntents[1].key).toBe('z');
    });

    it('should handle rapid interleaved typing stream (200 chars burst)', () => {
      const burst = 'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(5);
      for (const char of burst) {
        if (processor.shouldProcessInput(char)) {
          processor.processInputText(char);
        }
      }
      expect(processor.sentIntents).toHaveLength(burst.length);
    });
  });
});
