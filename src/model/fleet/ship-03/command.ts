// The armoured command citadel, station 302 to 350 m: an operations ring around a communications core, a local navigation desk, a medical link and two escape passages. There is no exposed bridge window: remote cameras
// stand on the armour instead. The hull is a chamfered block of thick laminate, plated in grey with white blocks; aerial booms with beacons reach out to port and starboard, and thruster blocks sit at the corners. A cutaway
// opens the starboard side. Pure: no three.js and no DOM.
import { antenna, box, chamfered, collar, cub, discX, discZ, HULL_STACKS, ibeam, type Piece, pipeRun, prism, quad, rng, ringOf, rod, roundStrut, stamp, type Vec3 } from "./adapter.ts";
import { moving } from "../motion.ts";
import { CITADEL, STATION } from "./dims.ts";
import { dressedFace, facesOf, wallShells } from "./hulls.ts";
import { along, ARMOUR, lamp, rail } from "./faces.ts";
import { collarAt, ringAt, tubeAt } from "./shapes.ts";

const [Y0, Y1] = STATION.command;
const HX = CITADEL.hx;
const HZ = CITADEL.hz;
const C = CITADEL.chamfer;
const BOX = { x: [-HX, HX], y: [Y0, Y1], z: [-HZ, HZ] } as const;

/** One raised mosaic on a sloped quad: the chamfer faces. */
function slope(a: Vec3, b: Vec3, c: Vec3, d: Vec3, out3: Vec3, seed: string, cols: number, rows: number): Piece[] {
  const random = rng(`${seed}/slope`);
  const out: Piece[] = [quad("hull-grey-dark", a, b, c, d, 0.5, { only: undefined })];
  const lerp = (p: Vec3, q: Vec3, t: number): Vec3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  const n = Math.hypot(...out3);
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const f = (u: number, v: number): Vec3 => lerp(lerp(a, b, u), lerp(d, c, u), v);
      const g = 0.05;
      const pts = [f(i / cols + g, j / rows + g), f((i + 1) / cols - g, j / rows + g), f((i + 1) / cols - g, (j + 1) / rows - g), f(i / cols + g, (j + 1) / rows - g)].map((p) => [p[0] + (out3[0] / n) * 0.28, p[1] + (out3[1] / n) * 0.28, p[2] + (out3[2] / n) * 0.28] as Vec3);
      const roll = random();
      out.push(quad(roll < 0.2 ? "hull-white" : roll < 0.5 ? "hull-grey" : roll < 0.8 ? "hull-grey-dark" : "hull-orange-worn", pts[0], pts[1], pts[2], pts[3], 0.22));
    }
  return out;
}

