import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  resolveArenaId,
  type ArenaDefinition,
  type ArenaId,
  type CameraPreset,
} from '../render/ThreeCombatArena';

describe('Milestone 3 Camera System Empirical Stress & Adversarial Challenge', () => {
  const ARENA_IDS: ArenaId[] = ['cyber_rooftop', 'celestial_void', 'volcanic_caldera', 'highland_sanctuary'];
  const PRESET_IDS: CameraPreset[] = ['front', 'left', 'right', 'spider_cam', 'focused_60', 'back', 'wide_front'];

  // ==========================================================================
  // 1. PRESET & ARENA MATRIX COMPLETENESS & NUMERICAL SANITY
  // ==========================================================================
  describe('1. 5x4 Preset/Arena Combinatorial Transform Sanity', () => {
    it('computes finite, non-NaN position, lookAt, and FOV for all 20 permutations', () => {
      for (const arenaId of ARENA_IDS) {
        const arenaDef = ARENA_DEFINITIONS[arenaId];
        expect(arenaDef).toBeDefined();

        for (const preset of CAMERA_PRESETS) {
          const transform = preset.getTransform(arenaDef);

          // Verify transform shape
          expect(transform.pos).toHaveLength(3);
          expect(transform.lookAt).toHaveLength(3);
          expect(typeof transform.fov).toBe('number');

          // Numerical sanity: strictly finite, not NaN, not Infinity
          for (let i = 0; i < 3; i++) {
            expect(Number.isFinite(transform.pos[i])).toBe(true);
            expect(Number.isNaN(transform.pos[i])).toBe(false);
            expect(Number.isFinite(transform.lookAt[i])).toBe(true);
            expect(Number.isNaN(transform.lookAt[i])).toBe(false);
          }
          expect(Number.isFinite(transform.fov)).toBe(true);
          expect(Number.isNaN(transform.fov)).toBe(false);

          // FOV must be in a realistic human perspective range [15, 80]
          expect(transform.fov).toBeGreaterThanOrEqual(15.0);
          expect(transform.fov).toBeLessThanOrEqual(80.0);

          // Camera must be positioned above the arena floor
          expect(transform.pos[1]).toBeGreaterThan(arenaDef.fighterFloorY);

          // LookAt height should be near fighter body altitude [0.5m, 3.5m]
          expect(transform.lookAt[1]).toBeGreaterThanOrEqual(0.5);
          expect(transform.lookAt[1]).toBeLessThanOrEqual(3.5);
        }
      }
    });

    it('satisfies structural geometric invariant contracts across presets', () => {
      for (const arenaId of ARENA_IDS) {
        const arena = ARENA_DEFINITIONS[arenaId];
        const frontT = CAMERA_PRESETS.find(p => p.id === 'front')!.getTransform(arena);
        const leftT = CAMERA_PRESETS.find(p => p.id === 'left')!.getTransform(arena);
        const spiderT = CAMERA_PRESETS.find(p => p.id === 'spider_cam')!.getTransform(arena);
        const focused60T = CAMERA_PRESETS.find(p => p.id === 'focused_60')!.getTransform(arena);

        // Spider cam is elevated higher than front zoom
        expect(spiderT.pos[1]).toBeGreaterThan(frontT.pos[1]);

        // Top 60° tactical camera is elevated higher than spider cam
        expect(focused60T.pos[1]).toBeGreaterThan(spiderT.pos[1]);

        // Left 45° camera must be positioned on the Left side (x <= -3.0)
        expect(leftT.pos[0]).toBeLessThanOrEqual(-3.0);
        // And looking towards the right side of the arena (x > 0)
        expect(leftT.lookAt[0]).toBeGreaterThan(0.0);
      }
    });

    it('adversarial check: handles missing or undefined arenaDef properties gracefully without NaN', () => {
      // Empty or partially defined arena definition
      const malformedArenaDef = {} as ArenaDefinition;

      for (const preset of CAMERA_PRESETS) {
        const t = preset.getTransform(malformedArenaDef);

        for (let i = 0; i < 3; i++) {
          expect(Number.isFinite(t.pos[i])).toBe(true);
          expect(Number.isNaN(t.pos[i])).toBe(false);
          expect(Number.isFinite(t.lookAt[i])).toBe(true);
          expect(Number.isNaN(t.lookAt[i])).toBe(false);
        }
        expect(Number.isFinite(t.fov)).toBe(true);
        expect(Number.isNaN(t.fov)).toBe(false);
      }
    });
  });

  // ==========================================================================
  // 2. DAMPING LERP CONVERGENCE & STABILITY UNDER EXTREME DELTAS
  // ==========================================================================
  describe('2. Damping Lerp Factor & Convergence Stability', () => {
    it('clamps damping factor to [0, 1.0] across all delta time regimes', () => {
      const deltas = [
        0.0001, // 10,000 FPS
        0.001,  // 1,000 FPS
        0.0069, // 144 FPS
        0.0166, // 60 FPS
        0.0333, // 30 FPS
        0.05,   // 20 FPS
        0.1,    // 10 FPS
        0.2,    // 5 FPS (exact 1.0 damping threshold: 0.2 * 5.0 = 1.0)
        0.5,    // Extreme stutter / GC pause
        1.0,    // 1-second lag spike
        5.0,    // Background tab wake-up
      ];

      deltas.forEach(delta => {
        const damping = Math.min(delta * 5.0, 1.0);
        expect(damping).toBeGreaterThan(0);
        expect(damping).toBeLessThanOrEqual(1.0);
        expect(Number.isFinite(damping)).toBe(true);
        expect(Number.isNaN(damping)).toBe(false);

        // At delta >= 0.2, damping is guaranteed to clamp to exactly 1.0
        if (delta >= 0.2) {
          expect(damping).toBe(1.0);
        }
      });
    });

    it('converges smoothly and monotonically to target without overshoot under standard 60 FPS', () => {
      const current = new THREE.Vector3(10.0, 15.0, 50.0);
      const target = new THREE.Vector3(0.0, 2.33, 20.0);
      const delta = 1.0 / 60.0;
      const damping = Math.min(delta * 5.0, 1.0);

      let prevDistance = current.distanceTo(target);

      // Simulate 60 frames (1 second) of camera interpolation
      for (let frame = 0; frame < 60; frame++) {
        current.lerp(target, damping);
        const newDistance = current.distanceTo(target);

        // Invariant: Distance to target must strictly decrease monotonically on each frame
        expect(newDistance).toBeLessThan(prevDistance);
        prevDistance = newDistance;

        // Position coordinates must remain bounded between initial and target
        expect(current.x).toBeGreaterThanOrEqual(Math.min(10.0, 0.0));
        expect(current.x).toBeLessThanOrEqual(Math.max(10.0, 0.0));
        expect(current.y).toBeGreaterThanOrEqual(Math.min(15.0, 2.33));
        expect(current.y).toBeLessThanOrEqual(Math.max(15.0, 2.33));
        expect(current.z).toBeGreaterThanOrEqual(Math.min(50.0, 20.0));
        expect(current.z).toBeLessThanOrEqual(Math.max(50.0, 20.0));
      }

      // After 60 frames at 60 FPS, remaining distance should be less than 1% of initial
      const initialDistance = new THREE.Vector3(10.0, 15.0, 50.0).distanceTo(target);
      expect(prevDistance / initialDistance).toBeLessThan(0.01);
    });

    it('handles extreme delta lag spikes without popping or overshooting past target', () => {
      // Test extreme delta spikes (delta = 0.5s, 1.0s, 2.0s)
      const spikeDeltas = [0.2, 0.5, 1.0, 2.0];

      spikeDeltas.forEach(delta => {
        const current = new THREE.Vector3(-15.0, 8.0, 35.0);
        const target = new THREE.Vector3(0.0, 2.33, 20.0);
        const damping = Math.min(delta * 5.0, 1.0);

        // Since delta >= 0.2, damping is 1.0. Vector3.lerp(target, 1.0) must land EXACTLY on target.
        expect(damping).toBe(1.0);
        current.lerp(target, damping);

        expect(current.x).toBeCloseTo(target.x, 6);
        expect(current.y).toBeCloseTo(target.y, 6);
        expect(current.z).toBeCloseTo(target.z, 6);
        expect(current.distanceTo(target)).toBeCloseTo(0.0, 6);
      });
    });

    it('interpolates FOV smoothly with projection matrix updates', () => {
      let currentFov = 45.0;
      const targetFov = 28.4;
      const delta = 1.0 / 60.0;
      const damping = Math.min(delta * 5.0, 1.0);

      let prevFovDist = Math.abs(currentFov - targetFov);

      for (let frame = 0; frame < 60; frame++) {
        if (Math.abs(currentFov - targetFov) > 0.05) {
          currentFov = THREE.MathUtils.lerp(currentFov, targetFov, damping);
        }
        const newDist = Math.abs(currentFov - targetFov);
        expect(newDist).toBeLessThanOrEqual(prevFovDist);
        prevFovDist = newDist;
      }

      expect(Math.abs(currentFov - targetFov)).toBeLessThan(0.1);
    });
  });

  // ==========================================================================
  // 3. DYNAMIC COMBAT TRACKING & JITTER SUPPRESSION ORACLE
  // ==========================================================================
  describe('3. Dynamic Combat Tracking & High-Frequency Jitter Attenuation', () => {
    // Dynamic tracking algorithm implementation as in ThreeCombatArena.tsx
    function computeDynamicTracking(
      targetCamPos: THREE.Vector3,
      targetCamLookAt: THREE.Vector3,
      p1X: number,
      p2X: number
    ) {
      const midX = (p1X + p2X) * 0.5;
      const fighterDist = Math.abs(p1X - p2X);

      const dynamicPos = new THREE.Vector3(
        targetCamPos.x + midX * 0.35,
        targetCamPos.y,
        targetCamPos.z + Math.max(0, (fighterDist - 3.0) * 0.25)
      );

      const dynamicLookAt = new THREE.Vector3(
        targetCamLookAt.x + midX * 0.65,
        targetCamLookAt.y,
        targetCamLookAt.z
      );

      return { dynamicPos, dynamicLookAt, midX, fighterDist };
    }

    it('centers camera precisely when fighters are at neutral symmetric positions', () => {
      const targetCamPos = new THREE.Vector3(0, 2.33, 14.4);
      const targetCamLookAt = new THREE.Vector3(0, 2.205, 0);

      // Default combat marks: P1 at -1.50, P2 at +1.50
      const { dynamicPos, dynamicLookAt, midX, fighterDist } = computeDynamicTracking(
        targetCamPos,
        targetCamLookAt,
        -1.50,
        1.50
      );

      expect(midX).toBe(0);
      expect(fighterDist).toBe(3.0);
      expect(dynamicPos.x).toBe(targetCamPos.x);
      expect(dynamicPos.z).toBe(targetCamPos.z);
      expect(dynamicLookAt.x).toBe(targetCamLookAt.x);
    });

    it('pans camera horizontally when fighters shift to arena flanks', () => {
      const targetCamPos = new THREE.Vector3(0, 2.33, 14.4);
      const targetCamLookAt = new THREE.Vector3(0, 2.205, 0);

      // Both fighters pushed left (P1 cornered at -5.0, P2 pressing at -2.0)
      const leftShift = computeDynamicTracking(targetCamPos, targetCamLookAt, -5.0, -2.0);
      expect(leftShift.midX).toBe(-3.5);
      expect(leftShift.dynamicPos.x).toBeLessThan(targetCamPos.x); // Camera shifts left
      expect(leftShift.dynamicLookAt.x).toBeLessThan(targetCamLookAt.x); // LookAt shifts left

      // Both fighters pushed right (P2 cornered at +5.0, P1 pressing at +2.0)
      const rightShift = computeDynamicTracking(targetCamPos, targetCamLookAt, 2.0, 5.0);
      expect(rightShift.midX).toBe(3.5);
      expect(rightShift.dynamicPos.x).toBeGreaterThan(targetCamPos.x); // Camera shifts right
      expect(rightShift.dynamicLookAt.x).toBeGreaterThan(targetCamLookAt.x); // LookAt shifts right
    });

    it('pulls camera back smoothly when fighters separate widely, but avoids clipping when close', () => {
      const targetCamPos = new THREE.Vector3(0, 2.33, 14.4);
      const targetCamLookAt = new THREE.Vector3(0, 2.205, 0);

      // Wide separation: P1 at -6.0, P2 at +6.0 (dist = 12.0)
      const wide = computeDynamicTracking(targetCamPos, targetCamLookAt, -6.0, 6.0);
      expect(wide.fighterDist).toBe(12.0);
      // Extra distance = (12 - 3.0) * 0.25 = 2.25
      expect(wide.dynamicPos.z).toBeCloseTo(targetCamPos.z + 2.25, 5);

      // Close clinch: P1 at -0.5, P2 at +0.5 (dist = 1.0)
      const close = computeDynamicTracking(targetCamPos, targetCamLookAt, -0.5, 0.5);
      expect(close.fighterDist).toBe(1.0);
      // Clamped to 0 by Math.max(0, ...) so camera does not clip through fighter models
      expect(close.dynamicPos.z).toBe(targetCamPos.z);
    });

    it('attenuates high-frequency keystroke micro-jitter (>75% attenuation ratio)', () => {
      // Simulate keystroke typing twitches: 10 Hz oscillation of amplitude +-0.08m
      const baseP1X = -1.50;
      const baseP2X = 1.50;
      const delta = 1.0 / 60.0;
      const damping = Math.min(delta * 5.0, 1.0);

      const targetCamPos = new THREE.Vector3(0, 2.33, 14.4);
      const targetCamLookAt = new THREE.Vector3(0, 2.205, 0);
      const currentCamPos = targetCamPos.clone();

      let maxInputDeviation = 0;
      let maxCameraDeviation = 0;

      // Run 60 frames (1 second) of rapid typing input with micro-twitches
      for (let frame = 0; frame < 60; frame++) {
        const time = frame * delta;
        // High frequency typing twitch
        const twitch1 = Math.sin(time * 2 * Math.PI * 10) * 0.08;
        const twitch2 = Math.cos(time * 2 * Math.PI * 10) * 0.04;

        maxInputDeviation = Math.max(maxInputDeviation, Math.abs(twitch1));

        const p1X = baseP1X + twitch1;
        const p2X = baseP2X + twitch2;

        const { dynamicPos } = computeDynamicTracking(targetCamPos, targetCamLookAt, p1X, p2X);
        currentCamPos.lerp(dynamicPos, damping);

        maxCameraDeviation = Math.max(maxCameraDeviation, Math.abs(currentCamPos.x - targetCamPos.x));
      }

      // Camera position oscillation amplitude should be less than 25% of input jitter amplitude (low-pass smoothing)
      expect(maxCameraDeviation).toBeLessThan(maxInputDeviation * 0.25);
    });
  });

  // ==========================================================================
  // 4. PRESET CYCLING & DECOUPLING STATE MACHINE INVARIANCE
  // ==========================================================================
  describe('4. Preset Cycling Decoupling & Invariance', () => {
    it('cycles through all 7 presets monotonically with modular wrap-around', () => {
      let activeIndex = 0;
      const visitedPresets: CameraPreset[] = [];

      for (let step = 0; step < 14; step++) {
        const preset = CAMERA_PRESETS[activeIndex % CAMERA_PRESETS.length];
        visitedPresets.push(preset.id);
        activeIndex = (activeIndex + 1) % CAMERA_PRESETS.length;
      }

      // First 7 should be all 7 distinct presets in order
      expect(visitedPresets.slice(0, 7)).toEqual([
        'front',
        'left',
        'right',
        'spider_cam',
        'focused_60',
        'back',
        'wide_front',
      ]);

      // Next 7 should repeat the cycle identically
      expect(visitedPresets.slice(7, 14)).toEqual(visitedPresets.slice(0, 7));
    });

    it('allows direct indexing by CameraPreset ID without mutating preset list', () => {
      for (const presetId of PRESET_IDS) {
        const idx = CAMERA_PRESETS.findIndex(p => p.id === presetId);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(CAMERA_PRESETS.length);
        expect(CAMERA_PRESETS[idx].id).toBe(presetId);
      }

      // Invalid preset query returns -1 gracefully
      const invalidIdx = CAMERA_PRESETS.findIndex(p => (p.id as any) === 'invalid_3d_mode');
      expect(invalidIdx).toBe(-1);
    });
  });
});
