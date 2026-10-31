// The drawings: dark gradient faces, a light outline, a soft halo. Each is made from the same pieces as the mesh, seen from the very camera the 3D view uses, so the drawing turns into the 3D view without a
// jump. Painter's order: the body first, what hangs under it and what stands behind it by its own depth. Pure: no three.js and no DOM.
import { axesOf, type Angle, directionOf, frameFor, PICTURE_H, PICTURE_W, FOV_DEG, deg, type Vec3 } from "../framing.ts";
import { LOOKS, type FillName, type LookName } from "../looks.ts";
import { MATERIALS } from "../model/materials.ts";
import type { Bounds, Lathe, Lines, Piece, Plate } from "../model/pieces.ts";
import { pointOf, radiusAt } from "../model/pieces.ts";

type Point = [number, number];

const n = (v: number) => (Math.round(v * 10) / 10).toString();
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

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

const pathOf = (pts: readonly Point[], close: boolean) => `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}${close ? "Z" : ""}`;

/** A camera over a picture: perspective by default, or orthographic at a fixed scale for drawings side by side. */
export interface Camera {
  project: (p: Vec3) => Point;
  /** Depth along the view, far is larger. */
  depth: (p: Vec3) => number;
  /** The unit vector from a point towards the camera. */
  toward: (p: Vec3) => Vec3;
  above: boolean;
}

export function perspective(bounds: Bounds, angle: Angle, width = PICTURE_W, height = PICTURE_H): Camera {
  const { target, position } = frameFor(bounds.min, bounds.max, angle, width / height);
  const { right, up, forward } = axesOf(directionOf(angle));
  const f = 1 / Math.tan(deg(FOV_DEG) / 2);
  return {
    project: (p) => {
      const q = sub(p, position);
      const z = dot(q, forward);
      return [width / 2 + (dot(q, right) * f * (height / 2)) / z, height / 2 - (dot(q, up) * f * (height / 2)) / z];
    },
    depth: (p) => dot(sub(p, position), forward),
    toward: (p) => {
      const q = sub(position, p);
      const l = Math.hypot(...q) || 1;
      return [q[0] / l, q[1] / l, q[2] / l];
    },
    above: position[1] > target[1] - 1e9 && angle.el >= 0,
  };
}

/** Orthographic, `scale` pixels a metre, the origin at (x0, y0) on the picture. */
export function orthographic(angle: Angle, scale: number, x0: number, y0: number): Camera {
  const direction = directionOf(angle);
  const { right, up, forward } = axesOf(direction);
  return {
    project: (p) => [x0 + dot(p, right) * scale, y0 - dot(p, up) * scale],
    depth: (p) => dot(p, forward),
    toward: () => direction,
    above: angle.el >= 0,
  };
}

interface Item {
  key: number;
  svg: string;
}

const fillId = (material: keyof typeof MATERIALS): FillName => MATERIALS[material].fill;

export interface DrawOptions {
  look: LookName;
  /** Weights scale with the drawing's size: 1 at the standard picture. */
  weight?: number;
}