function inside(seed: string): Piece[] {
  const out: Piece[] = [];
  const ring = Y0 + 16;
  const cx = 0;
  const cz = 0;
  // three decks: the operations ring in the middle, the nav desk and medical link above it (towards the bow) and the stores below
  for (const y of [Y0 + 2, Y0 + 15, Y0 + 28, Y0 + 40]) out.push(cub("deck", [-HX + 1.4, HX - 1.4], [y, y + 0.35], [-HZ + 1.4, HZ - 1.4], { only: undefined }));
  // the communications core: a tall tube through every deck, ringed with equipment, with its own cooling jacket
  out.push(tubeAt("hull-grey", cx, cz, 3.6, Y0 + 2, Y1 - 2, { segs: 24 }), tubeAt("lamp-blue", cx, cz, 2.4, Y0 + 3, Y1 - 3, { segs: 16 }));
  for (let y = Y0 + 4; y < Y1 - 3; y += 2.2) out.push(ringAt("hull-grey-dark", cx, cz, 3.7, y, 0.18), ringAt("copper", cx, cz, 4.0, y + 0.6, 0.1));
  // the operations ring: a raised floor ring with fourteen consoles facing the core, chairs behind them, and a lit display wall above each
  out.push(collarAt("deck", cx, cz, 4.4, 12.2, ring, ring + 0.4), collarAt("hull-yellow", cx, cz, 12.2, 12.5, ring, ring + 0.5));
  out.push(...stamp([box("hull-grey-dark", [0, 0, 0], 2.4, 1.2, 1.1, 0), box("lamp-blue", [0, 1.1, -0.3], 1.9, 0.12, 0.7, 0), box("hull-white-worn", [0, 0, 1.2], 0.9, 0.9, 0.7, 0)].flat(), ringOf(14, 10.2, ring + 0.4)));
  for (let k = 0; k < 14; k++) {
    const a = (Math.PI * 2 * k) / 14;
    const x = 11.8 * Math.sin(a);
    const z = 11.8 * Math.cos(a);
    out.push(cub("lamp-blue", [x - 0.55, x + 0.55], [ring + 1.7, ring + 3], [z - 0.55, z + 0.55]), cub("hull-grey-dark", [x - 0.7, x + 0.7], [ring + 1.5, ring + 1.7], [z - 0.7, z + 0.7]));
  }
  // the navigation desk (above): a curved table with a star-map plate and three seats; the medical link: a transfer corridor to the habitat
  const nav = Y0 + 28.35;
  out.push(cub("hull-grey-dark", [-6, 6], [nav, nav + 1], [-3, 3]), cub("lamp-blue", [-5.4, 5.4], [nav + 1, nav + 1.08], [-2.4, 2.4]), ...[-4, 0, 4].map((x) => cub("hull-white-worn", [x - 0.6, x + 0.6], [nav, nav + 1.2], [4, 5.2])));
  out.push(tubeAt("hull-white-worn", 0, 0, 1.6, Y0 - 0.5, Y0 + 2.5, { segs: 12 }), cub("hazard", [-1.8, 1.8], [Y0 + 2, Y0 + 2.2], [-1.8, 1.8]));
  // the two escape passages: tubes running from the ring to hatches in the dorsal and ventral armour, with ladders and a hazard door each
  for (const sign of [1, -1]) {
    out.push(cub("hull-white-worn", [-1, 1], [Y0 + 6, Y0 + 28], [sign * (HZ - 3.5) - 1, sign * (HZ - 3.5) + 1]), cub("hazard", [-1.1, 1.1], [Y0 + 6, Y0 + 6.3], [sign * (HZ - 3.5) - 1.1, sign * (HZ - 3.5) + 1.1]));
    for (let y = Y0 + 7; y < Y0 + 28; y += 0.6) out.push(rod("hull-yellow", [-0.4, y, sign * (HZ - 3.5)], [0.4, y, sign * (HZ - 3.5)], 0.02, 4));
  }
  void seed;
  return out;
}

