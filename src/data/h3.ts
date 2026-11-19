// H3 in the 22S, which flew first, and the 24L. JAXA's specifications page agrees on 57 m and 63 m. The drawn width stays 5.27 m. The stage lengths stay the article's. The fairing stays what the whole leaves: JAXA's fairing page says the long one is 16.4 m.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-h3" as const;
const J = "jaxa-h3-specs" as const;
const B = "jaxa-h3-srb" as const;
const F = "jaxa-h3-fairing" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

const FIRST = m(37, { note: "The article's stage block. JAXA's specifications page does not give this length. The vehicle is 5.27 m across, and that is drawn." });
const SECOND = m(12, { note: "The article's stage block. JAXA's specifications page does not give this length. The vehicle's 5.27 m is drawn." });
const BOOSTER = m(15, { note: "The article. JAXA's SRB-3 table, marked as the plan, says 14.6 m and 2.5 m across. The count is 0, 2 or 4.", others: [{ value: 14.6, source: B, note: "14.6 m, the SRB-3 specifications table, marked as the plan." }] });
export const H3_BOOSTER_DIAMETER = m(2.5, { source: J, note: "The specifications page. The SRB-3 table, marked as the plan, says the same 2.5 m." });
const SHORT = blank("No source read here gives the short fairing's length: it is what the 57 m leaves, 8 m. The fairing page says the long fairing is about twice the short one, and gives the long one's length, 16.4 m, not the short one's.");
const LONG = { ...blank("No source read here gives a length that is drawn: on the long fairing it is what the 63 m leaves, 14 m. The wide fairing is not listed."), others: [{ value: 16.4, source: F, note: "16.4 m, the long fairing. The page says it is about twice the short one." }] };

const engines2 = { "first-stage": said("2 LE-9", { source: J, note: "The specifications page offers two or three." }), "second-stage": said("1 LE-5B-3", { source: J }) };
const boosterEngine = said("1 solid motor, SRB-3", { source: J, note: "The specifications page offers none, two or four." });

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
      height: m(57, { source: J, note: "With the short fairing. With the long fairing the same page says 63 m. With the wide fairing the article says 63 m." }),
      diameter: m(5.27, { others: [{ value: 5.2, source: J, note: "5.2 m, the first and second stages on the specifications page." }] }),
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
      height: m(63, { source: J, note: "With the long fairing. The same page says 57 m with the short fairing. The wide fairing is not drawn." }),
      diameter: m(5.27, { others: [{ value: 5.2, source: J, note: "5.2 m, the first and second stages on the specifications page." }] }),
      parts: { "first-stage": FIRST, "srb-left": BOOSTER, "srb-right": BOOSTER, "srb-near": BOOSTER, "srb-far": BOOSTER, "second-stage": SECOND, fairing: LONG },
      engines: { ...engines2, "srb-left": boosterEngine, "srb-right": boosterEngine, "srb-near": boosterEngine, "srb-far": boosterEngine },
      more: {},
      sizes: { "Booster diameter": H3_BOOSTER_DIAMETER },
    },
  },
];
