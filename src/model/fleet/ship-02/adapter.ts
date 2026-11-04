// The one file Ship 02's parts build with. Every shape a module uses comes through here, so that when the shared module kit (MODULES-407, src/model/fleet/kit.ts) lands, swapping to it is a change
// to this file and not to the modules. Plain numbers in metres; no randomness except a seeded generator, so the same ship always gives the same pieces. Pure: no three.js.
import { detail } from "../../detail.ts";
import type { MaterialName } from "../../materials.ts";
import { type Lathe, type Piece, type Plate, type Vec3 } from "../../pieces.ts";

export type { Lathe, MaterialName, Piece, Vec3 };

/** A small seeded generator (mulberry32): the same seed always gives the same run of numbers. */
export interface Rng {
  next: () => number;
  range: (a: number, b: number) => number;
  int: (a: number, b: number) => number;
  pick: <T>(list: readonly T[]) => T;
  chance: (p: number) => boolean;
}

export function rng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, range: (a, b) => a + (b - a) * next(), int: (a, b) => a + Math.floor(next() * (b - a + 1)), pick: (list) => list[Math.floor(next() * list.length)], chance: (p) => next() < p };
}

/** The usual plating tones: mostly near-identical greys with a little white and orange, so a hull reads as plates of one metal and not as a patchwork. */
export const PLATE: readonly MaterialName[] = ["hull-white", "hull-white", "hull-white-worn", "hull-grey", "hull-white", "hull-white-worn", "hull-grey", "hull-grey-dark", "hull-orange"];

/** `drawn`: it is part of the line drawings as well as the 3D view. Small detail is left out of the drawings, so a drawing stays light. */
const only = (drawn: boolean): Pick<Plate, "only"> => (drawn ? {} : { only: "mesh" });

/** A piece that only the line drawings show: a simple stand-in for what the 3D view draws in detail, so a drawing stays light. */
export const forDrawing = <T extends Piece>(piece: T): T => ({ ...piece, only: "drawing" });

/** An axis-aligned box: centre `c`, sizes `s` along x, y and z. */
const AXES = { u: [1, 0, 0] as Vec3, v: [0, 1, 0] as Vec3, w: [0, 0, 1] as Vec3 };
const outlines = new Map<string, readonly (readonly [number, number])[]>();
/** The outline of a box's face, shared by every box of the same size: a ship of a hundred thousand boxes keeps a few thousand of these. */
function rectangle(sx: number, sy: number): readonly (readonly [number, number])[] {
  const key = `${sx}/${sy}`;
  let outline = outlines.get(key);
  if (!outline) {
    outline = [[-sx / 2, -sy / 2], [sx / 2, -sy / 2], [sx / 2, sy / 2], [-sx / 2, sy / 2]];
    outlines.set(key, outline);
  }
  return outline;
}

export function box(material: MaterialName, c: Vec3, s: Vec3, drawn = false): Plate {
  return { kind: "plate", material, frame: { o: c, ...AXES }, outline: rectangle(s[0], s[1]), thickness: s[2], plain: true, ...only(drawn) };
}

/** A box between x, y and z limits. */
export const span = (material: MaterialName, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, drawn = false): Plate => box(material, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [x1 - x0, y1 - y0, z1 - z0], drawn);

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A round strut along a line from a to b, as thick as the larger of `w` and `d`: every diagonal and brace is a tube and never a square bar. */
export function beam(material: MaterialName, a: Vec3, b: Vec3, w: number, d = w, drawn = false): Plate {
  return pipe(material, a, b, Math.max(w, d) / 2, 12, drawn);
}

/** A round pipe, as a prism of `sides` flats, from a to b. */
export function pipe(material: MaterialName, a: Vec3, b: Vec3, r: number, sides = 8, drawn = false): Plate {
  const w = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  const seed: Vec3 = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(seed, w));
  const v = cross(w, u);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  // round up close, a few flats at a distance
  // a piece the drawings carry keeps eight flats, so a drawing stays light; the 3D-only pipes are the round ones
  const n = drawn || detail.level === "coarse" ? Math.min(sides, 8) : Math.max(sides, 14);
  const outline: [number, number][] = [];
  for (let i = 0; i < n; i++) outline.push([r * Math.cos((i / n) * 2 * Math.PI + Math.PI / n), r * Math.sin((i / n) * 2 * Math.PI + Math.PI / n)]);
  return { kind: "plate", material, frame: { o: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], u, v, w }, outline, thickness: length, plain: true, ...only(drawn) };
}

