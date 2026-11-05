// The four pods and the four-arm cross of ISV Kyotori, round 2. The cross is a hub on a bearing round the stem, four thick habitable arm tubes (three floors, rows of windows) running out to four end pods that each have their own shape (a control
// centre with a glazed dome, a research lab of three drums and a dish, an observatory with a telescope barrel on a fork, and engineering with a reactor sphere and radiator fins), joined by a slender rim. Not a torus. It can turn or fold
// forward along the stem. Every repeated part is one template stamped at many poses. Concepts only. Pure: no three.js and no DOM.
import { antenna, box, collar, cub, hoop, ibeam, place, quad, rod, roundStrut, stamp, type Lathe, type MaterialName, type Piece, type Pose, type Vec3 } from "./adapter.ts";
import { sphere } from "../ship-01/wheelparts.ts";

const TAU = 2 * Math.PI;
const deg = (a: number): number => (a * Math.PI) / 180;
const lathe = (material: MaterialName, profile: [number, number][], at: [number, number] = [0, 0], extra: Partial<Lathe> = {}): Lathe => ({ kind: "lathe", material, segs: 32, only: "mesh", at, profile, ...extra });

/** The control centre, 18 m: a drum with a lit window band, a glazed dome of eight ribs above it, a mast with two whips and a ring of floodlights. Local origin: the middle of its base. */
export function controlPod(): Piece[] {
  const out: Piece[] = [lathe("hull-white", [[5.2, 0], [5.2, 9]], [0, 0], { body: true, outline: true, only: undefined }), lathe("window", [[5.25, 5.4], [5.25, 7.2]]), hoop("hull-grey-dark", 5.2, 0, 0.35, 32, 8), hoop("hull-grey-dark", 5.2, 9, 0.35, 32, 8)];
  out.push(lathe("hull-white", [[0.01, 9], [5.2, 9]], [0, 0], { segs: 32 }));
  // a Cupola on the drum: six trapezoid windows on a low faceted frustum, a round window on top, and six shutters folded out
  const R0 = 4.4;
  const R1 = 2.1;
  const top = 12.3;
  const b = (k: number): Vec3 => [R0 * Math.sin(deg(60 * k)), 9, R0 * Math.cos(deg(60 * k))];
  const t = (k: number): Vec3 => [R1 * Math.sin(deg(60 * k)), top, R1 * Math.cos(deg(60 * k))];
  for (let k = 0; k < 6; k++) {
    out.push(quad("glass-clear", b(k), b(k + 1), t(k + 1), t(k), 0.1, { only: "mesh" }), rod("hull-grey-dark", b(k), t(k), 0.2, 6, { only: "mesh" }), rod("hull-grey-dark", b(k), b(k + 1), 0.24, 6, { only: "mesh" }), rod("hull-grey-dark", t(k), t(k + 1), 0.18, 6, { only: "mesh" }));
    const m: Vec3 = [(b(k)[0] + b(k + 1)[0]) / 2, 9.05, (b(k)[2] + b(k + 1)[2]) / 2];
    const u: Vec3 = [m[0] / R0, 0, m[2] / R0];
    const tan: Vec3 = [u[2], 0, -u[0]];
    const d: Vec3 = [u[0] * 0.9, 0.45, u[2] * 0.9];
    const P = (a: number, l: number): Vec3 => [m[0] + tan[0] * a + d[0] * l, m[1] + d[1] * l, m[2] + tan[2] * a + d[2] * l];
    out.push(quad("hull-white", P(-1.9, 0), P(1.9, 0), P(1.4, 3.6), P(-1.4, 3.6), 0.22, { only: "mesh" }), rod("hull-grey-dark", P(-1.9, 0), P(1.9, 0), 0.12, 6, { only: "mesh" }), rod("hull-grey", P(0, 0.1), P(0, 3.4), 0.1, 6, { only: "mesh" }));
  }
  out.push(lathe("glass-clear", [[1.8, top], [1.8, top + 0.12]], [0, 0], { segs: 24 }), hoop("hull-grey-dark", 1.9, top + 0.1, 0.22, 24, 6));
  out.push(rod("hull-grey", [0, top + 0.2, 0], [0, 17, 0], 0.18, 6, { only: "mesh" }), ...antenna("whip", [3.2, 9.3, 2], [0, 1, 0], 4, "ctl"), ...Array.from({ length: 6 }, (_, k): Piece => box("flood", [5.5 * Math.sin(deg(60 * k)), 8.7, 5.5 * Math.cos(deg(60 * k))], 0.5, 0.5, 0.4, 0, { only: "mesh", plain: true })));
  return out;
}

