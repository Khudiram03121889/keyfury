import { Vector2D } from '../physics/IKSystem.js';

export interface OBBHitbox {
  center: Vector2D;
  extents: Vector2D; // half-width (x) and half-height (y)
  rotation: number;  // angle in radians
}

export interface CircleHurtbox {
  center: Vector2D;
  radius: number;
}

export interface CapsuleHurtbox {
  p1: Vector2D;
  p2: Vector2D;
  radius: number;
}

export interface CollisionResult {
  collided: boolean;
  overlap: number;
  normal: Vector2D;
  contactPoint: Vector2D;
}

export interface DebugShapeOBB {
  type: 'obb';
  center: Vector2D;
  extents: Vector2D;
  rotation: number;
  color: string;
}

export interface DebugShapeCircle {
  type: 'circle';
  center: Vector2D;
  radius: number;
  color: string;
}

export interface DebugShapeCapsule {
  type: 'capsule';
  p1: Vector2D;
  p2: Vector2D;
  radius: number;
  color: string;
}

export interface DebugShapeLine {
  type: 'line';
  p1: Vector2D;
  p2: Vector2D;
  color: string;
}

export type DebugShape = DebugShapeOBB | DebugShapeCircle | DebugShapeCapsule | DebugShapeLine;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function rotateVector(v: Vector2D, angle: number): Vector2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
}

function worldToLocalOBB(point: Vector2D, obb: OBBHitbox): Vector2D {
  const dx = point.x - obb.center.x;
  const dy = point.y - obb.center.y;
  const cos = Math.cos(-obb.rotation);
  const sin = Math.sin(-obb.rotation);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos
  };
}

function localToWorldOBB(localPoint: Vector2D, obb: OBBHitbox): Vector2D {
  const rotated = rotateVector(localPoint, obb.rotation);
  return {
    x: obb.center.x + rotated.x,
    y: obb.center.y + rotated.y
  };
}

export function checkOBBvsCircle(obb: OBBHitbox, circle: CircleHurtbox): CollisionResult {
  const localCircle = worldToLocalOBB(circle.center, obb);

  const closestLocal: Vector2D = {
    x: clamp(localCircle.x, -obb.extents.x, obb.extents.x),
    y: clamp(localCircle.y, -obb.extents.y, obb.extents.y)
  };

  const diffX = localCircle.x - closestLocal.x;
  const diffY = localCircle.y - closestLocal.y;
  const distSq = diffX * diffX + diffY * diffY;

  if (distSq > circle.radius * circle.radius) {
    return {
      collided: false,
      overlap: 0,
      normal: { x: 0, y: 0 },
      contactPoint: { x: 0, y: 0 }
    };
  }

  let overlap: number;
  let normalLocal: Vector2D;

  if (distSq > 0.000001) {
    const dist = Math.sqrt(distSq);
    overlap = circle.radius - dist;
    normalLocal = { x: diffX / dist, y: diffY / dist };
  } else {
    // Circle center is inside OBB
    const distLeft = localCircle.x - (-obb.extents.x);
    const distRight = obb.extents.x - localCircle.x;
    const distBottom = localCircle.y - (-obb.extents.y);
    const distTop = obb.extents.y - localCircle.y;

    const minDist = Math.min(distLeft, distRight, distBottom, distTop);
    overlap = circle.radius + minDist;

    if (minDist === distLeft) normalLocal = { x: -1, y: 0 };
    else if (minDist === distRight) normalLocal = { x: 1, y: 0 };
    else if (minDist === distBottom) normalLocal = { x: 0, y: -1 };
    else normalLocal = { x: 0, y: 1 };
  }

  const contactPoint = localToWorldOBB(closestLocal, obb);
  const cos = Math.cos(obb.rotation);
  const sin = Math.sin(obb.rotation);
  const normalWorld: Vector2D = {
    x: normalLocal.x * cos - normalLocal.y * sin,
    y: normalLocal.x * sin + normalLocal.y * cos
  };

  return {
    collided: true,
    overlap,
    normal: normalWorld,
    contactPoint
  };
}

