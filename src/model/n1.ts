// The N1 from a table of numbers: the five blocks' lengths and widths and the whole are sourced, and so are the engine counts and the two rings of Block A's thirty. Each block is a straight tube at its maximum width. What the whole leaves above Block D is one part, an estimate. The engines' size and the paint are not sourced.
import { FUTURE_STAGE_LENGTHS } from "../data/future-lengths.ts";
import { N1_DIAMETERS, N1_PAYLOAD_DIAMETER } from "../data/n1.ts";
import { merlin } from "./falcon.ts";
import { engineRing, floor, nose, taper, tube } from "./kit.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const N1 = FUTURE_STAGE_LENGTHS.n1;
const A = N1.parts["block-a"].value ?? 0;
const B = N1.parts["block-b"].value ?? 0;
const V = N1.parts["block-v"].value ?? 0;
const G = N1.parts["block-g"].value ?? 0;
const D = N1.parts["block-d"].value ?? 0;
const WHOLE = N1.height.value ?? 0;
const PAYLOAD = Math.round((WHOLE - A - B - V - G - D) * 1000) / 1000;
const RA = (N1_DIAMETERS["block-a"].value ?? 0) / 2;
const RB = (N1_DIAMETERS["block-b"].value ?? 0) / 2;
const RV = (N1_DIAMETERS["block-v"].value ?? 0) / 2;
const RG = (N1_DIAMETERS["block-g"].value ?? 0) / 2;
const RD = (N1_DIAMETERS["block-d"].value ?? 0) / 2;

/** A block's shell from its foot to its top, closed under and stepped in to the next block's width at the top. */
const shell = (r: number, foot: number, height: number, next: number): Piece[] => [
  tube("white", r, foot, height, { rings: [foot + 0.02, height - 0.02] }),
  floor(r, foot),
  taper("white", r, height, next, height),
];

function blockA(): Piece[] {
  const foot = 3;
  const outer = engineRing(24, RA * 0.82, 0, 0.8, 2.6);
  const inner = engineRing(6, RA * 0.4, 0, 0.8, 2.6, 30);
  return [...shell(RA, foot, A, RB), ...outer, ...inner];
}

const blockB = (): Piece[] => [...shell(RB, 2, B, RV), ...engineRing(8, RB * 0.7, 0, 0.75, 2.2)];
const blockV = (): Piece[] => [...shell(RV, 1.6, V, RG), ...engineRing(4, RV * 0.5, 0, 0.6, 1.6)];
const blockG = (): Piece[] => [...shell(RG, 1.2, G, RD), ...merlin([0, 0], 0, 0.45, 1.2)];
const blockD = (): Piece[] => [tube("steel", RD, 1, D, { rings: [1.02, D - 0.02] }), floor(RD, 1), ...merlin([0, 0], 0, 0.4, 1.2)];

function payload(): Piece[] {
  const straight = PAYLOAD - 6;
  return [tube("white", RD, 0, straight, { rings: [0.02] }), floor(RD, 0), nose("white", RD, straight, PAYLOAD, 1.2)];
}

const stage = (slot: string, kind: "first-stage" | "second-stage" | "third-stage" | "fourth-stage" | "fifth-stage", name: string, height: number, r: number, next: number, key: keyof typeof N1_DIAMETERS, pieces: () => Piece[]) => ({
  slot,
  kind,
  name,
  height,
  diameter: r * 2,
  ...(kind === "first-stage" ? {} : { bottom: [0, r * 2] as [number, number] }),
  top: [height, next * 2] as [number, number],
  sourcedDiameter: N1_DIAMETERS[key],
  pieces,
});

export const N1_BUILDS: readonly StackBuild[] = [
  {
    rocket: "n1",
    variant: "n1",
    drawnFrom: "This package's code, from the sourced blocks' lengths and maximum widths and the sourced whole. Each block is a straight tube at its maximum width, stepped in to the next block's width at its top: the real blocks narrow, and no source read here says how. What the whole leaves above Block D, about 29.8 m, is not given piece by piece for the payload, its shroud and the escape tower, so it is one part, an estimate, drawn as wide as Block D with a plain rounded nose. Block A has thirty engines in two rings, twenty-four and six, as its page says; the engines' size and the paint are not sourced. No licensed model is used, and no name or mark is drawn.",
    parts: [
      stage("first-stage", "first-stage", "Block A, N1", A, RA, RB, "block-a", blockA),
      stage("second-stage", "second-stage", "Block B, N1", B, RB, RV, "block-b", blockB),
      stage("third-stage", "third-stage", "Block V, N1", V, RV, RG, "block-v", blockV),
      stage("fourth-stage", "fourth-stage", "Block G, N1", G, RG, RD, "block-g", blockG),
      stage("fifth-stage", "fifth-stage", "Block D, N1", D, RD, RD, "block-d", blockD),
      { slot: "payload", kind: "payload", name: "Payload, shroud and escape tower, not given apart, N1", height: PAYLOAD, diameter: RD * 2, bottom: [0, RD * 2], sourcedDiameter: N1_PAYLOAD_DIAMETER, pieces: payload },
    ],
  },
];
