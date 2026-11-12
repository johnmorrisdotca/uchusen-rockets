// New Horizons in a plain shape, for the line looks: the body and the antenna are sourced. The painted look is NASA VTAD's model.
import { NEW_HORIZONS_DISH, NEW_HORIZONS_HEIGHT } from "../data/new-horizons.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = NEW_HORIZONS_HEIGHT.value ?? 0;
const BODY_H = 0.7;
const LONG = 2.1;
const WIDE = 2.7;
const DISH = (NEW_HORIZONS_DISH.value ?? 0) / 2;

const craft = (): Piece[] => [
  { kind: "plate", material: "white", frame: { o: [0, BODY_H / 2, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline: [[-WIDE / 2, -LONG / 2], [WIDE / 2, -LONG / 2], [WIDE / 2, LONG / 2], [-WIDE / 2, LONG / 2]], thickness: BODY_H, plain: true },
  { kind: "lathe", material: "engine-pale", segs: 28, body: true, outline: true, profile: [[0.28, BODY_H], [DISH, 1.15], [DISH, 1.4], [0.12, H]] },
];

export const NEW_HORIZONS_BUILDS: readonly StackBuild[] = [
  {
    rocket: "new-horizons",
    variant: "new-horizons",
    drawnFrom: "NASA Visualization Technology Applications and Development's model for the painted look, the flag and the nameplates painted out, scaled so the antenna is the sourced 2.1 m. This package's plain shape for the two line looks, from the sourced body and antenna. The RTG is not drawn: the press kit names it and does not give its length. No flag or nameplate is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "New Horizons", height: H, diameter: WIDE, sourcedDiameter: { value: WIDE, source: "nasa-new-horizons-press-kit", note: "The primary structure is 2.7 m at its widest. The antenna is 2.1 m." }, painted: { file: "new-horizons-craft.glb", credit: "nasa-new-horizons" }, pieces: craft }],
  },
];
