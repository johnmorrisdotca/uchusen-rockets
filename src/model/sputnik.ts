// Sputnik 1 as this package's own sphere. The diameter is the 22 inches in NASA's history account. The antennas are not drawn: NASA's pages give neither their length nor their angle. No name or mark is drawn.
import { nose } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const D = 0.5588;
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
    drawnFrom: "This package's own sphere for both looks. The diameter is the 22 inches in Roger Launius's account on NASA's history pages, read 2026-11-13. The four whip antennae are not drawn: those pages give neither their length nor their angle. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Sputnik 1", height: D, diameter: D, pieces: craft }],
  },
];
