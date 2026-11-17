// MODULES-489 concept pictures (not part of the package): Kaminari's giant blanket wings on a telescoping lattice mast (ISS P6 kind) and the square sail on four diagonal booms, stowed, half out and open, at true size on the ship.
// `node scripts/kaminari-arrays-concept-shots.ts <folder>` writes the .glb files and `jobs.json`; `node scripts/concept-render.ts <folder>/jobs.json <folder>/png` draws them. The geometry is a CONCEPT of the mechanism.
// Local frame of a wing: the mast stands along +x from the mount, the blankets lie in the x-y plane. Metres.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { meshOf, type Piece, type Plate } from "../src/model/pieces.ts";
import { pipe, type MaterialName } from "../src/model/fleet/solids.ts";

type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(...a);
const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const ease = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A flat panel from four corners (taken as planar; a little warp is averaged out): a plate with a cell grid on its face. */
function panel(material: MaterialName, c: readonly [V3, V3, V3, V3], cells: [number, number], back: MaterialName = "hull-grey"): Plate {
  const o = mul(add(add(c[0], c[1]), add(c[2], c[3])), 0.25);
  const along = unit(sub(mul(add(c[1], c[2]), 0.5), mul(add(c[0], c[3]), 0.5)));
  const across = unit(sub(c[3], c[0]));
  const w = unit(crs(along, across));
  const v = crs(w, along);
  const outline = c.map((p): [number, number] => [dot(sub(p, o), along), dot(sub(p, o), v)]);
  const ribs: [[number, number], [number, number]][] = [];
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  // cell lines: rows across the panel (corner 0 to 3 and 1 to 2) and strings along it (0 to 1 and 3 to 2)
  for (let i = 1; i < cells[0]; i++) ribs.push([lerp(outline[0]!, outline[1]!, i / cells[0]), lerp(outline[3]!, outline[2]!, i / cells[0])]);
  for (let j = 1; j < cells[1]; j++) ribs.push([lerp(outline[0]!, outline[3]!, j / cells[1]), lerp(outline[1]!, outline[2]!, j / cells[1])]);
  return { kind: "plate", material, top: material, frame: { o, u: along, v, w }, outline, thickness: 0.35, ribs, plain: false, ...(back === material ? {} : {}) };
}


const fixed = (m: MaterialName, a: V3, b: V3, r: number, sides = 10): Plate => pipe(m, a, b, r, sides);

export interface Wing {
  /** Mast length when fully out, metres (the wing's length). */
  length: number;
  /** One blanket's width either side of the mast. */
  width: number;
  /** 0 stowed, 1 out. */
  out: number;
}

