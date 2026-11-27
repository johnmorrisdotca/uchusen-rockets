import type { ShowcasePreset } from "../showcaseView.ts";

const portraitAmount = (aspect: number): number => Math.min(1, Math.max(0, (1.4 - aspect) / 0.93));

export const kyotori: ShowcasePreset = {
  rocket: "fleet-kyotori",
  variant: "kyotori",
  fov: 47,
  shot(aspect) {
    const portrait = portraitAmount(aspect);
    return {
      angle: { az: 28, el: -28 },
      roll: -17,
      target: [-114.4 + 118.8 * portrait, 240.3 - 31 * portrait, 83.9 - 86.6 * portrait],
      distance: Math.max(600 + 20 * portrait, 270 / aspect),
    };
  },
  // To the upper right in the home view. The hull and the lunar globe use this same Sun.
  sun: [1.21, 0.08, 0.52],
  drives: ["a-drive", "b-drive"].map((slot) => ({
    slot,
    // The last of the twelve field coils is centred on local Y=3 m.
    bells: [{ x: 0, y: 2, z: 0, exit: 7 }],
    wakes: [{ at: [0, 3, 0], scale: [0.38, 0.92, 0.38], intensity: 1.24 }],
  })),
  exhaustLight: { at: [0, -56, 0], intensity: 1800 },
  body: {
    map: "moon-1024.webp",
    place(aspect) {
      const portrait = portraitAmount(aspect);
      return { center: [1060 - 530 * portrait, -555 - 165 * portrait, 2250], radius: 880 };
    },
    longitude: -45,
  },
};
