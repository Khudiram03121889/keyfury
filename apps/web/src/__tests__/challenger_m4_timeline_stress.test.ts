import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  getIntroActForTime,
  getCountdownForTime,
  getSpotlightBannerForTime,
  getFighterEntranceProgress,
  resolveArenaId,
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  type ArenaId,
  type IntroAct,
  type CameraPreset,
  type ThreeCombatArenaRef,
  type FighterSpotlightData,
} from '../render/ThreeCombatArena';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  resolveCharacterId,
  type CharacterId,
} from '../game/character/Character3DController';

// ============================================================================
// PROCEDURAL TEST HARNESS & EMPIRICAL TIMELINE DIRECTOR
// ============================================================================

function createMockLoader() {
  return {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      const group = new THREE.Group();
      const rawBoneMap = [
        'Root', 'Hips', 'Spine', 'Chest', 'Neck', 'Head',
        'Shoulder.L', 'UpperArm.L', 'Forearm.L', 'Hand.L',
        'Shoulder.R', 'UpperArm.R', 'Forearm.R', 'Hand.R',
        'Thigh.L', 'Shin.L', 'Foot.L',
        'Thigh.R', 'Shin.R', 'Foot.R',
      ];
      rawBoneMap.forEach((name) => {
        const bone = new THREE.Bone();
        bone.name = name;
        group.add(bone);
      });
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.8, 0.3),
        new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.3 })
      );
      group.add(mesh);
      onLoad({ scene: group });
    },
  } as any;
}

/**
 * Empirical Director simulating the ThreeCombatArena cinematic entrance timeline
 * and camera controller loop with identical mathematics and state machines.
 */
class EmpiricalTimelineDirector {
  public arenaId: ArenaId;
  public arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
  public camera: THREE.PerspectiveCamera;
  public p1: Character3DFighter;
  public p2: Character3DFighter;

  public introTimer: number = 0;
  public elapsedTotal: number = 0;
  public isIntroComplete: boolean = false;
  public introAct: IntroAct = 'stage';
  public countdownNum: '3' | '2' | '1' | 'FIGHT!' | null = null;
  public activeBanner: FighterSpotlightData | null = null;
  public onIntroCompleteMock = vi.fn();

  public targetCamPos = new THREE.Vector3();
  public targetCamLookAt = new THREE.Vector3();
  public targetCamFov: number = 28.4;
  public currentCamLookAt = new THREE.Vector3();
  public activePresetIdx: number = 0;

  constructor(
    arenaId: ArenaId = 'cyber_rooftop',
    p1Char: CharacterId = 'ronin',
    p2Char: CharacterId = 'shinobi',
    public isBotMatch: boolean = false
  ) {
    this.arenaId = arenaId;
    this.arenaDef = ARENA_DEFINITIONS[arenaId] || ARENA_DEFINITIONS.cyber_rooftop;

    const loader = createMockLoader();
    this.p1 = new Character3DFighter(p1Char, 'left', loader);
    this.p1.baseY = this.arenaDef.fighterFloorY;
    this.p1.group.position.y = this.arenaDef.fighterFloorY;

    this.p2 = new Character3DFighter(p2Char, 'right', loader);
    this.p2.baseY = this.arenaDef.fighterFloorY;
    this.p2.group.position.y = this.arenaDef.fighterFloorY;

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
    this.camera.updateMatrixWorld(true);

    this.applyPresetTransform(0);
  }

  public applyPresetTransform(presetIdx: number) {
    const preset = CAMERA_PRESETS[presetIdx % CAMERA_PRESETS.length];
    const t = preset.getTransform(this.arenaDef);
    this.targetCamPos.set(t.pos[0], t.pos[1], t.pos[2]);
    this.targetCamLookAt.set(t.lookAt[0], t.lookAt[1], t.lookAt[2]);
    this.targetCamFov = t.fov;
  }

