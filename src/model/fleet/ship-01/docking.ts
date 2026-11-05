// Hanabusa's docking plan, outside the hull as at a space station and all of it on the still keel, never on a turning ring. The ports and berths are DATA first (`PORTS`: name, collar class, position, direction, who may use it, the services
// and the walkway), and the pieces are drawn from that data. The hub node keeps four L-class ports for short visits and the inflatable modules; the docking crown at the bow has three arms with long-stay ports of two collar classes (S and M); and
// a berth along the keel takes the upper stage of a Starship. Every long-stay berth has a hard-dock collar or a clamp, service umbilicals (power, coolant, water, air, data) and a pressurised walkway to the keel's lift, so a parked ship can be
// shut down and its crew can live aboard. The bow dust shield stands ahead of the crown, so what is parked sits in its shadow. The berths are shown empty: the visiting craft are drawn only in the sheets, from the package's own models. Pure: no three.js and no DOM.
import { box, collar, cub, discZ, hoop, ibeam, KIT, pipeRun, place, rod, roundStrut, tileShield, type Piece } from "./adapter.ts";
import { SPINE_Y } from "./hull.ts";
import { SPIN } from "./spin.ts";

/** What a port or berth is: the plain, typed record the shared docking feature reads. Positions and directions are in ship metres (X across, Y from the tail along the keel, Z up); `dir` is the way a visiting craft's nose points when it is docked. */
export interface DockPort {
  id: string;
  name: string;
  kind: "port" | "berth";
  /** The kit's collar class of its hard-dock ring (S 3 m, M 6 m, L 12 m). */
  collar: "S" | "M" | "L";
  /** Where the ring's face is, and the direction a docked craft's nose points (a unit vector). */
  at: readonly [number, number, number];
  dir: readonly [number, number, number];
  /** What it stands on: always a part that does not turn. */
  mount: string;
  /** The craft that may use it. */
  allows: readonly string[];
  /** Whether a craft may stay for the whole journey (shut down, on umbilicals), and the services it has. */
  longStay: boolean;
  services: readonly string[];
  /** Whether a pressurised walkway runs from it to the keel's lift. */
  walkway: boolean;
  /** The size of the biggest craft it takes: radius and length along `dir`, metres. */
  craft: { radius: number; length: number };
}

const SERVICES = ["power", "coolant", "water", "air", "data"] as const;

export const DOCK = {
  /** The height of the crown's port faces up the keel, metres from the tail: they look down the keel (-Y), so a craft docks from below, nose up. */
  face: SPINE_Y.solarium + 4,
  /** Radial distance of each crown port's axis from the keel's axis. */
  reach: 16,
  /** The Starship berth: the upper stage (52 m by 9 m) alongside the keel on the +Z side, its tail at `y0`, its axis `z` from the keel's. */
  berth: { y0: 520, z: 14, length: 52.1, radius: 4.5, flaps: 8.1 },
  /** The bow dust shield: a dished disc of tile ahead of the dome, on stays. */
  shield: { y0: SPINE_Y.end, radius: 24, depth: 6, stay: 16 },
} as const;

/** Every port and berth of the ship. */
export const PORTS: readonly DockPort[] = [
  ...KIT["node-four"].ports.map((p, i): DockPort => ({ id: `hub-${i + 1}`, name: `Hub node port ${i + 1}`, kind: "port", collar: "L", at: [p.at[0], SPINE_Y.node + p.at[1], p.at[2]], dir: [0, 1, 0], mount: "node", allows: ["inflatable habitat module, stowed", "SPX ATC small craft", "a small visiting craft for a short call"], longStay: false, services: [], walkway: false, craft: { radius: 2.2, length: 9 } })),
  { id: "crew-s", name: "Crew port, S-class", kind: "port", collar: "S", at: [DOCK.reach, DOCK.face, 0], dir: [0, 1, 0], mount: "solarium", allows: ["Dragon", "Starliner", "Orion with its adapter"], longStay: true, services: SERVICES, walkway: true, craft: { radius: 2.6, length: 8.3 } },
  { id: "visitor-s", name: "Visitor port, S-class", kind: "port", collar: "S", at: [0, DOCK.face, -DOCK.reach], dir: [0, 1, 0], mount: "solarium", allows: ["Soyuz", "Progress"], longStay: true, services: SERVICES, walkway: true, craft: { radius: 4.2, length: 7.5 } },
  { id: "berth-m", name: "Small-craft berth, M-class, with a cradle", kind: "berth", collar: "M", at: [-DOCK.reach, DOCK.face, 0], dir: [0, 1, 0], mount: "solarium", allows: ["SPX ATC small craft", "HTV-X"], longStay: true, services: SERVICES, walkway: true, craft: { radius: 3.8, length: 12 } },
  { id: "starship", name: "Starship upper-stage berth", kind: "berth", collar: "M", at: [0, DOCK.berth.y0 + DOCK.berth.length * 0.45, DOCK.berth.z - DOCK.berth.radius - 1.2], dir: [0, 1, 0], mount: "common-area, lab, survey-pod and solarium", allows: ["Starship upper stage (52 m by 9 m)"], longStay: true, services: SERVICES, walkway: true, craft: { radius: DOCK.berth.radius + 1, length: DOCK.berth.length } },
];

