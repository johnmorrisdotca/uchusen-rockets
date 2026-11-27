import { DRIVE } from "../../model/fleet/ship-03/dims.ts";
import type { ShowcasePreset } from "../showcaseView.ts";

const nozzleCenters = [-DRIVE.nozzleX, DRIVE.nozzleX];
const portraitAmount = (aspect: number): number => Math.min(1, Math.max(0, (1.4 - aspect) / 0.93));

export const miyamoto: ShowcasePreset = {
  rocket: "fleet-ship-03",
  variant: "miyamoto",
  fov: 47,
  shot(aspect) {
    const portrait = portraitAmount(aspect);
    return {
      angle: { az: 72 - 14 * portrait, el: -28 },
      target: [-61 + 54 * portrait, 100 + 65 * portrait, 133 - 123 * portrait],
      distance: 491 + 41 * portrait,
      roll: 14 - 5 * portrait,
    };
  },
  sun: [-0.06, 0.25, 0.97],
  drives: [{
    slot: "drive",
    bells: nozzleCenters.map((x) => ({ x, y: DRIVE.exitY - 0.6, z: 0, exit: DRIVE.exitR * 0.5 })),
    coreLength: 1.2,
    wakes: nozzleCenters.map((x) => ({ at: [x, DRIVE.exitY, 0], scale: [0.46, 0.97, 0.46] })),
  }],
  exhaustLight: { at: [0, -38, 0], intensity: 3800 },
  body: {
    map: "jupiter-1024.webp",
    longitude: -34,
    atmosphere: "#adbdde",
    place(aspect) {
      const portrait = portraitAmount(aspect);
      return {
        center: [420 * aspect - 455 * portrait, -740 - 150 * portrait, 2400],
        radius: 950 - 150 * portrait,
      };
    },
  },
};
