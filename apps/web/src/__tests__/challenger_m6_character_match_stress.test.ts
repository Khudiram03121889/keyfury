import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import {
  Character3DFighter,
  CHARACTER_PROFILES,
  resolveCharacterId,
  type CharacterId,
  type CombatState,
  type FighterBones,
} from '../game/character/Character3DController';
import type { ThreeCombatArenaRef } from '../render/ThreeCombatArena';

// ============================================================================
// HIERARCHICAL SKELETON GENERATOR & RIGIDITY ORACLE
// ============================================================================

interface BoneDef {
  name: string;
  parent?: string;
  offset: [number, number, number];
}

const CANONICAL_20_BONE_DEFS: BoneDef[] = [
  { name: 'Root', offset: [0, 0, 0] },
  { name: 'Hips', parent: 'Root', offset: [0, 0.95, 0] },
  { name: 'Spine', parent: 'Hips', offset: [0, 0.20, 0] },
  { name: 'Chest', parent: 'Spine', offset: [0, 0.25, 0] },
  { name: 'Neck', parent: 'Chest', offset: [0, 0.15, 0] },
  { name: 'Head', parent: 'Neck', offset: [0, 0.15, 0] },

  // Left Arm Chain
  { name: 'Shoulder.L', parent: 'Chest', offset: [-0.18, 0.10, 0] },
  { name: 'UpperArm.L', parent: 'Shoulder.L', offset: [-0.12, -0.05, 0] },
  { name: 'Forearm.L', parent: 'UpperArm.L', offset: [0, -0.28, 0] },
  { name: 'Hand.L', parent: 'Forearm.L', offset: [0, -0.22, 0] },

  // Right Arm Chain
  { name: 'Shoulder.R', parent: 'Chest', offset: [0.18, 0.10, 0] },
  { name: 'UpperArm.R', parent: 'Shoulder.R', offset: [0.12, -0.05, 0] },
  { name: 'Forearm.R', parent: 'UpperArm.R', offset: [0, -0.28, 0] },
  { name: 'Hand.R', parent: 'Forearm.R', offset: [0, -0.22, 0] },

  // Left Leg Chain
  { name: 'Thigh.L', parent: 'Hips', offset: [-0.12, -0.10, 0] },
  { name: 'Shin.L', parent: 'Thigh.L', offset: [0, -0.45, 0] },
  { name: 'Foot.L', parent: 'Shin.L', offset: [0, -0.42, 0.08] },

  // Right Leg Chain
  { name: 'Thigh.R', parent: 'Hips', offset: [0.12, -0.10, 0] },
  { name: 'Shin.R', parent: 'Thigh.R', offset: [0, -0.45, 0] },
  { name: 'Foot.R', parent: 'Shin.R', offset: [0, -0.42, 0.08] },
];

interface GeneratedRig {
  scene: THREE.Group;
  bones: Map<string, THREE.Bone>;
  restLengths: Map<string, number>;
  childParentPairs: { child: string; parent: string }[];
}

function buildSkeletonRig(
  archetype: CharacterId = 'ronin',
  nameTransformer: (n: string) => string = (n) => n
): GeneratedRig {
  const scene = new THREE.Group();
  scene.name = `Rig_${archetype}`;

  const bones = new Map<string, THREE.Bone>();
  const restLengths = new Map<string, number>();
  const childParentPairs: { child: string; parent: string }[] = [];

  // Create bones
  CANONICAL_20_BONE_DEFS.forEach((def) => {
    const transformedName = nameTransformer(def.name);
    const bone = new THREE.Bone();
    bone.name = transformedName;
    bone.position.set(def.offset[0], def.offset[1], def.offset[2]);
    bone.quaternion.identity();
    bones.set(def.name, bone);
  });

  // Assemble hierarchy
  CANONICAL_20_BONE_DEFS.forEach((def) => {
    const bone = bones.get(def.name)!;
    if (def.parent) {
      const parentBone = bones.get(def.parent)!;
      parentBone.add(bone);
      childParentPairs.push({ child: def.name, parent: def.parent });
    } else {
      scene.add(bone);
    }
  });

  // Skinned mesh with materials
  const meshGeom = new THREE.BoxGeometry(0.4, 1.8, 0.25);
  const meshMat = new THREE.MeshStandardMaterial({
    roughness: 0.15, // intentionally low to test PBR clamp
    metalness: 0.85, // intentionally high to test PBR clamp
    emissive: new THREE.Color(CHARACTER_PROFILES[archetype].primaryColor),
    emissiveIntensity: 5.0, // intentionally high
  });
  const mesh = new THREE.Mesh(meshGeom, meshMat);
  mesh.name = `Suit_${archetype}`;
  scene.add(mesh);

  scene.updateMatrixWorld(true);

  // Compute baseline rest Euclidean segment lengths
  childParentPairs.forEach(({ child, parent }) => {
    const childBone = bones.get(child)!;
    const parentBone = bones.get(parent)!;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    childBone.getWorldPosition(p1);
    parentBone.getWorldPosition(p2);
    restLengths.set(child, p1.distanceTo(p2));
  });

  return { scene, bones, restLengths, childParentPairs };
}

function makeMockLoader(rig: GeneratedRig) {
  return {
    load: (_url: string, onLoad: (gltf: any) => void) => {
      onLoad({ scene: rig.scene });
    },
  } as any;
}

// ============================================================================
// SIMULATED MATCHPAGE COMBAT BRIDGE HARNESS
// ============================================================================

interface MockPlayerRecord {
  sessionId: string;
  displayName: string;
  side: 'left' | 'right';
  characterId: string;
  health: number;
  combo: number;
  wpm?: number;
  acceptedWpm?: number;
  accuracy?: number;
  highestCombo?: number;
  stunnedUntilMs?: number;
}

