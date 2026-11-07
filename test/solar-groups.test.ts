import assert from "node:assert/strict";
import { test } from "node:test";
import { skyGroupOf, skyQuery, skyShown, thinSky } from "../src/element/solarGroups.ts";

test("a body belongs to one sky group", () => {
  assert.equal(skyGroupOf("jupiter"), "planets");
  assert.equal(skyGroupOf("sun"), "planets");
  assert.equal(skyGroupOf("ceres"), "dwarfs");
  assert.equal(skyGroupOf("pluto"), "dwarfs");
  assert.equal(skyGroupOf("moon"), "moons");
  assert.equal(skyGroupOf("craft"), null);
});

test("the address lists only the groups that stay on", () => {
  const all = skyShown(null);
  assert.equal(skyQuery(all), null);
  const without = skyShown("moons,dwarfs,belts,craft");
  assert.equal(without.planets, false);
  assert.equal(without.moons, true);
  assert.equal(skyQuery(without), "moons,dwarfs,belts,craft");
  assert.equal(skyShown("").planets, true);
});

test("marks keep the largest and the nearest, and drop one that would sit on another", () => {
  const kept = thinSky(
    [
      { id: "small-near", x: 0, y: 0, range: 1, radius: 10 },
      { id: "large", x: 0, y: 0, range: 9, radius: 100 },
      { id: "aside", x: 80, y: 0, range: 5, radius: 20 },
      { id: "far", x: 200, y: 0, range: 50, radius: 15 },
    ],
    2,
    36,
  );
  assert.deepEqual(kept.map((spot) => spot.id), ["large", "aside"]);
});
