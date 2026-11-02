// Apollo docked to Soyuz, as flown in 1975. Apollo's sizes are from its own article and Soyuz's from the Soyuz 7K-TM article. No article read here gives the docking module's size, or the length of the three docked.
import { blank, type Figure, type Variant } from "./types.ts";

const A = "wikipedia-apollo-soyuz" as const;
const C = "wikipedia-apollo-csm" as const;
const T = "wikipedia-soyuz-7k-tm" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });

export const AS_CSM_LONG = m(11, C, { note: "36.2 feet." });
export const AS_CSM_WIDE = m(3.9, C, { note: "12.8 feet." });
export const AS_SOYUZ_LONG = m(7.48, T);
export const AS_SOYUZ_WIDE = m(2.72, T);

export const APOLLO_SOYUZ_VARIANTS: readonly Variant[] = [
  {
    id: "apollo-soyuz",
    rocket: "apollo-soyuz",
    name: "Apollo and Soyuz, docked",
    status: "flown",
    firstFlight: { value: "1975-07-15", source: A, note: "Both launched that day; they docked on the 17th, as its article says." },
    slots: ["csm", "docking-module", "soyuz"],
    note: "NASA's model, its flags and the countries' names painted out, in the painted look, stood on end; this package's own plain shapes in the line looks. Apollo and Soyuz are each scaled to their own sourced length and width, and the docking module, which no source read here sizes, to Apollo's scale. The whole is what those add to, so it has no figure of its own.",
    facts: {
      height: blank("No source read here gives the length of the three docked."),
      diameter: AS_CSM_WIDE,
      parts: { csm: AS_CSM_LONG, "docking-module": blank("No source read here gives its size."), soyuz: AS_SOYUZ_LONG },
      engines: { csm: { value: "1 service propulsion engine", source: C } },
      more: {},
    },
  },
];
