// The four pods and the four-arm cross of ISV Kyotori, round 2. The cross is a hub on a bearing round the stem, four thick habitable arm tubes (three floors, rows of windows) running out to four end pods that each have their own shape (a control
// centre with a glazed dome, a research lab of three drums and a dish, an observatory with a telescope barrel on a fork, and engineering with a reactor sphere and radiator fins), joined by a slender rim. Not a torus. It can turn or fold
// forward along the stem. Every repeated part is one template stamped at many poses. Concepts only. Pure: no three.js and no DOM.
import { antenna, box, cub, hoop, ibeam, place, rod, stamp, type Lathe, type MaterialName, type Piece, type Pose, type Vec3 } from "./adapter.ts";
import { sphere } from "../ship-01/wheelparts.ts";

const deg = (a: number): number => (a * Math.PI) / 180;
const lathe = (material: MaterialName, profile: [number, number][], at: [number, number] = [0, 0], extra: Partial<Lathe> = {}): Lathe => ({ kind: "lathe", material, segs: 32, only: "mesh", at, profile, ...extra });

/** The control centre, 18 m: a drum with a lit window band, a glazed dome of eight ribs above it, a mast with two whips and a ring of floodlights. Local origin: the middle of its base. */
export function controlPod(): Piece[] {
  const out: Piece[] = [lathe("hull-white", [[5.2, 0], [5.2, 9]], [0, 0], { body: true, outline: true, only: undefined }), lathe("window", [[5.25, 5.4], [5.25, 7.2]]), hoop("hull-grey-dark", 5.2, 0, 0.35, 32, 8), hoop("hull-grey-dark", 5.2, 9, 0.35, 32, 8)];
  const dome: [number, number][] = Array.from({ length: 9 }, (_, i) => [5 * Math.cos((Math.PI / 2) * (i / 8)) || 0.01, 9 + 4.4 * Math.sin((Math.PI / 2) * (i / 8))]);
  out.push(lathe("glass-clear", dome, [0, 0], { segs: 32, only: "mesh" }));
  for (let k = 0; k < 8; k++) out.push(rod("hull-grey", [5 * Math.sin(deg(45 * k)), 9, 5 * Math.cos(deg(45 * k))], [0, 13.4, 0], 0.12, 6, { only: "mesh" }));
  out.push(rod("hull-grey", [0, 13.4, 0], [0, 18, 0], 0.18, 6, { only: "mesh" }), ...antenna("whip", [2, 9.3, 2], [0, 1, 0], 4, "ctl"), ...Array.from({ length: 6 }, (_, k): Piece => box("flood", [5.5 * Math.sin(deg(60 * k)), 8.7, 5.5 * Math.cos(deg(60 * k))], 0.5, 0.5, 0.4, 0, { only: "mesh", plain: true })));
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
