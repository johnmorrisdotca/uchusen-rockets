// The Agena target vehicle in a plain tube for the line looks. The length and the diameter are NASA's early-years summary. The painted look is NASA's model, its flag painted out.
import { AGENA_LENGTH, AGENA_WIDTH } from "../data/agena.ts";
import { tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const craft = (): Piece[] => [tube("white", AGENA_WIDTH / 2, 0, AGENA_LENGTH)];

// NASA's model (agena-craft.glb), metres as drawn. The length is the sourced 9.75 m and the round body the sourced 1.5 m. The boom reaches past the body. The default frame holds this box; the drawing and the sizes keep the tube.
const REACH = { min: [-0.75, 0, -0.78], max: [0.75, 9.75, 2.83] } as const;

export const AGENA_BUILDS: readonly StackBuild[] = [
  {
    rocket: "agena",
    variant: "agena",
    drawnFrom: "NASA's model for the painted look, the flag painted out, scaled so the length is the sourced 9.75 m and the round body the sourced 1.5 m, stood on the engine. This package's own tube for the two line looks, at those two sizes. The engine bell, the docking end and the boom stay in the painted model only. No lettering is drawn.",
    parts: [{ slot: "craft", kind: "spacecraft", name: "Agena Target Vehicle", height: AGENA_LENGTH, diameter: AGENA_WIDTH, sourcedDiameter: { value: AGENA_WIDTH, source: "nasa-early-years", note: "1.5 metres (five feet)." }, reach: REACH, painted: { file: "agena-craft.glb", credit: "nasa-agena" }, pieces: craft }],
  },
];
