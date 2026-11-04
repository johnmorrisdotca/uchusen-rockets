// The one door between Miyamoto and the fleet kit: everything SPX-03 Miyamoto's parts take from the kit comes through here, and the three shapes the kit has no use for (an axis-aligned box on any axis, a prism up the spine and a planar quad)
// are made here. When the kit changes, this is the only file of the ship to touch. Pure: no three.js and no DOM.
import { rod } from "../detail.ts";
import type { MaterialName } from "../../materials.ts";
import type { Frame, Lathe, Piece, Plate, Vec3 } from "../../pieces.ts";

export { annulus, antenna, beam, box, disc, horn, hoop, lamps, LIVERY, place, post, ringOf, rng, rod, seams, stamp } from "../detail.ts";
export type { Lamp, Pose, Rng } from "../detail.ts";
export { collar, COLLARS } from "../collars.ts";
export { contextOf, drum } from "../hull.ts";
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

const sub3 = (p: Vec3, q: Vec3): Vec3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const len3 = (p: Vec3): number => Math.hypot(p[0], p[1], p[2]);
const unit3 = (p: Vec3): Vec3 => {
  const l = len3(p) || 1;
  return [p[0] / l, p[1] / l, p[2] / l];
};
const cross3 = (p: Vec3, q: Vec3): Vec3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const mix3 = (p: Vec3, q: Vec3, t: number): Vec3 => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];

/** An I-beam from a to b: two flanges and a web, standing `h` deep (along `up`, a hint of which way is up) and `w` wide, with end plates. A brace is this, a channel or a round strut; never a plain square bar. */
export function ibeam(material: MaterialName, a: Vec3, b: Vec3, h: number, w: number, up: Vec3 = [0, 0, 1], extra: Extra = {}): Plate[] {
  const along = sub3(b, a);
  const L = len3(along);
  const u = unit3(along);
  const k = up[0] * u[0] + up[1] * u[1] + up[2] * u[2];
  let n = unit3([up[0] - u[0] * k, up[1] - u[1] * k, up[2] - u[2] * k]);
  if (len3([up[0] - u[0] * k, up[1] - u[1] * k, up[2] - u[2] * k]) < 1e-6) n = unit3(cross3(u, Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
  const s = unit3(cross3(u, n));
  const t = Math.max(0.04, h * 0.12);
  const o = mix3(a, b, 0.5);
  const at = (c: Vec3, dn: number): Vec3 => [c[0] + n[0] * dn, c[1] + n[1] * dn, c[2] + n[2] * dn];
  const flange = (dn: number): Plate => ({ kind: "plate", material, frame: { o: at(o, dn), u, v: s, w: n }, outline: [[-L / 2, -w / 2], [L / 2, -w / 2], [L / 2, w / 2], [-L / 2, w / 2]], thickness: t, plain: true, only: "mesh", ...extra });
  const web: Plate = { kind: "plate", material, frame: { o, u, v: n, w: s }, outline: [[-L / 2, -(h - 2 * t) / 2], [L / 2, -(h - 2 * t) / 2], [L / 2, (h - 2 * t) / 2], [-L / 2, (h - 2 * t) / 2]], thickness: t * 0.9, plain: true, only: "mesh", ...extra };
  const plate = (c: Vec3): Plate => ({ kind: "plate", material, frame: { o: c, u: s, v: n, w: u }, outline: [[-w * 0.7, -h * 0.7], [w * 0.7, -h * 0.7], [w * 0.7, h * 0.7], [-w * 0.7, h * 0.7]], thickness: t * 0.8, plain: true, only: "mesh", ...extra });
  return [flange(h / 2 - t / 2), flange(-h / 2 + t / 2), web, plate(a), plate(b)];
}

/** A pipe run through a path of points: round tube between them (twelve sides), a ball joint at every bend, a flange pair at each end and a clamp ring with a bracket every few metres. */
export function pipeRun(material: MaterialName, points: readonly Vec3[], r: number, o: { sides?: number; clampEvery?: number; bracket?: Vec3 } = {}): Piece[] {
  const sides = o.sides ?? 12;
  const out: Piece[] = [];
  const every = o.clampEvery ?? 4;
  for (let i = 0; i + 1 < points.length; i++) {
    const p = points[i];
    const q = points[i + 1];
    const d = unit3(sub3(q, p));
    out.push(rod(material, p, q, r, sides, { only: "mesh" }));
    for (const f of i === 0 ? [0.15, 0.55] : []) out.push(rod("hull-grey", mix3(p, q, 0), [p[0] + d[0] * f * 0.4, p[1] + d[1] * f * 0.4, p[2] + d[2] * f * 0.4], r * 1.7, sides));
    if (i + 2 === points.length) out.push(rod("hull-grey", [q[0] - d[0] * 0.3, q[1] - d[1] * 0.3, q[2] - d[2] * 0.3], q, r * 1.7, sides));
    const L = len3(sub3(q, p));
    for (let s = every / 2; s < L - 0.2; s += every) {
      const c = mix3(p, q, s / L);
      out.push(rod("hull-grey-dark", [c[0] - d[0] * 0.14, c[1] - d[1] * 0.14, c[2] - d[2] * 0.14], [c[0] + d[0] * 0.14, c[1] + d[1] * 0.14, c[2] + d[2] * 0.14], r * 1.4, sides));
      if (o.bracket) out.push(rod("hull-grey-dark", c, [c[0] + o.bracket[0], c[1] + o.bracket[1], c[2] + o.bracket[2]], r * 0.35, 6));
    }
    if (i > 0) out.push({ kind: "lathe", material, at: [p[0], p[2]], segs: sides, profile: [[0.001, p[1] - r * 1.25], [r * 1.0, p[1] - r * 0.75], [r * 1.25, p[1]], [r * 1.0, p[1] + r * 0.75], [0.001, p[1] + r * 1.25]], only: "mesh" });
  }
  return out;
}

/** A round strut from a to b in the manner of a landing leg's: a dark tube with a collar near each end and a white ball joint on each end, so the joint and the cap show. */
export function roundStrut(material: MaterialName, a: Vec3, b: Vec3, r: number, o: { joint?: MaterialName; sides?: number } = {}): Piece[] {
  const sides = o.sides ?? 12;
  const d = unit3(sub3(b, a));
  const L = len3(sub3(b, a));
  const along = (p: Vec3, t: number): Vec3 => [p[0] + d[0] * t, p[1] + d[1] * t, p[2] + d[2] * t];
  const ball = (p: Vec3): Piece => ({ kind: "lathe", material: o.joint ?? "hull-white", at: [p[0], p[2]], segs: sides, profile: [[0.001, p[1] - r * 1.5], [r * 1.1, p[1] - r * 1.05], [r * 1.5, p[1]], [r * 1.1, p[1] + r * 1.05], [0.001, p[1] + r * 1.5]], only: "mesh" });
  const out: Piece[] = [rod(material, a, b, r, sides, { only: "mesh" }), ball(a), ball(b)];
  if (L > r * 10) for (const t of [r * 2.4, L - r * 2.4]) out.push(rod("hull-grey", along(a, t - r * 0.5), along(a, t + r * 0.5), r * 1.3, sides));
  return out;
}
