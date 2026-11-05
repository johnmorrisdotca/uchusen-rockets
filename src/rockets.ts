// The catalogue: which rockets there are, their variants with sourced sizes, and which are still to be built. All data, all typed. Pure.
import { DRAGON_VARIANTS } from "./data/dragon.ts";
import { SHIP_02_VARIANTS } from "./data/ship02.ts";
import { FALCON_HEAVY_VARIANTS, FALCON_9_VARIANTS } from "./data/falcon.ts";
import { FALCON_1_VARIANTS } from "./data/falcon1.ts";
import { GRASSHOPPER_VARIANTS } from "./data/grasshopper.ts";
import { SATURN_V_VARIANTS } from "./data/saturn.ts";
import { SHUTTLE_VARIANTS } from "./data/shuttle.ts";
import { SLS_VARIANTS } from "./data/sls.ts";
import { NEW_GLENN_VARIANTS } from "./data/newglenn.ts";
import { ELECTRON_VARIANTS } from "./data/electron.ts";
import { SOYUZ_VARIANTS } from "./data/soyuz.ts";
import { DRONESHIP_VARIANTS, LANDING_ZONE_VARIANTS } from "./data/landing.ts";
import { TOWER_VARIANTS } from "./data/tower.ts";
import { STARBASE_VARIANTS } from "./data/starbase.ts";
import { LUNAR_MODULE_VARIANTS } from "./data/lunarmodule.ts";
import { APOLLO_SOYUZ_VARIANTS } from "./data/apollosoyuz.ts";
import { GEMINI_VARIANTS } from "./data/gemini.ts";
import { MERCURY_VARIANTS } from "./data/mercury.ts";
import { JUPITER_C_VARIANTS } from "./data/jupiterc.ts";
import { ISS_VARIANTS } from "./data/iss.ts";
import { HUBBLE_VARIANTS } from "./data/hubble.ts";
import { STARSHIP_VARIANTS } from "./data/starship.ts";
import { FLEET_KIT_ROCKETS, FLEET_SLOT_NAMES } from "./data/fleet.ts";
import { SHIP_01_INSET_ROCKET, SHIP_01_SLOT_NAMES, SHIP_01_VARIANTS } from "./data/ship-01.ts";
import { ARIAKE_VARIANTS, SHIP_03_INSET_ROCKET, SHIP_03_SLOT_NAMES, SHIP_03_VARIANTS } from "./data/ship-03.ts";
import { MADE_BY, type MakerId } from "./data/makers.ts";
import type { Figure, Variant } from "./data/types.ts";
import type { SourceId } from "./data/sources.ts";

/**
 * Whether a rocket is `built` (it has a shape) or `planned` (it has facts and no shape yet).
 *
 * @example
 * ```ts
 * import { ROCKETS, type RocketStatus } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const status: RocketStatus | undefined = ROCKETS["starship"]?.status;
 * console.log(status);
 * ```
 */
export type RocketStatus = "built" | "planned";

/**
 * One rocket: its id and name, its variants, its default variant, the group it is listed under and who made it.
 *
 * @example
 * ```ts
 * import { ROCKETS, type RocketEntry } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const starship: RocketEntry | undefined = ROCKETS["starship"];
 * console.log(starship?.name, starship?.variants.map((variant) => variant.id));
 * ```
 */
export interface RocketEntry {
  id: string;
  name: string;
  status: RocketStatus;
  variants: readonly Variant[];
  defaultVariant: string;
  /** Which group the demo lists it under. */
  maker: MakerId;
  /** Whose it is and who built it, as its source says, or a blank. */
  madeBy: Figure<string>;
}

/**
 * A rocket on the list with no mesh yet: its name and the sourced facts to build it from.
 *
 * @example
 * ```ts
 * import { PLANNED_ROCKETS, type PlannedRocket } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const planned: PlannedRocket | undefined = PLANNED_ROCKETS[0];
 * console.log(planned?.name);
 * ```
 */
export interface PlannedRocket {
  id: string;
  name: string;
  status: "planned";
  height: Figure;
  diameter: Figure;
  firstFlight: Figure<string>;
  source: SourceId;
}

/** Craft that fly in space: seen from any side, from straight above or below. Everything else stands on the ground or the sea, and keeps the ground in view. */
const IN_SPACE = new Set(["dragon", "lunar-module", "apollo-soyuz", "gemini", "mercury", "iss", "hubble"]);

