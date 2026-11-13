// Voyager in a plain shape, for the line looks: the antenna, the bus, the height and the magnetometer boom are sourced. The painted look is NASA's model.
import { VOYAGER_DISH } from "../data/voyager.ts";
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 3.8;
const DISH = (VOYAGER_DISH.value ?? 0) / 2;
const BUS = 1.8 / 2;
const BOOM = 13;
/** How far the line drawing reaches: the bus's radius, the boom and the antenna's radius. */
const WIDE = BUS + BOOM + DISH;

const craft = (): Piece[] => [
  tube("engine-metal", BUS, 0.2, 2.05, { segs: 10, rings: [0.22, 2.03] }),
  { kind: "lathe", material: "engine-metal", segs: 10, under: true, profile: [[0, 0.2], [BUS, 0.2]] },
  { kind: "lathe", material: "engine-pale", segs: 28, body: true, outline: true, profile: [[0.45, 2.05], [DISH, 2.55], [DISH * 0.96, 3.05], [0.22, H]] },
  strut("engine-pale", [BUS, 1.15, 0], [BUS + BOOM, 1.15, 0], 0.14, 0.14),
];

// The painted model (voyager-craft.glb) stands past this plain shape: this is the box it fills, measured from the file, metres as drawn. The default frame holds it, so the painted craft is whole in every view; the drawing and the sizes keep the plain shape.
const REACH = { min: [-3.83, -0.01, -1.85], max: [8.63, 7.74, 1.85] } as const;
export const VOYAGER_BUILDS: readonly StackBuild[] = [
  {
    rocket: "voyager",
    variant: "voyager",
    drawnFrom: "NASA's model for the painted look, scaled so the antenna is the sourced 3.7 m, with the record's marked face left out. This package's plain shape for the two line looks, from the sourced antenna, bus, height and magnetometer boom. No name or flag is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Voyager", height: H, diameter: WIDE, sourcedDiameter: { value: WIDE, source: "nasa-voyager-faq", note: "The bus's radius, the 13 m magnetometer boom and the antenna's radius, added. The antenna itself is 3.7 m." }, reach: REACH, painted: { file: "voyager-craft.glb", credit: "nasa-voyager" }, pieces: craft }],
  },
];
