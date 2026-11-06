// The joints a visiting craft is held by. Every ship uses these: a short docking port, a cradle on a deep truss, a berthing arm, and a tail-to-tail transfer coupling. A long reach is the truss, never one rod.
// The port is the kit's collar plus the IDA's petals and capture ring. Pure: no three.js and no DOM.
import type { Move, Piece, Vec3 } from "../pieces.ts";
import { COLLARS, collar, type CollarClass } from "./collars.ts";
import { aimCraft } from "./dockedAim.ts";
import { beam, box, hoop, lamps, post } from "./detail.ts";

/** English, then Japanese. The Japanese was checked on 2026-11-06. */
export const JOINT_NAMES = {
  port: ["Docking port", "ドッキングポート"],
  cradle: ["Berthing cradle", "係留受け台"],
  arm: ["Berthing arm", "係留アーム"],
  coupling: ["Transfer coupling", "移送継手"],
  lights: ["Approach lights", "接近灯"],
} as const;

/** How deep a reach is, in metres. A mount thinner than this is a rod. */
export const TRUSS_DEEP = 4;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const span = (length: number): number => Math.min(3, Math.max(1, length));

/**
 * An IDSS-style port: the kit's collar, three guide petals, a capture ring, hooks, a pressurised adapter of 1 to 3 m, approach lights, a cross target and a short camera.
 * `facing` +1 looks up and the adapter hangs below the face; -1 looks down and the adapter stands above the face.
 */
export function dockingPort(cls: CollarClass, length = 2, facing: 1 | -1 = 1): Piece[] {
  const L = span(length);
  const c = COLLARS[cls];
  const R = c.outer / 2;
  const r = c.bore / 2;
  const face = facing === 1 ? L : 0;
  const back = facing === 1 ? 0 : L;
  const out: Piece[] = [post("hull-white", [0, 0], r * 0.92, Math.min(face, back), R * 0.82, Math.max(face, back), 24, { body: true })];
  out.push(...collar(cls, face, facing));
  out.push(hoop("hazard", R * 0.9, face + facing * 0.08, Math.max(0.05, c.thick * 0.4), 28, 6));
  for (let i = 0; i < 3; i++) {
    const a = (2 * Math.PI * i) / 3 - Math.PI / 2;
    const px = Math.cos(a) * R * 0.72;
    const pz = Math.sin(a) * R * 0.72;
    const y = facing === 1 ? face : face - 0.55;
    out.push(box("panel-dark", [px, y, pz], R * 0.28, 0.1, 0.55, (a * 180) / Math.PI));
  }
  out.push(box("hull-white", [R + 0.04, face - facing * 0.4, 0], 0.05, 0.46, 0.46));
  out.push(box("black", [R + 0.08, face - facing * 0.4, 0], 0.02, 0.32, 0.05));
  out.push(box("black", [R + 0.08, face - facing * 0.4, 0], 0.02, 0.05, 0.32));
  out.push(beam("hull-grey", [R * 0.2, face - facing * 0.5, R], [R * 0.2, face - facing * 0.5, R + 0.7], 0.1, 0.1));
  out.push(box("hull-grey-dark", [R * 0.2, face - facing * 0.65, R + 0.75], 0.16, 0.14, 0.12));
  const yLight = face + facing * 0.02;
  out.push(...lamps([
    { at: [R * 0.75, yLight, 0], colour: "blue", size: 0.07 },
    { at: [-R * 0.4, yLight, R * 0.62], colour: "blue", size: 0.07 },
    { at: [-R * 0.4, yLight, -R * 0.62], colour: "blue", size: 0.07 },
  ]));
  return out;
}

/** The same port turned so its face sits on `at` and looks along `dir`. */
export function aimedPort(cls: CollarClass, length: number, at: readonly [number, number, number], dir: readonly [number, number, number]): Piece[] {
  const L = span(length);
  return aimCraft(dockingPort(cls, L, 1), L, at, dir);
}

/** Four chords and a bay of braces. `depth` is the section, at least 3 m. A reach of any length is this, not a rod. */
export function deepTruss(a: Vec3, b: Vec3, depth = TRUSS_DEEP): Piece[] {
  const run = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  if (run < 0.5) return [];
  const deep = Math.max(3, depth);
  const w = unit(sub(b, a));
  const seed: Vec3 = Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = unit(cross(seed, w));
  const v = cross(w, u);
  const h = deep / 2;
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]] as const;
  const corner = (p: Vec3, su: number, sv: number): Vec3 => add(p, add(mul(u, su * h), mul(v, sv * h)));
  const out: Piece[] = [];
  for (const [su, sv] of corners) out.push(beam("hull-grey-dark", corner(a, su, sv), corner(b, su, sv), 0.35, 0.35));
  const bays = Math.max(1, Math.round(run / deep));
  for (let i = 0; i <= bays; i++) {
    const p = add(a, mul(sub(b, a), i / bays));
    for (let k = 0; k < 4; k++) {
      const [su, sv] = corners[k];
      const [tu, tv] = corners[(k + 1) % 4];
      out.push(beam("hull-grey", corner(p, su, sv), corner(p, tu, tv), 0.22, 0.22));
    }
    if (i < bays) {
      const q = add(a, mul(sub(b, a), (i + 1) / bays));
      out.push(beam("hull-grey", corner(p, 1, 1), corner(q, 1, -1), 0.18, 0.18));
      out.push(beam("hull-grey", corner(p, -1, 1), corner(q, -1, -1), 0.18, 0.18));
    }
  }
  return out;
}

