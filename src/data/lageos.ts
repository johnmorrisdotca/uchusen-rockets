// LAGEOS-1. The diameter, the mass, the reflector count, the shape and the launch date are the International Laser Ranging Service's page for the satellite, read 2026-11-13. The reflectors have a count and no size, so they are not drawn.
import type { Variant } from "./types.ts";

const PAGE = "ilrs-lageos-1" as const;

/** LAGEOS-1: one sphere. */
export const LAGEOS_1: Variant = {
  id: "lageos-1",
  rocket: "lageos",
  name: "LAGEOS-1",
  status: "flown",
  firstFlight: { value: "1976-05-04", source: PAGE, note: "The ILRS page's launch date for LAGEOS-1. NASA's mission page lists the same day for the first of the two." },
  slots: ["craft"],
  facts: {
    height: { value: 0.6, source: PAGE, note: "A sphere, so the height is the diameter the page gives." },
    diameter: { value: 0.6, source: PAGE, note: "The page's 60 cm, which it lists as the retroreflector array's diameter, for a sphere." },
    parts: { craft: { value: 0.6, source: PAGE, note: "The diameter of the sphere." } },
    engines: {},
    more: {
      mass: { value: 406.965, source: PAGE, note: "The page's mass of LAGEOS-1, 406.965 kg. NASA's mission page, read the same day, says only 900-pound golf balls and does not give this figure." },
      reflectors: { value: 426, source: PAGE, note: "The page's 426 corner cubes, fused silica glass except four of germanium. Their size is not given, so they are not drawn." },
    },
    sizes: { Diameter: { value: 0.6, source: PAGE, note: "The page's 60 cm, the diameter of the sphere." } },
  },
  note: "LAGEOS-1, a sphere. The ILRS page gives the diameter, the mass, the 426 corner cubes and the launch date. The reflectors are not drawn: the page gives their number and not their size. Both looks are this package's own sphere. No name or mark is drawn.",
};

export const LAGEOS_VARIANTS: readonly Variant[] = [LAGEOS_1];
