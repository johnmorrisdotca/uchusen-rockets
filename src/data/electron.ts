// Electron as its article gives it. Its stages and fairing add to a metre less than the whole, and no source read here says what that metre is: it is drawn as the stages' interstage.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-electron" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const ELECTRON_VARIANTS: readonly Variant[] = [
  {
    id: "electron",
    rocket: "electron",
    name: "Electron",
    status: "flown",
    firstFlight: said("2017-05-25", S),
    slots: ["first-stage", "adapter", "second-stage", "fairing"],
    note: "Carbon composite, as its article says, and painted black here from photographs. Its stages and fairing add to 17 m against a whole of 18 m, and no source read here says what the difference is: it is drawn as an interstage. No name or mark is drawn.",
    facts: {
      height: m(18, S),
      diameter: m(1.2, S),
      parts: { "first-stage": m(12.1, S), adapter: blank("No source read here gives it: it is what the whole leaves."), "second-stage": m(2.4, S), fairing: m(2.5, S) },
      engines: { "first-stage": said("9 Rutherford", S), "second-stage": said("1 Rutherford", S) },
      more: {},
    },
  },
];
