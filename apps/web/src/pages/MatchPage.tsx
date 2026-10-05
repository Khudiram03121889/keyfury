import React, { useEffect, useRef, useState } from 'react';
import { Room } from 'colyseus.js';
import Phaser from 'phaser';
import { Volume2, VolumeX, Flame, Trophy, ArrowRight, FastForward, Pause, Play, LogOut, AlertTriangle, Download, RefreshCw, MapPin } from 'lucide-react';
import { StickFightScene, AttackKind } from '../game/StickFightScene';
import { GuestProfile, getSavedSelectedArena, getSavedSelectedCameraAngle, saveMatchStats } from '../lib/supabase';
import { soundManager } from '../audio/SoundManager';
import { RankBadge, getRankTier } from '../components/ranked/RankBadge';
import { soundSynth } from '../game/audio/SoundSynth';
import { getArenaDefinition, type ArenaDefinition } from '@keyfury/game-core';
import { ThreeCombatArena, ThreeCombatArenaRef } from '../render/ThreeCombatArena';
import { downloadMatchCard } from '../lib/downloadMatchCard';

export interface MatchPageProps {
  room: Room;
  guest: GuestProfile;
  onMatchComplete: (resultData: any) => void;
  use3D?: boolean;
  threeArenaRef?: React.MutableRefObject<ThreeCombatArenaRef | null>;
}

