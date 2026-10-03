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

  // Combo sequence tracking across rapid strikes
  private comboStep: number = 0;
  private comboResetTimer: number = 0;

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
    this.glowLight.intensity = this.profile.id === 'valkyrie' ? 2.8 : this.profile.id === 'shinobi' ? 3.0 : 2.6;
    // ponytail: each keystroke inches the fighter toward the opponent (max 0.45m)
    const maxAdvance = 0.45;
    const step = this.profile.id === 'shinobi' ? 0.035 : this.profile.id === 'valkyrie' ? 0.025 : 0.03;
    const raw = Math.abs(this.typingAdvance) + step;
    this.typingAdvance = Math.min(raw, maxAdvance) * this.facingSign;
  }

  public playJab() {
    this.state = 'jab';
    this.stateTimer = 0;
    // Character-specific attack durations
    if (this.profile.id === 'shinobi') this.stateDuration = 0.30;
    else if (this.profile.id === 'valkyrie') this.stateDuration = 0.38;
    else if (this.profile.id === 'void') this.stateDuration = 0.34;
    else this.stateDuration = 0.34;

    this.comboStep = (this.comboStep + 1) % 3;
    this.comboResetTimer = 1.0;
    this.glowLight.intensity = 2.8;
  }

  public playKick() {
    this.state = 'kick';
    this.stateTimer = 0;
    if (this.profile.id === 'shinobi') this.stateDuration = 0.44;
    else if (this.profile.id === 'valkyrie') this.stateDuration = 0.48;
    else if (this.profile.id === 'void') this.stateDuration = 0.46;
    else this.stateDuration = 0.42;

    this.comboResetTimer = 1.0;
    this.glowLight.intensity = 3.0;
  }

  public playHeavy() {
    this.state = 'heavy';
    this.stateTimer = 0;
    if (this.profile.id === 'shinobi') this.stateDuration = 0.60;
    else if (this.profile.id === 'valkyrie') this.stateDuration = 0.72;
    else if (this.profile.id === 'void') this.stateDuration = 0.66;
    else this.stateDuration = 0.66;

    this.comboResetTimer = 1.0;
    this.glowLight.intensity = 3.5;
  }

  public playWeapon() {
    this.state = 'weapon';
    this.stateTimer = 0;
    if (this.profile.id === 'shinobi') this.stateDuration = 0.54;
    else if (this.profile.id === 'valkyrie') this.stateDuration = 0.70;
    else if (this.profile.id === 'void') this.stateDuration = 0.64;
    else this.stateDuration = 0.60;

    this.comboResetTimer = 1.0;
    this.glowLight.intensity = 4.5;
  }

  public playHitLight() {
    this.state = 'hit_light';
    this.stateTimer = 0;
    if (this.profile.id === 'shinobi') this.stateDuration = 0.20;
    else if (this.profile.id === 'valkyrie') this.stateDuration = 0.26;
    else if (this.profile.id === 'void') this.stateDuration = 0.22;
    else this.stateDuration = 0.24;

    this.hitFlashTimer = 0.16;
    this.hitFlashDuration = 0.16;
    this.glowLight.intensity = 4.8;
    const kb = this.profile.id === 'valkyrie' ? 0.20 : this.profile.id === 'shinobi' ? 0.30 : 0.25;
    this.applyKnockback(kb);
  }

  public playHitHeavy() {
    this.state = 'hit_heavy';
    this.stateTimer = 0;
    if (this.profile.id === 'shinobi') this.stateDuration = 0.42;
    else if (this.profile.id === 'valkyrie') this.stateDuration = 0.50;
    else if (this.profile.id === 'void') this.stateDuration = 0.46;
    else this.stateDuration = 0.46;

    this.hitFlashTimer = 0.24;
    this.hitFlashDuration = 0.24;
    this.glowLight.intensity = 6.2;
    const kb = this.profile.id === 'valkyrie' ? 0.40 : this.profile.id === 'shinobi' ? 0.60 : 0.50;
    this.applyKnockback(kb);
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

  public getComboStep(): number {
    return this.comboStep;
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
    if (this.comboResetTimer > 0) {
      this.comboResetTimer = Math.max(0, this.comboResetTimer - delta);
      if (this.comboResetTimer === 0) {
        this.comboStep = 0;
      }
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
          // Volcanic platform surface stride on solid rock floor — feet stay strictly above ground
          this.verticalBob = Math.abs(Math.sin(phase)) * 0.08;
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
          this.setBoneRot('upperArmR', -0.60 + stride * 0.20, -0.15, -0.15, 'local');
          this.setBoneRot('forearmR', 0.70, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.50 - stride * 0.20, 0.15, 0.20, 'local');
          this.setBoneRot('forearmL', 0.70, 0, 0, 'local');
        } else if (this.profile.id === 'shinobi') {
          // Shinobi dual kunai reverse carry (hands tucked ready)
          this.setBoneRot('upperArmR', -0.40 + stride * 0.20, 0, -0.20, 'local');
          this.setBoneRot('forearmR', 0.60, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.40 - stride * 0.20, 0, 0.20, 'local');
          this.setBoneRot('forearmL', 0.60, 0, 0, 'local');
        } else if (this.profile.id === 'void') {
          // Void dual daggers tight assassin stealth glide
          this.setBoneRot('upperArmR', -0.45 + stride * 0.20, -0.10, -0.15, 'local');
          this.setBoneRot('forearmR', 0.55, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.45 - stride * 0.20, 0.10, 0.15, 'local');
          this.setBoneRot('forearmL', 0.55, 0, 0, 'local');
        } else {
          // Ronin Iaido Katana carry
          this.setBoneRot('upperArmR', -0.50 + stride * 0.25, -0.15, -0.15, 'local');
          this.setBoneRot('forearmR', 0.65 + Math.max(0, -stride) * 0.15, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.50 - stride * 0.25, 0.15, 0.15, 'local');
          this.setBoneRot('forearmL', 0.65 + Math.max(0, stride) * 0.15, 0, 0, 'local');
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
        this.pitchTilt = 0;

        // Character Archetype Specific Combat Guards & Keystroke Reflexes:
        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie: Imposing two-handed vanguard ready stance with balanced grounded posture
          this.verticalBob = breath * 0.012 - twitch * 0.015;
          this.rotationSway = Math.sin(elapsedTotal * 1.0) * 0.01;
          this.lungeOffset = Math.sin(twitch * Math.PI) * 0.10 * this.facingSign;

          this.setBoneRot('spine', breath * 0.010 + twitch * 0.02, 0, 0, 'parent');
          this.setBoneRot('chest', breath * 0.015 + twitch * 0.03, 0, 0, 'parent');
          this.setBoneRot('head', -twitch * 0.02, 0, 0, 'parent');

          // Right arm grips Solar Glaive in forward ready guard
          this.setBoneRot('upperArmR', -0.50 - breath * 0.03 - twitch * 0.12, -0.15, -0.15, 'local');
          this.setBoneRot('forearmR', 0.70 - twitch * 0.06, 0, 0, 'local');
          this.setBoneRot('handR', 0.08, 0, 0, 'local');

          // Left rocket gauntlet raised in protective shield guard
          this.setBoneRot('upperArmL', -0.42 - twitch * 0.25 + breath * 0.02, 0.18, 0.18, 'local');
          this.setBoneRot('forearmL', 0.65 - twitch * 0.18, 0, 0, 'local');
          this.setBoneRot('handL', 0.08 + twitch * 0.12, 0, 0, 'local');

          // Balanced, grounded mecha vanguard foot stance (symmetrical knee flex)
          this.setBoneRot('thighR', -0.18 - twitch * 0.05, -0.04, 0.12, 'parent');
          this.setBoneRot('shinR', 0.26 + twitch * 0.04, 0, 0, 'parent');
          this.setBoneRot('footR', -0.08 - twitch * 0.03, 0, -0.04, 'parent');
          this.setBoneRot('thighL', 0.12 + twitch * 0.03, 0.04, -0.12, 'parent');
          this.setBoneRot('shinL', 0.20, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06, 0, 0.04, 'parent');
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi: Low agility crouch with reverse-grip kunai & nimble spring-bob
          this.verticalBob = breath * 0.018 - twitch * 0.035;
          this.rotationSway = Math.sin(elapsedTotal * 1.8) * 0.015;
          this.lungeOffset = Math.sin(twitch * Math.PI) * 0.18 * this.facingSign;

          this.setBoneRot('spine', breath * 0.02 + twitch * 0.05, 0, 0, 'parent');
          this.setBoneRot('chest', breath * 0.025 + twitch * 0.06, 0, 0, 'parent');
          this.setBoneRot('head', -twitch * 0.04, 0, 0, 'parent');

          // Twin kunai twitch and agile arm flick
          this.setBoneRot('upperArmR', -0.40 - twitch * 0.25, 0, -0.20, 'local');
          this.setBoneRot('forearmR', 0.55 - twitch * 0.15, 0, 0, 'local');
          this.setBoneRot('handR', twitch * 0.10, 0, 0, 'local');

          this.setBoneRot('upperArmL', -0.40 - twitch * 0.25, 0, 0.20, 'local');
          this.setBoneRot('forearmL', 0.55 - twitch * 0.15, 0, 0, 'local');
          this.setBoneRot('handL', twitch * 0.10, 0, 0, 'local');

          // Low agile ninja foot stance with spring tension
          this.setBoneRot('thighR', -0.30 - twitch * 0.08, -0.06, 0.18, 'parent');
          this.setBoneRot('shinR', 0.42 + twitch * 0.06, 0, 0, 'parent');
          this.setBoneRot('footR', -0.12 - twitch * 0.04, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.26 + twitch * 0.04, 0.06, -0.18, 'parent');
          this.setBoneRot('shinL', 0.34, 0, 0, 'parent');
          this.setBoneRot('footL', -0.08, 0, 0.05, 'parent');
        } else if (this.profile.id === 'void') {
          // Void Assassin: Dual dagger stiletto forward cross-guard & hovering drift
          this.verticalBob = breath * 0.015 + twitch * 0.025; // Subtle floating hover
          this.rotationSway = Math.sin(elapsedTotal * 1.2) * 0.02 + twitch * 0.04;
          this.lungeOffset = Math.sin(twitch * Math.PI) * 0.15 * this.facingSign;

          this.setBoneRot('spine', breath * 0.015 + twitch * 0.03, 0, 0, 'parent');
          this.setBoneRot('chest', breath * 0.02 + twitch * 0.04, 0, 0, 'parent');
          this.setBoneRot('head', -twitch * 0.02, 0, 0, 'parent');

          // Ethereal stiletto forward cross-guard with ribbon flutter
          this.setBoneRot('upperArmR', -0.45 - twitch * 0.20, -0.10, -0.15 + twitch * 0.10, 'local');
          this.setBoneRot('forearmR', 0.55 - twitch * 0.10, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.45 + twitch * 0.15, 0.10, 0.15 - twitch * 0.10, 'local');
          this.setBoneRot('forearmL', 0.55, 0, 0, 'local');

          // Clean poised legs with floating lightness
          this.setBoneRot('thighR', -0.24 - twitch * 0.06, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 0.34 + twitch * 0.04, 0, 0, 'parent');
          this.setBoneRot('footR', -0.10 - twitch * 0.04, 0, -0.05, 'parent');
          this.setBoneRot('thighL', 0.20 + twitch * 0.03, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 0.26, 0, 0, 'parent');
          this.setBoneRot('footL', -0.06, 0, 0.05, 'parent');
        } else {
          // Shadow Ronin: Iaido Katana guard & micro-blade draw twitch
          this.verticalBob = breath * 0.018 - twitch * 0.025;
          this.rotationSway = Math.sin(elapsedTotal * 1.0) * 0.01;
          this.lungeOffset = Math.sin(twitch * Math.PI) * 0.15 * this.facingSign;

          this.setBoneRot('spine', breath * 0.015 + twitch * 0.05, 0, 0, 'parent');
          this.setBoneRot('chest', breath * 0.02 + twitch * 0.06, 0, 0, 'parent');
          this.setBoneRot('head', -twitch * 0.03, 0, 0, 'parent');

          // Right arm draws katana 0.05m with twitch
          this.setBoneRot('upperArmR', -0.50 - breath * 0.03 - twitch * 0.28, -0.10, -0.15, 'local');
          this.setBoneRot('forearmR', 0.70 - twitch * 0.18, 0, 0, 'local');
          this.setBoneRot('handR', 0.10 + twitch * 0.15, 0, 0, 'local');

          // Left hand anchored on scabbard
          this.setBoneRot('upperArmL', -0.45 + breath * 0.02, 0.10, 0.15, 'local');
          this.setBoneRot('forearmL', 0.65, 0, 0, 'local');
          this.setBoneRot('handL', 0.10, 0, 0, 'local');

          // Athletic grounded martial stance
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
        // Character-Specific Martial Jab Reflexes with Combo String Variations:
        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie:
          // Combo 0: Kinetic Gauntlet Piston Punch (+1.45m lunge, heavy kinetic torque)
          // Combo 1: Solar Glaive Haft Sweep (+1.30m lunge, wide torso sweep)
          // Combo 2: Rocket Thruster Uppercut (+1.40m lunge, powerful vertical lift)
          if (p < 0.35) {
            const t = p / 0.35;
            const easeIn = Math.sin(t * Math.PI * 0.5);
            if (this.comboStep === 1) {
              // Solar Glaive Haft Sweep
              this.lungeOffset = easeIn * 1.30 * this.facingSign;
              this.verticalBob = -0.02 * easeIn;
              this.pitchTilt = 0.06 * easeIn;
              this.rotationSway = easeIn * 0.18 * this.facingSign;
              this.setBoneRot('spine', 0.04 * easeIn, easeIn * 0.22, 0, 'parent');
              this.setBoneRot('chest', 0.06 * easeIn, easeIn * 0.20, 0, 'parent');
              this.setBoneRot('upperArmR', -0.50 - easeIn * 0.35, -0.18, -0.10, 'local');
              this.setBoneRot('forearmR', 0.70 - easeIn * 0.30, 0, 0, 'local');
              this.setBoneRot('upperArmL', -0.42 - easeIn * 0.25, 0.18, 0.12, 'local');
              this.setBoneRot('forearmL', 0.65, 0, 0, 'local');
            } else if (this.comboStep === 2) {
              // Rocket Thruster Uppercut
              this.lungeOffset = easeIn * 1.40 * this.facingSign;
              this.verticalBob = 0.08 * easeIn;
              this.pitchTilt = -0.10 * easeIn;
              this.rotationSway = -easeIn * 0.12 * this.facingSign;
              this.setBoneRot('spine', -0.08 * easeIn, -easeIn * 0.20, 0, 'parent');
              this.setBoneRot('chest', -0.10 * easeIn, -easeIn * 0.18, 0, 'parent');
              this.setBoneRot('upperArmL', -0.42 - easeIn * 0.80, 0, 0.10, 'local');
              this.setBoneRot('forearmL', 0.65 - easeIn * 0.35, 0, 0, 'local');
              this.setBoneRot('handL', easeIn * 0.25, 0, 0, 'local');
              this.setBoneRot('upperArmR', -0.50, -0.18, -0.20, 'local');
            } else {
              // Kinetic Gauntlet Piston Punch
              this.lungeOffset = easeIn * 1.45 * this.facingSign;
              this.verticalBob = -0.03 * easeIn;
              this.pitchTilt = 0.10 * easeIn;
              this.rotationSway = easeIn * 0.08 * this.facingSign;
              this.setBoneRot('spine', 0.05 * easeIn, -easeIn * 0.25, 0, 'parent');
              this.setBoneRot('chest', 0.07 * easeIn, -easeIn * 0.22, 0, 'parent');
              this.setBoneRot('head', 0, easeIn * 0.14, 0, 'parent');
              this.setBoneRot('shoulderL', -0.10 * easeIn, 0, 0, 'parent');
              this.setBoneRot('upperArmL', -0.42 - easeIn * 0.70, 0, 0.12 - easeIn * 0.08, 'local');
              this.setBoneRot('forearmL', 0.65 - easeIn * 0.55, 0, 0, 'local');
              this.setBoneRot('handL', easeIn * 0.12, 0, 0, 'local');
              this.setBoneRot('upperArmR', -0.50 + easeIn * 0.18, -0.18, -0.20, 'local');
              this.setBoneRot('forearmR', 0.80, 0, 0, 'local');
            }
            this.setBoneRot('thighR', -0.18 - easeIn * 0.35, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26 + easeIn * 0.35, 0, 0, 'parent');
            this.setBoneRot('footR', -0.08 - easeIn * 0.08, 0, -0.04, 'parent');
            this.setBoneRot('thighL', 0.12 + easeIn * 0.25, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20, 0, 0, 'parent');
            this.setBoneRot('footL', -0.06 - easeIn * 0.06, 0, 0.04, 'parent');
          } else {
            const t = (p - 0.35) / 0.65;
            const rev = 1 - t;
            const maxLunge = this.comboStep === 1 ? 1.30 : this.comboStep === 2 ? 1.40 : 1.45;
            this.lungeOffset = rev * maxLunge * this.facingSign;
            this.verticalBob = (this.comboStep === 2 ? 0.08 : -0.03) * rev;
            this.pitchTilt = (this.comboStep === 2 ? -0.10 : 0.10) * rev;
            this.rotationSway = (this.comboStep === 1 ? 0.18 : this.comboStep === 2 ? -0.12 : 0.08) * rev * this.facingSign;
            this.setBoneRot('spine', 0.05 * rev, -rev * 0.25, 0, 'parent');
            this.setBoneRot('chest', 0.07 * rev, -rev * 0.22, 0, 'parent');
            this.setBoneRot('upperArmL', -0.42 - rev * 0.65, 0, 0.12 - rev * 0.08, 'local');
            this.setBoneRot('forearmL', 0.65 - rev * 0.55, 0, 0, 'local');
            this.setBoneRot('upperArmR', -0.50 + rev * 0.18, -0.18, -0.20, 'local');
            this.setBoneRot('forearmR', 0.70, 0, 0, 'local');
            this.setBoneRot('thighR', -0.18 - rev * 0.35, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26 + rev * 0.35, 0, 0, 'parent');
            this.setBoneRot('footR', -0.08 - rev * 0.08, 0, -0.04, 'parent');
            this.setBoneRot('thighL', 0.12 + rev * 0.25, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20, 0, 0, 'parent');
            this.setBoneRot('footL', -0.06 - rev * 0.06, 0, 0.04, 'parent');
          }
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi:
          // Combo 0: Lightning Twin-Kunai Double-Stab (+1.40m lunge)
          // Combo 1: Twin Kunai Inward Cross-Swipe (+1.35m lunge)
          // Combo 2: 3-Hit Staccato Flurry (+1.45m lunge)
          const burstPhase = p < 0.20 ? p / 0.20 : p < 0.45 ? (p - 0.20) / 0.25 : (p - 0.45) / 0.55;
          if (p < 0.45) {
            const isRightStab = p < 0.20;
            const t = burstPhase;
            const ease = Math.sin(t * Math.PI);
            this.lungeOffset = (0.90 + (p / 0.45) * 0.50) * this.facingSign;
            this.verticalBob = -0.08 + ease * 0.03;
            this.pitchTilt = 0.08;

            this.setBoneRot('spine', 0.05, (isRightStab ? 0.25 : -0.25) * ease, 0, 'parent');
            this.setBoneRot('chest', 0.06, (isRightStab ? 0.20 : -0.20) * ease, 0, 'parent');

            if (this.comboStep === 1) {
              // Twin Inward Cross-Swipe
              this.setBoneRot('upperArmR', -0.40 - ease * 0.45, 0, -0.20 - ease * 0.25, 'local');
              this.setBoneRot('forearmR', 0.55 - ease * 0.30, 0, 0, 'local');
              this.setBoneRot('upperArmL', -0.40 - ease * 0.45, 0, 0.20 + ease * 0.25, 'local');
              this.setBoneRot('forearmL', 0.55 - ease * 0.30, 0, 0, 'local');
            } else {
              // Double / Flurry Stabs
              this.setBoneRot('upperArmR', isRightStab ? -0.40 - ease * 0.65 : -0.40, 0, -0.20, 'local');
              this.setBoneRot('forearmR', isRightStab ? 0.55 - ease * 0.55 : 0.65, 0, 0, 'local');
              this.setBoneRot('upperArmL', !isRightStab ? -0.40 - ease * 0.65 : -0.40, 0, 0.20, 'local');
              this.setBoneRot('forearmL', !isRightStab ? 0.55 - ease * 0.55 : 0.65, 0, 0, 'local');
            }

            this.setBoneRot('thighR', -0.30 - ease * 0.35, -0.06, 0.18, 'parent');
            this.setBoneRot('shinR', 0.42 + ease * 0.35, 0, 0, 'parent');
            this.setBoneRot('footR', -0.12 - ease * 0.10, 0, -0.05, 'parent');
            this.setBoneRot('thighL', 0.26 + ease * 0.25, 0.06, -0.18, 'parent');
            this.setBoneRot('shinL', 0.34, 0, 0, 'parent');
          } else {
            const rev = 1 - burstPhase;
            this.lungeOffset = rev * 1.40 * this.facingSign;
            this.verticalBob = -0.08 * rev;
            this.pitchTilt = 0.08 * rev;

            this.setBoneRot('upperArmR', -0.40 - rev * 0.20, 0, -0.20, 'local');
            this.setBoneRot('forearmR', 0.55, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.40 - rev * 0.20, 0, 0.20, 'local');
            this.setBoneRot('forearmL', 0.55, 0, 0, 'local');

            this.setBoneRot('thighR', -0.30 - rev * 0.30, -0.06, 0.18, 'parent');
            this.setBoneRot('shinR', 0.42 + rev * 0.30, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.26, 0.06, -0.18, 'parent');
            this.setBoneRot('shinL', 0.34, 0, 0, 'parent');
          }
        } else if (this.profile.id === 'void') {
          // Void Assassin:
          // Combo 0: Phase-Glide Needle Stiletto Thrust (+1.50m low assassin glide)
          // Combo 1: Spatial Stiletto Cross-Slice (+1.40m lunge)
          // Combo 2: Dual Stiletto Phase Pierce (+1.50m lunge)
          if (p < 0.35) {
            const t = p / 0.35;
            const easeIn = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = easeIn * 1.50 * this.facingSign;
            this.verticalBob = 0.02 * easeIn;
            this.pitchTilt = 0.04 * easeIn;

            this.setBoneRot('spine', 0.03 * easeIn, easeIn * 0.22, 0, 'parent');
            this.setBoneRot('chest', 0.04 * easeIn, easeIn * 0.18, 0, 'parent');

            if (this.comboStep === 1) {
              // Left Stiletto Cross-Slice
              this.setBoneRot('upperArmL', -0.45 - easeIn * 0.55, 0.10, 0.20 + easeIn * 0.15, 'local');
              this.setBoneRot('forearmL', 0.55 - easeIn * 0.45, 0, 0, 'local');
              this.setBoneRot('upperArmR', -0.45 + easeIn * 0.25, -0.10, -0.25 * easeIn, 'local');
              this.setBoneRot('forearmR', 0.55, 0, 0, 'local');
            } else if (this.comboStep === 2) {
              // Dual Stiletto Phase Pierce
              this.setBoneRot('upperArmR', -0.45 - easeIn * 0.60, -0.10, -0.10, 'local');
              this.setBoneRot('forearmR', 0.55 - easeIn * 0.45, 0, 0, 'local');
              this.setBoneRot('upperArmL', -0.45 - easeIn * 0.60, 0.10, 0.10, 'local');
              this.setBoneRot('forearmL', 0.55 - easeIn * 0.45, 0, 0, 'local');
            } else {
              // Right Stiletto Precision Thrust
              this.setBoneRot('shoulderR', 0.08 * easeIn, 0, 0, 'parent');
              this.setBoneRot('upperArmR', -0.45 - easeIn * 0.50, -0.10, -0.15 + easeIn * 0.08, 'local');
              this.setBoneRot('forearmR', 0.55 - easeIn * 0.50, 0, 0, 'local');
              this.setBoneRot('handR', easeIn * 0.20, 0, 0, 'local');
              this.setBoneRot('upperArmL', -0.45 + easeIn * 0.35, 0.10, 0.35 * easeIn, 'local');
              this.setBoneRot('forearmL', 0.55 - easeIn * 0.25, 0, 0, 'local');
            }

            this.setBoneRot('thighR', -0.24 - easeIn * 0.35, -0.05, 0.16, 'parent');
            this.setBoneRot('shinR', 0.34 + easeIn * 0.35, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.20 + easeIn * 0.25, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.26, 0, 0, 'parent');
          } else {
            const t = (p - 0.35) / 0.65;
            const rev = 1 - t;
            this.lungeOffset = rev * 1.50 * this.facingSign;
            this.verticalBob = 0.02 * rev;
            this.pitchTilt = 0.04 * rev;

            this.setBoneRot('upperArmR', -0.45 - rev * 0.50, -0.10, -0.15 + rev * 0.08, 'local');
            this.setBoneRot('forearmR', 0.55 - rev * 0.50, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.45, 0.10, 0.15, 'local');
            this.setBoneRot('forearmL', 0.55, 0, 0, 'local');

            this.setBoneRot('thighR', -0.24 - rev * 0.35, -0.05, 0.16, 'parent');
            this.setBoneRot('shinR', 0.34 + rev * 0.35, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.20, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.26, 0, 0, 'parent');
          }
        } else {
          // Shadow Ronin:
          // Combo 0: Iaido Katana Lunge Thrust (+1.35m direct samurai lunge)
          // Combo 1: Tsuka-ate Hilt Pommel Strike (+1.25m)
          // Combo 2: Iaido Azure Chest Cross-Slash (+1.40m)
          if (p < 0.35) {
            const t = p / 0.35;
            const easeIn = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = easeIn * 1.35 * this.facingSign;
            this.verticalBob = -0.03 * easeIn;
            this.pitchTilt = 0.05 * easeIn;

            if (this.comboStep === 1) {
              // Tsuka-ate Hilt Pommel Strike
              this.setBoneRot('spine', 0.05 * easeIn, -easeIn * 0.30, 0, 'parent');
              this.setBoneRot('chest', 0.07 * easeIn, -easeIn * 0.25, 0, 'parent');
              this.setBoneRot('upperArmR', -0.50 - easeIn * 0.35, 0.10, -0.10, 'local');
              this.setBoneRot('forearmR', 0.70 + easeIn * 0.30, 0, 0, 'local');
              this.setBoneRot('upperArmL', -0.45, 0.10, 0.15, 'local');
              this.setBoneRot('forearmL', 0.75, 0, 0, 'local');
            } else if (this.comboStep === 2) {
              // Horizontal Chest Cross-Slash
              this.setBoneRot('spine', 0.04 * easeIn, easeIn * 0.35, 0, 'parent');
              this.setBoneRot('chest', 0.06 * easeIn, easeIn * 0.30, 0, 'parent');
              this.setBoneRot('upperArmR', -0.50 + easeIn * 0.30, 0, -0.15 + easeIn * 0.35, 'local');
              this.setBoneRot('forearmR', 0.70 - easeIn * 0.30, 0, 0, 'local');
              this.setBoneRot('handR', easeIn * 0.25, 0, 0, 'local');
              this.setBoneRot('upperArmL', -0.45, 0.10, 0.15, 'local');
              this.setBoneRot('forearmL', 0.75, 0, 0, 'local');
            } else {
              // Precision Iaido Thrust
              this.setBoneRot('spine', 0.04 * easeIn, easeIn * 0.28, 0, 'parent');
              this.setBoneRot('chest', 0.06 * easeIn, easeIn * 0.22, 0, 'parent');
              this.setBoneRot('head', 0, -easeIn * 0.15, 0, 'parent');
              this.setBoneRot('shoulderR', 0.10 * easeIn, 0, 0, 'parent');
              this.setBoneRot('upperArmR', -0.50 - easeIn * 0.60, -0.10, -0.15 + easeIn * 0.05, 'local');
              this.setBoneRot('forearmR', 0.70 - easeIn * 0.65, 0, 0, 'local');
              this.setBoneRot('handR', easeIn * 0.15, 0, 0, 'local');
              this.setBoneRot('upperArmL', -0.45, 0.10, 0.15, 'local');
              this.setBoneRot('forearmL', 0.75, 0, 0, 'local');
            }

            this.setBoneRot('thighR', -0.26 - easeIn * 0.40, -0.05, 0.16, 'parent');
            this.setBoneRot('shinR', 0.36 + easeIn * 0.40, 0, 0, 'parent');
            this.setBoneRot('footR', -0.10 - easeIn * 0.10, 0, -0.05, 'parent');
            this.setBoneRot('thighL', 0.22 + easeIn * 0.30, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
            this.setBoneRot('footL', -0.06 - easeIn * 0.06, 0, 0.05, 'parent');
          } else {
            const t = (p - 0.35) / 0.65;
            const rev = 1 - t;
            this.lungeOffset = rev * 1.35 * this.facingSign;
            this.verticalBob = -0.03 * rev;
            this.pitchTilt = 0.05 * rev;

            this.setBoneRot('spine', 0.04 * rev, rev * 0.28, 0, 'parent');
            this.setBoneRot('chest', 0.06 * rev, rev * 0.22, 0, 'parent');

            this.setBoneRot('upperArmR', -0.50 - rev * 0.60, -0.10, -0.15 + rev * 0.05, 'local');
            this.setBoneRot('forearmR', 0.70 - rev * 0.65, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.45, 0.10, 0.15, 'local');
            this.setBoneRot('forearmL', 0.65, 0, 0, 'local');

            this.setBoneRot('thighR', -0.26 - rev * 0.40, -0.05, 0.16, 'parent');
            this.setBoneRot('shinR', 0.36 + rev * 0.40, 0, 0, 'parent');
            this.setBoneRot('footR', -0.10 - rev * 0.10, 0, -0.05, 'parent');
            this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
            this.setBoneRot('footL', -0.06 - rev * 0.06, 0, 0.05, 'parent');
          }
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'kick': {
        // Character-Specific Martial Kick Reflexes:
        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie: Aerial Thruster Axe Kick // Meteor Stomp (+0.45m vertical leap into heavy stomp)
          if (p < 0.40) {
            const t = p / 0.40;
            const ease = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = ease * 0.85 * this.facingSign;
            this.verticalBob = ease * 0.45; // High rocket leap!
            this.pitchTilt = -0.12 * ease;

            // Right leg chambers high overhead
            this.setBoneRot('thighR', -0.18 - ease * 1.45, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26 + ease * 0.70, 0, 0, 'parent');
            this.setBoneRot('footR', -0.25 * ease, 0, -0.04, 'parent');

            this.setBoneRot('thighL', 0.12 + ease * 0.35, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20 + ease * 0.25, 0, 0, 'parent');

            // Arms raised with glaive for aerial stability
            this.setBoneRot('upperArmR', -0.80 * ease, -0.15, -0.25 * ease, 'local');
            this.setBoneRot('upperArmL', -0.80 * ease, 0.18, 0.25 * ease, 'local');
          } else if (p < 0.65) {
            const t = (p - 0.40) / 0.25;
            const slam = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = (0.85 + slam * 0.55) * this.facingSign;
            this.verticalBob = 0.45 * (1 - slam) - 0.10 * slam; // Crash into deck!
            this.pitchTilt = 0.15 * slam;

            // Axe kick chops down vertically
            this.setBoneRot('thighR', -1.63 + slam * 1.25, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.96 - slam * 0.70, 0, 0, 'parent');
            this.setBoneRot('footR', -0.25 + slam * 0.17, 0, -0.04, 'parent');

            this.setBoneRot('thighL', 0.47 - slam * 0.25, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.45 - slam * 0.20, 0, 0, 'parent');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = rev * 1.40 * this.facingSign;
            this.verticalBob = rev * -0.10;
            this.pitchTilt = rev * 0.15;

            this.setBoneRot('thighR', -0.18, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.12, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20, 0, 0, 'parent');
          }
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi: Tornado Hurricane Spin Kick (360° airborne double-whip)
          if (p < 0.30) {
            const t = p / 0.30;
            this.lungeOffset = t * 0.80 * this.facingSign;
            this.verticalBob = t * 0.40; // Airborne leap
            this.rotationSway = t * Math.PI * 0.85;

            this.setBoneRot('thighR', -0.30 - t * 1.10, -0.06, 0.25, 'parent');
            this.setBoneRot('shinR', 0.42 + t * 0.90, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.26 + t * 0.30, 0.06, -0.20, 'parent');
            this.setBoneRot('shinL', 0.34 + t * 0.30, 0, 0, 'parent');
          } else if (p < 0.70) {
            const t = (p - 0.30) / 0.40;
            const spin = Math.sin(t * Math.PI);
            this.lungeOffset = (0.80 + spin * 0.60) * this.facingSign;
            this.verticalBob = 0.40 * (1 - t * 0.4);
            this.rotationSway = Math.PI * 0.85 + t * Math.PI * 1.15;

            // Shin whips out horizontally in spin
            this.setBoneRot('thighR', -1.40 - spin * 0.20, 0, 0.30, 'parent');
            this.setBoneRot('shinR', 1.32 - 1.20 * Math.sin(t * Math.PI * 0.5), 0, 0, 'parent');
            this.setBoneRot('footR', -0.35, 0, 0, 'parent');
          } else {
            const t = (p - 0.70) / 0.30;
            const rev = 1 - t;
            this.lungeOffset = rev * 0.80 * this.facingSign;
            this.verticalBob = rev * 0.18;
            this.rotationSway = rev * 0.30;

            this.setBoneRot('thighR', -0.30, -0.06, 0.18, 'parent');
            this.setBoneRot('shinR', 0.42, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.26, 0.06, -0.18, 'parent');
            this.setBoneRot('shinL', 0.34, 0, 0, 'parent');
          }
        } else if (this.profile.id === 'void') {
          // Void Assassin: Ethereal High Crescent Ribbon Sweep (+1.45m high arc poise)
          if (p < 0.30) {
            const t = p / 0.30;
            this.lungeOffset = t * 0.75 * this.facingSign;
            this.verticalBob = t * 0.08;

            this.setBoneRot('thighR', -0.24 - t * 1.45, -0.05, 0.25 * t, 'parent');
            this.setBoneRot('shinR', 0.34 + t * 0.80, 0, 0, 'parent');
            this.setBoneRot('footR', -0.35 * t, 0, 0, 'parent');

            this.setBoneRot('thighL', 0.20 + 0.15 * t, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.26 + 0.15 * t, 0, 0, 'parent');
            this.setBoneRot('spine', -0.18 * t, -0.25 * t, 0.15 * t, 'parent');
          } else if (p < 0.65) {
            const t = (p - 0.30) / 0.35;
            const strike = Math.sin(t * Math.PI);
            this.lungeOffset = (0.75 + strike * 0.70) * this.facingSign;
            this.verticalBob = 0.08 + strike * 0.04;

            this.setBoneRot('thighR', -1.69 - strike * 0.15, 0, 0.25, 'parent');
            this.setBoneRot('shinR', 1.14 - 1.04 * Math.sin(t * Math.PI * 0.5), 0, 0, 'parent');
            this.setBoneRot('footR', -0.40, 0, 0, 'parent');
            this.setBoneRot('spine', -0.22, -0.30, 0.18, 'parent');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = rev * 0.85 * this.facingSign;
            this.verticalBob = rev * 0.06;

            this.setBoneRot('thighR', -0.24 - rev * 0.70, -0.05, 0.16, 'parent');
            this.setBoneRot('shinR', 0.34 + rev * 0.40, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.20, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.26, 0, 0, 'parent');
            this.setBoneRot('spine', -0.12 * rev, 0, 0, 'parent');
          }
        } else {
          // Shadow Ronin: Grounded Low Samurai Crescent Leg-Cut (deep stance, low destabilizing sweep)
          if (p < 0.26) {
            const t = p / 0.26;
            this.lungeOffset = Math.sin(t * Math.PI * 0.5) * 0.75 * this.facingSign;
            this.verticalBob = -0.08 * t; // Low samurai drop

            this.setBoneRot('thighR', -0.26 - t * 0.65, 0, 0.22 * t, 'parent');
            this.setBoneRot('shinR', 0.36 + t * 0.35, 0, 0, 'parent');
            this.setBoneRot('footR', -0.20 * t, 0, 0, 'parent');

            this.setBoneRot('thighL', 0.22 + 0.15 * t, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.28 + 0.15 * t, 0, 0, 'parent');

            // Katana held high in alert defense
            this.setBoneRot('upperArmR', -0.70, -0.10, -0.25, 'local');
            this.setBoneRot('forearmR', 0.85, 0, 0, 'local');
          } else if (p < 0.60) {
            const t = (p - 0.26) / 0.34;
            const strikeExt = Math.sin(t * Math.PI);
            this.lungeOffset = (0.75 + strikeExt * 0.65) * this.facingSign;
            this.verticalBob = -0.08;

            // Low sweep cutting horizontally across ground
            this.setBoneRot('thighR', -0.91 - strikeExt * 0.15, 0, 0.35, 'parent');
            this.setBoneRot('shinR', 0.71 - 0.55 * Math.sin(t * Math.PI * 0.5), 0, 0, 'parent');
            this.setBoneRot('footR', -0.25, 0, 0, 'parent');

            this.setBoneRot('thighL', 0.37, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.43, 0, 0, 'parent');
          } else {
            const t = (p - 0.60) / 0.40;
            const rev = 1 - t;
            this.lungeOffset = rev * 0.85 * this.facingSign;
            this.verticalBob = rev * -0.06;

            this.setBoneRot('thighR', -0.26 - rev * 0.45, -0.05, 0.16, 'parent');
            this.setBoneRot('shinR', 0.36 + rev * 0.25, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
            this.setBoneRot('shinL', 0.28, 0, 0, 'parent');
          }
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'heavy': {
        // Character-Specific Martial Heavy Strikes:
        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie: Solar Glaive Vault Slam (+1.85m vault leap and crushing impact)
          if (p < 0.35) {
            const t = p / 0.35;
            this.lungeOffset = t * 0.60 * this.facingSign;
            this.verticalBob = t * 0.48; // High vault!
            this.pitchTilt = -0.18 * t;

            // Glaive raised high in both hands
            this.setBoneRot('upperArmR', -0.50 - 1.10 * t, -0.15, -0.20, 'local');
            this.setBoneRot('forearmR', 0.70 - 0.50 * t, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.42 - 1.10 * t, 0.18, 0.20, 'local');
            this.setBoneRot('forearmL', 0.65 - 0.45 * t, 0, 0, 'local');

            this.setBoneRot('thighR', -0.18 - 0.35 * t, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26 + 0.45 * t, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.12 + 0.25 * t, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20 + 0.35 * t, 0, 0, 'parent');
          } else if (p < 0.65) {
            const t = (p - 0.35) / 0.30;
            const slam = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = (0.60 + 1.25 * slam) * this.facingSign;
            this.verticalBob = 0.48 * (1 - slam) - 0.10 * slam; // Impact crater!
            this.pitchTilt = 0.20 * slam;

            // Glaive chops down violently into ground
            this.setBoneRot('upperArmR', -1.60 + 1.20 * slam, -0.15, 0, 'local');
            this.setBoneRot('forearmR', 0.20 - 0.15 * slam, 0, 0, 'local');
            this.setBoneRot('upperArmL', -1.52 + 1.20 * slam, 0.18, 0, 'local');
            this.setBoneRot('forearmL', 0.20 - 0.15 * slam, 0, 0, 'local');

            this.setBoneRot('spine', -0.20 + 0.55 * slam, 0, 0, 'parent');
            this.setBoneRot('thighR', -0.53 + 0.35 * slam, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.71 - 0.35 * slam, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.37 - slam * 0.20, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.55 - slam * 0.25, 0, 0, 'parent');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = 1.85 * rev * this.facingSign;
            this.verticalBob = rev * -0.06;
            this.pitchTilt = rev * 0.10;

            this.setBoneRot('upperArmR', -0.38 * rev - 0.50 * (1 - rev), -0.15, -0.15, 'local');
            this.setBoneRot('forearmR', 0.20 * rev + 0.70 * (1 - rev), 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.32 * rev - 0.42 * (1 - rev), 0.18, 0.18, 'local');
            this.setBoneRot('forearmL', 0.20 * rev + 0.65 * (1 - rev), 0, 0, 'local');

            this.setBoneRot('thighR', -0.18, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.12, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20, 0, 0, 'parent');
          }
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi: Shadow Somersault X-Cross Kunai Gouge (+1.70m somersault dive)
          if (p < 0.35) {
            const t = p / 0.35;
            this.lungeOffset = t * 0.50 * this.facingSign;
            this.verticalBob = t * 0.45; // Somersault leap
            this.pitchTilt = -t * 0.65;

            // Cross kunai overhead in X-formation
            this.setBoneRot('upperArmR', -0.40 - 1.05 * t, 0, 0.15 * t, 'local');
            this.setBoneRot('forearmR', 0.55 - 0.35 * t, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.40 - 1.05 * t, 0, -0.15 * t, 'local');
            this.setBoneRot('forearmL', 0.55 - 0.35 * t, 0, 0, 'local');
          } else if (p < 0.65) {
            const t = (p - 0.35) / 0.30;
            const slam = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = (0.50 + 1.20 * slam) * this.facingSign;
            this.verticalBob = 0.45 * (1 - slam) - 0.10 * slam;
            this.pitchTilt = -0.65 + slam * 0.95;

            // X-cross kunai plunge downward
            this.setBoneRot('upperArmR', -1.45 + 1.15 * slam, 0, 0.15, 'local');
            this.setBoneRot('forearmR', 0.20, 0, 0, 'local');
            this.setBoneRot('upperArmL', -1.45 + 1.15 * slam, 0, -0.15, 'local');
            this.setBoneRot('forearmL', 0.20, 0, 0, 'local');

            this.setBoneRot('thighR', -0.30 + 0.35 * slam, -0.06, 0.18, 'parent');
            this.setBoneRot('shinR', 0.42 + 0.20 * slam, 0, 0, 'parent');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = 1.70 * rev * this.facingSign;
            this.verticalBob = rev * -0.06;
            this.pitchTilt = rev * 0.15;

            this.setBoneRot('upperArmR', -0.40, 0, -0.20, 'local');
            this.setBoneRot('forearmR', 0.55, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.40, 0, 0.20, 'local');
            this.setBoneRot('forearmL', 0.55, 0, 0, 'local');
          }
        } else if (this.profile.id === 'void') {
          // Void Assassin: Void Spiral Uppercut into Rift Stiletto Plunge (+1.65m dual phase)
          if (p < 0.35) {
            const t = p / 0.35;
            this.lungeOffset = t * 0.85 * this.facingSign;
            this.verticalBob = t * 0.44; // Rising shadow uppercut
            this.rotationSway = t * 0.55;

            this.setBoneRot('upperArmR', -0.45 - 1.10 * t, -0.10, -0.15, 'local');
            this.setBoneRot('forearmR', 0.55 - 0.40 * t, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.45 + 0.30 * t, 0.10, 0.35 * t, 'local');
            this.setBoneRot('forearmL', 0.55, 0, 0, 'local');
          } else if (p < 0.65) {
            const t = (p - 0.35) / 0.30;
            const dive = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = (0.85 + 0.80 * dive) * this.facingSign;
            this.verticalBob = 0.44 * (1 - dive) - 0.04 * dive;
            this.rotationSway = 0.55 * (1 - dive);

            // Dagger plunge
            this.setBoneRot('upperArmR', -1.55 + 1.20 * dive, -0.10, -0.15, 'local');
            this.setBoneRot('forearmR', 0.15, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.15 - 0.50 * dive, 0.10, 0.15, 'local');
            this.setBoneRot('forearmL', 0.55 - 0.35 * dive, 0, 0, 'local');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = 1.65 * rev * this.facingSign;
            this.verticalBob = rev * -0.04;

            this.setBoneRot('upperArmR', -0.45, -0.10, -0.15, 'local');
            this.setBoneRot('forearmR', 0.55, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.45, 0.10, 0.15, 'local');
            this.setBoneRot('forearmL', 0.55, 0, 0, 'local');
          }
        } else {
          // Shadow Ronin: Tenchi Overhead Katana Cleave (+1.75m two-handed vertical slice)
          if (p < 0.30) {
            const t = p / 0.30;
            this.lungeOffset = -0.25 * t * this.facingSign;
            this.verticalBob = 0.32 * t;
            this.pitchTilt = -0.14 * t;

            this.setBoneRot('upperArmR', -0.50 - 1.15 * t, -0.10, -0.15 - 0.05 * t, 'local');
            this.setBoneRot('forearmR', 0.70 - 0.45 * t, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.45 - 1.20 * t, 0.10, 0.15 + 0.05 * t, 'local');
            this.setBoneRot('forearmL', 0.65 - 0.40 * t, 0, 0, 'local');

            this.setBoneRot('spine', -0.28 * t, 0, 0, 'parent');
            this.setBoneRot('chest', -0.22 * t, 0, 0, 'parent');
          } else if (p < 0.65) {
            const t = (p - 0.30) / 0.35;
            const slamFactor = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = (-0.25 + 2.00 * slamFactor) * this.facingSign;
            this.verticalBob = (0.32 * (1 - t)) - (0.08 * Math.sin(t * Math.PI));
            this.pitchTilt = 0.20 * slamFactor;

            this.setBoneRot('upperArmR', -1.65 + 1.25 * slamFactor, -0.10, 0, 'local');
            this.setBoneRot('forearmR', 0.25 - 0.15 * slamFactor, 0, 0, 'local');
            this.setBoneRot('upperArmL', -1.65 + 1.25 * slamFactor, 0.10, 0, 'local');
            this.setBoneRot('forearmL', 0.25 - 0.15 * slamFactor, 0, 0, 'local');

            this.setBoneRot('spine', -0.28 + 0.58 * slamFactor, 0, 0, 'parent');
            this.setBoneRot('chest', -0.22 + 0.48 * slamFactor, 0, 0, 'parent');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = 1.75 * rev * this.facingSign;
            this.verticalBob = rev * -0.05;
            this.pitchTilt = rev * 0.10;

            this.setBoneRot('upperArmR', -0.35 * rev - 0.50 * (1 - rev), -0.10, -0.15, 'local');
            this.setBoneRot('forearmR', 0.20 * rev + 0.70 * (1 - rev), 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.35 * rev - 0.45 * (1 - rev), 0.10, 0.15, 'local');
            this.setBoneRot('forearmL', 0.20 * rev + 0.65 * (1 - rev), 0, 0, 'local');
          }
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'weapon': {
        // Character-Specific Signature Weapon Attacks:
        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie: Solar Glaive Overdrive Cleave (powerful forward lunge & wide horizontal energy arc)
          if (p < 0.32) {
            // Windup: Coils back, shoulders cocked, energy charges
            const t = p / 0.32;
            const ease = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = -0.15 * ease * this.facingSign;
            this.verticalBob = -0.04 * ease;
            this.pitchTilt = -0.08 * ease;
            this.rotationSway = -0.20 * ease * this.facingSign;

            this.setBoneRot('spine', -0.06 * ease, -0.22 * ease * this.facingSign, 0, 'parent');
            this.setBoneRot('chest', -0.08 * ease, -0.26 * ease * this.facingSign, 0, 'parent');
            this.setBoneRot('upperArmR', -0.50 - 0.55 * ease, -0.30 * ease, -0.35 * ease, 'local');
            this.setBoneRot('forearmR', 0.70 + 0.25 * ease, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.42 - 0.30 * ease, 0.25 * ease, 0.25 * ease, 'local');
            this.setBoneRot('forearmL', 0.65 + 0.20 * ease, 0, 0, 'local');

            this.setBoneRot('thighR', -0.18 - 0.20 * ease, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26 + 0.25 * ease, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.12 + 0.15 * ease, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20 + 0.15 * ease, 0, 0, 'parent');
          } else if (p < 0.68) {
            // Impact Stroke: Massive horizontal solar cleave driving forward
            const t = (p - 0.32) / 0.36;
            const cleave = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = (-0.15 + 2.05 * cleave) * this.facingSign;
            this.verticalBob = -0.04 * (1 - cleave) - 0.02 * cleave;
            this.pitchTilt = -0.08 + 0.18 * cleave;
            this.rotationSway = (-0.20 + 0.45 * cleave) * this.facingSign;

            this.setBoneRot('spine', 0.06 * cleave, 0.28 * cleave * this.facingSign, 0, 'parent');
            this.setBoneRot('chest', 0.08 * cleave, 0.32 * cleave * this.facingSign, 0, 'parent');
            this.setBoneRot('upperArmR', -1.05 + 0.45 * cleave, -0.30 + 0.15 * cleave, -0.35 + 0.60 * cleave, 'local');
            this.setBoneRot('forearmR', 0.95 - 0.65 * cleave, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.72 + 0.35 * cleave, 0.25 - 0.10 * cleave, 0.25 - 0.45 * cleave, 'local');
            this.setBoneRot('forearmL', 0.85 - 0.45 * cleave, 0, 0, 'local');

            this.setBoneRot('thighR', -0.38 - 0.25 * cleave, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.51 + 0.25 * cleave, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.27 + 0.20 * cleave, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.35, 0, 0, 'parent');
          } else {
            // Recovery: Grounded deceleration and return to vanguard guard
            const t = (p - 0.68) / 0.32;
            const rev = 1 - t;
            this.lungeOffset = 1.90 * rev * this.facingSign;
            this.verticalBob = -0.02 * rev;
            this.pitchTilt = 0.10 * rev;
            this.rotationSway = 0.25 * rev * this.facingSign;

            this.setBoneRot('spine', 0.06 * rev, 0.28 * rev * this.facingSign, 0, 'parent');
            this.setBoneRot('chest', 0.08 * rev, 0.32 * rev * this.facingSign, 0, 'parent');
            this.setBoneRot('upperArmR', -0.50, -0.15, -0.15, 'local');
            this.setBoneRot('forearmR', 0.70, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.42, 0.18, 0.18, 'local');
            this.setBoneRot('forearmL', 0.65, 0, 0, 'local');

            this.setBoneRot('thighR', -0.18 - 0.45 * rev, -0.04, 0.12, 'parent');
            this.setBoneRot('shinR', 0.26 + 0.50 * rev, 0, 0, 'parent');
            this.setBoneRot('thighL', 0.12 + 0.35 * rev, 0.04, -0.12, 'parent');
            this.setBoneRot('shinL', 0.20, 0, 0, 'parent');
          }
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi: Storm Surge Twin Kunai Shockwave (low slide + electrified twin swing)
          if (p < 0.35) {
            const t = p / 0.35;
            const ease = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = ease * 1.95 * this.facingSign;
            this.verticalBob = -0.14 * ease; // Low slide

            // Arms cross in front preparing discharge
            this.setBoneRot('upperArmR', -0.40 - 0.40 * ease, 0, 0.25 * ease, 'local');
            this.setBoneRot('forearmR', 0.55 + 0.30 * ease, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.40 - 0.40 * ease, 0, -0.25 * ease, 'local');
            this.setBoneRot('forearmL', 0.55 + 0.30 * ease, 0, 0, 'local');
          } else if (p < 0.65) {
            const t = (p - 0.35) / 0.30;
            const burst = Math.sin(t * Math.PI);
            this.lungeOffset = (1.95 - t * 0.15) * this.facingSign;
            this.verticalBob = -0.14 * (1 - t);

            // Outward twin lightning sweep!
            this.setBoneRot('upperArmR', -0.80 + 0.30 * burst, 0, -0.65 * burst, 'local');
            this.setBoneRot('forearmR', 0.85 - 0.55 * burst, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.80 + 0.30 * burst, 0, 0.65 * burst, 'local');
            this.setBoneRot('forearmL', 0.85 - 0.55 * burst, 0, 0, 'local');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = 1.80 * rev * this.facingSign;
            this.setBoneRot('upperArmR', -0.40, 0, -0.20, 'local');
            this.setBoneRot('forearmR', 0.55, 0, 0, 'local');
            this.setBoneRot('upperArmL', -0.40, 0, 0.20, 'local');
            this.setBoneRot('forearmL', 0.55, 0, 0, 'local');
          }
        } else if (this.profile.id === 'void') {
          // Void Assassin: Spatial Void Vortex Dance (multi-angle figure-8 rift carve)
          const t = p;
          const fig8 = Math.sin(t * Math.PI * 2);
          const surge = Math.sin(t * Math.PI);
          this.lungeOffset = (surge * 1.85 + fig8 * 0.20) * this.facingSign;
          this.verticalBob = Math.sin(t * Math.PI * 4) * 0.05;
          this.rotationSway = fig8 * 0.20;

          // Figure-8 alternating stiletto slashes
          this.setBoneRot('upperArmR', -0.45 - fig8 * 0.40, -0.10, -0.15 + fig8 * 0.20, 'local');
          this.setBoneRot('forearmR', 0.55 + Math.cos(t * Math.PI * 2) * 0.30, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.45 + fig8 * 0.40, 0.10, 0.15 - fig8 * 0.20, 'local');
          this.setBoneRot('forearmL', 0.55 - Math.cos(t * Math.PI * 2) * 0.30, 0, 0, 'local');
        } else {
          // Shadow Ronin: Iaido Battojutsu // Full Sheath Draw & Cross Slash (+2.10m blur dash & cross slice)
          if (p < 0.28) {
            const t = p / 0.28;
            const surge = Math.sin(t * Math.PI * 0.5);
            this.lungeOffset = surge * 2.10 * this.facingSign;
            this.verticalBob = -0.12 * surge;
            this.pitchTilt = 0.14 * surge;

            this.setBoneRot('spine', 0.06 * surge, surge * 0.40 * this.facingSign, 0, 'parent');
            this.setBoneRot('chest', 0.08 * surge, surge * 0.35 * this.facingSign, 0, 'parent');

            // Blinding Katana cross-slash extension
            this.setBoneRot('shoulderR', 0.15 * surge, 0, 0, 'parent');
            this.setBoneRot('upperArmR', -0.65 + surge * 0.55, 0, -0.15 + surge * 0.15, 'local');
            this.setBoneRot('forearmR', 0.70 - surge * 0.60, 0, 0, 'local');
            this.setBoneRot('handR', surge * 0.25, 0, 0, 'local');

            this.setBoneRot('upperArmL', -0.45 - surge * 0.25, 0, 0.25, 'local');
            this.setBoneRot('forearmL', 0.70, 0, 0, 'local');
          } else if (p < 0.65) {
            const t = (p - 0.28) / 0.37;
            this.lungeOffset = (2.10 - t * 0.20) * this.facingSign;
            this.verticalBob = -0.12 * (1 - t);
            this.pitchTilt = 0.10 * (1 - t);

            this.setBoneRot('upperArmR', -0.10 + t * 0.10, 0, 0, 'local');
            this.setBoneRot('forearmR', 0.10 + t * 0.25, 0, 0, 'local');
          } else {
            const t = (p - 0.65) / 0.35;
            const rev = 1 - t;
            this.lungeOffset = 1.90 * rev * this.facingSign;
            this.verticalBob = 0;
            this.pitchTilt = 0;

            this.setBoneRot('upperArmR', -0.10 * rev - 0.50 * (1 - rev), 0, -0.15, 'local');
            this.setBoneRot('forearmR', 0.35 * rev + 0.70 * (1 - rev), 0, 0, 'local');
          }
        }

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'hit_light': {
        // Character-Tailored Flinch Reflexes:
        const t = Math.sin(p * Math.PI);
        const recoilMag = this.profile.id === 'valkyrie' ? 0.22 : this.profile.id === 'shinobi' ? 0.42 : this.profile.id === 'void' ? 0.38 : 0.32;
        this.lungeOffset = -recoilMag * t * this.facingSign;
        this.pitchTilt = -0.10 * t;

        this.setBoneRot('head', -0.28 * t, 0, 0, 'parent');
        this.setBoneRot('neck', -0.16 * t, 0, 0, 'parent');
        this.setBoneRot('chest', -0.14 * t, 0, 0, 'parent');
        this.setBoneRot('spine', -0.12 * t, 0, 0, 'parent');

        if (this.profile.id === 'valkyrie') {
          // Heavy armor braces & thrusters reverse-vent
          this.setBoneRot('upperArmR', -0.55 + 0.20 * t, -0.15, -0.15, 'local');
          this.setBoneRot('upperArmL', -0.45 + 0.20 * t, 0.20, 0.20, 'local');
        } else if (this.profile.id === 'shinobi') {
          // Agile ninja tuck
          this.setBoneRot('upperArmR', -0.40 + 0.30 * t, 0, -0.20, 'local');
          this.setBoneRot('upperArmL', -0.40 + 0.30 * t, 0, 0.20, 'local');
        } else if (this.profile.id === 'void') {
          // Dimensional phase flicker
          this.setBoneRot('upperArmR', -0.45 + 0.25 * t, -0.10, -0.15, 'local');
          this.setBoneRot('upperArmL', -0.45 + 0.25 * t, 0.10, 0.15, 'local');
        } else {
          // Iaido blade parry recoil
          this.setBoneRot('upperArmR', -0.50 + 0.25 * t, -0.10, -0.15, 'local');
          this.setBoneRot('upperArmL', -0.45 + 0.25 * t, 0.10, 0.15, 'local');
        }

        this.setBoneRot('thighR', -0.26 + 0.18 * t, -0.05, 0.16, 'parent');
        this.setBoneRot('shinR', 0.36, 0, 0, 'parent');
        this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
        this.setBoneRot('shinL', 0.28, 0, 0, 'parent');

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'hit_heavy': {
        // Character-Tailored Heavy Stagger Reflexes:
        const t = Math.sin(p * Math.PI * 0.85);
        const staggerMag = this.profile.id === 'valkyrie' ? 0.70 : this.profile.id === 'shinobi' ? 1.10 : this.profile.id === 'void' ? 0.90 : 0.85;
        this.lungeOffset = -staggerMag * t * this.facingSign;
        this.pitchTilt = -0.18 * t;
        this.verticalBob = -0.06 * t;

        this.setBoneRot('head', -0.50 * t, 0.18 * t * this.facingSign, 0, 'parent');
        this.setBoneRot('neck', -0.30 * t, 0.10 * t * this.facingSign, 0, 'parent');
        this.setBoneRot('chest', -0.28 * t, 0, 0, 'parent');
        this.setBoneRot('spine', -0.24 * t, 0, 0, 'parent');

        this.setBoneRot('upperArmR', -0.50 + 0.50 * t, 0, -0.30 * t, 'local');
        this.setBoneRot('upperArmL', -0.45 + 0.50 * t, 0, 0.30 * t, 'local');

        this.setBoneRot('thighR', -0.26 + 0.30 * t, -0.05, 0.16, 'parent');
        this.setBoneRot('shinR', 0.36 + 0.20 * t, 0, 0, 'parent');
        this.setBoneRot('thighL', 0.22 - 0.12 * t, 0.05, -0.16, 'parent');
        this.setBoneRot('shinL', 0.28, 0, 0, 'parent');

        if (p >= 1) this.state = 'idle';
        break;
      }

      case 'ko': {
        // Character-Specific Knockout Collapse:
        const t = Math.min(p * 1.5, 1);
        this.lungeOffset = -1.1 * t * this.facingSign;
        this.verticalBob = -0.95 * t;
        this.pitchTilt = -Math.PI / 2.1 * t;

        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie: Armor overload shutdown onto deck
          this.setBoneRot('thighR', -0.80 * t, -0.06, 0.18, 'parent');
          this.setBoneRot('shinR', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footR', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('thighL', -0.80 * t, 0.06, -0.18, 'parent');
          this.setBoneRot('shinL', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footL', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('spine', 0.45 * t, 0, 0, 'parent');
          this.setBoneRot('chest', 0.35 * t, 0, 0, 'parent');
          this.setBoneRot('head', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('upperArmR', 0.40 * t, 0, -0.60 * t, 'local');
          this.setBoneRot('upperArmL', 0.40 * t, 0, 0.60 * t, 'local');
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi: Smoke dispersal collapse into tight evasive tuck
          this.setBoneRot('thighR', -0.80 * t, 0, 0, 'parent');
          this.setBoneRot('shinR', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footR', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('thighL', -0.80 * t, 0, 0, 'parent');
          this.setBoneRot('shinL', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footL', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('spine', 0.40 * t, 0, 0, 'parent');
          this.setBoneRot('chest', 0.30 * t, 0, 0, 'parent');
          this.setBoneRot('head', 0.55 * t, 0, 0, 'parent');
          this.setBoneRot('upperArmR', 0.35 * t, 0, -0.50 * t, 'local');
          this.setBoneRot('upperArmL', 0.35 * t, 0, 0.50 * t, 'local');
        } else if (this.profile.id === 'void') {
          // Void Assassin: Shadow rift dissolution
          this.setBoneRot('thighR', -0.80 * t, 0, 0.16, 'parent');
          this.setBoneRot('shinR', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footR', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('thighL', -0.80 * t, 0, -0.16, 'parent');
          this.setBoneRot('shinL', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footL', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('spine', 0.35 * t, 0, 0, 'parent');
          this.setBoneRot('chest', 0.25 * t, 0, 0, 'parent');
          this.setBoneRot('head', 0.45 * t, 0, 0, 'parent');
          this.setBoneRot('upperArmR', 0.30 * t, 0, -0.65 * t, 'local');
          this.setBoneRot('upperArmL', 0.30 * t, 0, 0.65 * t, 'local');
        } else {
          // Shadow Ronin: Honorable samurai collapse
          this.setBoneRot('thighR', -0.80 * t, -0.05, 0.16, 'parent');
          this.setBoneRot('shinR', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footR', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('thighL', -0.80 * t, 0.05, -0.16, 'parent');
          this.setBoneRot('shinL', 1.35 * t, 0, 0, 'parent');
          this.setBoneRot('footL', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('spine', 0.45 * t, 0, 0, 'parent');
          this.setBoneRot('chest', 0.35 * t, 0, 0, 'parent');
          this.setBoneRot('head', 0.50 * t, 0, 0, 'parent');
          this.setBoneRot('upperArmR', -0.20 * t, 0, -0.35 * t, 'local');
          this.setBoneRot('forearmR', 0.80 * t, 0, 0, 'local');
          this.setBoneRot('upperArmL', 0.30 * t, 0.10, 0.40 * t, 'local');
        }
        break;
      }

      case 'victory': {
        // Character-Specific Triumphant Victory Stances:
        this.lungeOffset = 0.20 * this.facingSign;
        this.pitchTilt = 0;

        if (this.profile.id === 'valkyrie') {
          // Cyber Valkyrie: Solar Glaive deck plant & imposing vanguard salute
          this.verticalBob = 0.02 + Math.sin(elapsedTotal * 2.0) * 0.015;
          this.setBoneRot('upperArmR', -1.60, 0, -0.15, 'local');
          this.setBoneRot('forearmR', 0.30, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.50, 0.40, 0.35, 'local');
          this.setBoneRot('forearmL', 1.10, 0, 0, 'local');
          this.setBoneRot('chest', -0.14, 0, 0, 'parent');
          this.setBoneRot('head', -0.10, 0, 0, 'parent');
          this.setBoneRot('thighR', -0.28, -0.06, 0.18, 'parent');
          this.setBoneRot('thighL', 0.24, 0.06, -0.18, 'parent');
        } else if (this.profile.id === 'shinobi') {
          // Volt Shinobi: Twin kunai twirl into ninja chakra hand-seal pose
          this.verticalBob = 0.03 + Math.sin(elapsedTotal * 3.0) * 0.02;
          this.setBoneRot('upperArmR', -0.45, 0, 0.25, 'local');
          this.setBoneRot('forearmR', 1.10, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.45, 0, -0.25, 'local');
          this.setBoneRot('forearmL', 1.10, 0, 0, 'local');
          this.setBoneRot('chest', -0.08, 0, 0, 'parent');
          this.setBoneRot('head', -0.10, 0, 0, 'parent');
          this.setBoneRot('thighR', -0.30, -0.06, 0.18, 'parent');
          this.setBoneRot('thighL', 0.26, 0.06, -0.18, 'parent');
        } else if (this.profile.id === 'void') {
          // Void Assassin: Hovering stiletto levitation & void bloom
          this.verticalBob = 0.15 + Math.sin(elapsedTotal * 2.2) * 0.03; // Floating above deck!
          this.rotationSway = Math.sin(elapsedTotal * 1.5) * 0.03;
          this.setBoneRot('upperArmR', -0.60, 0, -0.50, 'local');
          this.setBoneRot('forearmR', 0.40, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.60, 0, 0.50, 'local');
          this.setBoneRot('forearmL', 0.40, 0, 0, 'local');
          this.setBoneRot('chest', -0.12, 0, 0, 'parent');
          this.setBoneRot('head', -0.08, 0, 0, 'parent');
          this.setBoneRot('thighR', 0.15, 0, 0.10, 'parent');
          this.setBoneRot('thighL', 0.15, 0, -0.10, 'parent');
        } else {
          // Shadow Ronin: Iaido Katana flourish & formal samurai martial bow
          const bowCycle = Math.sin(Math.min(elapsedTotal * 1.5, Math.PI));
          this.verticalBob = 0.02 - bowCycle * 0.03;
          this.setBoneRot('upperArmR', -0.45, 0, -0.15, 'local');
          this.setBoneRot('forearmR', 0.65, 0, 0, 'local');
          this.setBoneRot('upperArmL', -0.45, 0.10, 0.15, 'local');
          this.setBoneRot('forearmL', 0.65, 0, 0, 'local');
          this.setBoneRot('spine', bowCycle * 0.20, 0, 0, 'parent');
          this.setBoneRot('chest', bowCycle * 0.18, 0, 0, 'parent');
          this.setBoneRot('head', bowCycle * 0.25, 0, 0, 'parent');
          this.setBoneRot('thighR', -0.26, -0.05, 0.16, 'parent');
          this.setBoneRot('thighL', 0.22, 0.05, -0.16, 'parent');
        }
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