  public completeIntro() {
    if (this.isIntroComplete) return;
    this.isIntroComplete = true;
    this.introAct = 'combat';
    this.activeBanner = null;
    this.countdownNum = null;

    this.p1.setEntranceProgress(1.0, this.arenaId);
    this.p2.setEntranceProgress(1.0, this.arenaId);

    this.applyPresetTransform(this.activePresetIdx);
    this.camera.position.copy(this.targetCamPos);
    this.camera.fov = this.targetCamFov;
    this.camera.updateProjectionMatrix();
    this.currentCamLookAt.copy(this.targetCamLookAt);
    this.camera.lookAt(this.currentCamLookAt);
    this.camera.updateMatrixWorld(true);

    this.onIntroCompleteMock();
  }

  public skipIntro() {
    this.completeIntro();
  }

  public tick(delta: number) {
    this.elapsedTotal += delta;

    this.p1.update(delta, this.elapsedTotal);
    this.p2.update(delta, this.elapsedTotal);

    if (!this.isIntroComplete) {
      this.introTimer += delta;
      const t = this.introTimer;

      const p1Prog = getFighterEntranceProgress(t, 'left');
      const p2Prog = getFighterEntranceProgress(t, 'right');
      this.p1.setEntranceProgress(p1Prog, this.arenaId);
      this.p2.setEntranceProgress(p2Prog, this.arenaId);

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
        this.activeBanner = getSpotlightBannerForTime(t, this.p1.profile.id, this.p2.profile.id, this.isBotMatch);
        if (t >= 3.0) this.p1.triggerEntranceFlair();

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
        this.activeBanner = getSpotlightBannerForTime(t, this.p1.profile.id, this.p2.profile.id, this.isBotMatch);
        if (t >= 4.9) this.p2.triggerEntranceFlair();

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
        const tPos = this.targetCamPos;
        const tLook = this.targetCamLookAt;

        this.camera.position.x = THREE.MathUtils.lerp(1.8, tPos.x, p);
        this.camera.position.y = THREE.MathUtils.lerp(this.arenaDef.camPos[1] * 0.7 + 0.3, tPos.y, p);
        this.camera.position.z = THREE.MathUtils.lerp(this.arenaDef.camPos[2] * 0.45, tPos.z, p);
        this.camera.fov = THREE.MathUtils.lerp(32.0, this.targetCamFov, p);
        this.camera.updateProjectionMatrix();

        this.currentCamLookAt.lerp(tLook, p * 0.2);
        this.camera.lookAt(this.currentCamLookAt);

        this.countdownNum = getCountdownForTime(t);
      } else {
        this.completeIntro();
      }
    } else {
      // In combat mode
      const damping = Math.min(delta * 5.0, 1.0);
      this.camera.position.lerp(this.targetCamPos, damping);
      this.currentCamLookAt.lerp(this.targetCamLookAt, damping);
      this.camera.lookAt(this.currentCamLookAt);
      if (Math.abs(this.camera.fov - this.targetCamFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.targetCamFov, damping);
        this.camera.updateProjectionMatrix();
      }
    }

