// Saturn V as flown for Apollo. The whole, the first stage and the 33-foot width are NASA Release 67-275 (the Apollo 4 press kit). The second and third stages stay the article's 81 feet 7 inches and 58 feet 7 inches, with the press kit's 81.5 feet and 58.4 feet beside them. The Apollo spacecraft's parts are from their own articles.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-saturn-v" as const;
const N = "nasa-apollo4-presskit" as const;
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
      height: m(110.64, N, { note: "363 feet, with the Apollo spacecraft and the escape tower." }),
      diameter: m(10.06, N, { note: "33 feet, the first and second stages. The third stage is 21 feet 8 inches." }),
      parts: {
        "first-stage": m(42.06, N, { note: "S-IC, 138 feet." }),
        "second-stage": m(24.87, S, { note: "S-II, 81 feet 7 inches. The press kit says 81.5 feet.", others: [{ value: 24.84, source: N, note: "81.5 feet in the Apollo 4 press kit." }] }),
        "third-stage": m(17.86, S, { note: "S-IVB, 58 feet 7 inches. The press kit says 58.4 feet, and also 58 feet 5 inches. The flare down from the second stage is drawn as part of it, which is the only way the sourced lengths add up to the whole.", others: [{ value: 17.8, source: N, note: "58.4 feet in the Apollo 4 press kit." }] }),
        adapter: m(9.45, "wikipedia-apollo-spacecraft", { brief: "added from two articles", note: "The instrument unit, 36 inches (its own article), and the spacecraft-lunar module adapter's 7 foot and 21 foot panels." }),
        "service-module": m(7.49, C, { note: "24 feet 7 inches with its engine's nozzle, which nests in the adapter; 14 feet 10 inches without." }),
        capsule: m(3.48, C, { note: "11 feet 5 inches, with its docking probe and heat shield." }),
        "escape-tower": blank("The press kit gives the launch escape system as 33 feet. The drawing still uses what the sourced whole leaves, so the stages add to 363 feet."),
      },
      engines: { "first-stage": said("5 F-1", N), "second-stage": said("5 J-2", N), "third-stage": said("1 J-2", N), "service-module": said("1 service propulsion engine", C) },
      more: {},
    },
  },
];
