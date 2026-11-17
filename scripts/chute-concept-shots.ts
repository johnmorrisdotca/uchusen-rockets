// MODULES-491 concept pictures (not part of the package): the three chute arrays, Ring, Umbrella and Fan, each stowed, half open and open, and on Kaminari and Miyamoto at true size.
// `node scripts/chute-concept-shots.ts <folder>` writes the .glb files and `jobs.json`; `node scripts/concept-render.ts <folder>/jobs.json <folder>/png` draws them in a headless browser in software.
// The geometry here is a CONCEPT of the mechanism, not the final part: it is worked out from the real constraints (ribs of fixed length that telescope, a blanket of fixed width that folds along a crease as the ribs close,
// a hoop of fixed-length links that folds at its joints) so what the pictures show is what a part could really do. The final geometry waits for the gate.
// Local frame of an array: the mast stands along +z from the mount, the disc opens in the x-y plane. Metres.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { toGlb } from "../src/build/glb.ts";
import { build } from "../src/build/index.ts";
import { docked } from "../src/model/fleet/kaminari-concepts/c.ts";
import { coarsen } from "../src/model/detail.ts";
import { boundsOf, meshOf, type Piece, type Plate } from "../src/model/pieces.ts";
import { pipe, type MaterialName } from "../src/model/fleet/solids.ts";

type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3): number => Math.hypot(...a);
const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const ease = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type Variant = "ring" | "umbrella" | "fan";
export interface Chute {
  variant: Variant;
  /** Radius of the open disc, metres (half the span). */
  radius: number;
  /** Ribs (spokes, fins). */
  ribs: number;
  /** 0 stowed, 1 fully open. */
  open: number;
  /** The whole disc tilted toward the Sun on the beta gimbal, degrees. */
  tilt?: number;
  /** Each petal turned on its own gimbal about its radial axis, degrees, alternating in sign (umbrella and ring, open). */
  louvre?: number;
}

/** A flat panel from four corners (taken as planar; a little warp is averaged out): a plate with a cell grid on its face. */
function panel(material: MaterialName, c: readonly [V3, V3, V3, V3], cells: [number, number], back: MaterialName = "hull-grey"): Plate {
  const o = mul(add(add(c[0], c[1]), add(c[2], c[3])), 0.25);
  const along = unit(sub(mul(add(c[1], c[2]), 0.5), mul(add(c[0], c[3]), 0.5)));
  const across = unit(sub(c[3], c[0]));
  const w = unit(crs(along, across));
  const v = crs(w, along);
  const outline = c.map((p): [number, number] => [dot(sub(p, o), along), dot(sub(p, o), v)]);
  const ribs: [[number, number], [number, number]][] = [];
  const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  // cell lines: rows across the panel (corner 0 to 3 and 1 to 2) and strings along it (0 to 1 and 3 to 2)
  for (let i = 1; i < cells[0]; i++) ribs.push([lerp(outline[0]!, outline[1]!, i / cells[0]), lerp(outline[3]!, outline[2]!, i / cells[0])]);
  for (let j = 1; j < cells[1]; j++) ribs.push([lerp(outline[0]!, outline[3]!, j / cells[1]), lerp(outline[1]!, outline[2]!, j / cells[1])]);
  return { kind: "plate", material, top: material, frame: { o, u: along, v, w }, outline, thickness: 0.35, ribs, plain: false, ...(back === material ? {} : {}) };
}

/** The directions of the ribs. The umbrella's and ring's lie on a cone about the mast (z) that opens from nearly shut to `thetaOpen`; the fan's lie in the y-z plane and spread from the mast to either side. */
function ribDirections(variant: Variant, n: number, open: number): { dirs: V3[]; theta: number } {
  if (variant === "fan") {
    const span = (Math.PI * 160) / 180;
    const k = ease(0.42, 1, open);
    const dirs: V3[] = [];
    for (let i = 0; i < n; i++) {
      const a = -span / 2 + (span * i) / (n - 1);
      const ang = a * k + (i - (n - 1) / 2) * 0.0045 * (1 - k);
      dirs.push([0, Math.sin(ang), Math.cos(ang)]);
    }
    return { dirs, theta: 0 };
  }
  const thetaOpen = (82 * Math.PI) / 180;
  const theta = 0.012 + (thetaOpen - 0.012) * ease(0.42, 1, open);
  const dirs: V3[] = [];
  for (let i = 0; i < n; i++) {
    const phi = (i / n) * 2 * Math.PI;
    dirs.push([Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)]);
  }
  return { dirs, theta };
}