/** A blanket wing on a telescoping lattice mast: two blankets (one each side) that concertina along the mast, a canister at the root, battens every pitch, a tip cap with lamps, the mast in telescoping stages. */
export function wing(w: Wing): Piece[] {
  const out: Piece[] = [];
  const push = (...p: Piece[]): void => void out.push(...p);
  const stowedLen = 50;
  const e = stowedLen + (w.length - stowedLen) * ease(0, 1, w.out);
  const mw = 7; // the mast is a square lattice 14 m across
  const stages = 5;
  // the canister and the rotary joint at the root
  push(fixed("hull-grey-dark", [-6, 0, 0], [0, 0, 0], 18, 28), fixed("hull-white", [0, 0, 0], [stowedLen * 0.18, 0, 0], 16, 28));
  // the mast: nested square stages, each a share of the length, each a lattice of four longerons with frames and diagonals
  for (let s = 0; s < stages; s++) {
    const x0 = (s * (e - stowedLen / stages)) / stages * (stages / (stages - 1 + 1e-9));
    const a = Math.min(e, s === 0 ? 0 : (s * (e - stowedLen / stages)) / (stages - 1));
    const b = Math.min(e, a + stowedLen / stages + (e - stowedLen) / stages);
    void x0;
    const k = 1 - s * 0.08;
    const half = mw * k;
    const corners = (x: number): V3[] => [[x, half, half], [x, -half, half], [x, -half, -half], [x, half, -half]];
    const ca = corners(a);
    const cb = corners(b);
    for (let c = 0; c < 4; c++) push(fixed(s % 2 === 0 ? "hull-white" : "hull-grey", ca[c]!, cb[c]!, 0.7 * k));
    const bays = Math.max(1, Math.round((b - a) / (mw * 1.8)));
    for (let q = 0; q <= bays; q++) {
      const cc = corners(a + ((b - a) * q) / bays);
      for (let c = 0; c < 4; c++) push(fixed("hull-grey", cc[c]!, cc[(c + 1) % 4]!, 0.3, 8));
      if (q < bays) {
        const cn = corners(a + ((b - a) * (q + 1)) / bays);
        for (let c = 0; c < 4; c++) push(fixed("hull-grey-dark", cc[c]!, cn[(c + 1) % 4]!, 0.24, 8));
      }
    }
    // the sleeve where one stage slides into the next
    push(fixed("hull-grey-dark", [a, 0, 0], [Math.min(a + 2.2, e), 0, 0], mw * 1.55, 20));
  }
  // the blankets: panels `pitch` long and `width` wide each side; those that have paid out lie flat, the rest are folded in the canister as a stack (two faces to a pleat)
  const pitch = 12;
  const count = Math.round(w.length / pitch);
  const thick = 0.35;
  for (const side of [1, -1]) {
    // the tip batten, the outer edge member and the deployed panels
    for (let k = 0; k < count; k++) {
      const x0 = k * pitch;
      const x1 = x0 + pitch;
      if (x1 <= e) {
        push(panel("solar", [[x0 + 0.3, side * (mw + 1.5), 0.9], [x1 - 0.3, side * (mw + 1.5), 0.9], [x1 - 0.3, side * (mw + 1.5 + w.width), 0.9], [x0 + 0.3, side * (mw + 1.5 + w.width), 0.9]], [3, 10]));
        push(fixed("hull-grey", [x1, side * (mw + 1.5), 0.9], [x1, side * (mw + 1.5 + w.width), 0.9], 0.5, 8));
      } else if (x0 < e) {
        // the panel being paid out: standing partly folded, hinged on the last batten
        const frac = (e - x0) / pitch;
        const lift = Math.sqrt(Math.max(0, 1 - frac * frac)) * pitch;
        push(panel("solar", [[x0 + 0.3, side * (mw + 1.5), 0.9], [x0 + 0.3 + frac * (pitch - 0.6), side * (mw + 1.5), 0.9 + lift], [x0 + 0.3 + frac * (pitch - 0.6), side * (mw + 1.5 + w.width), 0.9 + lift], [x0 + 0.3, side * (mw + 1.5 + w.width), 0.9]], [3, 10]));
      } else {
        // folded in the stack: thin panels standing on edge, one every 0.9 m along the canister
        const idx = k - Math.max(0, Math.round(e / pitch));
        const xs = Math.min(stowedLen - 2, 1 + (idx * (stowedLen - 4)) / Math.max(1, count - Math.round(e / pitch)));
        push({ kind: "plate", material: "solar", top: "solar", frame: { o: [xs, side * (mw + 1.5 + w.width / 2), 0.9], u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] }, outline: [[-w.width / 2, -pitch / 2], [w.width / 2, -pitch / 2], [w.width / 2, pitch / 2], [-w.width / 2, pitch / 2]], thickness: thick, plain: true } as Plate);
      }
    }
    // the edge members along the blanket and the guide wires
    push(fixed("hull-white", [0, side * (mw + 1.5), 0.9], [Math.min(e, w.length), side * (mw + 1.5), 0.9], 0.5), fixed("hull-white", [0, side * (mw + 1.5 + w.width), 0.9], [Math.min(e, w.length), side * (mw + 1.5 + w.width), 0.9], 0.5));
    // a crossbar from the mast to each blanket at every fifth batten
    for (let k = 0; k * pitch * 5 < e; k++) push(fixed("hull-grey", [k * pitch * 5, side * mw, 0], [k * pitch * 5, side * (mw + 1.5), 0.9], 0.4, 8));
  }
  // the tip cap: a head and two lamps, carried out at the end of the mast
  push(fixed("hull-orange", [e, 0, 0], [e + 3, 0, 0], mw * 1.2, 20), fixed("lamp-amber", [e + 3, 0, 0], [e + 6, 0, 0], 2.2, 12));
  return out;
}

export interface Sail {
  /** Half the diagonal's length (boom length), metres. */
  boom: number;
  out: number;
}

