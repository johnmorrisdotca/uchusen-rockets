// Delta IV Heavy as its own article gives it. The two side cores and the centre core are the same length, the second stage has a length, and the fairing does not, so the fairing is what the 70.7 m leaves.
import { blank, type Figure, type Variant } from "./types.ts";

const H = "wikipedia-delta-iv-heavy" as const;
const F = "wikipedia-delta-iv" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

const CORE = m(40.8, H, { note: "Each common booster core. The centre burns longer; the length is the same." });

export const DELTA_IV_HEAVY_VARIANTS: readonly Variant[] = [
  {
    id: "heavy",
    rocket: "delta-iv-heavy",
    name: "Delta IV Heavy",
    status: "flown",
    firstFlight: said("2004-12-21", H, { note: "The article's first flight. It calls that launch a partial failure." }),
    slots: ["first-stage", "side-left", "side-right", "second-stage", "fairing"],
    note: "Three common cores side by side, 15.3 m across, and the 5 m second stage. The article gives no fairing length, so the fairing is what the 70.7 m leaves (16.2 m). The side cores stand against the centre, judged from photographs, and no name or mark is drawn. The Medium forms and their GEM-60 boosters are not listed.",
    facts: {
      height: m(70.7, H),
      diameter: m(5.1, H, { note: "The vehicle. The width is 15.3 m, three cores." }),
      parts: {
        "first-stage": CORE,
        "side-left": CORE,
        "side-right": CORE,
        "second-stage": m(13.7, H, { note: "The Heavy article's length. The Delta IV article gives the DCSS as 12 m in general; 13.7 m is the Heavy's." }),
        fairing: blank("No source read here gives its length: it is what the 70.7 m leaves, 16.2 m."),
      },
      engines: {
        "first-stage": said("1 RS-68", H),
        "side-left": said("1 RS-68", H),
        "side-right": said("1 RS-68", H),
        "second-stage": said("1 RL10-B-2", H),
      },
      more: { "Across, three cores": m(15.3, H, { note: "The article's width." }) },
      sizes: { "Second stage diameter": m(5.1, F, { note: "The Delta IV article's 5 m DCSS is 5.1 m across. The Heavy article gives this stage's empty mass as 3490 kg, the same figure, and does not restate the diameter." }) },
    },
  },
];
