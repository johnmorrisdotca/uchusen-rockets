// Detail on the flat faces of Waymark's boxy hull: plating in rows with a gap between, hatches, vents, conduits, rails, ladders, lamps, bolts and our own stencils. A face is one side of an axis-aligned box. Its two
// surface axes follow the cycle x -> y -> z: on an X face they are Y then Z, on a Y face Z then X, on a Z face X then Y. Everything stands off the surface by a few centimetres up to a metre, so a close view has depth.
// All of it is plain pieces, mesh only unless said, and the same description gives the same bytes. Pure: no three.js and no DOM.
import { beam, cub, type MaterialName, type Piece, rng, rod, type Vec3 } from "./adapter.ts";

export type Axis = "x" | "y" | "z";

/** One side of a box: which axis it faces, which way, where it stands on that axis, and the extent of its two surface axes. */
export interface Face {
  n: Axis;
  sign: 1 | -1;
  at: number;
  a: readonly [number, number];
  b: readonly [number, number];
  /** The two surface axes the other way round: a runs along the second. */
  swap?: boolean;
}

/** The colours a hull is plated in. */
export interface Scheme {
  main: MaterialName;
  worn: MaterialName;
  block: MaterialName;
  blockWorn: MaterialName;
  accent: MaterialName;
}

export const WHITE: Scheme = { main: "hull-white", worn: "hull-white-worn", block: "hull-grey", blockWorn: "hull-grey-dark", accent: "hull-yellow" };
export const SHUTTER: Scheme = { main: "hull-orange", worn: "hull-orange-worn", block: "hull-grey", blockWorn: "hull-grey-dark", accent: "hull-yellow" };
export const ARMOUR: Scheme = { main: "hull-grey", worn: "hull-grey-dark", block: "hull-white", blockWorn: "hull-white-worn", accent: "hull-orange" };
export const SPINE: Scheme = { main: "hull-grey-dark", worn: "panel-dark", block: "hull-grey", blockWorn: "hull-grey-dark", accent: "hull-yellow" };

const AXES: Record<Axis, [Axis, Axis]> = { x: ["y", "z"], y: ["z", "x"], z: ["x", "y"] };
const axesOf = (face: Face): [Axis, Axis] => (face.swap ? [AXES[face.n][1], AXES[face.n][0]] : AXES[face.n]);

/** The same face with its axes the other way round, so a run along `a` goes along the spine on a dorsal or ventral face. */
export const along = (face: Face): Face => ({ ...face, swap: !face.swap, a: face.b, b: face.a });

/** The point at surface coordinates (a, b), `h` metres out of the face. */
export function pt(face: Face, a: number, b: number, h = 0): Vec3 {
  const p: Record<Axis, number> = { x: 0, y: 0, z: 0 };
  const [ta, tb] = axesOf(face);
  p[ta] = a;
  p[tb] = b;
  p[face.n] = face.at + face.sign * h;
  return [p.x, p.y, p.z];
}

/** A box on a face: centred on (a, b), `da` by `db` across, standing from `h0` to `h1` metres out of it. */
export function on(face: Face, a: number, b: number, da: number, db: number, h0: number, h1: number, material: MaterialName, extra: Partial<Parameters<typeof cub>[4]> = {}) {
  const r: Record<Axis, readonly [number, number]> = { x: [0, 0], y: [0, 0], z: [0, 0] };
  const [ta, tb] = axesOf(face);
  r[ta] = [a - da / 2, a + da / 2];
  r[tb] = [b - db / 2, b + db / 2];
  r[face.n] = [face.at + face.sign * h0, face.at + face.sign * h1];
  return cub(material, r.x, r.y, r.z, extra);
}

/** A face of a box given by its ranges. */
export function faceOf(box: { x: readonly [number, number]; y: readonly [number, number]; z: readonly [number, number] }, n: Axis, sign: 1 | -1): Face {
  const [ta, tb] = AXES[n];
  return { n, sign, at: sign === 1 ? box[n][1] : box[n][0], a: box[ta], b: box[tb] };
}

