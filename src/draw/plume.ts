// A flame on a drawing: a few strokes in the line looks, a filled cone in the painted look, and a glow at the mouth. The same bells as the mesh. No three.js.
import type { Camera } from "./svg.ts";
import type { Vec3 } from "../framing.ts";
import { plumeLength, type Bell } from "../engines.ts";
import type { LookName } from "../looks.ts";

type Point = [number, number];

const n = (v: number) => (Math.round(v * 10) / 10).toString();

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

/** The flames for these bells, in picture coordinates. Empty when there are none. */
export function plumeMarkup(bells: readonly Bell[], at: Vec3, cam: Camera, look: LookName, prefix: string): string {
  if (bells.length === 0) return "";
  const painted = look === "painted";
  const stroke = look === "thick" ? 2.4 : 1.2;
  const parts: string[] = [];
  bells.forEach((bell, index) => {
    const mouth: Vec3 = [at[0] + bell.x, at[1] + bell.y, at[2] + bell.z];
    const tip: Vec3 = [mouth[0], mouth[1] - plumeLength(bell.exit), mouth[2]];
    const rim: Point[] = [];
    for (let step = 0; step < 10; step++) {
      const angle = (step / 10) * Math.PI * 2;
      rim.push(cam.project([mouth[0] + Math.sin(angle) * bell.exit, mouth[1], mouth[2] + Math.cos(angle) * bell.exit]));
    }
    const mouthPoint = cam.project(mouth);
    const tipPoint = cam.project(tip);
    const shape = hull([...rim, tipPoint]);
    const id = `uchusen-plume-${prefix}-${index}`;
    const glow = `uchusen-glow-${prefix}-${index}`;
    const xs = rim.map((point) => point[0]);
    const ys = rim.map((point) => point[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const rx = Math.max(1.2, (Math.max(...xs) - Math.min(...xs)) / 2);
    const ry = Math.max(1.2, (Math.max(...ys) - Math.min(...ys)) / 2);
    const defs = painted
      ? `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(mouthPoint[0])}" y1="${n(mouthPoint[1])}" x2="${n(tipPoint[0])}" y2="${n(tipPoint[1])}"><stop offset="0" stop-color="#fff4d2"/><stop offset="0.45" stop-color="#ff9a3a"/><stop offset="1" stop-color="#ff4a12" stop-opacity="0"/></linearGradient><radialGradient id="${glow}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(Math.max(rx, ry))}"><stop offset="0" stop-color="#fff1c4"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient></defs>`
      : "";
    const flame = shape.length >= 3 ? (painted ? `<path data-plume="1" d="${pathOf(shape)}" fill="url(#${id})" stroke="none"/>` : `<path data-plume="1" d="${pathOf(shape)}" fill="none" stroke="#e7a24a" stroke-width="${stroke}"/><path d="M${n(mouthPoint[0])} ${n(mouthPoint[1])}L${n(tipPoint[0])} ${n(tipPoint[1])}" fill="none" stroke="#ffd7a1" stroke-width="${stroke * 0.6}"/>`) : "";
    const ring = painted ? `<ellipse data-glow="1" cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx * 1.35)}" ry="${n(ry * 1.35)}" fill="url(#${glow})"/>` : `<ellipse data-glow="1" cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx * 1.2)}" ry="${n(ry * 1.2)}" fill="none" stroke="#e7a24a" stroke-width="${stroke}"/>`;
    if (flame !== "") parts.push(`<g>${defs}${ring}${flame}</g>`);
  });
  return parts.join("");
}
