// The fleet's detail kit: the small shapes every module is covered with, so no surface is bare. Panels, hatches, conduits, radiators, thermal tiles, joints, antennae, lamps, vents, ladders, stencils and
// greebles, all plain pieces in metres (the same `Piece` every other part is made of), all deterministic: a seeded random number, never a clock. Pure: no three.js and no DOM.
//
// A cylinder's surface is addressed by azimuth (radians round the Y axis from +Z towards +X), height and radius. A shape lying on it is a `Plate` in the tangent frame `patch(r, az, y)`: u along the circle,
// v up, w outwards. Repeated shapes go through `stamp`, which keeps one template and a pose per copy; the mesh draws those copies on the GPU.
import { deg } from "../../framing.ts";
import { applyPose } from "../instances.ts";
import type { MaterialName } from "../materials.ts";
import { type Frame, type Lathe, type Lines, type Piece, type Plate, pointOf, type Vec3 } from "../pieces.ts";
import { lightPool } from "./lights.ts";

// ---------------------------------------------------------------------------------------------------------------------------------
// numbers

/** A seeded random number generator: the same text gives the same numbers, so the same description gives the same bytes. */
export type Rng = () => number;

/** @param seed Any text. @returns A function giving numbers from 0 up to (not including) 1, always the same ones for the same seed. */
export function rng(seed: string): Rng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

type Extra = Partial<Omit<Plate, "kind" | "material" | "frame" | "outline" | "thickness">>;
type LatheExtra = Partial<Omit<Lathe, "kind" | "material" | "profile">>;

// ---------------------------------------------------------------------------------------------------------------------------------
// frames and solids

/** The tangent frame at a point of a cylinder: u along the circle, v up, w outwards. A plate lying in it lies on the surface. */
export function patch(r: number, az: number, y: number): Frame {
  const n: Vec3 = [Math.sin(az), 0, Math.cos(az)];
  return { o: [n[0] * r, y, n[2] * r], u: [n[2], 0, -n[0]], v: [0, 1, 0], w: n };
}

/** The sag of a flat piece `wide` across on a cylinder of radius `r`: how far its edges stand off the surface. */
export const sagOf = (r: number, wide: number): number => (r > wide / 2 ? r - Math.sqrt(r * r - (wide / 2) ** 2) : 0);

/** A raised rectangle lying on a cylinder, `wide` along the circle and `tall` up it, `raise` metres proud of the surface. */
export function panel(material: MaterialName, r: number, az: number, y: number, wide: number, tall: number, raise: number, extra: Extra = {}): Plate {
  const f = patch(r, az, y);
  const lift = raise / 2 - sagOf(r, wide) / 2;
  const o = add(f.o, mul(f.w, lift));
  return { kind: "plate", material, frame: { ...f, o }, outline: [[-wide / 2, -tall / 2], [wide / 2, -tall / 2], [wide / 2, tall / 2], [-wide / 2, tall / 2]], thickness: raise + sagOf(r, wide), plain: false, only: "mesh", ...extra };
}

/** A box standing on a plane: centre of its base at `at`, turned `yaw` degrees about Y; `wide` along its u, `deep` along its v, `tall` up. */
export function box(material: MaterialName, at: Vec3, wide: number, deep: number, tall: number, yaw = 0, extra: Extra = {}): Plate {
  const c = Math.cos(deg(yaw));
  const s = Math.sin(deg(yaw));
  return { kind: "plate", material, frame: { o: [at[0], at[1] + tall / 2, at[2]], u: [c, 0, s], v: [-s, 0, c], w: [0, 1, 0] }, outline: [[-wide / 2, -deep / 2], [wide / 2, -deep / 2], [wide / 2, deep / 2], [-wide / 2, deep / 2]], thickness: tall, plain: true, only: "mesh", ...extra };
}

/** Two perpendicular directions to a unit axis. */
function across(w: Vec3): [Vec3, Vec3] {
  const seed: Vec3 = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit(cross(seed, w));
  return [u, cross(w, u)];
}

/** A round rod (a prism with `sides` faces) from a to b: a pipe, a boom, a cable, a strut. */
export function rod(material: MaterialName, a: Vec3, b: Vec3, radius: number, sides = 10, extra: Extra = {}): Plate {
  const along = sub(b, a);
  const w = unit(along);
  const [u, v] = across(w);
  const outline: [number, number][] = [];
  for (let i = 0; i < sides; i++) outline.push([radius * Math.cos((2 * Math.PI * i) / sides), radius * Math.sin((2 * Math.PI * i) / sides)]);
  return { kind: "plate", material, frame: { o: mul(add(a, b), 0.5), u, v, w }, outline, thickness: len(along), plain: true, only: "mesh", ...extra };
}

/** A flat-sided beam from a to b, `wide` by `deep`. */
export function beam(material: MaterialName, a: Vec3, b: Vec3, wide: number, deep: number, extra: Extra = {}): Plate {
  const along = sub(b, a);
  const w = unit(along);
  const [u, v] = across(w);
  return { kind: "plate", material, frame: { o: mul(add(a, b), 0.5), u, v, w }, outline: [[-wide / 2, -deep / 2], [wide / 2, -deep / 2], [wide / 2, deep / 2], [-wide / 2, deep / 2]], thickness: len(along), plain: true, only: "mesh", ...extra };
}

/** A cone or bowl on any axis, built from a few stacked prisms, `radii` from the `a` end to the `b` end: a dish, a horn, a sensor head. */
export function horn(material: MaterialName, a: Vec3, b: Vec3, radii: readonly number[], sides = 12, extra: Extra = {}): Plate[] {
  const out: Plate[] = [];
  const n = radii.length;
  for (let i = 0; i < n; i++) {
    const p = add(a, mul(sub(b, a), i / n));
    const q = add(a, mul(sub(b, a), (i + 1) / n));
    out.push(rod(material, p, q, radii[i], sides, extra));
  }
  return out;
}

/** A vertical lathe, simple: a straight tube or taper at an offset, from y0 to y1. */
export const post = (material: MaterialName, at: readonly [number, number], r0: number, y0: number, r1: number, y1: number, segs = 8, extra: LatheExtra = {}): Lathe => ({ kind: "lathe", material, at, segs, profile: [[r0, y0], [r1, y1]], only: "mesh", ...extra });

/** A vertical disc (a lid, a plate, a pad) at height y, closed on both faces. */
export const disc = (material: MaterialName, at: readonly [number, number], r: number, y: number, thick: number, segs = 16, extra: LatheExtra = {}): Lathe => ({ kind: "lathe", material, at, segs, profile: [[0.001, y], [r, y], [r, y + thick], [0.001, y + thick]], only: "mesh", ...extra });

/** A ring of rectangular section round the axis: inside radius `r0`, outside `r1`, from y0 to y1. */
export const annulus = (material: MaterialName, r0: number, r1: number, y0: number, y1: number, segs = 48, extra: LatheExtra = {}): Lathe => ({ kind: "lathe", material, segs, profile: [[r1, y0], [r1, y1], [r0, y1], [r0, y0], [r1, y0]], ...extra });

/** A round tube bent into a ring (a torus) of major radius `major` and tube radius `minor`, at height y: a cable ring, a field coil, a hoop. */
export function hoop(material: MaterialName, major: number, y: number, minor: number, segs = 32, sides = 8, extra: LatheExtra = {}): Lathe {
  const profile: [number, number][] = [];
  for (let i = 0; i <= sides; i++) {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / sides;
    profile.push([major + minor * Math.cos(t), y + minor * Math.sin(t)]);
  }
  return { kind: "lathe", material, segs, profile, only: "mesh", ...extra };
}

/** Lines in the drawing only: seams, so the line looks read the same as the mesh. */
export const seams = (weight: Lines["weight"], paths: readonly (readonly Vec3[])[]): Lines => ({ kind: "lines", weight, paths, only: "drawing" });

// ---------------------------------------------------------------------------------------------------------------------------------
// placing and stamping

export interface Pose {
  at: Vec3;
  /** Degrees about Y, from +Z towards +X. */
  yaw?: number;
}

/** Pieces moved to a pose: turned about Y, then moved. A lathe keeps its axis (vertical): its offset, arc and lean turn with it. Everything the kit draws goes through this, and so does a ship's assembly. */
export function place(pieces: readonly Piece[], pose: Pose): Piece[] {
  return applyPose(pieces, pose);
}

/** One template put at many poses. Two or more copies with no moving part share one mesh. A single copy, or a template that already moves, is placed as its own pieces. */
export const stamp = (template: readonly Piece[], poses: readonly Pose[]): Piece[] => {
  if (poses.length < 2 || template.some((piece) => piece.kind === "instances" || piece.move)) return poses.flatMap((pose) => place(template, pose));
  return [{ kind: "instances", template, poses }];
};

