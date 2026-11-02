// Where a booster comes down: the drone ships and the landing zones. A landing is drawn on each with Falcon 9 Block 5's first stage, its legs out. Only the first barge's deck and the Cape's pads have a size in a source read here.
import { blank, type Figure, type Variant } from "./types.ts";

const A = "wikipedia-asds" as const;
const L = "wikipedia-lz" as const;
const V = "wikipedia-slc-4" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

const LANDED = blank("Falcon 9 Block 5's first stage, as its own part: its legs' span has no figure for this version in a source read here.");
const DECK = (brief: string, note: string): Figure => blank(note, brief);
const SAME = "Its own article gives no size for this ship, so it is drawn at Of Course I Still Love You's size.";
const OCISLY_NOTE = "The landing platform of the first barge of this name was 170 by 300 feet; this ship's size is said to be nearly identical.";

const ship = (id: string, name: string, firstUse: Figure<string>, note: string, deckLength: Figure, deckWidth: Figure): Variant => ({
  id,
  rocket: "droneship",
  name,
  status: "support",
  firstWord: "In service",
  firstFlight: firstUse,
  slots: ["deck", "landed"],
  note: `${note} No name, target mark or logo is drawn: its deck carries only a plain ring. Hull and equipment are judged from photographs.`,
  facts: { height: blank("No source read here gives it."), diameter: blank("A ship has a length and a width instead."), parts: { deck: blank("No source read here gives its height."), landed: LANDED }, engines: {}, more: {}, sizes: { "Deck length": deckLength, "Deck width": deckWidth } },
});

export const DRONESHIP_VARIANTS: readonly Variant[] = [
  ship("ocisly", "Of Course I Still Love You", said("2015-06", A, { brief: "entered service", note: "On the Marmac 304 hull. It incorporated a steel blast wall." }), "The first drone ship to carry a rocket stage that landed on one, in 2016. It has been based at Long Beach since 2021.", m(91.44, A, { brief: "nearly identical to the first barge", note: `${OCISLY_NOTE} 300 feet.` }), m(51.82, A, { brief: "nearly identical to the first barge", note: `${OCISLY_NOTE} 170 feet.` })),
  ship("jrti", "Just Read the Instructions", said("2016-01-17", A, { brief: "first use", note: "On the Marmac 303 hull, the third of these ships and the second of this name. Refitted with four larger thrusters in 2019 and 2020." }), "In April 2026 it was announced that it will move from Falcon to Starship work.", DECK("no source for this ship", SAME), DECK("no source for this ship", SAME)),
  ship("asog", "A Shortfall of Gravitas", said("2021-07-09", A, { brief: "first sea trials", note: "On the Marmac 302 hull." }), "It needs no tug to reach the landing area.", DECK("no source for this ship", SAME), DECK("no source for this ship", SAME)),
];

export const LANDING_ZONE_VARIANTS: readonly Variant[] = [
  {
    id: "lz-1",
    rocket: "landing-zone",
    name: "Landing Zone 1, Cape Canaveral",
    status: "support",
    firstWord: "In service",
    firstFlight: said("2015-12-22", L, { brief: "first landing", note: "On the old Launch Complex 13." }),
    slots: ["pad", "landed"],
    note: "A plain round concrete pad. Its real pad is marked with a stylised letter from the company's logo, and that is not drawn.",
    facts: { height: blank("A pad on the ground."), diameter: m(85.95, L, { note: "282 feet." }), parts: { pad: blank("A pad on the ground."), landed: LANDED }, engines: {}, more: {} },
  },
  {
    id: "lz-4",
    rocket: "landing-zone",
    name: "Landing Zone 4, Vandenberg",
    status: "support",
    firstWord: "In service",
    firstFlight: said("2018", V, { brief: "landings began" }),
    slots: ["pad", "landed"],
    note: "On the old Space Launch Complex 4W. No source read here gives its size, so it is drawn at Landing Zone 1's size, and no mark is drawn.",
    facts: { height: blank("A pad on the ground."), diameter: blank("No source read here gives it.", "no source"), parts: { pad: blank("A pad on the ground."), landed: LANDED }, engines: {}, more: {} },
  },
];
