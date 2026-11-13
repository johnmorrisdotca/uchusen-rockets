// Ariane 6 as its article gives it, in the two forms that share the one height: the 62 (two boosters) and the 64 (four). The article gives the whole, the fairing and the P120C, and neither the lower nor the upper stage a length, so those two stay one part.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-ariane-6" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

const CORE = blank("No source read here gives the lower stage a length, or the upper stage. Together they are what the 63 m leaves under the short fairing: 49 m. The Vinci is on the upper stage and is not drawn apart.");
const FAIRING = m(14, { note: "The short fairing. The long one is 20 m. The same section also gives a long fairing as 11 m, or 18 m with the cone: that disagreement is kept, and the short 14 m is drawn. The long fairing is not listed." });
const BOOSTER = m(13.5, { note: "P120C, 3.4 m across. The P160C is 14.5 m and is not listed." });
export const ARIANE_6_BOOSTER_DIAMETER = m(3.4, { note: "The P120C's diameter." });

const shared = {
  height: m(63, { note: "One height for the rocket. The 62 and the 64 do not differ in it; they differ by booster count and by mass, about 530 t and about 860 t." }),
  diameter: m(5.4),
  parts: {
    "first-stage": CORE,
    fairing: FAIRING,
  },
  engines: { "first-stage": said("1 Vulcain 2.1") },
  more: {},
  sizes: { "Booster diameter": ARIANE_6_BOOSTER_DIAMETER },
};

export const ARIANE_6_VARIANTS: readonly Variant[] = [
  {
    id: "a62",
    rocket: "ariane-6",
    name: "Ariane 62",
    status: "flown",
    firstFlight: said("2024-07-09", { note: "The first launch, which the article says used this form." }),
    slots: ["first-stage", "srb-left", "srb-right", "fairing"],
    note: "Two P120C boosters and the short fairing. The article gives neither liquid stage a length, so they are drawn as one part, what the 63 m leaves under the 14 m fairing. The boosters stand against the core, judged from photographs, and no name or mark is drawn. The 64, the long fairing and the P160C are not this form.",
    facts: {
      ...shared,
      parts: { ...shared.parts, "srb-left": BOOSTER, "srb-right": BOOSTER },
      engines: { ...shared.engines, "srb-left": said("1 solid motor, P120C"), "srb-right": said("1 solid motor, P120C") },
    },
  },
  {
    id: "a64",
    rocket: "ariane-6",
    name: "Ariane 64",
    status: "flown",
    firstFlight: said("2026-02", { note: "The article says this form was first launched in February 2026, and does not give the day." }),
    slots: ["first-stage", "srb-left", "srb-right", "srb-near", "srb-far", "fairing"],
    note: "Four P120C boosters and the same short fairing and the same 63 m. The article does not give the two liquid stages apart, so they stay one part. The long fairing and the P160C Block 2, first launched on 17 June 2026, are not listed.",
    facts: {
      ...shared,
      parts: { ...shared.parts, "srb-left": BOOSTER, "srb-right": BOOSTER, "srb-near": BOOSTER, "srb-far": BOOSTER },
      engines: {
        ...shared.engines,
        "srb-left": said("1 solid motor, P120C"),
        "srb-right": said("1 solid motor, P120C"),
        "srb-near": said("1 solid motor, P120C"),
        "srb-far": said("1 solid motor, P120C"),
      },
    },
  },
];
