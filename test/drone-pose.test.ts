import assert from "node:assert/strict";
import test from "node:test";
import { Mesh } from "three";
import { posedDrone } from "../src/element/nearPoses.ts";
import { ARMS, joints } from "../src/model/fleet/drone/layout.ts";
import { legPieces } from "../src/model/fleet/drone/legs.ts";
import { DRONE_POSE, blendPose, fingerSpan, poseFor, poseOf, storedPose } from "../src/model/fleet/drone/poses.ts";

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
