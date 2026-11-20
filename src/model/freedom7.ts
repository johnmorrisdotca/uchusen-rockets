// Freedom 7 in this package's capsule outline for the line looks, at the early-years table's 2.9 m by 1.9 m. The painted look is NASA's model at those two sizes. Friendship 7 stays at 3.3 m by 1.8 m.
import { FREEDOM_LENGTH, FREEDOM_WIDTH } from "../data/freedom7.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const sy = FREEDOM_LENGTH / 3.3;
const sr = FREEDOM_WIDTH / 1.8;
const at = (r: number, y: number): [number, number] => [r * sr, y * sy];

const capsule = (): Piece[] => [
  { kind: "lathe", material: "engine-metal", segs: 28, body: true, outline: true, profile: [at(0.24, 0), at(0.44, 0.12), at(0.5, 0.42)], rings: [0.42 * sy] },
  { kind: "lathe", material: "soot", segs: 36, body: true, outline: true, profile: [at(0.5, 0.42), at(0.9, 0.55), at(0.9 * 0.98, 0.6)] },
  { kind: "lathe", material: "tile-plain", segs: 36, body: true, outline: true, profile: [at(0.9 * 0.98, 0.6), at(0.35, 2.15)], welds: [1.1 * sy, 1.6 * sy] },
  { kind: "lathe", material: "engine-metal", segs: 28, body: true, outline: true, profile: [at(0.35, 2.15), at(0.35, 2.75)], rings: [2.17 * sy, 2.73 * sy] },
  { kind: "lathe", material: "engine-pale", segs: 28, body: true, outline: true, profile: [at(0.35, 2.75), at(0.29, 2.95), at(0.26, 3.3)], rings: [2.95 * sy] },
];

export const FREEDOM_BUILDS: readonly StackBuild[] = [
  {
    rocket: "freedom-7",
    variant: "freedom-7",
    drawnFrom: "NASA's model for the painted look, scaled so the length is the early-years table's 2.9 m and the width is its 1.9 m, stood on the heat shield. This package's own capsule outline for the two line looks, at those two sizes rather than Friendship 7's 3.3 m by 1.8 m. NASA's copy leaves its materials all one grey, and that grey is kept. No name or flag is drawn.",
    parts: [{ slot: "capsule", kind: "capsule", name: "Freedom 7", height: FREEDOM_LENGTH, diameter: FREEDOM_WIDTH, sourcedDiameter: { value: FREEDOM_WIDTH, source: "nasa-early-years", note: "1.9 metres (6.2 feet), the table." }, painted: { file: "freedom-7-capsule.glb", credit: "nasa-freedom-7" }, pieces: capsule }],
  },
];
