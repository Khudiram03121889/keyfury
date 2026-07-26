import React from 'react';

export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster';

export interface RankBadgeProps {
  tier?: RankTier | string;
  rating?: number;
  size?: 'sm' | 'md' | 'lg' | number;
  showLabel?: boolean;
  showRating?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function getRankTier(rating: number): RankTier {
  if (rating >= 3200) return 'Grandmaster';
  if (rating >= 2800) return 'Master';
  if (rating >= 2400) return 'Diamond';
  if (rating >= 2000) return 'Platinum';
  if (rating >= 1600) return 'Gold';
  if (rating >= 1200) return 'Silver';
  return 'Bronze';
}

interface TierConfig {
  name: RankTier;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  gradientId: string;
  iconSymbol: string;
  stars: number;
}

const TIER_CONFIGS: Record<RankTier, TierConfig> = {
  Bronze: {
    name: 'Bronze',
    primaryColor: '#cd7f32',
    secondaryColor: '#78350f',
    glowColor: 'rgba(205, 127, 50, 0.5)',
    gradientId: 'rank-grad-bronze',
    iconSymbol: '🛡️',
    stars: 1
  },
  Silver: {
    name: 'Silver',
    primaryColor: '#e2e8f0',
    secondaryColor: '#475569',
    glowColor: 'rgba(226, 232, 240, 0.6)',
    gradientId: 'rank-grad-silver',
    iconSymbol: '⚔️',
    stars: 2
  },
  Gold: {
    name: 'Gold',
    primaryColor: '#f59e0b',
    secondaryColor: '#b45309',
    glowColor: 'rgba(245, 158, 11, 0.65)',
    gradientId: 'rank-grad-gold',
    iconSymbol: '🎖️',
    stars: 3
  },
  Platinum: {
    name: 'Platinum',
    primaryColor: '#06b6d4',
    secondaryColor: '#0369a1',
    glowColor: 'rgba(6, 182, 212, 0.7)',
    gradientId: 'rank-grad-platinum',
    iconSymbol: '💠',
    stars: 4
  },
  Diamond: {
    name: 'Diamond',
    primaryColor: '#a855f7',
    secondaryColor: '#1d4ed8',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    gradientId: 'rank-grad-diamond',
    iconSymbol: '💎',
    stars: 5
  },
  Master: {
    name: 'Master',
    primaryColor: '#ec4899',
    secondaryColor: '#6d28d9',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    gradientId: 'rank-grad-master',
    iconSymbol: '⚡',
    stars: 5
  },
  Grandmaster: {
    name: 'Grandmaster',
    primaryColor: '#ef4444',
    secondaryColor: '#f59e0b',
    glowColor: 'rgba(239, 68, 68, 0.9)',
    gradientId: 'rank-grad-grandmaster',
    iconSymbol: '👑',
    stars: 5
  }
};

export const RankBadge: React.FC<RankBadgeProps> = ({
  tier,
  rating,
  size = 'md',
  showLabel = false,
  showRating = false,
  className = '',
  style = {}
}) => {
  const computedTier: RankTier = rating !== undefined
    ? getRankTier(rating)
    : ((tier as RankTier) || 'Bronze');
  const resolvedTier: RankTier = computedTier in TIER_CONFIGS ? computedTier : 'Bronze';

  const config = TIER_CONFIGS[resolvedTier];

  const dim = typeof size === 'number' ? size : size === 'sm' ? 28 : size === 'lg' ? 64 : 42;

  return (
    <div
      className={`rank-badge-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'inherit',
        ...style
      }}
    >
      <div
        style={{
          position: 'relative',
          width: `${dim}px`,
          height: `${dim}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: `drop-shadow(0 0 10px ${config.glowColor})`
        }}
      >
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={config.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.primaryColor} />
              <stop offset="100%" stopColor={config.secondaryColor} />
            </linearGradient>

            <filter id={`glow-${config.gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Crest Hexagon Shield */}
          <polygon
            points="50,4 90,25 90,75 50,96 10,75 10,25"
            fill={`url(#${config.gradientId})`}
            stroke="#ffffff"
            strokeWidth="3"
            strokeOpacity="0.4"
          />

          {/* Inner Shield Overlay */}
          <polygon
            points="50,12 82,30 82,70 50,88 18,70 18,30"
            fill="rgba(15, 23, 42, 0.65)"
            stroke={config.primaryColor}
            strokeWidth="2"
          />

          {/* Emblem Pattern Center Circle */}
          <circle cx="50" cy="50" r="22" fill={`url(#${config.gradientId})`} fillOpacity="0.3" stroke={config.primaryColor} strokeWidth="1.5" />
        </svg>

        {/* Center Symbol Emoji/Icon */}
        <span
          style={{
            position: 'absolute',
            fontSize: `${dim * 0.42}px`,
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          {config.iconSymbol}
        </span>
      </div>

      {(showLabel || showRating) && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          {showLabel && (
            <span
              style={{
                fontWeight: 900,
                fontSize: dim > 40 ? '1rem' : '0.85rem',
                color: config.primaryColor,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: `0 0 8px ${config.glowColor}`
              }}
            >
              {config.name}
            </span>
          )}
          {showRating && rating !== undefined && (
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              {rating} MMR
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RankBadge;
