// The Hubble Space Telescope: 13.2 m long, 4.2 m across at the back. NASA's about page and its design page agree on the length. The about page's size table says 4.3 m for 14 feet; the design page says 4.2 m, and that is the one drawn. The launch day stays on Wikipedia. The parts' lengths and the arrays have no size on those pages: they are measured from the licensed model at that scale.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-hubble" as const;
const ABOUT = "nasa-hubble-about" as const;
const DESIGN = "nasa-hubble-design" as const;
export const HUBBLE_WIDE: Figure = {
  value: 4.2,
  source: DESIGN,
  note: "14 feet at the back, the design page. The about page's size table says 14 feet (4.3 m).",
  others: [{ value: 4.3, source: ABOUT, note: "14 feet, the about page's size table." }],
};

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
      height: { value: 13.2, source: ABOUT, note: "43.5 feet. The design page says the same 13.2 m." },
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
