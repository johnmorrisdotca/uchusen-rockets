// The Agena target vehicle. The length and the diameter are NASA's early-years summary, read 2026-11-19. The same summary's table gives Gemini 8's day.
import { type Variant } from "./types.ts";

const E = "nasa-early-years" as const;

/** 9.75 m, the summary's length. */
export const AGENA_LENGTH = 9.75;
/** 1.5 m, the summary's diameter. */
export const AGENA_WIDTH = 1.5;

export const AGENA_VARIANTS: readonly Variant[] = [
  {
    id: "agena",
    rocket: "agena",
    name: "Agena Target Vehicle",
    status: "flown",
    firstWord: "Docked",
    firstFlight: { value: "1966-03-16", source: E, note: "The summary's table: Gemini 8 docked with the unmanned Agena 8." },
    slots: ["craft"],
    note: "NASA's model in the painted look. The file is shorter for its width than the summary, so the length and the width are scaled on their own: the length to 9.75 m and the round body to 1.5 m. A boom on the file reaches past that body. The line look is this package's own tube at those two sizes. The engine bell, the docking end and the boom are in the painted model only: the summary gives the cylinder and not their sizes. The flag was painted out of the picture. No lettering is drawn. Maker NASA, country the United States.",
    facts: {
      height: { value: AGENA_LENGTH, source: E, note: "9.75 metres (32 feet)." },
      diameter: { value: AGENA_WIDTH, source: E, note: "1.5 metres (five feet)." },
      parts: { craft: { value: AGENA_LENGTH, source: E, note: "9.75 metres long." } },
      engines: {},
      more: {},
      sizes: {
        Length: { value: AGENA_LENGTH, source: E, note: "9.75 metres (32 feet)." },
        Diameter: { value: AGENA_WIDTH, source: E, note: "1.5 metres (five feet), the cylinder." },
      },
    },
  },
];