/** The research lab, 16 m: a long central drum with two short ones either side on a frame, a ring of lit ports on each, a dish on a mast, and a rack of sample cases. */
export function labPod(): Piece[] {
  const out: Piece[] = [lathe("hull-white", [[4.2, 0], [4.2, 16]], [0, 0], { body: true, outline: true, only: undefined }), lathe("window", [[4.25, 5], [4.25, 6.4]]), lathe("window", [[4.25, 10], [4.25, 11.4]])];
  for (const s of [-1, 1]) {
    out.push(lathe("hull-white-worn", [[2.4, 3], [2.4, 13]], [s * 6.2, 0], { segs: 24, body: true, outline: true, only: undefined }), lathe("lamp-blue", [[2.45, 7], [2.45, 8]], [s * 6.2, 0], { segs: 24 }), ...ibeam("hull-grey", [s * 4.2, 5, 0], [s * 6.2, 5, 0], 0.8, 0.5, [0, 0, 1]), ...ibeam("hull-grey", [s * 4.2, 11, 0], [s * 6.2, 11, 0], 0.8, 0.5, [0, 0, 1]));
  }
  out.push(rod("hull-grey", [0, 16, 0], [0, 20, 0], 0.25, 6, { only: "mesh" }), ...antenna("dish", [0, 20, 0], [0.3, 1, 0], 5, "lab"), cub("hull-yellow", [-3.4, 3.4], [0, 1], [4.2, 4.6]));
  return out;
}

/** The observatory, 22 m: a telescope barrel of radius 3.4 with an open aperture and three baffle rings inside, slung between two arms of a fork on a base drum, with a small finder scope. */
export function observatoryPod(): Piece[] {
  const out: Piece[] = [lathe("hull-white", [[5, 0], [5, 4]], [0, 0], { body: true, outline: true, only: undefined }), lathe("hull-grey-dark", [[5.1, 3.6], [5.1, 4.2]])];
  for (const s of [-1, 1]) out.push(...ibeam("hull-grey", [s * 4.2, 4, 0], [s * 4.2, 11, 0], 0.9, 0.7, [1, 0, 0]));
  const barrel: [number, number][] = [[3.4, 8], [3.4, 20]];
  out.push(lathe("hull-white", barrel, [0, 0], { segs: 36, body: true, outline: true, only: undefined }), lathe("panel-dark", [[3.0, 20], [3.0, 12]], [0, 0], { segs: 36 }), lathe("kapton", [[2.9, 12.2], [0.4, 12.2]], [0, 0], { segs: 36 }), hoop("hull-grey-dark", 3.4, 20, 0.3, 36, 8));
  for (const y of [14, 16.5, 19]) out.push(hoop("hull-grey", 3.1, y, 0.15, 36, 6));
  out.push(lathe("hull-grey-dark", [[1.0, 8], [1.0, 20]], [4.9, 0], { segs: 12, only: "mesh" }) as Piece, ...ibeam("hull-grey", [4.2, 11, 0], [3.4, 11, 0], 0.4, 0.4, [0, 1, 0]));
  return out;
}

