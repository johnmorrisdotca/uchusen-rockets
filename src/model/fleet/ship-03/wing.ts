// Miyamoto's bird-wing solar array, one wing each side of the habitation drum, dorsal of the glass elevator.
// The spar is a shoulder, an elbow and a wrist. Feathers overlap along it, longest at the tip, and fan into a curved trailing edge as the wing opens.
// Folded, they stack into a slim bundle along the hull. The folded wing is tagged so the viewer can swing it out about the shoulder; the half and open poses are drawn already there.
// The mechanism follows a bird's wing and the folding wings of the F4F, the F6F and the E-2: panels that lie over one another, not a scaled-up blanket. Pure: no three.js and no DOM.
import { moving } from "../motion.ts";
import { cub, ibeam, quad, rod, type Piece, type Vec3 } from "./adapter.ts";
import { ELEVATOR } from "./dims.ts";

export const WING_POSES = ["folded", "half", "open"] as const;
export type WingPose = (typeof WING_POSES)[number];

const Z = 11;
const SHOULDER_X = 20;
const SHOULDER_Y = 276;
const UPPER = 15;
const FORE = 13;
const HAND = 11;

const poseOf = (pose: WingPose): number => (pose === "folded" ? 0 : pose === "half" ? 0.32 : 1);

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 0 points outboard, 90 points aft. */
const dirOf = (heading: number, sign: 1 | -1): Vec3 => {
  const a = (heading * Math.PI) / 180;
  return [sign * Math.cos(a), -Math.sin(a), 0];
};

const step = (from: Vec3, dir: Vec3, length: number): Vec3 => [from[0] + dir[0] * length, from[1] + dir[1] * length, from[2]];

const mix = (along: Vec3, fan: number): Vec3 => {
  const v: Vec3 = [along[0] * (1 - fan), along[1] * (1 - fan) - fan, 0];
  const length = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / length, v[1] / length, 0];
};

/** One feather: a frame, a kapton backing and gold cells, lying in the wing's plane. */
function feather(root: Vec3, dir: Vec3, length: number, width: number, cells: number): Piece[] {
  const side: Vec3 = [-dir[1], dir[0], 0];
  const at = (u: number, s: number): Vec3 => {
    const w = width * (0.55 - 0.2 * u);
    return [root[0] + dir[0] * length * u + side[0] * s * w, root[1] + dir[1] * length * u + side[1] * s * w, Z];
  };
  const out: Piece[] = [quad("hull-grey", at(0, -1), at(0, 1), at(1, 1), at(1, -1), 0.16), quad("kapton", at(0.04, -0.82), at(0.04, 0.82), at(0.96, 0.82), at(0.96, -0.82), 0.08)];
  out.push(rod("pipe-steel", at(0.02, -0.9), at(0.98, -0.9), 0.04, 6), rod("pipe-steel", at(0.02, 0.9), at(0.98, 0.9), 0.04, 6), rod("coil", at(0.1, 0), at(0.9, 0), 0.05, 6));
  for (let i = 0; i < cells; i++) {
    const u0 = 0.08 + (0.84 * i) / cells;
    const u1 = 0.08 + (0.84 * (i + 1)) / cells - 0.02;
    out.push(quad("gold", at(u0, -0.62), at(u0, 0.62), at(u1, 0.62), at(u1, -0.62), 0.05));
    out.push(cub("hull-grey-dark", [at(u0, 0)[0] - 0.08, at(u0, 0)[0] + 0.08], [at(u0, 0)[1] - 0.08, at(u0, 0)[1] + 0.08], [Z, Z + 0.12]));
  }
  return out;
}

/** Feathers along a spar, overlapping, longer toward the tip, trailing more as the wing opens. */
function feathers(from: Vec3, to: Vec3, count: number, t: number, tip: number, cells: number): Piece[] {
  const delta: Vec3 = [to[0] - from[0], to[1] - from[1], 0];
  const span = Math.hypot(delta[0], delta[1]) || 1;
  const along: Vec3 = [delta[0] / span, delta[1] / span, 0];
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const u = 0.15 + (0.75 * i) / Math.max(1, count - 1);
    const root: Vec3 = [from[0] + delta[0] * u, from[1] + delta[1] * u, Z];
    const alongTip = tip + (1 - tip) * (i / Math.max(1, count - 1));
    const fan = t * (0.25 + 0.7 * alongTip);
    const length = lerp(14, 36, alongTip);
    // Folded, the feathers stack into a slim bundle. Open, each one is a broad panel.
    const width = lerp(3.5, 14, t * t);
    out.push(...feather(root, mix(along, fan), length, width, cells));
  }
  return out;
}

