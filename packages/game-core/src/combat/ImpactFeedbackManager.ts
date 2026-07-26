import { Vector2D } from '../physics/IKSystem.js';

export interface ParticleSpec {
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  color: string;
  lifetimeMs: number;
}

export interface ParticleBurstSpec {
  impactPoint: Vector2D;
  particleCount: number;
  particles: ParticleSpec[];
  shockwaveRadius: number;
  flashIntensity: number;
}

export class HitStopController {
  private remainingMs = 0;

  public triggerHitStop(durationMs: number): void {
    // If a heavier hitstop is triggered, override remaining hitstop
    if (durationMs > this.remainingMs) {
      this.remainingMs = durationMs;
    }
  }

  public update(dtMs: number): { isFrozen: boolean; remainingMs: number } {
    if (this.remainingMs <= 0) {
      return { isFrozen: false, remainingMs: 0 };
    }

    this.remainingMs = Math.max(0, this.remainingMs - dtMs);
    return {
      isFrozen: this.remainingMs > 0,
      remainingMs: this.remainingMs
    };
  }

  public isFrozen(): boolean {
    return this.remainingMs > 0;
  }

  public getRemainingMs(): number {
    return this.remainingMs;
  }

  public reset(): void {
    this.remainingMs = 0;
  }
}

export function calculateKnockback(
  weight: number,
  damage: number,
  vector: Vector2D
): Vector2D {
  const safeWeight = Math.max(10, weight);
  const weightScale = 100 / safeWeight;
  const damageScale = 1 + Math.max(0, damage) * 0.15;

  return {
    x: vector.x * damageScale * weightScale,
    y: vector.y * damageScale * weightScale
  };
}

export function spawnParticleBurst(
  impactPoint: Vector2D,
  attackWeight: 'light' | 'medium' | 'heavy' | number
): ParticleBurstSpec {
  let weightKey: 'light' | 'medium' | 'heavy';

  if (typeof attackWeight === 'number') {
    if (attackWeight <= 3) weightKey = 'light';
    else if (attackWeight <= 5) weightKey = 'medium';
    else weightKey = 'heavy';
  } else {
    weightKey = attackWeight;
  }

  let particleCount: number;
  let baseSpeed: number;
  let shockwaveRadius: number;
  let flashIntensity: number;
  let colorPalette: string[];

  switch (weightKey) {
    case 'light':
      particleCount = 10;
      baseSpeed = 150;
      shockwaveRadius = 15;
      flashIntensity = 0.3;
      colorPalette = ['#ffff55', '#ffcc00', '#ffffff'];
      break;
    case 'medium':
      particleCount = 20;
      baseSpeed = 250;
      shockwaveRadius = 30;
      flashIntensity = 0.6;
      colorPalette = ['#ffaa00', '#ff6600', '#ffff00', '#ffffff'];
      break;
    case 'heavy':
      particleCount = 35;
      baseSpeed = 400;
      shockwaveRadius = 60;
      flashIntensity = 1.0;
      colorPalette = ['#ff3300', '#ff0000', '#ffaa00', '#ffffff'];
      break;
  }

  const particles: ParticleSpec[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2 + (Math.sin(i) * 0.2);
    const speed = baseSpeed * (0.6 + (i % 5) * 0.15);
    const color = colorPalette[i % colorPalette.length]!;

    particles.push({
      position: { x: impactPoint.x, y: impactPoint.y },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      size: weightKey === 'light' ? 2 : weightKey === 'medium' ? 3 : 5,
      color,
      lifetimeMs: 200 + (i % 4) * 50
    });
  }

  return {
    impactPoint: { ...impactPoint },
    particleCount,
    particles,
    shockwaveRadius,
    flashIntensity
  };
}

export class CameraShakeEngine {
  private amplitude = 0;
  private frequency = 25; // Hz
  private decayRate = 5.0; // lambda coefficient
  private elapsedTimeSec = 0;
  private active = false;
  private currentOffset: Vector2D = { x: 0, y: 0 };

  public triggerShake(amplitude: number, frequency = 25, decayRate = 5.0): void {
    if (amplitude >= this.amplitude || !this.active) {
      this.amplitude = amplitude;
      this.frequency = frequency;
      this.decayRate = decayRate;
      this.elapsedTimeSec = 0;
      this.active = true;
    }
  }

  public update(dtMs: number): Vector2D {
    if (!this.active) {
      this.currentOffset = { x: 0, y: 0 };
      return this.currentOffset;
    }

    this.elapsedTimeSec += dtMs / 1000;
    const t = this.elapsedTimeSec;

    // Decay formula: A * noise(t * f) * exp(-lambda * t)
    const decay = Math.exp(-this.decayRate * t);
    const currentAmp = this.amplitude * decay;

    if (currentAmp < 0.05) {
      this.active = false;
      this.currentOffset = { x: 0, y: 0 };
      return this.currentOffset;
    }

    const noiseX = Math.sin(t * this.frequency) + 0.5 * Math.sin(2.3 * t * this.frequency + 1.1);
    const noiseY = Math.cos(t * this.frequency * 1.1) + 0.5 * Math.cos(2.7 * t * this.frequency + 2.3);

    this.currentOffset = {
      x: currentAmp * (noiseX / 1.5),
      y: currentAmp * (noiseY / 1.5)
    };

    return this.currentOffset;
  }

  public getCurrentOffset(): Vector2D {
    return { ...this.currentOffset };
  }

  public isShaking(): boolean {
    return this.active;
  }

  public reset(): void {
    this.active = false;
    this.elapsedTimeSec = 0;
    this.currentOffset = { x: 0, y: 0 };
  }
}

export class ImpactFeedbackManager {
  public hitStop = new HitStopController();
  public cameraShake = new CameraShakeEngine();

  public processImpact(
    impactPoint: Vector2D,
    damage: number,
    hitstopMs: number,
    weight: number,
    knockbackVector: Vector2D
  ): {
    knockbackImpulse: Vector2D;
    particleBurst: ParticleBurstSpec;
  } {
    this.hitStop.triggerHitStop(hitstopMs);

    const attackWeight: 'light' | 'medium' | 'heavy' =
      damage <= 2 ? 'light' : damage <= 4 ? 'medium' : 'heavy';

    const shakeAmp = attackWeight === 'light' ? 4 : attackWeight === 'medium' ? 8 : 16;
    this.cameraShake.triggerShake(shakeAmp);

    const knockbackImpulse = calculateKnockback(weight, damage, knockbackVector);
    const particleBurst = spawnParticleBurst(impactPoint, attackWeight);

    return {
      knockbackImpulse,
      particleBurst
    };
  }

  public update(dtMs: number): { isFrozen: boolean; cameraOffset: Vector2D } {
    const { isFrozen } = this.hitStop.update(dtMs);
    const cameraOffset = this.cameraShake.update(dtMs);
    return { isFrozen, cameraOffset };
  }
}
