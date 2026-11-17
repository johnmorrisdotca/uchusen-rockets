// The docking scene: two Miyamoto-class ships berthed at Kaminari's dock with the small craft flying between them, all from the ships' own tables.
import assert from "node:assert/strict";
import test from "node:test";
import { ATC, ATC_IDS, spareOf } from "../src/model/fleet/craft/index.ts";
import { doorOf, ENVELOPE } from "../src/model/fleet/ship-03/dims.ts";
import { EXIT_RUN, LANE_CLEAR, MOORING_GAP, SHIPS, TRIPS, doorOfShip, laneHeight, laneOf, tripAt } from "../src/model/fleet/scene.ts";
import { kaminariBoxes, miyamotoBoxes, sceneTop, type Box } from "../src/model/fleet/sceneBounds.ts";

const kaminari = kaminariBoxes();
const hulls = miyamotoBoxes();
const doors = SHIPS.map(doorOfShip);
const span = { x: [Math.min(...hulls.map((b) => b.min[0])), Math.max(...hulls.map((b) => b.max[0]))] as const, y: [Math.min(...doors.map((d) => d.y[0])), Math.max(...doors.map((d) => d.y[1]))] as const };
const top = sceneTop([...kaminari, ...hulls], span);

const inside = (p: readonly number[], b: Box, pad: number) => [0, 1, 2].every((a) => p[a] >= b.min[a] - pad && p[a] <= b.max[a] + pad);

test("two Miyamoto ships stand one each side of Kaminari's dock, at true size, clear of every part of it", () => {
  assert.equal(SHIPS.length, 2);
  assert.deepEqual(SHIPS.map((s) => s.at[0] > 0), [true, false]);
  for (const hull of hulls) {
    assert.equal(Math.round(hull.max[1] - hull.min[1]), ENVELOPE.length, "a Miyamoto is 380 m");
    assert.equal(Math.round(hull.max[0] - hull.min[0]), ENVELOPE.beam);
    for (const part of kaminari) {
      const apart = [0, 1, 2].some((a) => hull.max[a] < part.min[a] || hull.min[a] > part.max[a]);
      assert.ok(apart, `${hull.name} meets Kaminari's ${part.name}`);
    }
  }
  const dock = kaminari.find((b) => b.name === "dock");
  assert.ok(dock);
  const gap = Math.min(...hulls.map((h) => (h.min[0] > 0 ? h.min[0] - dock.max[0] : dock.min[0] - h.max[0])));
  assert.ok(gap >= MOORING_GAP * 0.9, `${gap} m between the dock and a hull`);
});

test("the doors are the ships' own bays: a survey bay facing Kaminari on the starboard ship, a rescue bay on the port ship, each opening towards it", () => {
  const [a, b] = doors;
  assert.deepEqual([a.wide, a.high], [doorOf("port-fore").wide, doorOf("port-fore").high]);
  assert.deepEqual([b.wide, b.high], [doorOf("starboard-aft").wide, doorOf("starboard-aft").high]);
  assert.ok(a.out[0] === -1 && b.out[0] === 1, "each door opens towards the dock");
  assert.ok(a.at[0] > 0 && a.at[0] - hulls[0].min[0] === 0, "the starboard ship's door is on the wall that faces Kaminari");
  assert.ok(b.at[0] < 0 && hulls[1].max[0] - b.at[0] === 0);
});

test("six craft, one trip each, every craft fits both doors with the metre to spare, and there is room to fly out straight", () => {
  assert.deepEqual(TRIPS.map((t) => t.craft).sort(), [...ATC_IDS].sort());
  assert.equal(new Set(TRIPS.map((t) => t.lift)).size, TRIPS.length, "no two lanes at one height");
  for (const trip of TRIPS) {
    const craft = ATC[trip.craft];
    assert.ok(craft);
    for (const door of doors) assert.ok(spareOf(craft.envelope, door) >= 0, `${trip.craft} does not fit ${door.wide} by ${door.high}`);
    assert.ok(EXIT_RUN >= craft.envelope.long, `${trip.craft} is ${craft.envelope.long} m long and flies ${EXIT_RUN} m out straight`);
  }
  assert.equal(new Set(TRIPS.map((t) => t.from)).size, 2, "craft leave both ships");
});

test("each lane leaves one door and enters the other, stays clear of both hulls and every part of Kaminari, and rises only after the straight run out", () => {
  for (const trip of TRIPS) {
    const craft = ATC[trip.craft];
    assert.ok(craft);
    const lane = laneOf(trip, top);
    const [a, b] = [doorOfShip(SHIPS.find((s) => s.id === trip.from)!), doorOfShip(SHIPS.find((s) => s.id === trip.to)!)];
    assert.deepEqual(lane[0], [...a.at]);
    assert.deepEqual(lane[lane.length - 1], [...b.at]);
    assert.ok(lane[0][0] !== lane[1][0] && lane[0][1] === lane[1][1] && lane[0][2] === lane[1][2], "straight out of the door");
    assert.ok(Math.abs(lane[1][0] - lane[0][0]) === EXIT_RUN);
    const half = Math.max(craft.envelope.across, craft.envelope.deep, craft.envelope.long) / 2;
    for (let i = 0; i < lane.length - 1; i++) {
      for (let k = 0; k <= 80; k++) {
        const p = [0, 1, 2].map((c) => lane[i][c] + ((lane[i + 1][c] - lane[i][c]) * k) / 80);
        // a craft is allowed in its own door's mouth: the first and last metres of the lane
        const nearDoor = [a.at, b.at].some((d) => Math.hypot(p[0] - d[0], p[1] - d[1], p[2] - d[2]) <= EXIT_RUN + 1e-6);
        if (nearDoor) continue;
        for (const box of [...kaminari, ...hulls]) assert.ok(!inside(p, box, half + LANE_CLEAR / 2), `${trip.craft} at ${p.map(Math.round)} is in ${box.name}`);
      }
    }
    assert.ok(laneHeight(top, trip) >= top + 10, "the lane crosses above the tallest thing it passes");
    assert.ok(LANE_CLEAR >= 10);
  }
});

test("a trip is a pure function of time: periodic, at its doors while it holds, continuous, and turned the way it goes", () => {
  for (const trip of TRIPS) {
    const lane = laneOf(trip, top);
    const a = tripAt(trip, top, 0);
    const again = tripAt(trip, top, trip.period);
    assert.deepEqual(a.at.map((n) => Number(n.toFixed(6))), again.at.map((n) => Number(n.toFixed(6))));
    assert.equal(JSON.stringify(tripAt(trip, top, 12.5)), JSON.stringify(tripAt(trip, top, 12.5)));
    let prev = tripAt(trip, top, 0);
    let travelled = 0;
    const legs = new Set<string>();
    for (let t = 0.25; t <= trip.period; t += 0.25) {
      const now = tripAt(trip, top, t);
      const step = Math.hypot(now.at[0] - prev.at[0], now.at[1] - prev.at[1], now.at[2] - prev.at[2]);
      assert.ok(step < 60, `${trip.craft} jumps ${step} m in a quarter second`);
      travelled += step;
      legs.add(now.leg);
      assert.ok(Math.abs(Math.hypot(...now.heading) - 1) < 1e-9, "a unit heading");
      prev = now;
    }
    assert.deepEqual([...legs].sort(), ["back", "docked", "out"]);
    const length = lane.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - lane[i][0], p[1] - lane[i][1], p[2] - lane[i][2]), 0);
    assert.ok(travelled > 1.9 * length && travelled < 2.1 * length, `${trip.craft} flies there and back: ${travelled} of ${2 * length}`);
  }
});