/** Plating: rows and columns of raised panels, a hand's width apart, in the scheme's colours, some worn, some bare, some in the block colour; sizes vary by row so no two walls are the same. */
export function skin(face: Face, scheme: Scheme, seed: string, o: { cell?: readonly [number, number]; raise?: number; blocks?: number; bare?: number; detail?: number; skip?: (a: number, b: number) => boolean } = {}): Piece[] {
  const random = rng(`${seed}/skin/${face.n}${face.sign}`);
  // a lower level of detail plates in bigger cells: a quarter of the detail is a quarter of the plates
  const k = 1 / Math.sqrt(Math.max(0.2, Math.min(1, o.detail ?? 1)));
  const [ca, cb] = (o.cell ?? [4, 3]).map((c) => c * k) as [number, number];
  const raise = o.raise ?? 0.22;
  const gap = Math.min(0.12, ca * 0.03);
  const out: Piece[] = [];
  let b = face.b[0];
  while (b < face.b[1] - 0.2) {
    const hb = Math.min(face.b[1] - b, cb * (0.7 + random() * 0.7));
    // a row has one tone: mostly white, sometimes a worn band, now and then a block colour, so the plating reads in bands
    const tone = random();
    const rowMain = tone < 0.04 ? scheme.block : tone < 0.3 ? scheme.worn : scheme.main;
    let a = face.a[0];
    while (a < face.a[1] - 0.2) {
      const wa = Math.min(face.a[1] - a, ca * (0.6 + random() * 0.9));
      const cA = a + wa / 2;
      const cB = b + hb / 2;
      a += wa;
      if (o.skip?.(cA, cB)) continue;
      const roll = random();
      if (roll < (o.bare ?? 0.03)) continue;
      const pick = random();
      const material = pick < 0.9 ? rowMain : pick < 0.96 ? scheme.worn : pick < 0.985 ? scheme.main : pick < 0.995 ? scheme.accent : scheme.blockWorn;
      const h = raise * (0.55 + random() * 0.45);
      out.push(on(face, cA, cB, wa - gap, hb - gap, 0, h, material));
      // an access plate or a rivet strip on some panels, so no panel is blank
      const dress = random();
      if (dress < 0.16 && wa > 1.2 && hb > 1) out.push(on(face, cA, cB, wa * 0.55, hb * 0.5, h, h + 0.04, material === scheme.main ? scheme.worn : scheme.main), on(face, cA - wa * 0.22, cB, 0.14, hb * 0.5, h + 0.04, h + 0.1, "hull-grey-dark"), on(face, cA + wa * 0.22, cB, 0.14, hb * 0.5, h + 0.04, h + 0.1, "hull-grey-dark"));
      else if (dress < 0.28 && wa > 1.2) for (const s of [-0.38, -0.13, 0.13, 0.38]) out.push(on(face, cA + wa * s, cB + hb * 0.34, 0.12, 0.12, h, h + 0.07, "hull-grey-dark"));
      else if (dress < 0.33) out.push(on(face, cA, cB, 0.5, 0.5, h, h + 0.12, "panel-dark"), on(face, cA, cB, 0.32, 0.32, h + 0.12, h + 0.17, "lamp-amber"));
    }
    b += hb;
  }
  return out;
}

/** An access hatch: a frame of four jambs, a door with hinges and a latch, a hazard bar and a lamp. */
export function hatch(face: Face, a: number, b: number, s = 1.6): Piece[] {
  return [
    on(face, a, b + s * 0.56, s * 1.2, s * 0.1, 0, 0.14, "hull-grey-dark"),
    on(face, a, b - s * 0.56, s * 1.2, s * 0.1, 0, 0.14, "hull-grey-dark"),
    on(face, a + s * 0.56, b, s * 0.1, s * 1.0, 0, 0.14, "hull-grey-dark"),
    on(face, a - s * 0.56, b, s * 0.1, s * 1.0, 0, 0.14, "hull-grey-dark"),
    on(face, a, b, s * 0.98, s * 0.98, 0, 0.08, "hull-grey"),
    on(face, a - s * 0.5, b + s * 0.3, 0.12, 0.26, 0.08, 0.17, "panel-dark"),
    on(face, a - s * 0.5, b - s * 0.3, 0.12, 0.26, 0.08, 0.17, "panel-dark"),
    on(face, a + s * 0.38, b, 0.14, 0.34, 0.08, 0.16, "lamp-amber"),
    on(face, a, b - s * 0.4, s * 0.8, 0.08, 0.08, 0.1, "hazard"),
    on(face, a, b + s * 0.4, s * 0.8, 0.08, 0.08, 0.1, "hazard"),
  ];
}

