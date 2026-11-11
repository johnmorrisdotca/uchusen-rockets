// Jupiter-C in plain shapes, for the line looks, as four stages in slots: its height and width are sourced, and where each stage begins is measured from NASA's model at that scale. The painted look is NASA's model, one file a stage.
import { JUPITER_C_WIDE } from "../data/jupiterc.ts";
import { blank } from "../data/types.ts";
import { fins, floor, stripes, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 21.3;
const R = (JUPITER_C_WIDE.value ?? 0) / 2;
/** Where each stage begins, from NASA's model at the sourced height: the tail unit, the Redstone body, the spinning tub and the top stage. The tub nests a little in the body's top, and the top stage in the tub's. */
const TAIL = 3.095;
const BODY = 15.03;
const TUB = 1.442;
const TUB_NEST = 0.173;
const TOP_NEST = 0.022;
const TOP = H - (TAIL + BODY + TUB - TUB_NEST) + TOP_NEST;
const TUB_R = 0.48;
const TOP_R = 0.167;
const FINS_WIDE = blank("1.8 m across its body, the sourced width; 2.9 m across its fins, from NASA's model.");
const TUB_WIDE = blank("The tub's width has no figure in its article: NASA's model at the sourced height gives 0.96 m.");
const TOP_WIDE = blank("The top stage's width has no figure in its article: NASA's model at the sourced height gives 0.33 m.");

const tail = (): Piece[] => [
  tube("white", R, 0.42, TAIL, { rings: [0.44, TAIL - 0.02] }),
  ...stripes("black", R, 0.42, TAIL, [0, 180], 60),
  floor(R, 0.42),
  ...fins("engine-pale", R, [45, 135, 225, 315], [[0, 0.9], [0.5, 0.1], [0.55, 0.9], [0, 2.9]], 0.06),
];

const body = (): Piece[] => [tube("steel", R, 0, 11.5, { rings: [6.1], welds: [2.9, 8.9] }), taper("steel", R, 11.5, TUB_R, BODY, { rings: [11.52] })];

const tub = (): Piece[] => [tube("engine-pale", TUB_R, 0, 0.85, { rings: [0.02, 0.83] }), taper("engine-pale", TUB_R, 0.85, 0.3, 0.95), tube("engine-pale", 0.3, 0.95, TUB, { rings: [TUB - 0.02] })];

const top = (): Piece[] => [tube("engine-pale", TOP_R, 0, TOP - 0.4), taper("engine-pale", TOP_R, TOP - 0.4, 0.02, TOP)];

const FROM = "NASA's model for the painted look, its lettering removed, one file a stage. This package's plain shapes for the two line looks, from the sourced height and width; where each stage begins is measured from NASA's model. No lettering is drawn.";
const painted = (stage: string) => ({ file: `jupiter-c-${stage}.glb`, credit: "nasa-jupiter-c" as const });

export const JUPITER_C_BUILDS: readonly StackBuild[] = [
  {
    rocket: "jupiter-c",
    variant: "jupiter-c",
    drawnFrom: FROM,
    parts: [
      { slot: "tail", kind: "tail", name: "Tail unit with its four fins, Jupiter-C", height: TAIL, diameter: R * 2 + 1.1, top: [TAIL, R * 2], sourcedDiameter: FINS_WIDE, painted: painted("tail"), pieces: tail },
      { slot: "first-stage", kind: "first-stage", name: "Redstone first stage, Jupiter-C", height: BODY, diameter: R * 2, bottom: [0, R * 2], top: [BODY, TUB_R * 2], sourcedDiameter: JUPITER_C_WIDE, painted: painted("first-stage"), pieces: body },
      { slot: "tub", kind: "second-stage", name: "Spinning tub with stages 2 and 3, Jupiter-C", height: TUB, diameter: TUB_R * 2, bottom: [TUB_NEST, TUB_R * 2], top: [TUB, TOP_R * 2], sourcedDiameter: TUB_WIDE, painted: painted("tub"), pieces: tub },
      { slot: "fourth-stage", kind: "fourth-stage", name: "Fourth stage with Explorer 1, Jupiter-C", height: TOP, diameter: TOP_R * 2, bottom: [TOP_NEST, TOP_R * 2], sourcedDiameter: TOP_WIDE, painted: painted("fourth-stage"), pieces: top },
    ],
  },
];
