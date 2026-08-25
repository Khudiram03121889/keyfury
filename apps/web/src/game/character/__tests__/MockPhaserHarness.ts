/**
 * MockPhaserHarness.ts
 * Lightweight, zero-dependency headless mock harness for Phaser 3 TextureManager,
 * Frames, Containers, Sprites, Graphics, and Scenes for Vitest Node runner.
 */

export class MockPhaserFrame {
  constructor(
    public name: string,
    public cutX: number,
    public cutY: number,
    public cutWidth: number,
    public cutHeight: number,
    public customData: Record<string, any> = {}
  ) {}
}

export class MockPhaserTexture {
  public frames: Map<string, MockPhaserFrame> = new Map();

  constructor(public key: string) {}

  add(name: string, sourceIndex: number, x: number, y: number, width: number, height: number): MockPhaserFrame {
    const frame = new MockPhaserFrame(name, x, y, width, height);
    this.frames.set(name, frame);
    return frame;
  }

  get(name: string): MockPhaserFrame | undefined {
    return this.frames.get(name);
  }

  has(name: string): boolean {
    return this.frames.has(name);
  }
}

export class MockPhaserTextureManager {
  private textures: Map<string, MockPhaserTexture> = new Map();

  exists(key: string): boolean {
    return this.textures.has(key);
  }

  get(key: string): MockPhaserTexture | undefined {
    return this.textures.get(key);
  }

  addAtlas(key: string, image: any, json: any): MockPhaserTexture {
    const texture = new MockPhaserTexture(key);
    if (json && json.parts) {
      for (const [partName, rect] of Object.entries<any>(json.parts)) {
        const frame = texture.add(partName, 0, rect.x, rect.y, rect.w, rect.h);
        frame.customData = {
          pivotX: rect.pivotX ?? 0.5,
          pivotY: rect.pivotY ?? 0.5,
          trimmed: rect.trimmed ?? false,
          sourceW: rect.sourceW ?? rect.w,
          sourceH: rect.sourceH ?? rect.h
        };
      }
    }
    this.textures.set(key, texture);
    return texture;
  }

  getFrame(key: string, frameName: string): MockPhaserFrame | null {
    const texture = this.textures.get(key);
    if (!texture) return null;
    return texture.get(frameName) ?? null;
  }

  remove(key: string): void {
    this.textures.delete(key);
  }
}

export class MockPhaserSprite {
  public x: number = 0;
  public y: number = 0;
  public rotation: number = 0;
  public scaleX: number = 1;
  public scaleY: number = 1;
  public originX: number = 0.5;
  public originY: number = 0.5;
  public depth: number = 0;
  public visible: boolean = true;
  public alpha: number = 1;
  public blendMode: number = 0; // 0 = NORMAL, 1 = ADD
  public tint: number = 0xffffff;
  public textureKey: string = '';
  public frameName: string = '';

  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  setRotation(rad: number): this {
    this.rotation = rad;
    return this;
  }

  setScale(sx: number, sy: number = sx): this {
    this.scaleX = sx;
    this.scaleY = sy;
    return this;
  }

  setOrigin(ox: number, oy: number = ox): this {
    this.originX = ox;
    this.originY = oy;
    return this;
  }

  setDepth(d: number): this {
    this.depth = d;
    return this;
  }

  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }

  setAlpha(a: number): this {
    this.alpha = a;
    return this;
  }

  setBlendMode(bm: number): this {
    this.blendMode = bm;
    return this;
  }

  setTint(tint: number): this {
    this.tint = tint;
    return this;
  }

  setTexture(key: string, frameName: string): this {
    this.textureKey = key;
    this.frameName = frameName;
    return this;
  }
}

export class MockPhaserContainer {
  public list: MockPhaserSprite[] = [];
  public depth: number = 0;
  public visible: boolean = true;

  add(child: MockPhaserSprite | MockPhaserSprite[]): this {
    if (Array.isArray(child)) {
      this.list.push(...child);
    } else {
      this.list.push(child);
    }
    return this;
  }

  removeAll(destroy: boolean = false): this {
    this.list = [];
    return this;
  }

  setDepth(d: number): this {
    this.depth = d;
    return this;
  }

  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
}

export class MockPhaserGraphics {
  public calls: Array<{ method: string; args: any[] }> = [];