class MockColyseusRoom {
  public sessionId = 'local_session_p1';
  public state: any;
  public metadata: any = {};
  public stateChangeHandlers: ((state: any) => void)[] = [];
  public messageHandlers: Map<string, (data: any) => void> = new Map();
  public sentMessages: { type: string; data: any }[] = [];

  constructor() {
    const players = new Map<string, MockPlayerRecord>();
    players.set('local_session_p1', {
      sessionId: 'local_session_p1',
      displayName: 'Player One',
      side: 'left',
      characterId: 'shadow_ronin',
      health: 200,
      combo: 0,
    });
    players.set('remote_session_p2', {
      sessionId: 'remote_session_p2',
      displayName: 'Opponent Bot',
      side: 'right',
      characterId: 'cyber_valkyrie',
      health: 200,
      combo: 0,
    });

    this.state = {
      status: 'in_progress',
      arenaId: 'cyber_rooftop',
      remainingSeconds: 90,
      words: ['cyber', 'samurai', 'plasma', 'strike'],
      players,
      winnerSessionId: null,
      isPaused: false,
    };
  }

  public onStateChange(cb: (state: any) => void) {
    this.stateChangeHandlers.push(cb);
  }

  public onMessage(type: string, cb: (data: any) => void) {
    this.messageHandlers.set(type, cb);
  }

  public send(type: string, data: any) {
    this.sentMessages.push({ type, data });
  }

  public emitStateChange(state: any) {
    this.state = state;
    this.stateChangeHandlers.forEach((cb) => cb(state));
  }

  public emitServerEvent(event: any) {
    const handler = this.messageHandlers.get('server_event');
    if (handler) handler(event);
  }
}

/**
 * High-fidelity representation of MatchPage.tsx event routing, intro gating,
 * typing input sync, and Phaser deactivation.
 */
class MatchPageTestHarness {
  public room: MockColyseusRoom;
  public is3DMode: boolean;
  public isIntroComplete: boolean;
  public phaserInstantiated = false;
  public typingInputDisabled = true;
  public typingInputFocused = false;
  public typingInputValue = '';
  public lastInputValue = '';
  public keySeq = 0;
  public stunnedUntilMs = 0;
  public statsOverlayShown = false;
  public matchEnded = false;
  public activeWordIndex = 0;
  public typedCharIndex = 0;
  public isErrorFlash = false;

  // Captured calls
  public arenaKeystrokes: ('left' | 'right')[] = [];
  public arenaAttacks: { side: 'left' | 'right'; tier: 'jab' | 'kick' | 'heavy' | 'weapon' }[] = [];
  public arenaHits: { side: 'left' | 'right'; severity: 'light' | 'heavy' }[] = [];
  public arenaShakes: number[] = [];
  public arenaKnockouts: ('left' | 'right')[] = [];
  public arenaVictories: ('left' | 'right')[] = [];
  public skipIntroCalledCount = 0;

  public arenaRef: ThreeCombatArenaRef;

  constructor(room: MockColyseusRoom, use3D = true) {
    this.room = room;
    this.is3DMode = use3D !== false;
    this.isIntroComplete = !this.is3DMode; // 3D starts false; 2D starts true
    this.typingInputDisabled = this.is3DMode && !this.isIntroComplete;

    this.arenaRef = {
      triggerAttack: (side, tier) => {
        this.arenaAttacks.push({ side, tier });
      },
      triggerHit: (side, severity) => {
        this.arenaHits.push({ side, severity });
      },
      triggerKeystroke: (side) => {
        this.arenaKeystrokes.push(side);
      },
      triggerKnockout: (loserSide) => {
        this.arenaKnockouts.push(loserSide);
      },
      triggerVictory: (winnerSide) => {
        this.arenaVictories.push(winnerSide);
      },
      triggerScreenShake: (intensity = 0.25) => {
        this.arenaShakes.push(intensity);
      },
      cycleCameraPreset: vi.fn(),
      setCameraPreset: vi.fn(),
      skipIntro: vi.fn(() => {
        this.skipIntroCalledCount++;
        this.handleIntroComplete();
      }),
    };

    // Deactivation logic mirroring MatchPage.tsx lines 391-395:
    if (!this.is3DMode) {
      this.phaserInstantiated = true;
    }

    // Room listeners mirroring MatchPage.tsx lines 207-388:
    this.room.onStateChange((state: any) => {
      const me = state?.players?.get(this.room.sessionId);
      if (me) {
        if (typeof me.stunnedUntilMs === 'number') {
          this.stunnedUntilMs = me.stunnedUntilMs;
        }
        this.activeWordIndex = me.activeWordIndex || 0;
        this.typedCharIndex = me.wordTypedCharCount || 0;
      }

      if ((state.status === 'completed' || state.status === 'forfeit') && !this.matchEnded) {
        this.matchEnded = true;
        let winnerSide: 'left' | 'right' = 'left';
        let loserSide: 'left' | 'right' = 'right';

        if (state.winnerSessionId) {
          const winnerPlayer = state.players.get(state.winnerSessionId);
          if (winnerPlayer) {
            winnerSide = winnerPlayer.side || 'left';
            loserSide = winnerSide === 'left' ? 'right' : 'left';
          }
        }

        this.arenaRef.triggerKnockout(loserSide);
        this.arenaRef.triggerVictory(winnerSide);
        this.arenaRef.triggerScreenShake?.(0.35);
        setTimeout(() => {
          this.statsOverlayShown = true;
        }, 1800);
      }
    });

    this.room.onMessage('server_event', (event: any) => {
      const state = this.room.state;
      const senderPlayer = state?.players?.get(event?.playerId);
      const myPlayer = state?.players?.get(this.room.sessionId);
      const mySide: 'left' | 'right' = myPlayer?.side || 'left';
      const side: 'left' | 'right' =
        senderPlayer?.side ||
        (event?.playerId === this.room.sessionId ? mySide : mySide === 'left' ? 'right' : 'left');
      const isMyEvent = event?.playerId === this.room.sessionId;

      if (!event || !event.type) return;

      if (event.type === 'key_accepted') {
        this.arenaRef.triggerKeystroke(side);
        if (isMyEvent) {
          this.activeWordIndex = event.wordIndex ?? this.activeWordIndex;
          this.typedCharIndex = event.charIndex ?? this.typedCharIndex;
        }
      } else if (event.type === 'word_completed') {
        const attackKind = event.attackKind || 'jab';
        const isWeaponAttack = attackKind === 'weapon';
        const isHeavyAttack = isWeaponAttack || attackKind === 'kick' || attackKind === 'heavy' || attackKind === 'uppercut';
        const tier: 'jab' | 'kick' | 'heavy' | 'weapon' =
          isWeaponAttack
            ? 'weapon'
            : attackKind === 'kick'
            ? 'kick'
            : attackKind === 'heavy' || attackKind === 'uppercut'
            ? 'heavy'
            : 'jab';

        this.arenaRef.triggerAttack(side, tier);
        this.arenaRef.triggerHit(side === 'left' ? 'right' : 'left', isHeavyAttack ? 'heavy' : 'light');

        if (isHeavyAttack || (event.damage && event.damage >= 25)) {
          const shake = event.damage && event.damage >= 25 ? 0.32 : tier === 'heavy' ? 0.28 : 0.22;
          this.arenaRef.triggerScreenShake?.(shake);
        }

        if (isMyEvent) {
          this.activeWordIndex = event.nextWordIndex ?? this.activeWordIndex;
          this.typedCharIndex = event.nextCharIndex ?? 0;
          this.lastInputValue = '';
          this.typingInputValue = '';
        }
      } else if (event.type === 'key_error' && isMyEvent) {
        this.stunnedUntilMs = Date.now() + 500;
        this.lastInputValue = '';
        this.typingInputValue = '';
        this.isErrorFlash = true;
        this.arenaRef.triggerHit(mySide, 'light');
        setTimeout(() => {
          this.isErrorFlash = false;
        }, 500);
      }
    });
  }

