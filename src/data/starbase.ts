// The coordinates, outlines and map heights in this file are © OpenStreetMap contributors, under the Open Database License (ODbL 1.0, https://www.openstreetmap.org/copyright), not MIT: see NOTICE.md.
// Starbase as a scene: where things stand is measured from OpenStreetMap, a handful of named places under its licence. What is built, nothing announced. Its figures are mappers' and not surveys, and each says so.
import { blank, type Figure, type Variant } from "./types.ts";

const O = "openstreetmap" as const;
const W = "wikipedia-starbase" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });

const MAP = "From a mapper's outline, not a survey.";
const towers = m(348, O, { note: "Between the map's two tower outlines." });
const bay = m(100, O, { note: "The map's height tag. Its outline is 54 by 38 m. A mapper's figure, not the builder's." });
const factory = m(327, O, { note: `Starfactory's long side; 293 m the other way, 16.3 m the map's height tag. ${MAP}` });
const farm = m(314, O, { note: `Its area, 314 by 78 m. ${MAP}` });
const whole: Figure = blank("A place, not a vehicle.");
const FIRST = { value: "2021-07", source: W, brief: "first tower fully stacked" } satisfies Figure<string>;
const PLAIN = "Plain shapes from the map, with no lettering or logo anywhere. Only what is built is shown: nothing announced, and no concept picture was used.";

const site = (id: string, name: string, slots: string[], note: string, sizes: Record<string, Figure>): Variant => ({
  id,
  rocket: "starbase",
  name,
  status: "support",
  firstWord: "Built from",
  firstFlight: FIRST,
  slots,
  note: `${note} ${PLAIN}`,
  facts: { height: whole, diameter: whole, parts: Object.fromEntries(slots.map((slot) => [slot, blank("Drawn from the map's outlines; see below.")])), engines: {}, more: {}, sizes },
});

export const STARBASE_VARIANTS: readonly Variant[] = [
  site("launch-site", "Starbase, the launch site", ["ground", "pads", "tank-farm", "on-pad"], "Two towers and their mounts, the tank farm and the beach, with a Block 3's size standing on the first pad as a plain shape. The tanks are as many as look right in the farm's outline, not a count.", { "Tower 1 to tower 2": towers, "Tank farm": farm }),
  site("build-site", "Starbase, the build site", ["ground", "mega-bays", "starfactory", "garden", "sign"], "The two Mega Bays, Starfactory, and the Sanchez site with its rocket garden, whose rockets are plain shapes at Block 3's size, standing as photographs show them. Starfactory is its outer outline, as one box. The sign's place has a plain board.", { "Mega Bay's height": bay, "Starfactory": factory }),
  site("city", "Starbase, the launch site to the build site", ["ground", "pads", "tank-farm", "on-pad", "mega-bays", "starfactory", "garden", "sign", "village"], "All of it, along the highway, about 3.5 km end to end, with a few plain houses at the village: not a count. Each building's place and outline are the map's.", { "Tower 1 to tower 2": towers, "Mega Bay's height": bay }),
];
