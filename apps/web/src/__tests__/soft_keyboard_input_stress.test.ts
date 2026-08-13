import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * MatchPage Soft Keyboard Input Processor logic extracted directly from MatchPage.tsx for empirical stress testing.
 */
export class MatchPageInputProcessor {
  public keySeq = 0;
  public sentIntents: { seq: number; key: string; clientTimeMs: number }[] = [];
  public isMatchInProgress = true;
  public isPaused = false;
  public showStatsOverlay = false;
  public isMatchEnded = false;
  public inputValue = '';
  public lastProcessedData = '';
  public lastProcessedTime = 0;

  public setMatchInProgress(v: boolean) { this.isMatchInProgress = v; }
  public setPaused(v: boolean) { this.isPaused = v; }
  public setStatsOverlay(v: boolean) { this.showStatsOverlay = v; }

  public reset() {
    this.keySeq = 0;
    this.sentIntents = [];
    this.isMatchInProgress = true;
    this.isPaused = false;
    this.showStatsOverlay = false;
    this.isMatchEnded = false;
    this.inputValue = '';
    this.lastProcessedData = '';
    this.lastProcessedTime = 0;
  }

  public shouldProcessInput = (data: string): boolean => {
    if (!data) return false;
    return true;
  };

  public handleKeyPress = (char: string) => {
    if (this.showStatsOverlay || this.isMatchEnded || this.isPaused) return;
    if (!this.isMatchInProgress) return;

    let keyChar = char;
    if (keyChar === 'Spacebar' || keyChar === ' ') {
      keyChar = ' ';
    }
    if (keyChar.length !== 1 || !/^[ -~]$/.test(keyChar)) return;

    this.keySeq++;
    this.sentIntents.push({
      seq: this.keySeq,
      key: keyChar,
      clientTimeMs: Date.now()
    });
  };

  public lastInputValue = '';

  public syncAndResetInput = () => {
    this.lastInputValue = '';
    this.inputValue = '';
  };

  public handleInputDOMEvent = (e: { target: { value: string } }) => {
    const newVal = e.target.value || '';
    const oldVal = this.lastInputValue;

    if (newVal === oldVal) return;

    if (newVal.startsWith(oldVal)) {
      const addedText = newVal.slice(oldVal.length);
      this.lastInputValue = newVal;
      if (addedText) {
        for (const char of addedText) {
          this.handleKeyPress(char);
        }
      }
    } else {
      this.lastInputValue = newVal;
      if (newVal) {
        for (const char of newVal) {
          this.handleKeyPress(char);
        }
      }
    }
  };

  public processInputText = (text: string) => {
    this.handleInputDOMEvent({ target: { value: (this.lastInputValue || '') + text } });
  };

  public handleInputChange = (e: { target: { value: string } }) => {
    this.handleInputDOMEvent(e);
  };

  public handleInputEvent = (e: { target: { value: string }; nativeEvent?: { data?: string } }) => {
    this.handleInputDOMEvent(e);
  };

  public handleBeforeInput = (_e: any) => {
    // No-op for Android Gboard IME compatibility: beforeinput preventDefault is removed
  };

