// Emiake's three dorsal radiator sails. The middle one stays up. The outer two swing down and out on a hinge along the ship's axis, and both states are drawn: the pin, the fold line and the actuators stay visible. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { cub, place, rod } from "./adapter.ts";
import { type ConceptSlot, radiatorFin } from "./common.ts";

/** Metres. The root is 30 m off the centreline, the same stand the first drawing used. */
const SAIL = { x: [-42, 0, 42] as const, z: 30, reach: 56, y0: 150, y1: 800, bays: 6, deploy: (115 * Math.PI) / 180 };

const rot = (x: number, z: number, px: number, pz: number, c: number, s: number): [number, number] => {
  const dx = x - px;
  const dz = z - pz;
  return [px + dx * c + dz * s, pz - dx * s + dz * c];
};

const turn = (p: Vec3, px: number, pz: number, c: number, s: number): Vec3 => {
  const [x, z] = rot(p[0], p[2], px, pz, c, s);
  return [x, p[1], z];
};

const turnDir = (p: Vec3, c: number, s: number): Vec3 => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];

/** Turn every piece about a hinge parallel to the ship's axis, through (px, pz). A lathe's axis stays parallel to Y. */
function foldAbout(pieces: readonly Piece[], px: number, pz: number, theta: number): Piece[] {
  if (theta === 0) return [...pieces];
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return pieces.map((piece): Piece => {
    const move = piece.move ? { ...piece.move, pivot: turn(piece.move.pivot, px, pz, c, s), axis: turnDir(piece.move.axis, c, s) } : undefined;
    const common = move ? { move } : {};
    if (piece.kind === "plate") return { ...piece, ...common, frame: { o: turn(piece.frame.o, px, pz, c, s), u: turnDir(piece.frame.u, c, s), v: turnDir(piece.frame.v, c, s), w: turnDir(piece.frame.w, c, s) } };
    if (piece.kind === "lines") return { ...piece, ...common, paths: piece.paths.map((path) => path.map((p) => turn(p, px, pz, c, s))) };
    const [ox, oz] = piece.at ?? [0, 0];
    const [nx, nz] = rot(ox, oz, px, pz, c, s);
    const lean = piece.lean ? ([piece.lean[0] * c + piece.lean[1] * s, -piece.lean[0] * s + piece.lean[1] * c] as const) : undefined;
    return { ...piece, ...common, at: [nx, nz], ...(lean ? { lean } : {}) };
  });
}

/** One sail, its pin and its actuators, in ship coordinates. `deployed` swings an outer sail down and out; the middle sail ignores it. */
export function sailPieces(x: number, deployed: boolean): Piece[] {
  const { z, reach, y0, y1, bays, deploy } = SAIL;
  const fin = place(radiatorFin(0, z, reach, y0, y1, bays, x < 0 ? 1 : x > 0 ? 2 : 3), { at: [x, 0, 0] });
  const theta = deployed && x !== 0 ? (x < 0 ? -deploy : deploy) : 0;
  const folded = foldAbout(fin, x, z, theta);
  const pin = rod("engine-metal", [x, y0, z], [x, y1, z], 1.15, 12);
  const foldLine = rod("hull-yellow", [x + 0.85, y0, z], [x + 0.85, y1, z], 0.28, 8);
  const cheeks: Piece[] = [];
  for (const y of [220, 400, 580, 740]) cheeks.push(cub("hull-grey", [x - 2.4, x + 2.4], [y, y + 10], [z - 3.4, z + 1.6]));
  const actuators: Piece[] = [];
  if (x !== 0) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    for (const y of [300, 640]) {
      const hull: Vec3 = [x + Math.sign(-x) * 8, y, z - 7];
      const tip = turn([x, y, z + 22], x, z, c, s);
      actuators.push(rod("hull-grey-dark", hull, tip, 0.55, 8), rod("copper", hull, [hull[0] + (tip[0] - hull[0]) * 0.55, y, hull[2] + (tip[2] - hull[2]) * 0.55], 0.95, 10));
    }
  }
  return [...folded, pin, foldLine, ...cheeks, ...actuators];
}

const local = (pieces: Piece[], y0: number, x = 0, z = 0): Piece[] => place(pieces, { at: [-x, -y0, -z] });

const SIDES = ["port", "centre", "starboard"] as const;

const slotOf = (side: (typeof SIDES)[number], deployed: boolean): ConceptSlot => {
  const i = SIDES.indexOf(side);
  const x = SAIL.x[i];
  const outer = side !== "centre";
  const state = outer && deployed ? "deployed, swung down and out" : "stowed, standing up";
  return {
    slot: `fin-${side}`,
    name: side === "centre" ? "Centre radiator sail" : `${side === "port" ? "Port" : "Starboard"} radiator sail`,
    kind: "arms",
    at: [x, SAIL.y0, 0],
    height: SAIL.y1 - SAIL.y0,
    diameter: deployed && outer ? 60 : side === "centre" ? 60 : 64,
    note: `A radiator sail on the dorsal ridge, ${state}. The hinge pin, the yellow fold line and the actuators are on the root. The outer two deploy; the middle stays up. Descends from the ISS radiator wings.`,
    pieces: () => local(sailPieces(x, deployed && outer), SAIL.y0, x, 0),
  };
};

/** The three sails stowed, which is how Emiake is drawn unless the deployed variant is chosen. */
export const SAIL_SLOTS: readonly ConceptSlot[] = SIDES.map((side) => slotOf(side, false));

/** The outer two sails deployed. Registered on their own so the deployed variant can point at them. */
export const SAIL_DEPLOYED_SLOTS: readonly ConceptSlot[] = [slotOf("port", true), slotOf("starboard", true)];
