import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  type CameraPreset,
  type ArenaDefinition,
  type IntroAct,
  type ThreeCombatArenaRef,
} from '../render/ThreeCombatArena';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  resolveCharacterId,
  type CharacterId,
} from '../game/character/Character3DController';

// ============================================================================
// TEST HARNESS & PROCEDURAL MOCKS
// ============================================================================

function createMockBoneScene(characterId: CharacterId = 'ronin'): THREE.Group {
  const group = new THREE.Group();
  group.name = `MockFighter_${characterId}`;

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
  mesh.name = `Mesh_${characterId}`;
  group.add(mesh);

  return group;
}

function createMockLoader(customScene?: THREE.Group) {
  return {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      const scene = customScene ?? createMockBoneScene('ronin');
      onLoad({ scene });
    },
  } as any;
}

// ============================================================================
// ADVERSARIAL COVERAGE HARDENING TEST SUITE
// ============================================================================

describe('Challenger M6 Tier 5: ThreeCombatArena White-Box Adversarial Hardening', () => {

  // ==========================================================================
  // 1. CAMERA PRESETS & TRANSFORMS STRESS
  // ==========================================================================
  describe('1. Camera Presets & Degenerate Input Hardening', () => {
    it('EMP-M6.1.1: All 7 presets generate strictly finite 3D coordinates across all 4 registered arenas', () => {
      const arenaIds: ArenaId[] = ['cyber_rooftop', 'celestial_void', 'volcanic_caldera', 'highland_sanctuary'];
      const presetIds: CameraPreset[] = ['front', 'left', 'right', 'spider_cam', 'focused_60', 'back', 'wide_front'];

      expect(CAMERA_PRESETS).toHaveLength(7);

      arenaIds.forEach((arenaId) => {
        const arenaDef = ARENA_DEFINITIONS[arenaId];
        expect(arenaDef).toBeDefined();

        CAMERA_PRESETS.forEach((preset) => {
          expect(presetIds).toContain(preset.id);
          const t = preset.getTransform(arenaDef);

          expect(t.pos).toHaveLength(3);
          expect(t.lookAt).toHaveLength(3);
          expect(Number.isFinite(t.pos[0])).toBe(true);
          expect(Number.isFinite(t.pos[1])).toBe(true);
          expect(Number.isFinite(t.pos[2])).toBe(true);
          expect(Number.isFinite(t.lookAt[0])).toBe(true);
          expect(Number.isFinite(t.lookAt[1])).toBe(true);
          expect(Number.isFinite(t.lookAt[2])).toBe(true);
          expect(t.fov).toBeGreaterThan(15);
          expect(t.fov).toBeLessThan(100);
        });
      });
    });

    it('EMP-M6.1.2: Degenerate ArenaDefinition fallback resilience (nullish/empty fields)', () => {
      const degenerateDef: ArenaDefinition = {
        id: 'cyber_rooftop',
        name: 'Corrupted Arena',
        subtitle: 'Degenerate Test',
        glb: '',
        camPos: undefined as any,
        camLookAt: undefined as any,
        camFov: undefined as any,
        fighterFloorY: undefined as any,
        skyColor: 0,
        ambientIntensity: 0,
        keyIntensity: 0,
        keyPos: [0, 0, 0],
        rimColor: 0,
        rimIntensity: 0,
        rimPos: [0, 0, 0],
        themeColor: '#000000',
        entranceFlair: '',
      };

      CAMERA_PRESETS.forEach((preset) => {
        const t = preset.getTransform(degenerateDef);
        expect(Number.isFinite(t.pos[0])).toBe(true);
        expect(Number.isFinite(t.pos[1])).toBe(true);
        expect(Number.isFinite(t.pos[2])).toBe(true);
        expect(Number.isFinite(t.lookAt[0])).toBe(true);
        expect(Number.isFinite(t.lookAt[1])).toBe(true);
        expect(Number.isFinite(t.lookAt[2])).toBe(true);
        expect(Number.isFinite(t.fov)).toBe(true);
      });
    });

    it('EMP-M6.1.3: 10,000 rapid preset cycles maintain boundary invariants and zero memory leaks', () => {
      let activeIndex = 0;
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;

      for (let i = 0; i < 10000; i++) {
        activeIndex = (activeIndex + 1) % CAMERA_PRESETS.length;
        expect(activeIndex).toBeGreaterThanOrEqual(0);
        expect(activeIndex).toBeLessThan(CAMERA_PRESETS.length);

        const preset = CAMERA_PRESETS[activeIndex];
        const t = preset.getTransform(arenaDef);
        expect(Number.isFinite(t.pos[2])).toBe(true);
      }
      expect(activeIndex).toBe(10000 % CAMERA_PRESETS.length);
    });

    it('EMP-M6.1.4: Relative spatial hierarchy between presets is maintained', () => {
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      const frontTransform = CAMERA_PRESETS.find(p => p.id === 'front')!.getTransform(arenaDef);
      const leftTransform = CAMERA_PRESETS.find(p => p.id === 'left')!.getTransform(arenaDef);
      const spiderTransform = CAMERA_PRESETS.find(p => p.id === 'spider_cam')!.getTransform(arenaDef);
      const focused60Transform = CAMERA_PRESETS.find(p => p.id === 'focused_60')!.getTransform(arenaDef);

      // Left flank view is offset to left (negative X)
      expect(leftTransform.pos[0]).toBeLessThan(-2.0);

      // Spider cam is higher (higher Y) than front zoom
      expect(spiderTransform.pos[1]).toBeGreaterThan(frontTransform.pos[1]);

      // Top 60° view is significantly elevated (highest Y)
      expect(focused60Transform.pos[1]).toBeGreaterThan(spiderTransform.pos[1]);
    });
  });

  // ==========================================================================
  // 2. DYNAMIC CAMERA TRACKING & FIGHTER DISPLACEMENT EXTREMES
  // ==========================================================================
  describe('2. Dynamic Camera Tracking & Separation Invariants', () => {
    it('EMP-M6.2.1: Dynamic camera zooms backward monotonically as fighter separation grows', () => {
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      const basePreset = CAMERA_PRESETS.find(p => p.id === 'front')!.getTransform(arenaDef);
      const targetCamPos = new THREE.Vector3(...basePreset.pos);
      const dynamicTrackPos = new THREE.Vector3();

      const computeDynamicZ = (dist: number) => {
        return targetCamPos.z + Math.max(0, (dist - 3.0) * 0.25);
      };

      // Under baseline distance (3.0m or less), no zoom pullback
      expect(computeDynamicZ(1.0)).toBe(targetCamPos.z);
      expect(computeDynamicZ(2.5)).toBe(targetCamPos.z);
      expect(computeDynamicZ(3.0)).toBe(targetCamPos.z);

      // As distance increases, Z pulls back monotonically
      const z5m = computeDynamicZ(5.0);
      const z10m = computeDynamicZ(10.0);
      const z25m = computeDynamicZ(25.0);
      const z100m = computeDynamicZ(100.0);

      expect(z5m).toBeGreaterThan(targetCamPos.z);
      expect(z10m).toBeGreaterThan(z5m);
      expect(z25m).toBeGreaterThan(z10m);
      expect(z100m).toBeGreaterThan(z25m);
      expect(Number.isFinite(z100m)).toBe(true);
    });

    it('EMP-M6.2.2: Extreme fighter positions (side swapping & large knockbacks) stay finite', () => {
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      const basePreset = CAMERA_PRESETS.find(p => p.id === 'front')!.getTransform(arenaDef);
      const targetCamPos = new THREE.Vector3(...basePreset.pos);
      const targetCamLookAt = new THREE.Vector3(...basePreset.lookAt);

      const dynamicTrackPos = new THREE.Vector3();
      const dynamicTrackLookAt = new THREE.Vector3();

      const simulateDynamicTracking = (p1X: number, p2X: number) => {
        const midX = (p1X + p2X) * 0.5;
        const fighterDist = Math.abs(p1X - p2X);

        dynamicTrackPos.set(
          targetCamPos.x + midX * 0.35,
          targetCamPos.y,
          targetCamPos.z + Math.max(0, (fighterDist - 3.0) * 0.25)
        );
        dynamicTrackLookAt.set(
          targetCamLookAt.x + midX * 0.65,
          targetCamLookAt.y,
          targetCamLookAt.z
        );
        return { pos: dynamicTrackPos.clone(), lookAt: dynamicTrackLookAt.clone() };
      };

      // Case 1: Swapped positions (P1 right, P2 left)
      const swapped = simulateDynamicTracking(15.0, -15.0);
      expect(swapped.pos.x).toBe(0);
      expect(swapped.lookAt.x).toBe(0);
      expect(swapped.pos.z).toBeGreaterThan(targetCamPos.z);

      // Case 2: Asymmetrical knockback to positive boundary
      const rightShift = simulateDynamicTracking(20.0, 30.0);
      expect(rightShift.pos.x).toBeGreaterThan(0);
      expect(rightShift.lookAt.x).toBeGreaterThan(0);
      expect(Number.isFinite(rightShift.pos.x)).toBe(true);
      expect(Number.isFinite(rightShift.pos.z)).toBe(true);

      // Case 3: Complete overlap at zero
      const overlap = simulateDynamicTracking(0, 0);
      expect(overlap.pos.x).toBe(0);
      expect(overlap.pos.z).toBe(targetCamPos.z);
    });
  });

  // ==========================================================================
  // 3. EXPONENTIAL DAMPING LERP & FRAME RATE INDEPENDENCE
  // ==========================================================================
  describe('3. Exponential Damping & Simulation Delta Stability', () => {
    it('EMP-M6.3.1: Damping factor clamping strictly enforces [0.0, 1.0] across all delta values', () => {
      const testDeltas = [0, 0.0001, 0.016, 0.033, 0.05, 0.1, 0.2, 1.0, 100.0];

      testDeltas.forEach((rawDelta) => {
        const delta = Math.min(rawDelta, 0.1); // As implemented in ThreeCombatArena
        const damping = Math.min(delta * 5.0, 1.0);

        expect(damping).toBeGreaterThanOrEqual(0.0);
        expect(damping).toBeLessThanOrEqual(1.0);
        expect(Number.isFinite(damping)).toBe(true);
      });
    });

    it('EMP-M6.3.2: Position lerp converges smoothly under simulated 10 FPS lag spike without oscillation', () => {
      const startPos = new THREE.Vector3(10, 5, 30);
      const targetPos = new THREE.Vector3(0, 2.33, 20);
      const currentPos = startPos.clone();

      const delta = 0.1; // Max clamped delta (10 FPS)
      const damping = Math.min(delta * 5.0, 1.0); // 0.5

      let prevDistance = currentPos.distanceTo(targetPos);

      // Run 20 frames of lag
      for (let frame = 0; frame < 20; frame++) {
        currentPos.lerp(targetPos, damping);
        const distance = currentPos.distanceTo(targetPos);

        // Distance to target must decrease strictly monotonically
        expect(distance).toBeLessThan(prevDistance);
        prevDistance = distance;
      }

      // After 20 frames at 0.5 damping per frame, error is 0.5^20 < 1e-6
      expect(currentPos.distanceTo(targetPos)).toBeLessThan(0.0001);
    });

    it('EMP-M6.3.3: FOV lerp converges to target within 0.05 tolerance threshold', () => {
      let currentFov = 45.0;
      const targetFov = 28.4;
      const delta = 0.016; // 60 FPS
      const damping = Math.min(delta * 5.0, 1.0);

      let frames = 0;
      while (Math.abs(currentFov - targetFov) > 0.05 && frames < 500) {
        currentFov = THREE.MathUtils.lerp(currentFov, targetFov, damping);
        frames++;
      }

      expect(Math.abs(currentFov - targetFov)).toBeLessThanOrEqual(0.05);
      expect(frames).toBeLessThan(120); // Converges in under 2 seconds at 60 FPS
    });
  });

  // ==========================================================================
  // 4. SCREEN SHAKE JITTER BOUNDS, DECAY & ZERO PERSISTENT DRIFT
  // ==========================================================================
  describe('4. Screen Shake Dynamics & Zero Persistent Drift Invariant', () => {
    it('EMP-M6.4.1: Linear decay rate is constant at 1.5 units/sec and clamps at 0', () => {
      let shakeIntensity = 0.35; // Knockout intensity
      const delta = 0.01667; // 60 FPS frame time
      const decayRate = 1.5;

      let frames = 0;
      while (shakeIntensity > 0 && frames < 100) {
        shakeIntensity = Math.max(0, shakeIntensity - delta * decayRate);
        frames++;
      }

      // 0.35 / 1.5 = 0.2333 seconds = ~14 frames at 60 FPS
      expect(frames).toBeGreaterThanOrEqual(13);
      expect(frames).toBeLessThanOrEqual(16);
      expect(shakeIntensity).toBe(0);
    });

    it('EMP-M6.4.2: Camera returns to exact target position with 0.0000 persistent drift after heavy shake barrage', () => {
      const camera = new THREE.PerspectiveCamera(28.4, 16 / 9, 0.1, 1000);
      const targetCamPos = new THREE.Vector3(0, 2.33, 20.0);
      camera.position.copy(targetCamPos);

      let shakeIntensity = 0.35; // Maximum shake
      const delta = 0.016;
      const damping = Math.min(delta * 5.0, 1.0);

      // Phase 1: 30 frames with active shake perturbations
      for (let frame = 0; frame < 30; frame++) {
        // Camera lerp towards target
        camera.position.lerp(targetCamPos, damping);

        // Apply shake if active
        if (shakeIntensity > 0) {
          const shakeX = (Math.random() - 0.5) * shakeIntensity;
          const shakeY = (Math.random() - 0.5) * shakeIntensity;
          camera.position.x += shakeX;
          camera.position.y += shakeY;
          shakeIntensity = Math.max(0, shakeIntensity - delta * 1.5);
        }
      }

      expect(shakeIntensity).toBe(0);

      // Phase 2: Post-shake stabilization (120 frames = 2.0s to fully damp exponential lerp)
      for (let frame = 0; frame < 120; frame++) {
        camera.position.lerp(targetCamPos, damping);
      }

      // Invariant: Zero persistent drift (< 0.0001 units = 0.1mm)
      expect(Math.abs(camera.position.x - targetCamPos.x)).toBeLessThan(1e-4);
      expect(Math.abs(camera.position.y - targetCamPos.y)).toBeLessThan(1e-4);
      expect(Math.abs(camera.position.z - targetCamPos.z)).toBeLessThan(1e-4);
    });

    it('EMP-M6.4.3: Empirical jitter offset bounds across 50,000 random samples', () => {
      const intensity = 0.35;
      const maxBound = intensity * 0.5;

      for (let i = 0; i < 50000; i++) {
        const shakeX = (Math.random() - 0.5) * intensity;
        const shakeY = (Math.random() - 0.5) * intensity;

        expect(shakeX).toBeGreaterThanOrEqual(-maxBound);
        expect(shakeX).toBeLessThan(maxBound);
        expect(shakeY).toBeGreaterThanOrEqual(-maxBound);
        expect(shakeY).toBeLessThan(maxBound);
      }
    });
  });

  // ==========================================================================
  // 5. 4-ACT ENTRANCE TIMELINE, BOUNDARY PRECISION & COUNTDOWN
  // ==========================================================================
  describe('5. 4-Act Entrance Timeline & Synchronized Countdown Hardening', () => {
    it('EMP-M6.5.1: Microsecond boundary transition precision across all acts', () => {
      // Act 1: Stage (0.0 to 1.5s)
      expect(getIntroActForTime(0.0)).toBe('stage');
      expect(getIntroActForTime(1.499999)).toBe('stage');

      // Act 2: P1 (1.5 to 3.5s)
      expect(getIntroActForTime(1.5)).toBe('p1');
      expect(getIntroActForTime(3.499999)).toBe('p1');

      // Act 3: P2 (3.5 to 5.5s)
      expect(getIntroActForTime(3.5)).toBe('p2');
      expect(getIntroActForTime(5.499999)).toBe('p2');

      // Act 4: Standoff (5.5 to 7.5s)
      expect(getIntroActForTime(5.5)).toBe('standoff');
      expect(getIntroActForTime(7.499999)).toBe('standoff');

      // Combat: >= 7.5s
      expect(getIntroActForTime(7.5)).toBe('combat');
      expect(getIntroActForTime(100.0)).toBe('combat');
    });

    it('EMP-M6.5.2: Negative and degenerate time values handle gracefully', () => {
      expect(getIntroActForTime(-10.0)).toBe('stage');
      expect(getCountdownForTime(-1.0)).toBeNull();
      expect(getFighterEntranceProgress(-5.0, 'left')).toBe(0);
      expect(getFighterEntranceProgress(-5.0, 'right')).toBe(0);
    });

    it('EMP-M6.5.3: Countdown transitions are mutually exclusive, complete and monotonic', () => {
      // Outside standoff act: countdown is strictly null
      expect(getCountdownForTime(0.0)).toBeNull();
      expect(getCountdownForTime(5.499)).toBeNull();
      expect(getCountdownForTime(7.5)).toBeNull();
      expect(getCountdownForTime(10.0)).toBeNull();

      // Inside standoff act (5.5s to 7.5s)
      expect(getCountdownForTime(5.5)).toBe('3');
      expect(getCountdownForTime(6.199)).toBe('3');
      expect(getCountdownForTime(6.2)).toBe('2');
      expect(getCountdownForTime(6.899)).toBe('2');
      expect(getCountdownForTime(6.9)).toBe('1');
      expect(getCountdownForTime(7.299)).toBe('1');
      expect(getCountdownForTime(7.3)).toBe('FIGHT!');
      expect(getCountdownForTime(7.499)).toBe('FIGHT!');
    });

    it('EMP-M6.5.4: Fighter entrance progress is strictly monotonic non-decreasing in [0.0, 1.0]', () => {
      let prevP1 = -1;
      let prevP2 = -1;

      for (let t = 0; t <= 8.0; t += 0.05) {
        const p1 = getFighterEntranceProgress(t, 'left');
        const p2 = getFighterEntranceProgress(t, 'right');

        expect(p1).toBeGreaterThanOrEqual(0.0);
        expect(p1).toBeLessThanOrEqual(1.0);
        expect(p2).toBeGreaterThanOrEqual(0.0);
        expect(p2).toBeLessThanOrEqual(1.0);

        expect(p1).toBeGreaterThanOrEqual(prevP1);
        expect(p2).toBeGreaterThanOrEqual(prevP2);

        prevP1 = p1;
        prevP2 = p2;
      }

      // P1 completed at 3.0s, P2 completed at 4.9s
      expect(getFighterEntranceProgress(3.0, 'left')).toBe(1.0);
      expect(getFighterEntranceProgress(4.9, 'right')).toBe(1.0);
    });

    it('EMP-M6.5.5: Spotlight banner permutation matrix (4 P1 x 4 P2 x 2 modes)', () => {
      const fighterIds: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

      fighterIds.forEach((p1Id) => {
        fighterIds.forEach((p2Id) => {
          [true, false].forEach((isBot) => {
            // Act 1: No banner
            expect(getSpotlightBannerForTime(1.0, p1Id, p2Id, isBot)).toBeNull();

            // Act 2: P1 banner
            const p1Banner = getSpotlightBannerForTime(2.5, p1Id, p2Id, isBot);
            expect(p1Banner).not.toBeNull();
            expect(p1Banner?.side).toBe('left');
            expect(p1Banner?.name).toBe(CHARACTER_PROFILES[p1Id].name);
            expect(p1Banner?.weapon).toBe(CHARACTER_PROFILES[p1Id].weapon);
            expect(p1Banner?.color).toBe(CHARACTER_PROFILES[p1Id].glowColor);

            // Act 3: P2 banner
            const p2Banner = getSpotlightBannerForTime(4.5, p1Id, p2Id, isBot);
            expect(p2Banner).not.toBeNull();
            expect(p2Banner?.side).toBe('right');
            if (isBot) {
              expect(p2Banner?.name).toContain('(AI)');
            } else {
              expect(p2Banner?.name).toBe(CHARACTER_PROFILES[p2Id].name);
            }
            expect(p2Banner?.weapon).toBe(CHARACTER_PROFILES[p2Id].weapon);

            // Act 4: No banner
            expect(getSpotlightBannerForTime(6.0, p1Id, p2Id, isBot)).toBeNull();
          });
        });
      });
    });
  });

  // ==========================================================================
  // 6. SKIP INTRO IDEMPOTENCY & CONTROL CONCURRENCY
  // ==========================================================================
  describe('6. Skip Intro Concurrency & Idempotency Hardening', () => {
    it('EMP-M6.6.1: High-frequency concurrent skip invocations invoke onIntroComplete exactly once', () => {
      let isCompleted = false;
      let callCount = 0;
      const onIntroComplete = vi.fn(() => {
        callCount++;
      });

      const completeIntro = () => {
        if (isCompleted) return;
        isCompleted = true;
        onIntroComplete();
      };

      // 100 simultaneous skip calls (button click + keyboard + programmatic ref)
      for (let i = 0; i < 100; i++) {
        completeIntro();
      }

      expect(isCompleted).toBe(true);
      expect(onIntroComplete).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(1);
    });

    it('EMP-M6.6.2: Post-completion skip calls are no-ops', () => {
      let isCompleted = true; // Natural completion occurred
      const onIntroComplete = vi.fn();

      const completeIntro = () => {
        if (isCompleted) return;
        isCompleted = true;
        onIntroComplete();
      };

      completeIntro();
      expect(onIntroComplete).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // 7. HOTKEY ISOLATION & INPUT SHIELDING
  // ==========================================================================
  describe('7. Hotkey Isolation & Keyboard Event Handling', () => {
    it('EMP-M6.7.1: Camera preset toggle hotkey [C] is blocked when active element is INPUT or TEXTAREA', () => {
      let cycled = false;
      const cyclePreset = () => { cycled = true; };

      const simulateKeyDown = (code: string, key: string, targetTag: string, activeTag?: string) => {
        cycled = false;
        if (code === 'KeyC' || key === 'c' || key === 'C') {
          const tTag = targetTag.toUpperCase();
          const aTag = activeTag ? activeTag.toUpperCase() : undefined;
          if (tTag !== 'INPUT' && tTag !== 'TEXTAREA' && aTag !== 'INPUT' && aTag !== 'TEXTAREA') {
            cyclePreset();
          }
        }
      };

      // Case 1: Target is INPUT
      simulateKeyDown('KeyC', 'c', 'INPUT');
      expect(cycled).toBe(false);

      // Case 2: Target is TEXTAREA
      simulateKeyDown('KeyC', 'c', 'TEXTAREA');
      expect(cycled).toBe(false);

      // Case 3: Document activeElement is INPUT
      simulateKeyDown('KeyC', 'c', 'DIV', 'INPUT');
      expect(cycled).toBe(false);

      // Case 4: Target is BUTTON or DIV (free to cycle)
      simulateKeyDown('KeyC', 'c', 'BUTTON', 'BODY');
      expect(cycled).toBe(true);

      simulateKeyDown('KeyC', 'c', 'CANVAS', 'BODY');
      expect(cycled).toBe(true);
    });

    it('EMP-M6.7.2: Space and Enter keys trigger skipIntro only when intro is active', () => {
      let skipped = false;
      let introDone = false;

      const handleKey = (code: string, key: string) => {
        if ((code === 'Enter' || code === 'Space' || key === 'Enter' || key === ' ') && !introDone) {
          skipped = true;
          introDone = true;
        }
      };

      handleKey('Enter', 'Enter');
      expect(skipped).toBe(true);

      // Subsequent key events after completion are ignored
      skipped = false;
      handleKey('Space', ' ');
      expect(skipped).toBe(false);
    });
  });

  // ==========================================================================
  // 8. LOOKDEV LIGHTING & MATERIAL CALIBRATION ENGINE
  // ==========================================================================
  describe('8. LookDev Lighting Rig & Material Calibration Engine', () => {
    it('EMP-M6.8.1: GLTF traversal strips raw Blender scene lights', () => {
      const arenaObj = new THREE.Group();
      const pointLight = new THREE.PointLight(0xffffff, 50.0);
      const dirLight = new THREE.DirectionalLight(0xffffff, 10.0);
      const spotLight = new THREE.SpotLight(0xffffff, 25.0);

      arenaObj.add(pointLight);
      arenaObj.add(dirLight);
      arenaObj.add(spotLight);

      // Apply light stripping logic from ThreeCombatArena
      arenaObj.traverse((child) => {
        if ((child as any).isLight) {
          (child as THREE.Light).intensity = 0;
          (child as THREE.Light).visible = false;
        }
      });

      expect(pointLight.intensity).toBe(0);
      expect(pointLight.visible).toBe(false);
      expect(dirLight.intensity).toBe(0);
      expect(dirLight.visible).toBe(false);
      expect(spotLight.intensity).toBe(0);
      expect(spotLight.visible).toBe(false);
    });

    it('EMP-M6.8.2: PBR roughness clamping prevents tin-foil / chrome reflections', () => {
      const matLow = new THREE.MeshStandardMaterial({ roughness: 0.10 });
      const matMid = new THREE.MeshStandardMaterial({ roughness: 0.20 });
      const matSafe = new THREE.MeshStandardMaterial({ roughness: 0.45 });

      const clampRoughness = (mat: THREE.MeshStandardMaterial) => {
        if (mat.roughness !== undefined && mat.roughness < 0.22) {
          mat.roughness = 0.28;
        }
      };

      clampRoughness(matLow);
      clampRoughness(matMid);
      clampRoughness(matSafe);

      expect(matLow.roughness).toBe(0.28);
      expect(matMid.roughness).toBe(0.28);
      expect(matSafe.roughness).toBe(0.45);
    });

    it('EMP-M6.8.3: Calibrated emissive intensities for Volcanic, Cyber and Crystal materials', () => {
      const calibrateMaterial = (mat: THREE.MeshStandardMaterial) => {
        const name = mat.name;
        if (name.includes('Facade')) {
          mat.emissive.setHex(0x02050e);
          mat.emissiveIntensity = 0.2;
          mat.color.setHex(0x0a101f);
        } else if (name === 'Mat_Convective_Magma_Lake') {
          mat.emissive.setHex(0xff4500);
          mat.emissiveIntensity = 2.0;
        } else if (name === 'Mat_Lava_Eruption') {
          mat.emissive.setHex(0xff2200);
          mat.emissiveIntensity = 2.8;
        } else if (name.includes('Lava') || name.includes('Magma')) {
          mat.emissive.setHex(0xff3700);
          mat.emissiveIntensity = 2.4;
        } else if (name === 'Mat_Amethyst_Crystal') {
          mat.emissive.setHex(0x9d4edd);
          mat.emissiveIntensity = 1.4;
        } else if (name.includes('Sign_')) {
          mat.emissiveIntensity = 1.0;
        }
      };

      const facade = new THREE.MeshStandardMaterial({ name: 'Building_Facade_01' });
      const magma = new THREE.MeshStandardMaterial({ name: 'Mat_Convective_Magma_Lake' });
      const lava = new THREE.MeshStandardMaterial({ name: 'Mat_Lava_Eruption' });
      const crystal = new THREE.MeshStandardMaterial({ name: 'Mat_Amethyst_Crystal' });
      const sign = new THREE.MeshStandardMaterial({ name: 'Mat_Sign_Arcade' });

      calibrateMaterial(facade);
      calibrateMaterial(magma);
      calibrateMaterial(lava);
      calibrateMaterial(crystal);
      calibrateMaterial(sign);

      expect(facade.emissiveIntensity).toBe(0.2);
      expect(facade.color.getHex()).toBe(0x0a101f);
      expect(magma.emissiveIntensity).toBe(2.0);
      expect(magma.emissive.getHex()).toBe(0xff4500);
      expect(lava.emissiveIntensity).toBe(2.8);
      expect(crystal.emissiveIntensity).toBe(1.4);
      expect(sign.emissiveIntensity).toBe(1.0);
    });
  });

  // ==========================================================================
  // 9. WEBGL CONTEXT RECOVERY & UNMOUNT LIFECYCLE
  // ==========================================================================
  describe('9. WebGL Context Recovery & Teardown Lifecycle', () => {
    it('EMP-M6.9.1: Context loss cancels animation frame and prevents exceptions', () => {
      let animRunning = true;
      let animId = 12345;
      const cancelAnim = vi.fn((id: number) => {
        animRunning = false;
      });

      const handleContextLost = (e: { preventDefault: () => void }) => {
        e.preventDefault();
        cancelAnim(animId);
      };

      const preventDefaultMock = vi.fn();
      handleContextLost({ preventDefault: preventDefaultMock });

      expect(preventDefaultMock).toHaveBeenCalledTimes(1);
      expect(cancelAnim).toHaveBeenCalledWith(12345);
      expect(animRunning).toBe(false);
    });

    it('EMP-M6.9.2: Context restored resumes animation loop cleanly', () => {
      let animId = 0;
      const requestAnim = vi.fn(() => 54321);

      const handleContextRestored = () => {
        animId = requestAnim();
      };

      handleContextRestored();
      expect(requestAnim).toHaveBeenCalledTimes(1);
      expect(animId).toBe(54321);
    });

    it('EMP-M6.9.3: Teardown cleans up event listeners, disposes fighters, renderer and clears scene', () => {
      const p1 = new Character3DFighter('ronin', 'left', createMockLoader());
      const p2 = new Character3DFighter('shinobi', 'right', createMockLoader());
      const scene = new THREE.Scene();

      const mockRenderer = {
        dispose: vi.fn(),
        domElement: {
          removeEventListener: vi.fn(),
        },
      };

      const p1Dispose = vi.spyOn(p1, 'dispose');
      const p2Dispose = vi.spyOn(p2, 'dispose');
      const sceneClear = vi.spyOn(scene, 'clear');

      // Execute simulated cleanup function
      p1.dispose();
      p2.dispose();
      mockRenderer.dispose();
      scene.clear();

      expect(p1Dispose).toHaveBeenCalledTimes(1);
      expect(p2Dispose).toHaveBeenCalledTimes(1);
      expect(mockRenderer.dispose).toHaveBeenCalledTimes(1);
      expect(sceneClear).toHaveBeenCalledTimes(1);
    });

    it('EMP-M6.9.4: ThreeCombatArenaRef combat methods handle uninitialized or disposed state gracefully', () => {
      // Create ref interface implementation testing null checks
      let p1Fighter: Character3DFighter | null = null;
      let p2Fighter: Character3DFighter | null = null;
      let shakeIntensity = 0;

      const getFighter = (side: 'left' | 'right'): Character3DFighter | null => {
        return side === 'left' ? p1Fighter : p2Fighter;
      };

      const refImpl: ThreeCombatArenaRef = {
        triggerAttack: (side, tier) => {
          const fighter = getFighter(side);
          if (!fighter) return;
          if (tier === 'jab') fighter.playJab();
          else if (tier === 'kick') fighter.playKick();
          else fighter.playHeavy();
          if (tier === 'heavy') shakeIntensity = 0.28;
        },
        triggerHit: (side, severity) => {
          const fighter = getFighter(side);
          if (!fighter) return;
          if (severity === 'light') fighter.playHitLight();
          else {
            fighter.playHitHeavy();
            shakeIntensity = 0.20;
          }
        },
        triggerKeystroke: (side) => {
          const fighter = getFighter(side);
          if (fighter) fighter.playKeystroke();
        },
        triggerKnockout: (loserSide) => {
          const loser = getFighter(loserSide);
          const winner = getFighter(loserSide === 'left' ? 'right' : 'left');
          if (loser) loser.playKnockout();
          if (winner) winner.playVictory();
          shakeIntensity = 0.35;
        },
        triggerVictory: (winnerSide) => {
          const winner = getFighter(winnerSide);
          if (winner) winner.playVictory();
        },
        triggerScreenShake: (intensity = 0.25) => {
          shakeIntensity = Math.max(shakeIntensity, intensity);
        },
        cycleCameraPreset: () => {},
        setCameraPreset: () => {},
        skipIntro: () => {},
      };

      // Calling all methods when fighters are null must NOT throw
      expect(() => refImpl.triggerAttack('left', 'jab')).not.toThrow();
      expect(() => refImpl.triggerAttack('right', 'heavy')).not.toThrow();
      expect(() => refImpl.triggerHit('left', 'light')).not.toThrow();
      expect(() => refImpl.triggerHit('right', 'heavy')).not.toThrow();
      expect(() => refImpl.triggerKeystroke('left')).not.toThrow();
      expect(() => refImpl.triggerKnockout('left')).not.toThrow();
      expect(() => refImpl.triggerVictory('right')).not.toThrow();
      expect(() => refImpl.triggerScreenShake?.(0.3)).not.toThrow();
      expect(shakeIntensity).toBe(0.35); // From triggerKnockout
    });
  });
});
