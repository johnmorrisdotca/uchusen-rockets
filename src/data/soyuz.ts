// Soyuz-2 as its article gives it. Its fairing has no length here: it is what the whole leaves above the third stage.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-soyuz-2" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });
const BOOSTER = m(19.6, S, { note: "Block B, V, G and D." });

export const SOYUZ_BOOSTER_DIAMETER = m(2.68, S);
export const SOYUZ_VARIANTS: readonly Variant[] = [
  {
    id: "soyuz-2",
    rocket: "soyuz",
    name: "Soyuz-2 (2.1a and 2.1b)",
    status: "flown",
    firstFlight: said("2004-11-08", S, { note: "The 2.1a. The 2.1b first flew on 2006-12-27." }),
    slots: ["first-stage", "booster-1", "booster-2", "booster-3", "booster-4", "third-stage", "fairing"],
    note: "Here with a plain fairing: Block A in the middle, four boosters round it, and the third stage. Its 46.3 m is the box's for the 2.1a and 2.1b, and it can carry other fairings. The fairing's length is what the whole leaves. The core's waist, the boosters' lean and the paint are judged from photographs. No name or mark is drawn.",
    facts: {
      height: m(46.3, S),
      diameter: m(10.3, S, { note: "Across the boosters' fins. Block A is 2.95 m." }),
      parts: {
        "first-stage": m(27.1, S, { note: "Block A, the core: the box's second stage, which burns from the ground with the boosters." }),
        "booster-1": BOOSTER,
        "booster-2": BOOSTER,
        "booster-3": BOOSTER,
        "booster-4": BOOSTER,
        "third-stage": m(6.7, S, { note: "Block I." }),
        fairing: blank("No source read here gives its length."),
      },
      engines: { "first-stage": said("1 RD-108A", S), "booster-1": said("1 RD-107A", S), "booster-2": said("1 RD-107A", S), "booster-3": said("1 RD-107A", S), "booster-4": said("1 RD-107A", S), "third-stage": said("1 RD-0110 or RD-0124", S) },
      more: {},
    },
  },
];
