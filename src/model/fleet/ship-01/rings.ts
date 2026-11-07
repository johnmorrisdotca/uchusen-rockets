// Hanabusa's W4 stepped rings, reworked: each glazed ring is one grand hall under a glass roof, as in NASA Ames' 1970s paintings of the Stanford torus: a street with a canal and rows of trees on the curving floor, terraced
// buildings stepping up both side walls, a roof of thin mullions overhead. The garden ring is its own thing: hydroponic terraces under LED grow-lamps. The ring order is one parameter: the default has the smallest ring at the bow
// so that, seen from ahead, every ring has open sky above it. Repeated parts are stamped templates. Concepts only. Pure: no three.js and no DOM.
import { box, hoop, horn, place, rod, seams, type Lathe, type MaterialName, type Piece, type Pose, type Vec3 } from "./adapter.ts";
import { booms, hull } from "./hull.ts";
import { SPIN, SPIN4 } from "./spin.ts";
import { researchHall } from "./researchHall.ts";
import { industrialWheel, liftTube, reach, rIn, roundSection, solar, type Geo, type Use } from "./wheelparts.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;

/** Where each ring stands. `bow` puts the smallest ring nearest the bow (the default, John's pick); `aft` puts it at the stern, the build option. */
export type Order = "bow" | "aft";
export const RING_ORDER_DEFAULT: Order = "bow";

export interface Ring {
  use: Use;
  name: string;
  rOut: number;
  depth: number;
  y: number;
}

/** The three rings with their heights up the keel for an order. */
export function rings(order: Order = RING_ORDER_DEFAULT): Ring[] {
  const ys = [...SPIN.close.ys];
  const small = order === "bow" ? ys[2] : ys[0];
  const mid = ys[1];
  const big = order === "bow" ? ys[0] : ys[2];
  const stations = [small, mid, big];
  return SPIN4.rings.map((r, i) => ({ use: r.use, name: r.name, rOut: r.rOut, depth: r.depth, y: stations[i] }));
}

export const geoOf = (r: Ring): Geo => ({ rOut: r.rOut, depth: r.depth, wide: r.depth, style: "ring", c: 8 });
/** The ground of the nave: 1.5 m inside the outer wall. */
export const ground = (g: Geo): number => g.rOut - 1.5;

/** A box by its ranges: x centre and width, axial from y0 to y1, radial from z0 to z1. */
const blk = (material: MaterialName, x: number, wide: number, y0: number, y1: number, z0: number, z1: number): Piece => box(material, [x, y0, (z0 + z1) / 2], wide, Math.abs(z1 - z0), y1 - y0, 0, { only: "mesh", plain: true });

// ----------------------------------------------------------------------------------------------------------------------------------
// the glass: thin mullions and a lattice of fine rings, a tint, no pipe segments

export function glass(g: Geo, y: number, gap?: number): Piece[] {
  const out: Piece[] = [];
  const arc = gap ? (): readonly [number, number] => [deg(gap), TAU - deg(gap)] : undefined;
  out.push({ kind: "lathe", material: "glass-clear", segs: 192, only: "mesh", body: true, outline: true, profile: roundSection(g, y), ...(arc ? { arc } : {}) } as Lathe, { kind: "lathe", material: "glass-clear", segs: 48, only: "drawing", body: true, outline: true, profile: roundSection(g, y).filter((_, i, a) => i % 6 === 0 || i === a.length - 1), ...(arc ? { arc } : {}) } as Lathe);
  // thin mullions across the section, every 3.75 degrees, and a lattice of fine rings round the section
  const mull: Lathe = { kind: "lathe", material: "hull-grey", segs: 800, only: "mesh", arc: () => [-0.0016, 0.0016], profile: roundSection(g, 0, 0.1) };
  for (let i = 0; i < 96; i++) {
    const a = (360 * i) / 96;
    if (gap && (a < gap || a > 360 - gap)) continue;
    out.push(...place([mull], { at: [0, y, 0], yaw: a }));
  }
  const pts = roundSection(g, 0, 0.1);
  for (let k = 0; k < pts.length - 1; k += 3) out.push(hoop("hull-grey", pts[k][0], y + pts[k][1], 0.07, 192, 5, arc ? { arc } : {}));
  return out;
}