/** A louvred vent: a dark frame with slats. */
export function vent(face: Face, a: number, b: number, wide = 1.6, tall = 1, slats = 6): Piece[] {
  const out: Piece[] = [on(face, a, b, wide, tall, 0, 0.1, "panel-dark")];
  for (let i = 0; i < slats; i++) out.push(on(face, a, b + ((i + 0.5) / slats - 0.5) * (tall - 0.1), wide - 0.12, (tall / slats) * 0.5, 0.1, 0.2, "hull-grey"));
  return out;
}

/** A bundle of pipes along the surface axis `a`, at `b`, held off the face by clamps every few metres. */
export function conduit(face: Face, b: number, a0: number, a1: number, o: { count?: number; pipe?: number; materials?: readonly MaterialName[]; seed: string; stand?: number }): Piece[] {
  const random = rng(`${o.seed}/conduit/${b.toFixed(2)}/${a0.toFixed(1)}`);
  const count = o.count ?? 3;
  const pr = o.pipe ?? 0.16;
  const pitch = pr * 2.5;
  const stand = o.stand ?? 0.3 + pr;
  const mats = o.materials ?? (["coolant", "hull-white-worn", "copper", "lamp-red", "coolant"] as const);
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const side = b + (i - (count - 1) / 2) * pitch;
    out.push(rod(mats[Math.floor(random() * mats.length)], pt(face, a0, side, stand), pt(face, a1, side, stand), pr, 8));
  }
  const span = (count - 1) * pitch + pr * 3.2;
  for (let a = a0 + 0.6; a < a1 - 0.2; a += 3 + random() * 1.5) out.push(on(face, a, b, 0.22, span, 0, stand * 1.4, "hull-grey-dark"));
  // a valve block part of the way along
  const v = a0 + (a1 - a0) * (0.3 + random() * 0.4);
  out.push(on(face, v, b, 0.9, span + 0.3, stand * 0.2, stand * 1.9, "hull-grey-dark"), on(face, v, b, 0.5, 0.5, stand * 1.9, stand * 2.3, "lamp-red"));
  return out;
}

/** A handrail along the surface axis `a`, at `b`: posts and a top rail in service yellow. */
export function rail(face: Face, b: number, a0: number, a1: number, height = 1.1): Piece[] {
  const out: Piece[] = [rod("hull-yellow", pt(face, a0, b, height), pt(face, a1, b, height), 0.04, 6), rod("hull-yellow", pt(face, a0, b, height * 0.55), pt(face, a1, b, height * 0.55), 0.03, 6)];
  for (let a = a0; a <= a1 + 0.01; a += 2.5) out.push(rod("hull-grey-dark", pt(face, a, b, 0), pt(face, a, b, height), 0.04, 6));
  return out;
}

/** A ladder along `a`: two rails and rungs. */
export function ladder(face: Face, b: number, a0: number, a1: number, width = 0.6): Piece[] {
  const out: Piece[] = [rod("hull-yellow", pt(face, a0, b - width / 2, 0.14), pt(face, a1, b - width / 2, 0.14), 0.03, 6), rod("hull-yellow", pt(face, a0, b + width / 2, 0.14), pt(face, a1, b + width / 2, 0.14), 0.03, 6)];
  for (let a = a0 + 0.25; a < a1; a += 0.32) out.push(rod("hull-yellow", pt(face, a, b - width / 2, 0.14), pt(face, a, b + width / 2, 0.14), 0.02, 5));
  return out;
}