/** A square sail on four diagonal booms (ACS3 and IKAROS kind): a creased silver film, four booms unrolled from a canister at the middle, a tip lamp on each boom. Stowed it is a canister 50 m long. */
export function sail(s: Sail): Piece[] {
  const out: Piece[] = [];
  const push = (...p: Piece[]): void => void out.push(...p);
  const u = ease(0, 1, s.out);
  const r = 40 + (s.boom - 40) * u;
  push(fixed("hull-grey-dark", [0, 0, -3], [0, 0, 1], 22, 28), fixed("hull-white", [0, 0, 1], [0, 0, 40 - 38 * u], 18, 28), fixed("hull-orange", [0, 0, 40 - 38 * u], [0, 0, 42 - 38 * u], 19, 28));
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    const dir: V3 = [Math.cos(a), Math.sin(a), 0];
    const tip = mul(dir, r);
    const z = 40 * (1 - u) - 38 * u;
    if (u > 0.02) {
      push(fixed("hull-white", [dir[0] * 18, dir[1] * 18, z * 0.1], [tip[0], tip[1], 0], 0.9));
      push(fixed("lamp-amber", [tip[0], tip[1], 0], [tip[0] + dir[0] * 2, tip[1] + dir[1] * 2, 0], 1.3, 8));
    }
  }
  if (u > 0.02) {
    // the film: four triangles from the middle between neighbouring booms, creased into facets
    for (let k = 0; k < 4; k++) {
      const a0 = Math.PI / 4 + (k * Math.PI) / 2;
      const a1 = a0 + Math.PI / 2;
      const p0: V3 = [Math.cos(a0) * r, Math.sin(a0) * r, 0];
      const p1: V3 = [Math.cos(a1) * r, Math.sin(a1) * r, 0];
      const c0: V3 = [Math.cos(a0) * 20, Math.sin(a0) * 20, 0];
      const c1: V3 = [Math.cos(a1) * 20, Math.sin(a1) * 20, 0];
      const facets: [V3, V3, V3][] = [];
      const n = 14;
      for (let q = 0; q < n; q++) {
        const t0 = q / n;
        const t1 = (q + 1) / n;
        const mid = (a: V3, b: V3, t: number): V3 => add(mul(a, 1 - t), mul(b, t));
        const crinkle = (q % 2 === 0 ? 1 : -1) * 1.1;
        const A = add(mid(c0, c1, t0), [0, 0, crinkle]);
        const B = add(mid(p0, p1, t0), [0, 0, -crinkle]);
        const C = add(mid(p0, p1, t1), [0, 0, crinkle]);
        const D = add(mid(c0, c1, t1), [0, 0, -crinkle]);
        facets.push([A, B, C], [A, C, D]);
      }
      const o: V3 = mul(add(add(p0, p1), add(c0, c1)), 0.25);
      push({ kind: "plate", material: "foil", top: "foil", frame: { o, u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [p0, p1, c1, c0].map((p) => [p[0] - o[0], p[1] - o[1]] as [number, number]), thickness: 0.2, plain: true, sheet: true, facets: facets.map((f) => f.map((p) => sub(p, o)) as [V3, V3, V3]) } as Plate);
    }
  }
  return out;
}

