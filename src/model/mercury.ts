// The Mercury spacecraft in a plain shape, for the line looks: its length and width are sourced, and its outline is measured from NASA's model at those scales. The painted look is NASA's model.
import { MERCURY_WIDE } from "../data/mercury.ts";
import type { Piece } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const H = 3.3;
const R = (MERCURY_WIDE.value ?? 0) / 2;

const capsule = (): Piece[] => [
  { kind: "lathe", material: "engine-metal", segs: 28, body: true, outline: true, profile: [[0.24, 0], [0.44, 0.12], [0.5, 0.42]], rings: [0.42] },
  { kind: "lathe", material: "soot", segs: 36, body: true, outline: true, profile: [[0.5, 0.42], [R, 0.55], [R * 0.98, 0.6]] },
  { kind: "lathe", material: "tile-plain", segs: 36, body: true, outline: true, profile: [[R * 0.98, 0.6], [0.35, 2.15]], welds: [1.1, 1.6] },
  { kind: "lathe", material: "engine-metal", segs: 28, body: true, outline: true, profile: [[0.35, 2.15], [0.35, 2.75]], rings: [2.17, 2.73] },
  { kind: "lathe", material: "engine-pale", segs: 28, body: true, outline: true, profile: [[0.35, 2.75], [0.29, 2.95], [0.26, H]], rings: [2.95] },
];

export const MERCURY_BUILDS: readonly StackBuild[] = [
  {
    rocket: "mercury",
    variant: "friendship-7",
    drawnFrom: "NASA's model for the painted look, with its colours judged from photographs. This package's plain shape for the two line looks, from the sourced length and width. No name or flag is drawn.",
    parts: [{ slot: "capsule", kind: "capsule", name: "Mercury spacecraft, Friendship 7", height: H, diameter: R * 2, sourcedDiameter: MERCURY_WIDE, painted: { file: "mercury-capsule.glb", credit: "nasa-friendship-7" }, pieces: capsule }],
  },
];