/** Gives each variant its `view.tiltMax`: 90 degrees for a craft in space and the fleet, 45 for the rest. */
function withTilt(rockets: Record<string, RocketEntry>): Record<string, RocketEntry> {
  return Object.fromEntries(
    Object.entries(rockets).map(([id, rocket]) => {
      const tiltMax = IN_SPACE.has(id) || id in FLEET_KIT_ROCKETS || id.startsWith("fleet-") ? 90 : 45;
      return [id, { ...rocket, variants: rocket.variants.map((variant) => ({ ...variant, view: { tiltMax } })) }];
    }),
  );
}

/**
 * Every rocket that has a shape, by id, each with its variants. Add a rocket here and the element, the drawing, the fit check and the demo all read it.
 *
 * @example
 * ```ts
 * import { ROCKETS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(Object.keys(ROCKETS).slice(0, 6));
 * ```
 */
export const ROCKETS: Readonly<Record<string, RocketEntry>> = withTilt({
  starship: { id: "starship", name: "Starship", status: "built", ...MADE_BY["starship"], variants: STARSHIP_VARIANTS, defaultVariant: "v3" },
  "falcon-9": { id: "falcon-9", name: "Falcon 9", status: "built", ...MADE_BY["falcon-9"], variants: FALCON_9_VARIANTS, defaultVariant: "block-5" },
  "falcon-heavy": { id: "falcon-heavy", name: "Falcon Heavy", status: "built", ...MADE_BY["falcon-heavy"], variants: FALCON_HEAVY_VARIANTS, defaultVariant: "falcon-heavy" },
  dragon: { id: "dragon", name: "Dragon", status: "built", ...MADE_BY["dragon"], variants: DRAGON_VARIANTS, defaultVariant: "dragon-2" },
  grasshopper: { id: "grasshopper", name: "Grasshopper", status: "built", ...MADE_BY["grasshopper"], variants: GRASSHOPPER_VARIANTS, defaultVariant: "grasshopper" },
  "falcon-1": { id: "falcon-1", name: "Falcon 1", status: "built", ...MADE_BY["falcon-1"], variants: FALCON_1_VARIANTS, defaultVariant: "falcon-1" },
  "saturn-v": { id: "saturn-v", name: "Saturn V", status: "built", ...MADE_BY["saturn-v"], variants: SATURN_V_VARIANTS, defaultVariant: "saturn-v" },
  "space-shuttle": { id: "space-shuttle", name: "Space Shuttle", status: "built", ...MADE_BY["space-shuttle"], variants: SHUTTLE_VARIANTS, defaultVariant: "stack" },
  "sls": { id: "sls", name: "Space Launch System", status: "built", ...MADE_BY["sls"], variants: SLS_VARIANTS, defaultVariant: "block-1" },
  "new-glenn": { id: "new-glenn", name: "New Glenn", status: "built", ...MADE_BY["new-glenn"], variants: NEW_GLENN_VARIANTS, defaultVariant: "7x2" },
  "electron": { id: "electron", name: "Electron", status: "built", ...MADE_BY["electron"], variants: ELECTRON_VARIANTS, defaultVariant: "electron" },
  "soyuz": { id: "soyuz", name: "Soyuz", status: "built", ...MADE_BY["soyuz"], variants: SOYUZ_VARIANTS, defaultVariant: "soyuz-2" },
  "lunar-module": { id: "lunar-module", name: "Apollo lunar module", status: "built", ...MADE_BY["lunar-module"], variants: LUNAR_MODULE_VARIANTS, defaultVariant: "lunar-module" },
  "apollo-soyuz": { id: "apollo-soyuz", name: "Apollo and Soyuz", status: "built", ...MADE_BY["apollo-soyuz"], variants: APOLLO_SOYUZ_VARIANTS, defaultVariant: "apollo-soyuz" },
  "gemini": { id: "gemini", name: "Gemini", status: "built", ...MADE_BY["gemini"], variants: GEMINI_VARIANTS, defaultVariant: "gemini" },
  "mercury": { id: "mercury", name: "Mercury", status: "built", ...MADE_BY["mercury"], variants: MERCURY_VARIANTS, defaultVariant: "friendship-7" },
  "jupiter-c": { id: "jupiter-c", name: "Jupiter-C", status: "built", ...MADE_BY["jupiter-c"], variants: JUPITER_C_VARIANTS, defaultVariant: "jupiter-c" },
  "iss": { id: "iss", name: "International Space Station", status: "built", ...MADE_BY["iss"], variants: ISS_VARIANTS, defaultVariant: "iss" },
  "hubble": { id: "hubble", name: "Hubble Space Telescope", status: "built", ...MADE_BY["hubble"], variants: HUBBLE_VARIANTS, defaultVariant: "hubble" },
  droneship: { id: "droneship", name: "Drone ships", status: "built", ...MADE_BY["droneship"], variants: DRONESHIP_VARIANTS, defaultVariant: "ocisly" },
  "landing-zone": { id: "landing-zone", name: "Landing zones", status: "built", ...MADE_BY["landing-zone"], variants: LANDING_ZONE_VARIANTS, defaultVariant: "lz-1" },
  "launch-tower": { id: "launch-tower", name: "Launch tower", status: "built", ...MADE_BY["launch-tower"], variants: TOWER_VARIANTS, defaultVariant: "stack" },
  ...Object.fromEntries(Object.entries(FLEET_KIT_ROCKETS).map(([id, rocket]) => [id, { id, name: rocket.name, status: "built" as const, ...MADE_BY["fleet-kit"], variants: rocket.variants, defaultVariant: rocket.variants[0].id }])),
  "fleet-ship-01": { id: "fleet-ship-01", name: "ISV 花房 Hanabusa, SPX-013", status: "built", ...MADE_BY["fleet-ship-01"], variants: SHIP_01_VARIANTS, defaultVariant: "hanabusa" },
  "fleet-insets-ship-01": { id: "fleet-insets-ship-01", name: SHIP_01_INSET_ROCKET.name, status: "built", ...MADE_BY["fleet-ship-01"], variants: SHIP_01_INSET_ROCKET.variants, defaultVariant: SHIP_01_INSET_ROCKET.variants[0].id },
  "fleet-ship-03": { id: "fleet-ship-03", name: "ISV 宮本 Miyamoto, SPX-452", status: "built", ...MADE_BY["fleet-ship-03"], variants: SHIP_03_VARIANTS, defaultVariant: "miyamoto" },
  "fleet-ship-ariake": { id: "fleet-ship-ariake", name: "ISV 有明 Ariake, SPX-186", status: "built", ...MADE_BY["fleet-ship-ariake"], variants: ARIAKE_VARIANTS, defaultVariant: "ariake" },
  "fleet-insets-ship-03": { id: "fleet-insets-ship-03", name: SHIP_03_INSET_ROCKET.name, status: "built", ...MADE_BY["fleet-ship-03"], variants: SHIP_03_INSET_ROCKET.variants, defaultVariant: SHIP_03_INSET_ROCKET.variants[0].id },
  "fleet-02": { id: "fleet-02", name: "ISV 加美鳴 (かみなり) Kaminari, SPX-207", status: "built", ...MADE_BY["fleet-02"], variants: SHIP_02_VARIANTS, defaultVariant: "fleet-02" },
  starbase: { id: "starbase", name: "Starbase", status: "built", ...MADE_BY["starbase"], variants: STARBASE_VARIANTS, defaultVariant: "launch-site" },
});

