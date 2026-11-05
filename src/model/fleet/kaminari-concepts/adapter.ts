// The one door the Kaminari concepts take their shapes through: the fleet's detail kit and module kit, and the few solids the kit has no use for. When the kit changes, this is the only file of the concepts to touch.
// Pure: no three.js and no DOM.
import type { MaterialName } from "../../materials.ts";
import type { Lathe, Piece, Plate, Vec3 } from "../../pieces.ts";

export { annulus, antenna, ball, beam, channel, disc, floodlight, hoop, iBeam, lamps, LIVERY, navLight, observationDome, pipeRun, place, porthole, post, radiator, ringOf, rng, rod, room, seams, separationJoint, stamp, strut, tileShield } from "../detail.ts";
export { BUILDERS, KIT } from "../kit.ts";
export type { KitModule } from "../types.ts";
export type { Lamp, Pose, Rng } from "../detail.ts";
export { contextOf, drum } from "../hull.ts";
export type { Lathe, MaterialName, Piece, Plate, Vec3 };

type Extra = Partial<Omit<Plate, "kind" | "material" | "frame" | "outline" | "thickness">>;

/** A box from a range on each axis, mesh only unless `extra` says otherwise. */
export function cub(material: MaterialName, x: readonly [number, number], y: readonly [number, number], z: readonly [number, number], extra: Extra = {}): Plate {
  const sx = Math.abs(x[1] - x[0]);
  const sy = Math.abs(y[1] - y[0]);
  return { kind: "plate", material, frame: { o: [(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline: [[-sx / 2, -sy / 2], [sx / 2, -sy / 2], [sx / 2, sy / 2], [-sx / 2, sy / 2]], thickness: Math.abs(z[1] - z[0]), plain: true, only: "mesh", ...extra };
}

/** A prism up the ship's axis: the convex outline in (x, z), standing from y0 to y1. */
export function prism(material: MaterialName, outline: readonly (readonly [number, number])[], y0: number, y1: number, extra: Extra = {}): Plate {
  return { kind: "plate", material, frame: { o: [0, (y0 + y1) / 2, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline, thickness: Math.abs(y1 - y0), plain: true, only: "mesh", ...extra };
}

/** An octagon with the corners cut `c` metres: half widths `hx` and `hz`, centred at (cx, cz). */
export const chamfered = (hx: number, hz: number, c: number, cx = 0, cz = 0): [number, number][] => [
  [cx - hx + c, cz - hz], [cx + hx - c, cz - hz], [cx + hx, cz - hz + c], [cx + hx, cz + hz - c], [cx + hx - c, cz + hz], [cx - hx + c, cz + hz], [cx - hx, cz + hz - c], [cx - hx, cz - hz + c],
];

/** A body of revolution about the ship's axis (or a parallel one at `at`): `profile` is [radius, y] going up. */
export const revolve = (material: MaterialName, profile: readonly (readonly [number, number])[], segs = 32, at: readonly [number, number] = [0, 0], extra: Partial<Lathe> = {}): Lathe => ({ kind: "lathe", material, at, segs, profile, ...extra });

export const deg = (a: number): number => (a * Math.PI) / 180;
