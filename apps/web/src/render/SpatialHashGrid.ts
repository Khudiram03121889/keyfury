/**
 * SpatialHashGrid.ts
 * 2D Uniform Spatial Hashing Grid (64px cell size)
 * Accelerates broadphase collision queries from O(N^2) to O(N).
 */

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialItem<T = any> {
  id: string;
  bounds: AABB;
  data: T;
  cellKeys: string[];
}

export class SpatialHashGrid<T = any> {
  private cellSize: number;
  private grid: Map<string, Set<SpatialItem<T>>> = new Map();
  private items: Map<string, SpatialItem<T>> = new Map();

  constructor(cellSize = 64) {
    this.cellSize = Math.max(1, cellSize);
  }

  /**
   * Generates cell string key from grid cell coordinates.
   */
  public getCellKey(cellX: number, cellY: number): string {
    return `${cellX},${cellY}`;
  }

  /**
   * Computes all grid cell keys covered by an AABB bounding box.
   */
  public getCoveredCellKeys(bounds: AABB): string[] {
    const minCellX = Math.floor(bounds.minX / this.cellSize);
    const minCellY = Math.floor(bounds.minY / this.cellSize);
    const maxCellX = Math.floor(bounds.maxX / this.cellSize);
    const maxCellY = Math.floor(bounds.maxY / this.cellSize);

    const keys: string[] = [];
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        keys.push(this.getCellKey(cx, cy));
      }
    }
    return keys;
  }

  /**
   * Inserts an item with specified bounding box and user payload.
   */
  public insert(id: string, bounds: AABB, data: T): SpatialItem<T> {
    if (this.items.has(id)) {
      this.remove(id);
    }

    const cellKeys = this.getCoveredCellKeys(bounds);
    const item: SpatialItem<T> = {
      id,
      bounds: { ...bounds },
      data,
      cellKeys
    };

    this.items.set(id, item);

    for (const key of cellKeys) {
      let cellSet = this.grid.get(key);
      if (!cellSet) {
        cellSet = new Set();
        this.grid.set(key, cellSet);
      }
      cellSet.add(item);
    }

    return item;
  }

  /**
   * Updates position / bounds of an existing spatial item.
   */
  public update(id: string, bounds: AABB, data?: T): boolean {
    const existing = this.items.get(id);
    if (!existing) return false;

    const payload = data !== undefined ? data : existing.data;
    this.insert(id, bounds, payload);
    return true;
  }

  /**
   * Removes an item from the spatial grid by id.
   */
  public remove(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    for (const key of item.cellKeys) {
      const cellSet = this.grid.get(key);
      if (cellSet) {
        cellSet.delete(item);
        if (cellSet.size === 0) {
          this.grid.delete(key);
        }
      }
    }

    this.items.delete(id);
    return true;
  }

  /**
   * Fast spatial broadphase query returning all items overlapping specified query AABB.
   */
  public query(queryBounds: AABB): SpatialItem<T>[] {
    const candidateKeys = this.getCoveredCellKeys(queryBounds);
    const candidateSet = new Set<SpatialItem<T>>();

    for (const key of candidateKeys) {
      const cellSet = this.grid.get(key);
      if (cellSet) {
        for (const item of cellSet) {
          candidateSet.add(item);
        }
      }
    }

    const results: SpatialItem<T>[] = [];
    for (const item of candidateSet) {
      // Narrowphase AABB intersection check
      if (
        item.bounds.minX <= queryBounds.maxX &&
        item.bounds.maxX >= queryBounds.minX &&
        item.bounds.minY <= queryBounds.maxY &&
        item.bounds.maxY >= queryBounds.minY
      ) {
        results.push(item);
      }
    }

    return results;
  }

  /**
   * Queries items covering a single 2D point (x, y).
   */
  public queryPoint(x: number, y: number): SpatialItem<T>[] {
    return this.query({ minX: x, minY: y, maxX: x, maxY: y });
  }

  /**
   * Clears all items and grid cells.
   */
  public clear(): void {
    this.grid.clear();
    this.items.clear();
  }

  public size(): number {
    return this.items.size;
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  public getItem(id: string): SpatialItem<T> | undefined {
    return this.items.get(id);
  }
}
