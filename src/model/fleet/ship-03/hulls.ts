// How Miyamoto's boxy hulls are dressed. A hull is a box of plated faces; a face is cut into slots, each slot is plated or holds one piece of hardware (a hatch, a vent, a row of windows, a conduit stub, a lamp row, a sensor
// post, a hazard frame, a number, a cluster of machinery), and a slot with hardware is left unplated so the hardware sits in a recess. Walls of a cutaway are real separate shells, one for each hull layer, stepped back so
// the stack shows at the cut edge. Pure: no three.js and no DOM.
import { cub, type MaterialName, type Piece, pipeRun, rng, rod, type Vec3 } from "./adapter.ts";
import type { Box } from "./dims.ts";
import { bolts, conduit, type Face, faceOf, frame, hatch, hazard, lamp, on, pt, rail, type Scheme, skin, stencil, vent, windows } from "./faces.ts";
import type { HullStack } from "./adapter.ts";

export type Kind = "hatch" | "vent" | "windows" | "lamps" | "greeble" | "number" | "stub" | "bolts" | "hazard" | "sensor" | "dish";

export interface Dress {
  seed: string;
  scheme: Scheme;
  /** Plating cell, and the slot the hardware is set in, both across the face's two axes. */
  cell?: readonly [number, number];
  slot?: readonly [number, number];
  /** The share of slots that hold hardware. */
  density?: number;
  kinds?: readonly Kind[];
  /** A scale for counts: 1 is full detail. */
  detail?: number;
  raise?: number;
  /** Quilted blanket pillows in big cells, instead of small panels. */
  blanket?: boolean;
  /** A slot whose centre this says no to is left plain. */
  avoid?: (a: number, b: number) => boolean;
}

const ALL: readonly Kind[] = ["hatch", "vent", "windows", "lamps", "greeble", "number", "stub", "bolts", "hazard", "sensor"];

/** A hardware item in its slot, standing out of the (lifted) face. */
function hardware(kind: Kind, f: Face, a: number, b: number, sa: number, sb: number, random: () => number, seed: string): Piece[] {
  const small = Math.min(sa, sb);
  if (kind === "hatch") return hatch(f, a, b, Math.max(1.2, small * 0.36));
  if (kind === "vent") return vent(f, a, b, sa * 0.62, sb * 0.46, 6 + Math.floor(random() * 4));
  if (kind === "windows") return windows(f, b, a - sa * 0.36, a + sa * 0.36, 3 + Math.floor(random() * 3), Math.min(1.1, sb * 0.28));
  if (kind === "lamps") return [...lamp(f, a - sa * 0.3, b, "amber", 0.18), ...lamp(f, a, b, "blue", 0.18), ...lamp(f, a + sa * 0.3, b, random() < 0.5 ? "red" : "amber", 0.18)];
  if (kind === "number") return stencil(f, String(10 + Math.floor(random() * 89)), a, b, Math.min(2.4, sb * 0.5));
  if (kind === "stub") return conduit(f, b, a - sa * 0.42, a + sa * 0.42, { count: 2 + Math.floor(random() * 3), seed });
  if (kind === "bolts") return [...bolts(f, b - sb * 0.18, a - sa * 0.4, a + sa * 0.4, 0.8), ...bolts(f, b + sb * 0.18, a - sa * 0.4, a + sa * 0.4, 0.8), ...frame(f, a, b, sa * 0.8, sb * 0.46, 0.14, 0.12, "hull-grey-dark")];
  if (kind === "hazard") return [...frame(f, a, b, sa * 0.66, sb * 0.56, 0.3, 0.22, "hull-grey-dark"), ...hazard(f, b, a - sa * 0.33, a + sa * 0.33, 0.36, 0.7)];
  if (kind === "sensor") {
    const h = 0.9 + random() * 0.8;
    return [rod("hull-grey-dark", pt(f, a, b, 0), pt(f, a, b, h), 0.16, 6), rod("lamp-red", pt(f, a, b, h), pt(f, a, b, h + 0.3), 0.1, 6), ...[-1, 1].map((s) => rod("hull-grey", pt(f, a, b, h * 0.7), pt(f, a + s * 0.6, b, h * 0.8), 0.05, 5))];
  }
  // a cluster of machinery: junction boxes, valve wheels, pump housings
  const out: Piece[] = [];
  for (let i = 0; i < 6; i++) {
    const ca = a + (random() - 0.5) * sa * 0.7;
    const cb = b + (random() - 0.5) * sb * 0.6;
    const k = random();
    const size = 0.25 + random() * 0.5;
    if (k < 0.4) out.push(on(f, ca, cb, size * 1.5, size, 0, size * 0.7, random() < 0.5 ? "hull-grey-dark" : "panel-dark"), on(f, ca, cb, size * 0.4, size * 0.4, size * 0.7, size * 0.9, "lamp-amber"));
    else if (k < 0.65) out.push(rod("hull-grey", pt(f, ca, cb, 0), pt(f, ca, cb, 0.15 + size), size * 0.4, 8), rod("hull-yellow", pt(f, ca - size * 0.5, cb, 0.2 + size), pt(f, ca + size * 0.5, cb, 0.2 + size), 0.05, 5));
    else out.push(rod("hull-grey-dark", pt(f, ca, cb, 0), pt(f, ca, cb, size * 0.8), size * 0.5, 8), rod("copper", pt(f, ca, cb, size * 0.8), pt(f, ca, cb, size * 1.1), size * 0.36, 8));
  }
  return out;
}

