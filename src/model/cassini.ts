// Cassini in a plain shape, for the line looks: the height and the antenna are sourced. The painted look is NASA's model.
import { CASSINI_DISH } from "../data/cassini.ts";
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 6.8;
const DISH = (CASSINI_DISH.value ?? 0) / 2;

const craft = (): Piece[] => [
  tube("white", 1.4, 0, 4.6, { segs: 16, rings: [0.02, 4.58] }),
  { kind: "lathe", material: "white", segs: 24, body: true, outline: true, profile: [[1.4, 4.6], [DISH, 5.4], [DISH, 6.2], [0.4, H]] },
];

// The painted model (cassini-craft.glb) stands past this plain shape: this is the box it fills, measured from the file, metres as drawn. The default frame holds it, so the painted craft is whole in every view; the drawing and the sizes keep the plain shape.
const REACH = { min: [-8.98, -0.01, -11.05], max: [8.97, 11.64, 2.04] } as const;
export const CASSINI_BUILDS: readonly StackBuild[] = [
  {
    rocket: "cassini",
    variant: "cassini",
    drawnFrom: "NASA's model for the painted look, scaled so the high-gain antenna is the sourced 4 m, its pictures left out. This package's plain shape for the two line looks, from the sourced height and antenna. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Cassini", height: H, diameter: DISH * 2, sourcedDiameter: CASSINI_DISH, reach: REACH, painted: { file: "cassini-craft.glb", credit: "nasa-cassini" }, pieces: craft }],
  },
];