// ----------------------------------------------------------------------------------------------------------------------------------
// the town hall of the living ring. The research ring has its own hall.

/** Where the named places of the living ring stand, for labels: an azimuth, the side of the street, and the terrace step (1 lowest). */
export const TOWN4 = [
  { id: "theatre", name: "Theatre", az: 64, side: 1, step: 1 },
  { id: "market", name: "Market arcade", az: 78, side: -1, step: 1 },
  { id: "sports", name: "Sports hall", az: 96, side: 1, step: 2 },
  { id: "school", name: "School", az: 106, side: -1, step: 2 },
  { id: "medical", name: "Medical centre", az: 84, side: 1, step: 3 },
  { id: "canal", name: "Canal and tree rows", az: 72, side: 0, step: 0 },
] as const;

export const STEP = 3.2;
/** Half the width of the nave and the width of each terrace step, from the ring's own width: three steps fill the side walls. */
export const dims = (g: Geo): { nave: number; tread: number } => {
  const hw = g.wide / 2 - 1.2;
  const nave = hw * 0.4;
  return { nave, tread: (hw - nave) / 3 };
};

/** One terrace house or block on step `k` of side `s`, in the stamp's frame. `kind` picks what it is. */
function terraceBlock(g: Geo, s: number, k: number, kind: string, accent: MaterialName): Piece[] {
  const rg = ground(g);
  const rk = rg - STEP * k;
  const { nave: NAVE, tread: TREAD } = dims(g);
  const e0 = NAVE + TREAD * (k - 1);
  const e1 = e0 + TREAD;
  const a0 = s > 0 ? e0 + 0.15 : -(e1 - 0.15);
  const a1 = s > 0 ? e1 - 0.15 : -(e0 + 0.15);
  const faceY = s > 0 ? a0 : a1;
  const h = kind === "theatre" ? 3.1 : kind === "sports" ? 2.8 : 3.0;
  const w = kind === "sports" ? 6.6 : kind === "theatre" ? 5.8 : 5.2;
  const out: Piece[] = [blk("hull-white", 0, w, a0, a1, rk - h, rk), blk("hull-grey", 0, w + 0.2, a0 - 0.05, a1 + 0.05, rk - h - 0.18, rk - h)];
  // the front toward the nave: a band of lit windows, a balcony with its rail and a planter
  const fy = faceY - s * 0.06;
  const fy0 = s > 0 ? fy - 0.1 : fy;
  out.push(blk("window", 0, w - 0.9, fy0, fy0 + 0.1, rk - h + 0.5, rk - 0.7));
  for (const dx of [-w * 0.3, 0, w * 0.3]) out.push(blk("hull-white", dx, 0.12, fy0 - (s > 0 ? 0.01 : -0.01), fy0 + 0.11, rk - h + 0.4, rk - 0.65));
  const by0 = s > 0 ? fy - 0.85 : fy + 0.0;
  out.push(blk("hull-grey", 0, w - 0.6, by0, by0 + 0.85, rk - 0.5, rk - 0.4), rod("hull-grey", [-(w - 0.8) / 2, s > 0 ? fy - 0.8 : fy + 0.8, rk - 1.5], [(w - 0.8) / 2, s > 0 ? fy - 0.8 : fy + 0.8, rk - 1.5], 0.04, 5, { only: "mesh" }), blk("plant", 0, w - 1.0, by0 + (s > 0 ? 0.55 : 0.0), by0 + (s > 0 ? 0.8 : 0.25), rk - 1.1, rk - 0.5));
  out.push(blk(accent, 0, w - 0.4, fy0 - (s > 0 ? 0.7 : -0.7), fy0 - (s > 0 ? 0.0 : 0.0) + 0.0, rk - h + 0.25, rk - h + 0.4));
  // the roof: a green roof, or the terrace's own garden
  out.push(blk("plant", 0, w - 0.3, a0 + 0.05, a1 - 0.05, rk - h - 0.45, rk - h - 0.18));
  if (kind === "theatre") out.push(...horn("hull-white", [0, (a0 + a1) / 2, rk - h - 0.4], [0, (a0 + a1) / 2, rk - h - 1.4], [2.0, 1.2], 14, { only: "mesh" }), blk("lamp-amber", 0, w - 1.2, fy0 - (s > 0 ? 0.04 : -0.04), fy0 + 0.08, rk - 0.4, rk - 0.7));
  if (kind === "sports") out.push(blk("window", 0, w - 1.4, a0 + 0.3, a1 - 0.3, rk - h - 0.5, rk - h - 0.46), blk("flood", w / 2 - 0.3, 0.3, a0 + 0.1, a0 + 0.4, rk - h - 0.9, rk - h - 0.5));
  if (kind === "medical") out.push(blk("lamp-blue", 0, 2.4, fy0 - (s > 0 ? 0.05 : -0.05), fy0 + 0.09, rk - 2.0, rk - 1.35), blk("lamp-blue", 0, 0.7, fy0 - (s > 0 ? 0.05 : -0.05), fy0 + 0.09, rk - 2.5, rk - 0.85));
  if (kind === "market") out.push(blk(accent, 0, w, fy0 - (s > 0 ? 1.1 : -1.1), fy0 - (s > 0 ? 0.9 : -0.9), rk - 0.9, rk - 0.7), blk("lamp-amber", 0, w - 0.5, fy0 - (s > 0 ? 0.35 : -0.35), fy0 + 0.1, rk - 0.5, rk - 0.35));
  if (kind === "school") out.push(rod("hull-grey", [-w * 0.3, (a0 + a1) / 2, rk - h - 0.4], [-w * 0.3, (a0 + a1) / 2, rk - h - 2.2], 0.05, 5, { only: "mesh" }), blk("lamp-amber", -w * 0.3 + 0.35, 0.7, (a0 + a1) / 2 - 0.2, (a0 + a1) / 2 + 0.2, rk - h - 2.2, rk - h - 1.6));
  return out;
}

