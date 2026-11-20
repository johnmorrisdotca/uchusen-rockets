// The crawler-transporter. The sizes are NASA's fact sheet, read 2026-11-19. The first move under its own power is NASA's crawlers page, read the same day.
import { type Variant } from "./types.ts";

const SHEET = "nasa-crawler-fact-sheet" as const;
const PAGE = "nasa-the-crawlers" as const;

/** 131 feet, the fact sheet's overall length, in metres. */
export const CRAWLER_LENGTH = 39.93;
/** 114 feet, the fact sheet's overall width, in metres. */
export const CRAWLER_WIDTH = 34.75;
/** 20 feet, the fact sheet's height with the cylinders retracted, in metres. */
export const CRAWLER_HEIGHT = 6.1;

export const CRAWLER_VARIANTS: readonly Variant[] = [
  {
    id: "crawler",
    rocket: "crawler",
    name: "Crawler",
    status: "flown",
    firstWord: "Moved",
    firstFlight: { value: "1965-01-23", source: PAGE, note: "The crawler moved under its own power for the first time. One model stands for both transporters." },
    slots: ["craft"],
    note: "One model for both crawler-transporters. NASA's model in the painted look, scaled so its length is the fact sheet's 131 feet (39.93 m); at that scale the file is 32.75 m wide, against the sheet's 114 feet (34.75 m), and 7.73 m tall, inside the sheet's 20 to 26 feet. The line look is this package's own slab at the sheet's 131 by 114 feet and the 20-foot retracted height. The trucks are in the painted model and not in the line shape. No mark is drawn. Maker NASA, country the United States.",
    facts: {
      height: { value: CRAWLER_HEIGHT, source: SHEET, note: "20 feet with the jacking cylinders retracted. 26 feet (7.92 m) with them extended. NASA's model, at the 131-foot length, stands 7.73 m." },
      diameter: { value: CRAWLER_WIDTH, source: SHEET, note: "114 feet wide. At the 131-foot length, NASA's model is 32.75 m wide." },
      parts: { craft: { value: CRAWLER_HEIGHT, source: SHEET, note: "20 feet with the jacking cylinders retracted. The length, 131 feet, is kept under sizes." } },
      engines: {},
      more: {
        mass: { value: 2_993_710, source: PAGE, note: "Approximately 6.6 million pounds." },
      },
      sizes: {
        Length: { value: CRAWLER_LENGTH, source: SHEET, note: "131 feet." },
        Width: { value: CRAWLER_WIDTH, source: SHEET, note: "114 feet." },
        "Height, retracted": { value: CRAWLER_HEIGHT, source: SHEET, note: "20 feet, the jacking cylinders retracted." },
        "Height, extended": { value: 7.92, source: SHEET, note: "26 feet, the jacking cylinders extended." },
      },
    },
  },
];
