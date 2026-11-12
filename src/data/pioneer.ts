// Pioneer 10 and 11, one model for both. The antenna and the magnetometer boom are from NASA's spacecraft record. Pioneer 10's launch date is from the mission page. Read 2026-11-12.
import { PIONEER_11_LAUNCH } from "./pioneer-11.ts";
import type { Figure, Variant } from "./types.ts";

const S = "nasa-pioneer-record" as const;

/** The high-gain antenna. The file is already this wide, so it is not scaled further. */
export const PIONEER_DISH: Figure = { value: 2.74, source: S, note: "A parabolic dish, 46 cm deep." };

export const PIONEER_VARIANTS: readonly Variant[] = [
  {
    id: "pioneer",
    rocket: "pioneer",
    name: "Pioneer",
    status: "flown",
    firstWord: "Launched",
    firstFlight: { value: "1972-03-02", source: "nasa-pioneer-10", note: "Pioneer 10. One model serves Pioneer 10 and Pioneer 11." },
    slots: ["craft"],
    note: `One model for Pioneer 10, launched on 1972-03-02, and Pioneer 11, launched on ${PIONEER_11_LAUNCH.value}. NASA's model in the painted look. Its high-gain antenna is already the sourced 2.74 m, so it is not scaled further; the file stands 8.25 m. Its pictures are left out and plain colours kept. This package's own plain shape in the line looks, from the sourced antenna and the 6.6 m magnetometer boom. No mark is drawn.`,
    facts: {
      height: { value: 6.6, source: S, note: "The magnetometer boom. NASA's model, with the antenna at 2.74 m, stands 8.25 m." },
      diameter: PIONEER_DISH,
      parts: { craft: { value: 6.6, source: S, note: "The magnetometer boom." } },
      engines: {},
      more: {},
      sizes: { Antenna: PIONEER_DISH },
    },
  },
];
