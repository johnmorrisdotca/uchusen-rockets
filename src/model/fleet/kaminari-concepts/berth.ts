// Visiting SpaceX craft, berthed outside the hull the way a station berths a ship: a full Starship stack in clamp saddles, two Starship tankers at separate methane and oxygen couplings, and a Dragon at a port. The craft are the package's own parts at their own size. Nothing here is drawn inside a hull. Pure: no three.js and no DOM.
import { DRAGON_DRAWS, capsule, trunk } from "../../falcon.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { STARSHIP_DRAWS, boosterPieces, shipPieces } from "../../starship.ts";
import { hoop, place, revolve, rod } from "./adapter.ts";
import type { ConceptSlot } from "./common.ts";

const DRAW = STARSHIP_DRAWS.v3;
const DRAGON = DRAGON_DRAWS["dragon-2"];
/** Super Heavy 72.3 m and the ship 52.1 m, the package's Block 3. */
export const STACK_M = DRAW.boosterHeight + DRAW.shipHeight;
const DRAGON_M = DRAGON.trunk + DRAGON.capsule - DRAGON.nest;

let stackCache: Piece[] | null = null;
let tankerCache: Piece[] | null = null;
let dragonCache: Piece[] | null = null;

const stackTemplate = (): Piece[] => (stackCache ??= [...boosterPieces(DRAW), ...place(shipPieces(DRAW), { at: [0, DRAW.boosterHeight, 0] })]);
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

const collar = (x: number, z: number, y: number, r: number): Piece[] => place([hoop("hull-grey", r, y, 0.28, 28, 8)], { at: [x, 0, z] });

/** A clamp saddle: two arms from the hull, a bar under the craft and a pin. */
function saddle(hullX: number, craft: readonly [number, number, number], yUp: number): Piece[] {
  const [x, y0, z] = craft;
  const y = y0 + yUp;
  const dir = Math.sign(x - hullX) || 1;
  const flank = x - dir * 4.7;
  return [
    rod("hull-grey", [hullX, y, z - 3], [flank, y, z - 3], 0.42, 8),
    rod("hull-grey", [hullX, y, z + 3], [flank, y, z + 3], 0.42, 8),
    rod("engine-metal", [flank, y, z - 5.2], [flank, y, z + 5.2], 0.38, 8),
    rod("hull-grey-dark", [flank, y - 4, z], [flank, y + 4, z], 0.5, 8),
  ];
}

const end = (from: Vec3, to: Vec3, material: "hull-orange" | "hull-white" | "pipe-steel"): Piece => rod(material, from, to, 0.32, 8);

/** The berth's pieces in its own frame: the origin is the plan's `at` on the ship. */
export function berthPieces(plan: BerthPlan): Piece[] {
  const out: Piece[] = [...place(stackTemplate(), { at: atOf(plan.stack) })];
  for (const at of plan.tankers) out.push(...place(tankerTemplate(), { at: atOf(at) }));
  out.push(...place(dragonTemplate(), { at: atOf(plan.dragon) }));
  out.push(depot(plan.methane, "hull-orange"), depot(plan.oxygen, "hull-white"));
  out.push(...saddle(plan.hullX, plan.stack, 28), ...saddle(plan.hullX, plan.stack, 78), ...saddle(plan.hullX, plan.stack, 110));
  for (const at of plan.tankers) out.push(...saddle(plan.hullX, at, 18));
  const methaneHead: Vec3 = [plan.methane[0], plan.methane[1] + 28, plan.methane[2]];
  const oxygenHead: Vec3 = [plan.oxygen[0], plan.oxygen[1] + 28, plan.oxygen[2]];
  const tankerFlank = (at: readonly [number, number, number], yUp: number): Vec3 => {
    const dir = Math.sign(at[0] - plan.hullX) || 1;
    return [at[0] - dir * 4.6, at[1] + yUp, at[2]];
  };
  out.push(end(methaneHead, tankerFlank(plan.tankers[0], 20), "hull-orange"), end(oxygenHead, tankerFlank(plan.tankers[1], 20), "hull-white"));
  out.push(...collar(plan.dragon[0], plan.dragon[2], plan.dragon[1] + DRAGON_M, 2.4));
  const dragonFlank: Vec3 = [plan.dragon[0] + Math.sign(plan.hullX - plan.dragon[0] || 1) * 2.1, plan.dragon[1] + 3, plan.dragon[2]];
  out.push(rod("hull-grey", [plan.hullX, plan.dragon[1] + 3, 0], dragonFlank, 0.36, 8));
  out.push(...collar(plan.stack[0], plan.stack[2], plan.stack[1] + DRAW.boosterHeight, 6.4));
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
    note: "Open berths on the starboard truss, ahead of the tank quivers, and a Dragon port on the port side. A Starship stack (the package's Super Heavy and ship, 124.4 m) sits in clamp saddles. Two Starship tankers take separate methane and oxygen depot tanks, which are not the ship's propellant. Nothing is inside the truss. Descends from the ISS visiting vehicles and the common berthing mechanism.",
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
    note: "An exterior berth along the starboard side of the open keel, clear of the hull, and a Dragon port on the port side. The stack is in clamp saddles. Two Starship tankers take separate methane and oxygen couplings. The depot tanks are not the ship's own propellant. Nothing is stored inside the frame. Descends from the ISS visiting vehicles and the common berthing mechanism.",
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
    note: "Exterior berths beside the docked craft, on the open sides of the shaft. The Starship stack is to starboard and the two tankers to port, each tanker at its own depot tank. A Dragon sits at a port forward of the first pair. The Miyamotos stay. Nothing is inside the shaft. Descends from the ISS visiting vehicles and the common berthing mechanism.",
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
  { name: "Starship stack berth", collar: "L", at: world(plan, [plan.stack[0], plan.stack[1] + STACK_M / 2, plan.stack[2]]), direction: faceOut(plan, plan.stack), craft: ["starship"], accepts: "stack" },
  { name: "Methane tanker berth", collar: "L", at: world(plan, [plan.tankers[0][0], plan.tankers[0][1] + DRAW.shipHeight / 2, plan.tankers[0][2]]), direction: faceOut(plan, plan.tankers[0]), craft: ["starship"], accepts: "tanker" },
  { name: "Oxygen tanker berth", collar: "L", at: world(plan, [plan.tankers[1][0], plan.tankers[1][1] + DRAW.shipHeight / 2, plan.tankers[1][2]]), direction: faceOut(plan, plan.tankers[1]), craft: ["starship"], accepts: "tanker" },
  { name: "Dragon port", collar: "M", at: world(plan, [plan.dragon[0], plan.dragon[1] + DRAGON_M, plan.dragon[2]]), direction: [0, -1, 0], craft: ["dragon"], accepts: "crew" },
];

/** Each ship's ports and berths, beside the parts that draw them. */
export const BERTHS: Readonly<Record<"a" | "b" | "c", readonly ShipPort[]>> = { a: portsOf(PLANS.a), b: portsOf(PLANS.b), c: portsOf(PLANS.c) };

/** The visiting-craft slot for one ship. */
export function berthSlot(key: "a" | "b" | "c"): ConceptSlot {
  const plan = PLANS[key];
  return {
    slot: "visiting",
    name: "Visiting craft: Starship stack, tankers and a Dragon",
    kind: "module",
    at: plan.at,
    height: plan.height,
    diameter: plan.diameter,
    note: plan.note,
    pieces: () => berthPieces(plan),
  };
}
