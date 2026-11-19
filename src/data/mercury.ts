// The Mercury spacecraft. The drawn length stays 3.3 m and the drawn width 1.8 m. NASA's early-years summary says about 2.7 m tall and 189.2 cm wide in the prose, and 2.9 m by 1.9 m in its table.
import { type Figure, type Variant } from "./types.ts";

const S = "wikipedia-mercury" as const;
const E = "nasa-early-years" as const;
export const MERCURY_WIDE: Figure = { value: 1.8, source: S, note: "6 feet. The early-years prose says 189.2 cm (74.5 inches) across the bottom. Its table says 1.9 m (6.2 feet).", others: [{ value: 1.892, source: E, note: "189.2 cm, the early-years prose." }, { value: 1.9, source: E, note: "6.2 feet, the early-years table." }] };

export const MERCURY_VARIANTS: readonly Variant[] = [
  {
    id: "friendship-7",
    rocket: "mercury",
    name: "Mercury spacecraft, Friendship 7",
    status: "flown",
    firstFlight: { value: "1962-02-20", source: E, note: "Friendship 7, on Mercury-Atlas 6. The first crewed Mercury was Freedom 7, on 1961-05-05." },
    slots: ["capsule"],
    note: "NASA's model in the painted look, scaled to the sourced length and width, which are two scales, 19% apart, because the file is stouter than its sources. NASA's copy leaves its materials all one grey: their colours are judged from photographs. This package's own plain shape in the line looks. No name or flag is drawn.",
    facts: {
      height: { value: 3.3, source: S, note: "10.8 feet, without its escape tower; 25.9 feet (7.9 m) with it. The early-years prose says about 2.7 m (nine feet). Its table says 2.9 m (9.5 feet).", others: [{ value: 2.7, source: E, note: "About nine feet, the early-years prose." }, { value: 2.9, source: E, note: "9.5 feet, the early-years table." }] },
      diameter: MERCURY_WIDE,
      parts: { capsule: { value: 3.3, source: S, note: "10.8 feet." } },
      engines: {},
      more: {},
    },
  },
];