/** `count` poses evenly round a circle of radius `r` at height `y`, the first at `start` degrees, each turned to face outwards. */
export function ringOf(count: number, r: number, y: number, start = 0): Pose[] {
  return Array.from({ length: count }, (_, i) => {
    const a = start + (360 * i) / count;
    return { at: [r * Math.sin(deg(a)), y, r * Math.cos(deg(a))] as Vec3, yaw: a };
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// colour: one maker's livery

/**
 * A colour scheme: the panel colours of a module. One maker, so every module takes one of a few.
 *
 * @example
 * ```ts
 * import { LIVERY, type Livery } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const scheme: Livery = LIVERY.science;
 * console.log(scheme.main, scheme.mainWorn);
 * ```
 */
export interface Livery {
  /** The main hull colour, its worn twin, a second colour for blocks, its worn twin, an accent, and the dark structural colour. */
  main: MaterialName;
  mainWorn: MaterialName;
  block: MaterialName;
  blockWorn: MaterialName;
  accent: MaterialName;
  dark: MaterialName;
  /** The colour of the structure under the panels. */
  under: MaterialName;
  /** The foil on the hardware that wears it: silver by default, gold kapton for the industrial and foil schemes. */
  foil?: MaterialName;
}

/**
 * The fleet's liveries. Every one is mostly white thermal blanket, with a few rigid panels in light grey or white, foil on the hardware that wears it, and orange only on small removable access panels (blue on the command scheme): colour is
 * small and functional, as on the ISS, JWST and Orion's service module.
 *
 * @example
 * ```ts
 * import { LIVERY } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(LIVERY.industrial.main, LIVERY.command.block);
 * ```
 */
export const LIVERY = {
  industrial: { main: "blanket", mainWorn: "blanket-worn", block: "hull-white", blockWorn: "hull-white-worn", accent: "hull-orange", dark: "panel-dark", under: "hull-grey", foil: "kapton" },
  science: { main: "blanket", mainWorn: "blanket-worn", block: "hull-white", blockWorn: "hull-white-worn", accent: "hull-orange", dark: "panel-dark", under: "hull-grey", foil: "foil" },
  command: { main: "blanket", mainWorn: "blanket-worn", block: "hull-grey", blockWorn: "hull-grey-dark", accent: "hull-blue", dark: "panel-dark", under: "hull-grey", foil: "foil" },
  foil: { main: "blanket", mainWorn: "blanket-worn", block: "kapton", blockWorn: "foil", accent: "hull-orange", dark: "panel-dark", under: "hull-grey", foil: "kapton" },
  transport: { main: "blanket", mainWorn: "blanket-worn", block: "hull-white", blockWorn: "hull-white-worn", accent: "hull-orange", dark: "panel-dark", under: "hull-grey", foil: "foil" },
} as const satisfies Record<string, Livery>;

/**
 * The name of a livery in `LIVERY`.
 *
 * @example
 * ```ts
 * import type { LiveryName } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const name: LiveryName = "command";
 * console.log(name);
 * ```
 */
export type LiveryName = keyof typeof LIVERY;

// ---------------------------------------------------------------------------------------------------------------------------------
// the detail kit

export interface PanelOptions {
  r: number;
  y0: number;
  y1: number;
  /** The part of the circle covered, in radians; left out: all of it. */
  az?: readonly [number, number];
  livery: Livery;
  seed: string;
  /** Average panel size, metres. */
  wide?: number;
  tall?: number;
  /** Metres standing proud of the hull. */
  raise?: number;
  /** The share of cells left bare, so the dark structure shows through. */
  bare?: number;
  /** Places to leave bare for hardware that stands on the hull (hatches, vents, ladders, cable channels): the middle's azimuth in radians, its height, and its size in metres along the surface. */
  clear?: readonly { az: number; y: number; wide: number; tall: number }[];
}

/** Hexagonal bolt heads on a frame's face, as flat hexes standing `lift` metres off it: the rows of fixings on a panel's frame. */
export function bolts(f: Frame, spots: readonly (readonly [number, number])[], size: number, lift: number, material: MaterialName = "hull-grey-dark"): Plate[] {
  const outline = Array.from({ length: 6 }, (_, i) => [(size / 2) * Math.cos((Math.PI * i) / 3), (size / 2) * Math.sin((Math.PI * i) / 3)] as const);
  return spots.map(([a, b]) => ({ kind: "plate", material, frame: { o: pointOf(f, a, b, lift), u: f.u, v: f.v, w: f.w }, outline, thickness: 0.004, plain: true, sheet: true, only: "mesh" }));
}

/** A grab handle: two stanchions and a round bar, standing `lift` off a frame's face, `length` long along u, centred at (a, b). */
export function grabHandle(f: Frame, a: number, b: number, length: number, lift: number): Piece[] {
  const at = (p: number, h: number): Vec3 => pointOf(f, a + p, b, h);
  return [rod("hull-yellow", at(-length / 2, lift + 0.11), at(length / 2, lift + 0.11), 0.026, 8), rod("hull-grey-dark", at(-length / 2, lift), at(-length / 2, lift + 0.11), 0.018, 6), rod("hull-grey-dark", at(length / 2, lift), at(length / 2, lift + 0.11), 0.018, 6)];
}

/** How many cells a quilt of this size has along a side: about every 0.7 m. */
const cellsOf = (size: number): number => Math.max(1, Math.min(6, Math.round(size / 0.7)));

/** A quilted thermal blanket on a cylinder: a raised skin of pillows with a crease where two meet, so light and shadow run across it. */
export function blanketPanel(material: MaterialName, r: number, az: number, y: number, wide: number, tall: number, raise: number): Plate {
  const nu = cellsOf(wide);
  const nv = cellsOf(tall);
  const bulge = Math.min(0.1, 0.16 * Math.min(wide / nu, tall / nv));
  return panel(material, r, az, y, wide, tall, raise, { quilt: { nu, nv, bulge } });
}

/** A rigid panel with a raised frame round a sunk field, and bolts in the frame's corners (and along it when it is big): plating, an access panel, a louvre. */
export function framedPanel(frame: MaterialName, field: MaterialName, r: number, az: number, y: number, wide: number, tall: number, raise: number, bolted = true): Piece[] {
  const margin = Math.min(0.1, Math.min(wide, tall) * 0.1);
  const out: Piece[] = [panel(frame, r, az, y, wide, tall, raise, { top: field, inset: { margin, depth: Math.min(0.035, raise * 0.6) } })];
  if (bolted && Math.min(wide, tall) > 0.5) {
    const f = patch(r, az, y);
    const lift = raise + 0.01 - sagOf(r, wide) * 0.5;
    const hw = wide / 2 - margin / 2;
    const hh = tall / 2 - margin / 2;
    const spots: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    if (wide > 1.6) spots.push([0, -hh], [0, hh]);
    out.push(...bolts(f, spots, Math.min(0.07, margin * 0.7), lift));
  }
  return out;
}

/**
 * A window in a hull of radius `r` at azimuth `az` and height `y`: a framed port with a raised frame and bolts, a pane that reflects the sky (and glows when the engines are lit), mullions across it every metre or so and a lit sill strip under it.
 * Glass reads as glass: a dark reflective pane held in a frame, never a flat coloured slab.
 */
export function glazing(r: number, az: number, y: number, wide: number, tall: number, raise = 0.1, pane: MaterialName = "window"): Piece[] {
  const out = framedPanel("hull-grey", pane, r, az, y, wide, tall, raise, wide > 0.9);
  const f = patch(r, az, y);
  const lift = raise + 0.012 - sagOf(r, wide) * 0.5;
  const bars = Math.floor(wide / 1.1);
  for (let k = 1; k <= bars; k++) {
    const a = (k / (bars + 1) - 0.5) * (wide - 0.2);
    out.push(beam("hull-grey", pointOf(f, a, -tall / 2 + 0.08, lift), pointOf(f, a, tall / 2 - 0.08, lift), 0.05, 0.04, { plain: false }));
  }
  if (tall > 0.7) out.push(beam("hull-grey", pointOf(f, -wide / 2 + 0.12, 0, lift), pointOf(f, wide / 2 - 0.12, 0, lift), 0.035, 0.04, { plain: false }));
  out.push(panel("lamp-blue", r, az, y - tall / 2 + 0.06, Math.max(0.1, wide - 0.4), 0.05, raise + 0.02));
  return out;
}

/**
 * Crinkled foil on a cylinder: a skin of flat triangles with each corner pushed in or out a little, so every facet takes the light on its own, as the multi-layer insulation of Hubble, JWST and the lunar module does. `cell` is the size of a facet's cell,
 * `crumple` how far a corner can be pushed.
 *
 * @param material `foil` (silver) or `kapton` (gold), or any material.
 * @param r Radius of the surface under it.
 * @param y0 Bottom of the band.
 * @param y1 Top of the band.
 * @param a0 First azimuth, radians.
 * @param a1 Last azimuth, radians.
 * @param seed Any text: the same text gives the same crinkles.
 * @param cell Size of a facet's cell, metres.
 * @param crumple How far a corner is pushed in or out, metres.
 * @returns The pieces: a few plates, each holding a few hundred facets.
 */
export function foilBand(material: MaterialName, r: number, y0: number, y1: number, a0: number, a1: number, seed: string, cell = 0.3, crumple = 0.035): Plate[] {
  const random = rng(`${seed}/foil/${r.toFixed(2)}/${y0.toFixed(2)}/${a0.toFixed(2)}`);
  const cols = Math.max(2, Math.round(((a1 - a0) * r) / cell));
  const rows = Math.max(2, Math.round((y1 - y0) / cell));
  const grid: Vec3[][] = [];
  for (let i = 0; i <= cols; i++) {
    grid.push([]);
    for (let j = 0; j <= rows; j++) {
      const edgeU = i === 0 || i === cols;
      const edgeV = j === 0 || j === rows;
      const a = a0 + ((a1 - a0) * (i + (edgeU ? 0 : (random() - 0.5) * 0.5))) / cols;
      const y = y0 + ((y1 - y0) * (j + (edgeV ? 0 : (random() - 0.5) * 0.5))) / rows;
      const h = crumple * (random() * 2 - 1) * (edgeU || edgeV ? 0.5 : 1) + crumple * 0.4 * Math.sin(i * 1.9 + j * 0.7);
      grid[i].push([(r + h) * Math.sin(a), y, (r + h) * Math.cos(a)]);
    }
  }
  const facets: [Vec3, Vec3, Vec3][] = [];
  const wind = (a: Vec3, b: Vec3, c: Vec3): [Vec3, Vec3, Vec3] => {
    const n = cross(sub(b, a), sub(c, a));
    const centre: Vec3 = [(a[0] + b[0] + c[0]) / 3, 0, (a[2] + b[2] + c[2]) / 3];
    return n[0] * centre[0] + n[2] * centre[2] >= 0 ? [a, b, c] : [a, c, b];
  };
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const [p00, p10, p11, p01] = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
      if (random() < 0.5) facets.push(wind(p00, p10, p11), wind(p00, p11, p01));
      else facets.push(wind(p00, p10, p01), wind(p10, p11, p01));
    }
  const out: Plate[] = [];
  const per = 300;
  for (let k = 0; k < facets.length; k += per) out.push({ kind: "plate", material, frame: { o: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-1, -1], [1, -1], [1, 1], [-1, 1]], thickness: 0.01, plain: true, only: "mesh", facets: facets.slice(k, k + per) });
  return out;
}

/**
 * Plating: rows of panels with a gap between, each a quilted thermal blanket (most of them: the hull reads as white blanket), a rigid panel with a raised frame, bolts and sometimes a grab handle, a patch of crinkled foil, a louvre, or, rarely, a small
 * orange access panel standing on a blanket. Some are worn, some bare, and a seam line for each row and column is in the drawing. The skin of every hull.
 */
export function hullPanels(o: PanelOptions): Piece[] {
  const random = rng(`${o.seed}/panels`);
  const [a0, a1] = o.az ?? [0, 2 * Math.PI];
  const wide = o.wide ?? 2.2;
  const tall = o.tall ?? 1.5;
  const raise = o.raise ?? 0.04;
  const gap = Math.min(0.07, Math.max(0.04, wide * 0.03));
  const bare = o.bare ?? 0.03;
  const L = o.livery;
  const out: Piece[] = [];
  const seamPaths: Vec3[][] = [];
  let y = o.y0;
  while (y < o.y1 - 0.2) {
    const h = Math.min(o.y1 - y, tall * (0.7 + random() * 0.7));
    const arcLen = (a1 - a0) * o.r;
    const cols = Math.max(1, Math.round(arcLen / wide));
    const cuts = [0];
    for (let i = 1; i < cols; i++) cuts.push(i + (random() - 0.5) * 0.5);
    cuts.push(cols);
    for (let i = 0; i < cols; i++) {
      const left = a0 + ((a1 - a0) * cuts[i]) / cols;
      const right = a0 + ((a1 - a0) * cuts[i + 1]) / cols;
      const width = (right - left) * o.r - gap;
      if (width < 0.2 || h - gap < 0.2) continue;
      const roll = random();
      if (roll < bare) continue;
      const az = (left + right) / 2;
      const yc = y + h / 2;
      const ph = h - gap;
      if (o.clear?.some((c) => Math.abs(az - c.az) * o.r < c.wide / 2 + width * 0.12 && Math.abs(yc - c.y) < c.tall / 2 + ph * 0.12)) continue;
      const lift = raise * (0.6 + random() * 0.9);
      const r = o.r + 0.005;
      if (roll < 0.5) out.push(blanketPanel(L.main, r, az, yc, width, ph, lift));
      else if (roll < 0.65) out.push(blanketPanel(L.mainWorn, r, az, yc, width, ph, lift));
      else if (roll < 0.79) out.push(...framedPanel("hull-grey", L.block, r, az, yc, width, ph, lift));
      else if (roll < 0.86) out.push(...framedPanel("hull-grey-dark", L.blockWorn, r, az, yc, width, ph, lift));
      else if (roll < 0.92 && width > 0.5 && ph > 0.5) out.push(...foilBand(L.foil ?? "foil", r + lift * 0.4, yc - ph / 2, yc + ph / 2, az - (width / 2) / o.r, az + (width / 2) / o.r, o.seed, Math.max(0.28, Math.min(0.5, width / 5))));
      else if (roll < 0.95 && width < 1.5 && ph < 1.1) out.push(...framedPanel("hull-grey", L.dark, r, az, yc, width, ph, lift, false));
      else out.push(blanketPanel(L.main, r, az, yc, width, ph, lift));
      // a big rigid panel carries a grab handle; a few blankets carry a small orange access panel with its own frame, bolts and handle
      if (roll >= 0.65 && roll < 0.86 && width > 1.5 && random() < 0.5) out.push(...grabHandle(patch(r, az, yc), 0, ph * 0.28, Math.min(0.6, width * 0.3), lift + 0.01));
      if (roll < 0.65 && width > 1.0 && ph > 0.9 && random() < 0.16) {
        const aw = Math.min(0.9, width * 0.55);
        const ah = Math.min(0.65, ph * 0.55);
        out.push(...framedPanel(L.accent, "hull-orange-worn", r, az + (random() - 0.5) * 0.3 * (width / o.r), yc + (random() - 0.5) * 0.2, aw, ah, lift + 0.07));
      }
    }
    const ringPath: Vec3[] = [];
    const steps = Math.max(8, Math.ceil(((a1 - a0) * 24) / (2 * Math.PI)));
    for (let k = 0; k <= steps; k++) {
      const a = a0 + ((a1 - a0) * k) / steps;
      ringPath.push([(o.r + 0.02) * Math.sin(a), y + h, (o.r + 0.02) * Math.cos(a)]);
    }
    seamPaths.push(ringPath);
    for (let i = 1; i < cols; i++) {
      const a = a0 + ((a1 - a0) * cuts[i]) / cols;
      seamPaths.push([[(o.r + 0.02) * Math.sin(a), y, (o.r + 0.02) * Math.cos(a)], [(o.r + 0.02) * Math.sin(a), y + h, (o.r + 0.02) * Math.cos(a)]]);
    }
    y += h;
  }
  out.push(seams("weld", seamPaths));
  return out;
}

export interface HatchOptions {
  r: number;
  az: number;
  y: number;
  /** Side of the square door, metres. */
  size?: number;
  /** A round hatch with a handwheel (a pressure door) instead of a square access panel. */
  round?: boolean;
}

/** An access hatch: a raised frame, a door in its own colour with hinges, a latch or a handwheel, a warning stripe and a lamp. */
export function hatch(o: HatchOptions): Piece[] {
  const s = o.size ?? 1.2;
  const f = patch(o.r, o.az, o.y);
  const at = (a: number, b: number, c: number): Vec3 => pointOf(f, a, b, c);
  const out: Piece[] = [];
  const raise = 0.06;
  const slab = (material: MaterialName, a: number, b: number, w: number, h: number, thick: number, lift: number): Plate => {
    const centre = pointOf(f, a, b, lift + thick / 2 - sagOf(o.r, w) / 2);
    return { kind: "plate", material, frame: { o: centre, u: f.u, v: f.v, w: f.w }, outline: [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], thickness: thick + sagOf(o.r, w), plain: true, only: "mesh" };
  };
  if (o.round) {
    const sides = 14;
    const ring = (material: MaterialName, radius: number, lift: number, thick: number): Plate => ({ kind: "plate", material, frame: { o: at(0, 0, lift + thick / 2 - sagOf(o.r, radius * 2) / 2), u: f.u, v: f.v, w: f.w }, outline: Array.from({ length: sides }, (_, i) => [radius * Math.cos((2 * Math.PI * i) / sides), radius * Math.sin((2 * Math.PI * i) / sides)] as const), thickness: thick + sagOf(o.r, radius * 2), plain: true, only: "mesh" });
    out.push(ring("hull-grey-dark", s * 0.62, 0, raise), ring("hull-grey", s * 0.5, raise, 0.05), ring("hull-grey-dark", s * 0.12, raise + 0.05, 0.05));
    out.push(rod("hull-grey", at(0, 0, raise + 0.1), at(0, 0, raise + 0.2), s * 0.2, 8), ...[0, 90].map((a) => rod("hull-grey", at(Math.cos(deg(a)) * s * 0.3, Math.sin(deg(a)) * s * 0.3, raise + 0.2), at(-Math.cos(deg(a)) * s * 0.3, -Math.sin(deg(a)) * s * 0.3, raise + 0.2), 0.025, 6)));
  } else {
    // the frame: four jambs round a door
    out.push(slab("hull-grey-dark", 0, s * 0.56, s * 1.2, s * 0.08, raise, 0), slab("hull-grey-dark", 0, -s * 0.56, s * 1.2, s * 0.08, raise, 0), slab("hull-grey-dark", s * 0.56, 0, s * 0.08, s * 1.0, raise, 0), slab("hull-grey-dark", -s * 0.56, 0, s * 0.08, s * 1.0, raise, 0));
    out.push(slab("hull-grey", 0, 0, s * 0.98, s * 0.98, 0.04, raise - 0.02));
    // hinges on one side, a latch on the other
    out.push(slab("panel-dark", -s * 0.5, s * 0.3, 0.1, 0.22, 0.06, raise + 0.02), slab("panel-dark", -s * 0.5, -s * 0.3, 0.1, 0.22, 0.06, raise + 0.02), slab("lamp-amber", s * 0.38, 0, 0.12, 0.3, 0.05, raise + 0.02));
    out.push(slab("hazard", 0, -s * 0.4, s * 0.8, 0.07, 0.015, raise + 0.02), slab("hazard", 0, s * 0.4, s * 0.8, 0.07, 0.015, raise + 0.02));
  }
  out.push(rod("lamp-amber", at(s * 0.7, s * 0.45, raise), at(s * 0.7, s * 0.45, raise + 0.1), 0.05, 6));
  return out;
}

export interface ConduitOptions {
  r: number;
  az: number;
  y0: number;
  y1: number;
  /** How many pipes run side by side. */
  count?: number;
  /** Pipe radius, metres. */
  pipe?: number;
  material?: MaterialName;
  seed: string;
}

/** A conduit run up a hull: pipes in a bundle held off the surface by clamps, each leaving the structure through a gland and an elbow at the bottom and going back in at the top, with a flange joint half way. Pipes come in the colours pipes come in: stainless, white, grey and a coloured one. */
export function conduitRun(o: ConduitOptions): Piece[] {
  const random = rng(`${o.seed}/conduit/${o.az.toFixed(3)}/${o.y0.toFixed(2)}`);
  const count = o.count ?? 3;
  const pr = o.pipe ?? 0.08;
  const pitch = pr * 3;
  const stand = pr * 4.2;
  const mats: MaterialName[] = ["pipe-steel", "hull-white-worn", "pipe-steel", "hull-grey", o.material ?? "coolant"];
  const out: Piece[] = [];
  const f = patch(o.r, o.az, 0);
  for (let i = 0; i < count; i++) {
    const side = (i - (count - 1) / 2) * pitch;
    const base = pointOf(f, side, 0, stand);
    const r = Math.hypot(base[0], base[2]);
    const a = Math.atan2(base[0], base[2]);
    const x = r * Math.sin(a);
    const z = r * Math.cos(a);
    const material = mats[Math.floor(random() * mats.length)];
    const into = pointOf(f, side, 0, -sagOf(o.r, Math.abs(side) * 2));
    out.push(post(material, [x, z], pr, o.y0, pr, o.y1, 12));
    for (const [y, down] of [[o.y0, 1], [o.y1, -1]] as const) {
      const corner: Vec3 = [x, y, z];
      const wall: Vec3 = [into[0], y, into[2]];
      out.push(ball(material, corner, pr * 1.08), rod(material, corner, wall, pr, 10), rod("hull-grey-dark", wall, add(wall, mul(unit(sub(corner, wall)), pr * 0.5)), pr * 2.6, 10), rod("hull-grey", add(wall, mul(unit(sub(corner, wall)), pr * 0.5)), add(wall, mul(unit(sub(corner, wall)), pr * 1.6)), pr * 1.6, 10));
      out.push(post("hull-grey-dark", [x, z], pr * 1.5, y + down * pr * 1.2, pr * 1.5, y + down * pr * 2.6, 12));
    }
    const mid = (o.y0 + o.y1) / 2 + (random() - 0.5) * 0.4 * (o.y1 - o.y0);
    out.push(post("hull-grey-dark", [x, z], pr * 1.75, mid, pr * 1.75, mid + pr * 0.7, 12), post("black", [x, z], pr * 1.6, mid + pr * 0.7, pr * 1.6, mid + pr * 0.95, 12), post("hull-grey-dark", [x, z], pr * 1.75, mid + pr * 0.95, pr * 1.75, mid + pr * 1.65, 12));
    if (random() < 0.5) out.push(post(random() < 0.5 ? "coolant" : "copper", [x, z], pr * 1.2, mid - pr * 2.2, pr * 1.2, mid - pr * 1.2, 12));
  }
  // clamps
  const clampEvery = 1.4;
  for (let y = o.y0 + 0.3; y < o.y1 - 0.1; y += clampEvery) {
    const centre = pointOf(f, 0, 0, stand * 0.55);
    out.push({ kind: "plate", material: "hull-grey-dark", frame: { o: [centre[0], y, centre[2]], u: f.u, v: f.v, w: f.w }, outline: [[-((count - 1) * pitch) / 2 - pr * 1.5, -0.045], [((count - 1) * pitch) / 2 + pr * 1.5, -0.045], [((count - 1) * pitch) / 2 + pr * 1.5, 0.045], [-((count - 1) * pitch) / 2 - pr * 1.5, 0.045]], thickness: stand * 1.5, plain: true, only: "mesh" });
  }
  return out;
}

/** A ring of pipe round a hull at height y: a coolant or cable ring, with a clamp and a valve. */
export function pipeRing(material: MaterialName, r: number, y: number, pipe = 0.09, segs = 32): Piece[] {
  return [hoop(material, r + pipe * 1.2, y, pipe, Math.min(segs, 32), 6), annulus("hull-grey-dark", r, r + pipe * 0.9, y - pipe * 1.8, y + pipe * 1.8, 20, { only: "mesh" })];
}

/** A cable tray up a hull: a channel with cables lying in it. */
export function cableTray(r: number, az: number, y0: number, y1: number, width = 0.5, seed = "tray"): Piece[] {
  const random = rng(`${seed}/tray/${az.toFixed(3)}`);
  const f = patch(r, az, 0);
  const side = (a: number, w: number, lift: number): Plate => beam("hull-grey-dark", pointOf(f, a, y0, lift), pointOf(f, a, y1, lift), w, 0.06);
  const out: Piece[] = [side(0, width, 0.03), side(-width / 2, 0.05, 0.1), side(width / 2, 0.05, 0.1)];
  const cables = Math.max(2, Math.floor(width / 0.12));
  const mats: MaterialName[] = ["lamp-red", "coolant", "hull-white-worn", "lamp-blue", "hull-yellow"];
  for (let i = 0; i < cables; i++) out.push(rod(mats[Math.floor(random() * mats.length)], pointOf(f, ((i + 0.5) / cables - 0.5) * (width - 0.1), y0, 0.09), pointOf(f, ((i + 0.5) / cables - 0.5) * (width - 0.1), y1, 0.09), 0.025, 6));
  return out;
}

/** A louvred vent: a frame with slats. */
export function vent(r: number, az: number, y: number, wide = 1.0, tall = 0.7, slats = 6): Piece[] {
  const f = patch(r, az, y);
  const out: Piece[] = [panel("panel-dark", r, az, y, wide, tall, 0.05)];
  for (let i = 0; i < slats; i++) {
    const b = ((i + 0.5) / slats - 0.5) * (tall - 0.1);
    const centre = pointOf(f, 0, b, 0.09 - sagOf(r, wide) / 2);
    out.push({ kind: "plate", material: "hull-grey", frame: { o: centre, u: f.u, v: f.v, w: f.w }, outline: [[-wide / 2 + 0.06, -tall / slats / 4], [wide / 2 - 0.06, -tall / slats / 4], [wide / 2 - 0.06, tall / slats / 4], [-wide / 2 + 0.06, tall / slats / 4]], thickness: 0.03, plain: true, only: "mesh" });
  }
  return out;
}

/** A ladder up a hull: two rails and rungs. */
export function ladder(r: number, az: number, y0: number, y1: number, width = 0.5): Piece[] {
  const f = patch(r, az, 0);
  const out: Piece[] = [rod("hull-yellow", pointOf(f, -width / 2, y0, 0.12), pointOf(f, -width / 2, y1, 0.12), 0.03, 6), rod("hull-yellow", pointOf(f, width / 2, y0, 0.12), pointOf(f, width / 2, y1, 0.12), 0.03, 6)];
  for (let y = y0 + 0.25; y < y1; y += 0.3) out.push(rod("hull-yellow", pointOf(f, -width / 2, y, 0.12), pointOf(f, width / 2, y, 0.12), 0.02, 6));
  for (let y = y0 + 0.5; y < y1; y += 1.6) for (const s of [-width / 2, width / 2]) out.push(rod("hull-grey-dark", pointOf(f, s, y, 0.02), pointOf(f, s, y, 0.12), 0.025, 6));
  return out;
}

/** A hazard stripe: alternating blocks of warning yellow and black round a hull between two heights. */
export function hazardBand(r: number, y0: number, y1: number, blocks = 24, az: readonly [number, number] = [0, 2 * Math.PI]): Piece[] {
  const out: Piece[] = [];
  const span = (az[1] - az[0]) / blocks;
  for (let i = 0; i < blocks; i++) {
    const a0 = az[0] + i * span;
    out.push({ kind: "lathe", material: i % 2 ? "black" : "hazard", segs: 3, only: "mesh", profile: [[r + 0.02, y0], [r + 0.02, y1]], arc: () => [a0, a0 + span] });
  }
  return out;
}

const SEGMENTS: Readonly<Record<string, string>> = { "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg" };

/** Digits in seven bars on a hull: the module's number, in our own simple figures. `size` is the height of a digit in metres. */
export function stencil(digits: string, r: number, az: number, y: number, size: number, material: MaterialName = "black"): Piece[] {
  const out: Piece[] = [];
  const w = size * 0.5;
  const t = size * 0.12;
  const pitch = w + t * 2.5;
  const f0 = patch(r, az, y);
  const total = (digits.length - 1) * pitch;
  [...digits].forEach((d, i) => {
    const cx = i * pitch - total / 2;
    const bar = (name: string): [number, number, number, number] => {
      const h = size / 2;
      return { a: [0, h, w, t] as const, b: [w / 2, h / 2, t, h], c: [w / 2, -h / 2, t, h], d: [0, -h, w, t], e: [-w / 2, -h / 2, t, h], f: [-w / 2, h / 2, t, h], g: [0, 0, w, t] }[name] as [number, number, number, number];
    };
    for (const name of SEGMENTS[d] ?? "") {
      const [bx, by, bw, bh] = bar(name);
      const centre = pointOf(f0, cx + bx, by, 0.02);
      out.push({ kind: "plate", material, frame: { o: centre, u: f0.u, v: f0.v, w: f0.w }, outline: [[-bw / 2, -bh / 2], [bw / 2, -bh / 2], [bw / 2, bh / 2], [-bw / 2, bh / 2]], thickness: 0.03, plain: true, only: "mesh" });
    }
  });
  return out;
}

/** A ring of bolt heads (hexagons) on a flat face, at radius `r`, standing from height `y` up (`down` false) or down (`down` true). */
export function boltRing(r: number, y: number, count: number, size: number, down = false, material: MaterialName = "hull-grey-dark"): Piece[] {
  const head: Lathe = { kind: "lathe", material, segs: 6, only: "mesh", profile: down ? [[size * 0.5, y], [size * 0.5, y - size * 0.6], [size * 0.001, y - size * 0.6]] : [[size * 0.5, y], [size * 0.5, y + size * 0.6], [size * 0.001, y + size * 0.6]] };
  return stamp([head], ringOf(count, r, 0));
}

export interface Lamp {
  at: Vec3;
  /** `amber` (work), `blue` (docking), `red` (warning), `port` (the red navigation light), `starboard` (the green one), `strobe` (a white flash) or `flood` (a floodlight's lens). They glow with the Lights choice. */
  colour: "amber" | "blue" | "red" | "port" | "starboard" | "strobe" | "flood";
  size?: number;
}

const LAMP_MATERIAL: Readonly<Record<Lamp["colour"], MaterialName>> = { amber: "lamp-amber", blue: "lamp-blue", red: "lamp-red", port: "nav-red", starboard: "nav-green", strobe: "strobe", flood: "flood" };

/** Lamps: small domes in a bright colour. They glow with the Lights choice. */
export function lamps(list: readonly Lamp[]): Piece[] {
  return list.map(({ at, colour, size = 0.1 }): Piece => ({ kind: "lathe", material: LAMP_MATERIAL[colour], at: [at[0], at[2]], segs: 8, only: "mesh", profile: [[size, at[1]], [size * 0.85, at[1] + size * 0.5], [size * 0.001, at[1] + size * 0.8]] }));
}

/** A navigation light on a hull of radius `r` at azimuth `az` (radians) and height `y`: a housing, a stalk and a lens, red (`port`) or green (`starboard`), or a white `strobe`. The red and the green stay steady. The strobe flashes. */
export function navLight(colour: "port" | "starboard" | "strobe", r: number, az: number, y: number, size = 0.16): Piece[] {
  const f = patch(r, az, y);
  const out: Piece[] = [box("hull-grey-dark", pointOf(f, 0, 0, 0.02), size * 2.6, size * 2.2, size * 0.8, (az * 180) / Math.PI)];
  const tip = pointOf(f, 0, 0, size * 0.8);
  out.push(rod("hull-grey", pointOf(f, 0, 0, 0.02), tip, size * 0.45, 8), ...lamps([{ at: [tip[0], tip[1] + size * 0.1, tip[2]], colour, size }]));
  return out;
}

/** A floodlight on a hull of radius `r` at azimuth `az` and height `y`, aimed along the hull by `tilt` (radians, up positive): a bracket, a round housing with cooling fins, a bright lens and a warm pool on the hull. */
export function floodlight(r: number, az: number, y: number, tilt = 0): Piece[] {
  const f = patch(r, az, y);
  const out: Piece[] = [box("hull-grey-dark", pointOf(f, 0, -0.1, 0.02), 0.42, 0.3, 0.18, (az * 180) / Math.PI)];
  const base = pointOf(f, 0, 0.02, 0.2);
  const dir: Vec3 = unit(add(mul(f.w, Math.cos(tilt)), mul(f.v, Math.sin(tilt))));
  const mouth = add(base, mul(dir, 0.42));
  out.push(rod("hull-grey", pointOf(f, 0, -0.1, 0.1), base, 0.04, 6), rod("hull-grey", base, mouth, 0.2, 12), rod("hull-grey-dark", add(base, mul(dir, 0.04)), add(base, mul(dir, 0.1)), 0.23, 12), rod("hull-grey-dark", add(base, mul(dir, 0.16)), add(base, mul(dir, 0.22)), 0.23, 12), rod("flood", mouth, add(mouth, mul(dir, 0.03)), 0.17, 12));
  out.push(...lightPool({ o: pointOf(f, 0, -0.2, 0.06), u: f.u, v: f.v, w: f.w }, 0.9));
  return out;
}

/**
 * How a separation joint is made: how many latch hooks and umbilical plates it has. Set on a ship's place (`separation`) or a module's options.
 *
 * @example
 * ```ts
 * import { shipPieces, type SeparationOptions } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const joint: SeparationOptions = { latches: 8, umbilicals: 2 };
 * console.log(shipPieces([{ module: "tank-cryo-12" }, { module: "tank-cryo-12", separation: joint }], { detail: 0.3 }).length > 0);
 * ```
 */
export interface SeparationOptions {
  /** Latch hooks round the joint (default 12). */
  latches?: number;
  /** Umbilical plates (default 4). */
  umbilicals?: number;
}

/**
 * A separation joint at a module boundary: where a ship is planned to come apart in flight. A split collar ring with a groove between its halves, hooked latches round it, pyrotechnic bolt caps, umbilical plates with their
 * sockets and strobes, and a hazard stencil along the cut. Place it at the height `y` where two modules meet, on a hull of radius `r` (a collar's outer radius).
 *
 * @param r Radius of the joint's ring, metres.
 * @param y Height of the joint plane.
 * @param options How many latches and umbilical plates.
 * @returns The pieces: mesh only, apart from the groove's seam line.
 */
export function separationJoint(r: number, y: number, options: SeparationOptions = {}): Piece[] {
  const latches = options.latches ?? 12;
  const umbilicals = options.umbilicals ?? 4;
  const out: Piece[] = [];
  out.push(annulus("hull-grey", r - 0.1, r + 0.2, y - 0.3, y - 0.04, 56, { only: "mesh" }), annulus("hull-grey", r - 0.1, r + 0.2, y + 0.04, y + 0.3, 56, { only: "mesh" }), annulus("black", r - 0.1, r + 0.17, y - 0.04, y + 0.04, 56, { only: "mesh" }));
  out.push(seams("weld", [Array.from({ length: 49 }, (_, k) => [(r + 0.21) * Math.sin((2 * Math.PI * k) / 48), y, (r + 0.21) * Math.cos((2 * Math.PI * k) / 48)] as Vec3)]));
  // a latch: a body across the joint, a hook that closes over the upper ring, its pin and a flag
  const latch: Piece[] = [box("hull-grey-dark", [0, -0.28, r + 0.2], 0.5, 0.34, 0.56), box("hull-grey", [0, 0.1, r + 0.34], 0.34, 0.2, 0.2), rod("hull-grey", [0, 0.24, r + 0.22], [0, 0.24, r + 0.56], 0.07, 8), rod("hull-yellow", [-0.2, -0.05, r + 0.48], [0.2, -0.05, r + 0.48], 0.035, 6)];
  out.push(...stamp(place(latch, { at: [0, y, 0] }), ringOf(latches, 0, 0)));
  // the pyrotechnic bolts: hex caps in two rings either side of the groove
  out.push(...boltRing(r + 0.08, y + 0.3, latches * 2, 0.16), ...boltRing(r + 0.08, y - 0.3, latches * 2, 0.16, true));
  // umbilical plates between the latches: a plate, a hazard strip, round sockets and a strobe
  const plate: Piece[] = [box("hull-grey-dark", [0, -0.55, r + 0.12], 1.1, 0.22, 1.1), box("hazard", [0, -0.55, r + 0.26], 1.0, 0.02, 0.1), ...[-0.3, 0, 0.3].flatMap((x) => [rod("pipe-steel", [x, -0.15, r + 0.14], [x, -0.15, r + 0.34], 0.09, 10), rod("black", [x, -0.15, r + 0.34], [x, -0.15, r + 0.36], 0.06, 10)]), ...lamps([{ at: [0.4, 0.34, r + 0.26], colour: "strobe", size: 0.07 }])];
  out.push(...stamp(place(plate, { at: [0, y, 0] }), ringOf(umbilicals, 0, 0, 180 / Math.max(1, latches))));
  return out;
}

export type AntennaKind = "whip" | "dish" | "yagi" | "phased" | "omni" | "horn";

/** An antenna on a base point, pointing along `dir` (a unit direction; up is [0, 1, 0]): a whip, a dish on a pole, a boom with elements, a phased panel, a ball or a horn. `size` is its length or width in metres. */
export function antenna(kind: AntennaKind, base: Vec3, dir: Vec3, size: number, seed = "antenna"): Piece[] {
  const d = unit(dir);
  const [u, v] = across(d);
  const tip = add(base, mul(d, size));
  const out: Piece[] = [];
  const random = rng(`${seed}/${kind}/${base.join(",")}`);
  const foot = rod("hull-grey-dark", base, add(base, mul(d, size * 0.12)), size * 0.04, 8);
  if (kind === "whip") out.push(foot, rod("hull-grey", base, tip, size * 0.008 + 0.01, 6), rod("lamp-red", add(tip, mul(d, -0.0)), add(tip, mul(d, size * 0.03)), size * 0.012 + 0.012, 6));
  if (kind === "dish") {
    const stalk = add(base, mul(d, size * 0.45));
    out.push(foot, rod("hull-grey", base, stalk, size * 0.025, 8));
    out.push(...horn("hull-white", add(stalk, mul(d, size * 0.02)), add(stalk, mul(d, size * 0.2)), [size * 0.5, size * 0.44, size * 0.34, size * 0.2], 16));
    out.push(rod("hull-grey-dark", add(stalk, mul(d, size * 0.2)), add(stalk, mul(d, size * 0.42)), size * 0.012, 6), rod("copper", add(stalk, mul(d, size * 0.38)), add(stalk, mul(d, size * 0.46)), size * 0.04, 8));
    for (const s of [0, 1, 2]) out.push(rod("hull-grey", add(stalk, mul(d, size * 0.2)), add(add(stalk, mul(d, size * 0.02)), add(mul(u, Math.cos((s * 2 * Math.PI) / 3) * size * 0.42), mul(v, Math.sin((s * 2 * Math.PI) / 3) * size * 0.42))), size * 0.008, 5));
  }
  if (kind === "yagi") {
    out.push(foot, rod("hull-grey", add(base, mul(d, size * 0.12)), tip, size * 0.012, 6));
    const n = 6;
    for (let i = 0; i < n; i++) {
      const p = add(base, mul(d, size * (0.2 + (0.78 * i) / n)));
      const half = size * (0.28 - 0.025 * i);
      out.push(rod("hull-grey", add(p, mul(u, -half)), add(p, mul(u, half)), size * 0.008, 5), rod("hull-grey", add(p, mul(v, -half * 0.8)), add(p, mul(v, half * 0.8)), size * 0.008, 5));
    }
  }
  if (kind === "phased") {
    const c = add(base, mul(d, size * 0.06));
    out.push(foot, { kind: "plate", material: "hull-grey-dark", frame: { o: c, u, v, w: d }, outline: [[-size / 2, -size / 3], [size / 2, -size / 3], [size / 2, size / 3], [-size / 2, size / 3]], thickness: size * 0.06, plain: true, only: "mesh" });
    const nx = 6;
    const ny = 4;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) out.push(rod(random() < 0.1 ? "lamp-blue" : "hull-white", add(add(c, mul(d, size * 0.03)), add(mul(u, ((i + 0.5) / nx - 0.5) * size * 0.9), mul(v, ((j + 0.5) / ny - 0.5) * size * 0.6))), add(add(c, mul(d, size * 0.06)), add(mul(u, ((i + 0.5) / nx - 0.5) * size * 0.9), mul(v, ((j + 0.5) / ny - 0.5) * size * 0.6))), size * 0.03, 6));
  }
  if (kind === "omni") out.push(foot, rod("hull-grey", base, add(base, mul(d, size * 0.7)), size * 0.02, 6), ...horn("hull-white", add(base, mul(d, size * 0.6)), add(base, mul(d, size)), [size * 0.12, size * 0.16, size * 0.12], 12));
  if (kind === "horn") out.push(foot, ...horn("hull-white-worn", add(base, mul(d, size * 0.1)), tip, [size * 0.12, size * 0.18, size * 0.26, size * 0.34], 12), rod("panel-dark", add(base, mul(d, size * 0.94)), tip, size * 0.3, 12));
  return out;
}

