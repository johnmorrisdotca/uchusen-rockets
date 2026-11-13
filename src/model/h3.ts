// H3-22S and H3-24L from a table of numbers. The wholes, the stages and the SRB-3 are sourced. The fairing is what each whole leaves. Where the boosters stand, the engine sizes and the paint are judged from photographs.
import { H3_BOOSTER_DIAMETER } from "../data/h3.ts";
import { merlin } from "./falcon.ts";
import { fairingShell, floor, nose, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = 5.27 / 2;
const FIRST = 37;
const SECOND = 12;
const SRB = 15;
const SRB_R = 2.5 / 2;
const OFF = R + SRB_R + 0.12;
const P = OFF / Math.SQRT2;

function firstStage(): Piece[] {
  return [
    tube("white", R, 1.6, FIRST, { rings: [1.62, 12, 24, FIRST - 0.02], welds: [8, 18, 28] }),
    floor(R, 1.6),
    ...merlin([0.85, 0], 0, 0.55, 2),
    ...merlin([-0.85, 0], 0, 0.55, 2),
  ];
}

function second(): Piece[] {
  return [
    tube("white", R, 0, SECOND, { rings: [0.02, SECOND - 0.02] }),
    floor(R, 0),
    ...merlin([0, 0], -0.05, 0.45, 1.4).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

function booster(): Piece[] {
  const shoulder = SRB - 2;
  return [
    tube("white", SRB_R, 0.4, shoulder, { segs: 24, rings: [0.42, 6, shoulder - 0.02] }),
    taper("white", SRB_R, shoulder, SRB_R * 0.45, SRB - 0.5, { segs: 24 }),
    nose("white", SRB_R * 0.45, SRB - 0.5, SRB, 1.2, { segs: 24 }),
    ...merlin([0, 0], 0, SRB_R * 0.5, 0.9).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

function fairing(height: number): Piece[] {
  return fairingShell("white", R, height, height * 0.45, 1.3);
}

const drawnFrom = "This package's code, from the sourced whole, stages and SRB-3 boosters. The fairing is what the whole leaves. The boosters' place, the engine sizes and the paint are judged from photographs. No licensed model is used, and no name or mark is drawn.";

function boosterPart(slot: string, name: string, x: number, z: number) {
  return { slot, kind: "solid-booster" as const, name, height: SRB, diameter: SRB_R * 2, place: { x, z }, sourcedDiameter: H3_BOOSTER_DIAMETER, pieces: booster };
}

const core = [
  { slot: "first-stage", kind: "first-stage" as const, name: "First stage, H3", height: FIRST, diameter: R * 2, top: [FIRST, R * 2] as [number, number], pieces: firstStage },
  { slot: "second-stage", kind: "second-stage" as const, name: "Second stage, H3", height: SECOND, diameter: R * 2, bottom: [0, R * 2] as [number, number], top: [SECOND, R * 2] as [number, number], pieces: second },
];

export const H3_BUILDS: readonly StackBuild[] = [
  {
    rocket: "h3",
    variant: "22s",
    drawnFrom,
    parts: [
      ...core,
      boosterPart("srb-left", "SRB-3, left", -OFF, 0),
      boosterPart("srb-right", "SRB-3, right", OFF, 0),
      { slot: "fairing", kind: "fairing", name: "Fairing, H3, short", height: 8, diameter: R * 2, bottom: [0, R * 2], pieces: () => fairing(8) },
    ],
  },
  {
    rocket: "h3",
    variant: "24l",
    drawnFrom,
    parts: [
      ...core,
      boosterPart("srb-left", "SRB-3, left", -P, P),
      boosterPart("srb-right", "SRB-3, right", P, P),
      boosterPart("srb-near", "SRB-3, near", P, -P),
      boosterPart("srb-far", "SRB-3, far", -P, -P),
      { slot: "fairing", kind: "fairing", name: "Fairing, H3, long", height: 14, diameter: R * 2, bottom: [0, R * 2], pieces: () => fairing(14) },
    ],
  },
];
