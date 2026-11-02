// The Hubble Space Telescope as its article gives it: 13.2 m by 4.2 m. Its solar arrays have no size in a source read here.
import { type Figure, type Variant } from "./types.ts";

const S = "wikipedia-hubble" as const;
export const HUBBLE_WIDE: Figure = { value: 4.2, source: S, note: "14 feet. Its article gives 13.2 m by 4.2 m and does not say which is which." };

export const HUBBLE_VARIANTS: readonly Variant[] = [
  {
    id: "hubble",
    rocket: "hubble",
    name: "Hubble Space Telescope",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "1990-04-24", source: S, note: "On Space Shuttle Discovery, STS-31." },
    slots: ["telescope"],
    note: "NASA's model, a lettered plate painted out of its picture, in the painted look, its arrays spread as the file has them; this package's own plain shapes in the line looks. Its arrays' size has no figure in a source read here: they are NASA's model's.",
    facts: {
      height: { value: 13.2, source: S, note: "43 feet." },
      diameter: HUBBLE_WIDE,
      parts: { telescope: { value: 13.2, source: S, note: "43 feet." } },
      engines: {},
      more: {},
    },
  },
];
