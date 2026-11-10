// How finely a very detailed part is drawn right now. A fleet ship's parts hold hundreds of thousands of small pieces, which a page cannot afford to build at once: the first picture and the far view use the
// coarse level (the structure and every piece over six metres), and the full level is built when the camera comes near or a part is shown alone. Pure.
import type { Piece } from "./pieces.ts";

export type DetailLevel = "full" | "coarse";

/** The level in force while a part's pieces are being made, and the level of a whole ship docked to a carrier (a page draws those coarse until it is zoomed in on them). Set by `build`, never by hand. */
export const detail: { level: DetailLevel; docked: DetailLevel } = { level: "full", docked: "full" };

/** The smallest a 3D-only piece may be, in metres, and stay in the coarse level. */
export const COARSE_MIN = 6;

const sizeOf = (piece: Piece): number => {
  if (piece.kind === "plate") {
    const us = piece.outline.map(([a]) => a);
    const vs = piece.outline.map(([, b]) => b);
    return Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), piece.thickness);
  }
  if (piece.kind === "lathe") {
    const rs = piece.profile.map(([r]) => r);
    const ys = piece.profile.map(([, y]) => y);
    return Math.max(Math.max(...rs) - Math.min(...rs), Math.max(...ys) - Math.min(...ys));
  }
  return Infinity;
};

/** The coarse level of a part: what is drawn in the line drawings stays, and so does any 3D piece over `COARSE_MIN` metres; the small detail goes. A lamp's bead is under a metre and stays, because the picture draws it as a point. */
export const coarsen = (pieces: readonly Piece[]): Piece[] => pieces.filter((piece) => piece.only !== "mesh" || piece.kind === "lines" || sizeOf(piece) >= COARSE_MIN || ("material" in piece && typeof piece.material === "string" && piece.material.startsWith("halo-")));