/** A flat polygon in the x and z plane, stood from y0 to y1: a shield plate, a deck, a hull ring. */
export function slab(material: MaterialName, outline: readonly (readonly [number, number])[], y0: number, y1: number, at: readonly [number, number] = [0, 0], drawn = false): Plate {
  return { kind: "plate", material, frame: { o: [at[0], (y0 + y1) / 2, at[1]], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline, thickness: y1 - y0, plain: true, ...only(drawn) };
}

/** A regular polygon of `sides` corners, `r` to a corner, the first at `turn` radians. */
export function ngon(sides: number, r: number, turn = Math.PI / sides): [number, number][] {
  return Array.from({ length: sides }, (_, i) => [r * Math.sin(turn + (i / sides) * 2 * Math.PI), r * Math.cos(turn + (i / sides) * 2 * Math.PI)]);
}

type Extra = Partial<Omit<Lathe, "kind" | "material" | "profile">>;

/** A solid cylinder standing on the y axis at `at`, from y0 to y1, with flat ends. */
export const cyl = (material: MaterialName, at: readonly [number, number], r: number, y0: number, y1: number, segs = 20, extra: Extra = {}): Lathe => ({ kind: "lathe", material, at, segs, only: "mesh", profile: [[0.001, y0], [r, y0], [r, y1], [0.001, y1]], ...extra });

/** A cylinder with a drawing too. */
export const drum = (material: MaterialName, at: readonly [number, number], r: number, y0: number, y1: number, segs = 28, extra: Extra = {}): Lathe => ({ kind: "lathe", material, at, segs, outline: true, profile: [[0.001, y0], [r, y0], [r, y1], [0.001, y1]], ...extra });

/** A ring of rectangular section: from radius r0 to r1, from y0 to y1, round `at`. The whole of a habitat ring, a bearing, a coil. */
export const ring = (material: MaterialName, at: readonly [number, number], r0: number, r1: number, y0: number, y1: number, segs = 36, extra: Extra = {}): Lathe => ({ kind: "lathe", material, at, segs, only: "mesh", profile: [[r0, y0], [r1, y0], [r1, y1], [r0, y1], [r0, y0]], ...extra });

/** A body of revolution through (radius, y) points, going up the outside. */
export const revolve = (material: MaterialName, at: readonly [number, number], profile: readonly (readonly [number, number])[], segs = 28, extra: Extra = {}): Lathe => ({ kind: "lathe", material, at, segs, only: "mesh", profile, ...extra });

/** Pieces moved by (dx, dy, dz): for building a thing once and standing it in several places. Lathe arcs and leans are kept as they are. */
export function shifted(pieces: readonly Piece[], dx: number, dy: number, dz: number): Piece[] {
  const at = (p: Vec3): Vec3 => [p[0] + dx, p[1] + dy, p[2] + dz];
  return pieces.map((piece): Piece => {
    if (piece.kind === "plate") return { ...piece, frame: { ...piece.frame, o: at(piece.frame.o) } };
    if (piece.kind === "lines") return { ...piece, paths: piece.paths.map((path) => path.map(at)) };
    const [a, b] = piece.at ?? [0, 0];
    return { ...piece, at: [a + dx, b + dz], profile: piece.profile.map(([r, y]) => [r, y + dy] as const), ...(piece.arc ? { arc: (y: number) => piece.arc!(y - dy) } : {}), ...(piece.welds ? { welds: piece.welds.map((y) => y + dy) } : {}), ...(piece.rings ? { rings: piece.rings.map((y) => y + dy) } : {}) };
  });
}

/** Pieces turned about the y axis by `turn` radians, then shifted: for mirrored and rotated copies. Not for lathes with an arc. */
export function turned(pieces: readonly Piece[], turn: number, dx = 0, dz = 0): Piece[] {
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  const spin = ([a, b, d]: Vec3): Vec3 => [a * c + d * s, b, -a * s + d * c];
  const at = (p: Vec3): Vec3 => {
    const q = spin(p);
    return [q[0] + dx, q[1], q[2] + dz];
  };
  return pieces.map((piece): Piece => {
    if (piece.kind === "plate") return { ...piece, frame: { o: at(piece.frame.o), u: spin(piece.frame.u), v: spin(piece.frame.v), w: spin(piece.frame.w) } };
    if (piece.kind === "lines") return { ...piece, paths: piece.paths.map((path) => path.map(at)) };
    const [a, b] = piece.at ?? [0, 0];
    const q = at([a, 0, b]);
    return { ...piece, at: [q[0], q[2]] };
  });
}

/** Pieces mirrored across the x = 0 plane (x becomes -x). Lathes keep their shape: only their position moves. */
export function mirroredX(pieces: readonly Piece[]): Piece[] {
  const flip = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];
  return pieces.map((piece): Piece => {
    if (piece.kind === "plate") return { ...piece, frame: { o: flip(piece.frame.o), u: flip(piece.frame.u), v: flip(piece.frame.v), w: flip(piece.frame.w) }, outline: piece.outline };
    if (piece.kind === "lines") return { ...piece, paths: piece.paths.map((path) => path.map(flip)) };
    const [a, b] = piece.at ?? [0, 0];
    return { ...piece, at: [-a, b] };
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// The detail kit: surfaces, hatches, vents, stencils, masts. A face is one flat side of a box: `k` is the axis it faces along (0 x, 1 y, 2 z), `s` the sign, `c` its centre, `a` and `b` its half sizes
// along the two other axes in order (x then y, or x then z, or y then z).

export interface Face {
  c: Vec3;
  k: 0 | 1 | 2;
  s: 1 | -1;
  a: number;
  b: number;
}

const tangents = (k: 0 | 1 | 2): [number, number] => (k === 0 ? [1, 2] : k === 1 ? [0, 2] : [0, 1]);

/** The faces of a box: all six, or the ones named ("x+", "z-"). */
export function facesOf(c: Vec3, s: Vec3, which: readonly string[] = ["x+", "x-", "y+", "y-", "z+", "z-"]): Face[] {
  return which.map((name) => {
    const k = (name[0] === "x" ? 0 : name[0] === "y" ? 1 : 2) as 0 | 1 | 2;
    const sign = (name[1] === "+" ? 1 : -1) as 1 | -1;
    const [i, j] = tangents(k);
    const at: Vec3 = [c[0], c[1], c[2]];
    at[k] += (sign * s[k]) / 2;
    return { c: at, k, s: sign, a: s[i] / 2, b: s[j] / 2 };
  });
}

/** A box on a face: `ta` and `tb` are the centre along the face's two axes from its centre, `sa` and `sb` the sizes along them and `sd` how far it stands out. */
export function onFace(material: MaterialName, f: Face, ta: number, tb: number, sa: number, sb: number, sd: number, lift = 0, drawn = false): Plate {
  const [i, j] = tangents(f.k);
  const c: Vec3 = [f.c[0], f.c[1], f.c[2]];
  c[i] += ta;
  c[j] += tb;
  c[f.k] += f.s * (sd / 2 + lift);
  const size: Vec3 = [0, 0, 0];
  size[i] = sa;
  size[j] = sb;
  size[f.k] = sd;
  return box(material, c, size, drawn);
}

/** Raised plating over a face: a grid of panels with a gap between, some left off, each one of the `materials`. Seams, layers and tonal variety in one go. */
export function plating(f: Face, r: Rng, materials: readonly MaterialName[], cellA: number, cellB: number, o: { gap?: number; thick?: number; skip?: number; margin?: number; jitter?: number; fine?: number } = {}): Piece[] {
  const gap = o.gap ?? Math.min(cellA, cellB) * 0.06;
  const margin = o.margin ?? gap;
  const out: Piece[] = [];
  const na = Math.max(1, Math.round((2 * f.a - 2 * margin) / cellA));
  const nb = Math.max(1, Math.round((2 * f.b - 2 * margin) / cellB));
  const wa = (2 * f.a - 2 * margin) / na;
  const wb = (2 * f.b - 2 * margin) / nb;
  for (let i = 0; i < na; i++)
    for (let j = 0; j < nb; j++) {
      if (r.chance(o.skip ?? 0.06)) continue;
      const t = (o.thick ?? 0.35) * (1 + (o.jitter ?? 0.5) * (r.next() - 0.5));
      const pa = -f.a + margin + wa * (i + 0.5);
      const pb = -f.b + margin + wb * (j + 0.5);
      const m = r.pick(materials);
      out.push(onFace(m, f, pa, pb, wa - gap, wb - gap, t));
      if (o.fine && detail.level === "full" && r.chance(o.fine)) out.push(...panelWork(f, r, pa, pb, wa - gap, wb - gap, t));
    }
  return out;
}

/** What is on one panel up close: a sunk-look inset, a bolt strip down each long edge, and sometimes a small hatch, a vent, a pipe clip or a stencil. */
export function panelWork(f: Face, r: Rng, pa: number, pb: number, wa: number, wb: number, t: number): Piece[] {
  const out: Piece[] = [];
  const top = t + 0.05;
  const inset = r.pick<MaterialName>(["dark", "hull-grey", "engine-metal", "black"]);
  out.push(onFace(inset, f, pa, pb, wa * 0.72, wb * 0.72, 0.12, top));
  const long = wa > wb;
  const e = (long ? wb : wa) * 0.4;
  for (const sgn of [-1, 1]) out.push(long ? onFace("engine-metal", f, pa, pb + sgn * e, wa * 0.9, 0.18, 0.16, top) : onFace("engine-metal", f, pa + sgn * e, pb, 0.18, wb * 0.9, 0.16, top));
  const n = Math.max(2, Math.floor((long ? wa : wb) / 1.6));
  for (let k = 0; k < n; k++) {
    const q = ((k + 0.5) / n - 0.5) * (long ? wa : wb) * 0.92;
    for (const sgn of [-1, 1]) out.push(long ? onFace("black", f, pa + q, pb + sgn * e, 0.26, 0.26, 0.12, top + 0.1) : onFace("black", f, pa + sgn * e, pb + q, 0.26, 0.26, 0.12, top + 0.1));
  }
  const pick = r.next();
  if (pick < 0.25) out.push(...vent(f, pa, pb, wa * 0.4, wb * 0.3, 3, top + 0.1));
  else if (pick < 0.45) out.push(...hatch(f, pa, pb, Math.min(wa, wb) * 0.3, Math.min(wa, wb) * 0.42, "dark", r.pick<MaterialName>(["hull-yellow", "hull-orange", "hull-white"]), top));
  else if (pick < 0.6) out.push(onFace("coolant", f, pa, pb, long ? wa * 0.8 : 0.5, long ? 0.5 : wb * 0.8, 0.5, top + 0.1), ...[-1, 1].map((sgn) => onFace("black", f, long ? pa + sgn * wa * 0.3 : pa, long ? pb : pb + sgn * wb * 0.3, 0.9, 0.9, 0.7, top + 0.1)));
  return out;
}

/** An access hatch: a frame, a door in it, two hinges, a handle. About 1.2 by 2 m times the scale of the ship, so people could use it. */
export function hatch(f: Face, ta: number, tb: number, w: number, h: number, frame: MaterialName = "dark", door: MaterialName = "hull-orange", lift = 0.3): Piece[] {
  return [onFace(frame, f, ta, tb, w + 0.8, h + 0.8, 0.5, lift), onFace(door, f, ta, tb, w, h, 0.4, lift + 0.5), onFace("dark", f, ta - w * 0.38, tb, 0.35, h * 0.5, 0.3, lift + 0.9), onFace("hull-yellow", f, ta + w * 0.32, tb, 0.5, 0.5, 0.35, lift + 0.9)];
}

/** A vent: a row of louvre slats in a dark frame. */
export function vent(f: Face, ta: number, tb: number, w: number, h: number, slats = 5, lift = 0.2): Piece[] {
  const out: Piece[] = [onFace("black", f, ta, tb, w, h, 0.4, lift)];
  for (let i = 0; i < slats; i++) out.push(onFace("engine-metal", f, ta, tb - h / 2 + ((i + 0.5) * h) / slats, w * 0.92, (h / slats) * 0.4, 0.5, lift + 0.2));
  return out;
}

/** A hazard stripe: alternating yellow and black bars across a band on a face. */
export function hazard(f: Face, ta: number, tb: number, w: number, h: number, bars = 6, lift = 0.15): Piece[] {
  const out: Piece[] = [onFace("black", f, ta, tb, w, h, 0.25, lift)];
  for (let i = 0; i < bars; i += 2) out.push(onFace("hull-yellow", f, ta - w / 2 + ((i + 0.5) * w) / bars, tb, w / bars, h, 0.3, lift + 0.05));
  return out;
}

/** A row of window slits. */
export function windows(f: Face, ta0: number, tb: number, count: number, pitch: number, w: number, h: number, lift = 0.15): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) out.push(onFace("glass", f, ta0 + i * pitch, tb, w, h, 0.3, lift), onFace("lamp-blue", f, ta0 + i * pitch, tb, w * 0.7, h * 0.35, 0.34, lift + 0.05));
  return out;
}

/** A thin mast along a line: an antenna, with a bar across it near its tip. */
export function mast(a: Vec3, b: Vec3, w = 0.5): Piece[] {
  const t = 0.82;
  const m: Vec3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  return [beam("engine-metal", a, b, w, w), box("engine-metal", m, [w * 8, w, w]), box("lamp-red", b, [w * 2, w * 2, w * 2])];
}

/** A dish on a short stalk, facing along +y: a bowl of revolution. */
export function dish(at: readonly [number, number], y: number, r: number, material: MaterialName = "hull-white"): Piece[] {
  return [revolve(material, at, [[0.001, y + r * 0.14], [r * 0.4, y + r * 0.1], [r * 0.8, y + r * 0.2], [r, y + r * 0.4]], 14), revolve("dark", at, [[0.001, y], [r * 0.12, y], [r * 0.12, y + r * 0.14]], 8), beam("engine-metal", [at[0], y, at[1]], [at[0], y + r * 0.55, at[1]], r * 0.04)];
}

const SEG: Readonly<Record<string, string>> = {
  "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg",
  A: "abcefg", C: "adef", E: "adefg", F: "aefg", H: "bcefg", L: "def", P: "abefg", U: "bcdef", "-": "g", I: "ef", J: "bcde", S: "acdfg", T: "defg", R: "efg", N: "ceg", O: "cdeg", B: "cdefg", D: "bcdeg",
};

/** Stencil text in seven-segment characters, standing on a face: our own plain service lettering, `size` tall. Letters the segments cannot make are drawn as the nearest. */
export function stencil(f: Face, text: string, ta: number, tb: number, size: number, material: MaterialName = "hull-white", lift = 0.12): Piece[] {
  const out: Piece[] = [];
  const cw = size * 0.55;
  const pitch = cw * 1.45;
  const bar = size * 0.11;
  const total = pitch * (text.length - 1);
  [...text].forEach((ch, n) => {
    const x = ta - total / 2 + n * pitch;
    const segs = SEG[ch.toUpperCase()] ?? "";
    const place = (key: string, ca: number, cb: number, sa: number, sb: number) => {
      if (segs.includes(key)) out.push(onFace(material, f, x + ca, tb + cb, sa, sb, 0.22, lift));
    };
    const h = size / 2;
    place("a", 0, h, cw, bar);
    place("g", 0, 0, cw, bar);
    place("d", 0, -h, cw, bar);
    place("f", -cw / 2, h / 2, bar, h);
    place("b", cw / 2, h / 2, bar, h);
    place("e", -cw / 2, -h / 2, bar, h);
    place("c", cw / 2, -h / 2, bar, h);
  });
  return out;
}

/** A handful of small lights along a line on a face. */
export function lights(f: Face, ta0: number, tb0: number, ta1: number, tb1: number, count: number, size = 0.8, material: MaterialName = "lamp-blue", lift = 0.15): Piece[] {
  return Array.from({ length: count }, (_, i) => onFace(material, f, ta0 + ((ta1 - ta0) * i) / Math.max(1, count - 1), tb0 + ((tb1 - tb0) * i) / Math.max(1, count - 1), size, size, size * 0.8, lift));
}

/** A standard docking collar facing along +y or -y: a ring with eight latches and a flat seal. 12 m across: the same for every ship in the fleet. */
export function collar(at: readonly [number, number], y: number, dir: 1 | -1, r = 6): Piece[] {
  const out: Piece[] = [ring("engine-pale", at, r * 0.78, r, y, y + dir * r * 0.18, 28), ring("dark", at, r * 0.62, r * 0.78, y, y + dir * r * 0.12, 28), ring("hull-yellow", at, r * 1.02, r * 1.12, y + dir * r * 0.02, y + dir * r * 0.1, 28)];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 2 * Math.PI;
    out.push(box("engine-metal", [at[0] + r * 0.9 * Math.sin(a), y + dir * r * 0.22, at[1] + r * 0.9 * Math.cos(a)], [r * 0.22, r * 0.2, r * 0.22]));
  }
  return out;
}

