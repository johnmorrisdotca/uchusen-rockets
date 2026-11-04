// Engine cards: one card for each engine type of the kit, as data every ship shares, with numbers that agree (thrust = mass flow x exhaust speed = mass flow x specific impulse x g0), and the performance of a ship
// that follows from its modules: its thrust, its acceleration, how fast its fuel can take it and the trip to Proxima Centauri in ship time and in Earth's. Where the exhaust is a fraction of
// the speed of light the card says so. Pure: no three.js and no DOM.
import { assemble } from "./kit.ts";
import type { ShipList } from "./types.ts";

/**
 * Standard gravity in m/s^2.
 *
 * @example
 * ```ts
 * import { G0 } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(G0);
 * ```
 */
export const G0 = 9.80665;
/** The speed of light, m/s. */
export const C = 299_792_458;
/** A light year in metres, a Julian year in seconds. */
export const LIGHT_YEAR = 9_460_730_472_580_800;
export const YEAR = 31_557_600;
/**
 * The distance to Proxima Centauri in light years.
 *
 * @example
 * ```ts
 * import { PROXIMA_LY } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(PROXIMA_LY);
 * ```
 */
export const PROXIMA_LY = 4.2465;

/**
 * What an engine does on a ship.
 *
 * @example
 * ```ts
 * import type { EngineRole } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const role: EngineRole = "main";
 * console.log(role);
 * ```
 */
export type EngineRole = "main" | "braking" | "manoeuvring" | "vernier";

/**
 * One engine type: what it burns, how hard it pushes and how it runs. The numbers agree: `thrust` (newtons) is `massFlow` (kg/s) times `isp` (seconds) times g0, and `exhaust` is `isp` times g0.
 *
 * @example
 * ```ts
 * import { ENGINE_CARDS, type EngineCard } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const card: EngineCard = ENGINE_CARDS["fusion-main"];
 * console.log(card.name, card.thrust / 1e6, "MN", card.exhaustOfC);
 * ```
 */
export interface EngineCard {
  id: string;
  name: string;
  role: EngineRole;
  /** The kit module that carries it, and how many engines that module has. */
  module: string;
  count: number;
  /** Thrust of one engine in newtons. */
  thrust: number;
  /** Specific impulse in seconds. */
  isp: number;
  /** Propellant used by one engine at full thrust, kg/s. */
  massFlow: number;
  /** Exhaust speed in m/s, and as a fraction of the speed of light. */
  exhaust: number;
  exhaustOfC: number;
  /** What it burns and how much its module holds, in tonnes, when full. */
  fuel: string;
  fuelCapacity: number;
  operation: "continuous" | "pulsed";
  /** Pulses a second, for a pulsed engine. */
  pulseHz?: number;
  /** Power in the jet, watts. */
  jetPower: number;
  /** What it is and what its limits are. */
  note: string;
}

const card = (c: Omit<EngineCard, "massFlow" | "exhaust" | "exhaustOfC" | "jetPower">): EngineCard => {
  const exhaust = c.isp * G0;
  return { ...c, massFlow: c.thrust / exhaust, exhaust, exhaustOfC: exhaust / C, jetPower: 0.5 * c.thrust * exhaust };
};

/**
 * The engine cards, by id. A magnetic-nozzle fusion drive whose exhaust is a few percent of the speed of light, a braking drive, a plasma thruster for manoeuvring and cold-plasma verniers.
 *
 * @example
 * ```ts
 * import { ENGINE_CARDS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * for (const card of Object.values(ENGINE_CARDS)) console.log(card.id, card.role, card.count, (card.thrust / 1e6).toFixed(1), "MN");
 * ```
 */