/** What turns, as boxes in (radius, height) from the keel's axis: the booms' sweep, each ring with its skirt and hub, and the industrial wheel. */
export const TURNING: readonly { name: string; r0: number; r1: number; y0: number; y1: number }[] = [
  { name: "booms", r0: 16.5, r1: 26.5, y0: 90, y1: 100 + 17 * 24 },
  { name: "industrial wheel", r0: 15.5, r1: SPIN.industrial.rOut + 2, y0: SPIN.industrial.y - 11, y1: SPIN.industrial.y + 11 },
  ...SPIN.close.ys.map((y) => ({ name: `ring at ${y} m`, r0: 15.5, r1: 77.5, y0: y - 13, y1: y + 13 })),
];

/** The gap in metres between a craft or fitting (the radial and height range it fills) and the nearest turning part: positive when they are apart. */
export function gapTo(r0: number, r1: number, y0: number, y1: number): { gap: number; name: string } {
  let best = { gap: Infinity, name: "" };
  for (const t of TURNING) {
    const gap = Math.max(t.r0 - r1, r0 - t.r1, t.y0 - y1, y0 - t.y1);
    if (gap < best.gap) best = { gap, name: t.name };
  }
  return best;
}

/** The radial and height range a port's visiting craft fills: from the ring's face along `dir`, out to the craft's radius round the port's own distance from the axis. */
export function craftBox(port: DockPort): { r0: number; r1: number; y0: number; y1: number } {
  const rp = Math.hypot(port.at[0], port.at[2]);
  const y = port.at[1];
  const [a, b] = port.dir[1] > 0 ? [y, y + port.craft.length] : [y - port.craft.length, y];
  // a crown port's craft hangs below its ring (the ring looks down), and a berth's craft stands along the keel
  const below = port.id === "starship" ? [DOCK.berth.y0, DOCK.berth.y0 + DOCK.berth.length] : port.id.startsWith("hub") ? [a, b] : [y - port.craft.length, y];
  return { r0: Math.max(0, rp - port.craft.radius), r1: rp + port.craft.radius, y0: below[0], y1: below[1] };
}

const tube = (a: [number, number, number], b: [number, number, number], r: number): Piece[] => [rod("hull-white", a, b, r, 14, { only: "mesh" }), rod("hull-grey-dark", a, b, r + 0.18, 6, { only: "mesh" }), ...[a, b].map((p) => rod("hull-grey", [p[0] - (b[0] - a[0]) * 0.001, p[1], p[2]], p, r + 0.35, 14, { only: "mesh" }))];