export interface RadiatorOptions {
  /** The wing stands from the hull at radius `r0` and goes out `reach` metres, `height` tall, in the plane of the spine and azimuth `az`. */
  r0: number;
  az: number;
  y: number;
  reach: number;
  height: number;
  seed: string;
  /** Folded against the hull in a box (stowed), or spread out (deployed). */
  stowed?: boolean;
  /** Number of panels. */
  panels?: number;
}

/** A radiator wing, stowed or deployed. Deployed: a boom out from the hull, hinged panels along it with coolant pipes in them and a manifold. Stowed: the same panels folded into a closed box with latches. */
export function radiator(o: RadiatorOptions): Piece[] {
  const n = o.panels ?? Math.max(2, Math.round(o.reach / 2.2));
  const f: Frame = { o: [o.r0 * Math.sin(o.az), o.y, o.r0 * Math.cos(o.az)], u: [Math.sin(o.az), 0, Math.cos(o.az)], v: [0, 1, 0], w: [Math.cos(o.az), 0, -Math.sin(o.az)] };
  const at = (a: number, b: number, c: number): Vec3 => pointOf(f, a, b, c);
  const out: Piece[] = [];
  if (o.stowed) {
    const depth = 0.12 * n + 0.3;
    out.push({ kind: "plate", material: "hull-white", frame: { o: at(depth / 2, 0, 0), u: f.v, v: f.w, w: f.u }, outline: [[-o.height / 2, -o.reach / 4], [o.height / 2, -o.reach / 4], [o.height / 2, o.reach / 4], [-o.height / 2, o.reach / 4]], thickness: depth, plain: true, only: "mesh" });
    for (let i = 0; i < 5; i++) out.push(beam("hull-grey-dark", at(0.05, ((i + 0.5) / 5 - 0.5) * o.height, o.reach / 4 + 0.02), at(depth, ((i + 0.5) / 5 - 0.5) * o.height, o.reach / 4 + 0.02), 0.1, 0.04), beam("hull-grey-dark", at(0.05, ((i + 0.5) / 5 - 0.5) * o.height, -o.reach / 4 - 0.02), at(depth, ((i + 0.5) / 5 - 0.5) * o.height, -o.reach / 4 - 0.02), 0.1, 0.04));
    for (let i = 0; i < 6; i++) out.push(beam("hull-grey", at(depth + 0.01, ((i + 0.5) / 6 - 0.5) * o.height, 0), at(depth + 0.01, ((i + 0.5) / 6 - 0.5) * o.height, 0.0001), o.reach / 2.4, 0.02));
    out.push(...lamps([{ at: at(depth + 0.03, o.height * 0.4, o.reach / 8), colour: "red", size: 0.07 }]));
    return out;
  }
  // deployed: a boom, hinges, panels in a row along it, pipes
  const gap = 0.12;
  const wide = (o.reach - gap * (n + 1)) / n;
  out.push(beam("hull-grey-dark", at(0, o.height / 2 + 0.05, 0), at(o.reach, o.height / 2 + 0.05, 0), 0.14, 0.14), beam("hull-grey-dark", at(0, -o.height / 2 - 0.05, 0), at(o.reach, -o.height / 2 - 0.05, 0), 0.14, 0.14));
  out.push(beam("hull-grey-dark", at(0.05, -o.height / 2, 0), at(0.05, o.height / 2, 0), 0.2, 0.2));
  for (let i = 0; i < n; i++) {
    const a0 = gap + i * (wide + gap);
    const centre = at(a0 + wide / 2, 0, 0);
    out.push({ kind: "plate", material: i % 3 === 2 ? "radiator-hot" : "radiator", frame: { o: centre, u: f.u, v: f.v, w: f.w }, outline: [[-wide / 2, -o.height / 2], [wide / 2, -o.height / 2], [wide / 2, o.height / 2], [-wide / 2, o.height / 2]], thickness: 0.07, plain: true, only: "mesh" });
    // pipes along the panel, both faces
    const pipes = Math.max(3, Math.round(o.height / 0.75));
    for (let k = 0; k < pipes; k++) {
      const b = ((k + 0.5) / pipes - 0.5) * (o.height - 0.3);
      for (const c of [0.06, -0.06]) out.push(beam("copper", at(a0 + 0.1, b, c), at(a0 + wide - 0.1, b, c), 0.05, 0.05));
    }
    out.push(beam("hull-grey", at(a0 + 0.02, -o.height / 2, 0), at(a0 + 0.02, o.height / 2, 0), 0.05, 0.12), beam("hull-grey", at(a0 + wide - 0.02, -o.height / 2, 0), at(a0 + wide - 0.02, o.height / 2, 0), 0.05, 0.12));
    out.push(rod("hull-grey-dark", at(a0 - gap, o.height / 2, 0), at(a0, o.height / 2, 0), 0.06, 6), rod("hull-grey-dark", at(a0 - gap, -o.height / 2, 0), at(a0, -o.height / 2, 0), 0.06, 6));
  }
  out.push(seams("feature", [[at(0, o.height / 2, 0), at(o.reach, o.height / 2, 0), at(o.reach, -o.height / 2, 0), at(0, -o.height / 2, 0), at(0, o.height / 2, 0)]]));
  return out;
}