/** Engineering, 20 m: a reactor sphere of radius 4 on a short neck, a stack of four field coils above it, and four radiator fins on booms, each with coolant pipes. */
export function engineeringPod(): Piece[] {
  const out: Piece[] = [lathe("hull-grey-dark", [[2, 0], [2, 4]], [0, 0], { segs: 16 }), sphere("hull-white", [0, 8, 0], 4.2), sphere("hull-grey", [0, 8, 0], 4.25), hoop("coil-lit", 4.4, 8, 0.35, 32, 8), hoop("coil", 4.2, 10.5, 0.3, 32, 8), hoop("coil", 4.2, 5.5, 0.3, 32, 8)];
  for (let k = 0; k < 4; k++) {
    const a = deg(45 + 90 * k);
    const dir: Vec3 = [Math.sin(a), 0, Math.cos(a)];
    out.push(...ibeam("hull-grey", [dir[0] * 4, 8, dir[2] * 4], [dir[0] * 9, 8, dir[2] * 9], 0.6, 0.4, [0, 1, 0]));
    out.push(...place([cub("radiator", [0, 9], [-6, 6], [-0.1, 0.1]), cub("copper", [0, 9], [-5.5, -5.3], [-0.2, 0.2]), cub("copper", [0, 9], [5.3, 5.5], [-0.2, 0.2]), cub("copper", [0, 9], [-0.1, 0.1], [-0.2, 0.2])], { at: [dir[0] * 9, 8, dir[2] * 9], yaw: (Math.atan2(dir[0], dir[2]) * 180) / Math.PI - 90 }));
  }
  out.push(rod("hull-grey", [0, 12.4, 0], [0, 18, 0], 0.4, 8, { only: "mesh" }), ...antenna("omni", [0, 18, 0], [0, 1, 0], 3, "eng"));
  return out;
}

export const POD_LENGTH = { control: 18, lab: 20, observatory: 20, engineering: 18 } as const;
const PODS: readonly [keyof typeof POD_LENGTH, () => Piece[]][] = [["control", controlPod], ["lab", labPod], ["observatory", observatoryPod], ["engineering", engineeringPod]];

export interface CrossOptions {
  /** The hub's height on the stem, the radius of the rim (the pods' own radius), and the angle of the first arm in degrees. */
  y: number;
  R: number;
  turn?: number;
  /** 0 is the arms out across the stem; 1 is the arms folded forward along it, the pods stacked ahead of the hub. */
  fold?: number;
  /** Which pods this cross carries, in arm order. */
  pods?: number[];
}

