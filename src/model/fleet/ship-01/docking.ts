// Hanabusa's docking plan, outside the hull as at a space station and all of it on the still keel, never on a turning ring. The ports and berths are DATA first (`PORTS`: name, collar class, position, direction, who may use it, the services
// and the walkway), and the pieces are drawn from that data. The hub node keeps four L-class ports for short visits and the inflatable modules; the docking crown at the bow has three arms with long-stay ports of two collar classes (S and M); and
// a berth along the keel takes the upper stage of a Starship. Every long-stay berth has a hard-dock collar or a clamp, service umbilicals (power, coolant, water, air, data) and a pressurised walkway to the keel's lift, so a parked ship can be
// shut down and its crew can live aboard. The bow dust shield stands ahead of the crown, so what is parked sits in its shadow. The berths are shown empty: the visiting craft are drawn only in the sheets, from the package's own models. Pure: no three.js and no DOM.
import { lightPool } from "../lights.ts";
import { box, collar, cub, discZ, hoop, ibeam, KIT, pipeRun, place, rod, roundStrut, stamp, type Lathe, type MaterialName, type Piece, type Pose } from "./adapter.ts";
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

/** The shield's three plates, front to rear: the radius of each, its thickness and where its rim stands above the shield's base, with the sag the dish rises by at its centre. */
export const SHIELD_PLATES = [
  { material: "tile", radius: DOCK.shield.radius, t: 0.7, off: 3.2 },
  { material: "kapton", radius: DOCK.shield.radius - 0.6, t: 0.4, off: 1.6 },
  { material: "hull-grey", radius: DOCK.shield.radius - 1.2, t: 0.5, off: 0 },
] as const;
export const SHIELD_SAG = 4.8;
/** Where plate `i` (0 the front, 2 the rear wall) has its front face and its back face at radius `r` from the axis, in ship metres. */
export function shieldPlateAt(i: number, r: number): { front: number; back: number } {
  const plate = SHIELD_PLATES[i];
  const front = DOCK.shield.y0 + DOCK.shield.stay + plate.off + SHIELD_SAG * (1 - (r / plate.radius) ** 2);
  return { front, back: front - plate.t };
}
/** The eight stays hold the stack from the keel side: each runs from the dome to a pad under the rear wall and stops 0.8 m short of the wall's back face (the beam is 1.2 m deep), so no stay reaches the plates. */
export function shieldStays(): { from: [number, number, number]; to: [number, number, number] }[] {
  const re = 12;
  const yEnd = shieldPlateAt(2, re + 0.8).back - 0.8;
  return Array.from({ length: 8 }, (_, k) => {
    const a = (Math.PI / 4) * k;
    return { from: [4.2 * Math.sin(a), DOCK.shield.y0, 4.2 * Math.cos(a)], to: [re * Math.sin(a), yEnd, re * Math.cos(a)] };
  });
}

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

/** A solid dished plate facing +Y, `r` in radius, the centre `sag` higher than the rim and `t` thick, its top at `y` at the rim: a closed shell, not a surface. */
const dish = (material: MaterialName, r: number, sag: number, t: number, y: number, segs = 64): Lathe => {
  const top = Array.from({ length: 13 }, (_, i) => [(r * i) / 12 || 0.001, y + sag * (1 - (i / 12) ** 2)] as [number, number]);
  const bottom = [...top].reverse().map(([x, yy]) => [x, yy - t] as [number, number]);
  return { kind: "lathe", material, segs, body: true, outline: true, profile: [...top, ...bottom] };
};

