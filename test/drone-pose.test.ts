import assert from "node:assert/strict";
import test from "node:test";
import { Mesh } from "three";
import { blendPoses, posedDrone } from "../src/element/nearPoses.ts";
import { farPieces } from "../src/model/fleet/drone/far.ts";
import { ARMS, joints } from "../src/model/fleet/drone/layout.ts";
import { meshOf } from "../src/model/pieces.ts";
import { legPieces } from "../src/model/fleet/drone/legs.ts";
import { DRONE_POSE, STORED_SHAPE, blendPose, fingerSpan, poseFor, poseOf, storedPose } from "../src/model/fleet/drone/poses.ts";

const low = (name: "fly" | "park"): number => {
  let y = Number.POSITIVE_INFINITY;
  posedDrone(name).traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const position = node.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) y = Math.min(y, position.getY(i));
  });
  return y;
};

const grip = ARMS[0];
const reach = (name: keyof typeof DRONE_POSE): number => {
  const wrist = joints(grip, DRONE_POSE[name]).at(-1);
  if (!wrist || !grip) return 0;
  const [x, y, z] = wrist.to;
  const [bx, by, bz] = grip.base;
  return Math.hypot(x - bx, y - by, z - bz);
};

test("a folded arm stays closer to the shoulder than an arm that reaches to place", () => {
  assert.ok(reach("fly") < reach("place"));
  assert.ok(reach("park") < reach("approach"));
});

test("the gripper shuts to grip and opens to approach", () => {
  assert.ok(fingerSpan(DRONE_POSE.grip.grip) < fingerSpan(DRONE_POSE.approach.grip));
});

test("park plants the legs and fly tucks them", () => {
  assert.equal(DRONE_POSE.park.legs, 1);
  assert.equal(DRONE_POSE.fly.legs, 0);
  assert.equal(legPieces(1).length, 3);
  assert.equal(legPieces(0).length, 3);
});

test("ranks hold different poses, and a boss points further than a manager", () => {
  assert.equal(poseFor("grunt", "work", "carry"), "carry");
  assert.equal(poseFor("builder", "work", "weld"), "weld");
  assert.equal(poseFor("manager", "work", "inspect"), "inspect");
  assert.equal(poseFor(undefined, "transit"), "fly");
  assert.equal(poseFor("builder", "berth"), "park");
  assert.ok(poseOf("boss", "work", "direct").point > poseOf("manager", "work", "inspect").point);
});

test("a distant drone snaps to a folded, reaching or planted pose", () => {
  assert.equal(storedPose("fly"), "fly");
  assert.equal(storedPose("carry"), "fly");
  assert.equal(storedPose("park"), "park");
  assert.equal(storedPose("weld"), "place");
  assert.equal(storedPose("inspect"), "place");
  assert.equal(storedPose(poseFor("builder", "berth")), "park");
});

const farBox = (name: "fly" | "park" | "place"): { minY: number; frontMinY: number; maxZ: number; n: number } => {
  let minY = Number.POSITIVE_INFINITY;
  let frontMinY = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let n = 0;
  for (const buffers of meshOf(farPieces(STORED_SHAPE[name])).faces.values()) {
    const p = buffers.positions;
    n += p.length;
    for (let i = 0; i < p.length; i += 3) {
      const y = p[i + 1] ?? minY;
      const z = p[i + 2] ?? maxZ;
      minY = Math.min(minY, y);
      maxZ = Math.max(maxZ, z);
      if (z > 0.45) frontMinY = Math.min(frontMinY, y);
    }
  }
  return { minY, frontMinY, maxZ, n };
};

test("a distant folded drone hangs nothing in front and a reaching one sticks out", () => {
  const flown = farBox("fly");
  const planted = farBox("park");
  const reaching = farBox("place");
  assert.ok(planted.n > flown.n);
  assert.ok(planted.minY < flown.minY - 0.2);
  assert.ok(reaching.maxZ > flown.maxZ + 0.18);
  assert.ok(flown.frontMinY > flown.minY + 0.05);
});

const counts = (name: "fly" | "park" | "weld"): number[] => {
  const out: number[] = [];
  posedDrone(name).traverse((node) => {
    if (node instanceof Mesh) out.push(node.geometry.getAttribute("position").count);
  });
  return out;
};

const flat = (group: ReturnType<typeof posedDrone>): Float32Array => {
  const parts: number[] = [];
  group.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const position = node.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) parts.push(position.getX(i), position.getY(i), position.getZ(i));
  });
  return Float32Array.from(parts);
};

test("a blend sits halfway between the planted pose and the flying one", () => {
  assert.deepEqual(counts("fly"), counts("park"));
  assert.deepEqual(counts("fly"), counts("weld"));
  const group = posedDrone("fly", true);
  assert.equal(blendPoses(group, "fly", "park", 0), true);
  const flown = flat(group);
  assert.equal(blendPoses(group, "fly", "park", 1), true);
  const planted = flat(group);
  let at = -1;
  for (let i = 0; i < flown.length; i += 1) if (Math.abs(flown[i] - planted[i]) > 0.02) at = i;
  assert.ok(at >= 0);
  assert.equal(blendPoses(group, "fly", "park", 0.5), true);
  const mid = flat(group);
  assert.ok(Math.abs(mid[at] - ((flown[at] ?? 0) + (planted[at] ?? 0)) / 2) < 1e-4);
});

test("a planted drone reaches lower than a flying one", () => {
  assert.ok(low("park") < low("fly"));
  assert.equal(posedDrone("weld").name, "drone-pose-weld");
});

test("a blend sits between the two poses", () => {
  const mid = blendPose(DRONE_POSE.fly, DRONE_POSE.place, 0.5);
  assert.equal(mid.pitch[0], (DRONE_POSE.fly.pitch[0] + DRONE_POSE.place.pitch[0]) / 2);
  assert.equal(blendPose(DRONE_POSE.fly, DRONE_POSE.place, 0).grip, DRONE_POSE.fly.grip);
  assert.equal(blendPose(DRONE_POSE.fly, DRONE_POSE.place, 1).legs, DRONE_POSE.place.legs);
});
