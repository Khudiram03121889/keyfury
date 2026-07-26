import React, { useState, useEffect } from 'react';
import { X, User, Trophy, Zap, Target, Flame, Palette, Edit2, Check, LogOut, History, Shield, Sparkles, Award, Lock, CheckCircle2, Download } from 'lucide-react';
import { UserProfile, MatchHistoryItem, updateUserProfile, getRecentGuestMatches, signOut, getUserAchievements, UserAchievement, DEFAULT_ACHIEVEMENTS, Achievement } from '../../lib/supabase';
import { RankBadge } from '../ranked/RankBadge';
import { RankTiersModal } from '../ranked/RankTiersModal';
import { downloadMatchCard } from '../../lib/downloadMatchCard';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated?: () => void;
  onUpgradeGuest?: () => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=ViperType',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NeonStrike',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberDash',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Warrior',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SwiftFalcon'
];

const THEME_OPTIONS = [
  // Top 5 Dark Themes
  { id: 'cyberpunk', name: 'Cyberpunk Neon', color: '#00ffcc', mode: 'dark' },
  { id: 'default', name: 'Classic Dark', color: '#818cf8', mode: 'dark' },
  { id: 'matrix', name: 'Terminal Green', color: '#00ff66', mode: 'dark' },
  { id: 'synthwave', name: 'Synthwave 80s', color: '#a855f7', mode: 'dark' },
  { id: 'dracula', name: 'Dracula Dark', color: '#bd93f9', mode: 'dark' },

  // Top 5 Light Themes
  { id: 'light_paper', name: 'Classic Light', color: '#2563eb', mode: 'light' },
  { id: 'light_nordic', name: 'Nordic Frost', color: '#0891b2', mode: 'light' },
  { id: 'light_sakura', name: 'Sakura Blossom', color: '#db2777', mode: 'light' },
  { id: 'light_latte', name: 'Matcha Latte', color: '#15803d', mode: 'light' },
  { id: 'light_sunset', name: 'Solar Sunset', color: '#ea580c', mode: 'light' }
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  onUpgradeGuest
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'customize' | 'history'>('overview');
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRankTiersModal, setShowRankTiersModal] = useState(false);
  const [achCategoryFilter, setAchCategoryFilter] = useState<'all' | 'combat' | 'speed' | 'ranked' | 'skill'>('all');

  // Edit fields
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.avatarUrl || PRESET_AVATARS[0]);
  const [selectedTheme, setSelectedTheme] = useState(userProfile?.keycapTheme || 'cyberpunk');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setBio(userProfile.bio);
      setSelectedAvatar(userProfile.avatarUrl);
      setSelectedTheme(userProfile.keycapTheme);
    }
  }, [userProfile]);

  useEffect(() => {
    if (isOpen && userProfile?.id) {
      setLoadingHistory(true);
      getRecentGuestMatches(userProfile.id).then((history) => {
        setMatchHistory(history);
        setLoadingHistory(false);
      });
      getUserAchievements(userProfile.id).then((achievements) => {
        setUserAchievements(achievements);
      });
    }
  }, [isOpen, userProfile?.id]);

  if (!isOpen || !userProfile) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateUserProfile(userProfile.id, {
      displayName,
      bio,
      avatarUrl: selectedAvatar,
      keycapTheme: selectedTheme
    });
    localStorage.setItem('keyfury_avatar', selectedAvatar);
    localStorage.setItem('keyfury_theme', selectedTheme);
    localStorage.setItem('keyfury_guest_name', displayName);
    document.documentElement.dataset.theme = selectedTheme;
    setSaving(false);
    setIsEditing(false);
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
    window.location.reload();
  };

  const winRate = userProfile.matchesPlayed > 0
    ? Math.round((userProfile.wins / userProfile.matchesPlayed) * 100)
    : 0;

  const unlockedCount = DEFAULT_ACHIEVEMENTS.filter((ach) =>
    userAchievements.some((ua) => ua.achievementId === ach.id && ua.unlocked)
  ).length;

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
          maxWidth: '720px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          boxShadow: '0 0 50px rgba(99, 102, 241, 0.25)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
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

        {/* Profile Card Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(236, 72, 153, 0.3))',
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <img
                src={selectedAvatar}
                alt={userProfile.displayName}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '2px solid #38bdf8',
                  padding: '3px',
                  boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
                  objectFit: 'cover'
                }}
              />
              {userProfile.isGuest && (
                <span style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  backgroundColor: '#fbbf24',
                  color: '#090d16',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}>
                  GUEST
                </span>
              )}
            </div>

            {/* Name & Bio */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {displayName || userProfile.displayName}
                </h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Edit2 size={14} /> {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '2px' }}>
                {bio || userProfile.bio || 'KeyFury competitive typist warrior.'}
              </p>
            </div>

            {/* Rank Badge Header (Clickable to view all Rank Tiers & Progression) */}
            <div
              onClick={() => setShowRankTiersModal(true)}
              title="Click to view all Rank Tiers & Progression"
              style={{
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              <RankBadge
                tier={userProfile.rankTier}
                rating={userProfile.mmr}
                size="lg"
                showLabel
                showRating
              />
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '3px solid #38bdf8' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'overview' ? '#f8fafc' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Trophy size={16} /> Overview
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              borderBottom: activeTab === 'achievements' ? '3px solid #38bdf8' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'achievements' ? '#f8fafc' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Award size={16} /> Achievements ({unlockedCount}/{DEFAULT_ACHIEVEMENTS.length})
          </button>
          <button
            onClick={() => setActiveTab('customize')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              borderBottom: activeTab === 'customize' ? '3px solid #38bdf8' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'customize' ? '#f8fafc' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Palette size={16} /> Theme
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #38bdf8' : '3px solid transparent',
              background: 'none',
              color: activeTab === 'history' ? '#f8fafc' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <History size={16} /> Match History
          </button>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Edit Form Popup */}
          {isEditing && (
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: '#38bdf8' }}>
                EDIT WARRIOR PROFILE
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                    Bio
                  </label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setIsEditing(false)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                  <Check size={14} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  backgroundColor: 'var(--pill-bg)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <Zap size={20} color="var(--accent-amber)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {userProfile.avgWpm}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>AVG WPM</div>
                </div>

                <div style={{
                  backgroundColor: 'var(--pill-bg)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <Flame size={20} color="var(--accent-pink)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {userProfile.peakWpm}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>PEAK WPM</div>
                </div>

                <div style={{
                  backgroundColor: 'var(--pill-bg)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <Target size={20} color="var(--accent-green)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {userProfile.accuracy}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACCURACY</div>
                </div>

                <div style={{
                  backgroundColor: 'var(--pill-bg)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '12px',
                  padding: '14px',
                  textAlign: 'center'
                }}>
                  <Trophy size={20} color="var(--accent-purple)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {winRate}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>WIN RATE</div>
                </div>
              </div>

              {/* Combat Record Card */}
              <div style={{
                backgroundColor: 'var(--pill-bg)',
                border: '1px solid var(--border-card)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                  MATCH RECORD & DISTRIBUTION
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Matches: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{userProfile.matchesPlayed}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#34d399' }}>Wins: </span>
                      <strong style={{ color: '#34d399' }}>{userProfile.wins}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#f43f5e' }}>Losses: </span>
                      <strong style={{ color: '#f43f5e' }}>{userProfile.losses}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#a855f7' }}>Bot Matches: </span>
                      <strong style={{ color: '#a855f7' }}>
                        {matchHistory.filter((item) => item.opponent_name?.toLowerCase().includes('bot')).length}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Progress bar ratio */}
                <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(244, 63, 94, 0.4)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${winRate}%`, height: '100%', backgroundColor: '#34d399', transition: 'width 0.5s ease' }} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All', icon: '🌟' },
                  { id: 'combat', label: 'Combat', icon: '🥊' },
                  { id: 'speed', label: 'Speed', icon: '⚡' },
                  { id: 'ranked', label: 'Ranked', icon: '🏆' },
                  { id: 'skill', label: 'Skill', icon: '🎯' }
                ].map((cat) => {
                  const count = cat.id === 'all' 
                    ? DEFAULT_ACHIEVEMENTS.length 
                    : DEFAULT_ACHIEVEMENTS.filter((a) => a.category === cat.id).length;
                  const isActive = achCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setAchCategoryFilter(cat.id as any)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: isActive ? '1px solid #38bdf8' : '1px solid var(--border-card)',
                        background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'var(--btn-sec-bg)',
                        color: isActive ? '#38bdf8' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span style={{
                        fontSize: '0.7rem',
                        opacity: 0.75,
                        backgroundColor: isActive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.08)',
                        padding: '1px 6px',
                        borderRadius: '10px'
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                {DEFAULT_ACHIEVEMENTS
                  .filter((ach) => achCategoryFilter === 'all' || ach.category === achCategoryFilter)
                  .map((ach) => {
                    const ua = userAchievements.find((a) => a.achievementId === ach.id);
                    const isUnlocked = ua ? ua.unlocked : false;
                    const progress = ua ? ua.progress : 0;
                    const pct = Math.min(100, Math.round((progress / ach.maxProgress) * 100));

                    return (
                      <div
                        key={ach.id}
                        style={{
                          backgroundColor: isUnlocked ? 'var(--pill-bg)' : 'var(--btn-sec-bg)',
                          border: isUnlocked ? '1px solid var(--accent-cyan)' : '1px solid var(--border-card)',
                          boxShadow: isUnlocked ? '0 0 16px var(--card-shadow)' : 'none',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{
                          fontSize: '1.6rem',
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          backgroundColor: isUnlocked ? 'rgba(56, 189, 248, 0.15)' : 'var(--pill-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: isUnlocked ? '1px solid var(--accent-cyan)' : '1px solid var(--border-card)',
                          flexShrink: 0,
                          opacity: isUnlocked ? 1 : 0.7
                        }}>
                          {ach.icon}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)' }}>
                                {ach.title}
                              </h4>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                                +{ach.rewardXp} XP
                              </span>
                            </div>
                            {isUnlocked ? (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                color: '#34d399',
                                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                              }}>
                                <CheckCircle2 size={12} /> UNLOCKED
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                flexShrink: 0
                              }}>
                                <Lock size={12} /> {progress} / {ach.maxProgress}
                              </span>
                            )}
                          </div>

                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {ach.description}
                          </p>

                          {!isUnlocked && (
                            <div style={{
                              width: '100%',
                              height: '5px',
                              backgroundColor: 'var(--border-card)',
                              borderRadius: '3px',
                              marginTop: '8px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                backgroundColor: 'var(--accent-cyan)',
                                borderRadius: '3px'
                              }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMIZE */}
          {activeTab === 'customize' && (
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '10px', color: '#f8fafc' }}>
                SELECT AVATAR
              </h4>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {PRESET_AVATARS.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Avatar ${idx}`}
                    onClick={() => setSelectedAvatar(url)}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      border: selectedAvatar === url ? '3px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: selectedAvatar === url ? '0 0 15px rgba(56, 189, 248, 0.5)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </div>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '10px', color: 'var(--accent-cyan)', letterSpacing: '0.5px' }}>
                🌙 DARK THEMES (TOP 5)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {THEME_OPTIONS.filter(t => t.mode === 'dark').map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    style={{
                      backgroundColor: 'var(--pill-bg)',
                      border: selectedTheme === theme.id ? `2px solid ${theme.color}` : '1px solid var(--border-card)',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: selectedTheme === theme.id ? `0 0 16px ${theme.color}40` : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: theme.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{theme.name}</span>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '10px', color: 'var(--accent-amber)', letterSpacing: '0.5px' }}>
                ☀️ LIGHT THEMES (TOP 5)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                {THEME_OPTIONS.filter(t => t.mode === 'light').map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    style={{
                      backgroundColor: 'var(--pill-bg)',
                      border: selectedTheme === theme.id ? `2px solid ${theme.color}` : '1px solid var(--border-card)',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: selectedTheme === theme.id ? `0 0 16px ${theme.color}40` : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: theme.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>{theme.name}</span>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                <Check size={18} /> {saving ? 'Saving Theme...' : 'Apply Cosmetics'}
              </button>
            </div>
          )}

          {/* TAB 3: MATCH HISTORY */}
          {activeTab === 'history' && (
            <div>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Loading match history...
                </div>
              ) : matchHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  No match history recorded yet. Enter Ranked Match to start competing!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                        <th style={{ padding: '8px 10px' }}>RESULT</th>
                        <th style={{ padding: '8px 10px' }}>OPPONENT</th>
                        <th style={{ padding: '8px 10px' }}>WPM</th>
                        <th style={{ padding: '8px 10px' }}>ACCURACY</th>
                        <th style={{ padding: '8px 10px' }}>HEALTH</th>
                        <th style={{ padding: '8px 10px' }}>DATE</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>CARD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchHistory.map((item, idx) => {
                        const isWin = String(item.result).toUpperCase() === 'WIN';
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{
                                backgroundColor: isWin ? 'rgba(52, 211, 153, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                                color: isWin ? '#34d399' : '#f43f5e',
                                fontWeight: 900,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem'
                              }}>
                                {isWin ? 'WIN' : 'LOSS'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', color: '#f8fafc', fontWeight: 700 }}>
                              {item.opponent_name?.toLowerCase().includes('bot') ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#a855f7', fontWeight: 800 }}>
                                  🤖 {item.opponent_name}
                                </span>
                              ) : (
                                item.opponent_name || 'Opponent Warrior'
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#fbbf24', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                              {item.accepted_wpm}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                              {item.accuracy}%
                            </td>
                            <td style={{ padding: '8px 10px', color: '#94a3b8' }}>
                              {item.final_health}%
                            </td>
                            <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.8rem' }}>
                              {new Date(item.joined_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              <button
                                onClick={() => downloadMatchCard({
                                  playerName: userProfile.displayName,
                                  playerAvatarUrl: userProfile.avatarUrl,
                                  playerTier: userProfile.rankTier,
                                  playerMmr: userProfile.mmr,
                                  mmrDelta: item.mmr_delta,
                                  opponentName: item.opponent_name || 'Opponent Warrior',
                                  isWinner: isWin,
                                  wpm: item.accepted_wpm,
                                  accuracy: item.accuracy,
                                  maxCombo: item.highest_combo || 0,
                                  finalHealth: item.final_health,
                                  wordsCompleted: item.words_completed || 0,
                                  matchId: item.match_id,
                                  joinedAt: item.joined_at
                                })}
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  color: '#38bdf8',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease'
                                }}
                                title="Download Match Certificate PNG"
                              >
                                <Download size={13} /> Card
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#f43f5e',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={16} /> Sign Out
          </button>

          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 18px', fontSize: '0.85rem' }}>
            Close
          </button>
        </div>
      </div>

      <RankTiersModal
        isOpen={showRankTiersModal}
        onClose={() => setShowRankTiersModal(false)}
        userMmr={userProfile.mmr}
        userTier={userProfile.rankTier}
      />
    </div>
  );
};

export default ProfileModal;
