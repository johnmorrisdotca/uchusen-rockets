// ISV Miyamoto (SPX-452), the Romurusu class's first ship, and its sister ISV Ariake (SPX-186): planned interstellar flagships, this package's own design. It is four variants of one ship: stowed, with its radiators out, with the relief pod on its collar, and cut open to the
// starboard side. Every figure is blank and says it is a design: no source gives them. The ship's own numbers are in `src/model/fleet/ship-03/specs.ts`.
import { MIYAMOTO_PARTS, MIYAMOTO_VARIANT_SLOTS } from "../model/fleet/ship-03/variants.ts";
import { CARDS, SHIP_INSETS } from "../model/fleet/ship-03/insets.ts";
import { blank, type Variant } from "./types.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(1))} m, as designed`;

const NOTES: Readonly<Record<string, string>> = {
  miyamoto: "ISV 宮本 Miyamoto, SPX-452, Romurusu class (ロムルス級, ICV type), the flagship and command vessel, stowed, with the relay pod on its keyed collar. A narrow spine, two staggered hangar shoulders, a layered bow and two recessed drives, 380 m by 118 m by 74 m, 105,000 t at departure. Status: planned, first flight 2456. All numbers are design targets; the drive and its limits are described in the ship's bible.",
  "miyamoto-deployed": "Miyamoto with both radiator banks out: four leaves of 25 by 60 m on each, clear of the hangar corridors. Sustained main burn needs every leaf out.",
  "miyamoto-relief": "Miyamoto with the relief pod on its collar: six relief and equipment containers under a gantry, in place of the relay pod.",
  "miyamoto-no-collar": "ISV Miyamoto with the drive's neck bare: the shadow-shield collar swapped for none, to compare the two ways the engines meet the hull.",
  ariake: "ISV 有明 Ariake, SPX-186, \"daybreak\": the sister of ISV Miyamoto in the Romurusu class (ロムルス級), the same model with its own registry and hull marks, a dawn-gold livery with pinstripes, a survey pod on its collar, a sensor mast and a solarium each side of the dome, and warm rooms. Status: planned, first flight 2456.",
  "ariake-cutaway": "Ariake opened to starboard at the habitation drum: the four decks in warm wood and dawn-gold.",
  "miyamoto-cutaway": "Miyamoto opened to starboard: the layers of its armour at the cut edge, the reactor and power rooms, the barrels, both bays, the decks of the habitat and the operations ring of the citadel.",
};

const NAMES: Readonly<Record<string, string>> = { miyamoto: "ISV 宮本 Miyamoto, SPX-452", "miyamoto-deployed": "ISV 宮本 Miyamoto, SPX-452, radiators out", "miyamoto-relief": "ISV 宮本 Miyamoto, SPX-452, relief pod", "miyamoto-cutaway": "ISV 宮本 Miyamoto, SPX-452, cutaway", "miyamoto-no-collar": "ISV 宮本 Miyamoto, SPX-452, no collar", ariake: "ISV 有明 Ariake, SPX-186", "ariake-cutaway": "ISV 有明 Ariake, SPX-186, cutaway" };

/** The ship's variants. */
const variantOf = ([id, slots]: [string, Readonly<Record<string, string>>]): Variant => {
  const stacked = Object.keys(slots);
  return {
    id,
    rocket: id.startsWith("ariake") ? "fleet-ship-ariake" : "fleet-ship-03",
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
      parts: Object.fromEntries(Object.entries(slots).map(([slot, part]) => [slot, fiction(metres(MIYAMOTO_PARTS.find((one) => one.id === part)?.height ?? 0))])),
      engines: { drive: blank<string>(FICTION, "2 DCD (Directed Conversion Drives), 4 plasma verniers") },
      more: {},
    },
  };
};

/** Miyamoto's variants. */
export const SHIP_03_VARIANTS: readonly Variant[] = Object.entries(MIYAMOTO_VARIANT_SLOTS).filter(([id]) => !id.startsWith("ariake")).map(variantOf);

/** The sister ship: the same model, its own name, registry, hull marks and mission pod. A row of its own in the picker. */
export const ARIAKE_VARIANTS: readonly Variant[] = Object.entries(MIYAMOTO_VARIANT_SLOTS).filter(([id]) => id.startsWith("ariake")).map(variantOf);

const insetVariant = (inset: (typeof SHIP_INSETS)[string]): Variant => ({
  id: inset.id,
  rocket: "fleet-insets-ship-03",
  name: `${inset.name} inset`,
  status: "fictional",
  firstWord: "Planned first flight",
  firstFlight: blank<string>(FICTION, "Planned for 2456"),
  slots: inset.parts.map((one) => `${inset.id}-${one.n}`),
  partIds: Object.fromEntries(inset.parts.map((one) => [`${inset.id}-${one.n}`, `fleet-ship-03-inset-${inset.id}-${one.n}`])),
  note: `${inset.note} ${inset.parts.map((one) => `${one.n} ${one.name}`).join(", ")}. Press "apart" to open it.`,
  facts: { height: fiction("about 6 m, as designed"), diameter: fiction("about 12 m, as designed"), parts: Object.fromEntries(inset.parts.map((one) => [`${inset.id}-${one.n}`, fiction(metres(one.size[1]))])), engines: {}, more: {} },
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

/** Miyamoto's insets and propulsion cards, as one more row of the picker. */
export const SHIP_03_INSET_ROCKET = { name: "Romurusu class insets and engine cards", variants: [...Object.values(SHIP_INSETS).map(insetVariant), ...Object.values(CARDS).map(cardVariant)] } as const;

/** What to call each slot of the ship's variants in the picker: a module by its name, a sub-part of an inset with its number. */
export const SHIP_03_SLOT_NAMES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(MIYAMOTO_PARTS.filter((part) => !part.id.endsWith("-cutaway")).map((part) => [part.id.replace(/-(stowed|deployed)$/, "").replace(/^(pod|radiators-dorsal|radiators-ventral)-.*/, (m) => (m.startsWith("pod") ? "pod" : m.startsWith("radiators-dorsal") ? "radiators-dorsal" : "radiators-ventral")), part.name.replace(/, (stowed|deployed|relay|relief)$/, "").replace(/^Mission pod.*/, "Mission pod")])),
  ...Object.fromEntries(Object.values(SHIP_INSETS).flatMap((inset) => inset.parts.map((one) => [`${inset.id}-${one.n}`, `${one.n}. ${one.name}`]))),
  engine: "Engine",
};
