// Starlink v1.5 and v2 mini. The sizes and the debris-software masses are the operator's 4 October 2022 filing. The article, read 2026-11-13, supplies the names and the first-launch dates. No thickness and no stowed size are given, so both stay blank.
import { blank, type Variant } from "./types.ts";

const FILE = "spacex-gen2-dimensions" as const;
const ARTICLE = "wikipedia-starlink" as const;

const fromFiling = (value: number, note: string) => ({ value, source: FILE, note });

/** v1.5, the filing's F9-1 form: one bus and one solar array. */
export const STARLINK_V15: Variant = {
  id: "v1-5",
  rocket: "starlink",
  name: "Starlink v1.5",
  status: "flown",
  firstFlight: { value: "2021-01-24", source: ARTICLE, note: "The article's date for the first v1.5 launch. The sizes are the filing's F9-1 table of 4 October 2022, not a measurement of that launch." },
  slots: ["craft"],
  facts: {
    height: blank("No source read here gives one height for the whole satellite. The drawing's tall side is the bus length."),
    diameter: blank("No source read here gives one span. The drawing sets the array out from the bus, along the side the filing gives both as the same length."),
    parts: { craft: fromFiling(2.8, "The bus length in the filing's F9-1 row.") },
    engines: {},
    more: {
      mass: { value: 303, source: FILE, note: "The mass the filing gives the debris-assessment software, not a separately weighed flight mass.", others: [{ value: 295, source: ARTICLE, note: "The article says about 295 kg." }] },
      arrays: fromFiling(1, "The filing's F9-1 row gives one solar array."),
      thickness: blank("The filing gives no thickness."),
    },
    sizes: {
      "Bus length": fromFiling(2.8, "F9-1 bus length."),
      "Bus width": fromFiling(1.3, "F9-1 bus width."),
      "Solar array length": fromFiling(8.1, "F9-1 solar-array length."),
      "Solar array width": fromFiling(2.8, "F9-1 solar-array width, the side it shares with the bus length."),
    },
  },
  note: "The filing names this form F9-1. The article read on 2026-11-13 identifies that form with v1.5. No thickness and no stowed size are given, so both stay blank and only the deployed form is drawn.",
};

/** v2 mini, the filing's F9-2 form: one bus and two solar arrays. */
export const STARLINK_V2_MINI: Variant = {
  id: "v2-mini",
  rocket: "starlink",
  name: "Starlink v2 mini",
  status: "flown",
  firstFlight: { value: "2023-02-27", source: ARTICLE, note: "The article's date for the first v2 mini launch. The sizes are the filing's F9-2 table of 4 October 2022." },
  slots: ["craft"],
  facts: {
    height: blank("No source read here gives one height for the whole satellite. The drawing's tall side is the bus length."),
    diameter: blank("No source read here gives one span. The drawing sets an array out from each side of the bus."),
    parts: { craft: fromFiling(4.1, "The bus length in the filing's F9-2 row.") },
    engines: {},
    more: {
      mass: { value: 800, source: FILE, note: "The mass the filing gives the debris-assessment software, not a separately weighed flight mass." },
      arrays: fromFiling(2, "The filing's F9-2 row gives two solar arrays."),
      thickness: blank("The filing gives no thickness."),
    },
    sizes: {
      "Bus length": fromFiling(4.1, "F9-2 bus length."),
      "Bus width": fromFiling(2.7, "F9-2 bus width."),
      "Solar array length": fromFiling(12.8, "F9-2 solar-array length, each of the two."),
      "Solar array width": fromFiling(4.1, "F9-2 solar-array width, the side it shares with the bus length."),
    },
  },
  note: "The filing names this form F9-2 and gives it two solar arrays. The article read on 2026-11-13 calls that form v2 mini. No thickness and no stowed size are given, so both stay blank and only the deployed form is drawn.",
};

export const STARLINK_VARIANTS: readonly Variant[] = [STARLINK_V15, STARLINK_V2_MINI];
