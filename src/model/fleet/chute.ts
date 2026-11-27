// A chute array: a mast, a hub and ribs that open like an umbrella. Ring is an annulus on spokes, umbrella is petals in to the hub, fan is pleated fins in one plane.
// Stowed, the ribs lie along the mast in a slim bundle and are tagged so the viewer can swing them out. Half and open are drawn already there, and tagged so they turn to face the Sun. The same part is sized for Miyamoto and for Kaminari.
// It follows a radial-rib reflector (the Galileo high-gain antenna, AstroMesh) and an origami flasher: ribs of one length, panels that lie over one another when shut. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../pieces.ts";
import { quad } from "./detail.ts";
import { moving } from "./motion.ts";
import { pipe } from "./solids.ts";

export const CHUTE_FORMS = ["ring", "umbrella", "fan"] as const;
export type ChuteForm = (typeof CHUTE_FORMS)[number];
export const CHUTE_POSES = ["stowed", "half", "open"] as const;
export type ChutePose = (typeof CHUTE_POSES)[number];

const RIBS: Readonly<Record<ChuteForm, number>> = { ring: 12, umbrella: 16, fan: 9 };

const poseOf = (pose: ChutePose): number => (pose === "stowed" ? 0 : pose === "half" ? 0.55 : 1);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smooth = (t: number): number => t * t * (3 - 2 * t);
const add = (a: Vec3, d: Vec3, k: number): Vec3 => [a[0] + d[0] * k, a[1] + d[1] * k, a[2] + d[2] * k];

/** 0 is along the mast. The fan stays in the y-z plane and spreads to either side. */
function directions(form: ChuteForm, n: number, t: number): Vec3[] {
  const k = smooth(t);
  if (form === "fan") {
    const span = (150 * Math.PI) / 180;
    const spread = lerp(0.08, 1, k);
    return Array.from({ length: n }, (_, i) => {
      const a = (-span / 2 + (span * i) / (n - 1)) * spread;
      return [0, Math.sin(a), Math.cos(a)];
    });
  }
  const theta = (lerp(6, 78, k) * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const phi = (i / n) * 2 * Math.PI;
    return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
  });
}

function gore(a0: Vec3, a1: Vec3, b1: Vec3, b0: Vec3, cells: number): Piece[] {
  const out: Piece[] = [quad("hull-grey", a0, a1, b1, b0, 0.16), quad("kapton", a0, a1, b1, b0, 0.06, { top: "kapton" })];
  for (let i = 0; i < cells; i++) {
    const u0 = 0.08 + (0.84 * i) / cells;
    const u1 = 0.08 + (0.84 * (i + 1)) / cells - 0.03;
    const mix = (p: Vec3, q: Vec3, u: number): Vec3 => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
    out.push(quad("gold", mix(a0, a1, u0), mix(a0, a1, u1), mix(b0, b1, u1), mix(b0, b1, u0), 0.04, { top: "gold" }));
  }
  return out;
}

/**
 * One chute, mast base at the origin, the mast toward +Z. `radius` is the open rib length.
 *
 * @param form Ring, umbrella or fan.
 * @param pose Stowed, half or open.
 * @param radius Rib length, metres.
 * @param detail Below 0.6, each gore keeps one cell.
 */
export function chute(form: ChuteForm, pose: ChutePose, radius: number, detail = 1): Piece[] {
  const t = poseOf(pose);
  const n = RIBS[form];
  const cells = detail < 0.6 ? 1 : 3;
  const mast = Math.max(18, radius * 0.22);
  const hub: Vec3 = [0, 0, mast];
  const dirs = directions(form, n, t);
  const inner = (form === "ring" ? 0.48 : 0.1) * radius;
  const outer = 0.96 * radius;
  const ribR = Math.max(0.35, radius * 0.004);
  const mount: Piece[] = [
    pipe("hull-grey-dark", [0, 0, 0], [0, 0, 3], Math.max(2.4, radius * 0.03), 12),
    pipe("hull-white", [0, 0, 3], hub, ribR * 1.4, 10),
    pipe("copper", [0, 0, 3], hub, ribR * 0.35, 8),
    pipe("hull-orange", [0, 0, mast - 1.2], hub, ribR * 2.2, 12),
    pipe("lamp-amber", hub, [0, 0, mast + 1.4], ribR * 0.8, 8),
  ];
  const disc: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const dir = dirs[i] ?? [0, 0, 1];
    const tip = add(hub, dir, radius);
    disc.push(pipe("hull-grey", hub, tip, ribR, 8));
    disc.push(pipe("lamp-red", add(hub, dir, radius * 0.96), tip, ribR * 0.7, 8));
    const next = form === "fan" && i === n - 1 ? undefined : dirs[(i + 1) % n];
    if (!next) continue;
    const a0 = add(hub, dir, inner);
    const a1 = add(hub, dir, outer);
    const b1 = add(hub, next, outer);
    const b0 = add(hub, next, inner);
    disc.push(...gore(a0, a1, b1, b0, cells));
  }
  const face: Vec3 = form === "fan" ? [1, 0, 0] : [0, 0, 1];
  const posed = t === 0 ? moving(disc, { name: "chute-deploy", pivot: hub, axis: [1, 0, 0] }) : moving(disc, { name: "chute-track", pivot: hub, axis: [0, 1, 0], face });
  return [...mount, ...posed];
}