/** The nave in one stamp: the tree rows, a lamp, a bench, a footbridge over the canal; and the risers of the terraces. */
function nave(g: Geo, i: number): Piece[] {
  const rg = ground(g);
  const nv = dims(g).nave;
  const out: Piece[] = [];
  for (const s of [-1, 1]) {
    const jitter = ((i * 7 + (s > 0 ? 3 : 0)) % 5) * 0.12;
    const ty = s * (nv * 0.68 + jitter);
    const tall = 2.7 + 0.5 * ((i + (s > 0 ? 1 : 0)) % 3);
    out.push(rod("wood", [0, ty, rg], [0, ty, rg - 1.3], 0.13, 6, { only: "mesh" }), ...horn("leaf", [0, ty, rg - 1.1], [0, ty, rg - 1.1 - tall], [1.2, 1.35, 1.1, 0.85, 0.6, 0.3], 10, { only: "mesh" }));
    if (i % 2 === 0) out.push(rod("hull-grey", [2.6, s * 2.45, rg], [2.6, s * 2.45, rg - 3.0], 0.06, 6, { only: "mesh" }), blk("lamp-amber", 2.6, 0.4, s * 2.45 - 0.2, s * 2.45 + 0.2, rg - 3.2, rg - 2.9));
    if (i % 4 === 1) out.push(blk("wood", -1.2, 1.7, s * 2.2, s * 2.7, rg - 0.45, rg - 0.05), blk("wood", -1.2, 1.7, s * 2.55, s * 2.7, rg - 0.9, rg - 0.45));
  }
  if (i % 10 === 5) {
    // a footbridge over the canal with its rails
    out.push(blk("hull-white", 0, 2.6, -1.9, 1.9, rg - 0.45, rg - 0.2), ...[-1, 1].flatMap((s) => [rod("hull-grey", [-1.3, s * 1.8, rg - 0.45], [1.3, s * 1.8, rg - 0.45], 0.05, 5, { only: "mesh" }), rod("hull-grey", [-1.3, s * 1.8, rg - 1.2], [1.3, s * 1.8, rg - 1.2], 0.05, 5, { only: "mesh" })]));
  }
  return out;
}

