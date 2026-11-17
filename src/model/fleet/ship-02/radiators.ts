// The radiator wings: two flat wings, one each side, in the plane between the upper and lower tanks. Each is six panels (a header pipe, tube rows, ribs and a hinge edge) hung from a boom, deployed. A stowed
// pack of folded panels rides on each side of the spine as well, shown as the folded stack with its latch brackets: the same panel, folded.
import { lampHalo } from "../lights.ts";
import { rng, type Piece } from "./adapter.ts";
import { stowedPieces, wingPieces } from "../heavy/wing.ts";

/** One wing, from the hull's flank outward on the x axis, from y 0 to its length. `side` is the sign of x. The kit draws the wing (`../heavy/wing.ts`); the ship's own navigation lamps go on it. */
export function wing(side: 1 | -1, length = 560, panels = 6, panelWidth = 56, root = 44): Piece[] {
  return [
    ...wingPieces({ length, panelWidth, panels, root }, side, rng(2080 + side)),
    ...lampHalo(side < 0 ? "port" : "starboard", [side * (root + 120), length * 0.42, 0], 4), ...lampHalo(side < 0 ? "beacon" : "nav-white", [side * (root + 120), length * 0.7, 0], 4),
  ];
}

/** A stowed pack: six panels folded into a stack 56 m by 56 m by 24 m, held by latch brackets, on a short arm. The kit draws it. */
export function stowed(length = 240): Piece[] {
  return stowedPieces({ width: 56, length });
}
