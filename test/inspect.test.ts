// A finished hull stays put. The drones stay outside it, apart from each other, and each one holds still on a spot.
import assert from "node:assert/strict";
import test from "node:test";
import { inspectAt } from "../src/inspect.ts";
import type { HullBox } from "../src/swarm.ts";

const hull: HullBox = { min: [-4, -60, -4], max: [4, 60, 4] };

const outside = (where: readonly [number, number, number], box: HullBox): boolean => where[0] < box.min[0] - 1 || where[0] > box.max[0] + 1 || where[2] < box.min[2] - 1 || where[2] > box.max[2] + 1;

const apart = (age: number, count: number): number => {
  const places = Array.from({ length: count }, (_, index) => inspectAt(index, count, age, hull).where);
  let nearest = Infinity;
  for (let i = 0; i < places.length; i += 1) {
    for (let j = i + 1; j < places.length; j += 1) {
      const a = places[i];
      const b = places[j];
      if (!a || !b) continue;
      nearest = Math.min(nearest, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
  }
  return nearest;
};

test("a drone stays outside the hull and moves, then holds on one spot", () => {
  const flying = inspectAt(0, 8, 1, hull);
  const later = inspectAt(0, 8, 2.2, hull);
  assert.equal(flying.paused, false);
  assert.ok(outside(flying.where, hull));
  assert.ok(Math.hypot(later.where[0] - flying.where[0], later.where[1] - flying.where[1], later.where[2] - flying.where[2]) > 1);
  let held = inspectAt(0, 8, 0, hull);
  for (let age = 0; age < 20 && !held.paused; age += 0.25) held = inspectAt(0, 8, age, hull);
  assert.equal(held.paused, true);
  const still = inspectAt(0, 8, 12.4, hull);
  assert.equal(still.paused, true);
  assert.deepEqual(still.where, inspectAt(0, 8, 12.8, hull).where);
  assert.ok(Math.hypot(still.part[0] - still.where[0], still.part[2] - still.where[2]) > 1);
});

test("a hundred drones keep apart", () => {
  assert.ok(apart(1, 100) > 2);
  assert.ok(apart(6, 100) > 2);
  assert.ok(apart(1, 1) === Infinity);
  assert.equal(inspectAt(0, 1, 0.4, hull).paused, false);
});