/** The whole living or research hall of a ring: bands for the ground, the canal and the terrace treads and risers, then terrace blocks and the nave stamped round the ring. */
export function townHall(g: Geo, y: number, use: Use, gap?: number, bare = false): Piece[] {
  const { nave: NAVE, tread: TREAD } = dims(g);
  const out: Piece[] = [];
  const arc = gap ? (): readonly [number, number] => [deg(gap), TAU - deg(gap)] : undefined;
  const shut = (az: number): boolean => !gap || (az >= gap && az <= 360 - gap);
  const rg = ground(g);
  const lathe = (material: MaterialName, profile: [number, number][]): Lathe => ({ kind: "lathe", material, segs: 160, only: "mesh", profile, ...(arc ? { arc } : {}) });
  out.push(lathe("plant", [[rg, y - NAVE], [rg, y + NAVE]]), lathe("concrete", [[rg + 0.02, y - 2.4], [rg + 0.02, y + 2.4]]), lathe("water", [[rg - 0.06, y - 1.0], [rg - 0.06, y + 1.0]]), lathe("hull-grey", [[rg + 0.04, y - 1.18], [rg + 0.04, y - 1.0]]), lathe("hull-grey", [[rg + 0.04, y + 1.0], [rg + 0.04, y + 1.18]]));
  for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
    const rk = rg - STEP * k;
    const e0 = NAVE + TREAD * (k - 1);
    out.push(lathe(k % 2 ? "concrete" : "plant", [[rk, y + s * e0], [rk, y + s * (e0 + TREAD)]]), lathe("hull-white", [[rk, y + s * e0], [rg - STEP * (k - 1), y + s * e0]]));
    out.push({ kind: "lathe", material: "window", segs: 160, only: "mesh", profile: [[rk + 0.02, y + s * (e0 + TREAD - 0.1)], [rk + 0.02, y + s * (e0 + TREAD - 0.05)]], ...(arc ? { arc } : {}) } as Lathe);
  }
  // the light overhead: three strips of LED under the glass roof
  for (const dy of [-6.5, 0, 6.5]) out.push(lathe("flood", [[rIn(g) + 1.2, y + dy - 0.25], [rIn(g) + 1.2, y + dy + 0.25]]));
  const n = Math.round((TAU * rg) / 6.4);
  const kinds = ["apartments", "apartments", "apartments", "apartments"];
  const accent: MaterialName[] = ["hull-orange", "hull-yellow", "hull-blue"];
  const specials = new Map<string, string>();
  if (use === "living") for (const t of TOWN4) if (t.side !== 0) specials.set(`${Math.round((t.az / 360) * n)}/${t.side}/${t.step}`, t.id);
  for (let i = 0; i < n && !bare; i++) {
    const az = (360 * i) / n;
    if (!shut(az)) continue;
    const pose: Pose = { at: [0, y, 0], yaw: az };
    const stamp: Piece[] = [...nave(g, i)];
    for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
      const kind = specials.get(`${i}/${s}/${k}`) ?? kinds[(i + k + (s > 0 ? 1 : 0)) % kinds.length];
      stamp.push(...terraceBlock(g, s, k, kind, accent[(i + k) % 3]));
    }
    out.push(...place(stamp, pose));
  }
  void use;
  return out;
}

// ----------------------------------------------------------------------------------------------------------------------------------
// the hydroponic hall of the garden ring