  public handleCombatKey = (event: {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    keyfuryHandled?: boolean;
    preventDefault: () => void;
  }) => {
    if (this.showStatsOverlay || this.isMatchEnded) {
      if (event.key === 'Enter') {
        event.preventDefault();
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      return;
    }

    if (this.isPaused) return;

    if (event.key === 'Unidentified' || event.key === '229') return;

    if (!this.isMatchInProgress) return;

    const combatEvent = event;
    if (combatEvent.keyfuryHandled) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    combatEvent.keyfuryHandled = true;

    if (event.key.length > 1 && event.key !== 'Spacebar' && event.key !== ' ') return;

    let char = event.key;
    if (char === 'Spacebar' || char === ' ') {
      char = ' ';
    }

    if (char.length !== 1 || !/^[ -~]$/.test(char)) return;

    event.preventDefault();
    this.handleKeyPress(char);
  };
}

describe('MatchPage Soft Keyboard Input Handler Empirical Stress Test Suite', () => {
  let processor: MatchPageInputProcessor;

  beforeEach(() => {
    processor = new MatchPageInputProcessor();
  });

  describe('1. Desktop Keystrokes & Event Handled Flag', () => {
    it('should handle standard single keypress (e.g. "a")', () => {
      const preventDefault = vi.fn();
      processor.handleCombatKey({ key: 'a', preventDefault });

      expect(preventDefault).toHaveBeenCalled();
      expect(processor.sentIntents).toHaveLength(1);
      expect(processor.sentIntents[0]).toEqual({
        seq: 1,
        key: 'a',
        clientTimeMs: expect.any(Number)
      });
    });

    it('should ignore duplicated keydown events via keyfuryHandled flag', () => {
      const preventDefault = vi.fn();
      const event = { key: 'b', preventDefault };

      processor.handleCombatKey(event);
      processor.handleCombatKey(event); // Second call with same event object

      expect(processor.sentIntents).toHaveLength(1);
      expect(processor.sentIntents[0].key).toBe('b');
    });

    it('should ignore shortcut key combinations (Ctrl, Alt, Meta)', () => {
      const preventDefault = vi.fn();

      processor.handleCombatKey({ key: 'r', ctrlKey: true, preventDefault });
      processor.handleCombatKey({ key: 'c', metaKey: true, preventDefault });
      processor.handleCombatKey({ key: 'a', altKey: true, preventDefault });

      expect(processor.sentIntents).toHaveLength(0);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('2. Spacebars & Edge Case Characters', () => {
    it('should handle spacebar character " " and legacy "Spacebar"', () => {
      const preventDefault1 = vi.fn();
      const preventDefault2 = vi.fn();

      processor.handleCombatKey({ key: ' ', preventDefault: preventDefault1 });
      processor.handleCombatKey({ key: 'Spacebar', preventDefault: preventDefault2 });

      expect(processor.sentIntents).toHaveLength(2);
      expect(processor.sentIntents[0].key).toBe(' ');
      expect(processor.sentIntents[1].key).toBe(' ');
    });

    it('should handle printable ASCII special symbols (!@#$%^&*()_+-=[]{}|;:\'",.<>/?~`)', () => {
      const symbols = "!@#$%^&*()_+-=[]{}|;:'\",.<>/?~`";
      for (const char of symbols) {
        const preventDefault = vi.fn();
        processor.handleCombatKey({ key: char, preventDefault });
      }

      expect(processor.sentIntents).toHaveLength(symbols.length);
      const sentKeys = processor.sentIntents.map(i => i.key).join('');
      expect(sentKeys).toBe(symbols);
    });

    it('should reject non-printable control keys (Shift, Control, Alt, CapsLock, Tab, ArrowLeft, F1-F12)', () => {
      const nonPrintable = ['Shift', 'Control', 'Alt', 'CapsLock', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'F1', 'F5', 'F12'];
      for (const key of nonPrintable) {
        const preventDefault = vi.fn();
        processor.handleCombatKey({ key, preventDefault });
      }

      expect(processor.sentIntents).toHaveLength(0);
    });

    it('should reject non-ASCII Unicode characters and Emojis', () => {
      const unicodeChars = ['🔥', 'ñ', 'é', 'こんにちは', '한'];
      for (const char of unicodeChars) {
        const preventDefault = vi.fn();
        processor.handleCombatKey({ key: char, preventDefault });
      }

      expect(processor.sentIntents).toHaveLength(0);
    });
  });

  describe('3. Backspace & Delete Key Handling', () => {
    it('should ignore Backspace keydown without error or crash', () => {
      const preventDefault = vi.fn();
      processor.handleCombatKey({ key: 'Backspace', preventDefault });

      expect(processor.sentIntents).toHaveLength(0);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should ignore Delete keydown without error or crash', () => {
      const preventDefault = vi.fn();
      processor.handleCombatKey({ key: 'Delete', preventDefault });

      expect(processor.sentIntents).toHaveLength(0);
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('4. Android Gboard / Soft Keyboard IME Sequences & Double-Trigger Detection', () => {
    it('should skip keydown when event.key is "Unidentified" or "229"', () => {
      const preventDefault = vi.fn();
      processor.handleCombatKey({ key: 'Unidentified', preventDefault });
      processor.handleCombatKey({ key: '229', preventDefault });

      expect(processor.sentIntents).toHaveLength(0);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('should test Gboard sequence: Unidentified keydown followed by input event', () => {
      const preventDefault = vi.fn();
      // 1. Android Gboard keydown: Unidentified
      processor.handleCombatKey({ key: 'Unidentified', preventDefault });
      expect(processor.sentIntents).toHaveLength(0);

      // 2. input event with data "k"
      processor.handleInputEvent({
        target: { value: 'k' },
        nativeEvent: { data: 'k' }
      });

      expect(processor.sentIntents).toHaveLength(1);
      expect(processor.sentIntents[0].key).toBe('k');
    });

    it('EMPIRICAL DISCOVERY: verifies if firing beforeinput AND input on same event causes duplicate key intents', () => {
      // Android / iOS event flow where both beforeinput and input fire for a single character input
      const preventDefaultBeforeInput = vi.fn();

      // 1. beforeinput fires with data = 'x'
      processor.handleBeforeInput({
        nativeEvent: { data: 'x' },
        preventDefault: preventDefaultBeforeInput
      });

      // 2. input event fires on same element with nativeEvent.data = 'x'
      processor.handleInputEvent({
        target: { value: 'x' },
        nativeEvent: { data: 'x' }
      });

      // Deduplication verifies exactly 1 intent sent per soft keystroke:
      console.log('Sent intents count for single character input:', processor.sentIntents.length);
      expect(processor.sentIntents.length).toBe(1);
      expect(processor.sentIntents[0].key).toBe('x');
    });
  });

  describe('5. High-Speed Rapid Typing & Burst Input Sequences', () => {
    it('should process rapid stream of 200 consecutive valid keystrokes smoothly', () => {
      const preventDefault = vi.fn();
      const inputText = "the quick brown fox jumps over the lazy dog 1234567890 !@#$%^&*()";

      for (let i = 0; i < 3; i++) {
        for (const char of inputText) {
          processor.handleCombatKey({ key: char, preventDefault });
        }
      }

      expect(processor.sentIntents).toHaveLength(inputText.length * 3);
      expect(processor.sentIntents[processor.sentIntents.length - 1].seq).toBe(inputText.length * 3);
    });

    it('should process pasted multi-character text in processInputText', () => {
      const burstText = "FASTTYPINGCOMBO";
      processor.processInputText(burstText);

      expect(processor.sentIntents).toHaveLength(burstText.length);
      const sentString = processor.sentIntents.map(i => i.key).join('');
      expect(sentString).toBe(burstText);
    });

    it('should drop keypresses when room status is not in_progress', () => {
      processor.setMatchInProgress(false);
      const preventDefault = vi.fn();

      processor.handleCombatKey({ key: 'a', preventDefault });
      processor.processInputText('hello');

      expect(processor.sentIntents).toHaveLength(0);
    });

    it('should drop keypresses when game is paused', () => {
      processor.setPaused(true);
      const preventDefault = vi.fn();

      processor.handleCombatKey({ key: 'a', preventDefault });
      processor.processInputText('hello');

      expect(processor.sentIntents).toHaveLength(0);
    });

    it('should correctly process fast consecutive typing like "e" then "l" without duplicating or missing keys', () => {
      // 1. User types 'e' on Android Gboard (DOM value becomes "e")
      processor.handleInputDOMEvent({ target: { value: 'e' } });
      expect(processor.sentIntents).toHaveLength(1);
      expect(processor.sentIntents[0].key).toBe('e');

      // 2. User types 'l' rapidly before input is cleared (DOM value becomes "el")
      processor.handleInputDOMEvent({ target: { value: 'el' } });
      expect(processor.sentIntents).toHaveLength(2);
      expect(processor.sentIntents[1].key).toBe('l');

      // 3. User types 'e' rapidly (DOM value becomes "ele")
      processor.handleInputDOMEvent({ target: { value: 'ele' } });
      expect(processor.sentIntents).toHaveLength(3);
      expect(processor.sentIntents[2].key).toBe('e');

      // 4. User types 'p' rapidly (DOM value becomes "elep")
      processor.handleInputDOMEvent({ target: { value: 'elep' } });
      expect(processor.sentIntents).toHaveLength(4);
      expect(processor.sentIntents[3].key).toBe('p');

      const fullSent = processor.sentIntents.map(i => i.key).join('');
      expect(fullSent).toBe('elep');
    });
  });
});
