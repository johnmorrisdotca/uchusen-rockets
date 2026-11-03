// A flame on a drawing: a few strokes in the line looks, a filled cone in the painted look, and a glow at the mouth. The same bells as the mesh. No three.js.
import type { Camera } from "./svg.ts";
import type { Vec3 } from "../framing.ts";
import { PLUME_DIAMONDS, plumeLength, type Bell } from "../engines.ts";
import type { LookName } from "../looks.ts";
import type { FlameKind } from "../data/propellants.ts";

type Point = [number, number];

/** A flame's colours in a picture, by the kind its engine's propellant gives: the hot core, the middle and the cool edge, and the line looks' stroke. A picture, not a measurement of a flame. */
export const FLAME_COLOURS: Readonly<Record<FlameKind, { core: string; mid: string; edge: string; line: string; inner: string }>> = {
  kerosene: { core: "#fff4d2", mid: "#ff9a3a", edge: "#ff4a12", line: "#e7a24a", inner: "#ffd7a1" },
  methane: { core: "#fff1e6", mid: "#9aa5ff", edge: "#5d6dff", line: "#8f9bf0", inner: "#d9ddff" },
  hydrogen: { core: "#ffffff", mid: "#b8dcff", edge: "#6fa8ff", line: "#9cc7f5", inner: "#e4f1ff" },
  solid: { core: "#fff1c4", mid: "#ffb02e", edge: "#ff3d0a", line: "#f0a030", inner: "#ffe0a0" },
  hypergolic: { core: "#ffffff", mid: "#e6ecff", edge: "#b8c4ee", line: "#c3cbe3", inner: "#f2f5ff" },
  neutral: { core: "#ffffff", mid: "#d5dae3", edge: "#9aa3b2", line: "#b4bcc9", inner: "#e6e9ef" },
};

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

/** The flames for these bells, in picture coordinates. Empty when there are none. */
export function plumeMarkup(bells: readonly Bell[], at: Vec3, cam: Camera, look: LookName, prefix: string, kind: FlameKind = "neutral"): string {
  if (bells.length === 0) return "";
  const colour = FLAME_COLOURS[kind];
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
      ? `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(mouthPoint[0])}" y1="${n(mouthPoint[1])}" x2="${n(tipPoint[0])}" y2="${n(tipPoint[1])}"><stop offset="0" stop-color="${colour.core}"/><stop offset="0.45" stop-color="${colour.mid}"/><stop offset="1" stop-color="${colour.edge}" stop-opacity="0"/></linearGradient><radialGradient id="${glow}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(Math.max(rx, ry))}"><stop offset="0" stop-color="${colour.core}"/><stop offset="1" stop-color="${colour.mid}" stop-opacity="0"/></radialGradient></defs>`
      : "";
    const flame = shape.length >= 3 ? (painted ? `<path data-plume="1" d="${pathOf(shape)}" fill="url(#${id})" stroke="none"/>` : `<path data-plume="1" d="${pathOf(shape)}" fill="none" stroke="${colour.line}" stroke-width="${stroke}"/><path d="M${n(mouthPoint[0])} ${n(mouthPoint[1])}L${n(tipPoint[0])} ${n(tipPoint[1])}" fill="none" stroke="${colour.inner}" stroke-width="${stroke * 0.6}"/>`) : "";
    const ring = painted ? `<ellipse data-glow="1" cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx * 1.35)}" ry="${n(ry * 1.35)}" fill="url(#${glow})"/>` : `<ellipse data-glow="1" cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx * 1.2)}" ry="${n(ry * 1.2)}" fill="none" stroke="${colour.line}" stroke-width="${stroke}"/>`;
    // the first few shock diamonds, as small rings down the flame: a picture
    let diamonds = "";
    for (let k = 1; k <= 3; k++) {
      const along = k / PLUME_DIAMONDS;
      const [dx, dy] = cam.project([mouth[0], mouth[1] - plumeLength(bell.exit) * along, mouth[2]]);
      const size = n(Math.max(0.9, rx * 0.5 * (1 - along)));
      diamonds += painted ? `<ellipse data-diamond="1" cx="${n(dx)}" cy="${n(dy)}" rx="${size}" ry="${size}" fill="${colour.core}" fill-opacity="0.7"/>` : `<ellipse data-diamond="1" cx="${n(dx)}" cy="${n(dy)}" rx="${size}" ry="${size}" fill="none" stroke="${colour.line}" stroke-width="${stroke * 0.6}"/>`;
    }
    if (flame !== "") parts.push(`<g>${defs}${ring}${flame}${diamonds}</g>`);
  });
  return parts.join("");
}

/** The engines of a part seen from below, each in its own place, the burning ones filled: `engine by engine`. Its words are for a screen reader. */
export function engineChart(bells: readonly Bell[], burning: readonly Bell[], label: string): string {
  const reach = Math.max(1, ...bells.map((bell) => Math.hypot(bell.x, bell.z) + bell.exit)) * 1.06;
  const lit = new Set(burning);
  const dots = bells.map((bell) => `<circle cx="${n(bell.x)}" cy="${n(-bell.z)}" r="${n(bell.exit)}" ${lit.has(bell) ? 'data-lit="1" fill="#ffb25c" stroke="#fff1c4"' : 'fill="none" stroke="currentColor"'} stroke-width="${n(reach * 0.03)}"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(-reach)} ${n(-reach)} ${n(reach * 2)} ${n(reach * 2)}" role="img" aria-label="${label.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}">${dots.join("")}</svg>`;
}
