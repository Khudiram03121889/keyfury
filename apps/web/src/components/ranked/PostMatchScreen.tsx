import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Flame, Target, Zap, RotateCcw, Home, Award, ArrowUpRight, ArrowDownRight, ShieldCheck, Sparkles, CheckCircle2, Share2, Copy, Check, Download } from 'lucide-react';
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
  const initialMmr = (userProfile?.mmr ?? 1000) - mmrDelta;
  
  // Animated MMR delta counting effect
  const [displayedDelta, setDisplayedDelta] = useState(0);
  const [currentMmr, setCurrentMmr] = useState(initialMmr);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [copied, setCopied] = useState(false);

  const hasSavedRef = useRef(false);

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
        mmrDelta
      }).then(({ newAchievements }) => {
        if (newAchievements && newAchievements.length > 0) {
          setUnlockedAchievements(newAchievements);
        }
      });
    }
  }, [userProfile?.id, isWinner, playerStats, opponentStats, mmrDelta]);

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
      `⚔️ KEYFURY TYPING DUEL ⚔️`,
      `🏆 ${isWinner ? 'VICTORY' : 'DEFEAT'} vs ${opponentStats.displayName}`,
      `⚡ Speed: ${playerStats.wpm} WPM | Acc: ${playerStats.accuracy}%`,
      `💥 Max Combo: ${playerStats.maxCombo}x | Health: ${playerStats.finalHealth}%`,
      `🎯 Rank: ${currentTier} (${currentMmr} MMR)`,
      `Play free on PC: ${window.location.origin}`
    ].join('\n');

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

  const handleDownloadStatCard = () => {
    downloadMatchCard({
      playerName: playerStats.displayName,
      playerAvatarUrl: playerStats.avatarUrl,
      playerTier: currentTier,
      playerMmr: currentMmr,
      mmrDelta: displayedDelta,
      opponentName: opponentStats.displayName,
      opponentAvatarUrl: opponentStats.avatarUrl,
      isWinner,
      wpm: playerStats.wpm,
      accuracy: playerStats.accuracy,
      maxCombo: playerStats.maxCombo,
      finalHealth: playerStats.finalHealth,
      wordsCompleted: playerStats.wordsCompleted
    });
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
  }, [onPlayAgain, onReturnToLobby, playerStats, opponentStats, isWinner, currentTier, currentMmr, displayedDelta]);

  return (
    <div style={{
      maxWidth: '850px',
      margin: '0 auto',
      padding: '16px 20px',
      maxHeight: '100vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.5s ease'
    }}>
      {/* Achievement Unlocked Banner */}
      {unlockedAchievements.length > 0 && (
        <div style={{
          marginBottom: '12px',
          padding: '10px 16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(129, 140, 248, 0.3))',
          border: '2px solid #38bdf8',
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
          animation: 'pulse 3s infinite alternate'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#38bdf8" />
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '1px' }}>
              MILESTONE ACHIEVED!
            </span>
          </div>
          {unlockedAchievements.map((ach) => (
            <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc' }}>
              <span>{ach.icon}</span>
              <span>{ach.title}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({ach.description})</span>
            </div>
          ))}
        </div>
      )}

      {/* Promotion Banner */}
      {isPromoted && (
        <div style={{
          marginBottom: '12px',
          padding: '10px 16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(236, 72, 153, 0.3))',
          border: '2px solid #fbbf24',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          flexShrink: 0
        }}>
          <Award size={22} color="#fbbf24" />
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '1px' }}>
            🎉 PROMOTION UNLOCKED! ADVANCED TO {currentTier.toUpperCase()} TIER!
          </span>
        </div>
      )}

      {/* Result Banner */}
      <div className="glass-panel" style={{
        padding: '20px 24px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '16px',
        border: isWinner ? '2px solid rgba(52, 211, 153, 0.4)' : '2px solid rgba(244, 63, 94, 0.4)',
        boxShadow: isWinner ? '0 0 40px rgba(52, 211, 153, 0.25)' : '0 0 40px rgba(244, 63, 94, 0.25)',
        background: isWinner
          ? 'radial-gradient(circle at center, rgba(52, 211, 153, 0.15) 0%, rgba(15, 23, 42, 0.9) 70%)'
          : 'radial-gradient(circle at center, rgba(244, 63, 94, 0.15) 0%, rgba(15, 23, 42, 0.9) 70%)',
        flexShrink: 0
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '999px',
          backgroundColor: isWinner ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
          color: isWinner ? '#34d399' : '#f43f5e',
          fontSize: '0.75rem',
          fontWeight: 900,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          marginBottom: '8px'
        }}>
          {isWinner ? <Trophy size={14} /> : <Flame size={14} />}
          {isWinner ? 'RANKED VICTORY ACHIEVED' : 'MATCH DEFEAT'}
        </div>

        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: 900,
          letterSpacing: '-0.5px',
          color: isWinner ? '#34d399' : '#f43f5e',
          textShadow: isWinner ? '0 0 20px rgba(52, 211, 153, 0.5)' : '0 0 20px rgba(244, 63, 94, 0.5)',
          marginBottom: '12px'
        }}>
          {isWinner ? 'VICTORY!' : 'DEFEATED'}
        </h1>

        {/* Animated MMR Delta Box */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '12px',
          padding: '8px 18px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
        }}>
          <RankBadge tier={currentTier} rating={currentMmr} size="md" showLabel />
          
          <div style={{ height: '28px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>MMR:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
              {currentMmr}
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: 900,
              fontSize: '1rem',
              color: displayedDelta >= 0 ? '#34d399' : '#f43f5e',
              fontFamily: 'var(--font-mono)'
            }}>
              {displayedDelta >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {displayedDelta >= 0 ? `+${displayedDelta}` : displayedDelta}
            </span>
          </div>
        </div>

        {/* Rank Progress Bar */}
        <div style={{ margin: '14px auto 0 auto', maxWidth: '380px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
            <span>{currentTier} ({range.min} MMR)</span>
            <span>{progressPercent}% to {range.nextTier} ({range.max} MMR)</span>
          </div>
          <div style={{ width: '100%', height: '7px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
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
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px', flexShrink: 0 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="#38bdf8" /> STAT COMPARISON BREAKDOWN
        </h3>

        {/* Players Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: '12px', alignItems: 'center', marginBottom: '12px', textAlign: 'center' }}>
          <div style={{ textAlign: 'left', fontWeight: 800, fontSize: '0.95rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={playerStats.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Player'} alt="You" style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #38bdf8' }} />
            <span>{playerStats.displayName} (YOU)</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>METRIC</span>
          <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            <span>{opponentStats.displayName}</span>
            <img src={opponentStats.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Opponent'} alt="Opponent" style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #f43f5e' }} />
          </div>
        </div>

        {/* Comparison Bars */}
        {/* 1. SPEED (WPM) */}
        <StatRow
          label="TYPING SPEED"
          unit="WPM"
          val1={playerStats.wpm}
          val2={opponentStats.wpm}
          color1="#38bdf8"
          color2="#f43f5e"
        />

        {/* 2. ACCURACY */}
        <StatRow
          label="ACCURACY"
          unit="%"
          val1={playerStats.accuracy}
          val2={opponentStats.accuracy}
          color1="#34d399"
          color2="#fbbf24"
        />

        {/* 3. HIGHEST COMBO */}
        <StatRow
          label="MAX COMBO"
          unit="x"
          val1={playerStats.maxCombo}
          val2={opponentStats.maxCombo}
          color1="#818cf8"
          color2="#ec4899"
        />

        {/* 4. FINAL HEALTH */}
        <StatRow
          label="FINAL HEALTH"
          unit="%"
          val1={playerStats.finalHealth}
          val2={opponentStats.finalHealth}
          color1="#22c55e"
          color2="#ef4444"
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <button
          className="btn-primary"
          onClick={onPlayAgain}
          style={{ padding: '10px 24px', fontSize: '0.9rem', textTransform: 'uppercase' }}
        >
          <RotateCcw size={16} /> Rematch <span className="kbd-badge">Enter</span>
        </button>

        <button
          className="btn-secondary"
          onClick={handleDownloadStatCard}
          style={{
            padding: '10px 20px',
            fontSize: '0.9rem',
            borderColor: '#38bdf8',
            color: '#38bdf8'
          }}
        >
          <Download size={16} /> Download Card <span className="kbd-badge">D</span>
        </button>

        <button
          className="btn-secondary"
          onClick={handleCopyStatCard}
          style={{
            padding: '10px 20px',
            fontSize: '0.9rem',
            borderColor: copied ? '#34d399' : undefined,
            color: copied ? '#34d399' : undefined
          }}
        >
          {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Stats'} <span className="kbd-badge">C</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onReturnToLobby}
          style={{ padding: '10px 20px', fontSize: '0.9rem' }}
        >
          <Home size={16} /> Lobby <span className="kbd-badge">Esc</span>
        </button>

        {onViewProfile && (
          <button
            className="btn-secondary"
            onClick={onViewProfile}
            style={{ padding: '10px 18px', fontSize: '0.9rem' }}
          >
            <ShieldCheck size={16} /> Profile
          </button>
        )}
      </div>
    </div>
  );
}// Sub-component for individual stat comparison bar
const StatRow: React.FC<{
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
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800, marginBottom: '4px' }}>
        <span style={{ color: color1, fontFamily: 'var(--font-mono)' }}>{val1} {unit}</span>
        <span style={{ color: '#94a3b8', fontSize: '0.75rem', letterSpacing: '1px' }}>{label}</span>
        <span style={{ color: color2, fontFamily: 'var(--font-mono)' }}>{val2} {unit}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {/* Left player bar (growing left-to-right or right-to-left) */}
        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: `${p1Width}%`, height: '100%', backgroundColor: color1, borderRadius: '999px', transition: 'width 0.6s ease' }} />
        </div>

        {/* Right player bar */}
        <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${p2Width}%`, height: '100%', backgroundColor: color2, borderRadius: '999px', transition: 'width 0.6s ease' }} />
        </div>
      </div>
    </div>
  );
};

export default PostMatchScreen;
