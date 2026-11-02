// New Glenn from a table of numbers: the whole, the two stages and the width are sourced. The fairing is what the whole leaves; the legs, the strakes and the paint are judged from photographs.
import { deg } from "../framing.ts";
import { engineRing, fairingShell, fins, floor, foldedLegs, skirt, tube } from "./kit.ts";
import { merlin } from "./falcon.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = 3.5;
const FIRST = 57.5;
const SECOND = 23.4;
const FAIRING = 98 - FIRST - SECOND;

function firstStage(): Piece[] {
  const foot = 3;
  const skirtFrom = FIRST - 8;
  return [
    tube("white", R, foot, skirtFrom, { rings: [foot + 0.02, 17, skirtFrom - 0.02], welds: [10, 24, 31, 38] }),
    floor(R, foot),
    ...skirt("black", R, skirtFrom, FIRST, { rings: [FIRST - 0.02] }),
    ...merlin([0, 0], 0, 0.95, 3.6),
    ...engineRing(6, 2.3, 0, 0.95, 3.6, 30),
    ...foldedLegs("black", R, [30, 90, 150, 210, 270, 330], foot + 0.4, foot + 11, 0.7),
    ...fins("black", R, [90, 270], [[0, foot + 1], [1.3, foot + 1], [1.3, foot + 3.2], [0, foot + 7]], 0.25),
    ...[45, 135, 225, 315].map((az): Piece => ({ kind: "plate", material: "fin-dark", frame: { o: [R * Math.sin(deg(az)), skirtFrom + 2, R * Math.cos(deg(az))], u: [Math.sin(deg(az)), 0, Math.cos(deg(az))], v: [0, 1, 0], w: [Math.cos(deg(az)), 0, -Math.sin(deg(az))] }, outline: [[0, 0], [1, 0], [1, 2.6], [0, 2.6]], thickness: 1.9, plain: false })),
  ];
}

function secondStage(): Piece[] {
  return [
    tube("white", R, 0, SECOND, { rings: [0.02, SECOND - 0.02], welds: [SECOND * 0.4, SECOND * 0.7] }),
    floor(R, 0),
    { kind: "lathe", material: "soot", segs: 30, under: true, only: "mesh", profile: [[0, 0.1], [R * 0.95, 0.1]] },
    ...merlin([1.5, 0], -0.05, 0.9, 2.6).map((piece) => ({ ...piece, only: "mesh" as const })),
    ...merlin([-1.5, 0], -0.05, 0.9, 2.6).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

export const NEW_GLENN_BUILDS: readonly StackBuild[] = [
  {
    rocket: "new-glenn",
    variant: "7x2",
    drawnFrom: "This package's code, from the sourced whole, stages and width; the fairing is what the whole leaves, and the legs, strakes and paint are judged from photographs. No licensed model is used, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "First stage, New Glenn", height: FIRST, diameter: R * 2, top: [FIRST, R * 2], pieces: firstStage },
      { slot: "second-stage", kind: "second-stage", name: "Second stage, New Glenn", height: SECOND, diameter: R * 2, bottom: [0, R * 2], top: [SECOND, R * 2], pieces: secondStage },
      { slot: "fairing", kind: "fairing", name: "Fairing, New Glenn", height: FAIRING, diameter: R * 2, bottom: [0, R * 2], pieces: () => fairingShell("white", R, FAIRING, FAIRING * 0.44, 1.35) },
    ],
  },
];
