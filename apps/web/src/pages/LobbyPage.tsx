import React, { useState, useEffect } from 'react';
import { Room } from 'colyseus.js';
import { Users, Link, Copy, Check, ArrowLeft, RefreshCw, AlertCircle, Wifi, WifiOff, LogIn, Bot, Swords, Sparkles, MapPin, Compass } from 'lucide-react';
import { joinQuickQueue, createChallengeRoom, joinChallengeRoom, startBotDuel, fetchLiveServerStats } from '../lib/colyseus';
import { GuestProfile, UserProfile, getSavedSelectedCharacter, saveSelectedCharacter, getSavedSelectedArena, saveSelectedArena, updateUserProfile } from '../lib/supabase';
import { soundManager } from '../audio/SoundManager';
import { QueueTimeoutModal } from '../components/matchmaking/QueueTimeoutModal';
import { CharacterSelectModal } from '../components/character/CharacterSelectModal';
import { ArenaSelectModal } from '../components/arena/ArenaSelectModal';
import { getCharacterDefinition, CharacterId, DEFAULT_CHARACTER_ID, getArenaDefinition, ArenaId, DEFAULT_ARENA_ID } from '@keyfury/game-core';
import { CHARACTER_PORTRAITS } from '../assets/characters';
import { ARENA_BACKGROUNDS } from '../assets/arenas';