/** A shield or heat-shield dome: tiles in a mosaic on a cone or a dome (`profile` is [radius, y] going up), with a ring of seam line at each step, radial seams, and a band of fixings at the rim. */
export function tileShield(profile: readonly (readonly [number, number])[], seed: string, segs = 48, radial = 24): Piece[] {
  const random = rng(`${seed}/tiles`);
  const out: Piece[] = [{ kind: "lathe", material: "tile", segs, body: true, outline: true, profile, rings: profile.slice(1, -1).map(([, y]) => y) }];
  // a second skin of tile blocks: rings of plates on the surface, each tile slightly raised
  const paths: Vec3[][] = [];
  for (let k = 0; k < radial; k++) {
    const a = (2 * Math.PI * k) / radial;
    paths.push(profile.map(([r, y]) => [(r + 0.02) * Math.sin(a), y, (r + 0.02) * Math.cos(a)] as Vec3));
  }
  out.push(seams("weld", paths));
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[i + 1];
    const rings = Math.max(1, Math.round(Math.hypot(r1 - r0, y1 - y0) / 0.9));
    for (let j = 0; j < rings; j++) {
      const t = (j + 0.5) / rings;
      const r = r0 + (r1 - r0) * t;
      const y = y0 + (y1 - y0) * t;
      const n = Math.max(6, Math.round((2 * Math.PI * r) / 1.1));
      for (let q = 0; q < n; q++) {
        if (random() < 0.3) continue;
        const a = (2 * Math.PI * (q + 0.5)) / n;
        const slope = Math.atan2(r0 - r1, y1 - y0);
        out.push(tileBlock(r, y, a, slope, 2 * Math.PI * r / n * 0.82, Math.hypot(r1 - r0, y1 - y0) / rings * 0.82, random() < 0.5 ? "tile-plain" : "panel-dark"));
      }
    }
  }
  return out;
}

