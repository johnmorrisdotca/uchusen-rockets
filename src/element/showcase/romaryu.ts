import { directionOf, rolledUp, type Vec3 } from "../../framing.ts";
import { C } from "../../model/fleet/kaminari-concepts/c.ts";
import type { ShowcasePreset } from "../showcaseView.ts";

const FOV = 47;
const DEGREES = Math.PI / 180;
const portraitShare = (aspect: number) => Math.min(1, Math.max(0, (1.4 - aspect) / 0.9));
const podAngles = [45, 135, 225, 315];
const podNozzles = [[0, 0], ...Array.from({ length: 6 }, (_, i) => {
  const angle = i * 60 * DEGREES;
  return [C.pod.hex * Math.sin(angle), C.pod.hex * Math.cos(angle)];
})];

// The bright cores start at the final magnetic coil on each nozzle.
const centreOutlet = C.centre.plane - 4.5 * C.centre.s;
const podOutlet = C.pod.plane - 4.5 * C.pod.s;
const pods = podAngles.map((degrees) => {
  const angle = degrees * DEGREES;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return { x: C.pod.r * sin, z: C.pod.r * cos, sin, cos };
});

export const romaryu: ShowcasePreset = {
  rocket: "fleet-romaryu",
  variant: "fleet-romaryu",
  fov: FOV,
  shot(aspect) {
    const portrait = portraitShare(aspect);
    const angle = { az: 27 - 4 * portrait, el: -41 };
    const roll = -14 + 4 * portrait;
    const back = directionOf(angle);
    const up = rolledUp(back, roll);
    const right: Vec3 = [up[1] * back[2] - up[2] * back[1], up[2] * back[0] - up[0] * back[2], up[0] * back[1] - up[1] * back[0]];
    const across = -470 + 419 * portrait;
    return {
      angle,
      roll,
      target: [right[0] * across, 600 + 50 * portrait + right[1] * across, right[2] * across],
      distance: 1720 + 80 * portrait,
    };
  },
  sun: [-1, 0.22, 0.21],
  drives: [
    {
      slot: "centre-drive",
      bells: [{ x: 0, y: centreOutlet, z: 0, exit: 2.35 * C.centre.s }],
      wakes: [{ at: [0, centreOutlet, 0], scale: [0.32, 2.28, 0.32], intensity: 1.12 }],
    },
    {
      slot: "pods",
      bells: pods.flatMap(({ x, z, sin, cos }) => podNozzles.map(([localX, localZ]) => ({
        x: x + localX * cos + localZ * sin,
        y: podOutlet,
        z: z - localX * sin + localZ * cos,
        exit: 2.35 * C.pod.s,
      }))),
      wakes: pods.map(({ x, z }) => ({ at: [x, podOutlet, z], scale: [0.29, 1.75, 0.29], intensity: 0.86 })),
    },
  ],
  exhaustLight: { at: [0, -64, 0], intensity: 8400 },
  body: {
    map: "neptune-1024.webp",
    longitude: 41,
    place(aspect) {
      const portrait = portraitShare(aspect);
      const depth = 4700;
      const halfHeight = depth * Math.tan(FOV * DEGREES / 2);
      return {
        center: [halfHeight * aspect * (0.72 - 0.21 * portrait), halfHeight * (-0.49 - 0.06 * portrait), depth],
        radius: halfHeight * (0.91 - 0.03 * portrait),
      };
    },
    atmosphere: "#426b92",
  },
};
