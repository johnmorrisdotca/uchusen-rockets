// Starlink, the two forms of the operator's 4 October 2022 filing, F9-1 and F9-2 (the filing's own names). The sizes and the debris-software masses are the filing's. No first-launch date is given by it. No thickness and no stowed size are given, so both stay blank.
import { blank, type Variant } from "./types.ts";

const FILE = "spacex-gen2-dimensions" as const;

const fromFiling = (value: number, note: string) => ({ value, source: FILE, note });

/** F9-1, the filing's first form: one bus and one solar array. */
export const STARLINK_F9_1: Variant = {
  id: "f9-1",
  rocket: "starlink",
  name: "Starlink F9-1",
  status: "flown",
  firstFlight: blank("The filing gives no launch date."),
  slots: ["craft"],
  facts: {
    height: blank("No source read here gives one height for the whole satellite. The drawing's tall side is the bus length."),
    diameter: blank("No source read here gives one span. The drawing sets the array out from the bus, along the side the filing gives both as the same length."),
    parts: { craft: fromFiling(2.8, "The bus length in the filing's F9-1 row.") },
    engines: {},
    more: {
      mass: { value: 303, source: FILE, note: "The mass the filing gives the debris-assessment software, not a separately weighed flight mass." },
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
  note: "The filing names this form F9-1 and gives it one solar array. No thickness and no stowed size are given, so both stay blank and only the deployed form is drawn.",
};

/** F9-2, the filing's second form: one bus and two solar arrays. */
export const STARLINK_F9_2: Variant = {
  id: "f9-2",
  rocket: "starlink",
  name: "Starlink F9-2",
  status: "flown",
  firstFlight: blank("The filing gives no launch date."),
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
  note: "The filing names this form F9-2 and gives it two solar arrays. No thickness and no stowed size are given, so both stay blank and only the deployed form is drawn.",
};

export const STARLINK_VARIANTS: readonly Variant[] = [STARLINK_F9_1, STARLINK_F9_2];
