/**
 * RagdollSystem.ts
 * 10-Node Verlet Integration Ragdoll Physics Engine with Ground Collision,
 * Impulse/Torque Transfer, and Hybrid IK/Ragdoll Blending.
 */

import { Vector2D } from './IKSystem.js';

export type RagdollNodeId =
  | 'head'
  | 'neck'
  | 'pelvis'
  | 'elbowL'
  | 'handL'
  | 'elbowR'
  | 'handR'
  | 'kneeL'
  | 'footL'
  | 'kneeR'
  | 'footR';

export interface RagdollNode {
  id: RagdollNodeId;
  x: number;
  y: number;
  oldX: number;
  oldY: number;
  mass: number;
  pinned: boolean;
}

export interface RagdollConstraint {
  nodeA: RagdollNodeId;
  nodeB: RagdollNodeId;
  length: number;
  stiffness: number;
}

export type RagdollMode = 'IK' | 'Ragdoll' | 'Blending';

export interface RagdollConfig {
  gravity?: Vector2D;
  groundY?: number;
  friction?: number;
  restitution?: number;
  constraintPasses?: number;
  damping?: number;
}

export type RagdollPose = {
  [key in RagdollNodeId]?: Vector2D;
};

export class RagdollSystem {
  public nodes: Map<RagdollNodeId, RagdollNode> = new Map();
  public constraints: RagdollConstraint[] = [];

  public gravity: Vector2D;
  public groundY: number;
  public friction: number;
  public restitution: number;
  public constraintPasses: number;
  public damping: number;

  private mode: RagdollMode = 'IK';

  // Blending state variables
  private blendTime: number = 0;
  private blendDuration: number = 0.3;
  private blendStartPose: RagdollPose = {};
  private blendTargetPose: RagdollPose = {};

  constructor(config?: RagdollConfig) {
    this.gravity = config?.gravity ?? { x: 0, y: 980 };
    this.groundY = config?.groundY ?? 500;
    this.friction = Math.max(0, Math.min(1, config?.friction ?? 0.6));
    this.restitution = Math.max(0, Math.min(1, config?.restitution ?? 0.2));
    this.constraintPasses = config?.constraintPasses ?? 4;
    this.damping = config?.damping ?? 0.99;

    this.initDefaultSkeleton();
  }

  /**
   * Initializes standard 10+ node stickman skeleton structure and bone constraints.
   */
  public initDefaultSkeleton(center: Vector2D = { x: 500, y: 300 }, scale: number = 1.0): void {
    this.nodes.clear();
    this.constraints = [];

    const addNode = (id: RagdollNodeId, x: number, y: number, mass: number = 1.0) => {
      this.nodes.set(id, {
        id,
        x,
        y,
        oldX: x,
        oldY: y,
        mass,
        pinned: false,
      });
    };

    // Spine & Head
    addNode('pelvis', center.x, center.y, 2.0);
    addNode('neck', center.x, center.y - 40 * scale, 1.2);
    addNode('head', center.x, center.y - 70 * scale, 1.5);

    // Left Arm
    addNode('elbowL', center.x - 20 * scale, center.y - 35 * scale, 1.0);
    addNode('handL', center.x - 35 * scale, center.y - 15 * scale, 0.8);

    // Right Arm
    addNode('elbowR', center.x + 20 * scale, center.y - 35 * scale, 1.0);
    addNode('handR', center.x + 35 * scale, center.y - 15 * scale, 0.8);

    // Left Leg
    addNode('kneeL', center.x - 15 * scale, center.y + 35 * scale, 1.1);
    addNode('footL', center.x - 15 * scale, center.y + 70 * scale, 0.9);

    // Right Leg
    addNode('kneeR', center.x + 15 * scale, center.y + 35 * scale, 1.1);
    addNode('footR', center.x + 15 * scale, center.y + 70 * scale, 0.9);

    // Constraints setup
    const addConstraint = (nodeA: RagdollNodeId, nodeB: RagdollNodeId, stiffness: number = 1.0) => {
      const nA = this.nodes.get(nodeA);
      const nB = this.nodes.get(nodeB);
      if (nA && nB) {
        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        this.constraints.push({ nodeA, nodeB, length, stiffness });
      }
    };

    addConstraint('neck', 'head');
    addConstraint('pelvis', 'neck');
    addConstraint('neck', 'elbowL');
    addConstraint('elbowL', 'handL');
    addConstraint('neck', 'elbowR');
    addConstraint('elbowR', 'handR');
    addConstraint('pelvis', 'kneeL');
    addConstraint('kneeL', 'footL');
    addConstraint('pelvis', 'kneeR');
    addConstraint('kneeR', 'footR');

    // Structural cross-brace constraints for skeleton stability
    addConstraint('elbowL', 'elbowR', 0.5);
    addConstraint('kneeL', 'kneeR', 0.5);
  }

