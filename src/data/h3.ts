// H3 as its article gives it, in two of the forms it offers: the 22S, which flew first, and the 24L. The article gives each fairing a whole height and each stage a length, and no fairing length, so the fairing is what that whole leaves.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-h3" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

const FIRST = m(37, { note: "The stage block gives this length and no diameter. The vehicle is 5.27 m across, and that is drawn." });
const SECOND = m(12, { note: "The stage block gives this length and no diameter. The vehicle's 5.27 m is drawn." });
const BOOSTER = m(15, { note: "SRB-3, 2.5 m across. The count is 0, 2 or 4." });
export const H3_BOOSTER_DIAMETER = m(2.5, { note: "The SRB-3's diameter." });
const SHORT = blank("No source read here gives the fairing's length: on the short fairing it is what the 57 m leaves, 8 m.");
const LONG = blank("No source read here gives the fairing's length: on the long fairing it is what the 63 m leaves, 14 m. The wide fairing is not listed.");

const engines2 = { "first-stage": said("2 LE-9"), "second-stage": said("1 LE-5B-3") };
const boosterEngine = said("1 solid motor, SRB-3");

export const H3_VARIANTS: readonly Variant[] = [
  {
    id: "22s",
    rocket: "h3",
    name: "H3-22S",
    status: "flown",
    firstFlight: said("2023-03-07", { note: "The first launch. The article says the second stage did not ignite." }),
    slots: ["first-stage", "srb-left", "srb-right", "second-stage", "fairing"],
    note: "Two LE-9 engines, two SRB-3 boosters and the short fairing, the form of the first launch. The fairing's length is what the 57 m leaves. The boosters stand against the core, judged from photographs, and no name or mark is drawn. The 30S, the 22L and the 24 forms are not this one.",
    facts: {
      height: m(57, { note: "With the S fairing. With the L or W fairing the article says 63 m." }),
      diameter: m(5.27),
      parts: { "first-stage": FIRST, "srb-left": BOOSTER, "srb-right": BOOSTER, "second-stage": SECOND, fairing: SHORT },
      engines: { ...engines2, "srb-left": boosterEngine, "srb-right": boosterEngine },
      more: {},
      sizes: { "Booster diameter": H3_BOOSTER_DIAMETER },
    },
  },
  {
    id: "24l",
    rocket: "h3",
    name: "H3-24L",
    status: "flown",
    firstFlight: said("2025-10-26", { note: "The first flight of the H3-24, with HTV-X." }),
    slots: ["first-stage", "srb-left", "srb-right", "srb-near", "srb-far", "second-stage", "fairing"],
    note: "Two LE-9 engines, four SRB-3 boosters and the long fairing. The fairing's length is what the 63 m leaves. The 30S, the 22L and the wide fairing are not listed.",
    facts: {
      height: m(63, { note: "With the L or W fairing. The W fairing is not drawn." }),
      diameter: m(5.27),
      parts: { "first-stage": FIRST, "srb-left": BOOSTER, "srb-right": BOOSTER, "srb-near": BOOSTER, "srb-far": BOOSTER, "second-stage": SECOND, fairing: LONG },
      engines: { ...engines2, "srb-left": boosterEngine, "srb-right": boosterEngine, "srb-near": boosterEngine, "srb-far": boosterEngine },
      more: {},
      sizes: { "Booster diameter": H3_BOOSTER_DIAMETER },
    },
  },
];
