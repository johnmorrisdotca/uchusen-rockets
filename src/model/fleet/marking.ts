// Lettering for a hull: a registry, a name, a port, hangar or deck number, a stencil. Text is real geometry made from the outlines of an open-licence face (Michroma for letters
// and figures, M PLUS 1p Bold for kanji and katakana, `typeface.ts`), so it stays sharp at 10 m and reads from the whole ship's distance. It is laid on a flat wall or wrapped on a hull of revolution, following its
// curve, and comes out as the same plain pieces as everything else: filled shapes for the painted look, and the outline of every letter as lines for the line and thick looks. Sizes are metres. Pure: no three.js
// and no DOM; the same arguments always give the same bytes. A glyph is cut into triangles once and kept (`glyphCacheSize`), shared by every marking.
import { type MaterialName, MATERIALS } from "../materials.ts";
import type { Frame, Piece, Plate, Vec3 } from "../pieces.ts";
import { GOLDMAN, GOLDMAN_KERN, ORBITRON, ORBITRON_KERN, OXANIUM, OXANIUM_KERN, KANJI, KERN, LATIN } from "./typeface.ts";
import { areaOf, contains, coverage, grown, simplified, triangulate } from "./triangulate.ts";

/**
 * Where a marking stands: its cap height in metres and which end of the text sits on the anchor. `height` is the height of a capital letter.
 *
 * @example
 * ```ts
 * import { marking, markingWidth } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const width = markingWidth("SPX-207", 1.2);
 * console.log(width > 5, marking("SPX-207", { at: [0, 10, 5], right: [1, 0, 0], up: [0, 1, 0], height: 1.2 }).length);
 * ```
 */
export interface PlaceBase {
  /** The height of a capital letter, in metres. */
  height: number;
  /** Which end of the text is on the anchor: `start` (the default), `middle` or `end`. */
  align?: "start" | "middle" | "end";
}

/**
 * Text on a flat wall: `at` is the anchor, the middle of the capitals' height; `right` is the way the text reads and `up` the way a letter stands, both unit vectors; the viewer who sees the text right way round
 * stands on the side of `right` x `up`.
 *
 * @example
 * ```ts
 * import type { FlatPlace } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const wall: FlatPlace = { at: [6.4, 20, 0], right: [0, 0, -1], up: [0, 1, 0], height: 0.9, align: "middle" };
 * console.log(wall.height);
 * ```
 */
export interface FlatPlace extends PlaceBase {
  at: Vec3;
  right: Vec3;
  up: Vec3;
}

/**
 * Text wrapped on a hull of revolution round the spine (the Y axis, or the line through `axis`): `y` is the height of the middle of the capitals and `az` the azimuth of the anchor, in radians round Y from +Z
 * towards +X, as everywhere else in the kit. `radius` is the hull's radius, one number or a function of the height for a cone. `run` is the way the text reads: `around` the hull, left to right seen from outside
 * (the default); `up` the spine, towards the bow, for lettering along a ship's length; or `down`.
 *
 * @example
 * ```ts
 * import type { RoundPlace } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const hull: RoundPlace = { radius: 6.7, y: 12, az: 0, height: 1.2, align: "middle", run: "around" };
 * console.log(hull.radius);
 * ```
 */
export interface RoundPlace extends PlaceBase {
  radius: number | ((y: number) => number);
  y: number;
  az: number;
  run?: "around" | "up" | "down";
  /** The x, z of the spine, when it is not the Y axis. */
  axis?: readonly [number, number];
  /** How many sides the hull's own mesh has (the kit's drums have 56), so the lettering clears the flats between them. */
  sides?: number;
}

/**
 * A place for a marking: a flat wall (`at`, `right`, `up`) or a hull of revolution (`radius`, `y`, `az`).
 *
 * @example
 * ```ts
 * import type { MarkingPlace } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const place: MarkingPlace = { radius: 5, y: 3, az: 1.2, height: 0.6 };
 * console.log("radius" in place);
 * ```
 */
export type MarkingPlace = FlatPlace | RoundPlace;

/**
 * How a marking is made. Everything has a default.
 *
 * @example
 * ```ts
 * import type { MarkingStyle } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const style: MarkingStyle = { ink: "black", weight: 0.016, tracking: 0.14, frame: true };
 * console.log(style.ink);
 * ```
 */