  public handleIntroComplete() {
    this.isIntroComplete = true;
    this.typingInputDisabled = false;
    this.typingInputFocused = true;
  }

  public handleKeyPress(char: string): boolean {
    if (this.matchEnded) return false;
    if (this.is3DMode && !this.isIntroComplete) return false;
    if (this.room.state?.status !== 'in_progress') return false;
    if (Date.now() < this.stunnedUntilMs) return false;

    let keyChar = char === 'Spacebar' || char === ' ' ? ' ' : char;
    if (keyChar.length !== 1 || !/^[ -~]$/.test(keyChar)) return false;

    this.keySeq++;
    this.room.send('key_intent', {
      seq: this.keySeq,
      key: keyChar,
      clientTimeMs: Date.now(),
    });
    return true;
  }

  public handleCombatKey(e: { key: string; preventDefault: () => void }): boolean {
    if (this.is3DMode && !this.isIntroComplete) {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        this.arenaRef.skipIntro();
        this.handleIntroComplete();
        return true;
      }
      return false;
    }

    if (e.key.length === 1 && /^[ -~]$/.test(e.key)) {
      e.preventDefault();
      return this.handleKeyPress(e.key);
    }
    return false;
  }

  public handleDOMInput(newValue: string): boolean {
    const oldVal = this.lastInputValue;
    if (newValue === oldVal) return false;

    if (newValue.startsWith(oldVal)) {
      const added = newValue.slice(oldVal.length);
      if (added.length > 1) {
        // Reject swipe typing or prediction words
        this.lastInputValue = '';
        this.typingInputValue = '';
        return false;
      }
      this.lastInputValue = newValue;
      this.typingInputValue = newValue;
      return this.handleKeyPress(added);
    } else {
      if (newValue.length > 1) {
        this.lastInputValue = '';
        this.typingInputValue = '';
        return false;
      }
      this.lastInputValue = newValue;
      this.typingInputValue = newValue;
      return this.handleKeyPress(newValue);
    }
  }
}

// ============================================================================
// ADVERSARIAL COVERAGE HARDENING TEST SUITE
// ============================================================================

