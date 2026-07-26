import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RenderPipeline } from '../render/RenderPipeline';
import { SpatialHashGrid } from '../render/SpatialHashGrid';
import {
  ObjectPool,
  Vector2Pool,
  ParticlePool,
  HitboxPool,
  ProjectilePool
} from '../render/ObjectPool';

describe('Milestone 4 — Render Pipeline & Web Performance Suite', () => {
  describe('1. RenderPipeline Fixed-Timestep & Sub-Step Interpolation', () => {
    let pipeline: RenderPipeline;

    beforeEach(() => {
      pipeline = new RenderPipeline({ fixedStepMs: 1000 / 60 }); // 16.666666ms
    });

    it('should initialize with default 60 FPS timestep (~16.666ms)', () => {
      expect(pipeline.getFixedStepMs()).toBeCloseTo(16.66666, 4);
      expect(pipeline.getAccumulator()).toBe(0);
      expect(pipeline.getAlpha()).toBe(0);
    });

    it('should execute exactly 1 physics tick on a 16.666ms delta', () => {
      const physicsSpy = vi.fn();
      const renderSpy = vi.fn();

      pipeline.setPhysicsCallback(physicsSpy);
      pipeline.setRenderCallback(renderSpy);

      const result = pipeline.tick(16.666666666666668);

      expect(result.stepsExecuted).toBe(1);
      expect(physicsSpy).toHaveBeenCalledTimes(1);
      expect(physicsSpy).toHaveBeenCalledWith(pipeline.getFixedStepMs());
      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(result.alpha).toBeCloseTo(0, 4);
    });

    it('should calculate sub-step interpolation factor alpha on sub-frame deltas', () => {
      const physicsSpy = vi.fn();
      pipeline.setPhysicsCallback(physicsSpy);

      // Pass half a frame: 8.33333ms -> 0 physics ticks, alpha = 0.5
      const halfFrame = pipeline.getFixedStepMs() / 2;
      const res1 = pipeline.tick(halfFrame);

      expect(res1.stepsExecuted).toBe(0);
      expect(physicsSpy).not.toHaveBeenCalled();
      expect(res1.alpha).toBeCloseTo(0.5, 4);

      // Pass another half frame: accumulator completes -> 1 physics tick, alpha = 0
      const res2 = pipeline.tick(halfFrame);
      expect(res2.stepsExecuted).toBe(1);
      expect(physicsSpy).toHaveBeenCalledTimes(1);
      expect(res2.alpha).toBeCloseTo(0, 4);
    });

    it('should handle multi-step ticks on 120Hz and 30Hz display rates', () => {
      const physicsSpy = vi.fn();
      pipeline.setPhysicsCallback(physicsSpy);

      // Simulate 30 FPS display tick (33.333ms = 2 physics steps)
      const doubleFrame = pipeline.getFixedStepMs() * 2;
      const res = pipeline.tick(doubleFrame);

      expect(res.stepsExecuted).toBe(2);
      expect(physicsSpy).toHaveBeenCalledTimes(2);
      expect(res.alpha).toBeCloseTo(0, 4);
    });

    it('should clamp accumulator on large frame spikes to prevent spiral of death', () => {
      const physicsSpy = vi.fn();
      pipeline.setPhysicsCallback(physicsSpy);

      // Huge frame spike (500ms lag spike)
      const res = pipeline.tick(500);

      // maxAccumulatedSteps is 5, so stepsExecuted must be capped at 5
      expect(res.stepsExecuted).toBe(5);
      expect(physicsSpy).toHaveBeenCalledTimes(5);
      expect(pipeline.getAccumulator()).toBe(0);
    });

    it('should reset accumulator and alpha on reset()', () => {
      pipeline.tick(10);
      expect(pipeline.getAccumulator()).toBe(10);

      pipeline.reset();
      expect(pipeline.getAccumulator()).toBe(0);
      expect(pipeline.getAlpha()).toBe(0);
    });
  });

  describe('2. SpatialHashGrid 2D Uniform Spatial Hashing (64px)', () => {
    let grid: SpatialHashGrid<string>;

    beforeEach(() => {
      grid = new SpatialHashGrid<string>(64);
    });

    it('should calculate correct cell keys for 2D coordinates', () => {
      expect(grid.getCellKey(0, 0)).toBe('0,0');
      expect(grid.getCellKey(2, 3)).toBe('2,3');
      expect(grid.getCellKey(-1, -2)).toBe('-1,-2');
    });

    it('should insert items and cover all overlapping 64px cells', () => {
      // Bounds spanning (10, 10) to (70, 70): covers cells (0,0), (1,0), (0,1), (1,1)
      const item = grid.insert('fighter1', { minX: 10, minY: 10, maxX: 70, maxY: 70 }, 'p1');

      expect(grid.size()).toBe(1);
      expect(item.cellKeys.length).toBe(4);
      expect(item.cellKeys).toContain('0,0');
      expect(item.cellKeys).toContain('1,0');
      expect(item.cellKeys).toContain('0,1');
      expect(item.cellKeys).toContain('1,1');
    });

    it('should perform fast broadphase O(N) queries returning candidate items', () => {
      grid.insert('fighter1', { minX: 10, minY: 10, maxX: 40, maxY: 40 }, 'p1');
      grid.insert('fighter2', { minX: 500, minY: 500, maxX: 540, maxY: 540 }, 'p2');
      grid.insert('projectile1', { minX: 20, minY: 20, maxX: 30, maxY: 30 }, 'proj');

      // Query region around (0, 0) to (50, 50)
      const candidates = grid.query({ minX: 0, minY: 0, maxX: 50, maxY: 50 });

      expect(candidates.length).toBe(2); // fighter1 and projectile1
      const ids = candidates.map((c) => c.id);
      expect(ids).toContain('fighter1');
      expect(ids).toContain('projectile1');
      expect(ids).not.toContain('fighter2');
    });

    it('should update item position and remove old cell references', () => {
      grid.insert('fighter1', { minX: 10, minY: 10, maxX: 20, maxY: 20 }, 'p1');
      expect(grid.queryPoint(15, 15).length).toBe(1);

      // Move fighter1 far away
      grid.update('fighter1', { minX: 300, minY: 300, maxX: 320, maxY: 320 });

      expect(grid.queryPoint(15, 15).length).toBe(0);
      expect(grid.queryPoint(310, 310).length).toBe(1);
    });

    it('should remove item cleanly', () => {
      grid.insert('item1', { minX: 0, minY: 0, maxX: 10, maxY: 10 }, 'data');
      expect(grid.size()).toBe(1);

      const removed = grid.remove('item1');
      expect(removed).toBe(true);
      expect(grid.size()).toBe(0);
      expect(grid.queryPoint(5, 5).length).toBe(0);
    });

    it('should clear grid completely', () => {
      grid.insert('a', { minX: 0, minY: 0, maxX: 10, maxY: 10 }, 'a');
      grid.insert('b', { minX: 100, minY: 100, maxX: 110, maxY: 110 }, 'b');

      grid.clear();
      expect(grid.size()).toBe(0);
    });
  });

  describe('3. Zero-Allocation Object Pool & Domain Pools', () => {
    it('should pre-allocate objects on pool creation', () => {
      const pool = new ObjectPool<{ val: number }>({
        factory: () => ({ val: 0 }),
        reset: (obj) => {
          obj.val = 0;
        },
        initialSize: 16
      });

      expect(pool.getFreeCount()).toBe(16);
      expect(pool.getActiveCount()).toBe(0);
      expect(pool.getTotalCount()).toBe(16);
    });

    it('should acquire and release objects with state resetting', () => {
      const pool = new ObjectPool<{ x: number }>({
        factory: () => ({ x: 0 }),
        reset: (obj) => {
          obj.x = 0;
        },
        initialSize: 5
      });

      const item1 = pool.acquire();
      item1.x = 42;

      expect(pool.getFreeCount()).toBe(4);
      expect(pool.getActiveCount()).toBe(1);

      pool.release(item1);

      expect(pool.getFreeCount()).toBe(5);
      expect(pool.getActiveCount()).toBe(0);
      expect(item1.x).toBe(0); // reset state verified
    });

    it('should recycle the exact same object references (zero allocations)', () => {
      const pool = new ObjectPool<{ id: number }>({
        factory: () => ({ id: Math.random() }),
        reset: () => {},
        initialSize: 1
      });

      const acquired1 = pool.acquire();
      const originalRef = acquired1;
      pool.release(acquired1);

      const acquired2 = pool.acquire();
      expect(acquired2).toBe(originalRef); // zero-allocation identity check
    });

    it('should release all active objects at once with releaseAll()', () => {
      const pool = new ObjectPool<{ a: number }>({
        factory: () => ({ a: 1 }),
        reset: (obj) => {
          obj.a = 0;
        },
        initialSize: 10
      });

      const items = [pool.acquire(), pool.acquire(), pool.acquire()];
      expect(pool.getActiveCount()).toBe(3);

      pool.releaseAll();

      expect(pool.getActiveCount()).toBe(0);
      expect(pool.getFreeCount()).toBe(10);
      items.forEach((item) => expect(item.a).toBe(0));
    });

    it('should verify domain pools pre-allocation counts', () => {
      expect(Vector2Pool.getFreeCount()).toBe(128);
      expect(ParticlePool.getFreeCount()).toBe(256);
      expect(HitboxPool.getFreeCount()).toBe(64);
      expect(ProjectilePool.getFreeCount()).toBe(64);
    });
  });

  describe('4. 60 FPS Update Throughput Simulation', () => {
    it('should maintain exactly 60 physics updates over 1000ms at 60 FPS frame rates', () => {
      const pipeline = new RenderPipeline({ fixedStepMs: 1000 / 60 });
      let totalPhysicsTicks = 0;

      pipeline.setPhysicsCallback(() => {
        totalPhysicsTicks++;
      });

      const frameDeltaMs = 1000 / 60; // 16.666666ms per frame

      for (let frame = 0; frame < 60; frame++) {
        pipeline.tick(frameDeltaMs);
      }

      expect(totalPhysicsTicks).toBe(60);
      expect(pipeline.getAccumulator()).toBeCloseTo(0, 4);
    });

    it('should maintain consistent physics step throughput across 120Hz display refresh rates', () => {
      const pipeline = new RenderPipeline({ fixedStepMs: 1000 / 60 });
      let totalPhysicsTicks = 0;

      pipeline.setPhysicsCallback(() => {
        totalPhysicsTicks++;
      });

      const frameDelta120Hz = 1000 / 120; // 8.33333ms per frame

      // 120 frames at 120Hz = 1 second
      for (let frame = 0; frame < 120; frame++) {
        pipeline.tick(frameDelta120Hz);
      }

      expect(totalPhysicsTicks).toBe(60);
      expect(pipeline.getAccumulator()).toBeCloseTo(0, 4);
    });
  });
});