/** The pieces of a radial row: `count` copies of what `make` returns for each angle round the y axis. */
export function around(count: number, make: (angle: number, i: number) => Piece[], start = 0): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) out.push(...make(start + (i / count) * 2 * Math.PI, i));
  return out;
}

/** The (x, z) point at an angle and radius round the y axis, the angle from +z towards +x. */
export const polar = (angle: number, radius: number, at: readonly [number, number] = [0, 0]): [number, number] => [at[0] + radius * Math.sin(angle), at[1] + radius * Math.cos(angle)];

/** A box on the outside of a round hull at an angle: `out` is how far from the axis its middle is, `along` its centre along y, with sizes tangent, along y and radial. Oriented to the hull. */
export function onHull(material: MaterialName, at: readonly [number, number], angle: number, rOut: number, y: number, tangent: number, along: number, radial: number, drawn = false): Plate {
  const o: Vec3 = [at[0] + (rOut + radial / 2) * Math.sin(angle), y, at[1] + (rOut + radial / 2) * Math.cos(angle)];
  const w: Vec3 = [Math.sin(angle), 0, Math.cos(angle)];
  const u: Vec3 = [Math.cos(angle), 0, -Math.sin(angle)];
  return { kind: "plate", material, frame: { o, u, v: [0, 1, 0], w }, outline: [[-tangent / 2, -along / 2], [tangent / 2, -along / 2], [tangent / 2, along / 2], [-tangent / 2, along / 2]], thickness: radial, plain: true, ...only(drawn) };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// The close-up kit: what is on a hull at ten metres. Handrails, rows of fasteners, pipes on brackets, recessed panels with a lip, seam strips.

/** The point on a face at (ta, tb) from its centre, `lift` off the surface. */
export function facePoint(f: Face, ta: number, tb: number, lift = 0): Vec3 {
  const [i, j] = tangents(f.k);
  const p: Vec3 = [f.c[0], f.c[1], f.c[2]];
  p[i] += ta;
  p[j] += tb;
  p[f.k] += f.s * lift;
  return p;
}

/** A row of fasteners (bolt heads with a washer) along a line on a face. */
export function fasteners(f: Face, a0: number, b0: number, a1: number, b1: number, count: number, size = 0.45, lift = 0.1): Piece[] {
  const out: Piece[] = [];
  for (let k = 0; k < count; k++) {
    const t = count === 1 ? 0.5 : k / (count - 1);
    const ta = a0 + (a1 - a0) * t;
    const tb = b0 + (b1 - b0) * t;
    out.push(onFace("engine-metal", f, ta, tb, size * 1.7, size * 1.7, size * 0.35, lift), onFace("black", f, ta, tb, size, size, size * 0.8, lift + size * 0.3));
  }
  return out;
}

/** A round pipe along a polyline, its corners turned through rounded bends (a ball joint hides the seam of each elbow) so it never has a sharp corner. */
export function roundedRun(points: readonly Vec3[], r: number, material: MaterialName, drawn = false): Piece[] {
  const out: Piece[] = [];
  const bend = r * 2.4;
  const cut = (p: Vec3, q: Vec3, d: number): Vec3 => {
    const l = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) || 1;
    const t = Math.min(d / l, 0.45);
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  };
  let from = points[0];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (i === points.length - 1) {
      out.push(pipe(material, from, p, r, 14, drawn));
      break;
    }
    const before = cut(p, from, bend);
    const after = cut(p, points[i + 1], bend);
    out.push(pipe(material, from, before, r, 14, drawn), pipe(material, before, [(before[0] + p[0] + after[0]) / 3, (before[1] + p[1] + after[1]) / 3, (before[2] + p[2] + after[2]) / 3], r, 14), pipe(material, [(before[0] + p[0] + after[0]) / 3, (before[1] + p[1] + after[1]) / 3, (before[2] + p[2] + after[2]) / 3], after, r, 14));
    if (detail.level === "full") out.push(revolve(material, [p[0], p[2]], Array.from({ length: 9 }, (_, k) => [r * 1.08 * Math.sin((k / 8) * Math.PI), p[1] - r * 1.08 * Math.cos((k / 8) * Math.PI)] as const), 12));
    from = after;
  }
  return out;
}