export interface MarkingStyle {
  /** The paint, a material name; `black` by default. */
  ink?: MaterialName;
  /** How much each letter is made bolder, in capital heights added to each side of a stem; 0.016 by default, 0 for the face as drawn. */
  weight?: number;
  /** The face the Latin letters are drawn in: `michroma` (the default), `orbitron`, `oxanium` or `goldman`. */
  face?: FaceName;
  /** The extra space between letters, in capital heights; each face has its own default (0.14 for Michroma). */
  tracking?: number;
  /** How thick the paint stands, in metres; the default grows with the letters. */
  thickness?: number;
  /** How far the paint stands off the surface before its own thickness, in metres; the default clears the curve and the hull's flats. */
  lift?: number;
  /** 0.25 to 1: fewer points in each outline at a low level. 1 by default. */
  detail?: number;
  /** Draw each letter's outline as lines too, which is what the line and thick looks show; true by default. */
  lines?: boolean;
  /** A painted border round the text, as stencils have; `true` takes the defaults (a gap of 0.45 and a line of 0.1, in capital heights). */
  frame?: boolean | { pad?: number; line?: number };
  /** A smooth raised plate under the text, standing out of the plating and the stringers: a material, or `{ material, pad, raise }` (pad in capital heights, raise in metres, 0.3 by default, `below` the extra metres it reaches under the text for a second line). */
  field?: MaterialName | { material: MaterialName; pad?: number; raise?: number; below?: number };
  /** A thin line inside the edge of every letter in this material, which makes dark lettering read as outlined: set in 0.04 capital heights from the edge, 0.025 wide. */
  inline?: MaterialName;
  /** A heavier outline round the outside of every letter, in this material and this wide (capital heights): `{ material, width }`. Together with a solid fill and a bolder `weight` it makes a one-weight face read bold. */
  outline?: { material: MaterialName; width?: number };
  /** The paint stands on a plate this many metres proud that another marking laid (a second line on the same field). */
  onField?: number;
  /** Floodlights standing over the text, which glow in the Lit look. */
  flood?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// the face: layout and glyph shapes

type Glyph = readonly [number, readonly (readonly number[])[]];

/** The Latin faces: each with its outlines and its kerning. */
export const FACES = {
  michroma: { glyphs: LATIN, kern: KERN, weight: 0.016, tracking: 0.14 },
  orbitron: { glyphs: ORBITRON, kern: ORBITRON_KERN, weight: 0, tracking: 0.12 },
  oxanium: { glyphs: OXANIUM, kern: OXANIUM_KERN, weight: 0, tracking: 0.12 },
  goldman: { glyphs: GOLDMAN, kern: GOLDMAN_KERN, weight: 0, tracking: 0.1 },
} as const;
export type FaceName = keyof typeof FACES;

const glyphFor = (ch: string, face: FaceName = "michroma"): Glyph | undefined => FACES[face].glyphs[ch] ?? FACES[face].glyphs[ch.toUpperCase()] ?? KANJI[ch];

/** Where each letter of a text stands along the baseline, in capital heights, and how wide the whole is: each letter's advance, the face's kerning for the pair, and the tracking. */
export function layoutOf(text: string, tracking = 0.14, face: FaceName = "michroma"): { x: number[]; chars: string[]; width: number } {
  const chars = [...text];
  const x: number[] = [];
  const kern = FACES[face].kern;
  let at = 0;
  chars.forEach((ch, i) => {
    if (i > 0) at += kern[`${chars[i - 1].toUpperCase()}${ch.toUpperCase()}`] ?? 0;
    x.push(at);
    at += (glyphFor(ch, face) ?? FACES[face].glyphs[" "])[0] + tracking;
  });
  return { x, chars, width: Math.max(0, at - tracking) };
}

/**
 * How wide a text is in metres at a capital height: the width the marking will take on a hull, so a ship can centre it, fit it between hatches or keep it clear of a seam.
 *
 * @param text What is written.
 * @param height The height of a capital letter, in metres.
 * @param style `tracking` is the one that matters here.
 * @returns The width in metres.
 * @example
 * ```ts
 * import { markingWidth } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(markingWidth("ISV KAMINARI", 1.5).toFixed(1));
 * ```
 */
export function markingWidth(text: string, height: number, style: MarkingStyle = {}): number {
  return layoutOf(text, style.tracking ?? FACES[style.face ?? "michroma"].tracking, style.face).width * height;
}

interface Shape {
  /** The outline and its holes, in capital heights: the rings the paint is cut to. */
  rings: number[][];
  points: number[];
  indices: number[];
}

const cache = new Map<string, Shape[]>();

/** How many glyphs are cut and kept. They are shared by every marking, so this stays small. */
export function glyphCacheSize(): number {
  return cache.size;
}

/** Empties the glyph cache (the shapes are made again when next asked for). */
export function clearGlyphCache(): void {
  cache.clear();
}

/** The outlines of a glyph sorted into shapes: each outline with the holes it contains. Overlapping outlines of a kanji stay separate shapes. */
function shapesOf(contours: readonly (readonly number[])[]): { outer: readonly number[]; holes: (readonly number[])[] }[] {
  const rings = contours.filter((c) => c.length >= 6);
  if (!rings.length) return [];
  const biggest = rings.reduce((a, b) => (Math.abs(areaOf(a)) >= Math.abs(areaOf(b)) ? a : b));
  const sign = Math.sign(areaOf(biggest));
  const shapes = rings.filter((c) => Math.sign(areaOf(c)) === sign).map((outer) => ({ outer, holes: [] as (readonly number[])[] }));
  for (const hole of rings.filter((c) => Math.sign(areaOf(c)) !== sign)) {
    let owner = -1;
    for (let i = 0; i < shapes.length; i++) if (contains(shapes[i].outer, hole[0], hole[1]) && (owner < 0 || Math.abs(areaOf(shapes[i].outer)) < Math.abs(areaOf(shapes[owner].outer)))) owner = i;
    if (owner >= 0) shapes[owner].holes.push(hole);
  }
  return shapes;
}

/** One glyph cut into triangles, bolder by `weight`: if a tight letter folds over itself when grown, it is made again with half the growth, and at last as drawn. */
function cut(ch: string, weight: number, tolerance: number, face: FaceName): Shape[] {
  const key = `${face}|${ch}|${weight}|${tolerance}`;
  const known = cache.get(key);
  if (known) return known;
  const glyph = glyphFor(ch, face);
  const made: Shape[] = [];
  for (const { outer, holes } of shapesOf(glyph?.[1] ?? [])) {
    const wanted = (rings: number[][]) => Math.abs(areaOf(rings[0])) - rings.slice(1).reduce((sum, ring) => sum + Math.abs(areaOf(ring)), 0);
    const base = [simplified(outer, tolerance), ...holes.map((hole) => simplified(hole, tolerance))];
    let best: { rings: number[][]; t: ReturnType<typeof triangulate> } | null = null;
    for (const by of weight > 0 ? [weight, weight / 2, 0] : [0]) {
      const rings = by > 0 ? base.map((ring) => grown(ring, by)) : base;
      const t = triangulate(rings[0], rings.slice(1));
      const want = wanted(rings);
      best = { rings, t };
      if (Math.abs(coverage(t) - want) <= want * 0.03 + 1e-9) break;
    }
    if (best) made.push({ rings: best.rings, points: best.t.points, indices: best.t.indices });
  }
  cache.set(key, made);
  return made;
}

// ---------------------------------------------------------------------------------------------------------------------------------
// surfaces

interface Mapper {
  /** A point of the sheet, in metres from the anchor along the text and up from the middle of the capitals, as a point of the surface and its outward normal. */
  at(s: number, t: number): { p: Vec3; n: Vec3 };
  /** Which way the surface curves: `s` along the text, `t` up the letters, or not at all. */
  curved: "s" | "t" | "none";
  /** The widest a flat triangle may be across the curve before it is cut, in metres. */
  span: number;
  /** How far the paint stands off by default, in metres. */
  lift: number;
  /** For a flat wall: its frame, so every triangle shares it. */
  flat?: { right: Vec3; up: Vec3; normal: Vec3; origin: Vec3 };
}

const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const crossOf = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dotOf = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function mapperOf(place: MarkingPlace, tolerance: number): Mapper {
  if ("at" in place) {
    const right = norm(place.right);
    const up = norm(place.up);
    const normal = norm(crossOf(right, up));
    const at = (s: number, t: number) => ({ p: [place.at[0] + right[0] * s + up[0] * t, place.at[1] + right[1] * s + up[1] * t, place.at[2] + right[2] * s + up[2] * t] as Vec3, n: normal });
    return { at, curved: "none", span: Infinity, lift: 0.004, flat: { right, up, normal, origin: place.at } };
  }
  const radius = typeof place.radius === "number" ? () => place.radius as number : place.radius;
  const [cx, cz] = place.axis ?? [0, 0];
  const run = place.run ?? "around";
  const r0 = radius(place.y);
  const slope = (y: number) => (radius(y + 0.05) - radius(y - 0.05)) / 0.1;
  const at = (s: number, t: number) => {
    const y = run === "around" ? place.y + t : run === "up" ? place.y + s : place.y - s;
    const r = radius(y);
    const az = run === "around" ? place.az + s / r : run === "up" ? place.az - t / r : place.az + t / r;
    const sa = Math.sin(az);
    const ca = Math.cos(az);
    return { p: [cx + r * sa, y, cz + r * ca] as Vec3, n: norm([sa, -slope(y), ca]) };
  };
  const sides = place.sides ?? 56;
  return { at, curved: run === "around" ? "s" : "t", span: Math.sqrt(8 * r0 * tolerance), lift: tolerance + r0 * (1 - Math.cos(Math.PI / sides)) + 0.004 };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// paint: shapes laid on a surface

/** A flat shape in metres on the sheet: an outline and its holes. */
interface Art {
  outer: number[];
  holes: number[][];
}

interface Paint {
  pieces: Piece[];
  paths: Vec3[][];
}

/** One triangle, cut across the curve until no side is wider than `span`. */
function cutAcross(tri: readonly number[], axis: 0 | 1, span: number, out: number[][], depth = 0): void {
  const e = [
    [0, 1],
    [1, 2],
    [2, 0],
  ] as const;
  let worst = -1;
  let which = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.abs(tri[e[k][1] * 2 + axis] - tri[e[k][0] * 2 + axis]);
    if (d > worst) {
      worst = d;
      which = k;
    }
  }
  if (worst <= span || depth > 6) {
    out.push(tri.slice());
    return;
  }
  const [i, j] = e[which];
  const k = 3 - i - j;
  const mx = (tri[i * 2] + tri[j * 2]) / 2;
  const my = (tri[i * 2 + 1] + tri[j * 2 + 1]) / 2;
  cutAcross([tri[i * 2], tri[i * 2 + 1], mx, my, tri[k * 2], tri[k * 2 + 1]], axis, span, out, depth + 1);
  cutAcross([mx, my, tri[j * 2], tri[j * 2 + 1], tri[k * 2], tri[k * 2 + 1]], axis, span, out, depth + 1);
}

/** A triangle of the sheet lying on the surface, as a plate. */
function plateOf(tri: readonly number[], map: Mapper, material: MaterialName, lift: number, thickness: number): Plate | null {
  const area = Math.abs((tri[2] - tri[0]) * (tri[5] - tri[1]) - (tri[4] - tri[0]) * (tri[3] - tri[1])) / 2;
  if (area < 1e-8) return null;
  if (map.flat) {
    const { right, up, normal, origin } = map.flat;
    const frame: Frame = { o: [origin[0] + normal[0] * (lift + thickness / 2), origin[1] + normal[1] * (lift + thickness / 2), origin[2] + normal[2] * (lift + thickness / 2)], u: right, v: up, w: normal };
    return { kind: "plate", material, frame, outline: [[tri[0], tri[1]], [tri[2], tri[3]], [tri[4], tri[5]]], thickness, plain: true, sheet: true, only: "mesh" };
  }
  const corners: Vec3[] = [];
  let facing: Vec3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const { p, n } = map.at(tri[k * 2], tri[k * 2 + 1]);
    corners.push([p[0] + n[0] * (lift + thickness / 2), p[1] + n[1] * (lift + thickness / 2), p[2] + n[2] * (lift + thickness / 2)]);
    facing = [facing[0] + n[0], facing[1] + n[1], facing[2] + n[2]];
  }
  let w = norm(crossOf(sub(corners[1], corners[0]), sub(corners[2], corners[0])));
  if (dotOf(w, facing) < 0) w = [-w[0], -w[1], -w[2]];
  const u = norm(sub(corners[1], corners[0]));
  const v = crossOf(w, u);
  const o: Vec3 = [(corners[0][0] + corners[1][0] + corners[2][0]) / 3, (corners[0][1] + corners[1][1] + corners[2][1]) / 3, (corners[0][2] + corners[1][2] + corners[2][2]) / 3];
  const local = (p: Vec3): [number, number] => [dotOf(sub(p, o), u), dotOf(sub(p, o), v)];
  return { kind: "plate", material, frame: { o, u, v, w }, outline: [local(corners[0]), local(corners[1]), local(corners[2])], thickness, plain: true, sheet: true, only: "mesh" };
}

