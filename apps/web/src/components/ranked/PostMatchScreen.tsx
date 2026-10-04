import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Flame, Target, Zap, RotateCcw, Home, Award, ArrowUpRight, ArrowDownRight, ShieldCheck, Sparkles, Copy, Check, Download, Swords } from 'lucide-react';
import { RankBadge, getRankTier } from './RankBadge';
import { UserProfile, saveMatchStats, Achievement } from '../../lib/supabase';
import { soundManager } from '../../audio/SoundManager';
import { downloadMatchCard } from '../../lib/downloadMatchCard';

export interface MatchPlayerStats {
  displayName: string;
  avatarUrl?: string;
  wpm: number;
  accuracy: number;
  maxCombo: number;
  finalHealth: number;
  wordsCompleted: number;
  mmrDelta?: number;
  newMmr?: number;
}

export interface PostMatchScreenProps {
  isWinner: boolean;
  playerStats: MatchPlayerStats;
  opponentStats: MatchPlayerStats;
  userProfile?: UserProfile | null;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
  onViewProfile?: () => void;
}

export const PostMatchScreen: React.FC<PostMatchScreenProps> = ({
  isWinner,
  playerStats,
  opponentStats,
  userProfile,
  onPlayAgain,
  onReturnToLobby,
  onViewProfile
}) => {
  const mmrDelta = playerStats.mmrDelta ?? (isWinner ? 24 : -16);
  const startingMmr = Math.max(0, (userProfile?.mmr ?? 1000));
  const finalMmr = playerStats.newMmr !== undefined
    ? Math.max(0, playerStats.newMmr)
    : Math.max(0, startingMmr + mmrDelta);
  const initialMmr = playerStats.newMmr !== undefined
    ? Math.max(0, playerStats.newMmr - mmrDelta)
    : startingMmr;
  
  // Animated MMR delta counting effect
  const [displayedDelta, setDisplayedDelta] = useState(0);
  const [currentMmr, setCurrentMmr] = useState(initialMmr);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const hasSavedRef = useRef(false);

  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 768;

  useEffect(() => {
    let step = 0;
    const totalSteps = 25;
    const targetDelta = mmrDelta;
    
    const interval = setInterval(() => {
      step++;
      const progress = Math.min(step / totalSteps, 1);
      const currentVal = Math.round(targetDelta * progress);
      setDisplayedDelta(currentVal);
      setCurrentMmr(initialMmr + currentVal);

      if (step >= totalSteps) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [mmrDelta, initialMmr]);

  // Save detailed stats & check achievements strictly ONCE per match
  useEffect(() => {
    const targetId = userProfile?.id || localStorage.getItem('keyfury_guest_id');
    if (targetId && !hasSavedRef.current) {
      hasSavedRef.current = true;
      saveMatchStats(targetId, {
        result: isWinner ? 'WIN' : 'LOSS',
        wpm: playerStats.wpm,
        accuracy: playerStats.accuracy,
        maxCombo: playerStats.maxCombo,
        finalHealth: playerStats.finalHealth,
        wordsCompleted: playerStats.wordsCompleted,
        opponentName: opponentStats.displayName,
        mmrDelta,
        finalMmr
      }).then(({ newAchievements }) => {
        if (newAchievements && newAchievements.length > 0) {
          setUnlockedAchievements(newAchievements);
        }
      });
    }
  }, [userProfile?.id, isWinner, playerStats, opponentStats, mmrDelta, finalMmr]);

  const initialTier = getRankTier(initialMmr);
  const currentTier = getRankTier(currentMmr);
  const isPromoted = isWinner && currentTier !== initialTier;

  // Rank progress calculation
  const getTierRange = (rating: number) => {
    if (rating >= 3200) return { min: 3200, max: 4000, nextTier: 'Grandmaster (Max)' };
    if (rating >= 2800) return { min: 2800, max: 3200, nextTier: 'Grandmaster' };
    if (rating >= 2400) return { min: 2400, max: 2800, nextTier: 'Master' };
    if (rating >= 2000) return { min: 2000, max: 2400, nextTier: 'Diamond' };
    if (rating >= 1600) return { min: 1600, max: 2000, nextTier: 'Platinum' };
    if (rating >= 1200) return { min: 1200, max: 1600, nextTier: 'Gold' };
    return { min: 0, max: 1200, nextTier: 'Silver' };
  };

  const range = getTierRange(currentMmr);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((currentMmr - range.min) / (range.max - range.min)) * 100)));

  const handleCopyStatCard = () => {
    soundManager.playClick();
    const statText = [
      `⚔️ KEYFURY TYPING DUEL (keyfury.in) ⚔️`,
      `🏆 ${isWinner ? 'VICTORY' : 'DEFEAT'} vs ${opponentStats.displayName}`,
      `⚡ Speed: ${playerStats.wpm} WPM | Acc: ${playerStats.accuracy}%`,
      `💥 Max Combo: ${playerStats.maxCombo}x | Health: ${playerStats.finalHealth}%`,
      `🎯 Rank: ${getRankTier(finalMmr)} (${finalMmr} MMR)`,
      unlockedAchievements.length > 0
        ? `🌟 Unlocked: ${unlockedAchievements.map(a => `${a.icon} ${a.title}`).join(', ')}`
        : '',
      `Play free on PC & Mobile: https://keyfury.in`
    ].filter(Boolean).join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(statText);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = statText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadStatCard = async () => {
    setIsDownloading(true);
    try {
      await downloadMatchCard({
        playerName: playerStats.displayName,
        playerAvatarUrl: playerStats.avatarUrl,
        playerTier: getRankTier(finalMmr),
        playerMmr: finalMmr,
        mmrDelta: mmrDelta,
        opponentName: opponentStats.displayName,
        opponentAvatarUrl: opponentStats.avatarUrl,
        isWinner,
        wpm: playerStats.wpm,
        accuracy: playerStats.accuracy,
        maxCombo: playerStats.maxCombo,
        finalHealth: playerStats.finalHealth,
        wordsCompleted: playerStats.wordsCompleted,
        unlockedAchievements: unlockedAchievements.map((a) => ({
          id: a.id,
          title: a.title,
          icon: a.icon,
          description: a.description
        }))
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Keyboard-first hotkeys on PostMatchScreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onPlayAgain();
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDownloadStatCard();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyStatCard();
      } else if (e.key.toLowerCase() === 'm') {
        soundManager.toggleMuted();
      } else if (e.key === 'Escape') {
        onReturnToLobby();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayAgain, onReturnToLobby, playerStats, opponentStats, isWinner, currentTier, currentMmr, displayedDelta, unlockedAchievements]);

  return (
    <div style={{
      width: '100%',
      maxWidth: '1180px',
      margin: '0 auto',
      padding: isMobile ? '12px 12px 48px' : '10px 16px',
      boxSizing: 'border-box',
      minHeight: isMobile ? 'calc(100vh - 70px)' : 'calc(100vh - 82px)',
      height: isMobile ? 'auto' : 'calc(100vh - 82px)',
      maxHeight: isMobile ? 'none' : 'calc(100vh - 82px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: isMobile ? 'flex-start' : 'center',
      overflow: isMobile ? 'visible' : 'hidden',
      animation: 'fadeIn 0.4s ease'
    }}>
      {/* Main Responsive Dashboard: Single column on mobile, 2-column on desktop */}
      <div style={{
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column' : undefined,
        gridTemplateColumns: isMobile ? undefined : 'minmax(0, 1.45fr) minmax(0, 0.95fr)',
        gap: isMobile ? '12px' : '14px',
        alignItems: 'stretch',
        height: isMobile ? 'auto' : '100%',
        maxHeight: isMobile ? 'none' : '100%',
        boxSizing: 'border-box'
      }}>
        {/* ================= LEFT COLUMN: MATCH STATS & OUTCOME HUD ================= */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '12px' : '10px',
          height: isMobile ? 'auto' : '100%',
          overflow: isMobile ? 'visible' : 'hidden'
        }}>
          {/* Victory / Defeat Hero Banner */}
          <div className="glass-panel" style={{
            padding: isMobile ? '14px 16px' : '12px 18px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            border: isWinner ? '2px solid rgba(52, 211, 153, 0.4)' : '2px solid rgba(244, 63, 94, 0.4)',
            boxShadow: isWinner ? '0 0 35px rgba(52, 211, 153, 0.2)' : '0 0 35px rgba(244, 63, 94, 0.2)',
            background: isWinner
              ? 'radial-gradient(circle at center, rgba(52, 211, 153, 0.12) 0%, rgba(15, 23, 42, 0.92) 75%)'
              : 'radial-gradient(circle at center, rgba(244, 63, 94, 0.12) 0%, rgba(15, 23, 42, 0.92) 75%)',
            flexShrink: 0,
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: isWinner ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                color: isWinner ? '#34d399' : '#f43f5e',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.8px',
                textTransform: 'uppercase'
              }}>
                {isWinner ? <Trophy size={13} /> : <Flame size={13} />}
                {isWinner ? 'RANKED VICTORY' : 'MATCH DEFEAT'}
              </div>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                1v1 COMPETITIVE DUEL
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
              {/* Outcome Title */}
              <h1 style={{
                fontSize: isMobile ? '2.1rem' : 'clamp(1.6rem, 3.2vw, 2.3rem)',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                margin: 0,
                lineHeight: 1.1,
                color: isWinner ? '#34d399' : '#f43f5e',
                textShadow: isWinner ? '0 0 20px rgba(52, 211, 153, 0.5)' : '0 0 20px rgba(244, 63, 94, 0.5)'
              }}>
                {isWinner ? 'VICTORY!' : 'DEFEATED'}
              </h1>

              {/* Compact MMR Delta Box */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: isMobile ? '5px 12px' : '4px 10px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}>
                <RankBadge tier={currentTier} rating={currentMmr} size="sm" showLabel />
                
                <div style={{ height: '18px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>MMR:</span>
                  <span style={{ fontSize: '0.98rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                    {currentMmr}
                  </span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    color: displayedDelta >= 0 ? '#34d399' : '#f43f5e',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {displayedDelta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {displayedDelta >= 0 ? `+${displayedDelta}` : displayedDelta}
                  </span>
                </div>
              </div>
            </div>

            {/* Rank Progress Bar */}
            <div style={{ marginTop: '8px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, marginBottom: '3px' }}>
                <span>{currentTier} ({range.min} MMR)</span>
                <span>{progressPercent}% to {range.nextTier} ({range.max} MMR)</span>
              </div>
              <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38bdf8, #34d399)',
                  borderRadius: '999px',
                  transition: 'width 0.8s ease-out'
                }} />
              </div>
            </div>
          </div>

          {/* Stat Comparison Section */}
          <div className="glass-panel" style={{
            padding: isMobile ? '14px 16px' : '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: isMobile ? '12px' : undefined,
            flex: isMobile ? 'none' : 1,
            borderRadius: '16px',
            overflow: isMobile ? 'visible' : 'hidden'
          }}>
            {/* Players Head-to-Head Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              gap: '8px',
              alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '4px'
            }}>
              <div style={{ textAlign: 'left', fontWeight: 800, fontSize: isMobile ? '0.86rem' : '0.82rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <img
                  src={playerStats.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Player'}
                  alt="You"
                  style={{ width: '24px', height: '24px', borderRadius: '5px', border: '1px solid #38bdf8', flexShrink: 0 }}
                />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playerStats.displayName} (YOU)</span>
              </div>

              <div style={{
                fontSize: '0.68rem',
                color: '#64748b',
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.05)'
              }}>
                VS
              </div>

              <div style={{ textAlign: 'right', fontWeight: 800, fontSize: isMobile ? '0.86rem' : '0.82rem', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', overflow: 'hidden' }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opponentStats.displayName}</span>
                <img
                  src={opponentStats.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Opponent'}
                  alt="Opponent"
                  style={{ width: '24px', height: '24px', borderRadius: '5px', border: '1px solid #f43f5e', flexShrink: 0 }}
                />
              </div>
            </div>

            {/* 4 Sleek Comparative Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '8px', margin: isMobile ? '4px 0' : 'auto 0' }}>
              {/* 1. SPEED (WPM) */}
              <CompactStatRow
                label="TYPING SPEED"
                unit="WPM"
                val1={playerStats.wpm}
                val2={opponentStats.wpm}
                color1="#38bdf8"
                color2="#f43f5e"
              />

              {/* 2. ACCURACY */}
              <CompactStatRow
                label="ACCURACY"
                unit="%"
                val1={playerStats.accuracy}
                val2={opponentStats.accuracy}
                color1="#34d399"
                color2="#fbbf24"
              />

              {/* 3. HIGHEST COMBO */}
              <CompactStatRow
                label="MAX COMBO"
                unit="x"
                val1={playerStats.maxCombo}
                val2={opponentStats.maxCombo}
                color1="#818cf8"
                color2="#ec4899"
              />

              {/* 4. FINAL HEALTH */}
              <CompactStatRow
                label="FINAL HEALTH"
                unit="%"
                val1={playerStats.finalHealth}
                val2={opponentStats.finalHealth}
                color1="#22c55e"
                color2="#ef4444"
              />
            </div>

            {/* Bottom Quick Metric Pills */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '8px',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem'
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>Words Typed:</span>
                <span style={{ color: '#fbbf24', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{playerStats.wordsCompleted}</span>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '8px',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.74rem'
              }}>
                <span style={{ color: '#94a3b8', fontWeight: 700 }}>Opponent Words:</span>
                <span style={{ color: '#f43f5e', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{opponentStats.wordsCompleted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: MATCH ACTIONS & RESULT CARD HUB ================= */}
        <div className="glass-panel" style={{
          padding: isMobile ? '16px' : '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '12px' : undefined,
          justifyContent: isMobile ? 'flex-start' : 'space-between',
          borderRadius: '16px',
          height: isMobile ? 'auto' : '100%',
          overflow: isMobile ? 'visible' : 'hidden',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          {/* Top Brand Header - only on desktop since mobile already has Navbar */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/logo.jpg"
                  alt="Key Fury Logo"
                  style={{ width: '24px', height: '24px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #38bdf8' }}
                />
                <span style={{ fontWeight: 900, fontSize: '0.92rem', color: '#f8fafc', letterSpacing: '-0.3px' }}>
                  KEY <span style={{ color: '#38bdf8' }}>FURY</span>
                </span>
              </div>
              <a
                href="https://keyfury.in"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}
              >
                keyfury.in
              </a>
            </div>
          )}

          {/* Unlocked Achievements & Promotion Banner */}
          {(unlockedAchievements.length > 0 || isPromoted) && (
            <div style={{
              padding: isMobile ? '12px 14px' : '10px 12px',
              borderRadius: '12px',
              background: isPromoted
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(236, 72, 153, 0.18))'
                : 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(129, 140, 248, 0.18))',
              border: isPromoted ? '1.5px solid rgba(251, 191, 36, 0.6)' : '1.5px solid rgba(56, 189, 248, 0.6)',
              boxShadow: isPromoted ? '0 0 16px rgba(251, 191, 36, 0.25)' : '0 0 16px rgba(56, 189, 248, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 900, color: isPromoted ? '#fbbf24' : '#38bdf8' }}>
                  <Sparkles size={15} />
                  <span>{isPromoted ? 'TIER PROMOTION!' : 'ACHIEVEMENTS UNLOCKED!'}</span>
                </div>
                {unlockedAchievements.length > 0 && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                    +{unlockedAchievements.length} Unlocked
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {unlockedAchievements.map((ach) => (
                  <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#f8fafc', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 8px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{ach.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontWeight: 800, color: '#f1f5f9' }}>{ach.title}</span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.2 }}>{ach.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Hub Buttons Stack */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? '10px' : '8px',
            margin: isMobile ? '0' : 'auto 0'
          }}>
            {/* Primary Action: REMATCH */}
            <button
              className="btn-primary"
              onClick={onPlayAgain}
              style={{
                width: '100%',
                padding: isMobile ? '14px 18px' : '11px 16px',
                fontSize: isMobile ? '1rem' : '0.92rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                justifyContent: 'center',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #6366f1 100%)',
                boxShadow: '0 4px 20px rgba(56, 189, 248, 0.4)'
              }}
            >
              <RotateCcw size={17} /> Play Again / Rematch {!isMobile && <span className="kbd-badge" style={{ background: 'rgba(0, 0, 0, 0.25)', color: '#fff' }}>Enter</span>}
            </button>

            {/* Result Card Download Button */}
            <button
              className="btn-secondary"
              onClick={handleDownloadStatCard}
              disabled={isDownloading}
              style={{
                width: '100%',
                padding: isMobile ? '12px 16px' : '10px 14px',
                fontSize: isMobile ? '0.92rem' : '0.88rem',
                fontWeight: 800,
                borderColor: '#38bdf8',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                justifyContent: 'center',
                borderRadius: '12px',
                cursor: isDownloading ? 'wait' : 'pointer'
              }}
            >
              <Download size={16} /> {isDownloading ? 'Downloading PNG...' : 'Download Result Card (PNG)'} {!isMobile && <span className="kbd-badge">D</span>}
            </button>

            {/* Quick Copy Stats Text */}
            <button
              className="btn-secondary"
              onClick={handleCopyStatCard}
              style={{
                width: '100%',
                padding: isMobile ? '11px 16px' : '9px 14px',
                fontSize: isMobile ? '0.88rem' : '0.84rem',
                fontWeight: 700,
                borderColor: copied ? '#34d399' : 'rgba(255, 255, 255, 0.15)',
                color: copied ? '#34d399' : '#f8fafc',
                justifyContent: 'center',
                borderRadius: '12px'
              }}
            >
              {copied ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
              {copied ? 'Stats Copied to Clipboard!' : 'Copy Match Summary'} {!isMobile && <span className="kbd-badge">C</span>}
            </button>

            {/* Navigation Group: Lobby & Profile */}
            <div style={{ display: 'grid', gridTemplateColumns: onViewProfile ? '1fr 1fr' : '1fr', gap: '8px' }}>
              <button
                className="btn-secondary"
                onClick={onReturnToLobby}
                style={{
                  padding: isMobile ? '12px' : '9px 12px',
                  fontSize: isMobile ? '0.88rem' : '0.82rem',
                  fontWeight: 700,
                  justifyContent: 'center',
                  borderRadius: '10px'
                }}
              >
                <Home size={15} /> Lobby {!isMobile && <span className="kbd-badge">Esc</span>}
              </button>

              {onViewProfile && (
                <button
                  className="btn-secondary"
                  onClick={onViewProfile}
                  style={{
                    padding: isMobile ? '12px' : '9px 12px',
                    fontSize: isMobile ? '0.88rem' : '0.82rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    borderRadius: '10px'
                  }}
                >
                  <ShieldCheck size={15} /> Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual stat comparison bar (compact layout)
const CompactStatRow: React.FC<{
  label: string;
  unit: string;
  val1: number;
  val2: number;
  color1: string;
  color2: string;
}> = ({ label, unit, val1, val2, color1, color2 }) => {
  const max = Math.max(val1, val2, 1);
  const p1Width = Math.round((val1 / max) * 100);
  const p2Width = Math.round((val2 / max) * 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '3px' }}>
        <span style={{ color: color1, fontFamily: 'var(--font-mono)' }}>{val1} {unit}</span>
        <span style={{ color: '#94a3b8', fontSize: '0.7rem', letterSpacing: '0.8px' }}>{label}</span>
        <span style={{ color: color2, fontFamily: 'var(--font-mono)' }}>{val2} {unit}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {/* Left player bar (growing right-to-left) */}
        <div style={{ width: '100%', height: '7px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: `${p1Width}%`, height: '100%', backgroundColor: color1, borderRadius: '999px', transition: 'width 0.6s ease' }} />
        </div>

        {/* Right player bar (growing left-to-right) */}
        <div style={{ width: '100%', height: '7px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${p2Width}%`, height: '100%', backgroundColor: color2, borderRadius: '999px', transition: 'width 0.6s ease' }} />
        </div>
      </div>
    </div>
  );
};

export default PostMatchScreen;