/** Saddle pads and two latches on the face the craft sits against. `outward` is +1 when the craft is at greater x. */
export function berthCradle(at: Vec3, outward: 1 | -1): Piece[] {
  const face = at[0] + outward * 0.15;
  const y = at[1];
  const z = at[2];
  return [
    box("hull-grey", [face, y - 0.3, z - 3], 0.4, 1.4, 0.6),
    box("hull-grey", [face, y - 0.3, z + 3], 0.4, 1.4, 0.6),
    box("engine-metal", [face, y - 0.15, z], 0.28, 7.2, 0.3),
    box("panel-dark", [face + outward * 0.15, y - 0.2, z - 2.2], 0.22, 0.4, 0.55),
    box("panel-dark", [face + outward * 0.15, y - 0.2, z + 2.2], 0.22, 0.4, 0.55),
  ];
}

const ARM: readonly Vec3[] = [
  [0, 0, 0],
  [2.4, 0.6, 0.2],
  [5.6, 1.2, 0.5],
  [9.4, 0.7, 0.9],
  [13.2, 0.15, 1.1],
  [16.6, -0.25, 0.8],
  [19.8, -0.45, 0.4],
  [22.6, -0.5, 0],
];

const moved = (piece: Piece, name: string, pivot: Vec3): Piece => {
  const move: Move = { name, pivot, axis: [0, 1, 0] };
  return { ...piece, move };
};

/** A latching end effector facing +X: a ring, three cams and a camera on the wrist. */
function effector(at: Vec3): Piece[] {
  const out: Piece[] = [];
  const R = 0.55;
  for (let i = 0; i < 10; i++) {
    const a = (2 * Math.PI * i) / 10;
    out.push(box("hull-grey", [at[0] - 0.08, at[1] + Math.sin(a) * R - 0.08, at[2] + Math.cos(a) * R], 0.16, 0.18, 0.16));
  }
  for (let i = 0; i < 3; i++) {
    const a = (2 * Math.PI * i) / 3;
    out.push(box("panel-dark", [at[0], at[1] + Math.sin(a) * R * 0.55 - 0.06, at[2] + Math.cos(a) * R * 0.55], 0.2, 0.18, 0.12));
  }
  out.push(box("hull-white", [at[0] - 0.05, at[1] + R, at[2]], 0.2, 0.26, 0.18));
  return out;
}

/** Seven jointed segments and an end effector, at rest reaching along +X. Each joint is a Move group, so a flight can turn it. */
export function berthArm(): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < ARM.length - 1; i++) {
    const a = ARM[i];
    const b = ARM[i + 1];
    const name = `berth-arm-${i + 1}`;
    out.push(moved(beam("hull-white", a, b, 0.55, 0.45), name, a));
    out.push(moved(box("hull-grey-dark", [a[0] - 0.2, a[1] - 0.35, a[2]], 0.7, 0.7, 0.7), name, a));
  }
  const tip = ARM[ARM.length - 1];
  for (const piece of effector(tip)) out.push(moved(piece, "berth-arm-7", ARM[6]));
  return out;
}

/** Methane and oxygen plates, a short frame and umbilicals under 2 m. The tail of the visiting ship meets this. */
export function transferCoupling(): Piece[] {
  return [
    beam("hull-grey-dark", [-1.3, 0.5, -1.1], [1.3, 0.5, -1.1], 0.22, 0.22),
    beam("hull-grey-dark", [-1.3, 0.5, 1.1], [1.3, 0.5, 1.1], 0.22, 0.22),
    beam("hull-grey-dark", [-1.3, 0.5, -1.1], [-1.3, 0.5, 1.1], 0.22, 0.22),
    beam("hull-grey-dark", [1.3, 0.5, -1.1], [1.3, 0.5, 1.1], 0.22, 0.22),
    box("hull-orange", [0.55, 0.15, 0], 0.85, 0.85, 0.16),
    box("hull-white", [-0.55, 0.7, 0], 0.85, 0.85, 0.16),
    beam("copper", [0.55, 0.31, 0], [0.55, 0.7, 0.55], 0.12, 0.12),
    beam("hull-white", [-0.55, 0.31, 0], [-0.55, 0.7, -0.55], 0.12, 0.12),
  ];
}
