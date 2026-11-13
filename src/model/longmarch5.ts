// Long March 5 from a table of numbers. The standard whole, the core, the four boosters and the second stage are sourced. The fairing is what the whole leaves. Where the boosters stand, the engine sizes and the paint are judged from photographs.
import { LONG_MARCH_5_BOOSTER_DIAMETER } from "../data/longmarch5.ts";
import { engineRing, fairingShell, floor, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = 5 / 2;
const FIRST = 33.16;
const SECOND = 11.54;
const WHOLE = 56.97;
const FAIRING = WHOLE - FIRST - SECOND;
const SRB = 27.6;
const SRB_R = 3.35 / 2;
const OFF = R + SRB_R + 0.12;
const P = OFF / Math.SQRT2;

function firstStage(): Piece[] {
  return [
    tube("white", R, 2, FIRST, { rings: [2.02, 12, 22, FIRST - 0.02], welds: [8, 18, 28] }),
    floor(R, 2),
    ...engineRing(2, 0.8, 0, 0.55, 2.2),
  ];
}

function second(): Piece[] {
  return [
    tube("white", R, 0, SECOND, { rings: [0.02, SECOND - 0.02] }),
    floor(R, 0),
    ...engineRing(2, 0.7, -0.05, 0.4, 1.5).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

function booster(): Piece[] {
  return [
    tube("white", SRB_R, 1.2, SRB, { segs: 24, rings: [1.22, 10, 20, SRB - 0.02] }),
    { kind: "lathe", material: "soot", segs: 24, under: true, only: "mesh", profile: [[0, 1.2], [SRB_R, 1.2]] },
    ...engineRing(2, SRB_R * 0.4, 0, SRB_R * 0.35, 1.4).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

function boosterPart(slot: string, name: string, x: number, z: number) {
  return { slot, kind: "liquid-booster" as const, name, height: SRB, diameter: SRB_R * 2, place: { x, z }, sourcedDiameter: LONG_MARCH_5_BOOSTER_DIAMETER, pieces: booster };
}

export const LONG_MARCH_5_BUILDS: readonly StackBuild[] = [
  {
    rocket: "long-march-5",
    variant: "cz-5",
    drawnFrom: "This package's code, from the sourced standard whole, core, four boosters and second stage. The fairing is what the whole leaves. The boosters' place, the engine sizes and the paint are judged from photographs. No licensed model is used, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "First stage, Long March 5", height: FIRST, diameter: R * 2, top: [FIRST, R * 2], pieces: firstStage },
      boosterPart("srb-left", "Booster, left, Long March 5", -P, P),
      boosterPart("srb-right", "Booster, right, Long March 5", P, P),
      boosterPart("srb-near", "Booster, near, Long March 5", P, -P),
      boosterPart("srb-far", "Booster, far, Long March 5", -P, -P),
      { slot: "second-stage", kind: "second-stage", name: "Second stage, Long March 5", height: SECOND, diameter: R * 2, bottom: [0, R * 2], top: [SECOND, R * 2], pieces: second },
      { slot: "fairing", kind: "fairing", name: "Fairing, Long March 5", height: FAIRING, diameter: R * 2, bottom: [0, R * 2], pieces: () => fairingShell("white", R, FAIRING, FAIRING * 0.4, 1.3) },
    ],
  },
];
