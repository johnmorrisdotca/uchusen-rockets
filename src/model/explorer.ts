// Explorer 1 as this package's own tube and cone. The length and diameter are NASA's fast-facts page; the cone's 0.3 m is judged from photographs, because no source read gives the sections' lengths. The whip antennas are not drawn: no source gives their length. No name or mark is drawn.
import { nose, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 2.03;
const R = 0.159 / 2;
const CONE = 0.3;

/** A tube topped by a cone, the whole satellite at its sourced length. */
const craft = (): Piece[] => [
  tube("steel", R, 0, H - CONE),
  nose("white", R, H - CONE, H, 0.8),
];

export const EXPLORER_BUILDS: readonly StackBuild[] = [
  {
    rocket: "explorer-1",
    variant: "explorer-1",
    drawnFrom: "This package's own tube and cone for both looks. The length and diameter are NASA's Explorer 1 fast-facts page, read 2026-11-17. The cone's 0.3 m is judged from photographs: no source read gives the sections' lengths. The four whip antennas are not drawn: no source gives their length. No name or mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Explorer 1", height: H, diameter: R * 2, pieces: craft }],
  },
];