/** A pipe along a line on a face: it rises out of the hull through a rounded bend at each end, runs on brackets every few metres, and has a pair of flanges and a clamp band at each bracket. */
export function pipeOn(f: Face, a0: number, b0: number, a1: number, b1: number, r: number, material: MaterialName, pitch = 4, stand = 0.9): Piece[] {
  const up = stand + r;
  const out: Piece[] = roundedRun([facePoint(f, a0, b0, 0.2), facePoint(f, a0, b0, up), facePoint(f, a1, b1, up), facePoint(f, a1, b1, 0.2)], r, material);
  const len = Math.hypot(a1 - a0, b1 - b0);
  const n = Math.max(2, Math.round(len / pitch));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const ta = a0 + (a1 - a0) * t;
    const tb = b0 + (b1 - b0) * t;
    const c = facePoint(f, ta, tb, up);
    // a bracket foot and strap, and two flanges (short wide round collars) with bolts
    out.push(onFace("dark", f, ta, tb, r * 2.4, r * 2.4, up * 0.8, 0.02), pipe("engine-metal", [c[0], c[1], c[2]], [c[0] + (a1 - a0 === 0 ? 0 : 0), c[1], c[2]], r * 1.5, 14));
  }
  return out;
}

/** A recessed panel: a dark sunk floor inside a raised lip on four sides, with a fastener at each corner. */
export function recess(f: Face, ta: number, tb: number, w: number, h: number, lift = 0.15): Piece[] {
  const t = Math.min(w, h) * 0.08 + 0.15;
  const out: Piece[] = [onFace("black", f, ta, tb, w, h, 0.2, lift)];
  out.push(onFace("hull-grey-dark", f, ta, tb + h / 2 - t / 2, w, t, 0.6, lift), onFace("hull-grey-dark", f, ta, tb - h / 2 + t / 2, w, t, 0.6, lift), onFace("hull-grey-dark", f, ta - w / 2 + t / 2, tb, t, h - 2 * t, 0.6, lift), onFace("hull-grey-dark", f, ta + w / 2 - t / 2, tb, t, h - 2 * t, 0.6, lift));
  for (const sa of [-1, 1]) for (const sb of [-1, 1]) out.push(onFace("engine-metal", f, ta + sa * (w / 2 - t * 1.6), tb + sb * (h / 2 - t * 1.6), 0.5, 0.5, 0.35, lift + 0.6));
  out.push(onFace("engine-pale", f, ta, tb, w * 0.5, 0.18, 0.16, lift + 0.2), onFace("engine-pale", f, ta, tb - h * 0.2, w * 0.5, 0.18, 0.16, lift + 0.2));
  return out;
}

