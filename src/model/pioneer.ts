// Pioneer in a plain shape, for the line looks: the antenna and the magnetometer boom are sourced. The painted look is NASA's model. One shape serves Pioneer 10 and 11.
import { PIONEER_DISH } from "../data/pioneer.ts";
import type { Piece } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 6.6;
const DISH = (PIONEER_DISH.value ?? 0) / 2;

const craft = (): Piece[] => [
  { kind: "lathe", material: "white", segs: 24, body: true, outline: true, profile: [[0.15, 0], [DISH, 0.2], [DISH, 0.66], [0.4, 0.9]] },
  strut("engine-pale", [0, 0.9, 0], [0, H, 0], 0.08, 0.08),
];

export const PIONEER_BUILDS: readonly StackBuild[] = [
  {
    rocket: "pioneer",
    variant: "pioneer",
    drawnFrom: "NASA's model for the painted look. The high-gain antenna is already the sourced 2.74 m, and its pictures are left out. This package's plain shape for the two line looks, from the sourced antenna and magnetometer boom. One model serves Pioneer 10 and 11. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Pioneer", height: H, diameter: DISH * 2, sourcedDiameter: PIONEER_DISH, painted: { file: "pioneer-craft.glb", credit: "nasa-pioneer" }, pieces: craft }],
  },
];
