// Sputnik 1 as this package's own sphere. The diameter is the article's 58 cm. The antennas are not drawn: the article gives their lengths and not their angle. No name or mark is drawn.
import { nose } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const D = 0.58;
const R = D / 2;

/** Two hemispheres, each a true semicircle (`blunt` 1), making one sphere of the sourced diameter. */
const craft = (): Piece[] => [
  nose("white", R, R, 0, 1),
  nose("white", R, R, D, 1),
];

export const SPUTNIK_BUILDS: readonly StackBuild[] = [
  {
    rocket: "sputnik-1",
    variant: "sputnik-1",
    drawnFrom: "This package's own sphere for both looks. The diameter is the 58 cm the article's infobox gives, read 2026-11-13. The antenna parts of 2.4 m and 2.9 m are not drawn: the article does not give their angle. The 2 mm shell and the 1 mm heat shield are not drawn as layers. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Sputnik 1", height: D, diameter: D, pieces: craft }],
  },
];
