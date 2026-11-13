// Ariane 62 and 64 from a table of numbers. The whole, the short fairing and the P120C are sourced. The two liquid stages have no lengths, so they are one part, what the whole leaves. The boosters' place, the engine's size and the paint are judged from photographs.
import { ARIANE_6_BOOSTER_DIAMETER } from "../data/ariane6.ts";
import { merlin } from "./falcon.ts";
import { fairingShell, floor, nose, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = 5.4 / 2;
const WHOLE = 63;
const FAIRING = 14;
const CORE = WHOLE - FAIRING;
const SRB = 13.5;
const SRB_R = 3.4 / 2;
const SRB_X = R + SRB_R + 0.15;

function core(): Piece[] {
  const skirtFrom = CORE - 4;
  return [
    tube("white", R, 1.2, skirtFrom, { rings: [1.22, 16, 32, skirtFrom - 0.02], welds: [10, 24, 38] }),
    floor(R, 1.2),
    taper("white", R * 0.72, 0, R, 1.2),
    ...merlin([0, 0], 0, 0.7, 2.2),
  ];
}

function booster(): Piece[] {
  const shoulder = SRB - 2.2;
  return [
    tube("white", SRB_R, 0.4, shoulder, { segs: 24, rings: [0.42, 6, shoulder - 0.02] }),
    { kind: "lathe", material: "soot", segs: 24, under: true, only: "mesh", profile: [[0, 0.4], [SRB_R, 0.4]] },
    taper("white", SRB_R, shoulder, SRB_R * 0.4, SRB - 0.6, { segs: 24 }),
    nose("white", SRB_R * 0.4, SRB - 0.6, SRB, 1.2, { segs: 24 }),
    ...merlin([0, 0], 0, SRB_R * 0.45, 0.8).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

const fairing = (): Piece[] => fairingShell("white", R, FAIRING, FAIRING * 0.55, 1.3);

const drawnFrom = "This package's code, from the sourced whole, short fairing and P120C boosters. The lower and upper stages have no lengths in the source, so they are one part, what the whole leaves, and the Vinci is not drawn apart. The boosters' place, the engine's size and the paint are judged from photographs. No licensed model is used, and no name or mark is drawn.";

const corePart = { slot: "first-stage", kind: "first-stage" as const, name: "Lower and upper stages, not given apart, Ariane 6", height: CORE, diameter: R * 2, top: [CORE, R * 2] as [number, number], pieces: core };
const fairingPart = { slot: "fairing", kind: "fairing" as const, name: "Fairing, Ariane 6, short", height: FAIRING, diameter: R * 2, bottom: [0, R * 2] as [number, number], pieces: fairing };

function boosterPart(slot: string, name: string, x: number, z: number) {
  return { slot, kind: "solid-booster" as const, name, height: SRB, diameter: SRB_R * 2, place: { x, z }, sourcedDiameter: ARIANE_6_BOOSTER_DIAMETER, pieces: booster };
}

export const ARIANE_6_BUILDS: readonly StackBuild[] = [
  {
    rocket: "ariane-6",
    variant: "a62",
    drawnFrom,
    parts: [
      corePart,
      boosterPart("srb-left", "P120C booster, left", -SRB_X, 0),
      boosterPart("srb-right", "P120C booster, right", SRB_X, 0),
      fairingPart,
    ],
  },
  {
    rocket: "ariane-6",
    variant: "a64",
    drawnFrom,
    parts: [
      corePart,
      boosterPart("srb-left", "P120C booster, left", -SRB_X, 0),
      boosterPart("srb-right", "P120C booster, right", SRB_X, 0),
      boosterPart("srb-near", "P120C booster, near", 0, SRB_X),
      boosterPart("srb-far", "P120C booster, far", 0, -SRB_X),
      fairingPart,
    ],
  },
];