const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/kaminari-arrays-concept-shots.ts <folder>");
mkdirSync(out, { recursive: true });
interface Shot { name: string; eye: V3; target: V3; fov?: number; up?: V3; size?: [number, number]; look?: "painted" | "line" | "lit"; shadow?: number; sunDir?: V3; ortho?: number }
interface Job { glb: string; more?: { glb: string; at: V3; turn?: number }[]; shots: Shot[] }
const jobs: Job[] = [];
const saveGlb = (name: string, pieces: Piece[]): string => {
  const file = join(out, `${name}.glb`);
  writeFileSync(file, toGlb([{ name, mesh: meshOf(pieces), at: [0, 0, 0] }]).bytes);
  return file;
};
const WL = 600;
const WW = 60;
const wf: Record<string, string> = {};
for (const [state, v] of [["stowed", 0], ["half", 0.5], ["open", 1]] as const) wf[state] = saveGlb(`wing-${state}`, wing({ length: WL, width: WW, out: v }));
jobs.push({ glb: wf["half"]!, more: [{ glb: wf["stowed"]!, at: [0, -260, 0] }, { glb: wf["open"]!, at: [0, 260, 0] }], shots: [
  { name: "wing-states-top", eye: [350, 0, 1700], target: [330, 0, 0], up: [1, 0, 0], fov: 32, size: [2000, 900], look: "painted", shadow: 900, sunDir: [0.2, 0.1, 1] },
  { name: "wing-states-3q", eye: [-300, -1200, 700], target: [330, 0, 0], up: [0, 0, 1], fov: 36, size: [2000, 1000], look: "painted", shadow: 900, sunDir: [0.4, -0.5, 0.8] },
] });
jobs.push({ glb: wf["open"]!, shots: [
  { name: "wing-open-3q", eye: [-250, -700, 420], target: [300, 0, 0], up: [0, 0, 1], fov: 36, size: [1800, 1000], look: "painted", shadow: 650, sunDir: [0.4, -0.5, 0.8] },
  { name: "wing-open-line", eye: [-250, -700, 420], target: [300, 0, 0], up: [0, 0, 1], fov: 36, size: [1800, 1000], look: "line", shadow: 650 },
] });
jobs.push({ glb: wf["half"]!, shots: [{ name: "wing-half-root", eye: [160, -130, 90], target: [140, 0, 0], up: [0, 0, 1], fov: 40, size: [1600, 1000], look: "painted", shadow: 200, sunDir: [0.4, -0.5, 0.8] }] });
const sf: Record<string, string> = {};
for (const [state, v] of [["stowed", 0], ["half", 0.5], ["open", 1]] as const) sf[state] = saveGlb(`sail-${state}`, sail({ boom: 250, out: v }));
jobs.push({ glb: sf["half"]!, more: [{ glb: sf["stowed"]!, at: [-620, 0, 0] }, { glb: sf["open"]!, at: [620, 0, 0] }], shots: [{ name: "sail-states", eye: [0, -1700, 900], target: [0, 0, 0], up: [0, 0, 1], fov: 30, size: [2000, 900], look: "painted", shadow: 900, sunDir: [0.3, -0.4, 0.9] }] });
jobs.push({ glb: sf["open"]!, shots: [{ name: "sail-open-3q", eye: [500, -650, 420], target: [0, 0, 0], up: [0, 0, 1], fov: 34, size: [1600, 1000], look: "painted", shadow: 400, sunDir: [0.3, -0.4, 0.9] }] });
// on Kaminari: two pairs of blanket wings along the hull, each 600 x 120 m open, folding to about 50 m (John's size rule, 2026-11-06), and the sail
{
  const k = build({ rocket: "fleet-kaminari", variant: "fleet-kaminari" }, { detail: "coarse" });
  const kfile = join(out, "kaminari.glb");
  writeFileSync(kfile, k.glb().bytes);
  const place = (o: number, y: number, side: 1 | -1): { glb: string; at: V3; turn?: number } => ({ glb: saveGlb(`kw-${o}-${y}-${side}`, wing({ length: WL, width: WW, out: o }).map((p) => p)), at: [0, y, 0], turn: side });
  void place;
  // each wing lies along the ship's x axis (out to the side); a second glb mirrors it with turn
  for (const [state, o] of [["stowed", 0], ["open", 1]] as const) {
    const wg = saveGlb(`kw-${state}`, wing({ length: WL, width: WW, out: o }));
    const more: { glb: string; at: V3; turn?: number }[] = [];
    for (const y of [260, 520, 1300, 1560]) more.push({ glb: wg, at: [30, y, 30] }, { glb: wg, at: [-30, y, 30], turn: Math.PI });
    jobs.push({ glb: kfile, more, shots: [
      { name: `kaminari-wings-${state}-top`, eye: [0, 910, 3600], target: [0, 910, 0], up: [0, 1, 0], ortho: 2000, size: [1700, 2000], look: "painted", shadow: 1400, sunDir: [0.3, -0.2, 1] },
      { name: `kaminari-wings-${state}-3q`, eye: [1700, -1300, 1200], target: [0, 910, 0], up: [0, 0, 1], fov: 36, size: [2000, 1100], look: "painted", shadow: 1400, sunDir: [0.5, -0.4, 0.8] },
    ] });
  }
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs, null, 1));
console.log(`${jobs.length} jobs, ${jobs.reduce((n, j) => n + j.shots.length, 0)} shots in ${out}`);
