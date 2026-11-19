// The Titan II GLV from a table of numbers. The two stages' lengths and the width are sourced. The spacecraft is the Gemini entry's plain shapes at its sourced length, not a second drawing. The engines' size and the paint are not sourced.
import { FUTURE_STAGE_LENGTHS } from "../data/future-lengths.ts";
import { GEMINI_WIDE } from "../data/gemini.ts";
import { blank } from "../data/types.ts";
import { merlin } from "./falcon.ts";
import { adapter, ADAPTER, capsule, NECK, WHOLE as GEMINI } from "./gemini.ts";
import { floor, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const GLV = FUTURE_STAGE_LENGTHS["titan-ii-glv"];
const R = (GLV.diameters.glv.value ?? 0) / 2;
const FIRST = GLV.parts["stage-1"].value ?? 0;
const SECOND = GLV.parts["stage-2"].value ?? 0;
const SPACECRAFT_R = (GEMINI_WIDE.value ?? 0) / 2;

function firstStage(): Piece[] {
  const foot = 1.2;
  return [
    tube("white", R, foot, FIRST, { rings: [foot + 0.02, 8, 16, FIRST - 0.02], welds: [5, 12] }),
    floor(R, foot),
    ...merlin([-0.55, 0], 0, 0.5, 1.4),
    ...merlin([0.55, 0], 0, 0.5, 1.4),
  ];
}

const secondStage = (): Piece[] => [
  tube("white", R, 0, SECOND, { rings: [0.02, SECOND - 0.02], welds: [2.5] }),
  floor(R, 0),
  ...merlin([0, 0], -0.05, 0.45, 1.3).map((piece) => ({ ...piece, only: "mesh" as const })),
];

export const TITAN_II_GLV_BUILDS: readonly StackBuild[] = [
  {
    rocket: "titan-ii-glv",
    variant: "glv",
    drawnFrom: "This package's code, from the sourced lengths of the two stages and the vehicle's width, with the Gemini entry's plain shapes for the spacecraft, at its sourced 5.61 m. The first stage's length takes in the interstage and the second stage's is what NASA's figure puts above the separation plane. The first stage has the two nozzles its article's text gives the LR87. The engines' size and the paint are not sourced. No licensed model is used, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "First stage, Titan II GLV", height: FIRST, diameter: R * 2, top: [FIRST, R * 2], pieces: firstStage },
      { slot: "second-stage", kind: "second-stage", name: "Second stage, Titan II GLV", height: SECOND, diameter: R * 2, bottom: [0, R * 2], top: [SECOND, R * 2], pieces: secondStage },
      { slot: "adapter", kind: "spacecraft", name: "Adapter, Gemini spacecraft, Titan II GLV", height: ADAPTER, diameter: SPACECRAFT_R * 2, bottom: [0, SPACECRAFT_R * 2], sourcedDiameter: GEMINI_WIDE, pieces: adapter },
      { slot: "capsule", kind: "capsule", name: "Reentry module, Gemini spacecraft, Titan II GLV", height: GEMINI - ADAPTER, diameter: NECK * 2, place: { x: 0, z: 0, y: FIRST + SECOND + ADAPTER }, sourcedDiameter: blank("No source read here gives its size."), pieces: capsule },
    ],
  },
];