/** The four-arm cross: a hub drum on a bearing, four thick arms of three floors with rows of windows, the pods, and a slender rim. The arms hold their length; folded, they lie along the stem with the pods at their ends. */
export function cross(o: CrossOptions): Piece[] {
  const { y, R } = o;
  const fold = o.fold ?? 0;
  const hubR = 15;
  const armR = 5;
  const armLen = R - hubR - 3;
  const out: Piece[] = [lathe("hull-white", [[hubR, y - 9], [hubR, y + 9]], [0, 0], { segs: 48, body: true, outline: true, only: undefined }), lathe("hull-grey-dark", [[hubR, y - 9], [hubR + 1.3, y - 9], [hubR + 1.3, y + 9], [hubR, y + 9]], [0, 0], { segs: 48 }), hoop("hull-grey", hubR + 0.4, y - 4, 0.3, 48, 6), hoop("hull-grey", hubR + 0.4, y + 4, 0.3, 48, 6)];
  const f = fold * (Math.PI / 2);
  const centres: Vec3[] = [];
  (o.pods ?? [0, 1, 2, 3]).forEach((podIndex, k) => {
    const a = deg((o.turn ?? 0) + 90 * k);
    const radial: Vec3 = [Math.sin(a), 0, Math.cos(a)];
    // the arm runs from the hub's wall along `d`, which is radial when open and lies along +Y when folded
    const d: Vec3 = [radial[0] * Math.cos(f), Math.sin(f), radial[2] * Math.cos(f)];
    const p0: Vec3 = [radial[0] * (hubR + 0.5), y, radial[2] * (hubR + 0.5)];
    const p1: Vec3 = [p0[0] + d[0] * armLen, p0[1] + d[1] * armLen, p0[2] + d[2] * armLen];
    out.push(rod("hull-white", p0, p1, armR, 20, { only: "mesh" }), rod("hull-grey", p0, p1, armR + 0.12, 8, { only: "mesh" }));
    // three floors: rows of windows along the arm on both flanks at the heights of the floors, and a service rail on top
    const side: Vec3 = [radial[2], 0, -radial[0]];
    const up: Vec3 = [d[1] * side[2] - d[2] * side[1], d[2] * side[0] - d[0] * side[2], d[0] * side[1] - d[1] * side[0]];
    for (const h of [-2.6, 0, 2.6]) for (const sgn of [-1, 1]) {
      const w = Math.sqrt(armR * armR - h * h) * 1.01;
      const off = (q: Vec3): Vec3 => [q[0] + side[0] * sgn * w + up[0] * h, q[1] + side[1] * sgn * w + up[1] * h, q[2] + side[2] * sgn * w + up[2] * h];
      out.push(rod("window", off(p0), off(p1), 0.38, 6, { only: "mesh" }));
    }
    out.push(rod("hull-grey-dark", [p0[0] + up[0] * (armR + 0.2), p0[1] + up[1] * (armR + 0.2), p0[2] + up[2] * (armR + 0.2)], [p1[0] + up[0] * (armR + 0.2), p1[1] + up[1] * (armR + 0.2), p1[2] + up[2] * (armR + 0.2)], 0.2, 6, { only: "mesh" }));
    // a lock ring at each end of the arm and a spar every ten metres
    for (let t = 0.1; t < 1; t += 0.2) out.push(rod("hull-grey-dark", [p0[0] + d[0] * armLen * t, p0[1] + d[1] * armLen * t - armR, p0[2] + d[2] * armLen * t], [p0[0] + d[0] * armLen * t, p0[1] + d[1] * armLen * t + armR, p0[2] + d[2] * armLen * t], 0.35, 8, { only: "mesh" }));
    const [kind, make] = PODS[podIndex];
    const at: Vec3 = [p1[0] + d[0] * 1.5, p1[1] + d[1] * 1.5 - (fold > 0.5 ? 0 : POD_LENGTH[kind] / 2), p1[2] + d[2] * 1.5];
    out.push(...place(make(), { at }));
    centres.push([at[0], at[1] + POD_LENGTH[kind] / 2, at[2]]);
  });
  // the slender rim: a thin tube through the four pods when open, four reeled cables when folded
  if (fold < 0.05) out.push(hoop("hull-grey", R - 1, y, 0.7, 160, 10), ...stamp([hoop("hull-grey-dark", R - 1, 0, 1.0, 40, 8, { arc: () => [-0.03, 0.03] })], Array.from({ length: 24 }, (_, i): Pose => ({ at: [0, y, 0], yaw: 15 * i }))));
  else for (const c of centres) out.push(lathe("hull-grey-dark", [[1.2, c[1] + 11], [1.2, c[1] + 12.4]], [c[0], c[2]], { segs: 16 }), lathe("copper", [[0.8, c[1] + 11.4], [0.8, c[1] + 12]], [c[0], c[2]], { segs: 16 }));
  return out;
}

