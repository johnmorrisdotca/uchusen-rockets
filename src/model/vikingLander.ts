// Viking Lander in a plain shape, for the line looks: the body, the clearance, the footpad triangle and the height are sourced. The painted look is NASA's model.
import { VIKING_FOOTPAD_SIDE } from "../data/vikingLander.ts";
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const TALL = 2;
const CLEAR = 0.22;
const DEEP = 0.46;
const BODY = 1.5 / 2;
const PAD = VIKING_FOOTPAD_SIDE / Math.sqrt(3);

const pads = [0, 1, 2].map((i) => {
  const turn = (i * 120 * Math.PI) / 180;
  return [Math.sin(turn) * PAD, 0, Math.cos(turn) * PAD] as const;
});

const craft = (): Piece[] => [
  tube("white", BODY, CLEAR, CLEAR + DEEP),
  ...pads.map((pad) => strut("white", [0, CLEAR, 0], [pad[0], 0, pad[2]], 0.06, 0.06)),
  { kind: "lathe", material: "white", segs: 20, body: true, outline: true, profile: [[0.08, CLEAR + DEEP], [0.08, 1.35], [0.5, 1.7], [0.55, 1.88], [0.06, TALL]] },
];

// The painted model (viking-lander-craft.glb) stands past this plain shape: this is the box it fills, measured from the file, metres as drawn. The sampler boom reaches past the footpads. The default frame holds it, so the painted craft is whole in every view; the drawing and the sizes keep the plain shape.
const REACH = { min: [-1.26, -0.02, -1.48], max: [2.17, 1.84, 1.1] } as const;
export const VIKING_LANDER_BUILDS: readonly StackBuild[] = [
  {
    rocket: "viking-lander",
    variant: "viking-lander",
    drawnFrom: "NASA's model for the painted look, scaled so the footpad triangle is the sourced 2.21 m, with the pads on the ground. This package's plain shape for the two line looks, from the sourced body, clearance, triangle and height. The surface sampler stays in the painted model only. No mark is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Viking Lander", height: TALL, diameter: VIKING_FOOTPAD_SIDE, sourcedDiameter: { value: VIKING_FOOTPAD_SIDE, source: "nasa-viking-spacecraft", note: "The footpads form an equilateral triangle of 2.21 m." }, reach: REACH, painted: { file: "viking-lander-craft.glb", credit: "nasa-viking-lander" }, pieces: craft }],
  },
];
