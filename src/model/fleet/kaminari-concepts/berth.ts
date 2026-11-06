// Visiting craft, berthed outside the hull the way a station berths a ship: a Starship ship in clamp saddles, two Starship tankers at separate methane and oxygen couplings, and a Dragon at a port. The craft are the package's own parts at their own size. Nothing here is drawn inside a hull. Pure: no three.js and no DOM.
import { DRAGON_DRAWS, capsule, trunk } from "../../falcon.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { STARSHIP_DRAWS, shipPieces } from "../../starship.ts";
import { berthArm, berthCradle, deepTruss, dockingPort, transferCoupling } from "../dockJoints.ts";
import { dockedNow, visitorsOf } from "../dockedState.ts";
import { place, revolve } from "./adapter.ts";
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

const depot = (at: readonly [number, number, number], material: "hull-orange" | "hull-white"): Piece => {
  const [x, y, z] = at;
  return revolve(material, [[0.4, y], [6, y + 3], [6, y + 25], [0.4, y + 28]], 24, [x, z], { body: true, outline: true });
};

/** A cradle on a deep truss. The truss runs from the hull to the craft's flank; the pads and the craft's latches do the holding. */
function saddle(hullX: number, craft: readonly [number, number, number], yUp: number): Piece[] {
  const [x, y0, z] = craft;
  const y = y0 + yUp;
  const dir = (Math.sign(x - hullX) || 1) as 1 | -1;
  const flank = x - dir * 4.7;
  const face: Vec3 = [flank, y, z];
  return [...deepTruss([hullX, y, z], face, 4), ...berthCradle(face, dir)];
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
  out.push(depot(plan.methane, "hull-orange"), depot(plan.oxygen, "hull-white"));
  out.push(...saddle(plan.hullX, plan.stack, 10), ...saddle(plan.hullX, plan.stack, 26), ...saddle(plan.hullX, plan.stack, 42));
  for (const at of plan.tankers) {
    out.push(...saddle(plan.hullX, at, 18));
    out.push(...place(transferCoupling(), { at: [at[0], at[1], at[2]] }));
  }
  const nose: Vec3 = [plan.dragon[0], plan.dragon[1] + DRAGON_M, plan.dragon[2]];
  out.push(...place(dockingPort("M", 2, -1), { at: nose }));
  out.push(...deepTruss([plan.hullX, nose[1] + 2, 0], [nose[0], nose[1] + 2, nose[2]], 3));
  const reach = Math.sign(plan.stack[0] - plan.hullX) || 1;
  out.push(...place(berthArm(), { at: [plan.hullX, plan.stack[1] + 18, plan.stack[2]], yaw: reach > 0 ? 0 : 180 }));
  return out;
}

const PLANS: Record<"a" | "b" | "c", BerthPlan> = {
  a: {
    at: [0, 210, 0],
    hullX: 16,
    stack: [42, 0, 0],
    tankers: [[42, 140, 0], [42, 208, 0]],
    dragon: [-36, 6, 0],
    methane: [58, 146, 7],
    oxygen: [58, 214, -7],
    height: 262,
    diameter: 108,
    note: "Open berths on the starboard truss, ahead of the tank quivers, and a Dragon port on the port side. A Starship ship (the package's Block 3, 52.1 m) sits in clamp saddles. Two Starship tankers take separate methane and oxygen depot tanks, which are not the ship's propellant. Nothing is inside the truss. Descends from the ISS visiting vehicles and the common berthing mechanism.",
  },
  b: {
    at: [0, 170, 0],
    hullX: 78,
    stack: [98, 0, 0],
    tankers: [[96, 150, 0], [94, 220, 0]],
    dragon: [-98, 8, 0],
    methane: [112, 156, 8],
    oxygen: [110, 226, -8],
    height: 272,
    diameter: 219,
    note: "An exterior berth along the starboard side of the open keel, clear of the hull, and a Dragon port on the port side. The ship is in clamp saddles. Two Starship tankers take separate methane and oxygen couplings. The depot tanks are not the ship's own propellant. Nothing is stored inside the frame. Descends from the ISS visiting vehicles and the common berthing mechanism.",
  },
  c: {
    at: [0, 600, 0],
    hullX: 22,
    stack: [84, 0, 0],
    tankers: [[-84, 8, 0], [-84, 76, 0]],
    dragon: [0, -78, 76],
    methane: [-100, 14, 10],
    oxygen: [-100, 82, -10],
    height: 128,
    diameter: 200,
    note: "Exterior berths beside the docked craft, on the open sides of the shaft. The Starship ship is to starboard and the two tankers to port, each tanker at its own depot tank. A Dragon sits at a port forward of the first pair. The Miyamotos stay. Nothing is inside the shaft. Descends from the ISS visiting vehicles and the common berthing mechanism.",
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