export function checkOBBvsCapsule(obb: OBBHitbox, capsule: CapsuleHurtbox): CollisionResult {
  const p1Local = worldToLocalOBB(capsule.p1, obb);
  const p2Local = worldToLocalOBB(capsule.p2, obb);

  // Find parameter t in [0, 1] that minimizes distance between segment S(t) and AABB box
  const sampleCount = 20;
  let bestT = 0;
  let minDistSq = Infinity;

  const segVector = { x: p2Local.x - p1Local.x, y: p2Local.y - p1Local.y };

  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const stX = p1Local.x + t * segVector.x;
    const stY = p1Local.y + t * segVector.y;

    const cx = clamp(stX, -obb.extents.x, obb.extents.x);
    const cy = clamp(stY, -obb.extents.y, obb.extents.y);

    const dx = stX - cx;
    const dy = stY - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      bestT = t;
    }
  }

  const closestSegWorld: Vector2D = {
    x: capsule.p1.x + bestT * (capsule.p2.x - capsule.p1.x),
    y: capsule.p1.y + bestT * (capsule.p2.y - capsule.p1.y)
  };

  return checkOBBvsCircle(obb, { center: closestSegWorld, radius: capsule.radius });
}

export function checkOBBvsOBB(obbA: OBBHitbox, obbB: OBBHitbox): CollisionResult {
  const axesA: Vector2D[] = [
    { x: Math.cos(obbA.rotation), y: Math.sin(obbA.rotation) },
    { x: -Math.sin(obbA.rotation), y: Math.cos(obbA.rotation) }
  ];

  const axesB: Vector2D[] = [
    { x: Math.cos(obbB.rotation), y: Math.sin(obbB.rotation) },
    { x: -Math.sin(obbB.rotation), y: Math.cos(obbB.rotation) }
  ];

  const candidateAxes = [...axesA, ...axesB];
  const centerDiff = { x: obbB.center.x - obbA.center.x, y: obbB.center.y - obbA.center.y };

  let minOverlap = Infinity;
  let smallestAxis: Vector2D = { x: 1, y: 0 };

  for (const axis of candidateAxes) {
    // Normalize axis
    const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
    const nAxis = { x: axis.x / len, y: axis.y / len };

    const rA =
      obbA.extents.x * Math.abs(axesA[0].x * nAxis.x + axesA[0].y * nAxis.y) +
      obbA.extents.y * Math.abs(axesA[1].x * nAxis.x + axesA[1].y * nAxis.y);

    const rB =
      obbB.extents.x * Math.abs(axesB[0].x * nAxis.x + axesB[0].y * nAxis.y) +
      obbB.extents.y * Math.abs(axesB[1].x * nAxis.x + axesB[1].y * nAxis.y);

    const centerProj = Math.abs(centerDiff.x * nAxis.x + centerDiff.y * nAxis.y);

    if (centerProj > rA + rB) {
      return {
        collided: false,
        overlap: 0,
        normal: { x: 0, y: 0 },
        contactPoint: { x: 0, y: 0 }
      };
    }

    const overlap = rA + rB - centerProj;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxis = nAxis;
    }
  }

  // Ensure normal points from A to B
  if (centerDiff.x * smallestAxis.x + centerDiff.y * smallestAxis.y < 0) {
    smallestAxis = { x: -smallestAxis.x, y: -smallestAxis.y };
  }

  const contactPoint: Vector2D = {
    x: obbA.center.x + smallestAxis.x * (obbA.extents.x + minOverlap * 0.5),
    y: obbA.center.y + smallestAxis.y * (obbA.extents.y + minOverlap * 0.5)
  };

  return {
    collided: true,
    overlap: minOverlap,
    normal: smallestAxis,
    contactPoint
  };
}