export function hydroHall(g: Geo, y: number, gap?: number, bare = false): Piece[] {
  const { nave: NAVE, tread: TREAD } = dims(g);
  const out: Piece[] = [];
  const arc = gap ? (): readonly [number, number] => [deg(gap), TAU - deg(gap)] : undefined;
  const shut = (az: number): boolean => !gap || (az >= gap && az <= 360 - gap);
  const rg = ground(g);
  const lathe = (material: MaterialName, profile: [number, number][]): Lathe => ({ kind: "lathe", material, segs: 160, only: "mesh", profile, ...(arc ? { arc } : {}) });
  out.push(lathe("concrete", [[rg + 0.02, y - 2.2], [rg + 0.02, y + 2.2]]), lathe("plant", [[rg, y - NAVE], [rg, y - 2.2]]), lathe("plant", [[rg, y + 2.2], [rg, y + NAVE]]), lathe("water", [[rg - 0.05, y - NAVE * 0.9], [rg - 0.05, y - NAVE * 0.75]]), lathe("water", [[rg - 0.05, y + NAVE * 0.75], [rg - 0.05, y + NAVE * 0.9]]), lathe("hull-grey", [[rg + 0.06, y - 0.25], [rg + 0.06, y - 0.12]]), lathe("hull-grey", [[rg + 0.06, y + 0.12], [rg + 0.06, y + 0.25]]));
  for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
    const rk = rg - STEP * k;
    const e0 = NAVE + TREAD * (k - 1);
    out.push(lathe("soil", [[rk, y + s * e0], [rk, y + s * (e0 + TREAD)]]), lathe("hull-white", [[rk, y + s * e0], [rg - STEP * (k - 1), y + s * e0]]));
  }
  for (const dy of [-6.5, 0, 6.5]) out.push(lathe("flood", [[rIn(g) + 1.2, y + dy - 0.25], [rIn(g) + 1.2, y + dy + 0.25]]));
  const n = Math.round((TAU * rg) / 5.2);
  for (let i = 0; i < n && !bare; i++) {
    const az = (360 * i) / n;
    if (!shut(az)) continue;
    const st: Piece[] = [];
    for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) {
      const rk = rg - STEP * k;
      const e0 = NAVE + TREAD * (k - 1);
      const a0 = s > 0 ? e0 + 0.2 : -(e0 + TREAD - 0.2);
      const a1 = s > 0 ? e0 + TREAD - 0.2 : -(e0 + 0.2);
      // a bed of crop in rows, a rack frame over it, and a bar of grow-lamp under the rack's top
      st.push(blk("hull-white", 0, 4.2, a0, a1, rk - 0.5, rk), blk(i % 3 ? "plant" : "leaf", 0, 4.0, a0 + 0.1, a1 - 0.1, rk - 1.2, rk - 0.5), blk("hull-grey", 0, 4.4, a0, a1, rk - 2.7, rk - 2.55));
      for (const dy of [a0 + 0.1, a1 - 0.1]) st.push(rod("hull-grey", [-2.0, dy, rk], [-2.0, dy, rk - 2.6], 0.05, 5, { only: "mesh" }), rod("hull-grey", [2.0, dy, rk], [2.0, dy, rk - 2.6], 0.05, 5, { only: "mesh" }));
      st.push(blk("grow-lamp", 0, 3.8, a0 + 0.3, a1 - 0.3, rk - 2.5, rk - 2.38), blk("hull-grey-dark", 1.4, 0.4, a0 + 0.2, a1 - 0.2, rk - 0.2, rk - 0.05));
    }
    // the nave: a fruit tree now and then, a lamp, and a gantry across the aisle every ninth bay
    if (i % 6 === 0) st.push(rod("wood", [0, NAVE * 0.95, rg], [0, NAVE * 0.95, rg - 1.2], 0.12, 6, { only: "mesh" }), ...horn("leaf", [0, NAVE * 0.95, rg - 1.0], [0, 3.9, rg - 3.2], [1.2, 1.4, 1.1, 0.8, 0.5, 0.25], 10, { only: "mesh" }));
    if (i % 2 === 0) st.push(rod("hull-grey", [2.3, 2.6, rg], [2.3, 2.6, rg - 3.2], 0.06, 6, { only: "mesh" }), blk("flood", 2.3, 0.4, 2.4, 2.8, rg - 3.4, rg - 3.1));
    if (i % 9 === 4) st.push(blk("hull-grey", 0, 0.4, -5.2, 5.2, rg - 3.9, rg - 3.6), blk("hull-grey", 0, 0.4, -5.2, -4.8, rg - 3.9, rg), blk("hull-grey", 0, 0.4, 4.8, 5.2, rg - 3.9, rg), blk("lamp-amber", 0, 0.5, -0.5, 0.5, rg - 3.65, rg - 3.45));
    out.push(...place(st, { at: [0, y, 0], yaw: az }));
  }
  return out;
}

// ----------------------------------------------------------------------------------------------------------------------------------
// a ring, the whole ship, the cutaways