/** One array, as pieces in its own frame. The mast base is the origin. */
export function chute(c: Chute): Piece[] {
  const out: Piece[] = [];
  const L = c.radius;
  const n = c.ribs;
  const u = ease(0, 0.45, c.open); // the ribs and the blanket pay out first, along the mast
  const mast = 0.18 * L * (0.7 + 0.3 * u) + 16; // the mast telescopes with them
  const hubR = Math.max(5, L * 0.035);
  const pivot: V3 = [0, 0, mast + hubR * 1.6]; // the beta gimbal: the disc tilts about the x axis here
  const tilt = ((c.tilt ?? 0) * Math.PI) / 180;
  const T = (p: V3): V3 => {
    if (tilt === 0) return p;
    const q = sub(p, pivot);
    return add(pivot, [q[0], q[1] * Math.cos(tilt) - q[2] * Math.sin(tilt), q[1] * Math.sin(tilt) + q[2] * Math.cos(tilt)]);
  };
  const push = (...p: Piece[]): void => void out.push(...p);
  const tube = (m: MaterialName, a: V3, b: V3, r: number, sides = 10): Plate => pipe(m, T(a), T(b), r, sides);
  const fixed = (m: MaterialName, a: V3, b: V3, r: number, sides = 10): Plate => pipe(m, a, b, r, sides);

  // the mount: a rotary joint (the whole group turns about the mast axis, as the ISS solar alpha joint does) on a stand-off plate
  const rj = Math.max(8, L * 0.06);
  push(fixed("hull-grey-dark", [0, 0, 0], [0, 0, 3], rj * 1.5, 28), fixed("hull-white", [0, 0, 3], [0, 0, 7], rj * 1.15, 28), fixed("dark", [0, 0, 7], [0, 0, 8.2], rj * 1.2, 28));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI;
    push(fixed("hull-orange", [Math.cos(a) * rj * 1.2, Math.sin(a) * rj * 1.2, 7.4], [Math.cos(a) * rj * 1.2, Math.sin(a) * rj * 1.2, 8.4], 0.7, 8));
  }
  // the telescoping lattice mast: three round longerons with triangle frames and diagonals, in two nested stages
  const mw = Math.max(5, L * 0.03);
  const corner = (k: number, z: number, s = 1): V3 => [Math.cos((k / 3) * 2 * Math.PI + Math.PI / 6) * mw * s, Math.sin((k / 3) * 2 * Math.PI + Math.PI / 6) * mw * s, z];
  const z0 = 8.2;
  const z1 = mast;
  const bays = Math.max(3, Math.round((z1 - z0) / (mw * 1.7)));
  for (let k = 0; k < 3; k++) {
    push(fixed("hull-white", corner(k, z0), corner(k, z0 + (z1 - z0) * 0.55), 0.75), fixed("hull-grey", corner(k, z0 + (z1 - z0) * 0.5, 0.8), corner(k, z1, 0.8), 0.62));
  }
  for (let b = 0; b <= bays; b++) {
    const z = z0 + ((z1 - z0) * b) / bays;
    const s = b / bays > 0.5 ? 0.8 : 1;
    for (let k = 0; k < 3; k++) {
      push(fixed("hull-grey", corner(k, z, s), corner(k + 1, z, s), 0.38, 8));
      if (b < bays) push(fixed("hull-grey-dark", corner(k, z, s), corner(k + 1, z + (z1 - z0) / bays, s), 0.3, 8));
    }
  }
  // the beta gimbal and the hub
  push(fixed("hull-grey-dark", [0, 0, z1], [0, 0, z1 + hubR * 0.7], mw * 1.3, 24));
  push(fixed("hull-white", [-hubR * 1.4, 0, pivot[2]], [hubR * 1.4, 0, pivot[2]], hubR * 0.7, 20)); // the gimbal's axle along x
  push(fixed("hull-grey", [-hubR * 1.5, 0, z1], [-hubR * 1.5, 0, pivot[2]], 0.9), fixed("hull-grey", [hubR * 1.5, 0, z1], [hubR * 1.5, 0, pivot[2]], 0.9));
  push(tube("hull-white", [0, 0, pivot[2] - hubR * 0.9], [0, 0, pivot[2] + hubR * 1.3], hubR, 28), tube("hull-orange", [0, 0, pivot[2] + hubR * 1.3], [0, 0, pivot[2] + hubR * 1.5], hubR * 0.75, 24), tube("lamp-amber", [0, 0, pivot[2] + hubR * 1.5], [0, 0, pivot[2] + hubR * 1.9], hubR * 0.3, 12));

  // the ribs and the blanket
  const { dirs, theta } = ribDirections(c.variant, n, c.open);
  const hinge = c.variant === "fan" ? 0.9 : hubR * 0.95; // the ribs hinge on a circle (fan: on one pin)
  const apexZ = c.variant === "fan" ? 0 : -hinge / Math.tan(theta);
  const base: V3 = [0, 0, pivot[2]];
  const apex: V3 = c.variant === "fan" ? base : add(base, [0, 0, apexZ]);
  const s0 = c.variant === "fan" ? 4 : hinge / Math.sin(theta);
  const reach = L * (0.25 + 0.75 * u); // the rib's length out from the hinge
  const point = (i: number, rho: number): V3 => add(apex, mul(dirs[i]!, s0 + rho));
  // fixed material shape, from the open state: the blanket's width at a distance rho from the hinge
  const open = ribDirections(c.variant, n, 1);
  const sOpen = c.variant === "fan" ? 4 : hinge / Math.sin(open.theta);
  const gap = (i: number): number => (i + 1) % n;
  const gapCount = c.variant === "fan" ? n - 1 : n;
  const halfWidth = (i: number, rho: number): number => {
    const a = add([0, 0, c.variant === "fan" ? 0 : -hinge / Math.tan(open.theta)], mul(open.dirs[i]!, sOpen + rho));
    const b = add([0, 0, c.variant === "fan" ? 0 : -hinge / Math.tan(open.theta)], mul(open.dirs[gap(i)]!, sOpen + rho));
    return len(sub(a, b)) / 2;
  };
  const ringInner = c.variant === "ring" ? Math.max(0, reach - 0.5 * L * Math.max(u, 0.14)) : 0;
  const stages = 4;
  // telescoping rib: nested round sections, each a quarter of the final length, sliding out along the first
  for (let i = 0; i < n; i++) {
    for (let st = 0; st < stages; st++) {
      const from = (st * (L / stages) * (reach - L / stages)) / (L * (1 - 1 / stages));
      const a = point(i, Math.min(from, reach));
      const b = point(i, Math.min(from + L / stages, reach));
      push(tube(st === 0 ? "hull-white" : "hull-grey", a, b, Math.max(0.55, L * 0.0042 * (1 - st * 0.17)), 10));
      if (st > 0) push(tube("hull-grey-dark", point(i, Math.min(from, reach)), point(i, Math.min(from + 1.6, reach)), Math.max(0.55, L * 0.0042) * 1.18, 10));
    }
    // the hinge knuckle and the tip lamp
    push(tube("hull-grey-dark", point(i, -1.2), point(i, 2), Math.max(0.9, L * 0.006), 10));
    push(tube("lamp-amber", point(i, reach), point(i, reach + 2.2), Math.max(0.9, L * 0.005), 8));
    // a deployment tie along the rib every few bays, as a cable
  }
  // the blanket: for every gap between two ribs, two halves that meet on a crease; open they are one flat petal, closing the crease lifts out
  for (let g = 0; g < gapCount; g++) {
    const i = g;
    const j = gap(g);
    const rho0 = c.variant === "ring" ? ringInner : 0.6;
    const rho1 = reach - 0.8;
    if (rho1 - rho0 < 2) continue;
    const mid = (rho: number): { m: V3; h: number; chord: V3 } => {
      const a = point(i, rho);
      const b = point(j, rho);
      return { m: mul(add(a, b), 0.5), h: len(sub(a, b)) / 2, chord: unit(sub(b, a)) };
    };
    const crease = (rho: number): V3 => {
      const { m, h, chord } = mid(rho);
      const w = halfWidth(i, rho);
      const lift = Math.sqrt(Math.max(0, w * w - h * h));
      const along = unit(sub(point(i, rho + 1), point(i, rho)));
      let nrm = unit(crs(chord, along));
      // outward from the axis for the umbrella and ring; alternating either side of the fan plane
      const outward: V3 = c.variant === "fan" ? [g % 2 === 0 ? 1 : -1, 0, 0] : [m[0], m[1], 0];
      if (dot(nrm, outward) < 0) nrm = mul(nrm, -1);
      return add(m, mul(nrm, lift));
    };
    const cells: [number, number] = [Math.max(2, Math.round((rho1 - rho0) / (L * 0.04))), 5];
    let turn = 0;
    if ((c.louvre ?? 0) !== 0 && c.open > 0.97) turn = (((c.louvre ?? 0) * Math.PI) / 180) * (g % 2 === 0 ? 1 : -1);
    const quad = (a0: V3, a1: V3, b1: V3, b0: V3): [V3, V3, V3, V3] => {
      if (turn === 0) return [a0, a1, b1, b0].map(T) as [V3, V3, V3, V3];
      // the petal turns about its own radial axis (the line through the middle of the petal)
      const ax0 = mul(add(point(i, rho0), point(j, rho0)), 0.5);
      const ax1 = mul(add(point(i, rho1), point(j, rho1)), 0.5);
      const axis = unit(sub(ax1, ax0));
      const spin = (p: V3): V3 => {
        const q = sub(p, ax0);
        const par = mul(axis, dot(q, axis));
        const perp = sub(q, par);
        const k = crs(axis, perp);
        return add(add(ax0, par), add(mul(perp, Math.cos(turn)), mul(k, Math.sin(turn))));
      };
      return [a0, a1, b1, b0].map((p) => T(spin(p))) as [V3, V3, V3, V3];
    };
    push(panel("solar", quad(point(i, rho0), point(i, rho1), crease(rho1), crease(rho0)), cells));
    push(panel("solar", quad(crease(rho0), crease(rho1), point(j, rho1), point(j, rho0)), cells));
    // the crease's edge member
    push(tube("hull-white", crease(rho0), crease(rho1), Math.max(0.3, L * 0.0016), 8));
    if (turn !== 0) {
      // the petal's gimbal: a pin along its radial axis and a drum at the root and at the tip
      const ax0 = mul(add(point(i, rho0), point(j, rho0)), 0.5);
      const ax1 = mul(add(point(i, rho1), point(j, rho1)), 0.5);
      push(tube("hull-grey-dark", ax0, ax1, Math.max(0.35, L * 0.002), 8), tube("hull-orange", add(ax0, [0, 0, 0]), add(ax0, mul(unit(sub(ax1, ax0)), 2.4)), Math.max(0.9, L * 0.005), 10));
    }
  }
  // the hoop of the ring: fixed-length links between the rib tips (and between the ribs at the inner edge), jointed in the middle so each folds inward as the ribs close
  if (c.variant === "ring") {
    for (const rho of [reach - 0.8, ringInner]) {
      if (rho < 4) continue;
      for (let i = 0; i < n; i++) {
        const j = gap(i);
        const a = point(i, rho);
        const b = point(j, rho);
        const m = mul(add(a, b), 0.5);
        const w = halfWidth(i, rho);
        const h = len(sub(a, b)) / 2;
        const dip = Math.sqrt(Math.max(0, w * w - h * h));
        const inward = unit([-m[0], -m[1], 0] as V3);
        const knee = add(m, mul(inward, dip));
        push(tube("hull-white", a, knee, Math.max(0.3, L * 0.0018), 8), tube("hull-white", knee, b, Math.max(0.3, L * 0.0018), 8));
        push(tube("hull-grey-dark", sub(knee, [0, 0, 0.8]), add(knee, [0, 0, 0.8]), Math.max(0.5, L * 0.0028), 8));
      }
    }
  }
  return out;
}

