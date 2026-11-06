import assert from "node:assert/strict";
import { test } from "node:test";
import { boundsOf, meshOf } from "../src/model/pieces.ts";
import { multiBay, yardFixed, yardLoose } from "../src/model/fleet/shipyard-concepts/multibay.ts";

test("three bays side by side, wider than one slot", () => {
  const box = boundsOf(meshOf(multiBay()));
  assert.ok(box.max[0] - box.min[0] > 2200, "a free spine sits off the bays");
  assert.ok(box.min[0] < -400, "the free spine is parked off the hub");
  assert.ok(box.max[1] - box.min[1] > 1800, "the hall bay holds a long ship");
  assert.equal(yardFixed().length + yardLoose().length, multiBay().length);
});
