// Jupiter-C as its article gives it. It is the rocket Juno I, which launched the first American satellite, was derived from. NASA's model shows it as Juno I with Explorer 1 on top, and its four stages are this package's slots.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-jupiter-c" as const;
export const JUPITER_C_WIDE: Figure = { value: 1.8, source: S, note: "5.8 feet." };

export const JUPITER_C_VARIANTS: readonly Variant[] = [
  {
    id: "jupiter-c",
    rocket: "jupiter-c",
    name: "Jupiter-C",
    status: "flown",
    firstFlight: { value: "1956-09-20", source: S },
    slots: ["tail", "first-stage", "tub", "fourth-stage"],
    note: "NASA's model, its lettering removed with the two pictures that carried it, in the painted look, one file a stage; this package's own plain shapes in the line looks. Its article gives no stage lengths: where each stage begins is measured from NASA's model at the sourced height.",
    facts: {
      height: { value: 21.3, source: S, note: "69.9 feet." },
      diameter: JUPITER_C_WIDE,
      parts: {
        tail: blank("The tail unit and its fins: NASA's model at the sourced height gives 3.1 m. Its article gives no stage lengths."),
        "first-stage": blank("The Redstone body: NASA's model at the sourced height gives 15 m. Its article gives no stage lengths."),
        tub: blank("The spinning tub: NASA's model at the sourced height gives 1.4 m. Its article gives no stage lengths."),
        "fourth-stage": blank("The top stage with Explorer 1: NASA's model at the sourced height gives 1.9 m. Its article names three stages and gives no lengths; the fourth is Juno I's, as the model shows it."),
      },
      engines: { tail: { value: "1 A-7", source: S }, tub: { value: "11, then 3, solid rockets", source: S } },
      more: {},
    },
  },
];