    this.camera.updateMatrixWorld(true);
  }

  public verifyFiniteState() {
    // Camera coordinates & FOV
    expect(Number.isFinite(this.camera.position.x)).toBe(true);
    expect(Number.isFinite(this.camera.position.y)).toBe(true);
    expect(Number.isFinite(this.camera.position.z)).toBe(true);
    expect(Number.isFinite(this.camera.fov)).toBe(true);
    expect(this.camera.fov).toBeGreaterThan(10);
    expect(this.camera.fov).toBeLessThan(120);

    // Camera matrix elements (all 16 values must be strictly finite)
    for (let i = 0; i < 16; i++) {
      expect(Number.isFinite(this.camera.matrixWorld.elements[i])).toBe(true);
    }

    // Fighters whole-body group positions
    expect(Number.isFinite(this.p1.group.position.x)).toBe(true);
    expect(Number.isFinite(this.p1.group.position.y)).toBe(true);
    expect(Number.isFinite(this.p1.group.position.z)).toBe(true);
    expect(Number.isFinite(this.p2.group.position.x)).toBe(true);
    expect(Number.isFinite(this.p2.group.position.y)).toBe(true);
    expect(Number.isFinite(this.p2.group.position.z)).toBe(true);

    // Mesh object Y vertical displacement
    if (this.p1.meshObject) {
      expect(Number.isFinite(this.p1.meshObject.position.y)).toBe(true);
    }
    if (this.p2.meshObject) {
      expect(Number.isFinite(this.p2.meshObject.position.y)).toBe(true);
    }

    // Rest quaternions / bone rotations
    for (const [_, bone] of Object.entries(this.p1.bones)) {
      if (bone) {
        expect(Number.isFinite(bone.quaternion.x)).toBe(true);
        expect(Number.isFinite(bone.quaternion.y)).toBe(true);
        expect(Number.isFinite(bone.quaternion.z)).toBe(true);
        expect(Number.isFinite(bone.quaternion.w)).toBe(true);
      }
    }
    for (const [_, bone] of Object.entries(this.p2.bones)) {
      if (bone) {
        expect(Number.isFinite(bone.quaternion.x)).toBe(true);
        expect(Number.isFinite(bone.quaternion.y)).toBe(true);
        expect(Number.isFinite(bone.quaternion.z)).toBe(true);
        expect(Number.isFinite(bone.quaternion.w)).toBe(true);
      }
    }
  }
}

// ============================================================================
// EMPIRICAL STRESS TEST SUITE
// ============================================================================

