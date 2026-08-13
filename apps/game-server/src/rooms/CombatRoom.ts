import { Room, Client } from 'colyseus';
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import http from 'http';
import {
  generateSeededDeck,
  createInitialPlayerCombatState,
  processKeyIntent,
  calculateWpmAndAccuracy,
  getBotInputIntervalMs,
  BotDifficulty,
  PlayerCombatState,
  CombatEventLog,
  MATCH_RULES
} from '@keyfury/game-core';
import { ClientMessageSchema, ServerEvent, EloResult } from '@keyfury/protocol';
import { CONTENT_VERSION } from '@keyfury/content';
import { supabaseServer, persistMatchResult, updatePlayerProfileMmr } from '../services/supabase.js';

export class PlayerState extends Schema {
  @type('string') sessionId: string = '';
  @type('string') profileId: string = '';
  @type('string') displayName: string = '';
  @type('string') side: 'left' | 'right' = 'left';
  @type('boolean') ready: boolean = false;
  @type('number') health: number = MATCH_RULES.STARTING_HEALTH;
  @type('number') activeWordIndex: number = 0;
  @type('number') wordTypedCharCount: number = 0;
  @type('number') combo: number = 0;
  @type('number') acceptedWpm: number = 0;
  @type('number') accuracy: number = 100;
  @type('number') highestCombo: number = 0;
  @type('number') wordsCompleted: number = 0;
  @type('boolean') connected: boolean = true;
  @type('number') mmr: number = 1000;
  @type('number') level: number = 1;
  @type('number') matchesPlayed: number = 0;
}

export class CombatRoomState extends Schema {
  @type('string') matchId: string = '';
  @type('string') status: 'waiting' | 'countdown' | 'in_progress' | 'completed' | 'forfeit' = 'waiting';
  @type('string') deckSeed: string = '';
  @type('number') countdownSeconds: number = 3;
  @type('number') remainingSeconds: number = MATCH_RULES.MATCH_DURATION_SECONDS;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(['string']) words = new ArraySchema<string>();
  @type('string') winnerSessionId: string = '';
  @type('string') endReason: string = '';
  @type('boolean') isChallenge: boolean = false;
  @type('string') roomCode: string = '';
  @type('boolean') isPaused: boolean = false;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  isPlacement: boolean = false
): EloResult & { deltaA: number; deltaB: number; newRatingA: number; newRatingB: number } {
  const kFactor = isPlacement ? 64 : 32;
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const scoreB = 1 - scoreA;
  const deltaA = Math.round(kFactor * (scoreA - expectedA));
  const deltaB = Math.round(kFactor * (scoreB - expectedB));

  const newRatingA = Math.max(0, ratingA + deltaA);
  const newRatingB = Math.max(0, ratingB + deltaB);

  const isAWinner = scoreA >= 0.5;
  return {
    deltaA,
    deltaB,
    newRatingA,
    newRatingB,
    winnerRating: isAWinner ? newRatingA : newRatingB,
    loserRating: isAWinner ? newRatingB : newRatingA,
    winnerDelta: isAWinner ? deltaA : deltaB,
    loserDelta: isAWinner ? deltaB : deltaA,
    kFactor
  };
}

export class CombatRoom extends Room<CombatRoomState> {
  maxClients = 2;
  private combatStates = new Map<string, PlayerCombatState>();
  private words: string[] = [];
  private matchTimerInterval?: any;
  private countdownInterval?: any;
  private botInterval?: any;
  private botFallbackTimeout?: any;
  private challengeExpiryTimeout?: any;
  private rematchVotes = new Map<string, boolean>();
  private rateLimiter = new Map<string, { count: number; resetAt: number; violations: number }>();
  private keystrokeTimes = new Map<string, number[]>();
  private lastKeystrokeTime = new Map<string, number>();
  private eventLog: CombatEventLog[] = [];
  private matchStartedAt: number = 0;
  private matchEnded: boolean = false;
  private integrityStatus: 'normal' | 'flagged' | 'forfeit' = 'normal';
  private hasBotOpponent: boolean = false;
  private botDifficulty: BotDifficulty = 'adaptive';

