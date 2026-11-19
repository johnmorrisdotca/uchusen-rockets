// The Gemini spacecraft. The width, 3 m (10 feet), and the first flight are NASA's early-years summary. The drawn length stays 5.61 m. That summary says 5.5 m (18 feet), and the 1968 technical summary says 18.82 feet.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-gemini" as const;
const E = "nasa-early-years" as const;
const G = "nasa-gemini-summary" as const;
export const GEMINI_WIDE: Figure = { value: 3, source: E, note: "10 feet. The 1968 technical summary says 10 feet as well." };

export const GEMINI_VARIANTS: readonly Variant[] = [
  {
    id: "gemini",
    rocket: "gemini",
    name: "Gemini spacecraft",
    status: "flown",
    firstFlight: { value: "1964-04-08", source: E, note: "Gemini 1, uncrewed. The first crewed flight was Gemini 3, on 1965-03-23." },
    slots: ["adapter", "capsule"],
    note: "NASA's model, its flag and the country's name painted out, in the painted look; this package's own plain shapes in the line looks. No source read here gives where the adapter ends: that is measured from NASA's model.",
    facts: {
      height: { value: 5.61, source: S, note: "18 feet 5 inches. The early-years summary says 5.5 m (18 feet). The 1968 technical summary says 18.82 feet.", others: [{ value: 5.5, source: E, note: "18 feet, the early-years summary." }, { value: 5.74, source: G, note: "18.82 feet, the 1968 technical summary." }] },
      diameter: GEMINI_WIDE,
      parts: { adapter: blank("No source read here gives its size."), capsule: blank("No source read here gives its size.") },
      engines: {},
      more: {},
    },
  },
];
