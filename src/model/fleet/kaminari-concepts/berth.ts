// Visiting craft, berthed outside the hull the way a station berths a ship: a Starship ship in clamp saddles, two Starship tankers at separate methane and oxygen couplings, and a Dragon at a port. The craft are the package's own parts at their own size. Nothing here is drawn inside a hull. Pure: no three.js and no DOM.
import { DRAGON_DRAWS, capsule, trunk } from "../../falcon.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { STARSHIP_DRAWS, shipPieces } from "../../starship.ts";
import { berthArm, berthCradle, deepTruss, dockingPort, transferCoupling } from "../dockJoints.ts";
import { dockedNow, visitorsOf } from "../dockedState.ts";
import { place } from "./adapter.ts";
import type { ConceptSlot } from "./common.ts";

const ROCKET = { a: "fleet-kaminari", b: "fleet-emiake", c: "fleet-romaryu" } as const;

const DRAW = STARSHIP_DRAWS.v3;
const DRAGON = DRAGON_DRAWS["dragon-2"];
/** The ship alone, 52.1 m, the package's Block 3. Super Heavy stays on Earth. */
export const STACK_M = DRAW.shipHeight;
const DRAGON_M = DRAGON.trunk + DRAGON.capsule - DRAGON.nest;

let stackCache: Piece[] | null = null;
let tankerCache: Piece[] | null = null;
let dragonCache: Piece[] | null = null;

const stackTemplate = (): Piece[] => (stackCache ??= shipPieces(DRAW));
const tankerTemplate = (): Piece[] => (tankerCache ??= shipPieces(DRAW));
const dragonTemplate = (): Piece[] => (dragonCache ??= [...trunk(DRAGON), ...place(capsule(DRAGON), { at: [0, DRAGON.trunk - DRAGON.nest, 0] })]);

export interface BerthPlan {
  at: readonly [number, number, number];
  /** Where the arms meet the hull, in the berth's own frame. */
  hullX: number;
  stack: readonly [number, number, number];
  tankers: readonly (readonly [number, number, number])[];
  dragon: readonly [number, number, number];
  methane: readonly [number, number, number];
  oxygen: readonly [number, number, number];
  height: number;
  diameter: number;
  note: string;
}

const atOf = (p: readonly [number, number, number]): Vec3 => [p[0], p[1], p[2]];

/** A cradle on a deep truss. The truss runs from the hull to the craft's flank; the pads and the craft's latches do the holding. */
function saddle(hullX: number, craft: readonly [number, number, number], yUp: number): Piece[] {
  const [x, y0, z] = craft;
  const y = y0 + yUp;
  const skin = x < 0 ? -Math.abs(hullX) : Math.abs(hullX);
  const dir = (Math.sign(x - skin) || 1) as 1 | -1;
  const flank = x - dir * 4.7;
  const face: Vec3 = [flank, y, z];
  return [...deepTruss([skin, y, z], face, 4), ...berthCradle(face, dir)];
}

/** The craft the berth draws when nobody has chosen: a ship, two tankers and a Dragon, in the berth's own frame. */
function parked(plan: BerthPlan): Piece[] {
  const out: Piece[] = [...place(stackTemplate(), { at: atOf(plan.stack) })];
  for (const at of plan.tankers) out.push(...place(tankerTemplate(), { at: atOf(at) }));
  out.push(...place(dragonTemplate(), { at: atOf(plan.dragon) }));
  return out;
}

/** The berth's pieces in its own frame: the origin is the plan's `at` on the ship. `craft` replaces the parked visitors; the saddles stay. */
export function berthPieces(plan: BerthPlan, craft: Piece[] = parked(plan)): Piece[] {
  const out: Piece[] = [...craft];
  out.push(...saddle(plan.hullX, plan.stack, 10), ...saddle(plan.hullX, plan.stack, 26), ...saddle(plan.hullX, plan.stack, 42));
  for (const at of plan.tankers) {
    out.push(...saddle(plan.hullX, at, 18));
    out.push(...place(transferCoupling(), { at: [at[0], at[1], at[2]] }));
  }
  const nose: Vec3 = [plan.dragon[0], plan.dragon[1] + DRAGON_M, plan.dragon[2]];
  const dragonSkin = plan.dragon[0] < 0 ? -Math.abs(plan.hullX) : Math.abs(plan.hullX);
  out.push(...place(dockingPort("M", 2, -1), { at: nose }));
  out.push(...deepTruss([dragonSkin, nose[1] + 2, plan.dragon[2]], [nose[0], nose[1] + 2, plan.dragon[2]], 3));
  const reach = Math.sign(plan.stack[0] - plan.hullX) || 1;
  out.push(...place(berthArm(), { at: [plan.hullX, plan.stack[1] + 18, plan.stack[2]], yaw: reach > 0 ? 0 : 180 }));
  return out;
}

