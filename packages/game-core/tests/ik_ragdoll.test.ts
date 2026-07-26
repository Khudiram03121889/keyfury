import { describe, it, expect } from 'vitest';
import {
  solve2BoneIK,
  solveSpineCurve,
  RagdollSystem,
  Vector2D,
  RagdollPose,
} from '../src/index.js';

describe('Procedural 2-Bone IK Solver (solve2BoneIK)', () => {
  it('solves exact joint and tip positions for standard 3-4-5 right triangle target', () => {
    const root: Vector2D = { x: 0, y: 0 };
    const target: Vector2D = { x: 5, y: 0 };
    const length1 = 3;
    const length2 = 4;

    const resultPos = solve2BoneIK(root, target, length1, length2, 1);

    expect(resultPos.reached).toBe(true);
    expect(Number.isNaN(resultPos.joint.x)).toBe(false);
    expect(Number.isNaN(resultPos.joint.y)).toBe(false);
    expect(Number.isNaN(resultPos.tip.x)).toBe(false);
    expect(Number.isNaN(resultPos.tip.y)).toBe(false);

    // Verify distance from root to joint equals length1
    const distRootJoint = Math.sqrt(
      (resultPos.joint.x - root.x) ** 2 + (resultPos.joint.y - root.y) ** 2
    );
    expect(distRootJoint).toBeCloseTo(length1, 3);

    // Verify distance from joint to tip equals length2
    const distJointTip = Math.sqrt(
      (resultPos.tip.x - resultPos.joint.x) ** 2 + (resultPos.tip.y - resultPos.joint.y) ** 2
    );
    expect(distJointTip).toBeCloseTo(length2, 3);

    // Verify tip matches target accurately (epsilon < 0.001)
    const errorTarget = Math.sqrt(
      (resultPos.tip.x - target.x) ** 2 + (resultPos.tip.y - target.y) ** 2
    );
    expect(errorTarget).toBeLessThan(0.001);
  });

  it('solves oblique triangle with negative bend direction (-1)', () => {
    const root: Vector2D = { x: 100, y: 200 };
    const target: Vector2D = { x: 130, y: 240 };
    const length1 = 30;
    const length2 = 25;

    const resultNeg = solve2BoneIK(root, target, length1, length2, -1);

    expect(resultNeg.reached).toBe(true);

    const distRootJoint = Math.sqrt(
      (resultNeg.joint.x - root.x) ** 2 + (resultNeg.joint.y - root.y) ** 2
    );
    expect(distRootJoint).toBeCloseTo(length1, 3);

    const distJointTip = Math.sqrt(
      (resultNeg.tip.x - resultNeg.joint.x) ** 2 + (resultNeg.tip.y - resultNeg.joint.y) ** 2
    );
    expect(distJointTip).toBeCloseTo(length2, 3);

    const errorTarget = Math.sqrt(
      (resultNeg.tip.x - target.x) ** 2 + (resultNeg.tip.y - target.y) ** 2
    );
    expect(errorTarget).toBeLessThan(0.001);
  });

  it('handles over-reachable target clamping gracefully without NaN', () => {
    const root: Vector2D = { x: 0, y: 0 };
    const target: Vector2D = { x: 200, y: 0 };
    const length1 = 40;
    const length2 = 50; // max reach = 90

    const resultOver = solve2BoneIK(root, target, length1, length2, 1);

    expect(resultOver.reached).toBe(false);
    expect(Number.isNaN(resultOver.joint.x)).toBe(false);
    expect(Number.isNaN(resultOver.tip.x)).toBe(false);

    // Tip should extend straight towards target at max distance length1 + length2
    const extendedDist = Math.sqrt(
      (resultOver.tip.x - root.x) ** 2 + (resultOver.tip.y - root.y) ** 2
    );
    expect(extendedDist).toBeCloseTo(length1 + length2, 2);
  });

  it('handles zero-distance target at root without zero division or NaN', () => {
    const root: Vector2D = { x: 50, y: 50 };
    const target: Vector2D = { x: 50, y: 50 };

    // Case A: Unequal bone lengths (minDist = 10, dist = 0 -> unreachable)
    const resultUnequal = solve2BoneIK(root, target, 20, 10, 1);
    expect(resultUnequal.reached).toBe(false);
    expect(Number.isNaN(resultUnequal.joint.x)).toBe(false);
    expect(Number.isNaN(resultUnequal.tip.x)).toBe(false);

    // Case B: Equal bone lengths (minDist = 0, dist = 0 -> reachable folded back)
    const resultEqual = solve2BoneIK(root, target, 20, 20, 1);
    expect(resultEqual.reached).toBe(true);
    expect(Number.isNaN(resultEqual.joint.x)).toBe(false);
    expect(Number.isNaN(resultEqual.tip.x)).toBe(false);
  });
});

