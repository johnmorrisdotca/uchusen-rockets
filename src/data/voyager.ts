// Voyager 1 and Voyager 2, one model for both. Sizes are from NASA's own questions page, read 2026-11-12.
import { type Figure, type Variant } from "./types.ts";

const S = "nasa-voyager-faq" as const;

/** The high-gain antenna, the dimension the painted model is scaled to. */
export const VOYAGER_DISH: Figure = { value: 3.7, source: S, note: "3.7 meters across. The same answer calls it 12 feet." };

export const VOYAGER_VARIANTS: readonly Variant[] = [
  {
    id: "voyager",
    rocket: "voyager",
    name: "Voyager",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "1977", source: "nasa-voyager", note: "The mission page gives the year. Voyager 2 left first and Voyager 1 a few weeks later. One model stands for both." },
    slots: ["craft"],
    note: "One model for Voyager 1 and Voyager 2. NASA's model in the painted look, scaled so the high-gain antenna is the sourced 3.7 m; at that scale the file stands 7.74 m, because the booms rise past the dish. This package's own plain shape in the line looks, from the sourced antenna, bus, height and magnetometer boom. The record's marked face is left out. No name or flag is drawn.",
    facts: {
      height: { value: 3.8, source: S, note: "About 3.8 m from the top of the reflector to the feet, the booms not counted. NASA's model at the 3.7 m antenna stands 7.74 m." },
      diameter: VOYAGER_DISH,
      parts: { craft: { value: 3.8, source: S, note: "About 3.8 m from the reflector to the feet." } },
      engines: {},
      more: {},
      sizes: {
        "High-gain antenna": VOYAGER_DISH,
        "Bus diameter": { value: 1.8, source: S, note: "About 1.8 m. The page says about." },
        "Magnetometer boom": { value: 13, source: S, note: "13 m long." },
      },
    },
  },
];