export function command(cut: boolean, detail = 1, seed = "command", refit = false): Piece[] {
  const out: Piece[] = [];
  const o = { seed, scheme: ARMOUR, detail, density: 0.55 };
  const outline = chamfered(HX, HZ, C);
  const f = facesOf(BOX);
  if (!cut) {
    out.push(prism("hull-grey-dark", outline, Y0, Y1, { only: undefined }));
    const inner = { x: [-HX + C, HX - C] as const, y: [Y0, Y1] as const, z: [-HZ, HZ] as const };
    out.push(...dressedFace({ n: "z", sign: 1, at: HZ, a: inner.x, b: [Y0, Y1] }, { ...o, kinds: ["hatch", "sensor", "sensor", "lamps", "hazard", "greeble", "vent"] }), ...dressedFace({ n: "z", sign: -1, at: -HZ, a: inner.x, b: [Y0, Y1] }, { ...o, kinds: ["hatch", "sensor", "lamps", "greeble", "vent"] }));
    out.push(...dressedFace({ n: "x", sign: 1, at: HX, a: [Y0, Y1], b: [-HZ + C, HZ - C] }, { ...o, density: 0.38 }), ...dressedFace({ n: "x", sign: -1, at: -HX, a: [Y0, Y1], b: [-HZ + C, HZ - C] }, { ...o, density: 0.38 }));
    for (const sx of [-1, 1] as const)
      for (const sz of [-1, 1] as const)
        out.push(...slope([sx * (HX - C), Y0, sz * HZ], [sx * (HX - C), Y1, sz * HZ], [sx * HX, Y1, sz * (HZ - C)], [sx * HX, Y0, sz * (HZ - C)], [sx, 0, sz], `${seed}${sx}${sz}`, 8, 2));
  } else {
    out.push(cub("hull-grey-dark", [-HX, -HX + 0.4], [Y0, Y1], [-HZ + C, HZ - C], { only: undefined }));
    for (const sign of [1, -1] as const) out.push(...wallShells(HULL_STACKS.command, { axis: "z", sign, at: sign * HZ, y: [Y0, Y1], across: [-HX + C, HX], step: 0.35 }));
    out.push(...wallShells(HULL_STACKS.command, { axis: "x", sign: -1, at: -HX, y: [Y0, Y1], across: [-HZ + C, HZ - C], step: 0.35 }));
    for (const sx of [-1] as const) for (const sz of [-1, 1] as const) out.push(...slope([sx * (HX - C), Y0, sz * HZ], [sx * (HX - C), Y1, sz * HZ], [sx * HX, Y1, sz * (HZ - C)], [sx * HX, Y0, sz * (HZ - C)], [sx, 0, sz], `${seed}${sx}${sz}`, 8, 2));
    out.push(...inside(seed));
  }
  // remote cameras on the armour: a domed head on a post, in a ring of lamps, at the corners of both faces
  for (const [x, y, z] of [[-14, Y0 + 8, HZ], [14, Y0 + 8, HZ], [-14, Y1 - 8, HZ], [14, Y1 - 8, HZ], [-14, Y0 + 8, -HZ], [14, Y1 - 8, -HZ]] as const) {
    const s = z > 0 ? 1 : -1;
    out.push(rod("hull-grey-dark", [x, y, z], [x, y, z + s * 1.1], 0.7, 8), rod("hull-grey", [x, y, z + s * 1.1], [x, y, z + s * 1.7], 0.5, 8), rod("glass", [x, y, z + s * 1.7], [x, y, z + s * 2.1], 0.34, 8), rod("lamp-amber", [x + 0.55, y, z + s * 1.2], [x + 0.55, y, z + s * 1.5], 0.08, 5));
  }
  // dishes and phased arrays dorsal, and a whip each side
  for (const [x, y] of [[-8, Y0 + 14], [8, Y0 + 14], [-8, Y0 + 34], [8, Y0 + 34]] as const) out.push(...moving(antenna("dish", [x, y, HZ], [0, 0, 1], 5.2, `${seed}${x}${y}`), { name: "dish-track", pivot: [x, y, HZ], axis: [1, 0, 0] }));
  out.push(...antenna("phased", [0, Y0 + 38, HZ], [0, 0, 1], 6, `${seed}ph`), ...antenna("whip", [0, Y1 - 6, HZ], [0, 0, 1], 9, `${seed}w`), ...antenna("omni", [-HX - 0.2, Y0 + 4, 0], [-1, 0, 0], 4, `${seed}o`));
  // aerial booms with beacons (Ariake's stand forward of the hangar boxes beside them): a truss out to each side, ending in a ring beacon
  const bo = Y0 + (refit ? 19 : 8);
  for (const s of [-1, 1]) {
    out.push(...roundStrut("hull-grey", [s * HX, bo, 2], [s * (HX + 17), bo + 4, 2], 0.5), ...roundStrut("hull-grey-dark", [s * HX, bo, -2], [s * (HX + 17), bo + 4, -2], 0.35), ...roundStrut("hull-grey-dark", [s * HX, bo, 2], [s * (HX + 17), bo + 4, -2], 0.22), ...roundStrut("hull-grey-dark", [s * HX, bo, -2], [s * (HX + 17), bo + 4, 2], 0.22));
    out.push(discX("hull-grey-dark", bo + 4, 0, s * (HX + 17), s * (HX + 18.4), 3.4, 16), discX("lamp-blue", bo + 4, 0, s * (HX + 18.4), s * (HX + 18.9), 1.6, 12), ...lamp({ n: "x", sign: s as 1 | -1, at: HX, a: [Y0, Y1], b: [-HZ, HZ] }, bo + 4, 6, "red", 0.3));
  }
  // thruster blocks at the four corners of each end: a box of four nozzles
  for (const y of [Y0 + 1.5, Y1 - 1.5])
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const x = sx * (HX + 0.6);
        const z = sz * (HZ - 4);
        out.push(cub("hull-grey-dark", [x - 0.9, x + 0.9], [y - 1.3, y + 1.3], [z - 1.4, z + 1.4]));
        for (const d of [-0.7, 0.7]) out.push(rod("bell", [x, y + d * 1.4, z + d], [x + sx * 0.8, y + d * 1.4, z + d], 0.5, 8), rod("bell-inside", [x + sx * 0.8, y + d * 1.4, z + d], [x + sx * 0.9, y + d * 1.4, z + d], 0.36, 8));
      }
  out.push(...observation(seed, refit), ...(refit ? sensorMast() : []), ...collar("L", Y0, -1), ...separationJoint(Y0, cut), ...collar("L", Y1, 1));
  out.push(...rail(along(f.dorsal), -17, Y0 + 2, Y1 - 2), ...rail(along(f.dorsal), 17, Y0 + 2, Y1 - 2));
  return out;
}

