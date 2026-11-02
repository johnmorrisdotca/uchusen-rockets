// The Gemini spacecraft as its article gives it: 5.61 m long and 3 m wide. Its parts have no figure in a source read here. NASA's model at that length comes to 2.96 m wide.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-gemini" as const;
export const GEMINI_WIDE: Figure = { value: 3, source: S, note: "10 feet. Its article says wide, not a diameter." };

export const GEMINI_VARIANTS: readonly Variant[] = [
  {
    id: "gemini",
    rocket: "gemini",
    name: "Gemini spacecraft",
    status: "flown",
    firstFlight: { value: "1964-04-08", source: S, note: "Gemini 1, uncrewed. The first crewed flight was Gemini 3, on 1965-03-23." },
    slots: ["adapter", "capsule"],
    note: "NASA's model, its flag and the country's name painted out, in the painted look; this package's own plain shapes in the line looks. No source read here gives where the adapter ends: that is measured from NASA's model.",
    facts: {
      height: { value: 5.61, source: S, note: "18 feet 5 inches." },
      diameter: GEMINI_WIDE,
      parts: { adapter: blank("No source read here gives its size."), capsule: blank("No source read here gives its size.") },
      engines: {},
      more: {},
    },
  },
];
