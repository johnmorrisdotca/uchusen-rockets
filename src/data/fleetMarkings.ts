// The hull-marking concepts as rockets and variants: one for each candidate face, on Kaminari's tank and on Miyamoto's habitat. All this package's own design, so every figure is blank and says so.
import { CONCEPT_FACES, conceptHull, miyamotoHull } from "../model/fleet/markingSets.ts";
import { blank, type Variant } from "./types.ts";

const FICTION = "This package's own design, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(1))} m, as designed`;

const variant = (id: string, entry: { record: { id: string; height: number; diameter: number } }, note: string): Variant => {
  return {
    id,
    rocket: "fleet-markings",
    name: `Lettering, ${id}`,
    status: "fictional",
    firstWord: "Designed",
    firstFlight: blank<string>(FICTION, "Planned: not yet flown"),
    slots: ["hull", "markings"],
    partIds: { hull: entry.record.id, markings: `${entry.record.id}-markings` },
    note,
    facts: { height: fiction(metres(entry.record.height)), diameter: fiction(metres(entry.record.diameter)), parts: { hull: fiction(metres(entry.record.height)), markings: fiction(metres(entry.record.height)) }, engines: {}, more: {} },
  };
};

/**
 * The hull-marking rockets, by id: each candidate face on Kaminari's tank and on Miyamoto's habitat.
 *
 * @example
 * ```ts
 * import { FLEET_MARKING_ROCKETS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(FLEET_MARKING_ROCKETS["fleet-markings"].variants.map((variant) => variant.id));
 * ```
 */
export const FLEET_MARKING_ROCKETS: Readonly<Record<string, { name: string; variants: readonly Variant[] }>> = {
  "fleet-markings": {
    name: "Fleet hull markings",
    variants: [
      ...Object.keys(CONCEPT_FACES).map((id) => variant(`concept-${id}`, conceptHull(id)[0], `The registry large and the name smaller, in ${id}, on Kaminari's own propellant tank.`)),
      ...Object.keys(CONCEPT_FACES).map((id) => variant(`miyamoto-${id}`, miyamotoHull(id)[0], `The registry large and the name smaller, in ${id}, on Miyamoto's own habitat.`)),
    ],
  },
};
