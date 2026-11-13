// Sputnik 1. The diameter and the launch mass are the article's infobox, read 2026-11-13. The body's 585 mm is kept beside it. The antennas have no angle, so the outer sphere is the only thing drawn.
import type { Variant } from "./types.ts";

const ARTICLE = "wikipedia-sputnik-1" as const;

/** Sputnik 1: the outer sphere. The antennas and the shell thicknesses are recorded and not placed. */
export const SPUTNIK_1: Variant = {
  id: "sputnik-1",
  rocket: "sputnik-1",
  name: "Sputnik 1",
  status: "flown",
  firstFlight: { value: "1957-10-04", source: ARTICLE, note: "The infobox's date, 4 October 1957, at 19:28:34 UTC." },
  slots: ["craft"],
  facts: {
    height: { value: 0.58, source: ARTICLE, note: "A sphere, so the height is the infobox diameter. The antennas are not in this height." },
    diameter: {
      value: 0.58,
      source: ARTICLE,
      note: "The infobox's 58 cm sphere. The antenna lengths are separate figures and are not drawn, because the article does not give their angle.",
      others: [{ value: 0.585, source: ARTICLE, note: "The article's design paragraph says 585 mm. The infobox's 58 cm is the one kept." }],
    },
    parts: { craft: { value: 0.58, source: ARTICLE, note: "The diameter of the outer sphere." } },
    engines: {},
    more: { mass: { value: 83.6, source: ARTICLE, note: "The infobox's launch mass. The design paragraph gives the same mass." } },
    sizes: {
      Diameter: { value: 0.58, source: ARTICLE, note: "The infobox's sphere." },
      "Shorter antenna": { value: 2.4, source: ARTICLE, note: "One of the two whip lengths. The article says two pairs, and that each antenna was two whips of these lengths, and the lead says four antennas. The angle is not given, so none is drawn." },
      "Longer antenna": { value: 2.9, source: ARTICLE, note: "The other whip length. Not drawn: the article does not give the angle." },
      "Shell thickness": { value: 0.002, source: ARTICLE, note: "The design paragraph's 2 mm hemispheres. Not drawn as a layer: the drawing is the outer sphere." },
      "Heat shield": { value: 0.001, source: ARTICLE, note: "The design paragraph's 1 mm heat shield. Not drawn as a layer: the drawing is the outer sphere." },
    },
  },
  note: "Sputnik 1, a sphere. The design paragraph's 585 mm is kept beside the infobox's 58 cm. Antenna parts of 2.4 m and 2.9 m are not drawn: the article does not give their angle. The 2 mm shell and the 1 mm heat shield are not drawn as layers. Both looks are this package's own sphere. No name or mark is drawn. The country is left blank: the Soviet Union is not an ISO 3166-1 code in this list.",
};

export const SPUTNIK_VARIANTS: readonly Variant[] = [SPUTNIK_1];
