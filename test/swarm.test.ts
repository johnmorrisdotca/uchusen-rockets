// The swarm count follows the ship, and a drone stays outside the hull until the last move into its slot.
import assert from "node:assert/strict";
import test from "node:test";
import { buildOf, playFrame } from "../src/buildPlay.ts";
import { approachPath, berthRing, carries, grounded, pathClears, SWARM_CAP, swarmCount, swarmJobs, type HullBox } from "../src/swarm.ts";

const hull: HullBox = { min: [-69, 0, -40], max: [69, 380, 34] };
const slot: [number, number, number] = [0, 29, 0];

test("the count follows the ship and stays under the cap", () => {
  assert.equal(swarmCount("starship"), undefined);
  assert.equal(swarmCount("miyamoto"), 24);
  assert.equal(swarmCount("ariake"), 24);
  assert.equal(swarmCount("hanabusa"), 48);
  assert.equal(swarmCount("hanabusa-aft"), 48);
  assert.equal(swarmCount("fleet-kaminari"), 96);
  assert.equal(swarmCount("fleet-emiake"), 96);
  assert.equal(swarmCount("fleet-romaryu"), 96);
  assert.ok((swarmCount("fleet-kaminari") ?? 0) <= SWARM_CAP);
  assert.equal(SWARM_CAP, 100);
});

test("drones work only the steps that are underway, and they split across those steps", () => {
  const steps = buildOf("miyamoto");
  assert.ok(steps);
  assert.deepEqual(swarmJobs(steps, 24, 0).map((job) => job.slot), Array.from({ length: 24 }, () => "drive"));
  assert.equal(swarmJobs(steps, 24, 1).length, 0);
  const mid = playFrame(steps, 0.7);
  const jobs = swarmJobs(steps, 24, 0.7);
  assert.equal(jobs.length, 24);
  assert.ok(jobs.every((job) => mid.going.includes(job.slot)));
  assert.ok(new Set(jobs.map((job) => job.slot)).size === mid.going.length);
});

test("drones split between the work, the path and the berth, and a part waits for its mount", () => {
  const steps = buildOf("miyamoto");
  assert.ok(steps);
  const at = 100 / 1461;
  const jobs = swarmJobs(steps, 24, at);
  assert.ok(jobs.every((job) => job.slot === "drive"));
  const dock: [number, number, number] = [140, 190, 0];
  const flown = carries(jobs, at, steps, () => [0, 0, 0], dock);
  assert.equal(flown.length, 24);
  const work = flown.filter((one) => one.duty === "work");
  const transit = flown.filter((one) => one.duty === "transit");
  const berth = flown.filter((one) => one.duty === "berth");
  assert.equal(work.length, 3);
  assert.ok(transit.length >= 10);
  assert.ok(berth.length >= 4);
  const span = (axis: 0 | 1 | 2) => Math.max(...flown.map((one) => one.where[axis])) - Math.min(...flown.map((one) => one.where[axis]));
  assert.ok(span(0) > 30);
  assert.ok(span(1) > 80);
  assert.ok(span(2) > 20);
  assert.ok(work.every((one) => {
    const dx = one.where[0] - one.part[0];
    const dy = one.where[1] - one.part[1];
    const dz = one.where[2] - one.part[2];
    const distance = Math.hypot(dx, dy, dz);
    return distance > 8 && distance < 28;
  }));
  assert.ok(work.every((one) => one.part[0] > 40 && one.part[0] < 100));
  assert.equal(carries(swarmJobs(steps, 24, 1), 1, steps, () => [0, 0, 0], dock).length, 0);
  const parked = berthRing(24, dock);
  assert.equal(parked.length, 24);
  assert.ok(Math.max(...parked.map((p) => p[0])) - Math.min(...parked.map((p) => p[0])) > 20);
  const day = 0.4791;
  const frame = playFrame(steps, day);
  assert.equal(grounded("radiators-dorsal", frame.done), false);
  assert.equal(grounded("radiators-ventral", frame.done), false);
  assert.equal(grounded("fuel-fore", frame.done), true);
  assert.equal(grounded("habitat", ["drive", "engineering", "fuel-aft", "fuel-fore"]), true);
});

test("the path stays outside the hull until the last leg, and each drone has its own berth", () => {
  const one = approachPath(0, 24, slot, hull);
  const two = approachPath(1, 24, slot, hull);
  assert.equal(one.length, 4);
  assert.deepEqual(one[3], slot);
  assert.ok(pathClears(one, hull));
  assert.notDeepEqual(one[0], two[0]);
  assert.ok((one[0]?.[0] ?? 0) > hull.max[0]);
  const steps = buildOf("miyamoto");
  assert.ok(steps);
  for (const at of [0, 0.25, 0.5, 0.75]) {
    for (const job of swarmJobs(steps, 24, at)) {
      const path = approachPath(job.drone, 24, slot, hull);
      assert.ok(pathClears(path, hull));
    }
  }
});
