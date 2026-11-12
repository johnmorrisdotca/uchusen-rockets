// Galileo. The height and the magnetometer boom are from NASA's mission page, read 2026-11-12. The painted model is scaled to the boom.
import type { Figure, Variant } from "./types.ts";

const S = "nasa-galileo" as const;

/** The magnetometer boom, the dimension the painted model is scaled to. */
export const GALILEO_BOOM: Figure = { value: 11, source: S, note: "36 feet, to one side." };

export const GALILEO_VARIANTS: readonly Variant[] = [
  {
    id: "galileo",
    rocket: "galileo",
    name: "Galileo",
    status: "flown",
    firstFlight: { value: "1989-10-18", source: S, note: "From the cargo bay of Atlantis, STS-34." },
    slots: ["craft"],
    note: "NASA's model in the painted look, scaled so its longest side is the sourced 11 m boom; at that scale the file stands 11.00 m. This package's own plain shape in the line looks, from the sourced 5.3 m height and the 11 m boom. No mark was on the model, and none is drawn.",
    facts: {
      height: { value: 5.3, source: S, note: "17 feet, from the low-gain antenna to the bottom of the probe. NASA's model at the 11 m boom stands 11.00 m." },
      diameter: GALILEO_BOOM,
      parts: { craft: { value: 5.3, source: S, note: "17 feet high." } },
      engines: {},
      more: {},
      sizes: { Boom: GALILEO_BOOM },
    },
  },
];