const fig = (value: number, source: SourceId): Figure => ({ value, source });

/**
 * Rockets with sourced facts and no shape yet.
 *
 * @example
 * ```ts
 * import { PLANNED_ROCKETS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(PLANNED_ROCKETS.map((rocket) => rocket.name));
 * ```
 */
export const PLANNED_ROCKETS: readonly PlannedRocket[] = [
  { id: "vulcan-centaur", name: "Vulcan Centaur", status: "planned", height: fig(61.6, "wikipedia-vulcan"), diameter: fig(5.4, "wikipedia-vulcan"), firstFlight: { value: "2024-01-08", source: "wikipedia-vulcan" }, source: "wikipedia-vulcan" },
  { id: "ariane-6", name: "Ariane 6", status: "planned", height: fig(63, "wikipedia-ariane-6"), diameter: fig(5.4, "wikipedia-ariane-6"), firstFlight: { value: "2024-07-09", source: "wikipedia-ariane-6" }, source: "wikipedia-ariane-6" },
];

/**
 * Finds a rocket's variant, with its sourced sizes.
 *
 * @param rocket A rocket's id.
 * @param id A variant's id. Left out, null or undefined: the rocket's default variant.
 * @returns The variant, or undefined when the rocket or the variant is not known.
 * @example
 * ```ts
 * import { variantOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const v3 = variantOf("starship", "v3");
 * console.log(v3?.facts.height.value, variantOf("starship", "v99"));
 * ```
 */
