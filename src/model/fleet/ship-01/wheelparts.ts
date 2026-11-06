// The parts the rings and wheels of ISV Hanabusa are made of: the rounded section of a ring, bands and spheres, the solar skirt, a glazed lift tube and the closed industrial wheel. Pure: no three.js and no DOM.
import { box, hoop, place, rod, type Lathe, type MaterialName, type Piece, type Pose, type Vec3 } from "./adapter.ts";
import { lampHalo } from "../lights.ts";
import { SPIN } from "./spin.ts";

const BEADS = 12;
const deg = (a: number): number => (a * Math.PI) / 180;

export type Style = "ring" | "beads";
export interface Geo {
  rOut: number;
  depth: number;
  wide: number;
  style: Style;
  /** Corner radius of the ring's section. */
  c: number;
}
export const rIn = (g: Geo): number => g.rOut - g.depth;

/** Half the width of the section at radius r, less a metre of wall: how far a floor reaches across. */
export function reach(g: Geo, r: number): number {
  if (g.style === "beads") {
    const m = g.depth / 2;
    return Math.sqrt(Math.max(0, m * m - (r - (g.rOut - m)) ** 2)) - 0.8;
  }
  const o = g.rOut - g.c;
  const i = rIn(g) + g.c;
  let h = g.wide / 2;
  if (r > o) h = g.wide / 2 - g.c + Math.sqrt(Math.max(0, g.c * g.c - (r - o) ** 2));
  else if (r < i) h = g.wide / 2 - g.c + Math.sqrt(Math.max(0, g.c * g.c - (i - r) ** 2));
  return h - 1;
}

/** The rounded section of a ring as a closed profile going up the outside. */
export function roundSection(g: Geo, y: number, grow = 0): [number, number][] {
  const out: [number, number][] = [];
  const ro = g.rOut + grow;
  const ri = rIn(g) - grow;
  const w = g.wide / 2 + grow;
  const c = g.c;
  const arc = (cx: number, cy: number, a0: number): void => {
    for (let k = 0; k <= 6; k++) {
      const a = deg(a0 + (90 * k) / 6);
      out.push([cx + c * Math.cos(a), cy + c * Math.sin(a)]);
    }
  };
  arc(ro - c, y - w + c, -90);
  arc(ro - c, y + w - c, 0);
  arc(ri + c, y + w - c, 90);
  arc(ri + c, y - w + c, 180);
  out.push(out[0]);
  return out;
}

export const poses = (n: number, y: number, start = 0): Pose[] => Array.from({ length: n }, (_, i) => ({ at: [0, y, 0] as Vec3, yaw: start + (360 * i) / n }));

export const sphere = (material: MaterialName, at: Vec3, r: number): Lathe => ({ kind: "lathe", material, at: [at[0], at[2]], segs: 24, only: "mesh", profile: Array.from({ length: 13 }, (_, i) => [Math.max(0.001, r * Math.sin((Math.PI * i) / 12)), at[1] - r * Math.cos((Math.PI * i) / 12)] as const) });

export type Use = "garden" | "living" | "research" | "hydro";

/** One cylindrical band at radius r from axial a to b. */
export const bandAt = (material: MaterialName, r: number, a: number, b: number, segs = 120, arc?: (y: number) => readonly [number, number]): Lathe => ({ kind: "lathe", material, segs, only: "mesh", profile: [[r, a], [r, b]], ...(arc ? { arc } : {}) });

/** The solar skirt round the outer edge: a band of cells on a frame, with ribs, standing 1.4 m off the rim. */
export function solar(g: Geo, y: number): Piece[] {
  const out: Piece[] = [];
  const r = g.rOut + 1.4;
  const half = g.wide / 2 - 4;
  if (g.style === "ring") {
    const n = 80;
    const gap = deg(1.1);
    const sweep = deg(360 / n) - gap;
    const cell: Lathe = { kind: "lathe", material: "solar", segs: 8, only: "mesh", arc: () => [-sweep / 2, sweep / 2], profile: [[r, y - half], [r, y + half]] };
    const rib: Lathe = { kind: "lathe", material: "hull-grey", segs: 8, only: "mesh", arc: () => [sweep / 2, sweep / 2 + gap * 0.7], profile: [[r + 0.12, y - half], [r + 0.12, y + half]] };
    out.push(hoop("hull-grey", r + 0.05, y - half, 0.35, 160, 8), hoop("hull-grey", r + 0.05, y + half, 0.35, 160, 8), hoop("hull-grey", r + 0.16, y - half / 3, 0.16, 160, 6), hoop("hull-grey", r + 0.16, y + half / 3, 0.16, 160, 6));
    out.push(...poses(n, y).map((p) => place([cell, rib], p)).flat());
  } else {
    const step = 360 / BEADS;
    const half2 = deg(step / 2 - 4);
    const panel: Lathe = { kind: "lathe", material: "solar", segs: 40, only: "mesh", arc: () => [-half2, half2], profile: [[r, -half], [r, half]] };
    out.push(...poses(BEADS, y).map((p) => place([panel], p)).flat());
  }
  return out;
}

