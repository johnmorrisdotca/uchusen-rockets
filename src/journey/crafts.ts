// The craft a trip can fly: the real rockets with what their makers and NASA publish, and the SPX fleet with what its design bible says. A number names its source, or says it is an estimate and why: never a bare number.
import type { SourceId } from "../data/sources.ts";

/**
 * A number with where it is from. Either `source` names a source of this package, or `estimate` says what it is worked from; one of the two is always there.
 *
 * @example
 * ```ts
 * import { CRAFTS } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const saturn = CRAFTS.find((craft) => craft.id === "saturn-v");
 * const tli = saturn?.drive === "ballistic" ? saturn.capacityKg.tli : undefined;
 * console.log(tli?.value, tli?.source);
 * ```
 */
export interface Quantity {
  value: number;
  source: SourceId | null;
  /** For a number that no source gives: what it is worked from. Shown with "est." wherever the number is. */
  estimate?: string;
  note?: string;
}

/** The kinds of orbit a launch vehicle's payload figure is given for, lowest energy first. */
export type CapacityKind = "leo" | "gto" | "tli" | "mars";

export interface Payload {
  name: string;
  massKg: Quantity;
  /** The thrust of the engine that brakes it at arrival, newtons. */
  thrustN?: Quantity;
  /** What that engine can change its speed by, metres a second. */
  dvMs?: Quantity;
  /** Used where no thrust is given: the braking acceleration, in g. */
  brakeG?: Quantity;
  /** The specific impulse of the braking engine, seconds: what turns a speed change into propellant. */
  ispS?: Quantity;
}

/**
 * What of a rocket is still there at one point of a trip, drawn with the rocket's own parts: the whole rocket, or the slots that are left, of the rocket and variant named.
 *
 * @example
 * ```ts
 * import type { Stage } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const left: Stage = { rocket: "saturn-v", variant: "saturn-v", slots: ["service-module", "capsule"], name: "Apollo command and service module" };
 * console.log(left.name);
 * ```
 */
export interface Stage {
  rocket: string;
  variant: string;
  /** The slots that are left, closed up into one stack; null for the whole rocket. */
  slots: readonly string[] | null;
  name: string;
}

/**
 * A rocket that flies a Hohmann transfer: its published payloads and the spacecraft it carries.
 *
 * @example
 * ```ts
 * import { CRAFTS } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(CRAFTS.filter((craft) => craft.drive === "ballistic").map((craft) => craft.name));
 * ```
 */
export interface BallisticCraft {
  id: string;
  name: string;
  kind: "real";
  drive: "ballistic";
  /** The rocket and variant the stage draws. */
  rocket: string;
  variant: string;
  capacityKg: Partial<Record<CapacityKind, Quantity>>;
  payload: Payload;
  /** Seconds from lift-off to the parking orbit. */
  ascentS: Quantity;
  /** Seconds of the departure burn, where a source gives it. */
  departureBurnS?: Quantity;
  /** Seconds the craft takes to turn round before the braking burn. */
  flipS: Quantity;
  /** What is left after each burn: the whole rocket at lift-off, the upper stage with its payload for the departure burn and the coast, the payload alone from the turn round. */
  stages: { launch: Stage; upper: Stage; payload: Stage };
  /** Which way the drawing looks: `front` for a rocket with boosters on its sides, so that all of its cores show. */
  launchView: "side" | "front";
}

/**
 * A ship that burns all the way: constant acceleration, a turn round at the halfway point, the same acceleration to stop.
 *
 * @example
 * ```ts
 * import { CRAFTS } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const ship = CRAFTS.find((craft) => craft.drive === "continuous");
 * console.log(ship?.name);
 * ```
 */
export interface ContinuousCraft {
  id: string;
  name: string;
  kind: "fleet";
  drive: "continuous";
  rocket: string;
  variant: string;
  /** Proper acceleration, in g. */
  g: Quantity;
  /** Exhaust speed as a fraction of the speed of light. */
  exhaustOfC: Quantity;
  dryT: Quantity;
  payloadT: Quantity;
  propellantT: Quantity;
  flipS: Quantity;
}

