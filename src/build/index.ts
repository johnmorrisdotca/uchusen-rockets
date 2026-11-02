// The builder: one description into one mesh and one drawing. Works in Node and in a browser, with no dependency: the geometry here is this package's own.
import { check, type Description, type FitReport } from "../fit.ts";
import { type Angle, cleanView, DEFAULT_VIEW, PICTURE_H, PICTURE_W, VIEWS, type Vec3, type ViewName } from "../framing.ts";
import { cleanShow, placesFor, showsOf } from "../layout.ts";
import { DEFAULT_LOOK, type LookName } from "../looks.ts";
import { type PartMesh, boundsOf, type Bounds, meshOf, type Piece } from "../model/pieces.ts";
import { partEntry } from "../model/registry.ts";
import type { PartRecord } from "../parts.ts";
import { plumeMarkup } from "../draw/plume.ts";
import { defsOf, drawPart, perspective } from "../draw/svg.ts";
import { bellsOf, litBells, type LitBell, pickBells, plumeLength } from "../engines.ts";
import { type Glb, toGlb } from "./glb.ts";

/** Raised when a description does not fit: its report says why. */
export class FitError extends Error {
  readonly report: FitReport;
  constructor(report: FitReport) {
    super(report.issues.filter((issue) => issue.level === "error").map((issue) => issue.message).join(" "));
    this.name = "FitError";
    this.report = report;
  }
}

export interface BuiltPart {
  slot: string;
  record: PartRecord;
  pieces: readonly Piece[];
  mesh: PartMesh;
  bounds: Bounds;
}

export interface SvgOptions {
  look?: LookName;
  view?: ViewName | Angle;
  show?: string;
  /** A flame at each engine that is showing, or as many as a count names for each part. The length is a picture, not a measured flame. Left out, the drawing is unchanged. */
  engines?: boolean | Readonly<Record<string, number>>;
}

export interface Built {
  report: FitReport;
  parts: readonly BuiltPart[];
  /** What can be shown: together, apart and each part. */
  shows: readonly string[];
  /** The bounds of a choice of what to show, in metres, and with `lit` the flames of its engines at full thrust. */
  boundsOf(show?: string, lit?: boolean): Bounds;
  /** Where each part stands for a choice of what to show. */
  placesOf(show?: string): { slot: string; at: Vec3; shown: boolean }[];
  /** The .glb file's bytes: every part stacked, each its own node to move. */
  glb(): Glb;
  /** The drawing, in a look, from an angle. */
  svg(options?: SvgOptions): string;
}

const memo = new Map<string, { pieces: readonly Piece[]; mesh: PartMesh; bounds: Bounds }>();
function made(id: string) {
  const known = memo.get(id);
  if (known) return known;
  const entry = partEntry(id);
  if (!entry) throw new Error(`There is no part "${id}".`);
  const pieces = entry.pieces();
  const mesh = meshOf(pieces);
  const result = { pieces, mesh, bounds: boundsOf(mesh) };
  memo.set(id, result);
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

function assembled(report: FitReport): Built {
  const parts: BuiltPart[] = report.parts.map(({ slot, part }) => {
    const { pieces, mesh, bounds } = made(part.id);
    return { slot, record: part, pieces, mesh, bounds };
  });
  const slots = parts.map((part) => part.slot);
  const placesOf = (show?: string) => placesFor(report.parts, cleanShow(show, slots), (part) => widthOf(part.id));
  const flamesOf = (show: string | undefined): LitBell[] => {
    const places = placesOf(show);
    return litBells(
      places.map((place) => {
        const part = parts.find((p) => p.slot === place.slot) as BuiltPart;
        return { slot: part.slot, atY: place.at[1], shown: place.shown, pieces: part.pieces };
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
    glb: () => toGlb(parts.map((part) => ({ name: part.slot, mesh: part.mesh, at: placesOf("together").find((place) => place.slot === part.slot)?.at ?? [0, 0, 0] }))),
    svg: ({ look = DEFAULT_LOOK, view = DEFAULT_VIEW, show, engines = false } = {}) => {
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
          .map(({ place, part }) => drawPart(drawnPieces(part, together), place.at, cam, look) + plumeMarkup(flames.filter((bell) => bell.slot === place.slot), place.at, cam, look, part.slot))
          .join(""),
        look,
        PICTURE_W,
        PICTURE_H,
        report.label,
      );
    },
  };
}

/** What a drawing draws of a part: in a stack, what nests inside the part below is out of sight. */
export function drawnPieces(part: { record: PartRecord; pieces: readonly Piece[] }, together: boolean): readonly Piece[] {
  const joint = part.record.joints.bottom?.y ?? 0;
  if (!together || joint <= 0) return part.pieces;
  return part.pieces.filter((piece) => !(piece.kind === "lathe" && piece.under && Math.max(...piece.profile.map(([, y]) => y)) <= joint + 0.01));
}

/** A rocket from a description. Throws FitError when it does not go together. */
export function build(description: Description): Built {
  const report = check(description);
  if (!report.ok) throw new FitError(report);
  return assembled(report);
}

/** One part on its own, by its id. */
export function buildPart(id: string): { record: PartRecord; bounds: Bounds; glb: () => Glb; svg: (options?: SvgOptions) => string } {
  const entry = partEntry(id);
  if (!entry) throw new Error(`There is no part "${id}".`);
  const { pieces, mesh, bounds } = made(id);
  return {
    record: entry.record,
    bounds,
    glb: () => toGlb([{ name: entry.record.id, mesh, at: [0, 0, 0] }]),
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
