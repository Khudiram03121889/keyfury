import Phaser from 'phaser';
import {
  highlandSanctuaryUrl,
  cyberRooftopUrl,
  volcanicCalderaUrl,
  celestialVoidUrl
} from '../assets/arenas/index';
import {
  solve2BoneIK,
  solveSpineCurve,
  RagdollSystem,
  MoveSetManager,
  ProjectileManager,
  HitboxManager,
  ImpactFeedbackManager,
  checkOBBvsCircle,
  checkOBBvsCapsule,
  checkOBBvsOBB,
  getMoveSpec,
  getCharacterDefinition,
  getArenaDefinition,
  type CharacterDefinition,
  type CharacterId,
  type ArenaDefinition,
  type ArenaId,
  type FightingMoveName,
  type OBBHitbox,
  type CircleHurtbox,
  type CapsuleHurtbox,
  type DebugShape
} from '@keyfury/game-core';

import { RenderPipeline } from '../render/RenderPipeline';
import { SpatialHashGrid } from '../render/SpatialHashGrid';
import { ParticlePool, Vector2Pool, HitboxPool, type PooledParticle } from '../render/ObjectPool';
import { DebugOverlayRenderer } from '../render/DebugOverlayRenderer';
import {
  drawTaperedLimb,
  drawCharacterHeadgear,
  drawCharacterPauldronsAndTorso,
  drawCharacterGauntletsAndWeapons,
  drawCharacterWaistAndScarf,
  drawCharacterAttackVFX
} from './character/CharacterRigRenderer';

export type AttackKind = 'jab' | 'kick' | 'jump_kick' | 'uppercut' | 'heavy' | 'knockdown';
export type FighterState =
  | 'idle'
  | 'step'
  | 'windup'
  | 'jab'
  | 'kick'
  | 'jump_kick'
  | 'uppercut'
  | 'heavy'
  | 'hit'
  | 'knockdown';

export class StickFightScene extends Phaser.Scene {
  private p1StickGraphics?: Phaser.GameObjects.Graphics;
  private p2StickGraphics?: Phaser.GameObjects.Graphics;
  private p1FxGraphics?: Phaser.GameObjects.Graphics;
  private p2FxGraphics?: Phaser.GameObjects.Graphics;
  private debugGraphics?: Phaser.GameObjects.Graphics;

  private p1State: FighterState = 'idle';
  private p2State: FighterState = 'idle';

  // Modular Character Skin Definitions
  public p1CharId: CharacterId = 'shadow_ronin';
  public p2CharId: CharacterId = 'cyber_valkyrie';
  public p1CharDef: CharacterDefinition = getCharacterDefinition('shadow_ronin');
  public p2CharDef: CharacterDefinition = getCharacterDefinition('cyber_valkyrie');

  // Modular Arena Environment Definition
  public currentArenaId: ArenaId = 'highland_sanctuary';
  public currentArenaDef: ArenaDefinition = getArenaDefinition('highland_sanctuary');

  private p1Timer?: Phaser.Time.TimerEvent;
  private p2Timer?: Phaser.Time.TimerEvent;
  private p1StepTimer?: Phaser.Time.TimerEvent;
  private p2StepTimer?: Phaser.Time.TimerEvent;
  private p3Timer?: Phaser.Time.TimerEvent;

  private p1DashOffset: number = 0;
  private p2DashOffset: number = 0;
  private p1TypingProgressOffset: number = 0;
  private p2TypingProgressOffset: number = 0;

  private p1JumpY: number = 0;
  private p2JumpY: number = 0;
  private p1Rotation: number = 0;
  private p2Rotation: number = 0;

  private p1Combo: number = 0;
  private p2Combo: number = 0;
  private p1StepToggle: boolean = false;
  private p2StepToggle: boolean = false;

  private bgImage?: Phaser.GameObjects.Image;

  // --- Milestone 4 Performance & Arena Integration Systems ---
  public renderPipeline: RenderPipeline;
  public spatialHashGrid: SpatialHashGrid;
  public hitboxManager: HitboxManager;
  public impactFeedback: ImpactFeedbackManager;
  public projectileManager: ProjectileManager;
  public debugOverlay: DebugOverlayRenderer;

  public p1MoveManager: MoveSetManager;
  public p2MoveManager: MoveSetManager;
  public p1Ragdoll: RagdollSystem;
  public p2Ragdoll: RagdollSystem;

  private debugMode: boolean = false;
  private activeParticles: PooledParticle[] = [];

  constructor() {
    super('StickFightScene');

    // Initialize Performance & Arena Combat Engine Subsystems
    this.renderPipeline = new RenderPipeline({ fixedStepMs: 1000 / 60 }); // 16.666ms
    this.spatialHashGrid = new SpatialHashGrid(64); // 64px cell size
    this.hitboxManager = new HitboxManager();
    this.impactFeedback = new ImpactFeedbackManager();
    this.projectileManager = new ProjectileManager();
    this.debugOverlay = new DebugOverlayRenderer({
      showHitboxes: true,
      showHurtboxes: true,
      showSpatialGrid: true
    });

    this.p1MoveManager = new MoveSetManager();
    this.p2MoveManager = new MoveSetManager();
    this.p1Ragdoll = new RagdollSystem();
    this.p2Ragdoll = new RagdollSystem();

    // Wire fixed-timestep physics update callback (16.666ms)
    this.renderPipeline.setPhysicsCallback(this.onPhysicsTick.bind(this));
  }

  preload() {
    this.load.image('arena_highland_sanctuary', highlandSanctuaryUrl);
    this.load.image('arena_cyber_rooftop', cyberRooftopUrl);
    this.load.image('arena_volcanic_caldera', volcanicCalderaUrl);
    this.load.image('arena_celestial_void', celestialVoidUrl);
    // Legacy fallback support
    this.load.image('highland_bg', highlandSanctuaryUrl);
  }

  public getPlatformY(): number {
    const width = this.cameras?.main?.width || (this.scale?.width as number) || 1024;
    const height = this.cameras?.main?.height || (this.scale?.height as number) || 580;
    const isPortrait = width < height || height < 480;

    if (isPortrait) {
      // In mobile portrait or compact viewports, ground fighters using arena's portrait ratio
      const portraitRatio = this.currentArenaDef?.portraitPlatformRatio ?? 0.74;
      return Math.min(height - 40, Math.max(height * portraitRatio, height - 70));
    }
    const platformRatio = this.currentArenaDef?.platformRatio ?? 0.72;
    return height * platformRatio;
  }

  create() {
    this.cameras.main.setRoundPixels(true);

    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;

    // Background Image for Active Arena
    try {
      const textureKey = `arena_${this.currentArenaId}`;
      const validKey = this.textures.exists(textureKey) ? textureKey : 'arena_highland_sanctuary';
      this.bgImage = this.add.image(width / 2, height / 2, validKey);
      this.bgImage.setOrigin(0.5, 0.5);
      this.handleResize();
      this.bgImage.setDepth(1);
    } catch (_err) {
      console.warn('[StickFightScene] Background image load deferred');
    }

    // Stickmen Fighter, FX & Debug graphics
    this.p1FxGraphics = this.add.graphics();
    this.p1FxGraphics.setDepth(8);

    this.p2FxGraphics = this.add.graphics();
    this.p2FxGraphics.setDepth(8);

    this.p1StickGraphics = this.add.graphics();
    this.p1StickGraphics.setDepth(10);

    this.p2StickGraphics = this.add.graphics();
    this.p2StickGraphics.setDepth(10);

    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(40);

    // Initialize ragdoll skeleton bounds
    const platformY = this.getPlatformY();
    this.p1Ragdoll.initDefaultSkeleton({ x: width * 0.34, y: platformY }, 1.0);
    this.p2Ragdoll.initDefaultSkeleton({ x: width * 0.66, y: platformY }, 1.0);

    // Handle dynamic canvas resizing
    this.scale.on('resize', this.handleResize, this);
  }

