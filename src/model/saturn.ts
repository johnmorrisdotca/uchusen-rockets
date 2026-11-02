// Saturn V from a table of numbers: the stages' lengths and widths are sourced, and so are the F-1's and J-2's lengths and widths. Where the paint runs and how the foot is arranged are judged from photographs.
import { blank } from "../data/types.ts";
import { deg } from "../framing.ts";
import { fins, floor, nose, pod, skirt, stripes, taper, tube } from "./kit.ts";
import { merlin } from "./falcon.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const FT = 0.3048;
const R1 = 10.06 / 2;
const R3 = 6.6 / 2;
const RC = 3.91 / 2;
const NEST = 7.49 - 4.52;
const H1 = 42.06;
const H2 = 24.87;
const H3 = 17.86;
const HA = 9.45;
const HS = 4.52;
const HC = 3.48;
const WHOLE = 110.64;
const TOWER = WHOLE - (H1 + H2 + H3 + HA + HS + HC);
const COVER = HC * 0.92;

const F1_EXIT = (12.2 * FT) / 2;
const F1_LONG = 18.5 * FT;
const J2_EXIT = (6.8 * FT) / 2;
const J2_LONG = 11.1 * FT;

function firstStage(): Piece[] {
  const foot = 5;
  const outer = R1 * 0.63;
  const out: Piece[] = [
    tube("white", R1, foot, H1, { rings: [foot + 0.02, 18.5, 24, H1 - 3.4], welds: [11, 32] }),
    floor(R1, foot),
    // two wide stripes up the fuel tank, and the checks of the tank between
    ...stripes("black", R1, foot, 18.5, [0, 180], 44),
    ...stripes("black", R1, 18.5, 24, [90, 270], 44),
    ...stripes("black", R1, H1 - 3.4, H1, [0, 90, 180, 270], 44),
    ...merlin([0, 0], 0, F1_EXIT, F1_LONG),
  ];
  for (const az of [45, 135, 225, 315]) {
    const at: [number, number] = [outer * Math.sin(deg(az)), outer * Math.cos(deg(az))];
    out.push(...merlin(at, 0, F1_EXIT, F1_LONG));
    // the fairing over each outer engine, and its fin
    out.push(pod("white", [at[0] * 0.92, at[1] * 0.92], F1_EXIT * 1.08, foot * 0.72, F1_EXIT * 0.3, foot + 4, { outline: true }));
  }
  out.push(...fins("white", R1, [45, 135, 225, 315], [[0, foot - 1], [4.2, foot - 2.6], [4.2, foot - 1.2], [0, foot + 5]], 0.3));
  return out;
}

function secondStage(): Piece[] {
  const skirtTop = 5.5;
  return [
    ...skirt("white", R1, 0, skirtTop, { rings: [skirtTop - 0.02] }),
    tube("white", R1, skirtTop, H2, { rings: [H2 - 0.02], welds: [11, 15, 19] }),
    ...stripes("black", R1, skirtTop - 2.6, skirtTop, [0, 90, 180, 270], 44),
    floor(R1, skirtTop),
    ...merlin([0, 0], 2.1, J2_EXIT, J2_LONG),
    ...[45, 135, 225, 315].flatMap((az) => merlin([R1 * 0.64 * Math.sin(deg(az)), R1 * 0.64 * Math.cos(deg(az))], 2.1, J2_EXIT, J2_LONG)),
  ];
}

function thirdStage(): Piece[] {
  const flare = 5.8;
  return [
    taper("white", R1, 0, R3, flare, { rings: [0.02, flare - 0.02], welds: [flare / 2] }),
    { kind: "lathe", material: "soot", segs: 32, under: true, only: "mesh", profile: [[R3 * 0.97, flare], [R1 * 0.97, 0]] },
    tube("white", R3, flare, H3, { rings: [H3 - 0.02], welds: [11, 14] }),
    ...stripes("black", R3, flare, flare + 2.8, [0, 180], 60),
    floor(R3, flare),
    ...merlin([0, 0], flare - J2_LONG + 0.4, J2_EXIT, J2_LONG),
  ];
}

function adapter(): Piece[] {
  const iu = 36 * 0.0254;
  return [
    tube("white", R3, 0, iu, { rings: [iu - 0.02] }),
    taper("white", R3, iu, RC, HA, { rings: [iu + 7 * FT], welds: [iu + 4.2 * FT] }),
    floor(R3, 0),
  ];
}

