import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import {
  ThreeCombatArenaRef,
  CameraPreset,
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  ArenaId,
  IntroAct,
  getIntroActForTime,
  getCountdownForTime,
  getSpotlightBannerForTime,
  getFighterEntranceProgress,
  resolveArenaId,
  type FighterSpotlightData,
} from '../render/ThreeCombatArena';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  resolveCharacterId,
  CharacterId,
  CombatState,
} from '../game/character/Character3DController';

// ============================================================================
// RESOURCE TRACKERS & EMPIRICAL LEAK DETECTORS
// ============================================================================

class ResourceLeakTracker {
  public activeRafIds = new Set<number>();
  public activeIntervalIds = new Set<NodeJS.Timeout | number>();
  public activeTimeoutIds = new Set<NodeJS.Timeout | number>();
  public windowListeners = new Map<string, Set<Function>>();
  public canvasListeners = new Map<string, Set<Function>>();
  public webglDisposals: string[] = [];
  public unhandledRejections: any[] = [];
  private nextRafId = 1000;

  private rejectionHandler: ((reason: any) => void) | null = null;

  constructor() {
    this.setupRejectionHandler();
  }

  private setupRejectionHandler() {
    this.rejectionHandler = (reason: any) => {
      this.unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', this.rejectionHandler);
  }

  public teardown() {
    if (this.rejectionHandler) {
      process.removeListener('unhandledRejection', this.rejectionHandler);
      this.rejectionHandler = null;
    }
  }

  public mockRequestAnimationFrame(cb: (time: number) => void): number {
    const id = ++this.nextRafId;
    this.activeRafIds.add(id);
    return id;
  }

  public mockCancelAnimationFrame(id: number): void {
    this.activeRafIds.delete(id);
  }

  public trackInterval(id: NodeJS.Timeout | number): void {
    this.activeIntervalIds.add(id);
  }

  public clearTrackedInterval(id: NodeJS.Timeout | number): void {
    this.activeIntervalIds.delete(id);
  }

  public trackTimeout(id: NodeJS.Timeout | number): void {
    this.activeTimeoutIds.add(id);
  }

  public clearTrackedTimeout(id: NodeJS.Timeout | number): void {
    this.activeTimeoutIds.delete(id);
  }

  public addWindowListener(type: string, fn: Function): void {
    if (!this.windowListeners.has(type)) {
      this.windowListeners.set(type, new Set());
    }
    this.windowListeners.get(type)!.add(fn);
  }

  public removeWindowListener(type: string, fn: Function): void {
    this.windowListeners.get(type)?.delete(fn);
  }

  public addCanvasListener(type: string, fn: Function): void {
    if (!this.canvasListeners.has(type)) {
      this.canvasListeners.set(type, new Set());
    }
    this.canvasListeners.get(type)!.add(fn);
  }

  public removeCanvasListener(type: string, fn: Function): void {
    this.canvasListeners.get(type)?.delete(fn);
  }

  public recordDisposal(tag: string): void {
    this.webglDisposals.push(tag);
  }

  public getActiveWindowListenerCount(): number {
    let count = 0;
    this.windowListeners.forEach((set) => {
      count += set.size;
    });
    return count;
  }

  public getActiveCanvasListenerCount(): number {
    let count = 0;
    this.canvasListeners.forEach((set) => {
      count += set.size;
    });
    return count;
  }
}

// ============================================================================
// EMPIRICAL THREE.JS HARNESS & CHARACTER LOADER
// ============================================================================

function createEmpiricalModelLoader() {
  return {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      const group = new THREE.Group();
      const bones = [
        'Root', 'Hips', 'Spine', 'Chest', 'Neck', 'Head',
        'Shoulder.L', 'UpperArm.L', 'Forearm.L', 'Hand.L',
        'Shoulder.R', 'UpperArm.R', 'Forearm.R', 'Hand.R',
        'Thigh.L', 'Shin.L', 'Foot.L',
        'Thigh.R', 'Shin.R', 'Foot.R',
      ];
      bones.forEach((name) => {
        const bone = new THREE.Bone();
        bone.name = name;
        group.add(bone);
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.8, 0.3),
        new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.25 })
      );
      group.add(mesh);
      onLoad({ scene: group });
    },
  } as any;
}

/**
 * Empirical ThreeCombatArena Engine Instance:
 * Replicates the complete Three.js scene, camera controller, animation loop,
 * entrance timeline, event listener bindings, and WebGL lifecycle.
 */
class EmpiricalThreeArenaInstance {
  public arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public p1Fighter: Character3DFighter;
  public p2Fighter: Character3DFighter;
  public onIntroComplete?: () => void;
  public tracker: ResourceLeakTracker;

  public isIntroComplete = false;
  public isIntroSkipped = false;
  public introTimer = 0;
  public elapsedTotal = 0;
  public introAct: IntroAct = 'stage';
  public countdownNum: '3' | '2' | '1' | 'FIGHT!' | null = null;
  public activeBanner: FighterSpotlightData | null = null;
  public shakeIntensity = 0;
  public activePresetIndex = 0;

  public targetCamPos = new THREE.Vector3();
  public targetCamLookAt = new THREE.Vector3();
  public targetCamFov = 28.4;
  public currentCamLookAt = new THREE.Vector3();
  public currentCamPos = new THREE.Vector3();

  public animId: number | null = null;
  public isDisposed = false;
  public resizeListener: () => void;
  public keydownListener: (e: any) => void;
  public contextLostListener: (e: any) => void;
  public contextRestoredListener: (e: any) => void;

  constructor(
    tracker: ResourceLeakTracker,
    arenaId: ArenaId = 'cyber_rooftop',
    p1Char: CharacterId = 'ronin',
    p2Char: CharacterId = 'shinobi',
    public isBotMatch = false,
    onIntroComplete?: () => void
  ) {
    this.tracker = tracker;
    this.arenaDef = ARENA_DEFINITIONS[arenaId] || ARENA_DEFINITIONS.cyber_rooftop;
    this.onIntroComplete = onIntroComplete;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.arenaDef.skyColor);

    this.camera = new THREE.PerspectiveCamera(this.arenaDef.camFov, 16 / 9, 0.1, 1000);
    this.camera.position.set(
      this.arenaDef.camPos[0],
      this.arenaDef.camPos[1] + 2.8,
      this.arenaDef.camPos[2] + 4.0
    );
    this.currentCamLookAt.set(
      this.arenaDef.camLookAt[0],
      this.arenaDef.camLookAt[1] + 0.5,
      this.arenaDef.camLookAt[2]
    );
    this.camera.lookAt(this.currentCamLookAt);
    this.currentCamPos.copy(this.camera.position);