export const MatchPage: React.FC<MatchPageProps> = ({
  room,
  guest,
  onMatchComplete,
  use3D = true,
  threeArenaRef: externalThreeArenaRef,
}) => {
  const is3DMode = use3D !== false;
  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const mainBoxRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<StickFightScene | null>(null);
  const internalThreeArenaRef = useRef<ThreeCombatArenaRef | null>(null);
  const threeArenaRef = externalThreeArenaRef || internalThreeArenaRef;

  // 3D Cinematic Entrance & Countdown Synchronization
  const [isIntroComplete, setIsIntroComplete] = useState<boolean>(() => !is3DMode);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState<boolean>(false);

  useEffect(() => {
    console.log(`[ENTRANCE_START] Client entrance started: map=${matchState?.arenaId || (room as any)?.metadata?.arenaId || getSavedSelectedArena() || 'cyber_rooftop'} timestamp=${new Date().toISOString()}`);
    console.log(`[INPUT_CONTROL] disabled=true participant=human timestamp=${new Date().toISOString()} reason=entrance_and_countdown`);
  }, []);

  const handleIntroComplete = React.useCallback(() => {
    setIsIntroComplete(true);
    console.log(`[COUNTDOWN_END] Client countdown finished: timestamp=${new Date().toISOString()}`);
    console.log(`[FIGHT_START] Client fight scene activated: timestamp=${new Date().toISOString()}`);
    if (room?.state?.status === 'countdown') {
      try {
        room.send('skip_intro', {});
        const isBot = (room as any)?.metadata?.withBot || room?.state?.players?.has?.('bot-ai-opponent');
        if (!isBot) {
          setIsWaitingForOpponent(true);
        }
      } catch (_e) {}
    }
  }, [room]);

  const [matchState, setMatchState] = useState<any>(() => room?.state || null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [remainingTime, setRemainingTime] = useState<number>(60);
  const [muted, setMuted] = useState<boolean>(() => soundManager.isMuted());
  const prevStatusRef = useRef<string>(room?.state?.status || 'lobby');

  // In-Arena KO Finish Sequence & Stats Overlay State
  const [showStatsOverlay, setShowStatsOverlay] = useState<boolean>(false);
  const [completedState, setCompletedState] = useState<any>(null);
  const [isDownloadingCard, setIsDownloadingCard] = useState<boolean>(false);
  const isMatchEndedRef = useRef<boolean>(false);
  const matchEndPayloadRef = useRef<any>(null);

  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(() => room?.state?.isPaused || false);
  const [currentBotDifficulty, setCurrentBotDifficulty] = useState<string>(() => (room as any)?.options?.botDifficulty || 'adaptive');

  const [viewportWidth, setViewportWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [viewportHeight, setViewportHeight] = useState<number>(() => typeof window !== 'undefined' ? window.innerHeight : 768);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
  const [visibleHeight, setVisibleHeight] = useState<number>(() => typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 600);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPortrait = React.useMemo(() => {
    return viewportWidth < 768 || viewportHeight > viewportWidth;
  }, [viewportWidth, viewportHeight]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onVVResize = () => {
      const vvh = vv.height;
      const offset = window.innerHeight - vvh;
      setKeyboardOffset(offset > 50 ? offset : 0);
      setVisibleHeight(vvh);
    };
    vv.addEventListener('resize', onVVResize);
    vv.addEventListener('scroll', onVVResize);
    return () => {
      vv.removeEventListener('resize', onVVResize);
      vv.removeEventListener('scroll', onVVResize);
    };
  }, []);

  // ponytail: Tune wordsPerLine so text stays centered in the duel clash reticle between fighters
  const wordsPerLine = React.useMemo(() => {
    if (isPortrait) return 2;
    if (viewportWidth < 480) return 2;
    if (viewportWidth < 768) return 3;
    if (viewportWidth < 1200) return 4;
    return 5;
  }, [viewportWidth, isPortrait]);

  const isBotMode = React.useMemo(() => {
    if ((room as any)?.metadata?.withBot) return true;
    if (!matchState?.players) return false;
    if (typeof matchState.players.get === 'function' && matchState.players.get('bot-ai-opponent')) {
      return true;
    }
    let foundBot = false;
    try {
      if (typeof matchState.players.forEach === 'function') {
        matchState.players.forEach((p: any) => {
          if (p?.profileId?.startsWith('bot') || p?.sessionId === 'bot-ai-opponent') {
            foundBot = true;
          }
        });
      } else if (typeof matchState.players === 'object') {
        Object.values(matchState.players).forEach((p: any) => {
          if (p?.profileId?.startsWith('bot') || p?.sessionId === 'bot-ai-opponent') {
            foundBot = true;
          }
        });
      }
    } catch (_err) {}
    return foundBot;
  }, [matchState, room]);

  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
    room.send('toggle_pause', {});
    setTimeout(() => {
      typingInputRef.current?.focus();
    }, 50);
  };

  // Local typing progress state
  const [activeWordIndex, setActiveWordIndex] = useState<number>(0);
  const [typedCharIndex, setTypedCharIndex] = useState<number>(0);
  const [isErrorFlash, setIsErrorFlash] = useState<boolean>(false);

  const keySeqRef = useRef<number>(0);
  const matchStateRef = useRef<any>(room?.state || null);
  const wordsRef = useRef<string[]>(room?.state?.words ? Array.from(room.state.words) : []);
  const activeWordIdxRef = useRef<number>(0);
  const typedCharIdxRef = useRef<number>(0);
  const typingInputRef = useRef<HTMLInputElement>(null);
  const lastProcessedInputDataRef = useRef<string>('');
  const lastProcessedInputTimeRef = useRef<number>(0);

  // High-Speed Typing (>100 WPM) rAF UI State Batching & Stun Window Refs
  const pendingUiUpdateRef = useRef<{ wordIndex: number; charIndex: number } | null>(null);
  const rafPendingRef = useRef<boolean>(false);
  const stunnedUntilMsRef = useRef<number>(0);

  // Sync refs for event handlers
  matchStateRef.current = matchState;
  activeWordIdxRef.current = activeWordIndex;
  typedCharIdxRef.current = typedCharIndex;

  const syncLocalProgress = (wordIndex: number, charIndex: number) => {
    const isWordChanged = wordIndex !== activeWordIdxRef.current;
    activeWordIdxRef.current = wordIndex;
    typedCharIdxRef.current = charIndex;

    // Immediate React state update on word completion or line wrap to prevent visual lag
    if (isWordChanged) {
      syncAndResetInput();
      setActiveWordIndex(wordIndex);
      setTypedCharIndex(charIndex);
      return;
    }

    // Batch character index advances within the same word using requestAnimationFrame (60 FPS max)
    pendingUiUpdateRef.current = { wordIndex, charIndex };
    if (!rafPendingRef.current) {
      rafPendingRef.current = true;
      requestAnimationFrame(() => {
        rafPendingRef.current = false;
        if (pendingUiUpdateRef.current) {
          const { wordIndex: wIdx, charIndex: cIdx } = pendingUiUpdateRef.current;
          pendingUiUpdateRef.current = null;
          setActiveWordIndex(wIdx);
          setTypedCharIndex(cIdx);
        }
      });
    }
  };

const getPlayerCharacterIds = (state: any): { p1CharId: string; p2CharId: string } => {
  let p1CharId = 'shadow_ronin';
  let p2CharId = 'cyber_valkyrie';

  if (!state?.players) return { p1CharId, p2CharId };

  if (typeof state.players.forEach === 'function') {
    state.players.forEach((p: any) => {
      if (p?.side === 'left' && p?.characterId) {
        p1CharId = p.characterId;
      } else if (p?.side === 'right' && p?.characterId) {
        p2CharId = p.characterId;
      }
    });
  } else if (typeof state.players === 'object') {
    Object.values(state.players).forEach((p: any) => {
      if (p?.side === 'left' && p?.characterId) {
        p1CharId = p.characterId;
      } else if (p?.side === 'right' && p?.characterId) {
        p2CharId = p.characterId;
      }
    });
  }

  return { p1CharId, p2CharId };
};

  // Room state change listeners
  useEffect(() => {
    if (room?.state) {
      setMatchState(room.state);
      if (sceneRef.current) {
        const { p1CharId, p2CharId } = getPlayerCharacterIds(room.state);
        sceneRef.current?.setCharacterSkins(p1CharId, p2CharId);
      }
      if (room.state.words && Array.isArray(Array.from(room.state.words))) {
        wordsRef.current = Array.from(room.state.words);
      }
      const me = room.state.players?.get(room.sessionId);
      if (me) {
        if (typeof me.stunnedUntilMs === 'number') {
          stunnedUntilMsRef.current = me.stunnedUntilMs;
        }
        syncLocalProgress(me.activeWordIndex, me.wordTypedCharCount);
      }
    }

    room.onStateChange((state: any) => {
      setMatchState(state);
      if (typeof state.isPaused === 'boolean') {
        setIsPaused(state.isPaused);
      }
      setRemainingTime(state.remainingSeconds);
      setCountdown(state.status === 'countdown' ? state.countdownSeconds : null);

      if (state.status === 'in_progress' || state.inputEnabled === true) {
        setIsWaitingForOpponent(false);
      }

      const { p1CharId, p2CharId } = getPlayerCharacterIds(state);
      if (sceneRef.current) {
        sceneRef.current?.setCharacterSkins(p1CharId, p2CharId);
      }

      // Play round start bell on transition to in_progress
      if (prevStatusRef.current !== 'in_progress' && state.status === 'in_progress') {
        soundManager.playRoundStart();
      }
      prevStatusRef.current = state.status;

      if (state.words && Array.isArray(Array.from(state.words))) {
        wordsRef.current = Array.from(state.words);
      }

      const me = state.players?.get(room.sessionId);
      if (me) {
        if (typeof me.stunnedUntilMs === 'number') {
          stunnedUntilMsRef.current = me.stunnedUntilMs;
        }
        // The server is the only source of typing progress.
        syncLocalProgress(me.activeWordIndex, me.wordTypedCharCount);

        if (sceneRef.current) {
          const mySide: 'left' | 'right' = me.side || 'left';
          sceneRef.current?.updateCombo(mySide, me.combo || 0);
        }
      }

      if ((state.status === 'completed' || state.status === 'forfeit') && !isMatchEndedRef.current) {
        isMatchEndedRef.current = true;
        setCompletedState(state);

        // Play Match Victory or Defeat jingle using SoundSynth
        const isVictory = state.winnerSessionId === room.sessionId;
        soundSynth.playKOChime(isVictory);
        if (isVictory) {
          soundManager.playVictory();
        } else {
          soundManager.playDefeat();
        }

        let winnerSide: 'left' | 'right' = 'left';
        let loserSide: 'left' | 'right' = 'right';

        if (state.winnerSessionId) {
          const winnerPlayer = state.players.get(state.winnerSessionId);
          if (winnerPlayer) {
            winnerSide = winnerPlayer.side || 'left';
            loserSide = winnerSide === 'left' ? 'right' : 'left';
          }
        } else {
          let p1Health = 200;
          let p2Health = 200;
          state.players.forEach((p: any) => {
            if (p.side === 'left') p1Health = p.health;
            else p2Health = p.health;
          });
          if (p1Health <= p2Health) {
            loserSide = 'left';
            winnerSide = 'right';
          } else {
            loserSide = 'right';
            winnerSide = 'left';
          }
        }

        // Trigger KO slow-mo sequence in 3D Arena & Phaser
        if (threeArenaRef.current) {
          threeArenaRef.current.triggerKnockout(loserSide);
          threeArenaRef.current.triggerVictory(winnerSide);
          threeArenaRef.current.triggerScreenShake?.(0.35);
          setTimeout(() => {
            setShowStatsOverlay(true);
          }, 1800);
        } else if (sceneRef.current) {
          sceneRef.current?.triggerKOSequence(loserSide, winnerSide, () => {
            setShowStatsOverlay(true);
          });
        } else {
          setShowStatsOverlay(true);
        }
      }
    });

    room.onMessage('server_event', (event: any) => {
      const state = matchStateRef.current;
      const senderPlayer = state?.players?.get(event.playerId);
      const myPlayer = state?.players?.get(room.sessionId);
      const mySide: 'left' | 'right' = myPlayer?.side || 'left';
      const side: 'left' | 'right' = senderPlayer?.side || (event.playerId === room.sessionId ? mySide : (mySide === 'left' ? 'right' : 'left'));
      const isMyEvent = event.playerId === room.sessionId;

      if (event.type === 'key_accepted') {
        soundSynth.playMechanicalClick();

        const eventWords: string[] = wordsRef.current.length > 0 ? wordsRef.current : (state?.words ? Array.from(state.words) as string[] : []);
        const eventWord = eventWords[event.wordIndex] || '';
        sceneRef.current?.updateTypingProgress(side, event.charIndex, eventWord.length);
        sceneRef.current?.triggerKeystrokeJuice(side, event.charIndex, eventWord.length, senderPlayer?.combo || 0, senderPlayer?.wpm);

        // Immediate 3D martial responsiveness on letter input
        threeArenaRef.current?.triggerKeystroke(side);

        if (isMyEvent) {
          syncLocalProgress(event.wordIndex, event.charIndex);
        }
      } else if (event.type === 'word_completed') {
        const attackKind: AttackKind = event.attackKind || 'jab';
        const isWeaponAttack = attackKind === 'weapon';
        const finisherTier = event.finisherTier || (event.newCombo && event.newCombo >= 8 ? 'overdrive' : (event.newCombo && event.newCombo >= 5 ? 'weapon_finisher' : (event.newCombo && event.newCombo >= 3 ? 'power_strike' : 'none')));
        const isFinisher = finisherTier !== 'none';
        const isHeavyAttack = isWeaponAttack || isFinisher || attackKind === 'kick' || attackKind === 'heavy' || (attackKind as string) === 'uppercut';
        const tier = isWeaponAttack || finisherTier === 'weapon_finisher' || finisherTier === 'overdrive'
          ? 'weapon'
          : (attackKind === 'kick' ? 'kick' : (attackKind === 'heavy' || finisherTier === 'power_strike' || (attackKind as string) === 'uppercut' ? 'heavy' : 'jab'));

        // Play punchy impact sound on word completion
        soundManager.playHit(isHeavyAttack);

        if (finisherTier === 'overdrive') {
          soundSynth.playHeavyImpact(true);
          soundSynth.playCriticalHit();
        } else if (finisherTier === 'weapon_finisher' || isWeaponAttack) {
          soundSynth.playHeavyImpact(true);
          soundSynth.playCriticalHit();
        } else if (finisherTier === 'power_strike') {
          soundSynth.playHeavyImpact(false);
          soundSynth.playComboHit(event.newCombo || 3);
        } else if (event.newCombo && event.newCombo >= 2) {
          soundSynth.playComboHit(event.newCombo);
        }

        if (isHeavyAttack && finisherTier === 'none' && !isWeaponAttack) {
          soundSynth.playHeavyImpact(attackKind === 'heavy');
        }

        if (event.damage && event.damage >= 25 && finisherTier === 'none') {
          soundSynth.playCriticalHit();
        }

        // Trigger 3D Martial Strike & Reaction
        threeArenaRef.current?.triggerAttack(side, tier);
        threeArenaRef.current?.triggerHit(side === 'left' ? 'right' : 'left', isHeavyAttack ? 'heavy' : 'light');

        if (isHeavyAttack || (event.damage && event.damage >= 25)) {
          const shake = finisherTier === 'overdrive' ? 0.35 : (finisherTier === 'weapon_finisher' || isWeaponAttack ? 0.32 : (tier === 'heavy' || finisherTier === 'power_strike' ? 0.24 : 0.20));
          threeArenaRef.current?.triggerScreenShake?.(shake);
        }

        sceneRef.current?.triggerAttack(side, attackKind, event.damage, event.newCombo || 0);

        if (isMyEvent) {
          syncLocalProgress(event.nextWordIndex, event.nextCharIndex);
        }
      } else if (event.type === 'key_error') {
        const errorSide: 'left' | 'right' = event.playerId
          ? (room.state?.players?.get(event.playerId)?.side || (isMyEvent ? mySide : (mySide === 'left' ? 'right' : 'left')))
          : (isMyEvent ? mySide : (mySide === 'left' ? 'right' : 'left'));

        if (isMyEvent) {
          soundSynth.playKeyError();
          stunnedUntilMsRef.current = 0; // Angle 1: Zero input freeze, instant re-type
          syncAndResetInput();
          syncLocalProgress(event.wordIndex, event.charIndex);
          setIsErrorFlash(true);
          setTimeout(() => setIsErrorFlash(false), 150);
        }

        // Trigger visual guard stumble on 3D model & 2D scene for the errant fighter
        sceneRef.current?.triggerStun(errorSide);
        threeArenaRef.current?.triggerHit(errorSide, 'light');
      } else if (event.type === 'intro_sync_update') {
        if (event.waitingForOpponent) {
          setIsWaitingForOpponent(true);
        } else {
          setIsWaitingForOpponent(false);
        }
      } else if ((event as any).type === 'options_updated') {
        if ((event as any).botDifficulty) {
          setCurrentBotDifficulty((event as any).botDifficulty);
        }
      } else if (event.type === 'match_end') {
        matchEndPayloadRef.current = event;
        if (event.summary) {
          setCompletedState((prev: any) => ({ ...(prev || {}), ...event.summary }));
        }
      }
    });
  }, [room, onMatchComplete]);

  // Initialize Phaser Scene ONCE when container is mounted in DOM (only in 2D mode)
  useEffect(() => {
    if (is3DMode) {
      // 3D WebGL mode is active: Deactivate legacy Phaser 2D loop to eliminate CPU/GPU overhead and maintain 60 FPS
      return;
    }
    if (!phaserContainerRef.current || phaserGameRef.current) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const config: any = {
      type: Phaser.AUTO,
      parent: phaserContainerRef.current,
      width: phaserContainerRef.current.clientWidth || window.innerWidth,
      height: phaserContainerRef.current.clientHeight || window.innerHeight,
      backgroundColor: '#1e293b',
      resolution: dpr,
      render: {
        antialias: true,
        antialiasGL: true,
        roundPixels: false
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: { default: 'arcade' },
      scene: [StickFightScene]
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    let resizeObserver: ResizeObserver | null = null;

    game.events.once('ready', () => {
      const sc = game.scene.getScene('StickFightScene') as StickFightScene;
      sceneRef.current = sc;
      const { p1CharId, p2CharId } = getPlayerCharacterIds(room?.state || matchStateRef.current);
      sc.setCharacterSkins(p1CharId, p2CharId);
      const rawArenaId = (room?.state as any)?.arenaId || (room as any)?.metadata?.arenaId || matchStateRef.current?.arenaId || getSavedSelectedArena();
      if (rawArenaId) {
        sc.setArena(rawArenaId);
      }
      sc.handleResize?.();

      if (phaserContainerRef.current && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 50 && height > 50 && phaserGameRef.current?.scale) {
              phaserGameRef.current.scale.resize(width, height);
              sc.handleResize?.();
            }
          }
        });
        resizeObserver.observe(phaserContainerRef.current);
      }
    });

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      game.destroy(true);
      phaserGameRef.current = null;
      sceneRef.current = null;
    };
  }, [is3DMode]);

  // Sync arena changes dynamically if room state changes (2D fallback)
  useEffect(() => {
    if (!is3DMode && sceneRef.current && matchState?.arenaId) {
      sceneRef.current?.setArena(matchState.arenaId);
    }
  }, [is3DMode, matchState?.arenaId]);

  // Keep typing input focused during combat once intro completes or in 2D mode
  useEffect(() => {
    const canType = (!is3DMode || isIntroComplete) &&
      !isWaitingForOpponent &&
      matchState?.status === 'in_progress' &&
      matchState?.inputEnabled !== false;
    if (canType) {
      console.log(`[INPUT_CONTROL] enabled=true participant=human timestamp=${new Date().toISOString()}`);
      if (typingInputRef.current) {
        typingInputRef.current.disabled = false;
        typingInputRef.current.focus({ preventScroll: true });
      }
      const interval = setInterval(() => {
        const liveStatus = matchStateRef.current?.status;
        const liveInputEnabled = matchStateRef.current?.inputEnabled;
        const liveCanType = (!is3DMode || isIntroComplete) &&
          !isWaitingForOpponent &&
          liveStatus === 'in_progress' &&
          liveInputEnabled !== false;
        if (document.activeElement !== typingInputRef.current && liveCanType) {
          typingInputRef.current?.focus({ preventScroll: true });
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [matchState?.status, matchState?.inputEnabled, is3DMode, isIntroComplete, isWaitingForOpponent]);

  // Capture phase is intentional: Phaser can consume keyboard events from its
  // canvas before React sees them. Listening on window makes typing work after
  // clicking anywhere in the arena, not just while the invisible input has
  // focus.
  const handleKeyPress = (char: string) => {
    if (showStatsOverlay || isMatchEndedRef.current || isPaused || isWaitingForOpponent) return;
    if (is3DMode && !isIntroComplete) return;
    const status = room.state?.status;
    if (status !== 'in_progress' || matchState?.inputEnabled === false || room.state?.inputEnabled === false) return;
    if (Date.now() < stunnedUntilMsRef.current) return;

    let keyChar = char;
    if (keyChar === 'Spacebar' || keyChar === ' ') {
      keyChar = ' ';
    }
    if (keyChar.length !== 1 || !/^[ -~]$/.test(keyChar)) return;

    keySeqRef.current++;
    console.log('[CLIENT KEY SENT]', keyChar, 'seq:', keySeqRef.current);
    room.send('key_intent', {
      seq: keySeqRef.current,
      key: keyChar,
      clientTimeMs: Date.now()
    });
  };

  const lastInputValueRef = useRef<string>('');

  const syncAndResetInput = () => {
    lastInputValueRef.current = '';
    if (typingInputRef.current) {
      typingInputRef.current.value = '';
    }
  };

  const handleInputDOMEvent = (e: React.FormEvent<HTMLInputElement>) => {
    if ((is3DMode && !isIntroComplete) || isWaitingForOpponent) {
      syncAndResetInput();
      return;
    }

    const target = e.target as HTMLInputElement;
    const newVal = target.value || '';
    const oldVal = lastInputValueRef.current;

    if (newVal === oldVal) return;

    if (newVal.startsWith(oldVal)) {
      const addedText = newVal.slice(oldVal.length);
      if (addedText) {
        if (addedText.length > 1) {
          // Swipe typing / word prediction selection detected: block multi-char insertion for fair manual gameplay
          console.warn('[INPUT BLOCKED] Multi-character insertion rejected (swipe/prediction blocked):', addedText);
          syncAndResetInput();
          return;
        }
        lastInputValueRef.current = newVal;
        for (const char of addedText) {
          handleKeyPress(char);
        }
      }
    } else {
      if (newVal) {
        if (newVal.length > 1) {
          // Swipe typing / word prediction selection detected: block multi-char insertion for fair manual gameplay
          console.warn('[INPUT BLOCKED] Multi-character replacement rejected (swipe/prediction blocked):', newVal);
          syncAndResetInput();
          return;
        }
        lastInputValueRef.current = newVal;
        for (const char of newVal) {
          handleKeyPress(char);
        }
      } else {
        lastInputValueRef.current = '';
      }
    }

    if (newVal.length > 20) {
      syncAndResetInput();
    }
  };

  const getFullMatchResult = () => {
    const base = completedState || room.state;
    const matchEnd = matchEndPayloadRef.current;
    const playersObj = base?.players || matchEnd?.summary?.players;
    return {
      ...(base ? (typeof base.toJSON === 'function' ? base.toJSON() : base) : {}),
      winnerSessionId: matchEnd?.winnerSessionId || base?.winnerSessionId,
      reason: matchEnd?.reason || base?.endReason,
      mmrDeltas: matchEnd?.mmrDeltas,
      players: playersObj
    };
  };

  const handleDownloadResultCard = async () => {
    if (isDownloadingCard) return;
    setIsDownloadingCard(true);
    try {
      const isWinner = (matchEndPayloadRef.current?.winnerSessionId || completedState?.winnerSessionId) === room.sessionId;
      let opp: any = null;
      completedState?.players?.forEach((p: any, sId: string) => {
        if (sId !== room.sessionId) opp = p;
      });

      const myDelta = matchEndPayloadRef.current?.mmrDeltas?.[room.sessionId];
      const deltaVal = myDelta?.delta ?? (isWinner ? 24 : -16);
      const playerMmr = myDelta?.newMmr ?? (typeof myPlayer?.mmr === 'number' ? myPlayer.mmr : ((guest as any)?.mmr ?? 1000) + deltaVal);
      const playerTier = getRankTier(playerMmr);

      // Save match stats immediately if downloading right from the arena overlay
      const targetId = guest?.id || localStorage.getItem('keyfury_guest_id');
      if (targetId) {
        saveMatchStats(targetId, {
          result: isWinner ? 'WIN' : 'LOSS',
          wpm: myPlayer?.acceptedWpm ?? 0,
          accuracy: myPlayer?.accuracy ?? 100,
          maxCombo: myPlayer?.highestCombo ?? 0,
          finalHealth: myPlayer?.health ?? 0,
          wordsCompleted: myPlayer?.wordsCompleted ?? 0,
          opponentName: opp?.displayName || 'OPPONENT',
          mmrDelta: deltaVal,
          finalMmr: playerMmr
        }).catch(() => {});
      }

      await downloadMatchCard({
        playerName: guest?.displayName || myPlayer?.displayName || 'Warrior',
        playerAvatarUrl: guest?.avatarUrl,
        playerTier,
        playerMmr,
        mmrDelta: deltaVal,
        opponentName: opp?.displayName || 'Opponent Warrior',
        opponentAvatarUrl: opp?.avatarUrl,
        isWinner,
        wpm: myPlayer?.acceptedWpm ?? 0,
        accuracy: myPlayer?.accuracy ?? 100,
        maxCombo: myPlayer?.highestCombo ?? 0,
        finalHealth: myPlayer?.health ?? 0,
        wordsCompleted: myPlayer?.wordsCompleted ?? 0,
      });
    } finally {
      setIsDownloadingCard(false);
    }
  };

  const handleCombatKey = (event: KeyboardEvent) => {
    if (showStatsOverlay || isMatchEndedRef.current) {
      if (event.key === 'Enter') {
        event.preventDefault();
        onMatchComplete(getFullMatchResult());
        return;
      }
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        handleDownloadResultCard();
        return;
      }
    }

    // Skip intro in 3D mode when user presses Enter or Space during entrance sequence
    if (is3DMode && !isIntroComplete) {
      if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter') {
        event.preventDefault();
        threeArenaRef.current?.skipIntro();
        handleIntroComplete();
        return;
      }
      // Strictly suppress and block any other typing keystrokes during entrance
      if (event.key !== 'Escape') {
        event.preventDefault();
        return;
      }
    }

    if (isWaitingForOpponent) {
      if (event.key !== 'Escape') {
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (isBotMode) {
        handleTogglePause();
      } else {
        setShowLeaveConfirmModal((prev) => !prev);
      }
      return;
    }

    if (isPaused) return;

    // Ignore soft-keyboard IME dummy events (handled by DOM input event)
    if (event.key === 'Unidentified' || event.key === '229') return;

    // Deduplication guard
    if ((event as any).keyfuryHandled) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    let char = event.key;
    if (char === 'Spacebar' || char === ' ') {
      char = ' ';
    }

    // Single printable character typing during active battle
    if (char.length === 1 && /^[ -~]$/.test(char)) {
      (event as any).keyfuryHandled = true;
      event.preventDefault();
      handleKeyPress(char);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleCombatKey, true);
    return () => window.removeEventListener('keydown', handleCombatKey, true);
  }, [room, showStatsOverlay, completedState, isBotMode, isPaused, is3DMode, isIntroComplete, isWaitingForOpponent, handleIntroComplete]);

  if (!matchState) {
    return (
      <div style={{ textAlign: 'center', margin: '100px auto', color: '#94a3b8' }}>
        Preparing Highland Arena...
      </div>
    );
  }

  // Map left & right fighters dynamically by side
  let leftPlayer: any = null;
  let rightPlayer: any = null;

  matchState.players.forEach((p: any) => {
    if (p.side === 'left') {
      leftPlayer = p;
    } else {
      rightPlayer = p;
    }
  });

  const myPlayer = matchState.players.get(room.sessionId);
  const myCombo = myPlayer?.combo || 0;

  const rawWords = room.state?.words ? Array.from(room.state.words) as string[] : [];
  const wordsList: string[] = rawWords.length > 0
    ? rawWords
    : (wordsRef.current.length > 0 ? wordsRef.current : []);

  const currentWord = wordsList[activeWordIndex] || (room.state?.status === 'in_progress' ? '...' : '');

  const leftHealth = leftPlayer?.health ?? 100;
  const rightHealth = rightPlayer?.health ?? 100;
  const currentArenaDef = getArenaDefinition(matchState?.arenaId || (room as any)?.metadata?.arenaId || getSavedSelectedArena() || 'highland_sanctuary');

  return (
    <div style={{
      width: '100vw',
      height: keyboardOffset > 0 ? `${visibleHeight}px` : '100dvh',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: keyboardOffset > 0 ? 'auto' : 0,
      padding: '0',
      boxSizing: 'border-box',
      overflow: 'hidden',
      background: '#1e293b'
    }}>
      {/* Viewport Arena Box */}
      <div
        ref={mainBoxRef}
        tabIndex={-1}
        onTouchStart={() => {
          if (!is3DMode || isIntroComplete) typingInputRef.current?.focus({ preventScroll: true });
        }}
        onClick={() => {
          if (!is3DMode || isIntroComplete) typingInputRef.current?.focus({ preventScroll: true });
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          if (!is3DMode || isIntroComplete) typingInputRef.current?.focus({ preventScroll: true });
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '0px',
          overflow: 'hidden',
          background: '#1e293b',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* 3D Combat Arena (Three.js WebGL Engine) or 2D Phaser Container */}
        <div
          style={{
            width: '100%',
            flex: '1 1 0',
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {is3DMode ? (
            <ThreeCombatArena
              ref={threeArenaRef}
              arenaId={matchState?.arenaId || (room as any)?.metadata?.arenaId || getSavedSelectedArena() || 'cyber_rooftop'}
              initialCameraAngle="front"
              p1CharId={getPlayerCharacterIds(matchState || room?.state).p1CharId}
              p2CharId={getPlayerCharacterIds(matchState || room?.state).p2CharId}
              isBotMatch={isBotMode}
              onIntroComplete={handleIntroComplete}
              currentWord={currentWord}
              typedCharIndex={typedCharIndex}
              isErrorFlash={isErrorFlash}
              p2Word={wordsList[rightPlayer?.activeWordIndex ?? 0] || ''}
              p2CharIndex={rightPlayer?.wordTypedCharCount ?? 0}
            />
          ) : (
            <div ref={phaserContainerRef} style={{ width: '100%', height: '100%' }} />
          )}
        </div>
        
        <input
          ref={typingInputRef}
          aria-label="Combat typing input"
          type="text"
          name="combat_keystroke_input"
          id="combat_keystroke_input"
          disabled={(is3DMode && !isIntroComplete) || isWaitingForOpponent}
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          data-1p-ignore="true"
          data-bitwarden-watching="false"
          enterKeyHint="done"
          data-gramm="false"
          data-enable-grammarly="false"
          value=""
          onInput={handleInputDOMEvent}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.001,
            fontSize: '16px',
            border: 'none',
            background: 'transparent',
            color: 'transparent',
            outline: 'none',
            cursor: 'default',
            pointerEvents: ((is3DMode && !isIntroComplete) || isWaitingForOpponent) ? 'none' : 'auto',
            zIndex: 1
          }}
        />

        {/* Waiting For Opponent Intro Synchronization Overlay */}
        {isWaitingForOpponent && (
          <div
            data-testid="waiting-for-opponent-banner"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 35,
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '2px solid var(--accent-cyan)',
              borderRadius: '16px',
              padding: '24px 32px',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 50px rgba(56, 189, 248, 0.45), 0 20px 40px rgba(0,0,0,0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center',
              maxWidth: '420px',
              pointerEvents: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RefreshCw size={24} className="spin" color="var(--accent-cyan)" />
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.5px' }}>
                Waiting for opponent to start...
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Typing is locked until both warriors enter the arena.
            </p>
            <div style={{
              fontSize: '0.72rem',
              padding: '4px 12px',
              borderRadius: '999px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              color: 'var(--accent-cyan)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              Intro Synchronization Active
            </div>
          </div>
        )}

        {/* --- TOP HUD OVERLAYS --- */}
        {isPortrait ? (
          <div
            data-testid="top-hud-portrait"
            style={{
              position: 'absolute',
              top: 'env(safe-area-inset-top, 6px)',
              left: '8px',
              right: '8px',
              height: '36px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 10px',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: '10px',
              border: '1px solid var(--border-card)',
              zIndex: 20,
              pointerEvents: 'auto',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
            }}
          >
            {/* Left: Player 1 Name & Numeric HP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 0' }}>
              <span style={{
                fontWeight: 900,
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '90px'
              }}>
                🎩 {leftPlayer?.displayName || 'P1'}
              </span>
              <span
                data-testid="left-health"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: leftHealth <= 40 ? '#ef4444' : '#4ade80',
                  fontSize: '0.82rem',
                  flexShrink: 0
                }}
              >
                {leftHealth} HP
              </span>
            </div>

            {/* Center: Digital Match Timer & Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-mono)',
                  color: remainingTime <= 15 ? '#ef4444' : '#fbbf24',
                  lineHeight: 1
                }}>
                  {remainingTime}s
                </span>
                <span style={{
                  fontSize: '0.55rem',
                  fontWeight: 800,
                  color: currentArenaDef.theme.primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  <MapPin size={8} /> {currentArenaDef.name.split(' ')[0]}
                </span>
              </div>
              <button
                onClick={() => {
                  const newMuted = soundManager.toggleMuted();
                  setMuted(newMuted);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: muted ? '#f43f5e' : '#34d399',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {isBotMode && (
                <button
                  onClick={handleTogglePause}
                  style={{
                    background: 'rgba(234, 179, 8, 0.18)',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    color: '#eab308',
                    borderRadius: '6px',
                    padding: '2px 5px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play size={12} /> : <Pause size={12} />}
                </button>
              )}

              {!isBotMode && (
                <button
                  onClick={() => setShowLeaveConfirmModal(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.18)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ef4444',
                    borderRadius: '6px',
                    padding: '2px 5px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Leave Match"
                >
                  <LogOut size={12} />
                </button>
              )}
            </div>

            {/* Right: Opponent Numeric HP & Name */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', minWidth: 0, flex: '1 1 0' }}>
              <span
                data-testid="right-health"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  color: rightHealth <= 40 ? '#ef4444' : '#f87171',
                  fontSize: '0.82rem',
                  flexShrink: 0
                }}
              >
                {rightHealth} HP
              </span>
              <span style={{
                fontWeight: 900,
                color: 'var(--text-main)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '90px',
                textAlign: 'right'
              }}>
                👓 {rightPlayer?.displayName || 'OPPONENT'}
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            position: 'absolute',
            top: viewportWidth < 600 ? '4px' : '12px',
            left: viewportWidth < 600 ? '4px' : '12px',
            right: viewportWidth < 600 ? '4px' : '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: viewportWidth < 600 ? '4px' : '8px',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            {/* Top-Left: Left Fighter Health & Name */}
            <div style={{
              pointerEvents: 'auto',
              flex: '1 1 0',
              maxWidth: viewportWidth < 600 ? '140px' : '280px',
              minWidth: 0,
              background: 'var(--pill-bg)',
              backdropFilter: 'blur(8px)',
              padding: viewportWidth < 600 ? '4px 8px' : '8px 12px',
              borderRadius: '12px',
              border: '1px solid var(--border-card)',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '2px' }}>
                <span style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: viewportWidth < 600 ? '0.72rem' : '0.82rem', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  🎩 {leftPlayer?.displayName || 'PLAYER 1'}
                </span>
                <span data-testid="left-health" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#4ade80', fontSize: viewportWidth < 600 ? '0.7rem' : '0.78rem', flexShrink: 0 }}>
                  {leftHealth} / 200
                </span>
              </div>
              <div style={{ width: '100%', height: viewportWidth < 600 ? '7px' : '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                <div style={{
                  width: `${Math.max(0, Math.min(100, (leftHealth / 200) * 100))}%`, height: '100%',
                  background: 'linear-gradient(90deg, #22c55e, #4ade80)', transition: 'width 0.2s ease',
                  boxShadow: '0 0 10px rgba(74, 222, 128, 0.8)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: viewportWidth < 600 ? '0.62rem' : '0.68rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{leftPlayer?.acceptedWpm ?? 0} WPM</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{Math.round(leftPlayer?.accuracy ?? 100)}%</span>
              </div>
            </div>

            {/* Top-Center: Digital Match Timer */}
            <div style={{
              pointerEvents: 'auto',
              background: 'var(--pill-bg)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-card)',
              borderRadius: '14px',
              padding: viewportWidth < 600 ? '2px 8px' : '4px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: viewportWidth < 600 ? '4px' : '8px',
              boxShadow: '0 6px 20px var(--card-shadow)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{
                  fontSize: viewportWidth < 600 ? '1.2rem' : 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: 900, fontFamily: 'var(--font-mono)',
                  color: remainingTime <= 15 ? '#ef4444' : '#4ade80', lineHeight: 1
                }}>
                  {remainingTime}
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  color: currentArenaDef.theme.primaryColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <MapPin size={10} /> {currentArenaDef.name}
                </span>
              </div>
              <button
                onClick={() => {
                  const newMuted = soundManager.toggleMuted();
                  setMuted(newMuted);
                }}
                style={{
                  background: 'none', border: 'none', color: muted ? '#f43f5e' : '#34d399',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px'
                }}
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {isBotMode && (
                <>
                  <button
                    onClick={handleTogglePause}
                    style={{
                      background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)',
                      color: '#eab308', borderRadius: '8px', padding: '4px 8px',
                      fontSize: viewportWidth < 600 ? '0.65rem' : '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                    title={isPaused ? 'Resume' : 'Pause'}
                  >
                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    <span className="nav-btn-text">{isPaused ? 'RESUME' : 'PAUSE'}</span>
                  </button>
                  <select
                    aria-label="Bot Difficulty"
                    value={currentBotDifficulty}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setCurrentBotDifficulty(val);
                      room.send('update_options', { botDifficulty: val });
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: 'var(--accent-cyan)',
                      borderRadius: '8px',
                      padding: '3px 6px',
                      fontSize: viewportWidth < 600 ? '0.62rem' : '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="adaptive" style={{ background: '#0f172a', color: '#fff' }}>⚡ Adaptive</option>
                    <option value="novice" style={{ background: '#0f172a', color: '#fff' }}>🛡️ Novice (35)</option>
                    <option value="fighter" style={{ background: '#0f172a', color: '#fff' }}>⚔️ Fighter (60)</option>
                    <option value="pro" style={{ background: '#0f172a', color: '#fff' }}>🔥 Pro (90)</option>
                  </select>
                </>
              )}

              {!isBotMode && (
                <button
                  onClick={() => setShowLeaveConfirmModal(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444', borderRadius: '8px', padding: '4px 8px',
                    fontSize: viewportWidth < 600 ? '0.65rem' : '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                  title="Leave Match (Forfeit Loss)"
                >
                  <LogOut size={14} />
                  <span className="nav-btn-text">LEAVE</span>
                </button>
              )}
            </div>

            {/* Top-Right: Right Fighter Health & Name */}
            <div style={{
              pointerEvents: 'auto',
              flex: '1 1 0',
              maxWidth: viewportWidth < 600 ? '140px' : '280px',
              minWidth: 0,
              background: 'var(--pill-bg)',
              backdropFilter: 'blur(8px)',
              padding: viewportWidth < 600 ? '4px 8px' : '8px 12px',
              borderRadius: '12px',
              border: '1px solid var(--border-card)',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', gap: '2px' }}>
                <span style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: viewportWidth < 600 ? '0.72rem' : '0.82rem', textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  👓 {rightPlayer?.displayName || 'PLAYER 2'}
                </span>
                <span data-testid="right-health" style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#f87171', fontSize: viewportWidth < 600 ? '0.7rem' : '0.78rem', flexShrink: 0 }}>
                  {rightHealth} / 200
                </span>
              </div>
              <div style={{ width: '100%', height: viewportWidth < 600 ? '7px' : '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                <div style={{
                  width: `${Math.max(0, Math.min(100, (rightHealth / 200) * 100))}%`, height: '100%',
                  background: 'linear-gradient(90deg, #ef4444, #f87171)', transition: 'width 0.2s ease',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: viewportWidth < 600 ? '0.62rem' : '0.68rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{rightPlayer?.acceptedWpm ?? 0} WPM</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{Math.round(rightPlayer?.accuracy ?? 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* --- TRANSLUCENT HORIZONTAL TYPING STRIP BANNER --- */}
        {!showStatsOverlay && (
          <div
            id="active-typing-banner"
            data-testid="typing-deck"
            aria-disabled={is3DMode && !isIntroComplete}
            onTouchStart={() => {
              if (!is3DMode || isIntroComplete) typingInputRef.current?.focus();
            }}
            onClick={() => {
              if (!is3DMode || isIntroComplete) typingInputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              // ponytail: In portrait mode, dock cleanly at bottom above keyboard; in landscape center between fighters
              top: isPortrait ? 'auto' : (keyboardOffset > 0 ? 'auto' : (viewportWidth < 768 ? '60%' : '54%')),
              bottom: isPortrait ? (keyboardOffset > 0 ? '8px' : '18px') : (keyboardOffset > 0 ? '12px' : 'auto'),
              left: '50%',
              transform: (isPortrait || keyboardOffset > 0) ? 'translateX(-50%)' : 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isPortrait ? '4px' : '6px',
              zIndex: 10,
              width: isPortrait ? 'calc(100% - 16px)' : (viewportWidth < 600 ? '94%' : 'min(640px, 86vw)'),
              maxWidth: '660px',
              padding: isPortrait ? '0 4px' : '0 8px',
              boxSizing: 'border-box',
              flexShrink: 0,
              opacity: is3DMode && !isIntroComplete ? 0.35 : 1,
              pointerEvents: is3DMode && !isIntroComplete ? 'none' : 'auto',
              transition: 'opacity 0.25s ease, transform 0.2s ease'
            }}
          >
            {/* Combo Indicator pill - Model 1 Tiered Milestone Finishers */}
            {myCombo >= 3 && (
              <div
                data-testid="combo-indicator"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  background: myCombo >= 8
                    ? 'linear-gradient(90deg, #8b5cf6, #ec4899, #f43f5e)'
                    : myCombo >= 5
                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                    : 'linear-gradient(90deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: viewportWidth < 600 ? '0.68rem' : '0.8rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  boxShadow: myCombo >= 8
                    ? '0 0 16px rgba(236, 72, 153, 0.7), 0 4px 14px rgba(139, 92, 246, 0.6)'
                    : myCombo >= 5
                    ? '0 0 14px rgba(239, 68, 68, 0.7), 0 4px 12px rgba(220, 38, 38, 0.5)'
                    : '0 4px 12px rgba(245, 158, 11, 0.6)'
                }}
              >
                {myCombo >= 8 ? (
                  <>⚡ OVERDRIVE x{myCombo}! (+12 DMG)</>
                ) : myCombo >= 5 ? (
                  <>🗡️ WEAPON FINISHER x{myCombo}! (+8 DMG)</>
                ) : (
                  <>💥 POWER STRIKE x{myCombo}! (+4 DMG)</>
                )}
              </div>
            )}

            {/* --- 2-LINE STATIC TYPING STRIP BANNER --- */}
            <div style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: isErrorFlash ? '2px solid #ef4444' : '1px solid rgba(56, 189, 248, 0.45)',
              borderRadius: '14px',
              padding: viewportWidth < 600 ? '8px 12px' : '10px 18px',
              boxShadow: isErrorFlash
                ? '0 0 24px rgba(239, 68, 68, 0.55), 0 8px 32px rgba(0, 0, 0, 0.5)'
                : '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(56, 189, 248, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              position: 'relative'
            }}>
              {/* Line 1: Active Line with Monospace Character Stream (Zero Layout Shift) */}
              <div style={{
                width: '100%',
                textAlign: 'center',
                whiteSpace: 'pre',
                overflowX: 'auto',
                fontSize: isPortrait ? '1.25rem' : (viewportWidth < 600 ? '1.1rem' : 'clamp(1.15rem, 2.4vw, 1.45rem)'),
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', Courier, 'Roboto Mono', monospace",
                letterSpacing: '0.5px',
                lineHeight: 1.25
              }}>
                {(() => {
                  const currentLineIndex = Math.floor(activeWordIndex / wordsPerLine);
                  const lineStartIndex = currentLineIndex * wordsPerLine;
                  const currentLineWords = wordsList.slice(lineStartIndex, lineStartIndex + wordsPerLine);
                  
                  const lineText = currentLineWords.join('');
                  let currentCharIndexOnLine = 0;
                  for (let i = lineStartIndex; i < activeWordIndex; i++) {
                    currentCharIndexOnLine += (wordsList[i]?.length || 0);
                  }
                  currentCharIndexOnLine += typedCharIndex;

                  return Array.from(lineText).map((char, charIdx) => {
                    const isPast = charIdx < currentCharIndexOnLine;
                    const isCurrent = charIdx === currentCharIndexOnLine;

                    return (
                      <span
                        key={`line1-char-${charIdx}`}
                        className={isCurrent ? 'typing-caret' : undefined}
                        data-testid={isCurrent ? 'typing-caret' : undefined}
                        style={{
                          color: isPast ? '#4ade80' : isCurrent ? (isErrorFlash ? '#ffffff' : '#0f172a') : 'var(--text-main)',
                          background: isCurrent ? (isErrorFlash ? '#ef4444' : '#eab308') : 'transparent',
                          fontWeight: isCurrent ? 800 : isPast ? 700 : 500,
                          borderRadius: isCurrent ? '2px' : '0px'
                        }}
                      >
                        {char === ' ' ? '\u00A0' : char}
                      </span>
                    );
                  });
                })()}
              </div>

              {/* Line 2: Preview Line (Upcoming Line Words in Dimmed Monospace) */}
              <div style={{
                width: '100%',
                textAlign: 'center',
                whiteSpace: 'pre',
                overflowX: 'auto',
                fontSize: isPortrait ? '0.92rem' : (viewportWidth < 600 ? '0.85rem' : 'clamp(0.85rem, 1.8vw, 1.05rem)'),
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', Courier, 'Roboto Mono', monospace",
                color: 'var(--text-muted)',
                opacity: 0.65,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                paddingTop: '4px',
                letterSpacing: '0.5px'
              }}>
                {(() => {
                  const currentLineIndex = Math.floor(activeWordIndex / wordsPerLine);
                  const nextLineStartIndex = (currentLineIndex + 1) * wordsPerLine;
                  const nextLineWords = wordsList.slice(nextLineStartIndex, nextLineStartIndex + wordsPerLine);
                  const nextLineText = nextLineWords.join('');

                  return Array.from(nextLineText).map((char, idx) => (
                    <span key={`line2-char-${idx}`}>
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* --- IN-ARENA STATS DASHBOARD OVERLAY --- */}
        {showStatsOverlay && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(7, 15, 28, 0.88)', backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 40, padding: isPortrait ? '12px 10px' : '16px'
          }}>
            <div className="glass-panel" style={{
              width: '100%', maxWidth: '780px', maxHeight: isPortrait ? '94vh' : '90vh', overflowY: 'auto',
              padding: isPortrait ? '16px 14px' : '24px 20px',
              background: 'rgba(15, 23, 42, 0.95)', border: '2px solid rgba(74, 222, 128, 0.4)',
              borderRadius: isPortrait ? '18px' : '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
              textAlign: 'center', position: 'relative'
            }}>
              {/* Top Winner Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 16px', borderRadius: '999px',
                background: completedState?.winnerSessionId === room.sessionId ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: completedState?.winnerSessionId === room.sessionId ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                color: completedState?.winnerSessionId === room.sessionId ? '#4ade80' : '#f87171',
                fontSize: isPortrait ? '0.74rem' : '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px',
                marginBottom: isPortrait ? '8px' : '12px'
              }}>
                <Trophy size={16} />
                {completedState?.winnerSessionId === room.sessionId ? 'VICTORY BY KNOCKOUT!' : 'DEFEATED IN MATCH'}
              </div>

              <h2 style={{
                fontSize: isPortrait ? '1.6rem' : 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900,
                marginBottom: isPortrait ? '12px' : '20px',
                color: completedState?.winnerSessionId === room.sessionId ? '#4ade80' : '#f87171',
                textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 4px 16px rgba(0,0,0,0.8)'
              }}>
                {completedState?.winnerSessionId === room.sessionId ? 'MATCH WINNER' : 'MATCH COMPLETE'}
              </h2>

              {/* Side by side stats grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isPortrait ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: isPortrait ? '8px' : '12px',
                marginBottom: isPortrait ? '14px' : '24px'
              }}>
                {/* My Stats Card */}
                <div
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1.5px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '16px',
                    padding: isPortrait ? '10px 12px' : '14px 16px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 900, color: '#4ade80', fontSize: isPortrait ? '0.9rem' : '0.98rem' }}>
                    <span>🎩</span> {myPlayer?.displayName || 'YOU'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: isPortrait ? '0.8rem' : '0.85rem', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Remaining HP:</span>
                      <strong style={{ color: '#4ade80' }}>{myPlayer?.health ?? 0} / 200</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Combat WPM:</span>
                      <strong style={{ color: '#38bdf8' }}>{myPlayer?.acceptedWpm ?? 0} WPM</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Typing Accuracy:</span>
                      <strong style={{ color: '#34d399' }}>{myPlayer?.accuracy ?? 100}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Max Combo:</span>
                      <strong style={{ color: '#fbbf24' }}>{myPlayer?.highestCombo ?? 0}x</strong>
                    </div>
                    {(() => {
                      const isWinner = (matchEndPayloadRef.current?.winnerSessionId || completedState?.winnerSessionId) === room.sessionId;
                      const myDelta = matchEndPayloadRef.current?.mmrDeltas?.[room.sessionId];
                      const deltaVal = myDelta?.delta ?? (isWinner ? 24 : -16);
                      const playerMmr = myDelta?.newMmr ?? (typeof myPlayer?.mmr === 'number' ? myPlayer.mmr : ((guest as any)?.mmr ?? 1000) + deltaVal);
                      const playerTier = getRankTier(playerMmr);

                      return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '2px' }}>
                          <span>Rank & MMR:</span>
                          <strong style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <RankBadge tier={playerTier} rating={playerMmr} size="sm" />
                            <span>{playerMmr}</span>
                            <span style={{ color: deltaVal >= 0 ? '#4ade80' : '#f87171', fontSize: '0.8rem' }}>
                              ({deltaVal >= 0 ? `+${deltaVal}` : deltaVal})
                            </span>
                          </strong>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Opponent Stats Card */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px', padding: isPortrait ? '10px 12px' : '14px 16px', textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 900, color: '#f87171', fontSize: isPortrait ? '0.9rem' : '0.98rem' }}>
                    <span>👓</span> {(() => {
                      let opp: any = null;
                      completedState?.players?.forEach((p: any, sId: string) => {
                        if (sId !== room.sessionId) opp = p;
                      });
                      return opp?.displayName || 'OPPONENT';
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: isPortrait ? '0.8rem' : '0.85rem', color: '#cbd5e1' }}>
                    {(() => {
                      let opp: any = null;
                      let oppSId: string | null = null;
                      completedState?.players?.forEach((p: any, sId: string) => {
                        if (sId !== room.sessionId) {
                          opp = p;
                          oppSId = sId;
                        }
                      });
                      const isOppWinner = (matchEndPayloadRef.current?.winnerSessionId || completedState?.winnerSessionId) === oppSId;
                      const oppDelta = oppSId ? matchEndPayloadRef.current?.mmrDeltas?.[oppSId] : null;
                      const oppDeltaVal = oppDelta?.delta ?? (isOppWinner ? 24 : -16);
                      const oppMmr = oppDelta?.newMmr ?? (typeof opp?.mmr === 'number' ? opp.mmr : 1000);
                      const oppTier = getRankTier(oppMmr);

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Remaining HP:</span>
                            <strong style={{ color: '#f87171' }}>{opp?.health ?? 0} / 200</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Combat WPM:</span>
                            <strong style={{ color: '#38bdf8' }}>{opp?.acceptedWpm ?? 0} WPM</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Typing Accuracy:</span>
                            <strong style={{ color: '#34d399' }}>{opp?.accuracy ?? 100}%</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Max Combo:</span>
                            <strong style={{ color: '#fbbf24' }}>{opp?.highestCombo ?? 0}x</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px', marginTop: '2px' }}>
                            <span>Rank & MMR:</span>
                            <strong style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <RankBadge tier={oppTier} rating={oppMmr} size="sm" />
                              <span>{oppMmr}</span>
                              <span style={{ color: oppDeltaVal >= 0 ? '#4ade80' : '#f87171', fontSize: '0.8rem' }}>
                                ({oppDeltaVal >= 0 ? `+${oppDeltaVal}` : oppDeltaVal})
                              </span>
                            </strong>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Button & Skip Prompt */}
              <div style={{
                display: 'flex',
                flexDirection: isPortrait ? 'column' : 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: isPortrait ? '8px' : '12px',
                width: '100%'
              }}>
                <button
                  onClick={() => onMatchComplete(getFullMatchResult())}
                  style={{
                    width: isPortrait ? '100%' : 'auto',
                    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                    border: 'none', borderRadius: '12px',
                    padding: isPortrait ? '14px 20px' : '12px 24px',
                    color: '#ffffff', fontWeight: 900,
                    fontSize: isPortrait ? '0.98rem' : '0.95rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  CONTINUE TO FULL RESULTS <ArrowRight size={18} />
                </button>

                <button
                  onClick={handleDownloadResultCard}
                  disabled={isDownloadingCard}
                  style={{
                    width: isPortrait ? '100%' : 'auto',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1.5px solid #38bdf8',
                    borderRadius: '12px',
                    padding: isPortrait ? '12px 18px' : '12px 20px',
                    color: '#38bdf8',
                    fontWeight: 900,
                    fontSize: '0.92rem',
                    cursor: isDownloadingCard ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(56, 189, 248, 0.25)',
                  }}
                >
                  <Download size={18} /> {isDownloadingCard ? 'Downloading PNG...' : 'DOWNLOAD RESULT CARD'}
                </button>
              </div>

              {!isPortrait && (
                <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <FastForward size={14} color="#eab308" /> Press <strong style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>ENTER</strong> to skip
                </div>
              )}
            </div>
          </div>
        )}



        {/* AI Bot Paused Overlay */}
        {isPaused && !showStatsOverlay && !isMatchEndedRef.current && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(7, 15, 28, 0.85)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 35
          }}>
            <div className="glass-panel" style={{
              padding: '36px 48px', borderRadius: '24px', textAlign: 'center',
              border: '2px solid rgba(234, 179, 8, 0.5)', background: 'rgba(15, 23, 42, 0.95)',
              boxShadow: '0 0 50px rgba(234, 179, 8, 0.3)', maxWidth: '480px', width: '90%'
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.2)',
                color: '#eab308', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <Pause size={32} />
              </div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f8fafc', marginBottom: '8px', letterSpacing: '1px' }}>
                GAME PAUSED
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '24px' }}>
                Practice match with Highland Bot AI is paused.
              </p>
              <button
                className="btn-primary"
                onClick={handleTogglePause}
                style={{
                  padding: '12px 32px', fontSize: '1.05rem', background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                  color: '#0f172a', fontWeight: 900, border: 'none', borderRadius: '12px', width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <Play size={18} fill="#0f172a" /> RESUME MATCH <span className="kbd-badge" style={{ background: 'rgba(0,0,0,0.2)', color: '#0f172a' }}>Esc</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Duel Leave / Forfeit Confirmation Modal */}
        {showLeaveConfirmModal && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(7, 15, 28, 0.88)', backdropFilter: 'blur(10px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 45
          }}>
            <div className="glass-panel" style={{
              padding: '36px 40px', borderRadius: '24px', textAlign: 'center',
              border: '2px solid rgba(239, 68, 68, 0.5)', background: 'rgba(15, 23, 42, 0.95)',
              boxShadow: '0 0 50px rgba(239, 68, 68, 0.3)', maxWidth: '480px', width: '90%'
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
              }}>
                <AlertTriangle size={32} />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#f43f5e', marginBottom: '8px' }}>
                LEAVE DUEL?
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
                If you leave during a live duel, you will <strong style={{ color: '#f87171' }}>forfeit and lose</strong> the match. Your opponent will win.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowLeaveConfirmModal(false)}
                  style={{ flex: 1, padding: '12px 20px', borderRadius: '12px' }}
                >
                  Keep Playing
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowLeaveConfirmModal(false);
                    room.send('leave_match', {});
                  }}
                  style={{ flex: 1, padding: '12px 20px', borderRadius: '12px', background: '#ef4444', color: '#fff', fontWeight: 900 }}
                >
                  <LogOut size={16} /> Forfeit & Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchPage;
