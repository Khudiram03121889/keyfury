import React, { useState, useEffect } from 'react';
import { Swords, X, Check, Clock, ShieldAlert } from 'lucide-react';
import { ChallengeInvite } from '../../lib/friends';
import { getCleanArenaName } from '../arena/ArenaSelectModal';
import { getArenaDefinition, ArenaId, DEFAULT_ARENA_ID } from '@keyfury/game-core';

interface IncomingChallengeModalProps {
  invite: ChallengeInvite | null;
  onAccept: (invite: ChallengeInvite) => void;
  onDecline: (invite: ChallengeInvite) => void;
}

export const IncomingChallengeModal: React.FC<IncomingChallengeModalProps> = ({
  invite,
  onAccept,
  onDecline
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    if (!invite) return;

    setTimeLeft(30);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline(invite);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [invite]);

  if (!invite) return null;

  let arenaName = 'Cyber Rooftop';
  try {
    const arenaDef = getArenaDefinition((invite.arenaId as ArenaId) || DEFAULT_ARENA_ID);
    arenaName = getCleanArenaName(arenaDef.name);
  } catch (_e) {}

  const progressPercent = Math.max(0, (timeLeft / 30) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(5, 10, 20, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '28px 24px',
          borderRadius: '20px',
          textAlign: 'center',
          position: 'relative',
          border: '2px solid rgba(244, 63, 94, 0.8)',
          boxShadow: '0 0 40px rgba(244, 63, 94, 0.4), 0 20px 40px rgba(0,0,0,0.8)',
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
        }}
      >
        {/* Pulsing Swords Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            border: '2px solid #f43f5e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 25px rgba(244, 63, 94, 0.6)'
          }}
        >
          <Swords size={34} color="#f43f5e" />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 900,
            color: '#f43f5e',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}
        >
          Incoming 1v1 Challenge
        </div>

        <h2
          style={{
            fontSize: '1.6rem',
            fontWeight: 900,
            color: '#ffffff',
            marginBottom: '12px',
            textShadow: '0 0 12px rgba(255,255,255,0.3)'
          }}
        >
          {invite.senderName}
        </h2>

        <p style={{ color: '#cbd5e1', fontSize: '0.92rem', marginBottom: '20px' }}>
          has challenged you to a live typing duel!
        </p>

        {/* Challenge Match Specs Card */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            padding: '12px 14px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '20px',
            textAlign: 'left'
          }}
        >
          <div>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Battleground
            </div>
            <div style={{ fontSize: '0.92rem', color: 'var(--accent-cyan)', fontWeight: 800 }}>
              {arenaName}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.70rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Match Timer
            </div>
            <div style={{ fontSize: '0.92rem', color: '#fbbf24', fontWeight: 800 }}>
              {invite.matchDuration} Seconds
            </div>
          </div>
        </div>

        {/* Expiration Timer Bar */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Auto-declines in
            </span>
            <span style={{ color: timeLeft <= 5 ? '#f43f5e' : '#fbbf24', fontWeight: 800 }}>
              {timeLeft}s
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: timeLeft <= 5 ? '#f43f5e' : '#38bdf8',
                transition: 'width 1s linear'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onAccept(invite)}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 800,
              backgroundColor: '#22c55e',
              borderColor: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
            }}
          >
            <Check size={18} /> Accept & Fight
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => onDecline(invite)}
            style={{
              flex: '0 0 100px',
              padding: '12px',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <X size={18} /> Decline
          </button>
        </div>
      </div>
    </div>
  );
};
export default IncomingChallengeModal;
