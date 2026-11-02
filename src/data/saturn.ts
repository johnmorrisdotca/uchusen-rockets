// Saturn V as flown for Apollo. Its article states feet: each value here is that figure in metres, and its note keeps the feet. The Apollo spacecraft's parts are from their own articles.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-saturn-v" as const;
const C = "wikipedia-apollo-csm" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const SATURN_V_VARIANTS: readonly Variant[] = [
  {
    id: "saturn-v",
    rocket: "saturn-v",
    name: "Saturn V (Apollo)",
    status: "flown",
    firstFlight: said("1967-11-09", S, { note: "Apollo 4, uncrewed. The first crewed flight was Apollo 8, in 1968." }),
    slots: ["first-stage", "second-stage", "third-stage", "adapter", "service-module", "capsule", "escape-tower"],
    note: "With the Apollo spacecraft on top. The lunar module rode unseen inside the adapter, and is not drawn. Its black and white paint is judged from photographs; no flag or lettering is drawn. The escape tower has no size in a source read here, so it is what the whole leaves.",
    facts: {
      height: m(110.64, S, { note: "363 feet, with the Apollo spacecraft." }),
      diameter: m(10.06, S, { note: "33 feet. The third stage is 21 feet 8 inches." }),
      parts: {
        "first-stage": m(42.06, S, { note: "S-IC, 138 feet." }),
        "second-stage": m(24.87, S, { note: "S-II, 81 feet 7 inches." }),
        "third-stage": m(17.86, S, { note: "S-IVB, 58 feet 7 inches. The flare down from the second stage is drawn as part of it, which is the only way the sourced lengths add up to the whole." }),
        adapter: m(9.45, "wikipedia-apollo-spacecraft", { brief: "added from two articles", note: "The instrument unit, 36 inches (its own article), and the spacecraft-lunar module adapter's 7 foot and 21 foot panels." }),
        "service-module": m(7.49, C, { note: "24 feet 7 inches with its engine's nozzle, which nests in the adapter; 14 feet 10 inches without." }),
        capsule: m(3.48, C, { note: "11 feet 5 inches, with its docking probe and heat shield." }),
        "escape-tower": blank("No source read here gives its size: it and its cover over the capsule are what the sourced whole leaves."),
      },
      engines: { "first-stage": said("5 F-1", S), "second-stage": said("5 J-2", S), "third-stage": said("1 J-2", S), "service-module": said("1 service propulsion engine", C) },
      more: {},
    },
  },
];