export const ENGINE_CARDS: Readonly<Record<string, EngineCard>> = {
  "fusion-main": card({
    id: "fusion-main",
    name: "Magnetic-nozzle fusion drive, main",
    role: "main",
    module: "engine-fusion-7",
    count: 7,
    thrust: 30e6,
    isp: 1.2e6,
    fuel: "deuterium and helium-3, with deuterium reaction mass",
    fuelCapacity: 4300,
    operation: "continuous",
    note: "A fusion plasma held by a superconducting coil and let out through a magnetic nozzle; its exhaust is about 4% of the speed of light. The module's count is for the 7-nozzle cluster; the 3 and 4-nozzle clusters carry the same engine.",
  }),
  "fusion-braking": card({
    id: "fusion-braking",
    name: "Fusion drive, braking",
    role: "braking",
    module: "engine-fusion-1",
    count: 1,
    thrust: 90e6,
    isp: 0.9e6,
    fuel: "deuterium and helium-3, with deuterium reaction mass",
    fuelCapacity: 2100,
    operation: "continuous",
    note: "One wide nozzle that trades exhaust speed for thrust: a heavier burn for slowing down at the far end.",
  }),
  "plasma-manoeuvring": card({
    id: "plasma-manoeuvring",
    name: "Plasma thruster pod, manoeuvring",
    role: "manoeuvring",
    module: "thruster-pod-s",
    count: 1,
    thrust: 1.2e6,
    isp: 5e4,
    fuel: "hydrogen plasma",
    fuelCapacity: 520,
    operation: "continuous",
    note: "An electrodeless plasma thruster in a pod on a port: the slow, fine push for docking and trim.",
  }),
  "plasma-vernier": card({
    id: "plasma-vernier",
    name: "Cold-plasma vernier",
    role: "vernier",
    module: "rcs-ring-m",
    count: 8,
    thrust: 0.15e6,
    isp: 3000,
    fuel: "hydrogen gas",
    fuelCapacity: 40,
    operation: "pulsed",
    pulseHz: 20,
    note: "Eight blocks in a ring that fire in short pulses to turn and trim the ship.",
  }),
};

/**
 * One line of a ship's engine table: a role, the card, how many engines and their thrust together.
 *
 * @example
 * ```ts
 * import { engineTable, type EngineRow, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const row: EngineRow = engineTable(SAMPLE_SHIPS.scout)[0];
 * console.log(row.role, row.count, row.thrust);
 * ```
 */
export interface EngineRow {
  role: EngineRole;
  card: EngineCard;
  /** Engines of this card on the ship, and their thrust together, in newtons. */
  count: number;
  thrust: number;
}

/**
 * The engine table of a ship: for each role, which engine card, how many engines and what thrust, from the modules in its list.
 *
 * @param ship The ship's list of modules.
 * @returns One row for each engine card the ship carries.
 * @example
 * ```ts
 * import { engineTable, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * for (const row of engineTable(SAMPLE_SHIPS.hauler)) console.log(row.role, row.count, (row.thrust / 1e6).toFixed(0), "MN");
 * ```
 */
export function engineTable(ship: ShipList): EngineRow[] {
  const rows = new Map<string, EngineRow>();
  const nozzles: Record<string, number> = { "engine-fusion-1": 1, "engine-fusion-3": 3, "engine-fusion-4": 4, "engine-fusion-7": 7 };
  for (const spot of ship) {
    const cardOf = Object.values(ENGINE_CARDS).find((one) => one.module === spot.module) ?? (spot.module in nozzles ? ENGINE_CARDS[spot.module === "engine-fusion-1" ? "fusion-braking" : "fusion-main"] : undefined);
    if (!cardOf) continue;
    const count = spot.module in nozzles ? nozzles[spot.module] : cardOf.count;
    const row = rows.get(cardOf.id) ?? { role: cardOf.role, card: cardOf, count: 0, thrust: 0 };
    row.count += count;
    row.thrust += count * cardOf.thrust;
    rows.set(cardOf.id, row);
  }
  return [...rows.values()];
}

/**
 * What a ship can do, from its modules and engine cards.
 *
 * @example
 * ```ts
 * import { performanceOf, type Performance, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const p: Performance = performanceOf(SAMPLE_SHIPS.scout);
 * console.log(p.accelerationFull, p.cruise);
 * ```
 */
export interface Performance {
  /** Dry and full mass in tonnes. */
  dry: number;
  full: number;
  /** Thrust of the main drive in newtons, and the acceleration it gives at full and at dry mass, in g. */
  thrust: number;
  accelerationFull: number;
  accelerationDry: number;
  /** The exhaust speed of the main drive as a fraction of c. */
  exhaustOfC: number;
  /** The most speed its fuel buys going one way, and the cruise speed it can reach and still stop, as fractions of c (relativistic rocket equation). */
  topSpeed: number;
  cruise: number;
  /** Fuel flow of the main drive at full thrust, kg/s, and how long the fuel lasts at that rate, in days. */
  massFlow: number;
  burnDays: number;
}