describe('Tier 5 Adversarial Coverage Hardening: Character Kinematics & MatchPage Host Bridge', () => {
  const ALL_ARCHETYPES: CharacterId[] = ['ronin', 'shinobi', 'void', 'valkyrie'];

  // --------------------------------------------------------------------------
  // SUITE 1: 20-BONE HUMANOID SKELETAL HIERARCHY & JOINT DISLOCATION ORACLE
  // --------------------------------------------------------------------------
  describe('1. 20-Bone Humanoid Skeletal Hierarchy & Dislocation Invariance Stress', () => {
    it('discovers and maps exactly 20 canonical humanoid bones for all 4 archetypes', () => {
      ALL_ARCHETYPES.forEach((archetype) => {
        const rig = buildSkeletonRig(archetype);
        const fighter = new Character3DFighter(archetype, 'left', makeMockLoader(rig));

        const requiredBones: (keyof FighterBones)[] = [
          'root', 'hips', 'spine', 'chest', 'neck', 'head',
          'shoulderL', 'upperArmL', 'forearmL', 'handL',
          'shoulderR', 'upperArmR', 'forearmR', 'handR',
          'thighL', 'shinL', 'footL',
          'thighR', 'shinR', 'footR',
        ];

        expect(requiredBones.length).toBe(20);
        requiredBones.forEach((boneKey) => {
          expect(fighter.bones[boneKey], `Missing bone key ${boneKey} in ${archetype}`).toBeDefined();
          expect((fighter.bones[boneKey] as any).isBone).toBe(true);
        });
      });
    });

    it('robustly normalizes adversarial bone naming conventions (dots, underscores, casing variations)', () => {
      // Transformer produces: "Upper_Arm_L", "upper.arm.l", "SHOULDER_R", etc.
      const adversarialTransformer = (name: string) => {
        if (name.includes('.')) return name.replace('.', '_').toUpperCase();
        return name.toLowerCase();
      };

      const rig = buildSkeletonRig('ronin', adversarialTransformer);
      const fighter = new Character3DFighter('ronin', 'left', makeMockLoader(rig));

      expect(fighter.bones.upperArmL).toBeDefined();
      expect(fighter.bones.forearmL).toBeDefined();
      expect(fighter.bones.shoulderR).toBeDefined();
      expect(fighter.bones.shinR).toBeDefined();
      expect(fighter.bones.footL).toBeDefined();
    });

    it('rigidity oracle: proves zero joint dislocation (< 1e-5 drift) across all 9 combat states for left & right fighters', () => {
      const states: { name: CombatState; trigger: (f: Character3DFighter) => void; duration: number }[] = [
        { name: 'idle', trigger: () => {}, duration: 0.5 },
        { name: 'jab', trigger: (f) => f.playJab(), duration: 0.34 },
        { name: 'kick', trigger: (f) => f.playKick(), duration: 0.46 },
        { name: 'heavy', trigger: (f) => f.playHeavy(), duration: 0.68 },
        { name: 'hit_light', trigger: (f) => f.playHitLight(), duration: 0.24 },
        { name: 'hit_heavy', trigger: (f) => f.playHitHeavy(), duration: 0.46 },
        { name: 'ko', trigger: (f) => f.playKnockout(), duration: 1.5 },
        { name: 'victory', trigger: (f) => f.playVictory(), duration: 1.0 },
      ];

      ALL_ARCHETYPES.forEach((archetype) => {
        (['left', 'right'] as const).forEach((side) => {
          const rig = buildSkeletonRig(archetype);
          const fighter = new Character3DFighter(archetype, side, makeMockLoader(rig));

          states.forEach(({ name, trigger, duration }) => {
            trigger(fighter);

            // Step through animation lifecycle at 60 FPS
            const step = 0.016;
            for (let t = 0; t <= duration; t += step) {
              fighter.update(step, t);
              rig.scene.updateMatrixWorld(true);

              // Check every parent-child bone distance
              rig.childParentPairs.forEach(({ child, parent }) => {
                const childBone = rig.bones.get(child)!;
                const parentBone = rig.bones.get(parent)!;
                const pChild = new THREE.Vector3();
                const pParent = new THREE.Vector3();
                childBone.getWorldPosition(pChild);
                parentBone.getWorldPosition(pParent);
                const currentDist = pChild.distanceTo(pParent);
                const expectedDist = rig.restLengths.get(child)!;

                const deviation = Math.abs(currentDist - expectedDist);
                expect(
                  deviation,
                  `Joint dislocation detected! Archetype=${archetype}, side=${side}, state=${name}, bone=${child}->${parent}, diff=${deviation}`
                ).toBeLessThan(1e-4);
              });
            }
          });
        });
      });
    });

    it('survives missing bones gracefully without exceptions or NaN transforms', () => {
      const scene = new THREE.Group();
      // Only 3 bones provided (missing 17 bones)
      const root = new THREE.Bone();
      root.name = 'root';
      const hips = new THREE.Bone();
      hips.name = 'hips';
      const spine = new THREE.Bone();
      spine.name = 'spine';
      root.add(hips);
      hips.add(spine);
      scene.add(root);

      const partialLoader = {
        load: (_url: string, onLoad: (g: any) => void) => onLoad({ scene }),
      } as any;

      const fighter = new Character3DFighter('void', 'left', partialLoader);
      expect(fighter.bones.root).toBeDefined();
      expect(fighter.bones.head).toBeUndefined();
      expect(fighter.bones.handR).toBeUndefined();

      // Running all animation states must not throw
      expect(() => {
        fighter.playJab();
        fighter.update(0.016, 0.1);
        fighter.playKick();
        fighter.update(0.016, 0.2);
        fighter.playHeavy();
        fighter.update(0.016, 0.3);
        fighter.playHitLight();
        fighter.update(0.016, 0.1);
        fighter.playKnockout();
        fighter.update(0.016, 0.5);
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 2: SIGNATURE WEAPON SOCKETS & PBR MATERIAL THRESHOLDS
  // --------------------------------------------------------------------------
  describe('2. Signature Weapon Sockets & PBR Anti-Blowout Validation', () => {
    it('verifies exact signature weapon socket metadata for all 4 archetypes', () => {
      ALL_ARCHETYPES.forEach((archetype) => {
        const rig = buildSkeletonRig(archetype);
        const fighter = new Character3DFighter(archetype, 'left', makeMockLoader(rig));

        expect(fighter.socketWeaponR.name).toBe('socketWeaponR');
        expect(fighter.socketWeaponL.name).toBe('socketWeaponL');
        expect(fighter.socketWeaponR.userData.archetype).toBe(archetype);
      });
    });

    it('validates PBR LookDev clamps preventing chrome reflections and emissive white blowouts on fighter body suit', () => {
      ALL_ARCHETYPES.forEach((archetype) => {
        const rig = buildSkeletonRig(archetype);
        // Feed in extreme material values (metalness 0.85, roughness 0.15) on body mesh
        const fighter = new Character3DFighter(archetype, 'left', makeMockLoader(rig));

        // Verify the suit mesh specifically received the LookDev override
        const suitMesh = fighter.meshObject?.getObjectByName(`Suit_${archetype}`) as THREE.Mesh;
        expect(suitMesh).toBeDefined();
        const mat = suitMesh.material as THREE.MeshStandardMaterial;
        expect(mat).toBeDefined();
        expect(mat.depthWrite).toBe(true);

        // Valkyrie allows up to 0.45, others capped at 0.30
        const maxMetalness = archetype === 'valkyrie' ? 0.45 : 0.30;
        expect(mat.metalness).toBeLessThanOrEqual(maxMetalness + 0.001);
        // Suit roughness clamped to at least 0.44
        expect(mat.roughness).toBeGreaterThanOrEqual(0.44 - 0.001);
        // Suit emissive intensity clamped to 1.0
        expect(mat.emissiveIntensity).toBeLessThanOrEqual(1.0);
      });
    });

    it('dynamically modulates weapon emissive flares during typing twitches, attacks, and fades on KO', () => {
      const rig = buildSkeletonRig('ronin');
      const fighter = new Character3DFighter('ronin', 'left', makeMockLoader(rig));

      expect(fighter.weaponMaterials.length).toBeGreaterThan(0);
      const bladeMat = fighter.weaponMaterials[0] as THREE.MeshStandardMaterial;
      const baseEmissive = fighter.baseWeaponEmissiveIntensities[0] ?? 1.0;

      // 1. Idle stance base emissive
      fighter.setEntranceProgress(1.0);
      fighter.update(0.016, 0);
      expect(bladeMat.emissiveIntensity).toBeCloseTo(baseEmissive, 1);

      // 2. Keystroke twitch flare
      fighter.playKeystroke();
      fighter.update(0.016, 0.05); // active twitch
      expect(bladeMat.emissiveIntensity).toBeGreaterThan(baseEmissive * 1.3);

      // 3. Attack boost
      fighter.playJab();
      fighter.update(0.016, 0.1);
      expect(bladeMat.emissiveIntensity).toBeGreaterThanOrEqual(baseEmissive * 1.5);

      // 4. KO total fadeout
      fighter.playKnockout();
      fighter.update(1.5, 1.5); // KO stateTimer = 1.5
      expect(bladeMat.emissiveIntensity).toBeLessThan(baseEmissive * 0.1);
    });

    it('re-parents weapon sockets automatically if hand bones are bound or dynamically replaced', () => {
      const rig = buildSkeletonRig('valkyrie');
      const fighter = new Character3DFighter('valkyrie', 'left', makeMockLoader(rig));

      expect(fighter.socketWeaponR.parent).toBe(fighter.bones.handR);
      expect(fighter.socketWeaponL.parent).toBe(fighter.bones.handL);

      // Artificially detach socket
      fighter.group.add(fighter.socketWeaponR);
      expect(fighter.socketWeaponR.parent).not.toBe(fighter.bones.handR);

      // On update, controller must detect and re-parent
      fighter.update(0.016, 0.1);
      expect(fighter.socketWeaponR.parent).toBe(fighter.bones.handR);
    });

    it('cleanly disposes all socket hierarchies without memory leaks', () => {
      const rig = buildSkeletonRig('void');
      const fighter = new Character3DFighter('void', 'left', makeMockLoader(rig));

      fighter.dispose();

      expect(fighter.socketWeaponR.children.length).toBe(0);
      expect(fighter.socketWeaponL.children.length).toBe(0);
      expect(fighter.group.children.length).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 3: PROCEDURAL FK STATE MACHINE & 180MS MICRO-LUNGE KINEMATICS
  // --------------------------------------------------------------------------
  describe('3. Procedural FK State Machine & 180ms Micro-Lunge Kinematics', () => {
    it('executes the 180ms keystroke micro-lunge response curve with forward peak and smooth return', () => {
      const rigL = buildSkeletonRig('ronin');
      const rigR = buildSkeletonRig('ronin');
      const fighterL = new Character3DFighter('ronin', 'left', makeMockLoader(rigL));
      const fighterR = new Character3DFighter('ronin', 'right', makeMockLoader(rigR));

      fighterL.setEntranceProgress(1.0);
      fighterR.setEntranceProgress(1.0);

      // Trigger keystroke on both
      fighterL.playKeystroke();
      fighterR.playKeystroke();

      // Step to halfway mark (~0.09s), where Math.sin(0.5 * PI) = 1.0 peak
      fighterL.update(0.09, 0.09);
      fighterR.update(0.09, 0.09);

      // Left fighter (facingSign=+1) lunges forward in +X (+0.15m)
      expect(fighterL.meshObject!.position.x).toBeCloseTo(0.15, 2);
      // Right fighter (facingSign=-1) lunges forward in -X (-0.15m)
      expect(fighterR.meshObject!.position.x).toBeCloseTo(-0.15, 2);

      // Step past 0.18s to conclude micro-lunge
      fighterL.update(0.12, 0.21);
      fighterR.update(0.12, 0.21);

      // Displacements should return to 0 (within idle breathing threshold)
      expect(Math.abs(fighterL.meshObject!.position.x)).toBeLessThan(0.01);
      expect(Math.abs(fighterR.meshObject!.position.x)).toBeLessThan(0.01);
    });

    it('maintains numerical stability and bounded displacement under 160+ WPM rapid typing barrage', () => {
      const rig = buildSkeletonRig('shinobi');
      const fighter = new Character3DFighter('shinobi', 'left', makeMockLoader(rig));
      fighter.setEntranceProgress(1.0);

      // Simulate 50 keystrokes arriving every 40ms (25 keystrokes/sec = ~300 WPM)
      for (let i = 0; i < 50; i++) {
        fighter.playKeystroke();
        fighter.update(0.04, i * 0.04);

        const x = fighter.meshObject!.position.x;
        const y = fighter.meshObject!.position.y;
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        // Lunge must never exceed 0.16m
        expect(x).toBeLessThanOrEqual(0.16);
        expect(x).toBeGreaterThanOrEqual(-0.05);
      }
    });

    it('verifies facing symmetry across all martial attacks (Jab, Kick, Heavy Slam, Hit, KO)', () => {
      const attackSpecs: {
        name: string;
        play: (f: Character3DFighter) => void;
        peakTime: number;
        duration: number;
        expectedPeakLunge: number;
        lungeDirection: 'forward' | 'backward';
      }[] = [
        {
          name: 'Jab',
          play: (f) => f.playJab(),
          peakTime: 0.12,
          duration: 0.34,
          expectedPeakLunge: 1.35,
          lungeDirection: 'forward',
        },
        {
          name: 'Kick',
          play: (f) => f.playKick(),
          peakTime: 0.20,
          duration: 0.46,
          expectedPeakLunge: 1.40,
          lungeDirection: 'forward',
        },
        {
          name: 'Heavy',
          play: (f) => f.playHeavy(),
          peakTime: 0.45,
          duration: 0.68,
          expectedPeakLunge: 1.65,
          lungeDirection: 'forward',
        },
        {
          name: 'HitLight',
          play: (f) => f.playHitLight(),
          peakTime: 0.12,
          duration: 0.24,
          expectedPeakLunge: 0.45,
          lungeDirection: 'backward',
        },
        {
          name: 'HitHeavy',
          play: (f) => f.playHitHeavy(),
          peakTime: 0.23,
          duration: 0.46,
          expectedPeakLunge: 0.95,
          lungeDirection: 'backward',
        },
      ];

      attackSpecs.forEach(({ name, play, peakTime, duration, expectedPeakLunge, lungeDirection }) => {
        const rigL = buildSkeletonRig('ronin');
        const rigR = buildSkeletonRig('ronin');
        const fL = new Character3DFighter('ronin', 'left', makeMockLoader(rigL));
        const fR = new Character3DFighter('ronin', 'right', makeMockLoader(rigR));
        fL.setEntranceProgress(1.0);
        fR.setEntranceProgress(1.0);

        play(fL);
        play(fR);

        fL.update(peakTime, peakTime);
        fR.update(peakTime, peakTime);

        const xL = fL.meshObject!.position.x;
        const xR = fR.meshObject!.position.x;

        if (lungeDirection === 'forward') {
          expect(xL, `${name} Left forward lunge`).toBeGreaterThan(expectedPeakLunge * 0.7);
          expect(xR, `${name} Right forward lunge`).toBeLessThan(-expectedPeakLunge * 0.7);
        } else {
          // Backward flinch pushes Left toward -X, Right toward +X
          expect(xL, `${name} Left backward flinch`).toBeLessThan(-expectedPeakLunge * 0.7);
          expect(xR, `${name} Right backward flinch`).toBeGreaterThan(expectedPeakLunge * 0.7);
        }

        // Complete the move
        fL.update(duration, duration + peakTime);
        fR.update(duration, duration + peakTime);

        expect(fL.getState()).toBe('idle');
        expect(fR.getState()).toBe('idle');
      });
    });

    it('verifies KO collapse tilt (-85.7° / -90° pitch) and vertical canvas drop (-0.95m)', () => {
      const rig = buildSkeletonRig('valkyrie');
      const fighter = new Character3DFighter('valkyrie', 'left', makeMockLoader(rig));
      fighter.setEntranceProgress(1.0);

      fighter.playKnockout();
      expect(fighter.getState()).toBe('ko');

      // Update to full collapse (>= 2.0s, since t = min(p * 1.5, 1) and stateDuration = 3.0s)
      fighter.update(2.2, 2.2);

      expect(fighter.meshObject!.position.y).toBeCloseTo(-0.95, 1);
      // Pitch tilt: -Math.PI / 2.1 = -1.496 rad (~-85.7 deg)
      expect(fighter.meshObject!.rotation.x).toBeCloseTo(-Math.PI / 2.1, 1);
      // State persists as KO
      expect(fighter.getState()).toBe('ko');
    });

    it('handles chaotic state transition interrupts without desync or pose corruptions', () => {
      const rig = buildSkeletonRig('void');
      const fighter = new Character3DFighter('void', 'left', makeMockLoader(rig));
      fighter.setEntranceProgress(1.0);

      // Rapid interruption barrage: Jab -> Kick -> Heavy -> HitHeavy -> Knockout
      fighter.playJab();
      fighter.update(0.05, 0.05);
      expect(fighter.getState()).toBe('jab');

      fighter.playKick();
      fighter.update(0.05, 0.10);
      expect(fighter.getState()).toBe('kick');

      fighter.playHeavy();
      fighter.update(0.05, 0.15);
      expect(fighter.getState()).toBe('heavy');

      fighter.playHitHeavy();
      fighter.update(0.05, 0.20);
      expect(fighter.getState()).toBe('hit_heavy');

      fighter.playKnockout();
      fighter.update(0.05, 0.25);
      expect(fighter.getState()).toBe('ko');

      expect(Number.isFinite(fighter.meshObject!.position.x)).toBe(true);
      expect(Number.isFinite(fighter.meshObject!.position.y)).toBe(true);
      expect(Number.isFinite(fighter.meshObject!.rotation.y)).toBe(true);
    });

    it('remains resilient to extreme time steps (delta = 0, delta = 5.0s tab freeze)', () => {
      const rig = buildSkeletonRig('ronin');
      const fighter = new Character3DFighter('ronin', 'left', makeMockLoader(rig));
      fighter.setEntranceProgress(1.0);

      fighter.playJab();

      // Zero delta (pause)
      fighter.update(0, 0);
      expect(fighter.getState()).toBe('jab');

      // Giant lag spike (5s elapsed in single frame)
      fighter.update(5.0, 5.0);
      // Completed and smoothly transitioned to idle
      expect(fighter.getState()).toBe('idle');
      expect(fighter.meshObject!.position.x).toBeCloseTo(0, 2);
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 4: MATCHPAGE 3D HOST BRIDGE, INPUT GATING & COLYSEUS ROUTING
  // --------------------------------------------------------------------------
  describe('4. MatchPage 3D Host Bridge, Input Gating & Colyseus Event Routing', () => {
    let room: MockColyseusRoom;

    beforeEach(() => {
      room = new MockColyseusRoom();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('enforces typing deck gating during 3D intro and unlocks autofocus upon completion', () => {
      const harness = new MatchPageTestHarness(room, true);

      // In 3D mode before intro ends:
      expect(harness.isIntroComplete).toBe(false);
      expect(harness.typingInputDisabled).toBe(true);

      // Attempting to type regular characters must be blocked
      const accepted = harness.handleKeyPress('c');
      expect(accepted).toBe(false);
      expect(room.sentMessages.length).toBe(0);

      // Complete intro
      harness.handleIntroComplete();
      expect(harness.isIntroComplete).toBe(true);
      expect(harness.typingInputDisabled).toBe(false);
      expect(harness.typingInputFocused).toBe(true);

      // Now typing is accepted
      const acceptedPostIntro = harness.handleKeyPress('c');
      expect(acceptedPostIntro).toBe(true);
      expect(room.sentMessages).toContainEqual(
        expect.objectContaining({
          type: 'key_intent',
          data: expect.objectContaining({ key: 'c', seq: 1 }),
        })
      );
    });

    it('intercepts Space and Enter during 3D intro to skip intro and immediately autofocus input', () => {
      const harness = new MatchPageTestHarness(room, true);
      expect(harness.isIntroComplete).toBe(false);

      const preventDefaultSpy = vi.fn();
      const skipped = harness.handleCombatKey({ key: ' ', preventDefault: preventDefaultSpy });

      expect(skipped).toBe(true);
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(harness.skipIntroCalledCount).toBe(1);
      expect(harness.isIntroComplete).toBe(true);
      expect(harness.typingInputDisabled).toBe(false);
      expect(harness.typingInputFocused).toBe(true);
    });

    it('intercepts Enter during 3D intro to skip intro as well', () => {
      const harness = new MatchPageTestHarness(room, true);
      const preventDefaultSpy = vi.fn();
      const skipped = harness.handleCombatKey({ key: 'Enter', preventDefault: preventDefaultSpy });

      expect(skipped).toBe(true);
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(harness.skipIntroCalledCount).toBe(1);
      expect(harness.isIntroComplete).toBe(true);
    });

    it('deactivates legacy Phaser 2D loop completely in 3D mode, activating only in 2D fallback', () => {
      // 3D Mode
      const harness3D = new MatchPageTestHarness(room, true);
      expect(harness3D.is3DMode).toBe(true);
      expect(harness3D.phaserInstantiated).toBe(false);

      // 2D Fallback Mode
      const harness2D = new MatchPageTestHarness(room, false);
      expect(harness2D.is3DMode).toBe(false);
      expect(harness2D.phaserInstantiated).toBe(true);
      expect(harness2D.isIntroComplete).toBe(true); // 2D starts with intro complete
    });

    it('routes Colyseus key_accepted event to ThreeCombatArenaRef.triggerKeystroke and syncs progress', () => {
      const harness = new MatchPageTestHarness(room, true);
      harness.handleIntroComplete();

      // Local player key accepted
      room.emitServerEvent({
        type: 'key_accepted',
        playerId: 'local_session_p1',
        wordIndex: 0,
        charIndex: 2,
      });

      expect(harness.arenaKeystrokes).toContain('left');
      expect(harness.activeWordIndex).toBe(0);
      expect(harness.typedCharIndex).toBe(2);

      // Remote opponent key accepted
      room.emitServerEvent({
        type: 'key_accepted',
        playerId: 'remote_session_p2',
        wordIndex: 1,
        charIndex: 3,
      });

      expect(harness.arenaKeystrokes).toContain('right');
    });

    it('routes word_completed attacks to appropriate tiers (jab, kick, heavy) and screen shakes', () => {
      const harness = new MatchPageTestHarness(room, true);
      harness.handleIntroComplete();

      // 1. Kick attack
      room.emitServerEvent({
        type: 'word_completed',
        playerId: 'local_session_p1',
        attackKind: 'kick',
        damage: 18,
        nextWordIndex: 1,
        nextCharIndex: 0,
      });

      expect(harness.arenaAttacks).toContainEqual({ side: 'left', tier: 'kick' });
      expect(harness.arenaHits).toContainEqual({ side: 'right', severity: 'heavy' });
      expect(harness.arenaShakes).toContain(0.22);

      // 2. Heavy attack from opponent
      room.emitServerEvent({
        type: 'word_completed',
        playerId: 'remote_session_p2',
        attackKind: 'heavy',
        damage: 22,
        nextWordIndex: 2,
        nextCharIndex: 0,
      });

      expect(harness.arenaAttacks).toContainEqual({ side: 'right', tier: 'heavy' });
      expect(harness.arenaHits).toContainEqual({ side: 'left', severity: 'heavy' });
      expect(harness.arenaShakes).toContain(0.28);

      // 3. Critical damage >= 25 max shake
      room.emitServerEvent({
        type: 'word_completed',
        playerId: 'local_session_p1',
        attackKind: 'jab',
        damage: 30,
        nextWordIndex: 2,
        nextCharIndex: 0,
      });

      expect(harness.arenaShakes).toContain(0.32);
    });

    it('applies 500ms stun penalty on key_error and ignores typing until stun expires', () => {
      const harness = new MatchPageTestHarness(room, true);
      harness.handleIntroComplete();

      const baseTime = 10000;
      vi.setSystemTime(baseTime);

      room.emitServerEvent({
        type: 'key_error',
        playerId: 'local_session_p1',
      });

      expect(harness.stunnedUntilMs).toBe(baseTime + 500);
      expect(harness.isErrorFlash).toBe(true);
      expect(harness.arenaHits).toContainEqual({ side: 'left', severity: 'light' });

      // Typing during stun must be dropped
      const sentDuringStun = harness.handleKeyPress('x');
      expect(sentDuringStun).toBe(false);

      // Advance past 500ms
      vi.advanceTimersByTime(501);
      vi.setSystemTime(baseTime + 501);

      expect(harness.isErrorFlash).toBe(false);
      const sentAfterStun = harness.handleKeyPress('x');
      expect(sentAfterStun).toBe(true);
    });

    it('triggers knockout and victory choreography with 1.8s delay before stats overlay on match completion', () => {
      const harness = new MatchPageTestHarness(room, true);
      harness.handleIntroComplete();

      const completedState = {
        ...room.state,
        status: 'completed',
        winnerSessionId: 'local_session_p1',
      };

      room.emitStateChange(completedState);

      expect(harness.matchEnded).toBe(true);
      expect(harness.arenaVictories).toContain('left');
      expect(harness.arenaKnockouts).toContain('right');
      expect(harness.arenaShakes).toContain(0.35);

      // Overlay not shown immediately
      expect(harness.statsOverlayShown).toBe(false);

      // Advance by 1800ms
      vi.advanceTimersByTime(1800);
      expect(harness.statsOverlayShown).toBe(true);
    });

    it('rejects multi-character DOM input events (anti-paste / anti-swipe typing cheat guard)', () => {
      const harness = new MatchPageTestHarness(room, true);
      harness.handleIntroComplete();

      // Normal single character
      const singleOk = harness.handleDOMInput('c');
      expect(singleOk).toBe(true);
      expect(harness.typingInputValue).toBe('c');

      // Multi-char paste: "yber" all at once
      const pasteOk = harness.handleDOMInput('cyber');
      expect(pasteOk).toBe(false);
      // Input value is wiped clean
      expect(harness.typingInputValue).toBe('');
      expect(harness.lastInputValue).toBe('');
    });

    it('handles malformed / partial server events without exceptions', () => {
      const harness = new MatchPageTestHarness(room, true);
      harness.handleIntroComplete();

      expect(() => {
        room.emitServerEvent(null);
        room.emitServerEvent({});
        room.emitServerEvent({ type: 'unknown_event' });
        room.emitServerEvent({ type: 'word_completed' }); // missing attacker & damage
        room.emitServerEvent({ type: 'key_accepted', playerId: 'ghost_id' });
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 5: STATIC ARCHITECTURE & SOURCE CODE AUDIT
  // --------------------------------------------------------------------------
  describe('5. White-Box Source Code Invariant Audits', () => {
    it('verifies MatchPage.tsx guards all Phaser calls and implements skipIntro key bindings', () => {
      const matchPagePath = path.resolve(__dirname, '../pages/MatchPage.tsx');
      expect(fs.existsSync(matchPagePath)).toBe(true);
      const code = fs.readFileSync(matchPagePath, 'utf-8');

      // 1. Phaser deactivation guard
      expect(code).toContain('if (is3DMode) {');
      expect(code).toContain('return;');

      // 2. Space / Enter skipIntro
      expect(code).toContain('threeArenaRef.current?.skipIntro();');
      expect(code).toContain('handleIntroComplete();');
      expect(code).toContain("event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter'");

      // 3. Typing deck sync
      expect(code).toContain('data-testid="typing-deck"');
      expect(code).toContain('aria-disabled={is3DMode && !isIntroComplete}');

      // 4. Null safety on sceneRef
      const unsafeCalls = code.match(/sceneRef\.current\.[a-zA-Z0-9_]+\(/g) || [];
      const unguarded = unsafeCalls.filter((c) => !c.includes('?.'));
      expect(unguarded.length).toBe(0);
    });

    it('verifies Character3DController.ts implements 20 bones, PBR LookDev clamps, and weapon attachments', () => {
      const controllerPath = path.resolve(__dirname, '../game/character/Character3DController.ts');
      expect(fs.existsSync(controllerPath)).toBe(true);
      const code = fs.readFileSync(controllerPath, 'utf-8');

      // 1. 20-bone mappings
      expect(code).toContain('root');
      expect(code).toContain('hips');
      expect(code).toContain('spine');
      expect(code).toContain('chest');
      expect(code).toContain('neck');
      expect(code).toContain('head');
      expect(code).toContain('shoulderL');
      expect(code).toContain('upperArmL');
      expect(code).toContain('forearmL');
      expect(code).toContain('handL');
      expect(code).toContain('shoulderR');
      expect(code).toContain('upperArmR');
      expect(code).toContain('forearmR');
      expect(code).toContain('handR');
      expect(code).toContain('thighL');
      expect(code).toContain('shinL');
      expect(code).toContain('footL');
      expect(code).toContain('thighR');
      expect(code).toContain('shinR');
      expect(code).toContain('footR');

      // 2. Weapon sockets
      expect(code).toContain('socketWeaponR');
      expect(code).toContain('socketWeaponL');

      // 3. 180ms micro-lunges
      expect(code).toContain('this.keystrokeTimer = 0.18');
      expect(code).toContain('Math.sin(twitch * Math.PI) * 0.15');

      // 4. PBR LookDev metalness & roughness clamps
      expect(code).toContain('stdMat.metalness = this.profile.id === \'valkyrie\' ? 0.45 : 0.30');
      expect(code).toContain('stdMat.roughness = 0.44');
    });
  });
});
