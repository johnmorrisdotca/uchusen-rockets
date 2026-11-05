// The numbers of the three concepts, worked out in one place from what the models hold: counts of tanks, containers, thrusters and reactor cells, times a unit mass or a unit of power. All of them are design targets of this
// package, written up in docs/fleet/kaminari-concepts.md; none is a measurement. The drive follows one rule for the three: a reactor cell gives 6 PW of heat, half of it reaches the exhaust, and the exhaust leaves at
// 0.4 c (the shipped ISV Kaminari's own figure), so thrust = 2 x jet power / exhaust speed. Pure: no three.js and no DOM.
import { C } from "./c.ts";
import { A, THRUSTERS } from "./a.ts";
import { B, containersAcross, tanksAcross } from "./b.ts";
import { PROPELLANT_T_PER_M3, tankVolumeM3 } from "./common.ts";

export const LIGHT_MS = 299_792_458;
export const EXHAUST_C = 0.4;
/** Heat from one reactor cell, watts, and the share that leaves as exhaust. */
export const CELL_W = 6e15;
export const JET_SHARE = 0.5;
/** One container, empty and full, tonnes. */
export const CONTAINER_T = { empty: 600, cargo: 5200 } as const;
/** The crew and passengers every concept carries, as the shipped design does. */
export const PEOPLE = { crew: 640, passengers: 60_000, kgEach: 100 } as const;
export const PROXIMA_LY = 4.37;

export interface ConceptSpec {
  id: "fleet-kaminari" | "fleet-emiake" | "fleet-romaryu";
  letter: "A" | "B" | "C";
  name: string;
  idea: string;
  /** Metres at 100 per cent. */
  length: number;
  beamHull: number;
  beamOverall: number;
  /** The drive: how many thrusters, of what kinds. */
  thrusters: { count: number; layout: string };
  reactorCells: number;
  tanks: number;
  tankM3: number;
  containers: number;
  crewedModules: string;
  /** Tonnes. */
  dryT: number;
  propellantT: number;
  cargoT: number;
  fullT: number;
  thrustN: number;
  /** In g at full mass. */
  accelG: number;
  /** Delta-v of the whole propellant load, as a fraction of c, and the cruise speed of a burn to the half-way point and a brake. */
  deltaVC: number;
  cruiseC: number;
  /** Years on the ship at cruise, to 4.37 light years and counting the burn at both ends. */
  proximaShipYears: number;
  ancestors: readonly string[];
}

const thrustFor = (cells: number): number => (2 * cells * CELL_W * JET_SHARE) / (EXHAUST_C * LIGHT_MS);

function finish(s: Omit<ConceptSpec, "dryT" | "propellantT" | "cargoT" | "fullT" | "thrustN" | "accelG" | "deltaVC" | "cruiseC" | "proximaShipYears"> & { dryT: number }): ConceptSpec {
  const propellantT = Math.round(s.tanks * s.tankM3 * PROPELLANT_T_PER_M3);
  const cargoT = s.containers * CONTAINER_T.cargo;
  const people = ((PEOPLE.crew + PEOPLE.passengers) * PEOPLE.kgEach) / 1000;
  const fullT = s.dryT + propellantT + cargoT + people;
  const thrustN = thrustFor(s.reactorCells);
  const accelG = thrustN / (fullT * 1000 * 9.80665);
  const deltaVC = EXHAUST_C * Math.log(fullT / (fullT - propellantT));
  const cruiseC = deltaVC / 2;
  // time on the ship: accelerate to the cruise speed and brake from it, at the mean acceleration, with the rest at cruise (a classical figure, small speeds: a design target, not relativity)
  const burnS = (cruiseC * LIGHT_MS) / (accelG * 9.80665);
  const burnLy = (0.5 * cruiseC * burnS * 2) / (365.25 * 24 * 3600);
  const cruiseYears = Math.max(0, PROXIMA_LY - burnLy) / cruiseC;
  const proximaShipYears = cruiseYears + (2 * burnS) / (365.25 * 24 * 3600);
  return { ...s, propellantT, cargoT, fullT, thrustN, accelG, deltaVC, cruiseC, proximaShipYears };
}

const tankA = A.quiver.count * A.quiver.tank.count;
const tankB = Array.from({ length: B.tank.groups }, (_, i) => 2 * tanksAcross(B.tank.y + i * B.tank.pitch + B.tank.L)).reduce((a, b) => a + b, 0);
const containersB = Array.from({ length: B.cargo.cells }, (_, i) => 2 * 2 * containersAcross(B.cargo.y + i * B.cargo.deep + 20) + 0).reduce((a, b) => a + b, 0);
const containersBReal = Array.from({ length: B.cargo.cells }, (_, i) => [0, 1].reduce((n, row) => n + 2 * containersAcross(B.cargo.y + i * B.cargo.deep + row * 41), 0)).reduce((a, b) => a + b, 0);
void containersB;

