// The International Space Station as its article gives it: 109 m long overall, 73 m across its solar arrays. NASA's model is scaled to the 109 m, and its arrays then span 71.7 m.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-iss" as const;
export const ISS_LONG: Figure = { value: 109, source: S, note: "358 feet overall; 94 m (310 feet) for the truss." };
/** NASA's model at the sourced length. */
export const ISS_DRAWN_TALL = 71.66;

export const ISS_VARIANTS: readonly Variant[] = [
  {
    id: "iss",
    rocket: "iss",
    name: "International Space Station",
    status: "flown",
    firstWord: "First module",
    firstFlight: { value: "1998-11-20", source: S },
    slots: ["station"],
    note: "NASA's model, of the station as it was when that was made, in the painted look, scaled to the sourced length; it is not today's station. NASA's copy leaves its materials all one grey: their colours are judged from photographs. This package's own plain shapes in the line looks. It stands with its truss across the front: height here is across its arrays.",
    facts: {
      height: { value: 73, source: S, note: "239 feet, across its solar arrays. NASA's model, at the sourced length, comes to 71.7 m." },
      diameter: ISS_LONG,
      parts: { station: blank("The sourced whole; NASA's model comes to 71.7 m across its arrays.") },
      engines: {},
      more: { truss: { value: 94, source: S, note: "The truss's length, in metres." } },
    },
  },
];