export function variantOf(rocket: string, id?: string | null): Variant | undefined {
  const entry = Object.hasOwn(ROCKETS, rocket) ? ROCKETS[rocket] : undefined;
  return entry?.variants.find((variant) => variant.id === (id ?? entry.defaultVariant));
}

/**
 * A part's name for a rocket's slot in a variant.
 *
 * @param rocket A rocket's id.
 * @param variant A variant's id.
 * @param slot A slot name.
 * @returns The id of the part that stands in that slot.
 * @example
 * ```ts
 * import { partIdOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(partIdOf("starship", "v3", "booster"));
 * ```
 */
export const partIdOf = (rocket: string, variant: string, slot: string): string => variantOf(rocket, variant)?.partIds?.[slot] ?? `${rocket}-${variant}-${slot}`;

/**
 * What to call a slot.
 *
 * @example
 * ```ts
 * import { SLOT_NAMES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(SLOT_NAMES["booster"]);
 * ```
 */
export const SLOT_NAMES: Readonly<Record<string, string>> = {
  ...FLEET_SLOT_NAMES,
  ...SHIP_01_SLOT_NAMES,
  ...SHIP_03_SLOT_NAMES,
  booster: "Super Heavy",
  ship: "Ship",
  "first-stage": "First stage",
  "second-stage": "Second stage",
  fairing: "Fairing",
  capsule: "Capsule",
  trunk: "Trunk",
  centre: "Centre core with its upper stage",
  "side-left": "Side booster, left",
  "side-right": "Side booster, right",
  vehicle: "Whole vehicle",
  "third-stage": "Third stage",
  adapter: "Adapter",
  "service-module": "Service module",
  "escape-tower": "Escape tower",
  "external-tank": "External tank",
  "srb-left": "Solid rocket booster, left",
  "srb-right": "Solid rocket booster, right",
  orbiter: "Orbiter",
  "upper-stage": "Upper stage",
  "descent": "Descent stage",
  "ascent": "Ascent stage",
  "csm": "Apollo command and service module",
  "docking-module": "Docking module",
  "station": "The station",
  "telescope": "The telescope",
  ground: "The ground and the road",
  pads: "The pads",
  "tank-farm": "The tank farm",
  "on-pad": "On the pad",
  "mega-bays": "The Mega Bays",
  starfactory: "Starfactory",
  garden: "The rocket garden",
  sign: "The sign's place",
  village: "The village",
  tower: "Tower",
  mount: "Mount",
  arms: "Arms",
  deck: "Deck and hull",
  pad: "Pad",
  landed: "Landed first stage",
  "booster-1": "Booster 1",
  "booster-2": "Booster 2",
  "booster-3": "Booster 3",
  "booster-4": "Booster 4",
  spine: "Truss spine",
  drive: "Drive raft",
  reactor: "Reactor hall",
  "tank-1": "Fuel tank 1",
  "tank-2": "Fuel tank 2",
  "tank-3": "Fuel tank 3",
  "tank-4": "Fuel tank 4",
  "radiator-starboard": "Radiator wing, starboard",
  "radiator-port": "Radiator wing, port",
  "radiators-stowed": "Stowed radiator packs",
  "cargo-1": "Cargo station 1",
  "cargo-2": "Cargo station 2",
  "cargo-3": "Cargo station 3",
  "cargo-4": "Cargo station 4",
  dock: "Dock and works",
  farm: "Farm drum",
  "habitat-a": "Habitat ring A",
  "habitat-b": "Habitat ring B",
  command: "Command citadel",
  shield: "Bow shield",
  "reactor-inside": "Reactors, inside",
  "tank-inside": "Propellant and tank works, inside",
  "cargo-inside": "Cargo, inside the containers",
  "dock-inside": "Hangar and works, inside",
  "farm-inside": "Farm terraces, inside",
  "habitat-inside": "Habitat decks, inside",
  "command-inside": "Bridge and crew decks, inside",
  verniers: "Vernier clusters",
  "shadow-shield": "Shadow shield",
  "propellant-lines": "Propellant lines",
  pod: "Mission pod",
};
