// The builder: one description into one mesh and one drawing. Works in Node and in a browser, with no dependency: the geometry here is this package's own.
import { propellantOf, type FlameKind } from "../data/propellants.ts";
import { check, type Description, type FitReport } from "../fit.ts";
import { type Angle, cleanView, DEFAULT_VIEW, PICTURE_H, PICTURE_W, VIEWS, type Vec3, type ViewName } from "../framing.ts";
import { cleanShow, placesFor, showsOf } from "../layout.ts";
import { DEFAULT_LOOK, type LookName } from "../looks.ts";
import { detail, type DetailLevel } from "../model/detail.ts";
import { type PartMesh, boundsOf, boundsOfPieces, type Bounds, meshOf, type Piece } from "../model/pieces.ts";
import { moved } from "../model/moves.ts";
import { partEntry } from "../model/registry.ts";
import { partIdOf, variantOf } from "../rockets.ts";
import type { PartRecord } from "../parts.ts";
import { plumeMarkup } from "../draw/plume.ts";
import { defsOf, drawPart, perspective } from "../draw/svg.ts";
import { bellsOf, litBells, type LitBell, pickBells, plumeLength } from "../engines.ts";
import { type Glb, toGlb } from "./glb.ts";

/**
 * Raised by `build` when a description does not fit. Its `report` says why, in the same words `check` gives.
 *
 * @param report The report of the fit check that failed.
 * @example
 * ```ts
 * import { build, FitError } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * try {
 *   build({ rocket: "starship", variant: "v3", parts: { booster: "starship-v3-ship" } });
 * } catch (error) {
 *   if (error instanceof FitError) console.log(error.report.issues[0]?.message);
 * }
 * ```
 */
export class FitError extends Error {
  readonly report: FitReport;
  constructor(report: FitReport) {
    super(report.issues.filter((issue) => issue.level === "error").map((issue) => issue.message).join(" "));
    this.name = "FitError";
    this.report = report;
  }
}

/**
 * One part of a built rocket: its slot, its record, the pieces it is made of, its mesh and its bounds in metres.
 *
 * @example
 * ```ts
 * import { build, type BuiltPart } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const first: BuiltPart | undefined = build({ rocket: "falcon-9", variant: "block-5" }).parts[0];
 * console.log(first?.slot, first?.record.name);
 * ```
 */
export interface BuiltPart {
  slot: string;
  record: PartRecord;
  pieces: readonly Piece[];
  mesh: PartMesh;
  bounds: Bounds;
  /** The colour of this part's flame, from what a page says its engine burns; `neutral` when none read here says. */
  flame: FlameKind;
}

/**
 * What a drawing is asked for: the look, the view, what to show and whether the engines are lit. Anything left out takes its default.
 *
 * @example
 * ```ts
 * import { build, type SvgOptions } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const options: SvgOptions = { look: "thick", view: "below", show: "booster" };
 * console.log(build({ rocket: "starship", variant: "v3" }).svg(options).startsWith("<svg"));
 * ```
 */