/** The docking mechanism of one port, facing down the keel (-Y) from the ring's face at the origin, as the IDSS and NDS rings look: a capture ring with its lead-in cone and three guide petals, a ring of latch hooks, approach lights and a target cross, and a panel of umbilical connectors. `s` is 1 for the S class and 2 for the M. */
export function dockingHardware(s: number): Piece[] {
  const R = 1.5 * s;
  const out: Piece[] = [];
  // the capture ring: a soft-capture ring on three arms, with a conical lead-in below it
  out.push(hoop("hull-grey", R * 0.92, -0.45 * s, 0.14 * s, 48, 10), hoop("hull-grey-dark", R * 0.92, -0.78 * s, 0.1 * s, 48, 8));
  out.push({ kind: "lathe", material: "hull-white", segs: 36, only: "mesh", profile: [[R * 0.6, -0.1 * s], [R * 0.95, -0.7 * s]] } as Lathe);
  for (let k = 0; k < 3; k++) {
    const a = (2 * Math.PI * k) / 3;
    out.push(...roundStrut("hull-grey", [R * 0.92 * Math.sin(a), -0.45 * s, R * 0.92 * Math.cos(a)], [R * 0.5 * Math.sin(a), -0.05 * s, R * 0.5 * Math.cos(a)], 0.06 * s));
    // a guide petal: a triangular plate standing below the ring
    out.push(box("hull-white", [R * 1.0 * Math.sin(a + 0.52), -1.15 * s, R * 1.0 * Math.cos(a + 0.52)], 0.5 * s, 0.1 * s, 0.7 * s, (a + 0.52) * 180 / Math.PI, { only: "mesh", plain: true }));
  }
  // twelve latch hooks round the flange, each a pair of blocks and a hook
  const hook: Piece[] = [box("hull-grey-dark", [0, -0.12 * s, R * 0.8], 0.28 * s, 0.22 * s, 0.14 * s, 0, { only: "mesh", plain: true }), box("hazard", [0, -0.3 * s, R * 0.8], 0.12 * s, 0.1 * s, 0.18 * s, 0, { only: "mesh", plain: true })];
  const poses: Pose[] = Array.from({ length: 12 }, (_, i) => ({ at: [0, 0, 0] as [number, number, number], yaw: 30 * i }));
  out.push(...stamp(hook, poses));
  // approach lights (a red, a green and two floods), a white flash, a slow red beacon and a white stern light, and a target cross on a short mast at the rim
  const lights: [number, MaterialName][] = [[0, "nav-red"], [90, "nav-green"], [180, "flood"], [270, "flood"], [45, "strobe"], [225, "nav-white"]];
  for (const [deg, m] of lights) out.push(box(m, [R * 1.12 * Math.sin((deg * Math.PI) / 180), -0.25 * s, R * 1.12 * Math.cos((deg * Math.PI) / 180)], 0.45 * s, 0.45 * s, 0.22 * s, 0, { only: "mesh", plain: true }));
  out.push(box("beacon", [0, 0.2 * s, 0], 0.28 * s, 0.28 * s, 0.28 * s, 0, { only: "mesh", plain: true }));
  out.push(...lightPool({ o: [0, -0.2 * s, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, -1, 0] }, R * 1.6));
  out.push(rod("hull-grey", [R * 0.4, -0.1 * s, R * 1.2], [R * 0.4, -1.4 * s, R * 1.2], 0.05 * s, 6, { only: "mesh" }), box("hull-white", [R * 0.4, -1.4 * s, R * 1.2], 0.5 * s, 0.5 * s, 0.05 * s, 0, { only: "mesh", plain: true }), box("black", [R * 0.4, -1.42 * s, R * 1.2], 0.36 * s, 0.05 * s, 0.07 * s, 0, { only: "mesh", plain: true }), box("black", [R * 0.4, -1.42 * s, R * 1.2], 0.07 * s, 0.05 * s, 0.36 * s, 0, { only: "mesh", plain: true }));
  // an umbilical panel on the housing's side: a plate, three connector sockets and a hose stub with a clamp
  out.push(box("hull-grey-dark", [-R * 1.25, 0.9 * s, 0], 0.1 * s, 0.9 * s, 1.1 * s, 0, { only: "mesh", plain: true }), ...[-0.3, 0, 0.3].map((z) => box("lamp-amber", [-R * 1.31, 0.9 * s, z * s], 0.05 * s, 0.2 * s, 0.1 * s, 0, { only: "mesh", plain: true })), rod("copper", [-R * 1.3, 0.55 * s, 0.45 * s], [-R * 1.7, 0.1 * s, 0.7 * s], 0.06 * s, 8, { only: "mesh" }));
  return out;
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
    out.push({ kind: "lathe", material: "hull-white", at: [x, z], segs: 32, only: "mesh", body: true, profile: [[w / 2, y], [w / 2, y + 2.2]] } as Lathe, { kind: "lathe", material: "hull-grey-dark", at: [x, z], segs: 32, only: "mesh", profile: [[w / 2 + 0.1, y + 2.2], [w / 2 + 0.1, y + 2.4]] } as Lathe);
    out.push(...place(dockingHardware(port.collar === "S" ? 1 : 2), { at: [x, y, z], yaw: (Math.atan2(-d[1], d[0]) * 180) / Math.PI }));
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
  // the bow dust shield, a whipple stack of three solid plates: a tile bumper, a gold blanket layer and an aluminium rear wall, spaced 1.6 m apart on posts and held by eight stays from the dome, with a rim bumper and tile seams, so the whole crown and the berth sit in its shadow
  const sh = DOCK.shield;
  const base = sh.y0 + sh.stay;
  const sag = SHIELD_SAG;
  for (const plate of SHIELD_PLATES) out.push(dish(plate.material, plate.radius, sag, plate.t, base + plate.off));
  const at = (r: number, yy: number): number => yy + sag * (1 - (r / sh.radius) ** 2);
  for (const r of [7, 14, 20]) for (let k = 0; k < 12; k++) {
    const a = (Math.PI * 2 * k) / 12 + r * 0.01;
    out.push(rod("hull-grey-dark", [r * Math.sin(a), shieldPlateAt(2, r).front - 0.15, r * Math.cos(a)], [r * Math.sin(a), shieldPlateAt(0, r).back + 0.15, r * Math.cos(a)], 0.22, 8, { only: "mesh" }));
  }
  out.push(hoop("hull-white", sh.radius, at(sh.radius, base + 1.6) + 0.5, 0.9, 64, 10), hoop("hull-grey-dark", sh.radius - 0.2, at(sh.radius, base + 3.2) + 0.1, 0.35, 64, 8));
  for (const r of [4, 8, 12, 16, 20]) out.push(hoop("hull-grey-dark", r, at(r, base + 3.2) + 0.02, 0.05, 64, 5));
  for (let k = 0; k < 16; k++) {
    const a = (Math.PI * 2 * k) / 16;
    for (let j = 0; j < 5; j++) out.push(rod("hull-grey-dark", [(3 + j * 4.2) * Math.sin(a), at(3 + j * 4.2, base + 3.2) + 0.02, (3 + j * 4.2) * Math.cos(a)], [(3 + (j + 1) * 4.2) * Math.sin(a), at(3 + (j + 1) * 4.2, base + 3.2) + 0.02, (3 + (j + 1) * 4.2) * Math.cos(a)], 0.05, 5, { only: "mesh" }));
  }
  for (const { from, to } of shieldStays()) out.push(...ibeam("hull-grey-dark", from, to, 1.2, 0.7, [0, 1, 0]), cub("hull-grey", [to[0] - 0.9, to[0] + 0.9], [to[1] + 0.8, to[1] + 0.9], [to[2] - 0.9, to[2] + 0.9]));
  return out;
}

/** The nearest approach to anything that turns, in metres, over every long-stay port and the berth with its craft in place, and the greatest reach from the keel's axis. */
export function clearance(): { lowest: number; toBooms: number; toRing: number; reach: number; berthReach: number; worst: number } {
  const crafts = PORTS.filter((p) => p.longStay).map((p) => ({ port: p, box: craftBox(p) }));
  const lowest = Math.min(...crafts.map((c) => c.box.y0));
  const worst = Math.min(...crafts.map((c) => gapTo(c.box.r0, c.box.r1, c.box.y0, c.box.y1).gap));
  return { lowest, toBooms: lowest - (100 + 17 * 24), toRing: lowest - (SPIN.close.ys[2] + 13), reach: Math.max(...crafts.filter((c) => c.port.id !== "starship").map((c) => c.box.r1)), berthReach: DOCK.berth.z + DOCK.berth.radius, worst };
}
