// Jupiter-C as its article gives it. It is the rocket Juno I, which launched the first American satellite, was derived from.
import { type Figure, type Variant } from "./types.ts";

const S = "wikipedia-jupiter-c" as const;
export const JUPITER_C_WIDE: Figure = { value: 1.8, source: S, note: "5.8 feet." };

export const JUPITER_C_VARIANTS: readonly Variant[] = [
  {
    id: "jupiter-c",
    rocket: "jupiter-c",
    name: "Jupiter-C",
    status: "flown",
    firstFlight: { value: "1956-09-20", source: S },
    slots: ["vehicle"],
    note: "NASA's model, its lettering removed with the two pictures that carried it, in the painted look; this package's own plain shape in the line looks.",
    facts: {
      height: { value: 21.3, source: S, note: "69.9 feet." },
      diameter: JUPITER_C_WIDE,
      parts: { vehicle: { value: 21.3, source: S, note: "69.9 feet." } },
      engines: { vehicle: { value: "1 A-7, then 11 and 3 solid rockets", source: S } },
      more: {},
    },
  },
];
