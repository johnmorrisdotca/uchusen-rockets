// The swarm count follows the ship, and a drone stays outside the hull until the last move into its slot.
import assert from "node:assert/strict";
import test from "node:test";
import { assemblyOf, buildOf, PHASE_SHARE, playFrame, SHOP_LIMIT_M, stepPhase } from "../src/buildPlay.ts";
import { sparkAt } from "../src/element/swarm.ts";
import { approachPath, berthRing, carries, grounded, pathClears, rankOf, SWARM_CAP, swarmCount, swarmJobs, type HullBox } from "../src/swarm.ts";

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

test("most of the crew is at work, on every side, and a part waits for its mount", () => {
  const steps = buildOf("miyamoto");
  assert.ok(steps);
  const at = 100 / 1461;
  const jobs = swarmJobs(steps, 24, at);
  assert.ok(jobs.every((job) => job.slot === "drive"));
  const dock: [number, number, number] = [140, 190, 0];
  const flown = carries(jobs, at, steps, () => [0, 0, 0], dock);
  assert.equal(flown.length, 24);
  const work = flown.filter((one) => one.duty === "work" || one.duty === "transit");
  assert.ok(work.length / flown.length >= 0.7);
  const quadrants = new Set(flown.filter((one) => one.duty === "work").map((one) => {
    const turn = Math.atan2(one.where[2] - one.part[2], one.where[0] - one.part[0]);
    return Math.floor(((turn + Math.PI) / (Math.PI / 2)) % 4);
  }));
  assert.equal(quadrants.size, 4);
  assert.ok(flown.some((one) => one.duty === "berth" && one.task === "charge"));
  assert.ok(flown.filter((one) => one.rank === "boss").length === 1);
  assert.ok(flown.filter((one) => one.rank === "manager").length >= 1);
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

test("a step is mostly assembly, the shop carries only a small part, and nothing finished appears at once", () => {
  const share = Object.values(PHASE_SHARE).reduce((sum, one) => sum + one, 0);
  assert.ok(Math.abs(share - 1) < 1e-9);
  assert.ok(PHASE_SHARE.bring < 0.15);
  const step = { slot: "ring-garden", start: 0, days: 100 };
  assert.equal(stepPhase(step, 4)?.phase, "bring");
  assert.equal(assemblyOf(step, 4, SHOP_LIMIT_M).carried, true);
  assert.equal(assemblyOf(step, 4, SHOP_LIMIT_M + 1).carried, false);
  let seen = false;
  for (let day = 0; day <= 100; day += 1) {
    const now = assemblyOf(step, day, 80);
    if (now.grown <= 0) continue;
    if (!seen) {
      seen = true;
      assert.ok(now.grown < 1, "the first visible moment is still being built");
      assert.equal(now.carried, false);
    }
  }
  assert.ok(seen);
  const half = assemblyOf(step, 20, 140);
  assert.ok(half.grown > 0.1 && half.grown < 1, "a half-built ring is an open arc");
});

test("the ranks are one boss, a manager for a handful, and builders and grunts about equally", () => {
  const ranks = Array.from({ length: 24 }, (_, drone) => rankOf(drone, 24));
  assert.equal(ranks.filter((rank) => rank === "boss").length, 1);
  const managers = ranks.filter((rank) => rank === "manager").length;
  assert.ok(managers >= Math.floor(24 / 8) && managers <= Math.floor(24 / 6));
  const builders = ranks.filter((rank) => rank === "builder").length;
  const grunts = ranks.filter((rank) => rank === "grunt").length;
  assert.ok(Math.abs(builders - grunts) <= 1);
});

test("a weld spark flies straight out and is not pulled down", () => {
  assert.deepEqual(sparkAt(2, 0), [0, 0, 0]);
  const near = sparkAt(2, 0.3);
  const far = sparkAt(2, 0.6);
  assert.ok(Math.hypot(...near) > 0);
  for (const axis of [0, 1, 2] as const) assert.ok(Math.abs(far[axis] - near[axis] * 2) < 1e-9, String(axis));
  const wrapped = sparkAt(2, 20);
  assert.ok(Math.hypot(...wrapped) < 2.21);
});
