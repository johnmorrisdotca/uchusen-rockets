// The tower's 13 m footprint in this file is © OpenStreetMap contributors, under the Open Database License (ODbL 1.0, https://www.openstreetmap.org/copyright), not MIT: see NOTICE.md.
// The integration tower at Starbase, with its mount and arms, as sourced: the FAA's assessment gives its height. No source read here gives its width, its arms' length or the mount's size: those are judged from photographs.
import { STARSHIP_VARIANTS } from "./starship.ts";
import { blank, type Figure, type Variant } from "./types.ts";

const F = "faa-pea-2022" as const;
const W = "wikipedia-starbase" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const TOWER_HEIGHT = 146.3;
const v3 = STARSHIP_VARIANTS.find((variant) => variant.id === "v3") as Variant;
const TOWER = m(TOWER_HEIGHT, F, { brief: "approximately", note: "About 480 feet, with a 10-foot lightning rod on top, as proposed in 2022.", others: [{ value: 146, source: W, note: "Wikipedia's Starbase article gives 479 feet from the FAA's 2021 determination of no hazard to air navigation." }] });
const JUDGED = "No source read here gives its size: it is judged from photographs.";

const facts = (withRocket: boolean): Variant["facts"] => ({
  height: TOWER,
  diameter: { value: 13, source: "openstreetmap", brief: "the tower", note: "The map's footprint of tower 1, 13 by 12 m." },
  parts: { tower: TOWER, mount: blank(JUDGED), arms: blank(JUDGED), ...(withRocket ? { booster: v3.facts.parts.booster, ship: v3.facts.parts.ship } : {}) },
  engines: {},
  more: {},
});

const base = { rocket: "launch-tower", status: "support" as const, firstWord: "Stacked" };
const FIRST = said("2021-07", W, { brief: "first tower fully stacked" });

export const TOWER_VARIANTS: readonly Variant[] = [
  { ...base, id: "tower", name: "Integration tower and mount", firstFlight: FIRST, slots: ["mount", "tower", "arms"], note: "The tower at Starbase with its launch mount and its two arms, the chopsticks, held open. The arms' length, the mount and how far it stands from the tower are judged from photographs. No lettering or mark is drawn.", facts: facts(false) },
  { ...base, id: "stack", name: "Tower, with Block 3 stacked on the mount", firstFlight: FIRST, slots: ["mount", "tower", "arms", "booster", "ship"], note: "Super Heavy on the mount and the Ship on Super Heavy, as they are stacked by the arms. The rocket is Block 3's own parts, painted by this package's code here to keep the scene light. No lettering or mark is drawn.", facts: facts(true) },
  { ...base, id: "catch", name: "Tower, catching Super Heavy", firstFlight: said("2024-10-13", W, { brief: "first catch", note: "Flight 5: Booster 12." }), slots: ["mount", "tower", "arms", "booster"], note: "The arms closed under the grid fins, as on Flight 5, with Block 3's booster. How high it hangs is judged from photographs of that catch, which show an earlier booster. No lettering or mark is drawn.", facts: { ...facts(true), parts: { tower: TOWER, mount: blank(JUDGED), arms: blank(JUDGED), booster: v3.facts.parts.booster } } },
];
