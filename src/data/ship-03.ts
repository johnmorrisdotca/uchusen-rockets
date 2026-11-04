// SPX-03 Waymark, Waymark (SPX-ICV-03): a planned interstellar command vessel, this package's own design. It is four variants of one ship: stowed, with its radiators out, with the relief pod on its collar, and cut open to the
// starboard side. Every figure is blank and says it is a design: no source gives them. The ship's own numbers are in `src/model/fleet/ship-03/specs.ts`.
import { WAYMARK_PARTS, WAYMARK_VARIANT_SLOTS } from "../model/fleet/ship-03/variants.ts";
import { CARDS, SHIP_INSETS } from "../model/fleet/ship-03/insets.ts";
import { blank, type Variant } from "./types.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(1))} m, as designed`;

const NOTES: Readonly<Record<string, string>> = {
  waymark: "SPX-ICV-03, the Waymark-class expedition command vessel, stowed, with the relay pod on its keyed collar. A narrow spine, two staggered hangar shoulders, a layered bow and two recessed drives, 380 m by 118 m by 74 m, 105,000 t at departure. Status: planned, first flight 2456. All numbers are design targets; the drive and its limits are described in the ship's bible.",
  "waymark-deployed": "Waymark with both radiator banks out: four leaves of 25 by 60 m on each, clear of the hangar corridors. Sustained main burn needs every leaf out.",
  "waymark-relief": "Waymark with the relief pod on its collar: six relief and equipment containers under a gantry, in place of the relay pod.",
  "waymark-cutaway": "Waymark opened to starboard: the layers of its armour at the cut edge, the reactor and power rooms, the barrels, both bays, the decks of the habitat and the operations ring of the citadel.",
};

const NAMES: Readonly<Record<string, string>> = { waymark: "Waymark, SPX-ICV-03", "waymark-deployed": "Waymark, radiators out", "waymark-relief": "Waymark, relief pod", "waymark-cutaway": "Waymark, cutaway" };

/** The ship's variants. */
export const SHIP_03_VARIANTS: readonly Variant[] = Object.entries(WAYMARK_VARIANT_SLOTS).map(([id, slots]) => {
  const stacked = Object.keys(slots);
  return {
    id,
    rocket: "fleet-ship-03",
    name: NAMES[id],
    status: "fictional" as const,
    firstWord: "Planned first flight",
    firstFlight: blank<string>(FICTION, "Planned for 2456"),
    slots: stacked,
    partIds: Object.fromEntries(Object.entries(slots).map(([slot, part]) => [slot, `fleet-ship-03-${part}`])),
    note: NOTES[id],
    facts: {
      height: fiction(metres(380)),
      diameter: fiction(metres(118)),
      parts: Object.fromEntries(Object.entries(slots).map(([slot, part]) => [slot, fiction(metres(WAYMARK_PARTS.find((one) => one.id === part)?.height ?? 0))])),
      engines: { drive: blank<string>(FICTION, "2 fusion-triggered directed-conversion drives, 4 plasma verniers") },
      more: {},
    },
  };
});

const insetVariant = (inset: (typeof SHIP_INSETS)[string]): Variant => ({
  id: inset.id,
  rocket: "fleet-insets-ship-03",
  name: `${inset.name} inset`,
  status: "fictional",
  firstWord: "Planned first flight",
  firstFlight: blank<string>(FICTION, "Planned for 2456"),
  slots: inset.parts.map((one) => `part-${one.n}`),
  partIds: Object.fromEntries(inset.parts.map((one) => [`part-${one.n}`, `fleet-ship-03-inset-${inset.id}-${one.n}`])),
  note: `${inset.note} ${inset.parts.map((one) => `${one.n} ${one.name}`).join(", ")}. Press "apart" to open it.`,
  facts: { height: fiction("about 6 m, as designed"), diameter: fiction("about 12 m, as designed"), parts: Object.fromEntries(inset.parts.map((one) => [`part-${one.n}`, fiction(metres(one.size[1]))])), engines: {}, more: {} },
});

const cardVariant = (card: (typeof CARDS)[keyof typeof CARDS]): Variant => ({
  id: card.id,
  rocket: "fleet-insets-ship-03",
  name: card.name,
  status: "fictional",
  firstWord: "Planned first flight",
  firstFlight: blank<string>(FICTION, "Planned for 2456"),
  slots: ["engine"],
  partIds: { engine: `fleet-ship-03-${card.id}` },
  note: `${card.name}: the engine on its own, with its bell, throat, chamber, feed manifolds, field coils and gimbal. Its numbers are on the ship's engine cards.`,
  facts: { height: fiction(metres(card.size[1])), diameter: fiction(metres(Math.max(card.size[0], card.size[2]))), parts: { engine: fiction(metres(card.size[1])) }, engines: {}, more: {} },
});

/** Waymark's insets and propulsion cards, as one more row of the picker. */
export const SHIP_03_INSET_ROCKET = { name: "Waymark insets and engine cards", variants: [...Object.values(SHIP_INSETS).map(insetVariant), ...Object.values(CARDS).map(cardVariant)] } as const;
