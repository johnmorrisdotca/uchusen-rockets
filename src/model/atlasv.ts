// Atlas V 401 from a table of numbers. The common core, the Centaur III and the original 9 m fairing are sourced. No interstage length is given, so the changes of diameter are drawn inside those lengths. Engine sizes and paint are judged from photographs.
import { ATLAS_V_CENTAUR_DIAMETER, ATLAS_V_FAIRING_DIAMETER } from "../data/atlasv.ts";
import { merlin } from "./falcon.ts";
import { fairingShell, floor, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const CORE = 32.46;
const CENTAUR = 12.68;
const FAIRING = 9;
const R = 3.81 / 2;
const CR = 3.05 / 2;
const FR = 4.2 / 2;

function firstStage(): Piece[] {
  return [
    tube("white", R, 1.6, CORE, { rings: [1.62, 12, 22, CORE - 0.02], welds: [8, 18, 28] }),
    floor(R, 1.6),
    ...merlin([0, 0], 0, 0.85, 2.4),
  ];
}

function centaur(): Piece[] {
  return [
    tube("steel", R, 0, 1.6, { rings: [0.02] }),
    tube("steel", CR, 1.6, CENTAUR, { rings: [CENTAUR - 0.02], welds: [6] }),
    floor(R, 0),
    ...merlin([0, 0], -0.05, 0.45, 1.5).map((piece) => ({ ...piece, only: "mesh" as const })),
  ];
}

function fairing(): Piece[] {
  return fairingShell("white", FR, FAIRING, 1.4, 1.35, CR);
}

export const ATLAS_V_BUILDS: readonly StackBuild[] = [
  {
    rocket: "atlas-v",
    variant: "401",
    drawnFrom: "This package's code, from the sourced common core, Centaur III and original 9 m fairing. The family's 'up to 58.3 m' is not this form's height. No interstage length is given, so the narrowing is drawn inside the Centaur's 12.68 m and the fairing's flare inside its 9 m. The RD-180 is one engine in the source and is drawn as one bell. Engine sizes and paint are judged from photographs. No licensed model is used, and no name or mark is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "Common core booster, Atlas V", height: CORE, diameter: R * 2, top: [CORE, R * 2], pieces: firstStage },
      { slot: "second-stage", kind: "second-stage", name: "Centaur III", height: CENTAUR, diameter: CR * 2, bottom: [0, R * 2], top: [CENTAUR, CR * 2], sourcedDiameter: ATLAS_V_CENTAUR_DIAMETER, pieces: centaur },
      { slot: "fairing", kind: "fairing", name: "Fairing, Atlas V, 4.2 m, original", height: FAIRING, diameter: FR * 2, bottom: [0, CR * 2], sourcedDiameter: ATLAS_V_FAIRING_DIAMETER, pieces: fairing },
    ],
  },
];
