import React from 'react';
import { Swords, Trophy, User, LogIn, Swords as RankedIcon, Sparkles } from 'lucide-react';
import { UserProfile } from '../../lib/supabase';
import { RankBadge } from '../ranked/RankBadge';

interface NavbarProps {
  userProfile: UserProfile | null;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onQueueRankedMatch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userProfile,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenAuth,
  onQueueRankedMatch
}) => {
  return (
    <header
      className="glass-panel"
      style={{
        margin: '16px 24px 0 24px',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Brand / Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
        <img
          src="/logo.jpg"
          alt="KeyFury Logo"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 0 14px rgba(56, 189, 248, 0.4), 0 0 24px rgba(249, 115, 22, 0.2)'
          }}
        />
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>
            KEY<span style={{ color: '#38bdf8' }}>FURY</span>
          </h1>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ESPORTS 1V1
          </span>
        </div>
      </div>

      {/* Action Navigation Buttons & Profile Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Ranked Match Queue Button */}
        <button
          onClick={onQueueRankedMatch}
          className="btn-primary"
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
            boxShadow: '0 0 15px rgba(236, 72, 153, 0.4)'
          }}
        >
          <RankedIcon size={16} /> Ranked Match
        </button>

        {/* Global Leaderboard Button */}
        <button
          onClick={onOpenLeaderboard}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '10px' }}
        >
          <Trophy size={16} color="#fbbf24" /> Leaderboard
        </button>

        {/* Profile Card & Explicit Auth Buttons */}
        {userProfile && !userProfile.isGuest ? (
          <div
            onClick={onOpenProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.2)',
              borderRadius: '12px',
              padding: '6px 14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RankBadge
              tier={userProfile.rankTier}
              rating={userProfile.mmr}
              size="sm"
              showRating
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.displayName}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid #38bdf8'
                }}
              />
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                {userProfile.displayName}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {userProfile && (
              <div
                onClick={onOpenProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: '#94a3b8'
                }}
              >
                <User size={14} /> Guest: <strong style={{ color: '#f8fafc' }}>{userProfile.displayName}</strong>
              </div>
            )}
            <button
              onClick={() => onOpenAuth('login')}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '10px' }}
            >
              <LogIn size={15} /> Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '10px', backgroundColor: '#38bdf8' }}
            >
              <Sparkles size={15} /> Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
