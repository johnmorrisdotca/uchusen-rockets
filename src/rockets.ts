// The catalogue: which rockets there are, their variants with sourced sizes, and which are still to be built. All data, all typed. Pure.
import { DRAGON_VARIANTS } from "./data/dragon.ts";
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
import { STARSHIP_VARIANTS } from "./data/starship.ts";
import type { Figure, Variant } from "./data/types.ts";
import type { SourceId } from "./data/sources.ts";

export type RocketStatus = "built" | "planned";

export interface RocketEntry {
  id: string;
  name: string;
  status: RocketStatus;
  variants: readonly Variant[];
  defaultVariant: string;
}

/** A rocket on the list with no mesh yet: its name and the sourced facts to build it from. */
export interface PlannedRocket {
  id: string;
  name: string;
  status: "planned";
  height: Figure;
  diameter: Figure;
  firstFlight: Figure<string>;
  source: SourceId;
}

export const ROCKETS: Readonly<Record<string, RocketEntry>> = {
  starship: { id: "starship", name: "Starship", status: "built", variants: STARSHIP_VARIANTS, defaultVariant: "v3" },
  "falcon-9": { id: "falcon-9", name: "Falcon 9", status: "built", variants: FALCON_9_VARIANTS, defaultVariant: "block-5" },
  "falcon-heavy": { id: "falcon-heavy", name: "Falcon Heavy", status: "built", variants: FALCON_HEAVY_VARIANTS, defaultVariant: "falcon-heavy" },
  dragon: { id: "dragon", name: "Dragon", status: "built", variants: DRAGON_VARIANTS, defaultVariant: "dragon-2" },
  grasshopper: { id: "grasshopper", name: "Grasshopper", status: "built", variants: GRASSHOPPER_VARIANTS, defaultVariant: "grasshopper" },
  "falcon-1": { id: "falcon-1", name: "Falcon 1", status: "built", variants: FALCON_1_VARIANTS, defaultVariant: "falcon-1" },
  "saturn-v": { id: "saturn-v", name: "Saturn V", status: "built", variants: SATURN_V_VARIANTS, defaultVariant: "saturn-v" },
  "space-shuttle": { id: "space-shuttle", name: "Space Shuttle", status: "built", variants: SHUTTLE_VARIANTS, defaultVariant: "stack" },
  "sls": { id: "sls", name: "Space Launch System", status: "built", variants: SLS_VARIANTS, defaultVariant: "block-1" },
  "new-glenn": { id: "new-glenn", name: "New Glenn", status: "built", variants: NEW_GLENN_VARIANTS, defaultVariant: "7x2" },
  "electron": { id: "electron", name: "Electron", status: "built", variants: ELECTRON_VARIANTS, defaultVariant: "electron" },
  "soyuz": { id: "soyuz", name: "Soyuz", status: "built", variants: SOYUZ_VARIANTS, defaultVariant: "soyuz-2" },
  "lunar-module": { id: "lunar-module", name: "Apollo lunar module", status: "built", variants: LUNAR_MODULE_VARIANTS, defaultVariant: "lunar-module" },
  "apollo-soyuz": { id: "apollo-soyuz", name: "Apollo and Soyuz", status: "built", variants: APOLLO_SOYUZ_VARIANTS, defaultVariant: "apollo-soyuz" },
  "gemini": { id: "gemini", name: "Gemini", status: "built", variants: GEMINI_VARIANTS, defaultVariant: "gemini" },
  droneship: { id: "droneship", name: "Drone ships", status: "built", variants: DRONESHIP_VARIANTS, defaultVariant: "ocisly" },
  "landing-zone": { id: "landing-zone", name: "Landing zones", status: "built", variants: LANDING_ZONE_VARIANTS, defaultVariant: "lz-1" },
  "launch-tower": { id: "launch-tower", name: "Launch tower", status: "built", variants: TOWER_VARIANTS, defaultVariant: "stack" },
  starbase: { id: "starbase", name: "Starbase", status: "built", variants: STARBASE_VARIANTS, defaultVariant: "launch-site" },
};

const fig = (value: number, source: SourceId): Figure => ({ value, source });

export const PLANNED_ROCKETS: readonly PlannedRocket[] = [
  { id: "vulcan-centaur", name: "Vulcan Centaur", status: "planned", height: fig(61.6, "wikipedia-vulcan"), diameter: fig(5.4, "wikipedia-vulcan"), firstFlight: { value: "2024-01-08", source: "wikipedia-vulcan" }, source: "wikipedia-vulcan" },
  { id: "ariane-6", name: "Ariane 6", status: "planned", height: fig(63, "wikipedia-ariane-6"), diameter: fig(5.4, "wikipedia-ariane-6"), firstFlight: { value: "2024-07-09", source: "wikipedia-ariane-6" }, source: "wikipedia-ariane-6" },
];

export function variantOf(rocket: string, id?: string | null): Variant | undefined {
  const entry = Object.hasOwn(ROCKETS, rocket) ? ROCKETS[rocket] : undefined;
  return entry?.variants.find((variant) => variant.id === (id ?? entry.defaultVariant));
}

/** A part's name for a rocket's slot in a variant. */
export const partIdOf = (rocket: string, variant: string, slot: string): string => variantOf(rocket, variant)?.partIds?.[slot] ?? `${rocket}-${variant}-${slot}`;

/** What to call a slot. */
export const SLOT_NAMES: Readonly<Record<string, string>> = {
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
};