/** A lamp: a small dome on a stalk. */
export const lamp = (face: Face, a: number, b: number, colour: "amber" | "blue" | "red", size = 0.14): Piece[] => [on(face, a, b, size * 1.8, size * 1.8, 0, size * 0.6, "hull-grey-dark"), on(face, a, b, size * 1.2, size * 1.2, size * 0.6, size * 1.5, colour === "amber" ? "lamp-amber" : colour === "blue" ? "lamp-blue" : "lamp-red")];

/** A row of bolt heads along `a` at `b`. */
export function bolts(face: Face, b: number, a0: number, a1: number, pitch = 1, size = 0.12): Piece[] {
  const out: Piece[] = [];
  for (let a = a0; a <= a1 + 0.01; a += pitch) out.push(on(face, a, b, size, size, 0, size * 0.8, "hull-grey-dark"));
  return out;
}

/** A row of windows (dark glass in a frame) along `a` at `b`. */
export function windows(face: Face, b: number, a0: number, a1: number, n: number, size = 0.8): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) * (a1 - a0)) / n;
    out.push(on(face, a, b, size * 1.3, size * 0.9, 0, 0.12, "hull-grey-dark"), on(face, a, b, size, size * 0.62, 0.12, 0.17, i % 5 === 2 ? "lamp-blue" : "glass"));
  }
  return out;
}

const SEGMENTS: Record<string, string> = { "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd", "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abcdfg" };

/** Digits in seven bars, our own figures, on a face: `size` is a digit's height. */
export function stencil(face: Face, text: string, a: number, b: number, size: number, material: MaterialName = "black"): Piece[] {
  const out: Piece[] = [];
  const t = size * 0.12;
  const w = size * 0.55;
  text.split("").forEach((ch, i) => {
    const cx = a + (i - (text.length - 1) / 2) * (w + t * 2);
    const seg = SEGMENTS[ch] ?? "";
    const place = (s: string): [number, number, number, number] | null => {
      if (s === "a") return [cx, b + size / 2 - t / 2, w, t];
      if (s === "g") return [cx, b, w, t];
      if (s === "d") return [cx, b - size / 2 + t / 2, w, t];
      if (s === "b") return [cx + w / 2 - t / 2, b + size / 4, t, size / 2];
      if (s === "c") return [cx + w / 2 - t / 2, b - size / 4, t, size / 2];
      if (s === "f") return [cx - w / 2 + t / 2, b + size / 4, t, size / 2];
      if (s === "e") return [cx - w / 2 + t / 2, b - size / 4, t, size / 2];
      return null;
    };
    for (const s of seg) {
      const p = place(s);
      if (p) out.push(on(face, p[0], p[1], p[2], p[3], 0.22, 0.27, material));
    }
  });
  return out;
}

/** A stripe of hazard blocks along `a` at `b`. */
export function hazard(face: Face, b: number, a0: number, a1: number, tall = 0.6, block = 0.9): Piece[] {
  const out: Piece[] = [];
  let i = 0;
  for (let a = a0; a < a1 - 0.01; a += block, i++) out.push(on(face, Math.min(a + block / 2, a1 - 0.05), b, Math.min(block, a1 - a), tall, 0, 0.1, i % 2 ? "black" : "hazard"));
  return out;
}

/** A frame round an opening: four beams standing out of the face. */
export function frame(face: Face, a: number, b: number, da: number, db: number, thick: number, h: number, material: MaterialName): Piece[] {
  return [on(face, a, b + db / 2 + thick / 2, da + thick * 2, thick, 0, h, material), on(face, a, b - db / 2 - thick / 2, da + thick * 2, thick, 0, h, material), on(face, a + da / 2 + thick / 2, b, thick, db, 0, h, material), on(face, a - da / 2 - thick / 2, b, thick, db, 0, h, material)];
}

/** A beam from one surface point to another, standing `h` out of the face: a brace, a pipe, a cable. */
export const strutOn = (face: Face, p: readonly [number, number], q: readonly [number, number], w: number, d: number, h: number, material: MaterialName): Piece => beam(material, pt(face, p[0], p[1], h), pt(face, q[0], q[1], h), w, d, { only: "mesh" });

/** A seeded pick: n of the list's items, in order, that the random numbers choose. */
export function some<T>(random: () => number, items: readonly T[], share: number): T[] {
  return items.filter(() => random() < share);
}
