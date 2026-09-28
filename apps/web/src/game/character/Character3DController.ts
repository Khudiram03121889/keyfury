import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type CharacterId = 'ronin' | 'shinobi' | 'void' | 'valkyrie';
export type CombatState = 'entrance' | 'idle' | 'jab' | 'kick' | 'heavy' | 'weapon' | 'hit_light' | 'hit_heavy' | 'ko' | 'victory';

export function resolveCharacterId(rawId?: string): CharacterId {
  const norm = (rawId || '').toLowerCase();
  if (norm.includes('shinobi') || norm.includes('raijin')) return 'shinobi';
  if (norm.includes('void') || norm.includes('nyx')) return 'void';
  if (norm.includes('valk') || norm.includes('freya')) return 'valkyrie';
  return 'ronin';
}

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  title: string;
  weapon: string;
  primaryColor: number;
  glowColor: string;
  modelFile: string;
  height: number;
  scale: number;
}

export const CHARACTER_PROFILES: Record<CharacterId, CharacterProfile> = {
  ronin: {
    id: 'ronin',
    name: 'Shadow Ronin',
    title: 'Azure Blade // Iaido Master',
    weapon: 'Azure Plasma Katana',
    primaryColor: 0x00f0ff,
    glowColor: '#00f0ff',
    modelFile: '/assets/3d/Shadow_Ronin.glb',
    height: 1.98,
    scale: 1.0,
  },
  shinobi: {
    id: 'shinobi',
    name: 'Volt Shinobi',
    title: 'Thunderstrike // Storm Ninja',
    weapon: 'Dual Lightning Kunai',
    primaryColor: 0xffbe0b,
    glowColor: '#ffbe0b',
    modelFile: '/assets/3d/Volt_Shinobi.glb',
    height: 1.98,
    scale: 1.0,
  },
  void: {
    id: 'void',
    name: 'Void Assassin',
    title: 'Shadow Stalker // Rift Stiletto',
    weapon: 'Dual Void Daggers',
    primaryColor: 0xb5179e,
    glowColor: '#b5179e',
    modelFile: '/assets/3d/Void_Assassin.glb',
    height: 1.98,
    scale: 1.0,
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Cyber Valkyrie',
    title: 'Solar Vanguard // Hard-Light Glaive',
    weapon: 'Hard-Light Glaive',
    primaryColor: 0xff0055,
    glowColor: '#ff0055',
    modelFile: '/assets/3d/Cyber_Valkyrie.glb',
    height: 1.98,
    scale: 1.0,
  },
};

export interface FighterBones {
  root?: THREE.Bone;
  hips?: THREE.Bone;
  spine?: THREE.Bone;
  chest?: THREE.Bone;
  neck?: THREE.Bone;
  head?: THREE.Bone;
  shoulderL?: THREE.Bone;
  upperArmL?: THREE.Bone;
  forearmL?: THREE.Bone;
  handL?: THREE.Bone;
  shoulderR?: THREE.Bone;
  upperArmR?: THREE.Bone;
  forearmR?: THREE.Bone;
  handR?: THREE.Bone;
  thighL?: THREE.Bone;
  shinL?: THREE.Bone;
  footL?: THREE.Bone;
  thighR?: THREE.Bone;
  shinR?: THREE.Bone;
  footR?: THREE.Bone;
}

/**
 * Procedural 3D Skinned Martial Fighter Controller for KeyFury
 * Articulates all 20 humanoid skeleton bones procedurally:
 * - Natural walking strides & map-specific dynamic entrances
 * - Character-specific martial ready combat guards (Katana, Dual Kunai, Dual Daggers, Glaive)
 * - Reactive micro-advance twitch & aura pulse on typing keystrokes
 * - Explosive forward-lunging jabs with weapon thrust extension
 * - Athletic roundhouse snap kicks with knee chamber & horizontal shin whip
 * - Airborne leaping overhead heavy weapon slams
 * - Stagger / flinch hit reactions
 * - Knockout collapse & triumphant victory stances
 * - Authentic Blender LookDev PBR rendering with glowing cyber conduits
 */
export class Character3DFighter {
  public group: THREE.Group;
  public profile: CharacterProfile;
  public side: 'left' | 'right';
  public targetX: number;
  public baseY: number = 0;
  public baseZ: number = 0;

  public meshObject: THREE.Object3D | null = null;
  public bones: FighterBones = {};
  public restQuats: Map<string, THREE.Quaternion> = new Map();

  // Signature weapon sockets attached to hand bones
  public socketWeaponR: THREE.Group = new THREE.Group();
  public socketWeaponL: THREE.Group = new THREE.Group();
  public weaponMaterials: THREE.MeshStandardMaterial[] = [];
  public baseWeaponEmissiveIntensities: number[] = [];

  // Dedicated cyber-boot sockets attached to foot bones
  public socketBootR: THREE.Group = new THREE.Group();
  public socketBootL: THREE.Group = new THREE.Group();
  public bootMaterials: THREE.MeshStandardMaterial[] = [];
  public baseBootEmissiveIntensities: number[] = [];

  private state: CombatState = 'entrance';
  private stateTimer: number = 0;
  private stateDuration: number = 0;
  private entranceProgress: number = 0;
  private entranceMapId: string = 'cyber_rooftop';
  private keystrokeTimer: number = 0;
  private hitFlashTimer: number = 0;
  private hitFlashDuration: number = 0.16;

  // Visual effects attached to fighter
  private glowLight: THREE.PointLight;

  // Kinematic offsets for whole-body lunges and stepping
  public facingSign: number; // +1 if facing right (+X), -1 if facing left (-X)
  private lungeOffset: number = 0;
  private verticalBob: number = 0;
  private rotationSway: number = 0;
  private pitchTilt: number = 0;

  // Physical contact dynamics: knockback recoil on hit + typing advance
  private recoilOffset: number = 0;  // backward push on hit, recovers via spring
  private recoilVelocity: number = 0;
  private typingAdvance: number = 0; // cumulative forward creep from keystrokes