  public getMode(): RagdollMode {
    return this.mode;
  }

  public setMode(mode: RagdollMode): void {
    if (this.mode === mode) return;

    if (mode === 'Ragdoll') {
      // Transitioning to ragdoll physics: ensure velocities are preserved
      for (const node of this.nodes.values()) {
        const vx = node.x - node.oldX;
        const vy = node.y - node.oldY;
        node.oldX = node.x - vx;
        node.oldY = node.y - vy;
      }
    }
    this.mode = mode;
  }

  /**
   * Sets node positions directly (e.g., from animation/IK pose solver).
   */
  public setPose(pose: RagdollPose): void {
    for (const [id, pos] of Object.entries(pose) as [RagdollNodeId, Vector2D][]) {
      const node = this.nodes.get(id);
      if (node && pos) {
        const vx = node.x - node.oldX;
        const vy = node.y - node.oldY;
        node.x = pos.x;
        node.y = pos.y;
        // Maintain relative velocity during pose updates
        node.oldX = pos.x - vx;
        node.oldY = pos.y - vy;
      }
    }
  }

  /**
   * Retrieves current positions of all nodes.
   */
  public getPose(): RagdollPose {
    const pose: RagdollPose = {};
    for (const [id, node] of this.nodes.entries()) {
      pose[id] = { x: node.x, y: node.y };
    }
    return pose;
  }

  public getNode(id: RagdollNodeId): RagdollNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Initiates smooth recovery transition from Ragdoll physics state back to IK driven pose.
   */
  public transitionToIK(targetPose: RagdollPose, durationSec: number = 0.3): void {
    this.blendStartPose = this.getPose();
    this.blendTargetPose = { ...targetPose };
    this.blendTime = 0;
    this.blendDuration = Math.max(0.01, durationSec);
    this.mode = 'Blending';
  }

  /**
   * Applies linear impulse force and transfers rotational torque across the ragdoll skeleton.
   */
  public applyImpulse(nodeId: RagdollNodeId, forceVector: Vector2D): void {
    const targetNode = this.nodes.get(nodeId);
    if (!targetNode) return;

    // Direct linear impulse: delta_v = force / mass
    const dvX = forceVector.x / targetNode.mass;
    const dvY = forceVector.y / targetNode.mass;

    targetNode.oldX -= dvX;
    targetNode.oldY -= dvY;

    // Calculate center of mass of the ragdoll
    let totalMass = 0;
    let comX = 0;
    let comY = 0;

    for (const node of this.nodes.values()) {
      totalMass += node.mass;
      comX += node.x * node.mass;
      comY += node.y * node.mass;
    }

    if (totalMass > 0) {
      comX /= totalMass;
      comY /= totalMass;
    }

    // Moment arm from Center of Mass to hit node
    const rx = targetNode.x - comX;
    const ry = targetNode.y - comY;

    // 2D scalar torque tau = r x F = rx * Fy - ry * Fx
    const torque = rx * forceVector.y - ry * forceVector.x;

    // Compute approximate moment of inertia I = sum(m_i * r_i^2)
    let inertia = 0;
    for (const node of this.nodes.values()) {
      const dx = node.x - comX;
      const dy = node.y - comY;
      inertia += node.mass * (dx * dx + dy * dy);
    }

    if (inertia > 1e-4) {
      const angularImpulse = torque / inertia;
      // Transfer rotational velocity v_rot = omega x r = (-omega * ry, omega * rx)
      for (const node of this.nodes.values()) {
        const ndx = node.x - comX;
        const ndy = node.y - comY;
        const rotVx = -angularImpulse * ndy * 0.5;
        const rotVy = angularImpulse * ndx * 0.5;

        node.oldX -= rotVx;
        node.oldY -= rotVy;
      }
    }
  }