  public handleResize() {
    if (!this.cameras?.main) return;
    this.cameras.main.setRoundPixels(true);
    const width = this.cameras.main.width || (this.scale?.width as number) || 1024;
    const height = this.cameras.main.height || (this.scale?.height as number) || 580;
    const isPortrait = width < height || height < 480;

    if (this.bgImage) {
      const bgImgW = 1376;
      const bgImgH = 768;
      const scale = Math.max(width / bgImgW, height / bgImgH);
      const displayW = bgImgW * scale;
      const displayH = bgImgH * scale;
      this.bgImage.setDisplaySize(displayW, displayH);

      const currentPlatformY = this.getPlatformY();
      const platformRatio = isPortrait
        ? (this.currentArenaDef?.portraitPlatformRatio ?? 0.74)
        : (this.currentArenaDef?.platformRatio ?? 0.72);

      const bgPlatformOrigY = platformRatio * displayH;
      const offsetY = currentPlatformY - bgPlatformOrigY + displayH / 2;
      this.bgImage.setPosition(width / 2, offsetY);
    }
  }

  /**
   * Fixed-timestep physics update (16.666ms) tick handler.
   */
  private onPhysicsTick(fixedDtMs: number): void {
    // 1. Advance combat state machines & projectiles
    const p1MoveState = this.p1MoveManager.updateFrame(1);
    const p2MoveState = this.p2MoveManager.updateFrame(1);
    const dtSec = fixedDtMs / 1000;

    this.projectileManager.update(fixedDtMs);

    // 2. Advance hit-stop & camera shake decay
    const { isFrozen, cameraOffset } = this.impactFeedback.update(fixedDtMs);

    if (this.cameras.main) {
      this.cameras.main.scrollX = cameraOffset.x;
      this.cameras.main.scrollY = cameraOffset.y;
    }

    // Skip position progression if frozen by hitstop
    if (isFrozen) {
      return;
    }

    // 3. Step Ragdoll solver if active
    if (this.p1Ragdoll.getMode() === 'Ragdoll' || this.p1Ragdoll.getMode() === 'Blending') {
      this.p1Ragdoll.step(dtSec);
    }
    if (this.p2Ragdoll.getMode() === 'Ragdoll' || this.p2Ragdoll.getMode() === 'Blending') {
      this.p2Ragdoll.step(dtSec);
    }

    // 4. Update Particle Burst lifetimes
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i]!;
      p.currentAgeMs += fixedDtMs;

      if (p.type === 'orbital') {
        const angVel = p.angularVelocity ?? 4;
        p.angle = (p.angle ?? 0) + angVel * dtSec;
        const radius = p.size * 6 * Math.max(0.2, 1 - p.currentAgeMs / p.lifetimeMs);
        p.position.x += p.velocity.x * dtSec + Math.cos(p.angle) * radius * dtSec * 30;
        p.position.y += p.velocity.y * dtSec + Math.sin(p.angle) * radius * dtSec * 30;
      } else {
        p.position.x += p.velocity.x * dtSec;
        p.position.y += p.velocity.y * dtSec + 150 * dtSec * dtSec; // gravity
      }

