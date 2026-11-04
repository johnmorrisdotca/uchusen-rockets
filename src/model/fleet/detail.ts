// The fleet's detail kit: the small shapes every module is covered with, so no surface is bare. Panels, hatches, conduits, radiators, thermal tiles, joints, antennae, lamps, vents, ladders, stencils and
// greebles, all plain pieces in metres (the same `Piece` every other part is made of), all deterministic: a seeded random number, never a clock. Pure: no three.js and no DOM.
//
// A cylinder's surface is addressed by azimuth (radians round the Y axis from +Z towards +X), height and radius. A shape lying on it is a `Plate` in the tangent frame `patch(r, az, y)`: u along the circle,
// v up, w outwards. Repeated shapes go through `stamp`, which places one template many times; every stamp is merged into the part's mesh, so detail costs vertices and no draw calls.
import { deg } from "../../framing.ts";
import type { MaterialName } from "../materials.ts";
import { type Frame, type Lathe, type Lines, type Piece, type Plate, pointOf, type Vec3 } from "../pieces.ts";

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
export function rod(material: MaterialName, a: Vec3, b: Vec3, radius: number, sides = 8, extra: Extra = {}): Plate {
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
  const t = deg(pose.yaw ?? 0);
  const c = Math.cos(t);
  const s = Math.sin(t);
  const turn = (p: Vec3): Vec3 => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  const at = (p: Vec3): Vec3 => add(turn(p), pose.at);
  return pieces.map((piece): Piece => {
    const move = piece.move ? { ...piece.move, pivot: at(piece.move.pivot), axis: turn(piece.move.axis) } : undefined;
    const common = move ? { move } : {};
    if (piece.kind === "plate") return { ...piece, ...common, frame: { o: at(piece.frame.o), u: turn(piece.frame.u), v: turn(piece.frame.v), w: turn(piece.frame.w) } };
    if (piece.kind === "lines") return { ...piece, ...common, paths: piece.paths.map((path) => path.map(at)) };
    const [ox, oz] = piece.at ?? [0, 0];
    const o = at([ox, 0, oz]);
    const dy = pose.at[1];
    const lean = piece.lean ? ([piece.lean[0] * c + piece.lean[1] * s, -piece.lean[0] * s + piece.lean[1] * c] as const) : undefined;
    const arc = piece.arc;
    return {
      ...piece,
      ...common,
      at: [o[0], o[2]],
      profile: piece.profile.map(([r, y]) => [r, y + dy] as const),
      ...(piece.rings ? { rings: piece.rings.map((y) => y + dy) } : {}),
      ...(piece.welds ? { welds: piece.welds.map((y) => y + dy) } : {}),
      ...(lean ? { lean } : {}),
      ...(arc ? { arc: (y: number) => [arc(y - dy)[0] + t, arc(y - dy)[1] + t] as const } : {}),
    };
  });
}

/** One template put at many poses. The way to repeat bolts, windows, tiles, nozzles, containers: the template is written once and every copy is merged into the part's mesh. */
export const stamp = (template: readonly Piece[], poses: readonly Pose[]): Piece[] => poses.flatMap((pose) => place(template, pose));

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
}

/**
 * The fleet's liveries: orange and white for industry, white and yellow for science and habitation, grey and blue for command, white and orange for transport.
 *
 * @example
 * ```ts
 * import { LIVERY } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(LIVERY.industrial.main, LIVERY.command.block);
 * ```
 */
export const LIVERY = {
  industrial: { main: "hull-orange", mainWorn: "hull-orange-worn", block: "hull-white", blockWorn: "hull-white-worn", accent: "hazard", dark: "panel-dark", under: "hull-grey-dark" },
  science: { main: "hull-white", mainWorn: "hull-white-worn", block: "hull-yellow", blockWorn: "hull-white-worn", accent: "hull-orange", dark: "panel-dark", under: "hull-grey-dark" },
  command: { main: "hull-grey", mainWorn: "hull-white-worn", block: "hull-blue", blockWorn: "hull-grey-dark", accent: "hull-orange", dark: "panel-dark", under: "hull-grey-dark" },
  transport: { main: "hull-white", mainWorn: "hull-white-worn", block: "hull-orange", blockWorn: "hull-orange-worn", accent: "hazard", dark: "panel-dark", under: "hull-grey-dark" },
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
}

/** Plating: rows of raised panels in the livery's colours with a gap between, some worn, some bare, and a seam line for each row and column in the drawing. The skin of every hull. */
export function hullPanels(o: PanelOptions): Piece[] {
  const random = rng(`${o.seed}/panels`);
  const [a0, a1] = o.az ?? [0, 2 * Math.PI];
  const wide = o.wide ?? 2.2;
  const tall = o.tall ?? 1.5;
  const raise = o.raise ?? 0.04;
  const gap = Math.min(0.06, wide * 0.03);
  const bare = o.bare ?? 0.05;
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
      const material = roll < 0.45 ? o.livery.main : roll < 0.58 ? o.livery.mainWorn : roll < 0.78 ? o.livery.block : roll < 0.88 ? o.livery.blockWorn : roll < 0.93 ? o.livery.accent : o.livery.dark;
      out.push(panel(material, o.r + 0.005, (left + right) / 2, y + h / 2, width, h - gap, raise * (0.6 + random() * 0.9)));
    }
    // the seams: a ring at the row's top, and a vertical seam at each cut, for the line drawing
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

/** A conduit run up a hull: pipes in a bundle held off the surface by clamps, in the colours pipes come in. */
export function conduitRun(o: ConduitOptions): Piece[] {
  const random = rng(`${o.seed}/conduit/${o.az.toFixed(3)}/${o.y0.toFixed(2)}`);
  const count = o.count ?? 3;
  const pr = o.pipe ?? 0.08;
  const pitch = pr * 2.6;
  const stand = pr * 1.6;
  const mats: MaterialName[] = [o.material ?? "coolant", "hull-white-worn", "hull-grey", "lamp-red", "coolant"];
  const out: Piece[] = [];
  const f = patch(o.r, o.az, 0);
  for (let i = 0; i < count; i++) {
    const side = (i - (count - 1) / 2) * pitch;
    const base = pointOf(f, side, 0, stand);
    const r = Math.hypot(base[0], base[2]);
    const a = Math.atan2(base[0], base[2]);
    out.push(post(mats[Math.floor(random() * mats.length)], [r * Math.sin(a), r * Math.cos(a)], pr, o.y0, pr, o.y1, 8));
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
  return [hoop(material, r + pipe * 1.2, y, pipe, Math.min(segs, 32), 5), annulus("hull-grey-dark", r, r + pipe * 0.9, y - pipe * 1.8, y + pipe * 1.8, 24, { only: "mesh" })];
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
  /** `amber` (work), `blue` (docking), `red` (warning). */
  colour: "amber" | "blue" | "red";
  size?: number;
}

/** Lamps: small domes in a bright colour. */
export function lamps(list: readonly Lamp[]): Piece[] {
  return list.map(({ at, colour, size = 0.1 }): Piece => ({ kind: "lathe", material: colour === "amber" ? "lamp-amber" : colour === "blue" ? "lamp-blue" : "lamp-red", at: [at[0], at[2]], segs: 8, only: "mesh", profile: [[size, at[1]], [size * 0.85, at[1] + size * 0.5], [size * 0.001, at[1] + size * 0.8]] }));
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
