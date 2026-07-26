/**
 * IKSystem.ts
 * Procedural 2-Bone IK Solver & Spine Bending Mechanics
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface IKChain2Bone {
  root: Vector2D;
  joint: Vector2D;
  tip: Vector2D;
  length1: number;
  length2: number;
  bendDirection: 1 | -1;
}

export interface IKSolveResult {
  joint: Vector2D;
  tip: Vector2D;
  angle1: number;
  angle2: number;
  reached: boolean;
}

export interface SpineCurveResult {
  root: Vector2D;
  mid: Vector2D;
  head: Vector2D;
  curveOffset: Vector2D;
}

/**
 * Closed-form 2-Bone Inverse Kinematics solver using the Law of Cosines.
 *
 * @param root Base position of the first bone (e.g., shoulder, hip)
 * @param target Desired end-effector position (e.g., hand, foot)
 * @param length1 Length of the upper bone (e.g., upper arm, thigh)
 * @param length2 Length of the lower bone (e.g., forearm, shin)
 * @param bendDirection Bend orientation: 1 for positive (counter-clockwise), -1 for negative (clockwise)
 * @returns IKSolveResult containing joint/tip positions, angles in radians, and reach status
 */
export function solve2BoneIK(
  root: Vector2D,
  target: Vector2D,
  length1: number,
  length2: number,
  bendDirection: 1 | -1 = 1
): IKSolveResult {
  // Validate non-negative bone lengths
  const l1 = Math.max(1e-4, length1);
  const l2 = Math.max(1e-4, length2);

  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.sqrt(dx * dx + dy * dy);

  // Determine base angle towards target
  let thetaBase: number;
  if (rawDist < 1e-6) {
    thetaBase = 0;
  } else {
    thetaBase = Math.atan2(dy, dx);
  }

  const maxDist = l1 + l2;
  const minDist = Math.abs(l1 - l2);

  // Check if target is within physical reach limits
  const reached = rawDist >= minDist - 1e-4 && rawDist <= maxDist + 1e-4;

  // Clamp distance to avoid triangle inequality violations and division by zero
  const clampedDist = Math.max(minDist + 1e-5, Math.min(maxDist - 1e-5, Math.max(1e-5, rawDist)));

  // Law of Cosines for interior angles:
  // l2^2 = l1^2 + d^2 - 2*l1*d*cos(alpha)
  let cosAlpha = (l1 * l1 + clampedDist * clampedDist - l2 * l2) / (2 * l1 * clampedDist);
  // d^2 = l1^2 + l2^2 - 2*l1*l2*cos(beta)
  let cosBeta = (l1 * l1 + l2 * l2 - clampedDist * clampedDist) / (2 * l1 * l2);

  // Clamp cosine values to [-1, 1] range to guard against floating-point imprecision NaN
  cosAlpha = Math.max(-1, Math.min(1, cosAlpha));
  cosBeta = Math.max(-1, Math.min(1, cosBeta));

  const alpha = Math.acos(cosAlpha);
  const beta = Math.acos(cosBeta);

  // Calculate bone angles
  const angle1 = thetaBase + bendDirection * alpha;
  const angle2 = angle1 - bendDirection * (Math.PI - beta);

  // Compute exact positions
  const joint: Vector2D = {
    x: root.x + l1 * Math.cos(angle1),
    y: root.y + l1 * Math.sin(angle1),
  };

  const tip: Vector2D = {
    x: joint.x + l2 * Math.cos(angle2),
    y: joint.y + l2 * Math.sin(angle2),
  };

  return {
    joint,
    tip,
    angle1,
    angle2,
    reached,
  };
}

/**
 * Solves multi-joint spine bending curve for ducking, hit recoil, and heavy windups.
 *
 * @param root Base pelvis/hip position
 * @param mid Mid-spine/chest position
 * @param head Neck/head root position
 * @param bendAmount Lateral offset magnitude for curve displacement
 * @returns SpineCurveResult with computed joint positions and curve displacement
 */
export function solveSpineCurve(
  root: Vector2D,
  mid: Vector2D,
  head: Vector2D,
  bendAmount: number
): SpineCurveResult {
  // Compute segment lengths
  const lenL1 = Math.sqrt((mid.x - root.x) ** 2 + (mid.y - root.y) ** 2) || 20;
  const lenL2 = Math.sqrt((head.x - mid.x) ** 2 + (head.y - mid.y) ** 2) || 20;

  const dx = head.x - root.x;
  const dy = head.y - root.y;
  const fullDist = Math.sqrt(dx * dx + dy * dy);

  let nx = 0;
  let ny = -1;

  if (fullDist > 1e-6) {
    // Normal vector perpendicular to spine line (root -> head)
    nx = -dy / fullDist;
    ny = dx / fullDist;
  }

  const curveOffset: Vector2D = {
    x: nx * bendAmount,
    y: ny * bendAmount,
  };

  // Base midpoint between root and head
  const baseMidX = (root.x + head.x) / 2;
  const baseMidY = (root.y + head.y) / 2;

  // Target mid position with curve displacement
  const targetMidX = baseMidX + curveOffset.x;
  const targetMidY = baseMidY + curveOffset.y;

  // Preserve segment lengths via FABRIK-style distance constraint passes
  // Pass 1: Adjust mid relative to root
  const d1x = targetMidX - root.x;
  const d1y = targetMidY - root.y;
  const d1 = Math.sqrt(d1x * d1x + d1y * d1y) || 1e-5;
  const newMid: Vector2D = {
    x: root.x + (d1x / d1) * lenL1,
    y: root.y + (d1y / d1) * lenL1,
  };

  // Pass 2: Adjust head relative to newMid
  const d2x = head.x - targetMidX;
  const d2y = head.y - targetMidY;
  const d2 = Math.sqrt(d2x * d2x + d2y * d2y) || 1e-5;

  // Ducking compression lowers head when bend is active
  const compressionFactor = Math.cos(Math.min(Math.PI / 3, Math.abs(bendAmount) / 50));
  const effectiveL2 = lenL2 * compressionFactor;

  const newHead: Vector2D = {
    x: newMid.x + (d2 > 1e-6 ? (d2x / d2) * effectiveL2 : 0),
    y: newMid.y + (d2 > 1e-6 ? (d2y / d2) * effectiveL2 : -effectiveL2),
  };

  return {
    root: { ...root },
    mid: newMid,
    head: newHead,
    curveOffset,
  };
}
