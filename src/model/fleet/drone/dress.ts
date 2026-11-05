// Shared parts for the construction machines: bevelled panels, bolts, a lens and a jointed arm.
import type { MaterialName } from "../../materials.ts";
import type { Piece, Vec3 } from "../../pieces.ts";
import { disc, discZ, hoop, post, rod } from "../detail.ts";
import { chamfer, polygon } from "./plates.ts";

export const WHITE = "hull-white" satisfies MaterialName;
export const ORANGE = "hull-orange" satisfies MaterialName;
export const YELLOW = "hull-yellow" satisfies MaterialName;
export const DARK = "hull-grey-dark" satisfies MaterialName;
export const METAL = "hull-grey" satisfies MaterialName;
export const GLASS = "glass-clear" satisfies MaterialName;
export const GOLD = "gold" satisfies MaterialName;
export const GLOW = "coil-lit" satisfies MaterialName;
export const BLUE = "lamp-blue" satisfies MaterialName;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];

/** A plate lying flat, outline in [forward, side]. */
export const deck = (material: MaterialName, centre: Vec3, outline: readonly (readonly [number, number])[], thick = 0.04): Piece => polygon(material, centre, [0, 0, 1], [0, 1, 0], outline, thick);

export const tube = (material: MaterialName, a: Vec3, b: Vec3, radius: number, segs = 8): Piece => {
  const dy = b[1] - a[1] || 0.001;
  const lean: [number, number] = [(b[0] - a[0]) / dy, (b[2] - a[2]) / dy];
  return post(material, [a[0] - lean[0] * a[1], a[2] - lean[1] * a[1]], radius, a[1], radius, b[1], segs, { lean });
};

/** A bevelled panel with a seam, so a face is never a plain rectangle. */
export function panel(material: MaterialName, x: number, y: number, z: number, halfU: number, halfV: number): Piece[] {
  const cut = Math.min(halfU, halfV) * 0.3;
  return [deck(material, [x, y, z], chamfer(halfU, halfV, cut), 0.018), deck(DARK, [x, y + halfV * 0.15, z + 0.012], chamfer(halfU * 0.7, 0.008, 0.004), 0.004)];
}

/** Four bolts inside a panel. */
export function bolts(x: number, y: number, z: number, halfU: number, halfV: number): Piece[] {
  const out: Piece[] = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) out.push(discZ(METAL, x + a * halfU * 0.62, y + b * halfV * 0.62, z, z + 0.008, 0.007, 5));
  return out;
}

/** Three vent slots. */
export function vents(x: number, y: number, z: number): Piece[] {
  return [0, 1, 2].map((i) => deck(DARK, [x, y + i * 0.028, z], chamfer(0.01, 0.022, 0.005), 0.005));
}

/** The lens the beam leaves: a gold ring, a glowing throat and a glass centre. */
export function emitter(at: readonly [number, number], y: number, radius: number): Piece[] {
  return [hoop(GOLD, radius, y, radius * 0.14, 14, 4, { at }), hoop(GLOW, radius * 0.55, y, radius * 0.07, 10, 4, { at }), disc(GLASS, at, radius * 0.4, y, 0.008, 8), disc(DARK, at, radius * 0.68, y - 0.008, 0.008, 8)];
}

export function whip(from: Vec3, to: Vec3): Piece[] {
  return [rod(METAL, from, to, 0.005, 3), discZ(BLUE, to[0], to[1], to[2], to[2] + 0.016, 0.01, 5)];
}

function jaw(sign: number, wrist: Vec3, grasp: Vec3): Piece[] {
  const out: Piece[] = [];
  for (const root of [add(wrist, [0, 0, 0.035]), add(wrist, [0, 0, -0.035]), add(wrist, [sign * 0.035, 0, 0])] as Vec3[]) {
    const tip = add(root, scale([grasp[0] - root[0], grasp[1] - root[1], grasp[2] - root[2]], 0.66));
    out.push(rod(METAL, root, tip, 0.01, 3), rod(ORANGE, tip, grasp, 0.008, 3));
  }
  return out;
}

/** A jointed arm ending in a gripper. Each joint has a housing and a motor cap. */
export function limb(root: Vec3, joints: readonly Vec3[], grasp: Vec3): Piece[] {
  const out: Piece[] = [];
  let prev = root;
  for (const joint of joints) {
    const dir: Vec3 = [joint[0] - prev[0], joint[1] - prev[1], joint[2] - prev[2]];
    const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
    const u: Vec3 = [dir[0] / len, dir[1] / len, dir[2] / len];
    out.push(tube(WHITE, prev, joint, 0.02, 8), tube(METAL, add(joint, scale(u, -0.025)), add(joint, scale(u, 0.025)), 0.034, 8), discZ(ORANGE, joint[0], joint[1], joint[2] + 0.025, joint[2] + 0.045, 0.014, 5));
    prev = joint;
  }
  out.push(...jaw(root[0] < 0 ? -1 : 1, prev, grasp));
  return out;
}
