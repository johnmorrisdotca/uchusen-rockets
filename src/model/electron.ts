// Electron from a table of numbers: the whole, the stages, the fairing and the width are sourced. The sea-level Rutherford is 0.25 m across, from its infobox; its length and the ring they stand in are judged from photographs.
import { engineRing, fairingShell, floor, raceway, skirt, tube } from "./kit.ts";
import { merlin } from "./falcon.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = 0.6;
const FIRST = 12.1;
const GAP = 18 - 12.1 - 2.4 - 2.5;
const SECOND = 2.4;
const FAIRING = 2.5;

const first = (): Piece[] => [
  tube("black", R, 0.5, FIRST, { rings: [0.52, FIRST - 0.02], welds: [4, 8] }),
  floor(R, 0.5),
  ...merlin([0, 0], 0, 0.125, 0.6),
  ...engineRing(8, 0.42, 0, 0.125, 0.6),
  raceway("black", R, 0.8, FIRST - 0.2, 180, 0.1, 0.05),
];
const gap = (): Piece[] => [tube("black", R, 0, GAP, { rings: [0.02, GAP - 0.02] }), floor(R, 0)];
const second = (): Piece[] => [
  ...skirt("black", R, 0, 0.7),
  tube("black", R, 0.7, SECOND, { rings: [0.72, SECOND - 0.02] }),
  floor(R, 0.7),
  ...merlin([0, 0], 0.02, 0.28, 0.7),
];

export const ELECTRON_BUILDS: readonly StackBuild[] = [
  {
    rocket: "electron",
    variant: "electron",
    drawnFrom: "This package's code, from the sourced whole, stages, fairing and width; the metre the sources leave over is drawn as an interstage, and the paint is judged from photographs. No licensed model is used, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "First stage, Electron", height: FIRST, diameter: R * 2, top: [FIRST, R * 2], pieces: first },
      { slot: "adapter", kind: "adapter", name: "Interstage, Electron", height: GAP, diameter: R * 2, bottom: [0, R * 2], top: [GAP, R * 2], pieces: gap },
      { slot: "second-stage", kind: "second-stage", name: "Second stage, Electron", height: SECOND, diameter: R * 2, bottom: [0, R * 2], top: [SECOND, R * 2], pieces: second },
      { slot: "fairing", kind: "fairing", name: "Fairing, Electron", height: FAIRING, diameter: R * 2, bottom: [0, R * 2], pieces: () => fairingShell("black", R, FAIRING, 0.9, 1.3) },
    ],
  },
];