const lamp = (at: Vec3, material: "lamp-amber" | "lamp-red"): Piece => rod(material, at, [at[0], at[1], at[2] + 0.7], 0.18, 8);

/** One wing. The socket stays on the hull; the rest swings about the shoulder when the pose is folded. */
function wing(sign: 1 | -1, t: number, cells: number): Piece[] {
  const shoulder: Vec3 = [sign * SHOULDER_X, SHOULDER_Y, Z];
  const headings = [lerp(74, 8, t), lerp(82, 16, t), lerp(88, 22, t)];
  const upper = dirOf(headings[0], sign);
  const fore = dirOf(headings[1], sign);
  const hand = dirOf(headings[2], sign);
  const elbow = step(shoulder, upper, UPPER);
  const wrist = step(elbow, fore, FORE);
  const tip = step(wrist, hand, HAND);
  const socket: Piece[] = [
    ...ibeam("hull-grey", [sign * (ELEVATOR.x[1] + 0.8), SHOULDER_Y, Z], shoulder, 0.7, 0.45, [0, 0, 1]),
    cub("hull-grey-dark", [shoulder[0] - 0.9, shoulder[0] + 0.9], [shoulder[1] - 0.9, shoulder[1] + 0.9], [Z - 0.5, Z + 0.5]),
    lamp(shoulder, "lamp-amber"),
  ];
  const limb: Piece[] = [
    ...ibeam("hull-grey", shoulder, elbow, 0.55, 0.35, [0, 0, 1]),
    ...ibeam("hull-grey", elbow, wrist, 0.48, 0.32, [0, 0, 1]),
    ...ibeam("hull-grey", wrist, tip, 0.4, 0.28, [0, 0, 1]),
    cub("hull-grey-dark", [elbow[0] - 0.55, elbow[0] + 0.55], [elbow[1] - 0.55, elbow[1] + 0.55], [Z - 0.4, Z + 0.4]),
    cub("hull-grey-dark", [wrist[0] - 0.45, wrist[0] + 0.45], [wrist[1] - 0.45, wrist[1] + 0.45], [Z - 0.35, Z + 0.35]),
    lamp(elbow, "lamp-amber"),
    lamp(wrist, "lamp-amber"),
    lamp(tip, "lamp-red"),
    rod("copper", shoulder, tip, 0.06, 6),
    cub("hull-yellow", [elbow[0] - 0.7, elbow[0] + 0.7], [elbow[1] - 0.12, elbow[1] + 0.12], [Z + 0.35, Z + 0.48]),
    cub("hull-yellow", [wrist[0] - 0.6, wrist[0] + 0.6], [wrist[1] - 0.1, wrist[1] + 0.1], [Z + 0.3, Z + 0.42]),
    ...[0.2, 0.45, 0.7].flatMap((u) => {
      const at: Vec3 = [shoulder[0] + (elbow[0] - shoulder[0]) * u, shoulder[1] + (elbow[1] - shoulder[1]) * u, Z];
      return [cub("hull-grey-dark", [at[0] - 0.12, at[0] + 0.12], [at[1] - 0.12, at[1] + 0.12], [Z + 0.2, Z + 0.38])];
    }),
    ...feathers(elbow, wrist, 4, t, 0.35, cells),
    ...feathers(wrist, tip, 4, t, 1, cells),
  ];
  const posed = t === 0 ? moving(limb, { name: `wing-deploy-${sign > 0 ? "starboard" : "port"}`, pivot: shoulder, axis: [0, 0, sign] }) : limb;
  return [...socket, ...posed];
}

/**
 * Both wings, in ship metres. `folded` lies along the hull, `half` is between, `open` is spread.
 *
 * @param pose Which picture of the fold.
 * @param detail Below 0.6, each feather keeps one cell.
 */
export function birdWing(pose: WingPose, detail = 1): Piece[] {
  const cells = detail < 0.6 ? 2 : 4;
  const t = poseOf(pose);
  return [...wing(1, t, cells), ...wing(-1, t, cells)];
}
