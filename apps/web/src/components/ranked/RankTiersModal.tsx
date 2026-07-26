import React, { useEffect } from 'react';
import { X, Lock, CheckCircle2, Trophy, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { RankBadge, RankTier, getRankTier } from './RankBadge';

export interface RankTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userMmr: number;
  userTier?: RankTier;
}

interface TierDefinition {
  name: RankTier;
  minMmr: number;
  maxMmr: number | typeof Infinity;
  description: string;
  perks: string;
}

const ALL_RANK_TIERS: TierDefinition[] = [
  {
    name: 'Bronze',
    minMmr: 0,
    maxMmr: 1199,
    description: 'Beginner combat typist tier.',
    perks: 'Standard 1v1 duels & basic word decks.'
  },
  {
    name: 'Silver',
    minMmr: 1200,
    maxMmr: 1599,
    description: 'Intermediate typist warrior.',
    perks: 'Unlocks Advanced word decks & punctuation prompts.'
  },
  {
    name: 'Gold',
    minMmr: 1600,
    maxMmr: 1999,
    description: 'Skilled competitive duelist.',
    perks: 'Unlocks Expert code symbols & capitalizations.'
  },
  {
    name: 'Platinum',
    minMmr: 2000,
    maxMmr: 2399,
    description: 'Advanced high-speed warrior.',
    perks: 'Featured placement in Regional Leaderboards.'
  },
  {
    name: 'Diamond',
    minMmr: 2400,
    maxMmr: 2799,
    description: 'Elite typist champion.',
    perks: 'Unlocks Diamond Ascendant achievement & badge glow.'
  },
  {
    name: 'Master',
    minMmr: 2800,
    maxMmr: 3199,
    description: 'Master of keyboard combat.',
    perks: 'Neon pink avatar aura & priority matchmaking.'
  },
  {
    name: 'Grandmaster',
    minMmr: 3200,
    maxMmr: Infinity,
    description: 'Supreme apex warrior.',
    perks: 'Crown badge symbol & top 100 Global Hall of Fame.'
  }
];

export const RankTiersModal: React.FC<RankTiersModalProps> = ({
  isOpen,
  onClose,
  userMmr,
  userTier
}) => {
  const currentTier = userTier || getRankTier(userMmr);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(5, 9, 20, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Trophy size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Competitive Rank Tiers
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
                Your Current Rating: <strong style={{ color: '#38bdf8' }}>{userMmr} MMR</strong> ({currentTier} Tier)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            aria-label="Close Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content - Rank Tiers List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {ALL_RANK_TIERS.map((tier) => {
            const isUnlocked = userMmr >= tier.minMmr;
            const isCurrentRank = currentTier === tier.name;
            const isLocked = !isUnlocked;

            // Calculate progress towards unlocking this tier if locked
            const progressPercent = isUnlocked
              ? 100
              : Math.min(99, Math.max(0, Math.round((userMmr / tier.minMmr) * 100)));

            const mmrNeeded = tier.minMmr - userMmr;

            return (
              <div
                key={tier.name}
                style={{
                  padding: '16px 20px',
                  borderRadius: '14px',
                  background: isCurrentRank
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)'
                    : isUnlocked
                    ? 'rgba(30, 41, 59, 0.6)'
                    : 'rgba(15, 23, 42, 0.45)',
                  border: isCurrentRank
                    ? '2px solid rgba(56, 189, 248, 0.6)'
                    : isUnlocked
                    ? '1px solid rgba(255, 255, 255, 0.12)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  boxShadow: isCurrentRank ? '0 0 20px rgba(56, 189, 248, 0.2)' : undefined,
                  opacity: isLocked ? 0.72 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Rank Badge & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <RankBadge tier={tier.name} size="md" showLabel={false} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isLocked ? '#94a3b8' : '#f8fafc' }}>
                          {tier.name} Tier
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                          ({tier.minMmr}{tier.maxMmr === Infinity ? '+' : ` - ${tier.maxMmr}`} MMR)
                        </span>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: isLocked ? '#64748b' : '#94a3b8', margin: '2px 0 0 0' }}>
                        {tier.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge: CURRENT RANK / UNLOCKED / LOCKED */}
                  <div>
                    {isCurrentRank ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          backgroundColor: 'rgba(56, 189, 248, 0.2)',
                          border: '1px solid rgba(56, 189, 248, 0.5)',
                          color: '#38bdf8',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)'
                        }}
                      >
                        <Sparkles size={14} /> CURRENT RANK
                      </span>
                    ) : isUnlocked ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          backgroundColor: 'rgba(74, 222, 128, 0.15)',
                          border: '1px solid rgba(74, 222, 128, 0.4)',
                          color: '#4ade80',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          letterSpacing: '0.5px'
                        }}
                      >
                        <CheckCircle2 size={14} /> UNLOCKED
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        <Lock size={13} /> LOCKED
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar for locked tiers */}
                {isLocked && (
                  <div style={{ marginTop: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>
                      <span>Progress to unlock: {userMmr} / {tier.minMmr} MMR</span>
                      <span style={{ color: '#f87171', fontWeight: 600 }}>Needs +{mmrNeeded} MMR</span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          borderRadius: '3px',
                          background: 'linear-gradient(90deg, #f87171 0%, #38bdf8 100%)',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 28px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.82rem' }}>
            <Shield size={16} color="#38bdf8" />
            <span>Win 1v1 duels in Ranked & Quick Play to earn MMR and unlock higher tiers.</span>
          </div>

          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RankTiersModal;
