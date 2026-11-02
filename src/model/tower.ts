// The integration tower from a table of numbers: its height, its lightning rod and its footprint are sourced; its nine sections are sourced, and their bracing, its arms and the mount are judged from photographs. Plain boxes, few enough that the scene with a whole Starship stays inside a code-made mesh's limit.
import { STARSHIP_DRAWS, boosterPieces, shipPieces } from "./starship.ts";
import { blank } from "../data/types.ts";
import { TOWER_HEIGHT } from "../data/tower.ts";
import { deg } from "../framing.ts";
import type { MaterialName } from "./materials.ts";
import { type Lathe, type Piece, type Plate, strut, type Vec3 } from "./pieces.ts";
import type { StackBuild, StackPart } from "./stacks.ts";

const ROD = 10 * 0.3048;
const SECTIONS = 9;
const HALF = 6.5;
export const TOWER_X = -28;
const MOUNT_TOP = 21;
const ARM_REACH = 32;
const ARM_FROM = TOWER_X + HALF + 1;
const SHIP_ARM_Y = 100;
const CATCH_Y = 125;
const CATCH_BOOSTER_Y = 58;
const OPEN_Z = 13;
const CLOSED_Z = 5;
const R = 4.5;

const beam = (material: MaterialName, a: Vec3, b: Vec3, width: number, depth = width): Plate => strut(material, a, b, width, depth, { plain: true });

export function tower(): Piece[] {
  const out: Piece[] = [];
  const corners: readonly (readonly [number, number])[] = [[HALF, HALF], [HALF, -HALF], [-HALF, -HALF], [-HALF, HALF]];
  const step = TOWER_HEIGHT / SECTIONS;
  for (const [x, z] of corners) out.push(beam("fin-dark", [x, 0, z], [x, TOWER_HEIGHT, z], 1));
  for (let s = 0; s <= SECTIONS; s++) {
    const y = s * step;
    for (let c = 0; c < 4; c++) {
      const [x0, z0] = corners[c];
      const [x1, z1] = corners[(c + 1) % 4];
      out.push(beam("fin-dark", [x0, y, z0], [x1, y, z1], 0.6));
      if (s < SECTIONS) out.push(beam("fin", [x0, y, z0], [x1, y + step, z1], 0.34));
    }
  }
  // the lightning rod, and the arm that fuels the Ship
  out.push({ kind: "lathe", material: "engine-metal", segs: 8, profile: [[0.2, TOWER_HEIGHT], [0.06, TOWER_HEIGHT + ROD]] });
  out.push(beam("dark", [HALF, SHIP_ARM_Y, HALF], [HALF + 15, SHIP_ARM_Y, 3], 1.1));
  out.push(beam("dark", [HALF, SHIP_ARM_Y, -HALF], [HALF + 15, SHIP_ARM_Y, 3], 0.8));
  return out;
}

export function mount(): Piece[] {
  const table = (r: number, r0: number, y: number): Lathe => ({ kind: "lathe", material: "fin", segs: 48, body: true, profile: [[r, y], [r0, y]] });
  const out: Piece[] = [
    { kind: "lathe", material: "concrete", segs: 48, body: true, outline: true, profile: [[32, 0], [32, 0.5], [0.001, 0.5]] },
    { kind: "lathe", material: "fin", segs: 48, body: true, outline: true, profile: [[14, MOUNT_TOP - 3], [14, MOUNT_TOP]], rings: [MOUNT_TOP - 3] },
    { kind: "lathe", material: "fin", segs: 40, under: true, profile: [[6, MOUNT_TOP - 3], [14, MOUNT_TOP - 3]] },
    { kind: "lathe", material: "soot", segs: 32, only: "mesh", profile: [[6, MOUNT_TOP], [6, MOUNT_TOP - 3]] },
    table(14, 6, MOUNT_TOP),
    // the steel plate that takes the blast, under the ring
    { kind: "lathe", material: "engine-metal", segs: 32, body: true, profile: [[11, 2], [0.001, 2.6]] },
  ];
  for (let i = 0; i < 6; i++) {
    const a = deg(30 + i * 60);
    const at = (r: number, y: number): Vec3 => [r * Math.sin(a), y, r * Math.cos(a)];
    out.push(beam("dark", at(16, 0.5), at(11.5, MOUNT_TOP - 3), 2.2));
  }
  return out;
}

