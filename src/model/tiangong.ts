// Tiangong in plain shapes, for the line looks, as parts in slots: every length and width is sourced, and where the node's ports and the wings stand is judged from the licensed model and photographs. The painted look is
// that model, one file a part. Tianhe stands on end with its node and the forward Shenzhou stacked above it; Tianzhou hangs under its aft; the laboratories run out along ±X from the node, Wentian to the left, and the nadir Shenzhou out along +Z.
import { LAB_LONG, LAB_WIDE, SHENZHOU_LONG, SHENZHOU_WIDE, SHENZHOU_WINGS, TIANHE_WIDE, TIANZHOU_WIDE, TIANZHOU_WINGS, WING_SPAN } from "../data/tiangong.ts";
import { blank } from "../data/types.ts";
import { horn, rod } from "./fleet/detail.ts";
import { taper, tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const TIANHE_R = (TIANHE_WIDE.value ?? 0) / 2;
const LAB_R = (LAB_WIDE.value ?? 0) / 2;
const SHENZHOU_R = (SHENZHOU_WIDE.value ?? 0) / 2;
const TIANZHOU_R = (TIANZHOU_WIDE.value ?? 0) / 2;
/** Tianhe's body and its node, as the model divides the sourced 16.6 m. */
const TIANHE = 12.2;
const HUB = 4.4;
const LAB = 17.9;
const SHENZHOU = 9.25;
const TIANZHOU = 10.6;
/** The narrow cylinder at Tianhe's forward end and the node, and the ports' rings. */
const NECK_R = 1.55;
const PORT_R = 1.4;
/** Where the node's side ports stand: the laboratories' and the nadir Shenzhou's axis, up the stack, and the collars' reach. */
const HUB_PORT_Y = TIANHE + 2.2;
const COLLAR = 1.66;
/** A wing: half the sourced span, and its width from the sourced area. */
const WING = (WING_SPAN.value ?? 0) / 2;
const WING_WIDE = 4;
const HUB_WIDE = blank("The node's width has no figure in a source read here: 3.3 m across its collars as drawn.");
const TIANHE_WINGS_WIDE = blank("Tianhe's two wings have no size in a source read here: the model's reach 11.6 m each side, at Tianhe's scale.");
const LAB_WINGS_WIDE = blank("4 m wide: the sourced 110 m² of cells over a 27.8 m wing.");

/** A round rod drawn in every look: a module or a craft lying along an axis. */
const pipe = (material: Parameters<typeof rod>[0], a: Vec3, b: Vec3, r: number): Piece => rod(material, a, b, r, 24, { only: undefined, plain: false });
/** A flat panel in a frame: a solar wing. */
const panel = (o: Vec3, u: Vec3, v: Vec3, w: Vec3, half: readonly [number, number], ribs = true): Piece => ({ kind: "plate", material: "gold", frame: { o, u, v, w }, outline: [[-half[0], -half[1]], [half[0], -half[1]], [half[0], half[1]], [-half[0], half[1]]], thickness: 0.08, ...(ribs ? { ribs: [[[0, -half[1]], [0, half[1]]]] } : {}) });

const tianhe = (): Piece[] => [
  tube("white", TIANHE_R * 0.75, 0, 1.2, { rings: [0.02] }),
  taper("white", TIANHE_R * 0.75, 1.2, TIANHE_R, 2.4),
  tube("white", TIANHE_R, 2.4, 9.6, { rings: [2.42, 6, 9.58] }),
  taper("white", TIANHE_R, 9.6, NECK_R, 10.3),
  tube("white", NECK_R, 10.3, TIANHE, { rings: [TIANHE - 0.02] }),
  { kind: "lathe", material: "dark", segs: 28, under: true, profile: [[0, 0], [TIANHE_R * 0.75, 0]] },
];

/** The node: a short neck, the sphere-like hub with its four side collars, and the forward port. */
const hub = (): Piece[] => [
  tube("white", NECK_R, 0, 0.8),
  taper("white", NECK_R, 0.8, NECK_R + 0.15, 1.2),
  tube("white", NECK_R + 0.15, 1.2, 3.2, { rings: [2.2] }),
  taper("white", NECK_R + 0.15, 3.2, PORT_R, 3.7),
  tube("engine-pale", PORT_R, 3.7, HUB, { rings: [HUB - 0.02] }),
  ...[1, -1].map((side) => strut("engine-pale", [side * NECK_R, 2.2, 0], [side * COLLAR, 2.2, 0], 2.6, 2.6, { plain: false })),
  strut("engine-pale", [0, 2.2, NECK_R], [0, 2.2, COLLAR], 2.6, 2.6, { plain: false }),
  strut("white", [0, 2.2, -NECK_R], [0, 2.2, -COLLAR], 2.6, 2.6, { plain: false }),
];

/** Shenzhou standing on its service module: service module, the bell of the re-entry module, the orbital module and its docking collar, with its two wings on the service module. */
const shenzhouUp = (): Piece[] => [
  tube("white", SHENZHOU_R, 0, 2.94, { rings: [0.02, 2.92] }),
  { kind: "lathe", material: "dark", segs: 28, under: true, profile: [[0, 0], [SHENZHOU_R, 0]] },
  taper("white", SHENZHOU_R, 2.94, 1.05, 5.44, { rings: [2.96] }),
  tube("white", 1.1, 5.44, 8.24, { rings: [5.46, 8.22] }),
  tube("engine-pale", 0.7, 8.24, SHENZHOU),
  ...[1, -1].map((side) => panel([side * (SHENZHOU_R + 3.55), 1.5, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [3.55, 1.0])),
];

/** The same craft lying out along +Z from its docking collar, as it hangs under the nadir port. */
const shenzhouOut = (): Piece[] => [
  pipe("engine-pale", [0, 0, 0], [0, 0, 1.01], 0.7),
  pipe("white", [0, 0, 1.01], [0, 0, 3.81], 1.1),
  ...horn("white", [0, 0, 3.81], [0, 0, 6.31], [1.05, 1.2, 1.35, 1.4, 1.4], 24, { only: undefined, plain: false }),
  pipe("white", [0, 0, 6.31], [0, 0, SHENZHOU], SHENZHOU_R),
  ...[1, -1].map((side) => panel([side * (SHENZHOU_R + 3.55), 0, 7.75], [1, 0, 0], [0, 0, 1], [0, -1, 0], [3.55, 1.0])),
];

/** Tianzhou standing on its propulsion module, its cargo module above with the docking end at the top, and its two wings on the propulsion module. */
const tianzhou = (): Piece[] => [
  tube("white", 1.2, 0, 3.6, { rings: [0.02, 3.58] }),
  { kind: "lathe", material: "dark", segs: 28, under: true, profile: [[0, 0], [1.2, 0]] },
  taper("white", 1.2, 3.6, TIANZHOU_R, 4.2),
  tube("white", TIANZHOU_R, 4.2, TIANZHOU - 0.3, { rings: [4.22, 7.4, TIANZHOU - 0.32] }),
  tube("engine-pale", 0.7, TIANZHOU - 0.3, TIANZHOU),
  ...[1, -1].map((side) => panel([side * 4.45, 1.8, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [3.0, 1.2])),
];

/** A laboratory lying out along `side` X from the node's collar: its big cylinder, then its narrower resource section at the far end. */
const lab = (side: number): Piece[] => [
  pipe("white", [0, 0, 0], [side * 12, 0, 0], LAB_R),
  ...horn("white", [side * 12, 0, 0], [side * 12.8, 0, 0], [LAB_R, 1.8], 24, { only: undefined, plain: false }),
  pipe("white", [side * 12.8, 0, 0], [side * LAB, 0, 0], 1.5),
];

/** A laboratory's two wings, up and down from its resource section, each half the sourced span. */
const labWings = (): Piece[] => [1, -1].map((up) => panel([0, up * (2.5 + (WING - 2.5) / 2), 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [WING_WIDE / 2, (WING - 2.5) / 2]));

/** Tianhe's two wings, out along ±X, as the model draws them. */
const tianheWings = (): Piece[] => [1, -1].map((side) => panel([side * 7.5, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [4.1, 2.7]));

const FROM = "w29572227's model for the painted look, one file a part, its flags and mark left out and each module at its own sourced size. This package's plain shapes for the two line looks, from the sourced lengths and widths; where the ports and the wings stand is judged from that model and photographs. No flag or mark is drawn.";
const painted = (part: string) => ({ file: `tiangong-${part}.glb`, credit: "w29572227-tiangong" as const });

export const TIANGONG_BUILDS: readonly StackBuild[] = [
  {
    rocket: "tiangong",
    variant: "tiangong",
    drawnFrom: FROM,
    parts: [
      { slot: "tianhe", kind: "module", name: "Tianhe core module, Tiangong", height: TIANHE, diameter: TIANHE_R * 2, top: [TIANHE, NECK_R * 2], sourcedDiameter: TIANHE_WIDE, painted: painted("tianhe"), pieces: tianhe },
      { slot: "hub", kind: "module", name: "Tianhe's docking node, Tiangong", height: HUB, diameter: COLLAR * 2, bottom: [0, NECK_R * 2], top: [HUB, PORT_R * 2], sourcedDiameter: HUB_WIDE, painted: painted("hub"), pieces: hub },
      { slot: "shenzhou-forward", kind: "spacecraft", name: "Shenzhou at the forward port, Tiangong", height: SHENZHOU, diameter: SHENZHOU_WINGS.value ?? 0, bottom: [0, PORT_R * 2], sourcedDiameter: SHENZHOU_WINGS, painted: painted("shenzhou-forward"), pieces: shenzhouUp },
      { slot: "tianzhou", kind: "spacecraft", name: "Tianzhou at the aft port, Tiangong", height: TIANZHOU, diameter: TIANZHOU_WINGS.value ?? 0, place: { x: 0, z: 0, y: -TIANZHOU }, sourcedDiameter: TIANZHOU_WINGS, painted: painted("tianzhou"), pieces: tianzhou },
      { slot: "wentian", kind: "module", name: "Wentian laboratory module, Tiangong", height: LAB_R * 2, diameter: LAB, place: { x: -COLLAR, z: 0, y: HUB_PORT_Y }, sourcedDiameter: LAB_LONG, painted: painted("wentian"), pieces: () => lab(-1) },
      { slot: "mengtian", kind: "module", name: "Mengtian laboratory module, Tiangong", height: LAB_R * 2, diameter: LAB, place: { x: COLLAR, z: 0, y: HUB_PORT_Y }, sourcedDiameter: LAB_LONG, painted: painted("mengtian"), pieces: () => lab(1) },
      { slot: "tianhe-arrays", kind: "array", name: "Tianhe's solar wings, Tiangong", height: 5.4, diameter: 23.2, place: { x: 0, z: 0, y: 8.7 }, sourcedDiameter: TIANHE_WINGS_WIDE, painted: painted("tianhe-arrays"), pieces: tianheWings },
      { slot: "wentian-arrays", kind: "array", name: "Wentian's solar wings, Tiangong", height: WING * 2, diameter: WING_WIDE, place: { x: -(COLLAR + LAB - 2.5), z: 0, y: HUB_PORT_Y }, sourcedDiameter: LAB_WINGS_WIDE, painted: painted("wentian-arrays"), pieces: labWings },
      { slot: "mengtian-arrays", kind: "array", name: "Mengtian's solar wings, Tiangong", height: WING * 2, diameter: WING_WIDE, place: { x: COLLAR + LAB - 2.5, z: 0, y: HUB_PORT_Y }, sourcedDiameter: LAB_WINGS_WIDE, painted: painted("mengtian-arrays"), pieces: labWings },
      { slot: "shenzhou-nadir", kind: "spacecraft", name: "Shenzhou at the nadir port, Tiangong", height: SHENZHOU_WINGS.value ?? 0, diameter: SHENZHOU, place: { x: 0, z: COLLAR, y: HUB_PORT_Y }, sourcedDiameter: SHENZHOU_LONG, painted: painted("shenzhou-nadir"), pieces: shenzhouOut },
    ],
  },
];
