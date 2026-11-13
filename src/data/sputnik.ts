// Sputnik 1. The launch date and the mass are NASA's Sputnik chronology and James Harford's account on NASA's history pages; the diameter and the four antennas are Roger Launius's account on the same pages, read 2026-11-13. NASA's pages give no antenna length or angle, so the sphere is the only thing drawn.
import type { Variant } from "./types.ts";

const CHRONOLOGY = "nasa-history-sputnik-chronology" as const;
const LAUNIUS = "nasa-history-sputnik-launius" as const;
const HARFORD = "nasa-history-sputnik-harford" as const;

/** 22 inches in metres, the sphere in Launius's account. */
const D = 0.5588;

/** Sputnik 1: the sphere. The antennas are recorded and not placed. */
export const SPUTNIK_1: Variant = {
  id: "sputnik-1",
  rocket: "sputnik-1",
  name: "Sputnik 1",
  status: "flown",
  firstFlight: { value: "1957-10-04", source: CHRONOLOGY, note: "NASA's chronology: October 4, 1957, USSR. Harford's account gives the same day." },
  slots: ["craft"],
  facts: {
    height: { value: D, source: LAUNIUS, note: "A sphere, so the height is the diameter, Launius's 22 inches. The antennas are not in this height." },
    diameter: {
      value: D,
      source: LAUNIUS,
      note: "Launius's 22-inch sphere, 0.5588 m. NASA's pages do not agree on the size: Harford quotes a 1957 account of a 23-inch sphere.",
      others: [{ value: 0.5842, source: HARFORD, note: "Harford quotes Martin Summerfield, in Astronautics, on a 23-inch sphere. Launius's 22 inches is the one kept." }],
    },
    parts: { craft: { value: D, source: LAUNIUS, note: "The diameter of the sphere." } },
    engines: {},
    more: {
      mass: { value: 83.6, source: CHRONOLOGY, note: "The chronology's 83.6 kg, which Harford also gives. Launius says 183 pounds and Harford's quoted account 184 pounds, the same mass in pounds." },
      antennas: { value: 4, source: LAUNIUS, note: "Launius's four spring-loaded whip antennae. Their length and angle are not given, so they are not drawn." },
    },
    sizes: { Diameter: { value: D, source: LAUNIUS, note: "Launius's 22-inch sphere." } },
  },
  note: "Sputnik 1, a sphere. NASA's history pages give a 22-inch sphere in one account and a 23-inch sphere in a quoted one: the 22 inches is kept and the 23 is beside it. The four whip antennae have no length or angle on those pages and are not drawn. Both looks are this package's own sphere. No name or mark is drawn. The country is left blank: the Soviet Union is not an ISO 3166-1 code in this list.",
};

export const SPUTNIK_VARIANTS: readonly Variant[] = [SPUTNIK_1];
