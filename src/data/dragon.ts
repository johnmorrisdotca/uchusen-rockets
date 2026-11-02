// Dragon as the sources give it. Dragon 1 and Dragon 2 are different spacecraft, not sizes of one.
import { blank, type Figure, type Variant } from "./types.ts";

const D1 = "wikipedia-dragon-1" as const;
const D2 = "wikipedia-dragon-2" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const DRAGON_VARIANTS: readonly Variant[] = [
  {
    id: "dragon-1",
    rocket: "dragon",
    name: "Dragon 1 (cargo, with solar wings)",
    status: "flown",
    firstFlight: said("2010-12-08", D1, { note: "COTS Demo Flight 1, its first orbital flight." }),
    slots: ["trunk", "capsule"],
    note: "The original cargo Dragon, with two solar arrays on its trunk: not the later Cargo Dragon 2. Its solar wings' span is not given by the source read here, so they are drawn from the model.",
    facts: {
      height: m(6.1, D1),
      diameter: m(3.7, D1),
      parts: {
        trunk: m(2.3, D1, { note: "Aft of the heat shield. An optional extension made 4.3 m in all." }),
        capsule: blank("No source read here gives the capsule alone."),
      },
      engines: { capsule: said("18 Draco thrusters", D1) },
      more: {},
    },
  },
  {
    id: "dragon-2",
    rocket: "dragon",
    name: "Dragon 2 (Crew Dragon)",
    status: "flown",
    firstFlight: said("2019-03-02", D2, { note: "Uncrewed test flight. First crewed flight 2020-05-30; Cargo Dragon first flew 2020-12-06." }),
    slots: ["trunk", "capsule"],
    facts: {
      height: m(8.1, D2, { note: "Capsule with trunk." }),
      diameter: m(4, D2),
      parts: {
        trunk: blank("No source read here gives the trunk alone."),
        capsule: m(4.5, D2),
      },
      engines: { capsule: said("16 Draco and 8 SuperDraco thrusters", D2) },
      more: {},
    },
  },
  {
    id: "cargo-dragon-2",
    rocket: "dragon",
    name: "Cargo Dragon 2",
    status: "flown",
    firstFlight: said("2020-12-06", D2, { note: "CRS-21." }),
    slots: ["trunk", "capsule"],
    note: "The cargo version of Dragon 2. Its article gives one set of sizes for both versions, and says Cargo Dragon lacks Crew Dragon's seats, controls, life support, windows and SuperDraco abort engines. Painted by this package's own code: the licensed model shows Crew Dragon, with windows, and no model stands in for another version.",
    facts: {
      height: m(8.1, D2, { note: "Capsule with trunk: the article's one figure for both versions." }),
      diameter: m(4, D2),
      parts: {
        trunk: blank("No source read here gives the trunk alone."),
        capsule: m(4.5, D2),
      },
      engines: { capsule: said("16 Draco thrusters", D2, { note: "It has no SuperDraco abort engines." }) },
      more: {},
    },
  },
  {
    id: "crew-dragon-inside",
    rocket: "dragon",
    name: "Inside Crew Dragon, cut open",
    status: "flown",
    firstFlight: said("2019-03-02", D2, { note: "Uncrewed test flight. First crewed flight 2020-05-30." }),
    slots: ["capsule"],
    note: "The capsule cut in half, with a person of 1.8 m for scale. Its article gives four seats, the three-screen panel over the two centre seats, the cargo below them and 9.3 cubic metres under pressure. No source read here gives those parts' sizes or places: they are judged from one published picture of the cabin.",
    facts: {
      height: m(4.5, D2, { note: "The capsule." }),
      diameter: m(4, D2),
      parts: { capsule: m(4.5, D2) },
      engines: {},
      more: { seats: { value: 4, source: D2, note: "In normal operations; 7 in an emergency evacuation." }, pressurized: { value: "9.3 cubic metres", source: D2 } },
    },
  },
];
