// The armoured command citadel, station 302 to 350 m: an operations ring around a communications core, a local navigation desk, a medical link and two escape passages. There is no exposed bridge window: remote cameras
// stand on the armour instead. The hull is a chamfered block of thick laminate, plated in grey with white blocks; aerial booms with beacons reach out to port and starboard, and thruster blocks sit at the corners. A cutaway
// opens the starboard side. Pure: no three.js and no DOM.
import { antenna, beam, box, chamfered, collar, cub, discX, HULL_STACKS, type Piece, prism, quad, rng, ringOf, rod, stamp, type Vec3 } from "./adapter.ts";
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

export function command(cut: boolean, detail = 1, seed = "command"): Piece[] {
  const out: Piece[] = [];
  const o = { seed, scheme: ARMOUR, detail, density: 0.32 };
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
  for (const [x, y] of [[-8, Y0 + 14], [8, Y0 + 14], [-8, Y0 + 34], [8, Y0 + 34]] as const) out.push(...antenna("dish", [x, y, HZ], [0, 0, 1], 5.2, `${seed}${x}${y}`));
  out.push(...antenna("phased", [0, Y0 + 24, HZ], [0, 0, 1], 6, `${seed}ph`), ...antenna("whip", [0, Y1 - 6, HZ], [0, 0, 1], 9, `${seed}w`), ...antenna("omni", [-HX - 0.2, Y0 + 4, 0], [-1, 0, 0], 4, `${seed}o`));
  // aerial booms with beacons: a truss out to each side at the aft end, ending in a ring beacon
  for (const s of [-1, 1]) {
    out.push(beam("hull-grey", [s * HX, Y0 + 8, 2], [s * (HX + 17), Y0 + 12, 2], 1.1, 1.1), beam("hull-grey-dark", [s * HX, Y0 + 8, -2], [s * (HX + 17), Y0 + 12, -2], 0.7, 0.7), beam("hull-grey-dark", [s * HX, Y0 + 8, 2], [s * (HX + 17), Y0 + 12, -2], 0.4, 0.4));
    out.push(discX("hull-grey-dark", Y0 + 12, 0, s * (HX + 17), s * (HX + 18.4), 3.4, 16), discX("lamp-blue", Y0 + 12, 0, s * (HX + 18.4), s * (HX + 18.9), 1.6, 12), ...lamp({ n: "x", sign: s as 1 | -1, at: HX, a: [Y0, Y1], b: [-HZ, HZ] }, Y0 + 12, 6, "red", 0.3));
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
  out.push(...collar("L", Y0, -1), ...collar("L", Y1, 1));
  out.push(...rail(along(f.dorsal), -17, Y0 + 2, Y1 - 2), ...rail(along(f.dorsal), 17, Y0 + 2, Y1 - 2));
  return out;
}