/** One face of a hull, plated and dressed. `lift` is how far the hardware stands out of the base (the plating's depth). */
export function dressedFace(face: Face, o: Dress): Piece[] {
  const random = rng(`${o.seed}/dress/${face.n}${face.sign}/${face.at.toFixed(1)}`);
  const [sa, sb] = o.slot ?? [9, 6];
  const detail = Math.max(0.2, Math.min(1, o.detail ?? 1));
  const density = (o.density ?? 0.3) * detail;
  const kinds = o.kinds ?? ALL;
  const na = Math.max(1, Math.floor((face.a[1] - face.a[0]) / sa));
  const nb = Math.max(1, Math.floor((face.b[1] - face.b[0]) / sb));
  const wa = (face.a[1] - face.a[0]) / na;
  const wb = (face.b[1] - face.b[0]) / nb;
  const lift = o.raise ?? 0.26;
  const base: Face = { ...face, at: face.at + face.sign * lift * 0.45 };
  const taken: [number, number][] = [];
  const out: Piece[] = [];
  for (let i = 0; i < na; i++)
    for (let j = 0; j < nb; j++) {
      const a = face.a[0] + (i + 0.5) * wa;
      const b = face.b[0] + (j + 0.5) * wb;
      if (o.avoid?.(a, b) || random() >= density) continue;
      taken.push([a, b]);
      // a recess: a coaming round the slot's hardware, so it sits in the hull and not on it
      const kind = kinds[Math.floor(random() * kinds.length)];
      const small = kind === "sensor" || kind === "lamps" || kind === "greeble" || kind === "number";
      const k = small ? 0.5 : 0.9;
      out.push(...frame(base, a, b, wa * k, wb * k * 0.95, 0.22, lift * 1.5, "hull-grey-dark"), on(base, a, b, wa * k, wb * k * 0.95, -0.02, 0.1, o.scheme.worn));
      out.push(...hardware(kind, base, a, b, wa, wb, random, o.seed));
    }
  // structural ribs along the slot lines: thin standing bars, so the plating reads in bays with depth between them
  for (let i = 0; i <= na; i++) out.push(on(base, face.a[0] + i * wa, (face.b[0] + face.b[1]) / 2, 0.22, face.b[1] - face.b[0], 0, lift * 2.6, "hull-grey"));
  for (let j = 0; j <= nb; j++) out.push(on(base, (face.a[0] + face.a[1]) / 2, face.b[0] + j * wb, face.a[1] - face.a[0], 0.22, 0, lift * 2.2, "hull-grey-dark"));
  const inSlot = (a: number, b: number) => taken.some(([ta, tb]) => Math.abs(a - ta) < wa * 0.5 && Math.abs(b - tb) < wb * 0.5);
  out.push(...skin(face, o.scheme, o.seed, { detail, blanket: o.blanket, cell: o.cell ?? (o.blanket ? [Math.max(4, wa * 0.7), Math.max(3.2, wb * 0.7)] : [Math.max(2.5, wa / 2), Math.max(2, wb / 2)]), raise: lift, skip: (a, b) => inSlot(a, b) || Boolean(o.avoid?.(a, b)) }));
  return out;
}

