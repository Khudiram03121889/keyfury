import React, { useState, useEffect } from 'react';
import { X, Search, Crown, RefreshCw, UserPlus, Sparkles } from 'lucide-react';
import { UserProfile, getGlobalLeaderboard } from '../../lib/supabase';
import { RankBadge, RankTier, getRankTier } from '../ranked/RankBadge';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile?: UserProfile | null;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

const TIER_FILTERS: Array<'All' | RankTier> = [
  'All',
  'Grandmaster',
  'Master',
  'Diamond',
  'Platinum',
  'Gold',
  'Silver',
  'Bronze'
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  onOpenAuth
}) => {
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<'All' | RankTier>('All');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getGlobalLeaderboard(100).then((data) => {
        setLeaderboard(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCurrentUserGuest = !currentUserProfile || currentUserProfile.isGuest;

  const sortedLeaderboard = [...leaderboard].sort((a, b) => (b.mmr ?? 1000) - (a.mmr ?? 1000));
  const filteredLeaderboard = sortedLeaderboard.filter((player) => {
    if (player.isGuest) return false;
    const matchesName = player.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    const derivedTier = getRankTier(player.mmr ?? 1000);
    const matchesTier = selectedTier === 'All' || player.rankTier === selectedTier || derivedTier === selectedTier;
    return matchesName && matchesTier;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(5, 7, 13, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          boxShadow: '0 0 50px rgba(251, 191, 36, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            zIndex: 10
          }}
        >
          <X size={22} />
        </button>

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(79, 70, 229, 0.15))',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Crown size={24} color="#fbbf24" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
              GLOBAL <span style={{ color: '#fbbf24' }}>LEADERBOARD</span>
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Top 100 KeyFury stick-fight typists worldwide, ranked by competitive ELO / MMR.
          </p>

          {/* Search & Tier Filters */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
              <img
                src="/logo.jpg"
                alt="KeyFury Search"
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                  border: '1px solid rgba(56, 189, 248, 0.4)'
                }}
              />
              <input
                type="text"
                placeholder="Search player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--btn-sec-bg)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '10px',
                  padding: '8px 12px 8px 38px',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Tier Filters */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', maxWidth: '100%' }}>
              {TIER_FILTERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  style={{
                    backgroundColor: selectedTier === t ? 'var(--accent-amber)' : 'var(--btn-sec-bg)',
                    color: selectedTier === t ? '#090d16' : 'var(--text-muted)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Table Container */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, overflowX: 'auto' }}>
          {isCurrentUserGuest && (
            <div style={{
              margin: '0 0 16px 0',
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(251, 191, 36, 0.12)',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.15)'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={16} /> Unranked Player Notice
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                  You are playing as an unranked guest. Unranked guest names are not listed on the public leaderboard. Create a registered account to claim your rank and get listed!
                </div>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    onClose();
                    onOpenAuth('register');
                  }}
                  style={{ padding: '8px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap', backgroundColor: '#fbbf24', color: '#090d16', fontWeight: 900 }}
                >
                  Create a Registered Account
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <RefreshCw size={24} className="spin" style={{ marginBottom: '12px' }} />
              <div>Fetching global rankings...</div>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              No warriors match the current search filter.
            </div>
          ) : (
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b', fontSize: '0.75rem', letterSpacing: '1px' }}>
                  <th style={{ padding: '10px 12px', width: '60px' }}>RANK</th>
                  <th style={{ padding: '10px 12px' }}>PLAYER</th>
                  <th style={{ padding: '10px 12px' }}>MMR / TIER</th>
                  <th style={{ padding: '10px 12px' }}>RECORD (W/L)</th>
                  <th style={{ padding: '10px 12px' }}>AVG WPM</th>
                  <th style={{ padding: '10px 12px' }}>ACCURACY</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaderboard.map((player, idx) => {
                  const rank = idx + 1;
                  const isCurrent = currentUserProfile?.id === player.id;
                  const winRate = player.matchesPlayed > 0
                    ? Math.round((player.wins / player.matchesPlayed) * 100)
                    : 0;

                  return (
                    <tr
                      key={player.id || idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: isCurrent
                          ? 'rgba(56, 189, 248, 0.15)'
                          : rank === 1
                          ? 'rgba(251, 191, 36, 0.08)'
                          : rank === 2
                          ? 'rgba(226, 232, 240, 0.06)'
                          : rank === 3
                          ? 'rgba(205, 127, 50, 0.06)'
                          : 'transparent',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      {/* Rank Position */}
                      <td style={{ padding: '10px 12px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                        {rank === 1 && <span style={{ fontSize: '1.1rem' }}>🥇</span>}
                        {rank === 2 && <span style={{ fontSize: '1.1rem' }}>🥈</span>}
                        {rank === 3 && <span style={{ fontSize: '1.1rem' }}>🥉</span>}
                        {rank > 3 && <span style={{ color: '#94a3b8' }}>#{rank}</span>}
                      </td>

                      {/* Player Info */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={player.avatarUrl}
                            alt={player.displayName}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              objectFit: 'cover'
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {player.displayName}
                              {isCurrent && (
                                <span style={{ backgroundColor: '#38bdf8', color: '#090d16', fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                                  YOU
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {player.bio || 'Warrior'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* MMR & Rank Badge */}
                      <td style={{ padding: '10px 12px' }}>
                        <RankBadge
                          tier={player.rankTier}
                          rating={player.mmr}
                          size="sm"
                          showLabel
                          showRating
                        />
                      </td>

                      {/* Record W / L */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                          {player.wins}W - {player.losses}L
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#34d399' }}>
                          {winRate}% Win Rate
                        </div>
                      </td>

                      {/* Avg WPM */}
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                        {player.avgWpm} WPM
                      </td>

                      {/* Accuracy */}
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                        {player.accuracy}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Leaderboard updates dynamically after every ranked match.
          </span>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 18px', fontSize: '0.85rem' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardModal;
