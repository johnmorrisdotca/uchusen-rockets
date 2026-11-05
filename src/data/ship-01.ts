// ISV Hanabusa (SPX-013), the fleet's spin-gravity explorer: planned interstellar exploration vessel, this package's own design. It is three variants of one ship: the three glazed rings stepping up from the bow, the same with the
// smallest ring at the stern, and the living ring opened for a flat section view. Every figure is blank and says it is a design: no source gives them. The ship's own numbers are in `src/model/fleet/ship-01/specs.ts`.
import { HANABUSA_PARTS, HANABUSA_VARIANT_SLOTS } from "../model/fleet/ship-01/variants.ts";
import { CARDS, SHIP_INSETS } from "../model/fleet/ship-01/insets.ts";
import { blank, type Inspector, type Variant } from "./types.ts";
import { ENGINES, HISTORY, LIFE, SECTIONS, specification, HULL } from "../model/fleet/ship-01/specs.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(1))} m, as designed`;

const NOTES: Readonly<Record<string, string>> = {
  hanabusa: "ISV 花房 Hanabusa, SPX-013, IXV class, the fleet's explorer and its wheel ship: a 589 m keel and a 22 m bow shield, 611 m overall, of drive, tanks, farms and habitat drums, two rotating propellant booms, and three glazed rings that step up in size from the bow (48, 62 and 76 m radius, at 3.43 rpm, 0.63, 0.82 and 1.00 g), with a closed industrial wheel of 112 m radius set apart behind them. Status: planned, first flight 2461. All numbers are design targets; the drive and its limits are described in the ship's bible.",
  "hanabusa-aft": "Hanabusa with the rings in the other order: the smallest at the stern, the largest nearest the bow, as in the first sketches of the programme.",
  "hanabusa-section": "Hanabusa with the living ring opened for a section view, drawn flat: the glass cut away, the section lines of the floor, the three terrace steps and the canal at each cut, no furnishing.",
};
const NAMES: Readonly<Record<string, string>> = { hanabusa: "ISV 花房 Hanabusa, SPX-013", "hanabusa-aft": "ISV 花房 Hanabusa, SPX-013, rings reversed", "hanabusa-section": "ISV 花房 Hanabusa, SPX-013, section view" };

/** What the viewer's panel shows for a variant: the labels of every named section, the specification and the notes. */
const inspectorOf = (slots: Readonly<Record<string, string>>): Inspector => {
  const lines = specification();
  const pick = (names: readonly string[]) => lines.filter((l) => names.includes(l.name)).map((l) => (l.note ? `${l.name}: ${l.value} (${l.note}).` : `${l.name}: ${l.value}.`));
  return {
    sections: SECTIONS.filter((sec) => sec.module in slots).map((sec) => ({ id: `${sec.module}/${sec.id}`, name: sec.name, job: sec.does, slot: sec.module, at: [sec.at[0], (sec.y0 + sec.y1) / 2, sec.at[1]] as const, inside: Boolean(sec.deck) })),
    places: Object.fromEntries(Object.entries(slots).map(([slot, part]) => {
      const one = HANABUSA_PARTS.find((p) => p.id === part);
      return [slot, [one?.place?.x ?? 0, one?.y0 ?? 0, one?.place?.z ?? 0] as const];
    })),
    spec: lines.map((l): [string, string] => [l.name, l.note ? `${l.value} (${l.note})` : l.value]),
    notes: {
      propulsion: [...Object.values(ENGINES).map((c) => `${c.name}: ${c.count} x ${(c.thrust / 1e6).toFixed(c.thrust >= 1e6 ? 1 : 2)} MN, ${c.note}`), ...pick(["Main drive", "Acceleration", "Peak speed", "Range"])],
      construction: [...HULL.layers.map((l) => `${l.n}. ${l.name}: ${l.made}, ${l.mm} mm.`)],
      history: [...Object.values(HISTORY), ...Object.values(LIFE)],
      equipment: pick(["Small craft", "Ship computer", "Power", "Trim and spin-up", "Garden, research and living rings", "Industrial wheel", "Crew"]),
    },
    insets: [],
  };
};