/** Lays shapes on the surface as plates (and their outlines as lines, when `outline` asks). */
function lay(arts: readonly Art[], map: Mapper, material: MaterialName, lift: number, thickness: number, paint: Paint, outline = false, fill = true): void {
  const axis = map.curved === "t" ? 1 : 0;
  for (const art of arts) {
    const t = fill ? triangulate(art.outer, art.holes) : { points: [] as number[], indices: [] as number[] };
    for (let i = 0; i < t.indices.length; i += 3) {
      const tri = [t.points[t.indices[i] * 2], t.points[t.indices[i] * 2 + 1], t.points[t.indices[i + 1] * 2], t.points[t.indices[i + 1] * 2 + 1], t.points[t.indices[i + 2] * 2], t.points[t.indices[i + 2] * 2 + 1]];
      const parts: number[][] = [];
      if (map.curved === "none") parts.push(tri);
      else cutAcross(tri, axis, map.span, parts);
      for (const part of parts) {
        const plate = plateOf(part, map, material, lift, thickness);
        if (plate) paint.pieces.push(plate);
      }
    }
    if (!outline) continue;
    for (const ring of [art.outer, ...art.holes]) {
      const path: Vec3[] = [];
      const n = ring.length / 2;
      for (let i = 0; i <= n; i++) {
        const a = i % n;
        const b = (i + 1) % n;
        const steps = map.curved === "none" || i === n ? 1 : Math.max(1, Math.ceil(Math.abs(ring[b * 2 + axis] - ring[a * 2 + axis]) / map.span));
        for (let k = 0; k < (i === n ? 1 : steps); k++) {
          const f = k / steps;
          const { p, n: normal } = map.at(ring[a * 2] + (ring[b * 2] - ring[a * 2]) * f, ring[a * 2 + 1] + (ring[b * 2 + 1] - ring[a * 2 + 1]) * f);
          const up = lift + thickness + 0.004;
          path.push([p[0] + normal[0] * up, p[1] + normal[1] * up, p[2] + normal[2] * up]);
        }
      }
      paint.paths.push(path);
    }
  }
}

