// LAGEOS-1 as this package's own sphere. The diameter is the article's 0.60 m. The retroreflectors have a count and no size, so they are not drawn. No name or mark is drawn.
import { nose } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const D = 0.6;
const R = D / 2;

/** Two hemispheres, each a true semicircle (`blunt` 1), making one sphere of the sourced diameter. */
const craft = (): Piece[] => [
  nose("white", R, R, 0, 1),
  nose("white", R, R, D, 1),
];

export const LAGEOS_BUILDS: readonly StackBuild[] = [
  {
    rocket: "lageos",
    variant: "lageos-1",
    drawnFrom: "This package's own sphere for both looks. The diameter is the 0.60 m the article's infobox gives, read 2026-11-13. The retroreflectors are not drawn: the article gives their number and not their size. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "LAGEOS-1", height: D, diameter: D, pieces: craft }],
  },
];
