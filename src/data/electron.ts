// Electron. The whole, the width and the fairing are Rocket Lab's payload user's guide, version 8.0. The stage lengths stay the article's: the guide does not give them. They add to a metre less than the whole, and no source read here says what that metre is: it is drawn as the stages' interstage.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-electron" as const;
const R = "rocketlab-electron-guide" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const ELECTRON_VARIANTS: readonly Variant[] = [
  {
    id: "electron",
    rocket: "electron",
    name: "Electron",
    status: "flown",
    firstFlight: said("2017-05-25", S, { note: "The guide says the first launch was in 2017 and does not give the day." }),
    slots: ["first-stage", "adapter", "second-stage", "fairing"],
    note: "Carbon composite, as the guide says, and painted black here from photographs. Its stages and fairing add to 17 m against a whole of 18 m. The guide does not give the stage lengths or say what the difference is: it is drawn as an interstage. No name or mark is drawn.",
    facts: {
      height: m(18, R),
      diameter: m(1.2, R, { note: "The guide's maximum diameter, and the fairing's diameter." }),
      parts: { "first-stage": m(12.1, S, { note: "The guide does not give this length." }), adapter: blank("No source read here gives it: it is what the whole leaves."), "second-stage": m(2.4, S, { note: "The guide gives this stage's diameter, 1.2 m, and not its length." }), fairing: m(2.5, R, { note: "The guide's fairing height." }) },
      engines: { "first-stage": said("9 Rutherford", R, { note: "Nine sea-level Rutherford engines." }), "second-stage": said("1 Rutherford", R, { note: "One vacuum Rutherford engine." }) },
      more: {},
    },
  },
];