/** The separation joint at the citadel's aft face: the citadel leaves as a lifeboat, so the joint is hardware you can see. A separation collar (a split ring with a hazard seam), twelve latch dogs with their pyro bolts, eight separation springs, and two umbilical plates with their connector pins and a locking lever each. The part boundary is the plane y = Y0. */
export function separationJoint(y: number, cut: boolean): Piece[] {
  const out: Piece[] = [];
  const R = 15;
  // the split ring: two half rings standing a hand apart, a hazard seam round the gap, a lamp that says armed
  out.push(collarAt("hull-grey", 0, 0, R * 0.62, R * 0.98, y - 0.45, y - 0.95), collarAt("hull-grey-dark", 0, 0, R * 0.62, R * 0.98, y - 1.05, y - 1.5), ringAt("hazard", 0, 0, R * 0.99, y - 1, 0.12), ringAt("lamp-red", 0, 0, R * 0.64, y - 1, 0.08));
  // twelve latch dogs: a hook on a pivot with a pyro bolt through it, a bolt head on the far side and a wire to the next
  for (let k = 0; k < 12; k++) {
    const a = (Math.PI * 2 * k) / 12;
    if (cut && Math.sin(a) > 0.2) continue;
    const px = (R * 0.8) * Math.sin(a);
    const pz = (R * 0.8) * Math.cos(a);
    out.push(cub("hull-grey-dark", [px - 0.45, px + 0.45], [y - 0.5, y - 1.7], [pz - 0.45, pz + 0.45]), rod("hull-orange", [px, y - 0.4, pz], [px, y - 1.9, pz], 0.16, 12), rod("hull-grey", [px, y - 1.9, pz], [px, y - 2.1, pz], 0.28, 12), rod("lamp-amber", [px * 1.15, y - 1.2, pz * 1.15], [px * 1.15, y - 1.45, pz * 1.15], 0.1, 8));
  }
  // eight separation springs: a cylinder and a piston on a plate, pushing the citadel clear
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8 + Math.PI / 8;
    if (cut && Math.sin(a) > 0.2) continue;
    const sx = (R * 0.7) * Math.sin(a);
    const sz = (R * 0.7) * Math.cos(a);
    out.push(rod("hull-grey-dark", [sx, y + 0.2, sz], [sx, y - 0.7, sz], 0.32, 12), rod("engine-pale", [sx, y - 0.7, sz], [sx, y - 1.1, sz], 0.18, 12), rod("hull-grey", [sx, y - 1.1, sz], [sx, y - 1.2, sz], 0.4, 12));
  }
  // two umbilical plates on the flat of the face: a plate with a grid of connector pins in round sockets, a guide pin each side and a locking lever, a cover that opens on separation
  for (const sx of [-1, 1]) {
    const cx = sx * 17.4;
    out.push(cub("hull-grey-dark", [cx - 1.9, cx + 1.9], [y - 0.1, y - 0.55], [-3.1, 3.1]), cub("hull-yellow", [cx - 2.05, cx + 2.05], [y - 0.05, y - 0.15], [-3.25, 3.25]));
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 6; j++) {
        const px = cx - 1.2 + i * 0.8;
        const pz = -2.3 + j * 0.92;
        out.push(rod("panel-dark", [px, y - 0.5, pz], [px, y - 0.75, pz], 0.22, 12), rod(i % 2 ? "copper" : "engine-pale", [px, y - 0.7, pz], [px, y - 1.15, pz], 0.07, 8));
      }
    for (const gz of [-3.6, 3.6]) out.push(rod("hull-grey", [cx, y - 0.1, gz], [cx, y - 1.9, gz], 0.2, 12), rod("hull-yellow", [cx, y - 1.9, gz], [cx, y - 2.1, gz], 0.12, 8));
    out.push(rod("hull-grey-dark", [cx - 2.1, y - 0.6, 0], [cx - 2.1, y - 1.8, 0.9], 0.12, 8), rod("red", [cx - 2.1, y - 1.8, 0.9], [cx - 2.1, y - 2.1, 1.2], 0.2, 8));
    out.push(...pipeRun("copper", [[cx + 2, y - 0.3, 2.6], [cx + 3.4, y - 1.4, 2.6], [cx + 3.4, y - 3.2, 2.6]], 0.14, { clampEvery: 1.5 }));
  }
  return out;
}

