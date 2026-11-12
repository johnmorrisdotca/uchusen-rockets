// James Webb in a plain shape, for the line looks: the sunshield and the mirror are sourced. The painted look is NASA's model.
import { JWST_LONG } from "../data/jwst.ts";
import { flat, type Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 4.8;
const LONG = JWST_LONG.value ?? 0;
const WIDE = 14.162;
const MIRROR = 6.5 / 2;

const craft = (): Piece[] => [
  ...[0.3, 1.4, 2.5, 3.6, 4.7].map((y): Piece => ({ kind: "plate", material: "white", frame: flat(0, y), outline: [[-LONG / 2, -WIDE / 2], [LONG / 2, -WIDE / 2], [LONG / 2, WIDE / 2], [-LONG / 2, WIDE / 2]], thickness: 0.06 })),
  { kind: "lathe", material: "gold", segs: 18, body: true, outline: true, profile: [[0.4, 3.4], [MIRROR, 3.7], [MIRROR * 0.92, 4.05], [0.5, 4.4]] },
];

export const JWST_BUILDS: readonly StackBuild[] = [
  {
    rocket: "jwst",
    variant: "jwst",
    drawnFrom: "NASA's model for the painted look, scaled so the sunshield's long side is the sourced 21.197 m. This package's plain shape for the two line looks, from the sourced sunshield and the 6.5 m mirror. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "James Webb Space Telescope", height: H, diameter: LONG, sourcedDiameter: JWST_LONG, painted: { file: "jwst-craft.glb", credit: "nasa-jwst" }, pieces: craft }],
  },
];
