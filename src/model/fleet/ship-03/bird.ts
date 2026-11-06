// Miyamoto's folding bird wing: one wing each side, rooted on the dorsal rim of the command citadel, clear of the glazed flank and of the starboard roll-out array. Each wing is one continuous surface of overlapping cell sheets on a box-truss spar with a shoulder, an elbow and a wrist. The elbow swings the outer arm back along the hull. Pure: no three.js and no DOM.
import type { Piece, Plate, Vec3 } from "../../pieces.ts";
import { lampHalo } from "../lights.ts";
import { moving } from "../motion.ts";
import { cub, rod } from "./adapter.ts";

type V = Vec3;

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return mul(a, 1 / l);
};
const lerp = (a: V, b: V, t: number): V => add(a, mul(sub(b, a), t));

const box = (material: Plate["material"], at: V, hx: number, hy: number, hz: number): Plate => cub(material, [at[0] - hx, at[0] + hx], [at[1] - hy, at[1] + hy], [at[2] - hz, at[2] + hz]);

/** One cell sheet, a quad from the spar back to the trailing edge. Neighbouring sheets share their corners, so the open wing is one surface and the trailing edge is one curve. */
function band(a: V, b: V, aAft: V, bAft: V, lift: number): Plate {
  const up = (p: V): V => [p[0], p[1], p[2] + lift];
  const A = up(a);
  const B = up(b);
  const C = up(bAft);
  const D = up(aAft);
  // two triangles of the quad, sunward face up, on either side of the ship
  const facing = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
  const facets: Plate["facets"] = facing > 0 ? [[A, B, C], [A, C, D]] : [[A, C, B], [A, D, C]];
  return {
    kind: "plate", material: "cell-gold", top: "cell-gold",
    frame: { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] },
    outline: [[A[0], A[1]], [B[0], B[1]], [C[0], C[1]], [D[0], D[1]]],
    facets,
    thickness: 0.25, plain: true, sheet: true, only: "mesh",
  };
}

/** A box-truss boom between two joints: three longerons and a frame every few metres, thick enough to carry the wing. */
function truss(a: V, b: V, thick: number, into: Piece[]): void {
  const span = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(2, Math.round(span / 8));
  const side = unit(cross(sub(b, a), [0, 0, 1]));
  const corner = (p: V, i: number): V => {
    const [sx, sz] = [[1, 1], [-1, 1], [0, -1.15]][i];
    return add(p, add(mul(side, sx * thick), [0, 0, sz * thick]));
  };
  for (let i = 0; i < 3; i++) into.push(rod("hull-grey", corner(a, i), corner(b, i), thick * 0.42, 6));
  for (let k = 0; k <= n; k++) {
    const p = lerp(a, b, k / n);
    const c = [0, 1, 2].map((i) => corner(p, i));
    into.push(rod("hull-grey-dark", c[0], c[1], thick * 0.2, 5));
    into.push(rod("hull-grey-dark", c[1], c[2], thick * 0.2, 5));
    into.push(rod("hull-white", c[2], c[0], thick * 0.2, 5));
    if (k % 2 === 0) into.push(box("copper", add(p, [0, 0, thick]), 0.28, 0.28, 0.28));
  }
}

/** Sheets along a spar. `aftAt` is how far the trailing edge sits aft of the spar, and it bows, so the edge is one curve. Each sheet overlaps the next by sharing its corner. */
function feathers(from: V, to: V, count: number, aftAt: (t: number) => number, sign: number, into: Piece[]): void {
  const back = (at: V, aft: number): V => [at[0] + sign * aft * 0.04, at[1] - aft, at[2]];
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    const a = lerp(from, to, t0);
    const b = lerp(from, to, t1);
    into.push(band(a, b, back(a, aftAt(t0)), back(b, aftAt(t1)), 0.4 + i * 0.03));
  }
}

/** One side. `sign` is −1 to port. The outer arm, from the elbow out, carries the move. */
function wing(sign: -1 | 1): Piece[] {
  const s = sign;
  const name = sign < 0 ? "bird-port" : "bird-starboard";
  // 228 m from the shoulder to the tip: six tenths of the 380 m hull. The root sheets reach 76 m aft.
  const shoulder: V = [s * 26, 336, 33];
  const elbow: V = [s * 74, 328, 33];
  const wrist: V = [s * 164, 346, 32.2];
  const tip: V = [s * 254, 362, 31.4];
  const foot: V = [s * 20, 338, 18];
  const fixed: Piece[] = [
    rod("hull-grey", foot, shoulder, 2.2, 8),
    rod("hull-grey-dark", add(foot, [0, 2, 0]), add(shoulder, [0, 2, 0]), 1.2, 6),
    box("panel-dark", lerp(foot, shoulder, 0.55), 1.1, 0.45, 1.1),
    box("hazard", lerp(foot, shoulder, 0.78), 0.9, 0.2, 0.9),
    box("hull-orange", shoulder, 4.2, 2.6, 3.4),
    ...lampHalo("window", add(shoulder, [0, 0, 2.4])),
  ];
  truss(shoulder, elbow, 3.2, fixed);
  feathers(shoulder, elbow, 4, (t) => 76 - 16 * t + Math.sin(t * Math.PI) * 6, s, fixed);
  const outer: Piece[] = [
    box("hull-orange", elbow, 3.6, 2.4, 3.2),
    box("hull-grey-dark", wrist, 2.8, 1.8, 2.4),
    box("hull-orange", wrist, 1.2, 0.7, 1),
    box("lamp-amber", add(tip, [0, 0, 1.6]), 0.45, 0.45, 0.45),
    ...lampHalo("window", add(tip, [0, 0, 2.2])),
  ];
  truss(elbow, wrist, 2.8, outer);
  truss(wrist, tip, 2.2, outer);
  feathers(elbow, tip, 12, (t) => 60 - 36 * t + Math.sin(t * Math.PI) * 14, s, outer);
  return [...fixed, ...moving(outer, { name, pivot: elbow, axis: [0, 0, 1] })];
}

/**
 * Both wings, in the ship's metres. At rest the wings are open. The elbow motion folds each outer arm back along the hull, outside it.
 *
 * @param _detail Kept so the part can ask for a level; the wing is the same at every level.
 * @returns The pieces of both wings.
 */
export function birdWing(_detail = 1): Piece[] {
  return [...wing(-1), ...wing(1)];
}
