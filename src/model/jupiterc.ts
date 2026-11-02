// Jupiter-C in plain shapes, for the line looks: its height and width are sourced, and its outline is measured from NASA's model at that scale. The painted look is NASA's model.
import { JUPITER_C_WIDE } from "../data/jupiterc.ts";
import { fins, floor, stripes, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 21.3;
const R = (JUPITER_C_WIDE.value ?? 0) / 2;

const vehicle = (): Piece[] => [
  tube("white", R, 0.42, 3.1, { rings: [0.44, 3.08] }),
  ...stripes("black", R, 0.42, 3.1, [0, 180], 60),
  floor(R, 0.42),
  ...fins("engine-pale", R, [45, 135, 225, 315], [[0, 0.9], [0.5, 0.1], [0.55, 0.9], [0, 2.9]], 0.06),
  tube("steel", R, 3.1, 14.6, { rings: [9.2], welds: [6, 12] }),
  taper("steel", R, 14.6, 0.47, 18.2, { rings: [14.62] }),
  taper("steel", 0.47, 18.2, 0.17, 19.4),
  tube("engine-pale", 0.17, 19.4, H - 0.4),
  taper("engine-pale", 0.17, H - 0.4, 0.02, H),
];

export const JUPITER_C_BUILDS: readonly StackBuild[] = [
  {
    rocket: "jupiter-c",
    variant: "jupiter-c",
    drawnFrom: "NASA's model for the painted look, its lettering removed. This package's plain shapes for the two line looks, from the sourced height and width. No lettering is drawn.",
    parts: [{ slot: "vehicle", kind: "first-stage", name: "Jupiter-C", height: H, diameter: R * 2, sourcedDiameter: JUPITER_C_WIDE, painted: { file: "jupiter-c-vehicle.glb", credit: "nasa-jupiter-c" }, pieces: vehicle }],
  },
];
