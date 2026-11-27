import { DRIVE } from "../../model/fleet/ship-03/dims.ts";
import type { ShowcasePreset } from "../showcaseView.ts";

const portraitAmount = (aspect: number): number => Math.min(1, Math.max(0, (1.4 - aspect) / 0.93));
const nozzles = [-DRIVE.nozzleX, DRIVE.nozzleX];

export const ariake: ShowcasePreset = {
  rocket: "fleet-ship-ariake",
  variant: "ariake-empty",
  fov: 43,
  shot(aspect) {
    const portrait = portraitAmount(aspect);
    return {
      angle: { az: 44, el: -32 },
      roll: 22,
      target: [-91.5 + 91.5 * portrait, 111.9 + 69.1 * portrait, 57.1 - 55.1 * portrait],
      distance: Math.max(485 + 170 * portrait, 285 / aspect),
    };
  },
  // The same Sun grazes Ariake's starboard shoulder and the high Martian limb.
  sun: [0.70, 0.60, 0.13],
  drives: [{
    slot: "drive",
    bells: nozzles.map((x) => ({ x, y: DRIVE.exitY, z: 0, exit: DRIVE.exitR })),
    coreLength: 0.88,
    wakes: nozzles.map((x) => ({ at: [x, DRIVE.exitY, 0], scale: [0.61, 0.67, 0.61], intensity: 0.88 })),
  }],
  exhaustLight: { at: [0, -24, 0], intensity: 2100 },
  body: {
    map: "mars-1024.webp",
    place(aspect) {
      const portrait = portraitAmount(aspect);
      return { center: [1035 - 415 * portrait, -1230 - 130 * portrait, 1500], radius: 1000 };
    },
    longitude: 22,
    atmosphere: "#b3603f",
  },
};
