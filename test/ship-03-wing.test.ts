// Miyamoto's bird-wing solar array (MODULES-490): a jointed spar and overlapping feathers behind the glass elevator, folded, half open and open.
import assert from "node:assert/strict";
import { test } from "node:test";
import { motionsOf } from "../src/model/fleet/motion.ts";
import { ELEVATOR } from "../src/model/fleet/ship-03/dims.ts";
import { birdWing, type WingPose } from "../src/model/fleet/ship-03/wing.ts";
import { MIYAMOTO_VARIANT_SLOTS } from "../src/model/fleet/ship-03/variants.ts";
import { habitat } from "../src/model/fleet/ship-03/habitat.ts";
import { boundsOfPieces, type Piece } from "../src/model/pieces.ts";
import { movingGroupsOf } from "../src/model/moves.ts";

const poses: WingPose[] = ["folded", "half", "open"];
const materialsOf = (pieces: readonly Piece[]) => new Set(pieces.filter((piece) => piece.kind !== "lines").map((piece) => (piece as { material: string }).material));

/** How far one side reaches out from the hull: the bundle is slim, the open wing is not. */
const reach = (pose: WingPose): number => {
  const pieces = birdWing(pose).filter((piece) => piece.kind === "plate" && piece.frame.o[0] > 0);
  const box = boundsOfPieces(pieces);
  return box.max[0] - box.min[0];
};

test("the wing opens from a slim bundle to a broad span, and half sits between", () => {
  const folded = reach("folded");
  const half = reach("half");
  const open = reach("open");
  assert.ok(folded < 18, `folded reach ${folded}`);
  assert.ok(open > 36, `open reach ${open}`);
  assert.ok(half > folded + 6 && half < open - 6, `half ${half} between ${folded} and ${open}`);
});

test("every pose stays dorsal of both glass elevators", () => {
  for (const pose of poses) {
    const box = boundsOfPieces(birdWing(pose));
    assert.ok(box.min[2] > ELEVATOR.z[1], `${pose} dips to z ${box.min[2]}, elevator ends at ${ELEVATOR.z[1]}`);
  }
});

test("feathers overlap, cells shine, and the joints and the tip carry lamps", () => {
  const open = birdWing("open");
  const names = materialsOf(open);
  assert.ok(names.has("gold"), "cells");
  assert.ok(names.has("kapton"), "backing");
  assert.ok(names.has("lamp-amber"), "joint lamps");
  assert.ok(names.has("lamp-red"), "tip lamp");
  assert.ok(open.filter((piece) => piece.kind !== "lines" && (piece as { material: string }).material === "gold").length >= 24, "a cell plate on every feather");
});

test("the folded wing is what motion deploys, and the open wing is already there", () => {
  const folded = movingGroupsOf(birdWing("folded"));
  assert.ok(folded.includes("wing-deploy-starboard") && folded.includes("wing-deploy-port"), folded.join(","));
  assert.deepEqual(movingGroupsOf(birdWing("open")), []);
  const motions = motionsOf("fleet-ship-03").filter((motion) => motion.group.startsWith("wing-deploy"));
  assert.equal(motions.length, 2);
  for (const motion of motions) assert.equal(motion.kind, "swing");
});

test("the three poses are variants, and the elevator is on the habitation drum", () => {
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-wing"].wing, "wing-folded");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-wing-half"].wing, "wing-half");
  assert.equal(MIYAMOTO_VARIANT_SLOTS["miyamoto-wing-open"].wing, "wing-open");
  assert.equal("wing" in MIYAMOTO_VARIANT_SLOTS.miyamoto, false);
  const glass = habitat(false, 0.25).filter((piece) => piece.kind === "lathe" && piece.material === "glass");
  assert.ok(glass.length >= 2, "a glass shaft each side");
});