/** The ship's variants. */
const variantOf = ([id, slots]: [string, Readonly<Record<string, string>>]): Variant => {
  const stacked = Object.keys(slots);
  return {
    id,
    rocket: "fleet-ship-01",
    name: NAMES[id],
    status: "fictional" as const,
    firstWord: "Planned first flight",
    firstFlight: blank<string>(FICTION, "Planned for 2461"),
    slots: stacked,
    partIds: Object.fromEntries(Object.entries(slots).map(([slot, part]) => [slot, `fleet-ship-01-${part}`])),
    note: NOTES[id],
    inspector: inspectorOf(slots),
    view: { tiltMax: 90 },
    facts: {
      height: fiction(metres(611)),
      diameter: fiction(metres(225)),
      parts: Object.fromEntries(Object.entries(slots).map(([slot, part]) => [slot, fiction(metres(HANABUSA_PARTS.find((one) => one.id === part)?.height ?? 0))])),
      engines: { drive: blank<string>(FICTION, "19 MND (Magnetic Nozzle Drive) thrusters, 6 plasma trim pods") },
      more: {},
    },
  };
};

/** Hanabusa's variants. */
export const SHIP_01_VARIANTS: readonly Variant[] = Object.entries(HANABUSA_VARIANT_SLOTS).map(variantOf);

const insetVariant = (inset: (typeof SHIP_INSETS)[string]): Variant => ({
  id: inset.id,
  rocket: "fleet-insets-ship-01",
  name: `${inset.name} inset`,
  status: "fictional",
  firstWord: "Planned first flight",
  firstFlight: blank<string>(FICTION, "Planned for 2461"),
  slots: inset.parts.map((one) => `${inset.id}-${one.n}`),
  partIds: Object.fromEntries(inset.parts.map((one) => [`${inset.id}-${one.n}`, `fleet-ship-01-inset-${inset.id}-${one.n}`])),
  note: `${inset.note} ${inset.parts.map((one) => `${one.n} ${one.name}`).join(", ")}. Press "apart" to open it.`,
  facts: { height: fiction("about 6 m, as designed"), diameter: fiction("about 12 m, as designed"), parts: Object.fromEntries(inset.parts.map((one) => [`${inset.id}-${one.n}`, fiction(metres(one.size[1]))])), engines: {}, more: {} },
});

const cardVariant = (card: (typeof CARDS)[keyof typeof CARDS]): Variant => ({
  id: card.id,
  rocket: "fleet-insets-ship-01",
  name: card.name,
  status: "fictional",
  firstWord: "Planned first flight",
  firstFlight: blank<string>(FICTION, "Planned for 2461"),
  slots: ["engine"],
  partIds: { engine: `fleet-ship-01-${card.id}` },
  note: `${card.name}: the thruster on its own, with its plasma chamber, field coils, the flare of coil rings on struts and its feed line. Its numbers are on the ship's engine cards.`,
  facts: { height: fiction(metres(card.size[1])), diameter: fiction(metres(Math.max(card.size[0], card.size[2]))), parts: { engine: fiction(metres(card.size[1])) }, engines: {}, more: {} },
});

/** Hanabusa's insets and propulsion cards, as one more row of the picker. */
export const SHIP_01_INSET_ROCKET = { name: "Hanabusa insets and thruster cards", variants: [...Object.values(SHIP_INSETS).map(insetVariant), ...Object.values(CARDS).map(cardVariant)] } as const;

/** What to call each slot of the ship's variants in the picker: a module by its name, a sub-part of an inset with its number. */
export const SHIP_01_SLOT_NAMES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(HANABUSA_PARTS.map((part) => [part.id.replace(/-aft$/, "").replace(/-section$/, ""), part.name.replace(/, smallest at the stern$/, "").replace(/, section view$/, "")])),
  ...Object.fromEntries(Object.values(SHIP_INSETS).flatMap((inset) => inset.parts.map((one) => [`${inset.id}-${one.n}`, `${one.n}. ${one.name}`]))),
};