function latheItem(piece: Lathe, cam: Camera, at: Vec3, style: { line: string; outline: number; feature: number; weld: number }, list: Item[]): void {
  const [cx, cz] = piece.at ?? [0, 0];
  const profile = piece.profile;
  const steps = piece.segs > 24 ? 36 : 14;
  const here = (r: number, y: number, a: number): Vec3 => [at[0] + cx + r * Math.sin(a), at[1] + y, at[2] + cz + r * Math.cos(a)];
  const middleY = (profile[0][1] + profile[profile.length - 1][1]) / 2;
  const middle: Vec3 = [at[0] + cx, at[1] + middleY, at[2] + cz];
  const axisHere: Vec3 = [at[0], at[1] + middleY, at[2]];
  const parts: string[] = [];
  const fill = `url(#${fillId(piece.material)})`;
  // which way a station's surface faces, for what shows
  const tilt = profile.map(([r, y], i) => {
    const [r1, y1] = profile[Math.min(i + 1, profile.length - 1)];
    const [r0, y0] = profile[Math.max(i - 1, 0)];
    const dr = r1 - r0;
    const dy = y1 - y0;
    const l = Math.hypot(dr, dy) || 1;
    return { r, y, nr: dy / l, ny: -dr / l };
  });
  const faces = (i: { nr: number; ny: number; r: number; y: number }, a: number) => {
    const p = here(i.r, i.y, a);
    const t = cam.toward(p);
    return i.nr * Math.sin(a) * t[0] + i.ny * t[1] + i.nr * Math.cos(a) * t[2] > 0;
  };
  if (piece.arc) {
    // an arc of a hull: from station to station, only the part that faces the camera
    const left: Point[] = [];
    const right: Point[] = [];
    const leftEdge: (Point | null)[] = [];
    const rightEdge: (Point | null)[] = [];
    for (const station of tilt) {
      const [from, to] = piece.arc(station.y);
      let lo: number | null = null;
      let hi: number | null = null;
      const count = 48;
      for (let k = 0; k <= count; k++) {
        const a = from + ((to - from) * k) / count;
        if (faces(station, a)) {
          if (lo === null) lo = a;
          hi = a;
        }
      }
      if (lo === null || hi === null) {
        leftEdge.push(null);
        rightEdge.push(null);
        continue;
      }
      left.push(cam.project(here(station.r, station.y, lo)));
      right.push(cam.project(here(station.r, station.y, hi)));
      // an edge shows only where it is the arc's own edge, not where the hull turns away
      leftEdge.push(lo > from + 1e-6 ? null : cam.project(here(station.r, station.y, lo)));
      rightEdge.push(hi < to - 1e-6 ? null : cam.project(here(station.r, station.y, hi)));
    }
    if (left.length > 1) {
      const shape = pathOf([...left, ...right.reverse()], true);
      parts.push(`<path d="${shape}" fill="${fill}"/>`);
      if (piece.material === "tile") parts.push(`<path d="${shape}" fill="url(#hex)"/>`);
      for (const edge of [leftEdge, rightEdge]) {
        let run: Point[] = [];
        const flush = () => {
          if (run.length > 1) parts.push(`<path d="${pathOf(run, false)}" fill="none" stroke="${style.line}" stroke-width="${n(style.feature)}"/>`);
          run = [];
        };
        for (const p of edge) {
          if (p) run.push(p);
          else flush();
        }
        flush();
      }
    }
  } else if (piece.outline !== false) {
    const pts: Point[] = [];
    for (const [r, y] of profile) for (let k = 0; k < steps; k++) pts.push(cam.project(here(r, y, (k / steps) * 2 * Math.PI)));
    const shape = hull(pts);
    parts.push(`<path d="${pathOf(shape, true)}" fill="${fill}"${piece.outline ? ` stroke="${style.line}" stroke-width="${n(style.outline * (piece.under ? 0.55 : 1))}"` : ""}/>`);
  }
  // rings: the front of each
  const ringsOf = (ys: readonly number[] | undefined, width: number, opacity?: string) => {
    if (!ys?.length) return;
    let d = "";
    for (const y of ys) {
      const i = profile.findIndex(([, yy], k) => k + 1 < profile.length && y >= Math.min(yy, profile[k + 1][1]) && y <= Math.max(yy, profile[k + 1][1]));
      if (i < 0) continue;
      const r = radiusAt(profile, y);
      const [r1, y1] = profile[i + 1];
      const [r0, y0] = profile[i];
      const l = Math.hypot(r1 - r0, y1 - y0) || 1;
      const station = { r, y, nr: (y1 - y0) / l, ny: -(r1 - r0) / l };
      const [from, to] = piece.arc ? piece.arc(y) : [0, 2 * Math.PI];
      const count = 20;
      let run: Point[] = [];
      const flush = () => {
        if (run.length > 1) d += pathOf(run, false);
        run = [];
      };
      for (let k = 0; k <= count; k++) {
        const a = from + ((to - from) * k) / count;
        if (faces(station, a)) run.push(cam.project(here(r, y, a)));
        else flush();
      }
      flush();
    }
    if (d) parts.push(`<path d="${d}" fill="none" stroke="${style.line}" stroke-width="${n(width)}"${opacity ?? ""}/>`);
  };
  ringsOf(piece.welds, style.weld, ' opacity=".6"');
  ringsOf(piece.rings, style.feature);
  if (!parts.length) return;
  // the body's own pieces: far end first
  const key = piece.body ? (cam.depth(middle) - cam.depth([at[0], at[1], at[2]])) * 1e-3 : cam.depth(middle) - cam.depth(axisHere);
  list.push({ key: piece.under ? (cam.above ? 1e6 + key : -1e6 + key - middleY * 0.01) : key, svg: parts.join("") });
}