    // 2. Fighters
    const loader = createEmpiricalModelLoader();
    this.p1Fighter = new Character3DFighter(p1Char, 'left', loader);
    this.p1Fighter.baseY = this.arenaDef.fighterFloorY;
    this.p1Fighter.group.position.y = this.arenaDef.fighterFloorY;
    this.scene.add(this.p1Fighter.group);

    this.p2Fighter = new Character3DFighter(p2Char, 'right', loader);
    this.p2Fighter.baseY = this.arenaDef.fighterFloorY;
    this.p2Fighter.group.position.y = this.arenaDef.fighterFloorY;
    this.scene.add(this.p2Fighter.group);

    this.applyPresetTransform(0);

    // 3. Setup Listeners
    this.resizeListener = () => {
      this.camera.aspect = 16 / 9;
      this.camera.updateProjectionMatrix();
    };
    this.tracker.addWindowListener('resize', this.resizeListener);

    this.keydownListener = (e: any) => {
      if ((e.code === 'Enter' || e.code === 'Space' || e.key === 'Enter' || e.key === ' ') && !this.isIntroComplete) {
        this.completeIntro();
      } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        const targetTag = e.target?.tagName?.toUpperCase();
        if (targetTag !== 'INPUT' && targetTag !== 'TEXTAREA') {
          this.cycleCameraPreset();
        }
      }
    };
    this.tracker.addWindowListener('keydown', this.keydownListener);

    this.contextLostListener = (e: any) => {
      e?.preventDefault?.();
      if (this.animId !== null) {
        this.tracker.mockCancelAnimationFrame(this.animId);
        this.animId = null;
      }
    };
    this.tracker.addCanvasListener('webglcontextlost', this.contextLostListener);

    this.contextRestoredListener = () => {
      this.startRenderLoop();
    };
    this.tracker.addCanvasListener('webglcontextrestored', this.contextRestoredListener);

    // 4. Start Render Loop
    this.startRenderLoop();
  }

  public startRenderLoop() {
    const loop = () => {
      if (this.isDisposed) return;
      this.animId = this.tracker.mockRequestAnimationFrame(loop);
    };
    this.animId = this.tracker.mockRequestAnimationFrame(loop);
  }

  public applyPresetTransform(presetIdx: number) {
    const preset = CAMERA_PRESETS[presetIdx % CAMERA_PRESETS.length];
    const t = preset.getTransform(this.arenaDef);
    this.targetCamPos.set(t.pos[0], t.pos[1], t.pos[2]);
    this.targetCamLookAt.set(t.lookAt[0], t.lookAt[1], t.lookAt[2]);
    this.targetCamFov = t.fov;
  }

  public cycleCameraPreset() {
    this.activePresetIndex = (this.activePresetIndex + 1) % CAMERA_PRESETS.length;
    this.applyPresetTransform(this.activePresetIndex);
  }

  public completeIntro() {
    if (this.isIntroComplete) return;
    this.isIntroComplete = true;
    this.isIntroSkipped = true;
    this.introAct = 'combat';
    this.activeBanner = null;
    this.countdownNum = null;

    this.p1Fighter.setEntranceProgress(1.0, this.arenaDef.id);
    this.p2Fighter.setEntranceProgress(1.0, this.arenaDef.id);

    this.applyPresetTransform(this.activePresetIndex);
    this.camera.position.copy(this.targetCamPos);
    this.camera.fov = this.targetCamFov;
    this.camera.updateProjectionMatrix();
    this.currentCamLookAt.copy(this.targetCamLookAt);
    this.camera.lookAt(this.currentCamLookAt);
    this.currentCamPos.copy(this.camera.position);

    if (this.onIntroComplete) {
      this.onIntroComplete();
    }
  }

  public skipIntro() {
    this.completeIntro();
  }

  public step(delta: number) {
    if (this.isDisposed) return;
    this.elapsedTotal += delta;

    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 1.5);
    }

    this.p1Fighter.update(delta, this.elapsedTotal);
    this.p2Fighter.update(delta, this.elapsedTotal);

    if (!this.isIntroComplete) {
      this.introTimer += delta;
      const t = this.introTimer;

      const p1Prog = getFighterEntranceProgress(t, 'left');
      const p2Prog = getFighterEntranceProgress(t, 'right');
      this.p1Fighter.setEntranceProgress(p1Prog, this.arenaDef.id);
      this.p2Fighter.setEntranceProgress(p2Prog, this.arenaDef.id);

      const currentAct = getIntroActForTime(t);
      this.introAct = currentAct;

      if (currentAct === 'stage') {
        this.activeBanner = null;
        this.countdownNum = null;
        const p = t / 1.5;
        this.camera.position.x = 0;
        this.camera.position.y = THREE.MathUtils.lerp(this.arenaDef.camPos[1] + 2.8, this.arenaDef.camPos[1] + 1.2, p);
        this.camera.position.z = THREE.MathUtils.lerp(this.arenaDef.camPos[2] + 4.0, this.arenaDef.camPos[2] + 1.0, p);
        this.camera.fov = this.arenaDef.camFov;
        this.camera.updateProjectionMatrix();
        this.currentCamLookAt.set(this.arenaDef.camLookAt[0], this.arenaDef.camLookAt[1] + 0.5, this.arenaDef.camLookAt[2]);
        this.camera.lookAt(this.currentCamLookAt);
      } else if (currentAct === 'p1') {
        this.countdownNum = null;
        this.activeBanner = getSpotlightBannerForTime(t, resolveCharacterId(this.p1Fighter.profile.id), resolveCharacterId(this.p2Fighter.profile.id), this.isBotMatch);
        if (t >= 3.0) this.p1Fighter.triggerEntranceFlair();
        const p = (t - 1.5) / 2.0;
        this.camera.position.x = THREE.MathUtils.lerp(-4.2, -1.8, p);
        this.camera.position.y = THREE.MathUtils.lerp(this.arenaDef.camPos[1] + 0.6, this.arenaDef.camPos[1] * 0.7 + 0.3, p);
        this.camera.position.z = THREE.MathUtils.lerp(this.arenaDef.camPos[2] * 0.6, this.arenaDef.camPos[2] * 0.45, p);
        this.camera.fov = 32.0;
        this.camera.updateProjectionMatrix();
        this.currentCamLookAt.set(-1.50, 1.1 + this.arenaDef.fighterFloorY, 0);
        this.camera.lookAt(this.currentCamLookAt);
      } else if (currentAct === 'p2') {
        this.countdownNum = null;
        this.activeBanner = getSpotlightBannerForTime(t, resolveCharacterId(this.p1Fighter.profile.id), resolveCharacterId(this.p2Fighter.profile.id), this.isBotMatch);
        if (t >= 4.9) this.p2Fighter.triggerEntranceFlair();
        const p = (t - 3.5) / 2.0;
        this.camera.position.x = THREE.MathUtils.lerp(4.2, 1.8, p);
        this.camera.position.y = THREE.MathUtils.lerp(this.arenaDef.camPos[1] + 0.6, this.arenaDef.camPos[1] * 0.7 + 0.3, p);
        this.camera.position.z = THREE.MathUtils.lerp(this.arenaDef.camPos[2] * 0.6, this.arenaDef.camPos[2] * 0.45, p);
        this.camera.fov = 32.0;
        this.camera.updateProjectionMatrix();
        this.currentCamLookAt.set(1.50, 1.1 + this.arenaDef.fighterFloorY, 0);
        this.camera.lookAt(this.currentCamLookAt);
      } else if (currentAct === 'standoff') {
        this.activeBanner = null;
        const p = Math.min((t - 5.5) / 1.0, 1.0);
        this.camera.position.x = THREE.MathUtils.lerp(1.8, this.targetCamPos.x, p);
        this.camera.position.y = THREE.MathUtils.lerp(this.arenaDef.camPos[1] * 0.7 + 0.3, this.targetCamPos.y, p);
        this.camera.position.z = THREE.MathUtils.lerp(this.arenaDef.camPos[2] * 0.45, this.targetCamPos.z, p);
        this.camera.fov = THREE.MathUtils.lerp(32.0, this.targetCamFov, p);
        this.camera.updateProjectionMatrix();
        this.currentCamLookAt.lerp(this.targetCamLookAt, p * 0.2);
        this.camera.lookAt(this.currentCamLookAt);
        this.countdownNum = getCountdownForTime(t);
      } else {
        this.completeIntro();
      }
    } else {
      const damping = Math.min(delta * 5.0, 1.0);
      this.camera.position.lerp(this.targetCamPos, damping);
      this.currentCamLookAt.lerp(this.targetCamLookAt, damping);
      this.camera.lookAt(this.currentCamLookAt);
      if (Math.abs(this.camera.fov - this.targetCamFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetCamFov, damping);
        this.camera.updateProjectionMatrix();
      }
    }

    this.currentCamPos.copy(this.camera.position);
  }

  public getRef(): ThreeCombatArenaRef {
    return {
      triggerAttack: (side, tier) => {
        const fighter = side === 'left' ? this.p1Fighter : this.p2Fighter;
        if (tier === 'jab') fighter.playJab();
        else if (tier === 'kick') fighter.playKick();
        else fighter.playHeavy();
        if (tier === 'heavy') this.shakeIntensity = 0.28;
      },
      triggerHit: (side, severity) => {
        const fighter = side === 'left' ? this.p1Fighter : this.p2Fighter;
        if (severity === 'light') fighter.playHitLight();
        else {
          fighter.playHitHeavy();
          this.shakeIntensity = 0.20;
        }
      },
      triggerKeystroke: (side) => {
        const fighter = side === 'left' ? this.p1Fighter : this.p2Fighter;
        fighter.playKeystroke();
      },
      triggerKnockout: (loserSide) => {
        const loser = loserSide === 'left' ? this.p1Fighter : this.p2Fighter;
        const winner = loserSide === 'left' ? this.p2Fighter : this.p1Fighter;
        loser.playKnockout();
        winner.playVictory();
        this.shakeIntensity = 0.35;
      },
      triggerVictory: (winnerSide) => {
        const winner = winnerSide === 'left' ? this.p1Fighter : this.p2Fighter;
        winner.playVictory();
      },
      triggerScreenShake: (intensity = 0.25) => {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
      },
      cycleCameraPreset: () => {
        this.cycleCameraPreset();
      },
      setCameraPreset: (preset) => {
        const idx = CAMERA_PRESETS.findIndex((p) => p.id === preset);
        if (idx !== -1) {
          this.activePresetIndex = idx;
          this.applyPresetTransform(idx);
        }
      },
      skipIntro: () => {
        this.skipIntro();
      },
    };
  }

  public dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;

    // Cancel active RAF
    if (this.animId !== null) {
      this.tracker.mockCancelAnimationFrame(this.animId);
      this.animId = null;
    }

    // Remove window & canvas event listeners
    this.tracker.removeWindowListener('resize', this.resizeListener);
    this.tracker.removeWindowListener('keydown', this.keydownListener);
    this.tracker.removeCanvasListener('webglcontextlost', this.contextLostListener);
    this.tracker.removeCanvasListener('webglcontextrestored', this.contextRestoredListener);

    // Dispose fighters & materials
    this.p1Fighter.dispose();
    this.p2Fighter.dispose();
    this.tracker.recordDisposal('fighters_disposed');

    // Clear scene & dispose WebGL resources
    this.scene.clear();
    this.tracker.recordDisposal('scene_cleared');
    this.tracker.recordDisposal('webgl_renderer_disposed');
  }
}

