// The two levels of every module: coarse (the hull, the collars and the big shapes) and fine (all the detail). A ship builds coarse first, for a first picture in a moment, and adds the fine pass after, module by module,
// nearest the camera first; the detail pass is the pieces that are not coarse. Build time is measured here so a test can hold it to a budget. Pure: no three.js and no DOM.
import { type Piece } from "../pieces.ts";

/**
 * Whether a piece belongs to the coarse level: a body of revolution that is part of the main body or has an outline (a hull, a bell, a collar's flange), or a solid that is at least a metre and a half every way (a container's box).
 * Everything else is detail and is added in the fine pass.
 *
 * @param piece A piece of a module.
 * @returns True for the coarse level.
 * @example
 * ```ts
 * import { isCoarse, KIT } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const pieces = KIT["tank-cryo-12"].pieces();
 * console.log(pieces.filter(isCoarse).length, "of", pieces.length);
 * ```
 */
export function isCoarse(piece: Piece): boolean {
  if (piece.kind === "lathe") return Boolean(piece.body || piece.outline);
  if (piece.kind === "plate" && (piece.material.startsWith("light-pool") || piece.material.startsWith("halo-"))) return true;
  if (piece.kind === "plate" && piece.material === "window") {
    const us = piece.outline.map(([a]) => a);
    const vs = piece.outline.map(([, b]) => b);
    return Math.min(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs)) >= 0.6;
  }
  if (piece.kind === "plate") {
    // a solid, not a beam, a sheet or a panel of the plating: thick, wide and deep all at once
    if (!piece.plain) return false;
    const us = piece.outline.map(([a]) => a);
    const vs = piece.outline.map(([, b]) => b);
    return Math.min(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs), piece.thickness) >= 1.5;
  }
  return false;
}

/**
 * How long a build may take, in milliseconds, on a normal laptop: the first picture (coarse) within a second and full detail within three. `test/fleet-kit.test.ts` fails when a sample assembly goes over.
 *
 * @example
 * ```ts
 * import { BUILD_BUDGET_MS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(BUILD_BUDGET_MS.coarse, BUILD_BUDGET_MS.fine);
 * ```
 */
export const BUILD_BUDGET_MS = { coarse: 1000, fine: 3000 } as const;
