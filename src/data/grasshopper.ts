// Grasshopper: a test vehicle, not an orbital rocket.
import { blank, type Variant } from "./types.ts";

const G = "wikipedia-grasshopper" as const;

export const GRASSHOPPER_VARIANTS: readonly Variant[] = [
  {
    id: "grasshopper",
    rocket: "grasshopper",
    name: "Grasshopper (test vehicle)",
    status: "test-vehicle",
    firstFlight: { value: "2012-09-21", source: G, brief: "a 1.8 m hop", note: "Its last flight, on 2013-10-07, reached 744 m." },
    slots: ["vehicle"],
    note: "An experimental vertical take-off and landing vehicle, built from a Falcon 9 v1.0 first-stage tank. It never flew to orbit. Its fixed legs and frame are drawn from the model, whose maker calls it low-poly.",
    facts: {
      height: { value: 32, source: G },
      diameter: blank("No source read here gives its own diameter."),
      parts: { vehicle: { value: 32, source: G } },
      engines: { vehicle: { value: "1 Merlin 1D", source: G } },
      more: {},
    },
  },
];
