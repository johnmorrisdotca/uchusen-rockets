// Vanguard 1. The diameter, the mass and the six antennas are the Wikipedia article's, read 2026-11-17; NASA's image page, read the same day, gives only the launch date, 17 March 1958. No source read gives the antennas' angles, so only the sphere is drawn.
import type { Variant } from "./types.ts";

const ARTICLE = "wikipedia-vanguard-1" as const;
const NASA = "nasa-vanguard-satellite-1958" as const;

/** The infobox's 152 mm (6.0 in), in metres. */
const D = 0.152;

/** Vanguard 1: the sphere. The antennas are recorded and not placed. */
export const VANGUARD_1: Variant = {
  id: "vanguard-1",
  rocket: "vanguard-1",
  name: "Vanguard 1",
  status: "flown",
  firstFlight: { value: "1958-03-17", source: NASA, note: "NASA's image page: launched on St. Patrick's Day, 17 March 1958. The article gives 12:15:41 GMT the same day." },
  slots: ["craft"],
  facts: {
    height: { value: D, source: ARTICLE, note: "A sphere, so the height is the diameter. The antennas are not in this height." },
    diameter: {
      value: D,
      source: ARTICLE,
      note: "The article's infobox, 152 mm (6.0 in).",
      others: [{ value: 0.15, source: ARTICLE, note: "The article's own text says six inches (150 mm). Other pages found on the way give 16.3 and 16.5 cm; none was read as a primary source, so none is kept." }],
    },
    parts: { craft: { value: D, source: ARTICLE, note: "The diameter of the sphere." } },
    engines: {},
    more: {
      mass: { value: 1.46, source: ARTICLE, note: "The article's 1.46 kg (3.2 lb), body and infobox. Britannica is quoted elsewhere at 1.47 kg; that page could not be read." },
      antennas: { value: 6, source: ARTICLE, note: "The article's six spring-actuated aluminium alloy antennas, each 30 cm long and 0.8 cm across. It gives no angle for them, so they are not drawn." },
    },
    sizes: { Diameter: { value: D, source: ARTICLE, note: "The article's infobox, 152 mm." } },
  },
  note: "Vanguard 1, a sphere. The article's infobox gives 152 mm and its text 150 mm; the infobox is kept and the text beside it. NASA's own catalogue page could not be read, so the article is the source of the size and the mass, and NASA's image page of the date. The six antennas have a length and no angle and are not drawn. Both looks are this package's own sphere. No name or mark is drawn. Maker the US Navy (its Naval Research Laboratory built it), country the United States.",
};

export const VANGUARD_VARIANTS: readonly Variant[] = [VANGUARD_1];
