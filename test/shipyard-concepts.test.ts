// The three yard concepts: a 2 km slot, a rack of kit modules, berth lights off the arrival line.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boundsOf, meshOf } from "../src/model/pieces.ts";
import { YARD_LENGTH, yardConcepts } from "../src/model/fleet/shipyard-concepts/concepts.ts";

test("three yards, each a 2 km slot with charge lights off the axis", () => {
  const yards = yardConcepts();
  assert.deepEqual(yards.map((y) => y.id), ["spine", "hall", "dock"]);
  for (const yard of yards) {
    const pieces = yard.pieces();
    const box = boundsOf(meshOf(pieces));
    assert.ok(box.max[1] - box.min[1] > YARD_LENGTH - 30, yard.id);
    assert.ok(pieces.some((p) => "material" in p && p.material === "lamp-amber"), yard.id);
    assert.ok(pieces.some((p) => "material" in p && p.material === "nav-green"), yard.id);
    assert.ok(Math.abs(yard.shipAt[0]) < 400, yard.id);
  }
});
