// Ariane 6 in the two forms drawn at the article's one height. The user's manual and ArianeGroup's page agree on the 14 m fairing and the 5.4 m width. ArianeGroup gives 56 m and 62 m for the whole, a 22 m equipped booster, and the liquid stages at 32 m and 12 m. Those stay beside the drawn figures.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-ariane-6" as const;
const M = "arianespace-ariane-6-manual" as const;
const A = "arianegroup-ariane-6" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

const CORE = blank("No source read here gives the lower stage and the upper stage as the one part that is drawn. Together they are what the 63 m leaves under the short fairing: 49 m. ArianeGroup gives them apart, the lower stage 32 m and the upper stage 12 m, and those two lengths are not drawn. The Vinci is on the upper stage and is not drawn apart.");
const FAIRING = m(14, { source: M, note: "The short fairing. The user's manual and ArianeGroup both give a long fairing of 20 m, and ArianeGroup says that length is for the 64. The article also says the long fairing is 11 m, or 18 m with the cone. The short 14 m is drawn. The long fairing is not listed." });
const BOOSTER = m(13.5, { source: A, note: "The P120C motor. The equipped booster is 22 m on the same page, and that length is not drawn. The P160C motor is one metre longer, and the page says the booster's outside size does not change. The P160C is not listed.", others: [{ value: 22, source: A, note: "The equipped booster, not the motor." }] });
export const ARIANE_6_BOOSTER_DIAMETER = m(3.4, { source: A, note: "The equipped booster and the P120C motor." });

const shared = {
  height: m(63, { note: "The article's one height. The 62 and the 64 do not differ in it there; they differ by booster count and by mass, about 530 t and about 860 t. ArianeGroup gives 56 m with the short fairing and 62 m with the long one.", others: [{ value: 56, source: A, note: "With the short fairing." }, { value: 62, source: A, note: "With the long fairing." }] }),
  diameter: m(5.4, { source: M, note: "The user's manual gives the fairing an external diameter of 5.4 m. ArianeGroup gives the same 5.4 m for the lower stage, the upper stage and the upper composite." }),
  parts: {
    "first-stage": CORE,
    fairing: FAIRING,
  },
  engines: { "first-stage": said("1 Vulcain 2.1", { source: M }) },
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
      engines: { ...shared.engines, "srb-left": said("1 solid motor, P120C", { source: M }), "srb-right": said("1 solid motor, P120C", { source: M }) },
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
        "srb-left": said("1 solid motor, P120C", { source: M }),
        "srb-right": said("1 solid motor, P120C", { source: M }),
        "srb-near": said("1 solid motor, P120C", { source: M }),
        "srb-far": said("1 solid motor, P120C", { source: M }),
      },
    },
  },
];
