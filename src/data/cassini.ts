// Cassini, with Huygens. The height, the antenna and the boom are from NASA's spacecraft sheet. The launch date is from the mission page. Read 2026-11-12.
import type { Figure, Variant } from "./types.ts";

const S = "nasa-cassini-sheet" as const;

/** The high-gain antenna, the dimension the painted model is scaled to. */
export const CASSINI_DISH: Figure = { value: 4, source: S, note: "13.1 feet. It is also the spacecraft's greatest width." };

export const CASSINI_VARIANTS: readonly Variant[] = [
  {
    id: "cassini",
    rocket: "cassini",
    name: "Cassini",
    status: "flown",
    firstFlight: { value: "1997-10-15", source: "nasa-cassini", note: "With the Huygens probe." },
    slots: ["craft"],
    note: "NASA's model in the painted look, scaled so the high-gain antenna is the sourced 4 m; at that scale the file stands 11.64 m, the boom included. Its pictures are left out and plain colours kept. This package's own plain shape in the line looks, from the sourced 6.8 m height and the 4 m antenna. The magnetometer boom is 11 m in the sheet. No mark is drawn.",
    facts: {
      height: { value: 6.8, source: S, note: "22.3 feet. NASA's model at the 4 m antenna stands 11.64 m." },
      diameter: CASSINI_DISH,
      parts: { craft: { value: 6.8, source: S, note: "22.3 feet tall." } },
      engines: {},
      more: {},
      sizes: {
        Antenna: CASSINI_DISH,
        Boom: { value: 11, source: S, note: "36 feet, the magnetometer boom." },
      },
    },
  },
];