  /**
   * Advances physics integration by delta time dt.
   */
  public step(dt: number): void {
    if (dt <= 0) return;

    if (this.mode === 'IK') {
      // Driven by IK pose; maintain kinematic velocity vector
      return;
    }

    if (this.mode === 'Blending') {
      this.blendTime += dt;
      const alpha = Math.min(1.0, this.blendTime / this.blendDuration);
      // Smooth step easing curve
      const t = alpha * alpha * (3 - 2 * alpha);

      for (const [id, startPos] of Object.entries(this.blendStartPose) as [RagdollNodeId, Vector2D][]) {
        const node = this.nodes.get(id);
        const targetPos = this.blendTargetPose[id];
        if (node && startPos && targetPos) {
          const curX = startPos.x + (targetPos.x - startPos.x) * t;
          const curY = startPos.y + (targetPos.y - startPos.y) * t;

          const vx = curX - node.x;
          const vy = curY - node.y;

          node.x = curX;
          node.y = curY;
          node.oldX = curX - vx;
          node.oldY = curY - vy;
        }
      }

      if (alpha >= 1.0) {
        this.mode = 'IK';
      }
      return;
    }

    // --- Mode === 'Ragdoll': Verlet Integration ---
    for (const node of this.nodes.values()) {
      if (node.pinned) continue;

      const vx = (node.x - node.oldX) * this.damping;
      const vy = (node.y - node.oldY) * this.damping;

      node.oldX = node.x;
      node.oldY = node.y;

      node.x += vx + this.gravity.x * dt * dt;
      node.y += vy + this.gravity.y * dt * dt;
    }

    // --- 4-Pass Distance Constraint Solver ---
    for (let pass = 0; pass < this.constraintPasses; pass++) {
      for (const constraint of this.constraints) {
        const nA = this.nodes.get(constraint.nodeA);
        const nB = this.nodes.get(constraint.nodeB);

        if (!nA || !nB) continue;

        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1e-6) continue;

        const delta = (dist - constraint.length) / dist;
        const correctionX = dx * 0.5 * delta * constraint.stiffness;
        const correctionY = dy * 0.5 * delta * constraint.stiffness;

        if (nA.pinned && !nB.pinned) {
          nB.x -= correctionX * 2;
          nB.y -= correctionY * 2;
        } else if (!nA.pinned && nB.pinned) {
          nA.x += correctionX * 2;
          nA.y += correctionY * 2;
        } else if (!nA.pinned && !nB.pinned) {
          nA.x += correctionX;
          nA.y += correctionY;
          nB.x -= correctionX;
          nB.y -= correctionY;
        }
      }
    }

    // --- Ground Plane Collision with Friction & Restitution ---
    for (const node of this.nodes.values()) {
      if (node.y >= this.groundY) {
        const vy = node.y - node.oldY;
        const vx = node.x - node.oldX;

        // Position response: clamp to ground surface
        node.y = this.groundY;

        // Restitution response (bouncing)
        if (vy > 0) {
          const newVy = -vy * this.restitution;
          node.oldY = node.y - newVy;
        } else {
          node.oldY = node.y;
        }

        // Friction response (horizontal sliding damping)
        const newVx = vx * (1 - this.friction);
        node.oldX = node.x - newVx;
      }
    }
  }
}
