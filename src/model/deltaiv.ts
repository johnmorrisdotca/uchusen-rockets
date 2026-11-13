// Delta IV Heavy from a table of numbers. The whole, the three cores and the second stage are sourced. The fairing is what the whole leaves. Where the cores stand, the engine sizes and the paint are judged from photographs.
import { merlin } from "./falcon.ts";
import { fairingShell, floor, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = 5.1 / 2;
const CORE = 40.8;
const SECOND = 13.7;
const WHOLE = 70.7;
const FAIRING = WHOLE - CORE - SECOND;

function core(engine: boolean): Piece[] {
  return [
    tube("foam", R, 1.8, CORE, { rings: [1.82, 14, 28, CORE - 0.02], welds: [10, 22, 34] }),
    floor(R, 1.8),
    ...(engine ? merlin([0, 0], 0, 0.9, 2.6) : merlin([0, 0], 0, 0.9, 2.6).map((piece) => ({ ...piece, only: "mesh" as const }))),
  ];
}

function second(): Piece[] {
  return [
    tube("white", R, 0, SECOND, { rings: [0.02, SECOND - 0.02], welds: [5, 10] }),
    floor(R, 0),
    ...merlin([0, 0], -0.05, 0.7, 2.2).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

export const DELTA_IV_HEAVY_BUILDS: readonly StackBuild[] = [
  {
    rocket: "delta-iv-heavy",
    variant: "heavy",
    drawnFrom: "This package's code, from the sourced whole, three cores and second stage. The fairing is what the whole leaves. The side cores stand against the centre so the three span the sourced 15.3 m. Engine sizes and the orange paint are judged from photographs. No licensed model is used, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "Centre core, Delta IV Heavy", height: CORE, diameter: R * 2, top: [CORE, R * 2], pieces: () => core(true) },
      { slot: "side-left", kind: "liquid-booster", name: "Side core, left, Delta IV Heavy", height: CORE, diameter: R * 2, place: { x: -R * 2, z: 0 }, pieces: () => core(false) },
      { slot: "side-right", kind: "liquid-booster", name: "Side core, right, Delta IV Heavy", height: CORE, diameter: R * 2, place: { x: R * 2, z: 0 }, pieces: () => core(false) },
      { slot: "second-stage", kind: "second-stage", name: "DCSS, Delta IV Heavy", height: SECOND, diameter: R * 2, bottom: [0, R * 2], top: [SECOND, R * 2], pieces: second },
      { slot: "fairing", kind: "fairing", name: "Fairing, Delta IV Heavy", height: FAIRING, diameter: R * 2, bottom: [0, R * 2], pieces: () => fairingShell("white", R, FAIRING, FAIRING * 0.45, 1.3) },
    ],
  },
];
