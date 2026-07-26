import { Vector2D } from '../physics/IKSystem.js';

export type FightingMoveName =
  | 'jab'
  | 'heavy_kick'
  | 'aerial_strike'
  | 'ranged_shot'
  | 'directional_sweep'
  | 'parry_block';

export type { Vector2D };

export interface HitboxSpec {
  offset: Vector2D;
  extents: Vector2D; // half-width, half-height
  rotation?: number;
}

export interface MoveSpec {
  name: FightingMoveName;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  damage: number;
  hitstopMs: number;
  knockbackVector: Vector2D;
  hitboxSpec: HitboxSpec;
}

export type MovePhase = 'idle' | 'startup' | 'active' | 'recovery';

export const MOVE_SET_REGISTRY: Record<FightingMoveName, MoveSpec> = {
  jab: {
    name: 'jab',
    startupFrames: 2,
    activeFrames: 3,
    recoveryFrames: 5,
    damage: 2,
    hitstopMs: 30,
    knockbackVector: { x: 5, y: -2 },
    hitboxSpec: {
      offset: { x: 45, y: -20 },
      extents: { x: 25, y: 15 },
      rotation: 0
    }
  },
  heavy_kick: {
    name: 'heavy_kick',
    startupFrames: 6,
    activeFrames: 5,
    recoveryFrames: 10,
    damage: 6,
    hitstopMs: 80,
    knockbackVector: { x: 18, y: -8 },
    hitboxSpec: {
      offset: { x: 60, y: -10 },
      extents: { x: 35, y: 20 },
      rotation: 0.15
    }
  },
  aerial_strike: {
    name: 'aerial_strike',
    startupFrames: 4,
    activeFrames: 6,
    recoveryFrames: 8,
    damage: 5,
    hitstopMs: 60,
    knockbackVector: { x: 12, y: 15 },
    hitboxSpec: {
      offset: { x: 40, y: 30 },
      extents: { x: 30, y: 25 },
      rotation: -0.3
    }
  },
  ranged_shot: {
    name: 'ranged_shot',
    startupFrames: 5,
    activeFrames: 2,
    recoveryFrames: 8,
    damage: 4,
    hitstopMs: 40,
    knockbackVector: { x: 8, y: -3 },
    hitboxSpec: {
      offset: { x: 50, y: -25 },
      extents: { x: 20, y: 20 },
      rotation: 0
    }
  },
  directional_sweep: {
    name: 'directional_sweep',
    startupFrames: 5,
    activeFrames: 4,
    recoveryFrames: 9,
    damage: 4,
    hitstopMs: 70,
    knockbackVector: { x: 20, y: -2 },
    hitboxSpec: {
      offset: { x: 55, y: 35 },
      extents: { x: 40, y: 15 },
      rotation: 0
    }
  },
  parry_block: {
    name: 'parry_block',
    startupFrames: 1,
    activeFrames: 10,
    recoveryFrames: 6,
    damage: 0,
    hitstopMs: 50,
    knockbackVector: { x: -2, y: 0 },
    hitboxSpec: {
      offset: { x: 20, y: 0 },
      extents: { x: 20, y: 40 },
      rotation: 0
    }
  }
};

export function getMoveSpec(moveName: FightingMoveName): MoveSpec {
  return MOVE_SET_REGISTRY[moveName];
}

export interface MoveStateUpdate {
  moveName: FightingMoveName | null;
  frame: number;
  phase: MovePhase;
  isHitboxActive: boolean;
  isComplete: boolean;
}

export class MoveSetManager {
  private currentMove: FightingMoveName | null = null;
  private currentFrame = 0;
  private comboChain: FightingMoveName[] = [];

  public startMove(moveName: FightingMoveName, force = false): boolean {
    if (this.currentMove !== null && !force && !this.canCancelTo(moveName)) {
      return false;
    }
    this.currentMove = moveName;
    this.currentFrame = 0;
    this.comboChain.push(moveName);
    if (this.comboChain.length > 10) {
      this.comboChain.shift();
    }
    return true;
  }

