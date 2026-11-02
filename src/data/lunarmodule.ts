// The Apollo lunar module as its article gives it. NASA's model is scaled to the sourced 7.04 m; its width with the legs out then comes to 9 m against the sourced 9.4 m.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-lunar-module" as const;
const m = (value: number, extra: Partial<Figure> = {}): Figure => ({ value, source: S, ...extra });

export const LM_WIDTH = m(9.4, { note: "31 feet, with its landing gear out. 13 feet 10 inches (4.22 m) without." });
export const LM_ASCENT_WIDTH = m(4.29, { note: "14 feet 1 inch." });

export const LUNAR_MODULE_VARIANTS: readonly Variant[] = [
  {
    id: "lunar-module",
    rocket: "lunar-module",
    name: "Apollo lunar module",
    status: "flown",
    firstFlight: { value: "1968-01-22", source: S, note: "LM-1, uncrewed, on Apollo 5." },
    slots: ["descent", "ascent"],
    note: "NASA's model, its flag and the country's name removed, in the painted look; this package's own plain shapes in the line looks. Its article gives the descent stage as 3.231 m and the ascent stage as 2.832 m; NASA's model is cut where its parts meet, so each is drawn taller, with what stands on it.",
    facts: {
      height: m(7.04, { note: "23 feet 1 inch." }),
      diameter: LM_WIDTH,
      parts: {
        descent: blank("10 feet 7.2 inches (3.231 m) in its article, plus 5 feet 7.2 inches (1.707 m) of landing probes. Drawn with the frames the ascent stage stands on."),
        ascent: blank("9 feet 3.5 inches (2.832 m) in its article. Drawn with its antennas."),
      },
      engines: { descent: { value: "1 LM descent engine", source: S }, ascent: { value: "1 LM ascent engine", source: S } },
      more: {},
    },
  },
];