/** One raised tile on a cone: a plate lying on the surface at radius r, height y, azimuth a, the surface leaning `slope` radians from vertical. */
function tileBlock(r: number, y: number, a: number, slope: number, wide: number, tall: number, material: MaterialName): Plate {
  const n: Vec3 = [Math.sin(a), 0, Math.cos(a)];
  const tangent: Vec3 = [n[2], 0, -n[0]];
  // up the surface: along the profile; out of it: the surface normal
  const up: Vec3 = [-n[0] * Math.sin(slope), Math.cos(slope), -n[2] * Math.sin(slope)];
  const out: Vec3 = [n[0] * Math.cos(slope), Math.sin(slope), n[2] * Math.cos(slope)];
  const o: Vec3 = [n[0] * r + out[0] * 0.012, y + out[1] * 0.012, n[2] * r + out[2] * 0.012];
  return { kind: "plate", material, frame: { o, u: tangent, v: up, w: out }, outline: [[-wide / 2, -tall / 2], [wide / 2, -tall / 2], [wide / 2, tall / 2], [-wide / 2, tall / 2]], thickness: 0.025, plain: true, only: "mesh" };
}

export interface GreebleOptions {
  r: number;
  y0: number;
  y1: number;
  az: readonly [number, number];
  /** How many in all, before the module's detail level. */
  count: number;
  seed: string;
  livery: Livery;
}

