import { B } from "../../model/fleet/kaminari-concepts/b.ts";
import { EMIAKE_DEPLOYED } from "../../model/fleet/kaminari-concepts/index.ts";
import type { ShowcasePreset } from "../showcaseView.ts";

const { cols, rows, pitch, s, plane } = B.grid;
// The visible exit is inside the last field coil, downstream of the ceramic throat.
const exitY = plane - 4.5 * s;
const bells = rows.flatMap((z) => Array.from({ length: cols }, (_, i) => ({ x: (i - (cols - 1) / 2) * pitch, y: exitY, z, exit: 3.43 * s })));

function portraitShare(aspect: number): number {
  return Math.max(0, Math.min(1, (1.6 - aspect) / (1.6 - 390 / 844)));
}

export const emiake: ShowcasePreset = {
  rocket: "fleet-emiake",
  variant: EMIAKE_DEPLOYED,
  fov: 47,
  shot(aspect) {
    const portrait = portraitShare(aspect);
    return {
      angle: { az: 26 + portrait, el: -47 - 4 * portrait },
      target: [-320.2 + 325.5 * portrait, 535.4 - 59.2 * portrait, 270 - 273.2 * portrait],
      distance: 1470 + 110 * portrait,
      roll: -19 + 8 * portrait,
    };
  },
  sun: [-5, -1, 3],
  drives: [{ slot: "thrusters", bells, wakes: [{ at: [0, exitY, 0], scale: [3.8, 1.54, 0.87], intensity: 0.89 }] }],
  exhaustLight: { at: [0, 6, 0], intensity: 9800 },
  body: {
    map: "europa-1024.webp",
    longitude: 128,
    surfaceTones: ["#927068", "#f8f7f0"],
    place(aspect) {
      const portrait = portraitShare(aspect);
      return { center: [2960 - 1910 * portrait, -3190 - 140 * portrait, 4450], radius: 3190 + 100 * portrait };
    },
  },
};