const rect = (s0: number, t0: number, s1: number, t1: number): number[] => [s0, t0, s1, t0, s1, t1, s0, t1];

/** The paint a text leaves, as shapes in metres: every glyph's shapes scaled and put in its place. */
function glyphArt(text: string, height: number, s0: number, style: MarkingStyle): { arts: Art[]; inlines: Art[]; outlines: Art[]; width: number } {
  const face = style.face ?? "michroma";
  const lay0 = layoutOf(text, style.tracking ?? FACES[face].tracking, face);
  const weight = style.weight ?? FACES[face].weight;
  // an outline is kept to about 4 mm on the hull, whatever the size of the letters; a lower detail level keeps it to more
  const tolerance = Math.round(Math.min(0.02, Math.max(0.002, 0.004 / (height * Math.max(0.25, Math.min(1, style.detail ?? 1))))) * 1000) / 1000;
  const arts: Art[] = [];
  const inlines: Art[] = [];
  const outlines: Art[] = [];
  const [d1, d2] = [0.035, 0.06];
  lay0.chars.forEach((ch, i) => {
    for (const shape of cut(ch, weight, tolerance, face)) {
      const put = (ring: readonly number[]) => ring.map((v, k) => (k % 2 === 0 ? s0 + (lay0.x[i] + v) * height : (v - 0.5) * height));
      arts.push({ outer: put(shape.rings[0]), holes: shape.rings.slice(1).map(put) });
      if (style.outline) {
        // a ring just outside each edge, `width` wide: a strip of quads between the outline and the outline grown outwards (a hole's grows into the hole)
        const w = style.outline.width ?? 0.03;
        const ring = (points: readonly number[], by: number) => {
          const a = points;
          const b = grown(points, by);
          const n = a.length / 2;
          for (let k = 0; k < n; k++) {
            const j = (k + 1) % n;
            const quad = [a[k * 2], a[k * 2 + 1], a[j * 2], a[j * 2 + 1], b[j * 2], b[j * 2 + 1], b[k * 2], b[k * 2 + 1]];
            if (Math.abs(areaOf(quad)) > 1e-8) outlines.push({ outer: put(quad), holes: [] });
          }
        };
        ring(shape.rings[0], w);
        for (const hole of shape.rings.slice(1)) ring(hole, -w);
      }
      if (!style.inline) continue;
      // a thin line inside each edge: between the outline drawn in by d1 and by d2; a part too slight to hold one has none
      const slim = (ring: readonly number[]) => {
        const xs = ring.filter((_, k) => k % 2 === 0);
        const ys = ring.filter((_, k) => k % 2 === 1);
        return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 0.17;
      };
      // the line is a strip of quads between the outline drawn in by d1 and by d2, point for point, so it never fails to close
      const band = (outerBy: number, innerBy: number, ring: readonly number[]): Art[] => {
        const a = grown(ring, outerBy);
        const b = grown(ring, innerBy);
        const n = a.length / 2;
        const quads: Art[] = [];
        for (let k = 0; k < n; k++) {
          const j = (k + 1) % n;
          const quad = [a[k * 2], a[k * 2 + 1], a[j * 2], a[j * 2 + 1], b[j * 2], b[j * 2 + 1], b[k * 2], b[k * 2 + 1]];
          if (Math.abs(areaOf(quad)) > 1e-7) quads.push({ outer: put(quad), holes: [] });
        }
        return quads;
      };
      if (!slim(shape.rings[0])) inlines.push(...band(-d1, -d2, shape.rings[0]));
      for (const hole of shape.rings.slice(1)) inlines.push(...band(d1, d2, hole));
    }
  });
  return { arts, inlines, outlines, width: lay0.width * height };
}