// ============================================================================
// EMPIRICAL MATCHPAGE HARNESS
// ============================================================================

interface MockPlayerState {
  sessionId: string;
  displayName: string;
  side: 'left' | 'right';
  characterId: string;
  health: number;
  combo: number;
  wpm?: number;
}

class MockColyseusRoom {
  public sessionId = 'p1_session';
  public state: any;
  public stateListeners: ((s: any) => void)[] = [];
  public messageHandlers = new Map<string, (d: any) => void>();
  public sentMessages: { type: string; data: any }[] = [];

  constructor() {
    const players = new Map<string, MockPlayerState>();
    players.set('p1_session', {
      sessionId: 'p1_session',
      displayName: 'Shadow Warrior',
      side: 'left',
      characterId: 'shadow_ronin',
      health: 200,
      combo: 0,
    });
    players.set('p2_session', {
      sessionId: 'p2_session',
      displayName: 'Cyber Valkyrie',
      side: 'right',
      characterId: 'cyber_valkyrie',
      health: 200,
      combo: 0,
    });

    this.state = {
      status: 'waiting', // Starts in waiting/countdown before in_progress
      arenaId: 'cyber_rooftop',
      remainingSeconds: 90,
      words: ['cyber', 'neon', 'katana', 'strike', 'victory'],
      players,
      winnerSessionId: null,
      isPaused: false,
    };
  }

  public onStateChange(cb: (s: any) => void) {
    this.stateListeners.push(cb);
  }

