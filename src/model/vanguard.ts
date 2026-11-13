// Vanguard 1 as this package's own sphere. The diameter is the article's 152 mm. The antennas are not drawn: the article gives their length and span and not their angle. No name or mark is drawn.
import { nose } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const D = 0.152;
const R = D / 2;

/** Two hemispheres, each a true semicircle (`blunt` 1), making one sphere of the sourced diameter. */
const craft = (): Piece[] => [
  nose("white", R, R, 0, 1),
  nose("white", R, R, D, 1),
];

export const VANGUARD_BUILDS: readonly StackBuild[] = [
  {
    rocket: "vanguard-1",
    variant: "vanguard-1",
    drawnFrom: "This package's own sphere for both looks. The diameter is the 152 mm the article's infobox gives, read 2026-11-13. The six antennas are not drawn: the article gives each as 30 cm by 0.8 cm and their span as 0.91 m, and does not give the angle. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Vanguard 1", height: D, diameter: D, pieces: craft }],
  },
];
