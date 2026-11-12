// New Horizons. The body, the antenna and the overall height are from the January 2006 launch press kit. The launch date is from the mission page. Read 2026-11-12.
import { type Figure, type Variant } from "./types.ts";

const KIT = "nasa-new-horizons-press-kit" as const;

/** The high-gain antenna, the dimension the painted model is scaled to. */
export const NEW_HORIZONS_DISH: Figure = { value: 2.1, source: KIT, note: "A 2.1-meter (83-inch) diameter antenna dish on the top deck." };

/** From the payload attachment fitting to the top of the dish antenna stack. */
export const NEW_HORIZONS_HEIGHT: Figure = { value: 2.2, source: KIT, note: "2.2 meters (87 inches)." };

export const NEW_HORIZONS_VARIANTS: readonly Variant[] = [
  {
    id: "new-horizons",
    rocket: "new-horizons",
    name: "New Horizons",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "2006-01-19", source: "nasa-new-horizons", note: "19:00:00 UT, from Cape Canaveral, Launch Complex 41." },
    slots: ["craft"],
    note: "NASA's model in the painted look, its pictures left out and scaled so the high-gain antenna is the sourced 2.1 m; at that scale the file stands 2.25 m. This package's own plain shape in the line looks, from the sourced body and that antenna. The line look stands 2.2 m and does not draw the RTG: the press kit names it and does not give its length. No mark was on the parts, and none is drawn.",
    facts: {
      height: NEW_HORIZONS_HEIGHT,
      diameter: { value: 2.7, source: KIT, note: "The primary structure is 2.7 meters (108 inches) at its widest." },
      parts: { craft: NEW_HORIZONS_HEIGHT },
      engines: {},
      more: {},
      sizes: {
        "High-gain antenna": NEW_HORIZONS_DISH,
        "Body length": { value: 2.1, source: KIT, note: "The primary structure is 2.1 meters (83 inches) long." },
        "Body width": { value: 2.7, source: KIT, note: "2.7 meters at its widest." },
        "Body height": { value: 0.7, source: KIT, note: "The primary structure is 0.7 meters (27 inches) tall." },
      },
    },
  },
];
