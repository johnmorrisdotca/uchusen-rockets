// Miyamoto's folding bird wing: one wing each side, rooted on the dorsal rim of the command citadel, clear of the glazed flank and of the starboard roll-out array. A jointed spar (shoulder, elbow, wrist) carries overlapping gold feathers, longest at the tip, with a bowed trailing edge. The elbow swings the outer arm back along the hull; the feathers ride with it. Pure: no three.js and no DOM.
import type { Piece, Plate, Vec3 } from "../../pieces.ts";
import { lampHalo } from "../lights.ts";
import { moving } from "../motion.ts";
import { cub, rod } from "./adapter.ts";

type V = Vec3;

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V): V => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return mul(a, 1 / l);
};
const lerp = (a: V, b: V, t: number): V => add(a, mul(sub(b, a), t));

/** Cell gaps on a feather, as weld lines across its sheet. */
function grid(spanU: number, spanV: number, nu: number, nv: number): [readonly [number, number], readonly [number, number]][] {
  const lines: [readonly [number, number], readonly [number, number]][] = [];
  const u0 = 0;
  const v0 = -spanV * 0.7;
  for (let i = 1; i < nu; i++) {
    const u = u0 + (spanU * i) / nu;
    lines.push([[u, v0], [u, v0 + spanV]]);
  }
  for (let j = 1; j < nv; j++) {
    const v = v0 + (spanV * j) / nv;
    lines.push([[u0 + spanU * 0.04, v], [u0 + spanU * 0.96, v]]);
  }
  return lines;
}

/** One flat gold feather: a white-backed sheet, gold on the sunward face, a bowed trailing edge, the gaps drawn as lines, and the edge clips that hold it to the spar. */
function feather(root: V, tip: V, chord: number, bow: number, lift: number, detail: number): Piece[] {
  const along = sub(tip, root);
  const length = Math.hypot(along[0], along[1], along[2]) || 1;
  const u = unit(along);
  let v = unit(sub([0, -1, 0], mul(u, dot([0, -1, 0], u))));
  if (cross(u, v)[2] < 0) v = mul(v, -1);
  const w = unit(cross(u, v));
  const spanV = chord + bow;
  const sheet: Plate = {
    kind: "plate", material: "gold", top: "gold",
    frame: { o: add(root, mul(w, lift)), u, v, w },
    outline: [[0, chord * 0.22], [0, -chord * 0.28], [length * 0.42, -(chord * 0.55 + bow)], [length * 0.78, -chord * 0.16], [length, chord * 0.04]],
    thickness: 0.1, plain: false, sheet: true, only: "mesh",
    ribs: grid(length, spanV, 4, 2),
  };
  const clips = detail > 0.5 ? 8 : 3;
  const out: Piece[] = [sheet, rod("hull-white", root, tip, 0.06, 5)];
  for (let i = 1; i <= clips; i++) out.push(box("copper", add(lerp(root, tip, i / (clips + 1)), mul(w, lift)), 0.07, 0.1, 0.05));
  return out;
}

const box = (material: Plate["material"], at: V, hx: number, hy: number, hz: number): Plate => cub(material, [at[0] - hx, at[0] + hx], [at[1] - hy, at[1] + hy], [at[2] - hz, at[2] + hz]);

/** Bolts in a ring, the hardware that holds a knuckle. */
function bolts(at: V, n: number, radius: number, material: Plate["material"]): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n;
    out.push(box(material, add(at, [Math.cos(a) * radius, Math.sin(a) * radius * 0.35, Math.sin(a) * radius]), 0.09, 0.09, 0.09));
  }
  return out;
}