  public canCancelTo(nextMove: FightingMoveName): boolean {
    if (this.currentMove === null) return true;
    const spec = getMoveSpec(this.currentMove);
    const totalFrames = spec.startupFrames + spec.activeFrames + spec.recoveryFrames;
    const phase = this.getCurrentPhase();

    // Parry block can interrupt during recovery
    if (nextMove === 'parry_block' && phase === 'recovery') return true;

    // Jabs can cancel into heavy_kick during active or recovery phase
    if (this.currentMove === 'jab' && nextMove === 'heavy_kick' && (phase === 'active' || phase === 'recovery')) {
      return true;
    }

    // Cancel late recovery (last frame) into any move
    if (this.currentFrame >= totalFrames - 1) return true;

    return false;
  }

  public updateFrame(deltaFrames = 1): MoveStateUpdate {
    if (this.currentMove === null) {
      return {
        moveName: null,
        frame: 0,
        phase: 'idle',
        isHitboxActive: false,
        isComplete: true
      };
    }

    const spec = getMoveSpec(this.currentMove);
    const totalFrames = spec.startupFrames + spec.activeFrames + spec.recoveryFrames;

    this.currentFrame += deltaFrames;

    if (this.currentFrame >= totalFrames) {
      const completedMove = this.currentMove;
      this.currentMove = null;
      this.currentFrame = 0;
      return {
        moveName: completedMove,
        frame: totalFrames,
        phase: 'idle',
        isHitboxActive: false,
        isComplete: true
      };
    }

    const phase = this.getCurrentPhase();
    return {
      moveName: this.currentMove,
      frame: this.currentFrame,
      phase,
      isHitboxActive: phase === 'active',
      isComplete: false
    };
  }

  public getCurrentPhase(): MovePhase {
    if (this.currentMove === null) return 'idle';
    const spec = getMoveSpec(this.currentMove);
    if (this.currentFrame < spec.startupFrames) return 'startup';
    if (this.currentFrame < spec.startupFrames + spec.activeFrames) return 'active';
    return 'recovery';
  }

  public getCurrentMove(): FightingMoveName | null {
    return this.currentMove;
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  public getComboChain(): FightingMoveName[] {
    return [...this.comboChain];
  }

  public cancelMove(): void {
    this.currentMove = null;
    this.currentFrame = 0;
  }

  public reset(): void {
    this.cancelMove();
    this.comboChain = [];
  }
}

export interface Projectile {
  id: string;
  ownerId: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  extents: Vector2D;
  damage: number;
  hitstopMs: number;
  knockbackVector: Vector2D;
  lifetimeMs: number;
  currentAgeMs: number;
  active: boolean;
}

export class ProjectileManager {
  private projectiles: Projectile[] = [];
  private nextId = 1;

  public spawnProjectile(
    ownerId: string,
    position: Vector2D,
    direction: 1 | -1,
    speed = 400,
    specOverrides?: Partial<Projectile>
  ): Projectile {
    const defaultMove = getMoveSpec('ranged_shot');
    const proj: Projectile = {
      id: `proj_${ownerId}_${this.nextId++}`,
      ownerId,
      position: { x: position.x, y: position.y },
      velocity: { x: direction * speed, y: 0 },
      radius: 12,
      extents: { x: 15, y: 10 },
      damage: defaultMove.damage,
      hitstopMs: defaultMove.hitstopMs,
      knockbackVector: { x: direction * defaultMove.knockbackVector.x, y: defaultMove.knockbackVector.y },
      lifetimeMs: 1500,
      currentAgeMs: 0,
      active: true,
      ...specOverrides
    };
    this.projectiles.push(proj);
    return proj;
  }

  public update(dtMs: number): Projectile[] {
    const dtSeconds = dtMs / 1000;
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.position.x += proj.velocity.x * dtSeconds;
      proj.position.y += proj.velocity.y * dtSeconds;
      proj.currentAgeMs += dtMs;
      if (proj.currentAgeMs >= proj.lifetimeMs) {
        proj.active = false;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.active);
    return this.getActiveProjectiles();
  }

  public getActiveProjectiles(): Projectile[] {
    return this.projectiles.filter((p) => p.active);
  }

  public removeProjectile(id: string): void {
    const proj = this.projectiles.find((p) => p.id === id);
    if (proj) {
      proj.active = false;
    }
    this.projectiles = this.projectiles.filter((p) => p.active);
  }

  public clear(): void {
    this.projectiles = [];
  }
}
