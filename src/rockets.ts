// The catalogue: which rockets there are, their variants with sourced sizes, and which are still to be built. All data, all typed. Pure.
import { DRAGON_VARIANTS } from "./data/dragon.ts";
import { FALCON_HEAVY_VARIANTS, FALCON_9_VARIANTS } from "./data/falcon.ts";
import { FALCON_1_VARIANTS } from "./data/falcon1.ts";
import { GRASSHOPPER_VARIANTS } from "./data/grasshopper.ts";
import { SATURN_V_VARIANTS } from "./data/saturn.ts";
import { SHUTTLE_VARIANTS } from "./data/shuttle.ts";
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
};

export const PLANNED_ROCKETS: readonly PlannedRocket[] = [];

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
};
