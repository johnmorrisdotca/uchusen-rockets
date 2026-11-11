// The Hubble Space Telescope as its article gives it: 13.2 m by 4.2 m. Its parts' lengths and its arrays have no size in a source read here: they are measured from the licensed model at that scale.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-hubble" as const;
export const HUBBLE_WIDE: Figure = { value: 4.2, source: S, note: "14 feet. Its article gives 13.2 m by 4.2 m and does not say which is which." };

export const HUBBLE_VARIANTS: readonly Variant[] = [
  {
    id: "hubble",
    rocket: "hubble",
    name: "Hubble Space Telescope",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "1990-04-24", source: S, note: "On Space Shuttle Discovery, STS-31." },
    slots: ["aft-shroud", "equipment-section", "forward-shell", "light-shield", "aperture-door", "array-left", "array-right", "antenna-near", "antenna-far"],
    note: "Cybertron B-127's model, with its wordmark and logos painted out, in the painted look, one file a part, its aperture door turned shut; this package's own plain shapes in the line looks. Its parts' lengths and its arrays' size have no figure in a source read here: they are the model's, at the sourced length and width.",
    facts: {
      height: { value: 13.2, source: S, note: "43 feet." },
      diameter: HUBBLE_WIDE,
      parts: {
        "aft-shroud": blank("The model at the sourced length gives 3.65 m."),
        "equipment-section": blank("The model at the sourced length gives 1.7 m."),
        "forward-shell": blank("The model at the sourced length gives 3 m."),
        "light-shield": blank("The model at the sourced length gives 4.7 m."),
        "aperture-door": blank("Shut, a plate on the light shield's rim."),
        "array-left": blank("A wing's size has no figure in a source read here: the model's wing is 3.7 m out and 6.2 m tall."),
        "array-right": blank("A wing's size has no figure in a source read here: the model's wing is 3.7 m out and 6.2 m tall."),
        "antenna-near": blank("An antenna's boom has no figure in a source read here: the model's reaches 3.9 m out."),
        "antenna-far": blank("An antenna's boom has no figure in a source read here: the model's reaches 3.9 m out."),
      },
      engines: {},
      more: { "forward-section-width": blank("The forward section's width has no figure in a source read here: the model's is 2.6 m at the sourced width of the aft shroud.") },
    },
  },
];