describe('Challenger M4: Empirical Entrance Timeline & Countdown Stress Tests', () => {

  // ==========================================================================
  // SECTION 1: EXTREME TIME DELTAS & HIGH-FREQUENCY UPDATES
  // ==========================================================================
  describe('1. Extreme Time Deltas & High-Frequency Update Stress', () => {
    it('1.1: Survives ultra-high-frequency delta ticks (delta = 0.0005, 2000 steps = 1.0s)', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');
      const stepCount = 2000;
      const delta = 0.0005;

      for (let i = 0; i < stepCount; i++) {
        director.tick(delta);
        if (i % 200 === 0) {
          director.verifyFiniteState();
        }
      }

      director.verifyFiniteState();
      expect(director.introTimer).toBeCloseTo(1.0, 3);
      expect(director.introAct).toBe('stage');
      expect(director.isIntroComplete).toBe(false);
      expect(director.onIntroCompleteMock).not.toHaveBeenCalled();
    });

    it('1.2: Standard 60 FPS update loop runs through full 7.5s timeline into combat cleanly', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');
      const dt = 1 / 60; // ~0.016667s

      // 450 ticks = 7.5s
      for (let i = 0; i < 455; i++) {
        director.tick(dt);
        if (i % 30 === 0) {
          director.verifyFiniteState();
        }
      }

      director.verifyFiniteState();
      expect(director.introTimer).toBeGreaterThanOrEqual(7.5);
      expect(director.introAct).toBe('combat');
      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);

      // Verify fighters are parked on marks
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
    });

    it('1.3: Heavy lag spikes (delta = 0.5s, 16 steps = 8.0s) smoothly cross boundaries without NaN', () => {
      const director = new EmpiricalTimelineDirector('volcanic_caldera');
      const delta = 0.5;

      for (let i = 0; i < 16; i++) {
        director.tick(delta);
        director.verifyFiniteState();
      }

      expect(director.introAct).toBe('combat');
      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('1.4: Massive freeze / tab suspension jump (delta = 10.0s in a single frame) triggers once-only completion', () => {
      const director = new EmpiricalTimelineDirector('celestial_void');

      // First tick at t=0
      director.tick(0.016);
      expect(director.isIntroComplete).toBe(false);

      // Single catastrophic freeze jump of 10 seconds
      director.tick(10.0);
      director.verifyFiniteState();

      expect(director.introAct).toBe('combat');
      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
    });

    it('1.5: Zero delta updates (delta = 0.0s, 100 consecutive frozen ticks) cause no division by zero or NaN', () => {
      const director = new EmpiricalTimelineDirector('highland_sanctuary');

      // Advance to Act 2
      director.tick(2.0);
      director.verifyFiniteState();

      // 100 frozen frames
      for (let i = 0; i < 100; i++) {
        director.tick(0.0);
        director.verifyFiniteState();
      }

      expect(director.introTimer).toBe(2.0);
      expect(director.introAct).toBe('p1');
      expect(director.isIntroComplete).toBe(false);
      expect(director.onIntroCompleteMock).not.toHaveBeenCalled();
    });

    it('1.6: Alternating chaotic delta sequence preserves strict numerical boundedness', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');
      const chaoticDeltas = [0.0001, 1.2, 0.005, 0.8, 0.016, 2.5, 0.002, 0.033, 1.5, 3.0];

      chaoticDeltas.forEach((d) => {
        director.tick(d);
        director.verifyFiniteState();
      });

      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // SECTION 2: INSTANTANEOUS SKIP BOUNDARY STRESS TESTS
  // ==========================================================================
  describe('2. Instantaneous Skip Boundary Stress Tests', () => {
    it('2.1: Skip at t = 0.0s (instant skip before any ticks) completes intro immediately', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');
      expect(director.isIntroComplete).toBe(false);

      director.skipIntro();

      expect(director.isIntroComplete).toBe(true);
      expect(director.introAct).toBe('combat');
      expect(director.countdownNum).toBeNull();
      expect(director.activeBanner).toBeNull();
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
      director.verifyFiniteState();
    });

    it('2.2: Skip at t = 1.49s (end of Act 1 Stage Panorama boundary) snaps fighters and invokes once', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');
      director.tick(1.49);
      expect(director.introAct).toBe('stage');
      expect(director.isIntroComplete).toBe(false);

      director.skipIntro();

      expect(director.isIntroComplete).toBe(true);
      expect(director.introAct).toBe('combat');
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
      director.verifyFiniteState();
    });

    it('2.3: Skip at t = 3.49s (end of Act 2 Player 1 Spotlight boundary) dismisses banner and snaps marks', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');
      director.tick(3.49);
      expect(director.introAct).toBe('p1');
      expect(director.activeBanner).not.toBeNull();

      director.skipIntro();

      expect(director.isIntroComplete).toBe(true);
      expect(director.introAct).toBe('combat');
      expect(director.activeBanner).toBeNull();
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
      director.verifyFiniteState();
    });

    it('2.4: Skip at t = 5.49s (end of Act 3 Player 2 Spotlight boundary) dismisses banner and snaps marks', () => {
      const director = new EmpiricalTimelineDirector('volcanic_caldera');
      director.tick(5.49);
      expect(director.introAct).toBe('p2');
      expect(director.activeBanner).not.toBeNull();

      director.skipIntro();

      expect(director.isIntroComplete).toBe(true);
      expect(director.introAct).toBe('combat');
      expect(director.activeBanner).toBeNull();
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
      director.verifyFiniteState();
    });

    it('2.5: Skip at t = 7.49s (end of Act 4 Standoff during "FIGHT!") clears countdown and snaps marks', () => {
      const director = new EmpiricalTimelineDirector('celestial_void');
      director.tick(7.49);
      expect(director.introAct).toBe('standoff');
      expect(director.countdownNum).toBe('FIGHT!');

      director.skipIntro();

      expect(director.isIntroComplete).toBe(true);
      expect(director.introAct).toBe('combat');
      expect(director.countdownNum).toBeNull();
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
      director.verifyFiniteState();
    });

    it('2.6: Skip called AFTER natural combat transition (t = 8.0s) is strictly idempotent', () => {
      const director = new EmpiricalTimelineDirector('highland_sanctuary');

      // Let intro conclude naturally
      director.tick(7.5);
      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);

      // Now call skip at t = 8.0s
      director.tick(0.5);
      director.skipIntro();
      director.skipIntro();

      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
      director.verifyFiniteState();
    });
  });

  // ==========================================================================
  // SECTION 3: IDEMPOTENCY & ONCE-ONLY CALLBACK GUARANTEES
  // ==========================================================================
  describe('3. Idempotency & Once-Only Callback Guarantees', () => {
    it('3.1: Hammering skipIntro 100 times in the same tick invokes onIntroComplete strictly ONCE', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');
      director.tick(2.0); // Mid-Act 2

      for (let i = 0; i < 100; i++) {
        director.skipIntro();
      }

      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('3.2: Calling skipIntro on every single frame across entire timeline invokes callback strictly ONCE', () => {
      const director = new EmpiricalTimelineDirector('volcanic_caldera');

      for (let i = 0; i < 300; i++) {
        director.tick(0.016);
        director.skipIntro();
      }

      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('3.3: Skip invocation concurrent with natural completion at t = 7.5s produces exactly 1 callback', () => {
      const director = new EmpiricalTimelineDirector('celestial_void');
      director.tick(7.49);
      expect(director.onIntroCompleteMock).not.toHaveBeenCalled();

      // Tick lands exactly on 7.5s, then skip immediately called
      director.tick(0.01);
      director.skipIntro();

      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('3.4: Complete natural intro run to t = 10.0s without skips fires callback strictly ONCE', () => {
      const director = new EmpiricalTimelineDirector('highland_sanctuary');
      const dt = 0.016;
      const steps = Math.ceil(10.0 / dt);

      for (let i = 0; i < steps; i++) {
        director.tick(dt);
      }

      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // SECTION 4: STRICT NUMERICAL & MATRIX INVARIANCE (ZERO NaNs / Infs)
  // ==========================================================================
  describe('4. Strict Numerical & Matrix Invariance (Zero NaNs / Infs)', () => {
    it('4.1: Camera position, FOV, lookAt, and matrixWorld remain finite across 1000 sampled timestamps', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');

      for (let step = 0; step < 1000; step++) {
        // Sample with variable step sizes
        director.tick(0.008);
        director.verifyFiniteState();
      }
    });

    it('4.2: Fighter positions and all 20 bone transformations remain strictly finite throughout', () => {
      const director = new EmpiricalTimelineDirector('volcanic_caldera', 'valkyrie', 'ronin');

      for (let step = 0; step < 500; step++) {
        director.tick(0.016);
        director.verifyFiniteState();
      }
    });

    it('4.3: Camera preset transformations across all 5 presets remain strictly finite', () => {
      const arenaIds: ArenaId[] = ['cyber_rooftop', 'volcanic_caldera', 'celestial_void', 'highland_sanctuary'];

      arenaIds.forEach((arenaId) => {
        const def = ARENA_DEFINITIONS[arenaId];
        CAMERA_PRESETS.forEach((preset) => {
          const t = preset.getTransform(def);
          expect(Number.isFinite(t.pos[0])).toBe(true);
          expect(Number.isFinite(t.pos[1])).toBe(true);
          expect(Number.isFinite(t.pos[2])).toBe(true);
          expect(Number.isFinite(t.lookAt[0])).toBe(true);
          expect(Number.isFinite(t.lookAt[1])).toBe(true);
          expect(Number.isFinite(t.lookAt[2])).toBe(true);
          expect(Number.isFinite(t.fov)).toBe(true);
          expect(t.fov).toBeGreaterThan(0);
        });
      });
    });
  });

  // ==========================================================================
  // SECTION 5: HOSTILE COMBAT INPUT INJECTION DURING INTRO SEQUENCE
  // ==========================================================================
  describe('5. Hostile Combat Input Injection During Intro Sequence', () => {
    it('5.1: Attacking during Act 1, 2, 3, or 4 does not crash or corrupt fighter state', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop');

      // Act 1: Attack triggers
      director.tick(0.5);
      expect(() => {
        director.p1.playJab();
        director.p2.playKick();
      }).not.toThrow();
      director.verifyFiniteState();

      // Act 2: Heavy attacks
      director.tick(1.5);
      expect(() => {
        director.p1.playHeavy();
        director.p2.playJab();
      }).not.toThrow();
      director.verifyFiniteState();

      // Act 3: Attacks during P2 arrival
      director.tick(2.0);
      expect(() => {
        director.p2.playKick();
        director.p1.playHeavy();
      }).not.toThrow();
      director.verifyFiniteState();

      // Act 4: Attacks during countdown
      director.tick(2.0);
      expect(() => {
        director.p1.playJab();
        director.p2.playHeavy();
      }).not.toThrow();
      director.verifyFiniteState();

      // Transition smoothly to combat
      director.tick(2.0);
      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('5.2: Hit reactions and flinches triggered during intro do not crash', () => {
      const director = new EmpiricalTimelineDirector('volcanic_caldera');

      director.tick(2.0);
      expect(() => {
        director.p1.playHitLight();
        director.p2.playHitHeavy();
      }).not.toThrow();
      director.verifyFiniteState();
    });

    it('5.3: Rapid typing keystroke spam (100 keystrokes) during intro is absorbed gracefully', () => {
      const director = new EmpiricalTimelineDirector('celestial_void');

      for (let i = 0; i < 100; i++) {
        director.p1.playKeystroke();
        director.p2.playKeystroke();
        director.tick(0.01);
      }

      director.verifyFiniteState();
      expect(director.introTimer).toBeCloseTo(1.0, 2);
    });

    it('5.4: Knockout and victory calls during intro do not corrupt entrance timeline', () => {
      const director = new EmpiricalTimelineDirector('highland_sanctuary');

      director.tick(1.0);
      expect(() => {
        director.p1.playKnockout();
        director.p2.playVictory();
      }).not.toThrow();
      director.verifyFiniteState();

      // Ensure intro can still complete naturally
      director.tick(7.0);
      expect(director.isIntroComplete).toBe(true);
      expect(director.onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // SECTION 6: MULTI-ARENA KINEMATICS ACROSS ALL 4 MAPS
  // ==========================================================================
  describe('6. Multi-Arena Kinematics Across All 4 Maps', () => {
    it('6.1: Cyber Neon Rooftop executes drop-in kinematics with calibrated floor', () => {
      const director = new EmpiricalTimelineDirector('cyber_rooftop', 'ronin', 'shinobi');
      expect(director.arenaDef.fighterFloorY).toBe(0.205);

      director.tick(2.25); // Mid-P1 drop
      director.verifyFiniteState();
      expect(director.p1.group.position.x).toBeGreaterThan(-6.5);
      expect(director.p1.group.position.x).toBeLessThan(-1.50);

      director.tick(6.0); // Complete
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      director.verifyFiniteState();
    });

    it('6.2: Volcanic Caldera Core executes molten fissure rise with calibrated floor', () => {
      const director = new EmpiricalTimelineDirector('volcanic_caldera', 'valkyrie', 'void');
      expect(director.arenaDef.fighterFloorY).toBe(0.025);

      director.tick(2.0);
      director.verifyFiniteState();

      director.completeIntro();
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      director.verifyFiniteState();
    });

    it('6.3: Celestial Void Shrine executes zero-G glide with calibrated floor', () => {
      const director = new EmpiricalTimelineDirector('celestial_void', 'void', 'valkyrie');
      expect(director.arenaDef.fighterFloorY).toBe(0.405);

      director.tick(4.2); // Mid-P2 glide
      director.verifyFiniteState();

      director.skipIntro();
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      director.verifyFiniteState();
    });

    it('6.4: Highland Sanctuary Plateau executes alpine terrace sprint with calibrated floor', () => {
      const director = new EmpiricalTimelineDirector('highland_sanctuary', 'shinobi', 'ronin');
      expect(director.arenaDef.fighterFloorY).toBe(0.027);

      director.tick(4.0);
      director.verifyFiniteState();

      director.completeIntro();
      expect(director.p1.group.position.x).toBe(-1.50);
      expect(director.p2.group.position.x).toBe(1.50);
      director.verifyFiniteState();
    });
  });

  // ==========================================================================
  // SECTION 7: PURE TIMELINE HELPER FUNCTIONS BOUNDARY & DEFENSE TESTING
  // ==========================================================================
  describe('7. Pure Timeline Helper Functions Boundary & Defense Testing', () => {
    it('7.1: getIntroActForTime boundary and robustness checks', () => {
      // Sub-zero and negative time resilience
      expect(getIntroActForTime(-10.0)).toBe('stage');
      expect(getIntroActForTime(-0.001)).toBe('stage');

      // Exact boundary precision
      expect(getIntroActForTime(0.0)).toBe('stage');
      expect(getIntroActForTime(1.49999)).toBe('stage');
      expect(getIntroActForTime(1.5)).toBe('p1');
      expect(getIntroActForTime(3.49999)).toBe('p1');
      expect(getIntroActForTime(3.5)).toBe('p2');
      expect(getIntroActForTime(5.49999)).toBe('p2');
      expect(getIntroActForTime(5.5)).toBe('standoff');
      expect(getIntroActForTime(7.49999)).toBe('standoff');
      expect(getIntroActForTime(7.5)).toBe('combat');
      expect(getIntroActForTime(100.0)).toBe('combat');
    });

    it('7.2: getCountdownForTime sub-interval precision checks', () => {
      expect(getCountdownForTime(0.0)).toBeNull();
      expect(getCountdownForTime(5.499)).toBeNull();

      expect(getCountdownForTime(5.5)).toBe('3');
      expect(getCountdownForTime(6.199)).toBe('3');

      expect(getCountdownForTime(6.2)).toBe('2');
      expect(getCountdownForTime(6.899)).toBe('2');

      expect(getCountdownForTime(6.9)).toBe('1');
      expect(getCountdownForTime(7.299)).toBe('1');

      expect(getCountdownForTime(7.3)).toBe('FIGHT!');
      expect(getCountdownForTime(7.499)).toBe('FIGHT!');

      expect(getCountdownForTime(7.5)).toBeNull();
      expect(getCountdownForTime(10.0)).toBeNull();
    });

    it('7.3: getFighterEntranceProgress monotonicity and range bounds', () => {
      // Monotonic progression for Left
      let lastLeft = -1;
      for (let t = 0; t <= 5.0; t += 0.1) {
        const p = getFighterEntranceProgress(t, 'left');
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1.0);
        expect(p).toBeGreaterThanOrEqual(lastLeft);
        lastLeft = p;
      }

      // Monotonic progression for Right
      let lastRight = -1;
      for (let t = 0; t <= 6.0; t += 0.1) {
        const p = getFighterEntranceProgress(t, 'right');
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1.0);
        expect(p).toBeGreaterThanOrEqual(lastRight);
        lastRight = p;
      }
    });

    it('7.4: resolveArenaId and resolveCharacterId fuzzy matching resilience with edge cases', () => {
      expect(resolveArenaId('')).toBe('cyber_rooftop');
      expect(resolveArenaId('UNKNOWN_RANDOM_MAP')).toBe('cyber_rooftop');
      expect(resolveArenaId('Celestial_Altar')).toBe('celestial_void');
      expect(resolveArenaId('Caldera_Core_Eruption')).toBe('volcanic_caldera');
      expect(resolveArenaId('Highland_Plateau')).toBe('highland_sanctuary');

      expect(resolveCharacterId('')).toBe('ronin');
      expect(resolveCharacterId('UNKNOWN_HERO')).toBe('ronin');
      expect(resolveCharacterId('Kage_Ronin')).toBe('ronin');
      expect(resolveCharacterId('Raijin_Shinobi')).toBe('shinobi');
      expect(resolveCharacterId('Nyx_Void')).toBe('void');
      expect(resolveCharacterId('Freya_Valkyrie')).toBe('valkyrie');
    });
  });
});