  constructor(charId: string, side: 'left' | 'right', loader: GLTFLoader, onLoaded?: () => void) {
    const resolved = resolveCharacterId(charId);
    this.profile = CHARACTER_PROFILES[resolved] || CHARACTER_PROFILES.ronin;
    this.side = side;
    this.facingSign = side === 'left' ? 1 : -1;
    // ponytail: 3.0m apart (was 3.5m) so lunging strikes visually connect
    this.targetX = side === 'left' ? -1.50 : 1.50;

    this.group = new THREE.Group();
    this.group.name = `Fighter_${side}_${this.profile.id}`;

    // Initialize weapon socket groups with identity metadata
    this.socketWeaponR.name = 'socketWeaponR';
    this.socketWeaponL.name = 'socketWeaponL';
    this.socketWeaponR.userData = {
      socket: 'socketWeaponR',
      hand: 'right',
      archetype: this.profile.id,
      weapon: this.profile.weapon,
    };
    this.socketWeaponL.userData = {
      socket: 'socketWeaponL',
      hand: 'left',
      archetype: this.profile.id,
      weapon: this.profile.weapon,
    };

    // Initialize cyber-boot socket groups with identity metadata
    this.socketBootR.name = 'socketBootR';
    this.socketBootL.name = 'socketBootL';
    this.socketBootR.userData = {
      socket: 'socketBootR',
      foot: 'right',
      archetype: this.profile.id,
    };
    this.socketBootL.userData = {
      socket: 'socketBootL',
      foot: 'left',
      archetype: this.profile.id,
    };

    // Signature point light for elemental signature aura
    this.glowLight = new THREE.PointLight(this.profile.primaryColor, 1.4, 4.5);
    this.glowLight.position.set(0, 1.2, 0.4);
    this.group.add(this.glowLight);

    // Initial position for entrance walk-in from wings
    const startX = side === 'left' ? -6.5 : 6.5;
    this.group.position.set(startX, this.baseY, this.baseZ);
    this.group.rotation.set(0, 0, 0);

    this.loadModel(loader, onLoaded);
  }

