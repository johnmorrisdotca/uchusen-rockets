// ISV Kyotori (SPX-045), the fleet's explorer of two ships and a station: planned interstellar exploration vessel, this package's own design. Four variants of one design: the two ships docked into the station with its wings out, the same with the wings
// folded, the ships apart from the station, and the station's four quarters cut open to show their decks. Every figure is blank and says it is a design: no source gives them. The ship's own numbers are in `src/model/fleet/ship-kyotori/specs.ts`.
import { KYOTORI_PARTS, KYOTORI_VARIANT_SLOTS } from "../model/fleet/ship-kyotori/variants.ts";
import { CLASS_FACTS, CLASS_TABLE, ENGINES, LETTERS, SECTIONS, specification } from "../model/fleet/ship-kyotori/specs.ts";
import { blank, type Inspector, type Variant } from "./types.ts";

const FICTION = "A design of this package, with no source.";
const fiction = (brief: string) => blank<number>(FICTION, brief);
const metres = (value: number) => `${Number(value.toFixed(1))} m, as designed`;

const NOTES: Record<string, string> = {
  kyotori: "ISV 鏡鳥 Kyotori, SPX-045: two equal ships side by side, held together by latch frames and docked at their bows into the housing at the stern of a station, with its mirror ahead, four quarters of eight decks each, a dock at every quarter for large ships (a Dragon and a Starship upper stage attached), and four solar wings out.",
  "kyotori-flared": "The same with the four solar wings swung out and half the blanket let out, the first stage of the ISS arrays' deployment.",
  "kyotori-stowed": "The same with the four solar wings folded on their masts.",
  "kyotori-four": "Four ships in a 2x2 cluster at the housing's four bays, latched along two faces each, drives side by side steered a few degrees outward, tanks on the outer faces only.",
  "kyotori-separated": "The two ships away from the station and from each other, each with its own drive, crew space and docking arm; the station stays as a destination.",
  "kyotori-cutaway": "The station with its four quarters cut open: eight decks of furnished rooms in each, cabins, galley and mess, gym, medical bay, lounges, school and gardens.",
};
for (const L of LETTERS) {
  NOTES[`kyotori-${L.toLowerCase()}`] = `Ship ${L} of the Kyotori class on her own: ${CLASS_TABLE.find((r) => r.row === "Role")![L]}, with ${CLASS_TABLE.find((r) => r.row === "Its own compartments")![L]}; every other part is the class's, shared with her sisters.`;
}
const NAMES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(LETTERS.map((L) => [`kyotori-${L.toLowerCase()}`, `ISV 鏡鳥 Kyotori class, SPX-045, ship ${L}`])), kyotori: "ISV 鏡鳥 Kyotori, SPX-045", "kyotori-flared": "ISV 鏡鳥 Kyotori, SPX-045, wings flared", "kyotori-stowed": "ISV 鏡鳥 Kyotori, SPX-045, wings stowed", "kyotori-four": "ISV 鏡鳥 Kyotori, SPX-045, four ships", "kyotori-separated": "ISV 鏡鳥 Kyotori, SPX-045, ships apart", "kyotori-cutaway": "ISV 鏡鳥 Kyotori, SPX-045, quarters cut open" };

/** The class table's rows for the ship a variant shows alone (none for a variant that shows the whole station). */
const classRows = (slots: Readonly<Record<string, string>>): [string, string][] => {
  const role = Object.values(slots).find((p) => p.startsWith("k-role-"))?.slice(7);
  const L = LETTERS.find((l) => CLASS_FACTS[l].role === role);
  return L ? CLASS_TABLE.map((r): [string, string] => [`Class: ${r.row}`, r[L]]) : [];
};

const inspectorOf = (slots: Readonly<Record<string, string>>): Inspector => {
  const lines = specification();
  return {
    sections: SECTIONS.filter((sec) => sec.module in slots).map((sec) => ({ id: sec.id, name: sec.name, job: sec.does, slot: sec.module, at: [sec.at[0], sec.y, sec.at[2]] as const, inside: true })),
    places: Object.fromEntries(Object.entries(slots).map(([slot, part]) => {
      const one = KYOTORI_PARTS.find((p) => p.id === part);
      return [slot, [one?.place.x ?? 0, one?.y0 ?? 0, one?.place.z ?? 0] as const];
    })),
    spec: [...lines.map((l): [string, string] => [l.name, l.note ? `${l.value} (${l.note})` : l.value]), ...classRows(slots)],
    notes: { propulsion: [ENGINES.note], construction: [], history: [], equipment: lines.filter((l) => ["Docking", "Solar wings", "Mirror", "Quarters"].includes(l.name)).map((l) => `${l.name}: ${l.value}.`) },
    insets: [],
  };
};

const variantOf = ([id, slots]: [string, Readonly<Record<string, string>>]): Variant => ({
  id,
  rocket: "fleet-kyotori",
  name: NAMES[id],
  status: "fictional" as const,
  firstWord: "Planned first flight",
  firstFlight: blank<string>(FICTION, "Planned for 2469"),
  slots: Object.keys(slots),
  partIds: Object.fromEntries(Object.entries(slots).map(([slot, part]) => [slot, `fleet-kyotori-${part}`])),
  note: NOTES[id],
  inspector: inspectorOf(slots),
  view: { tiltMax: 90 },
  facts: {
    height: fiction(metres(450)),
    diameter: fiction(metres(128)),
    parts: Object.fromEntries(Object.entries(slots).map(([slot, part]) => [slot, fiction(metres(KYOTORI_PARTS.find((one) => one.id === part)?.height ?? 0))])),
    engines: { "a-drive": blank<string>(FICTION, "twelve coil rings, no bell"), "b-drive": blank<string>(FICTION, "twelve coil rings, no bell") },
    more: {},
  },
});

/** Kyotori's variants. */
export const KYOTORI_VARIANTS: readonly Variant[] = Object.entries(KYOTORI_VARIANT_SLOTS).map(variantOf);

/** What to call each slot of the ship's variants in the picker: the name of the first part that stands in it, without its ship or class prefix. */
export const KYOTORI_SLOT_NAMES: Readonly<Record<string, string>> = (() => {
  const out: Record<string, string> = {};
  for (const slots of Object.values(KYOTORI_VARIANT_SLOTS)) for (const [slot, part] of Object.entries(slots)) {
    if (out[slot]) continue;
    const name = KYOTORI_PARTS.find((p) => p.id === part)?.name ?? slot;
    out[slot] = name.replace(/^Class part: /, "").replace(/, apart$/, "").replace(/^Ship ([A-D]): /, (_, L: string) => `Ship ${L}, `);
  }
  out["s-wings"] = "Solar wings";
  return out;
})();