/** Small machinery scattered over a patch of hull: junction boxes, valve wheels, sensor posts, pump housings, bollards, in sizes from a hand to a person. */
export function greebles(o: GreebleOptions): Piece[] {
  const random = rng(`${o.seed}/greebles`);
  const out: Piece[] = [];
  for (let i = 0; i < o.count; i++) {
    const az = o.az[0] + random() * (o.az[1] - o.az[0]);
    const y = o.y0 + random() * (o.y1 - o.y0);
    const f = patch(o.r, az, y);
    const kind = random();
    const size = 0.12 + random() * 0.3;
    const lift = (c: number) => pointOf(f, 0, 0, c);
    if (kind < 0.35) out.push(box(random() < 0.5 ? "hull-grey-dark" : "panel-dark", lift(0.03), size * 1.4, size, size * 0.6, (az * 180) / Math.PI));
    else if (kind < 0.55) out.push(post("hull-grey", [lift(0.02)[0], lift(0.02)[2]], size * 0.5, y - 0.02, size * 0.5, y + size * 0.35, 8, { only: "mesh" }));
    else if (kind < 0.7) out.push(rod("hull-grey", lift(0), lift(0.1 + size), size * 0.12, 6), rod("lamp-red", lift(0.1 + size), lift(0.16 + size), size * 0.28, 8));
    else if (kind < 0.85) out.push(rod("hull-grey-dark", lift(0), lift(0.12), size * 0.5, 8), rod("copper", lift(0.12), lift(0.2), size * 0.38, 8));
    else out.push(rod("hull-grey", lift(-0.01), lift(0.18 + size * 0.6), size * 0.14, 6), ...horn("hull-white-worn", lift(0.15 + size * 0.6), lift(0.35 + size), [size * 0.2, size * 0.34], 8));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// round pipes with flanges, bends and brackets; I-beams, channels and round struts

/** A sphere, for the elbow where two pipes meet: round whichever way they run. */
export const ball = (material: MaterialName, at: Vec3, radius: number): Lathe => ({
  kind: "lathe",
  material,
  at: [at[0], at[2]],
  segs: 10,
  only: "mesh",
  profile: Array.from({ length: 7 }, (_, i) => [Math.max(0.001, radius * Math.sin((Math.PI * i) / 6)), at[1] - radius * Math.cos((Math.PI * i) / 6)] as const),
});

export type PipeEnd = "flange" | "cap" | "bulkhead" | "valve";

export interface PipeOptions {
  /** Sides of the tube: 12 reads as round. */
  sides?: number;
  /** A flange every this many metres along a run, and at each end. */
  flangeEvery?: number;
  /** A clamp bracket every this many metres. */
  bracketEvery?: number;
  /** The way the structure is from the pipe, as a unit vector: brackets stand off the structure on a leg that way. Left out: no legs. */
  support?: Vec3;
  /** Material of the flanges and brackets. */
  fittings?: MaterialName;
  /** How a run ends, at its first and its last point. A `flange` is bolted to a mating flange on a short stub, a `cap` is a bolted blind flange, a `bulkhead` is a gland where the pipe goes through the structure (a pad, a boot and a bolt circle) and a `valve` is a valve body with its handwheel. Default: both ends flanged. */
  ends?: readonly [PipeEnd, PipeEnd];
  /** The radius of a bend, in pipe radii: the corner is rounded to it. 0 gives a sharp corner with a round elbow. Default 3. */
  bend?: number;
  /** A colour-coding band round the pipe at each joint: teal for coolant, copper for power. */
  band?: MaterialName;
}

/** Hexagonal bolt heads in a circle of radius `r` on a flange face at `c` facing `d`: flat hexes, so a bolt costs six vertices. */
function boltCircle(c: Vec3, d: Vec3, r: number, head: number, count = 6, rotate = 0.4): Plate[] {
  const [u, v] = across(d);
  const hex = Array.from({ length: 6 }, (_, i) => [head * Math.cos((Math.PI * i) / 3), head * Math.sin((Math.PI * i) / 3)] as const);
  return Array.from({ length: count }, (_, k) => {
    const dir = add(mul(u, Math.cos((k * 2 * Math.PI) / count + rotate)), mul(v, Math.sin((k * 2 * Math.PI) / count + rotate)));
    return { kind: "plate", material: "hull-grey", frame: { o: add(add(c, mul(dir, r)), mul(d, head * 0.12)), u, v, w: d }, outline: hex, thickness: 0.004, plain: true, sheet: true, only: "mesh" } as Plate;
  });
}

/** A bolted flange joint across a pipe at `c` running along `d`: two flange discs with a gasket between and a bolt circle on each face. `blind` closes the far side with a bolted cap and a test boss. */
function flangeJoint(c: Vec3, d: Vec3, radius: number, fittings: MaterialName, blind: boolean, band?: MaterialName): Piece[] {
  const t = radius * 0.34;
  const R = radius * 1.75;
  const sides = radius < 0.12 ? 10 : 14;
  const out: Piece[] = [rod(fittings, c, add(c, mul(d, t)), R, sides), rod("black", add(c, mul(d, t)), add(c, mul(d, t * 1.25)), R * 0.93, sides), rod(fittings, add(c, mul(d, t * 1.25)), add(c, mul(d, t * 2.25)), R, sides)];
  out.push(...boltCircle(c, d, R * 0.78, radius * 0.24, 6, 0.4), ...boltCircle(add(c, mul(d, t * 2.25)), d, R * 0.78, radius * 0.24, 6, 0.4));
  if (blind) {
    out.push(rod(fittings, add(c, mul(d, t * 2.25)), add(c, mul(d, t * 2.5)), R * 0.9, sides), rod("hull-grey", add(c, mul(d, t * 2.5)), add(c, mul(d, t * 3.3)), radius * 0.55, 6));
  } else {
    out.push(rod("hull-grey", add(c, mul(d, t * 2.25)), add(c, mul(d, t * 2.25 + radius * 1.1)), radius * 1.18, sides));
  }
  if (band) out.push(rod(band, add(c, mul(d, -radius * 0.9)), add(c, mul(d, -radius * 0.4)), radius * 1.12, sides));
  return out;
}

/** A gland where a pipe passes through the structure at `c`, the pipe running along `d` into it: a pad, a seal boot, a nut ring and a bolt circle. */
function gland(c: Vec3, d: Vec3, radius: number, fittings: MaterialName): Piece[] {
  const out: Piece[] = [rod(fittings, c, add(c, mul(d, radius * 0.4)), radius * 3.1, 12), rod("black", add(c, mul(d, radius * 0.4)), add(c, mul(d, radius * 0.62)), radius * 2.1, 12)];
  out.push(rod("hull-grey", add(c, mul(d, radius * 0.62)), add(c, mul(d, radius * 1.5)), radius * 1.8, 12), rod("hull-grey", add(c, mul(d, radius * 1.5)), add(c, mul(d, radius * 2.7)), radius * 1.4, 12), rod(fittings, add(c, mul(d, radius * 2.7)), add(c, mul(d, radius * 3.3)), radius * 1.5, 12));
  out.push(...boltCircle(c, d, radius * 2.55, radius * 0.3, 8));
  return out;
}

/** A valve in a pipe at `c` along `d`: a round body between two flanges, a stem and a handwheel. */
function valve(c: Vec3, d: Vec3, radius: number, fittings: MaterialName): Piece[] {
  const [u] = across(d);
  const body = add(c, mul(d, radius * 1.4));
  const out: Piece[] = [rod("hull-grey", c, add(c, mul(d, radius * 2.8)), radius * 1.55, 12), rod(fittings, c, add(c, mul(d, radius * 0.3)), radius * 1.9, 12), rod(fittings, add(c, mul(d, radius * 2.5)), add(c, mul(d, radius * 2.8)), radius * 1.9, 12)];
  const top = add(body, mul(u, radius * 3.1));
  out.push(rod("hull-grey-dark", body, top, radius * 0.35, 8), rod("lamp-red", add(top, mul(u, -radius * 0.1)), add(top, mul(u, radius * 0.2)), radius * 1.2, 12), rod("hull-grey-dark", add(top, mul(across(u)[0], -radius * 1.2)), add(top, mul(across(u)[0], radius * 1.2)), radius * 0.14, 6));
  return out;
}

/** A clamp bracket on a pipe at `c`: a band round the pipe, a saddle and a stand-off post to a base pad on the structure (`s` is the way the structure lies), with two bolts through the pad. */
function clamp(c: Vec3, d: Vec3, s: Vec3, radius: number, fittings: MaterialName): Piece[] {
  const out: Piece[] = [rod(fittings, add(c, mul(d, -radius * 0.45)), add(c, mul(d, radius * 0.45)), radius * 1.28, 12)];
  const [u] = across(d);
  out.push(rod(fittings, add(c, mul(u, -radius * 1.45)), add(c, mul(u, radius * 1.45)), radius * 0.2, 6));
  const foot = add(c, mul(s, radius * 3.4));
  out.push(rod("hull-grey", add(c, mul(s, radius * 1.2)), foot, radius * 0.4, 8), rod("hull-grey-dark", foot, add(foot, mul(s, radius * 0.3)), radius * 1.3, 8));
  for (const q of [-1, 1]) out.push(rod("hull-grey", add(add(foot, mul(d, q * radius * 0.85)), mul(s, -radius * 0.1)), add(add(foot, mul(d, q * radius * 0.85)), mul(s, radius * 0.45)), radius * 0.2, 6));
  return out;
}

/**
 * A pipe along a path: a round tube for each straight run, corners rounded to a real bend (a chain of short tubes with a round joint at each, `bend` pipe radii of curve), bolted flange joints at an interval, clamp brackets with stand-off
 * posts, and a proper end for each run: a flange bolted to a mating flange, a blind cap, a gland through the structure or a valve. Never a bare end, never a square bar: the tube has twelve sides by default.
 *
 * @param points The path, in metres: two or more points.
 * @param radius The pipe's radius.
 * @param material The pipe's material: `pipe-steel` for stainless, `coolant` for a coolant or feed line, `copper` for a power or coil line.
 * @param options Sides, spacing of flanges and brackets, the way the structure is, the fittings' material, the ends, the bend and a colour-coding band.
 * @returns The pieces.
 */
export function pipeRun(points: readonly Vec3[], radius: number, material: MaterialName, options: PipeOptions = {}): Piece[] {
  const sides = options.sides ?? 12;
  const fittings = options.fittings ?? "hull-grey-dark";
  const [first, last] = options.ends ?? (["flange", "flange"] as const);
  const bendK = options.bend ?? 3;
  const out: Piece[] = [];
  // round the corners: each interior point is replaced by an arc of short straight steps
  const path: { p: Vec3; joint: boolean }[] = [{ p: points[0], joint: false }];
  for (let i = 1; i + 1 < points.length; i++) {
    const [p0, p1, p2] = [points[i - 1], points[i], points[i + 1]];
    const d1 = unit(sub(p1, p0));
    const d2 = unit(sub(p2, p1));
    const turn = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2])));
    if (turn < 0.05) {
      path.push({ p: p1, joint: false });
      continue;
    }
    const trim = Math.min(bendK * radius * Math.tan(turn / 2), 0.45 * len(sub(p1, p0)), 0.45 * len(sub(p2, p1)));
    if (bendK <= 0 || trim < radius) {
      path.push({ p: p1, joint: true });
      continue;
    }
    const a = sub(p1, mul(d1, trim));
    const b = add(p1, mul(d2, trim));
    const steps = Math.max(2, Math.ceil(turn / 0.4));
    for (let k = 0; k <= steps; k++) {
      const s = k / steps;
      const q: Vec3 = [(1 - s) * (1 - s) * a[0] + 2 * s * (1 - s) * p1[0] + s * s * b[0], (1 - s) * (1 - s) * a[1] + 2 * s * (1 - s) * p1[1] + s * s * b[1], (1 - s) * (1 - s) * a[2] + 2 * s * (1 - s) * p1[2] + s * s * b[2]];
      path.push({ p: q, joint: k > 0 && k < steps });
    }
  }
  path.push({ p: points[points.length - 1], joint: false });
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i].p;
    const b = path[i + 1].p;
    const length = len(sub(b, a));
    if (length < radius * 0.5) continue;
    const d = unit(sub(b, a));
    out.push(rod(material, a, b, radius, sides));
    const at = (t: number): Vec3 => add(a, mul(d, t));
    const every = options.flangeEvery ?? Math.max(radius * 40, 2);
    const flanges = Math.floor(length / every);
    for (let k = 1; k <= flanges; k++) out.push(...flangeJoint(at((length * k) / (flanges + 1) - radius * 0.5), d, radius, fittings, false, options.band));
    const bracketEvery = options.bracketEvery ?? Math.max(radius * 30, 1.5);
    const brackets = Math.floor(length / bracketEvery);
    if (options.support) for (let k = 1; k <= brackets; k++) out.push(...clamp(at(((k - 0.5) * length) / brackets), d, unit(options.support), radius, fittings));
    else for (let k = 1; k <= brackets; k++) out.push(rod(fittings, add(at(((k - 0.5) * length) / brackets), mul(d, -radius * 0.3)), add(at(((k - 0.5) * length) / brackets), mul(d, radius * 0.3)), radius * 1.25, sides));
    if (path[i + 1].joint) out.push(ball(material, b, radius * 1.04));
  }
  // the ends
  const finish = (kind: PipeEnd, p: Vec3, away: Vec3): void => {
    // `away` points from the end back along the pipe, so the fitting stands beyond the end
    const out_ = mul(away, -1);
    if (kind === "bulkhead") out.push(...gland(p, away, radius, fittings));
    else if (kind === "valve") out.push(...valve(p, out_, radius, fittings));
    else out.push(...flangeJoint(p, out_, radius, fittings, kind === "cap", options.band));
  };
  if (path.length >= 2) {
    finish(first, path[0].p, unit(sub(path[1].p, path[0].p)));
    finish(last, path[path.length - 1].p, unit(sub(path[path.length - 2].p, path[path.length - 1].p)));
  }
  return out;
}

/** A section extruded along a path: convex outlines in (side, up) coordinates, the up direction fixed so a beam lies the way it was asked to. */
function section(material: MaterialName, a: Vec3, b: Vec3, up: Vec3, outline: readonly (readonly [number, number])[], extra: Extra = {}): Plate {
  const w = unit(sub(b, a));
  const side = unit(cross(up, w));
  const v = cross(w, side);
  return { kind: "plate", material, frame: { o: mul(add(a, b), 0.5), u: side, v, w }, outline, thickness: len(sub(b, a)), plain: true, only: "mesh", ...extra };
}

const rect = (cx: number, cy: number, w: number, h: number): [number, number][] => [[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]];

/**
 * An I-beam from a to b: a web between two flanges. `up` is the way the web stands; `height` and `width` are the section's, `t` the plate thickness.
 *
 * @param material The beam's material.
 * @param a The start.
 * @param b The end.
 * @param up The direction the web stands, a unit vector not along the beam.
 * @param height The section's height.
 * @param width The flange width.
 * @param t The plate thickness.
 * @returns Three plates: the web and the two flanges.
 */
export function iBeam(material: MaterialName, a: Vec3, b: Vec3, up: Vec3, height: number, width: number, t = height * 0.12): Plate[] {
  return [section(material, a, b, up, rect(0, 0, t, height - 2 * t)), section(material, a, b, up, rect(0, (height - t) / 2, width, t)), section(material, a, b, up, rect(0, -(height - t) / 2, width, t))];
}

/** A channel from a to b: a web with a flange at each edge on one side, the open side towards -`up`'s side axis. */
export function channel(material: MaterialName, a: Vec3, b: Vec3, up: Vec3, height: number, width: number, t = height * 0.12): Plate[] {
  return [section(material, a, b, up, rect(-width / 2 + t / 2, 0, t, height)), section(material, a, b, up, rect(0, (height - t) / 2, width, t)), section(material, a, b, up, rect(0, -(height - t) / 2, width, t))];
}

/** A round strut: a tube with a collar at each end, for a brace. */
export function strut(material: MaterialName, a: Vec3, b: Vec3, radius: number, sides = 12): Plate[] {
  const d = unit(sub(b, a));
  // a tube with a fitting at each end: a collar, a round ball for the joint, and a cap
  return [rod(material, a, b, radius, sides), rod("hull-grey-dark", add(a, mul(d, radius * 0.6)), add(a, mul(d, radius * 2.0)), radius * 1.45, sides), rod("hull-grey-dark", add(b, mul(d, -radius * 2.0)), add(b, mul(d, -radius * 0.6)), radius * 1.45, sides), rod("hull-grey", add(a, mul(d, -radius * 0.1)), add(a, mul(d, radius * 0.6)), radius * 1.7, sides), rod("hull-grey", add(b, mul(d, -radius * 0.6)), add(b, mul(d, radius * 0.1)), radius * 1.7, sides)];
}

// ---------------------------------------------------------------------------------------------------------------------------------
// life aboard: portholes, observation domes, the rooms people live in

/** A round plate in a frame (a lens, a ring, a shutter): a disc of `radius` standing from `lift` to `lift` + `thick` off the frame's face. */
function roundPlate(f: Frame, material: MaterialName, radius: number, lift: number, thick: number, sides = 16, at: readonly [number, number] = [0, 0]): Plate {
  return { kind: "plate", material, frame: { o: pointOf(f, at[0], at[1], lift + thick / 2), u: f.u, v: f.v, w: f.w }, outline: Array.from({ length: sides }, (_, i) => [radius * Math.cos((2 * Math.PI * (i + 0.5)) / sides), radius * Math.sin((2 * Math.PI * (i + 0.5)) / sides)] as const), thickness: thick, plain: true, only: "mesh" };
}

/**
 * An armoured porthole in a hull of radius `r` at azimuth `az` and height `y`: a heavy frame ring with a bolt circle, a thick reflective pane in a retaining lip, and a burn shutter on a hinge arm. `open` swings the shutter back
 * flat against the hull beside the port (the pane glows when the engines are lit); `closed` shuts it over the pane, with four latch dogs, a handwheel and a hazard stripe for the burn.
 *
 * @param r Radius of the hull.
 * @param az Azimuth, radians.
 * @param y Height.
 * @param size Outer radius of the frame in metres (default 0.5).
 * @param shutter `open` or `closed`.
 * @returns The pieces.
 */
