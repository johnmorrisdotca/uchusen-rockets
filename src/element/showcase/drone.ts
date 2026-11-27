import { DRONE_LIFT } from "../../model/fleet/drone/index.ts";
import type { ShowcaseDrive, ShowcasePreset } from "../showcaseView.ts";

function portraitWeight(aspect: number): number {
  return Math.min(1, Math.max(0, (1.6 - aspect) / 1.13));
}

export const drone: ShowcasePreset = {
  rocket: "fleet-drone",
  variant: "repair-drone",
  fov: 46,
  shot(aspect) {
    const portrait = portraitWeight(aspect);
    return {
      angle: { az: 36 - 5 * portrait, el: -26 },
      roll: -13 - portrait,
      target: [-0.547 + 0.485 * portrait, 0.883 - 0.073 * portrait, 0.55 - 0.441 * portrait],
      distance: 2.5 + 1.12 * portrait,
    };
  },
  sun: [3, 3.5, 5],
  // The red cold-gas pods on either side of the lens exhaust along +Z.
  drives: [-0.262, 0.262].map((x): ShowcaseDrive => ({
    slot: "drone",
    frame: { at: [x, DRONE_LIFT + 0.005, 0.596], rotation: [-Math.PI / 2, 0, 0] },
    bells: [{ x: 0, y: 0, z: 0, exit: 0.025 }],
    coreLength: 0.24,
    wakes: [{ at: [0, 0, 0], scale: [0.00143, 0.00182, 0.00143] }],
  })),
  exhaustLight: { at: [0, DRONE_LIFT + 0.005, 0.71], intensity: 0.08 },
  body: {
    map: "ceres-1024.webp",
    place(aspect) {
      const portrait = portraitWeight(aspect);
      return { center: [5.2 - 2.3 * portrait, -3.45 - 1.15 * portrait, 12], radius: 3.9 };
    },
    longitude: -70,
  },
};