export interface SvgOptions {
  look?: LookName;
  view?: ViewName | Angle;
  show?: string;
  /** A flame at each engine that is showing, or as many as a count names for each part. The length is a picture, not a measured flame. Left out, the drawing is unchanged. */
  engines?: boolean | Readonly<Record<string, number>>;
  /** Degrees each moving group of each part is turned from where it is drawn at rest, by slot and then by name: `{ booster: { "grid-fins": 12 } }`. A flight asks for them. */
  moves?: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

/**
 * A rocket built from a description: the fit report, its parts, and the ways to ask for its size, where each part stands, its lit engines, a `.glb` file and a drawing.
 *
 * @example
 * ```ts
 * import { build, type Built } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const rocket: Built = build({ rocket: "starship", variant: "v3" });
 * console.log(rocket.shows.join(", "));
 * console.log(rocket.boundsOf("together").max);
 * ```
 */
export interface Built {
  report: FitReport;
  parts: readonly BuiltPart[];
  /** What can be shown: together, apart and each part. */
  shows: readonly string[];
  /** The bounds of a choice of what to show, in metres, and with `lit` the flames of its engines at full thrust. */
  boundsOf(show?: string, lit?: boolean): Bounds;
  /** Where each part stands for a choice of what to show. */
  placesOf(show?: string): { slot: string; at: Vec3; shown: boolean }[];
  /** The engines alight at full thrust for a choice of what to show: those the drawing has, of the parts whose engines a source tells of. */
  flamesOf(show?: string): LitBell[];
  /** The .glb file's bytes: every part stacked, each its own node to move. */
  glb(): Glb;
  /** The drawing, in a look, from an angle. */
  svg(options?: SvgOptions): string;
}

/**
 * A part with more pieces than this is not meshed until its triangles are asked for, and the mesh is not kept: a fleet ship's parts hold hundreds of thousands of triangles, and keeping them all as arrays of numbers took a gigabyte.
 *
 * @example
 * ```ts
 * import { HEAVY_PIECES } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * console.log(HEAVY_PIECES);
 * ```
 */
export const HEAVY_PIECES = 2000;

const memo = new Map<string, { pieces: readonly Piece[]; readonly mesh: PartMesh; bounds: Bounds }>();
const memoKey = (id: string) => `${detail.level}/${id}`;
function made(id: string) {
  const known = memo.get(memoKey(id));
  if (known) return known;
  const entry = partEntry(id);
  if (!entry) throw new Error(`There is no part "${id}".`);
  const pieces = entry.pieces();
  if (pieces.length > HEAVY_PIECES) {
    const heavy = { pieces, bounds: boundsOfPieces(pieces), get mesh() { return meshOf(pieces); } };
    memo.set(memoKey(id), heavy);
    return heavy;
  }
  const mesh = meshOf(pieces);
  const result = { pieces, mesh, bounds: boundsOf(mesh) };
  memo.set(memoKey(id), result);
  return result;
}

const xmlText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(inner: string, look: LookName, width = PICTURE_W, height = PICTURE_H, label?: string): string {
  const halo = look !== "painted" ? `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" fill="url(#halo)"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"${label ? ` aria-label="${xmlText(label)}"` : ""}>${defsOf(look)}${halo}${inner}</svg>`;
}

/** The widest a part reaches from its own axis. */
const widthOf = (id: string): number => {
  const { min, max } = made(id).bounds;
  return Math.max(Math.abs(min[0]), Math.abs(max[0]), Math.abs(min[2]), Math.abs(max[2]));
};

/** What colour a part's flame is: the kind its engine's page says it burns, found by the engine's name in the data of a variant the part is true for. */
function flameKindOf(part: PartRecord): FlameKind {
  for (const variantId of part.trueTo) {
    const variant = variantOf(part.rocket, variantId);
    for (const [slot, engines] of Object.entries(variant?.facts.engines ?? {})) if (partIdOf(part.rocket, variantId, slot) === part.id) return propellantOf(part.rocket, engines.value)?.flame ?? "neutral";
  }
  return "neutral";
}

function assembled(report: FitReport): Built {
  const parts: BuiltPart[] = report.parts.map(({ slot, part }) => {
    const one = made(part.id);
    return { slot, record: part, pieces: one.pieces, get mesh() { return one.mesh; }, bounds: one.bounds, flame: flameKindOf(part) };
  });
  const slots = parts.map((part) => part.slot);
  const placesOf = (show?: string) => placesFor(report.parts, cleanShow(show, slots), (part) => widthOf(part.id));
  const flamesOf = (show: string | undefined): LitBell[] => {
    const places = placesOf(show);
    return litBells(
      places.map((place) => {
        const part = parts.find((p) => p.slot === place.slot) as BuiltPart;
        const told = report.variant?.facts.engines[part.slot]?.value;
        return { slot: part.slot, atY: place.at[1], shown: place.shown, pieces: part.pieces, beside: place.at[0] !== 0 || place.at[2] !== 0, dark: told === null || told === undefined };
      }),
      !show || show === "together",
    );
  };
  const boundsOfShow = (show?: string, lit = false): Bounds => {
    const min: Vec3 = [Infinity, Infinity, Infinity];
    const max: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const place of placesOf(show)) {
      if (!place.shown) continue;
      const { bounds } = parts.find((part) => part.slot === place.slot) as BuiltPart;
      for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c], bounds.min[c] + place.at[c]);
        max[c] = Math.max(max[c], bounds.max[c] + place.at[c]);
      }
    }
    if (lit)
      for (const bell of flamesOf(show)) {
        const place = placesOf(show).find((one) => one.slot === bell.slot);
        min[1] = Math.min(min[1], (place?.at[1] ?? 0) + bell.y - plumeLength(bell.exit));
      }
    return { min, max };
  };
  return {
    report,
    parts,
    shows: showsOf(slots),
    boundsOf: boundsOfShow,
    placesOf,
    flamesOf,
    glb: () => toGlb(parts.map((part) => ({ name: part.slot, mesh: part.mesh, at: placesOf("together").find((place) => place.slot === part.slot)?.at ?? [0, 0, 0] }))),
    svg: ({ look = DEFAULT_LOOK, view = DEFAULT_VIEW, show, engines = false, moves } = {}) => {
      const angle = typeof view === "string" ? VIEWS[cleanView(view)] : view;
      const places = placesOf(show).filter((place) => place.shown);
      // a flame drawn at full thrust is held in the picture; a count of engines is the timeline's, which has its own room
      const cam = perspective(boundsOfShow(show, engines === true), angle);
      const ordered = places
        .map((place) => {
          const part = parts.find((p) => p.slot === place.slot) as BuiltPart;
          const middle: Vec3 = [place.at[0], place.at[1] + part.record.height / 2, place.at[2]];
          return { place, part, depth: cam.depth(middle) };
        })
        .sort((a, b) => b.depth - a.depth);
      const together = !show || show === "together";
      const flames = typeof engines === "object"
        ? parts.flatMap((part) => pickBells(bellsOf(part.pieces), engines[part.slot] ?? 0).map((bell) => ({ ...bell, slot: part.slot })))
        : engines
        ? flamesOf(show).filter((bell) => places.some((place) => place.slot === bell.slot))
        : [];
      return wrap(
        ordered
          .map(({ place, part }) => drawPart(moved(drawnPieces(part, together), moves?.[part.slot] ?? {}), place.at, cam, look) + plumeMarkup(flames.filter((bell) => bell.slot === place.slot), place.at, cam, look, part.slot, part.flame))
          .join(""),
        look,
        PICTURE_W,
        PICTURE_H,
        report.label,
      );
    },
  };
}

