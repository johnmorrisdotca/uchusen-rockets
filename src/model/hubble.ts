// Hubble in plain shapes, for the line looks: its length and width are sourced, and where its arrays and door stand is measured from NASA's model at that scale. The painted look is NASA's model.
import { HUBBLE_WIDE } from "../data/hubble.ts";
import { tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 13.2;
const R = (HUBBLE_WIDE.value ?? 0) / 2;
const TUBE_R = R * 0.74;
const WAIST = 5.1;

const array = (side: number): Piece => {
  const frame = { o: [side * (R + 3.5), WAIST, 0] as Vec3, u: [1, 0, 0] as Vec3, v: [0, 0, 1] as Vec3, w: [0, 1, 0] as Vec3 };
  return { kind: "plate", material: "gold", frame, outline: [[-1.2, -6.2], [1.2, -6.2], [1.2, 6.2], [-1.2, 6.2]], thickness: 0.06, ribs: [[[-1.2, 0], [1.2, 0]]] };
};

const telescope = (): Piece[] => [
  tube("steel", R, 0, WAIST, { rings: [0.02, 2.2, WAIST - 0.02] }),
  { kind: "lathe", material: "dark", segs: 28, under: true, profile: [[0, 0], [R, 0]] },
  tube("steel", TUBE_R, WAIST, H, { rings: [8.4], welds: [10.2] }),
  { kind: "lathe", material: "soot", segs: 28, under: true, only: "mesh", profile: [[TUBE_R * 0.96, H], [0, H]] },
  { kind: "plate", material: "engine-pale", frame: { o: [0, H + 0.02, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline: [[-TUBE_R, -TUBE_R], [TUBE_R, -TUBE_R], [TUBE_R, TUBE_R], [-TUBE_R, TUBE_R]], thickness: 0.05, plain: true },
  array(1),
  array(-1),
];

export const HUBBLE_BUILDS: readonly StackBuild[] = [
  {
    rocket: "hubble",
    variant: "hubble",
    drawnFrom: "NASA's model for the painted look. This package's plain shapes for the two line looks, from the sourced length and width; its arrays and door are measured from NASA's model. No lettering or mark is drawn.",
    parts: [{ slot: "telescope", kind: "spacecraft", name: "Hubble Space Telescope", height: H, diameter: R * 2, sourcedDiameter: HUBBLE_WIDE, painted: { file: "hubble-telescope.glb", credit: "nasa-hubble" }, pieces: telescope }],
  },
];
