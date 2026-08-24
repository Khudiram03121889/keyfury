import React, { useState, useEffect } from 'react';
import { X, Trees, Building2, Flame, Moon, Sparkles, Check, Play, Swords } from 'lucide-react';
import {
  ArenaId,
  ArenaDefinition,
  getAllArenas,
  getArenaDefinition,
  DEFAULT_ARENA_ID
} from '@keyfury/game-core';
import { ARENA_BACKGROUNDS } from '../../assets/arenas';
import { soundManager } from '../../audio/SoundManager';
import { saveSelectedArena } from '../../lib/supabase';

export interface ArenaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedArenaId?: ArenaId;
  onSelectArena: (arenaId: ArenaId) => void;
  onStartFight?: (arenaId: ArenaId) => void;
  isFightLaunchFlow?: boolean;
  fightModeLabel?: string;
}

const ARENA_ICONS: Record<ArenaId, React.ReactNode> = {
  highland_sanctuary: <Trees size={18} />,
  cyber_rooftop: <Building2 size={18} />,
  volcanic_caldera: <Flame size={18} />,
  celestial_void: <Moon size={18} />
};

export const ArenaSelectModal: React.FC<ArenaSelectModalProps> = ({
  isOpen,
  onClose,
  selectedArenaId = DEFAULT_ARENA_ID,
  onSelectArena,
  onStartFight,
  isFightLaunchFlow = false,
  fightModeLabel = 'Duel'
}) => {
  const arenas = getAllArenas();
  const [focusedId, setFocusedId] = useState<ArenaId>(selectedArenaId);

  // Sync focused arena when modal opens or selected prop changes
  useEffect(() => {
    if (isOpen) {
      setFocusedId(selectedArenaId || DEFAULT_ARENA_ID);
    }
  }, [isOpen, selectedArenaId]);

  const focusedArena: ArenaDefinition = getArenaDefinition(focusedId);

  // Keyboard navigation for cycling arenas
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playClick();
        onClose();
        return;
      }

      const ids = arenas.map((a) => a.id);
      const currentIndex = ids.indexOf(focusedId);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % ids.length;
        setFocusedId(ids[nextIndex]);
        soundManager.playClick();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + ids.length) % ids.length;
        setFocusedId(ids[prevIndex]);
        soundManager.playClick();
      } else if (e.key >= '1' && e.key <= '4') {
        const targetIndex = parseInt(e.key, 10) - 1;
        if (targetIndex >= 0 && targetIndex < ids.length) {
          setFocusedId(ids[targetIndex]);
          soundManager.playClick();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmSelection(focusedId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedId, arenas, onClose]);

  if (!isOpen) return null;

  const handleConfirmSelection = (arenaId: ArenaId) => {
    soundManager.playClick();
    onSelectArena(arenaId);
    saveSelectedArena(arenaId);
    if (isFightLaunchFlow && onStartFight) {
      onStartFight(arenaId);
    }
    onClose();
  };

  const isEquipped = selectedArenaId === focusedId;

  return (
    <div
      className="modal-overlay-wrapper"
      onClick={onClose}
    >
      <div
        className="glass-panel arena-modal-dialog"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: `1.5px solid ${focusedArena.theme.primaryColor}55`,
          borderRadius: '24px',
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 40px ${focusedArena.theme.ambientGlow}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${focusedArena.theme.primaryColor}22 0%, rgba(15, 23, 42, 0.95) 100%)`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${focusedArena.theme.primaryColor}44, ${focusedArena.theme.accentColor}22)`,
                border: `1px solid ${focusedArena.theme.primaryColor}88`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: focusedArena.theme.primaryColor,
                flexShrink: 0
              }}
            >
              {isFightLaunchFlow ? <Swords size={18} /> : <Sparkles size={18} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    color: '#ffffff'
                  }}
                >
                  {isFightLaunchFlow ? 'CHOOSE ARENA & FIGHT' : 'SELECT COMBAT ARENA'}
                </h2>
                {isFightLaunchFlow && (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(56, 189, 248, 0.2)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.7rem',
                      fontWeight: 800
                    }}
                  >
                    {fightModeLabel}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                {isFightLaunchFlow
                  ? `Select your battleground, then click Start Fight to begin ${fightModeLabel}`
                  : 'Choose your battleground • Custom backgrounds, lighting & physics'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            aria-label="Close arena select modal"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="arena-body-grid"
          style={{
            overflowY: 'auto',
            flex: 1
          }}
        >
          {/* Left: 4 Arenas Grid Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#64748b', marginBottom: '4px' }}>
              AVAILABLE BATTLEGROUNDS ({arenas.length})
            </div>

            <div className="arena-cards-grid">
              {arenas.map((arena, idx) => {
                const isFocused = arena.id === focusedId;
                const isSelected = arena.id === selectedArenaId;
                const bgUrl = ARENA_BACKGROUNDS[arena.id];

                return (
                <div
                  key={arena.id}
                  onClick={() => {
                    setFocusedId(arena.id);
                    soundManager.playClick();
                  }}
                  onDoubleClick={() => handleConfirmSelection(arena.id)}
                  style={{
                    position: 'relative',
                    height: '84px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isFocused
                      ? `2px solid ${arena.theme.primaryColor}`
                      : isSelected
                      ? '1px solid rgba(52, 211, 153, 0.6)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isFocused ? `0 0 20px ${arena.theme.primaryColor}55` : 'none',
                    transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#090d16'
                  }}
                >
                  {/* Background Image Preview */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${bgUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: isFocused ? 'brightness(0.7) contrast(1.1)' : 'brightness(0.35)',
                      transition: 'filter 0.2s ease'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(90deg, rgba(9, 13, 22, 0.85) 0%, rgba(9, 13, 22, 0.4) 100%)`
                    }}
                  />

                  {/* Arena Card Content */}
                  <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: `${arena.theme.primaryColor}33`,
                          border: `1px solid ${arena.theme.primaryColor}88`,
                          color: arena.theme.primaryColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {ARENA_ICONS[arena.id]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{arena.name}</span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(0,0,0,0.5)', padding: '1px 5px', borderRadius: '4px' }}>
                            [{idx + 1}]
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: arena.theme.accentColor }}>
                          {arena.subtitle}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div
                        style={{
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
                        }}
                      >
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Right: Detailed Arena Panoramic Showcase */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cinematic Stage Preview Banner */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                borderRadius: '20px',
                overflow: 'hidden',
                border: `1.5px solid ${focusedArena.theme.primaryColor}66`,
                boxShadow: `0 12px 30px rgba(0,0,0,0.6), 0 0 30px ${focusedArena.theme.ambientGlow}`
              }}
            >
              <img
                src={ARENA_BACKGROUNDS[focusedArena.id]}
                alt={focusedArena.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(0deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%)'
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '20px',
                  right: '20px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backgroundColor: `${focusedArena.theme.primaryColor}33`,
                      border: `1px solid ${focusedArena.theme.primaryColor}88`,
                      color: focusedArena.theme.primaryColor,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      marginBottom: '6px'
                    }}
                  >
                    {ARENA_ICONS[focusedArena.id]}
                    <span>{focusedArena.subtitle}</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#ffffff' }}>
                    {focusedArena.name}
                  </h3>
                </div>

                <div
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontSize: '0.75rem',
                    color: '#94a3b8'
                  }}
                >
                  MOOD: <strong style={{ color: focusedArena.theme.accentColor }}>{focusedArena.theme.lightingMood.toUpperCase()}</strong>
                </div>
              </div>
            </div>

            {/* Lore & Platform Info */}
            <div
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ fontStyle: 'italic', color: '#cbd5e1', fontSize: '0.88rem' }}>
                "{focusedArena.tagline}"
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', lineHeight: '1.5' }}>
                {focusedArena.lore}
              </p>
            </div>

            {/* Palette Highlights */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                borderRadius: '14px',
                padding: '12px 18px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>
                ARENA PARTICLES & LIGHTING
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {focusedArena.theme.particlePalette.map((col, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: col,
                      border: '1.5px solid rgba(255,255,255,0.3)',
                      boxShadow: `0 0 8px ${col}88`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Confirm / Select / Start Fight Action Button */}
            <button
              onClick={() => handleConfirmSelection(focusedArena.id)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '14px',
                fontWeight: 900,
                fontSize: '1.08rem',
                letterSpacing: '1px',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isFightLaunchFlow ? '#f97316' : isEquipped ? '#10b981' : focusedArena.theme.primaryColor,
                boxShadow: isFightLaunchFlow
                  ? '0 6px 25px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.4)'
                  : isEquipped
                  ? '0 6px 20px rgba(16, 185, 129, 0.4)'
                  : `0 6px 20px ${focusedArena.theme.primaryColor}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginTop: 'auto',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
            >
              {isFightLaunchFlow ? (
                <>
                  <Swords size={22} />
                  <span>START FIGHT • {focusedArena.name.toUpperCase()}</span>
                  <span
                    style={{
                      marginLeft: '6px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 800
                    }}
                  >
                    Enter
                  </span>
                </>
              ) : isEquipped ? (
                <>
                  <Check size={18} /> ACTIVE BATTLEGROUND
                </>
              ) : (
                <>
                  <Play size={18} /> EQUIP {focusedArena.name.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
