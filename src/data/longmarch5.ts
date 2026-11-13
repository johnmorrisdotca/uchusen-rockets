// Long March 5, the CZ-5 with its second stage, as the article's infobox gives it. The fairing has no length, so it is what the standard 56.97 m leaves. The extended fairing and the CZ-5B are not this form.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-long-march-5" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

const BOOSTER = m(27.6, { note: "CZ-5-300, 3.35 m across, four of them." });
export const LONG_MARCH_5_BOOSTER_DIAMETER = m(3.35, { note: "The CZ-5-300's diameter." });

export const LONG_MARCH_5_VARIANTS: readonly Variant[] = [
  {
    id: "cz-5",
    rocket: "long-march-5",
    name: "Long March 5",
    status: "flown",
    firstFlight: said("2016-11-03", { note: "The CZ-5's first flight." }),
    slots: ["first-stage", "srb-left", "srb-right", "srb-near", "srb-far", "second-stage", "fairing"],
    note: "The standard height, four boosters and the second stage. The article also gives an extended fairing of 63.2 m, and the CZ-5B with no second stage: neither is listed. The boosters stand against the core, judged from photographs, and no name or mark is drawn.",
    facts: {
      height: m(56.97, { note: "The standard height. The extended fairing is 63.2 m." }),
      diameter: m(5),
      parts: {
        "first-stage": m(33.16, { note: "CZ-5-500, 5 m across, two YF-77." }),
        "srb-left": BOOSTER,
        "srb-right": BOOSTER,
        "srb-near": BOOSTER,
        "srb-far": BOOSTER,
        "second-stage": m(11.54, { note: "CZ-5-HO, on the CZ-5, 5 m across, two YF-75D. The CZ-5B leaves this stage off." }),
        fairing: blank("No source read here gives its length: it is what the standard 56.97 m leaves, 12.27 m."),
      },
      engines: {
        "first-stage": said("2 YF-77"),
        "second-stage": said("2 YF-75D"),
        "srb-left": said("2 YF-100"),
        "srb-right": said("2 YF-100"),
        "srb-near": said("2 YF-100"),
        "srb-far": said("2 YF-100"),
      },
      more: {},
      sizes: { "Booster diameter": LONG_MARCH_5_BOOSTER_DIAMETER },
    },
  },
];