export const SPECS: Readonly<Record<"a" | "b" | "c", ConceptSpec>> = {
  a: finish({
    id: "fleet-kaminari",
    letter: "A",
    name: "Quiver",
    idea: "Thinner cylinders: many slim tanks, containers and drums in rings round one long truss.",
    length: A.length,
    beamHull: 2 * (A.cargo.ringR + 15.6),
    beamOverall: 2 * (A.carousel.ringR + A.carousel.drumR + 2),
    thrusters: { count: THRUSTERS.reduce((n, r) => n + r.count, 0), layout: "19 magnetic-nozzle thrusters: a ring of 12, a ring of 6 and one on the axis, on a thrust plate, with a stack of 12 fusion coil rings behind them" },
    reactorCells: A.reactors.count * A.reactors.rows,
    tanks: tankA,
    tankM3: tankVolumeM3(A.quiver.tank.tankR, A.quiver.tank.length),
    containers: A.cargo.rings * A.cargo.count,
    crewedModules: "two counter-rotating carousels of six slim habitat drums each, and the bow stack",
    // thrusters 19 x 450, engine bay 6,000, coil stack 3,000, reactor cells 12 x 420, shadow shield 25,000, truss 1,512 m x 40 t/m, four fins at 3,000, tank shells 1.2 per cent of the propellant, container frames, carousels 22,800, bow 3,000
    dryT: 19 * 450 + 6000 + 3000 + 12 * 420 + 25_000 + 1512 * 40 + 4 * 3000 + Math.round(tankA * tankVolumeM3(A.quiver.tank.tankR, A.quiver.tank.length) * PROPELLANT_T_PER_M3 * 0.012) + 64 * CONTAINER_T.empty + 22_800 + 3000,
    ancestors: ["ISS Integrated Truss", "NASA Mars transfer vehicle studies (DRA 5.0)", "Nautilus-X centrifuge", "Daedalus coil-held chamber", "Saturn V ring of engines on a thrust structure"],
  }),
  b: finish({
    id: "fleet-emiake",
    letter: "B",
    name: "Keel and frame",
    idea: "A flattened wedge built like a ship's hull: an armoured keel, longerons and ribs, open aft, plated forward.",
    length: B.length - B.grid.plane + 8,
    beamHull: 2 * B.w0,
    beamOverall: 2 * (B.w0 + 2),
    thrusters: { count: B.grid.cols * B.grid.rows.length, layout: "27 magnetic-nozzle thrusters in three rows of nine across the stern face" },
    reactorCells: B.reactors.rows * B.reactors.cols,
    tanks: tankB,
    tankM3: tankVolumeM3(B.tank.R, B.tank.L),
    containers: containersBReal,
    crewedModules: "the plated forward hull with its glazed gallery, and the bridge tower",
    dryT: 27 * 330 + 8000 + 24 * 420 + 1500 * 55 + 3 * 2800 + Math.round(tankB * tankVolumeM3(B.tank.R, B.tank.L) * PROPELLANT_T_PER_M3 * 0.012) + containersBReal * CONTAINER_T.empty + 60_000 + 3000,
    ancestors: ["a ship's keel and frames", "Space Shuttle payload-bay longerons", "ISS pressurised modules' plating", "NASA Mars transfer vehicle studies' radiators"],
  }),
  c: finish({
    id: "fleet-romaryu",
    letter: "C",
    name: "Carrier",
    idea: "A carrier spine with four Miyamoto-size craft docked round it in two pairs.",
    length: C.length,
    beamHull: 2 * (C.craft.rKeel + 74),
    beamOverall: 2 * 165 * C.ring.scale + 4,
    thrusters: { count: 1 + 4 * 7, layout: "one large magnetic-nozzle thruster on the axis and four flank pods of seven, on outriggers" },
    reactorCells: C.reactors.count * C.reactors.rows,
    tanks: 2 * C.barrels.count,
    tankM3: tankVolumeM3(C.barrels.R, C.barrels.L),
    containers: 0,
    crewedModules: "two counter-rotating habitat rings, the bow stack, and four docked craft of 144 crew each",
    // the carrier: thrusters 29 x 400, pod and outrigger frames 12,000, coil stack 3,000, 8 reactor cells x 420, shadow shield 30,000, shaft 1,296 m x 70 t/m, barrels, rings 2 x 40,000, bow 8,000; and the four craft at their 21,000 t inert mass each
    dryT: 29 * 400 + 12_000 + 3000 + 8 * 420 + 30_000 + 1296 * 70 + Math.round(12 * tankVolumeM3(C.barrels.R, C.barrels.L) * PROPELLANT_T_PER_M3 * 0.012) + 80_000 + 8000 + 4 * 21_000,
    ancestors: ["Space Shuttle on its carrier aircraft", "ISS visiting-vehicle ports", "Saturn V outboard engines on outriggers", "Nautilus-X docked modules", "ISV Miyamoto, the Romurusu class"],
  }),
};

export const CONCEPT_KEYS = ["a", "b", "c"] as const;
export type ConceptKey = (typeof CONCEPT_KEYS)[number];
