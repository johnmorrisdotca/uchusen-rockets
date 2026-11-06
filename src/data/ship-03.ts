// ISV Miyamoto (SPX-452), the Romurusu class's first ship, and its sister ISV Ariake (SPX-186): planned interstellar flagships, this package's own design. It is four variants of one ship: stowed, with its radiators out, with the relief pod on its collar, and cut open to the
// starboard side. Every figure is blank and says it is a design: no source gives them. The ship's own numbers are in `src/model/fleet/ship-03/specs.ts`.
import { MIYAMOTO_PARTS, MIYAMOTO_VARIANT_SLOTS } from "../model/fleet/ship-03/variants.ts";
import { CARDS, SHIP_INSETS } from "../model/fleet/ship-03/insets.ts";
import { blank, type Inspector, type Variant } from "./types.ts";
import { ENGINES, HISTORY, SECTIONS, specification } from "../model/fleet/ship-03/specs.ts";
import { HULL } from "../model/fleet/ship-03/specs.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(1))} m, as designed`;

const NOTES: Readonly<Record<string, string>> = {
  miyamoto: "ISV 宮本 Miyamoto, SPX-452, Romurusu class (ロムルス級, ICV type), the flagship and command vessel, stowed, with the relay pod on its keyed collar. A narrow spine, two staggered hangar shoulders, a layered bow and two recessed drives, 380 m by 138 m by 74 m, 105,000 t at departure. Status: planned, first flight 2456. All numbers are design targets; the drive and its limits are described in the ship's bible.",
  "miyamoto-deployed": "Miyamoto with both radiator banks out: four leaves of 25 by 60 m on each, clear of the hangar corridors. Sustained main burn needs every leaf out.",
  "miyamoto-array": "Miyamoto with the gold solar array out: ten bays of lattice masts, a cell blanket each side of each mast, for time near a star.",
  "miyamoto-relief": "Miyamoto with the relief pod on its collar: six relief and equipment containers under a gantry, in place of the relay pod.",
  "miyamoto-no-collar": "ISV Miyamoto with the drive's neck bare: the shadow-shield collar swapped for none, to compare the two ways the engines meet the hull.",
  ariake: "ISV 有明 Ariake, SPX-186, \"daybreak\": the sister of ISV Miyamoto in the Romurusu class (ロムルス級), the service ship, with a Super Heavy and a Starship ship on one box's exterior saddles. Status: planned, first flight 2456.",
  "ariake-empty": "Ariake with the exterior saddles empty. The clamps stay; the two components are off.",
  "ariake-berth-keel": "Ariake with a full Starship stack berthed under the spine, the barrels moved 4 m inboard, and a methane and oxygen depot beside the stack.",
  "ariake-berth-port": "Ariake with a full Starship stack berthed to port, the two port boxes moved forward to leave a 146 m run, and a methane and oxygen depot beside the stack.",
  "ariake-cutaway": "Ariake opened to starboard at the habitation drum: the four decks in warm wood and dawn-gold.",
  "miyamoto-cutaway": "Miyamoto opened to starboard: the layers of its armour at the cut edge, the reactor and power rooms, the barrels, both bays, the decks of the habitat and the operations ring of the citadel.",
};

const NAMES: Readonly<Record<string, string>> = { miyamoto: "ISV 宮本 Miyamoto, SPX-452", "miyamoto-deployed": "ISV 宮本 Miyamoto, SPX-452, radiators out", "miyamoto-array": "ISV 宮本 Miyamoto, SPX-452, solar array out", "miyamoto-relief": "ISV 宮本 Miyamoto, SPX-452, relief pod", "miyamoto-cutaway": "ISV 宮本 Miyamoto, SPX-452, cutaway", "miyamoto-no-collar": "ISV 宮本 Miyamoto, SPX-452, no collar", ariake: "ISV 有明 Ariake, SPX-186", "ariake-empty": "ISV 有明 Ariake, SPX-186, empty mounts", "ariake-berth-keel": "ISV 有明 Ariake, SPX-186, ventral berth", "ariake-berth-port": "ISV 有明 Ariake, SPX-186, port berth", "ariake-cutaway": "ISV 有明 Ariake, SPX-186, cutaway" };

/** What the viewer's panel shows for a variant: the labels of every named section, the specification (with the sister ship's row as a link), and the notes. The other ship is one click away. */
const inspectorOf = (id: string, slots: Readonly<Record<string, string>>): Inspector => {
  const ship = id.startsWith("ariake") ? "ariake" : "miyamoto";
  const cut = id.endsWith("cutaway");
  const other = ship === "ariake" ? { rocket: "fleet-ship-03", variant: cut ? "miyamoto-cutaway" : "miyamoto", name: "ISV 宮本 Miyamoto, SPX-452" } : { rocket: "fleet-ship-ariake", variant: cut ? "ariake-cutaway" : "ariake", name: "ISV 有明 Ariake, SPX-186" };
  const lines = specification(ship);
  const pick = (names: readonly string[]) => lines.filter((l) => names.includes(l.name)).map((l) => (l.note ? `${l.name}: ${l.value} (${l.note}).` : `${l.name}: ${l.value}.`));
  return {
    sections: SECTIONS.filter((sec) => sec.module in slots).map((sec) => ({ id: `${sec.module}/${sec.id}`, name: sec.name, job: sec.does, slot: sec.module, at: [sec.at[0], (sec.y0 + sec.y1) / 2, sec.at[1]] as const, inside: Boolean(sec.deck) })),
    places: Object.fromEntries(Object.entries(slots).map(([slot, part]) => {
      const one = MIYAMOTO_PARTS.find((p) => p.id === part);
      return [slot, [one?.place?.x ?? 0, one?.y0 ?? 0, one?.place?.z ?? 0] as const];
    })),
    spec: [...lines.map((l): [string, string] => [l.name, l.note ? `${l.value} (${l.note})` : l.value]), ["Sister ship", other.name]],
    links: { "Sister ship": { rocket: other.rocket, variant: other.variant } },
    notes: {
      propulsion: [...Object.values(ENGINES).map((c) => `${c.name}: ${c.count} x ${(c.thrust / 1e6).toFixed(c.thrust >= 1e6 ? 1 : 2)} MN, ${c.note}`), ...pick(["Main drive", "Acceleration", "Peak speed", "Range"])],
      construction: [...HULL.layers.map((l) => `${l.n}. ${l.name}: ${l.made}, ${l.mm} mm.`)],
      history: Object.values(HISTORY),
      equipment: pick(["Small craft", "Ship computer", "Power", "Solar array", "Heat rejection", "Manoeuvring", "Crew"]),
    },
    insets: [],
  };
};

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
    inspector: inspectorOf(id, slots),
    facts: {
      height: fiction(metres(380)),
      diameter: fiction(metres(138)),
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
  "drive-collar": "Shadow-shield collar",
  "hangar-starboard-fore": "Starboard fore hangar",
  "hangar-port-aft": "Port aft hangar",
  "stack-berth": "Stack berth",
  "exterior-load": "Loaded saddles",
  "starship-port": "Visiting port",
};
