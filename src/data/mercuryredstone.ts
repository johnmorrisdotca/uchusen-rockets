// Mercury-Redstone as its article gives it: 25.41 m and 1.78 m across, one Rocketdyne A-7, and a Mercury spacecraft as the payload. The stage block gives no length. The spacecraft's own article gives 7.9 m with the escape tower and 3.3 m without it, so the booster and the tower are what those figures leave. The capsule is the existing Mercury part, not a second drawing.
import { blank, type Figure, type Variant } from "./types.ts";

const S = "wikipedia-mercury-redstone" as const;
const SHIP = "wikipedia-mercury" as const;
const m = (value: number, source: Figure["source"], extra: Partial<Figure> = {}): Figure => ({ value, source, ...extra });

export const MERCURY_REDSTONE_VARIANTS: readonly Variant[] = [
  {
    id: "redstone",
    rocket: "mercury-redstone",
    name: "Mercury-Redstone",
    status: "flown",
    firstFlight: { value: "1960-11-21", source: S, note: "The article's first launch. It counts that launch as the one failure. Freedom 7, the first crewed Mercury, flew later and is not this date." },
    slots: ["first-stage", "capsule", "escape-tower"],
    partIds: { capsule: "mercury-friendship-7-capsule" },
    note: "The launch vehicle with the Mercury spacecraft in its payload slot, the same capsule the Mercury entry already draws. The article gives the whole as 25.41 m and does not say that figure leaves the spacecraft out, so the spacecraft and its tower are taken as inside it. The booster is what 25.41 m leaves after the spacecraft's 7.9 m with its tower, and the tower is what 7.9 m leaves after the capsule's 3.3 m. The stage block gives no length of its own. Jupiter-C's numbers are not used. The black and white bands and the engine's size are judged from photographs. The fins have no size in a source read here, so they are not drawn, and no name or mark is drawn.",
    facts: {
      height: m(25.41, S, { note: "83.38 feet, which the article shows as 25.41 m." }),
      diameter: m(1.78, S, { note: "5.83 feet, which the article shows as 1.78 m." }),
      parts: {
        "first-stage": blank("No source read here gives the booster's length: it is what the 25.41 m leaves after the spacecraft's 7.9 m with its escape tower, 17.51 m."),
        capsule: m(3.3, SHIP, { note: "10.8 feet, the spacecraft without its escape tower, from the spacecraft's own article." }),
        "escape-tower": blank("No source read here gives the tower's length: the spacecraft's article gives 7.9 m with the tower and 3.3 m without it, and their difference, 4.6 m, is drawn."),
      },
      engines: { "first-stage": { value: "1 Rocketdyne A-7", source: S } },
      more: {
        mass: { value: "30000 kg", source: S, note: "The article shows 66,000 lb as 30,000 kg." },
        payload: { value: "Mercury spacecraft", source: S, date: "2026-11-13", note: "The article names what this launch vehicle carries. The capsule drawn here is that spacecraft, the part already drawn for Friendship 7." },
      },
      sizes: {},
    },
  },
];
