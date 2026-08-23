import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Swords, Zap, Shield, Flame, Skull, Sparkles, Check, Play, Volume2 } from 'lucide-react';
import {
  CharacterId,
  CharacterDefinition,
  getAllCharacters,
  getCharacterDefinition,
  DEFAULT_CHARACTER_ID
} from '@keyfury/game-core';
import { CHARACTER_PORTRAITS } from '../../assets/characters';
import { ParticlePool, type PooledParticle } from '../../render/ObjectPool';
import { soundSynth } from '../../game/audio/SoundSynth';
import { soundManager } from '../../audio/SoundManager';
import { saveSelectedCharacter } from '../../lib/supabase';

export interface CharacterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCharacterId?: CharacterId;
  onSelectCharacter: (characterId: CharacterId) => void;
}

const ARCHETYPE_ICONS: Record<CharacterId, string> = {
  shadow_ronin: '⚔️',
  cyber_valkyrie: '🥊',
  volt_shinobi: '⚡',
  void_assassin: '🗡️'
};

export const CharacterSelectModal: React.FC<CharacterSelectModalProps> = ({
  isOpen,
  onClose,
  selectedCharacterId = DEFAULT_CHARACTER_ID,
  onSelectCharacter
}) => {
  const characters = getAllCharacters();
  const [focusedId, setFocusedId] = useState<CharacterId>(selectedCharacterId);
  const [activeStriking, setActiveStriking] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeParticlesRef = useRef<PooledParticle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const lastStrikeTimeRef = useRef<number>(0);

  // Sync focused character when modal opens or selected character prop changes
  useEffect(() => {
    if (isOpen) {
      setFocusedId(selectedCharacterId || DEFAULT_CHARACTER_ID);
    }
  }, [isOpen, selectedCharacterId]);

  const focusedChar: CharacterDefinition = getCharacterDefinition(focusedId);

  // Handle ESC key and keyboard navigation for character cycling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playClick();
        onClose();
        return;
      }

      const ids = characters.map((c) => c.id);
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
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTestStrike();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedId, characters, onClose]);

  // Clean up any remaining canvas particles on unmount or modal close
  const clearActiveParticles = useCallback(() => {
    for (const p of activeParticlesRef.current) {
      ParticlePool.release(p);
    }
    activeParticlesRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      clearActiveParticles();
    };
  }, [clearActiveParticles]);

  // Interactive Live Canvas Vector Strike & Particle Animation
  const handleTestStrike = () => {
    const now = Date.now();
    // 100ms debounce
    if (now - lastStrikeTimeRef.current < 100) return;
    lastStrikeTimeRef.current = now;

    soundSynth.ensureUnlocked();
    setActiveStriking(true);

    // Trigger procedural audio synthesis based on character
    if (focusedId === 'cyber_valkyrie') {
      soundSynth.playHeavyImpact(true);
    } else if (focusedId === 'shadow_ronin') {
      soundSynth.playCriticalHit();
    } else if (focusedId === 'volt_shinobi') {
      soundSynth.playCriticalHit();
      soundSynth.playComboHit(6);
    } else if (focusedId === 'void_assassin') {
      soundSynth.playCriticalHit();
      soundSynth.playHeavyImpact(false);
    } else {
      soundSynth.playCriticalHit();
    }

    // Spawn zero-allocation particles from ParticlePool
    const canvas = canvasRef.current;
    if (canvas) {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const palette = focusedChar.theme.particlePalette.length > 0
        ? focusedChar.theme.particlePalette
        : ['#38bdf8', '#0ea5e9', '#0284c7'];

      const particleCount = focusedId === 'cyber_valkyrie' ? 24 : 16;

      for (let i = 0; i < particleCount; i++) {
        const p = ParticlePool.acquire();
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
        const speed = 2.5 + Math.random() * 4.5;
        p.position.x = centerX + (Math.random() - 0.5) * 20;
        p.position.y = centerY + (Math.random() - 0.5) * 20;
        p.velocity.x = Math.cos(angle) * speed;
        p.velocity.y = Math.sin(angle) * speed - (Math.random() * 2);
        p.color = palette[i % palette.length];
        p.size = focusedId === 'cyber_valkyrie' ? 3 + (i % 3) : 2.5;
        p.lifetimeMs = 380;
        p.currentAgeMs = 0;
        p.active = true;
        activeParticlesRef.current.push(p);
      }
    }

    setTimeout(() => {
      setActiveStriking(false);
    }, 280);
  };

  // 60 FPS Particle Canvas Render Loop
  useEffect(() => {
    if (!isOpen) return;

    let lastFrameTime = performance.now();

    const renderLoop = (now: number) => {
      const deltaMs = Math.min(32, now - lastFrameTime);
      lastFrameTime = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw elemental ambient pulse backdrop
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const radialGrad = ctx.createRadialGradient(
            centerX, centerY, 5,
            centerX, centerY, canvas.width / 2
          );
          radialGrad.addColorStop(0, `${focusedChar.theme.primaryColor}25`);
          radialGrad.addColorStop(1, 'rgba(10, 15, 29, 0)');
          ctx.fillStyle = radialGrad;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw dynamic strike slash wave if active
          if (activeStriking) {
            ctx.save();
            ctx.strokeStyle = focusedChar.theme.primaryColor;
            ctx.lineWidth = 4;
            ctx.shadowColor = focusedChar.theme.primaryColor;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 45, -Math.PI * 0.75, Math.PI * 0.25);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 42, -Math.PI * 0.65, Math.PI * 0.15);
            ctx.stroke();
            ctx.restore();
          }

          // Update & draw active elemental particles
          const remaining: PooledParticle[] = [];
          for (const p of activeParticlesRef.current) {
            p.currentAgeMs += deltaMs;
            if (p.currentAgeMs >= p.lifetimeMs) {
              ParticlePool.release(p);
              continue;
            }

            p.position.x += p.velocity.x;
            p.position.y += p.velocity.y;
            p.velocity.y += 0.08; // subtle gravity

            const lifeRatio = 1 - (p.currentAgeMs / p.lifetimeMs);
            const alpha = Math.max(0, lifeRatio);

            ctx.save();
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.position.x, p.position.y, p.size * (0.5 + 0.5 * lifeRatio), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            remaining.push(p);
          }
          activeParticlesRef.current = remaining;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isOpen, focusedChar, activeStriking]);

  const handleConfirmSelection = (charId: CharacterId) => {
    soundSynth.ensureUnlocked();
    soundSynth.playKOChime(true);
    saveSelectedCharacter(charId);
    onSelectCharacter(charId);
    onClose();
  };

  if (!isOpen) return null;

  const isEquipped = selectedCharacterId === focusedId;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(5, 7, 13, 0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel modal-dialog-content"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          border: `1px solid ${focusedChar.theme.primaryColor}55`,
          boxShadow: `0 0 45px ${focusedChar.theme.glowColor}`,
          transition: 'border 0.3s ease, box-shadow 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{
          padding: '18px 24px 14px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: `linear-gradient(135deg, ${focusedChar.theme.primaryColor}22 0%, rgba(15, 23, 42, 0.95) 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${focusedChar.theme.primaryColor}44, ${focusedChar.theme.accentColor}22)`,
              border: `1px solid ${focusedChar.theme.primaryColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: focusedChar.theme.primaryColor
            }}>
              <Swords size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-heading)', margin: 0, letterSpacing: '-0.5px' }}>
                SELECT YOUR <span style={{ color: focusedChar.theme.primaryColor }}>CHAMPION</span>
              </h2>
              <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Choose your fighting avatar & harness unique elemental kinetic abilities.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="Close modal (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 Core Fighter Grid / Carousel */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
                CORE FIGHTER ROSTER (1 - 4)
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Use <span className="kbd-badge">←</span> <span className="kbd-badge">→</span> to cycle
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
              {characters.map((char, index) => {
                const isSelected = char.id === selectedCharacterId;
                const isFocused = char.id === focusedId;
                const portraitSrc = CHARACTER_PORTRAITS[char.id] || `/assets/characters/${char.portraitAssetKey}.svg`;

                return (
                  <div
                    key={char.id}
                    data-testid={`character-card-${char.id}`}
                    onClick={() => {
                      soundManager.playClick();
                      setFocusedId(char.id);
                    }}
                    onDoubleClick={() => handleConfirmSelection(char.id)}
                    style={{
                      backgroundColor: isFocused
                        ? `rgba(15, 23, 42, 0.95)`
                        : 'rgba(15, 23, 42, 0.5)',
                      border: isFocused
                        ? `2px solid ${char.theme.primaryColor}`
                        : isSelected
                        ? `1px solid ${char.theme.primaryColor}88`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isFocused
                        ? `0 0 20px ${char.theme.glowColor}`
                        : isSelected
                        ? `0 0 10px ${char.theme.glowColor}55`
                        : 'none',
                      borderRadius: '14px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    {/* Active/Equipped Badge */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#34d399',
                        color: '#064e3b',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: '0 0 8px rgba(52, 211, 153, 0.6)'
                      }}>
                        <Check size={10} strokeWidth={3} /> ACTIVE
                      </div>
                    )}

                    {/* Number Shortcut Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: isFocused ? char.theme.primaryColor : 'var(--text-muted)',
                      border: `1px solid ${isFocused ? char.theme.primaryColor : 'rgba(255, 255, 255, 0.1)'}`,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {index + 1}
                    </div>

                    {/* Portrait Avatar */}
                    <div style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginTop: '6px',
                      marginBottom: '8px',
                      backgroundColor: 'rgba(10, 15, 26, 0.8)',
                      border: `1px solid ${isFocused ? char.theme.primaryColor : 'rgba(255, 255, 255, 0.15)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={portraitSrc}
                        alt={char.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>

                    {/* Name & Codename */}
                    <div style={{
                      fontWeight: 900,
                      fontSize: '0.95rem',
                      color: isFocused ? '#ffffff' : 'var(--text-heading)',
                      marginBottom: '2px'
                    }}>
                      {char.name}
                    </div>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: char.theme.primaryColor,
                      marginBottom: '6px'
                    }}>
                      "{char.codename}"
                    </div>

                    {/* Archetype Label Badge */}
                    <div style={{
                      backgroundColor: `rgba(255, 255, 255, 0.05)`,
                      border: `1px solid ${char.theme.primaryColor}44`,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>{ARCHETYPE_ICONS[char.id]}</span>
                      <span>{char.archetypeLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Focused Fighter Deep Dive & Stat Radar Panel */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            border: `1px solid ${focusedChar.theme.primaryColor}44`,
            borderRadius: '16px',
            padding: '18px',
            position: 'relative'
          }}>
            {/* Left Column: Lore, Move & Live Canvas Strike */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    backgroundColor: `${focusedChar.theme.primaryColor}22`,
                    border: `1px solid ${focusedChar.theme.primaryColor}`,
                    color: focusedChar.theme.primaryColor,
                    fontSize: '0.72rem',
                    fontWeight: 900,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                  }}>
                    {focusedChar.element}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>
                    {focusedChar.title}
                  </span>
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.5, margin: '6px 0 0 0' }}>
                  {focusedChar.lore}
                </p>
                <div style={{ fontStyle: 'italic', color: focusedChar.theme.primaryColor, fontSize: '0.75rem', marginTop: '4px' }}>
                  "{focusedChar.signatureQuote}"
                </div>
              </div>

              {/* Signature Move Callout */}
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>SIGNATURE STRIKE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: focusedChar.theme.primaryColor }}>
                    ⚡ {focusedChar.signatureMove}
                  </div>
                </div>
              </div>

              {/* Live Canvas Preview & Test Strike Action */}
              <div style={{
                position: 'relative',
                height: '110px',
                backgroundColor: 'rgba(5, 10, 20, 0.7)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: `1px solid ${focusedChar.theme.primaryColor}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={110}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />

                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestStrike();
                    }}
                    style={{
                      pointerEvents: 'auto',
                      backgroundColor: `${focusedChar.theme.primaryColor}ee`,
                      color: '#090d16',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: `0 0 15px ${focusedChar.theme.primaryColor}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Volume2 size={15} />
                    <span>⚡ Test Strike</span>
                    <span className="kbd-badge" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: '#090d16', borderColor: 'transparent' }}>
                      Space
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: 4-Attribute Combat Stat Meters */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '1px', marginBottom: '10px' }}>
                  COMBAT ATTRIBUTES (SCALE 1 - 10)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Speed & Agility', val: focusedChar.attributes.speed, color: '#38bdf8' },
                    { label: 'Kinetic Power', val: focusedChar.attributes.power, color: '#ef4444' },
                    { label: 'Armor Defense', val: focusedChar.attributes.defense, color: '#10b981' },
                    { label: 'Combo Mastery', val: focusedChar.attributes.comboMastery, color: '#a855f7' }
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
                        <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{stat.label}</span>
                        <span style={{ color: stat.color, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                          {stat.val} / 10
                        </span>
                      </div>
                      <div style={{
                        height: '7px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${stat.val * 10}%`,
                            backgroundColor: stat.color,
                            boxShadow: `0 0 8px ${stat.color}`,
                            borderRadius: '4px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tagline */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.74rem',
                color: '#94a3b8'
              }}>
                💡 <strong style={{ color: '#f8fafc' }}>Combat Tip:</strong> {focusedChar.tagline}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Press <span className="kbd-badge">Enter</span> to confirm selection.
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>

            <button
              type="button"
              data-testid="confirm-character-selection-btn"
              onClick={() => handleConfirmSelection(focusedId)}
              style={{
                backgroundColor: isEquipped ? '#10b981' : focusedChar.theme.primaryColor,
                color: '#090d16',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 20px',
                fontWeight: 900,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: isEquipped
                  ? '0 0 20px rgba(16, 185, 129, 0.5)'
                  : `0 0 20px ${focusedChar.theme.glowColor}`,
                transition: 'all 0.2s ease'
              }}
            >
              {isEquipped ? (
                <>
                  <Check size={16} strokeWidth={3} /> Active Champion (Equipped)
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Select Champion
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSelectModal;
