// Explorer 1. The length, the diameter, the mass and the launch date are NASA's Explorer 1 fast-facts page, read 2026-11-17, which says its figures leave out the rocket; the four whip antennas and the Jet Propulsion Laboratory as maker are the Wikipedia article's, read the same day. Neither gives an antenna length or the length of the nose, so the antennas are not drawn.
import type { Variant } from "./types.ts";

const FACTS = "nasa-explorer-1-fast-facts" as const;
const ARTICLE = "wikipedia-explorer-1" as const;

/** Explorer 1: one body, a tube with a cone at its head. */
export const EXPLORER_1: Variant = {
  id: "explorer-1",
  rocket: "explorer-1",
  name: "Explorer 1",
  status: "flown",
  firstFlight: { value: "1958-01-31", source: FACTS, note: "NASA's date. The article gives 1 February 1958, 03:47:56 GMT for the same launch: the evening of the 31st in Florida." },
  slots: ["craft"],
  facts: {
    height: { value: 2.03, source: FACTS, note: "NASA's 203 centimetres (80 inches), without the rocket. The article's infobox gives the same 203 cm." },
    diameter: {
      value: 0.159,
      source: FACTS,
      note: "NASA's 15.9 centimetres (6.25 inches).",
      others: [{ value: 0.152, source: ARTICLE, note: "The article's infobox gives 15.2 cm (6.0 in). NASA's page is the one kept." }],
    },
    parts: { craft: { value: 2.03, source: FACTS, note: "The whole satellite, the instrument section and the empty rocket case orbiting as one." } },
    engines: {},
    more: {
      mass: {
        value: 14,
        source: FACTS,
        note: "NASA's 14 kilograms (30.66 pounds).",
        others: [{ value: 13.97, source: ARTICLE, note: "The article's infobox gives 13.97 kg (30.8 lb). NASA's round figure is the one kept." }],
      },
      antennas: { value: 4, source: ARTICLE, note: "The article's turnstile of four flexible whips. It gives no length, and neither does NASA's page, so they are not drawn." },
    },
    sizes: { Length: { value: 2.03, source: FACTS, note: "NASA's 203 centimetres." }, Diameter: { value: 0.159, source: FACTS, note: "NASA's 15.9 centimetres." } },
  },
  note: "Explorer 1, the first United States satellite: a tube 2.03 m long and 15.9 cm across. NASA's page and the article's infobox agree on the length and differ on the diameter (15.9 and 15.2 cm) and the mass (14 and 13.97 kg); NASA's are kept and the article's are beside them. The four whip antennas have no length on either page and are not drawn, and the sections of the body have no length, so the cone at its head, 0.3 m, is judged from photographs. Both looks are this package's own tube. No name or mark is drawn.",
};

export const EXPLORER_VARIANTS: readonly Variant[] = [EXPLORER_1];
