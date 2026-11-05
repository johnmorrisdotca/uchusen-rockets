// The SPX repair drone as a row of the registry: one part, drawn by this package's code for the two line looks and built from NASA's models and this package's detail for the painted look. Pure: no three.js and no DOM.
import { dronePieces } from "./fleet/drone/index.ts";
import { DRONE_SIZE } from "./fleet/drone/size.ts";
import type { StackBuild } from "./stacks.ts";

/**
 * The repair drone's two painted models, under `assets/models/`: `near` keeps every triangle (about 120,000) and `far` is the same drone cut to about 2,200 for one far away. Each is a single draw.
 *
 * @example
 * ```ts
 * import { DRONE_FILES } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRONE_FILES.near, DRONE_FILES.far);
 * ```
 */
export const DRONE_FILES = { near: "fleet-drone-repair-near.glb", far: "fleet-drone-repair-far.glb" } as const;

export const DRONE_BUILDS: readonly StackBuild[] = [
  {
    rocket: "fleet-drone",
    variant: "repair-drone",
    drawnFrom:
      "This package's own design. The line looks are drawn by this package's code. The painted look is built from NASA's Cluster II (the core drum), the High Energy Transient Explorer (the equipment block), the Curiosity rover (arm links and tool turret), the InSight lander (the gripper and the legs) and a grease gun (the welding tool), with this package's own detail added; no mark of NASA's is in it.",
    parts: [
      {
        slot: "drone",
        kind: "spacecraft",
        name: "SPX repair drone",
        height: DRONE_SIZE.height,
        diameter: DRONE_SIZE.width,
        painted: { file: DRONE_FILES.near, credit: "nasa-cluster-ii", also: ["nasa-insight", "nasa-curiosity", "nasa-hete", "nasa-grease-gun"] },
        pieces: () => dronePieces(true),
      },
    ],
  },
];
