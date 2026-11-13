// Parker Solar Probe in a plain shape, for the line looks: the height, the body and the heat shield are sourced. The painted look is NASA's model.
import { PARKER_SHIELD } from "../data/parker.ts";
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 3;
const BODY = 0.5;
const SHIELD = (PARKER_SHIELD.value ?? 0) / 2;

const craft = (): Piece[] => [
  tube("white", BODY, 0, 2.4, { segs: 16, rings: [0.02, 2.38] }),
  { kind: "lathe", material: "white", segs: 28, body: true, outline: true, profile: [[BODY, 2.4], [SHIELD, 2.7], [SHIELD, 2.9], [0.35, H]] },
];

// The painted model (parker-solar-probe-craft.glb) stands past this plain shape: this is the box it fills, measured from the file, metres as drawn. The default frame holds it, so the painted craft is whole in every view; the drawing and the sizes keep the plain shape.
const REACH = { min: [-1.2, 0, -0.62], max: [1.2, 2.2, 2.15] } as const;
export const PARKER_BUILDS: readonly StackBuild[] = [
  {
    rocket: "parker-solar-probe",
    variant: "parker-solar-probe",
    drawnFrom: "NASA's model for the painted look, scaled so the heat shield is the sourced 2.4 m, its pictures left out. This package's plain shape for the two line looks, from the sourced height, body and shield. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Parker Solar Probe", height: H, diameter: SHIELD * 2, sourcedDiameter: PARKER_SHIELD, reach: REACH, painted: { file: "parker-solar-probe-craft.glb", credit: "nasa-parker" }, pieces: craft }],
  },
];
