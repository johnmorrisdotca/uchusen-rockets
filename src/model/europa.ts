// Europa Clipper in a plain shape, for the line looks: the span and the antenna are sourced. The painted look is NASA VTAD's model.
import { EUROPA_DISH, EUROPA_SPAN } from "../data/europa.ts";
import type { Piece } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const SPAN = EUROPA_SPAN.value ?? 0;
const DISH = (EUROPA_DISH.value ?? 0) / 2;
const H = 3;

const craft = (): Piece[] => [
  strut("solar", [-SPAN / 2, 1.4, 0], [SPAN / 2, 1.4, 0], 0.4, 0.12),
  { kind: "lathe", material: "white", segs: 24, body: true, outline: true, profile: [[0.35, 0.2], [DISH, 1.5], [DISH, 2.2], [0.2, H]] },
];

export const EUROPA_BUILDS: readonly StackBuild[] = [
  {
    rocket: "europa-clipper",
    variant: "europa-clipper",
    drawnFrom: "NASA Visualization Technology Applications and Development's model for the painted look, its pictures left out, scaled so the solar arrays span the sourced about 30 m. This package's plain shape for the two line looks, from that span and the 3 m antenna. No wordmark, logo or flag is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Europa Clipper", height: H, diameter: SPAN, sourcedDiameter: EUROPA_SPAN, painted: { file: "europa-clipper-craft.glb", credit: "nasa-europa-clipper" }, pieces: craft }],
  },
];