const alignShift = (place: PlaceBase, width: number): number => (place.align === "middle" ? -width / 2 : place.align === "end" ? -width : 0);

/** Floodlights over a text: two housings standing on the surface above the letters, each with a lens that glows in the Lit look and looks down at the paint. */
function floods(map: Mapper, s0: number, width: number, height: number, standoff: number): Piece[] {
  const lens: MaterialName = "flood" in MATERIALS ? ("flood" as MaterialName) : "lamp-blue";
  const out: Piece[] = [];
  const size = height * 0.14;
  for (const s of [s0 + width * 0.1, s0 + width * 0.9]) {
    const here = map.at(s, height * 0.5 + height * 0.5);
    const below = map.at(s, height * 0.5 + height * 0.5 - 0.1);
    const toText = norm(sub(below.p, here.p));
    const across = norm(crossOf(toText, here.n));
    const part = (material: MaterialName, grow: number, forward: number): Plate => {
      const lift = standoff + size * 0.5 * grow;
      return {
        kind: "plate",
        material,
        frame: { o: [here.p[0] + here.n[0] * lift + toText[0] * forward, here.p[1] + here.n[1] * lift + toText[1] * forward, here.p[2] + here.n[2] * lift + toText[2] * forward], u: across, v: toText, w: here.n },
        outline: [[-size * grow, -size * 0.9 * grow], [size * grow, -size * 0.9 * grow], [size * grow, size * 0.9 * grow], [-size * grow, size * 0.9 * grow]],
        thickness: size * grow,
        plain: true,
        only: "mesh",
      };
    };
    out.push(part("hull-grey-dark", 1, 0), part(lens, 0.7, -size * 0.55));
  }
  return out;
}

