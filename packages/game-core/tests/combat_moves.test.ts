import { describe, it, expect, beforeEach } from 'vitest';
import {
  MOVE_SET_REGISTRY,
  getMoveSpec,
  MoveSetManager,
  ProjectileManager,
  checkOBBvsCircle,
  checkOBBvsCapsule,
  checkOBBvsOBB,
  checkInterpolatedOBBvsCircle,
  checkInterpolatedOBBvsCapsule,
  HitboxManager,
  HitStopController,
  calculateKnockback,
  spawnParticleBurst,
  CameraShakeEngine,
  ImpactFeedbackManager,
  FightingMoveName,
  OBBHitbox,
  CircleHurtbox,
  CapsuleHurtbox
} from '../src/index.js';

describe('Milestone 3 — MoveSetManager & Frame Data', () => {
  it('should contain all 6 canonical fighting move specs with complete frame data', () => {
    const requiredMoves: FightingMoveName[] = [
      'jab',
      'heavy_kick',
      'aerial_strike',
      'ranged_shot',
      'directional_sweep',
      'parry_block'
    ];

    for (const moveName of requiredMoves) {
      const spec = getMoveSpec(moveName);
      expect(spec).toBeDefined();
      expect(spec.name).toBe(moveName);
      expect(spec.startupFrames).toBeGreaterThan(0);
      expect(spec.activeFrames).toBeGreaterThan(0);
      expect(spec.recoveryFrames).toBeGreaterThan(0);
      expect(spec.damage).toBeGreaterThanOrEqual(0);
      expect(spec.hitstopMs).toBeGreaterThan(0);
      expect(spec.knockbackVector).toHaveProperty('x');
      expect(spec.knockbackVector).toHaveProperty('y');
      expect(spec.hitboxSpec).toBeDefined();
      expect(spec.hitboxSpec.extents.x).toBeGreaterThan(0);
      expect(spec.hitboxSpec.extents.y).toBeGreaterThan(0);
    }
  });

  it('should transition through move phases correctly (startup -> active -> recovery -> idle)', () => {
    const manager = new MoveSetManager();
    expect(manager.getCurrentPhase()).toBe('idle');

    const started = manager.startMove('jab');
    expect(started).toBe(true);
    expect(manager.getCurrentMove()).toBe('jab');
    expect(manager.getCurrentPhase()).toBe('startup');

    // Jab frame data: 2 startup, 3 active, 5 recovery (total 10)
    // Frame 0: startup
    let update = manager.updateFrame(1);
    // Frame 1: startup
    expect(update.phase).toBe('startup');
    expect(update.isHitboxActive).toBe(false);

    // Frame 2: active
    update = manager.updateFrame(1);
    expect(update.phase).toBe('active');
    expect(update.isHitboxActive).toBe(true);

    // Frame 3 & 4: active
    manager.updateFrame(2);

    // Frame 5: recovery
    update = manager.updateFrame(1);
    expect(update.phase).toBe('recovery');
    expect(update.isHitboxActive).toBe(false);

    // Update remaining frames to completion
    update = manager.updateFrame(5);
    expect(update.isComplete).toBe(true);
    expect(manager.getCurrentPhase()).toBe('idle');
  });

  it('should enforce cancel rules between move transitions', () => {
    const manager = new MoveSetManager();
    manager.startMove('jab');

    // Cannot immediately cancel during early startup (frame 0) into another move (unless forced)
    let canCancel = manager.canCancelTo('directional_sweep');
    expect(canCancel).toBe(false);

    // Advance to active phase (frame 2)
    manager.updateFrame(2);
    expect(manager.getCurrentPhase()).toBe('active');

    // Jab active phase CAN cancel into heavy_kick
    canCancel = manager.canCancelTo('heavy_kick');
    expect(canCancel).toBe(true);

    // Executing cancel into heavy_kick
    const transitionSuccess = manager.startMove('heavy_kick');
    expect(transitionSuccess).toBe(true);
    expect(manager.getCurrentMove()).toBe('heavy_kick');
    expect(manager.getCurrentPhase()).toBe('startup');
  });

  it('should record combo chains', () => {
    const manager = new MoveSetManager();
    manager.startMove('jab');
    manager.updateFrame(10); // complete jab

    manager.startMove('heavy_kick');
    manager.updateFrame(20); // complete heavy_kick

    const chain = manager.getComboChain();
    expect(chain).toEqual(['jab', 'heavy_kick']);
  });
});

