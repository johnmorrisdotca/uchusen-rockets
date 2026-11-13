// Vulcan Centaur as its article gives it, in the form that flew first, the VC2S: two solid boosters and the standard fairing. The article's infobox gives the whole, the first stage, the Centaur V, the booster and the fairing; the interstage and payload adapter between the Centaur and the fairing has no length there, so it is what the whole leaves.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-vulcan" as const;
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
    note: "Two solid boosters and the standard fairing, as on the first flight. The article gives the Centaur V as 10.66 m in its low-orbit form and 12.6 m in its high-energy form: the 10.66 m is drawn. The article gives no length for the adapter between the Centaur and the fairing, so it is what the whole leaves. The boosters stand against the core, judged from photographs, and no name or mark is drawn. The article's other forms (no, four or six boosters, the long fairing, 67.3 m) are not listed.",
    facts: {
      height: m(61.6, S, { brief: "standard fairing", note: "The long fairing gives 67.3 m." }),
      diameter: m(5.4, S),
      parts: {
        "first-stage": m(33.3, S, { note: "The article's Vulcan first stage, 5.4 m across." }),
        "srb-left": BOOSTER,
        "srb-right": BOOSTER,
        "second-stage": m(10.66, S, { note: "Centaur V in its low-orbit form; the high-energy form is 12.6 m." }),
        adapter: blank("No source read here gives its length: it is what the whole leaves."),
        fairing: m(15.5, S, { note: "The standard fairing; the long one is 21.3 m." }),
      },
      engines: { "first-stage": said("2 BE-4", S), "srb-left": said("1 solid motor, GEM 63XL", S), "srb-right": said("1 solid motor, GEM 63XL", S), "second-stage": said("2 RL10C", S) },
      more: {},
      sizes: { "Booster diameter": VULCAN_SRB_DIAMETER },
    },
  },
];
