// James Webb Space Telescope. Sizes are from NASA's fact sheet, read 2026-11-12.
import type { Figure, Variant } from "./types.ts";

const S = "nasa-webb-fact-sheet" as const;

/** The sunshield's long side, the dimension the painted model is scaled to. */
export const JWST_LONG: Figure = { value: 21.197, source: S, note: "69.5 feet. The sunshield is 14.162 m (46.5 feet) wide." };

export const JWST_VARIANTS: readonly Variant[] = [
  {
    id: "jwst",
    rocket: "jwst",
    name: "James Webb Space Telescope",
    status: "flown",
    firstFlight: { value: "2021-12-25", source: S, note: "12:20 UTC." },
    slots: ["craft"],
    note: "NASA's model in the painted look, scaled so the sunshield's long side is the sourced 21.197 m; at that scale the file stands 11.36 m. The model's sunshield is shorter across than the sourced 14.162 m. This package's own plain shape in the line looks, from the sourced sunshield and the 6.5 m mirror. The line look's height is the fact sheet's 4.8 m for the sunshield's layers. No mark was on the model, and none is drawn.",
    facts: {
      height: { value: 4.8, source: S, note: "The fact sheet's figure for the sunshield's five layers. NASA's model at the 21.197 m sunshield stands 11.36 m." },
      diameter: JWST_LONG,
      parts: { craft: { value: 4.8, source: S, note: "The sunshield's layers, as the fact sheet gives their height." } },
      engines: {},
      more: {},
      sizes: {
        Sunshield: JWST_LONG,
        "Sunshield width": { value: 14.162, source: S, note: "46.5 feet." },
        Mirror: { value: 6.5, source: S, note: "21.3 feet, approximately, the primary mirror." },
      },
    },
  },
];
