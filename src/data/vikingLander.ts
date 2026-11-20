// Viking 1 and Viking 2, one model for both. The sizes are from NASA's own pages, read 2026-11-19.
import { type Variant } from "./types.ts";

const FACTS = "nasa-viking-facts" as const;
const SPECS = "nasa-viking-spacecraft" as const;

/** The footpad triangle, the dimension the painted model is scaled to. */
export const VIKING_FOOTPAD_SIDE = 2.21;

export const VIKING_LANDER_VARIANTS: readonly Variant[] = [
  {
    id: "viking-lander",
    rocket: "viking-lander",
    name: "Viking Lander",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "1975-08-20", source: SPECS, note: "Viking 1, on a Titan IIIE. One model stands for both landers. The page also gives the landing, 20 July 1976, at Chryse Planitia." },
    slots: ["craft"],
    note: "One model for both Viking landers. NASA's model in the painted look, scaled so the footpad triangle is the sourced 2.21 m; at that scale the file stands 1.82 m, against the facts page's about 2 m from the footpads to the high-gain antenna. This package's own plain shape in the line looks, from the sourced body, clearance, triangle and height. The surface sampler is in the painted model and not in the line shape: the pages name it and do not give its length. No mark is drawn.",
    facts: {
      height: { value: 2, source: FACTS, note: "About 2 m tall. At the 2.21 m footpad triangle, NASA's model stands 1.82 m from the pads to the far tip." },
      diameter: { value: VIKING_FOOTPAD_SIDE, source: SPECS, note: "The footpads form an equilateral triangle of 2.21 m. The facts page also says the lander was approximately 3 m across." },
      parts: { craft: { value: 2, source: FACTS, note: "About 2 m from the footpads to the high-gain antenna." } },
      engines: {},
      more: {
        mass: { value: 576, source: FACTS, note: "About 576 kg without fuel. The spacecraft page's mass line, 2.2 pounds (657 kilograms), mixes the units and is not used." },
      },
      sizes: {
        "Footpad triangle": { value: VIKING_FOOTPAD_SIDE, source: SPECS, note: "7.25 feet (2.21 m) on a side." },
        "Body width": { value: 1.5, source: FACTS, note: "The body is 1.5 m wide and 0.46 m deep. The spacecraft page's sides are 1.09 m and 0.56 m." },
        "Body depth": { value: 0.46, source: FACTS, note: "46 cm deep." },
        "Leg length": { value: 1.3, source: FACTS, note: "Three legs, each 1.3 m. Drawn from the belly, at the 0.22 m ground clearance, out to the footpad triangle: that span is 1.29 m." },
        "Ground clearance": { value: 0.22, source: FACTS, note: "22 cm under the body." },
        "Footpad diameter": { value: 0.305, source: FACTS, note: "30.5 cm. The line shape ends the leg at the pad and does not draw the disc." },
      },
    },
  },
];