/** The armoured observation dome above the operations ring, and the solarium beside it: a glazed garden hall with grow-lamps and shutters, lit at night. The dome is a faceted cap of glass panes in an armoured ring with eight ribs; the solarium is a frame of I-beams holding glass, with plant beds, lamps and half-drawn orange shutters. Simple until the kit's own arrive. */
export function observation(seed: string, twin = false): Piece[] {
  const out: Piece[] = [];
  const dy = Y0 + 21;
  const z0 = HZ;
  // the dome: an armoured base ring, then stacked facets narrowing to a crown, glass above the ring and armoured ribs over it
  out.push(discZ("hull-grey", 0, dy, z0, z0 + 1.2, 6.2, 16), discZ("hull-grey-dark", 0, dy, z0 + 1.2, z0 + 1.7, 5.6, 16));
  [[5, 1.6], [4.4, 3], [3.5, 4.1], [2.4, 4.9], [1.2, 5.4]].forEach(([r, h], i) => out.push(discZ(i < 4 ? "glass" : "hull-grey-dark", 0, dy, z0 + h - 0.5, z0 + h, r, 16)));
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI * 2 * k) / 8;
    const pts: [number, number, number][] = [[5.4, 1.7], [4.7, 3.1], [3.7, 4.2], [2.5, 5], [0.3, 5.5]].map(([r, h]) => [r * Math.cos(a), dy + r * Math.sin(a), z0 + h]);
    for (let i = 0; i + 1 < pts.length; i++) out.push(rod("hull-grey", pts[i], pts[i + 1], 0.24, 8));
  }
  out.push(...ringAtZ("lamp-blue", 0, dy, z0 + 1.75, 5.7));
  // the solarium: a hall beside the dome, a frame of I-beams, glass walls and roof, beds of plants, grow-lamps, and shutters half drawn
  const hall = (sx0: number, sx1: number): void => {
    const sy0 = dy - 5;
    const sy1 = dy + 5;
    const h = 4.2;
    out.push(cub("hull-grey-dark", [sx0, sx1], [sy0, sy1], [z0, z0 + 0.5]), cub("glass", [sx0 + 0.3, sx1 - 0.3], [sy0 + 0.3, sy1 - 0.3], [z0 + h - 0.2, z0 + h]));
    for (const x of [sx0, (sx0 + sx1) / 2, sx1]) for (const y of [sy0, (sy0 + sy1) / 2, sy1]) out.push(rod("hull-grey", [x, y, z0 + 0.5], [x, y, z0 + h], 0.22, 12));
    for (const y of [sy0, sy1]) out.push(...ibeam("hull-grey", [sx0, y, z0 + h], [sx1, y, z0 + h], 0.5, 0.3, [0, 0, 1]));
    for (const x of [sx0, sx1]) out.push(...ibeam("hull-grey", [x, sy0, z0 + h], [x, sy1, z0 + h], 0.5, 0.3, [0, 0, 1]), cub("glass", [x - 0.05, x + 0.05], [sy0 + 0.3, sy1 - 0.3], [z0 + 0.7, z0 + h - 0.3]));
    for (const y of [sy0, sy1]) out.push(cub("glass", [sx0 + 0.3, sx1 - 0.3], [y - 0.05, y + 0.05], [z0 + 0.7, z0 + h - 0.3]));
    for (let r = 0; r < 3; r++) out.push(cub("plant", [sx0 + 0.8, sx1 - 0.8], [sy0 + 1 + r * 3.2, sy0 + 3 + r * 3.2], [z0 + 0.5, z0 + 1.1]), cub("lamp-blue", [sx0 + 1.2, sx1 - 1.2], [sy0 + 1.8 + r * 3.2, sy0 + 2.2 + r * 3.2], [z0 + h - 0.8, z0 + h - 0.6]), rod("hull-grey-dark", [sx0 + 1, sy0 + 2 + r * 3.2, z0 + h - 0.2], [sx0 + 1, sy0 + 2 + r * 3.2, z0 + h - 0.8], 0.06, 6));
    out.push(cub("hull-orange", [sx0 + 0.2, sx1 - 0.2], [sy0, sy0 + 1.4], [z0 + h, z0 + h + 0.2]), cub("hull-orange-worn", [sx0 + 0.2, sx1 - 0.2], [sy1 - 1.4, sy1], [z0 + h, z0 + h + 0.2]), rod("hull-grey-dark", [sx0, sy0, z0 + h + 0.15], [sx1, sy0, z0 + h + 0.15], 0.12, 8), rod("hull-grey-dark", [sx0, sy1, z0 + h + 0.15], [sx1, sy1, z0 + h + 0.15], 0.12, 8));
  };
  hall(8.5, 17.5);
  if (twin) hall(-17.5, -8.5);
  void seed;
  return out;
}

