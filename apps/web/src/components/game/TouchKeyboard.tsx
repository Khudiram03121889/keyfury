import React, { useState, useCallback } from 'react';
import { Keyboard, X } from 'lucide-react';
import { soundSynth } from '../../game/audio/SoundSynth';

interface TouchKeyboardProps {
  onKeyPress: (char: string) => void;
  expectedChar?: string;
  onClose?: () => void;
  isErrorFlash?: boolean;
}

// ponytail: QWERTY 3-row layout + Spacebar row for mobile touch combat input
const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '-', "'"]
];

export const TouchKeyboard: React.FC<TouchKeyboardProps> = ({
  onKeyPress,
  expectedChar,
  onClose,
  isErrorFlash = false
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleKeyTap = useCallback(
    (char: string, e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      soundSynth.playMechanicalClick();
      setActiveKey(char);
      setTimeout(() => setActiveKey(null), 120);

      onKeyPress(char);
    },
    [onKeyPress]
  );

  const targetChar = expectedChar ? expectedChar.toLowerCase() : null;

  return (
    <div
      className="touch-keyboard-container"
      style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        padding: '6px 4px',
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(16px)',
        borderRadius: '14px',
        border: isErrorFlash
          ? '2px solid #ef4444'
          : '1px solid var(--border-card)',
        boxShadow: isErrorFlash
          ? '0 0 25px rgba(239, 68, 68, 0.5)'
          : '0 8px 32px var(--card-shadow)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation',
        transition: 'border 0.15s ease, box-shadow 0.15s ease'
      }}
    >
      {/* Header bar with info & close toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2px 6px 4px 6px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '4px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--accent-cyan)',
            letterSpacing: '0.5px'
          }}
        >
          <Keyboard size={13} />
          <span>TOUCH QWERTY KEYBOARD</span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            onTouchStart={(e) => {
              e.preventDefault();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Hide Touch Keyboard"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Rows 1 to 3 */}
      {KEYBOARD_ROWS.map((row, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '3px',
            marginBottom: '4px'
          }}
        >
          {row.map((char) => {
            const isTarget = targetChar === char;
            const isActive = activeKey === char;

            return (
              <button
                key={char}
                onTouchStart={(e) => handleKeyTap(char, e)}
                onMouseDown={(e) => handleKeyTap(char, e)}
                style={{
                  flex: 1,
                  maxWidth: '52px',
                  height: '40px',
                  borderRadius: '6px',
                  border: isTarget
                    ? '1.5px solid var(--accent-cyan)'
                    : '1px solid var(--border-card)',
                  background: isActive
                    ? 'var(--accent-cyan)'
                    : isTarget
                    ? 'rgba(56, 189, 248, 0.25)'
                    : 'var(--kbd-bg)',
                  color: isActive
                    ? '#0f172a'
                    : isTarget
                    ? 'var(--accent-cyan)'
                    : 'var(--kbd-text)',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isTarget
                    ? '0 0 10px rgba(56, 189, 248, 0.5)'
                    : '0 2px 4px rgba(0, 0, 0, 0.2)',
                  transform: isActive ? 'scale(0.92)' : 'scale(1)',
                  transition: 'all 0.08s ease',
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                {char.toUpperCase()}
              </button>
            );
          })}
        </div>
      ))}

      {/* Row 4: Spacebar row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4px',
          marginTop: '2px'
        }}
      >
        <button
          onTouchStart={(e) => handleKeyTap(' ', e)}
          onMouseDown={(e) => handleKeyTap(' ', e)}
          style={{
            flex: 1,
            maxWidth: '360px',
            height: '38px',
            borderRadius: '6px',
            border: targetChar === ' '
              ? '1.5px solid var(--accent-cyan)'
              : '1px solid var(--border-card)',
            background: activeKey === ' '
              ? 'var(--accent-cyan)'
              : targetChar === ' '
              ? 'rgba(56, 189, 248, 0.25)'
              : 'var(--kbd-bg)',
            color: activeKey === ' '
              ? '#0f172a'
              : targetChar === ' '
              ? 'var(--accent-cyan)'
              : 'var(--kbd-text)',
            fontSize: '0.85rem',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: targetChar === ' '
              ? '0 0 10px rgba(56, 189, 248, 0.5)'
              : '0 2px 4px rgba(0, 0, 0, 0.2)',
            transform: activeKey === ' ' ? 'scale(0.96)' : 'scale(1)',
            transition: 'all 0.08s ease',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <span>[ ␣ SPACE ]</span>
        </button>
      </div>
    </div>
  );
};