/**
 * A craft the journey can fly: a rocket on a Hohmann transfer, or a ship that burns all the way.
 *
 * @example
 * ```ts
 * import { CRAFTS, type Craft } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const first: Craft = CRAFTS[0]!;
 * console.log(first.name, first.drive);
 * ```
 */
export type Craft = BallisticCraft | ContinuousCraft;

const ascentEstimate = (seconds: number): Quantity => ({ value: seconds, source: null, estimate: "A rocket of this class reaches orbit in about eight to nine minutes; this craft's own figure is not in the sources read." });

/**
 * Every craft the journey offers: three real rockets and one ship of the SPX fleet. A figure names its source, or is marked as an estimate and says what it is worked from.
 *
 * @example
 * ```ts
 * import { CRAFTS } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(CRAFTS.map((craft) => craft.id));
 * ```
 */
export const CRAFTS: readonly Craft[] = [
  {
    id: "saturn-v",
    name: "Saturn V",
    kind: "real",
    drive: "ballistic",
    rocket: "saturn-v",
    variant: "saturn-v",
    capacityKg: {
      leo: { value: 140_000, source: "wikipedia-saturn-v", note: "Includes the S-IVB stage and the propellant for trans-lunar injection." },
      tli: { value: 43_500, source: "wikipedia-saturn-v" },
    },
    payload: {
      name: "Apollo command and service module with the lunar module",
      massKg: { value: 43_500, source: "wikipedia-saturn-v", note: "The trans-lunar payload." },
      thrustN: { value: 91_189, source: "wikipedia-apollo-csm", note: "The service propulsion engine, 20,500 lbf." },
      ispS: { value: 314, source: "wikipedia-apollo-csm", note: "The service propulsion engine's specific impulse." },
    },
    ascentS: { value: 700, source: "wikipedia-saturn-v", note: "The third stage's first cut-off, about 11 minutes 40 seconds after lift-off." },
    departureBurnS: { value: 350, source: "wikipedia-saturn-v", note: "The article says the third stage burned for almost six minutes for trans-lunar injection." },
    flipS: { value: 120, source: null, estimate: "Transposition, docking and extraction took tens of minutes; the turn before a braking burn is taken as two minutes." },
    launchView: "side",
    stages: {
      launch: { rocket: "saturn-v", variant: "saturn-v", slots: null, name: "Saturn V" },
      upper: { rocket: "saturn-v", variant: "saturn-v", slots: ["third-stage", "adapter", "service-module", "capsule"], name: "S-IVB with the Apollo spacecraft" },
      payload: { rocket: "saturn-v", variant: "saturn-v", slots: ["service-module", "capsule"], name: "Apollo command and service module" },
    },
  },
  {
    id: "sls",
    name: "Space Launch System",
    kind: "real",
    drive: "ballistic",
    rocket: "sls",
    variant: "block-1",
    capacityKg: {
      leo: { value: 95_000, source: "wikipedia-sls" },
      tli: { value: 27_000, source: "wikipedia-sls", note: "59,500 lb." },
    },
    payload: {
      name: "Orion with its service module",
      massKg: { value: 26_375, source: "wikipedia-orion", note: "After separation from the upper stage." },
      thrustN: { value: 26_600, source: "wikipedia-esm", note: "The AJ10 main engine of the European Service Module." },
      dvMs: { value: 1_050, source: "wikipedia-orion", note: "What NASA's interface document says Orion can change its speed by after the upper stage." },
    },
    ascentS: ascentEstimate(480),
    flipS: { value: 120, source: null, estimate: "The turn before a braking burn is taken as two minutes." },
    launchView: "front",
    stages: {
      launch: { rocket: "sls", variant: "block-1", slots: null, name: "Space Launch System" },
      upper: { rocket: "sls", variant: "block-1", slots: ["upper-stage", "service-module", "capsule"], name: "Upper stage with Orion" },
      payload: { rocket: "sls", variant: "block-1", slots: ["service-module", "capsule"], name: "Orion" },
    },
  },
  {
    id: "falcon-heavy",
    name: "Falcon Heavy",
    kind: "real",
    drive: "ballistic",
    rocket: "falcon-heavy",
    variant: "falcon-heavy",
    capacityKg: {
      leo: { value: 63_800, source: "wikipedia-falcon-heavy", note: "With every stage expended." },
      gto: { value: 26_700, source: "wikipedia-falcon-heavy" },
      mars: { value: 16_800, source: "wikipedia-falcon-heavy" },
    },
    payload: {
      name: "A spacecraft of the Mars-transfer payload mass",
      massKg: { value: 16_800, source: "wikipedia-falcon-heavy", note: "The Mars figure." },
      brakeG: { value: 0.2, source: null, estimate: "The article names no spacecraft, so no engine: 0.2 g is a typical figure for a storable-propellant main engine on a craft of this mass." },
    },
    ascentS: ascentEstimate(540),
    flipS: { value: 120, source: null, estimate: "The turn before a braking burn is taken as two minutes." },
    launchView: "front",
    stages: {
      launch: { rocket: "falcon-heavy", variant: "falcon-heavy", slots: null, name: "Falcon Heavy" },
      upper: { rocket: "falcon-9", variant: "block-5", slots: ["second-stage", "fairing"], name: "Upper stage with its payload" },
      payload: { rocket: "falcon-9", variant: "block-5", slots: ["fairing"], name: "The payload in its fairing" },
    },
  },
  {
    id: "kaminari",
    name: "ISV Kaminari, SPX-207",
    kind: "fleet",
    drive: "continuous",
    rocket: "fleet-02",
    variant: "fleet-02",
    g: { value: 0.015, source: "uchusen-fleet-ship-02", note: "Rated proper acceleration." },
    exhaustOfC: { value: 0.4, source: "uchusen-fleet-ship-02", note: "The fusion torch's effective exhaust speed." },
    dryT: { value: 1_100_000, source: "uchusen-fleet-ship-02" },
    payloadT: { value: 1_000_000, source: "uchusen-fleet-ship-02" },
    propellantT: { value: 6_350_000, source: "uchusen-fleet-ship-02" },
    flipS: { value: 600, source: null, estimate: "A ship 1,820 m long turned end for end by its vernier clusters: ten minutes." },
  },
];

