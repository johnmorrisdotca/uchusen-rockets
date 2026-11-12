// Parker Solar Probe. The heat shield's 2.4 m is from NASA's account of fitting it; the press kit's 2.3 m is the other figure. The height and the body are from the August 2018 press kit. Read 2026-11-12.
import type { Figure, Variant } from "./types.ts";

const KIT = "nasa-parker-press-kit" as const;
const SHIELD = "nasa-parker-shield" as const;

/** The heat shield, the dimension the painted model is scaled to. */
export const PARKER_SHIELD: Figure = {
  value: 2.4,
  source: SHIELD,
  note: "8 feet, on the page about fitting the shield. The August 2018 press kit says about 7.5 feet (2.3 m).",
  others: [{ value: 2.3, source: KIT, note: "About 7.5 feet, in the August 2018 press kit." }],
};

export const PARKER_VARIANTS: readonly Variant[] = [
  {
    id: "parker-solar-probe",
    rocket: "parker-solar-probe",
    name: "Parker Solar Probe",
    status: "flown",
    firstFlight: { value: "2018-08-11", source: KIT, note: "The press kit's targeted date." },
    slots: ["craft"],
    note: "NASA's model in the painted look, scaled so the heat shield is the sourced 2.4 m; at that scale the file stands 2.20 m. Its pictures are left out and plain colours kept. This package's own plain shape in the line looks, from the sourced 3 m height, the 1 m body and the 2.4 m shield. No mark is drawn.",
    facts: {
      height: { value: 3, source: KIT, note: "About 9.8 feet. NASA's model at the 2.4 m shield stands 2.20 m." },
      diameter: PARKER_SHIELD,
      parts: { craft: { value: 3, source: KIT, note: "About 9.8 feet tall." } },
      engines: {},
      more: {},
      sizes: {
        "Heat shield": PARKER_SHIELD,
        Body: { value: 1, source: KIT, note: "About 3.3 feet across, below the cooling system." },
      },
    },
  },
];
