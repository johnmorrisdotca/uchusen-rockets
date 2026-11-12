// Galileo in a plain shape, for the line looks: the height and the magnetometer boom are sourced. The painted look is NASA's model.
import { GALILEO_BOOM } from "../data/galileo.ts";
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 5.3;
const BOOM = GALILEO_BOOM.value ?? 0;

const craft = (): Piece[] => [
  tube("white", 1.1, 0, H, { segs: 16, rings: [0.02, H - 0.02] }),
  strut("engine-pale", [1.1, 2.4, 0], [BOOM, 2.4, 0], 0.16, 0.16),
];

export const GALILEO_BUILDS: readonly StackBuild[] = [
  {
    rocket: "galileo",
    variant: "galileo",
    drawnFrom: "NASA's model for the painted look, scaled so its longest side is the sourced 11 m boom. This package's plain shape for the two line looks, from the sourced height and boom. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Galileo", height: H, diameter: BOOM, sourcedDiameter: GALILEO_BOOM, painted: { file: "galileo-craft.glb", credit: "nasa-galileo" }, pieces: craft }],
  },
];