/**
 * What of a craft is left at a phase of its trip, to draw: the whole rocket until the ascent is over, the upper stage with its payload for the departure burn and the coast, and the payload alone from the turn round. A ship that burns all the way is whole throughout.
 *
 * @param craft A craft.
 * @param phase The phase of the trip, such as `coast`.
 * @returns The rocket, variant and slots to draw, and a name for them.
 * @example
 * ```ts
 * import { craftOf, stageOf } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const saturn = craftOf("saturn-v")!;
 * console.log(stageOf(saturn, "ascent").name, stageOf(saturn, "coast").name, stageOf(saturn, "brake").name);
 * ```
 */
export function stageOf(craft: Craft, phase: string): Stage {
  if (craft.drive === "continuous") return { rocket: craft.rocket, variant: craft.variant, slots: null, name: craft.name };
  if (phase === "burn" || phase === "coast") return craft.stages.upper;
  if (phase === "flip" || phase === "brake" || phase === "flyby" || phase === "arrival") return craft.stages.payload;
  return craft.stages.launch;
}

/**
 * A craft by its id.
 *
 * @param id A craft's id.
 * @returns The craft, or undefined when there is none.
 * @example
 * ```ts
 * import { craftOf } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(craftOf("sls")?.name, craftOf("nothing"));
 * ```
 */
export const craftOf = (id: string): Craft | undefined => CRAFTS.find((craft) => craft.id === id);