/** A handrail: round tube on round posts, standing on the face's surface along a line, with a foot plate under each post. */
export function handrail(f: Face, a0: number, b0: number, a1: number, b1: number, height = 1.1, pitch = 3): Piece[] {
  const out: Piece[] = [];
  const len = Math.hypot(a1 - a0, b1 - b0);
  const n = Math.max(1, Math.round(len / pitch));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const ta = a0 + (a1 - a0) * t;
    const tb = b0 + (b1 - b0) * t;
    out.push(pipe("hull-yellow", facePoint(f, ta, tb, 0.1), facePoint(f, ta, tb, height), 0.1, 10), onFace("dark", f, ta, tb, 0.7, 0.7, 0.15, 0.05));
  }
  out.push(pipe("hull-yellow", facePoint(f, a0, b0, height * 0.97), facePoint(f, a1, b1, height * 0.97), 0.09, 10), pipe("hull-yellow", facePoint(f, a0, b0, height * 0.5), facePoint(f, a1, b1, height * 0.5), 0.07, 10));
  return out;
}

/** An I-beam standing along y at (x, z): a web between two flanges, with an end plate at each end. For posts and ribs that carry load. */
export function ibeam(material: MaterialName, x: number, z: number, y0: number, y1: number, size = 2.4, drawn = false): Piece[] {
  const t = size * 0.18;
  return [span(material, x - size / 2, x + size / 2, y0, y1, z - size / 2, z - size / 2 + t, drawn), span(material, x - size / 2, x + size / 2, y0, y1, z + size / 2 - t, z + size / 2, drawn), span(material, x - t / 2, x + t / 2, y0, y1, z - size / 2, z + size / 2, drawn), span("dark", x - size * 0.7, x + size * 0.7, y0, y0 + t, z - size * 0.7, z + size * 0.7), span("dark", x - size * 0.7, x + size * 0.7, y1 - t, y1, z - size * 0.7, z + size * 0.7)];
}