/** One side. `sign` is −1 to port. The outer arm, from the elbow out, carries the move. */
function wing(sign: -1 | 1, detail: number): Piece[] {
  const s = sign;
  const name = sign < 0 ? "bird-port" : "bird-starboard";
  const shoulder: V = [s * 14, 324, 31];
  const elbow: V = [s * 17, 310, 31];
  const wrist: V = [s * 40, 328, 30.6];
  const tip: V = [s * 62, 348, 30.2];
  const base: V = [s * 12, 324, 18];
  const fixed: Piece[] = [
    rod("hull-grey", base, shoulder, 0.55, 8),
    rod("hull-grey-dark", shoulder, elbow, 0.42, 8),
    rod("hull-white", shoulder, elbow, 0.16, 6),
    box("panel-dark", lerp(base, shoulder, 0.45), 0.7, 0.35, 0.7),
    box("hazard", lerp(base, shoulder, 0.7), 0.5, 0.12, 0.55),
    box("hull-orange", shoulder, 0.55, 0.28, 0.45),
    rod("copper", add(base, [0, 0, 0.4]), add(elbow, [0, 0, 0.35]), 0.06, 6),
    ...bolts(shoulder, detail > 0.5 ? 8 : 4, 0.7, "hull-grey-dark"),
    ...bolts(elbow, detail > 0.5 ? 8 : 4, 0.62, "hull-grey"),
    ...lampHalo("window", add(shoulder, [0, 0, 0.5])),
  ];
  // a short gold covert on the inner arm, so the root is not a bare tube
  fixed.push(...feather(lerp(shoulder, elbow, 0.15), lerp(shoulder, elbow, 0.85), 3.2, 0.6, 0.2, detail));
  const outer: Piece[] = [
    rod("hull-grey", elbow, wrist, 0.38, 8),
    rod("hull-grey", wrist, tip, 0.3, 8),
    rod("hull-white", elbow, tip, 0.1, 6),
    rod("copper", add(elbow, [0, 0, 0.3]), add(tip, [0, 0, 0.25]), 0.05, 6),
    box("hull-grey-dark", wrist, 0.55, 0.32, 0.4),
    box("hull-orange", wrist, 0.28, 0.16, 0.22),
    box("lamp-amber", add(wrist, [0, 0, 0.45]), 0.12, 0.12, 0.12),
    box("lamp-amber", add(tip, [0, 0, 0.35]), 0.14, 0.14, 0.14),
    ...lampHalo("work", add(wrist, [0, 0, 0.7])),
    ...lampHalo("window", add(tip, [0, 0, 0.55])),
    ...bolts(wrist, detail > 0.5 ? 6 : 3, 0.5, "hull-grey-dark"),
  ];
  // primaries at the tip, longest; secondaries along the arm; coverts overlapping them near the elbow
  const aft: V = [0, -1, 0];
  const dir = unit(sub(tip, elbow));
  const primaries = [0.55, 0.68, 0.8, 0.92];
  const lengths = [12, 15, 18, 22];
  for (let i = 0; i < primaries.length; i++) {
    const at = lerp(elbow, tip, primaries[i]);
    const end = add(add(at, mul(dir, lengths[i])), mul(aft, lengths[i] * 0.45));
    outer.push(...feather(at, end, 3.6 + i * 0.35, 1.4, 0.12 + i * 0.05, detail));
    if (detail > 0.5) outer.push(box("copper", add(at, [0, 0, 0.2]), 0.08, 0.08, 0.08));
  }
  for (const [t, len] of [[0.2, 9], [0.38, 11], [0.55, 13]] as const) {
    const at = lerp(elbow, wrist, t);
    const end = add(add(at, mul(aft, len)), mul(dir, len * 0.3));
    outer.push(...feather(at, end, 3.2, 1.1, 0.08 + t * 0.2, detail));
  }
  for (const t of [0.08, 0.24]) {
    const at = lerp(elbow, wrist, t);
    const end = add(at, mul(aft, 5.5));
    outer.push(...feather(at, end, 2.2, 0.5, 0.32, detail));
  }
  return [...fixed, ...moving(outer, { name, pivot: elbow, axis: [0, 0, 1] })];
}

/**
 * Both wings, in the ship's metres. At rest the wings are open; the elbow motion folds each outer arm back along the hull.
 *
 * @param detail How much small hardware to build, 0.25 to 1.
 * @returns The pieces of both wings.
 */
export function birdWing(detail = 1): Piece[] {
  return [...wing(-1, detail), ...wing(1, detail)];
}
