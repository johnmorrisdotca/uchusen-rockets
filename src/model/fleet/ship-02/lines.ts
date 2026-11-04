// The propellant plumbing, in ship coordinates: from each tank's tail pole a trunk and a return line run out beneath the tank, round the outside of the shadow shield and down to the drive raft's bulkhead,
// and crossover lines tie the four tanks together at three heights, so any tank can feed any engine and the ship's trim can be held by moving propellant. Valve houses, flange pairs and clamps all the way.
import { beam, box, pipe, ring, span, type Piece } from "./adapter.ts";
import { STATION, TANK } from "./dims.ts";

const T0 = STATION.tank.y;
const DROP = 337;

/** A pipe with flange rings every `pitch` metres and a valve house at each of `valves`. */
function run(a: [number, number, number], b: [number, number, number], r: number, material: "coolant" | "hull-orange" | "hull-white", pitch = 18, valves: readonly number[] = []): Piece[] {
  const out: Piece[] = [pipe(material, a, b, r, 10)];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  for (let d = pitch / 2; d < len; d += pitch) {
    const t = d / len;
    const p: [number, number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    out.push(box("engine-metal", p, [r * 2.7, r * 2.7, r * 2.7]));
  }
  for (const t of valves) {
    const p: [number, number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    out.push(box("dark", p, [r * 4, r * 4, r * 4]), box("hull-yellow", [p[0], p[1], p[2] + r * 2.6], [r * 1.6, r * 1.6, r * 1.2]), box("hull-orange", [p[0], p[1] + r * 2.6, p[2]], [r * 1.2, r * 1.2, r * 1.6]));
  }
  return out;
}

export function linesPieces(): Piece[] {
  const out: Piece[] = [];
  const o = TANK.offset;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    // from the tail pole, down to the collector height, out to the trunk column, down to the raft
    const trunk: [number, number, number] = [sx * 168, 0, sz * 40];
    out.push(...run([sx * o, T0 - 1, sz * o], [sx * o, DROP, sz * o], 3.6, "coolant", 12, [0.5]));
    out.push(...run([sx * o, DROP, sz * o], [trunk[0], DROP, trunk[2]], 3.6, "coolant", 14, [0.35, 0.8]));
    out.push(...run([trunk[0], DROP, trunk[2]], [trunk[0], 176, trunk[2]], 3.6, "coolant", 16, [0.2, 0.55, 0.85]));
    out.push(...run([sx * (o + 8), T0 - 1, sz * (o + 8)], [sx * (o + 8), DROP + 4, sz * (o + 8)], 2.2, "hull-orange", 12));
    out.push(...run([sx * (o + 8), DROP + 4, sz * (o + 8)], [trunk[0] + sx * 8, DROP + 4, trunk[2] + sz * 8], 2.2, "hull-orange", 14));
    out.push(...run([trunk[0] + sx * 8, DROP + 4, trunk[2] + sz * 8], [trunk[0] + sx * 8, 176, trunk[2] + sz * 8], 2.2, "hull-orange", 16));
    // brackets: a post from the shield's rim out to the trunk at three heights
    for (const y of [190, 230, 270, 310]) out.push(beam("hull-grey", [sx * 140, y, sz * 36], [trunk[0] - sx * 4, y, trunk[2]], 3, 3));
    // the feed header where it meets the raft: a fat distribution box, and a ring of pipes to each side
    out.push(box("dark", [trunk[0], 178, trunk[2]], [18, 8, 14]), box("hull-orange", [trunk[0], 183, trunk[2]], [14, 2, 10]), ring("copper", [trunk[0], trunk[2]], 3.6, 5.2, 176, 180, 10));
  }
  // crossovers between neighbouring tanks: across the gap above the spine (x), and through the gap between dorsal and ventral tanks (z), at three heights each
  for (const y of [T0 + 90, T0 + 220, T0 + 350]) {
    for (const sz of [-1, 1]) out.push(...run([-o + TANK.radius - 1, y, sz * o], [o - TANK.radius + 1, y, sz * o], 2.6, "hull-white", 14, [0.5]));
    for (const sx of [-1, 1]) out.push(...run([sx * o, y, TANK.radius - 1 + 0], [sx * o, y, -TANK.radius + 1], 2.6, "hull-orange", 14, [0.5]));
    out.push(box("dark", [0, y, 0], [1, 1, 1]));
  }
  // a collector ring round the spine under the tanks, joining the four trunks
  out.push(ring("coolant", [0, 0], 22, 25.4, DROP - 6, DROP - 2, 24), ring("hull-yellow", [0, 0], 25.4, 26.4, DROP - 5, DROP - 3, 24));
  out.push(span("dark", -26, 26, DROP - 8, DROP - 6, -26, 26));
  return out;
}