  clear(): this {
    this.calls.push({ method: 'clear', args: [] });
    return this;
  }
  lineStyle(width: number, color: number, alpha: number = 1): this {
    this.calls.push({ method: 'lineStyle', args: [width, color, alpha] });
    return this;
  }
  fillStyle(color: number, alpha: number = 1): this {
    this.calls.push({ method: 'fillStyle', args: [color, alpha] });
    return this;
  }
  beginPath(): this {
    this.calls.push({ method: 'beginPath', args: [] });
    return this;
  }
  moveTo(x: number, y: number): this {
    this.calls.push({ method: 'moveTo', args: [x, y] });
    return this;
  }
  lineTo(x: number, y: number): this {
    this.calls.push({ method: 'lineTo', args: [x, y] });
    return this;
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number): this {
    this.calls.push({ method: 'lineBetween', args: [x1, y1, x2, y2] });
    return this;
  }
  strokePath(): this {
    this.calls.push({ method: 'strokePath', args: [] });
    return this;
  }
  closePath(): this {
    this.calls.push({ method: 'closePath', args: [] });
    return this;
  }
  fillCircle(x: number, y: number, radius: number): this {
    this.calls.push({ method: 'fillCircle', args: [x, y, radius] });
    return this;
  }
  fillRect(x: number, y: number, width: number, height: number): this {
    this.calls.push({ method: 'fillRect', args: [x, y, width, height] });
    return this;
  }
  strokeRect(x: number, y: number, width: number, height: number): this {
    this.calls.push({ method: 'strokeRect', args: [x, y, width, height] });
    return this;
  }
  fillRoundedRect(x: number, y: number, width: number, height: number, radius: number): this {
    this.calls.push({ method: 'fillRoundedRect', args: [x, y, width, height, radius] });
    return this;
  }
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius: number): this {
    this.calls.push({ method: 'strokeRoundedRect', args: [x, y, width, height, radius] });
    return this;
  }
  strokeCircle(x: number, y: number, radius: number): this {
    this.calls.push({ method: 'strokeCircle', args: [x, y, radius] });
    return this;
  }
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): this {
    this.calls.push({ method: 'arc', args: [x, y, radius, startAngle, endAngle, anticlockwise] });
    return this;
  }
  fillPath(): this {
    this.calls.push({ method: 'fillPath', args: [] });
    return this;
  }
  destroy(): void {
    this.calls.push({ method: 'destroy', args: [] });
  }
}

export class MockPhaserScene {
  public textures: MockPhaserTextureManager = new MockPhaserTextureManager();
  public cache = {
    json: {
      entries: new Map<string, any>(),
      get(key: string) { return this.entries.get(key); },
      has(key: string) { return this.entries.has(key); },
      add(key: string, data: any) { this.entries.set(key, data); }
    }
  };
  public load = {
    callbacks: new Map<string, Function[]>(),
    shouldFail: false,
    queuedFiles: [] as { type: string; key: string; url: string }[],
    json(key: string, url: string) {
      this.queuedFiles.push({ type: 'json', key, url });
      return this;
    },
    image(key: string, url: string) {
      this.queuedFiles.push({ type: 'image', key, url });
      return this;
    },
    on(event: string, fn: Function) {
      if (!this.callbacks.has(event)) this.callbacks.set(event, []);
      this.callbacks.get(event)!.push(fn);
      return this;
    },
    isLoading() {
      return false;
    },
    start() {
      if (this.shouldFail) {
        const errorFns = this.callbacks.get('loaderror') || [];
        errorFns.forEach((fn) => fn({ key: 'mock_atlas' }));
      } else {
        const completeFns = this.callbacks.get('complete') || [];
        completeFns.forEach((fn) => fn());
      }
    }
  };
  public add = {
    container: (x?: number, y?: number, children?: any) => {
      const c = new MockPhaserContainer();
      if (children) c.add(children);
      return c;
    },
    sprite: (x?: number, y?: number, key?: string, frame?: string) => {
      const s = new MockPhaserSprite();
      if (x !== undefined && y !== undefined) s.setPosition(x, y);
      if (key !== undefined) s.textureKey = key;
      if (frame !== undefined) s.frameName = frame;
      return s;
    },
    graphics: () => new MockPhaserGraphics()
  };
}