  async onAuth(_client: Client, options: any, request?: http.IncomingMessage) {
    const authHeader = request?.headers?.['authorization'];
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const token = options?.token || options?.auth?.token || headerToken;
    if (token) {
      if (supabaseServer) {
        const { data, error } = await supabaseServer.auth.getUser(token);
        if (error || !data?.user) {
          console.error('[CombatRoom] JWT verification failed:', error?.message);
          throw new Error('Unauthorized: Invalid JWT token');
        }
        return { user: data.user, userId: data.user.id };
      }
    }
    return true;
  }

  onCreate(options: { isChallenge?: boolean; withBot?: boolean; botDifficulty?: BotDifficulty }) {
    this.setState(new CombatRoomState());
    this.state.matchId = this.roomId;
    this.state.deckSeed = `deck-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this.state.isChallenge = !!options.isChallenge;
    this.hasBotOpponent = !!options.withBot;
    if (options.botDifficulty) {
      this.botDifficulty = options.botDifficulty;
    }

    this.setMetadata({
      isChallenge: !!options.isChallenge,
      withBot: !!options.withBot,
      isQuickDuel: !options.isChallenge && !options.withBot
    });

    if (this.state.isChallenge) {
      this.state.roomCode = generateRoomCode();
      this.challengeExpiryTimeout = setTimeout(() => {
        if (this.state.players.size < 2 && this.state.status === 'waiting') {
          console.log(`[CombatRoom] Challenge room ${this.roomId} expired after 10 minutes`);
          this.disconnect();
        }
      }, 10 * 60 * 1000);
    }

    this.generateRoomDeck();

    this.onMessage('ready', (client, message) => this.handleClientMessage(client, 'ready', message));
    this.onMessage('key_intent', (client, message) => this.handleClientMessage(client, 'key_intent', message));
    this.onMessage('rematch_vote', (client, message) => this.handleClientMessage(client, 'rematch_vote', message));
    this.onMessage('leave_match', (client, message) => this.handleClientMessage(client, 'leave_match', message));
    this.onMessage('toggle_pause', (client, message) => this.handleClientMessage(client, 'toggle_pause', message));

    console.log(`[CombatRoom] Created room ${this.roomId} (challenge=${this.state.isChallenge}, bot=${this.hasBotOpponent})`);
  }

  private getDeckDifficulty(): 'normal' | 'advanced' | 'expert' {
    if (this.botDifficulty === 'pro') return 'expert';
    if (this.botDifficulty === 'fighter') return 'advanced';

    let maxMmr = 1000;
    this.state.players.forEach((p) => {
      if (p.mmr > maxMmr) maxMmr = p.mmr;
    });

    // Platinum Tier (2000+ MMR) & above unlock symbols and punctuation prompts
    if (maxMmr >= 2000) return 'expert';
    // Silver & Gold Tiers (1200-1999 MMR) get harder/longer English vocabulary words (NO symbols)
    if (maxMmr >= 1200) return 'advanced';
    // Bronze Tier (< 1200 MMR) gets standard words
    return 'normal';
  }

  private generateRoomDeck() {
    const difficulty = this.getDeckDifficulty();
    this.state.words.clear();
    this.words = generateSeededDeck(this.state.deckSeed, 100, difficulty);
    this.words.forEach((w) => this.state.words.push(w));
    console.log(`[CombatRoom] Generated deck for room ${this.roomId} (seed=${this.state.deckSeed}, tier=${difficulty})`);
  }

  private startCountdown() {
    this.generateRoomDeck();
    this.state.status = 'countdown';
    this.state.countdownSeconds = 3;

    this.countdownInterval = setInterval(() => {
      this.state.countdownSeconds--;
      if (this.state.countdownSeconds <= 0) {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.startMatch();
      }
    }, 1000);
  }

  onJoin(client: Client, options: { profileId?: string; displayName?: string; withBot?: boolean; botDifficulty?: BotDifficulty; mmr?: number; level?: number; matchesPlayed?: number }) {
    if (this.state.players.size >= 2) {
      throw new Error('Room is full');
    }

    const authUserId = (client.auth as any)?.userId;
    // Security Fix: Only use profileId from authenticated JWT session; fallback to guest ID for unauthenticated connections
    const profileId = authUserId || `guest-${client.sessionId}`;
    const displayName = options.displayName || `Swift Falcon ${Math.floor(Math.random() * 900 + 100)}`;
    const side = this.state.players.size === 0 ? 'left' : 'right';
    const mmr = options.mmr ?? 1000;
    const level = Math.max(1, options.level ?? 1);
    const matchesPlayed = options.matchesPlayed ?? 0;

    if (options.botDifficulty) {
      this.botDifficulty = options.botDifficulty;
    }

    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.profileId = profileId;
    player.displayName = displayName;
    player.side = side;
    player.ready = false;
    player.mmr = mmr;
    player.level = level;
    player.matchesPlayed = matchesPlayed;

    this.state.players.set(client.sessionId, player);
    this.combatStates.set(client.sessionId, createInitialPlayerCombatState(client.sessionId));

    console.log(`[CombatRoom] Player joined: ${displayName} (${client.sessionId}) side=${side} MMR=${mmr}`);

    if (options.withBot || this.hasBotOpponent) {
      this.spawnBotOpponent();
    }

    // R3 Requirement: Silent 5s server bot fallback disabled for quick duels.
    // Client strictly manages 20s queue search timeout & interactive AI bot fallback modal.

    if (this.state.players.size === 2 && this.challengeExpiryTimeout) {
      clearTimeout(this.challengeExpiryTimeout);
      this.challengeExpiryTimeout = undefined;
    }
  }

  private spawnBotOpponent() {
    if (this.state.players.has('bot-ai-opponent')) return;

    this.hasBotOpponent = true;
    const botSessionId = 'bot-ai-opponent';
    const botPlayer = new PlayerState();
    botPlayer.sessionId = botSessionId;
    botPlayer.profileId = 'bot-profile';
    botPlayer.displayName = 'Highland Bot AI';
    botPlayer.side = 'right';
    botPlayer.ready = true;
    botPlayer.mmr = 1000;

    this.state.players.set(botSessionId, botPlayer);
    this.combatStates.set(botSessionId, createInitialPlayerCombatState(botSessionId));
    console.log(`[CombatRoom] Spawned AI Bot Opponent in room ${this.roomId}`);
  }

  public triggerSpawnBot() {
    this.spawnBotOpponent();
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.connected = false;

    if (this.state.status === 'waiting' || this.state.status === 'countdown') {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = undefined;
      }
      this.state.players.delete(client.sessionId);
      this.combatStates.delete(client.sessionId);
      this.state.status = 'waiting';

      this.state.players.forEach((p) => {
        p.ready = false;
      });
      this.broadcast('server_event', { type: 'player_disconnect', playerId: client.sessionId, gracePeriodSeconds: 0 } as ServerEvent);
      this.rateLimiter.delete(client.sessionId);
      this.keystrokeTimes.delete(client.sessionId);
      this.lastKeystrokeTime.delete(client.sessionId);
      this.rematchVotes.delete(client.sessionId);
      return;
    }

    if (this.state.status === 'in_progress' && !this.matchEnded) {
      if (consented) {
        console.log(`[CombatRoom] Player ${client.sessionId} explicitly left/forfeited.`);
        this.rateLimiter.delete(client.sessionId);
        this.keystrokeTimes.delete(client.sessionId);
        this.lastKeystrokeTime.delete(client.sessionId);
        this.rematchVotes.delete(client.sessionId);
        this.resolveForfeit(client.sessionId);
        return;
      }

      this.broadcast('server_event', {
        type: 'player_disconnect',
        playerId: client.sessionId,
        gracePeriodSeconds: MATCH_RULES.RECONNECT_GRACE_SECONDS
      } as ServerEvent);

      try {
        await this.allowReconnection(client, MATCH_RULES.RECONNECT_GRACE_SECONDS);
        player.connected = true;
        this.broadcast('server_event', { type: 'player_reconnect', playerId: client.sessionId } as ServerEvent);
        console.log(`[CombatRoom] Player reconnected within grace period: ${client.sessionId}`);
      } catch (_err) {
        if (!this.matchEnded) {
          console.log(`[CombatRoom] Reconnect grace period expired for ${client.sessionId}, resolving forfeit`);
          this.resolveForfeit(client.sessionId);
        }
      }
    }

    this.rateLimiter.delete(client.sessionId);
    this.keystrokeTimes.delete(client.sessionId);
    this.lastKeystrokeTime.delete(client.sessionId);
    this.rematchVotes.delete(client.sessionId);
  }

  onDispose() {
    if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (this.botInterval) clearTimeout(this.botInterval);
    if (this.botFallbackTimeout) clearTimeout(this.botFallbackTimeout);
    if (this.challengeExpiryTimeout) clearTimeout(this.challengeExpiryTimeout);

    this.rateLimiter.clear();
    this.keystrokeTimes.clear();
    this.lastKeystrokeTime.clear();
    this.rematchVotes.clear();
    this.combatStates.clear();
    console.log(`[CombatRoom] Room disposed: ${this.roomId}`);
  }

  private checkAntiCheat(sessionId: string, now: number) {
    // 1. Keystroke interval check (< 15ms)
    const lastTime = this.lastKeystrokeTime.get(sessionId) || 0;
    if (lastTime > 0) {
      const interval = now - lastTime;
      if (interval < 15) {
        this.integrityStatus = 'flagged';
        console.warn(`[AntiCheat] Flagged ${sessionId}: Inhumane interval of ${interval}ms (<15ms)`);
      }
    }
    this.lastKeystrokeTime.set(sessionId, now);

    // 2. WPM burst check (> 250 WPM over rolling 3-second window)
    let timestamps = this.keystrokeTimes.get(sessionId) || [];
    timestamps.push(now);
    const windowMs = 3000;
    timestamps = timestamps.filter((t) => now - t <= windowMs);
    this.keystrokeTimes.set(sessionId, timestamps);

    if (timestamps.length >= 8) {
      const durationSec = (now - timestamps[0]) / 1000;
      if (durationSec > 0) {
        const burstWpm = (timestamps.length / 5) / (durationSec / 60);
        if (burstWpm > 250) {
          this.integrityStatus = 'flagged';
          console.warn(`[AntiCheat] Flagged ${sessionId}: Impossible WPM burst of ${Math.round(burstWpm)} WPM (>250 WPM)`);
        }
      }
    }

    // 3. Keystroke Jitter / Variance Check (detects uniform auto-typing scripts)
    if (timestamps.length >= 15) {
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // Automated scripts typically have < 2.0ms standard deviation across 15 keystrokes
      if (stdDev < 2.0 && mean < 200) {
        this.integrityStatus = 'flagged';
        console.warn(`[AntiCheat] Flagged ${sessionId}: Automated keystroke script pattern detected (stdDev=${stdDev.toFixed(2)}ms)`);
      }
    }
  }

  private handleClientMessage(client: Client, type: any, message: any) {
    const now = Date.now();
    let rl = this.rateLimiter.get(client.sessionId);
    if (!rl || now > rl.resetAt) {
      rl = { count: 0, resetAt: now + 1000, violations: rl?.violations || 0 };
      this.rateLimiter.set(client.sessionId, rl);
    }
    rl.count++;
    if (rl.count > MATCH_RULES.MAX_INPUTS_PER_SECOND) {
      rl.violations++;
      if (rl.violations > 5) {
        this.integrityStatus = 'flagged';
      }
      const combat = this.combatStates.get(client.sessionId);
      client.send('server_event', {
        type: 'key_error',
        playerId: client.sessionId,
        seq: 0,
        comboReset: false,
        wordIndex: combat?.activeWordIndex ?? 0,
        charIndex: combat?.wordTypedCharCount ?? 0
      } as ServerEvent);
      return;
    }

    const payload = typeof message === 'object' && message !== null ? { type, ...message } : { type };
    const parseRes = ClientMessageSchema.safeParse(payload);
    if (!parseRes.success) {
      console.error('[CombatRoom] Zod validation failed for payload:', payload, parseRes.error.format());
      return;
    }

    const msg = parseRes.data;

    switch (msg.type) {
      case 'ready':
        this.handlePlayerReady(client);
        break;
      case 'key_intent':
        this.checkAntiCheat(client.sessionId, now);
        this.handleKeyIntent(client, msg.seq, msg.key, msg.clientTimeMs);
        break;
      case 'rematch_vote':
        this.handleRematchVote(client, msg.accepted);
        break;
      case 'leave_match':
        if (this.state.status === 'in_progress' && !this.matchEnded) {
          console.log(`[CombatRoom] Player ${client.sessionId} forfeited/left the match.`);
          this.resolveForfeit(client.sessionId);
        } else {
          client.leave();
        }
        break;
      case 'toggle_pause':
        this.handleTogglePause(client);
        break;
    }
  }

  private handleTogglePause(_client: Client) {
    const isBotMatch = this.hasBotOpponent || this.state.players.has('bot-ai-opponent');
    if (!isBotMatch || this.state.status !== 'in_progress' || this.matchEnded) return;
    this.state.isPaused = !this.state.isPaused;
    console.log(`[CombatRoom] Bot match pause state toggled to: ${this.state.isPaused}`);
  }

  private handlePlayerReady(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || this.state.status !== 'waiting') return;

    player.ready = true;

    if (this.hasBotOpponent && this.state.players.has('bot-ai-opponent')) {
      const bot = this.state.players.get('bot-ai-opponent');
      if (bot) bot.ready = true;
    }

    let allReady = this.state.players.size >= 2;
    this.state.players.forEach((p) => {
      if (!p.ready) allReady = false;
    });

    if (allReady) {
      this.startCountdown();
    }
  }

  private startMatch() {
    this.state.status = 'in_progress';
    this.state.remainingSeconds = MATCH_RULES.MATCH_DURATION_SECONDS;
    this.matchStartedAt = Date.now();
    this.eventLog = [];

    this.broadcast('server_event', { type: 'match_start', countdownSeconds: 0 } as ServerEvent);

    if (this.hasBotOpponent) {
      this.startBotTypingLoop();
    }

    this.matchTimerInterval = setInterval(() => {
      if (this.state.isPaused) {
        this.matchStartedAt += 1000;
        return;
      }

      this.state.remainingSeconds--;

      const elapsedSec = Math.max(1, (Date.now() - this.matchStartedAt) / 1000);
      this.state.players.forEach((p, sId) => {
        const cs = this.combatStates.get(sId);
        if (cs) {
          const stats = calculateWpmAndAccuracy(cs, elapsedSec);
          p.acceptedWpm = stats.wpm;
          p.accuracy = stats.accuracy;
        }
      });

      if (this.state.remainingSeconds <= 0) {
        clearInterval(this.matchTimerInterval);
        if (this.botInterval) clearTimeout(this.botInterval);
        this.resolveTimeUp();
      }
    }, 1000);
  }

  private startBotTypingLoop() {
    const botSessionId = 'bot-ai-opponent';
    let seq = 0;

    const scheduleNextKey = () => {
      if (this.matchEnded || this.state.status !== 'in_progress') {
        if (this.botInterval) clearTimeout(this.botInterval);
        return;
      }

      if (this.state.isPaused) {
        this.botInterval = setTimeout(scheduleNextKey, 200);
        return;
      }

      const botCombat = this.combatStates.get(botSessionId);
      const botState = this.state.players.get(botSessionId);
      if (!botCombat || !botState) return;

      const currentWord = this.words[botCombat.activeWordIndex];
      if (!currentWord) return;

      const targetChar = currentWord[botCombat.wordTypedCharCount];
      if (!targetChar) return;

      seq++;

      let humanId = '';
      let humanCombat: PlayerCombatState | undefined;
      let humanWpm = 40;

      this.combatStates.forEach((cs, sId) => {
        if (sId !== botSessionId) {
          humanId = sId;
          humanCombat = cs;
          const hState = this.state.players.get(sId);
          if (hState && hState.acceptedWpm > 0) {
            humanWpm = hState.acceptedWpm;
          }
        }
      });

      if (!humanCombat) return;

      const res = processKeyIntent(botCombat, humanCombat, targetChar, this.words, Date.now(), seq);

      if (res.success) {
        if (res.type === 'char_advanced') {
          botState.wordTypedCharCount = res.charIndex;
          this.broadcast('server_event', {
            type: 'key_accepted',
            playerId: botSessionId,
            seq,
            char: targetChar,
            wordIndex: res.wordIndex,
            charIndex: res.charIndex
          } as ServerEvent);
        } else if (res.type === 'word_completed') {
          botState.activeWordIndex = botCombat.activeWordIndex;
          botState.wordTypedCharCount = 0;
          botState.combo = res.newCombo;
          botState.highestCombo = botCombat.highestCombo;
          botState.wordsCompleted = botCombat.wordsCompleted;

          const humanState = this.state.players.get(humanId);
          if (humanState) {
            humanState.health = humanCombat.health;
          }

          this.broadcast('server_event', {
            type: 'word_completed',
            playerId: botSessionId,
            word: res.word,
            wordIndex: res.wordIndex,
            nextWordIndex: botCombat.activeWordIndex,
            nextCharIndex: botCombat.wordTypedCharCount,
            attackKind: res.attackKind,
            damage: res.damageDealt,
            newHealth: humanCombat.health,
            newCombo: res.newCombo
          } as ServerEvent);

          if (humanCombat.health <= 0) {
            if (this.botInterval) clearTimeout(this.botInterval);
            this.resolveKnockout(botSessionId);
            return;
          }
        }
      }

      const delayMs = getBotInputIntervalMs(this.botDifficulty, humanWpm);
      this.botInterval = setTimeout(scheduleNextKey, delayMs);
    };

    scheduleNextKey();
  }

  private handleKeyIntent(client: Client, seq: number, key: string, _clientTimeMs: number) {
    if (this.matchEnded || this.state.status !== 'in_progress' || this.state.isPaused) return;

    const pState = this.state.players.get(client.sessionId);
    const pCombat = this.combatStates.get(client.sessionId);

    let opponentId = '';
    let oppCombat: PlayerCombatState | undefined;
    this.combatStates.forEach((cs, id) => {
      if (id !== client.sessionId) {
        opponentId = id;
        oppCombat = cs;
      }
    });

    if (!oppCombat) {
      opponentId = 'dummy-opponent';
      oppCombat = createInitialPlayerCombatState('dummy-opponent');
    }

    if (!pState || !pCombat) return;

    const res = processKeyIntent(pCombat, oppCombat, key, this.words, Date.now(), seq, this.eventLog);

    if (!res.success) {
      if (res.comboReset) {
        pState.combo = 0;
      }

      this.broadcast('server_event', {
        type: 'key_error',
        playerId: client.sessionId,
        seq,
        comboReset: res.comboReset,
        wordIndex: pCombat.activeWordIndex,
        charIndex: pCombat.wordTypedCharCount
      } as ServerEvent);
      return;
    }

    if (res.type === 'char_advanced') {
      pState.wordTypedCharCount = res.charIndex;
      this.broadcast('server_event', {
        type: 'key_accepted',
        playerId: client.sessionId,
        seq,
        char: key,
        wordIndex: res.wordIndex,
        charIndex: res.charIndex
      } as ServerEvent);
    } else if (res.type === 'word_completed') {
      pState.activeWordIndex = pCombat.activeWordIndex;
      pState.wordTypedCharCount = 0;
      pState.combo = res.newCombo;
      pState.highestCombo = pCombat.highestCombo;
      pState.wordsCompleted = pCombat.wordsCompleted;

      const oppState = this.state.players.get(opponentId);
      if (oppState) {
        oppState.health = oppCombat.health;
      }

      this.broadcast('server_event', {
        type: 'word_completed',
        playerId: client.sessionId,
        word: res.word,
        wordIndex: res.wordIndex,
        nextWordIndex: pCombat.activeWordIndex,
        nextCharIndex: pCombat.wordTypedCharCount,
        attackKind: res.attackKind,
        damage: res.damageDealt,
        newHealth: oppCombat.health,
        newCombo: res.newCombo
      } as ServerEvent);

      if (oppCombat.health <= 0) {
        if (this.botInterval) clearTimeout(this.botInterval);
        this.resolveKnockout(client.sessionId);
      }
    }
  }

  private resolveKnockout(winnerSessionId: string) {
    if (this.matchEnded) return;
    this.endMatch(winnerSessionId, 'knockout');
  }

  private resolveTimeUp() {
    if (this.matchEnded) return;

    let highestHealth = -1;
    let winnerId: string | undefined = undefined;

    this.combatStates.forEach((cs, sId) => {
      if (cs.health > highestHealth) {
        highestHealth = cs.health;
        winnerId = sId;
      } else if (cs.health === highestHealth) {
        winnerId = undefined;
      }
    });

    this.endMatch(winnerId, 'time');
  }

  private resolveForfeit(disconnectedSessionId: string) {
    if (this.matchEnded) return;

    let winnerId: string | undefined = undefined;
    this.state.players.forEach((_p, sId) => {
      if (sId !== disconnectedSessionId) {
        winnerId = sId;
      }
    });

    this.endMatch(winnerId, 'forfeit');
  }

  private endMatch(winnerSessionId: string | undefined, reason: 'time' | 'knockout' | 'forfeit') {
    this.matchEnded = true;
    this.state.status = reason === 'forfeit' ? 'forfeit' : 'completed';
    this.state.winnerSessionId = winnerSessionId || '';
    this.state.endReason = reason;

    if (this.matchTimerInterval) clearInterval(this.matchTimerInterval);
    if (this.botInterval) clearTimeout(this.botInterval);

    // Calculate ELO deltas
    const playersList: { sessionId: string; state: PlayerState }[] = [];
    this.state.players.forEach((p, sId) => {
      playersList.push({ sessionId: sId, state: p });
    });

    const mmrDeltas: Record<string, { delta: number; newMmr: number }> = {};

    if (playersList.length === 2) {
      const p1 = playersList[0];
      const p2 = playersList[1];

      let score1 = 0.5;
      if (winnerSessionId === p1.sessionId) {
        score1 = 1.0;
      } else if (winnerSessionId === p2.sessionId) {
        score1 = 0.0;
      }

      const isPlacement = p1.state.matchesPlayed < 10 || p2.state.matchesPlayed < 10;
      const elo = calculateElo(p1.state.mmr, p2.state.mmr, score1, isPlacement);

      mmrDeltas[p1.sessionId] = { delta: elo.deltaA, newMmr: elo.newRatingA };
      mmrDeltas[p2.sessionId] = { delta: elo.deltaB, newMmr: elo.newRatingB };
      p1.state.mmr = elo.newRatingA;
      p2.state.mmr = elo.newRatingB;
    } else if (playersList.length === 1) {
      const p = playersList[0];
      mmrDeltas[p.sessionId] = { delta: 0, newMmr: p.state.mmr };
    }

    const playersPayload: any[] = [];
    this.state.players.forEach((p, sId) => {
      const isWinner = winnerSessionId === sId;
      const isDraw = !winnerSessionId;
      const eloInfo = mmrDeltas[sId] || { delta: 0, newMmr: p.mmr };
      p.mmr = eloInfo.newMmr;

      if (p.profileId && !p.profileId.startsWith('guest-') && !p.profileId.startsWith('bot-')) {
        updatePlayerProfileMmr(p.profileId, eloInfo.delta, eloInfo.newMmr, isWinner);
      }

      playersPayload.push({
        profile_id: p.profileId,
        side: p.side,
        joined_at: new Date().toISOString(),
        final_health: p.health,
        accepted_wpm: p.acceptedWpm,
        accuracy: p.accuracy,
        highest_combo: p.highestCombo,
        words_completed: p.wordsCompleted,
        result: isDraw ? 'draw' : isWinner ? 'win' : 'loss',
        mmr_delta: eloInfo.delta,
        new_mmr: eloInfo.newMmr
      });
    });

    const winnerProfileId = winnerSessionId ? this.state.players.get(winnerSessionId)?.profileId : undefined;

    persistMatchResult({
      match: {
        id: this.state.matchId,
        rules_version: MATCH_RULES.RULES_VERSION,
        deck_seed: this.state.deckSeed,
        status: reason === 'forfeit' ? 'forfeit' : 'completed',
        started_at: new Date(this.matchStartedAt).toISOString(),
        ended_at: new Date().toISOString(),
        winner_profile_id: winnerProfileId,
        end_reason: reason,
        integrity_status: this.integrityStatus
      },
      players: playersPayload,
      events: {
        event_version: '1.0',
        event_data: {
          content_version: CONTENT_VERSION,
          logs: this.eventLog
        }
      }
    });

    this.broadcast('server_event', {
      type: 'match_end',
      winnerSessionId,
      reason,
      summary: this.state.toJSON() as any,
      mmrDeltas
    } as any);
  }

  private handleRematchVote(client: Client, accepted: boolean) {
    if (!this.matchEnded) return;

    this.rematchVotes.set(client.sessionId, accepted);

    let allAccepted = this.rematchVotes.size === 2;
    this.rematchVotes.forEach((val) => {
      if (!val) allAccepted = false;
    });

    if (allAccepted) {
      this.matchEnded = false;
      this.state.matchId = `match-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      this.state.status = 'waiting';
      this.state.deckSeed = `deck-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      this.generateRoomDeck();

      this.state.winnerSessionId = '';
      this.state.endReason = '';
      this.rematchVotes.clear();
      this.eventLog = [];

      this.state.players.forEach((p, sId) => {
        p.ready = false;
        p.health = MATCH_RULES.STARTING_HEALTH;
        p.activeWordIndex = 0;
        p.wordTypedCharCount = 0;
        p.combo = 0;
        p.acceptedWpm = 0;
        p.accuracy = 100;
        p.highestCombo = 0;
        p.wordsCompleted = 0;
        this.combatStates.set(sId, createInitialPlayerCombatState(sId));
      });

      if (this.hasBotOpponent) {
        const bot = this.state.players.get('bot-ai-opponent');
        if (bot) bot.ready = true;
      }

      this.broadcast('server_event', {
        type: 'match_start',
        countdownSeconds: 3
      } as ServerEvent);
    }
  }
}
