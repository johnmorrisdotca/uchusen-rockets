// The Kaminari concepts' parts as rows of the registry: each module with its record (its real size in metres and where it stands) and how to build its pieces. All fictional, drawn wholly by this package's code from the
// tables in `fleet/kaminari-concepts/`. Pure: no three.js and no DOM.
import { blank } from "../data/types.ts";
import { coarsen, detail } from "./detail.ts";
import type { Piece } from "./pieces.ts";
import { CONCEPT_KEYS, CONCEPT_ROCKET, CONCEPT_SLOTS, SPECS } from "./fleet/kaminari-concepts/index.ts";
import type { PartEntry } from "./registry.ts";

/** The size of a piece, metres: its longest side. */
const sizeOf = (piece: Piece): number => {
  if (piece.kind === "plate") {
    const us = piece.outline.map(([a]) => a);
    const vs = piece.outline.map(([, b]) => b);
    return Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), piece.thickness);
  }
  if (piece.kind === "lathe") return Math.max(Math.max(...piece.profile.map(([r]) => r)) * 2, Math.max(...piece.profile.map(([, y]) => y)) - Math.min(...piece.profile.map(([, y]) => y)));
  return Infinity;
};

/** What the line drawings carry of a concept: its big shapes only, the hulls and the long members. Everything small, and every seam line, is for the 3D view alone, so a drawing of a hundred thousand pieces stays a drawing of under 80 KB. */
const forDrawing = (pieces: readonly Piece[]): Piece[] => {
  const big = (piece: Piece): boolean => (piece.kind === "lathe" ? Boolean(piece.body || piece.outline) && sizeOf(piece) >= 24 : piece.kind === "plate" && sizeOf(piece) >= 90);
  const out: Piece[] = [];
  for (const piece of pieces) {
    if (piece.only !== undefined && piece.only !== "drawing") out.push(piece);
    else if (piece.only === "drawing") out.push({ ...piece, only: "mesh" });
    else if (!big(piece)) out.push({ ...piece, only: "mesh" });
    // a big shape is in the mesh as it is, and in the drawing as a coarser copy of itself
    else out.push({ ...piece, only: "mesh" }, piece.kind === "lathe" ? { ...piece, segs: Math.min(piece.segs, 12), rings: undefined, welds: undefined, only: "drawing" } : { ...piece, only: "drawing" });
  }
  return out;
};

const NOTE = blank("A design of this package, with no source.");

/** The id of a concept's part: the rocket, the concept and the slot. */
export const conceptPartId = (variant: string, slot: string): string => `${CONCEPT_ROCKET}-${variant}-${slot}`;

/** Every part of every concept, each once. */
export const CONCEPT_ENTRIES: readonly PartEntry[] = CONCEPT_KEYS.flatMap((key) =>
  CONCEPT_SLOTS[key].map((slot, i): PartEntry => ({
    record: {
      id: conceptPartId(SPECS[key].id, slot.slot),
      kind: slot.kind,
      name: slot.name,
      rocket: CONCEPT_ROCKET,
      trueTo: [SPECS[key].id],
      height: slot.height,
      diameter: slot.diameter,
      sourced: { height: NOTE, diameter: NOTE },
      joints: {},
      ...(i === 0 ? {} : { strapOn: { x: slot.at[0], z: slot.at[2], y: slot.at[1] } }),
      painted: null,
      drawnFrom: `This package's own design: ${slot.note}`,
    },
    pieces: () => forDrawing(detail.level === "coarse" ? coarsen(slot.pieces()) : slot.pieces()),
  })),
);
