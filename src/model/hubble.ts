// Hubble in plain shapes, for the line looks, as parts in slots: its length and width are sourced, and where each part begins, and where its arrays and antennas stand, is measured from the licensed model at that
// scale. The painted look is that model, one file a part. The five sections stack up the axis; the arrays run out along ±X and the antennas along ±Z from where they are rooted on the forward shell.
import { HUBBLE_WIDE } from "../data/hubble.ts";
import { blank } from "../data/types.ts";
import { horn } from "./fleet/detail.ts";
import { taper, tube } from "./kit.ts";
import type { Piece, Vec3 } from "./pieces.ts";
import { strut } from "./pieces.ts";
import type { StackBuild } from "./stacks.ts";

const R = (HUBBLE_WIDE.value ?? 0) / 2;
/** The forward section's radius, from the model at the sourced width. */
const SHIELD_R = 1.285;
const AFT = 3.65;
const EQUIPMENT = 1.7;
const FORWARD = 3.04;
const SHIELD = 4.74;
const DOOR = 0.07;
/** Where the arrays' masts and the antennas' booms are rooted: up the stack, and out from the axis. */
const ARRAY_Y = 5.82;
const ARRAY_ROOT = 1.48;
const ANTENNA_Y = 6.13;
const ANTENNA_ROOT = 1.69;
/** The forward section's width, and a wing's and a boom's reach, have no figure in a source read here. */
const FORWARD_WIDE = blank("The forward section's width has no figure in a source read here: the model's is 2.6 m at the sourced width of the aft shroud.");
const ARRAY_WIDE = blank("A wing's reach has no figure in a source read here: the model's is 3.7 m out from the shell.");
const ANTENNA_WIDE = blank("A boom's reach has no figure in a source read here: the model's is 3.9 m out from the shell.");

const aftShroud = (): Piece[] => [tube("steel", R, 0, AFT, { rings: [0.02, 2.2, AFT - 0.02] }), { kind: "lathe", material: "dark", segs: 28, under: true, profile: [[0, 0], [R, 0]] }];
const equipmentSection = (): Piece[] => [tube("steel", R, 0, EQUIPMENT, { welds: [0.6, 1.1] })];
const forwardShell = (): Piece[] => [tube("steel", R, 0, 0.98, { rings: [0.02] }), taper("steel", R, 0.98, SHIELD_R, FORWARD)];
const lightShield = (): Piece[] => [tube("steel", SHIELD_R, 0, SHIELD, { rings: [1, 2.2, 3.4], welds: [SHIELD - 0.02] })];
const apertureDoor = (): Piece[] => [{ kind: "lathe", material: "engine-pale", segs: 32, body: true, outline: true, profile: [[SHIELD_R, 0], [SHIELD_R, DOOR], [0.001, DOOR]] }];

/** A wing: its mast out along `side` X from the root, then the panel, 2.1 m wide and 6.2 m tall. */
const array = (side: number): Piece[] => {
  const frame = { o: [side * 2.62, 0, 0] as Vec3, u: [1, 0, 0] as Vec3, v: [0, 1, 0] as Vec3, w: [0, 0, 1] as Vec3 };
  return [
    strut("engine-pale", [0, 0, 0], [side * 1.56, 0, 0], 0.3, 0.3, { plain: false }),
    { kind: "plate", material: "gold", frame, outline: [[-1.05, -3.1], [1.05, -3.1], [1.05, 3.1], [-1.05, 3.1]], thickness: 0.06, ribs: [[[0, -3.1], [0, 3.1]]] },
  ];
};

/** A high-gain antenna: its boom out along `side` Z from the root, and its dish at the end. */
const antenna = (side: number): Piece[] => [
  strut("engine-pale", [0, 0, 0], [0, 0, side * 2.9], 0.15, 0.15, { plain: false }),
  ...horn("engine-pale", [0, 0, side * 2.9], [0, 0, side * 3.9], [0.15, 0.4, 0.6], 12, { only: undefined, plain: false }),
];

const FROM = "Cybertron B-127's model for the painted look, one file a part, its wordmark and logos painted out and its door turned shut. This package's plain shapes for the two line looks, from the sourced length and width; where each part begins, and where its arrays and antennas stand, is measured from that model. No lettering or mark is drawn.";
const painted = (part: string) => ({ file: `hubble-${part}.glb`, credit: "robo-reboot-hubble" as const });

export const HUBBLE_BUILDS: readonly StackBuild[] = [
  {
    rocket: "hubble",
    variant: "hubble",
    drawnFrom: FROM,
    parts: [
      { slot: "aft-shroud", kind: "module", name: "Aft shroud, Hubble", height: AFT, diameter: R * 2, top: [AFT, R * 2], sourcedDiameter: HUBBLE_WIDE, painted: painted("aft-shroud"), pieces: aftShroud },
      { slot: "equipment-section", kind: "module", name: "Equipment section, Hubble", height: EQUIPMENT, diameter: R * 2, bottom: [0, R * 2], top: [EQUIPMENT, R * 2], sourcedDiameter: HUBBLE_WIDE, painted: painted("equipment-section"), pieces: equipmentSection },
      { slot: "forward-shell", kind: "module", name: "Forward shell, Hubble", height: FORWARD, diameter: R * 2, bottom: [0, R * 2], top: [FORWARD, SHIELD_R * 2], sourcedDiameter: HUBBLE_WIDE, painted: painted("forward-shell"), pieces: forwardShell },
      { slot: "light-shield", kind: "module", name: "Light shield, Hubble", height: SHIELD, diameter: SHIELD_R * 2, bottom: [0, SHIELD_R * 2], top: [SHIELD, SHIELD_R * 2], sourcedDiameter: FORWARD_WIDE, painted: painted("light-shield"), pieces: lightShield },
      { slot: "aperture-door", kind: "module", name: "Aperture door, Hubble", height: DOOR, diameter: SHIELD_R * 2, bottom: [0, SHIELD_R * 2], sourcedDiameter: FORWARD_WIDE, painted: painted("aperture-door"), pieces: apertureDoor },
      { slot: "array-left", kind: "array", name: "Solar array, left, Hubble", height: 6.2, diameter: 3.67, place: { x: -ARRAY_ROOT, z: 0, y: ARRAY_Y }, sourcedDiameter: ARRAY_WIDE, painted: painted("array-left"), pieces: () => array(-1) },
      { slot: "array-right", kind: "array", name: "Solar array, right, Hubble", height: 6.2, diameter: 3.67, place: { x: ARRAY_ROOT, z: 0, y: ARRAY_Y }, sourcedDiameter: ARRAY_WIDE, painted: painted("array-right"), pieces: () => array(1) },
      { slot: "antenna-near", kind: "antenna", name: "High-gain antenna, near side, Hubble", height: 1.2, diameter: 3.9, place: { x: 0, z: ANTENNA_ROOT, y: ANTENNA_Y }, sourcedDiameter: ANTENNA_WIDE, painted: painted("antenna-near"), pieces: () => antenna(1) },
      { slot: "antenna-far", kind: "antenna", name: "High-gain antenna, far side, Hubble", height: 1.2, diameter: 3.9, place: { x: 0, z: -ANTENNA_ROOT, y: ANTENNA_Y }, sourcedDiameter: ANTENNA_WIDE, painted: painted("antenna-far"), pieces: () => antenna(-1) },
    ],
  },
];