/** A seam: a long thin raised strip with a groove each side, with fasteners along it. */
export function seam(f: Face, a0: number, b0: number, a1: number, b1: number, width = 0.5, fastenerEvery = 1.4): Piece[] {
  const [i] = tangents(f.k);
  void i;
  const long = Math.hypot(a1 - a0, b1 - b0);
  const mid: [number, number] = [(a0 + a1) / 2, (b0 + b1) / 2];
  const alongA = Math.abs(a1 - a0) >= Math.abs(b1 - b0);
  const out: Piece[] = [onFace("hull-grey-dark", f, mid[0], mid[1], alongA ? long : width, alongA ? width : long, 0.3, 0.1), onFace("black", f, mid[0], mid[1] + (alongA ? width : 0), alongA ? long : 0.12, alongA ? 0.12 : long, 0.15, 0.05), onFace("black", f, mid[0] - (alongA ? 0 : width), mid[1] - (alongA ? width : 0), alongA ? long : 0.12, alongA ? 0.12 : long, 0.15, 0.05)];
  out.push(...fasteners(f, a0, b0, a1, b1, Math.max(2, Math.round(long / fastenerEvery)), 0.28, 0.35));
  return out;
}

/** Close detail for a whole face in one call: seams across, fastener rows, recessed panels, two pipe runs on brackets, a handrail and a stencil. Scaled to the face. */
export function closeDetail(face: Face, r: Rng, o: { rails?: boolean; label?: string; base?: number } = {}): Piece[] {
  // the close-up kit is the fine level: the coarse level has none of it
  if (detail.level === "coarse") return [];
  // stand on top of whatever plating is already on the face
  const f: Face = { ...face, c: facePoint(face, 0, 0, o.base ?? 1.1) };
  const out: Piece[] = [];
  const A = f.a;
  const B = f.b;
  const cols = Math.max(2, Math.round(A / 4.5));
  for (let c = 0; c <= cols; c++) out.push(...seam(f, -A + (2 * A * c) / cols, -B + 0.8, -A + (2 * A * c) / cols, B - 0.8, 0.45, 1.5));
  const rowsN = Math.max(1, Math.round(B / 5.5));
  for (let q = 0; q <= rowsN; q++) out.push(...seam(f, -A + 0.8, -B + (2 * B * q) / rowsN, A - 0.8, -B + (2 * B * q) / rowsN, 0.4, 1.8));
  for (let c = 0; c < cols; c++) for (let q = 0; q < rowsN; q++) if (r.chance(0.65)) {
    const ta = -A + (2 * A * (c + 0.5)) / cols;
    const tb = -B + (2 * B * (q + 0.5)) / rowsN;
    out.push(...recess(f, ta + r.range(-1, 1), tb + r.range(-1, 1), Math.min(4.4, (A / cols) * 0.7), Math.min(3.4, (B / rowsN) * 0.55)));
  }
  const run = (k: number): number => -B + (B * 2 * k) / 5;
  out.push(...pipeOn(f, -A + 1.2, run(1), A - 1.2, run(1), 0.38, "coolant", 4.5), ...pipeOn(f, -A + 1.2, run(1) + 1.1, A - 1.2, run(1) + 1.1, 0.25, "hull-orange", 4.5));
  out.push(...pipeOn(f, -A + 1.2, run(4), A - 1.2, run(4), 0.33, "hull-white", 4.5));
  // small hatches and vents scattered over the face, each with its frame, hinge and handle, and a lamp over the door
  const small = Math.max(2, Math.round((A * B) / 60));
  for (let k = 0; k < small; k++) {
    const ta = r.range(-A + 4, A - 4);
    const tb = r.range(-B + 4, B - 4);
    if (r.chance(0.55)) out.push(...hatch(f, ta, tb, r.range(1.1, 1.6), r.range(1.8, 2.4), "dark", r.pick<MaterialName>(["hull-yellow", "hull-orange", "hull-white"]), 0.1), onFace("lamp-blue", f, ta, tb + 1.9, 0.5, 0.5, 0.4, 0.2));
    else out.push(...vent(f, ta, tb, r.range(1.8, 2.6), r.range(1.2, 1.8), 4, 0.1));
  }
  // clutter: junction boxes, cable clips, label plates, sensor studs, pipe stubs
  const clutter = Math.round((A * B) / 9);
  for (let k = 0; k < clutter; k++) {
    const ta = r.range(-A + 1, A - 1);
    const tb = r.range(-B + 1, B - 1);
    const kind = r.int(0, 5);
    if (kind === 0) out.push(onFace("dark", f, ta, tb, r.range(0.9, 1.6), r.range(0.7, 1.2), r.range(0.5, 0.9), 0.1), onFace("hull-yellow", f, ta, tb, 0.3, 0.3, 0.2, 1.0));
    else if (kind === 1) out.push(onFace("black", f, ta, tb, 0.35, 0.8, 0.5, 0.1), onFace("engine-metal", f, ta, tb, 0.2, 0.2, 0.25, 0.55));
    else if (kind === 2) out.push(onFace("engine-pale", f, ta, tb, 1.1, 0.6, 0.12, 0.1), onFace("black", f, ta, tb, 0.8, 0.12, 0.08, 0.22), onFace("black", f, ta, tb - 0.18, 0.5, 0.1, 0.08, 0.22));
    else if (kind === 3) out.push(...fasteners(f, ta - 0.5, tb, ta + 0.5, tb, 3, 0.26, 0.08));
    else if (kind === 4) out.push(onFace("coolant", f, ta, tb, 0.5, 0.5, r.range(0.6, 1.4), 0.1), onFace("engine-metal", f, ta, tb, 0.8, 0.8, 0.15, r.range(0.5, 1.2)));
    else out.push(onFace("lamp-blue", f, ta, tb, 0.35, 0.35, 0.3, 0.1), onFace("dark", f, ta, tb, 0.7, 0.7, 0.2, 0.05));
  }
  if (o.rails !== false) out.push(...handrail(f, -A + 1, B - 1.4, A - 1, B - 1.4, 1.1, 3));
  if (o.label) out.push(...stencil(f, o.label, -A + 6, -B + 1.8, 1.4, "hull-white", 0.4));
  return out;
}
