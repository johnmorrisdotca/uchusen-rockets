// Plates that are not rectangles: a chamfered slab and a wedge. The kit's plate already takes any convex outline, so a bevel is the outline, not a new solid.
import type { MaterialName } from "../../materials.ts";
import type { Piece, Vec3 } from "../../pieces.ts";

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** A flat plate of any convex outline. `uDir` is the outline's first axis; the outline's second axis is across that and the normal. */
export function polygon(material: MaterialName, centre: Vec3, normal: Vec3, uDir: Vec3, outline: readonly (readonly [number, number])[], thick = 0.04): Piece {
  const n = unit(normal);
  const u = unit(uDir);
  return { kind: "plate", material, frame: { o: centre, u, v: cross(n, u), w: n }, outline, thickness: thick, plain: true, only: "mesh" };
}

/** A rectangle with the corners cut, so the edge reads as a chamfer rather than a square. */
export function chamfer(halfU: number, halfV: number, cut: number): [number, number][] {
  const c = Math.min(cut, halfU * 0.46, halfV * 0.46);
  return [
    [-halfU + c, -halfV],
    [halfU - c, -halfV],
    [halfU, -halfV + c],
    [halfU, halfV - c],
    [halfU - c, halfV],
    [-halfU + c, halfV],
    [-halfU, halfV - c],
    [-halfU, -halfV + c],
  ];
}

/** Wide at the back (`-u`) and narrow at the nose (`+u`). */
export function wedge(halfU: number, back: number, nose: number): [number, number][] {
  return [
    [-halfU, -back],
    [halfU, -nose],
    [halfU, nose],
    [-halfU, back],
  ];
}