      if (p.currentAgeMs >= p.lifetimeMs) {
        ParticlePool.release(p);
        this.activeParticles.splice(i, 1);
      }
    }

    // 5. Update Spatial Hash Grid & OBB Hitbox / Hurtbox Registrations
    this.updateSpatialCollisions();
  }

  /**
   * ponytail: Calculates actual on-screen X positions for P1 & P2, enforcing arena bounds and pushbox separation.
   */
  public getFighterPositions(): { p1X: number; p2X: number } {
    const width = this.cameras?.main?.width || (this.scale?.width as number) || 1024;
    const MIN_GAP = width < 480 ? 45 : 65;
    const minX = width * 0.08;
    const maxX = width * 0.92;

    let p1BaseX = width * 0.34 + this.p1DashOffset + this.p1TypingProgressOffset;
    let p2BaseX = width * 0.66 + this.p2DashOffset + this.p2TypingProgressOffset;

    const currentGap = p2BaseX - p1BaseX;
    if (currentGap < MIN_GAP) {
      const overlap = MIN_GAP - currentGap;
      p1BaseX -= overlap / 2;
      p2BaseX += overlap / 2;
    }

    p1BaseX = Math.max(minX, Math.min(maxX - MIN_GAP, p1BaseX));
    p2BaseX = Math.max(minX + MIN_GAP, Math.min(maxX, p2BaseX));

    if (p2BaseX - p1BaseX < MIN_GAP) {
      if (p1BaseX === minX) {
        p2BaseX = minX + MIN_GAP;
      } else if (p2BaseX === maxX) {
        p1BaseX = maxX - MIN_GAP;
      }
    }

    return { p1X: p1BaseX, p2X: p2BaseX };
  }

  /**
   * Spatial hash grid broadphase query & OBB hitbox collision checks.
   */
  private updateSpatialCollisions(): void {
    this.spatialHashGrid.clear();
    this.hitboxManager.clearAll();

    const platformY = this.getPlatformY();

    const { p1X: p1BaseX, p2X: p2BaseX } = this.getFighterPositions();

    // Defender Hurtboxes (Head circle & Torso capsule)
    const p1HeadCircle: CircleHurtbox = { center: { x: p1BaseX, y: platformY + this.p1JumpY - 148 }, radius: 22 };
    const p2HeadCircle: CircleHurtbox = { center: { x: p2BaseX, y: platformY + this.p2JumpY - 148 }, radius: 22 };

    const p1Capsule: CapsuleHurtbox = {
      p1: { x: p1BaseX, y: platformY + this.p1JumpY - 118 },
      p2: { x: p1BaseX, y: platformY + this.p1JumpY - 48 },
      radius: 18
    };
    const p2Capsule: CapsuleHurtbox = {
      p1: { x: p2BaseX, y: platformY + this.p2JumpY - 118 },
      p2: { x: p2BaseX, y: platformY + this.p2JumpY - 48 },
      radius: 18
    };

    this.hitboxManager.registerCircle('p1_head', p1HeadCircle, '#00ff00');
    this.hitboxManager.registerCircle('p2_head', p2HeadCircle, '#00ff00');
    this.hitboxManager.registerCapsule('p1_torso', p1Capsule, '#0088ff');
    this.hitboxManager.registerCapsule('p2_torso', p2Capsule, '#0088ff');

    this.spatialHashGrid.insert('p1_head', {
      minX: p1HeadCircle.center.x - 22,
      minY: p1HeadCircle.center.y - 22,
      maxX: p1HeadCircle.center.x + 22,
      maxY: p1HeadCircle.center.y + 22
    }, 'p1_head');

    this.spatialHashGrid.insert('p2_head', {
      minX: p2HeadCircle.center.x - 22,
      minY: p2HeadCircle.center.y - 22,
      maxX: p2HeadCircle.center.x + 22,
      maxY: p2HeadCircle.center.y + 22
    }, 'p2_head');

    // Register active attack OBB hitboxes
    if (this.p1State === 'jab' || this.p1State === 'kick' || this.p1State === 'heavy' || this.p1State === 'uppercut') {
      const obb: OBBHitbox = {
        center: { x: p1BaseX + 60, y: platformY + this.p1JumpY - 110 },
        extents: { x: 30, y: 20 },
        rotation: 0
      };
      this.hitboxManager.registerOBB('p1_attack_obb', obb, '#ff0000');
      this.spatialHashGrid.insert('p1_attack_obb', {
        minX: obb.center.x - 30,
        minY: obb.center.y - 20,
        maxX: obb.center.x + 30,
        maxY: obb.center.y + 20
      }, 'p1_attack_obb');

      // Fast broadphase lookup using Spatial Hash Grid
      const queryResults = this.spatialHashGrid.query({
        minX: obb.center.x - 30,
        minY: obb.center.y - 20,
        maxX: obb.center.x + 30,
        maxY: obb.center.y + 20
      });

      for (const res of queryResults) {
        if (res.id === 'p2_head') {
          const col = checkOBBvsCircle(obb, p2HeadCircle);
          if (col.collided) {
            // Collision confirmed
          }
        }
      }
    }

    if (this.p2State === 'jab' || this.p2State === 'kick' || this.p2State === 'heavy' || this.p2State === 'uppercut') {
      const obb: OBBHitbox = {
        center: { x: p2BaseX - 60, y: platformY + this.p2JumpY - 110 },
        extents: { x: 30, y: 20 },
        rotation: 0
      };
      this.hitboxManager.registerOBB('p2_attack_obb', obb, '#ff0000');
      this.spatialHashGrid.insert('p2_attack_obb', {
        minX: obb.center.x - 30,
        minY: obb.center.y - 20,
        maxX: obb.center.x + 30,
        maxY: obb.center.y + 20
      }, 'p2_attack_obb');
    }
  }

  update(time: number, delta: number) {
    if (!this.p1StickGraphics || !this.p2StickGraphics) return;

    // Tick the fixed-timestep RenderPipeline (16.666ms accumulators)
    const { alpha } = this.renderPipeline.tick(delta);

    // Platform surface Y coordinate aligned with stone platform in highland_bg
    const platformY = this.getPlatformY();
    const { p1X: p1BaseX, p2X: p2BaseX } = this.getFighterPositions();

    // Z-Index Depth Layering: active attacker renders in front of defender
    if (this.p1State !== 'idle' && this.p1State !== 'hit' && (this.p2State === 'idle' || this.p2State === 'hit')) {
      this.p1StickGraphics.setDepth(11);
      this.p2StickGraphics.setDepth(10);
    } else if (this.p2State !== 'idle' && this.p2State !== 'hit' && (this.p1State === 'idle' || this.p1State === 'hit')) {
      this.p1StickGraphics.setDepth(10);
      this.p2StickGraphics.setDepth(11);
    } else {
      this.p1StickGraphics.setDepth(10);
      this.p2StickGraphics.setDepth(10);
    }

    const p1PosY = platformY + this.p1JumpY;
    const p2PosY = platformY + this.p2JumpY;

    // Bouncing breathing motion during idle stance
    const p1Breathe = this.p1State === 'idle' ? Math.sin(time / 140) * 5 : 0;
    const p2Breathe = this.p2State === 'idle' ? Math.sin(time / 140 + 1) * 5 : 0;

    // Draw Left Fighter with IK & Ragdoll Solvers
    if (this.p1FxGraphics) {
      this.drawFighter(
        this.p1StickGraphics,
        this.p1FxGraphics,
        p1BaseX,
        p1PosY + p1Breathe,
        1,
        'flat_cap',
        this.p1State,
        this.p1Rotation,
        this.p1Combo,
        this.p1StepToggle,
        time,
        this.p1Ragdoll,
        this.p1CharDef
      );
    }

    // Draw Right Fighter with IK & Ragdoll Solvers
    if (this.p2FxGraphics) {
      this.drawFighter(
        this.p2StickGraphics,
        this.p2FxGraphics,
        p2BaseX,
        p2PosY + p2Breathe,
        -1,
        'glasses',
        this.p2State,
        this.p2Rotation,
        this.p2Combo,
        this.p2StepToggle,
        time,
        this.p2Ragdoll,
        this.p2CharDef
      );
    }

    // Draw Pooled Active Particles
    this.renderPooledParticles();

    // Draw Debug Overlay for OBB Hitboxes & Hurtboxes
    if (this.debugMode && this.debugGraphics) {
      const debugShapes = this.hitboxManager.getDebugShapes();
      this.debugOverlay.render(this.debugGraphics, debugShapes);
    } else if (this.debugGraphics) {
      this.debugGraphics.clear();
    }
  }

  /**
   * Dynamically sets and ingests character skins and loads their CharacterDefinition configs.
   */
  public setCharacterSkins(p1CharId?: string, p2CharId?: string): void {
    if (p1CharId) {
      this.p1CharDef = getCharacterDefinition(p1CharId);
      this.p1CharId = this.p1CharDef.id;
    }
    if (p2CharId) {
      this.p2CharDef = getCharacterDefinition(p2CharId);
      this.p2CharId = this.p2CharDef.id;
    }
  }

  /**
   * Retrieves current loaded character skins.
   */
  public getCharacterSkins(): { p1: CharacterDefinition; p2: CharacterDefinition } {
    return { p1: this.p1CharDef, p2: this.p2CharDef };
  }

  /**
   * Dynamically sets and loads the active arena environment.
   */
  public setArena(arenaId?: string): void {
    this.currentArenaDef = getArenaDefinition(arenaId);
    this.currentArenaId = this.currentArenaDef.id;
    const textureKey = `arena_${this.currentArenaId}`;
    if (this.bgImage && this.textures.exists(textureKey)) {
      this.bgImage.setTexture(textureKey);
      this.handleResize();
    }
  }

  /**
   * Retrieves current active arena definition.
   */
  public getArena(): ArenaDefinition {
    return this.currentArenaDef;
  }

  /**
   * Render zero-allocation pooled active particles with elemental visual types.
   */
  private renderPooledParticles(): void {
    if (!this.p1FxGraphics) return;

    for (const p of this.activeParticles) {
      if (!p.active) continue;
      const progress = Math.min(1, p.currentAgeMs / p.lifetimeMs);
      const alpha = Math.max(0, 1 - progress);
      const colorHex = p.color.startsWith('#') ? parseInt(p.color.slice(1), 16) : 0xffffff;

      if (p.type === 'spark') {
        const len = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y) || 1;
        const nx = (p.velocity.x / len) * (p.size * 2);
        const ny = (p.velocity.y / len) * (p.size * 2);
        this.p1FxGraphics.lineStyle(p.size, colorHex, alpha);
        this.p1FxGraphics.lineBetween(p.position.x - nx, p.position.y - ny, p.position.x + nx, p.position.y + ny);
      } else if (p.type === 'disc') {
        this.p1FxGraphics.lineStyle(1.5, colorHex, alpha * 0.85);
        this.p1FxGraphics.strokeCircle(p.position.x, p.position.y, p.size * (1 + progress * 2.5));
      } else if (p.type === 'lightning') {
        this.p1FxGraphics.lineStyle(2, colorHex, alpha);
        const jx = (Math.random() - 0.5) * 6;
        const jy = (Math.random() - 0.5) * 6;
        this.p1FxGraphics.lineBetween(p.position.x, p.position.y, p.position.x + jx, p.position.y + jy);
      } else {
        this.p1FxGraphics.fillStyle(colorHex, Math.max(0, alpha));
        this.p1FxGraphics.fillCircle(p.position.x, p.position.y, p.size * (0.5 + alpha * 0.5));
      }
    }
  }

  /**
   * Toggles debug overlay rendering mode.
   */
  public setDebugOverlay(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Updates typing progress to physically advance the fighter towards the opponent letter-by-letter.
   */
  updateTypingProgress(side: 'left' | 'right', charIndex: number, totalChars: number) {
    const width = this.cameras.main.width || 1024;
    const isLeft = side === 'left';
    const totalGap = width * 0.32 - 70; // Distance between fighters minus strike offset
    const progress = Math.min(1, Math.max(0, charIndex / Math.max(totalChars, 1)));

    if (isLeft) {
      this.p1StepToggle = !this.p1StepToggle;
      this.p1TypingProgressOffset = progress * totalGap * 0.75;
      const isAttacking = ['jab', 'kick', 'jump_kick', 'uppercut', 'heavy', 'knockdown', 'hit'].includes(this.p1State);
      if (!isAttacking) {
        this.p1State = 'step';
        if (this.p1StepTimer) this.p1StepTimer.remove();
        this.p1StepTimer = this.time.delayedCall(120, () => {
          if (this.p1State === 'step') {
            this.p1State = 'idle';
          }
        });
      }
    } else {
      this.p2StepToggle = !this.p2StepToggle;
      this.p2TypingProgressOffset = -progress * totalGap * 0.75;
      const isAttacking = ['jab', 'kick', 'jump_kick', 'uppercut', 'heavy', 'knockdown', 'hit'].includes(this.p2State);
      if (!isAttacking) {
        this.p2State = 'step';
        if (this.p2StepTimer) this.p2StepTimer.remove();
        this.p2StepTimer = this.time.delayedCall(120, () => {
          if (this.p2State === 'step') {
            this.p2State = 'idle';
          }
        });
      }
    }
  }

  /**
   * Triggers a micro-lunge / rapid step animation when a key is typed correctly.
   */
  triggerKeyStep(side: 'left' | 'right') {
    // Keystroke steps handled via updateTypingProgress
  }

  /**
   * Updates combo counter for fighters to render glowing combo aura rings.
   */
  updateCombo(side: 'left' | 'right', comboCount: number) {
    if (side === 'left') {
      this.p1Combo = comboCount;
    } else {
      this.p2Combo = comboCount;
    }
  }

  /**
   * Triggers full realistic stickman attack animation with MoveSetManager integration!
   */
  triggerAttack(side: 'left' | 'right', attackKind: AttackKind, customDamage?: number, comboStreak: number = 0) {
    const isLeft = side === 'left';
    const width = this.cameras.main.width || 1024;
    const attackerCharDef = isLeft ? this.p1CharDef : this.p2CharDef;
    const defenderCharDef = isLeft ? this.p2CharDef : this.p1CharDef;

    if (isLeft) {
      this.p1Combo = comboStreak;
      this.p1TypingProgressOffset = 0;
      this.p1MoveManager.startMove(attackKind === 'heavy' ? 'heavy_kick' : attackKind === 'kick' ? 'heavy_kick' : 'jab', true);
    } else {
      this.p2Combo = comboStreak;
      this.p2TypingProgressOffset = 0;
      this.p2MoveManager.startMove(attackKind === 'heavy' ? 'heavy_kick' : attackKind === 'kick' ? 'heavy_kick' : 'jab', true);
    }

    let damage = customDamage;
    if (damage === undefined) {
      switch (attackKind) {
        case 'jab':
          damage = Math.floor(Math.random() * 4) + 10;
          break;
        case 'kick':
          damage = Math.floor(Math.random() * 6) + 18;
          break;
        case 'jump_kick':
          damage = Math.floor(Math.random() * 8) + 23;
          break;
        case 'uppercut':
          damage = Math.floor(Math.random() * 8) + 33;
          break;
        case 'heavy':
          damage = Math.floor(Math.random() * 10) + 28;
          break;
        case 'knockdown':
          damage = 50;
          break;
      }
    }

    // Select dynamic move pose & visual move title based on move bucket + combo level
    let moveState: FighterState = attackKind;
    let moveTitle = 'JAB';
    let color = attackerCharDef.theme.primaryColor;

    if (attackKind === 'jab') {
      moveState = 'jab';
      moveTitle = attackerCharDef.id === 'shadow_ronin' ? 'PLASMA JAB' : attackerCharDef.id === 'cyber_valkyrie' ? 'HYDRAULIC JAB' : attackerCharDef.id === 'volt_shinobi' ? 'VOLT JAB' : 'VOID JAB';
      color = attackerCharDef.theme.primaryColor;
    } else if (attackKind === 'kick') {
      if (comboStreak >= 6) {
        moveState = 'jump_kick';
        moveTitle = attackerCharDef.id === 'shadow_ronin' ? 'FLYING BLADE' : attackerCharDef.id === 'cyber_valkyrie' ? 'ROCKET KICK' : attackerCharDef.id === 'volt_shinobi' ? 'LIGHTNING DIVE' : 'SHADOW LEAP';
        color = attackerCharDef.theme.accentColor;
      } else {
        moveState = 'kick';
        moveTitle = 'ROUNDHOUSE KICK';
        color = attackerCharDef.theme.secondaryColor;
      }
    } else if (attackKind === 'heavy') {
      if (comboStreak >= 6) {
        moveState = 'uppercut';
        moveTitle = attackerCharDef.signatureMove ? attackerCharDef.signatureMove.toUpperCase() : 'SKY UPPERCUT';
        color = attackerCharDef.theme.primaryColor;
      } else {
        moveState = 'heavy';
        moveTitle = 'HEAVY IMPACT';
        color = attackerCharDef.theme.accentColor;
      }
    } else if (attackKind === 'knockdown') {
      moveState = 'knockdown';
      moveTitle = 'K.O.!';
      color = '#ef4444';
    }

    const isAerial = moveState === 'jump_kick' || moveState === 'uppercut' || moveState === 'heavy';
    const duration = moveState === 'knockdown' ? 1400 : isAerial ? 750 : 500;

    // Calculate current positions of both fighters to determine dynamic strike reach and impact FX coordinates
    const { p1X: currentP1X, p2X: currentP2X } = this.getFighterPositions();
    const currentGap = Math.max(70, currentP2X - currentP1X);

    // Stagger knockback distance scaled by hit severity
    const knockbackDist = attackKind === 'heavy' || moveState === 'uppercut' ? 65 : attackKind === 'kick' || moveState === 'jump_kick' ? 50 : 35;

    if (isLeft) {
      this.p1State = moveState;
      this.p2State = moveState === 'knockdown' ? 'knockdown' : 'hit';

      // Attacker steps forward to strike defender (persistent advance)
      const stepAdvance = Math.max(0, currentGap - 65) * 0.45;
      this.tweens.add({
        targets: this,
        p1DashOffset: this.p1DashOffset + stepAdvance,
        duration: duration * 0.35,
        ease: 'Cubic.easeOut'
      });

      // Defender hit knockback stagger (pushed right persistently)
      this.tweens.add({
        targets: this,
        p2DashOffset: this.p2DashOffset + knockbackDist,
        duration: 150,
        ease: 'Quad.easeOut'
      });

      // Aerial jump physics arc
      if (isAerial) {
        const jumpHeight = moveState === 'heavy' ? -180 : moveState === 'uppercut' ? -160 : -140;
        this.tweens.add({
          targets: this,
          p1JumpY: jumpHeight,
          duration: duration * 0.4,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.p1JumpY = 0;
          }
        });
      }

      if (this.p1Timer) this.p1Timer.remove();
      if (this.p2Timer) this.p2Timer.remove();

      this.p1Timer = this.time.delayedCall(duration, () => {
        this.p1State = 'idle';
        this.p1JumpY = 0;
      });
      this.p2Timer = this.time.delayedCall(duration, () => {
        if (this.p2State !== 'knockdown') {
          this.p2State = 'idle';
        }
      });
    } else {
      this.p2State = moveState;
      this.p1State = moveState === 'knockdown' ? 'knockdown' : 'hit';

      // Attacker steps forward (left) to strike defender (persistent advance)
      const stepAdvance = Math.max(0, currentGap - 65) * 0.45;
      this.tweens.add({
        targets: this,
        p2DashOffset: this.p2DashOffset - stepAdvance,
        duration: duration * 0.35,
        ease: 'Cubic.easeOut'
      });

      // Defender hit knockback stagger (pushed left persistently)
      this.tweens.add({
        targets: this,
        p1DashOffset: this.p1DashOffset - knockbackDist,
        duration: 150,
        ease: 'Quad.easeOut'
      });

      // Aerial jump physics arc
      if (isAerial) {
        const jumpHeight = moveState === 'heavy' ? -180 : moveState === 'uppercut' ? -160 : -140;
        this.tweens.add({
          targets: this,
          p2JumpY: jumpHeight,
          duration: duration * 0.4,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.p2JumpY = 0;
          }
        });
      }

      if (this.p1Timer) this.p1Timer.remove();
      if (this.p2Timer) this.p2Timer.remove();

      this.p1Timer = this.time.delayedCall(duration, () => {
        if (this.p1State !== 'knockdown') {
          this.p1State = 'idle';
        }
      });
      this.p3Timer = this.time.delayedCall(duration, () => {
        this.p2State = 'idle';
        this.p2JumpY = 0;
      });
    }

    const isHeavyMove = (attackKind as string) === 'heavy' || moveState === 'heavy' || moveState === 'uppercut';

    // Trigger ImpactFeedbackManager hitstop & screen shake
    const minX = width * 0.08;
    const maxX = width * 0.92;
    const defenderX = isLeft
      ? Math.max(minX, Math.min(maxX, currentP2X))
      : Math.max(minX, Math.min(maxX, currentP1X));
    const targetY = this.getPlatformY() - (isAerial ? 120 : 140);
    const comboLabel = comboStreak >= 6 ? ` 🔥 COMBO x${comboStreak}!` : '';
    const labelText = `${moveTitle} -${damage}${comboLabel}`;

    const isCrit = isHeavyMove || (customDamage !== undefined && customDamage >= 25) || comboStreak >= 5;

    this.impactFeedback.processImpact(
      { x: defenderX, y: targetY },
      damage,
      isCrit ? 100 : isHeavyMove ? 80 : 30,
      100,
      { x: isLeft ? 15 : -15, y: -5 }
    );

    if (isCrit) {
      this.spawnFloatingFeedback(defenderX, targetY - 45, 'CRITICAL HIT!', 'crit', '#ef4444');
    }

    if (comboStreak >= 3 && !isCrit) {
      this.spawnFloatingFeedback(defenderX, targetY - 35, `COMBO x${comboStreak}!`, 'combo', color);
    }

    this.spawnFloatingDamage(defenderX, targetY, labelText, color);
    this.spawnImpactSparks(defenderX, targetY + 30, color, attackerCharDef);
    this.spawnImpactParticleBurst(defenderX, targetY + 30, attackerCharDef.theme.particlePalette, isCrit || (attackKind as string) === 'heavy', 20, attackerCharDef);
    this.spawnShockwave(defenderX, targetY + 30, color, attackerCharDef);
  }

  /**
   * Triggers micro visual particle burst using ObjectPool and character elemental themes.
   */
  triggerKeystrokeJuice(side: 'left' | 'right', _charIndex: number, _totalChars: number, comboStreak: number = 0, wpm?: number) {
    const isLeft = side === 'left';
    const charDef = isLeft ? this.p1CharDef : this.p2CharDef;
    const { p1X, p2X } = this.getFighterPositions();
    const handX = isLeft ? p1X + 25 : p2X - 25;
    const handY = this.getPlatformY() - 100;
    const color = charDef.theme.primaryColor;

    // Micro keystroke spark burst via zero-allocation ParticlePool in character's elemental palette
    this.spawnImpactParticleBurst(handX, handY, charDef.theme.particlePalette, false, 6, charDef);

    if (comboStreak >= 4) {
      this.impactFeedback.cameraShake.triggerShake(4);
    }

    // Optional floating +WPM feedback text on fast typing streaks
    if (wpm && wpm > 40 && Math.random() < 0.3) {
      this.spawnFloatingFeedback(handX, handY - 20, `+${Math.round(wpm)} WPM`, 'wpm', color);
    }
  }

  /**
   * Triggers visual stun stagger animation and floating STUNNED popup when fighter makes a typo error.
   */
  triggerStun(side: 'left' | 'right') {
    const isLeft = side === 'left';
    const { p1X, p2X } = this.getFighterPositions();
    const posX = isLeft ? p1X : p2X;
    const posY = this.getPlatformY() - 110;

    if (isLeft) {
      this.p1State = 'hit';
      this.time.delayedCall(500, () => {
        if (this.p1State === 'hit') this.p1State = 'idle';
      });
    } else {
      this.p2State = 'hit';
      this.time.delayedCall(500, () => {
        if (this.p2State === 'hit') this.p2State = 'idle';
      });
    }

    this.spawnFloatingFeedback(posX, posY, 'STUNNED! (-0.5s)', 'damage', '#f59e0b');
  }

  /**
   * Floating Combat Feedback Text (+WPM, Combo Count, Critical Hit!)
   */
  public spawnFloatingFeedback(x: number, y: number, text: string, type: 'damage' | 'wpm' | 'combo' | 'crit', colorStr: string) {
    let fontSize = '24px';
    let strokeThickness = 5;
    let duration = 800;
    let targetYOffset = -70;

    if (type === 'wpm') {
      fontSize = '22px';
      strokeThickness = 4;
      targetYOffset = -55;
      duration = 750;
    } else if (type === 'combo') {
      fontSize = '28px';
      strokeThickness = 6;
      targetYOffset = -75;
      duration = 850;
    } else if (type === 'crit') {
      fontSize = '36px';
      strokeThickness = 8;
      targetYOffset = -90;
      duration = 1000;
    }

    const feedbackText = this.add.text(x, y, text, {
      fontFamily: type === 'crit' ? 'Impact, sans-serif' : 'system-ui, -apple-system, sans-serif',
      fontSize: fontSize,
      fontStyle: '900',
      color: colorStr,
      stroke: '#000000',
      strokeThickness: strokeThickness,
      shadow: { color: '#000000', blur: 12, fill: true }
    });

    feedbackText.setOrigin(0.5, 0.5);
    feedbackText.setScale(type === 'crit' ? 0.3 : 0.6);
    feedbackText.setDepth(30);

    this.tweens.add({
      targets: feedbackText,
      y: y + targetYOffset,
      scale: type === 'crit' ? 1.4 : 1.2,
      alpha: { from: 1, to: 0 },
      ease: type === 'crit' ? 'Back.easeOut' : 'Cubic.easeOut',
      duration: duration,
      onComplete: () => {
        feedbackText.destroy();
      }
    });
  }

  private spawnFloatingDamage(x: number, y: number, text: string, color: string) {
    const damageText = this.add.text(x, y, text, {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '34px',
      fontStyle: '900',
      color: color,
      stroke: '#000000',
      strokeThickness: 7,
      shadow: { color: '#000000', blur: 10, fill: true }
    });
    damageText.setOrigin(0.5, 0.5);
    damageText.setScale(0.5);
    damageText.setDepth(25);

    this.tweens.add({
      targets: damageText,
      y: y - 85,
      scale: 1.35,
      alpha: { from: 1, to: 0 },
      ease: 'Back.easeOut',
      duration: 900,
      onComplete: () => {
        damageText.destroy();
      }
    });
  }

  /**
   * Zero-allocation particle burst using ParticlePool from ObjectPool.ts with character elemental styles.
   */
  public spawnImpactParticleBurst(
    x: number,
    y: number,
    colorStrOrPalette: string | string[],
    isHeavy: boolean = false,
    particleCount?: number,
    charDefParam?: CharacterDefinition
  ) {
    const charDef = charDefParam ?? (typeof colorStrOrPalette === 'string' ? (colorStrOrPalette === '#ef4444' || colorStrOrPalette === '#f43f5e' ? this.p2CharDef : this.p1CharDef) : this.p1CharDef);
    const palette = Array.isArray(colorStrOrPalette)
      ? colorStrOrPalette
      : charDef?.theme?.particlePalette ?? [colorStrOrPalette, '#ffffff'];

    const count = particleCount ?? (isHeavy ? 24 : 14);
    const baseSpeed = isHeavy ? 350 : 180;

    for (let i = 0; i < count; i++) {
      const p = ParticlePool.acquire();
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed * (0.6 + Math.random() * 0.8);
      const color = palette[i % palette.length];

      p.position.x = x;
      p.position.y = y;
      p.velocity.x = Math.cos(angle) * speed;
      p.velocity.y = Math.sin(angle) * speed;
      p.size = Math.random() * (isHeavy ? 5 : 3) + 2;
      p.color = color;
      p.lifetimeMs = isHeavy ? 450 : 260;
      p.currentAgeMs = 0;
      p.active = true;

      // Character-specific elemental particle styles
      if (charDef?.id === 'volt_shinobi') {
        p.type = i % 3 === 0 ? 'spark' : i % 5 === 0 ? 'lightning' : 'circle';
        p.lifetimeMs = 200 + Math.random() * 100;
      } else if (charDef?.id === 'void_assassin') {
        p.type = i % 3 === 0 ? 'orbital' : i % 6 === 0 ? 'disc' : 'circle';
        p.angle = Math.random() * Math.PI * 2;
        p.angularVelocity = (Math.random() - 0.5) * 8;
        p.lifetimeMs = 380 + Math.random() * 120;
      } else if (charDef?.id === 'shadow_ronin') {
        p.type = i % 2 === 0 ? 'spark' : 'circle';
      } else if (charDef?.id === 'cyber_valkyrie') {
        p.type = 'circle';
        p.size = Math.random() * (isHeavy ? 6 : 4) + 2.5;
      } else {
        p.type = 'circle';
      }

      this.activeParticles.push(p);
    }
  }

  private spawnImpactSparks(x: number, y: number, colorStrOrPalette: string | string[], charDefParam?: CharacterDefinition) {
    const graphics = this.add.graphics();
    graphics.setDepth(20);

    const charDef = charDefParam ?? (typeof colorStrOrPalette === 'string' ? (colorStrOrPalette === '#ef4444' || colorStrOrPalette === '#f43f5e' ? this.p2CharDef : this.p1CharDef) : this.p1CharDef);

    if (charDef?.id === 'volt_shinobi') {
      // Jagged gold zigzag lightning sparks
      graphics.lineStyle(3, 0xfde047, 1);
      const numBolts = 8;
      for (let i = 0; i < numBolts; i++) {
        const baseAngle = (i * Math.PI * 2) / numBolts;
        const len = Math.random() * 20 + 20;
        const midX = x + Math.cos(baseAngle) * (len * 0.5) + (Math.random() - 0.5) * 12;
        const midY = y + Math.sin(baseAngle) * (len * 0.5) + (Math.random() - 0.5) * 12;
        const endX = x + Math.cos(baseAngle) * len;
        const endY = y + Math.sin(baseAngle) * len;
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(midX, midY);
        graphics.lineTo(endX, endY);
        graphics.strokePath();
      }
    } else if (charDef?.id === 'cyber_valkyrie') {
      // Crimson explosive blast star
      graphics.lineStyle(4, 0xef4444, 1);
      const numRays = 8;
      for (let i = 0; i < numRays; i++) {
        const angle = (i * Math.PI * 2) / numRays;
        const len = (i % 2 === 0 ? 35 : 20) + Math.random() * 10;
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        graphics.strokePath();
      }
      graphics.fillStyle(0xfecaca, 1);
      graphics.fillCircle(x, y, 6);
    } else if (charDef?.id === 'void_assassin') {
      // Swirling amethyst void shards
      graphics.lineStyle(3, 0xc084fc, 1);
      const numShards = 6;
      for (let i = 0; i < numShards; i++) {
        const angle = (i * Math.PI * 2) / numShards;
        const len = Math.random() * 25 + 20;
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(x + Math.cos(angle + 0.3) * len, y + Math.sin(angle + 0.3) * len);
        graphics.strokePath();
      }
    } else {
      // Sharp cutting azure plasma spikes
      graphics.lineStyle(3, 0x00e5ff, 1);
      const numSparks = 10;
      for (let i = 0; i < numSparks; i++) {
        const angle = (i * Math.PI * 2) / numSparks;
        const length = Math.random() * 25 + 25;
        graphics.beginPath();
        graphics.moveTo(x, y);
        graphics.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        graphics.strokePath();
      }
    }

    this.tweens.add({
      targets: graphics,
      alpha: { from: 1, to: 0 },
      scale: 1.6,
      duration: 280,
      onComplete: () => {
        graphics.destroy();
      }
    });
  }

  private spawnShockwave(x: number, y: number, colorStr: string, charDefParam?: CharacterDefinition) {
    const graphics = this.add.graphics();
    graphics.setDepth(18);

    const charDef = charDefParam ?? (colorStr === '#ef4444' || colorStr === '#f43f5e' ? this.p2CharDef : this.p1CharDef);
    const shockColor = charDef ? parseInt(charDef.theme.primaryColor.replace('#', '0x'), 16) : 0x38bdf8;
    const accentColor = charDef ? parseInt(charDef.theme.accentColor.replace('#', '0x'), 16) : 0x00e5ff;

    graphics.lineStyle(4, shockColor, 0.9);
    graphics.strokeCircle(x, y, 10);
    graphics.lineStyle(2, accentColor, 0.7);
    graphics.strokeCircle(x, y, 16);

    this.tweens.add({
      targets: graphics,
      alpha: { from: 0.9, to: 0 },
      scale: 3.5,
      duration: 320,
      onComplete: () => {
        graphics.destroy();
      }
    });
  }

  /**
   * Industry-Grade Vector Fighter Renderer with Modular 2D Skeletal Rigs & 2-Bone IK Solvers.
   * Renders custom headgear, pauldrons, chestplates, gauntlets, weapons, and flowing accessories
   * according to each character's CharacterGearSpec and CharacterVisualTheme.
   */
  private drawFighter(
    g: Phaser.GameObjects.Graphics,
    fxG: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    facing: number,
    accessory: 'flat_cap' | 'glasses' | string,
    state: FighterState,
    rotation: number,
    comboStreak: number,
    stepToggle: boolean,
    time: number,
    ragdoll?: RagdollSystem,
    charDef?: CharacterDefinition
  ) {
    g.clear();
    fxG.clear();

    const isP1 = facing === 1;
    const activeCharDef = charDef ?? (isP1 ? this.p1CharDef : this.p2CharDef) ?? getCharacterDefinition('shadow_ronin');
    const bodyColor = activeCharDef.theme.bodyColor;
    const gloveColor = activeCharDef.theme.gloveColor;
    const eyeColor = activeCharDef.theme.eyeColor;

    // 1. Core Anatomy Parameters
    // Platform surface: y. Hips at y - 52. Neck at y - 106. Head at y - 128.
    let hipX = x - facing * 2;
    let hipY = y - 52;
    let neckX = x + facing * 4;
    let neckY = y - 106;
    let headX = x + facing * 6;
    let headY = y - 128;

    // 2D Side Profile Offsets (Shoulder & Hip depth)
    let lShoulderX = neckX - facing * 3; // Rear shoulder
    let lShoulderY = neckY + 2;
    let rShoulderX = neckX + facing * 3; // Lead shoulder
    let rShoulderY = neckY + 2;

    let lHipX = hipX - facing * 4; // Rear hip
    let rHipX = hipX + facing * 4; // Lead hip

    // Default Martial Guard Hand Positions
    let rHandX = neckX + facing * 24; // Lead fist at jaw level
    let rHandY = neckY - 2;
    let lHandX = neckX + facing * 8;  // Rear fist at chest level
    let lHandY = lShoulderY + 10;

    // Default Stance Foot Targets (Grounded spread)
    let lFootX = lHipX - facing * 22; // Rear foot
    let lFootY = y;
    let rFootX = rHipX + facing * 20; // Lead foot
    let rFootY = y;

    // 2. Dynamic Poses for Fighter States (Stable Spine Axis & Crisp Limb Strikes)
    if (state === 'step') {
      if (stepToggle) {
        rHandX = neckX + facing * 36;
        rHandY = neckY + 2;
      } else {
        lHandX = neckX + facing * 30;
        lHandY = neckY + 4;
      }
    } else if (state === 'windup') {
      rHandX = neckX - facing * 8;
      rHandY = neckY + 8;
    } else if (state === 'jab') {
      // Crisp lead punch extension from shoulder with solid spine
      rHandX = neckX + facing * 44;
      rHandY = neckY - 2;
      lHandX = neckX + facing * 6;
      lHandY = neckY + 8;
    } else if (state === 'kick') {
      neckX = x - facing * 2;
      headX = x - facing * 4;

      rFootX = hipX + facing * 48;
      rFootY = hipY - 18;

      lHandX = neckX - facing * 8;
      lHandY = neckY + 8;
    } else if (state === 'jump_kick') {
      rFootX = hipX + facing * 50;
      rFootY = hipY - 6;

      lFootX = hipX - facing * 18;
      lFootY = hipY + 20;

      rHandX = neckX - facing * 8;
      rHandY = neckY + 10;
      lHandX = neckX + facing * 16;
      lHandY = neckY - 4;
    } else if (state === 'uppercut') {
      rHandX = neckX + facing * 16;
      rHandY = neckY - 48;

      lHandX = neckX - facing * 8;
      lHandY = neckY + 8;
    } else if (state === 'heavy') {
      lHandX = neckX + facing * 38;
      lHandY = neckY - 6;
      rHandX = neckX + facing * 44;
      rHandY = neckY - 2;

      rFootX = hipX + facing * 24;
      rFootY = y;
    } else if (state === 'hit') {
      neckX = x - facing * 6;
      headX = x - facing * 10;

      rHandX = headX - facing * 6;
      rHandY = headY + 18;
      lHandX = neckX - facing * 10;
      lHandY = neckY + 18;
    } else if (state === 'knockdown') {
      hipX = x - facing * 18;
      hipY = y - 8;
      neckX = x - facing * 54;
      neckY = y - 8;
      headX = x - facing * 72;
      headY = y - 8;

      lFootX = x + facing * 12;
      lFootY = y - 8;
      rFootX = x + facing * 24;
      rFootY = y - 8;

      lHandX = neckX + 6;
      lHandY = y - 6;
      rHandX = neckX - 10;
      rHandY = y - 6;
    }

    // 3. Solve 2-Bone IK Solvers
    // Upper Arm = 24px, Forearm = 24px; Thigh = 30px, Shin = 30px
    // Arm elbows point DOWN (+facing). Knee joints flex FORWARD (-facing).
    const armL = solve2BoneIK({ x: lShoulderX, y: lShoulderY }, { x: lHandX, y: lHandY }, 24, 24, facing as 1 | -1);
    const armR = solve2BoneIK({ x: rShoulderX, y: rShoulderY }, { x: rHandX, y: rHandY }, 24, 24, facing as 1 | -1);

    const legL = solve2BoneIK({ x: lHipX, y: hipY }, { x: lFootX, y: lFootY }, 30, 30, -facing as 1 | -1);
    const legR = solve2BoneIK({ x: rHipX, y: hipY }, { x: rFootX, y: rFootY }, 30, 30, -facing as 1 | -1);

    // KO fall rotation matrix
    let finalHeadX = headX;
    let finalHeadY = headY;
    let finalNeckX = neckX;
    let finalNeckY = neckY;
    let finalHipX = hipX;
    let finalHipY = hipY;

    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rot = (px: number, py: number) => {
        const dx = px - hipX;
        const dy = py - hipY;
        return {
          x: hipX + dx * cos - dy * sin,
          y: hipY + dx * sin + dy * cos
        };
      };

      const hP = rot(headX, headY); finalHeadX = hP.x; finalHeadY = hP.y;
      const nP = rot(neckX, neckY); finalNeckX = nP.x; finalNeckY = nP.y;
      const lP = rot(hipX, hipY); finalHipX = lP.x; finalHipY = lP.y;
    }

    // --- MODULAR 2D SKELETAL RIG & VECTOR MESH RENDERING ---

    // 0. DYNAMIC GROUND DROP SHADOW & CONTACT AMBIENT OCCLUSION
    const platformY = this.getPlatformY();
    const jumpAltitude = Math.max(0, platformY - y);
    const shadowScale = Math.max(0.35, 1 - jumpAltitude / 240);
    const shadowAlpha = Math.max(0.08, 0.48 * shadowScale);

    // Soft Elliptical Ground Drop Shadow pinned to floor
    fxG.fillStyle(0x020617, shadowAlpha);
    fxG.fillEllipse(x, platformY + 1, 48 * shadowScale, 12 * shadowScale);

    // High-density Core Contact Shadow
    fxG.fillStyle(0x000000, shadowAlpha * 1.3);
    fxG.fillEllipse(x, platformY + 1, 28 * shadowScale, 6.5 * shadowScale);

    // Ground Contact Foot Ambient Shadows when feet are near ground
    if (jumpAltitude < 14) {
      const footContactAlpha = (1 - jumpAltitude / 14) * 0.55;
      fxG.fillStyle(0x000000, footContactAlpha);
      fxG.fillEllipse(legL.tip.x, platformY + 1, 14, 4.5);
      fxG.fillEllipse(legR.tip.x, platformY + 1, 16, 5);
    }

    // 1. REAR LIMBS (Layer 1 - Behind Torso)
    // Rear Leg (Thigh: 11px -> 8px, Shin: 8px -> 6px)
    drawTaperedLimb(g, { x: lHipX, y: hipY }, legL.joint, 11, 8, bodyColor);
    drawTaperedLimb(g, legL.joint, legL.tip, 8, 6, bodyColor);

    // Rear Foot (Tabi Boot / Armored Greave with flat grounded sole)
    g.fillStyle(bodyColor, 1);
    g.beginPath();
    g.moveTo(legL.tip.x - facing * 6, legL.tip.y);
    g.lineTo(legL.tip.x + facing * 9, legL.tip.y);
    g.lineTo(legL.tip.x + facing * 7, legL.tip.y - 5);
    g.lineTo(legL.tip.x - facing * 5, legL.tip.y - 5);
    g.closePath();
    g.fillPath();
    // Armored Sole Edge
    g.lineStyle(1.5, 0x0f172a, 0.85);
    g.lineBetween(legL.tip.x - facing * 6, legL.tip.y, legL.tip.x + facing * 9, legL.tip.y);

    // Rear Arm (Upper Arm: 9px -> 7px, Forearm: 7px -> 5px)
    drawTaperedLimb(g, { x: lShoulderX, y: lShoulderY }, armL.joint, 9, 7, bodyColor);
    drawTaperedLimb(g, armL.joint, armL.tip, 7, 5, bodyColor);

    // 2. TORSO, PAULDRONS, CHESTPLATE, WAIST & SCARF (Layer 2)
    const neckL = { x: finalNeckX - facing * 7, y: finalNeckY };
    const neckR = { x: finalNeckX + facing * 7, y: finalNeckY };
    const hipL = { x: finalHipX - facing * 4, y: finalHipY };
    const hipR = { x: finalHipX + facing * 4, y: finalHipY };

    drawCharacterPauldronsAndTorso(
      g,
      neckL,
      neckR,
      hipL,
      hipR,
      { x: lShoulderX, y: lShoulderY },
      { x: rShoulderX, y: rShoulderY },
      facing,
      activeCharDef,
      state,
      time
    );

    drawCharacterWaistAndScarf(g, finalHipX, finalHipY, finalHeadX, finalHeadY, facing, activeCharDef, state, time);

    // Head & Custom Modular Headgear (Kabuto, Valkyrie, Shinobi, Shadow Hood)
    drawCharacterHeadgear(g, finalHeadX, finalHeadY, facing, activeCharDef, state, time);

    // Legacy accessory overlay support if explicitly requested
    if (accessory === 'flat_cap') {
      this.drawFlatCap(g, finalHeadX, finalHeadY, facing);
    } else if (accessory === 'glasses') {
      this.drawGlasses(g, finalHeadX, finalHeadY, facing);
    }

    // 3. FRONT LIMBS & WEAPONS (Layer 3 - In Front of Torso)
    // Lead Leg (Thigh: 11px -> 8px, Shin: 8px -> 6px)
    drawTaperedLimb(g, { x: rHipX, y: hipY }, legR.joint, 11, 8, bodyColor);
    drawTaperedLimb(g, legR.joint, legR.tip, 8, 6, bodyColor);

    // Lead Foot (Tabi Boot / Armored Greave with flat grounded sole)
    g.fillStyle(bodyColor, 1);
    g.beginPath();
    g.moveTo(legR.tip.x - facing * 6, legR.tip.y);
    g.lineTo(legR.tip.x + facing * 11, legR.tip.y);
    g.lineTo(legR.tip.x + facing * 9, legR.tip.y - 5);
    g.lineTo(legR.tip.x - facing * 5, legR.tip.y - 5);
    g.closePath();
    g.fillPath();
    // Armored Sole Edge
    g.lineStyle(1.5, 0x0f172a, 0.85);
    g.lineBetween(legR.tip.x - facing * 6, legR.tip.y, legR.tip.x + facing * 11, legR.tip.y);

    // Lead Arm (Upper Arm: 9px -> 7px, Forearm: 7px -> 5px)
    drawTaperedLimb(g, { x: rShoulderX, y: rShoulderY }, armR.joint, 9, 7, bodyColor);
    drawTaperedLimb(g, armR.joint, armR.tip, 7, 5, bodyColor);

    // Custom Gauntlets & Signature Weapons (Plasma Katana, Hydraulic Fist, Lightning Kunai, Void Daggers)
    drawCharacterGauntletsAndWeapons(g, fxG, armL, armR, facing, activeCharDef, state, time);

    // 4. Knockdown Dazed Stars
    if (state === 'knockdown') {
      const starTime = time / 180;
      for (let i = 0; i < 3; i++) {
        const angle = starTime + (i * Math.PI * 2) / 3;
        const starX = finalHeadX + Math.cos(angle) * 20;
        const starY = finalHeadY - 28 + Math.sin(angle) * 6;
        g.fillStyle(0xfde047, 1);
        g.fillCircle(starX, starY, 4);
      }
    }

    // 5. Dynamic Motion & Elemental Slash Arcs
    drawCharacterAttackVFX(fxG, activeCharDef, state, neckX, neckY, hipX, hipY, armR, legR, facing, time);
  }

  /**
   * Triggers a cinematic 3-Phase KO finish sequence:
   * 1. Hitstop freeze frame & dynamic camera zoom on impact
   * 2. Slow-motion knockdown fall physics to stage floor
   * 3. Ground impact shockwave & elemental particle explosion
   */
  public triggerKOSequence(
    loserSide: 'left' | 'right',
    _winnerSide: 'left' | 'right',
    onComplete?: () => void
  ) {
    const isLeftLoser = loserSide === 'left';
    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;

    const winnerCharDef = isLeftLoser ? this.p2CharDef : this.p1CharDef;
    const loserCharDef = isLeftLoser ? this.p1CharDef : this.p2CharDef;

    const { p1X, p2X } = this.getFighterPositions();
    const loserX = isLeftLoser ? p1X : p2X;
    const platformY = this.getPlatformY();

    // Phase 1: Freeze Frame (Hitstop) & Camera Punch-In
    this.cameras.main.pan(loserX, platformY - 80, 300, 'Cubic.easeOut');
    this.cameras.main.zoomTo(1.35, 300, 'Cubic.easeOut');
    this.cameras.main.shake(300, 0.02);

    // K.O. Impact Banner Text
    const koText = this.add.text(loserX, platformY - 140, 'K.O.!', {
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: '88px',
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 10,
      shadow: { color: '#000000', blur: 20, fill: true }
    });
    koText.setOrigin(0.5, 0.5);
    koText.setScale(0.2);
    koText.setDepth(35);

    this.tweens.add({
      targets: koText,
      scale: 1.25,
      duration: 350,
      ease: 'Back.easeOut'
    });

    if (isLeftLoser) {
      this.p1State = 'knockdown';
      this.p2State = 'uppercut';
      this.p1Ragdoll.setMode('Ragdoll');
    } else {
      this.p2State = 'knockdown';
      this.p1State = 'uppercut';
      this.p2Ragdoll.setMode('Ragdoll');
    }

    // Phase 2: Slow-Motion Knockdown Fall Animation (1100ms)
    const fallRotation = isLeftLoser ? -Math.PI / 2 : Math.PI / 2;
    const fallDash = isLeftLoser ? -50 : 50;

    this.tweens.add({
      targets: this,
      p1Rotation: isLeftLoser ? fallRotation : 0,
      p2Rotation: isLeftLoser ? 0 : fallRotation,
      p1DashOffset: isLeftLoser ? fallDash : this.p1DashOffset,
      p2DashOffset: isLeftLoser ? this.p2DashOffset : fallDash,
      p1JumpY: isLeftLoser ? 20 : this.p1JumpY,
      p2JumpY: isLeftLoser ? this.p2JumpY : 20,
      duration: 1100,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Ground impact shockwave & particles with winner & loser elemental VFX
        const groundX = isLeftLoser ? width * 0.34 + fallDash : width * 0.66 + fallDash;
        this.spawnShockwave(groundX, platformY, winnerCharDef.theme.primaryColor, winnerCharDef);
        this.spawnImpactSparks(groundX, platformY, winnerCharDef.theme.primaryColor, winnerCharDef);
        this.spawnImpactParticleBurst(groundX, platformY, winnerCharDef.theme.particlePalette, true, 36, winnerCharDef);
        this.cameras.main.shake(220, 0.015);

        // Winner victory posture
        if (isLeftLoser) {
          this.p2State = 'uppercut';
        } else {
          this.p1State = 'uppercut';
        }

        if (onComplete) {
          onComplete();
        }
      }
    });
  }

  public resetCamera() {
    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;
    this.cameras.main.pan(width / 2, height / 2, 200);
    this.cameras.main.zoomTo(1.0, 200);
  }

  private drawFlatCap(g: Phaser.GameObjects.Graphics, hX: number, hY: number, facing: number) {
    const capColor = 0x1e293b;
    g.fillStyle(capColor, 1);
    g.lineStyle(4, 0x0f172a, 1);

    g.fillEllipse(hX - facing * 3, hY - 18, 24, 12);
    g.strokeEllipse(hX - facing * 3, hY - 18, 24, 12);

    const visorX = hX + facing * 12;
    const visorY = hY - 14;
    g.beginPath();
    g.moveTo(hX + facing * 3, hY - 17);
    g.lineTo(visorX + facing * 10, visorY);
    g.lineTo(hX + facing * 5, hY - 10);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0x0f172a, 1);
    g.fillCircle(hX - facing * 3, hY - 28, 4);
  }

  private drawGlasses(g: Phaser.GameObjects.Graphics, hX: number, hY: number, facing: number) {
    g.lineStyle(4, 0x0f172a, 1);
    g.fillStyle(0x38bdf8, 0.7);

    const lensY = hY - 3;
    const lensRadius = 8;

    const fLensX = hX + facing * 9;
    g.fillCircle(fLensX, lensY, lensRadius);
    g.strokeCircle(fLensX, lensY, lensRadius);

    const bLensX = hX - facing * 4;
    g.fillCircle(bLensX, lensY, lensRadius);
    g.strokeCircle(bLensX, lensY, lensRadius);

    g.lineBetween(bLensX + facing * lensRadius, lensY, fLensX - facing * lensRadius, lensY);
    g.lineBetween(bLensX - facing * lensRadius, lensY, hX - facing * 18, lensY - 3);
    g.strokePath();
  }
}
