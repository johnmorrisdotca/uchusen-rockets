// Vulcan Centaur in the form that flew first, the VC2S: two solid boosters and the standard fairing. The October 2023 user's guide gives the 5.4 m diameter and the 15.5 m fairing. The whole, the stages and the booster stay the article's figures: the guide does not give those lengths.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-vulcan" as const;
const G = "ula-vulcan-guide" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const VULCAN_SRB_DIAMETER = m(1.62, S, { note: "63.7 inches." });
const BOOSTER = m(21.98, S, { note: "865.3 inches: the GEM 63XL's length, from the infobox's booster entry." });

export const VULCAN_VARIANTS: readonly Variant[] = [
  {
    id: "vc2s",
    rocket: "vulcan-centaur",
    name: "Vulcan Centaur VC2S",
    status: "flown",
    firstFlight: said("2024-01-08", S, { note: "Peregrine's launch, on the VC2S." }),
    slots: ["first-stage", "srb-left", "srb-right", "second-stage", "adapter", "fairing"],
    note: "Two solid boosters and the standard fairing, as on the first flight. The article gives the Centaur V as 10.66 m in its low-orbit form and 12.6 m in its high-energy form: the 10.66 m is drawn. The 2023 guide does not give the stage lengths or the whole. It gives no length for the adapter between the Centaur and the fairing, so that stays what the whole leaves. The boosters stand against the core, judged from photographs, and no name or mark is drawn. The other forms (no, four or six boosters, the long fairing, 67.3 m) are not listed.",
    facts: {
      height: m(61.6, S, { brief: "standard fairing", note: "The long fairing gives 67.3 m. The 2023 guide does not give a whole height." }),
      diameter: m(5.4, G, { note: "The guide's booster and its fairing are both 5.4 m across." }),
      parts: {
        "first-stage": m(33.3, S, { note: "The article's Vulcan first stage, 5.4 m across." }),
        "srb-left": BOOSTER,
        "srb-right": BOOSTER,
        "second-stage": m(10.66, S, { note: "Centaur V in its low-orbit form; the high-energy form is 12.6 m." }),
        adapter: blank("No source read here gives its length: it is what the whole leaves."),
        fairing: m(15.5, G, { note: "51 feet, the standard fairing. The long one is 21.3 m (70 feet)." }),
      },
      engines: { "first-stage": said("2 BE-4", G), "srb-left": said("1 solid motor, GEM 63XL", G), "srb-right": said("1 solid motor, GEM 63XL", G), "second-stage": said("2 RL10C", G, { note: "The guide says two RL10 engines on Centaur V." }) },
      more: {},
      sizes: { "Booster diameter": VULCAN_SRB_DIAMETER },
    },
  },
];