describe('Milestone 3 — ProjectileManager', () => {
  let projManager: ProjectileManager;

  beforeEach(() => {
    projManager = new ProjectileManager();
  });

  it('should spawn, update position, and expire ranged projectiles', () => {
    const proj = projManager.spawnProjectile('p1', { x: 100, y: 200 }, 1, 500);
    expect(proj.id).toBeDefined();
    expect(proj.position).toEqual({ x: 100, y: 200 });
    expect(proj.velocity.x).toBe(500);

    // Update by 100ms (0.1s)
    const activeProjs = projManager.update(100);
    expect(activeProjs.length).toBe(1);
    expect(activeProjs[0]?.position.x).toBe(150);

    // Update until past lifetime (1500ms total)
    projManager.update(1500);
    expect(projManager.getActiveProjectiles().length).toBe(0);
  });

  it('should remove projectile on impact', () => {
    const proj = projManager.spawnProjectile('p1', { x: 100, y: 200 }, 1, 400);
    expect(projManager.getActiveProjectiles().length).toBe(1);

    projManager.removeProjectile(proj.id);
    expect(projManager.getActiveProjectiles().length).toBe(0);
  });
});

describe('Milestone 3 — HitboxManager & SAT Collision Math', () => {
  it('should accurately test OBB vs Circle collision using SAT', () => {
    const obb: OBBHitbox = {
      center: { x: 100, y: 100 },
      extents: { x: 20, y: 10 },
      rotation: 0
    };

    const overlappingCircle: CircleHurtbox = {
      center: { x: 115, y: 100 },
      radius: 10
    };

    const separateCircle: CircleHurtbox = {
      center: { x: 200, y: 200 },
      radius: 10
    };

    const hitResult = checkOBBvsCircle(obb, overlappingCircle);
    expect(hitResult.collided).toBe(true);
    expect(hitResult.overlap).toBeGreaterThan(0);
    expect(hitResult.contactPoint).toBeDefined();

    const missResult = checkOBBvsCircle(obb, separateCircle);
    expect(missResult.collided).toBe(false);
  });

  it('should detect rotated OBB vs Circle collisions', () => {
    const rotatedOBB: OBBHitbox = {
      center: { x: 100, y: 100 },
      extents: { x: 30, y: 5 },
      rotation: Math.PI / 4 // 45 degrees
    };

    // Circle along the diagonal line of rotation
    const circle: CircleHurtbox = {
      center: { x: 115, y: 115 },
      radius: 8
    };

    const res = checkOBBvsCircle(rotatedOBB, circle);
    expect(res.collided).toBe(true);
  });

  it('should accurately test OBB vs Capsule collision', () => {
    const obb: OBBHitbox = {
      center: { x: 100, y: 100 },
      extents: { x: 20, y: 20 },
      rotation: 0
    };

    const capsule: CapsuleHurtbox = {
      p1: { x: 110, y: 50 },
      p2: { x: 110, y: 150 }, // vertical line segment passing right through OBB
      radius: 10
    };

    const res = checkOBBvsCapsule(obb, capsule);
    expect(res.collided).toBe(true);
    expect(res.overlap).toBeGreaterThan(0);
  });

  it('should test OBB vs OBB SAT collision detection', () => {
    const obbA: OBBHitbox = {
      center: { x: 100, y: 100 },
      extents: { x: 20, y: 20 },
      rotation: 0
    };

    const obbB: OBBHitbox = {
      center: { x: 130, y: 100 },
      extents: { x: 20, y: 20 },
      rotation: Math.PI / 6
    };

    const res = checkOBBvsOBB(obbA, obbB);
    expect(res.collided).toBe(true);
    expect(res.overlap).toBeGreaterThan(0);
  });

  it('should handle sub-frame interpolation to eliminate high-speed attack tunneling', () => {
    // Attack hitbox moves rapidly from x=0 to x=200 in a single frame.
    // Hurtbox is at x=100. Discrete test at start (x=0) and end (x=200) misses, but path passes through x=100!
    const prevOBB: OBBHitbox = {
      center: { x: 0, y: 100 },
      extents: { x: 10, y: 10 },
      rotation: 0
    };

    const currOBB: OBBHitbox = {
      center: { x: 200, y: 100 },
      extents: { x: 10, y: 10 },
      rotation: 0
    };

    const hurtboxCircle: CircleHurtbox = {
      center: { x: 100, y: 100 },
      radius: 15
    };

    // Discrete check at start & end fails
    expect(checkOBBvsCircle(prevOBB, hurtboxCircle).collided).toBe(false);
    expect(checkOBBvsCircle(currOBB, hurtboxCircle).collided).toBe(false);

    // Sub-frame interpolated check catches tunneling!
    const interpolatedRes = checkInterpolatedOBBvsCircle(prevOBB, currOBB, hurtboxCircle, 8);
    expect(interpolatedRes.collided).toBe(true);
  });

  it('should provide getDebugShapes() visual overlay primitives', () => {
    const manager = new HitboxManager();
    manager.registerOBB('attack_box', {
      center: { x: 100, y: 100 },
      extents: { x: 20, y: 15 },
      rotation: 0
    });

    manager.registerCircle('head_hurtbox', {
      center: { x: 150, y: 80 },
      radius: 12
    });

    manager.registerCapsule('torso_hurtbox', {
      p1: { x: 150, y: 90 },
      p2: { x: 150, y: 140 },
      radius: 15
    });

    const shapes = manager.getDebugShapes();
    expect(shapes.length).toBe(3);
    expect(shapes.map((s) => s.type)).toContain('obb');
    expect(shapes.map((s) => s.type)).toContain('circle');
    expect(shapes.map((s) => s.type)).toContain('capsule');
  });
});