/** A smooth raised plate with its corners cut: `box` is [s0, t0, s1, t1] in metres on the sheet, `cut` the size of the corner cut and `raise` how far it stands out. On a hull of revolution it is one band of a body of revolution, which costs a few triangles. */
function fieldOf(place: MarkingPlace, map: Mapper, material: MaterialName, box: readonly [number, number, number, number], cut: number, raise: number, tolerance: number): Piece[] {
  const [s0, t0, s1, t1] = box;
  if (map.flat) {
    const { right, up, normal, origin } = map.flat;
    const outline: [number, number][] = [[s0 + cut, t0], [s1 - cut, t0], [s1, t0 + cut], [s1, t1 - cut], [s1 - cut, t1], [s0 + cut, t1], [s0, t1 - cut], [s0, t0 + cut]];
    return [{ kind: "plate", material, frame: { o: [origin[0] + normal[0] * (raise / 2), origin[1] + normal[1] * (raise / 2), origin[2] + normal[2] * (raise / 2)], u: right, v: up, w: normal }, outline, thickness: raise, plain: true, only: "mesh" }];
  }
  const round = place as RoundPlace;
  const run = round.run ?? "around";
  const radius = typeof round.radius === "number" ? () => round.radius as number : round.radius;
  const [cx, cz] = round.axis ?? [0, 0];
  const r = radius(round.y);
  // along the spine (y) and round it (az), whichever way the text runs
  const [y0, y1, a0, a1] = run === "around" ? [round.y + t0, round.y + t1, round.az + s0 / r, round.az + s1 / r] : run === "up" ? [round.y + s0, round.y + s1, round.az - t1 / r, round.az - t0 / r] : [round.y - s1, round.y - s0, round.az + t0 / r, round.az + t1 / r];
  const cutY = cut;
  const cutA = cut / r;
  const stations = [y0, y0 + cutY, y1 - cutY, y1];
  const inset = [cutA, 0, 0, cutA];
  const profile: [number, number][] = [[r, y0], [r + raise, y0], ...stations.map((y) => [r + raise, y] as [number, number]).slice(1, 3), [r + raise, y1], [r, y1]];
  const sides = Math.max(8, Math.ceil((2 * Math.PI) / Math.sqrt((8 * tolerance) / r)));
  const arcAt = (y: number): readonly [number, number] => {
    let k = 0;
    while (k < 3 && y > stations[k + 1] + 1e-9) k++;
    const f = stations[k + 1] > stations[k] ? (y - stations[k]) / (stations[k + 1] - stations[k]) : 0;
    const cutHere = inset[k] + (inset[k + 1] - inset[k]) * Math.min(1, Math.max(0, f));
    return [a0 + cutHere, a1 - cutHere];
  };
  // the profile's stations at the two ends carry the arc of the nearest corner
  const band: Piece = { kind: "lathe", material, profile, segs: sides, at: [cx, cz], arc: arcAt, only: "mesh" };
  const wall = (az: number): Piece => ({
    kind: "plate",
    material,
    frame: { o: [cx + Math.sin(az) * (r + raise / 2), (y0 + y1) / 2, cz + Math.cos(az) * (r + raise / 2)], u: [Math.sin(az), 0, Math.cos(az)], v: [0, 1, 0], w: [Math.cos(az), 0, -Math.sin(az)] },
    outline: [[-raise / 2, -(y1 - y0) / 2 + cutY], [raise / 2, -(y1 - y0) / 2 + cutY], [raise / 2, (y1 - y0) / 2 - cutY], [-raise / 2, (y1 - y0) / 2 - cutY]],
    thickness: 0.01,
    plain: true,
    only: "mesh",
  });
  return [band, wall(a0), wall(a1)];
}

/**
 * Text on a hull. The letters are geometry made from the outlines of Michroma (and M PLUS 1p Bold for kanji), a filled shape for the painted look and an outline of lines for the line and thick looks, laid on a
 * flat wall or wrapped on a hull of revolution so that it follows the curve. Sizes are metres: `place.height` is the height of a capital, and `markingWidth` says how wide the text comes out. The same arguments
 * always give the same bytes.
 *
 * @param text What to write: capitals, figures, `- . / : # ( ) + & , ' ! ?`, and a few kanji and katakana. Lowercase is drawn as capitals.
 * @param place Where and how large.
 * @param style The paint and the details; everything has a default.
 * @returns The pieces to add to a module's or a ship's own.
 * @example
 * ```ts
 * import { marking } from "@johnmorrisdotca/uchusen-rockets";
 *
 * // "SPX-207" 1.2 m high, on a 6.7 m hull 14 m up the spine, facing +Z
 * const pieces = marking("SPX-207", { radius: 6.7, y: 14, az: 0, height: 1.2, align: "middle" }, { ink: "black" });
 * console.log(pieces.length > 50);
 * ```
 */
