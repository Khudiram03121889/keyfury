/**
 * RenderPipeline.ts
 * Fixed-Timestep Render Pipeline (60 FPS / 16.666ms)
 * Decouples physics and combat state simulation ticks from variable display frame rates.
 */

export interface RenderPipelineConfig {
  fixedStepMs?: number;
  maxAccumulatedSteps?: number;
}

export type PhysicsUpdateCallback = (fixedDtMs: number) => void;
export type RenderUpdateCallback = (alpha: number) => void;

export class RenderPipeline {
  private fixedStepMs: number;
  private maxAccumulatedSteps: number;
  private accumulator = 0;
  private alpha = 0;
  private running = false;
  private lastTimeMs = 0;
  private animationFrameId: number | null = null;

  private physicsCallback: PhysicsUpdateCallback | null = null;
  private renderCallback: RenderUpdateCallback | null = null;

  constructor(config?: RenderPipelineConfig) {
    this.fixedStepMs = config?.fixedStepMs ?? 1000 / 60; // ~16.666ms
    this.maxAccumulatedSteps = config?.maxAccumulatedSteps ?? 5;
  }

  /**
   * Sets the physics update callback executed on fixed timestep ticks.
   */
  public setPhysicsCallback(cb: PhysicsUpdateCallback): void {
    this.physicsCallback = cb;
  }

  /**
   * Sets the rendering callback executed after physics ticks with sub-step interpolation alpha.
   */
  public setRenderCallback(cb: RenderUpdateCallback): void {
    this.renderCallback = cb;
  }

  /**
   * Ticks the pipeline given a delta time in milliseconds.
   * Consumes time in fixedStepMs increments, executing physics updates for each full step.
   * Calculates sub-step interpolation factor alpha = accumulator / fixedStepMs.
   *
   * @param dtMs Elapsed frame time in milliseconds
   * @returns Object containing total physics steps executed and resulting alpha factor
   */
  public tick(dtMs: number): { stepsExecuted: number; alpha: number } {
    if (dtMs <= 0) {
      return { stepsExecuted: 0, alpha: this.alpha };
    }

    // Clamp input delta time to prevent spiral of death on lag spikes or tab suspensions
    const clampedDt = Math.min(dtMs, this.fixedStepMs * this.maxAccumulatedSteps);
    this.accumulator += clampedDt;

    let stepsExecuted = 0;
    const eps = 1e-5;
    while (this.accumulator >= this.fixedStepMs - eps && stepsExecuted < this.maxAccumulatedSteps) {
      if (this.physicsCallback) {
        this.physicsCallback(this.fixedStepMs);
      }
      this.accumulator -= this.fixedStepMs;
      stepsExecuted++;
    }

    if (Math.abs(this.accumulator) < eps || stepsExecuted >= this.maxAccumulatedSteps) {
      this.accumulator = 0;
    }

    // Sub-step interpolation factor alpha in [0, 1]
    this.alpha = Math.max(0, Math.min(1, this.accumulator / this.fixedStepMs));

    if (this.renderCallback) {
      this.renderCallback(this.alpha);
    }

    return { stepsExecuted, alpha: this.alpha };
  }

  /**
   * Starts requestAnimationFrame loop if running in browser context.
   */
  public start(nowMs: number = typeof performance !== 'undefined' ? performance.now() : Date.now()): void {
    if (this.running) return;
    this.running = true;
    this.lastTimeMs = nowMs;

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const loop = (currentTimeMs: number) => {
        if (!this.running) return;
        const dtMs = currentTimeMs - this.lastTimeMs;
        this.lastTimeMs = currentTimeMs;
        this.tick(dtMs);
        this.animationFrameId = window.requestAnimationFrame(loop);
      };
      this.animationFrameId = window.requestAnimationFrame(loop);
    }
  }

  /**
   * Stops the requestAnimationFrame loop.
   */
  public stop(): void {
    this.running = false;
    if (typeof window !== 'undefined' && this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resets accumulator, alpha, and internal loop state.
   */
  public reset(): void {
    this.accumulator = 0;
    this.alpha = 0;
    this.lastTimeMs = 0;
  }

  public getAlpha(): number {
    return this.alpha;
  }

  public getAccumulator(): number {
    return this.accumulator;
  }

  public getFixedStepMs(): number {
    return this.fixedStepMs;
  }

  public isRunning(): boolean {
    return this.running;
  }
}
