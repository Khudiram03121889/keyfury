/**
 * ObjectPool.ts
 * Generic Zero-Allocation Object Pool & Pre-Allocated Domain Pools
 * Eliminates Garbage Collection (GC) pauses during high-frequency typing combat.
 */

export interface ObjectPoolConfig<T> {
  factory: () => T;
  reset: (obj: T) => void;
  initialSize?: number;
  autoExpand?: boolean;
}

export class ObjectPool<T> {
  private freeList: T[] = [];
  private activeSet: Set<T> = new Set();
  private factory: () => T;
  private resetFn: (obj: T) => void;
  private autoExpand: boolean;

  constructor(config: ObjectPoolConfig<T>) {
    this.factory = config.factory;
    this.resetFn = config.reset;
    this.autoExpand = config.autoExpand ?? true;

    const initialSize = config.initialSize ?? 32;
    this.preallocate(initialSize);
  }

  /**
   * Pre-allocates N objects into the free pool.
   */
  public preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      const obj = this.factory();
      this.resetFn(obj);
      this.freeList.push(obj);
    }
  }

  /**
   * Acquires an idle object from the free list or expands if autoExpand is true.
   */
  public acquire(): T {
    let obj: T;
    if (this.freeList.length > 0) {
      obj = this.freeList.pop()!;
    } else if (this.autoExpand) {
      obj = this.factory();
    } else {
      throw new Error('[ObjectPool] Pool exhausted and autoExpand is disabled');
    }

    this.activeSet.add(obj);
    return obj;
  }

  /**
   * Releases an active object back to the free list after resetting its state.
   */
  public release(obj: T): void {
    if (!this.activeSet.has(obj)) {
      return;
    }

    this.activeSet.delete(obj);
    this.resetFn(obj);
    this.freeList.push(obj);
  }

  /**
   * Releases all active objects back to the free list.
   */
  public releaseAll(): void {
    for (const obj of this.activeSet) {
      this.resetFn(obj);
      this.freeList.push(obj);
    }
    this.activeSet.clear();
  }

  public getFreeCount(): number {
    return this.freeList.length;
  }

  public getActiveCount(): number {
    return this.activeSet.size;
  }

  public getTotalCount(): number {
    return this.freeList.length + this.activeSet.size;
  }
}

// --- Domain-Specific Pre-Allocated Pools ---

// 1. Vector2 Pool
export interface PooledVector2 {
  x: number;
  y: number;
}

export const Vector2Pool = new ObjectPool<PooledVector2>({
  factory: () => ({ x: 0, y: 0 }),
  reset: (v) => {
    v.x = 0;
    v.y = 0;
  },
  initialSize: 128,
  autoExpand: true
});

// 2. Particle Pool
export interface PooledParticle {
  position: PooledVector2;
  velocity: PooledVector2;
  size: number;
  color: string;
  lifetimeMs: number;
  currentAgeMs: number;
  active: boolean;
  type?: 'circle' | 'spark' | 'lightning' | 'orbital' | 'disc';
  angle?: number;
  angularVelocity?: number;
}

export const ParticlePool = new ObjectPool<PooledParticle>({
  factory: () => ({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    size: 2,
    color: '#ffffff',
    lifetimeMs: 300,
    currentAgeMs: 0,
    active: false,
    type: 'circle',
    angle: 0,
    angularVelocity: 0
  }),
  reset: (p) => {
    p.position.x = 0;
    p.position.y = 0;
    p.velocity.x = 0;
    p.velocity.y = 0;
    p.size = 2;
    p.color = '#ffffff';
    p.lifetimeMs = 300;
    p.currentAgeMs = 0;
    p.active = false;
    p.type = 'circle';
    p.angle = 0;
    p.angularVelocity = 0;
  },
  initialSize: 256,
  autoExpand: true
});

// 3. Hitbox Pool (OBB / Circle / Capsule)
export interface PooledOBBHitbox {
  center: PooledVector2;
  extents: PooledVector2;
  rotation: number;
}

export const HitboxPool = new ObjectPool<PooledOBBHitbox>({
  factory: () => ({
    center: { x: 0, y: 0 },
    extents: { x: 0, y: 0 },
    rotation: 0
  }),
  reset: (h) => {
    h.center.x = 0;
    h.center.y = 0;
    h.extents.x = 0;
    h.extents.y = 0;
    h.rotation = 0;
  },
  initialSize: 64,
  autoExpand: true
});

// 4. Projectile Pool
export interface PooledProjectile {
  id: string;
  ownerId: string;
  position: PooledVector2;
  velocity: PooledVector2;
  radius: number;
  extents: PooledVector2;
  damage: number;
  hitstopMs: number;
  knockbackVector: PooledVector2;
  lifetimeMs: number;
  currentAgeMs: number;
  active: boolean;
}

export const ProjectilePool = new ObjectPool<PooledProjectile>({
  factory: () => ({
    id: '',
    ownerId: '',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    radius: 12,
    extents: { x: 15, y: 10 },
    damage: 4,
    hitstopMs: 40,
    knockbackVector: { x: 0, y: 0 },
    lifetimeMs: 1500,
    currentAgeMs: 0,
    active: false
  }),
  reset: (p) => {
    p.id = '';
    p.ownerId = '';
    p.position.x = 0;
    p.position.y = 0;
    p.velocity.x = 0;
    p.velocity.y = 0;
    p.radius = 12;
    p.extents.x = 15;
    p.extents.y = 10;
    p.damage = 4;
    p.hitstopMs = 40;
    p.knockbackVector.x = 0;
    p.knockbackVector.y = 0;
    p.lifetimeMs = 1500;
    p.currentAgeMs = 0;
    p.active = false;
  },
  initialSize: 64,
  autoExpand: true
});