export function marking(text: string, place: MarkingPlace, style: MarkingStyle = {}): Piece[] {
  const tolerance = Math.max(0.004, 0.008 * place.height);
  const map = mapperOf(place, tolerance);
  const thickness = style.thickness ?? Math.min(0.03, Math.max(0.008, place.height * 0.02));
  const ink = style.ink ?? "black";
  const { arts, inlines, outlines, width } = glyphArt(text, place.height, 0, style);
  const s0 = alignShift(place, width);
  const shift = (list: Art[]) => list.map((art) => ({ outer: art.outer.map((v, k) => (k % 2 === 0 ? v + s0 : v)), holes: art.holes.map((ring) => ring.map((v, k) => (k % 2 === 0 ? v + s0 : v))) }));
  const moved = arts.map((art) => ({ outer: art.outer.map((v, k) => (k % 2 === 0 ? v + s0 : v)), holes: art.holes.map((ring) => ring.map((v, k) => (k % 2 === 0 ? v + s0 : v))) }));
  const paint: Paint = { pieces: [], paths: [] };
  let base = (style.lift ?? map.lift) + (style.onField ?? 0);
  const half = place.height / 2;
  const frame = style.frame === true ? {} : style.frame || null;
  const framePad = frame ? (frame.pad ?? 0.45) * place.height : 0;
  const frameLine = frame ? (frame.line ?? 0.1) * place.height : 0;
  if (style.field) {
    const field = typeof style.field === "string" ? { material: style.field } : style.field;
    const raise = ("raise" in field ? field.raise : undefined) ?? 0.3;
    const pad = (("pad" in field ? field.pad : undefined) ?? 0.35) * place.height + framePad + frameLine;
    const below = ("below" in field ? field.below : undefined) ?? 0;
    const box = [s0 - pad, -half - pad - below, s0 + width + pad, half + pad + (style.flood ? place.height * 0.9 : 0)] as const;
    paint.pieces.push(...fieldOf(place, map, field.material, box, Math.min(pad * 0.5, place.height * 0.3), raise, tolerance));
    base += raise;
  }
  lay(moved, map, ink, base, thickness, paint, style.lines !== false);
  if (style.inline) lay(shift(inlines), map, style.inline, base + thickness, thickness, paint);
  if (style.outline) lay(shift(outlines), map, style.outline.material, base, thickness, paint);
  if (frame) {
    const [a, b, d, e] = [s0 - framePad - frameLine, -half - framePad - frameLine, s0 + width + framePad + frameLine, half + framePad + frameLine];
    const box = { outer: rect(a, b, d, e), holes: [rect(a + frameLine, b + frameLine, d - frameLine, e - frameLine)] };
    // on a hull the four strips are bands of a body of revolution; on a wall they are plates
    if (map.flat) lay([box], map, ink, base, thickness, paint, style.lines !== false);
    else {
      const strips: [number, number, number, number][] = [[a, b, d, b + frameLine], [a, e - frameLine, d, e], [a, b + frameLine, a + frameLine, e - frameLine], [d - frameLine, b + frameLine, d, e - frameLine]];
      for (const strip of strips) paint.pieces.push(...fieldOf(place, map, ink, strip, 0, base + thickness, tolerance));
      if (style.lines !== false) lay([box], map, ink, base, thickness, paint, true, false);
    }
  }
  const out = paint.pieces;
  if (paint.paths.length) out.push({ kind: "lines", weight: "feature", paths: paint.paths, only: "mesh" });
  if (style.flood) out.push(...floods(map, s0, width, place.height, base));
  return out;
}

/** Lays the plate a `field` style asks for under a box of the sheet and says how far it stands out, so the paint goes on top of it. */
function plateUnder(field: NonNullable<MarkingStyle["field"]>, place: MarkingPlace, map: Mapper, paint: Paint, box: readonly [number, number, number, number], tolerance: number): number {
  const spec = typeof field === "string" ? { material: field } : field;
  const raise = ("raise" in spec ? spec.raise : undefined) ?? 0.3;
  paint.pieces.push(...fieldOf(place, map, spec.material, box, Math.min(box[2] - box[0], box[3] - box[1]) * 0.12, raise, tolerance));
  return raise;
}

/**
 * Diagonal warning stripes of black and warning yellow in a box, for a hatch frame, a swing area or the edge of a gantry: `width` metres along the text, `place.height` metres tall, stripes at 45 degrees.
 *
 * @param place The place of the box; `align` says which end of its width is on the anchor and `at` or `y` is the middle of its height.
 * @param width How long the box is, in metres.
 * @param style `ink` is the colour of the stripes (`hazard` by default) on a black ground.
 * @returns The pieces.
 * @example
 * ```ts
 * import { hazardMarking } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(hazardMarking({ radius: 6.7, y: 3, az: 0, height: 0.5, align: "middle" }, 4).length > 4);
 * ```
 */