const PLANS: Record<"a" | "b" | "c", BerthPlan> = {
  a: {
    at: [0, 210, 0],
    hullX: 16,
    stack: [25, 0, 0],
    tankers: [[25, 58, 0], [25, 116, 0]],
    dragon: [-25, 6, 0],
    methane: [25, 58, 0],
    oxygen: [25, 116, 0],
    height: 168,
    diameter: 70,
    note: "Open berths a few metres off the starboard hull, and a Dragon port the same distance off the port side. A Starship ship sits in clamp saddles. Two Starship tankers meet transfer couplings. Nothing is inside the truss. Descends from the ISS visiting vehicles and the common berthing mechanism.",
  },
  b: {
    at: [0, 170, 0],
    hullX: 78,
    stack: [87, 0, 0],
    tankers: [[87, 58, 0], [87, 116, 0]],
    dragon: [-87, 8, 0],
    methane: [87, 58, 0],
    oxygen: [87, 116, 0],
    height: 168,
    diameter: 191,
    note: "An exterior berth a few metres off the starboard side of the open keel, and a Dragon port the same distance to port. The ship is in clamp saddles. Two Starship tankers meet transfer couplings. Nothing is stored inside the frame. Descends from the ISS visiting vehicles and the common berthing mechanism.",
  },
  c: {
    at: [0, 600, 0],
    hullX: 22,
    stack: [31, 0, 0],
    tankers: [[-31, 8, 0], [-31, 66, 0]],
    dragon: [31, -20, 0],
    methane: [-31, 8, 0],
    oxygen: [-31, 66, 0],
    height: 118,
    diameter: 80,
    note: "Exterior berths a few metres off the shaft. The Starship ship is to starboard and the two tankers to port, each tanker at a transfer coupling. A Dragon sits at a port beside the ship. The Miyamotos stay. Nothing is inside the shaft. Descends from the ISS visiting vehicles and the common berthing mechanism.",
  },
};

/** A port or a berth, in the ship frame, for the demo and the sheets to dock a craft (MODULES-438). `direction` is the way it faces; a craft approaches along the opposite. */
export interface ShipPort {
  name: string;
  /** One of the kit's collar classes. A saddle uses the class of its capture ring. */
  collar: "S" | "M" | "L" | "H";
  at: readonly [number, number, number];
  direction: readonly [number, number, number];
  /** Package rocket ids. */
  craft: readonly ("starship" | "dragon")[];
  accepts: "stack" | "tanker" | "crew";
}

const world = (plan: BerthPlan, local: readonly [number, number, number]): readonly [number, number, number] => [plan.at[0] + local[0], plan.at[1] + local[1], plan.at[2] + local[2]];

const faceOut = (plan: BerthPlan, local: readonly [number, number, number]): readonly [number, number, number] => [Math.sign(local[0] - plan.hullX) || 1, 0, 0];

const portsOf = (plan: BerthPlan): readonly ShipPort[] => [
  { name: "Starship berth", collar: "L", at: world(plan, [plan.stack[0], plan.stack[1] + STACK_M / 2, plan.stack[2]]), direction: faceOut(plan, plan.stack), craft: ["starship"], accepts: "stack" },
  { name: "Methane tanker berth", collar: "L", at: world(plan, [plan.tankers[0][0], plan.tankers[0][1] + DRAW.shipHeight / 2, plan.tankers[0][2]]), direction: faceOut(plan, plan.tankers[0]), craft: ["starship"], accepts: "tanker" },
  { name: "Oxygen tanker berth", collar: "L", at: world(plan, [plan.tankers[1][0], plan.tankers[1][1] + DRAW.shipHeight / 2, plan.tankers[1][2]]), direction: faceOut(plan, plan.tankers[1]), craft: ["starship"], accepts: "tanker" },
  { name: "Dragon port", collar: "M", at: world(plan, [plan.dragon[0], plan.dragon[1] + DRAGON_M, plan.dragon[2]]), direction: [0, -1, 0], craft: ["dragon"], accepts: "crew" },
];

/** Each ship's ports and berths, beside the parts that draw them. */
export const BERTHS: Readonly<Record<"a" | "b" | "c", readonly ShipPort[]>> = { a: portsOf(PLANS.a), b: portsOf(PLANS.b), c: portsOf(PLANS.c) };

/** The ports a person can fill, in the berth's own frame. A Dragon meets its collar nose-up. A Starship sits in a saddle, origin at `seat`. */
export function choicePorts(key: "a" | "b" | "c"): { id: string; name: string; at: readonly [number, number, number]; dir: readonly [number, number, number]; models: readonly ("dragon" | "starship")[]; seat?: readonly [number, number, number] }[] {
  const plan = PLANS[key];
  const saddle = (id: string, name: string, at: readonly [number, number, number]) => ({ id, name, at: [0, 0, 0] as const, dir: [0, 1, 0] as const, models: ["starship"] as const, seat: at });
  return [
    saddle("stack", "Starship berth", plan.stack),
    saddle("methane", "Methane tanker berth", plan.tankers[0]),
    saddle("oxygen", "Oxygen tanker berth", plan.tankers[1]),
    { id: "dragon", name: "Dragon port", at: [plan.dragon[0], plan.dragon[1] + DRAGON_M, plan.dragon[2]], dir: [0, 1, 0], models: ["dragon"] },
  ];
}

/** The visiting-craft slot for one ship. */
export function berthSlot(key: "a" | "b" | "c"): ConceptSlot {
  const plan = PLANS[key];
  return {
    slot: "visiting",
    name: "Visiting craft: a Starship, tankers and a Dragon",
    kind: "module",
    at: plan.at,
    height: plan.height,
    diameter: plan.diameter,
    note: plan.note,
    pieces: () => berthPieces(plan, dockedNow.spec === null ? parked(plan) : visitorsOf(ROCKET[key])),
  };
}
