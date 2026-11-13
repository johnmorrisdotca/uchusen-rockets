// Vulcan Centaur VC2S from a table of numbers: the whole, the first stage, the Centaur V, the boosters and the fairing are sourced. The adapter between the Centaur and the fairing is what the whole leaves, and the engines, the boosters' place and the paint are judged from photographs.
import { VULCAN_SRB_DIAMETER } from "../data/vulcan.ts";
import { blank } from "../data/types.ts";
import { merlin } from "./falcon.ts";
import { fairingShell, floor, nose, skirt, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = 5.4 / 2;
const FIRST = 33.3;
const CENTAUR = 10.66;
const FAIRING = 15.5;
const WHOLE = 61.6;
const ADAPTER = WHOLE - FIRST - CENTAUR - FAIRING;
const SRB = 21.98;
const SRB_R = 1.62 / 2;
const SRB_X = R + SRB_R + 0.1;

function firstStage(): Piece[] {
  const foot = 1.4;
  const skirtFrom = FIRST - 3;
  return [
    tube("white", R, foot, skirtFrom, { rings: [foot + 0.02, 12, 22, skirtFrom - 0.02], welds: [8, 17, 27] }),
    floor(R, foot),
    ...skirt("black", R, skirtFrom, FIRST, { rings: [FIRST - 0.02] }),
    ...merlin([0.9, 0], 0, 0.55, 2),
    ...merlin([-0.9, 0], 0, 0.55, 2),
  ];
}

function booster(): Piece[] {
  const shoulder = SRB - 4.6;
  return [
    tube("white", SRB_R, 0.5, shoulder, { segs: 24, rings: [0.52, 6, 12, shoulder - 0.02], welds: [4, 9, 15] }),
    { kind: "lathe", material: "soot", segs: 24, under: true, only: "mesh", profile: [[0, 0.5], [SRB_R, 0.5]] },
    taper("white", SRB_R, shoulder, SRB_R * 0.28, SRB - 1, { segs: 24 }),
    nose("white", SRB_R * 0.28, SRB - 1, SRB, 1.1, { segs: 24 }),
    ...merlin([0, 0], 0, SRB_R * 0.6, 1.1).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

function centaur(): Piece[] {
  return [
    tube("steel", R, 0, CENTAUR, { rings: [0.02, CENTAUR - 0.02], welds: [CENTAUR * 0.35, CENTAUR * 0.7] }),
    floor(R, 0),
    ...merlin([0.55, 0], -0.05, 0.4, 1.4).map((piece) => ({ ...piece, only: "mesh" as const })),
    ...merlin([-0.55, 0], -0.05, 0.4, 1.4).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

const adapter = (): Piece[] => [tube("white", R, 0, ADAPTER, { rings: [0.02, ADAPTER - 0.02] }), floor(R, 0)];

const NONE = blank("No source read here gives it.");

export const VULCAN_BUILDS: readonly StackBuild[] = [
  {
    rocket: "vulcan-centaur",
    variant: "vc2s",
    drawnFrom: "This package's code, from the sourced whole, stages, boosters and fairing; the adapter is what the whole leaves, and the engines, the boosters' place and the paint are judged from photographs. No licensed model is used, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "First stage, Vulcan", height: FIRST, diameter: R * 2, top: [FIRST, R * 2], pieces: firstStage },
      { slot: "srb-left", kind: "solid-booster", name: "GEM 63XL booster, left", height: SRB, diameter: SRB_R * 2, place: { x: -SRB_X, z: 0 }, sourcedDiameter: VULCAN_SRB_DIAMETER, pieces: booster },
      { slot: "srb-right", kind: "solid-booster", name: "GEM 63XL booster, right", height: SRB, diameter: SRB_R * 2, place: { x: SRB_X, z: 0 }, sourcedDiameter: VULCAN_SRB_DIAMETER, pieces: booster },
      { slot: "second-stage", kind: "second-stage", name: "Centaur V", height: CENTAUR, diameter: R * 2, bottom: [0, R * 2], top: [CENTAUR, R * 2], pieces: centaur },
      { slot: "adapter", kind: "adapter", name: "Adapter, Vulcan", height: ADAPTER, diameter: R * 2, bottom: [0, R * 2], top: [ADAPTER, R * 2], sourcedDiameter: NONE, pieces: adapter },
      { slot: "fairing", kind: "fairing", name: "Fairing, Vulcan", height: FAIRING, diameter: R * 2, bottom: [0, R * 2], pieces: () => fairingShell("white", R, FAIRING, FAIRING * 0.5, 1.3) },
    ],
  },
];