/** The pieces of the crown, the berth and the shield, in ship metres. */
export function dockingPieces(): Piece[] {
  const y = DOCK.face;
  const out: Piece[] = [];
  const crown = PORTS.filter((p) => p.mount === "solarium");
  for (const port of crown) {
    const [x, , z] = port.at;
    const d: [number, number] = [x / DOCK.reach, z / DOCK.reach];
    const at = (r: number, yy: number): [number, number, number] => [d[0] * r, yy, d[1] * r];
    for (const dy of [-3.2, 3.2]) out.push(...ibeam("hull-grey", at(7.5, y + dy), at(DOCK.reach, y + dy), 1.0, 0.7, [0, 0, 1]));
    out.push(...roundStrut("hull-grey", at(7.8, y - 3.2), at(DOCK.reach - 1.2, y + 0.4), 0.22), ...roundStrut("hull-grey", at(7.8, y + 3.2), at(DOCK.reach - 1.2, y + 0.4), 0.22));
    out.push(...place(collar(port.collar as "S" | "M", 0, -1), { at: [x, y, z] }));
    const w = port.collar === "S" ? 4.2 : 7.4;
    out.push(box("hull-white", [x, y, z], w, w, 2.2, 0, { only: "mesh", plain: true }));
    // the five services run down the arm in a bundle: power, coolant, water, air and data
    ["copper", "coolant", "hull-blue", "hull-white", "lamp-blue"].forEach((m, i) => out.push(rod(m as "copper", at(8.4, y + 1.0 + i * 0.28), at(DOCK.reach, y + 1.0 + i * 0.28), 0.1, 8, { only: "mesh" })));
    // the pressurised walkway: a tube from the port's housing along the arm to a lock ring on the solarium's hull, with a flange and a lit hatch at each end
    out.push(...tube(at(DOCK.reach - 1.8, y + 0.2), at(8.6, y + 0.2), 1.0), box("lamp-amber", at(8.9, y + 0.2), 0.5, 0.5, 0.4, 0, { only: "mesh", plain: true }));
  }
  // the small-craft cradle under the M port: guide rails either side of the empty bay, three cross-sleepers with clamp arms, and hazard chocks
  const mx = -DOCK.reach;
  for (const dx of [-3.2, 3.2]) out.push(cub("hull-yellow", [mx + dx - 0.15, mx + dx + 0.15], [y - 12, y - 0.2], [-0.15, 0.15]));
  for (const dy of [-2.4, -6, -9.6]) out.push(cub("hull-grey-dark", [mx - 3.9, mx + 3.9], [y + dy - 0.2, y + dy + 0.2], [-0.4, 0.4]), ...[-1, 1].map((s) => cub("hull-grey", [mx + s * 3.9 - 0.25, mx + s * 3.9 + 0.25], [y + dy - 1, y + dy + 1], [-0.25, 0.25])));
  out.push(cub("hazard", [mx - 4, mx + 4], [y - 12.4, y - 12], [-0.5, 0.5]));
  // the Starship berth, empty: three saddles that wrap the keel side of the stage, each on a pair of I-beam stays back to the keel, a clamp bar, a hard-dock collar (M-class) with a seal on the middle stay, the umbilical bundle and the walkway
  const b = DOCK.berth;
  const keelR = (yy: number): number => (yy < SPINE_Y["lab"] ? 5.6 : yy < SPINE_Y["solarium"] ? 7 : 8.6);
  for (const k of [0.1, 0.45, 0.8]) {
    const yy = b.y0 + b.length * k;
    out.push(hoop("hull-grey-dark", b.radius + 0.35, yy, 0.3, 48, 8, { at: [0, b.z], arc: () => [Math.PI - 1.15, Math.PI + 1.15] }), hoop("hazard", b.radius + 0.35, yy + 0.7, 0.14, 48, 6, { at: [0, b.z], arc: () => [Math.PI - 1.15, Math.PI + 1.15] }));
    for (const dx of [-1.8, 1.8]) out.push(...ibeam("hull-grey", [dx, yy, b.z - b.radius - 0.3], [dx * 0.6, yy, keelR(yy)], 0.9, 0.6, [1, 0, 0]));
    out.push(cub("hull-orange", [-2.4, 2.4], [yy - 0.2, yy + 0.2], [b.z - b.radius - 0.7, b.z - b.radius - 0.4]));
  }
  const mid = b.y0 + b.length * 0.45;
  out.push(discZ("hull-grey", 0, mid, b.z - b.radius - 1.2, b.z - b.radius - 0.55, 1.8, 24, { only: "mesh" }), discZ("hull-grey-dark", 0, mid, b.z - b.radius - 0.8, b.z - b.radius - 0.4, 1.2, 24, { only: "mesh" }), discZ("lamp-amber", 0, mid, b.z - b.radius - 0.45, b.z - b.radius - 0.35, 0.3, 12, { only: "mesh" }));
  [0, 1, 2, 3, 4].forEach((i) => out.push(...pipeRun("pipe-steel", [[1 + i * 0.5, b.y0 + 8 + i * 0.4, keelR(b.y0 + 8)], [1 + i * 0.5, b.y0 + 8 + i * 0.4, keelR(b.y0 + 8) + 2], [1.4 + i * 0.5, b.y0 + 2 + i * 0.4, b.z - b.radius - 0.2]], 0.1, { clampEvery: 3 })));
  out.push(...tube([0, mid, b.z - b.radius - 1.2], [0, mid, keelR(mid) + 0.2], 1.0), box("lamp-amber", [0, mid, keelR(mid) + 0.5], 0.5, 0.5, 0.4, 0, { only: "mesh", plain: true }));
  out.push(cub("hazard", [-3, 3], [b.y0 - 0.5, b.y0], [b.z - 0.5, b.z + 0.5]));
  // the bow dust shield: a dished disc of tile on a ring of stays from the dome, so the whole crown and the berth sit in its shadow
  const s = DOCK.shield;
  out.push(...place(tileShield([[s.radius, 0], [s.radius * 0.8, 1.6], [s.radius * 0.5, 3.4], [s.radius * 0.2, 5], [0.5, s.depth]], "bow-shield", 64, 32), { at: [0, s.y0 + s.stay, 0] }), hoop("hull-grey-dark", s.radius, s.y0 + s.stay, 0.8, 64, 10));
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI / 4) * k;
    out.push(...ibeam("hull-grey-dark", [4.2 * Math.sin(a), s.y0, 4.2 * Math.cos(a)], [s.radius * Math.sin(a), s.y0 + s.stay, s.radius * Math.cos(a)], 1.2, 0.7, [0, 1, 0]));
  }
  return out;
}

/** The nearest approach to anything that turns, in metres, over every long-stay port and the berth with its craft in place, and the greatest reach from the keel's axis. */
export function clearance(): { lowest: number; toBooms: number; toRing: number; reach: number; berthReach: number; worst: number } {
  const crafts = PORTS.filter((p) => p.longStay).map((p) => ({ port: p, box: craftBox(p) }));
  const lowest = Math.min(...crafts.map((c) => c.box.y0));
  const worst = Math.min(...crafts.map((c) => gapTo(c.box.r0, c.box.r1, c.box.y0, c.box.y1).gap));
  return { lowest, toBooms: lowest - (100 + 17 * 24), toRing: lowest - (SPIN.close.ys[2] + 13), reach: Math.max(...crafts.filter((c) => c.port.id !== "starship").map((c) => c.box.r1)), berthReach: DOCK.berth.z + DOCK.berth.radius, worst };
}
