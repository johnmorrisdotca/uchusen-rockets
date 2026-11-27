import { A, THRUSTERS } from "../../model/fleet/kaminari-concepts/a.ts";
import type { ShowcasePreset } from "../showcaseView.ts";

const nozzles = THRUSTERS.flatMap(({ count, r, s, start = 0 }) => Array.from({ length: count }, (_, index) => {
  const angle = (start + 360 * index / count) * Math.PI / 180;
  // The last field coil is the nozzle mouth, in the drive part's own frame.
  return { x: r * Math.sin(angle), y: A.plane - 4.5 * s, z: r * Math.cos(angle), exit: 3.6 * s };
}));

const SATURN_EQUATOR_KM = 60_268;
const portraitWeight = (aspect: number): number => Math.min(1, Math.max(0, (1.4 - aspect) / 0.9));

export const kaminari: ShowcasePreset = {
  rocket: "fleet-kaminari",
  variant: "fleet-kaminari",
  fov: 47,
  shot(aspect) {
    const portrait = portraitWeight(aspect);
    return {
      angle: { az: 36, el: -49 },
      roll: -16,
      target: [-272 + 317 * portrait, 585 - 31 * portrait, 304 - 274 * portrait],
      distance: Math.max(1775 + 235 * portrait, 760 / aspect),
    };
  },
  sun: [-0.84, -0.385, 0.326],
  drives: [{ slot: "thrusters", bells: nozzles, wakes: [{ at: [0, 3, 0], scale: [1.45, 1.7, 1.45] }] }],
  exhaustLight: { at: [0, -43, 0], intensity: 3200 },
  body: {
    map: "saturn-1024.webp",
    atmosphere: "#4b3d28",
    place(aspect) {
      const portrait = portraitWeight(aspect);
      return { center: [2530 - 2170 * portrait, -160 - 840 * portrait, 6500], radius: 1630 - 630 * portrait };
    },
    rings: {
      map: "saturn-ring-2048.webp",
      inner: 74_794 / SATURN_EQUATOR_KM,
      outer: 137_035 / SATURN_EQUATOR_KM,
      axis: [0.623, 0.2259, 0.7489],
    },
  },
};
