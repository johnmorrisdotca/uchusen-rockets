// The N1 as its sources give it: five blocks, each with a length and a width, and a whole. What the whole leaves above Block D, the payload, its shroud and the escape tower, is not given apart, so it is one part and a blank.
import { FUTURE_STAGE_LENGTHS } from "./future-lengths.ts";
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-n1" as const;
const L = FUTURE_STAGE_LENGTHS.n1;
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

export const N1_DIAMETERS = L.diameters;

export const N1_VARIANTS: readonly Variant[] = [
  {
    id: "n1",
    rocket: "n1",
    name: "N1",
    status: "flown",
    firstFlight: said("1969-02-21", { note: "The first of its four launches. The infobox counts all four as failures, and the programme was cancelled." }),
    slots: ["first-stage", "second-stage", "third-stage", "fourth-stage", "fifth-stage", "payload"],
    note: "The five blocks at the lengths RussianSpaceWeb's stage pages give, each drawn as a straight tube at its maximum diameter: the real blocks narrow, and no source read here says how. The infobox's 105.3 m is the whole. What it leaves above Block D, about 29.8 m, is not given piece by piece for the payload, its shroud and the escape tower, so it is one part. Block D's 5.5 m is RussianSpaceWeb's; Wikipedia's article on Blok D says 5.70 m and 6.28 m. The engines' size and the paint are not sourced, and no name or mark is drawn.",
    facts: {
      height: L.height,
      diameter: { ...L.diameters["block-a"], others: [{ value: 17, source: S, note: "The infobox's, in whole metres." }] },
      parts: {
        "first-stage": L.parts["block-a"],
        "second-stage": L.parts["block-b"],
        "third-stage": L.parts["block-v"],
        "fourth-stage": L.parts["block-g"],
        "fifth-stage": L.parts["block-d"],
        payload: blank("No source read here gives the payload, its shroud and the escape tower apart: they are what the 105.3 m leaves above Block D, 29.829 m.", "not given apart"),
      },
      engines: { "first-stage": said("30 NK-15"), "second-stage": said("8 NK-15V"), "third-stage": said("4 NK-19"), "fourth-stage": said("1 NK-21"), "fifth-stage": said("1 RD-58") },
      more: {},
      sizes: {
        "Block A diameter": L.diameters["block-a"],
        "Block B diameter": L.diameters["block-b"],
        "Block V diameter": L.diameters["block-v"],
        "Block G diameter": L.diameters["block-g"],
        "Block D diameter": L.diameters["block-d"],
      },
    },
  },
];