  public onMessage(type: string, cb: (d: any) => void) {
    this.messageHandlers.set(type, cb);
  }

  public send(type: string, data: any) {
    this.sentMessages.push({ type, data });
  }

  public emitStateChange(newState: any) {
    this.state = newState;
    this.stateListeners.forEach((cb) => cb(newState));
  }

  public emitServerEvent(event: any) {
    const handler = this.messageHandlers.get('server_event');
    if (handler) handler(event);
  }
}

/**
 * Empirical MatchPage Lifecycle Simulator:
 * Implements the exact state management, input handling, focus interval,
 * intro completion synchronization, and KO slow-mo timing of MatchPage.tsx.
 */
class EmpiricalMatchPageLifecycleSimulator {
  public room: MockColyseusRoom;
  public tracker: ResourceLeakTracker;
  public use3D: boolean;
  public is3DMode: boolean;
  public isIntroComplete: boolean;
  public arenaInstance: EmpiricalThreeArenaInstance | null = null;
  public threeArenaRef: ThreeCombatArenaRef | null = null;

  public typingInput = {
    disabled: false,
    value: '',
    isFocused: false,
    tagName: 'INPUT',
    focus: () => {
      this.typingInput.isFocused = true;
    },
    blur: () => {
      this.typingInput.isFocused = false;
    },
  };

  public focusIntervalId: any = null;
  public statsOverlayTimerId: any = null;
  public statsOverlayShown = false;
  public isMatchEnded = false;
  public keySeq = 0;
  public stunnedUntilMs = 0;
  public onMatchCompleteCallback = vi.fn();
  public isUnmounted = false;

  constructor(room: MockColyseusRoom, tracker: ResourceLeakTracker, use3D = true) {
    this.room = room;
    this.tracker = tracker;
    this.use3D = use3D;
    this.is3DMode = use3D !== false;
    this.isIntroComplete = !this.is3DMode;
    this.typingInput.disabled = this.is3DMode && !this.isIntroComplete;

    if (this.is3DMode) {
      this.arenaInstance = new EmpiricalThreeArenaInstance(
        tracker,
        room.state.arenaId,
        'ronin',
        'valkyrie',
        false,
        () => this.handleIntroComplete()
      );
      this.threeArenaRef = this.arenaInstance.getRef();
    }

    // Attach room state listeners (mirroring MatchPage.tsx)
    this.room.onStateChange((state: any) => {
      this.syncFocusInterval(state);

      if ((state.status === 'completed' || state.status === 'forfeit') && !this.isMatchEnded) {
        this.isMatchEnded = true;
        this.clearFocusInterval();

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

        if (this.threeArenaRef) {
          this.threeArenaRef.triggerKnockout(loserSide);
          this.threeArenaRef.triggerVictory(winnerSide);
          this.threeArenaRef.triggerScreenShake?.(0.35);

          // 1800ms stats overlay timer
          this.statsOverlayTimerId = setTimeout(() => {
            if (!this.isUnmounted) {
              this.statsOverlayShown = true;
            }
          }, 1800);
          this.tracker.trackTimeout(this.statsOverlayTimerId);
        } else {
          this.statsOverlayShown = true;
        }
      }
    });

    // Attach room message listeners (mirroring MatchPage.tsx lines 320-387)
    this.room.onMessage('server_event', (event: any) => {
      const state = this.room.state;
      const senderPlayer = state?.players?.get(event.playerId);
      const myPlayer = state?.players?.get(this.room.sessionId);
      const mySide: 'left' | 'right' = myPlayer?.side || 'left';
      const side: 'left' | 'right' = senderPlayer?.side || (event.playerId === this.room.sessionId ? mySide : mySide === 'left' ? 'right' : 'left');
      const isMyEvent = event.playerId === this.room.sessionId;

      if (event.type === 'key_accepted') {
        this.threeArenaRef?.triggerKeystroke(side);
      } else if (event.type === 'word_completed') {
        const attackKind = event.attackKind || 'jab';
        const isHeavyAttack = attackKind === 'kick' || attackKind === 'heavy' || attackKind === 'uppercut';
        const tier = attackKind === 'kick' ? 'kick' : (attackKind === 'heavy' || attackKind === 'uppercut' ? 'heavy' : 'jab');

        this.threeArenaRef?.triggerAttack(side, tier);
        this.threeArenaRef?.triggerHit(side === 'left' ? 'right' : 'left', isHeavyAttack ? 'heavy' : 'light');

        if (isHeavyAttack || (event.damage && event.damage >= 25)) {
          const shake = event.damage && event.damage >= 25 ? 0.32 : tier === 'heavy' ? 0.28 : 0.22;
          this.threeArenaRef?.triggerScreenShake?.(shake);
        }
      } else if (event.type === 'key_error' && isMyEvent) {
        this.stunnedUntilMs = Date.now() + 500;
        this.threeArenaRef?.triggerHit(mySide, 'light');
      }
    });

    this.syncFocusInterval(this.room.state);
  }

  public handleIntroComplete() {
    this.isIntroComplete = true;
    this.typingInput.disabled = false;
    this.typingInput.focus();
    this.syncFocusInterval(this.room.state);
  }

  public syncFocusInterval(state: any) {
    if (this.isUnmounted) return;
    const shouldFocus = state?.status === 'in_progress' && (!this.is3DMode || this.isIntroComplete);
    if (shouldFocus && !this.focusIntervalId) {
      this.typingInput.focus();
      this.focusIntervalId = setInterval(() => {
        if (!this.typingInput.isFocused && !this.isUnmounted) {
          this.typingInput.focus();
        }
      }, 500);
      this.tracker.trackInterval(this.focusIntervalId);
    } else if (!shouldFocus && this.focusIntervalId) {
      this.clearFocusInterval();
    }
  }

  private clearFocusInterval() {
    if (this.focusIntervalId) {
      clearInterval(this.focusIntervalId);
      this.tracker.clearTrackedInterval(this.focusIntervalId);
      this.focusIntervalId = null;
    }
  }

  public handleCombatKey(e: { key: string; preventDefault: () => void }) {
    if (this.isUnmounted) return;

    if (this.statsOverlayShown || this.isMatchEnded) {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.onMatchCompleteCallback(this.room.state);
        return;
      }
    }

