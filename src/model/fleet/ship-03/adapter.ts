// The one door between Waymark and the fleet kit: everything Ship 03's parts take from the kit comes through here, and the three shapes the kit has no use for (an axis-aligned box on any axis, a prism up the spine and a planar quad)
// are made here. When the kit changes, this is the only file of the ship to touch. Pure: no three.js and no DOM.
import type { MaterialName } from "../../materials.ts";
import type { Frame, Lathe, Piece, Plate, Vec3 } from "../../pieces.ts";

export { annulus, antenna, beam, box, disc, horn, hoop, lamps, LIVERY, place, post, ringOf, rng, rod, seams, stamp } from "../detail.ts";
export type { Lamp, Pose, Rng } from "../detail.ts";
export { collar, COLLARS } from "../collars.ts";
export { HULL_STACKS, layerShells, stackDepth } from "../layers.ts";
export type { HullLayer, HullStack } from "../layers.ts";
export { FLEET_PALETTE } from "../palette.ts";
export type { Section, SectionRole } from "../sections.ts";
export type { Inset, InsetPart } from "../insets.ts";
export type { EngineCard } from "../engines.ts";
export type { Lathe, MaterialName, Piece, Plate, Vec3 };

type Extra = Partial<Omit<Plate, "kind" | "material" | "frame" | "outline" | "thickness">>;

/** A box from a range on each axis, any of them the thin one. Mesh only unless `extra` says otherwise. */
export function cub(material: MaterialName, x: readonly [number, number], y: readonly [number, number], z: readonly [number, number], extra: Extra = {}): Plate {
  const f: Frame = { o: [(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] };
  const sx = Math.abs(x[1] - x[0]);
  const sy = Math.abs(y[1] - y[0]);
  return { kind: "plate", material, frame: f, outline: [[-sx / 2, -sy / 2], [sx / 2, -sy / 2], [sx / 2, sy / 2], [-sx / 2, sy / 2]], thickness: Math.abs(z[1] - z[0]), plain: true, only: "mesh", ...extra };
}

/** A prism up the spine: the convex outline in (x, z), standing from y0 to y1. */
export function prism(material: MaterialName, outline: readonly (readonly [number, number])[], y0: number, y1: number, extra: Extra = {}): Plate {
  return { kind: "plate", material, frame: { o: [0, (y0 + y1) / 2, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }, outline, thickness: Math.abs(y1 - y0), plain: true, only: "mesh", ...extra };
}

/** An octagon-ish outline: half widths `hx`, `hz` with the corners cut `c` metres. */
export const chamfered = (hx: number, hz: number, c: number, cx = 0, cz = 0): [number, number][] => [
  [cx - hx + c, cz - hz], [cx + hx - c, cz - hz], [cx + hx, cz - hz + c], [cx + hx, cz + hz - c], [cx + hx - c, cz + hz], [cx - hx + c, cz + hz], [cx - hx, cz + hz - c], [cx - hx, cz - hz + c],
];

/** A flat quad through four points that lie in one plane, with a thickness: for the slopes of a taper. */
export function quad(material: MaterialName, a: Vec3, b: Vec3, c: Vec3, d: Vec3, thickness: number, extra: Extra = {}): Plate {
  const sub = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const unit = (p: Vec3): Vec3 => {
    const l = Math.hypot(...p) || 1;
    return [p[0] / l, p[1] / l, p[2] / l];
  };
  const u = unit(sub(b, a));
  const e = sub(d, a);
  const k = e[0] * u[0] + e[1] * u[1] + e[2] * u[2];
  const v = unit([e[0] - u[0] * k, e[1] - u[1] * k, e[2] - u[2] * k]);
  const w: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const o: Vec3 = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4, (a[2] + b[2] + c[2] + d[2]) / 4];
  const at = (p: Vec3): [number, number] => {
    const q = sub(p, o);
    return [q[0] * u[0] + q[1] * u[1] + q[2] * u[2], q[0] * v[0] + q[1] * v[1] + q[2] * v[2]];
  };
  return { kind: "plate", material, frame: { o, u, v, w }, outline: [at(a), at(b), at(c), at(d)], thickness, plain: true, only: "mesh", ...extra };
}

/** A regular polygon (a disc, near enough) facing along Z, at (x, y), standing from z0 to z1. */
export function discZ(material: MaterialName, x: number, y: number, z0: number, z1: number, r: number, sides = 16, extra: Extra = {}): Plate {
  const outline: [number, number][] = Array.from({ length: sides }, (_, i) => [r * Math.cos((2 * Math.PI * i) / sides + Math.PI / sides), r * Math.sin((2 * Math.PI * i) / sides + Math.PI / sides)]);
  return { kind: "plate", material, frame: { o: [x, y, (z0 + z1) / 2], u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }, outline, thickness: Math.abs(z1 - z0), plain: true, only: "mesh", ...extra };
}

/** The same facing along X, at (y, z), standing from x0 to x1. */
export function discX(material: MaterialName, y: number, z: number, x0: number, x1: number, r: number, sides = 16, extra: Extra = {}): Plate {
  const outline: [number, number][] = Array.from({ length: sides }, (_, i) => [r * Math.cos((2 * Math.PI * i) / sides + Math.PI / sides), r * Math.sin((2 * Math.PI * i) / sides + Math.PI / sides)]);
  return { kind: "plate", material, frame: { o: [(x0 + x1) / 2, y, z], u: [0, 1, 0], v: [0, 0, 1], w: [1, 0, 0] }, outline, thickness: Math.abs(x1 - x0), plain: true, only: "mesh", ...extra };
}
