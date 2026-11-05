import assert from "node:assert/strict";
import test from "node:test";
import { EARTH_ORBIT, groupKm, nearestOrbit, orbitOpen, orbitQuery, orbitStepsFor, parseOrbitKm } from "../demo/orbit.ts";

test("the Earth has the named orbit distances, and another body scales them", () => {
  assert.deepEqual(orbitStepsFor(6371, 384400, true).map((step) => step.km), [400, 1000, 10000, 36000, 100000, 384400]);
  assert.equal(orbitStepsFor(6371, 384400, true).find((step) => step.name === "geo")?.km, 36000);
  const twice = orbitStepsFor(6371 * 2, 50_000, false);
  assert.equal(twice[0]?.km, 800);
  assert.equal(twice.find((step) => step.name === "moon")?.km, 50_000);
  assert.ok(twice.every((step, i) => i === 0 || step.km > twice[i - 1].km));
  assert.equal(orbitStepsFor(2439, null, false).some((step) => step.name === "moon"), false);
});

test("the address round-trips, and an odd distance snaps to the nearest step", () => {
  assert.equal(parseOrbitKm("10000km"), 10000);
  assert.equal(parseOrbitKm(null), null);
  assert.equal(parseOrbitKm("far"), null);
  assert.equal(nearestOrbit(999, EARTH_ORBIT), 1000);
  assert.equal(nearestOrbit(0, EARTH_ORBIT), 400);
  assert.equal(orbitQuery(400, EARTH_ORBIT), null);
  assert.equal(orbitQuery(10000, EARTH_ORBIT), "10000km");
  assert.equal(groupKm(384400), "384,400");
});

test("low orbit is closed and the farthest step is open", () => {
  assert.equal(orbitOpen(400, EARTH_ORBIT), 0);
  assert.equal(orbitOpen(384400, EARTH_ORBIT), 1);
  const mid = orbitOpen(10000, EARTH_ORBIT);
  assert.ok(mid > 0.3 && mid < 0.7);
});
