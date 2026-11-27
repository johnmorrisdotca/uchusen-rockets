import { mainDriveNozzles } from "../../model/fleet/ship-01/drive.ts";
import type { ShowcasePreset } from "../showcaseView.ts";

export const hanabusa: ShowcasePreset = {
  rocket: "fleet-ship-01",
  variant: "hanabusa",
  fov: 47,
  shot(aspect) {
    const portrait = Math.min(1, Math.max(0, (1.4 - aspect) / 0.9));
    return {
      angle: { az: 34, el: -44 },
      roll: 14,
      target: [-118 + 108 * portrait, 116 + 76 * portrait, 68 - 62 * portrait],
      distance: Math.max(550 + 20 * portrait, 220 / aspect),
    };
  },
  sun: [-5, 2, 2],
  drives: [{ slot: "drive", bells: mainDriveNozzles, wakes: [{ at: [0, 0, 0], scale: [1, 1, 1] }] }],
  exhaustLight: { at: [0, -63, 0], intensity: 5700 },
};
