// Two or three craft in one scene: each stands on the ground at true size, in a row from the left, clear of the one before; the element's `beside` list is read with care.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BESIDE_MOST, BESIDE_ROCKET, besideCraft, craftName, ROCKETS } from "../src/index.ts";
import { build } from "../src/build/index.ts";

test("the beside list: on is Starship, a list is at most two craft, and what is not a craft is left out", () => {
  assert.deepEqual(besideCraft("on", "saturn-v"), [BESIDE_ROCKET]);
  assert.deepEqual(besideCraft("on", "starship"), []);
  assert.deepEqual(besideCraft(null, "saturn-v"), []);
  assert.deepEqual(besideCraft("saturn-v:saturn-v,iss:iss", "starship"), [{ rocket: "saturn-v", variant: "saturn-v" }, { rocket: "iss", variant: "iss" }]);
  // the rocket's default variant when none is named, and no more than two
  assert.deepEqual(besideCraft("sls,hubble,iss", "starship").map((craft) => craft.rocket), ["sls", "hubble"]);
  assert.equal(BESIDE_MOST, 2);
  // a list may name the rocket itself: Starship Block 3 beside Block 4
  assert.deepEqual(besideCraft("starship:v4", "starship"), [{ rocket: "starship", variant: "v4" }]);
  // hostile or unknown ids are only dropped
  assert.deepEqual(besideCraft("<img src=x>,__proto__,constructor:x,saturn-v:nope", "starship"), []);
});

test("three craft stand in a row, each whole and at true size, with room between and one ground", () => {
  const three = build({ rocket: "starship", variant: "v3" }, { beside: [{ rocket: "saturn-v", variant: "saturn-v" }, { rocket: "iss", variant: "iss" }], named: true });
  const alone = (rocket: string) => build({ rocket }).boundsOf("together");
  const places = three.placesOf("together");
  const firstOf = (prefix: string) => places.filter((place) => place.slot.startsWith(prefix));
  const own = places.filter((place) => !place.slot.startsWith("beside-"));
  const second = firstOf("beside-").filter((place) => !place.slot.startsWith("beside-2-"));
  const third = firstOf("beside-2-");
  assert.ok(own.length && second.length && third.length);
  assert.deepEqual([...new Set(three.beside.map((part) => part.craft))], [0, 1]);
  const extent = (list: typeof places) => {
    const lo: number[] = [Infinity];
    const hi: number[] = [-Infinity];
    for (const place of list) {
      const part = [...three.parts, ...three.beside].find((one) => one.slot === place.slot)!;
      lo[0] = Math.min(lo[0], place.at[0] + part.bounds.min[0]);
      hi[0] = Math.max(hi[0], place.at[0] + part.bounds.max[0]);
    }
    return [lo[0], hi[0]];
  };
  const [a, b, c] = [extent(own), extent(second), extent(third)];
  assert.ok(b[0] > a[1] && c[0] > b[1], `in a row: ${a} ${b} ${c}`);
  // true size: Saturn V is as tall in the row as alone, and the station keeps its length
  const saturn = alone("saturn-v");
  const tops = second.map((place) => place.at[1] + (three.beside.find((part) => part.slot === place.slot) as { bounds: { max: number[] } }).bounds.max[1]);
  assert.ok(Math.abs(Math.max(...tops) - saturn.max[1]) < 0.01);
  // the box Fit holds contains all three
  const box = three.boundsOf("together");
  assert.ok(box.min[0] <= a[0] + 1e-6 && box.max[0] >= c[1] - 1e-6);
  // they are named, the rocket first, with the sourced lengths
  assert.equal(three.names.length, 3);
  assert.match(three.names[0], /Block 3 \(V3\), 124\.4 m$/);
  assert.match(three.names[1], /^Saturn V \(Apollo\), 110\.64 m$/);
  assert.match(three.names[2], /International Space Station|ISS/);
});

test("without `named` nothing is named, and beside true is Starship's one name", () => {
  assert.deepEqual(build({ rocket: "saturn-v" }, { beside: [{ rocket: "iss" }] }).names, []);
  assert.equal(build({ rocket: "saturn-v" }, { beside: true, named: true }).names.length, 2);
  assert.equal(craftName({ rocket: "nope" }, 10), "nope");
  assert.ok(Object.keys(ROCKETS).length > 3);
});
