// Europa Clipper. The span and the antenna are from the mission page, read 2026-11-12. The painted model is NASA VTAD's.
import type { Figure, Variant } from "./types.ts";

const S = "nasa-europa-clipper" as const;

/** The solar arrays, the dimension the painted model is scaled to. */
export const EUROPA_SPAN: Figure = { value: 30, source: S, note: "With its solar arrays deployed, it spans more than 100 feet (about 30 meters)." };

/** The high-gain antenna. */
export const EUROPA_DISH: Figure = { value: 3, source: S, note: "A 10-foot (3-meter) high-gain antenna." };

export const EUROPA_VARIANTS: readonly Variant[] = [
  {
    id: "europa-clipper",
    rocket: "europa-clipper",
    name: "Europa Clipper",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "2024-10-14", source: S, note: "12:06 p.m. EDT, from Kennedy LC-39A." },
    slots: ["craft"],
    note: "NASA Visualization Technology Applications and Development's model in the painted look, its pictures left out and plain colours kept, scaled so the solar arrays span the sourced about 30 m; at that scale the file stands 10.98 m. This package's own plain shape in the line looks, from that span and the 3 m antenna. The page does not give one height for the whole spacecraft.",
    facts: {
      height: { value: 3, source: S, note: "The high-gain antenna. The page does not give one height for the whole spacecraft. NASA's model at the 30 m span stands 10.98 m." },
      diameter: EUROPA_SPAN,
      parts: { craft: EUROPA_DISH },
      engines: {},
      more: {},
      sizes: {
        "Solar arrays": EUROPA_SPAN,
        "High-gain antenna": EUROPA_DISH,
      },
    },
  },
];
