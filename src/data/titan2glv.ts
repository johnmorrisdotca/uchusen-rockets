// The Titan II GLV as its sources give it: the stack's height with the Gemini spacecraft, the two stages' lengths from NASA's figure of the launch vehicle's stations, and the spacecraft's own length from the Gemini article. The spacecraft is the Gemini entry's shapes, not a second drawing.
import { FUTURE_STAGE_LENGTHS } from "./future-lengths.ts";
import { GEMINI_VARIANTS } from "./gemini.ts";
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-titan-ii-glv" as const;
const L = FUTURE_STAGE_LENGTHS["titan-ii-glv"];
const said = (value: string, extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source: S, ...extra });

export const TITAN_II_GLV_VARIANTS: readonly Variant[] = [
  {
    id: "glv",
    rocket: "titan-ii-glv",
    name: "Titan II GLV",
    status: "flown",
    firstFlight: said("1964-04-08", { note: "Gemini 1, uncrewed. It flew twelve times, all successful." }),
    slots: ["first-stage", "second-stage", "adapter", "capsule"],
    note: "The two stages at the lengths NASA's figure of the stations gives, with the Gemini spacecraft on top, drawn from the Gemini entry's plain shapes at its sourced 5.61 m. The three sourced lengths add to 32.674 m. The article's 109 ft (33.2 m) is 0.549 m more, and no source read here says what the difference is, so the gap is left undrawn. The first stage's length takes in the interstage; the second stage's is what the figure puts above the separation plane. Both are as wide as the vehicle, which is the only width given. The engines' size and the paint are not sourced, and no name or mark is drawn.",
    facts: {
      height: L.height,
      diameter: L.diameters.glv,
      parts: {
        "first-stage": L.parts["stage-1"],
        "second-stage": L.parts["stage-2"],
        adapter: blank("No source read here gives where the spacecraft's adapter ends: the Gemini entry measures it from NASA's model."),
        capsule: blank("No source read here gives its size apart from the spacecraft's 5.61 m."),
      },
      engines: {
        "first-stage": said("1 LR87-AJ-7", { note: "The article's text says it has two combustion chambers and nozzles." }),
        "second-stage": said("1 LR91-AJ-7"),
      },
      more: {},
      sizes: { "Gemini spacecraft": GEMINI_VARIANTS[0].facts.height },
    },
  },
];