describe('Spine Curve Solver (solveSpineCurve)', () => {
  it('calculates spine bending displacement and ducking compression', () => {
    const root: Vector2D = { x: 500, y: 400 };
    const mid: Vector2D = { x: 500, y: 350 };
    const head: Vector2D = { x: 500, y: 300 };

    const bendResult = solveSpineCurve(root, mid, head, 25);

    expect(bendResult.curveOffset.x).not.toBe(0);
    expect(Number.isNaN(bendResult.mid.x)).toBe(false);
    expect(Number.isNaN(bendResult.head.y)).toBe(false);

    // Verify distance from root to mid preserves length
    const distRootMid = Math.sqrt(
      (bendResult.mid.x - bendResult.root.x) ** 2 + (bendResult.mid.y - bendResult.root.y) ** 2
    );
    expect(distRootMid).toBeCloseTo(50, 1);
  });
});

describe('Verlet Ragdoll Physics Engine (RagdollSystem)', () => {
  it('initializes 10+ node skeleton graph and distance constraints', () => {
    const ragdoll = new RagdollSystem();

    expect(ragdoll.nodes.size).toBeGreaterThanOrEqual(10);
    expect(ragdoll.nodes.has('head')).toBe(true);
    expect(ragdoll.nodes.has('pelvis')).toBe(true);
    expect(ragdoll.nodes.has('handL')).toBe(true);
    expect(ragdoll.nodes.has('footR')).toBe(true);
    expect(ragdoll.constraints.length).toBeGreaterThan(0);
  });

  it('performs Verlet integration under gravity in Ragdoll mode', () => {
    const ragdoll = new RagdollSystem({ gravity: { x: 0, y: 1000 }, groundY: 1000 });
    ragdoll.setMode('Ragdoll');

    const initialHeadY = ragdoll.getNode('head')!.y;

    ragdoll.step(0.016);
    ragdoll.step(0.016);

    const newHeadY = ragdoll.getNode('head')!.y;
    expect(newHeadY).toBeGreaterThan(initialHeadY);
  });

  it('enforces 4-pass distance constraints during integration', () => {
    const ragdoll = new RagdollSystem({ gravity: { x: 0, y: 980 }, groundY: 1000 });
    ragdoll.setMode('Ragdoll');

    const neck = ragdoll.getNode('neck')!;
    const head = ragdoll.getNode('head')!;
    const initialDist = Math.sqrt((head.x - neck.x) ** 2 + (head.y - neck.y) ** 2);

    for (let i = 0; i < 20; i++) {
      ragdoll.step(0.016);
    }

    const currentDist = Math.sqrt((head.x - neck.x) ** 2 + (head.y - neck.y) ** 2);
    expect(Math.abs(currentDist - initialDist)).toBeLessThan(1.0);
  });

  it('enforces ground plane collision with friction and restitution', () => {
    const groundY = 400;
    const ragdoll = new RagdollSystem({
      gravity: { x: 0, y: 1000 },
      groundY,
      restitution: 0.2,
      friction: 0.6,
    });

    ragdoll.setMode('Ragdoll');

    // Step physics for 100 ticks to fall onto ground
    for (let i = 0; i < 100; i++) {
      ragdoll.step(0.016);
    }

    for (const node of ragdoll.nodes.values()) {
      expect(node.y).toBeLessThanOrEqual(groundY + 0.001);
    }
  });

  it('applies linear impulse force and transfers rotational torque across skeleton', () => {
    const ragdoll = new RagdollSystem({ groundY: 1000 });
    ragdoll.setMode('Ragdoll');

    const initialHandLX = ragdoll.getNode('handL')!.x;
    const initialHeadX = ragdoll.getNode('head')!.x;

    // Apply strong horizontal impulse to left hand
    ragdoll.applyImpulse('handL', { x: 500, y: -200 });

    ragdoll.step(0.016);

    const newHandLX = ragdoll.getNode('handL')!.x;
    const newHeadX = ragdoll.getNode('head')!.x;

    // Hand should move rapidly in response to impulse
    expect(newHandLX).toBeGreaterThan(initialHandLX);
    // Torque transfer should affect other nodes
    expect(newHeadX).not.toBe(initialHeadX);
  });

  it('supports Hybrid mode transitions between IK pose driven and Ragdoll physics states', () => {
    const ragdoll = new RagdollSystem();

    expect(ragdoll.getMode()).toBe('IK');

    const customPose: RagdollPose = {
      head: { x: 200, y: 100 },
      pelvis: { x: 200, y: 170 },
    };

    ragdoll.setPose(customPose);
    expect(ragdoll.getNode('head')!.x).toBe(200);

    // Switch to Ragdoll
    ragdoll.setMode('Ragdoll');
    expect(ragdoll.getMode()).toBe('Ragdoll');

    // Initiate recovery transition to IK
    ragdoll.transitionToIK(customPose, 0.1);
    expect(ragdoll.getMode()).toBe('Blending');

    // Step through blending transition
    ragdoll.step(0.05);
    expect(ragdoll.getMode()).toBe('Blending');

    ragdoll.step(0.06);
    expect(ragdoll.getMode()).toBe('IK');
    expect(ragdoll.getNode('head')!.x).toBeCloseTo(200, 1);
  });

  it('maintains numerical stability over 1000 continuous simulation ticks', () => {
    const ragdoll = new RagdollSystem({ groundY: 500 });
    ragdoll.setMode('Ragdoll');

    for (let i = 0; i < 1000; i++) {
      ragdoll.step(0.016);
    }

    for (const node of ragdoll.nodes.values()) {
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });
});