/**
 * The relativistic rocket equation: the speed, as a fraction of c, that a rocket with exhaust speed `exhaustOfC` reaches burning from `full` down to `dry` mass.
 *
 * @param exhaustOfC Exhaust speed as a fraction of the speed of light.
 * @param full The mass before the burn.
 * @param dry The mass after it.
 * @returns The speed as a fraction of c.
 * @example
 * ```ts
 * import { rocketSpeed } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(rocketSpeed(0.04, 10, 1).toFixed(3));
 * ```
 */
export const rocketSpeed = (exhaustOfC: number, full: number, dry: number): number => Math.tanh(exhaustOfC * Math.log(full / dry));

/**
 * What a ship can do: from the mass of its modules and the thrust of its main engines. `fuelFraction` is how much of the propellant is spent on the voyage (all of it by default).
 *
 * @param ship The ship's list of modules.
 * @param fuelFraction The part of the propellant used.
 * @returns Thrust, acceleration, exhaust speed, the speeds its fuel allows and its burn time.
 * @example
 * ```ts
 * import { performanceOf, SAMPLE_SHIPS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const p = performanceOf(SAMPLE_SHIPS.hauler);
 * console.log(p.accelerationFull.toFixed(3), "g", p.cruise.toFixed(2), "c");
 * ```
 */
export function performanceOf(ship: ShipList, fuelFraction = 1): Performance {
  const built = assemble(ship);
  const dry = built.mass;
  const full = built.mass + built.propellant * fuelFraction;
  const rows = engineTable(ship).filter((row) => row.role === "main");
  const thrust = rows.reduce((sum, row) => sum + row.thrust, 0);
  const flow = rows.reduce((sum, row) => sum + row.count * row.card.massFlow, 0);
  const exhaust = thrust / (flow || 1) / C;
  return {
    dry,
    full,
    thrust,
    accelerationFull: thrust / (full * 1000) / G0,
    accelerationDry: thrust / (dry * 1000) / G0,
    exhaustOfC: exhaust,
    topSpeed: rocketSpeed(exhaust, full, dry),
    cruise: Math.tanh(0.5 * exhaust * Math.log(full / dry)),
    massFlow: flow,
    burnDays: flow > 0 ? (built.propellant * fuelFraction * 1000) / flow / 86400 : 0,
  };
}

/**
 * A trip as ship time and Earth time.
 *
 * @example
 * ```ts
 * import { trip, type Trip } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const t: Trip = trip(4.37, 1);
 * console.log(t.ship, t.earth, t.peak);
 * ```
 */
export interface Trip {
  /** Years by the ship's clocks and by the clocks of the place it left. */
  ship: number;
  earth: number;
  /** The speed it cruises at, as a fraction of c (the most it reaches when it never cruises). */
  peak: number;
  /** Years under power in each of the two burns, by the ship's clock. */
  burn: number;
}

/**
 * A trip of `distance` light years that accelerates at `a` (in g) up to the cruise speed `cruise` (a fraction of c), coasts, and brakes at the same rate: constant proper acceleration, so the clocks follow the
 * hyperbolic motion of special relativity. With no cruise limit it turns round at halfway, as `flip-and-burn`.
 *
 * @param distance Light years.
 * @param a Acceleration in g.
 * @param cruise The most speed, as a fraction of c, less than 1. Left out: none.
 * @returns Ship years, Earth years, the peak speed and the years of burning.
 * @example
 * ```ts
 * import { PROXIMA_LY, trip } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const t = trip(PROXIMA_LY, 1);
 * console.log(t.ship.toFixed(1), "years aboard,", t.earth.toFixed(1), "years on Earth");
 * ```
 */
export function trip(distance: number, a: number, cruise = 0.999999): Trip {
  const k = C / (a * G0);
  const d = distance * LIGHT_YEAR;
  // turning round at halfway: the rapidity the half-way point asks for
  const phiHalf = Math.acosh(1 + d / 2 / (C * k));
  if (Math.tanh(phiHalf) <= cruise) return { ship: (2 * k * phiHalf) / YEAR, earth: (2 * k * Math.sinh(phiHalf)) / YEAR, peak: Math.tanh(phiHalf), burn: (2 * k * phiHalf) / YEAR };
  // one burn up to the cruise speed, a coast, a burn to stop
  const phi = Math.atanh(cruise);
  const burnX = C * k * (Math.cosh(phi) - 1);
  const coastT = (d - 2 * burnX) / (cruise * C);
  return { ship: (2 * k * phi + coastT / Math.cosh(phi)) / YEAR, earth: (2 * k * Math.sinh(phi) + coastT) / YEAR, peak: cruise, burn: (2 * k * phi) / YEAR };
}