describe('Milestone 3 — ImpactFeedbackManager', () => {
  it('should manage hit-stop freeze frames during impact window', () => {
    const hitStop = new HitStopController();
    expect(hitStop.isFrozen()).toBe(false);

    hitStop.triggerHitStop(80); // 80ms hitstop
    expect(hitStop.isFrozen()).toBe(true);
    expect(hitStop.getRemainingMs()).toBe(80);

    const update1 = hitStop.update(30);
    expect(update1.isFrozen).toBe(true);
    expect(update1.remainingMs).toBe(50);

    const update2 = hitStop.update(60);
    expect(update2.isFrozen).toBe(false);
    expect(update2.remainingMs).toBe(0);
  });

  it('should calculate knockback momentum impulse scaling with weight and damage', () => {
    const baseVector = { x: 10, y: -5 };

    // Standard weight (100), light damage (2)
    const lightKnockback = calculateKnockback(100, 2, baseVector);
    expect(lightKnockback.x).toBeCloseTo(13); // 10 * (1 + 0.3) * (100/100) = 13
    expect(lightKnockback.y).toBeCloseTo(-6.5);

    // Heavy defender (200 weight), heavy damage (6)
    const heavyKnockback = calculateKnockback(200, 6, baseVector);
    // damageScale = 1 + 0.9 = 1.9, weightScale = 100/200 = 0.5
    // knockbackX = 10 * 1.9 * 0.5 = 9.5
    expect(heavyKnockback.x).toBeCloseTo(9.5);
  });

  it('should generate dynamic particle burst specifications for impact effects', () => {
    const burst = spawnParticleBurst({ x: 200, y: 150 }, 'heavy');

    expect(burst.impactPoint).toEqual({ x: 200, y: 150 });
    expect(burst.particleCount).toBeGreaterThanOrEqual(30);
    expect(burst.particles.length).toBe(burst.particleCount);
    expect(burst.shockwaveRadius).toBe(60);
    expect(burst.flashIntensity).toBe(1.0);

    // Check particle velocity radial spread
    const firstParticle = burst.particles[0];
    expect(firstParticle?.position).toEqual({ x: 200, y: 150 });
    expect(firstParticle?.velocity.x).toBeDefined();
    expect(firstParticle?.velocity.y).toBeDefined();
  });

  it('should compute decaying impact camera shake offset (A * noise(t * f) * exp(-lambda * t))', () => {
    const shakeEngine = new CameraShakeEngine();
    expect(shakeEngine.isShaking()).toBe(false);

    shakeEngine.triggerShake(10, 25, 5.0);
    expect(shakeEngine.isShaking()).toBe(true);

    const initialOffset = shakeEngine.update(10); // 10ms
    expect(Math.abs(initialOffset.x) + Math.abs(initialOffset.y)).toBeGreaterThan(0);

    // Advance 2 seconds -> shake amplitude decays exponentially to near 0 and turns off
    shakeEngine.update(2000);
    expect(shakeEngine.isShaking()).toBe(false);
    expect(shakeEngine.getCurrentOffset()).toEqual({ x: 0, y: 0 });
  });

  it('should orchestrate impact processing with ImpactFeedbackManager', () => {
    const feedbackManager = new ImpactFeedbackManager();

    const impact = feedbackManager.processImpact(
      { x: 150, y: 100 },
      6, // damage
      80, // hitstopMs
      100, // weight
      { x: 18, y: -8 } // knockbackVector
    );

    expect(impact.knockbackImpulse.x).toBeGreaterThan(0);
    expect(impact.particleBurst.particles.length).toBeGreaterThan(0);
    expect(feedbackManager.hitStop.isFrozen()).toBe(true);
    expect(feedbackManager.cameraShake.isShaking()).toBe(true);

    const frameUpdate = feedbackManager.update(100);
    expect(frameUpdate.isFrozen).toBe(false); // 80ms hitstop expired
  });
});