/** The outside of a ring: glass, the hall inside, the solar skirt, six glazed lifts. */
export function ringPieces(r: Ring, gap?: number): Piece[] {
  const g = geoOf(r);
  const hall = r.use === "hydro" ? hydroHall(g, r.y, gap) : r.use === "research" ? researchHall(g, r.y, gap) : townHall(g, r.y, r.use, gap);
  const out: Piece[] = [...glass(g, r.y, gap), ...hall, ...(gap ? [] : solar(g, r.y))];
  if (!gap) for (let k = 0; k < 6; k++) {
    const a = deg(60 * k);
    out.push(...liftTube([SPIN.hubR * Math.sin(a), r.y, SPIN.hubR * Math.cos(a)], [(rIn(g) + 1) * Math.sin(a), r.y, (rIn(g) + 1) * Math.cos(a)], "glass-clear", 3.4, [0.3, 0.7], a));
  }
  return out;
}

/** The whole ship of W4 with the rings in an order. */
export function ship4(order: Order = RING_ORDER_DEFAULT): Piece[] {
  return [...hull(), ...booms(), ...industrialWheel("ring"), ...rings(order).flatMap((r) => ringPieces(r))];
}

/** One ring opened for a look inside: the glass and the hall cut away over `gap` degrees each side of +Z, with its orange frames at the cut; and the hub, a spoke and a stretch of keel. */
export function cutaway4(use: "living" | "hydro"): Piece[] {
  const r = rings().find((one) => one.use === use) as Ring;
  const g = geoOf(r);
  const gap = 58;
  const out: Piece[] = [...ringPieces({ ...r, y: 0 }, gap)];
  const frame: Lathe = { kind: "lathe", material: "hull-orange", segs: 400, only: "mesh", arc: () => [-0.02, 0.02], profile: roundSection(g, 0, 0.35) };
  for (const a of [gap, 360 - gap]) out.push(...place([frame], { at: [0, 0, 0], yaw: a }));
  // a few strips of the lattice and the solar skirt are left off at the opening; the spokes and the hub stay
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k);
    if (Math.abs(((60 * k + 180) % 360) - 180) < gap + 5) continue;
    out.push(...liftTube([SPIN.hubR * Math.sin(a), 0, SPIN.hubR * Math.cos(a)], [(rIn(g) + 1) * Math.sin(a), 0, (rIn(g) + 1) * Math.cos(a)], "glass-clear", 3.4, [0.3, 0.7], a));
  }
  out.push({ kind: "lathe", material: "hull-white", at: [0, 0], segs: 48, body: true, outline: true, profile: [[SPIN.hubR, -8], [SPIN.hubR, 8]] } as Lathe);
  return out;
}

void reach;

/** The section lines of a ring cut open at `az` degrees: the outline of its section, and the steps of the terraces and the canal, drawn flat in the plane of the cut. */
function sectionLines(g: Geo, y: number, az: number): Piece[] {
  const { nave, tread } = dims(g);
  const rg = ground(g);
  const at = (r: number, yy: number): Vec3 => [r * Math.sin(deg(az)), y + yy, r * Math.cos(deg(az))];
  const paths: Vec3[][] = [roundSection(g, 0).map(([r, yy]) => at(r, yy))];
  for (const s of [-1, 1]) {
    const steps: Vec3[] = [at(rg, 0), at(rg, s * nave)];
    for (let k = 1; k <= 3; k++) steps.push(at(rg - STEP * k, s * (nave + tread * (k - 1))), at(rg - STEP * k, s * (nave + tread * k)));
    paths.push(steps);
  }
  paths.push([at(rg, -1), at(rg - 0.4, -1), at(rg - 0.4, 1), at(rg, 1)]);
  return [seams("feature", paths)];
}

/** The ring opened for a section view, flat: the glass cut away over `gap` degrees each side of +Z, its orange frames and section lines at the cut, the floors, terrace treads and risers and the canal as bands, and no furnishing. This is the view drawn in the line look. */
export function sectionPieces(r: Ring, gap = 58): Piece[] {
  const g = geoOf(r);
  const out: Piece[] = [...glass(g, r.y, gap), ...(r.use === "hydro" ? hydroHall(g, r.y, gap, true) : townHall(g, r.y, r.use, gap, true))];
  const frame: Lathe = { kind: "lathe", material: "hull-orange", segs: 400, only: "mesh", arc: () => [-0.02, 0.02], profile: roundSection(g, 0, 0.35) };
  for (const a of [gap, 360 - gap]) out.push(...place([frame], { at: [0, r.y, 0], yaw: a }), ...sectionLines(g, r.y, a));
  return out;
}
