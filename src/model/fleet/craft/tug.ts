// The cargo tug: a square-truss keel with a class L collar at the nose that mates a container's end frame, two propellant tanks on saddles, a thruster block at the tail, two grapple arms folded along the truss
// and two radiator panels. Its axis is Y with the nose up (+Y). Metres. Pure: no three.js and no DOM.
import { collar } from "../collars.ts";
import { cub, grabHandle, navLight, patch, pipeRun, ringOf, rod, stamp, strut } from "../detail.ts";
import { cyl, revolve } from "../solids.ts";
import type { Piece } from "../../pieces.ts";
import { thrusterQuad } from "./fittings.ts";

/** The tug's own sizes, metres: the keel's half-width, where the truss stands, the tanks' radius and the nose face the collar sits on. */
export const TUG = { keel: 2, truss: [2, 16], tank: 2.3, nose: 18, arm: { reach: 12, segments: 3 } } as const;

/** One arm folded along the keel: shoulder and elbow joints as round housings, three round segments, and a two-finger gripper at the end. `side` is -1 or +1. */
function arm(side: -1 | 1): Piece[] {
  const x = side * (TUG.keel + 0.9);
  const joints: [number, number, number][] = [[x, 15.2, 0], [x + side * 1.6, 12.6, 0.9], [x + side * 1.6, 8.4, 1.1], [x + side * 1.2, 6.4, 0.6]];
  const out: Piece[] = [];
  joints.forEach((j, i) => {
    out.push(cyl("hull-grey-dark", [j[0], j[2]], 0.5, j[1] - 0.45, j[1] + 0.45, 18), cyl("hull-yellow", [j[0], j[2]], 0.52, j[1] - 0.12, j[1] + 0.12, 18));
    const next = joints[i + 1];
    if (next) out.push(rod("hull-white", j, next, 0.3, 16), rod("hull-grey", [j[0], j[1], j[2]], [(j[0] + next[0]) / 2, (j[1] + next[1]) / 2, (j[2] + next[2]) / 2], 0.34, 16), ...pipeRun([[j[0] + 0.32, j[1], j[2]], [next[0] + 0.32, next[1], next[2]]], 0.04, "coolant", { ends: ["cap", "cap"] }));
  });
  const end = joints[joints.length - 1];
  out.push(cub("hull-grey-dark", [end[0] - 0.3, end[0] + 0.3], [end[1] - 1.0, end[1] - 0.4], [end[2] - 0.3, end[2] + 0.3]), rod("hull-grey", [end[0] - 0.3, end[1] - 1.0, end[2]], [end[0] - 0.3, end[1] - 1.6, end[2]], 0.08, 8), rod("hull-grey", [end[0] + 0.3, end[1] - 1.0, end[2]], [end[0] + 0.3, end[1] - 1.6, end[2]], 0.08, 8));
  return out;
}

/** The keel: four round chords, square frames every 2 m and round diagonals between them, with a handrail along the top. */
function keel(): Piece[] {
  const [y0, y1] = TUG.truss;
  const h = TUG.keel;
  const out: Piece[] = [];
  for (const x of [-h, h]) for (const z of [-h, h]) out.push(rod("hull-white", [x, y0, z], [x, y1, z], 0.2, 14));
  for (let y = y0; y <= y1; y += 2) {
    for (const [a, b] of [[[-h, -h], [h, -h]], [[h, -h], [h, h]], [[h, h], [-h, h]], [[-h, h], [-h, -h]]] as const) out.push(rod("hull-grey", [a[0], y, a[1]], [b[0], y, b[1]], 0.1, 10));
    if (y < y1) out.push(...strut("hull-grey-dark", [-h, y, h], [h, y + 2, h], 0.07, 10), ...strut("hull-grey-dark", [h, y, -h], [-h, y + 2, -h], 0.07, 10));
  }
  out.push(...pipeRun([[0, y0, h + 0.5], [0, y1, h + 0.5]], 0.05, "hull-yellow", { ends: ["cap", "cap"] }));
  return out;
}

/** A propellant tank on the keel's side: a cylinder with domed ends, two saddle straps and a feed line to the thruster block. */
function tank(side: -1 | 1): Piece[] {
  const x = side * (TUG.keel + TUG.tank + 0.6);
  const r = TUG.tank;
  const out: Piece[] = [revolve("hull-white", [x, 0], [[0.001, 4.2], [r * 0.7, 4.5], [r, 5.4], [r, 12.4], [r * 0.7, 13.3], [0.001, 13.6]], 36, { body: true, outline: true })];
  for (const y of [6.2, 11.6]) out.push(cyl("hull-grey-dark", [x, 0], r + 0.06, y - 0.15, y + 0.15, 36), cub("hull-grey", [side * (TUG.keel + 0.1), side * (TUG.keel + 0.6)].sort((a, b) => a - b) as [number, number], [y - 0.3, y + 0.3], [-0.5, 0.5]));
  out.push(...pipeRun([[x, 4.3, 0], [x, 2.6, 0], [side * 0.9, 2.2, 0]], 0.1, "coolant"));
  return out;
}

/**
 * The tug's pieces.
 *
 * @example
 * ```ts
 * import { tugPieces } from "./tug.ts";
 *
 * console.log(tugPieces().length > 100);
 * ```
 */
export function tugPieces(): Piece[] {
  const out: Piece[] = [...keel(), ...arm(-1), ...arm(1), ...tank(-1), ...tank(1)];
  // the nose: a ring of square frame and the L collar a container's end frame takes
  out.push(cub("hull-grey", [-TUG.keel - 0.3, TUG.keel + 0.3], [16, 17.2], [-TUG.keel - 0.3, TUG.keel + 0.3]), ...collar("L", TUG.nose, 1));
  for (const x of [-1, 1]) for (const z of [-1, 1]) out.push(...strut("hull-grey-dark", [x * TUG.keel, 17.2, z * TUG.keel], [x * 3.6, TUG.nose - 0.3, z * 3.6], 0.12, 10));
  // the tail: a thrust plate with four engines and four quads
  out.push(cyl("hull-grey-dark", [0, 0], 3.2, 1.6, 2.0, 32), ...[[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].flatMap(([x, z]) => [revolve("engine-metal", [x, z], [[0.35, 1.6], [0.5, 1.2], [0.95, -0.2]], 16, { outline: true }), revolve("bell-inside", [x, z], [[0.3, 1.6], [0.45, 1.2], [0.9, -0.2]], 16)]));
  for (const x of [-1, 1]) for (const z of [-1, 1]) out.push(rod("hull-grey-dark", [x * TUG.keel, 2, z * TUG.keel], [x * 1.3, 1.6, z * 1.3], 0.12, 8));
  out.push(...stamp(thrusterQuad(), ringOf(4, 3.2, 2.5, 45)));
  // two radiator panels on booms, a handrail and lamps
  for (const z of [-1, 1]) out.push(cub("radiator", [-1.6, 1.6], [7, 13], [z * 3.05, z * 3.12]), rod("hull-grey", [0, 7, z * TUG.keel], [0, 7, z * 3.05], 0.07, 8), rod("hull-grey", [0, 13, z * TUG.keel], [0, 13, z * 3.05], 0.07, 8));
  out.push(...grabHandle(patch(TUG.keel, 0, 9), 0, 9, 1.4, 0.03), ...navLight("port", 3, 4.7, 15.5), ...navLight("starboard", 3, 1.57, 15.5));
  return out;
}
