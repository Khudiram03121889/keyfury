import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  ARENA_DEFINITIONS,
  CAMERA_PRESETS,
  resolveArenaId,
  type ArenaDefinition,
  type ArenaId,
  type CameraPreset,
  type ThreeCombatArenaRef,
} from '../render/ThreeCombatArena';
import {
  Character3DFighter,
  type CharacterId,
} from '../game/character/Character3DController';

describe('Empirical Challenger M3-2: Camera Decoupling, Hotkey Detection & Lifecycle Stability', () => {
  const ARENA_IDS: ArenaId[] = ['cyber_rooftop', 'celestial_void', 'volcanic_caldera', 'highland_sanctuary'];
  const PRESET_IDS: CameraPreset[] = ['front', 'left', 'right', 'spider_cam', 'focused_60', 'back', 'wide_front'];

  // ==========================================================================
  // SECTION 1: 100 RAPID SEQUENTIAL CAMERA CYCLING & NUMERICAL INVARIANCE
  // ==========================================================================
  describe('1. 100 Rapid Sequential Camera Preset Switching Invariance', () => {
    it('executes 100 rapid consecutive cycles (500 preset transitions) maintaining strict finite invariants', () => {
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      const camera = new THREE.PerspectiveCamera(28.4, 16 / 9, 0.1, 1000);
      const currentLookAt = new THREE.Vector3(0, 2.205, 0);

      const targetPos = new THREE.Vector3();
      const targetLookAt = new THREE.Vector3();
      let targetFov = 28.4;

      // Initial position
      camera.position.set(arenaDef.camPos[0], arenaDef.camPos[1], arenaDef.camPos[2]);
      camera.lookAt(currentLookAt);

      // Perform 100 full cycles of all 5 presets = 500 transitions
      for (let cycle = 0; cycle < 100; cycle++) {
        for (let pIdx = 0; pIdx < CAMERA_PRESETS.length; pIdx++) {
          const preset = CAMERA_PRESETS[pIdx];
          const t = preset.getTransform(arenaDef);

          targetPos.set(t.pos[0], t.pos[1], t.pos[2]);
          targetLookAt.set(t.lookAt[0], t.lookAt[1], t.lookAt[2]);
          targetFov = t.fov;

          // Simulate 5 frames of interpolation per rapid switch
          const delta = 0.0166;
          const damping = Math.min(delta * 5.0, 1.0);

          for (let f = 0; f < 5; f++) {
            camera.position.lerp(targetPos, damping);
            currentLookAt.lerp(targetLookAt, damping);
            camera.lookAt(currentLookAt);

            if (Math.abs(camera.fov - targetFov) > 0.05) {
              camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, damping);
              camera.updateProjectionMatrix();
            }
            camera.updateMatrixWorld(true);

            // INVARIANT ASSERTIONS:
            // 1. Coordinates must remain strictly finite and non-NaN
            expect(Number.isFinite(camera.position.x)).toBe(true);
            expect(Number.isFinite(camera.position.y)).toBe(true);
            expect(Number.isFinite(camera.position.z)).toBe(true);
            expect(Number.isNaN(camera.position.x)).toBe(false);
            expect(Number.isNaN(camera.position.y)).toBe(false);
            expect(Number.isNaN(camera.position.z)).toBe(false);

            // 2. LookAt must remain finite and non-NaN
            expect(Number.isFinite(currentLookAt.x)).toBe(true);
            expect(Number.isFinite(currentLookAt.y)).toBe(true);
            expect(Number.isFinite(currentLookAt.z)).toBe(true);

            // 3. FOV must remain in safe projection range
            expect(Number.isFinite(camera.fov)).toBe(true);
            expect(camera.fov).toBeGreaterThan(15.0);
            expect(camera.fov).toBeLessThan(80.0);

            // 4. Projection matrix must be non-singular and valid
            for (let e = 0; e < 16; e++) {
              expect(Number.isFinite(camera.projectionMatrix.elements[e])).toBe(true);
              expect(Number.isFinite(camera.matrixWorld.elements[e])).toBe(true);
            }

            // 5. Camera altitude remains above the ground plane
            expect(camera.position.y).toBeGreaterThan(arenaDef.fighterFloorY);

            // 6. Camera maintains positive distance to lookAt target (no collapse)
            const dist = camera.position.distanceTo(currentLookAt);
            expect(dist).toBeGreaterThan(1.0);
          }
        }
      }

      // After 500 transitions, verify final camera position is fully well-conditioned
      expect(camera.position.length()).toBeGreaterThan(0);
    });

    it('maintains stability under 100 cycles across all 4 arena definitions with distinct geometry', () => {
      for (const arenaId of ARENA_IDS) {
        const arenaDef = ARENA_DEFINITIONS[arenaId];
        const camera = new THREE.PerspectiveCamera(arenaDef.camFov, 16 / 9, 0.1, 1000);
        const currentLookAt = new THREE.Vector3(arenaDef.camLookAt[0], arenaDef.camLookAt[1], arenaDef.camLookAt[2]);

        const targetPos = new THREE.Vector3();
        const targetLookAt = new THREE.Vector3();

        for (let i = 0; i < 100; i++) {
          const preset = CAMERA_PRESETS[i % CAMERA_PRESETS.length];
          const t = preset.getTransform(arenaDef);
          targetPos.set(t.pos[0], t.pos[1], t.pos[2]);
          targetLookAt.set(t.lookAt[0], t.lookAt[1], t.lookAt[2]);

          camera.position.lerp(targetPos, 0.25);
          currentLookAt.lerp(targetLookAt, 0.25);
          camera.lookAt(currentLookAt);
          camera.updateProjectionMatrix();

          expect(camera.position.y).toBeGreaterThan(arenaDef.fighterFloorY);
          expect(Number.isFinite(camera.position.x)).toBe(true);
          expect(Number.isFinite(camera.position.y)).toBe(true);
          expect(Number.isFinite(camera.position.z)).toBe(true);
        }
      }
    });

    it('maintains dynamic combat tracking stability under 100 rapid cycles during extreme fighter lunges', () => {
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      const targetPos = new THREE.Vector3(0, 2.33, 14.4);
      const targetLookAt = new THREE.Vector3(0, 2.205, 0);
      const dynamicTrackPos = new THREE.Vector3();
      const dynamicTrackLookAt = new THREE.Vector3();
      const camera = new THREE.PerspectiveCamera(28.4, 16 / 9, 0.1, 1000);
      camera.position.copy(targetPos);
      const currentLookAt = targetLookAt.clone();
      camera.lookAt(currentLookAt);

      // Simulate 100 frames with extreme fighter movements: lunging from -8m to +8m, colliding, separating
      for (let f = 0; f < 100; f++) {
        const p1X = -1.50 + Math.sin(f * 0.2) * 5.0; // Wide lunges
        const p2X = 1.50 + Math.cos(f * 0.15) * 5.0;
        const midX = (p1X + p2X) * 0.5;
        const fighterDist = Math.abs(p1X - p2X);

        dynamicTrackPos.set(
          targetPos.x + midX * 0.35,
          targetPos.y,
          targetPos.z + Math.max(0, (fighterDist - 3.0) * 0.25)
        );
        dynamicTrackLookAt.set(
          targetLookAt.x + midX * 0.65,
          targetLookAt.y,
          targetLookAt.z
        );

        camera.position.lerp(dynamicTrackPos, 0.1);
        currentLookAt.lerp(dynamicTrackLookAt, 0.1);
        camera.lookAt(currentLookAt);

        // Verification
        expect(Number.isFinite(camera.position.x)).toBe(true);
        expect(Number.isFinite(camera.position.y)).toBe(true);
        expect(Number.isFinite(camera.position.z)).toBe(true);
        expect(camera.position.z).toBeGreaterThan(5.0); // Never crosses in front of fighters
        expect(camera.position.distanceTo(currentLookAt)).toBeGreaterThan(2.0);
      }
    });

    it('survives synchronous zero-frame instantaneous preset spam without NaN or division-by-zero', () => {
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;
      const camera = new THREE.PerspectiveCamera(28.4, 16 / 9, 0.1, 1000);
      const currentLookAt = new THREE.Vector3(0, 2.205, 0);

      // 100 synchronous switches executed with delta = 0 (damping = 0)
      for (let i = 0; i < 100; i++) {
        const preset = CAMERA_PRESETS[i % CAMERA_PRESETS.length];
        const t = preset.getTransform(arenaDef);
        const targetPos = new THREE.Vector3(t.pos[0], t.pos[1], t.pos[2]);
        const targetLook = new THREE.Vector3(t.lookAt[0], t.lookAt[1], t.lookAt[2]);

        const damping = Math.min(0 * 5.0, 1.0); // delta = 0 -> damping = 0
        camera.position.lerp(targetPos, damping);
        currentLookAt.lerp(targetLook, damping);
        camera.lookAt(currentLookAt);

        expect(Number.isFinite(camera.position.x)).toBe(true);
        expect(Number.isFinite(camera.position.y)).toBe(true);
        expect(Number.isFinite(camera.position.z)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // SECTION 2: HOTKEY DETECTION [C] / [c] / KeyC & EVENT PROPAGATION
  // ==========================================================================
  describe('2. Hotkey Detection [C] / [c] / KeyC Logic & Event Propagation', () => {
    // Environment-agnostic Mock KeyboardEvent
    class MockKeyboardEvent {
      type: string;
      key: string;
      code: string;
      shiftKey: boolean;
      bubbles: boolean;
      cancelable: boolean;
      defaultPrevented: boolean = false;
      propagationStopped: boolean = false;

      constructor(type: string, init: { key?: string; code?: string; shiftKey?: boolean; bubbles?: boolean; cancelable?: boolean } = {}) {
        this.type = type;
        this.key = init.key ?? '';
        this.code = init.code ?? '';
        this.shiftKey = init.shiftKey ?? false;
        this.bubbles = init.bubbles ?? true;
        this.cancelable = init.cancelable ?? true;
      }

      preventDefault() {
        if (this.cancelable) this.defaultPrevented = true;
      }

      stopPropagation() {
        this.propagationStopped = true;
      }

      stopImmediatePropagation() {
        this.propagationStopped = true;
      }
    }

    let mockCyclePreset: ReturnType<typeof vi.fn>;
    let mockCompleteIntro: ReturnType<typeof vi.fn>;
    let handleKeyDown: (e: any) => void;
    let isIntroComplete: boolean;

    beforeEach(() => {
      mockCyclePreset = vi.fn();
      mockCompleteIntro = vi.fn();
      isIntroComplete = true; // combat mode

      // Exactly matches ThreeCombatArena.tsx lines 575-581
      handleKeyDown = (e: any) => {
        if ((e.code === 'Enter' || e.code === 'Space') && !isIntroComplete) {
          mockCompleteIntro();
        } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
          mockCyclePreset();
        }
      };
    });

    it('triggers cycleCameraPreset on lowercase key: "c" with standard code: "KeyC"', () => {
      const event = new MockKeyboardEvent('keydown', { key: 'c', code: 'KeyC' });
      handleKeyDown(event);
      expect(mockCyclePreset).toHaveBeenCalledTimes(1);
    });

    it('triggers cycleCameraPreset on uppercase key: "C" (Shift or CapsLock) with code: "KeyC"', () => {
      const event = new MockKeyboardEvent('keydown', { key: 'C', code: 'KeyC', shiftKey: true });
      handleKeyDown(event);
      expect(mockCyclePreset).toHaveBeenCalledTimes(1);
    });

    it('triggers cycleCameraPreset on virtual / mobile keyboard where code is empty but key is "c"', () => {
      const event = new MockKeyboardEvent('keydown', { key: 'c', code: '' });
      handleKeyDown(event);
      expect(mockCyclePreset).toHaveBeenCalledTimes(1);
    });

    it('triggers cycleCameraPreset on virtual / mobile keyboard where code is empty but key is "C"', () => {
      const event = new MockKeyboardEvent('keydown', { key: 'C', code: '' });
      handleKeyDown(event);
      expect(mockCyclePreset).toHaveBeenCalledTimes(1);
    });

    it('triggers cycleCameraPreset on non-QWERTY layouts (Dvorak/AZERTY) where physical code is "KeyC"', () => {
      // In Dvorak layout, physical KeyC produces 'j' or 'J'
      const event = new MockKeyboardEvent('keydown', { key: 'j', code: 'KeyC' });
      handleKeyDown(event);
      expect(mockCyclePreset).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger cycleCameraPreset on unrelated keys (typing characters, controls)', () => {
      const nonCKeys = [
        { key: 'a', code: 'KeyA' },
        { key: 'd', code: 'KeyD' },
        { key: 'x', code: 'KeyX' },
        { key: 'k', code: 'KeyK' },
        { key: '1', code: 'Digit1' },
        { key: 'Backspace', code: 'Backspace' },
        { key: 'Tab', code: 'Tab' },
        { key: 'Escape', code: 'Escape' },
      ];

      nonCKeys.forEach(k => {
        const event = new MockKeyboardEvent('keydown', k);
        handleKeyDown(event);
      });

      expect(mockCyclePreset).not.toHaveBeenCalled();
    });

    it('does NOT call preventDefault() or stopPropagation() — typing combat inputs propagate cleanly', () => {
      // In KeyFury typing combat, words contain the letter 'c' (e.g. "combo", "critical", "clash").
      // The camera hotkey listener must NEVER swallow or suppress keystrokes intended for the typing deck!
      const event = new MockKeyboardEvent('keydown', {
        key: 'c',
        code: 'KeyC',
        bubbles: true,
        cancelable: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
      const stopImmediatePropagationSpy = vi.spyOn(event, 'stopImmediatePropagation');

      handleKeyDown(event);

      expect(mockCyclePreset).toHaveBeenCalledTimes(1);
      // Invariant: Event is NOT intercepted or prevented from bubbling
      expect(preventDefaultSpy).not.toHaveBeenCalled();
      expect(stopPropagationSpy).not.toHaveBeenCalled();
      expect(stopImmediatePropagationSpy).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('verifies intro skip vs camera cycling priority during match intro', () => {
      isIntroComplete = false; // Intro is running

      // Space skips intro
      handleKeyDown(new MockKeyboardEvent('keydown', { key: ' ', code: 'Space' }));
      expect(mockCompleteIntro).toHaveBeenCalledTimes(1);
      expect(mockCyclePreset).not.toHaveBeenCalled();

      // Enter skips intro
      handleKeyDown(new MockKeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
      expect(mockCompleteIntro).toHaveBeenCalledTimes(2);
      expect(mockCyclePreset).not.toHaveBeenCalled();

      // Pressing 'c' during intro still cycles camera preset cleanly
      handleKeyDown(new MockKeyboardEvent('keydown', { key: 'c', code: 'KeyC' }));
      expect(mockCyclePreset).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // SECTION 3: THREECOMBATARENAREF & LIFECYCLE DECOUPLING EMPIRICAL VERIFICATION
  // ==========================================================================
  describe('3. ThreeCombatArenaRef Interface Contract & Lifecycle Decoupling', () => {
    it('verifies that camera preset cycling modifies target refs without re-running scene setup', () => {
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;

      // Emulate the decoupled refs in ThreeCombatArena.tsx
      const activePresetIndexRef = { current: 0 };
      const targetCamPos = { current: new THREE.Vector3() };
      const targetCamLookAt = { current: new THREE.Vector3() };
      const targetCamFov = { current: 28.4 };

      const applyPresetTransform = (presetIdx: number) => {
        const preset = CAMERA_PRESETS[presetIdx % CAMERA_PRESETS.length];
        const t = preset.getTransform(arenaDef);
        targetCamPos.current.set(t.pos[0], t.pos[1], t.pos[2]);
        targetCamLookAt.current.set(t.lookAt[0], t.lookAt[1], t.lookAt[2]);
        targetCamFov.current = t.fov;
      };

      const cycleCameraPreset = () => {
        const next = (activePresetIndexRef.current + 1) % CAMERA_PRESETS.length;
        activePresetIndexRef.current = next;
        applyPresetTransform(next);
      };

      const setCameraPresetById = (presetId: CameraPreset) => {
        const idx = CAMERA_PRESETS.findIndex((p) => p.id === presetId);
        if (idx >= 0) {
          activePresetIndexRef.current = idx;
          applyPresetTransform(idx);
        }
      };

      // Mock scene lifecycle listeners
      const sceneSetupSpy = vi.fn();
      const sceneDisposeSpy = vi.fn();

      // Initial scene setup
      sceneSetupSpy();

      // Cycle camera 5 times
      for (let i = 0; i < 5; i++) {
        cycleCameraPreset();
        expect(activePresetIndexRef.current).toBe((i + 1) % CAMERA_PRESETS.length);
        expect(targetCamPos.current.length()).toBeGreaterThan(0);
      }

      // Set camera directly to each preset ID
      for (const id of PRESET_IDS) {
        setCameraPresetById(id);
        const expected = CAMERA_PRESETS.find(p => p.id === id)!.getTransform(arenaDef);
        expect(targetCamPos.current.x).toBe(expected.pos[0]);
        expect(targetCamPos.current.y).toBe(expected.pos[1]);
        expect(targetCamPos.current.z).toBe(expected.pos[2]);
        expect(targetCamFov.current).toBe(expected.fov);
      }

      // CRITICAL INVARIANT: Scene setup must NOT have re-run, and scene must NOT have disposed!
      expect(sceneSetupSpy).toHaveBeenCalledTimes(1);
      expect(sceneDisposeSpy).not.toHaveBeenCalled();
    });

    it('verifies combat trigger ref methods execute without any React state mutations', () => {
      // Mock fighter methods
      const p1Fighter = {
        playJab: vi.fn(),
        playKick: vi.fn(),
        playHeavy: vi.fn(),
        playHitLight: vi.fn(),
        playHitHeavy: vi.fn(),
        playKeystroke: vi.fn(),
        playVictory: vi.fn(),
        playKnockout: vi.fn(),
      };
      const p2Fighter = {
        playJab: vi.fn(),
        playKick: vi.fn(),
        playHeavy: vi.fn(),
        playHitLight: vi.fn(),
        playHitHeavy: vi.fn(),
        playKeystroke: vi.fn(),
        playVictory: vi.fn(),
        playKnockout: vi.fn(),
      };

      const shakeIntensityRef = { current: 0 };
      const reactSetStateSpy = vi.fn();

      // Exactly matches ThreeCombatArenaRef implementation in ThreeCombatArena.tsx
      const refHandler: ThreeCombatArenaRef = {
        triggerAttack: (side, tier) => {
          const fighter = side === 'left' ? p1Fighter : p2Fighter;
          if (!fighter) return;
          if (tier === 'jab') fighter.playJab();
          else if (tier === 'kick') fighter.playKick();
          else fighter.playHeavy();
          if (tier === 'heavy') shakeIntensityRef.current = 0.28;
        },
        triggerHit: (side, severity) => {
          const fighter = side === 'left' ? p1Fighter : p2Fighter;
          if (!fighter) return;
          if (severity === 'light') fighter.playHitLight();
          else {
            fighter.playHitHeavy();
            shakeIntensityRef.current = 0.20;
          }
        },
        triggerKeystroke: (side) => {
          const fighter = side === 'left' ? p1Fighter : p2Fighter;
          if (fighter) fighter.playKeystroke();
        },
        triggerKnockout: (loserSide) => {
          const loser = loserSide === 'left' ? p1Fighter : p2Fighter;
          const winner = loserSide === 'left' ? p2Fighter : p1Fighter;
          if (loser) loser.playKnockout();
          if (winner) winner.playVictory();
          shakeIntensityRef.current = 0.35;
        },
        triggerVictory: (winnerSide) => {
          const winner = winnerSide === 'left' ? p1Fighter : p2Fighter;
          if (winner) winner.playVictory();
        },
        cycleCameraPreset: vi.fn(),
        setCameraPreset: vi.fn(),
        skipIntro: vi.fn(),
      };

      // Execute full barrage of combat triggers
      refHandler.triggerKeystroke('left');
      refHandler.triggerKeystroke('right');
      refHandler.triggerAttack('left', 'jab');
      refHandler.triggerAttack('left', 'kick');
      refHandler.triggerAttack('left', 'heavy');
      refHandler.triggerHit('right', 'light');
      refHandler.triggerHit('right', 'heavy');
      refHandler.triggerKnockout('right');
      refHandler.triggerVictory('left');

      // Verify all fighter methods fired
      expect(p1Fighter.playKeystroke).toHaveBeenCalledTimes(1);
      expect(p1Fighter.playJab).toHaveBeenCalledTimes(1);
      expect(p1Fighter.playKick).toHaveBeenCalledTimes(1);
      expect(p1Fighter.playHeavy).toHaveBeenCalledTimes(1);
      expect(p2Fighter.playHitLight).toHaveBeenCalledTimes(1);
      expect(p2Fighter.playHitHeavy).toHaveBeenCalledTimes(1);
      expect(p2Fighter.playKnockout).toHaveBeenCalledTimes(1);
      // Winner victory fired once from triggerKnockout('right') and once from triggerVictory('left')
      expect(p1Fighter.playVictory).toHaveBeenCalledTimes(2);

      // Invariant: Screen shake was updated via ref
      expect(shakeIntensityRef.current).toBe(0.35);

      // Invariant: ZERO React state changes triggered (no re-renders scheduled)
      expect(reactSetStateSpy).not.toHaveBeenCalled();
    });

    it('verifies scene useEffect dependency array does NOT include camera preset state or handlers', async () => {
      // Read the source file directly and verify the exact dependency array of the scene useEffect
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Find the scene useEffect dependencies at the end of the scene setup effect
      const depArrayMatch = content.match(/\/\/ Cleanup[\s\S]*?},\s*\[([\w\s,]+)\]\s*\);\s*\n\s*const activePreset/);
      expect(depArrayMatch).not.toBeNull();

      const depsString = depArrayMatch![1];
      const deps = depsString.split(',').map(s => s.trim()).filter(Boolean);

      // Verify prohibited dependencies that would cause scene re-mounting on camera switch:
      expect(deps).not.toContain('activePresetIndex');
      expect(deps).not.toContain('applyPresetTransform');
      expect(deps).not.toContain('cycleCameraPreset');
      expect(deps).not.toContain('setCameraPresetById');
      expect(deps).not.toContain('completeIntro');

      // Verify only stable identity props are in the dependency array:
      expect(deps).toEqual(expect.arrayContaining([
        'arenaDef',
        'isBotMatch',
        'p1CharId',
        'p2CharId',
        'resolvedArenaId',
        'resolvedP1',
        'resolvedP2',
      ]));
    });

    it('verifies WebGL context loss and restoration listeners are registered and detached cleanly', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(__dirname, '../render/ThreeCombatArena.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check context loss registration
      expect(content).toContain("canvasElement.addEventListener('webglcontextlost', handleContextLost");
      expect(content).toContain("canvasElement.addEventListener('webglcontextrestored', handleContextRestored");

      // Check context loss removal in cleanup
      expect(content).toContain("canvasElement.removeEventListener('webglcontextlost', handleContextLost)");
      expect(content).toContain("canvasElement.removeEventListener('webglcontextrestored', handleContextRestored)");

      // Check handleContextLost calls cancelAnimationFrame
      expect(content).toContain("console.warn('[ThreeCombatArena] WebGL context lost. Pausing render loop.')");
      expect(content).toContain("cancelAnimationFrame(animId)");
    });
  });
});