export function checkInterpolatedOBBvsCircle(
  prevOBB: OBBHitbox,
  currOBB: OBBHitbox,
  circle: CircleHurtbox,
  substeps = 4
): CollisionResult {
  let firstCollision: CollisionResult | null = null;

  for (let i = 0; i <= substeps; i++) {
    const t = i / substeps;
    const interOBB: OBBHitbox = {
      center: {
        x: (1 - t) * prevOBB.center.x + t * currOBB.center.x,
        y: (1 - t) * prevOBB.center.y + t * currOBB.center.y
      },
      extents: {
        x: (1 - t) * prevOBB.extents.x + t * currOBB.extents.x,
        y: (1 - t) * prevOBB.extents.y + t * currOBB.extents.y
      },
      rotation: (1 - t) * prevOBB.rotation + t * currOBB.rotation
    };

    const res = checkOBBvsCircle(interOBB, circle);
    if (res.collided) {
      if (!firstCollision || res.overlap > firstCollision.overlap) {
        firstCollision = res;
      }
    }
  }

  return (
    firstCollision || {
      collided: false,
      overlap: 0,
      normal: { x: 0, y: 0 },
      contactPoint: { x: 0, y: 0 }
    }
  );
}

export function checkInterpolatedOBBvsCapsule(
  prevOBB: OBBHitbox,
  currOBB: OBBHitbox,
  capsule: CapsuleHurtbox,
  substeps = 4
): CollisionResult {
  let firstCollision: CollisionResult | null = null;

  for (let i = 0; i <= substeps; i++) {
    const t = i / substeps;
    const interOBB: OBBHitbox = {
      center: {
        x: (1 - t) * prevOBB.center.x + t * currOBB.center.x,
        y: (1 - t) * prevOBB.center.y + t * currOBB.center.y
      },
      extents: {
        x: (1 - t) * prevOBB.extents.x + t * currOBB.extents.x,
        y: (1 - t) * prevOBB.extents.y + t * currOBB.extents.y
      },
      rotation: (1 - t) * prevOBB.rotation + t * currOBB.rotation
    };

    const res = checkOBBvsCapsule(interOBB, capsule);
    if (res.collided) {
      if (!firstCollision || res.overlap > firstCollision.overlap) {
        firstCollision = res;
      }
    }
  }

  return (
    firstCollision || {
      collided: false,
      overlap: 0,
      normal: { x: 0, y: 0 },
      contactPoint: { x: 0, y: 0 }
    }
  );
}

export class HitboxManager {
  private activeOBBs: { id: string; obb: OBBHitbox; color?: string }[] = [];
  private activeCircles: { id: string; circle: CircleHurtbox; color?: string }[] = [];
  private activeCapsules: { id: string; capsule: CapsuleHurtbox; color?: string }[] = [];

  public registerOBB(id: string, obb: OBBHitbox, color = '#ff0000'): void {
    this.unregisterShape(id);
    this.activeOBBs.push({ id, obb, color });
  }

  public registerCircle(id: string, circle: CircleHurtbox, color = '#00ff00'): void {
    this.unregisterShape(id);
    this.activeCircles.push({ id, circle, color });
  }

  public registerCapsule(id: string, capsule: CapsuleHurtbox, color = '#0000ff'): void {
    this.unregisterShape(id);
    this.activeCapsules.push({ id, capsule, color });
  }

  public unregisterShape(id: string): void {
    this.activeOBBs = this.activeOBBs.filter((s) => s.id !== id);
    this.activeCircles = this.activeCircles.filter((s) => s.id !== id);
    this.activeCapsules = this.activeCapsules.filter((s) => s.id !== id);
  }

  public clearAll(): void {
    this.activeOBBs = [];
    this.activeCircles = [];
    this.activeCapsules = [];
  }

  public getDebugShapes(): DebugShape[] {
    const shapes: DebugShape[] = [];

    for (const item of this.activeOBBs) {
      shapes.push({
        type: 'obb',
        center: { ...item.obb.center },
        extents: { ...item.obb.extents },
        rotation: item.obb.rotation,
        color: item.color || '#ff0000'
      });
    }

    for (const item of this.activeCircles) {
      shapes.push({
        type: 'circle',
        center: { ...item.circle.center },
        radius: item.circle.radius,
        color: item.color || '#00ff00'
      });
    }

    for (const item of this.activeCapsules) {
      shapes.push({
        type: 'capsule',
        p1: { ...item.capsule.p1 },
        p2: { ...item.capsule.p2 },
        radius: item.capsule.radius,
        color: item.color || '#0000ff'
      });
    }

    return shapes;
  }
}
