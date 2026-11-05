// The small shapes the repair drone's code-made parts are made of: vectors, a cylinder along any line, a bevelled block in any frame, a bolt, a ring of bolts and a row of vents. Every one is a plain Piece, so the
// painted mesh and the two line looks come from the same description. Pure: no three.js and no DOM.
import type { MaterialName } from "../../materials.ts";
import type { Frame, Piece, Plate, Vec3 } from "../../pieces.ts";

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));
export const mix = (a: Vec3, b: Vec3, t: number): Vec3 => add(mul(a, 1 - t), mul(b, t));

/** A small seeded random generator, so a rebuild gives the same bytes. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two directions across a unit direction, the same two for the same direction. */
export function across(d: Vec3, hint: Vec3 = [0, 1, 0]): { v: Vec3; w: Vec3 } {
  const seed = Math.abs(dot(d, hint)) > 0.95 ? ([1, 0, 0] as Vec3) : hint;
  const w = unit(cross(seed, d));
  const v = unit(cross(d, w));
  return { v, w };
}

/** A round outline of `sides` points, radius r, for a plate. */
export const disc = (r: number, sides: number): [number, number][] => Array.from({ length: sides }, (_, i) => [r * Math.cos((2 * Math.PI * (i + 0.5)) / sides), r * Math.sin((2 * Math.PI * (i + 0.5)) / sides)]);

/** A cylinder from a to b, radius r. */
export function cyl(material: MaterialName, a: Vec3, b: Vec3, r: number, sides = 16, extra: Partial<Plate> = {}): Plate {
  const d = sub(b, a);
  const l = len(d) || 1e-6;
  const w = mul(d, 1 / l);
  const { v } = across(w);
  const u = cross(v, w);
  return { kind: "plate", material, frame: { o: mix(a, b, 0.5), u, v, w }, outline: disc(r, sides), thickness: l, plain: true, ...extra };
}

/** A tapered or plain round tube of several steps: radii at points along a line, each step a cylinder. */
export function stack(material: MaterialName, a: Vec3, dir: Vec3, steps: readonly (readonly [number, number, MaterialName?])[], sides = 20): Plate[] {
  const out: Plate[] = [];
  let at = 0;
  const d = unit(dir);
  for (const [r, l, m] of steps) {
    out.push(cyl(m ?? material, add(a, mul(d, at)), add(a, mul(d, at + l)), r, sides));
    at += l;
  }
  return out;
}

/** A chamfered rectangle outline, `c` cut off every corner. */
export const chamfered = (w: number, h: number, c: number): [number, number][] => {
  const [x, y] = [w / 2, h / 2];
  const k = Math.min(c, x * 0.9, y * 0.9);
  return [[-x + k, -y], [x - k, -y], [x, -y + k], [x, y - k], [x - k, y], [-x + k, y], [-x, y - k], [-x, -y + k]];
};

/** A block: its centre, its frame (u, v, w directions) and its size along each, corners cut by `c`. */
export function block(material: MaterialName, centre: Vec3, f: { u: Vec3; v: Vec3 }, size: Vec3, c = 0.004, extra: Partial<Plate> = {}): Plate {
  const w = cross(f.u, f.v);
  return { kind: "plate", material, frame: { o: centre, u: f.u, v: f.v, w }, outline: chamfered(size[0], size[1], c), thickness: size[2], plain: true, ...extra };
}

/** A frame from a point, a direction and a hint for which way is up. */
export function frameAt(o: Vec3, d: Vec3, hint: Vec3 = [0, 1, 0]): Frame {
  const { v, w } = across(unit(d), hint);
  return { o, u: unit(d), v, w };
}

/** The pieces that are fine detail (bolts, slots): the painted model keeps them, the line looks and the code-made mesh leave them out to stay inside the mesh limit. */
export const FINE = new WeakSet<Piece>();
export const fine = <T extends Piece>(piece: T): T => {
  FINE.add(piece);
  return piece;
};

/** A bolt head standing out of a surface: a short cylinder along the normal. */
export const bolt = (at: Vec3, n: Vec3, r = 0.006, h = 0.005, material: MaterialName = "engine-metal", sides = 8): Plate => fine(cyl(material, at, add(at, mul(unit(n), h)), r, sides));

/** Bolts on a circle in a plane: `count` of them round `centre`, radius `ring`, standing out along the normal `n`. */
export function boltRing(centre: Vec3, n: Vec3, ring: number, count: number, r = 0.005, h = 0.004, material: MaterialName = "engine-metal", phase = 0): Plate[] {
  const { v, w } = across(unit(n));
  return Array.from({ length: count }, (_, i) => {
    const a = phase + (2 * Math.PI * i) / count;
    return bolt(add(centre, add(mul(v, ring * Math.cos(a)), mul(w, ring * Math.sin(a)))), n, r, h, material);
  });
}

/** A row of slots, each a thin dark block, `count` of them along `along`, `step` apart from `from`, lying on a surface with normal `n`. */
export function vents(from: Vec3, along: Vec3, n: Vec3, count: number, step: number, slot: readonly [number, number], material: MaterialName = "soot", depth = 0.002): Plate[] {
  const a = unit(along);
  const nn = unit(n);
  const side = unit(cross(nn, a));
  return Array.from({ length: count }, (_, i) => fine(block(material, add(add(from, mul(a, step * i)), mul(nn, depth / 2)), { u: side, v: a }, [slot[0], slot[1], depth], 0.0015)));
}

/** A panel on a surface: a block just standing off it, with an optional frame of a second material. */
export function panel(material: MaterialName, centre: Vec3, f: { u: Vec3; v: Vec3 }, size: readonly [number, number], lift = 0.004): Plate {
  return block(material, centre, f, [size[0], size[1], lift], Math.min(size[0], size[1]) * 0.12);
}

/** A bar bent through points: each leg a cylinder with a ball at every joint. */
export function pipe(material: MaterialName, points: readonly Vec3[], r: number, sides = 10): Plate[] {
  const out: Plate[] = [];
  for (let i = 0; i + 1 < points.length; i++) out.push(cyl(material, points[i], points[i + 1], r, sides));
  for (let i = 1; i + 1 < points.length; i++) out.push(cyl(material, sub(points[i], mul(unit(sub(points[i + 1], points[i - 1])), r * 0.9)), add(points[i], mul(unit(sub(points[i + 1], points[i - 1])), r * 0.9)), r, sides));
  return out;
}

/** The pieces moved up or down by `dy` metres. */
export function lifted(pieces: readonly Piece[], dy: number): Piece[] {
  return pieces.map((p): Piece => {
    if (p.kind === "plate") return { ...p, frame: { ...p.frame, o: [p.frame.o[0], p.frame.o[1] + dy, p.frame.o[2]] } };
    if (p.kind === "lathe") return { ...p, profile: p.profile.map(([r, y]) => [r, y + dy] as const) };
    return { ...p, paths: p.paths.map((path) => path.map((q): Vec3 => [q[0], q[1] + dy, q[2]])) };
  });
}