/** A ring facing along Z at (x, y), at height z, of a given radius: a ring of small blocks. */
function ringAtZ(material: "lamp-blue" | "lamp-amber", x: number, y: number, z: number, r: number): Piece[] {
  return Array.from({ length: 16 }, (_, k) => {
    const a = (Math.PI * 2 * k) / 16;
    return cub(material, [x + r * Math.cos(a) - 0.12, x + r * Math.cos(a) + 0.12], [y + r * Math.sin(a) - 0.12, y + r * Math.sin(a) + 0.12], [z, z + 0.2]);
  });
}

/** Ariake's refit: a lattice mast on the citadel's dorsal side aft of the dome, three round legs braced at every level, with a ring of lamps and a head of sensors (a gimballed telescope, a radar dish, a lidar turret and a magnetometer boom). */
export function sensorMast(): Piece[] {
  const out: Piece[] = [];
  const y = Y0 + 7;
  const z0 = HZ;
  const top = z0 + 26;
  const leg = (k: number, h: number): Vec3 => {
    const a = (Math.PI * 2 * k) / 3;
    const r = 2.2 - (1.2 * (h - z0)) / (top - z0);
    return [r * Math.cos(a), y + r * Math.sin(a), h];
  };
  out.push(cub("hull-grey-dark", [-3.2, 3.2], [y - 3.2, y + 3.2], [z0, z0 + 0.8]), ...ringAtZ("lamp-amber", 0, y, z0 + 0.85, 3.4));
  for (let k = 0; k < 3; k++) {
    out.push(...roundStrut("hull-grey", leg(k, z0 + 0.8), leg(k, top), 0.22));
    for (let h = z0 + 0.8; h + 4 < top; h += 4) out.push(...roundStrut("hull-grey-dark", leg(k, h), leg((k + 1) % 3, h + 4), 0.1), ...roundStrut("hull-grey-dark", leg((k + 1) % 3, h), leg(k, h + 4), 0.1));
  }
  for (let h = z0 + 4.8; h < top; h += 4) out.push(rod("hull-dawn", [leg(0, h)[0] * 1.02, y + leg(0, h)[1] - y, h], [leg(1, h)[0] * 1.02, leg(1, h)[1], h], 0.08, 6));
  out.push(discZ("hull-grey", 0, y, top, top + 0.5, 1.6, 12), discZ("hull-dawn", 0, y, top + 0.5, top + 0.8, 1.7, 12));
  // the head: a telescope in a yoke, a dish, a lidar drum, and a boom with a sensor ball
  out.push(rod("hull-grey-dark", [-1, y, top + 0.8], [-1, y, top + 2.2], 0.15, 8), rod("hull-grey-dark", [1, y, top + 0.8], [1, y, top + 2.2], 0.15, 8), rod("hull-white", [0, y - 1.4, top + 2.4], [0, y + 1.8, top + 2.4], 0.55, 14), rod("glass", [0, y + 1.8, top + 2.4], [0, y + 1.95, top + 2.4], 0.42, 14), rod("hull-grey-dark", [0, y - 1.6, top + 2.4], [0, y - 1.4, top + 2.4], 0.6, 14));
  out.push(...antenna("dish", [0, y - 2.2, top + 1.2], [0, -0.5, 1], 3.2, "mast-dish"), rod("hull-grey", [1.5, y + 0.4, top + 0.8], [1.5, y + 0.4, top + 1.6], 0.5, 12), rod("glass", [1.5, y + 0.4, top + 1.6], [1.5, y + 0.4, top + 1.75], 0.4, 12));
  out.push(...roundStrut("hull-grey", [1.6, y, top - 3], [11, y, top - 3.5], 0.14), ...roundStrut("hull-grey", [-1.6, y, top - 3], [-11, y, top - 3.5], 0.14), rod("hull-dawn", [11, y, top - 3.5], [11.5, y, top - 3.5], 0.5, 12), rod("hull-dawn", [-11, y, top - 3.5], [-11.5, y, top - 3.5], 0.5, 12));
  out.push(rod("lamp-red", [0, y, top + 3.7], [0, y, top + 4], 0.18, 8), ...antenna("whip", [0, y + 0.6, top + 3], [0, 0, 1], 4, "mast-whip"));
  return out;
}