interface LobbyPageProps {
  guest: GuestProfile;
  userProfile?: UserProfile | null;
  initialRoomCode?: string;
  onMatchStart: (room: Room) => void;
  onBackToLanding: () => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({
  guest,
  userProfile,
  initialRoomCode,
  onMatchStart,
  onBackToLanding,
  onOpenAuth
}) => {
  const activeUser = (userProfile && !userProfile.isGuest) ? userProfile : (userProfile || guest);

  const [mode, setMode] = useState<'select' | 'quick' | 'challenge' | 'bot'>(initialRoomCode ? 'challenge' : 'select');
  const [queueType] = useState<'casual' | 'ranked'>('ranked');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>(() => activeUser.selectedCharacter || activeUser.characterId || getSavedSelectedCharacter());
  const [selectedArena, setSelectedArena] = useState<ArenaId>(() => getSavedSelectedArena());
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState<boolean>(false);
  const [isArenaModalOpen, setIsArenaModalOpen] = useState<boolean>(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode || '');
  const [inputCode, setInputCode] = useState<string>('');
  const [queueElapsed, setQueueElapsed] = useState<number>(0);
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [serverWarming, setServerWarming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Reconnecting' | 'Connection lost'>('Connected');

  // Synchronize character if activeUser profile updates
  useEffect(() => {
    if (activeUser.selectedCharacter || activeUser.characterId) {
      setSelectedCharacter(activeUser.selectedCharacter || activeUser.characterId || DEFAULT_CHARACTER_ID);
    }
  }, [activeUser.selectedCharacter, activeUser.characterId]);

  const handleCharacterSelect = (newCharId: CharacterId) => {
    setSelectedCharacter(newCharId);
    saveSelectedCharacter(newCharId);
    updateUserProfile({
      id: activeUser.id,
      selectedCharacter: newCharId,
      characterId: newCharId
    });
  };

  const handleArenaSelect = (newArenaId: ArenaId) => {
    setSelectedArena(newArenaId);
    saveSelectedArena(newArenaId);
  };

  // Real live online server stats state
  const [liveStats, setLiveStats] = useState<{ onlineWarriors: number; activeDuels: number }>({
    onlineWarriors: 1,
    activeDuels: 0
  });

  useEffect(() => {
    const updateStats = async () => {
      const stats = await fetchLiveServerStats();
      setLiveStats(stats);
    };
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto join challenge room if URL parameter present
  useEffect(() => {
    if (initialRoomCode && !room) {
      handleJoinChallenge(initialRoomCode);
    }
  }, [initialRoomCode]);

  // Dynamic tolerance calculations per R3 requirements
  const mmrTolerance = Math.min(1000, 100 + Math.floor(queueElapsed / 3) * 50);
  const levelTolerance = Math.min(10, 2 + Math.floor(queueElapsed / 3) * 1);

  // Quick Queue Wait Timer with 20.0s strict timeout
  useEffect(() => {
    let timer: any;
    if (mode === 'quick' && !opponentName) {
      timer = setInterval(() => {
        setQueueElapsed((prev) => {
          if (prev >= 19) {
            // Strict 20s timeout reached: disconnect from room and trigger QueueTimeoutModal
            if (room) {
              room.leave();
              setRoom(null);
            }
            setMode('select');
            setShowTimeoutModal(true);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setQueueElapsed(0);
    }
    return () => clearInterval(timer);
  }, [mode, opponentName, room]);

  const [botDifficulty, setBotDifficulty] = useState<'novice' | 'fighter' | 'pro' | 'adaptive'>('adaptive');

  const handleQuickDuel = async () => {
    if (activeUser.isGuest && queueType === 'ranked') {
      if (onOpenAuth) onOpenAuth('register');
      return;
    }

    setMode('quick');
    setErrorMsg(null);
    setServerWarming(true);

    try {
      const rm = await joinQuickQueue(activeUser.id, activeUser.displayName, activeUser.mmr, selectedCharacter, selectedArena);
      setServerWarming(false);
      attachRoomListeners(rm);
    } catch (_err: any) {
      setServerWarming(false);
      setErrorMsg('Matchmaking server connection timed out. Please click retry.');
    }
  };

  const handleBotDuel = async (chosenDiff: 'novice' | 'fighter' | 'pro' | 'adaptive') => {
    setMode('bot');
    setErrorMsg(null);
    setServerWarming(true);

    try {
      const rm = await startBotDuel(activeUser.id, activeUser.displayName, chosenDiff, activeUser.mmr, selectedCharacter, selectedArena);
      setServerWarming(false);
      attachRoomListeners(rm);
    } catch (_err: any) {
      setServerWarming(false);
      setErrorMsg('Failed to initialize AI Bot arena. Please try again.');
    }
  };

  const handleStartBotFromTimeout = async (chosenDiff: 'novice' | 'fighter' | 'pro' | 'adaptive') => {
    setShowTimeoutModal(false);
    setMode('bot');
    setErrorMsg(null);
    setServerWarming(true);

    try {
      const rm = await startBotDuel(activeUser.id, activeUser.displayName, chosenDiff, activeUser.mmr, selectedCharacter, selectedArena);
      setServerWarming(false);
      attachRoomListeners(rm);
      rm.send('ready', {});
    } catch (_err: any) {
      setServerWarming(false);
      setErrorMsg('Failed to initialize AI Bot arena. Please try again.');
    }
  };

  const handleRequeueFromTimeout = () => {
    setShowTimeoutModal(false);
    handleQuickDuel();
  };

  const handleBackToLobbyFromTimeout = () => {
    setShowTimeoutModal(false);
    if (room) {
      room.leave();
      setRoom(null);
    }
    setMode('select');
    setOpponentName(null);
    setIsReady(false);
  };


  const handleCreateChallenge = async () => {
    setMode('challenge');
    setErrorMsg(null);
    setServerWarming(true);

    try {
      const rm = await createChallengeRoom(activeUser.id, activeUser.displayName, activeUser.mmr, selectedCharacter, selectedArena);
      setServerWarming(false);
      setRoomCode(rm.id);
      attachRoomListeners(rm);
    } catch (_err: any) {
      setServerWarming(false);
      setErrorMsg('Failed to create private challenge arena.');
    }
  };

  const handleJoinChallenge = async (codeToJoin?: string) => {
    const cleanCode = (codeToJoin || inputCode).trim();
    if (!cleanCode) {
      setErrorMsg('Please enter a valid 6-character room code.');
      return;
    }

    setMode('challenge');
    setErrorMsg(null);
    setServerWarming(true);

    try {
      const rm = await joinChallengeRoom(cleanCode, activeUser.id, activeUser.displayName, activeUser.mmr, selectedCharacter);
      setServerWarming(false);
      setRoomCode(cleanCode);
      attachRoomListeners(rm);
    } catch (_err: any) {
      setServerWarming(false);
      setErrorMsg('Room not found or game has already started.');
    }
  };

  const handleJoinSubmittedCode = () => {
    if (inputCode.trim()) {
      handleJoinChallenge(inputCode);
    }
  };

  const attachRoomListeners = (rm: Room) => {
    setRoom(rm);

    rm.onStateChange((state: any) => {
      if (
        state.status === 'countdown' ||
        state.status === 'in_progress' ||
        state.status === 'in_game' ||
        state.status === 'fighting'
      ) {
        onMatchStart(rm);
      }

      if (state.players) {
        const playerMap = state.players instanceof Map ? state.players : (state.players.toJSON ? state.players.toJSON() : state.players);
        const keys = playerMap instanceof Map ? Array.from(playerMap.keys()) : Object.keys(playerMap);
        keys.forEach((sessionId) => {
          if (sessionId !== rm.sessionId) {
            const p = playerMap instanceof Map ? playerMap.get(sessionId) : playerMap[sessionId];
            if (p) setOpponentName(p.displayName || 'Opponent Warrior');
          }
        });
      }
    });

    rm.onMessage('server_event', (event: any) => {
      if (event?.type === 'match_start') {
        onMatchStart(rm);
      }
    });

    rm.onMessage('opponent_joined', (data: { name: string }) => {
      setOpponentName(data.name);
      soundManager.playVictory();
    });

    rm.onLeave(() => {
      setConnectionStatus('Connection lost');
    });

    rm.onError((code, message) => {
      setErrorMsg(`Game server error (${code}): ${message}`);
    });
  };

  const handleLeaveQueue = () => {
    soundManager.playClick();
    if (room) {
      room.leave();
      setRoom(null);
    }
    setMode('select');
    setOpponentName(null);
    setIsReady(false);
  };

  const handleCopyCode = () => {
    soundManager.playClick();
    const shareableUrl = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleReady = () => {
    if (room) {
      const newReady = !isReady;
      setIsReady(newReady);
      room.send('ready', {});
    }
  };

  const copyChallengeUrl = handleCopyCode;
  const cancelLobby = handleLeaveQueue;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        soundManager.playClick();
        if (mode === 'select') {
          handleQuickDuel();
        } else if (room) {
          toggleReady();
        }
      } else if (e.key === 'Escape') {
        if (mode !== 'select') {
          handleLeaveQueue();
        } else {
          onBackToLanding();
        }
      } else if (e.key.toLowerCase() === 'm') {
        soundManager.toggleMuted();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, room, isReady, handleQuickDuel, toggleReady, handleLeaveQueue, onBackToLanding]);

  return (
    <div className="lobby-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <button
          className="btn-secondary"
          onClick={() => {
            soundManager.playClick();
            onBackToLanding();
          }}
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Home
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="glass-panel" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            {connectionStatus === 'Connected' ? (
              <>
                <Wifi size={14} color="#34d399" />
                <span style={{ color: '#34d399', fontWeight: 600 }}>Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={14} color="#f43f5e" />
                <span style={{ color: '#f43f5e', fontWeight: 600 }}>{connectionStatus}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Real Active Player Counter Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '14px',
        padding: '10px 16px',
        marginBottom: '20px',
        fontSize: '0.82rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontWeight: 800 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399', boxShadow: '0 0 10px #34d399', display: 'inline-block' }} />
          <span>{liveStats.onlineWarriors} {liveStats.onlineWarriors === 1 ? 'WARRIOR' : 'WARRIORS'} ONLINE</span>
        </div>
        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.1)', display: 'inline-block' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 800 }}>
          <Swords size={15} />
          <span>{liveStats.activeDuels} ACTIVE RANKED {liveStats.activeDuels === 1 ? 'DUEL' : 'DUELS'}</span>
        </div>
      </div>

      {/* Active Champion & Active Arena Selection Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        {/* Active Champion Lobby Banner */}
        {(() => {
          const activeFighter = getCharacterDefinition(selectedCharacter);
          const portraitSrc = CHARACTER_PORTRAITS[activeFighter.id] || `/assets/characters/${activeFighter.portraitAssetKey}.svg`;
          const ARCHETYPE_ICONS: Record<string, string> = {
            shadow_ronin: '⚔️',
            cyber_valkyrie: '🥊',
            volt_shinobi: '⚡',
            void_assassin: '🗡️'
          };
          const archetypeIcon = ARCHETYPE_ICONS[activeFighter.id] || '⚔️';

          return (
            <div
              className="glass-panel"
              onClick={() => {
                soundManager.playClick();
                setIsCharacterModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: '14px',
                cursor: 'pointer',
                border: `1px solid ${activeFighter.theme.primaryColor}88`,
                boxShadow: `0 0 20px ${activeFighter.theme.glowColor}`,
                background: `linear-gradient(135deg, ${activeFighter.theme.primaryColor}18 0%, rgba(15, 23, 42, 0.85) 100%)`,
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(10, 15, 26, 0.8)',
                  border: `1px solid ${activeFighter.theme.primaryColor}`,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={portraitSrc}
                    alt={activeFighter.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: '0.72rem',
                    color: activeFighter.theme.primaryColor,
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>CHAMPION</span>
                    <span>•</span>
                    <span>{archetypeIcon} {activeFighter.archetypeLabel}</span>
                  </div>
                  <div style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--text-heading)', marginTop: '1px' }}>
                    {activeFighter.name}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClick();
                  setIsCharacterModalOpen(true);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderColor: `${activeFighter.theme.primaryColor}66`
                }}
              >
                <Sparkles size={13} color={activeFighter.theme.primaryColor} />
                <span>Change</span>
              </button>
            </div>
          );
        })()}

        {/* Active Combat Arena Banner */}
        {(() => {
          const activeArenaDef = getArenaDefinition(selectedArena);
          const arenaBg = ARENA_BACKGROUNDS[activeArenaDef.id];

          return (
            <div
              className="glass-panel"
              onClick={() => {
                soundManager.playClick();
                setIsArenaModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderRadius: '14px',
                cursor: 'pointer',
                border: `1px solid ${activeArenaDef.theme.primaryColor}88`,
                boxShadow: `0 0 20px ${activeArenaDef.theme.ambientGlow}`,
                background: `linear-gradient(135deg, ${activeArenaDef.theme.primaryColor}18 0%, rgba(15, 23, 42, 0.85) 100%)`,
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(10, 15, 26, 0.8)',
                  border: `1px solid ${activeArenaDef.theme.primaryColor}`,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <img
                    src={arenaBg}
                    alt={activeArenaDef.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: '0.72rem',
                    color: activeArenaDef.theme.primaryColor,
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>BATTLEGROUND</span>
                    <span>•</span>
                    <span>{activeArenaDef.subtitle}</span>
                  </div>
                  <div style={{ fontSize: '1.02rem', fontWeight: 900, color: 'var(--text-heading)', marginTop: '1px' }}>
                    {activeArenaDef.name}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  soundManager.playClick();
                  setIsArenaModalOpen(true);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderColor: `${activeArenaDef.theme.primaryColor}66`
                }}
              >
                <Compass size={13} color={activeArenaDef.theme.primaryColor} />
                <span>Change</span>
              </button>
            </div>
          );
        })()}
      </div>

      <div className="glass-panel" style={{ padding: '24px 18px', textAlign: 'center' }}>
        {mode === 'select' && (
          <div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 800, marginBottom: '6px', color: 'var(--text-heading)' }}>Choose Duel Mode</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '18px', fontSize: '0.9rem' }}>Select live human 1v1 duel, practice vs AI Bot, or challenge a friend.</p>

            {/* Mode Badge Banner */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--pill-bg)',
              padding: '6px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)',
              color: 'var(--text-main)',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              🏆 Ranked Competitive 1v1 Mode
            </div>

            {/* Guest Ranked Lock Callout */}
            {activeUser.isGuest && queueType === 'ranked' && (
              <div style={{
                margin: '0 auto 20px auto',
                maxWidth: '540px',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(236, 72, 153, 0.12)',
                border: '1px solid rgba(236, 72, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ textAlign: 'left', flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LogIn size={14} /> Ranked Mode Requires an Account
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Create your account in 5 seconds to earn MMR rating, rank badges, & leaderboard placement.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onOpenAuth?.('register')}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap', backgroundColor: '#ec4899' }}
                >
                  Create Account
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <button
                className="glass-panel"
                onClick={handleQuickDuel}
                style={{
                  padding: '24px 16px',
                  cursor: 'pointer',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                }}>
                  <Users size={24} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-heading)' }}>Quick Duel <span className="kbd-badge">Enter</span></h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Match with earliest waiting human player</p>
              </button>

              <div
                className="glass-panel"
                style={{
                  padding: '20px 16px',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(74, 222, 128, 0.2)',
                    color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                  }}>
                    <Bot size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px', color: '#4ade80' }}>Practice vs AI Bot</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>Adaptive AI scales speed to your WPM</p>
                </div>

                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    {[
                      { id: 'adaptive', label: '⚡ Adaptive' },
                      { id: 'pro', label: '🔥 Pro (90)' },
                      { id: 'fighter', label: '⚔️ Fighter (60)' },
                      { id: 'novice', label: '🛡️ Novice (35)' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setBotDifficulty(item.id as any)}
                        style={{
                          padding: '6px 6px',
                          borderRadius: '8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: botDifficulty === item.id ? '1px solid #4ade80' : '1px solid var(--border-card)',
                          background: botDifficulty === item.id ? 'rgba(74, 222, 128, 0.25)' : 'var(--btn-sec-bg)',
                          color: botDifficulty === item.id ? '#4ade80' : 'var(--text-muted)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => handleBotDuel(botDifficulty)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem', background: '#22c55e', borderColor: '#4ade80' }}
                  >
                    Start Bot Fight
                  </button>
                </div>
              </div>

              <button
                className="glass-panel"
                onClick={handleCreateChallenge}
                style={{
                  padding: '24px 16px',
                  cursor: 'pointer',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  transition: 'all 0.2s ease',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(244, 63, 94, 0.15)',
                  color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
                }}>
                  <Link size={24} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px', color: 'var(--text-heading)' }}>Challenge a Friend</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Create a private room link & invite someone</p>
              </button>
            </div>

            {/* Manual Join Section */}
            <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-card)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>Have a Challenge Link or Room Code?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>Paste the challenge link or room ID below to join your opponent.</p>
              <div style={{ display: 'flex', gap: '8px', maxWidth: '540px', margin: '0 auto', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
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
                      borderRadius: '6px',
                      objectFit: 'cover',
                      border: '1px solid rgba(56, 189, 248, 0.5)'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Paste link or Room ID"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoinSubmittedCode(); }}
                    style={{
                      width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px', background: 'var(--btn-sec-bg)',
                      border: '1px solid var(--border-card)', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none'
                    }}
                  />
                </div>
                <button className="btn-primary" onClick={handleJoinSubmittedCode} style={{ padding: '10px 20px', fontSize: '0.85rem', flex: '0 0 auto' }}>
                  <LogIn size={16} /> Join Duel
                </button>
              </div>
            </div>
          </div>
        )}

        {serverWarming && (
          <div style={{ margin: '20px 0', padding: '14px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', fontSize: '0.88rem' }}>
            <RefreshCw size={18} className="spin" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Preparing arena... Connecting to Colyseus server.
          </div>
        )}

        {errorMsg && (
          <div style={{ margin: '16px 0', padding: '12px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {mode === 'quick' && !serverWarming && (
          <div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800, marginBottom: '6px', color: 'var(--text-heading)' }}>
              {queueType === 'ranked' ? 'Ranked Competitive Matchmaking' : 'Casual Quick Duel'}
            </h2>

            {/* MMR Range Queue Timer Banner */}
            <div style={{
              margin: '16px auto',
              maxWidth: '480px',
              padding: '18px 16px',
              borderRadius: '16px',
              backgroundColor: 'var(--pill-bg)',
              border: '1px solid var(--border-card)',
              boxShadow: '0 0 35px var(--card-shadow)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                <RefreshCw size={20} className="spin" color="var(--accent-cyan)" />
                <span style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {String(Math.floor(queueElapsed / 60)).padStart(2, '0')}:{String(queueElapsed % 60).padStart(2, '0')}
                </span>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '12px' }}>
                {`Searching for live human opponent... (${Math.max(0, 20 - queueElapsed)}s remaining)`}
              </p>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  color: 'var(--accent-cyan)',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Swords size={13} />
                  <span>±{mmrTolerance} MMR Range</span>
                </div>

                <div style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  color: 'var(--accent-purple)',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>±{levelTolerance} Level Range</span>
                </div>
              </div>

              <div style={{
                marginTop: '10px',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {queueElapsed < 4
                  ? 'Phase 1: Strict Skill Match'
                  : queueElapsed < 12
                  ? 'Phase 2: Expanding MMR Tolerance'
                  : queueElapsed < 18
                  ? 'Phase 3: Broad Skill Sweep'
                  : 'Phase 4: Final Queue Sweep'}
              </div>
            </div>

            {queueElapsed >= 30 && !opponentName && (
              <div style={{ margin: '20px 0', padding: '14px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '10px' }}>
                  No player paired yet. Create a challenge link to play with a friend.
                </p>
                <button className="btn-primary" onClick={handleCreateChallenge} style={{ fontSize: '0.9rem', padding: '10px 20px' }}>
                  <Link size={16} /> Create a Challenge Link
                </button>
              </div>
            )}

            {opponentName ? (
              <div style={{ margin: '20px 0' }}>
                <h3 style={{ color: '#34d399', fontSize: '1.15rem', marginBottom: '14px' }}>Opponent Found: {opponentName}</h3>
                <button className="btn-primary" onClick={toggleReady} style={{ padding: '12px 28px', fontSize: '1rem' }}>
                  {isReady ? 'Ready! Waiting for match start...' : 'Click to Ready Up'} <span className="kbd-badge">Enter</span>
                </button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={cancelLobby} style={{ marginTop: '16px', padding: '10px 20px', fontSize: '0.85rem' }}>
                Cancel Queue
              </button>
            )}
          </div>
        )}

        {mode === 'challenge' && !serverWarming && (
          <div>
            <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800, marginBottom: '6px', color: 'var(--text-heading)' }}>Private Challenge Room</h2>

            {roomCode && (
              <div style={{ margin: '20px 0' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Share room link or Room ID with your opponent:</span>
                <div style={{ display: 'flex', gap: '8px', maxWidth: '520px', margin: '8px auto', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?room=${roomCode}`}
                    style={{
                      flex: '1 1 200px', padding: '10px 12px', borderRadius: '8px', background: 'var(--btn-sec-bg)',
                      border: '1px solid var(--border-card)', color: 'var(--text-main)', fontSize: '0.85rem'
                    }}
                  />
                  <button className="btn-secondary" onClick={copyChallengeUrl} style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                    {copied ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
            )}

            {opponentName ? (
              <div style={{ margin: '20px 0' }}>
                <h3 style={{ color: '#34d399', fontSize: '1.15rem', marginBottom: '14px' }}>Opponent Joined: {opponentName}</h3>
                <button className="btn-primary" onClick={toggleReady} style={{ padding: '12px 28px', fontSize: '1rem' }}>
                  {isReady ? 'Ready! Waiting for opponent...' : 'Click to Ready Up'}
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: '20px 0', fontSize: '0.88rem' }}>
                Waiting for your opponent to open the link or enter the Room ID...
              </p>
            )}

            <button className="btn-secondary" onClick={cancelLobby} style={{ padding: '10px 20px', fontSize: '0.85rem' }}>
              Cancel Room
            </button>
          </div>
        )}

        {mode === 'bot' && !serverWarming && (
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-heading)' }}>Solo Practice vs AI Bot</h2>
            <p style={{ color: '#4ade80', fontSize: '1.1rem', margin: '16px 0' }}>
              Opponent Ready: Highland Bot AI
            </p>
            <div style={{ margin: '24px 0' }}>
              <button className="btn-primary" onClick={toggleReady} style={{ padding: '14px 32px', fontSize: '1.1rem' }}>
                <Swords size={20} /> {isReady ? 'Ready! Starting 3-2-1 Countdown...' : 'Ready Up & Fight Bot!'}
              </button>
            </div>
            <button className="btn-secondary" onClick={cancelLobby}>
              Cancel Practice
            </button>
          </div>
        )}
      </div>

      {/* Queue Timeout Prompt Modal */}
      <QueueTimeoutModal
        isOpen={showTimeoutModal}
        onClose={handleBackToLobbyFromTimeout}
        onStartBotDuel={handleStartBotFromTimeout}
        onRequeue={handleRequeueFromTimeout}
        onBackToLobby={handleBackToLobbyFromTimeout}
      />

      {/* Character Selection Modal */}
      <CharacterSelectModal
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        selectedCharacterId={selectedCharacter}
        onSelectCharacter={handleCharacterSelect}
      />

      {/* Arena Selection Modal */}
      <ArenaSelectModal
        isOpen={isArenaModalOpen}
        onClose={() => setIsArenaModalOpen(false)}
        selectedArenaId={selectedArena}
        onSelectArena={handleArenaSelect}
      />
    </div>
  );
};
