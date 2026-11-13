// LAGEOS-1. The diameter, the launch mass and the reflector count are the article's infobox, read 2026-11-13. The body's other masses are kept beside the infobox figure. The reflectors have no size, so they are not drawn.
import type { Variant } from "./types.ts";

const ARTICLE = "wikipedia-lageos" as const;

/** LAGEOS-1: one brass sphere. */
export const LAGEOS_1: Variant = {
  id: "lageos-1",
  rocket: "lageos",
  name: "LAGEOS-1",
  status: "flown",
  firstFlight: { value: "1976-05-04", source: "nasa-lageos", note: "The mission page's date for LAGEOS. The article's infobox gives the same day." },
  slots: ["craft"],
  facts: {
    height: { value: 0.6, source: ARTICLE, note: "A sphere, so the height is the diameter the infobox gives." },
    diameter: { value: 0.6, source: ARTICLE, note: "The infobox's diameter of the sphere." },
    parts: { craft: { value: 0.6, source: ARTICLE, note: "The diameter of the sphere." } },
    engines: {},
    more: {
      mass: {
        value: 406.965,
        source: ARTICLE,
        note: "The infobox's launch mass for LAGEOS-1. NASA's mission page, read the same day, says 900-pound golf balls and does not give this figure.",
        others: [
          { value: 400, source: ARTICLE, note: "The article's body gives 400 kg for one of the two satellites and does not say which." },
          { value: 411, source: ARTICLE, note: "The article's body gives 411 kg for one of the two satellites and does not say which." },
        ],
      },
      reflectors: { value: 426, source: ARTICLE, note: "422 glass and 4 germanium in the infobox, which is the body's 426. Their size is not given, so they are not drawn." },
    },
    sizes: { Diameter: { value: 0.6, source: ARTICLE, note: "The infobox's diameter of the sphere." } },
  },
  note: "LAGEOS-1, a sphere. The article's body also gives 400 kg and 411 kg for the two satellites; the infobox's 406.965 kg is kept. The retroreflectors are not drawn: the article gives their number and not their size. Both looks are this package's own sphere. No name or mark is drawn.",
};

export const LAGEOS_VARIANTS: readonly Variant[] = [LAGEOS_1];
