// Apollo and Soyuz docked, in plain shapes, for the line looks: each is its sourced length and width, stood on end with Apollo's engine down. Where their parts begin is measured from NASA's model at those scales. The painted look is NASA's model.
import { AS_CSM_LONG, AS_CSM_WIDE, AS_SOYUZ_LONG, AS_SOYUZ_WIDE } from "../data/apollosoyuz.ts";
import { blank } from "../data/types.ts";
import { floor, taper, tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const CSM = AS_CSM_LONG.value ?? 0;
const CSM_R = (AS_CSM_WIDE.value ?? 0) / 2;
const ALONG = CSM / 11.84;
const ENGINE = 2.59;
const CM_AT = CSM - 3.28;
const DOCK_AT = CSM - (0.32 * ALONG);
const DOCK = 2.33;
const SOYUZ_AT = DOCK_AT + 2.32 * ALONG;
const SOYUZ = AS_SOYUZ_LONG.value ?? 0;
const SOYUZ_R = (AS_SOYUZ_WIDE.value ?? 0) / 2;

const csm = (): Piece[] => [
  taper("engine-pale", 1.2, 0, 0.45, ENGINE, { rings: [0.02] }),
  tube("white", CSM_R, ENGINE, CM_AT, { rings: [ENGINE + 0.02, CM_AT - 0.02], welds: [ENGINE + 1.5] }),
  floor(CSM_R, ENGINE),
  taper("steel", CSM_R, CM_AT, 0.3, CSM),
];
const dock = (): Piece[] => [tube("dark", 0.7, 0.1, DOCK, { rings: [0.3, DOCK - 0.25] }), floor(0.7, 0.1)];

const wing = (side: number): Piece => {
  const frame = { o: [side * SOYUZ_R, 5.9, 0] as Vec3, u: [side, 0, 0] as Vec3, v: [0, 1, 0] as Vec3, w: [0, 0, 1] as Vec3 };
  return { kind: "plate", material: "solar", frame, outline: [[0.1, -0.5], [2.75, -0.5], [2.75, 0.5], [0.1, 0.5]], thickness: 0.04 };
};
export const soyuzPieces = (): Piece[] => [
  { kind: "lathe", material: "white", segs: 28, body: true, outline: true, profile: [[0.3, 0.1], [0.75, 0.25], [1.05, 0.8], [1.05, 1.4], [0.72, 2.1]] },
  { kind: "lathe", material: "white", segs: 28, body: true, outline: true, profile: [[0.72, 2.1], [SOYUZ_R * 0.88, 3], [SOYUZ_R * 0.9, 4.6]], rings: [3] },
  tube("engine-pale", SOYUZ_R * 0.95, 4.6, 6.6, { rings: [4.62] }),
  { kind: "lathe", material: "white", segs: 28, body: true, outline: true, profile: [[SOYUZ_R * 0.95, 6.6], [SOYUZ_R, SOYUZ]] },
  wing(1),
  wing(-1),
];

const FROM = "NASA's model for the painted look. This package's plain shapes for the two line looks, from each craft's sourced length and width; where its parts begin is measured from NASA's model. No flag or lettering is drawn.";

export const APOLLO_SOYUZ_BUILDS: readonly StackBuild[] = [
  {
    rocket: "apollo-soyuz",
    variant: "apollo-soyuz",
    drawnFrom: FROM,
    parts: [
      { slot: "csm", kind: "spacecraft", name: "Apollo command and service module", height: CSM, diameter: CSM_R * 2, sourcedDiameter: AS_CSM_WIDE, painted: { file: "apollo-soyuz-csm.glb", credit: "nasa-apollo-soyuz" }, pieces: csm },
      { slot: "docking-module", kind: "spacecraft", name: "Docking module", height: DOCK, diameter: 1.41, place: { x: 0, z: 0, y: DOCK_AT }, sourcedDiameter: blank("No source read here gives its size."), painted: { file: "apollo-soyuz-docking-module.glb", credit: "nasa-apollo-soyuz" }, pieces: dock },
      { slot: "soyuz", kind: "spacecraft", name: "Soyuz 7K-TM", height: SOYUZ, diameter: SOYUZ_R * 2, place: { x: 0, z: 0, y: SOYUZ_AT }, sourcedDiameter: AS_SOYUZ_WIDE, painted: { file: "apollo-soyuz-soyuz.glb", credit: "nasa-apollo-soyuz" }, pieces: soyuzPieces },
    ],
  },
];
