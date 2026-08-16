import React, { useState, useCallback, useRef, useEffect } from 'react';
import { soundSynth } from '../../game/audio/SoundSynth';

export interface VirtualKeypadProps {
  onKeyPress: (char: string) => void;
  activeChar?: string;
  disabled?: boolean;
  isStunned?: boolean;
  onSoundEffect?: (isSpace: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ROW_1_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] as const;
export const ROW_2_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'] as const;
export const ROW_3_KEYS = ['z', 'x', 'c', 'v', 'b', 'n', 'm'] as const;

/**
 * Checks if a keycap should be highlighted with the cyan neon active pulse.
 */
export function isKeycapActive(
  char: string,
  activeChar?: string,
  disabled: boolean = false,
  isStunned: boolean = false
): boolean {
  if (!activeChar || disabled || isStunned) return false;
  if (char === ' ' || char === 'Spacebar') {
    return activeChar === ' ' || activeChar === 'Spacebar';
  }
  return char.toLowerCase() === activeChar.toLowerCase();
}

export interface KeyTriggerOptions {
  disabled?: boolean;
  isStunned?: boolean;
  onKeyPress: (char: string) => void;
  onSoundEffect?: (isSpace: boolean) => void;
  lastTouchTimeRef?: { current: number };
  onPressedKey?: (char: string) => void;
}

/**
 * Executes a virtual key press with zero latency, audio synthesis, and event suppression.
 */
export function handleVirtualKeyTrigger(
  char: string,
  options: KeyTriggerOptions,
  event?: { cancelable?: boolean; preventDefault?: () => void; stopPropagation?: () => void }
): boolean {
  if (event) {
    if (event.cancelable && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
  }

  // Deduplication guard against simultaneous pointerdown/touchstart triggers within 15ms
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (options.lastTouchTimeRef) {
    if (now - options.lastTouchTimeRef.current < 15) {
      return false;
    }
    options.lastTouchTimeRef.current = now;
  }

  if (options.disabled || options.isStunned) {
    return false;
  }

  const isSpace = char === ' ' || char === 'Spacebar';
  const keyToSend = isSpace ? ' ' : char;

  if (options.onPressedKey) {
    options.onPressedKey(char);
  }

  // Instant Web Audio procedural mechanical click sound
  try {
    soundSynth.playMechanicalClick(isSpace);
  } catch (_err) {}

  if (options.onSoundEffect) {
    try {
      options.onSoundEffect(isSpace);
    } catch (_err) {}
  }

  options.onKeyPress(keyToSend);
  return true;
}

export const VirtualKeypad: React.FC<VirtualKeypadProps> = ({
  onKeyPress,
  activeChar,
  disabled = false,
  isStunned = false,
  onSoundEffect,
  className = '',
  style
}) => {
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const pressedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (pressedTimerRef.current) {
        clearTimeout(pressedTimerRef.current);
      }
    };
  }, []);

  const triggerKey = useCallback(
    (char: string, e?: React.SyntheticEvent) => {
      handleVirtualKeyTrigger(
        char,
        {
          disabled,
          isStunned,
          onKeyPress,
          onSoundEffect,
          lastTouchTimeRef,
          onPressedKey: (k) => {
            setPressedKey(k);
            if (pressedTimerRef.current) {
              clearTimeout(pressedTimerRef.current);
            }
            pressedTimerRef.current = setTimeout(() => {
              setPressedKey(null);
            }, 100);
          }
        },
        e ? (e.nativeEvent as any) || e : undefined
      );
    },
    [disabled, isStunned, onKeyPress, onSoundEffect]
  );

  const renderKey = (char: string, label?: string, customStyle?: React.CSSProperties, isSpecial?: boolean) => {
    const active = isKeycapActive(char, activeChar, disabled, isStunned);
    const pressed = pressedKey === char;
    const displayLabel = label || char.toUpperCase();

    let keyClasses = 'keyfury-keycap';
    if (active) keyClasses += ' keyfury-keycap-active';
    if (pressed) keyClasses += ' keyfury-keycap-pressed';
    if (isStunned) keyClasses += ' keyfury-keycap-stunned';
    if (disabled) keyClasses += ' keyfury-keycap-disabled';
    if (isSpecial) keyClasses += ' keyfury-keycap-special';

    return (
      <button
        key={`key-${char}`}
        type="button"
        data-key={char}
        data-active={active ? 'true' : 'false'}
        data-pressed={pressed ? 'true' : 'false'}
        disabled={disabled}
        aria-label={char === ' ' ? 'Spacebar' : `Key ${displayLabel}`}
        className={keyClasses}
        style={customStyle}
        onPointerDown={(e) => triggerKey(char, e)}
        onTouchStart={(e) => triggerKey(char, e)}
        onMouseDown={(e) => triggerKey(char, e)}
      >
        <span className="keyfury-keycap-label">{displayLabel}</span>
        {active && <span className="keyfury-keycap-glow-pip" />}
      </button>
    );
  };

  return (
    <div
      className={`keyfury-virtual-keypad ${isStunned ? 'keyfury-keypad-stunned' : ''} ${className}`}
      style={{
        ...style
      }}
      data-testid="virtual-keypad"
      data-disabled={disabled ? 'true' : 'false'}
      data-stunned={isStunned ? 'true' : 'false'}
      role="group"
      aria-label="Virtual Touch Keyboard"
    >
      {/* Stun / Typo Lockout Overlay */}
      {isStunned && (
        <div className="keyfury-keypad-stun-lockout" data-testid="keypad-stun-overlay">
          <span className="keyfury-keypad-stun-text">SYSTEM STUNNED — LOCKOUT</span>
        </div>
      )}

      {/* Row 1: Q W E R T Y U I O P */}
      <div className="keyfury-key-row" data-testid="key-row-1">
        {ROW_1_KEYS.map((char) => renderKey(char))}
      </div>

      {/* Row 2: A S D F G H J K L (Ergonomically indented) */}
      <div className="keyfury-key-row keyfury-key-row-2" data-testid="key-row-2">
        <div className="keyfury-key-spacer-half" aria-hidden="true" />
        {ROW_2_KEYS.map((char) => renderKey(char))}
        <div className="keyfury-key-spacer-half" aria-hidden="true" />
      </div>

      {/* Row 3: Z X C V B N M + Clean End Spacers */}
      <div className="keyfury-key-row keyfury-key-row-3" data-testid="key-row-3">
        <div className="keyfury-key-spacer-one-and-half" aria-hidden="true" />
        {ROW_3_KEYS.map((char) => renderKey(char))}
        <div className="keyfury-key-spacer-one-and-half" aria-hidden="true" />
      </div>

      {/* Row 4: Spacebar with Ergonomic Flanking */}
      <div className="keyfury-key-row keyfury-key-row-4" data-testid="key-row-4">
        <div className="keyfury-spacebar-flank" aria-hidden="true">
          <span className="keyfury-flank-glyph">⚡ KEYFURY</span>
        </div>
        {renderKey(
          ' ',
          'SPACEBAR',
          {
            flex: '1 1 auto',
            maxWidth: '460px',
            minWidth: '150px'
          },
          true
        )}
        <div className="keyfury-spacebar-flank" aria-hidden="true">
          <span className="keyfury-flank-glyph">COMBAT ⚔</span>
        </div>
      </div>
    </div>
  );
};

export default VirtualKeypad;