/**
 * What a drawing draws of a part: in a stack, what nests inside the part below is out of sight.
 *
 * @param part A built part: its record and its pieces.
 * @param together True when the part stands in a stack, false when it is shown alone.
 * @returns The pieces to draw. In a stack, what nests inside the part below is left out.
 * @example
 * ```ts
 * import { build, drawnPieces } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const [first] = build({ rocket: "falcon-9", variant: "block-5" }).parts;
 * if (first) console.log(drawnPieces(first, true).length, drawnPieces(first, false).length);
 * ```
 */
export function drawnPieces(part: { record: PartRecord; pieces: readonly Piece[] }, together: boolean): readonly Piece[] {
  const joint = part.record.joints.bottom?.y ?? 0;
  if (!together || joint <= 0) return part.pieces;
  return part.pieces.filter((piece) => !(piece.kind === "lathe" && piece.under && Math.max(...piece.profile.map(([, y]) => y)) <= joint + 0.01));
}

/**
 * A rocket from a description. Throws FitError when it does not go together.
 *
 * @param description The rocket, its variant and any other part in a slot.
 * @param options `detail`: `"coarse"` leaves out the small 3D-only detail of a very detailed part, for a fast first view; left out, every piece is made.
 * @returns The built rocket. It throws a `FitError` when the description does not go together.
 * @example
 * ```ts
 * import { build } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const rocket = build({ rocket: "falcon-heavy" });
 * console.log(rocket.report.label, rocket.glb().bytes.length > 1000);
 * ```
 */
export function build(description: Description, options: { detail?: DetailLevel } = {}): Built {
  const report = check(description);
  if (!report.ok) throw new FitError(report);
  const before = detail.level;
  detail.level = options.detail ?? "full";
  try {
    const built = assembled(report);
    // a part's pieces are made when it is assembled, at this level: the lazy parts of a heavy part keep the level they were made at
    return built;
  } finally {
    detail.level = before;
  }
}

/**
 * One part on its own, by its id.
 *
 * @param id A part's id, as `PART_ENTRIES` lists it.
 * @returns The part's record and bounds, a function for its `.glb` and one for its drawing. It throws for an id that is not a part.
 * @example
 * ```ts
 * import { buildPart } from "@johnmorrisdotca/uchusen-rockets/build";
 *
 * const raptor = buildPart("raptor-vacuum");
 * console.log(raptor.record.name, raptor.bounds.max);
 * ```
 */
export function buildPart(id: string): { record: PartRecord; bounds: Bounds; glb: () => Glb; svg: (options?: SvgOptions) => string } {
  const entry = partEntry(id);
  if (!entry) throw new Error(`There is no part "${id}".`);
  const { pieces, bounds } = made(id);
  const one = made(id);
  return {
    record: entry.record,
    bounds,
    glb: () => toGlb([{ name: entry.record.id, mesh: one.mesh, at: [0, 0, 0] }]),
    svg: ({ look = DEFAULT_LOOK, view = DEFAULT_VIEW } = {}) => {
      const angle = typeof view === "string" ? VIEWS[cleanView(view)] : view;
      return wrap(drawPart(pieces, [0, 0, 0], perspective(bounds, angle), look, 1), look, PICTURE_W, PICTURE_H, entry.record.name);
    },
  };
}

export { toGlb };
export type { Glb };
export { COMPARES, lineupSvg } from "./lineup.ts";
export type { CompareId, LineupItem, LineupOptions } from "./lineup.ts";