/** A glazed lift tube with its lit cars, from a to b: the elevator the wheel's people ride. */
export function liftTube(a: Vec3, b: Vec3, glassMaterial: MaterialName, radius: number, cars: readonly number[], angle: number): Piece[] {
  const out: Piece[] = [rod(glassMaterial, a, b, radius, 14, { only: "mesh" }), rod("hull-grey", [a[0], a[1] + radius * 0.2, a[2]], [b[0], b[1] + radius * 0.2, b[2]], radius * 0.12, 6, { only: "mesh" })];
  for (const f of cars) {
    const p: Vec3 = [a[0] + (b[0] - a[0]) * f, a[1], a[2] + (b[2] - a[2]) * f];
    out.push(box("hull-white", [p[0], p[1] - radius * 0.55, p[2]], radius * 1.0, radius * 1.5, radius * 1.1, (angle * 180) / Math.PI + 90, { only: "mesh", plain: true }), box("window", [p[0], p[1] - radius * 0.3, p[2]], radius * 1.05, radius * 1.55, radius * 0.5, (angle * 180) / Math.PI + 90, { only: "mesh", plain: true }), box("lamp-amber", [p[0], p[1] + radius * 0.55, p[2]], radius * 0.4, radius * 0.4, radius * 0.18, 0, { only: "mesh", plain: true }));
  }
  return out;
}

/** The industrial wheel: opaque, with a deep section, lit window rows, hazard bands and six round spokes. */
export function industrialWheel(style: Style): Piece[] {
  const g: Geo = { rOut: SPIN.industrial.rOut, depth: SPIN.industrial.depth, wide: SPIN.industrial.wide, style, c: 6 };
  const y = SPIN.industrial.y;
  const out: Piece[] = [];
  if (style === "ring") {
    out.push({ kind: "lathe", material: "hull-white", segs: 256, only: "mesh", body: true, outline: true, profile: roundSection(g, y) } as Lathe, { kind: "lathe", material: "hull-white", segs: 48, only: "drawing", body: true, outline: true, profile: roundSection(g, y).filter((_, i, a) => i % 6 === 0 || i === a.length - 1) } as Lathe);
    for (let k = 0; k < 4; k++) out.push(bandAt("window", g.rOut + 0.1, y - 7 + k * 4.6, y - 7 + k * 4.6 + 1.1, 256));
    const rib: Lathe = { kind: "lathe", material: "hull-grey-dark", segs: 500, only: "mesh", arc: () => [-0.004, 0.004], profile: roundSection(g, 0, 0.4) };
    out.push(...poses(96, y).map((p) => place([rib], p)).flat());
    out.push(...Array.from({ length: 16 }, (_, k) => place([bandAt("hull-orange", g.rOut + 0.2, -6, 6, 20, () => [-0.03, 0.03])], { at: [0, y, 0], yaw: 22.5 * k })).flat());
  } else {
    const n = 10;
    const m = g.depth / 2;
    const rc = g.rOut - m;
    const half = deg(180 / n - 2.2);
    const bead: Piece[] = [hoop("hull-white", rc, 0, m, 120, 24, { arc: () => [-half, half], body: true, outline: true }), { ...hoop("window", rc, 0, m, 120, 24, { arc: () => [-half * 0.9, half * 0.9] }), profile: Array.from({ length: 5 }, (_, i) => [rc + (m + 0.1) * Math.cos(-0.3 + (0.6 * i) / 4), (m + 0.1) * Math.sin(-0.3 + (0.6 * i) / 4)] as const) } as Lathe];
    out.push(...poses(n, y).map((p) => place(bead, p)).flat());
    for (let k = 0; k < n; k++) {
      const a = deg((360 / n) * k + 180 / n);
      out.push(sphere("hull-white", [rc * Math.sin(a), y, rc * Math.cos(a)], m + 2));
    }
  }
  for (let k = 0; k < 10; k++) {
    const a = (Math.PI * 2 * k) / 10;
    out.push(...lampHalo("window", [g.rOut * Math.sin(a), y, g.rOut * Math.cos(a)]));
  }
  for (let k = 0; k < 6; k++) {
    const a = deg(60 * k);
    out.push(...liftTube([SPIN.hubR * Math.sin(a), y, SPIN.hubR * Math.cos(a)], [(rIn(g) + 1) * Math.sin(a), y, (rIn(g) + 1) * Math.cos(a)], "hull-white", 3.6, [0.25, 0.5, 0.75], a));
  }
  return out;
}