/** A real propellant tank, `len` long and `r` in radius: a cylinder with domed ends in white insulation, eight longerons and a ring frame every 6 m standing proud of the skin, gold foil bands, a feed fitting on the top dome and a cradle of two saddles. Local origin: the middle of its base. */
export function framedTank(r: number, len: number): Piece[] {
  const dome = (sign: 1 | -1): [number, number][] => Array.from({ length: 7 }, (_, i) => [Math.max(0.01, r * Math.cos((Math.PI / 2) * (i / 6))), sign > 0 ? len - r * 0.55 + r * 0.55 * Math.sin((Math.PI / 2) * (i / 6)) : r * 0.55 - r * 0.55 * Math.sin((Math.PI / 2) * (i / 6))]);
  const body: [number, number][] = [...dome(-1).reverse(), ...dome(1)];
  const out: Piece[] = [{ kind: "lathe", material: "hull-white", segs: 32, body: true, outline: true, profile: body } as Lathe];
  for (let k = 0; k < 8; k++) {
    const a = deg(45 * k);
    out.push(rod("hull-grey", [(r + 0.12) * Math.sin(a), r * 0.55, (r + 0.12) * Math.cos(a)], [(r + 0.12) * Math.sin(a), len - r * 0.55, (r + 0.12) * Math.cos(a)], 0.07, 6, { only: "mesh" }));
  }
  for (let y = 4; y < len - 3; y += 6) out.push(hoop("hull-grey-dark", r + 0.14, y, 0.14, 32, 6));
  for (const f of [0.18, 0.5, 0.82]) out.push(lathe("kapton", [[r + 0.06, len * f - 0.8], [r + 0.06, len * f + 0.8]], [0, 0], { segs: 32 }));
  out.push(lathe("hull-grey-dark", [[0.9, len], [0.9, len + 1.1]], [0, 0], { segs: 12 }), hoop("hull-grey", 0.9, len + 1.1, 0.15, 12, 6), rod("hull-grey", [0, len + 1.1, 0], [0, len + 2.4, 0], 0.12, 6, { only: "mesh" }));
  for (const f of [0.12, 0.88]) for (const s of [-1, 1]) out.push(box("hull-grey-dark", [s * (r + 0.35), len * f - 0.4, 0], 0.5, 1.6, 0.8, 0, { only: "mesh", plain: true }));
  return out;
}

