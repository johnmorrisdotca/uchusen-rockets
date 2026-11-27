// Kaminari's outrigger wings: a boom straight out on each side, and two panels on each boom running along the hull.
import assert from "node:assert/strict";
import test from "node:test";
import { STATION } from "../src/model/fleet/ship-02/dims.ts";
import { OUTRIGGER, outrigger } from "../src/model/fleet/ship-02/outrigger.ts";
import { boundsOf, meshOf } from "../src/model/pieces.ts";
import { ROCKETS } from "../src/index.ts";

test("outrigger panels run along the hull and stay clear of the drive", () => {
  const wingAt = 200;
  for (const side of [1, -1] as const) {
    const box = boundsOf(meshOf(outrigger(side)));
    const along = box.max[1] - box.min[1];
    assert.ok(Math.abs(along - (OUTRIGGER.y1 - OUTRIGGER.y0)) < 1, `along ${along}`);
    const mid = (box.min[1] + box.max[1]) / 2;
    assert.ok(Math.abs(mid - OUTRIGGER.boomY) < 1, `middle ${mid}`);
    assert.ok(wingAt + box.min[1] > STATION.drive.y + STATION.drive.length, "the panels stay above the drive");
    const reach = side > 0 ? box.max[0] : -box.min[0];
    assert.ok(reach > OUTRIGGER.boomEnd - 5, `reach ${reach}`);
  }
  assert.ok(ROCKETS["fleet-02"].variants.some((variant) => variant.id === "fleet-02-outriggers"));
});
