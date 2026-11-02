// The Space Launch System in its first form: its article's height and stages, with the boosters' width from their own article. Between the core stage and the crew capsule, only the service module has a size in a source read here.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-sls" as const;
const B = "wikipedia-shuttle-srb" as const;
const O = "wikipedia-orion" as const;
const E = "wikipedia-esm" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const SLS_SRB_DIAMETER = m(3.71, B, { note: "12.17 feet.", others: [{ value: 3.66, source: S, note: "The Space Launch System article rounds to 12 feet." }] });
export const ORION_DIAMETER = m(5.03, O);

export const SLS_VARIANTS: readonly Variant[] = [
  {
    id: "block-1",
    rocket: "sls",
    name: "Space Launch System Block 1, with Orion",
    status: "flown",
    firstFlight: said("2022-11-16", S, { note: "Artemis I." }),
    slots: ["first-stage", "srb-left", "srb-right", "upper-stage", "service-module", "capsule", "escape-tower"],
    note: "Its first form, with the interim upper stage and Orion on top. No source read here gives the upper stage or the abort tower a length, so they share what the whole leaves, judged from photographs. No name, flag or mark is drawn.",
    facts: {
      height: m(98.15, S, { note: "322 feet." }),
      diameter: m(8.41, S, { note: "27.6 feet: the core stage. The same box gives its core 8.4 m." }),
      parts: {
        "first-stage": m(64.6, S, { note: "The core stage." }),
        "srb-left": m(53.95, S, { note: "177 feet, five segments." }),
        "srb-right": m(53.95, S, { note: "177 feet, five segments." }),
        "upper-stage": blank("No source read here gives its length, with its adapters."),
        "service-module": m(3.96, E, { note: "13 feet: the European Service Module." }),
        capsule: m(3.3, O, { note: "The crew module." }),
        "escape-tower": blank("No source read here gives its size."),
      },
      engines: { "first-stage": said("4 RS-25", S), "srb-left": said("1 solid motor", S), "srb-right": said("1 solid motor", S) },
      more: {},
    },
  },
];