export function porthole(r: number, az: number, y: number, size = 0.5, shutter: "open" | "closed" = "open"): Piece[] {
  const f = patch(r, az, y);
  const out: Piece[] = [roundPlate(f, "hull-grey-dark", size * 1.28, 0, 0.1, 18), roundPlate(f, "hull-grey", size * 1.05, 0.1, 0.07, 18), roundPlate(f, "hull-grey-dark", size * 0.74, 0.17, 0.04, 16), roundPlate(f, "window", size * 0.62, 0.12, 0.07, 16)];
  out.push(...bolts(f, Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4 + 0.2) * size * 0.92, Math.sin((k * Math.PI) / 4 + 0.2) * size * 0.92] as const), size * 0.1, 0.18));
  // the hinge block and arm on the left of the frame
  const hinge = pointOf(f, -size * 1.35, 0, 0.1);
  out.push(box("hull-grey-dark", [hinge[0], hinge[1] - size * 0.3, hinge[2]], size * 0.28, size * 0.3, size * 0.6, (az * 180) / Math.PI));
  if (shutter === "open") {
    // folded back flat on the hull beside the port: the disc, its latch ring and the arm to the hinge
    const at: [number, number] = [-size * 2.6, 0];
    out.push(roundPlate(f, "hull-grey", size * 1.02, 0.06, 0.1, 18, at), roundPlate(f, "hull-grey-dark", size * 0.78, 0.16, 0.04, 16, at), roundPlate(f, "hazard", size * 0.16, 0.2, 0.012, 8, [at[0] - size * 0.7, at[1] + size * 0.55]));
    out.push(rod("hull-grey-dark", pointOf(f, -size * 1.35, 0, 0.12), pointOf(f, at[0] + size * 1.0, 0, 0.12), size * 0.1, 8), ...lamps([{ at: pointOf(f, size * 1.2, size * 0.9, 0.12), colour: "amber", size: size * 0.1 }]));
  } else {
    const dogs = [0, 90, 180, 270].map((a) => box("hull-grey-dark", pointOf(f, Math.cos(deg(a)) * size * 1.05, Math.sin(deg(a)) * size * 1.05, 0.2), size * 0.26, size * 0.26, size * 0.16, (az * 180) / Math.PI));
    out.push(roundPlate(f, "hull-grey", size * 1.12, 0.21, 0.13, 18), roundPlate(f, "hull-grey-dark", size * 0.86, 0.34, 0.05, 16), ...dogs);
    out.push(rod("hull-grey-dark", pointOf(f, 0, 0, 0.38), pointOf(f, 0, 0, 0.5), size * 0.1, 8), rod("hull-yellow", pointOf(f, -size * 0.34, 0, 0.5), pointOf(f, size * 0.34, 0, 0.5), size * 0.05, 6), rod("hull-yellow", pointOf(f, 0, -size * 0.34, 0.5), pointOf(f, 0, size * 0.34, 0.5), size * 0.05, 6));
    out.push(roundPlate(f, "hazard", size * 0.9, 0.2, 0.016, 18), roundPlate(f, "hull-grey", size * 0.84, 0.215, 0.018, 18), ...lamps([{ at: pointOf(f, size * 1.2, size * 0.9, 0.12), colour: "red", size: size * 0.1 }]));
  }
  return out;
}

/**
 * An armoured observation dome on a base ring at `base` (the middle of the ring, at its foot), a descendant of the ISS Cupola: a base ring with lamps, a reflective glass dome with six meridian ribs, two latitude hoops and an oculus
 * on top, and six armoured petals that either lie open round the base (`open`, the dome shows its glass and glows when the engines are lit) or close over the glass (`closed`, as in a burn or a storm).
 *
 * @param base The middle of the ring's foot, in metres.
 * @param radius Radius of the dome at its foot.
 * @param shutters `open` or `closed`.
 * @returns The pieces.
 */
export function observationDome(base: Vec3, radius: number, shutters: "open" | "closed" = "open"): Piece[] {
  const [bx, by, bz] = base;
  const at: [number, number] = [bx, bz];
  const high = radius * 0.78;
  const shell = (extra: number): [number, number][] => Array.from({ length: 9 }, (_, i) => {
    const t = (i / 8) * (Math.PI / 2) * 0.96;
    return [Math.max(0.001, (radius + extra) * Math.cos(t)), by + 0.35 + (high + extra) * Math.sin(t)] as [number, number];
  });
  const out: Piece[] = [annulus("hull-grey-dark", radius * 0.98, radius * 1.22, by, by + 0.38, 36, { at, only: "mesh" }), annulus("hull-grey", radius * 1.0, radius * 1.14, by + 0.38, by + 0.5, 36, { at, only: "mesh" })];
  out.push({ kind: "lathe", material: "glass-clear", at, segs: 36, only: "mesh", profile: shell(0) });
  // six meridian ribs, two latitude hoops and the oculus ring
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    out.push({ kind: "lathe", material: "hull-grey", at, segs: 2, only: "mesh", profile: shell(0.06), arc: () => [a - 0.05, a + 0.05] });
  }
  for (const f of [0.35, 0.7]) {
    const t = f * (Math.PI / 2) * 0.96;
    out.push(hoop("hull-grey", (radius + 0.06) * Math.cos(t), by + 0.35 + (high + 0.06) * Math.sin(t), 0.05, 36, 5, { at }));
  }
  out.push(hoop("hull-grey-dark", radius * 0.2, by + 0.35 + high * 0.99, 0.09, 16, 5, { at }), disc("glass-clear", at, radius * 0.17, by + 0.35 + high * 0.99, 0.03, 12));
  out.push(...lamps(Array.from({ length: 6 }, (_, k) => ({ at: [bx + radius * 1.13 * Math.sin((k * Math.PI) / 3 + 0.5), by + 0.5, bz + radius * 1.13 * Math.cos((k * Math.PI) / 3 + 0.5)] as Vec3, colour: "amber" as const, size: 0.1 }))));
  // six armoured petals, one over each pane
  for (let k = 0; k < 6; k++) {
    const a0 = (k * Math.PI) / 3 + 0.07;
    const a1 = ((k + 1) * Math.PI) / 3 - 0.07;
    if (shutters === "closed") {
      out.push({ kind: "lathe", material: "hull-grey", at, segs: 8, outline: true, profile: shell(0.17), arc: () => [a0, a1] }, { kind: "lathe", material: "hull-grey-dark", at, segs: 8, only: "mesh", profile: shell(0.22).filter((_, i) => i < 7).map(([rr, yy]) => [rr * 0.995, yy] as [number, number]), arc: () => [a0 + 0.06, a1 - 0.06] });
    } else {
      // folded back: a plate lying out from the ring, tilted up a little, with its hinge pin
      const am = (a0 + a1) / 2;
      const p = (rad: number, a: number, h: number): Vec3 => [bx + rad * Math.sin(a), by + h, bz + rad * Math.cos(a)];
      out.push(quad("hull-grey", p(radius * 1.2, a0, 0.5), p(radius * 1.2, a1, 0.5), p(radius * 1.6, a1 - 0.04, 0.1), p(radius * 1.6, a0 + 0.04, 0.1), 0.1), rod("hull-grey-dark", p(radius * 1.2, a0, 0.5), p(radius * 1.2, a1, 0.5), 0.06, 6), box("hull-grey-dark", p(radius * 1.35, am, 0.3), 0.3, 0.3, 0.1, (am * 180) / Math.PI));
    }
  }
  return out;
}

/**
 * The name of a room in `ROOMS`.
 *
 * @example
 * ```ts
 * import { ROOMS, type RoomKind } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const kind: RoomKind = "garden";
 * console.log(ROOMS[kind].name);
 * ```
 */
export type RoomKind = "cabin" | "mess" | "gym" | "garden" | "lounge" | "medical" | "shelter" | "recreation" | "school" | "plaza" | "bridge" | "quarantine" | "engineering" | "lifesupport" | "stores" | "airlock";

/**
 * One room: its id, the name a cutaway labels it with, its job, and its size in metres.
 *
 * @example
 * ```ts
 * import { ROOMS, type RoomSpec } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const mess: RoomSpec = ROOMS.mess;
 * console.log(mess.name, mess.size);
 * ```
 */
export interface RoomSpec {
  id: RoomKind;
  /** The name a cutaway labels it with. */
  name: string;
  /** What it is for, in a line. */
  job: string;
  /** Floor size in metres: width, depth, and the height of the room. */
  size: readonly [number, number, number];
}

/**
 * The rooms people need, named, each with a job and a size in metres: a cabin, a mess, a gym, a garden, an observation lounge, medical, a storm shelter, a recreation room, a school, a plaza, a bridge, a quarantine room, engineering, life support, stores and an airlock. A ship places them in a cutaway
 * with `room`.
 *
 * @example
 * ```ts
 * import { ROOMS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.values(ROOMS).map((room) => room.name).join(", "));
 * ```
 */
export const ROOMS: Readonly<Record<RoomKind, RoomSpec>> = {
  cabin: { id: "cabin", name: "Crew cabin", job: "A bunk, a desk, a locker and a porthole of one's own: privacy.", size: [3.2, 3.8, 2.6] },
  mess: { id: "mess", name: "Mess and galley", job: "Long tables, a galley counter and benches where a crew eats together.", size: [7, 5, 2.8] },
  gym: { id: "gym", name: "Exercise room", job: "Treadmills, a rowing machine and weight racks that keep bones strong.", size: [6, 5, 2.8] },
  garden: { id: "garden", name: "Green room", job: "Planter beds under grow-lamps: fresh food and something alive to look at.", size: [6, 5, 3] },
  lounge: { id: "lounge", name: "Observation lounge", job: "Low seats round a big window on the stars.", size: [6, 6, 3] },
  medical: { id: "medical", name: "Medical bay", job: "Beds, a scanner and a surgical table.", size: [6, 5, 2.8] },
  shelter: { id: "shelter", name: "Storm shelter", job: "A shielded, padded room for a solar storm, with water and air for days.", size: [5, 5, 2.4] },
  recreation: { id: "recreation", name: "Recreation room", job: "A library, a games table and soft chairs.", size: [6, 5, 2.8] },
  school: { id: "school", name: "School room", job: "Rows of desks and a board for the ship's children.", size: [7, 6, 2.8] },
  plaza: { id: "plaza", name: "Plaza", job: "An open paved square with trees, benches and a fountain: the middle of a ship's town.", size: [14, 14, 6] },
  bridge: { id: "bridge", name: "Bridge", job: "The consoles a crew commands the ship from.", size: [8, 8, 3] },
  quarantine: { id: "quarantine", name: "Quarantine", job: "A sealed room off the medical bay, for a long voyage.", size: [4, 4, 2.6] },
  engineering: { id: "engineering", name: "Engineering", job: "Reactor and drive controls, and a workshop bench.", size: [8, 6, 3] },
  lifesupport: { id: "lifesupport", name: "Life support", job: "Air, water and the recycling plant.", size: [6, 5, 2.8] },
  stores: { id: "stores", name: "Stores", job: "Racks of spares and food.", size: [6, 5, 3] },
  airlock: { id: "airlock", name: "Airlock", job: "Suits and the lock beside a port.", size: [3, 4, 2.6] },
};

/**
 * One of the rooms in `ROOMS`, furnished, standing on its floor at the origin (the middle of its floor), ready to `place` in a cutaway. Plain boxes and rods in the fleet's materials: nothing is bare.
 *
 * @param kind Which room.
 * @param seed Any text, so two of the same room differ a little.
 * @returns The pieces.
 */
