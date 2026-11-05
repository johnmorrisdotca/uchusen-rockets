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

/**
 * The beam as light in a drawing. Painted is a blue-violet cone with a white core, rings and a flare at the drone. A line look is the same cone in strokes. Reduced motion is the glow with no rings.
 *
 * @param from The drone end.
 * @param to The part end, where the light is brightest.
 * @param narrow The radius at the drone.
 * @param wide The radius at the part.
 * @param cam The picture's camera.
 * @param look Painted fills the light. Anything else draws strokes.
 * @param id A prefix so two pictures on one page do not share a gradient.
 * @param still True for reduced motion: the glow only, with no rings and no sparks.
 * @returns SVG markup for the light. Empty when the cone has no area.
 * @example
 * ```ts
 * import { beamLight } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(typeof beamLight);
 * ```
 */
export function beamLight(from: Vec3, to: Vec3, narrow: number, wide: number, cam: Camera, look: LookName, id: string, still = false): string {
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
  const grad = `${id}-along`;
  const fall = `${id}-fall`;
  const mask = `${id}-mask`;
  const blur = `${id}-blur`;
  const station = (t: number, radius: number, around = 0): Point => cam.project(point(from, basis, basis.length * t, around, radius));
  const radiusAt = (t: number) => narrow + (wide - narrow) * t;
  const mouth = cam.project(from);
  const coreLine = `<path data-core="1" d="M${n(mouth[0])} ${n(mouth[1])}L${n(part[0])} ${n(part[1])}" fill="none" stroke="#ffffff" stroke-width="2"/>`;
  let rings = "";
  let sparks = "";
  let fields = "";
  if (!still) {
    for (let i = 1; i <= 6; i++) {
      const t = i / 7;
      const c = station(t, 0);
      const edge = station(t, radiusAt(t));
      const rx = Math.max(2, Math.hypot(edge[0] - c[0], edge[1] - c[1]));
      rings += `<ellipse data-ring="1" cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(rx)}" ry="${n(Math.max(1.2, rx * 0.18))}" fill="none" stroke="#efeaff" stroke-width="1.4"/>`;
    }
    for (let i = 0; i < 12; i++) {
      const t = 0.12 + ((i * 7) % 10) / 14;
      const spark = station(t, radiusAt(t) * (0.15 + (i % 5) * 0.14), i * 2.4);
      sparks += `<circle data-spark="1" cx="${n(spark[0])}" cy="${n(spark[1])}" r="${i % 3 === 0 ? 1.5 : 0.8}" fill="#f7f4ff"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const start = station(0.9, radiusAt(0.9) * 0.25, i);
      const mid = station(1, radiusAt(1) * (0.7 + i * 0.1), i + side);
      const end = station(1.08, wide * (1.2 + i * 0.15), i + side * 0.7);
      fields += `<path data-field="1" d="M${n(start[0])} ${n(start[1])}Q${n(mid[0])} ${n(mid[1])} ${n(end[0])} ${n(end[1])}" fill="none" stroke="#c4b6ff" stroke-width="0.8"/>`;
    }
  }
  const mouthEdge = station(0, narrow);
  const mouthR = Math.max(3, Math.hypot(mouthEdge[0] - mouth[0], mouthEdge[1] - mouth[1]));
  const emitter = `<g data-emitter="1"><ellipse cx="${n(mouth[0])}" cy="${n(mouth[1])}" rx="${n(mouthR * 3.4)}" ry="${n(mouthR * 3.4)}" fill="#6a5cff" opacity="0.45"/><ellipse cx="${n(mouth[0])}" cy="${n(mouth[1])}" rx="${n(mouthR * 1.7)}" ry="${n(mouthR * 0.42)}" fill="none" stroke="#fff" stroke-width="1.2"/><ellipse cx="${n(mouth[0])}" cy="${n(mouth[1])}" rx="${n(mouthR * 1.05)}" ry="${n(mouthR * 0.24)}" fill="none" stroke="#fff6ea" stroke-width="1.5"/><circle cx="${n(mouth[0])}" cy="${n(mouth[1])}" r="${n(Math.max(2.2, mouthR * 0.4))}" fill="#fff"/></g>`;
  const pool = `<ellipse data-pool="1" cx="${n(part[0])}" cy="${n(part[1])}" rx="${n(partR * 1.2)}" ry="${n(Math.max(2.5, partR * 0.22))}" fill="#b7a6ff"/>`;
  const mark = still ? "still" : "light";
  return `<defs><linearGradient id="${grad}" gradientUnits="userSpaceOnUse" x1="${n(mouth[0])}" y1="${n(mouth[1])}" x2="${n(part[0])}" y2="${n(part[1])}"><stop offset="0" stop-color="#b7b0ff" stop-opacity="0.55"/><stop offset="0.55" stop-color="#6d62e6" stop-opacity="0.4"/><stop offset="1" stop-color="#d5ccff" stop-opacity="0.75"/></linearGradient><radialGradient id="${fall}"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${mask}"><path d="${pathOf(shape)}" fill="url(#${fall})"/></mask><filter id="${blur}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="6"/></filter></defs><g data-beam="${mark}" style="mix-blend-mode:screen"><g mask="url(#${mask})" filter="url(#${blur})"><path d="${pathOf(shape)}" fill="url(#${grad})"/>${core.length >= 3 ? `<path d="${pathOf(core)}" fill="#c9c2ff"/>` : ""}${coreLine}${rings}</g>${sparks}${emitter}${pool}${fields}</g>`;
}
