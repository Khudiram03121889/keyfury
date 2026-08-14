import React from 'react';
import { Swords, Trophy, User, LogIn, Swords as RankedIcon, Sparkles, Youtube, Instagram } from 'lucide-react';
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
    <header className="glass-panel navbar-header">
      {/* Brand / Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
        <img
          src="/logo.jpg"
          alt="KeyFury Logo"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            objectFit: 'cover',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 0 14px rgba(56, 189, 248, 0.4), 0 0 24px rgba(249, 115, 22, 0.2)'
          }}
        />
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1, color: 'var(--text-heading)' }}>
            KEY<span style={{ color: 'var(--accent-cyan)' }}>FURY</span>
          </h1>
          <span className="nav-brand-subtext" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ESPORTS 1V1
          </span>
        </div>
      </div>

      {/* Action Navigation Buttons & Profile Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Social Links */}
        <div className="nav-social-group" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '2px' }}>
          <a
            href="https://www.youtube.com/@keyfurytype"
            target="_blank"
            rel="noopener noreferrer"
            title="KeyFury YouTube Channel"
            aria-label="KeyFury YouTube Channel"
            className="btn-secondary"
            style={{
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}
          >
            <Youtube size={18} />
          </a>
          <a
            href="https://www.instagram.com/keyfury.in"
            target="_blank"
            rel="noopener noreferrer"
            title="KeyFury Instagram Profile"
            aria-label="KeyFury Instagram Profile"
            className="btn-secondary"
            style={{
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ec4899'
            }}
          >
            <Instagram size={18} />
          </a>
        </div>

        {/* Ranked Match Queue Button */}
        <button
          onClick={onQueueRankedMatch}
          className="btn-primary"
          style={{
            padding: '8px 14px',
            fontSize: '0.85rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
            boxShadow: '0 0 15px rgba(236, 72, 153, 0.4)'
          }}
        >
          <RankedIcon size={16} /> <span className="nav-btn-text">Ranked Match</span>
        </button>

        {/* Global Leaderboard Button */}
        <button
          onClick={onOpenLeaderboard}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px' }}
        >
          <Trophy size={16} color="var(--accent-amber)" /> <span className="nav-btn-text">Leaderboard</span>
        </button>

        {/* Profile Card & Explicit Auth Buttons */}
        {userProfile && !userProfile.isGuest ? (
          <div
            onClick={onOpenProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--pill-bg)',
              border: '1px solid var(--border-card)',
              boxShadow: '0 4px 14px var(--card-shadow)',
              borderRadius: '12px',
              padding: '6px 12px',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.displayName}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid var(--accent-cyan)'
                }}
              />
              <span className="nav-btn-text" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {userProfile.displayName}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {userProfile && (
              <div
                onClick={onOpenProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--pill-bg)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)'
                }}
              >
                <User size={14} /> <span className="nav-btn-text">Guest: </span><strong style={{ color: 'var(--text-main)' }}>{userProfile.displayName}</strong>
              </div>
            )}
            <button
              onClick={() => onOpenAuth('login')}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px' }}
            >
              <LogIn size={15} /> <span className="nav-btn-text">Sign In</span>
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="btn-primary"
              style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px', backgroundColor: '#38bdf8' }}
            >
              <Sparkles size={15} /> <span className="nav-btn-text">Sign Up</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