function serviceModule(): Piece[] {
  return [
    tube("steel", RC, NEST, NEST + HS, { rings: [NEST + 0.02, NEST + HS - 0.02], welds: [NEST + HS * 0.5] }),
    floor(RC, NEST),
    ...merlin([0, 0], 0, 1.1, NEST * 1.02),
  ];
}

function capsule(): Piece[] {
  return [
    { kind: "lathe", material: "steel", segs: 40, body: true, outline: true, profile: [[RC, 0.3], [RC * 0.98, 0.5], [RC * 0.22, HC * 0.88], [0.25, HC * 0.94], [0.001, HC]], rings: [0.5] },
    { kind: "lathe", material: "soot", segs: 30, under: true, profile: [[0, 0], [RC * 0.82, 0.08], [RC, 0.3]] },
  ];
}

function escapeTower(): Piece[] {
  const coverBase = 0.3;
  const motorFrom = COVER + TOWER * 0.26;
  const top = COVER + TOWER;
  const out: Piece[] = [
    { kind: "lathe", material: "white", segs: 40, body: true, outline: true, profile: [[RC + 0.03, coverBase], [RC * 0.24, COVER], [0.3, COVER + 0.3]], rings: [coverBase + 0.02] },
    tube("white", 0.33, motorFrom, top - 2.6),
    taper("white", 0.33, top - 2.6, 0.12, top - 1),
    nose("red", 0.12, top - 1, top, 1.2),
  ];
  // the open frame between the cover and the motor
  for (const az of [45, 135, 225, 315]) {
    const a = deg(az);
    const [x0, z0, x1, z1] = [0.3 * Math.sin(a), 0.3 * Math.cos(a), 0.62 * Math.sin(a), 0.62 * Math.cos(a)];
    out.push({ kind: "lines", weight: "feature", only: "drawing", paths: [[[x1, COVER, z1], [x0, motorFrom, z0]]] });
    out.push({ kind: "lathe", material: "red", at: [(x0 + x1) / 2, (z0 + z1) / 2], segs: 6, only: "mesh", profile: [[0.07, COVER + 0.2], [0.07, motorFrom]] });
  }
  return out;
}

export const SATURN_V_BUILDS: readonly StackBuild[] = [
  {
    rocket: "saturn-v",
    variant: "saturn-v",
    drawnFrom: "This package's code, its lengths and widths from the sources; the paint and the foot judged from photographs. No licensed model shows it, and no flag or lettering is drawn.",
    parts: [
      { slot: "first-stage", kind: "first-stage", name: "S-IC, first stage, Saturn V", height: H1, diameter: R1 * 2, top: [H1, R1 * 2], sourcedDiameter: { value: 10.06, source: "wikipedia-saturn-v" }, pieces: firstStage },
      { slot: "second-stage", kind: "second-stage", name: "S-II, second stage, Saturn V", height: H2, diameter: R1 * 2, bottom: [0, R1 * 2], top: [H2, R1 * 2], sourcedDiameter: { value: 10.06, source: "wikipedia-saturn-v" }, pieces: secondStage },
      { slot: "third-stage", kind: "third-stage", name: "S-IVB, third stage, Saturn V", height: H3, diameter: R3 * 2, bottom: [0, R1 * 2], top: [H3, R3 * 2], sourcedDiameter: { value: 6.6, source: "wikipedia-saturn-v", note: "21 feet 8 inches. It flares to the second stage's width at its foot." }, pieces: thirdStage },
      { slot: "adapter", kind: "adapter", name: "Instrument unit and spacecraft adapter, Saturn V", height: HA, diameter: R3 * 2, bottom: [0, R3 * 2], top: [HA, RC * 2], sourcedDiameter: { value: 6.6, source: "wikipedia-saturn-v" }, pieces: adapter },
      { slot: "service-module", kind: "service-module", name: "Apollo service module", height: NEST + HS, diameter: RC * 2, bottom: [NEST, RC * 2], top: [NEST + HS, RC * 2], sourcedDiameter: { value: 3.91, source: "wikipedia-apollo-csm", note: "12 feet 10 inches." }, pieces: serviceModule },
      { slot: "capsule", kind: "capsule", name: "Apollo command module", height: HC, diameter: RC * 2, bottom: [0, RC * 2], top: [HC, 0.5], sourcedDiameter: { value: 3.91, source: "wikipedia-apollo-csm", note: "12 feet 10 inches." }, pieces: capsule },
      { slot: "escape-tower", kind: "tower", name: "Launch escape tower and its cover", height: COVER + TOWER, diameter: (RC + 0.03) * 2, bottom: [COVER, 0.5], sourcedDiameter: blank("No source read here gives it."), pieces: escapeTower },
    ],
  },
];
