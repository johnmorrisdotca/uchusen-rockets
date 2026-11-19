// Ariane 5 ECA and ES from a table of numbers. The core, the boosters and the two upper stages have the lengths of the article's stage infoboxes. The fairing is what the least of the whole's range leaves. The boosters' place, the engines' size and the paint are not sourced.
import { ARIANE_5_BOOSTER_DIAMETER } from "../data/ariane5.ts";
import { FUTURE_STAGE_LENGTHS } from "../data/future-lengths.ts";
import { blank } from "../data/types.ts";
import { merlin } from "./falcon.ts";
import { fairingShell, floor, nose, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const A5 = FUTURE_STAGE_LENGTHS["ariane-5"];
const R = (A5.diameters.epc.value ?? 0) / 2;
const WHOLE = A5.height.value ?? 0;
const CORE = A5.parts.epc.value ?? 0;
const EPS = A5.parts.eps.value ?? 0;
const ESC = A5.parts.esc.value ?? 0;
const SRB = A5.parts.eap.value ?? 0;
const SRB_R = (ARIANE_5_BOOSTER_DIAMETER.value ?? 0) / 2;
const SRB_X = R + SRB_R + 0.15;

function core(): Piece[] {
  return [
    tube("white", R, 1.2, CORE, { rings: [1.22, 10, 18, CORE - 0.02], welds: [6, 14] }),
    floor(R, 1.2),
    taper("white", R * 0.72, 0, R, 1.2),
    ...merlin([0, 0], 0, 0.7, 2.2),
  ];
}

function booster(): Piece[] {
  const shoulder = SRB - 2.4;
  const cone = [taper("white", SRB_R, shoulder, SRB_R * 0.4, SRB - 0.6, { segs: 24 }), nose("white", SRB_R * 0.4, SRB - 0.6, SRB, 1.2, { segs: 24 })];
  const nozzle = merlin([0, 0], 0, SRB_R * 0.45, 0.8).map((piece) => ({ ...piece, only: "mesh" as const }));
  return [...cone, ...nozzle, tube("white", SRB_R, 0.4, shoulder, { segs: 24, rings: [0.42, 8, 16, shoulder - 0.02] }), { kind: "lathe", material: "soot", segs: 24, under: true, only: "mesh", profile: [[0, 0.4], [SRB_R, 0.4]] }];
}

const upper = (height: number, exit: number, length: number) => (): Piece[] => [
  tube("steel", R, 0, height, { rings: [0.02, height - 0.02] }),
  floor(R, 0),
  ...merlin([0, 0], -0.05, exit, length).map((piece) => ({ ...piece, only: "mesh" as const })),
];

const NONE = blank("No source read here gives the fairing's own width: it is drawn as wide as the vehicle.");

const parts = (second: { slot: string; kind: "second-stage"; name: string; height: number; pieces: () => Piece[] }) => {
  const fairing = WHOLE - CORE - second.height;
  return [
    { slot: "first-stage", kind: "first-stage" as const, name: "Core stage (EPC), Ariane 5", height: CORE, diameter: R * 2, top: [CORE, R * 2] as [number, number], pieces: core },
    { slot: "srb-left", kind: "solid-booster" as const, name: "Solid booster (EAP), left, Ariane 5", height: SRB, diameter: SRB_R * 2, place: { x: -SRB_X, z: 0 }, sourcedDiameter: ARIANE_5_BOOSTER_DIAMETER, pieces: booster },
    { slot: "srb-right", kind: "solid-booster" as const, name: "Solid booster (EAP), right, Ariane 5", height: SRB, diameter: SRB_R * 2, place: { x: SRB_X, z: 0 }, sourcedDiameter: ARIANE_5_BOOSTER_DIAMETER, pieces: booster },
    { ...second, diameter: R * 2, bottom: [0, R * 2] as [number, number], top: [second.height, R * 2] as [number, number] },
    { slot: "fairing", kind: "fairing" as const, name: "Fairing, Ariane 5", height: fairing, diameter: R * 2, bottom: [0, R * 2] as [number, number], sourcedDiameter: NONE, pieces: () => fairingShell("white", R, fairing, fairing * 0.5, 1.3) },
  ];
};

const drawnFrom = "This package's code, from the sourced boosters, core and upper stage. The fairing has no length in the source, so it is what the least of the whole's range, 46 m, leaves, and it is drawn as wide as the vehicle. The boosters' place, the engines' size and the paint are not sourced. No licensed model is used, and no name or mark is drawn.";

export const ARIANE_5_BUILDS: readonly StackBuild[] = [
  { rocket: "ariane-5", variant: "eca", drawnFrom, parts: parts({ slot: "second-stage", kind: "second-stage", name: "Upper stage (ESC), Ariane 5", height: ESC, pieces: upper(ESC, 0.5, 1.4) }) },
  { rocket: "ariane-5", variant: "es", drawnFrom, parts: parts({ slot: "second-stage", kind: "second-stage", name: "Upper stage (EPS), Ariane 5", height: EPS, pieces: upper(EPS, 0.4, 1.1) }) },
];