  private loadModel(loader: GLTFLoader, onLoaded?: () => void) {
    loader.load(
      this.profile.modelFile,
      (gltf) => {
        this.meshObject = gltf.scene;
        this.meshObject.scale.setScalar(this.profile.scale);

        // Discover and map all 20 humanoid skeleton bones
        this.meshObject.traverse((child) => {
          if ((child as any).isBone) {
            const bone = child as THREE.Bone;
            const n = bone.name;
            const key = n.replace(/[._]/g, '').toLowerCase();
            this.restQuats.set(n, bone.quaternion.clone());

            if (key === 'root') this.bones.root = bone;
            else if (key === 'hips') this.bones.hips = bone;
            else if (key === 'spine') this.bones.spine = bone;
            else if (key === 'chest') this.bones.chest = bone;
            else if (key === 'neck') this.bones.neck = bone;
            else if (key === 'head') this.bones.head = bone;
            else if (key === 'shoulderl') this.bones.shoulderL = bone;
            else if (key === 'upperarml') this.bones.upperArmL = bone;
            else if (key === 'forearml') this.bones.forearmL = bone;
            else if (key === 'handl') this.bones.handL = bone;
            else if (key === 'shoulderr') this.bones.shoulderR = bone;
            else if (key === 'upperarmr') this.bones.upperArmR = bone;
            else if (key === 'forearmr') this.bones.forearmR = bone;
            else if (key === 'handr') this.bones.handR = bone;
            else if (key === 'thighl') this.bones.thighL = bone;
            else if (key === 'shinl') this.bones.shinL = bone;
            else if (key === 'footl') this.bones.footL = bone;
            else if (key === 'thighr') this.bones.thighR = bone;
            else if (key === 'shinr') this.bones.shinR = bone;
            else if (key === 'footr') this.bones.footR = bone;
          }

          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                const stdMat = mat as THREE.MeshStandardMaterial;
                stdMat.depthWrite = true;
                // Authentic Blender Material Preview (LookDev) PBR settings:
                // Ensure dark suits do not turn into silver/chrome tin foil
                if (stdMat.metalness > 0.40) {
                  stdMat.metalness = this.profile.id === 'valkyrie' ? 0.45 : 0.30;
                }
                if (stdMat.roughness < 0.38) {
                  stdMat.roughness = 0.44;
                }
                // Glowing cyber conduit markings
                if (stdMat.emissiveMap) {
                  stdMat.emissiveIntensity = 1.0;
                } else if (stdMat.emissive && (stdMat.emissive.r > 0 || stdMat.emissive.g > 0 || stdMat.emissive.b > 0)) {
                  stdMat.emissiveIntensity = 1.0;
                }
              });
            }
          }
        });

        // Initial orientation: Left faces +X (to the right), Right faces -X (to the left)
        const baseFacing = this.facingSign > 0 ? Math.PI / 2 : -Math.PI / 2;
        this.meshObject.rotation.order = 'YXZ';
        this.meshObject.rotation.y = baseFacing;

        // Attach signature weapon sockets to hand bones
        this.attachWeaponSockets();
        // Attach dedicated cyber-boots and greaves to foot bones
        this.attachBootSockets();

        this.group.add(this.meshObject);
        if (onLoaded) onLoaded();
      },
      undefined,
      (err) => {
        console.error(`Failed to load fighter model ${this.profile.modelFile}:`, err);
        if (onLoaded) onLoaded();
      }
    );
  }

  /**
   * Binds weapon socket groups to hand bones and tracks the Blender mesh's emissive
   * materials for the glow-flare system. The actual weapon geometry is part of the
   * skinned GLB mesh (weighted to hand bones in Blender) — no procedural geometry needed.
   * ponytail: removed ~120 lines of procedural BoxGeometry weapons that duplicated
   * the Blender-modeled weapons already skinned into each GLB.
   */
  public attachWeaponSockets() {
    this.socketWeaponR.clear();
    this.socketWeaponL.clear();
    // ponytail: don't dispose — we now reference the GLB's own materials, not owned ones
    this.weaponMaterials = [];
    this.baseWeaponEmissiveIntensities = [];

    // Socket to hand bones if discovered
    if (this.bones.handR && this.socketWeaponR.parent !== this.bones.handR) {
      this.bones.handR.add(this.socketWeaponR);
    }
    if (this.bones.handL && this.socketWeaponL.parent !== this.bones.handL) {
      this.bones.handL.add(this.socketWeaponL);
    }

    // Track the actual Blender mesh materials for the emissive glow flare system.
    // All 4 character GLBs use emissive textures — we collect every MeshStandardMaterial
    // with an emissiveMap so the attack/keystroke flare multiplier still works.
    if (this.meshObject) {
      this.meshObject.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            const stdMat = mat as THREE.MeshStandardMaterial;
            if (stdMat.isMeshStandardMaterial && (stdMat.emissiveMap || (stdMat.emissive && (stdMat.emissive.r > 0 || stdMat.emissive.g > 0 || stdMat.emissive.b > 0)))) {
              if (!this.weaponMaterials.includes(stdMat)) {
                this.weaponMaterials.push(stdMat);
                this.baseWeaponEmissiveIntensities.push(stdMat.emissiveIntensity);
              }
            }
          });
        }
      });
    }
  }

  /**
   * Attaches clean foot socket attachment nodes to foot bones (socketBootR, socketBootL).
   * Renders the character's authentic rigged skinned boots directly without crude procedural box meshes.
   */
  public attachBootSockets() {
    this.socketBootR.clear();
    this.socketBootL.clear();
    this.bootMaterials.forEach((m) => m.dispose());
    this.bootMaterials = [];
    this.baseBootEmissiveIntensities = [];

    // Socket to foot bones if discovered
    if (this.bones.footR && this.socketBootR.parent !== this.bones.footR) {
      this.bones.footR.add(this.socketBootR);
    }
    if (this.bones.footL && this.socketBootL.parent !== this.bones.footL) {
      this.bones.footL.add(this.socketBootL);
    }
  }

  /**
   * Relative bone rotation.
   * - 'parent' space (for spine, chest, thighs, shins, feet, neck, head):
   *   qDelta * rest (rotates relative to parent bone frame, ensuring pure pitch/yaw/roll)
   * - 'local' space (for arms, forearms, hands):
   *   rest * qDelta (rotates around local bone axes)
   */
  private setBoneRot(boneKey: keyof FighterBones, x: number, y: number, z: number, space: 'parent' | 'local' = 'parent') {
    const bone = this.bones[boneKey];
    if (!bone) return;
    const rest = this.restQuats.get(bone.name);
    if (!rest) return;
    const qDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
    if (space === 'parent') {
      bone.quaternion.copy(qDelta).multiply(rest);
    } else {
      bone.quaternion.copy(rest).multiply(qDelta);
    }
  }

  /**
   * Reset all bones to bind pose
   */
  private resetBones() {
    for (const [_, bone] of Object.entries(this.bones)) {
      if (bone) {
        const rest = this.restQuats.get(bone.name);
        if (rest) bone.quaternion.copy(rest);
      }
    }
  }

  public setEntranceProgress(progress: number, mapId?: string) {
    this.entranceProgress = Math.min(Math.max(progress, 0), 1);
    if (mapId) this.entranceMapId = mapId;

    const startX = this.side === 'left' ? -6.5 : 6.5;
    const currentX = THREE.MathUtils.lerp(startX, this.targetX, this.entranceProgress);
    this.group.position.x = currentX;

    if (this.entranceProgress >= 1.0) {
      this.verticalBob = 0;
      this.rotationSway = 0;
      this.pitchTilt = 0;
      if (this.state === 'entrance') {
        this.state = 'idle';
      }
    }
  }

  public triggerEntranceFlair() {
    this.glowLight.intensity = 3.6;
  }

  public playKeystroke() {
    // Immediate reactive tension twitch & micro-shuffle on letter input
    this.keystrokeTimer = 0.18;
    this.glowLight.intensity = 2.6;
    // ponytail: each keystroke inches the fighter toward the opponent (max 0.45m)
    const maxAdvance = 0.45;
    const step = 0.03;
    const raw = Math.abs(this.typingAdvance) + step;
    this.typingAdvance = Math.min(raw, maxAdvance) * this.facingSign;
  }

  public playJab() {
    this.state = 'jab';
    this.stateTimer = 0;
    this.stateDuration = 0.34;
    this.glowLight.intensity = 2.8;
  }

  public playKick() {
    this.state = 'kick';
    this.stateTimer = 0;
    this.stateDuration = 0.46;
    this.glowLight.intensity = 3.0;
  }

  public playHeavy() {
    this.state = 'heavy';
    this.stateTimer = 0;
    this.stateDuration = 0.68;
    this.glowLight.intensity = 3.5;
  }

  public playWeapon() {
    this.state = 'weapon';
    this.stateTimer = 0;
    this.stateDuration = 0.58;
    this.glowLight.intensity = 4.5;
  }

  public playHitLight() {
    this.state = 'hit_light';
    this.stateTimer = 0;
    this.stateDuration = 0.24;
    this.hitFlashTimer = 0.16;
    this.hitFlashDuration = 0.16;
    this.glowLight.intensity = 4.8;
    // ponytail: physical knockback on hit + reset typing advance
    this.applyKnockback(0.25);
  }

  public playHitHeavy() {
    this.state = 'hit_heavy';
    this.stateTimer = 0;
    this.stateDuration = 0.46;
    this.hitFlashTimer = 0.24;
    this.hitFlashDuration = 0.24;
    this.glowLight.intensity = 6.2;
    this.applyKnockback(0.50);
  }

  /** Push the fighter backward from a hit impact. Recovers via spring in update(). */
  public applyKnockback(amount: number) {
    this.recoilOffset += -amount * this.facingSign;
    this.recoilVelocity = -amount * 2.5 * this.facingSign;
    // Reset typing advance on getting hit — you lose ground
    this.typingAdvance = 0;
  }

  public playKnockout() {
    this.state = 'ko';
    this.stateTimer = 0;
    this.stateDuration = 3.0;
  }

  public playVictory() {
    this.state = 'victory';
    this.stateTimer = 0;
    this.stateDuration = 4.0;
  }

  public update(delta: number, elapsedTotal: number) {
    if (this.stateTimer < this.stateDuration) {
      this.stateTimer += delta;
    }
    if (this.keystrokeTimer > 0) {
      this.keystrokeTimer = Math.max(0, this.keystrokeTimer - delta);
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - delta);
    }
    if (this.state === 'hit_light' || this.state === 'hit_heavy') {
      this.glowLight.intensity = Math.max(1.4, this.glowLight.intensity - delta * 15.0);
    }

    // ponytail: spring decay for knockback recoil — stagger then recover
    if (Math.abs(this.recoilOffset) > 0.001 || Math.abs(this.recoilVelocity) > 0.001) {
      const springK = 12.0;  // stiffness — snappy recovery
      const damping = 8.0;   // prevents oscillation
      const force = -springK * this.recoilOffset - damping * this.recoilVelocity;
      this.recoilVelocity += force * delta;
      this.recoilOffset += this.recoilVelocity * delta;
    } else {
      this.recoilOffset = 0;
      this.recoilVelocity = 0;
    }

    // Ensure sockets are linked to hand bones if dynamically added or re-bound
    if (this.bones.handR && this.socketWeaponR.parent !== this.bones.handR) {
      this.bones.handR.add(this.socketWeaponR);
    }
    if (this.bones.handL && this.socketWeaponL.parent !== this.bones.handL) {
      this.bones.handL.add(this.socketWeaponL);
    }
    // Ensure boot sockets are linked to foot bones if dynamically added or re-bound
    if (this.bones.footR && this.socketBootR.parent !== this.bones.footR) {
      this.bones.footR.add(this.socketBootR);
    }
    if (this.bones.footL && this.socketBootL.parent !== this.bones.footL) {
      this.bones.footL.add(this.socketBootL);
    }

    const p = this.stateDuration > 0 ? Math.min(this.stateTimer / this.stateDuration, 1) : 0;
    this.resetBones();

    switch (this.state) {
      case 'entrance': {
        // Map-specific entrance stride & arrival flair
        const walkFreq = 14.0;
        const phase = this.entranceProgress * walkFreq;
        const stride = Math.sin(phase);

        // Map-specific vertical trajectory (e.g. drop-in on Rooftop / rise on Volcanic / glide on Celestial)
        if (this.entranceMapId === 'cyber_rooftop') {
          const dropHeight = (1 - this.entranceProgress) * (1 - this.entranceProgress) * 2.2;
          this.verticalBob = dropHeight + Math.abs(Math.sin(phase)) * 0.08;
        } else if (this.entranceMapId === 'volcanic_caldera') {
          const moltenEmerge = -Math.max(0, (1 - this.entranceProgress * 1.5) * 0.8);
          this.verticalBob = moltenEmerge + Math.abs(Math.sin(phase)) * 0.08;
        } else if (this.entranceMapId === 'highland_sanctuary') {
          const leapArc = Math.sin(this.entranceProgress * Math.PI) * 0.35;
          this.verticalBob = leapArc + Math.abs(Math.sin(phase)) * 0.09;
        } else {
          this.verticalBob = Math.abs(Math.sin(phase)) * 0.08;
        }

        this.rotationSway = stride * 0.05;
        this.lungeOffset = 0;
        this.pitchTilt = 0.04;

        // Legs stride (-x = forward, +x = backward, +shin x = bend knee back, +/-z = distinct lateral stance width)
        this.setBoneRot('thighR', -stride * 0.60, -0.04, 0.16, 'parent');
        this.setBoneRot('shinR', Math.max(0, -stride) * 0.85, 0, 0, 'parent');
        this.setBoneRot('footR', stride * 0.15, 0, -0.05, 'parent');

        this.setBoneRot('thighL', stride * 0.60, 0.04, -0.16, 'parent');
        this.setBoneRot('shinL', Math.max(0, stride) * 0.85, 0, 0, 'parent');
        this.setBoneRot('footL', -stride * 0.15, 0, 0.05, 'parent');

        // Character-tailored arm carry during arrival
        if (this.profile.id === 'valkyrie') {
          // Valkyrie two-handed glaive carry across chest
          this.setBoneRot('upperArmR', -1.4 + stride * 0.3, -0.2, -0.15, 'local');
          this.setBoneRot('forearmR', 1.2, 0, 0, 'local');
          this.setBoneRot('upperArmL', -1.1 - stride * 0.3, 0.3, 0.25, 'local');
          this.setBoneRot('forearmL', 1.4, 0, 0, 'local');
        } else if (this.profile.id === 'shinobi') {
          // Shinobi dual kunai reverse carry (hands tucked ready)
          this.setBoneRot('upperArmR', -0.9 + stride * 0.4, 0, -0.3, 'local');
          this.setBoneRot('forearmR', 1.4, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.9 - stride * 0.4, 0, 0.3, 'local');
          this.setBoneRot('forearmL', 1.4, 0, 0, 'local');
        } else if (this.profile.id === 'void') {
          // Void dual daggers tight assassin stealth glide
          this.setBoneRot('upperArmR', -1.0 + stride * 0.3, -0.2, -0.2, 'local');
          this.setBoneRot('forearmR', 1.3, 0, 0, 'local');
          this.setBoneRot('upperArmL', -1.0 - stride * 0.3, 0.2, 0.2, 'local');
          this.setBoneRot('forearmL', 1.3, 0, 0, 'local');
        } else {
          // Ronin Iaido Katana carry
          this.setBoneRot('upperArmR', -1.2 + stride * 0.5, -0.3, -0.2, 'local');
          this.setBoneRot('forearmR', 1.0 + Math.max(0, -stride) * 0.3, 0, 0, 'local');
          this.setBoneRot('upperArmL', -1.2 - stride * 0.5, 0.3, 0.2, 'local');
          this.setBoneRot('forearmL', 1.0 + Math.max(0, stride) * 0.3, 0, 0, 'local');
        }

        // Torso balance
        this.setBoneRot('spine', 0.05, stride * 0.06, 0, 'parent');
        this.setBoneRot('chest', 0.04, stride * 0.05, 0, 'parent');
        this.setBoneRot('head', -0.04, -stride * 0.04, 0, 'parent');
        break;
      }

      case 'idle': {
        // Dynamic breathing combat stance with character-specific martial ready guard
        const breath = Math.sin(elapsedTotal * 2.6);
        const twitch = this.keystrokeTimer > 0 ? (this.keystrokeTimer / 0.18) : 0;

        this.verticalBob = breath * 0.018 - twitch * 0.02;
        this.rotationSway = Math.sin(elapsedTotal * 1.0) * 0.01;
        this.pitchTilt = 0;
        // Immediate micro-advance step shuffle when a key is pressed!
        this.lungeOffset = Math.sin(twitch * Math.PI) * 0.15 * this.facingSign;

        // Spine and head alertly leveled towards opponent
        this.setBoneRot('spine', breath * 0.015 + twitch * 0.04, 0, 0, 'parent');
        this.setBoneRot('chest', breath * 0.02 + twitch * 0.05, 0, 0, 'parent');
        this.setBoneRot('head', -twitch * 0.03, 0, 0, 'parent');

        // Character Archetype Specific Combat Guards:
        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie: Two-handed heavy glaive vanguard guard
          this.setBoneRot('upperArmR', -1.35 - breath * 0.03 - twitch * 0.25, -0.2, -0.15, 'local');
          this.setBoneRot('forearmR', 1.45 - twitch * 0.15, 0, 0, 'local');
          this.setBoneRot('handR', 0.15, 0, 0, 'local');

          this.setBoneRot('upperArmL', -1.25 + breath * 0.02, 0.25, 0.25, 'local');
          this.setBoneRot('forearmL', 1.50, 0, 0, 'local');
          this.setBoneRot('handL', 0.15, 0, 0, 'local');

          // Wide anchored stance with clear leg separation
          this.setBoneRot('thighR', -0.28 - twitch * 0.06, -0.06, 0.18, 'parent');
          this.setBoneRot('shinR', 0.38 + twitch * 0.04, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - twitch * 0.04, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.24 + twitch * 0.03, 0.06, -0.18, 'parent');
          this.setBoneRot('shinL', 0.30, 0, 0, 'parent');
          this.setBoneRot('footL', -0.08, 0, 0.05, 'parent');
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi: Low agility crouch with reverse-grip kunai
          this.setBoneRot('upperArmR', -1.05 - twitch * 0.25, 0, -0.25, 'local');
          this.setBoneRot('forearmR', 1.55 - twitch * 0.15, 0, 0, 'local');
          this.setBoneRot('handR', -0.2, 0, 0, 'local');

          this.setBoneRot('upperArmL', -1.05, 0, 0.25, 'local');
          this.setBoneRot('forearmL', 1.55, 0, 0, 'local');
          this.setBoneRot('handL', -0.2, 0, 0, 'local');

          // Low agile ninja foot stance with clear leg separation
          this.setBoneRot('thighR', -0.30 - twitch * 0.06, -0.06, 0.18, 'parent');
          this.setBoneRot('shinR', 0.42 + twitch * 0.04, 0, 0, 'parent');
          this.setBoneRot('footR', -0.12 - twitch * 0.04, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.26 + twitch * 0.03, 0.06, -0.18, 'parent');
          this.setBoneRot('shinL', 0.34, 0, 0, 'parent');
          this.setBoneRot('footL', -0.08, 0, 0.05, 'parent');
        } else if (this.profile.id === 'void') {
          // Void Assassin: Dual dagger stiletto forward cross-guard
          this.setBoneRot('upperArmR', -1.20 - twitch * 0.25, -0.15, -0.15, 'local');
          this.setBoneRot('forearmR', 1.40 - twitch * 0.15, 0, 0, 'local');
          this.setBoneRot('upperArmL', -1.20, 0.15, 0.15, 'local');
          this.setBoneRot('forearmL', 1.40, 0, 0, 'local');

          // Clean poise with distinct leg separation
          this.setBoneRot('thighR', -0.24 - twitch * 0.06, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.34 + twitch * 0.04, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - twitch * 0.04, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.20 + twitch * 0.03, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.26, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06, 0, 0.05, 'parent');
        } else {
          // Shadow Ronin: Iaido Katana guard (lead weapon hand raised, offhand protecting vitals)
          this.setBoneRot('upperArmR', -1.15 - breath * 0.03 - twitch * 0.25, 0, -0.15, 'local');
          this.setBoneRot('forearmR', 1.35 - twitch * 0.15, 0, 0, 'local');
          this.setBoneRot('handR', 0.1, 0, 0, 'local');

          this.setBoneRot('upperArmL', -1.15 + breath * 0.02, 0, 0.15, 'local');
          this.setBoneRot('forearmL', 1.35, 0, 0, 'local');
          this.setBoneRot('handL', 0.1, 0, 0, 'local');

          // Athletic martial stance with clear leg separation
          this.setBoneRot('thighR', -0.26 - twitch * 0.06, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36 + twitch * 0.04, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - twitch * 0.04, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22 + twitch * 0.03, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06, 0, 0.05, 'parent');
        }

        // Signature aura pulse with typing reaction flare
        this.glowLight.intensity = (1.3 + Math.sin(elapsedTotal * 3.0) * 0.25) + (twitch * 1.8);
        break;
      }

      case 'jab': {
        // Deep explosive forward lunge (+1.35m), clavicle thrust, full straight weapon arm extension
        if (p < 0.35) {
          const t = p / 0.35;
          const easeIn = Math.sin(t * Math.PI * 0.5);
          this.lungeOffset = easeIn * 1.35 * this.facingSign;
          this.verticalBob = -0.03 * easeIn;
          this.pitchTilt = 0.05 * easeIn;

          // Torso twists into the strike
          this.setBoneRot('spine', 0.04 * easeIn, easeIn * 0.28, 0, 'parent');
          this.setBoneRot('chest', 0.06 * easeIn, easeIn * 0.22, 0, 'parent');
          this.setBoneRot('head', 0, -easeIn * 0.15, 0, 'parent');

          // Weapon arm drives straight forward into full 100% extension!
          this.setBoneRot('shoulderR', 0.10 * easeIn, 0, 0, 'parent');
          this.setBoneRot('upperArmR', -1.15 - easeIn * 0.30, 0, -0.15 + easeIn * 0.05, 'local');
          this.setBoneRot('forearmR', 1.35 - easeIn * 1.15, 0, 0, 'local');
          this.setBoneRot('handR', easeIn * 0.25, 0, 0, 'local');

          // Rear guard held tight
          this.setBoneRot('upperArmL', -1.10, 0, 0.20, 'local');
          this.setBoneRot('forearmL', 1.45, 0, 0, 'local');

          // Driving footwork with distinct lateral separation
          this.setBoneRot('thighR', -0.26 - easeIn * 0.40, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36 + easeIn * 0.40, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - easeIn * 0.10, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22 + easeIn * 0.30, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06 - easeIn * 0.06, 0, 0.05, 'parent');
        } else {
          // Swift snappy recovery back to combat guard
          const t = (p - 0.35) / 0.65;
          const rev = 1 - t;
          this.lungeOffset = rev * 1.35 * this.facingSign;
          this.verticalBob = -0.03 * rev;
          this.pitchTilt = 0.05 * rev;

          this.setBoneRot('spine', 0.04 * rev, rev * 0.28, 0, 'parent');
          this.setBoneRot('chest', 0.06 * rev, rev * 0.22, 0, 'parent');

          this.setBoneRot('upperArmR', -1.15 - rev * 0.30, 0, -0.15 + rev * 0.05, 'local');
          this.setBoneRot('forearmR', 1.35 - rev * 1.15, 0, 0, 'local');

          this.setBoneRot('upperArmL', -1.15, 0, 0.15, 'local');
          this.setBoneRot('forearmL', 1.35, 0, 0, 'local');

          this.setBoneRot('thighR', -0.26 - rev * 0.40, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36 + rev * 0.40, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - rev * 0.10, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06 - rev * 0.06, 0, 0.05, 'parent');
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'kick': {
        // High roundhouse kick: knee chamber, violent shin whip (+1.40m), foot pointed
        if (p < 0.26) {
          // Chamber: knee drives high up toward chest
          const t = p / 0.26;
          this.lungeOffset = Math.sin(t * Math.PI * 0.5) * 0.70 * this.facingSign;
          this.verticalBob = t * 0.12;

          this.setBoneRot('thighR', -0.26 - t * 1.25, 0, 0.20 * t, 'parent');
          this.setBoneRot('shinR', 0.36 + t * 1.25, 0, 0, 'parent');
          this.setBoneRot('footR', -0.30 * t, 0, 0, 'parent');

          this.setBoneRot('thighL', 0.22 + 0.12 * t, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28 + 0.12 * t, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06 - 0.04 * t, 0, 0.05, 'parent');

          // Counter-balance torso lean
          this.setBoneRot('spine', -0.15 * t, -0.20 * t, 0.12 * t, 'parent');
          this.setBoneRot('upperArmR', -1.0, 0, -0.3 * t, 'local');
          this.setBoneRot('upperArmL', -1.0, 0, 0.3 * t, 'local');
        } else if (p < 0.60) {
          // Violent snap extension of shin and foot forward
          const t = (p - 0.26) / 0.34;
          const strikeExt = Math.sin(t * Math.PI);
          this.lungeOffset = (0.70 + strikeExt * 0.70) * this.facingSign;
          this.verticalBob = 0.12 + strikeExt * 0.04;

          // Leg extends straight out horizontal into opponent!
          this.setBoneRot('thighR', -1.50 - strikeExt * 0.12, 0, 0.20, 'parent');
          this.setBoneRot('shinR', 1.57 - 1.47 * Math.sin(t * Math.PI * 0.5), 0, 0, 'parent');
          this.setBoneRot('footR', -0.40, 0, 0, 'parent');

          this.setBoneRot('thighL', 0.30, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.34, 0, 0, 'parent');
          this.setBoneRot('footL', -0.08, 0, 0.05, 'parent');

          this.setBoneRot('spine', -0.20, -0.28, 0.18, 'parent');
          this.setBoneRot('upperArmR', -0.7, 0, -0.4, 'local');
          this.setBoneRot('upperArmL', -1.2, 0, 0.4, 'local');
        } else {
          // Smooth athletic recovery back to ground
          const t = (p - 0.60) / 0.40;
          const rev = 1 - t;
          this.lungeOffset = rev * 0.85 * this.facingSign;
          this.verticalBob = rev * 0.06;

          this.setBoneRot('thighR', -0.26 - rev * 0.80, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36 + rev * 0.50, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - rev * 0.10, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06, 0, 0.05, 'parent');
          this.setBoneRot('spine', -0.12 * rev, 0, 0, 'parent');
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'heavy': {
        // Dramatic two-handed overhead weapon raise, leap, and crushing downward vertical cleave (+1.65m)
        if (p < 0.30) {
          // Windup: arms raise high above head, spine arches back
          const t = p / 0.30;
          this.lungeOffset = -0.25 * t * this.facingSign;
          this.verticalBob = 0.32 * t;
          this.pitchTilt = -0.12 * t;

          // Both arms raise high overhead holding weapon
          this.setBoneRot('upperArmR', -1.15 - 0.55 * t, 0, -0.15 - 0.05 * t, 'local');
          this.setBoneRot('forearmR', 1.35 - 0.85 * t, 0, 0, 'local');
          this.setBoneRot('upperArmL', -1.15 - 0.55 * t, 0, 0.15 + 0.05 * t, 'local');
          this.setBoneRot('forearmL', 1.35 - 0.85 * t, 0, 0, 'local');

          this.setBoneRot('spine', -0.25 * t, 0, 0, 'parent');
          this.setBoneRot('chest', -0.20 * t, 0, 0, 'parent');
          this.setBoneRot('head', -0.12 * t, 0, 0, 'parent');

          this.setBoneRot('thighR', -0.26 - 0.20 * t, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36 + 0.35 * t, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - 0.35 * t, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06 - 0.25 * t, 0, 0.05, 'parent');
        } else if (p < 0.65) {
          // Crushing downward cleave with violent forward momentum (+1.65m)
          const t = (p - 0.30) / 0.35;
          const slamFactor = Math.sin(t * Math.PI * 0.5);
          this.lungeOffset = (-0.25 + 1.90 * slamFactor) * this.facingSign;
          this.verticalBob = (0.32 * (1 - t)) - (0.10 * Math.sin(t * Math.PI));
          this.pitchTilt = 0.18 * slamFactor;

          // Arms chop down violently
          this.setBoneRot('upperArmR', -1.70 + 1.15 * slamFactor, 0, 0, 'local');
          this.setBoneRot('forearmR', 0.50 - 0.30 * slamFactor, 0, 0, 'local');
          this.setBoneRot('upperArmL', -1.70 + 1.15 * slamFactor, 0, 0, 'local');
          this.setBoneRot('forearmL', 0.50 - 0.30 * slamFactor, 0, 0, 'local');

          this.setBoneRot('spine', -0.25 + 0.55 * slamFactor, 0, 0, 'parent');
          this.setBoneRot('chest', -0.20 + 0.45 * slamFactor, 0, 0, 'parent');
          this.setBoneRot('head', 0.20 * slamFactor, 0, 0, 'parent');

          this.setBoneRot('thighR', -0.26 + 0.30 * slamFactor, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36 - 0.20 * slamFactor, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 + 0.20 * slamFactor, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.08, 0, 0.05, 'parent');
        } else {
          // Recovery from ground impact
          const t = (p - 0.65) / 0.35;
          const rev = 1 - t;
          this.lungeOffset = 1.65 * rev * this.facingSign;
          this.verticalBob = rev * -0.05;
          this.pitchTilt = rev * 0.10;

          this.setBoneRot('upperArmR', -0.55 * rev - 1.15 * (1 - rev), 0, -0.15, 'local');
          this.setBoneRot('forearmR', 0.20 * rev + 1.35 * (1 - rev), 0, 0, 'local');
          this.setBoneRot('spine', 0.30 * rev, 0, 0, 'parent');
          this.setBoneRot('thighR', -0.26, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 * rev, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06 * rev, 0, 0.05, 'parent');
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'weapon': {
        // High-velocity signature weapon slash / energy release (+1.75m physical reach)
        if (p < 0.28) {
          // Windup & forward surge
          const t = p / 0.28;
          const surge = Math.sin(t * Math.PI * 0.5);
          this.lungeOffset = surge * 1.75 * this.facingSign;
          this.verticalBob = 0.08 * Math.sin(t * Math.PI);
          this.pitchTilt = 0.12 * surge;

          // Torso & head aggressively drives into opponent
          this.setBoneRot('spine', 0.06 * surge, surge * 0.35 * this.facingSign, 0, 'parent');
          this.setBoneRot('chest', 0.08 * surge, surge * 0.30 * this.facingSign, 0, 'parent');
          this.setBoneRot('head', -0.04, -surge * 0.20 * this.facingSign, 0, 'parent');

          // Weapon arm executes powerful slashing extension
          this.setBoneRot('shoulderR', 0.15 * surge, 0, 0, 'parent');
          this.setBoneRot('upperArmR', -1.35 + surge * 0.85, 0, -0.20 + surge * 0.15, 'local');
          this.setBoneRot('forearmR', 1.20 - surge * 0.95, 0, 0, 'local');
          this.setBoneRot('handR', surge * 0.35, 0, 0, 'local');

          // Offhand balance
          this.setBoneRot('upperArmL', -0.90 - surge * 0.40, 0, 0.30, 'local');
          this.setBoneRot('forearmL', 1.30, 0, 0, 'local');

          // Dynamic martial foot drive
          this.setBoneRot('thighR', -0.26 - surge * 0.50, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36 + surge * 0.50, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - surge * 0.10, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22 + surge * 0.40, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06 - surge * 0.06, 0, 0.05, 'parent');
        } else if (p < 0.65) {
          // Sustained weapon strike impact & full follow-through
          const t = (p - 0.28) / 0.37;
          this.lungeOffset = (1.75 - t * 0.20) * this.facingSign;
          this.verticalBob = 0.02 * (1 - t);
          this.pitchTilt = 0.10 * (1 - t);

          this.setBoneRot('spine', 0.06, 0.35 * this.facingSign, 0, 'parent');
          this.setBoneRot('chest', 0.08, 0.30 * this.facingSign, 0, 'parent');
          this.setBoneRot('upperArmR', -0.50 + t * 0.15, 0, -0.05, 'local');
          this.setBoneRot('forearmR', 0.25 + t * 0.35, 0, 0, 'local');
        } else {
          // Fluid tactical recovery back to stance
          const t = (p - 0.65) / 0.35;
          const rev = 1 - t;
          this.lungeOffset = 1.55 * rev * this.facingSign;
          this.verticalBob = 0;
          this.pitchTilt = 0;

          this.setBoneRot('spine', 0.06 * rev, 0.35 * rev * this.facingSign, 0, 'parent');
          this.setBoneRot('upperArmR', -0.35 * rev - 1.15 * (1 - rev), 0, -0.15, 'local');
          this.setBoneRot('forearmR', 0.60 * rev + 1.35 * (1 - rev), 0, 0, 'local');
          this.setBoneRot('thighR', -0.26, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.36, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06, 0, 0.05, 'parent');
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'hit_light': {
        // Flinch: head snaps backward, torso recoils, arms absorb shock
        const t = Math.sin(p * Math.PI);
        this.lungeOffset = -0.45 * t * this.facingSign;
        this.pitchTilt = -0.10 * t;

        this.setBoneRot('head', -0.30 * t, 0, 0, 'parent');
        this.setBoneRot('neck', -0.18 * t, 0, 0, 'parent');
        this.setBoneRot('chest', -0.16 * t, 0, 0, 'parent');
        this.setBoneRot('spine', -0.14 * t, 0, 0, 'parent');

        this.setBoneRot('upperArmR', -1.15 + 0.35 * t, 0, -0.25 * t, 'local');
        this.setBoneRot('upperArmL', -1.15 + 0.35 * t, 0, 0.25 * t, 'local');
        this.setBoneRot('thighR', -0.26 + 0.20 * t, -0.05, 0.16, 'parent');
        this.setBoneRot('shinR', 0.36, 0, 0, 'parent');
        this.setBoneRot('footR', -0.10 - 0.20 * t, 0, -0.05, 'parent');
        this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
        this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
        this.setBoneRot('footL', -0.06, 0, 0.05, 'parent');

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'hit_heavy': {
        // Heavy stagger: head whips back, chest arches, lead leg stumbles
        const t = Math.sin(p * Math.PI * 0.85);
        this.lungeOffset = -0.95 * t * this.facingSign;
        this.pitchTilt = -0.18 * t;
        this.verticalBob = -0.06 * t;

        this.setBoneRot('head', -0.60 * t, 0.20 * t * this.facingSign, 0, 'parent');
        this.setBoneRot('neck', -0.35 * t, 0.12 * t * this.facingSign, 0, 'parent');
        this.setBoneRot('chest', -0.32 * t, 0, 0, 'parent');
        this.setBoneRot('spine', -0.28 * t, 0, 0, 'parent');

        this.setBoneRot('upperArmR', -1.15 + 0.65 * t, 0, -0.35 * t, 'local');
        this.setBoneRot('upperArmL', -1.15 + 0.65 * t, 0, 0.35 * t, 'local');
        this.setBoneRot('thighR', -0.26 + 0.35 * t, -0.05, 0.16, 'parent');
        this.setBoneRot('shinR', 0.36 + 0.25 * t, 0, 0, 'parent');
        this.setBoneRot('footR', -0.10 - 0.25 * t, 0, -0.05, 'parent');
        this.setBoneRot('thighL', 0.22 - 0.15 * t, 0.05, -0.16, 'parent');
        this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
        this.setBoneRot('footL', -0.06 - 0.20 * t, 0, 0.05, 'parent');

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'ko': {
        // Total collapse: knees buckle, spine folds, fighter falls to canvas
        const t = Math.min(p * 1.5, 1);
        this.lungeOffset = -1.1 * t * this.facingSign;
        this.verticalBob = -0.95 * t;
        this.pitchTilt = -Math.PI / 2.1 * t;

        this.setBoneRot('thighR', -0.80 * t, 0, 0, 'parent');
        this.setBoneRot('shinR', 1.35 * t, 0, 0, 'parent');
        this.setBoneRot('footR', 0.50 * t, 0, 0, 'parent');
        this.setBoneRot('thighL', -0.80 * t, 0, 0, 'parent');
        this.setBoneRot('shinL', 1.35 * t, 0, 0, 'parent');
        this.setBoneRot('footL', 0.50 * t, 0, 0, 'parent');

        this.setBoneRot('spine', 0.45 * t, 0, 0, 'parent');
        this.setBoneRot('chest', 0.35 * t, 0, 0, 'parent');
        this.setBoneRot('head', 0.50 * t, 0, 0, 'parent');

        this.setBoneRot('upperArmR', 0.4 * t, 0, -0.6 * t, 'local');
        this.setBoneRot('upperArmL', 0.4 * t, 0, 0.6 * t, 'local');
        break;
      }

      case 'victory': {
        // Triumphant victory stance: weapon raised to the skies
        this.lungeOffset = 0.25 * this.facingSign;
        this.verticalBob = 0.04 + Math.sin(elapsedTotal * 2.0) * 0.02;
        this.pitchTilt = 0;

        // Lead weapon raised high in salute
        this.setBoneRot('upperArmR', -1.65, 0, -0.15, 'local');
        this.setBoneRot('forearmR', 0.30, 0, 0, 'local');

        // Offhand on hip
        this.setBoneRot('upperArmL', -0.6, 0.4, 0.35, 'local');
        this.setBoneRot('forearmL', 1.2, 0, 0, 'local');

        this.setBoneRot('chest', -0.12, 0, 0, 'parent');
        this.setBoneRot('head', -0.15, 0, 0, 'parent');
        this.setBoneRot('footR', -0.10, 0, -0.05, 'parent');
        this.setBoneRot('footL', -0.06, 0, 0.05, 'parent');
        this.glowLight.intensity = 2.8 + Math.sin(elapsedTotal * 4.0) * 0.8;
        break;
      }
    }

    // Synchronize weapon signature aura flares with typing micro-lunges and attack states
    if (this.weaponMaterials.length > 0) {
      if (this.state === 'ko') {
        const koFactor = Math.max(0, 1 - (this.stateTimer / 1.5));
        for (let i = 0; i < this.weaponMaterials.length; i++) {
          const base = this.baseWeaponEmissiveIntensities[i] ?? 1.0;
          this.weaponMaterials[i].emissiveIntensity = base * 0.15 * koFactor;
        }
      } else {
        const isAttacking = this.state === 'jab' || this.state === 'kick' || this.state === 'heavy';
        const attackBoost = isAttacking ? 0.6 : 0;
        const twitchBoost = this.keystrokeTimer > 0 ? (this.keystrokeTimer / 0.18) * 0.75 : 0;
        const hitBoost = this.hitFlashTimer > 0 ? (this.hitFlashTimer / this.hitFlashDuration) * 2.8 : 0;
        const flareMultiplier = 1.0 + twitchBoost + attackBoost + hitBoost;

        for (let i = 0; i < this.weaponMaterials.length; i++) {
          const base = this.baseWeaponEmissiveIntensities[i] ?? 1.0;
          this.weaponMaterials[i].emissiveIntensity = base * flareMultiplier;
        }
      }
    }

    // Synchronize cyber-boot neon energy treads with typing micro-lunges, kicks, and attacks
    if (this.bootMaterials.length > 0) {
      if (this.state === 'ko') {
        const koFactor = Math.max(0, 1 - (this.stateTimer / 1.5));
        for (let i = 0; i < this.bootMaterials.length; i++) {
          const base = this.baseBootEmissiveIntensities[i] ?? 1.0;
          this.bootMaterials[i].emissiveIntensity = base * 0.15 * koFactor;
        }
      } else {
        const isAttacking = this.state === 'jab' || this.state === 'kick' || this.state === 'heavy';
        const isKick = this.state === 'kick';
        const kickBoost = isKick ? 1.8 : 0;
        const attackBoost = isAttacking ? 0.6 : 0;
        const twitchBoost = this.keystrokeTimer > 0 ? (this.keystrokeTimer / 0.18) * 0.75 : 0;
        const hitBoost = this.hitFlashTimer > 0 ? (this.hitFlashTimer / this.hitFlashDuration) * 2.8 : 0;
        const flareMultiplier = 1.0 + twitchBoost + attackBoost + kickBoost + hitBoost;

        for (let i = 0; i < this.bootMaterials.length; i++) {
          const base = this.baseBootEmissiveIntensities[i] ?? 1.0;
          this.bootMaterials[i].emissiveIntensity = base * flareMultiplier;
        }
      }
    }

    // Apply accumulated lunge translation and posture to mesh
    if (this.meshObject) {
      // Attack lunges are local to the mesh (snap back after animation)
      this.meshObject.position.x = this.lungeOffset;
      this.meshObject.position.y = this.verticalBob;
      this.meshObject.rotation.order = 'YXZ';
      this.meshObject.rotation.x = this.pitchTilt;
      this.meshObject.rotation.z = 0;
      // Facing: Left faces +X (+Math.PI / 2), Right faces -X (-Math.PI / 2)
      const baseFacing = this.facingSign > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.meshObject.rotation.y = baseFacing + this.rotationSway;
    }

    // ponytail: persistent world offsets — typing advance + knockback recoil
    // applied to the group (not the mesh) so they persist across animations
    // Skip during entrance — setEntranceProgress() drives group.position.x then
    if (this.state !== 'entrance') {
      this.group.position.x = this.targetX + this.recoilOffset + this.typingAdvance;
    }
  }

  public getState(): CombatState {
    return this.state;
  }

  /**
   * Computes dynamic 3D world anchor and bounds for this character's feet/legs.
   * Leverages real skeleton foot bone geometry when available, falling back gracefully
   * to character group world coordinates and profile dimensions.
   */
  public getLegWorldBounds(): {
    anchorX: number;
    anchorY: number;
    anchorZ: number;
    lowestY: number;
    footSeparation: number;
  } {
    const footLPos = new THREE.Vector3();
    const footRPos = new THREE.Vector3();
    let hasBones = false;

    if (this.bones.footL && this.bones.footR) {
      this.bones.footL.getWorldPosition(footLPos);
      this.bones.footR.getWorldPosition(footRPos);
      hasBones = true;
    } else if (this.bones.footL) {
      this.bones.footL.getWorldPosition(footLPos);
      footRPos.copy(footLPos);
      hasBones = true;
    } else if (this.bones.footR) {
      this.bones.footR.getWorldPosition(footRPos);
      footLPos.copy(footRPos);
      hasBones = true;
    }

    if (hasBones) {
      const anchorX = (footLPos.x + footRPos.x) / 2;
      const lowestY = Math.min(footLPos.y, footRPos.y);
      const anchorZ = (footLPos.z + footRPos.z) / 2;
      const footSeparation = Math.abs(footLPos.x - footRPos.x);
      return {
        anchorX,
        anchorY: lowestY,
        anchorZ,
        lowestY,
        footSeparation: footSeparation > 0.05 ? footSeparation : 0.6,
      };
    }

    // Fallback if skeleton is not yet loaded
    const groupPos = new THREE.Vector3();
    this.group.getWorldPosition(groupPos);
    const meshX = this.meshObject ? this.meshObject.position.x : 0;
    return {
      anchorX: groupPos.x + meshX,
      anchorY: this.baseY,
      anchorZ: groupPos.z,
      lowestY: this.baseY,
      footSeparation: 0.6,
    };
  }

  public dispose() {
    // ponytail: don't dispose weaponMaterials — they're the GLB's own materials now
    this.weaponMaterials = [];
    this.baseWeaponEmissiveIntensities = [];
    this.bootMaterials = [];
    this.baseBootEmissiveIntensities = [];
    this.socketWeaponR.clear();
    this.socketWeaponL.clear();
    this.socketBootR.clear();
    this.socketBootL.clear();
    this.group.clear();
  }
}
