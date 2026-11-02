// The Space Launch System from a table of numbers: the whole, the core, the boosters, the service module and the capsule are sourced. The rest is what the whole leaves, and where the boosters stand is judged from photographs.
import { ORION_DIAMETER, SLS_SRB_DIAMETER } from "../data/sls.ts";
import { blank } from "../data/types.ts";
import { merlin } from "./falcon.ts";
import { floor, nose, stripes, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const WHOLE = 98.15;
const CORE = 64.6;
const CORE_R = 8.41 / 2;
const SRB = 53.95;
const SRB_R = 3.71 / 2;
const SRB_X = CORE_R + SRB_R + 0.8;
const SERVICE = 3.96;
const CREW = 3.3;
const ORION_R = 5.03 / 2;
const UPPER_R = 2.55;
const TOP = WHOLE - CORE - SERVICE - CREW;
// the upper stage and its adapters take 15 m of what is left, judged from photographs, and the tower the rest
const UPPER = 15.4;
const TOWER = TOP - UPPER;
const COVER = CREW * 0.9;
const RS25_LONG = 168 * 0.0254;
const RS25_EXIT = (90.7 * 0.0254) / 2;

function core(): Piece[] {
  const foot = 3.2;
  return [
    tube("foam", CORE_R, foot, CORE, { rings: [foot + 0.02, 7.5, 44, 50.5, CORE - 0.02], welds: [20, 34, 57] }),
    floor(CORE_R, foot),
    ...stripes("black", CORE_R, foot, foot + 3, [0, 90, 180, 270], 30),
    ...[45, 135, 225, 315].flatMap((az) => merlin([1.9 * Math.sin((az * Math.PI) / 180), 1.9 * Math.cos((az * Math.PI) / 180)], 0, RS25_EXIT, RS25_LONG)),
  ];
}

function booster(): Piece[] {
  const r = SRB_R;
  const shoulder = SRB - 7.6;
  return [
    taper("white", r * 1.4, 1, r, 3.8, { rings: [1.02] }),
    { kind: "lathe", material: "soot", segs: 30, under: true, profile: [[0, 1], [r * 1.4, 1]] },
    tube("white", r, 3.8, shoulder, { rings: [3.82, 13, 22, 31, 40, shoulder - 0.02], welds: [8, 17, 26, 35] }),
    taper("white", r, shoulder, r * 0.5, SRB - 1.4, { rings: [SRB - 4.6] }),
    nose("white", r * 0.5, SRB - 1.4, SRB, 1.2),
    ...merlin([0, 0], 0, r * 1.02, 3.6),
  ];
}

function upperStage(): Piece[] {
  return [
    taper("white", CORE_R, 0, UPPER_R, 8.2, { rings: [0.02, 8.18], welds: [4] }),
    floor(CORE_R, 0),
    tube("white", UPPER_R, 8.2, 12.4, { rings: [12.38] }),
    taper("white", UPPER_R, 12.4, ORION_R, UPPER, { rings: [UPPER - 0.02] }),
  ];
}

const service = (): Piece[] => [tube("steel", ORION_R, 0, SERVICE, { rings: [0.02, SERVICE - 0.02] }), floor(ORION_R, 0)];

const crew = (): Piece[] => [
  { kind: "lathe", material: "steel", segs: 40, body: true, outline: true, profile: [[ORION_R, 0.25], [ORION_R * 0.98, 0.45], [ORION_R * 0.42, CREW * 0.92], [0.5, CREW], [0.001, CREW]] },
  { kind: "lathe", material: "soot", segs: 30, under: true, profile: [[0, 0], [ORION_R * 0.86, 0.08], [ORION_R, 0.25]] },
];

function tower(): Piece[] {
  const top = COVER + TOWER;
  return [
    { kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile: [[ORION_R * 1.02, 0.25], [ORION_R * 0.46, COVER], [0.55, COVER + 0.25]], rings: [0.27] },
    tube("white", 0.55, COVER + 0.25, top - 2.6, { welds: [COVER + 1.4] }),
    taper("white", 0.55, top - 2.6, 0.2, top - 0.7),
    nose("white", 0.2, top - 0.7, top, 1.2),
  ];
}

const FROM = "This package's code, from the sourced sizes; the upper stage's and the abort tower's lengths are what the whole leaves, judged from photographs. No licensed model is used, and no name, flag or mark is drawn.";
const NONE = blank("No source read here gives it.");

export const SLS_BUILDS: readonly StackBuild[] = [
  {
    rocket: "sls",
    variant: "block-1",
    drawnFrom: FROM,
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "Core stage, Space Launch System", height: CORE, diameter: CORE_R * 2, top: [CORE, CORE_R * 2], pieces: core },
      { slot: "srb-left", kind: "solid-booster", name: "Five-segment booster, left", height: SRB, diameter: SRB_R * 2, place: { x: -SRB_X, z: 0 }, sourcedDiameter: SLS_SRB_DIAMETER, pieces: booster },
      { slot: "srb-right", kind: "solid-booster", name: "Five-segment booster, right", height: SRB, diameter: SRB_R * 2, place: { x: SRB_X, z: 0 }, sourcedDiameter: SLS_SRB_DIAMETER, pieces: booster },
      { slot: "upper-stage", kind: "second-stage", name: "Upper stage and its adapters, Space Launch System", height: UPPER, diameter: CORE_R * 2, bottom: [0, CORE_R * 2], top: [UPPER, ORION_R * 2], sourcedDiameter: NONE, pieces: upperStage },
      { slot: "service-module", kind: "service-module", name: "Orion's service module", height: SERVICE, diameter: ORION_R * 2, bottom: [0, ORION_R * 2], top: [SERVICE, ORION_R * 2], sourcedDiameter: ORION_DIAMETER, pieces: service },
      { slot: "capsule", kind: "capsule", name: "Orion's crew module", height: CREW, diameter: ORION_R * 2, bottom: [0, ORION_R * 2], top: [CREW, 1.1], sourcedDiameter: ORION_DIAMETER, pieces: crew },
      { slot: "escape-tower", kind: "tower", name: "Orion's abort tower and its cover", height: COVER + TOWER, diameter: ORION_R * 2.04, bottom: [COVER, 1.1], sourcedDiameter: NONE, pieces: tower },
    ],
  },
];
