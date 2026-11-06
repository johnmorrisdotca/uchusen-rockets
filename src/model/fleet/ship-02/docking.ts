// The first design's dock arms. Each arm ends in a collar that faces outboard, so a visiting craft's nose points in toward the spine and the craft hangs off the arm. Positions are in the dock module's own metres. Pure: no three.js and no DOM.
import { SPINE } from "./dims.ts";

export interface DockPort {
  id: string;
  name: string;
  at: readonly [number, number, number];
  dir: readonly [number, number, number];
  models: readonly ("dragon" | "soyuz" | "orion" | "starship")[];
}

const ARM_Y = [26, 92] as const;

/** The outer face of an arm's collar, and the way the nose points (inboard). */
export const PORTS: readonly DockPort[] = ([-1, 1] as const).flatMap((sx) =>
  ARM_Y.map((y) => ({
    id: `${sx > 0 ? "starboard" : "port"}-${y}`,
    name: `${sx > 0 ? "Starboard" : "Port"} dock arm, ${y} m`,
    at: [sx * (SPINE.half + 140), y + 3, 0] as const,
    dir: [-sx, 0, 0] as const,
    models: ["dragon", "orion"] as const,
  })),
);