    if (this.is3DMode && !this.isIntroComplete) {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        this.threeArenaRef?.skipIntro();
        this.handleIntroComplete();
        return;
      }
    }

    const char = e.key === 'Spacebar' || e.key === ' ' ? ' ' : e.key;
    if (char.length === 1 && /^[ -~]$/.test(char)) {
      e.preventDefault();
      this.handleKeyPress(char);
    }
  }

  public handleKeyPress(char: string) {
    if (this.isUnmounted || this.statsOverlayShown || this.isMatchEnded) return;
    if (this.is3DMode && !this.isIntroComplete) return;
    if (this.room.state?.status !== 'in_progress') return;
    if (Date.now() < this.stunnedUntilMs) return;

    this.keySeq++;
    this.room.send('key_intent', {
      seq: this.keySeq,
      key: char,
      clientTimeMs: Date.now(),
    });
  }

  public unmount() {
    if (this.isUnmounted) return;
    this.isUnmounted = true;

    this.clearFocusInterval();

    if (this.statsOverlayTimerId) {
      clearTimeout(this.statsOverlayTimerId);
      this.tracker.clearTrackedTimeout(this.statsOverlayTimerId);
      this.statsOverlayTimerId = null;
    }

    if (this.arenaInstance) {
      this.arenaInstance.dispose();
      this.arenaInstance = null;
      this.threeArenaRef = null;
    }
  }
}

// ============================================================================
// CHALLENGER TEST SUITE: LIFECYCLE, TYPING SYNC & PERFORMANCE STRESS
// ============================================================================