const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/chute-concept-shots.ts <folder>");
mkdirSync(out, { recursive: true });
interface Shot {
  name: string;
  eye: V3;
  target: V3;
  fov?: number;
  up?: V3;
  size?: [number, number];
  look?: "painted" | "line" | "lit";
  shadow?: number;
  sunDir?: V3;
  fill?: number;
  ortho?: number;
  clip?: [number, number, number, number];
}
interface Job {
  glb: string;
  more?: { glb: string; at: V3; turn?: number }[];
  shots: Shot[];
}
const jobs: Job[] = [];
const saveGlb = (name: string, pieces: Piece[]): string => {
  const file = join(out, `${name}.glb`);
  writeFileSync(file, toGlb([{ name, mesh: meshOf(pieces), at: [0, 0, 0] }]).bytes);
  return file;
};
const R = 200; // a Kaminari-size array: 400 m across open
const COUNT: Record<Variant, number> = { ring: 12, umbrella: 16, fan: 9 };
const STATES: [string, number][] = [["stowed", 0], ["half", 0.7], ["open", 1]];
const files: Record<string, string> = {};
for (const variant of ["umbrella", "ring", "fan"] as const) {
  for (const [state, open] of STATES) files[`${variant}-${state}`] = saveGlb(`${variant}-${state}`, chute({ variant, radius: R, ribs: COUNT[variant], open }));
  files[`${variant}-open-tilt`] = saveGlb(`${variant}-open-tilt`, chute({ variant, radius: R, ribs: COUNT[variant], open: 1, tilt: 32 }));
  if (variant !== "fan") files[`${variant}-open-louvre`] = saveGlb(`${variant}-open-louvre`, chute({ variant, radius: R, ribs: COUNT[variant], open: 1, louvre: 28 }));
  // the three states side by side, from three quarters, and the open disc from the Sun's side
  const gap = 520;
  jobs.push({
    glb: files[`${variant}-half`]!,
    more: [{ glb: files[`${variant}-stowed`]!, at: [-gap, 0, 0] }, { glb: files[`${variant}-open`]!, at: [gap, 0, 0] }],
    shots: [
      { name: `${variant}-states`, eye: [0, -1500, 560], target: [0, 0, 130], up: [0, 0, 1], fov: 30, size: [2000, 900], look: "painted", shadow: 900, sunDir: [0.4, -0.5, 0.8] },
    ],
  });
  jobs.push({ glb: files[`${variant}-open`]!, shots: [
    { name: `${variant}-open-front`, eye: [0, -700, 420], target: [0, 0, 120], up: [0, 0, 1], fov: 32, size: [1500, 1000], look: "painted", shadow: 420, sunDir: [0.3, -0.5, 0.9] },
    { name: `${variant}-open-face`, eye: [0, 0, 1500], target: [0, 0, 0], up: [0, 1, 0], fov: 22, size: [1200, 1200], look: "painted", shadow: 400, sunDir: [0.3, -0.3, 1] },
    { name: `${variant}-open-line`, eye: [0, -700, 420], target: [0, 0, 120], up: [0, 0, 1], fov: 32, size: [1500, 1000], look: "line", shadow: 420 },
    { name: `${variant}-hub`, eye: [34, -52, 68], target: [0, 0, 44], up: [0, 0, 1], fov: 38, size: [1400, 1000], look: "painted", shadow: 90, sunDir: [0.4, -0.5, 0.8] },
  ] });
  jobs.push({ glb: files[`${variant}-open-tilt`]!, shots: [{ name: `${variant}-open-tilted`, eye: [900, -500, 260], target: [0, 20, 130], up: [0, 0, 1], fov: 30, size: [1500, 1000], look: "painted", shadow: 420, sunDir: [0.5, -0.4, 0.8] }] });
  if (files[`${variant}-open-louvre`]) jobs.push({ glb: files[`${variant}-open-louvre`]!, shots: [{ name: `${variant}-open-louvre`, eye: [700, -560, 300], target: [0, 0, 120], up: [0, 0, 1], fov: 30, size: [1500, 1000], look: "painted", shadow: 420, sunDir: [0.5, -0.4, 0.8] }] });
}
// on Kaminari: the Ring at the bow end, the Umbrella at the aft end, both open and stowed; and Miyamoto with a smaller Umbrella
{
  const k = build({ rocket: "fleet-kaminari", variant: "fleet-kaminari" }, { detail: "coarse" });
  const kfile = join(out, "kaminari.glb");
  writeFileSync(kfile, k.glb().bytes);
  const kb = k.boundsOf("together");
  const top = kb.max[1];
  const mount = (name: string, open: number, y: number, variant: Variant, tilt = 0): { glb: string; at: V3; turn?: number } => ({ glb: saveGlb(name, chute({ variant, radius: R, ribs: COUNT[variant], open, tilt })), at: [0, y, 18] });
  for (const [state, open] of [["stowed", 0], ["open", 1]] as const) {
    const ring = mount(`k-ring-${state}`, open, top - 160, "ring", open === 1 ? 20 : 0);
    const umb = mount(`k-umbrella-${state}`, open, 210, "umbrella", open === 1 ? -20 : 0);
    jobs.push({ glb: kfile, more: [ring, umb], shots: [
      { name: `kaminari-${state}-side`, eye: [4200, 900, 250], target: [0, 900, 120], up: [0, 0, 1], fov: 30, size: [2400, 900], look: "painted", shadow: 1300, sunDir: [0.5, -0.3, 0.8] },
      { name: `kaminari-${state}-3q`, eye: [1500, -1500, 1300], target: [0, 960, 110], up: [0, 0, 1], fov: 34, size: [2000, 1100], look: "painted", shadow: 1300, sunDir: [0.5, -0.4, 0.8] },
    ] });
  }
  jobs.push({ glb: kfile, more: [mount("k-ring-open2", 1, top - 160, "ring", 20), mount("k-umbrella-open2", 1, 210, "umbrella", -20)], shots: [
    { name: "kaminari-open-top", eye: [0, 960, 3400], target: [0, 960, 0], up: [0, 1, 0], ortho: 2000, size: [1500, 2000], look: "painted", shadow: 1300, sunDir: [0.3, -0.2, 1] },
  ] });
  const m = docked("miyamoto", 1, "fine");
  const mfile = saveGlb("miyamoto-ref", m);
  const mb = boundsOf(meshOf(m));
  const ms = 70;
  const mm = saveGlb("m-umbrella-open", chute({ variant: "umbrella", radius: ms, ribs: 16, open: 1, tilt: 14 }));
  const ms2 = saveGlb("m-umbrella-stowed", chute({ variant: "umbrella", radius: ms, ribs: 16, open: 0 }));
  const my = (mb.min[1] + mb.max[1]) / 2;
  jobs.push({ glb: mfile, more: [{ glb: mm, at: [mb.max[0] * 0.55, my * 0.6, mb.max[2] * 0.5] }], shots: [{ name: "miyamoto-umbrella-open", eye: [700, -300, 420], target: [0, my, 20], up: [0, 0, 1], fov: 34, size: [1600, 1000], look: "painted", shadow: 500, sunDir: [0.5, -0.4, 0.8] }] });
  jobs.push({ glb: mfile, more: [{ glb: ms2, at: [mb.max[0] * 0.55, my * 0.6, mb.max[2] * 0.5] }], shots: [{ name: "miyamoto-umbrella-stowed", eye: [700, -300, 420], target: [0, my, 20], up: [0, 0, 1], fov: 34, size: [1600, 1000], look: "painted", shadow: 500, sunDir: [0.5, -0.4, 0.8] }] });
  void coarsen;
}
writeFileSync(join(out, "jobs.json"), JSON.stringify(jobs, null, 1));
console.log(`${jobs.length} jobs, ${jobs.reduce((n, j) => n + j.shots.length, 0)} shots in ${out}`);
