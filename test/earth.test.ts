// The sums behind the demo's Earth: a slow turn, the Sun keeping its place in the picture, and a planet much wider than the view.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DISC_TURN_SECONDS, placementIn, START_TIME, stepSeconds, TURN_SECONDS, turnAt } from "../demo/earth-model.ts";
import { subsolarPoint } from "@johnmorrisdotca/chikyu-earth/realistic";

test("one turn takes TURN_SECONDS, and a day of the Sun goes with it", () => {
  assert.deepEqual(turnAt(0), { yaw: 0, time: START_TIME });
  assert.equal(turnAt(TURN_SECONDS).yaw, 360);
  assert.equal(turnAt(TURN_SECONDS).time, START_TIME + 86_400_000);
});

test("the Sun stays where it is in the picture while the land turns", () => {
  const offset = (seconds: number) => {
    const { yaw, time } = turnAt(seconds);
    // the longitude in the middle of the view falls by yaw, and the Sun's falls by the same
    return ((subsolarPoint(time).lon + yaw) % 360 + 360) % 360;
  };
  for (const seconds of [1, 60, 180, 360, 719]) {
    const apart = Math.abs(offset(seconds) - offset(0));
    assert.ok(Math.min(apart, 360 - apart) < 1, `${seconds} s: ${apart} degrees`);
  }
});

test("a late timer is not a jump", () => {
  assert.equal(stepSeconds(250), 0.25);
  assert.equal(stepSeconds(60_000), 1);
  assert.equal(stepSeconds(-5), 0);
});

test("the Earth is much wider than the view, and its edge crosses the picture", () => {
  for (const [width, height] of [[752, 827], [358, 477], [5120, 2880], [1, 1]]) {
    const { radius, panX, panY } = placementIn(width, height);
    assert.ok(radius > Math.max(width, height) * 0.5, "wider than a disc beside it");
    const edge = height / 2 + panY - radius;
    assert.ok(edge > 0 && edge < height, `its top edge is inside the picture: ${edge}`);
    assert.ok(Math.abs(panX) < width / 2, "its middle is under the picture");
  }
});

test("the Earth disc on the journey turns once in ten minutes, the Sun keeping its place", () => {
  assert.equal(DISC_TURN_SECONDS, 600);
  assert.deepEqual(turnAt(0, DISC_TURN_SECONDS), { yaw: 0, time: START_TIME });
  assert.equal(turnAt(DISC_TURN_SECONDS, DISC_TURN_SECONDS).yaw, 360);
  assert.equal(turnAt(150, DISC_TURN_SECONDS).yaw, 90);
  const { yaw, time } = turnAt(200, DISC_TURN_SECONDS);
  const apart = Math.abs((subsolarPoint(time).lon + yaw) - subsolarPoint(START_TIME).lon);
  assert.ok(Math.min(apart % 360, 360 - (apart % 360)) < 1, `${apart} degrees`);
});