export function hazardMarking(place: MarkingPlace, width: number, style: MarkingStyle = {}): Piece[] {
  const tolerance = Math.max(0.004, 0.008 * place.height);
  const map = mapperOf(place, tolerance);
  const h = place.height;
  const thickness = style.thickness ?? Math.min(0.03, Math.max(0.008, h * 0.04));
  const s0 = alignShift(place, width);
  const paint: Paint = { pieces: [], paths: [] };
  let base = (style.lift ?? map.lift) + (style.onField ?? 0);
  if (style.field) base += plateUnder(style.field, place, map, paint, [s0 - h * 0.15, -h * 0.65, s0 + width + h * 0.15, h * 0.65], tolerance);
  lay([{ outer: rect(s0, -h / 2, s0 + width, h / 2), holes: [] }], map, "black", base, thickness, paint);
  const stripes: Art[] = [];
  const pitch = h * 1.1;
  for (let x = s0 - h; x < s0 + width; x += pitch) {
    // a stripe leaning 45 degrees, cut to the box
    let poly: number[][] = [[x, -h / 2], [x + pitch / 2, -h / 2], [x + pitch / 2 + h, h / 2], [x + h, h / 2]];
    for (const [nx, ny, c] of [[1, 0, -s0], [-1, 0, s0 + width]] as const) {
      const next: number[][] = [];
      poly.forEach((p, i) => {
        const q = poly[(i + 1) % poly.length];
        const dp = nx * p[0] + ny * p[1] + c;
        const dq = nx * q[0] + ny * q[1] + c;
        if (dp >= 0) next.push(p);
        if (dp >= 0 !== dq >= 0) next.push([p[0] + ((q[0] - p[0]) * dp) / (dp - dq), p[1] + ((q[1] - p[1]) * dp) / (dp - dq)]);
      });
      poly = next;
      if (poly.length < 3) break;
    }
    if (poly.length >= 3) stripes.push({ outer: poly.flat(), holes: [] });
  }
  lay(stripes, map, style.ink ?? "hazard", base + thickness, thickness, paint, style.lines !== false);
  const out = paint.pieces;
  if (paint.paths.length) out.push({ kind: "lines", weight: "feature", paths: paint.paths, only: "mesh" });
  return out;
}

/**
 * A plain band of paint: `width` metres along the text and `place.height` metres across, in one material. A pinstripe is a thin one.
 *
 * @param place Where; `align` says which end of its width is on the anchor and the anchor is the middle of its height.
 * @param width How long the band is, in metres.
 * @param material The paint.
 * @param style Only `lift` and `thickness` matter.
 * @returns The pieces.
 * @example
 * ```ts
 * import { stripeMarking } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(stripeMarking({ radius: 6.7, y: 3, az: 0, height: 0.1, align: "middle" }, 8, "red").length > 0);
 * ```
 */
export function stripeMarking(place: MarkingPlace, width: number, material: MaterialName, style: MarkingStyle = {}): Piece[] {
  const tolerance = Math.max(0.004, 0.008 * place.height);
  const map = mapperOf(place, tolerance);
  const s0 = alignShift(place, width);
  const paint: Paint = { pieces: [], paths: [] };
  lay([{ outer: rect(s0, -place.height / 2, s0 + width, place.height / 2), holes: [] }], map, material, (style.lift ?? map.lift) + (style.onField ?? 0), style.thickness ?? 0.01, paint);
  return paint.pieces;
}

/**
 * A docking marker: a ring with four ticks and the port's number in the middle, painted where a ship should line up. `place.height` is the ring's outer diameter, and the anchor is its centre.
 *
 * @param label The number or letters in the middle.
 * @param place Where; `align` is ignored.
 * @param style `ink` is the paint (`hazard`, warning yellow, by default).
 * @returns The pieces.
 * @example
 * ```ts
 * import { dockingMarking } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(dockingMarking("P4", { radius: 7, y: 5, az: 0, height: 2 }).length > 20);
 * ```
 */
export function dockingMarking(label: string, place: MarkingPlace, style: MarkingStyle = {}): Piece[] {
  const tolerance = Math.max(0.004, 0.008 * place.height);
  const map = mapperOf(place, tolerance);
  const R = place.height / 2;
  const thickness = style.thickness ?? Math.min(0.03, Math.max(0.008, place.height * 0.012));
  const ring = (r: number) => Array.from({ length: 48 }, (_, i) => [Math.cos((2 * Math.PI * i) / 48) * r, Math.sin((2 * Math.PI * i) / 48) * r]).flat();
  const arts: Art[] = [{ outer: ring(R * 0.78), holes: [ring(R * 0.64)] }];
  const tick = R * 0.14;
  arts.push({ outer: rect(-tick / 2, R * 0.78, tick / 2, R * 1.0), holes: [] }, { outer: rect(-tick / 2, -R * 1.0, tick / 2, -R * 0.78), holes: [] }, { outer: rect(R * 0.78, -tick / 2, R * 1.0, tick / 2), holes: [] }, { outer: rect(-R * 1.0, -tick / 2, -R * 0.78, tick / 2), holes: [] });
  const paint: Paint = { pieces: [], paths: [] };
  let base = (style.lift ?? map.lift) + (style.onField ?? 0);
  if (style.field) base += plateUnder(style.field, place, map, paint, [-R * 1.2, -R * 1.2, R * 1.2, R * 1.2], tolerance);
  const ink = style.ink ?? "hazard";
  lay(arts, map, ink, base, thickness, paint, style.lines !== false);
  const small = R * 0.62;
  const { arts: letters, width } = glyphArt(label, small, 0, { ...style, inline: undefined });
  const shift = -width / 2;
  const moved = letters.map((art) => ({ outer: art.outer.map((v, k) => (k % 2 === 0 ? v + shift : v)), holes: art.holes.map((ring2) => ring2.map((v, k) => (k % 2 === 0 ? v + shift : v))) }));
  lay(moved, map, ink, base, thickness, paint, style.lines !== false);
  const out = paint.pieces;
  if (paint.paths.length) out.push({ kind: "lines", weight: "feature", paths: paint.paths, only: "mesh" });
  return out;
}