/** The payload barrel with its two clamshell doors open on vertical hinges as on the Space Shuttle: each door a shell with six ribs, a seal along its free edge, latch hooks, a row of hinge knuckles on a pin, and two hydraulic actuators (a cylinder and a piston) from the barrel's frame to the door's inside; inside, a cradle ring on rails, a robot arm and an M-class dock at each end. */
export function payloadBay2(y0: number, open = 100): Piece[] {
  const R = 9;
  const L = 40;
  const gap = 1.05;
  const out: Piece[] = [];
  const shell = (a0: number, a1: number, material: MaterialName = "hull-white"): Lathe => ({ kind: "lathe", material, segs: 72, body: true, outline: true, arc: () => [a0, a1], profile: [[R, y0], [R, y0 + L]] });
  out.push(shell(TAU / 4 + gap, (5 * TAU) / 4 - gap));
  for (const y of [y0, y0 + L]) out.push(hoop("hull-grey-dark", R, y, 0.5, 72, 8));
  for (let i = 1; i < 8; i++) out.push(hoop("hull-grey", R + 0.08, y0 + (L * i) / 8, 0.2, 72, 6, { arc: () => [TAU / 4 + gap, (5 * TAU) / 4 - gap] }));
  const turn = (p: Vec3, t: number): Vec3 => [p[0] * Math.cos(t) + p[2] * Math.sin(t), p[1], -p[0] * Math.sin(t) + p[2] * Math.cos(t)];
  for (const s of [-1, 1]) {
    const hingeA = TAU / 4 + s * gap;
    const free = s > 0 ? hingeA - 1.05 : hingeA + 1.05;
    const span: [number, number] = s > 0 ? [hingeA - 1.05, hingeA] : [hingeA, hingeA + 1.05];
    const H: Vec3 = [R * Math.sin(hingeA), 0, R * Math.cos(hingeA)];
    const door: Piece[] = [shell(span[0], span[1], "hull-white-worn")];
    for (let i = 0; i <= 6; i++) door.push(hoop("hull-grey", R + 0.12, y0 + (L * i) / 6, 0.2, 72, 6, { arc: () => span }));
    const edge = (r: number, y: number): Vec3 => [r * Math.sin(free), y, r * Math.cos(free)];
    door.push(rod("black", edge(R + 0.05, y0), edge(R + 0.05, y0 + L), 0.1, 6, { only: "mesh" }), rod("hull-grey-dark", edge(R + 0.25, y0), edge(R + 0.25, y0 + L), 0.14, 6, { only: "mesh" }));
    for (let i = 0; i < 6; i++) door.push(box("hazard", edge(R + 0.2, y0 + 3 + i * 6.8), 0.5, 0.35, 0.9, 0, { only: "mesh", plain: true }));
    out.push(...place(place(door, { at: [-H[0], 0, -H[2]] }), { at: H, yaw: s * open }));
    // the hinge: a pin and knuckles on the barrel's frame
    out.push(rod("hull-grey-dark", [H[0] * 1.02, y0 + 0.5, H[2] * 1.02], [H[0] * 1.02, y0 + L - 0.5, H[2] * 1.02], 0.12, 6, { only: "mesh" }));
    for (let i = 0; i < 6; i++) out.push(rod("hull-grey", [H[0] * 1.03, y0 + 1 + i * 6.6, H[2] * 1.03], [H[0] * 1.03, y0 + 3.6 + i * 6.6, H[2] * 1.03], 0.3, 10, { only: "mesh" }));
    // two actuators: a cylinder from the frame at the hinge side to a piston on the door's inside at its middle, where the door has swung to
    const mid = (span[0] + span[1]) / 2;
    for (const f of [0.28, 0.72]) {
      const y = y0 + L * f;
      const P0: Vec3 = [(R - 0.5) * Math.sin(hingeA - s * 0.3), y, (R - 0.5) * Math.cos(hingeA - s * 0.3)];
      const closed: Vec3 = [(R - 0.3) * Math.sin(mid), y, (R - 0.3) * Math.cos(mid)];
      const rel: Vec3 = [closed[0] - H[0], closed[1], closed[2] - H[2]];
      const t = deg(s * open);
      const P1: Vec3 = [H[0] + turn(rel, t)[0], y, H[2] + turn(rel, t)[2]];
      const M: Vec3 = [(P0[0] * 0.55 + P1[0] * 0.45), y, (P0[2] * 0.55 + P1[2] * 0.45)];
      out.push(rod("hull-grey", P0, M, 0.24, 10, { only: "mesh" }), rod("copper", M, P1, 0.12, 8, { only: "mesh" }), rod("hull-grey-dark", [P1[0] - 0.2, y - 0.4, P1[2]], [P1[0] + 0.2, y + 0.4, P1[2]], 0.2, 6, { only: "mesh" }));
    }
  }
  out.push(hoop("hull-grey", R - 1.2, y0 + L * 0.45, 0.45, 56, 8, { arc: () => [-1.2, 1.2] }));
  out.push(cub("hull-yellow", [-2.6, -2.4], [y0 + 2, y0 + L - 2], [-R + 1.3, -R + 1.6]), cub("hull-yellow", [2.4, 2.6], [y0 + 2, y0 + L - 2], [-R + 1.3, -R + 1.6]));
  for (let i = 0; i < 9; i++) out.push(cub("hull-grey-dark", [-3.2, 3.2], [y0 + 3 + i * 4.2, y0 + 3.4 + i * 4.2], [-R + 1.1, -R + 1.5]));
  out.push(...place(collar("M", 0, 1), { at: [0, y0 + 0.4, 0] }), ...place(collar("M", 0, -1), { at: [0, y0 + L - 0.4, 0] }));
  const arm: Vec3[] = [[-6.2, y0 + 3, -R + 2.4], [-6.2, y0 + 14, -2.5], [-2, y0 + 22, 3], [3, y0 + 32, 3]];
  for (let i = 0; i + 1 < arm.length; i++) out.push(...roundStrut("hull-white", arm[i], arm[i + 1], 0.55));
  out.push(box("hull-grey-dark", [3, y0 + 32, 3], 1.2, 1.2, 0.6, 0, { only: "mesh", plain: true }));
  return out;
}
