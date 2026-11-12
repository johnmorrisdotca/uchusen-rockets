// Juno in a plain shape, for the line looks: the body, the span and the arrays' width are sourced. The painted look is NASA's model.
import { JUNO_SPAN } from "../data/juno.ts";
import { tube } from "./kit.ts";
import { flat, type Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const BODY = 3.5;
const BODY_R = BODY / 2;
const SPAN = JUNO_SPAN.value ?? 0;
/** Centre to a tip, so two tips a third of a turn apart are the sourced span. */
const TIP = SPAN / Math.sqrt(3);
const PANEL = 2.65;
const PANEL_Y = 1.7;

const craft = (): Piece[] => [
  tube("white", BODY_R, 0, BODY, { segs: 6, rings: [0.02, BODY - 0.02] }),
  { kind: "lathe", material: "engine-pale", segs: 28, under: true, profile: [[0, BODY], [1.73, BODY]] },
  ...[0, 120, 240].map((deg): Piece => {
    const az = (deg * Math.PI) / 180;
    return { kind: "plate", material: "solar", frame: flat(az, PANEL_Y, BODY_R), outline: [[0, -PANEL / 2], [TIP - BODY_R, -PANEL / 2], [TIP - BODY_R, PANEL / 2], [0, PANEL / 2]], thickness: 0.08 };
  }),
];

export const JUNO_BUILDS: readonly StackBuild[] = [
  {
    rocket: "juno",
    variant: "juno",
    drawnFrom: "NASA's model for the painted look, scaled so the arrays span the sourced 20 m. This package's plain shape for the two line looks, from the sourced body, span and array width. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Juno", height: BODY, diameter: SPAN, sourcedDiameter: JUNO_SPAN, painted: { file: "juno-craft.glb", credit: "nasa-juno" }, pieces: craft }],
  },
];