export function room(kind: RoomKind, seed = "room"): Piece[] {
  const [w, d, h] = ROOMS[kind].size;
  const random = rng(`${seed}/${kind}`);
  const out: Piece[] = [box("deck", [0, 0, 0], w, d, 0.06), box("hull-white", [0, h, 0], w, d, 0.05)];
  const wall = (x: number, z: number, wide: number, deep: number): void => void out.push(box("hull-white", [x, 0.06, z], wide, deep, h - 0.1));
  wall(0, -d / 2, w, 0.06);
  wall(-w / 2, 0, 0.06, d);
  out.push(box("lamp-blue", [0, h - 0.04, 0], w * 0.5, 0.2, 0.04), box("lamp-blue", [0, h - 0.04, d * 0.3], w * 0.4, 0.14, 0.04));
  const table = (x: number, z: number, tw: number, td: number, th = 0.75): void => void out.push(box("wood", [x, th - 0.05, z], tw, td, 0.05), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => rod("hull-grey", [x + (sx * tw) / 2.2, 0.06, z + (sz * td) / 2.2], [x + (sx * tw) / 2.2, th - 0.05, z + (sz * td) / 2.2], 0.025, 6)));
  const chair = (x: number, z: number, yaw = 0): void => void out.push(box("fabric", [x, 0.4, z], 0.5, 0.5, 0.1, yaw), box("fabric", [x, 0.5, z - 0.22], 0.5, 0.06, 0.45, yaw), rod("hull-grey", [x, 0.06, z], [x, 0.4, z], 0.03, 6));
  if (kind === "cabin") {
    out.push(box("hull-blue", [-w / 2 + 0.7, 0.4, -d / 2 + 1.1], 1.0, 2.0, 0.3), box("fabric", [-w / 2 + 0.7, 0.7, -d / 2 + 1.1], 0.95, 1.9, 0.14), box("fabric", [-w / 2 + 0.55, 0.84, -d / 2 + 0.5], 0.5, 0.35, 0.12), box("hull-grey", [w / 2 - 0.5, 0.06, -d / 2 + 0.4], 0.8, 0.5, 2.0));
    table(w / 2 - 0.9, 0.2, 1.2, 0.6);
    chair(w / 2 - 1.5, 0.2, 90);
  } else if (kind === "mess") {
    for (const z of [-1.2, 0.6]) table(0.2, z, 4.6, 0.8);
    for (const z of [-1.2, 0.6]) for (const x of [-1.6, 0, 1.6]) {
      chair(x + 0.2, z - 0.7);
      chair(x + 0.2, z + 0.7, 180);
    }
    out.push(box("pipe-steel", [0, 0.06, d / 2 - 0.5], w * 0.7, 0.6, 0.9), box("hull-grey-dark", [0, 0.96, d / 2 - 0.5], w * 0.7, 0.62, 0.05), box("lamp-amber", [-1.2, 1.2, d / 2 - 0.4], 0.4, 0.05, 0.1), box("lamp-amber", [1.2, 1.2, d / 2 - 0.4], 0.4, 0.05, 0.1));
  } else if (kind === "gym") {
    for (const x of [-2, 0, 2]) out.push(box("hull-grey-dark", [x, 0.1, 0.4], 0.7, 1.6, 0.25), box("black", [x, 0.35, 0.4], 0.62, 1.5, 0.04), rod("hull-grey", [x - 0.3, 0.35, -0.4], [x - 0.3, 1.2, -0.5], 0.03, 6), rod("hull-grey", [x + 0.3, 0.35, -0.4], [x + 0.3, 1.2, -0.5], 0.03, 6));
    out.push(box("hull-grey", [-w / 2 + 0.6, 0.06, -d / 2 + 0.5], 0.7, 2.0, 1.4), rod("hull-grey-dark", [w / 2 - 1.0, 0.9, -d / 2 + 0.3], [w / 2 - 1.0 + 1.2, 0.9, -d / 2 + 0.3], 0.03, 6), rod("black", [w / 2 - 1.5, 0.9, -d / 2 + 0.3], [w / 2 - 1.0, 0.9, -d / 2 + 0.3], 0.07, 8));
  } else if (kind === "garden") {
    for (const x of [-1.8, 0, 1.8]) {
      out.push(box("hull-grey", [x, 0.06, 0.2], 1.3, 3.4, 0.45), box("soil", [x, 0.46, 0.2], 1.2, 3.3, 0.04));
      for (let k = 0; k < 5; k++) out.push(rod("leaf", [x + (random() - 0.5) * 0.9, 0.5, -1.2 + k * 0.7], [x + (random() - 0.5) * 0.9, 0.9 + random() * 0.5, -1.2 + k * 0.7], 0.12 + random() * 0.1, 7));
      out.push(box("grow-lamp", [x, h - 0.6, 0.2], 1.0, 3.0, 0.07), rod("hull-grey", [x, h - 0.6, -1.2], [x, h, -1.2], 0.03, 6));
    }
  } else if (kind === "lounge") {
    out.push(box("window", [0, 0.5, d / 2 - 0.03], w * 0.9, 0.05, h * 0.7), ...[-2, -0.7, 0.7, 2].map((x) => beam("hull-grey", [x, 0.5, d / 2 - 0.05], [x, 0.5 + h * 0.7, d / 2 - 0.05], 0.06, 0.06)));
    for (const x of [-1.8, 0, 1.8]) out.push(box("fabric", [x, 0.25, 0.5], 1.2, 0.9, 0.3), box("fabric", [x, 0.5, 0.15], 1.2, 0.2, 0.35));
    out.push(box("hull-grey", [0, 0.06, -1.2], 1.6, 0.7, 0.4));
  } else if (kind === "medical") {
    for (const x of [-2, 0]) out.push(box("hull-white-worn", [x, 0.5, -0.6], 0.9, 2.0, 0.12), box("hull-grey", [x, 0.06, -0.6], 0.5, 1.4, 0.44), box("lamp-blue", [x, 1.6, -0.6], 0.5, 0.5, 0.05));
    out.push(box("hull-grey-dark", [2, 0.06, 0.5], 1.2, 2.2, 0.9), rod("hull-white", [2, 0.96, 0.5], [2, 1.9, 0.5], 0.08, 8), ...horn("hull-white", [2, 1.9, 0.5], [2.8, 1.9, 0.5], [0.35, 0.3], 10), box("hull-white", [-w / 2 + 0.5, 0.06, d / 2 - 1.0], 0.5, 1.8, 1.8));
  } else if (kind === "shelter") {
    out.push(box("hull-grey-dark", [0, 0.06, -d / 2 + 0.15], w - 0.2, 0.3, h - 0.1), box("hull-grey-dark", [-w / 2 + 0.15, 0.06, 0], 0.3, d - 0.2, h - 0.1));
    for (const x of [-1.5, 0, 1.5]) out.push(box("fabric", [x, 0.4, -d / 2 + 0.8], 1.2, 0.7, 0.3), box("fabric", [x, 0.9, -d / 2 + 0.8], 1.2, 0.7, 0.3));
    out.push(box("hull-blue", [w / 2 - 0.7, 0.06, d / 2 - 0.7], 1.0, 0.8, 1.2), box("hazard", [0, h - 0.3, d / 2 - 0.1], 1.6, 0.05, 0.12));
  } else if (kind === "recreation") {
    out.push(box("hull-grey", [0, 0.06, -d / 2 + 0.4], w - 0.4, 0.5, 2.2));
    for (let k = 0; k < 6; k++) out.push(box(k % 2 ? "hull-blue" : "fabric", [-w / 2 + 0.8 + k * 0.9, 0.8 + (k % 3) * 0.6, -d / 2 + 0.7], 0.5, 0.2, 0.4));
    table(0, 0.5, 1.8, 1.0, 0.7);
    for (const [x, z, yaw] of [[-1.3, 0.5, 90], [1.3, 0.5, 270], [0, 1.4, 180]] as const) chair(x, z, yaw);
  } else if (kind === "school") {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      table(-2.4 + c * 1.6, -0.3 + r * 1.3, 1.1, 0.6, 0.65);
      chair(-2.4 + c * 1.6, 0.3 + r * 1.3, 180);
    }
    out.push(box("black", [0, 0.9, -d / 2 + 0.06], 4.2, 0.05, 1.3), box("hull-grey", [0, 0.06, -d / 2 + 0.5], 1.4, 0.6, 0.8));
  } else if (kind === "plaza") {
    out.push({ kind: "lathe", material: "concrete", segs: 40, only: "mesh", profile: [[0.01, 0.0], [w / 2 - 0.5, 0.0], [w / 2 - 0.5, 0.1], [0.01, 0.1]] }, annulus("hull-grey", w / 2 - 0.5, w / 2, 0, 0.35, 40, { only: "mesh" }));
    out.push(annulus("hull-white", 0.9, 1.5, 0.1, 0.55, 20, { only: "mesh" }), { kind: "lathe", material: "water", segs: 20, only: "mesh", profile: [[0.01, 0.4], [0.9, 0.4]] }, post("pipe-steel", [0, 0], 0.12, 0.1, 0.1, 1.4, 8), ...horn("hull-white", [0, 1.4, 0], [0, 1.9, 0], [0.5, 0.3], 10));
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + 0.3;
      const x = 4.2 * Math.sin(a);
      const z = 4.2 * Math.cos(a);
      out.push(post("wood", [x, z], 0.16, 0.1, 0.12, 2.6, 8), ...horn("leaf", [x, 2.2, z], [x, 4.4, z], [1.4, 1.3, 0.9, 0.4], 10), box("wood", [3.2 * Math.sin(a + 0.25), 0.1, 3.2 * Math.cos(a + 0.25)], 1.4, 0.4, 0.45, (a + 0.25) * (180 / Math.PI)));
    }
    out.push(...lamps(Array.from({ length: 8 }, (_, k) => ({ at: [5.6 * Math.sin((k * Math.PI) / 4), 0.4, 5.6 * Math.cos((k * Math.PI) / 4)] as Vec3, colour: "flood" as const, size: 0.14 }))));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// solids by range, by outline, by corner (from the SPX-03 Miyamoto adapter, shared)


/** A box from a range on each axis, any of them the thin one. Mesh only unless `extra` says otherwise. */
export function cub(material: MaterialName, x: readonly [number, number], y: readonly [number, number], z: readonly [number, number], extra: Extra = {}): Plate {
  const f: Frame = { o: [(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] };
  const sx = Math.abs(x[1] - x[0]);
  const sy = Math.abs(y[1] - y[0]);
  return { kind: "plate", material, frame: f, outline: [[-sx / 2, -sy / 2], [sx / 2, -sy / 2], [sx / 2, sy / 2], [-sx / 2, sy / 2]], thickness: Math.abs(z[1] - z[0]), plain: true, only: "mesh", ...extra };
}

/** A prism up the spine: the convex outline in (x, z), standing from y0 to y1. */
export function prism(material: MaterialName, outline: readonly (readonly [number, number])[], y0: number, y1: number, extra: Extra = {}): Plate {
  return { kind: "plate", material, frame: { o: [0, (y0 + y1) / 2, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline, thickness: Math.abs(y1 - y0), plain: true, only: "mesh", ...extra };
}

/** An octagon-ish outline: half widths `hx`, `hz` with the corners cut `c` metres. */
export const chamfered = (hx: number, hz: number, c: number, cx = 0, cz = 0): [number, number][] => [
  [cx - hx + c, cz - hz], [cx + hx - c, cz - hz], [cx + hx, cz - hz + c], [cx + hx, cz + hz - c], [cx + hx - c, cz + hz], [cx - hx + c, cz + hz], [cx - hx, cz + hz - c], [cx - hx, cz - hz + c],
];

/** A flat quad through four points that lie in one plane, with a thickness: for the slopes of a taper. */
export function quad(material: MaterialName, a: Vec3, b: Vec3, c: Vec3, d: Vec3, thickness: number, extra: Extra = {}): Plate {
    const u = unit(sub(b, a));
  const e = sub(d, a);
  const k = e[0] * u[0] + e[1] * u[1] + e[2] * u[2];
  const v = unit([e[0] - u[0] * k, e[1] - u[1] * k, e[2] - u[2] * k]);
  const w: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const o: Vec3 = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4];
  const at = (p: Vec3): [number, number] => {
    const q = sub(p, o);
    return [q[0] * u[0] + q[1] * u[1] + q[2] * u[2], q[0] * v[0] + q[1] * v[1] + q[2] * v[2]];
  };
  return { kind: "plate", material, frame: { o, u, v, w }, outline: [at(a), at(b), at(c), at(d)], thickness, plain: true, only: "mesh", ...extra };
}

/** A regular polygon (a disc, near enough) facing along Z, at (x, y), standing from z0 to z1. */
export function discZ(material: MaterialName, x: number, y: number, z0: number, z1: number, r: number, sides = 16, extra: Extra = {}): Plate {
  const outline: [number, number][] = Array.from({ length: sides }, (_, i) => [r * Math.cos((2 * Math.PI * i) / sides + Math.PI / sides), r * Math.sin((2 * Math.PI * i) / sides + Math.PI / sides)]);
  return { kind: "plate", material, frame: { o: [x, y, (z0 + z1) / 2], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline, thickness: Math.abs(z1 - z0), plain: true, only: "mesh", ...extra };
}

/** The same facing along X, at (y, z), standing from x0 to x1. */
export function discX(material: MaterialName, y: number, z: number, x0: number, x1: number, r: number, sides = 16, extra: Extra = {}): Plate {
  const outline: [number, number][] = Array.from({ length: sides }, (_, i) => [r * Math.cos((2 * Math.PI * i) / sides + Math.PI / sides), r * Math.sin((2 * Math.PI * i) / sides + Math.PI / sides)]);
  return { kind: "plate", material, frame: { o: [(x0 + x1) / 2, y, z], u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] }, outline, thickness: Math.abs(x1 - x0), plain: true, only: "mesh", ...extra };
}
