import Phaser from 'phaser';
import highlandBgUrl from '../assets/highland_bg.jpg';
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
    this.load.image('highland_bg', highlandBgUrl);
  }

  create() {
    this.cameras.main.setRoundPixels(true);

    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;

    // Background Image
    try {
      this.bgImage = this.add.image(width / 2, height / 2, 'highland_bg');
      this.bgImage.setOrigin(0.5, 0.5);
      this.bgImage.setDisplaySize(width, height);
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
    const platformY = height * 0.64;
    this.p1Ragdoll.initDefaultSkeleton({ x: width * 0.34, y: platformY }, 1.0);
    this.p2Ragdoll.initDefaultSkeleton({ x: width * 0.66, y: platformY }, 1.0);

    // Handle dynamic canvas resizing
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize() {
    this.cameras.main.setRoundPixels(true);
    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;

    if (this.bgImage) {
      this.bgImage.setPosition(width / 2, height / 2);
      this.bgImage.setDisplaySize(width, height);
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
      p.position.x += p.velocity.x * dtSec;
      p.position.y += p.velocity.y * dtSec + 150 * dtSec * dtSec; // gravity

      if (p.currentAgeMs >= p.lifetimeMs) {
        ParticlePool.release(p);
        this.activeParticles.splice(i, 1);
      }
    }

    // 5. Update Spatial Hash Grid & OBB Hitbox / Hurtbox Registrations
    this.updateSpatialCollisions();
  }

  /**
   * Spatial hash grid broadphase query & OBB hitbox collision checks.
   */
  private updateSpatialCollisions(): void {
    this.spatialHashGrid.clear();
    this.hitboxManager.clearAll();

    const width = Math.max(this.cameras.main?.width || 1024, 1024);
    const height = Math.max(this.cameras.main?.height || 580, 580);
    const platformY = height * 0.64;

    const p1BaseX = width * 0.34 + this.p1DashOffset + this.p1TypingProgressOffset;
    const p2BaseX = width * 0.66 + this.p2DashOffset + this.p2TypingProgressOffset;

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

    const width = Math.max(this.cameras.main.width, (this.sys.game.config.width as number) || 1024);
    const height = Math.max(this.cameras.main.height, (this.sys.game.config.height as number) || 580);

    // Platform surface Y coordinate aligned with stone platform in highland_bg
    const platformY = height * 0.64;
    let p1BaseX = width * 0.34 + this.p1DashOffset + this.p1TypingProgressOffset;
    let p2BaseX = width * 0.66 + this.p2DashOffset + this.p2TypingProgressOffset;

    // 1D Pushbox collision separation (prevents fighters from passing through each other)
    const MIN_GAP = 65; // minimum physical gap between stickmen hips
    const currentGap = p2BaseX - p1BaseX;

    if (currentGap < MIN_GAP) {
      const overlap = MIN_GAP - currentGap;
      p1BaseX -= overlap / 2;
      p2BaseX += overlap / 2;
    }

    // Keep fighters within arena platform boundaries (8% to 92% screen width)
    const minX = width * 0.08;
    const maxX = width * 0.92;

    p1BaseX = Math.max(minX, Math.min(maxX - MIN_GAP, p1BaseX));
    p2BaseX = Math.max(minX + MIN_GAP, Math.min(maxX, p2BaseX));

    if (p2BaseX - p1BaseX < MIN_GAP) {
      if (p1BaseX === minX) {
        p2BaseX = minX + MIN_GAP;
      } else if (p2BaseX === maxX) {
        p1BaseX = maxX - MIN_GAP;
      }
    }

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
        this.p1Ragdoll
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
        this.p2Ragdoll
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
   * Render zero-allocation pooled active particles.
   */
  private renderPooledParticles(): void {
    if (!this.p1FxGraphics) return;

    for (const p of this.activeParticles) {
      if (!p.active) continue;
      const alpha = 1 - p.currentAgeMs / p.lifetimeMs;
      const colorHex = p.color.startsWith('#') ? parseInt(p.color.slice(1), 16) : 0xffffff;

      this.p1FxGraphics.fillStyle(colorHex, Math.max(0, alpha));
      this.p1FxGraphics.fillCircle(p.position.x, p.position.y, p.size * (0.5 + alpha * 0.5));
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
    let color = '#38bdf8';

    if (attackKind === 'jab') {
      moveState = 'jab';
      moveTitle = 'JAB';
      color = '#38bdf8';
    } else if (attackKind === 'kick') {
      if (comboStreak >= 6) {
        moveState = 'jump_kick';
        moveTitle = 'FLYING KICK';
        color = '#a855f7';
      } else {
        moveState = 'kick';
        moveTitle = 'ROUNDHOUSE KICK';
        color = '#34d399';
      }
    } else if (attackKind === 'heavy') {
      if (comboStreak >= 6) {
        moveState = 'uppercut';
        moveTitle = 'SKY UPPERCUT';
        color = '#ec4899';
      } else {
        moveState = 'heavy';
        moveTitle = 'HEAVY SLAM';
        color = '#f59e0b';
      }
    } else if (attackKind === 'knockdown') {
      moveState = 'knockdown';
      moveTitle = 'K.O.!';
      color = '#ef4444';
    }

    const isAerial = moveState === 'jump_kick' || moveState === 'uppercut' || moveState === 'heavy';
    const duration = moveState === 'knockdown' ? 1400 : isAerial ? 750 : 500;

    // Calculate current positions of both fighters to determine dynamic strike reach and impact FX coordinates
    const currentP1X = width * 0.34 + this.p1TypingProgressOffset;
    const currentP2X = width * 0.66 + this.p2TypingProgressOffset;
    const currentGap = Math.max(70, currentP2X - currentP1X);

    // Dynamic dash reach stops attacker right in front of defender (leaving a 60px strike distance)
    const attackerReach = Math.max(0, currentGap - 60);

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
    const defenderX = isLeft ? Math.min(width * 0.92, currentP2X + knockbackDist) : Math.max(width * 0.08, currentP1X - knockbackDist);
    const targetY = (this.cameras.main.height || 580) * 0.64 - (isAerial ? 120 : 140);
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
    this.spawnImpactSparks(defenderX, targetY + 30, color);
    this.spawnImpactParticleBurst(defenderX, targetY + 30, color, isCrit || (attackKind as string) === 'heavy', 18);
    this.spawnShockwave(defenderX, targetY + 30, color);
  }

  /**
   * Triggers micro visual particle burst using ObjectPool.
   */
  triggerKeystrokeJuice(side: 'left' | 'right', _charIndex: number, _totalChars: number, comboStreak: number = 0, wpm?: number) {
    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;
    const isLeft = side === 'left';
    const handX = isLeft ? width * 0.34 + this.p1TypingProgressOffset + 25 : width * 0.66 + this.p2TypingProgressOffset - 25;
    const handY = height * 0.64 - 100;
    const color = isLeft ? '#38bdf8' : '#f43f5e';

    // Micro keystroke spark burst via zero-allocation ParticlePool
    this.spawnImpactParticleBurst(handX, handY, color, false, 5);

    if (comboStreak >= 4) {
      this.impactFeedback.cameraShake.triggerShake(4);
    }

    // Optional floating +WPM feedback text on fast typing streaks
    if (wpm && wpm > 40 && Math.random() < 0.3) {
      this.spawnFloatingFeedback(handX, handY - 20, `+${Math.round(wpm)} WPM`, 'wpm', '#38bdf8');
    }
  }

  /**
   * Triggers visual stun stagger animation and floating STUNNED popup when fighter makes a typo error.
   */
  triggerStun(side: 'left' | 'right') {
    const isLeft = side === 'left';
    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;
    const posX = isLeft ? width * 0.34 : width * 0.66;
    const posY = height * 0.64 - 110;

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

    const stunText = this.add.text(posX, posY, 'STUNNED! (-0.5s)', {
      fontFamily: 'Impact, sans-serif',
      fontSize: '22px',
      color: '#f59e0b',
      stroke: '#000000',
      strokeThickness: 4
    });
    stunText.setOrigin(0.5, 0.5);
    stunText.setDepth(20);

    this.tweens.add({
      targets: stunText,
      y: posY - 40,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => stunText.destroy()
    });
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
   * Zero-allocation particle burst using ParticlePool from ObjectPool.ts.
   */
  public spawnImpactParticleBurst(x: number, y: number, colorStr: string, isHeavy: boolean = false, particleCount: number = 14) {
    const baseSpeed = isHeavy ? 350 : 180;
    for (let i = 0; i < particleCount; i++) {
      const p = ParticlePool.acquire();
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed * (0.6 + Math.random() * 0.8);

      p.position.x = x;
      p.position.y = y;
      p.velocity.x = Math.cos(angle) * speed;
      p.velocity.y = Math.sin(angle) * speed;
      p.size = Math.random() * (isHeavy ? 6 : 4) + 2;
      p.color = colorStr;
      p.lifetimeMs = isHeavy ? 450 : 250;
      p.currentAgeMs = 0;
      p.active = true;

      this.activeParticles.push(p);
    }
  }

  private spawnImpactSparks(x: number, y: number, colorStr: string) {
    const graphics = this.add.graphics();
    graphics.setDepth(20);

    const sparkColor = colorStr === '#f59e0b' ? 0xf59e0b : colorStr === '#a855f7' ? 0xa855f7 : 0x38bdf8;
    graphics.lineStyle(3, sparkColor, 1);

    const numSparks = 10;
    for (let i = 0; i < numSparks; i++) {
      const angle = (i * Math.PI * 2) / numSparks;
      const length = Math.random() * 25 + 25;
      graphics.beginPath();
      graphics.moveTo(x, y);
      graphics.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      graphics.strokePath();
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

  private spawnShockwave(x: number, y: number, colorStr: string) {
    const graphics = this.add.graphics();
    graphics.setDepth(18);

    const shockColor = colorStr === '#f59e0b' ? 0xf59e0b : colorStr === '#a855f7' ? 0xa855f7 : 0x38bdf8;
    graphics.lineStyle(4, shockColor, 0.9);
    graphics.strokeCircle(x, y, 10);

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
   * Dynamic procedural IK stickman renderer with 2-Bone IK Limb Solvers.
   */
  /**
   * Helper to draw sleek tapered vector limbs (thighs, shins, arms, forearms).
   */
  private drawTaperedLimb(
    g: Phaser.GameObjects.Graphics,
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    w1: number,
    w2: number,
    fillColor: number,
    strokeColor?: number
  ) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-5;

    const nx = -dy / len;
    const ny = dx / len;

    const hW1 = w1 / 2;
    const hW2 = w2 / 2;

    const v1 = { x: p1.x + nx * hW1, y: p1.y + ny * hW1 };
    const v2 = { x: p1.x - nx * hW1, y: p1.y - ny * hW1 };
    const v3 = { x: p2.x - nx * hW2, y: p2.y - ny * hW2 };
    const v4 = { x: p2.x + nx * hW2, y: p2.y + ny * hW2 };

    g.fillStyle(fillColor, 1);
    g.beginPath();
    g.moveTo(v1.x, v1.y);
    g.lineTo(v4.x, v4.y);
    g.lineTo(v3.x, v3.y);
    g.lineTo(v2.x, v2.y);
    g.closePath();
    g.fillPath();

    if (strokeColor !== undefined) {
      g.lineStyle(1.5, strokeColor, 0.7);
      g.strokePath();
    }

    g.fillCircle(p1.x, p1.y, hW1);
    g.fillCircle(p2.x, p2.y, hW2);
  }

  /**
   * Industry-Grade Vector Ninja / Shadow Fighter Renderer.
   * Features tapered vector limbs, V-tapered martial gi, colored obi belt,
   * glowing eye visor slits, flowing headband scarves, tabi boots, and strike gauntlets.
   */
  /**
   * Proportional, Clean & Iconic Stickman Fighter Renderer.
   * Features balanced anatomy, martial guard hand positions, natural joint flexing,
   * clean fight gloves, grounded feet, and subtle warrior eyes.
   */
  private drawFighter(
    g: Phaser.GameObjects.Graphics,
    fxG: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    facing: number,
    accessory: 'flat_cap' | 'glasses',
    state: FighterState,
    rotation: number,
    comboStreak: number,
    stepToggle: boolean,
    time: number,
    ragdoll?: RagdollSystem
  ) {
    g.clear();
    fxG.clear();

    const isP1 = facing === 1;
    const bodyColor = 0x0f172a; // Dark slate stickman body
    const gloveColor = isP1 ? 0x0284c7 : 0xdc2626; // Cyan for P1, Crimson for P2
    const eyeColor = isP1 ? 0x38bdf8 : 0xf87171;

    // Glowing combo aura ring
    if (comboStreak >= 2) {
      fxG.lineStyle(4, gloveColor, 0.85);
      fxG.strokeCircle(x, y - 60, 64 + Math.sin(time / 100) * 6);
    }

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

    // --- RENDER STICKMAN ---

    // --- INDUSTRY-GRADE VECTOR SHADOW NINJA WARRIOR RENDERER ---

    // 1. REAR LIMBS (Layer 1 - Behind Torso)
    // Rear Leg (Thigh: 11px -> 8px, Shin: 8px -> 6px)
    this.drawTaperedLimb(g, { x: lHipX, y: hipY }, legL.joint, 11, 8, bodyColor);
    this.drawTaperedLimb(g, legL.joint, legL.tip, 8, 6, bodyColor);

    // Rear Tabi Boot
    g.fillStyle(bodyColor, 1);
    g.beginPath();
    g.moveTo(legL.tip.x - facing * 5, legL.tip.y);
    g.lineTo(legL.tip.x + facing * 8, legL.tip.y);
    g.lineTo(legL.tip.x + facing * 4, legL.tip.y - 4);
    g.closePath();
    g.fillPath();

    // Rear Arm (Upper Arm: 9px -> 7px, Forearm: 7px -> 5px)
    this.drawTaperedLimb(g, { x: lShoulderX, y: lShoulderY }, armL.joint, 9, 7, bodyColor);
    this.drawTaperedLimb(g, armL.joint, armL.tip, 7, 5, bodyColor);

    // Rear Glove Fist / Gauntlet
    g.fillStyle(gloveColor, 1);
    g.fillCircle(armL.tip.x, armL.tip.y, 6.5);
    g.lineStyle(1.5, 0xffffff, 0.6);
    g.strokeCircle(armL.tip.x, armL.tip.y, 6.5);

    // 2. TORSO & V-TAPER CHEST (Layer 2)
    // V-Taper Athletic Chest Polygon (Shoulders: 16px wide, Waist: 10px wide)
    const neckL = { x: finalNeckX - facing * 7, y: finalNeckY };
    const neckR = { x: finalNeckX + facing * 7, y: finalNeckY };
    const hipL = { x: finalHipX - facing * 4, y: finalHipY };
    const hipR = { x: finalHipX + facing * 4, y: finalHipY };

    g.fillStyle(bodyColor, 1);
    g.beginPath();
    g.moveTo(neckL.x, neckL.y);
    g.lineTo(neckR.x, neckR.y);
    g.lineTo(hipR.x, hipR.y);
    g.lineTo(hipL.x, hipL.y);
    g.closePath();
    g.fillPath();

    // Martial Obi Waist Belt & Flowing Tails
    g.fillStyle(gloveColor, 1);
    g.fillRect(finalHipX - 5, finalHipY - 3, 10, 5);

    const obiWave = Math.sin(time / 100) * 3;
    g.lineStyle(2.5, gloveColor, 1);
    g.beginPath();
    g.moveTo(finalHipX - facing * 4, finalHipY);
    g.lineTo(finalHipX - facing * 12, finalHipY + 10 + obiWave);
    g.strokePath();

    // Ninja Mask & Head (Solid 16px circle)
    const headRadius = 16;
    g.fillStyle(bodyColor, 1);
    g.fillCircle(finalHeadX, finalHeadY, headRadius);

    // Glowing Neon Eye Visor Slit
    if (state !== 'knockdown') {
      const eyeX = finalHeadX + facing * 6;
      const eyeY = finalHeadY - 2;
      g.fillStyle(eyeColor, 1);
      g.fillCircle(eyeX, eyeY, 3.5);
      g.fillCircle(eyeX + facing * 4, eyeY, 2.5);
    }

    // Flowing Dual-Segment Ninja Scarf
    if (state !== 'knockdown') {
      const bandX = finalHeadX - facing * 14;
      const bandY = finalHeadY - 4;
      const scarfWave = Math.sin(time / 120) * 5;

      g.lineStyle(3.5, gloveColor, 1);
      g.beginPath();
      g.moveTo(bandX, bandY);
      g.lineTo(bandX - facing * 14, bandY + 4 + scarfWave);
      g.lineTo(bandX - facing * 24, bandY + 12 + scarfWave * 1.5);
      g.strokePath();
    }

    // 3. FRONT LIMBS (Layer 3 - In Front of Torso)
    // Lead Leg (Thigh: 11px -> 8px, Shin: 8px -> 6px)
    this.drawTaperedLimb(g, { x: rHipX, y: hipY }, legR.joint, 11, 8, bodyColor);
    this.drawTaperedLimb(g, legR.joint, legR.tip, 8, 6, bodyColor);

    // Lead Tabi Boot
    g.fillStyle(bodyColor, 1);
    g.beginPath();
    g.moveTo(legR.tip.x - facing * 5, legR.tip.y);
    g.lineTo(legR.tip.x + facing * 10, legR.tip.y);
    g.lineTo(legR.tip.x + facing * 5, legR.tip.y - 4);
    g.closePath();
    g.fillPath();

    // Lead Arm (Upper Arm: 9px -> 7px, Forearm: 7px -> 5px)
    this.drawTaperedLimb(g, { x: rShoulderX, y: rShoulderY }, armR.joint, 9, 7, bodyColor);
    this.drawTaperedLimb(g, armR.joint, armR.tip, 7, 5, bodyColor);

    // Lead Strike Gauntlet / Glove
    g.fillStyle(gloveColor, 1);
    g.fillCircle(armR.tip.x, armR.tip.y, 7.5);
    g.lineStyle(2, 0xffffff, 0.85);
    g.strokeCircle(armR.tip.x, armR.tip.y, 7.5);

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

    // Motion & Energy Slash Arcs
    if (state === 'heavy') {
      fxG.lineStyle(6, 0xf59e0b, 0.95);
      fxG.beginPath();
      fxG.arc(neckX, neckY, 70, -Math.PI / 4, Math.PI / 3, false);
      fxG.strokePath();
    } else if (state === 'uppercut') {
      fxG.lineStyle(5, 0xa855f7, 0.95);
      fxG.beginPath();
      fxG.arc(armR.tip.x, armR.tip.y + 30, 45, -Math.PI / 2, Math.PI / 2, false);
      fxG.strokePath();
    } else if (state === 'jump_kick') {
      fxG.lineStyle(5, 0x38bdf8, 0.95);
      fxG.beginPath();
      fxG.lineBetween(hipX, hipY, legR.tip.x + facing * 20, legR.tip.y);
      fxG.strokePath();
    }
  }

  /**
   * Triggers a cinematic 3-Phase KO finish sequence:
   * 1. Hitstop freeze frame & dynamic camera zoom on impact
   * 2. Slow-motion knockdown fall physics to stage floor
   * 3. Ground impact shockwave & victory posture
   */
  public triggerKOSequence(
    loserSide: 'left' | 'right',
    _winnerSide: 'left' | 'right',
    onComplete?: () => void
  ) {
    const isLeftLoser = loserSide === 'left';
    const width = this.cameras.main.width || 1024;
    const height = this.cameras.main.height || 580;

    const loserX = isLeftLoser
      ? width * 0.34 + this.p1DashOffset + this.p1TypingProgressOffset
      : width * 0.66 + this.p2DashOffset + this.p2TypingProgressOffset;
    const platformY = height * 0.64;

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
        // Ground impact shockwave & particles
        const groundX = isLeftLoser ? width * 0.34 + fallDash : width * 0.66 + fallDash;
        this.spawnShockwave(groundX, platformY, '#ef4444');
        this.spawnImpactSparks(groundX, platformY, '#ef4444');
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
