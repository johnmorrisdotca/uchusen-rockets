// The player reads the build order: the keel is underway at the start, everything is finished at the end, and a ship with no order is not offered.
import assert from "node:assert/strict";
import test from "node:test";
import { PLAY_RATES, buildOf, playFrame, playFrom } from "../src/buildPlay.ts";
import { BUILD_DAYS } from "../src/model/fleet/ship-03/buildOrder.ts";

test("Miyamoto starts on the drive, finishes every slot, and a rocket has no build", () => {
  const steps = buildOf("miyamoto");
  assert.ok(steps);
  const start = playFrame(steps, 0);
  assert.equal(start.total, BUILD_DAYS);
  assert.deepEqual(start.going, ["drive"]);
  assert.deepEqual(start.done, []);
  const end = playFrame(steps, 1);
  assert.equal(end.done.length, steps.length);
  assert.deepEqual(end.going, []);
  assert.equal(buildOf("starship"), undefined);
  assert.equal(buildOf("miyamoto-cutaway")?.length, steps.length);
});

test("the long ships are offered, and the address keeps the place", () => {
  for (const variant of ["ariake", "hanabusa", "fleet-kaminari", "fleet-emiake", "fleet-emiake-deployed", "fleet-romaryu"]) assert.ok(buildOf(variant), variant);
  assert.equal(PLAY_RATES[0], 60);
  assert.equal(PLAY_RATES[PLAY_RATES.length - 1], 100_000);
  assert.ok(BUILD_DAYS / PLAY_RATES[0] < 30);
  assert.deepEqual(playFrom(new URLSearchParams("build=on&at=0.25")), { on: true, at: 0.25 });
  assert.deepEqual(playFrom(new URLSearchParams("at=no")), { on: false, at: 0 });
});
