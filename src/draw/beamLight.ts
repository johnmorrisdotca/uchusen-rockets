// The beam as a drawing of light: a core that fades out at the edges, brighter where it meets the part, added onto whatever is behind it. The same idea as a flame. No three.js.
import type { Vec3 } from "../framing.ts";
import type { LookName } from "../looks.ts";
import type { Camera } from "./svg.ts";

type Point = [number, number];

const n = (v: number) => (Math.round(v * 100) / 100).toString();

function hull(points: Point[]): Point[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const q of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop();
      out.push(q);
    }
    out.pop();
    return out;
  };
  return [...half(p), ...half([...p].reverse())];
}

const pathOf = (pts: readonly Point[]) => `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`;

function frame(from: Vec3, to: Vec3): { u: Vec3; v: Vec3; w: Vec3; length: number } {
  const along: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...along) || 1;
  const u: Vec3 = [along[0] / length, along[1] / length, along[2] / length];
  const seed: Vec3 = Math.abs(u[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const raw: Vec3 = [u[1] * seed[2] - u[2] * seed[1], u[2] * seed[0] - u[0] * seed[2], u[0] * seed[1] - u[1] * seed[0]];
  const l = Math.hypot(...raw) || 1;
  const v: Vec3 = [raw[0] / l, raw[1] / l, raw[2] / l];
  const w: Vec3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  return { u, v, w, length };
}

function point(from: Vec3, basis: { u: Vec3; v: Vec3; w: Vec3 }, along: number, around: number, radius: number): Vec3 {
  const c = Math.cos(around);
  const s = Math.sin(around);
  return [
    from[0] + basis.u[0] * along + basis.v[0] * c * radius + basis.w[0] * s * radius,
    from[1] + basis.u[1] * along + basis.v[1] * c * radius + basis.w[1] * s * radius,
    from[2] + basis.u[2] * along + basis.v[2] * c * radius + basis.w[2] * s * radius,
  ];
}

function cone(from: Vec3, basis: { u: Vec3; v: Vec3; w: Vec3; length: number }, radius0: number, radius1: number, cam: Camera): Point[] {
  const ring = (along: number, radius: number): Point[] => {
    const out: Point[] = [];
    for (let i = 0; i < 16; i++) out.push(cam.project(point(from, basis, along, (i / 16) * Math.PI * 2, radius)));
    return out;
  };
  return hull([...ring(0, radius0), ...ring(basis.length, radius1)]);
}

/** A dotted line in picture space, so reduced motion stays visible however large the part is. */
export function beamDots(from: Vec3, to: Vec3, cam: Camera): string {
  const a = cam.project(from);
  const b = cam.project(to);
  let d = "";
  const dots = 8;
  for (let i = 0; i < dots; i++) {
    const t0 = i / dots;
    const t1 = (i + 0.45) / dots;
    d += `M${n(a[0] + (b[0] - a[0]) * t0)} ${n(a[1] + (b[1] - a[1]) * t0)}L${n(a[0] + (b[0] - a[0]) * t1)} ${n(a[1] + (b[1] - a[1]) * t1)}`;
  }
  return `<path data-beam="dots" d="${d}" fill="none" stroke="#9ecfff" stroke-width="2.4"/>`;
}

/**
 * The beam as light in a drawing. Painted is a soft blue-white core, brighter at the part, faded at the edges and added onto the picture. A line look is the same cone in strokes.
 *
 * @param from The drone end.
 * @param to The part end, where the light is brightest.
 * @param narrow The radius at the drone.
 * @param wide The radius at the part.
 * @param cam The picture's camera.
 * @param look Painted fills the light. Anything else draws strokes.
 * @param id A prefix so two pictures on one page do not share a gradient.
 * @returns SVG markup for the light. Empty when the cone has no area.
 * @example
 * ```ts
 * import { beamLight } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(typeof beamLight);
 * ```
 */
export function beamLight(from: Vec3, to: Vec3, narrow: number, wide: number, cam: Camera, look: LookName, id: string): string {
  const basis = frame(from, to);
  const shape = cone(from, basis, narrow, wide, cam);
  const core = cone(from, basis, narrow * 0.35, wide * 0.45, cam);
  if (shape.length < 3) return "";
  if (look !== "painted") {
    const a = cam.project(from);
    const b = cam.project(to);
    return `<g data-beam="line"><path d="${pathOf(shape)}" fill="none" stroke="#9ecfff" stroke-width="1.4"/><path d="M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}" fill="none" stroke="#d7ecff" stroke-width="1"/></g>`;
  }
  const part = cam.project(to);
  const partEdge = cam.project(point(from, basis, basis.length, 0, wide));
  const partR = Math.max(6, Math.hypot(partEdge[0] - part[0], partEdge[1] - part[1]) * 0.55);
  const pulseAt = 0.62;
  const pulse = cam.project(point(from, basis, basis.length * pulseAt, 0, 0));
  const pulseEdge = cam.project(point(from, basis, basis.length * pulseAt, 0, narrow + (wide - narrow) * pulseAt));
  const pulseR = Math.max(4, Math.hypot(pulseEdge[0] - pulse[0], pulseEdge[1] - pulse[1]) * 0.4);
  const grad = `${id}-along`;
  const fall = `${id}-fall`;
  const mask = `${id}-mask`;
  const blur = `${id}-blur`;
  return `<defs><linearGradient id="${grad}" gradientUnits="userSpaceOnUse" x1="${n(cam.project(from)[0])}" y1="${n(cam.project(from)[1])}" x2="${n(part[0])}" y2="${n(part[1])}"><stop offset="0" stop-color="#7eb6ff" stop-opacity="0.2"/><stop offset="0.7" stop-color="#cfe6ff" stop-opacity="0.75"/><stop offset="1" stop-color="#f7fbff"/></linearGradient><radialGradient id="${fall}"><stop offset="0" stop-color="#fff"/><stop offset="0.45" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${mask}"><path d="${pathOf(shape)}" fill="url(#${fall})"/></mask><filter id="${blur}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter></defs><g data-beam="light" mask="url(#${mask})" filter="url(#${blur})" style="mix-blend-mode:screen"><path d="${pathOf(shape)}" fill="url(#${grad})"/>${core.length >= 3 ? `<path d="${pathOf(core)}" fill="#eaf6ff"/>` : ""}<ellipse data-pulse="1" cx="${n(pulse[0])}" cy="${n(pulse[1])}" rx="${n(pulseR)}" ry="${n(pulseR * 1.8)}" fill="#f4fbff"/><ellipse data-touch="1" cx="${n(part[0])}" cy="${n(part[1])}" rx="${n(partR)}" ry="${n(partR)}" fill="#ffffff"/></g>`;
}
