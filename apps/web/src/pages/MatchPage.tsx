import React, { useEffect, useRef, useState } from 'react';
import { Room } from 'colyseus.js';
import Phaser from 'phaser';
import { Volume2, VolumeX, Flame, Trophy, ArrowRight, FastForward, Pause, Play, LogOut, AlertTriangle } from 'lucide-react';
import { StickFightScene, AttackKind } from '../game/StickFightScene';
import { GuestProfile } from '../lib/supabase';
import { soundManager } from '../audio/SoundManager';
import { RankBadge } from '../components/ranked/RankBadge';
import { soundSynth } from '../game/audio/SoundSynth';

interface MatchPageProps {
  room: Room;
  guest: GuestProfile;
  onMatchComplete: (resultData: any) => void;
}

export const MatchPage: React.FC<MatchPageProps> = ({ room, guest: _guest, onMatchComplete }) => {
  const phaserContainerRef = useRef<HTMLDivElement>(null);
  const mainBoxRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<StickFightScene | null>(null);

  const [matchState, setMatchState] = useState<any>(() => room?.state || null);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [remainingTime, setRemainingTime] = useState<number>(90);
  const [muted, setMuted] = useState<boolean>(() => soundManager.isMuted());
  const prevStatusRef = useRef<string>(room?.state?.status || 'lobby');

  // In-Arena KO Finish Sequence & Stats Overlay State
  const [showStatsOverlay, setShowStatsOverlay] = useState<boolean>(false);
  const [completedState, setCompletedState] = useState<any>(null);
  const isMatchEndedRef = useRef<boolean>(false);

  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(() => room?.state?.isPaused || false);

  const [viewportWidth, setViewportWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
  const [visibleHeight, setVisibleHeight] = useState<number>(() => typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 600);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const wordsPerLine = React.useMemo(() => {
    if (viewportWidth < 480) return 2;
    if (viewportWidth < 768) return 4;
    return 7;
  }, [viewportWidth]);

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
        sceneRef.current.setCharacterSkins(p1CharId, p2CharId);
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

      const { p1CharId, p2CharId } = getPlayerCharacterIds(state);
      if (sceneRef.current) {
        sceneRef.current.setCharacterSkins(p1CharId, p2CharId);
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
          sceneRef.current.updateCombo(mySide, me.combo || 0);
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

        // Trigger KO slow-mo sequence in Phaser
        if (sceneRef.current) {
          sceneRef.current.triggerKOSequence(loserSide, winnerSide, () => {
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

        if (isMyEvent) {
          syncLocalProgress(event.wordIndex, event.charIndex);
        }
      } else if (event.type === 'word_completed') {
        const attackKind: AttackKind = event.attackKind || 'jab';
        const isHeavyAttack = attackKind === 'kick' || attackKind === 'heavy' || attackKind === 'uppercut';

        // Play punchy impact sound on word completion
        soundManager.playHit(isHeavyAttack);

        if (event.newCombo && event.newCombo >= 2) {
          soundSynth.playComboHit(event.newCombo);
        }

        if (isHeavyAttack) {
          soundSynth.playHeavyImpact(attackKind === 'heavy');
        }

        if (event.damage && event.damage >= 25) {
          soundSynth.playCriticalHit();
        }

        sceneRef.current?.triggerAttack(side, attackKind, event.damage, event.newCombo || 0);

        if (isMyEvent) {
          syncLocalProgress(event.nextWordIndex, event.nextCharIndex);
        }
      } else if (event.type === 'key_error' && isMyEvent) {
        soundSynth.playKeyError();
        const now = Date.now();
        stunnedUntilMsRef.current = now + 500;
        syncAndResetInput();
        syncLocalProgress(event.wordIndex, event.charIndex);
        setIsErrorFlash(true);
        sceneRef.current?.triggerStun(mySide);
        setTimeout(() => setIsErrorFlash(false), 500);
      }
    });
  }, [room, onMatchComplete]);

  // Initialize Phaser Scene ONCE when container is mounted in DOM
  useEffect(() => {
    if (!phaserContainerRef.current || phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: phaserContainerRef.current,
      width: phaserContainerRef.current.clientWidth || window.innerWidth,
      height: phaserContainerRef.current.clientHeight || window.innerHeight,
      backgroundColor: '#1e293b',
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
  }, []);

  // Keep a real input focused during combat. Phaser owns the canvas, so a
  // focused input is more reliable than relying on canvas/window key events.
  useEffect(() => {
    if (matchState?.status === 'in_progress') {
      typingInputRef.current?.focus();
      const interval = setInterval(() => {
        if (document.activeElement !== typingInputRef.current && matchStateRef.current?.status === 'in_progress') {
          typingInputRef.current?.focus();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [matchState?.status]);

  // Capture phase is intentional: Phaser can consume keyboard events from its
  // canvas before React sees them. Listening on window makes typing work after
  // clicking anywhere in the arena, not just while the invisible input has
  // focus.
  const handleKeyPress = (char: string) => {
    if (showStatsOverlay || isMatchEndedRef.current || isPaused) return;
    if (room.state?.status !== 'in_progress') return;

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

  const handleInputDOMEvent = (e: React.FormEvent<HTMLInputElement> | React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCombatKey = (event: KeyboardEvent) => {
    if (showStatsOverlay || isMatchEndedRef.current) {
      if (event.key === 'Enter') {
        event.preventDefault();
        onMatchComplete(completedState || room.state);
        return;
      }
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

    // Soft keyboards on Android Gboard / iOS IME send 'Unidentified' or keycode 229; onInput/onChange handles extraction
    if (event.key === 'Unidentified' || event.key === '229') return;

    // Only accept typing input when match is actively in progress on live room state
    if (room.state?.status !== 'in_progress') {
      console.log('[CLIENT KEY DROPPED - status not in_progress]', room.state?.status);
      return;
    }

    const combatEvent = event as KeyboardEvent & { keyfuryHandled?: boolean };
    if (combatEvent.keyfuryHandled) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    combatEvent.keyfuryHandled = true;
    if (event.key.length > 1 && event.key !== 'Spacebar' && event.key !== ' ') return;

    let char = event.key;
    if (char === 'Spacebar' || char === ' ') {
      char = ' ';
    }

    // Allow all single printable ASCII characters (letters, numbers, space, hyphens '-', and symbols)
    if (char.length !== 1 || !/^[ -~]$/.test(char)) return;

    event.preventDefault();
    handleKeyPress(char);
  };

  const handleCombatInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
    handleCombatKey(event.nativeEvent);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleCombatKey, true);
    return () => window.removeEventListener('keydown', handleCombatKey, true);
  }, [room, showStatsOverlay, completedState, isBotMode, isPaused]);

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

  return (
    <div style={{
      width: '100vw',
      height: keyboardOffset > 0 ? `${visibleHeight}px` : '100dvh',
      maxHeight: '100%',
      padding: '0',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'fixed',
      inset: 0,
      background: '#1e293b'
    }}>
      {/* Viewport Arena Box */}
      <div
        ref={mainBoxRef}
        tabIndex={-1}
        onTouchStart={() => {
          typingInputRef.current?.focus();
        }}
        onClick={() => {
          typingInputRef.current?.focus();
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          typingInputRef.current?.focus();
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
        {/* Phaser Canvas (Upper Fight Arena) */}
        <div
          ref={phaserContainerRef}
          style={{
            width: '100%',
            flex: keyboardOffset > 0 || viewportWidth < 768 ? '1 1 0' : '1 1 100%',
            minHeight: 0,
            position: 'relative'
          }}
        />
        
        <input
          ref={typingInputRef}
          aria-label="Combat typing input"
          type="text"
          name="combat_keystroke_input"
          id="combat_keystroke_input"
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
          onChange={handleInputDOMEvent}
          onKeyDown={handleCombatInput}
          style={{
            position: 'fixed',
            bottom: '-100px',
            left: '-100px',
            width: '1px',
            height: '1px',
            opacity: 0,
            border: 'none',
            background: 'transparent',
            color: 'transparent',
            outline: 'none',
            cursor: 'default',
            pointerEvents: 'none',
            zIndex: -1
          }}
        />

        {/* --- TOP HUD OVERLAYS --- */}
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
            <span style={{
              fontSize: viewportWidth < 600 ? '1.2rem' : 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: 900, fontFamily: 'var(--font-mono)',
              color: remainingTime <= 15 ? '#ef4444' : '#4ade80', lineHeight: 1
            }}>
              {remainingTime}
            </span>
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
          </div>
        </div>

        {/* --- TRANSLUCENT HORIZONTAL TYPING STRIP BANNER --- */}
        {!showStatsOverlay && (
          <div
            id="active-typing-banner"
            onTouchStart={() => typingInputRef.current?.focus()}
            onClick={() => typingInputRef.current?.focus()}
            style={{
              position: keyboardOffset > 0 || viewportWidth < 768 ? 'relative' : 'absolute',
              bottom: keyboardOffset > 0 || viewportWidth < 768 ? '0px' : '16px',
              left: keyboardOffset > 0 || viewportWidth < 768 ? 'auto' : '50%',
              transform: keyboardOffset > 0 || viewportWidth < 768 ? 'none' : 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              zIndex: 10,
              width: '100%',
              maxWidth: '1080px',
              padding: viewportWidth < 600 ? '2px 8px 6px 8px' : '0 16px 14px 16px',
              boxSizing: 'border-box',
              flexShrink: 0
            }}
          >
            {/* Combo Indicator pill */}
            {myCombo >= 3 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '2px 8px', borderRadius: '999px',
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                color: '#ffffff', fontWeight: 900, fontSize: viewportWidth < 600 ? '0.68rem' : '0.78rem',
                letterSpacing: '1px', textTransform: 'uppercase',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.6)'
              }}>
                <Flame size={13} /> COMBO STREAK x{myCombo}! (+5 DMG)
              </div>
            )}

            {/* --- 2-LINE STATIC TYPING STRIP BANNER --- */}
            <div style={{
              width: '100%',
              background: '#0f172a',
              border: isErrorFlash ? '2px solid #ef4444' : '1px solid var(--border-card)',
              borderRadius: '12px',
              padding: viewportWidth < 600 ? '6px 10px' : '10px 16px',
              boxShadow: isErrorFlash
                ? '0 0 16px rgba(239, 68, 68, 0.45)'
                : '0 4px 16px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              position: 'relative'
            }}>
              {/* Line 1: Active Line with Monospace Character Stream (Zero Layout Shift) */}
              <div style={{
                width: '100%',
                whiteSpace: 'pre',
                overflowX: 'auto',
                fontSize: viewportWidth < 600 ? '1.1rem' : 'clamp(1.1rem, 4vw, 1.75rem)',
                fontFamily: "'Courier New', Courier, 'Roboto Mono', monospace",
                letterSpacing: '0px',
                lineHeight: 1.2
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
                whiteSpace: 'pre',
                overflowX: 'auto',
                fontSize: viewportWidth < 600 ? '0.85rem' : 'clamp(0.85rem, 3vw, 1.2rem)',
                fontFamily: "'Courier New', Courier, 'Roboto Mono', monospace",
                color: 'var(--text-muted)',
                opacity: 0.7,
                borderTop: '1px solid var(--border-card)',
                paddingTop: '4px',
                letterSpacing: '0px'
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
            background: 'rgba(7, 15, 28, 0.78)', backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 40, padding: '16px'
          }}>
            <div className="glass-panel" style={{
              width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px',
              background: 'rgba(15, 23, 42, 0.95)', border: '2px solid rgba(74, 222, 128, 0.4)',
              borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.85)',
              textAlign: 'center', position: 'relative'
            }}>
              {/* Top Winner Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '4px 16px', borderRadius: '999px',
                background: completedState?.winnerSessionId === room.sessionId ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: completedState?.winnerSessionId === room.sessionId ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                color: completedState?.winnerSessionId === room.sessionId ? '#4ade80' : '#f87171',
                fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px',
                marginBottom: '12px'
              }}>
                <Trophy size={16} />
                {completedState?.winnerSessionId === room.sessionId ? 'VICTORY BY KNOCKOUT!' : 'DEFEATED IN MATCH'}
              </div>

              <h2 style={{
                fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900, marginBottom: '20px',
                color: completedState?.winnerSessionId === room.sessionId ? '#4ade80' : '#f87171',
                textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 4px 16px rgba(0,0,0,0.8)'
              }}>
                {completedState?.winnerSessionId === room.sessionId ? 'MATCH WINNER' : 'MATCH COMPLETE'}
              </h2>

              {/* Side by side stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {/* My Stats Card */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px', padding: '14px 16px', textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 900, color: '#4ade80', fontSize: '0.98rem' }}>
                    <span>🎩</span> {myPlayer?.displayName || 'YOU'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>
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
                  </div>
                </div>

                {/* Opponent Stats Card */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px', padding: '14px 16px', textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: 900, color: '#f87171', fontSize: '0.98rem' }}>
                    <span>👓</span> {(() => {
                      let opp: any = null;
                      completedState?.players?.forEach((p: any, sId: string) => {
                        if (sId !== room.sessionId) opp = p;
                      });
                      return opp?.displayName || 'OPPONENT';
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    {(() => {
                      let opp: any = null;
                      completedState?.players?.forEach((p: any, sId: string) => {
                        if (sId !== room.sessionId) opp = p;
                      });
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
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Action Button & Skip Prompt */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => onMatchComplete(completedState || room.state)}
                  style={{
                    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                    border: 'none', borderRadius: '12px', padding: '12px 24px',
                    color: '#ffffff', fontWeight: 900, fontSize: '0.95rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 6px 20px rgba(34, 197, 94, 0.4)'
                  }}
                >
                  CONTINUE TO FULL RESULTS <ArrowRight size={18} />
                </button>
              </div>

              <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <FastForward size={14} color="#eab308" /> Press <strong style={{ color: '#ffffff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>ENTER</strong> to skip
              </div>
            </div>
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && countdown > 0 && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(7, 23, 10, 0.88)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', zIndex: 20
          }}>
            <span style={{ fontSize: '1.4rem', color: '#4ade80', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '8px' }}>
              FIGHTERS READY
            </span>
            <div style={{ fontSize: '7rem', fontWeight: 900, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
              {countdown}
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