function arms(z: number): Piece[] {
  const end = ARM_FROM + ARM_REACH;
  const out: Piece[] = [{ kind: "plate", material: "dark", frame: { o: [ARM_FROM - 1, 2, 0], u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] }, outline: [[-2, -(HALF + 1.2)], [2, -(HALF + 1.2)], [2, HALF + 1.2], [-2, HALF + 1.2]], thickness: 1.4, plain: false }];
  for (const side of [1, -1]) {
    const inner: Vec3 = [end, 2, side * z];
    const root: Vec3 = [ARM_FROM, 2, side * HALF];
    out.push(beam("dark", root, inner, 1.9, 1.7));
    // the track on top, and its truss underneath
    out.push(beam("engine-metal", [root[0] + 3, 3, root[2]], [end - 1, 3, side * z], 0.5, 0.3));
    out.push(beam("fin-dark", [ARM_FROM, 0.2, side * HALF], [(ARM_FROM + end) / 2, 0.6, side * ((HALF + z) / 2)], 0.5));
  }
  return out;
}

const NONE = blank("No source read here gives it.");
const FROM = "This package's code. The tower's height and lightning rod are from the FAA's 2022 assessment, its nine sections from Wikipedia, its footprint from OpenStreetMap; its bracing, arms and mount are judged from photographs, which were looked at and not traced. No lettering or mark is drawn.";
const v3 = STARSHIP_DRAWS.v3;

const common = (armY: number, armZ: number): StackPart[] => [
  { slot: "mount", kind: "mount", name: "Launch mount and pad", height: MOUNT_TOP, diameter: 64, place: { x: 0, z: 0 }, sourcedDiameter: NONE, pieces: mount },
  { slot: "tower", kind: "tower", name: "Integration tower", height: TOWER_HEIGHT, diameter: HALF * 2, place: { x: TOWER_X, z: 0 }, sourcedDiameter: { value: 13, source: "openstreetmap", note: "The map's footprint of tower 1, 13 by 12 m." }, pieces: tower },
  { slot: "arms", kind: "arms", name: armZ === CLOSED_Z ? "The arms, closed" : "The arms, open", height: 4, diameter: ARM_REACH, place: { x: 0, z: 0, y: armY }, sourcedDiameter: NONE, pieces: () => arms(armZ) },
];
const booster = (y: number): StackPart => ({ slot: "booster", kind: "booster", name: "Super Heavy, Block 3 (V3)", height: v3.boosterHeight, diameter: v3.radius * 2, place: { x: 0, z: 0, y }, sourcedDiameter: { value: R * 2, source: "wikipedia-starship" }, pieces: () => boosterPieces(v3) });
const ship = (y: number): StackPart => ({ slot: "ship", kind: "ship", name: "Ship, Block 3 (V3)", height: v3.shipHeight, diameter: v3.radius * 2, place: { x: 0, z: 0, y }, sourcedDiameter: { value: R * 2, source: "wikipedia-starship" }, pieces: () => shipPieces(v3) });

export const TOWER_BUILDS: readonly StackBuild[] = [
  { rocket: "launch-tower", variant: "tower", drawnFrom: FROM, parts: common(CATCH_Y, OPEN_Z) },
  { rocket: "launch-tower", variant: "stack", drawnFrom: FROM, parts: [...common(CATCH_Y, OPEN_Z), booster(MOUNT_TOP), ship(MOUNT_TOP + v3.boosterHeight)] },
  { rocket: "launch-tower", variant: "catch", drawnFrom: FROM, parts: [...common(CATCH_Y, CLOSED_Z), booster(CATCH_BOOSTER_Y)] },
];
