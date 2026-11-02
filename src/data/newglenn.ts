// New Glenn as its article gives it. Its fairing has no length here: it is what the whole leaves above the second stage's figure.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-new-glenn" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });
const said = (value: string, source: Figure<string>["source"], extra: Partial<Figure<string>> = {}): Figure<string> => ({ value, source, ...extra });

export const NEW_GLENN_VARIANTS: readonly Variant[] = [
  {
    id: "7x2",
    rocket: "new-glenn",
    name: "New Glenn 7×2",
    status: "flown",
    firstFlight: said("2025-01-16", S),
    slots: ["first-stage", "second-stage", "fairing"],
    note: "Seven engines below and two above. No source read here gives the fairing's own length, so it is what the whole leaves. Its legs and strakes are judged from photographs, and no name or mark is drawn. The 9×4, announced in 2025, is not listed: its article gives it only as about 400 feet, with no parts.",
    facts: {
      height: m(98, S),
      diameter: m(7, S),
      parts: { "first-stage": m(57.5, S), "second-stage": m(23.4, S), fairing: blank("No source read here gives its length.") },
      engines: { "first-stage": said("7 BE-4", S), "second-stage": said("2 BE-3U", S) },
      more: {},
    },
  },
];
