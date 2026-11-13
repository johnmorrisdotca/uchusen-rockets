// Vanguard 1. The sphere, the mass and the antenna figures are the article read 2026-11-13. The antennas have no angle, so the sphere is the only thing drawn.
import type { Variant } from "./types.ts";

const ARTICLE = "wikipedia-vanguard-1" as const;

/** Vanguard 1: the sphere. The antennas are recorded and not placed. */
export const VANGUARD_1: Variant = {
  id: "vanguard-1",
  rocket: "vanguard-1",
  name: "Vanguard 1",
  status: "flown",
  firstFlight: { value: "1958-03-17", source: ARTICLE, note: "The infobox's launch date, 17 March 1958." },
  slots: ["craft"],
  facts: {
    height: { value: 0.152, source: ARTICLE, note: "A sphere, so the height is the infobox diameter. The antennas are not in this height." },
    diameter: {
      value: 0.152,
      source: ARTICLE,
      note: "The infobox's 152 mm sphere. The 0.91 m antenna span is a separate figure and is not drawn, because the article does not give the antennas' angle.",
      others: [{ value: 0.15, source: ARTICLE, note: "The article's body says six inches (150 mm). The infobox's 152 mm is the one kept." }],
    },
    parts: { craft: { value: 0.152, source: ARTICLE, note: "The diameter of the sphere." } },
    engines: {},
    more: {
      mass: { value: 1.46, source: ARTICLE, note: "The infobox's launch mass." },
      antennas: { value: 6, source: ARTICLE, note: "The body's six antennas. Their angle is not given, so they are not drawn." },
    },
    sizes: {
      Diameter: { value: 0.152, source: ARTICLE, note: "The infobox's sphere." },
      "Antenna span": { value: 0.91, source: ARTICLE, note: "The infobox's antenna span. Not drawn: the article does not give the angle that would place the tips." },
      "Antenna length": { value: 0.3, source: ARTICLE, note: "The body's 30 cm antennas. Not drawn: the angle is not given." },
      "Antenna diameter": { value: 0.008, source: ARTICLE, note: "The body's 0.8 cm antenna thickness. Not drawn: the angle is not given." },
    },
  },
  note: "Vanguard 1, a sphere. The body's 150 mm is kept beside the infobox's 152 mm. Six antennas, each 30 cm by 0.8 cm, span 0.91 m in the article. They are not drawn: the angle is not given. Both looks are this package's own sphere. No name or mark is drawn.",
};

export const VANGUARD_VARIANTS: readonly Variant[] = [VANGUARD_1];
