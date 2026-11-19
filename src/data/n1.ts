// The N1 as its sources give it: five blocks, each with a length and a width, and a whole. What the whole leaves above Block D, the payload, its shroud and the escape tower, is not given apart, so it is one part and an estimate.
import { FUTURE_STAGE_LENGTHS } from "./future-lengths.ts";
import type { Figure, Variant } from "./types.ts";

const S = "wikipedia-n1" as const;
const L = FUTURE_STAGE_LENGTHS.n1;
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

export const N1_DIAMETERS = L.diameters;

const BLOCKS = ["block-a", "block-b", "block-v", "block-g", "block-d"] as const;
const WHOLE = L.height.value ?? 0;
const LEFT = Math.round((WHOLE - BLOCKS.reduce((sum, key) => sum + (L.parts[key].value ?? 0), 0)) * 1000) / 1000;
export const N1_PAYLOAD_LENGTH: Figure = { value: LEFT, source: S, estimate: true, derivation: `${WHOLE} m whole minus the five sourced blocks; shroud shape not shown: no source` };
export const N1_PAYLOAD_DIAMETER: Figure = { value: L.diameters["block-d"].value, source: "russianspaceweb-n1", estimate: true, derivation: "Block D's sourced 3.7 m: no source gives the payload's own width" };

export const N1_VARIANTS: readonly Variant[] = [
  {
    id: "n1",
    rocket: "n1",
    name: "N1",
    status: "flown",
    firstFlight: said("1969-02-21", { note: "The first of its four launches. The infobox counts all four as failures, and the programme was cancelled." }),
    slots: ["first-stage", "second-stage", "third-stage", "fourth-stage", "fifth-stage", "payload"],
    note: "The five blocks at the lengths RussianSpaceWeb's stage pages give, each drawn as a straight tube at its maximum diameter: the real blocks narrow, and no source read here says how. The infobox's 105.3 m is the whole. What it leaves above Block D is not given piece by piece for the payload, its shroud and the escape tower, so it is one part and an estimate: about 29.829 m, the 105.3 m less the five sourced blocks, and as wide as Block D. Block D's 5.5 m is RussianSpaceWeb's; Wikipedia's article on Blok D says 5.70 m and 6.28 m. The engines' size and the paint are not sourced, and no name or mark is drawn.",
    facts: {
      height: L.height,
      diameter: { ...L.diameters["block-a"], others: [{ value: 17, source: S, note: "The infobox's, in whole metres." }] },
      parts: {
        "first-stage": L.parts["block-a"],
        "second-stage": L.parts["block-b"],
        "third-stage": L.parts["block-v"],
        "fourth-stage": L.parts["block-g"],
        "fifth-stage": L.parts["block-d"],
        payload: N1_PAYLOAD_LENGTH,
      },
      engines: { "first-stage": said("30 NK-15"), "second-stage": said("8 NK-15V"), "third-stage": said("4 NK-19"), "fourth-stage": said("1 NK-21"), "fifth-stage": said("1 RD-58") },
      more: { "Block shapes": { value: "straight tubes at their maximum diameters", source: "russianspaceweb-n1", estimate: true, derivation: "each block drawn as a straight tube at its sourced maximum diameter; taper not shown: no source" } },
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