function plateItem(piece: Plate, cam: Camera, at: Vec3, style: { line: string; outline: number; feature: number; weld: number }, list: Item[]): void {
  const place = (a: number, b: number, c: number): Vec3 => {
    const p = pointOf(piece.frame, a, b, c);
    return [p[0] + at[0], p[1] + at[1], p[2] + at[2]];
  };
  const half = piece.thickness / 2;
  const pts: Point[] = [];
  for (const [a, b] of piece.outline) pts.push(cam.project(place(a, b, half)), cam.project(place(a, b, -half)));
  const shape = hull(pts);
  const centre = piece.outline.reduce((s, p) => [s[0] + p[0] / piece.outline.length, s[1] + p[1] / piece.outline.length], [0, 0]);
  const c = place(centre[0], centre[1], 0);
  const seen = cam.toward(c);
  const facing = dot(piece.frame.w, seen);
  const faceMat = facing > 0 && piece.top ? piece.top : piece.material;
  const parts: string[] = [`<path d="${pathOf(shape, true)}" fill="url(#${fillId(faceMat)})" stroke="${style.line}" stroke-width="${n(piece.plain ? style.weld : style.feature * 1.1)}"/>`];
  if (piece.ribs?.length && Math.abs(facing) > 0.35) {
    const side = facing > 0 ? half : -half;
    let d = "";
    for (const [p, q] of piece.ribs) d += pathOf([cam.project(place(p[0], p[1], side)), cam.project(place(q[0], q[1], side))], false);
    parts.push(`<path d="${d}" fill="none" stroke="${style.line}" stroke-width="${n(style.weld)}"/>`);
  }
  const axisHere: Vec3 = [at[0], c[1], at[2]];
  list.push({ key: cam.depth(c) - cam.depth(axisHere), svg: parts.join("") });
}

function linesItem(piece: Lines, cam: Camera, at: Vec3, style: { line: string; feature: number; weld: number }, list: Item[]): void {
  let d = "";
  for (const path of piece.paths) {
    const pts = path.map(([x, y, z]) => [x + at[0], y + at[1], z + at[2]] as Vec3);
    // a line round a hull: only the runs that face the camera
    let run: Point[] = [];
    const flush = () => {
      if (run.length > 1) d += pathOf(run, false);
      run = [];
    };
    for (const p of pts) {
      const out: Vec3 = [p[0] - at[0], 0, p[2] - at[2]];
      const t = cam.toward(p);
      if (dot(out, t) > 0) run.push(cam.project(p));
      else flush();
    }
    flush();
  }
  if (!d) return;
  list.push({ key: -1e3, svg: `<path d="${d}" fill="none" stroke="${style.line}" stroke-width="${n(piece.weight === "feature" ? style.feature : style.weld)}"/>` });
}

/** One part's picture at `at`, as SVG text in painter's order. */
export function drawPart(pieces: readonly Piece[], at: Vec3, cam: Camera, look: LookName, weight = 1): string {
  const base = LOOKS[look];
  const style = { line: base.line, outline: base.outline * weight, feature: base.feature * weight, weld: base.weld * weight };
  const items: Item[] = [];
  for (const piece of pieces) {
    if (piece.only === "mesh") continue;
    if (piece.kind === "lathe") latheItem(piece, cam, at, style, items);
    else if (piece.kind === "plate") plateItem(piece, cam, at, style, items);
    else linesItem(piece, cam, at, style, items);
  }
  // far first
  items.sort((a, b) => b.key - a.key);
  return items.map((item) => item.svg).join("");
}

const HEX_W = 9;
const HEX_H = 15.6;

/** The picture's gradients and, on the tiled side, a mosaic of hexagons, for a look. */
export function defsOf(look: LookName): string {
  const { fills, halo } = LOOKS[look];
  const stops = ([a, b, c]: readonly [string, string, string]) => `<stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/>`;
  return `<defs>${(Object.keys(fills) as FillName[]).map((name) => `<linearGradient id="${name}" x1="0" y1="0" x2="1" y2="0">${stops(fills[name])}</linearGradient>`).join("")}<pattern id="hex" width="${HEX_W}" height="${HEX_H}" patternUnits="userSpaceOnUse"><path d="M4.5 0L9 2.6V7.8L4.5 10.4L0 7.8V2.6ZM4.5 10.4V15.6M0 2.6V0M9 2.6V0" fill="none" stroke="${look === "painted" ? "#3a3d42" : LOOKS[look].line}" stroke-width=".35" opacity=".5"/></pattern>${halo ? '<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6cd0ff" stop-opacity=".14"/><stop offset="1" stop-color="#6cd0ff" stop-opacity="0"/></radialGradient>' : ""}</defs>`;
}
