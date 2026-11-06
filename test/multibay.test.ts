import assert from "node:assert/strict";
import { test } from "node:test";
import { boundsOf, meshOf } from "../src/model/pieces.ts";
import { multiBay } from "../src/model/fleet/shipyard-concepts/multibay.ts";

test("three bays side by side, wider than one slot", () => {
  const box = boundsOf(meshOf(multiBay()));
  assert.ok(box.max[0] - box.min[0] > 1600, "the bays stand side by side");
  assert.ok(box.max[1] - box.min[1] > 1800, "the hall bay holds a long ship");
});
