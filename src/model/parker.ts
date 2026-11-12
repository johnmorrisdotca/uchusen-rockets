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

export const PARKER_BUILDS: readonly StackBuild[] = [
  {
    rocket: "parker-solar-probe",
    variant: "parker-solar-probe",
    drawnFrom: "NASA's model for the painted look, scaled so the heat shield is the sourced 2.4 m, its pictures left out. This package's plain shape for the two line looks, from the sourced height, body and shield. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Parker Solar Probe", height: H, diameter: SHIELD * 2, sourcedDiameter: PARKER_SHIELD, painted: { file: "parker-solar-probe-craft.glb", credit: "nasa-parker" }, pieces: craft }],
  },
];