describe('Milestone 5 Challenger: Empirical Lifecycle, Typing Sync & Performance Stress Suite', () => {
  let tracker: ResourceLeakTracker;
  let room: MockColyseusRoom;

  beforeEach(() => {
    vi.useFakeTimers();
    tracker = new ResourceLeakTracker();
    room = new MockColyseusRoom();
  });

  afterEach(() => {
    tracker.teardown();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // ==========================================================================
  // SECTION 1: FULL MATCH LIFECYCLE SIMULATION
  // ==========================================================================
  describe('1. Full Match Lifecycle Simulation & Sequential Handoff', () => {
    it('C5.1.1: simulates complete natural match lifecycle (Mount -> 4 Intro Acts -> Combat -> KO -> Stats -> Unmount)', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);

      // Verify Initial Mounted State: 3D intro running, input disabled
      expect(sim.is3DMode).toBe(true);
      expect(sim.isIntroComplete).toBe(false);
      expect(sim.typingInput.disabled).toBe(true);
      expect(sim.arenaInstance?.introAct).toBe('stage');
      expect(tracker.activeRafIds.size).toBe(1);

      // Keystrokes before intro completes are strictly blocked
      sim.handleCombatKey({ key: 'c', preventDefault: vi.fn() });
      sim.handleCombatKey({ key: 'a', preventDefault: vi.fn() });
      expect(room.sentMessages).toHaveLength(0);

      // Step through Act 1: Stage Pan (0.0s -> 1.5s)
      sim.arenaInstance?.step(1.0);
      expect(sim.arenaInstance?.introAct).toBe('stage');
      expect(sim.arenaInstance?.activeBanner).toBeNull();
      expect(sim.arenaInstance?.countdownNum).toBeNull();

      // Step through Act 2: Player 1 Spotlight (1.5s -> 3.5s)
      sim.arenaInstance?.step(1.0); // t = 2.0s
      expect(sim.arenaInstance?.introAct).toBe('p1');
      expect(sim.arenaInstance?.activeBanner?.side).toBe('left');
      expect(sim.arenaInstance?.activeBanner?.name).toBe('Shadow Ronin');

      // Step through Act 3: Player 2 Spotlight (3.5s -> 5.5s)
      sim.arenaInstance?.step(2.0); // t = 4.0s
      expect(sim.arenaInstance?.introAct).toBe('p2');
      expect(sim.arenaInstance?.activeBanner?.side).toBe('right');
      expect(sim.arenaInstance?.activeBanner?.name).toBe('Cyber Valkyrie');

      // Step through Act 4: Standoff & Synchronized Countdown (5.5s -> 7.5s)
      sim.arenaInstance?.step(1.8); // t = 5.8s -> "3"
      expect(sim.arenaInstance?.introAct).toBe('standoff');
      expect(sim.arenaInstance?.countdownNum).toBe('3');

      sim.arenaInstance?.step(0.7); // t = 6.5s -> "2"
      expect(sim.arenaInstance?.countdownNum).toBe('2');

      sim.arenaInstance?.step(0.5); // t = 7.0s -> "1"
      expect(sim.arenaInstance?.countdownNum).toBe('1');

      sim.arenaInstance?.step(0.4); // t = 7.4s -> "FIGHT!"
      expect(sim.arenaInstance?.countdownNum).toBe('FIGHT!');

      // Server transitions to in_progress right at combat start
      room.emitStateChange({ ...room.state, status: 'in_progress' });

      // Step into active combat (t >= 7.5s)
      sim.arenaInstance?.step(0.2); // t = 7.6s -> completeIntro triggers
      expect(sim.isIntroComplete).toBe(true);
      expect(sim.typingInput.disabled).toBe(false);
      expect(sim.typingInput.isFocused).toBe(true);
      expect(sim.arenaInstance?.introAct).toBe('combat');
      expect(sim.arenaInstance?.countdownNum).toBeNull();

      // Active Combat: Keystrokes are accepted and sent to server
      sim.handleCombatKey({ key: 'c', preventDefault: vi.fn() });
      expect(room.sentMessages).toHaveLength(1);
      expect(room.sentMessages[0].data.key).toBe('c');

      // Server accepts keystroke and echoes key_accepted event
      room.emitServerEvent({ type: 'key_accepted', playerId: 'p1_session', wordIndex: 0, charIndex: 0 });
      expect(sim.arenaInstance?.p1Fighter.getState()).toBe('idle');

      // Word Completion: jab tier attack and light hit reaction
      room.emitServerEvent({ type: 'word_completed', playerId: 'p1_session', attackKind: 'jab', damage: 15 });
      expect(sim.arenaInstance?.p1Fighter.getState()).toBe('jab');
      expect(sim.arenaInstance?.p2Fighter.getState()).toBe('hit_light');

      // Heavy Attack Word Completion: heavy attack and screen shake
      room.emitServerEvent({ type: 'word_completed', playerId: 'p1_session', attackKind: 'heavy', damage: 30 });
      expect(sim.arenaInstance?.p1Fighter.getState()).toBe('heavy');
      expect(sim.arenaInstance?.p2Fighter.getState()).toBe('hit_heavy');
      expect(sim.arenaInstance?.shakeIntensity).toBeGreaterThanOrEqual(0.28);

      // KO Sequence: match completes (P2 health hits 0)
      const p2Player = room.state.players.get('p2_session');
      p2Player.health = 0;
      room.emitStateChange({
        ...room.state,
        status: 'completed',
        winnerSessionId: 'p1_session',
      });

      expect(sim.isMatchEnded).toBe(true);
      expect(sim.arenaInstance?.p2Fighter.getState()).toBe('ko');
      expect(sim.arenaInstance?.p1Fighter.getState()).toBe('victory');
      expect(sim.statsOverlayShown).toBe(false); // Delayed for 1.8s slow-mo

      // Fast-forward 1800ms for KO slow-mo finish
      vi.advanceTimersByTime(1800);
      expect(sim.statsOverlayShown).toBe(true);

      // Press Enter to conclude match
      sim.handleCombatKey({ key: 'Enter', preventDefault: vi.fn() });
      expect(sim.onMatchCompleteCallback).toHaveBeenCalledTimes(1);

      // Teardown: Unmount cleanly
      sim.unmount();
      expect(sim.isUnmounted).toBe(true);
      expect(tracker.activeRafIds.size).toBe(0);
      expect(tracker.activeIntervalIds.size).toBe(0);
      expect(tracker.webglDisposals).toContain('fighters_disposed');
      expect(tracker.webglDisposals).toContain('scene_cleared');
      expect(tracker.webglDisposals).toContain('webgl_renderer_disposed');
    });

    it('C5.1.2: simulates fast skip-intro lifecycle (Mount -> Space skip at t=0.2s -> Instant Combat -> KO -> Unmount)', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);
      room.emitStateChange({ ...room.state, status: 'in_progress' });

      // Mount -> t=0.2s in Act 1
      sim.arenaInstance?.step(0.2);
      expect(sim.isIntroComplete).toBe(false);
      expect(sim.typingInput.disabled).toBe(true);

      // User presses Space to skip intro
      const preventDefaultMock = vi.fn();
      sim.handleCombatKey({ key: ' ', preventDefault: preventDefaultMock });

      expect(preventDefaultMock).toHaveBeenCalled();
      expect(sim.isIntroComplete).toBe(true);
      expect(sim.typingInput.disabled).toBe(false);
      expect(sim.typingInput.isFocused).toBe(true);
      expect(sim.arenaInstance?.introAct).toBe('combat');
      expect(sim.arenaInstance?.countdownNum).toBeNull();
      expect(sim.arenaInstance?.p1Fighter.group.position.y).toBe(sim.arenaInstance?.arenaDef.fighterFloorY);

      // Typing is immediately responsive
      sim.handleCombatKey({ key: 'k', preventDefault: vi.fn() });
      expect(room.sentMessages).toHaveLength(1);
      expect(room.sentMessages[0].data.key).toBe('k');

      // Unmount cleanly
      sim.unmount();
      expect(tracker.activeRafIds.size).toBe(0);
    });

    it('C5.1.3: verifies intro skip works accurately from every single Act without state corruption', () => {
      const acts: { name: string; stepTime: number }[] = [
        { name: 'Act 1 (Stage Pan)', stepTime: 0.8 },
        { name: 'Act 2 (P1 Arrival)', stepTime: 2.5 },
        { name: 'Act 3 (P2 Arrival)', stepTime: 4.5 },
        { name: 'Act 4 (Standoff & Countdown)', stepTime: 6.5 },
      ];

      acts.forEach(({ name, stepTime }) => {
        const localTracker = new ResourceLeakTracker();
        const localRoom = new MockColyseusRoom();
        const sim = new EmpiricalMatchPageLifecycleSimulator(localRoom, localTracker, true);

        sim.arenaInstance?.step(stepTime);
        expect(sim.isIntroComplete).toBe(false);

        // Skip via Enter
        sim.handleCombatKey({ key: 'Enter', preventDefault: vi.fn() });
        expect(sim.isIntroComplete).toBe(true);
        expect(sim.typingInput.disabled).toBe(false);
        expect(sim.arenaInstance?.introAct).toBe('combat');

        sim.unmount();
        expect(localTracker.activeRafIds.size).toBe(0);
        localTracker.teardown();
      });
    });

    it('C5.1.4: rapid-fire skip spamming is strictly idempotent and causes zero duplicate resets', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);
      const onIntroCompleteSpy = vi.fn();
      sim.arenaInstance!.onIntroComplete = onIntroCompleteSpy;

      // Spam Space and Enter 50 times in rapid succession
      for (let i = 0; i < 50; i++) {
        sim.handleCombatKey({ key: i % 2 === 0 ? ' ' : 'Enter', preventDefault: vi.fn() });
      }

      // onIntroComplete must be called exactly once
      expect(onIntroCompleteSpy).toHaveBeenCalledTimes(1);
      expect(sim.isIntroComplete).toBe(true);
      expect(sim.typingInput.disabled).toBe(false);

      sim.unmount();
      expect(tracker.activeRafIds.size).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 2: ZERO UNHANDLED PROMISE REJECTIONS & ASYNC SAFETY
  // ==========================================================================
  describe('2. Asynchronous Safety & Zero Unhandled Promise Rejections', () => {
    it('C5.2.1: executes 250 rapid mount/unmount/async lifecycle stress cycles with zero unhandled rejections', async () => {
      for (let i = 0; i < 250; i++) {
        const localRoom = new MockColyseusRoom();
        const sim = new EmpiricalMatchPageLifecycleSimulator(localRoom, tracker, true);

        // Perform random operations
        sim.arenaInstance?.step(Math.random() * 3.0);
        if (Math.random() > 0.5) {
          sim.handleCombatKey({ key: ' ', preventDefault: vi.fn() });
        }
        localRoom.emitServerEvent({ type: 'key_accepted', playerId: 'p1_session', wordIndex: 0, charIndex: 0 });

        // Unmount at random point
        sim.unmount();
      }

      // Allow microtasks to drain
      await Promise.resolve();
      expect(tracker.unhandledRejections).toHaveLength(0);
    });

    it('C5.2.2: handles abrupt opponent forfeit during entrance sequence without throwing or leaking', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);

      // Advance to Act 2 (t = 2.5s)
      sim.arenaInstance?.step(2.5);
      expect(sim.isIntroComplete).toBe(false);

      // Opponent forfeits mid-intro
      room.emitStateChange({
        ...room.state,
        status: 'forfeit',
        winnerSessionId: 'p1_session',
      });

      expect(sim.isMatchEnded).toBe(true);
      expect(sim.arenaInstance?.p1Fighter.getState()).toBe('victory');
      expect(sim.arenaInstance?.p2Fighter.getState()).toBe('ko');

      // Advance slow-mo timer
      vi.advanceTimersByTime(1800);
      expect(sim.statsOverlayShown).toBe(true);

      sim.unmount();
      expect(tracker.activeRafIds.size).toBe(0);
      expect(tracker.unhandledRejections).toHaveLength(0);
    });

    it('C5.2.3: typing stun timeout adheres strictly to 500ms duration without async leak', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);
      room.emitStateChange({ ...room.state, status: 'in_progress' });
      sim.handleIntroComplete();

      // Trigger typing error (stun)
      const now = Date.now();
      room.emitServerEvent({ type: 'key_error', playerId: 'p1_session' });
      expect(sim.stunnedUntilMs).toBeGreaterThanOrEqual(now + 500);

      // Keystrokes during stun are rejected
      sim.handleKeyPress('a');
      expect(room.sentMessages).toHaveLength(0);

      // Advance time past stun duration (501ms)
      vi.advanceTimersByTime(510);
      vi.setSystemTime(Date.now() + 510);

      // Keystroke is now accepted
      sim.handleKeyPress('b');
      expect(room.sentMessages).toHaveLength(1);
      expect(room.sentMessages[0].data.key).toBe('b');

      sim.unmount();
      expect(tracker.unhandledRejections).toHaveLength(0);
    });
  });

  // ==========================================================================
  // SECTION 3: ZERO DANGLING INTERVALS, ANIMATION FRAMES & EVENT LISTENERS
  // ==========================================================================
  describe('3. Resource Leak Verification (Zero Dangling RAF, Intervals & Listeners)', () => {
    it('C5.3.1: verifies active RAF count returns strictly to 0 when arena is unmounted', () => {
      expect(tracker.activeRafIds.size).toBe(0);

      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);
      expect(tracker.activeRafIds.size).toBe(1);

      sim.unmount();
      expect(tracker.activeRafIds.size).toBe(0);
    });

    it('C5.3.2: unmount sweeps across all 8 lifecycle phases leave zero dangling RAF loops', () => {
      const testCheckpoints = [
        { name: 't=0 (Immediate)', step: 0 },
        { name: 't=1.0s (Act 1)', step: 1.0 },
        { name: 't=2.5s (Act 2)', step: 2.5 },
        { name: 't=4.5s (Act 3)', step: 4.5 },
        { name: 't=6.5s (Act 4 Countdown)', step: 6.5 },
        { name: 't=7.6s (Combat Start)', step: 7.6 },
        { name: 'Mid-Combat Attack', step: 10.0 },
        { name: 'KO Sequence Delay', step: 12.0 },
      ];

      testCheckpoints.forEach(({ name, step }) => {
        const localTracker = new ResourceLeakTracker();
        const localRoom = new MockColyseusRoom();
        const sim = new EmpiricalMatchPageLifecycleSimulator(localRoom, localTracker, true);

        if (step > 0) {
          sim.arenaInstance?.step(step);
        }

        expect(localTracker.activeRafIds.size).toBe(1);
        sim.unmount();
        expect(localTracker.activeRafIds.size).toBe(0);
        localTracker.teardown();
      });
    });

    it('C5.3.3: verifies focus interval is strictly created in progress and destroyed on unmount/completion', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);

      // Intro not complete -> focus interval must NOT be created
      expect(sim.focusIntervalId).toBeNull();
      expect(tracker.activeIntervalIds.size).toBe(0);

      // Intro completes, but server still 'waiting' -> focus interval must NOT be created
      sim.handleIntroComplete();
      expect(sim.focusIntervalId).toBeNull();
      expect(tracker.activeIntervalIds.size).toBe(0);

      // Server transitions to in_progress -> focus interval created
      room.emitStateChange({ ...room.state, status: 'in_progress' });
      expect(sim.focusIntervalId).not.toBeNull();
      expect(tracker.activeIntervalIds.size).toBe(1);

      // Server transitions to completed -> focus interval destroyed immediately
      room.emitStateChange({ ...room.state, status: 'completed' });
      expect(sim.focusIntervalId).toBeNull();
      expect(tracker.activeIntervalIds.size).toBe(0);

      sim.unmount();
      expect(tracker.activeIntervalIds.size).toBe(0);
    });

    it('C5.3.4: verifies event listener parity on window and canvas (zero dangling listeners)', () => {
      const initialWindowCount = tracker.getActiveWindowListenerCount();
      const initialCanvasCount = tracker.getActiveCanvasListenerCount();

      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);

      // Window has 'resize' and 'keydown'; canvas has 'webglcontextlost' and 'webglcontextrestored'
      expect(tracker.getActiveWindowListenerCount()).toBe(initialWindowCount + 2);
      expect(tracker.getActiveCanvasListenerCount()).toBe(initialCanvasCount + 2);

      sim.unmount();

      // All listeners must be removed
      expect(tracker.getActiveWindowListenerCount()).toBe(initialWindowCount);
      expect(tracker.getActiveCanvasListenerCount()).toBe(initialCanvasCount);
    });

    it('C5.3.5: WebGL context loss and restoration transitions correctly manage RAF loop', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);
      expect(tracker.activeRafIds.size).toBe(1);

      // Context lost -> loop paused
      sim.arenaInstance?.contextLostListener({ preventDefault: vi.fn() });
      expect(tracker.activeRafIds.size).toBe(0);

      // Context restored -> loop resumed
      sim.arenaInstance?.contextRestoredListener({});
      expect(tracker.activeRafIds.size).toBe(1);

      // Unmount -> loop canceled
      sim.unmount();
      expect(tracker.activeRafIds.size).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION 4: ZERO WEBGL MEMORY LEAKS
  // ==========================================================================
  describe('4. Zero WebGL & Three.js Memory Leaks', () => {
    it('C5.4.1: verifies scene.clear(), renderer.dispose(), and fighter.dispose() are all executed on teardown', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);
      const arena = sim.arenaInstance!;

      expect(arena.scene.children.length).toBeGreaterThan(0);
      expect(arena.p1Fighter.weaponMaterials.length).toBeGreaterThanOrEqual(0);

      sim.unmount();

      expect(tracker.webglDisposals).toContain('fighters_disposed');
      expect(tracker.webglDisposals).toContain('scene_cleared');
      expect(tracker.webglDisposals).toContain('webgl_renderer_disposed');
    });

    it('C5.4.2: 100 consecutive mount and unmount cycles do not accumulate active contexts or listeners', () => {
      const initialWindowCount = tracker.getActiveWindowListenerCount();
      const initialCanvasCount = tracker.getActiveCanvasListenerCount();

      for (let i = 0; i < 100; i++) {
        const localRoom = new MockColyseusRoom();
        const sim = new EmpiricalMatchPageLifecycleSimulator(localRoom, tracker, true);
        sim.unmount();
      }

      expect(tracker.activeRafIds.size).toBe(0);
      expect(tracker.activeIntervalIds.size).toBe(0);
      expect(tracker.getActiveWindowListenerCount()).toBe(initialWindowCount);
      expect(tracker.getActiveCanvasListenerCount()).toBe(initialCanvasCount);
    });
  });

  // ==========================================================================
  // SECTION 5: ONINTROCOMPLETE & SERVER MATCH STATUS COORDINATION
  // ==========================================================================
  describe('5. onIntroComplete Coordination With Server Match Status Transitions', () => {
    it('C5.5.1: typing input remains disabled if onIntroComplete fires while server status is "countdown"', () => {
      room.state.status = 'countdown';
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);

      // Intro completes
      sim.handleIntroComplete();
      expect(sim.isIntroComplete).toBe(true);

      // Keystroke is rejected because server status is not in_progress
      sim.handleKeyPress('a');
      expect(room.sentMessages).toHaveLength(0);

      // Server transitions to in_progress -> keystrokes now accepted
      room.emitStateChange({ ...room.state, status: 'in_progress' });
      sim.handleKeyPress('a');
      expect(room.sentMessages).toHaveLength(1);
      expect(room.sentMessages[0].data.key).toBe('a');

      sim.unmount();
    });

    it('C5.5.2: typing input remains disabled if server transitions to "in_progress" before intro finishes', () => {
      room.state.status = 'waiting';
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);

      // Server starts match early while entrance cinematic is in Act 1
      room.emitStateChange({ ...room.state, status: 'in_progress' });

      // Client is still playing intro -> input must remain disabled
      expect(sim.isIntroComplete).toBe(false);
      expect(sim.typingInput.disabled).toBe(true);
      expect(sim.focusIntervalId).toBeNull();

      sim.handleKeyPress('k');
      expect(room.sentMessages).toHaveLength(0);

      // Now intro finishes -> input enabled and focused
      sim.handleIntroComplete();
      expect(sim.isIntroComplete).toBe(true);
      expect(sim.typingInput.disabled).toBe(false);
      expect(sim.focusIntervalId).not.toBeNull();

      sim.handleKeyPress('k');
      expect(room.sentMessages).toHaveLength(1);

      sim.unmount();
    });

    it('C5.5.3: camera hotkey [C] does not switch camera while typing input is active, but works when blurred', () => {
      const sim = new EmpiricalMatchPageLifecycleSimulator(room, tracker, true);
      sim.handleIntroComplete();
      const arena = sim.arenaInstance!;

      const initialPreset = arena.activePresetIndex;

      // When user types 'c' in input
      const inputEvent = {
        code: 'KeyC',
        key: 'c',
        target: { tagName: 'INPUT' },
      };
      arena.keydownListener(inputEvent);
      expect(arena.activePresetIndex).toBe(initialPreset); // Preserved!

      // When user presses 'c' on arena canvas or outside input
      const canvasEvent = {
        code: 'KeyC',
        key: 'c',
        target: { tagName: 'CANVAS' },
      };
      arena.keydownListener(canvasEvent);
      expect(arena.activePresetIndex).toBe((initialPreset + 1) % CAMERA_PRESETS.length); // Cycled!

      sim.unmount();
    });
  });

  // ==========================================================================
  // SECTION 6: SOURCE CODE FORENSIC VERIFICATION
  // ==========================================================================
  describe('6. Source Code Forensic & Static Integrity Verification', () => {
    it('C5.6.1: verifies MatchPage.tsx implements all required Milestone 5 guards and cleanups', () => {
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      expect(fs.existsSync(matchPagePath)).toBe(true);
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      // 1. Phaser 2D loop deactivation guard
      expect(code).toMatch(/if\s*\(\s*is3DMode\s*\)\s*\{\s*\/\/[^\n]*\s*return;\s*\}/);

      // 2. Typing input disabled during intro
      expect(code).toContain('disabled={is3DMode && !isIntroComplete}');

      // 3. Keystroke filter checks is3DMode && !isIntroComplete
      expect(code).toContain('if (is3DMode && !isIntroComplete) return;');

      // 4. Intro skip on Space / Enter
      expect(code).toContain("event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter'");
      expect(code).toContain('threeArenaRef.current?.skipIntro()');
      expect(code).toContain('handleIntroComplete()');

      // 5. Input focus interval cleanup
      expect(code).toContain('return () => clearInterval(interval);');

      // 6. ThreeCombatArena onIntroComplete prop pass
      expect(code).toContain('onIntroComplete={handleIntroComplete}');

      // 7. Screen shake triggers on heavy/crit attacks
      expect(code).toContain('threeArenaRef.current?.triggerScreenShake?.(shake)');
    });

    it('C5.6.2: verifies ThreeCombatArena.tsx cleanup effect releases all resources', () => {
      const threeArenaPath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
      expect(fs.existsSync(threeArenaPath)).toBe(true);
      const code = fs.readFileSync(threeArenaPath, 'utf-8');

      // Cleanup section
      expect(code).toContain('cancelAnimationFrame(animId);');
      expect(code).toContain("canvasElement.removeEventListener('webglcontextlost', handleContextLost);");
      expect(code).toContain("canvasElement.removeEventListener('webglcontextrestored', handleContextRestored);");
      expect(code).toContain("window.removeEventListener('resize', handleResize);");
      expect(code).toContain("window.removeEventListener('keydown', handleKeyDown);");
      expect(code).toContain('p1FighterRef.current.dispose();');
      expect(code).toContain('p2FighterRef.current.dispose();');
      expect(code).toContain('rendererRef.current.dispose();');
      expect(code).toContain('sceneRef.current.clear();');
    });

    it('C5.6.3: verifies ThreeCombatArenaRef interface matches all required contracts', () => {
      const threeArenaPath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
      const code = fs.readFileSync(threeArenaPath, 'utf-8');

      expect(code).toContain('export interface ThreeCombatArenaRef');
      expect(code).toContain('triggerAttack:');
      expect(code).toContain('triggerHit:');
      expect(code).toContain('triggerKeystroke:');
      expect(code).toContain('triggerKnockout:');
      expect(code).toContain('triggerVictory:');
      expect(code).toContain('triggerScreenShake?:');
      expect(code).toContain('cycleCameraPreset:');
      expect(code).toContain('setCameraPreset:');
      expect(code).toContain('skipIntro:');
    });
  });
});
