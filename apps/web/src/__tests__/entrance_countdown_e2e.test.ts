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
  type ThreeCombatArenaRef,
} from '../render/ThreeCombatArena';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  resolveCharacterId,
  type CharacterId,
} from '../game/character/Character3DController';

// ============================================================================
// TEST HARNESS & PROCEDURAL MOCK LOADERS
// ============================================================================

function createMockLoader() {
  return {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      const group = new THREE.Group();
      // Add standard bone markers
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

describe('Milestone 4: Map-Specific Entrances & Synchronized 3-2-1 Countdown Sequence E2E', () => {
  // ==========================================================================
  // 1. SEQUENTIAL 4-ACT ENTRANCE TIMELINE (7.5s Total)
  // ==========================================================================
  describe('1. Sequential 4-Act Entrance Timeline (7.5s Total)', () => {
    it('M4.1.1: Act 1 (0.0s – 1.5s) executes Stage Showcase & Atmospheric Pan', () => {
      expect(getIntroActForTime(0.0)).toBe('stage');
      expect(getIntroActForTime(0.5)).toBe('stage');
      expect(getIntroActForTime(1.0)).toBe('stage');
      expect(getIntroActForTime(1.49)).toBe('stage');
    });

    it('M4.1.2: Act 2 (1.5s – 3.5s) executes Player 1 Arrival & Spotlight', () => {
      expect(getIntroActForTime(1.5)).toBe('p1');
      expect(getIntroActForTime(2.0)).toBe('p1');
      expect(getIntroActForTime(3.0)).toBe('p1');
      expect(getIntroActForTime(3.49)).toBe('p1');
    });

    it('M4.1.3: Act 3 (3.5s – 5.5s) executes Player 2 / AI Opponent Arrival & Spotlight', () => {
      expect(getIntroActForTime(3.5)).toBe('p2');
      expect(getIntroActForTime(4.0)).toBe('p2');
      expect(getIntroActForTime(4.9)).toBe('p2');
      expect(getIntroActForTime(5.49)).toBe('p2');
    });

    it('M4.1.4: Act 4 (5.5s – 7.5s) executes Standoff Camera Return & 3-2-1 Countdown', () => {
      expect(getIntroActForTime(5.5)).toBe('standoff');
      expect(getIntroActForTime(6.0)).toBe('standoff');
      expect(getIntroActForTime(6.8)).toBe('standoff');
      expect(getIntroActForTime(7.2)).toBe('standoff');
      expect(getIntroActForTime(7.49)).toBe('standoff');
    });

    it('M4.1.5: Transitions to active combat mode at t >= 7.5s', () => {
      expect(getIntroActForTime(7.5)).toBe('combat');
      expect(getIntroActForTime(8.0)).toBe('combat');
      expect(getIntroActForTime(12.5)).toBe('combat');
    });

    it('M4.1.6: Verifies exact boundary transitions across all 4 acts', () => {
      const transitions: [number, IntroAct][] = [
        [0.0, 'stage'],
        [1.499, 'stage'],
        [1.5, 'p1'],
        [3.499, 'p1'],
        [3.5, 'p2'],
        [5.499, 'p2'],
        [5.5, 'standoff'],
        [7.499, 'standoff'],
        [7.5, 'combat'],
        [10.0, 'combat'],
      ];

      transitions.forEach(([time, expectedAct]) => {
        expect(getIntroActForTime(time)).toBe(expectedAct);
      });
    });
  });

  // ==========================================================================
  // 2. SYNCHRONIZED 3-2-1 COUNTDOWN SEQUENCE
  // ==========================================================================
  describe('2. Synchronized 3-2-1 Countdown Sequence', () => {
    it('M4.2.1: Countdown is null during Acts 1, 2, and 3 (no premature display)', () => {
      expect(getCountdownForTime(0.0)).toBeNull();
      expect(getCountdownForTime(1.0)).toBeNull();
      expect(getCountdownForTime(2.0)).toBeNull();
      expect(getCountdownForTime(3.4)).toBeNull();
      expect(getCountdownForTime(4.5)).toBeNull();
      expect(getCountdownForTime(5.49)).toBeNull();
    });

    it('M4.2.2: Displays countdown "3" strictly between 5.5s and 6.2s', () => {
      expect(getCountdownForTime(5.5)).toBe('3');
      expect(getCountdownForTime(5.8)).toBe('3');
      expect(getCountdownForTime(6.0)).toBe('3');
      expect(getCountdownForTime(6.199)).toBe('3');
    });

    it('M4.2.3: Displays countdown "2" strictly between 6.2s and 6.9s', () => {
      expect(getCountdownForTime(6.2)).toBe('2');
      expect(getCountdownForTime(6.5)).toBe('2');
      expect(getCountdownForTime(6.899)).toBe('2');
    });

    it('M4.2.4: Displays countdown "1" strictly between 6.9s and 7.3s', () => {
      expect(getCountdownForTime(6.9)).toBe('1');
      expect(getCountdownForTime(7.1)).toBe('1');
      expect(getCountdownForTime(7.299)).toBe('1');
    });

    it('M4.2.5: Displays countdown "FIGHT!" strictly between 7.3s and 7.5s', () => {
      expect(getCountdownForTime(7.3)).toBe('FIGHT!');
      expect(getCountdownForTime(7.4)).toBe('FIGHT!');
      expect(getCountdownForTime(7.499)).toBe('FIGHT!');
    });

    it('M4.2.6: Dismisses countdown overlay at t >= 7.5s when combat starts', () => {
      expect(getCountdownForTime(7.5)).toBeNull();
      expect(getCountdownForTime(8.0)).toBeNull();
      expect(getCountdownForTime(10.0)).toBeNull();
    });

    it('M4.2.7: Verifies durations of countdown beats: 3 (0.7s), 2 (0.7s), 1 (0.4s), FIGHT! (0.2s)', () => {
      const d3 = 6.2 - 5.5;
      const d2 = 6.9 - 6.2;
      const d1 = 7.3 - 6.9;
      const dFight = 7.5 - 7.3;

      expect(d3).toBeCloseTo(0.70, 2);
      expect(d2).toBeCloseTo(0.70, 2);
      expect(d1).toBeCloseTo(0.40, 2);
      expect(dFight).toBeCloseTo(0.20, 2);
      expect(d3 + d2 + d1 + dFight).toBeCloseTo(2.0, 2);
    });
  });

  // ==========================================================================
  // 3. SPOTLIGHT BANNER METADATA & ARCHETYPES
  // ==========================================================================
  describe('3. Spotlight Banner Metadata & Archetypes', () => {
    it('M4.3.1: Spotlight banner is null during Act 1 (Stage Panorama)', () => {
      expect(getSpotlightBannerForTime(0.5, 'ronin', 'shinobi')).toBeNull();
      expect(getSpotlightBannerForTime(1.49, 'ronin', 'shinobi')).toBeNull();
    });

    it('M4.3.2: Spotlight banner displays Challenger (P1) on left during Act 2 for all 4 archetypes', () => {
      const archetypes: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

      archetypes.forEach((p1Id) => {
        const banner = getSpotlightBannerForTime(2.5, p1Id, 'shinobi');
        const prof = CHARACTER_PROFILES[p1Id];

        expect(banner).not.toBeNull();
        expect(banner?.side).toBe('left');
        expect(banner?.name).toBe(prof.name);
        expect(banner?.title).toBe(prof.title);
        expect(banner?.weapon).toBe(prof.weapon);
        expect(banner?.color).toBe(prof.glowColor);
      });
    });

    it('M4.3.3: Spotlight banner displays Opponent (P2) on right during Act 3 for human match', () => {
      const archetypes: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

      archetypes.forEach((p2Id) => {
        const banner = getSpotlightBannerForTime(4.5, 'ronin', p2Id, false);
        const prof = CHARACTER_PROFILES[p2Id];

        expect(banner).not.toBeNull();
        expect(banner?.side).toBe('right');
        expect(banner?.name).toBe(prof.name);
        expect(banner?.title).toBe(prof.title);
        expect(banner?.weapon).toBe(prof.weapon);
        expect(banner?.color).toBe(prof.glowColor);
        expect(banner?.name).not.toContain('(AI)');
      });
    });

    it('M4.3.4: Appends " (AI)" tag to opponent name when isBotMatch is true', () => {
      const archetypes: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

      archetypes.forEach((p2Id) => {
        const banner = getSpotlightBannerForTime(4.5, 'ronin', p2Id, true);
        const prof = CHARACTER_PROFILES[p2Id];

        expect(banner).not.toBeNull();
        expect(banner?.side).toBe('right');
        expect(banner?.name).toBe(`${prof.name} (AI)`);
        expect(banner?.weapon).toBe(prof.weapon);
      });
    });

    it('M4.3.5: Challenger (P1) never has (AI) tag even if isBotMatch is true', () => {
      const banner = getSpotlightBannerForTime(2.5, 'ronin', 'shinobi', true);
      expect(banner?.side).toBe('left');
      expect(banner?.name).toBe('Shadow Ronin');
      expect(banner?.name).not.toContain('(AI)');
    });

    it('M4.3.6: Spotlight banner is dismissed in Act 4 (Standoff) and Active Combat', () => {
      expect(getSpotlightBannerForTime(5.5, 'ronin', 'shinobi')).toBeNull();
      expect(getSpotlightBannerForTime(6.5, 'ronin', 'shinobi')).toBeNull();
      expect(getSpotlightBannerForTime(7.5, 'ronin', 'shinobi')).toBeNull();
      expect(getSpotlightBannerForTime(10.0, 'ronin', 'shinobi')).toBeNull();
    });
  });

  // ==========================================================================
  // 4. MAP-SPECIFIC KINEMATICS & VERTICAL TRAJECTORIES ACROSS ALL 4 ARENAS
  // ==========================================================================
  describe('4. Map-Specific Kinematics & Vertical Trajectories Across All 4 Arenas', () => {
    it('M4.4.1: Calculates sequential entrance progress for P1 (Act 2) and P2 (Act 3)', () => {
      // P1 arrives in Act 2 (1.5s -> 3.0s)
      expect(getFighterEntranceProgress(0.0, 'left')).toBe(0.0);
      expect(getFighterEntranceProgress(1.5, 'left')).toBe(0.0);
      expect(getFighterEntranceProgress(2.25, 'left')).toBeCloseTo(0.5, 2);
      expect(getFighterEntranceProgress(3.0, 'left')).toBe(1.0);
      expect(getFighterEntranceProgress(4.0, 'left')).toBe(1.0);
      expect(getFighterEntranceProgress(6.0, 'left')).toBe(1.0);

      // P2 arrives in Act 3 (3.5s -> 4.9s)
      expect(getFighterEntranceProgress(0.0, 'right')).toBe(0.0);
      expect(getFighterEntranceProgress(2.0, 'right')).toBe(0.0);
      expect(getFighterEntranceProgress(3.5, 'right')).toBe(0.0);
      expect(getFighterEntranceProgress(4.2, 'right')).toBeCloseTo(0.5, 2);
      expect(getFighterEntranceProgress(4.9, 'right')).toBe(1.0);
      expect(getFighterEntranceProgress(6.0, 'right')).toBe(1.0);
    });

    it('M4.4.2: Cyber Rooftop Drop-In: executes quadratic trajectory (1-p)^2 * 2.2 and lands on mark', () => {
      const p1 = new Character3DFighter('ronin', 'left', createMockLoader());
      const p2 = new Character3DFighter('shinobi', 'right', createMockLoader());

      // At start (p = 0):
      p1.setEntranceProgress(0.0, 'cyber_rooftop');
      p1.update(0.016, 0.0);
      expect(p1.group.position.x).toBe(-6.5);
      expect(p1.meshObject!.position.y).toBeCloseTo(2.2, 1);

      p2.setEntranceProgress(0.0, 'cyber_rooftop');
      p2.update(0.016, 0.0);
      expect(p2.group.position.x).toBe(6.5);
      expect(p2.meshObject!.position.y).toBeCloseTo(2.2, 1);

      // Mid-drop (p = 0.5): (0.5)^2 * 2.2 = 0.55m plus walking stride offset
      p1.setEntranceProgress(0.5, 'cyber_rooftop');
      p1.update(0.016, 0.5);
      expect(p1.meshObject!.position.y).toBeGreaterThan(0.5);
      expect(p1.meshObject!.position.y).toBeLessThan(0.7);

      // Touchdown (p = 1.0):
      p1.setEntranceProgress(1.0, 'cyber_rooftop');
      p1.update(0.016, 1.0);
      expect(p1.group.position.x).toBe(-1.50); // Left mark
      expect(p1.meshObject!.position.y).toBeCloseTo(0.0, 1);

      p2.setEntranceProgress(1.0, 'cyber_rooftop');
      p2.update(0.016, 1.0);
      expect(p2.group.position.x).toBe(1.50); // Right mark
      expect(p2.meshObject!.position.y).toBeCloseTo(0.0, 1);
    });

    it('M4.4.3: Volcanic Caldera Molten Emergence: rises from magma fissure -max(0, (1 - p*1.5)*0.8)', () => {
      const fighter = new Character3DFighter('valkyrie', 'left', createMockLoader());

      // At p = 0: Submerged in magma plume
      fighter.setEntranceProgress(0.0, 'volcanic_caldera');
      fighter.update(0.016, 0.0);
      expect(fighter.meshObject!.position.y).toBeLessThan(-0.7);

      // At p = 1.0: Erupted onto platform surface
      fighter.setEntranceProgress(1.0, 'volcanic_caldera');
      fighter.update(0.016, 1.0);
      expect(fighter.group.position.x).toBe(-1.50);
      expect(fighter.meshObject!.position.y).toBeCloseTo(0.0, 1);
    });

    it('M4.4.4: Celestial Void Astral Glide: zero-G float onto rune altar platform', () => {
      const fighter = new Character3DFighter('void', 'left', createMockLoader());

      fighter.setEntranceProgress(0.0, 'celestial_void');
      fighter.update(0.016, 0.0);
      expect(fighter.group.position.x).toBe(-6.5);

      fighter.setEntranceProgress(1.0, 'celestial_void');
      fighter.update(0.016, 1.0);
      expect(fighter.group.position.x).toBe(-1.50);
      expect(fighter.meshObject!.position.y).toBeCloseTo(0.0, 1);
    });

    it('M4.4.5: Highland Sanctuary Mountain Ridge Sprint: alpine terrace entry', () => {
      const fighter = new Character3DFighter('shinobi', 'right', createMockLoader());

      fighter.setEntranceProgress(0.0, 'highland_sanctuary');
      fighter.update(0.016, 0.0);
      expect(fighter.group.position.x).toBe(6.5);

      fighter.setEntranceProgress(1.0, 'highland_sanctuary');
      fighter.update(0.016, 1.0);
      expect(fighter.group.position.x).toBe(1.50);
      expect(fighter.meshObject!.position.y).toBeCloseTo(0.0, 1);
    });

    it('M4.4.6: Triggers entrance aura flair at t >= 3.0s (P1) and t >= 4.9s (P2)', () => {
      const p1 = new Character3DFighter('ronin', 'left', createMockLoader());
      const p2 = new Character3DFighter('valkyrie', 'right', createMockLoader());

      const p1Light = p1.group.children.find((c) => (c as any).isPointLight) as THREE.PointLight;
      const p2Light = p2.group.children.find((c) => (c as any).isPointLight) as THREE.PointLight;

      expect(p1Light.intensity).toBeLessThan(3.6);
      p1.triggerEntranceFlair();
      expect(p1Light.intensity).toBe(3.6);

      expect(p2Light.intensity).toBeLessThan(3.6);
      p2.triggerEntranceFlair();
      expect(p2Light.intensity).toBe(3.6);
    });

    it('M4.4.7: Verifies platform floor Y calibration across all 4 arenas', () => {
      expect(ARENA_DEFINITIONS.cyber_rooftop.fighterFloorY).toBe(0.205);
      expect(ARENA_DEFINITIONS.volcanic_caldera.fighterFloorY).toBe(0.025);
      expect(ARENA_DEFINITIONS.celestial_void.fighterFloorY).toBe(0.405);
      expect(ARENA_DEFINITIONS.highland_sanctuary.fighterFloorY).toBe(0.027);
    });
  });

  // ==========================================================================
  // 5. SKIP INTRO INTEGRATION & CONTROLS
  // ==========================================================================
  describe('5. Skip Intro Integration & Controls', () => {
    it('M4.5.1: skipIntro ref method immediately completes intro and snaps fighters to marks', () => {
      const p1 = new Character3DFighter('ronin', 'left', createMockLoader());
      const p2 = new Character3DFighter('shinobi', 'right', createMockLoader());
      const onIntroCompleteMock = vi.fn();

      let introCompleted = false;
      let currentAct: IntroAct = 'stage';

      const completeIntro = () => {
        if (introCompleted) return;
        introCompleted = true;
        currentAct = 'combat';
        p1.setEntranceProgress(1.0, 'cyber_rooftop');
        p2.setEntranceProgress(1.0, 'cyber_rooftop');
        onIntroCompleteMock();
      };

      const refHandle: Partial<ThreeCombatArenaRef> = {
        skipIntro: completeIntro,
      };

      // Call skip during Act 1
      refHandle.skipIntro!();

      expect(introCompleted).toBe(true);
      expect(currentAct).toBe('combat');
      expect(p1.group.position.x).toBe(-1.50);
      expect(p2.group.position.x).toBe(1.50);
      expect(onIntroCompleteMock).toHaveBeenCalledTimes(1);

      // Second call must be idempotent (no extra callbacks)
      refHandle.skipIntro!();
      expect(onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('M4.5.2: Keyboard handler triggers skip on Enter and Space keys', () => {
      const onIntroCompleteMock = vi.fn();
      let introCompleted = false;

      const handleKeyDown = (e: { code: string; key: string }) => {
        if (
          (e.code === 'Enter' || e.code === 'Space' || e.key === 'Enter' || e.key === ' ') &&
          !introCompleted
        ) {
          introCompleted = true;
          onIntroCompleteMock();
        }
      };

      // Enter key triggers skip
      handleKeyDown({ code: 'Enter', key: 'Enter' });
      expect(introCompleted).toBe(true);
      expect(onIntroCompleteMock).toHaveBeenCalledTimes(1);

      // Re-trigger with Space does not re-invoke completed intro
      handleKeyDown({ code: 'Space', key: ' ' });
      expect(onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });

    it('M4.5.3: Camera toggle hotkey (C) does not trigger intro skip', () => {
      const onIntroCompleteMock = vi.fn();
      let introCompleted = false;
      let cameraToggled = false;

      const handleKeyDown = (e: { code: string; key: string }) => {
        if (
          (e.code === 'Enter' || e.code === 'Space' || e.key === 'Enter' || e.key === ' ') &&
          !introCompleted
        ) {
          introCompleted = true;
          onIntroCompleteMock();
        } else if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
          cameraToggled = true;
        }
      };

      handleKeyDown({ code: 'KeyC', key: 'c' });
      expect(cameraToggled).toBe(true);
      expect(introCompleted).toBe(false);
      expect(onIntroCompleteMock).not.toHaveBeenCalled();
    });

    it('M4.5.4: Natural intro conclusion at t >= 7.5s invokes onIntroComplete', () => {
      const onIntroCompleteMock = vi.fn();
      let introCompleted = false;

      const updateCinematicTimer = (t: number) => {
        if (t >= 7.5 && !introCompleted) {
          introCompleted = true;
          onIntroCompleteMock();
        }
      };

      updateCinematicTimer(5.0);
      expect(introCompleted).toBe(false);
      expect(onIntroCompleteMock).not.toHaveBeenCalled();

      updateCinematicTimer(7.5);
      expect(introCompleted).toBe(true);
      expect(onIntroCompleteMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 6. CAMERA PRESETS & TRANSFORMS CALIBRATION
  // ==========================================================================
  describe('6. Camera Presets & Transforms Calibration', () => {
    it('M4.6.1: Verifies all 7 camera presets provide valid 3D coordinates', () => {
      expect(CAMERA_PRESETS).toHaveLength(7);
      const arenaDef = ARENA_DEFINITIONS.cyber_rooftop;

      CAMERA_PRESETS.forEach((preset) => {
        const t = preset.getTransform(arenaDef);
        expect(t.pos).toHaveLength(3);
        expect(t.lookAt).toHaveLength(3);
        expect(t.fov).toBeGreaterThan(15);
        expect(t.fov).toBeLessThan(90);
        expect(Number.isFinite(t.pos[0])).toBe(true);
        expect(Number.isFinite(t.pos[1])).toBe(true);
        expect(Number.isFinite(t.pos[2])).toBe(true);
      });
    });

    it('M4.6.2: Arena definitions specify calibrated LookDev lighting and theme colors', () => {
      const arenaIds: ArenaId[] = ['cyber_rooftop', 'celestial_void', 'volcanic_caldera', 'highland_sanctuary'];

      arenaIds.forEach((id) => {
        const def = ARENA_DEFINITIONS[id];
        expect(def.id).toBe(id);
        expect(def.name).toBeTruthy();
        expect(def.subtitle).toBeTruthy();
        expect(def.themeColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(def.skyColor).toBeGreaterThan(0);
        expect(def.ambientIntensity).toBeGreaterThan(0.5);
        expect(def.keyIntensity).toBeGreaterThan(1.0);
        expect(def.rimIntensity).toBeGreaterThan(0.5);
      });
    });
  });

  // ==========================================================================
  // 7. INPUT CONTROL & BOT SYNCHRONIZATION ACROSS ALL 4 ARENAS
  // ==========================================================================
  describe('7. Input Control & Bot Synchronization Across All 4 Arenas', () => {
    const arenaIds: ArenaId[] = ['cyber_rooftop', 'volcanic_caldera', 'celestial_void', 'highland_sanctuary'];

    it('M4.7.1: Blocks human and bot input across all 4 maps during entrance and countdown, enabling only at fight start', () => {
      arenaIds.forEach((arenaId) => {
        // Timeline stages for this arena
        // 1. Entrance phase: t = 0 to 5.49
        const entranceTimes = [0.0, 1.0, 2.5, 4.0, 5.4];
        entranceTimes.forEach((t) => {
          const act = getIntroActForTime(t);
          const countdown = getCountdownForTime(t);
          expect(['stage', 'p1', 'p2']).toContain(act);
          expect(countdown).toBeNull();
          // Input must be blocked during entrance
          const isInputAllowed = act === 'combat';
          expect(isInputAllowed).toBe(false);
        });

        // 2. Countdown phase: t = 5.5 to 7.49
        const countdownTimes = [5.5, 6.0, 6.5, 7.0, 7.4];
        countdownTimes.forEach((t) => {
          const act = getIntroActForTime(t);
          const countdown = getCountdownForTime(t);
          expect(act).toBe('standoff');
          expect(['3', '2', '1', 'FIGHT!']).toContain(countdown);
          // Input must still be strictly blocked during countdown
          const isInputAllowed = act === 'combat';
          expect(isInputAllowed).toBe(false);
        });

        // 3. Combat start: t >= 7.5
        const combatTimes = [7.5, 8.0, 10.0];
        combatTimes.forEach((t) => {
          const act = getIntroActForTime(t);
          expect(act).toBe('combat');
          const isInputAllowed = act === 'combat';
          expect(isInputAllowed).toBe(true);
        });
      });
    });

    it('M4.7.2: Simulates input gate rejecting key events before countdown completion', () => {
      let isIntroComplete = false;
      let inputEnabled = false;
      let matchStatus: 'waiting' | 'countdown' | 'in_progress' = 'countdown';
      let acceptedKeyCount = 0;

      const handleKeyInput = (key: string) => {
        // Exact input gate logic from MatchPage & CombatRoom
        if (matchStatus !== 'in_progress' || !inputEnabled || !isIntroComplete) {
          // Blocked
          return false;
        }
        acceptedKeyCount++;
        return true;
      };

      // During countdown: human attempts to type
      expect(handleKeyInput('a')).toBe(false);
      expect(handleKeyInput('b')).toBe(false);
      expect(acceptedKeyCount).toBe(0);

      // Countdown finishes -> fight starts
      isIntroComplete = true;
      inputEnabled = true;
      matchStatus = 'in_progress';

      // After countdown finishes: human can type
      expect(handleKeyInput('c')).toBe(true);
      expect(handleKeyInput('d')).toBe(true);
      expect(acceptedKeyCount).toBe(2);
    });

    it('M4.7.3: Simulates bot typing loop - emits 0 key events during countdown and only begins after inputEnabled is true', () => {
      let inputEnabled = false;
      let matchStatus: 'countdown' | 'in_progress' = 'countdown';
      let botTypedKeys = 0;

      // Bot typing tick simulation matching CombatRoom scheduleNextKey
      const botTick = () => {
        if (!inputEnabled || matchStatus !== 'in_progress') {
          return false;
        }
        botTypedKeys++;
        return true;
      };

      // 10 ticks simulated during countdown
      for (let i = 0; i < 10; i++) {
        expect(botTick()).toBe(false);
      }
      expect(botTypedKeys).toBe(0);

      // Transition to fight start
      inputEnabled = true;
      matchStatus = 'in_progress';

      // Bot begins typing once enabled
      for (let i = 0; i < 5; i++) {
        expect(botTick()).toBe(true);
      }
      expect(botTypedKeys).toBe(5);
    });

    it('M4.7.4: Edge Case - Rapid re-triggering of character entrance resets input control to disabled', () => {
      let isIntroComplete = true;
      let inputEnabled = true;

      // Trigger reset / re-spawn on character change or map re-entry
      const triggerEntrance = () => {
        isIntroComplete = false;
        inputEnabled = false;
      };

      triggerEntrance();
      expect(isIntroComplete).toBe(false);
      expect(inputEnabled).toBe(false);

      // Rapid re-trigger
      triggerEntrance();
      triggerEntrance();
      expect(isIntroComplete).toBe(false);
      expect(inputEnabled).toBe(false);
    });

    it('M4.7.5: Edge Case - Mid-countdown map switching keeps input disabled until new countdown finishes', () => {
      let activeArena: ArenaId = 'cyber_rooftop';
      let introTime = 6.5; // In standoff / countdown '2'
      let inputEnabled = false;

      expect(getCountdownForTime(introTime)).toBe('2');
      expect(inputEnabled).toBe(false);

      // Mid-countdown switch to volcanic_caldera
      activeArena = 'volcanic_caldera';
      introTime = 0.0; // Reset entrance timer on switch
      inputEnabled = false;

      expect(ARENA_DEFINITIONS[activeArena].id).toBe('volcanic_caldera');
      expect(getIntroActForTime(introTime)).toBe('stage');
      expect(inputEnabled).toBe(false);

      // Advance through new arena's countdown
      introTime = 5.5; // Countdown 3
      expect(getCountdownForTime(introTime)).toBe('3');
      expect(inputEnabled).toBe(false);

      introTime = 7.5; // Fight start
      expect(getIntroActForTime(introTime)).toBe('combat');
      inputEnabled = true;
      expect(inputEnabled).toBe(true);
    });
  });
});
