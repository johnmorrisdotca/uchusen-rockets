// The catalogue: which rockets there are, their variants with sourced sizes, and which are still to be built. All data, all typed. Pure.
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
};

const fig = (value: number, source: SourceId, note?: string): Figure => ({ value, source, ...(note ? { note } : {}) });

export const PLANNED_ROCKETS: readonly PlannedRocket[] = [
  { id: "falcon-1", name: "Falcon 1", status: "planned", height: fig(21, "wikipedia-falcon-1"), diameter: fig(1.7, "wikipedia-falcon-1"), firstFlight: { value: "2006-03-24", source: "wikipedia-falcon-1" }, source: "wikipedia-falcon-1" },
  { id: "falcon-9", name: "Falcon 9", status: "planned", height: fig(70, "wikipedia-falcon-9", "Block 5."), diameter: fig(3.7, "wikipedia-falcon-9"), firstFlight: { value: "2010-06-04", source: "wikipedia-falcon-9" }, source: "wikipedia-falcon-9" },
  { id: "falcon-heavy", name: "Falcon Heavy", status: "planned", height: fig(70, "r-spacex"), diameter: fig(12.2, "r-spacex", "Across the three cores."), firstFlight: { value: "2018-02-06", source: "r-spacex" }, source: "r-spacex" },
];

export function variantOf(rocket: string, id?: string | null): Variant | undefined {
  const entry = Object.hasOwn(ROCKETS, rocket) ? ROCKETS[rocket] : undefined;
  return entry?.variants.find((variant) => variant.id === (id ?? entry.defaultVariant));
}

/** A part's name for a rocket's slot in a variant. */
export const partIdOf = (rocket: string, variant: string, slot: string): string => `${rocket}-${variant}-${slot}`;