/** The six faces of a box: +x, -x, +y, -y, +z, -z. */
export const facesOf = (box: Box) => ({ stbd: faceOf(box, "x", 1), port: faceOf(box, "x", -1), bow: faceOf(box, "y", 1), aft: faceOf(box, "y", -1), dorsal: faceOf(box, "z", 1), ventral: faceOf(box, "z", -1) });

/** A solid hull: the core box in the dark under-colour (it is what shows in every seam), and every wanted face dressed. */
export function hullBox(box: Box, core: MaterialName, faces: readonly (keyof ReturnType<typeof facesOf>)[], o: Dress): Piece[] {
  const out: Piece[] = [cub(core, box.x, box.y, box.z, { only: undefined })];
  const all = facesOf(box);
  for (const key of faces) out.push(...dressedFace(all[key], o));
  // the twelve edges of the box carry a corner beam, with a bolt every few metres
  const edge = 0.7;
  for (const x of box.x) for (const z of box.z) out.push(cub("hull-grey", [x - edge / 2, x + edge / 2], box.y, [z - edge / 2, z + edge / 2]));
  for (const x of box.x) for (const y of box.y) out.push(cub("hull-grey", [x - edge / 2, x + edge / 2], [y - edge / 2, y + edge / 2], box.z));
  for (const z of box.z) for (const y of box.y) out.push(cub("hull-grey", box.x, [y - edge / 2, y + edge / 2], [z - edge / 2, z + edge / 2]));
  return out;
}

/** The walls of a hull as separate shells, one for each layer of a stack, outermost first; each inner layer stands in `step` metres at its ends so the stack shows at a cut. `axis` is the way the wall's thickness runs. */
export function wallShells(stack: HullStack, o: { axis: "x" | "z"; sign: 1 | -1; at: number; y: readonly [number, number]; across: readonly [number, number]; step?: number; scale?: number }): Piece[] {
  const out: Piece[] = [];
  let outer = o.at;
  const scale = o.scale ?? 1;
  let inset = 0;
  for (const layer of stack.layers) {
    const thick = (layer.mm / 1000) * scale;
    const lo = Math.min(outer, outer - o.sign * thick);
    const hi = Math.max(outer, outer - o.sign * thick);
    const across: [number, number] = [o.across[0] + inset, o.across[1] - inset];
    out.push(o.axis === "z" ? cub(layer.material, across, o.y, [lo, hi]) : cub(layer.material, [lo, hi], o.y, across));
    outer -= o.sign * thick;
    inset += o.step ?? 0.18;
  }
  return out;
}

/** A row of rails and posts: a catwalk of grating with a handrail, along Y at (x, z). */
export function catwalk(y0: number, y1: number, x: number, z: number, width = 1.8): Piece[] {
  const out: Piece[] = [cub("deck", [x - width / 2, x + width / 2], [y0, y1], [z - 0.08, z + 0.08], { only: "mesh" })];
  for (const s of [-1, 1]) {
    out.push(rod("hull-yellow", [x + (s * width) / 2, y0, z + 1.05], [x + (s * width) / 2, y1, z + 1.05], 0.05, 12));
    for (let y = y0; y <= y1 + 0.01; y += 2.4) out.push(rod("hull-grey-dark", [x + (s * width) / 2, y, z], [x + (s * width) / 2, y, z + 1.05], 0.04, 10));
  }
  for (let y = y0 + 0.4; y < y1; y += 0.5) out.push(cub("hull-grey-dark", [x - width / 2, x + width / 2], [y, y + 0.06], [z - 0.14, z - 0.08]));
  return out;
}

/** A pipe run from a to b: a round tube with a bend half way, flanges at the ends and a valve block on it, for the feed lines. */
export function pipe(a: Vec3, b: Vec3, r: number, material: MaterialName = "coolant"): Piece[] {
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const bend: Vec3 = [b[0], a[1] * 0.5 + mid[1] * 0.5, a[2]];
  return [...pipeRun(material, [a, bend, b], r, { clampEvery: 3.5 }), rod("hull-grey-dark", [mid[0], mid[1] - r * 1.1, mid[2]], [mid[0], mid[1] + r * 1.1, mid[2]], r * 1.7, 12), rod("lamp-amber", [mid[0], mid[1] + r * 1.1, mid[2]], [mid[0], mid[1] + r * 1.5, mid[2]], r * 0.6, 8)];
}

export { rail };
