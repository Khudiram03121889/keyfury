import React, { useState } from 'react';
import { Clock, Bot, RefreshCw, ArrowLeft, X, ShieldAlert } from 'lucide-react';

export interface QueueTimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBotDuel: (difficulty: 'novice' | 'fighter' | 'pro' | 'adaptive') => void;
  onRequeue: () => void;
  onBackToLobby: () => void;
}

export const QueueTimeoutModal: React.FC<QueueTimeoutModalProps> = ({
  isOpen,
  onClose,
  onStartBotDuel,
  onRequeue,
  onBackToLobby
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<'novice' | 'fighter' | 'pro' | 'adaptive'>('adaptive');

  if (!isOpen) return null;

  const difficultyOptions: {
    id: 'adaptive' | 'pro' | 'fighter' | 'novice';
    label: string;
    badge: string;
    description: string;
  }[] = [
    {
      id: 'adaptive',
      label: 'Adaptive AI',
      badge: 'RECOMMENDED',
      description: 'Dynamically scales WPM speed & aggression to match your performance'
    },
    {
      id: 'pro',
      label: 'Pro AI',
      badge: '90 WPM',
      description: 'High-speed competitive bot for advanced typing warriors'
    },
    {
      id: 'fighter',
      label: 'Fighter AI',
      badge: '60 WPM',
      description: 'Balanced combat bot for steady intermediate duels'
    },
    {
      id: 'novice',
      label: 'Novice AI',
      badge: '35 WPM',
      description: 'Forgiving practice bot for warmups and casual practice'
    }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(5, 7, 13, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onBackToLobby}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px 32px',
          position: 'relative',
          border: '1px solid rgba(251, 191, 36, 0.35)',
          boxShadow: '0 0 45px rgba(251, 191, 36, 0.15), inset 0 0 25px rgba(251, 191, 36, 0.05)',
          animation: 'pulse 6s infinite alternate'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onBackToLobby}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-main)'; e.currentTarget.style.backgroundColor = 'var(--btn-sec-hover)'; }}
          onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
          title="Close Modal"
        >
          <X size={20} />
        </button>

        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px', flexShrink: 0 }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            backgroundColor: 'rgba(251, 191, 36, 0.12)',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 25px rgba(251, 191, 36, 0.25)'
          }}>
            <Clock size={32} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            <ShieldAlert size={14} /> Queue Timeout (20s)
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--text-heading)', margin: 0 }}>
            No Players Found
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '8px', lineHeight: '1.45' }}>
            We searched for a live human opponent for 20 seconds, but no players are currently available in your skill range.
          </p>
        </div>

        {/* Bot Difficulty Selector Section */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: 'var(--accent-cyan)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}>
            Select AI Bot Difficulty:
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {difficultyOptions.map((option) => {
              const isSelected = selectedDifficulty === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedDifficulty(option.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: isSelected
                      ? '2px solid #4ade80'
                      : '1px solid var(--border-card)',
                    backgroundColor: isSelected
                      ? 'rgba(74, 222, 128, 0.15)'
                      : 'var(--btn-sec-bg)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="radio"
                      name="botDifficulty"
                      checked={isSelected}
                      onChange={() => setSelectedDifficulty(option.id)}
                      style={{ accentColor: '#4ade80', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#4ade80' : 'var(--text-main)' }}>
                          {option.label}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? 'rgba(74, 222, 128, 0.25)' : 'var(--pill-bg)',
                          color: isSelected ? '#4ade80' : 'var(--text-muted)',
                          letterSpacing: '0.5px'
                        }}>
                          {option.badge}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px', margin: 0 }}>
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          {/* Primary CTA: Play vs AI Bot */}
          <button
            type="button"
            className="btn-primary"
            onClick={() => onStartBotDuel(selectedDifficulty)}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px',
              fontSize: '0.98rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              backgroundColor: '#22c55e',
              borderColor: '#4ade80',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Bot size={20} /> Play vs AI Bot
          </button>

          {/* Secondary CTA: Re-queue Quick Duel */}
          <button
            type="button"
            className="btn-secondary"
            onClick={onRequeue}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '11px',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderColor: 'var(--accent-cyan)',
              color: 'var(--accent-cyan)'
            }}
          >
            <RefreshCw size={16} /> Re-queue Quick Duel
          </button>

          {/* Tertiary CTA: Back to Lobby */}
          <button
            type="button"
            onClick={onBackToLobby}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={15} /> Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueueTimeoutModal;
