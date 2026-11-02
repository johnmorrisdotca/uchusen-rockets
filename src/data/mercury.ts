// The Mercury spacecraft as its article gives it: 3.3 m long without its escape tower, and 1.8 m wide.
import { type Figure, type Variant } from "./types.ts";

const S = "wikipedia-mercury" as const;
export const MERCURY_WIDE: Figure = { value: 1.8, source: S, note: "6 feet. Its article says wide, not a diameter." };

export const MERCURY_VARIANTS: readonly Variant[] = [
  {
    id: "friendship-7",
    rocket: "mercury",
    name: "Mercury spacecraft, Friendship 7",
    status: "flown",
    firstFlight: { value: "1962-02-20", source: S, note: "Friendship 7, on Mercury-Atlas 6. The first crewed Mercury was Freedom 7, on 1961-05-05." },
    slots: ["capsule"],
    note: "NASA's model in the painted look, scaled to the sourced length and width, which are two scales, 19% apart, because the file is stouter than its sources. NASA's copy leaves its materials all one grey: their colours are judged from photographs. This package's own plain shape in the line looks. No name or flag is drawn.",
    facts: {
      height: { value: 3.3, source: S, note: "10.8 feet, without its escape tower; 25.9 feet (7.9 m) with it." },
      diameter: MERCURY_WIDE,
      parts: { capsule: { value: 3.3, source: S, note: "10.8 feet." } },
      engines: {},
      more: {},
    },
  },
];
