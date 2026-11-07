// Turning a group of pieces about a pivot: for the drawing, which draws the pieces again where a flight has turned them (the 3D view turns a node instead). Pure: no three.js and no DOM.
import type { Frame, Move, Piece, Vec3 } from "./pieces.ts";

const unit = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

/** A direction turned by `degrees` right-handed about `axis` (Rodrigues' rotation). */
export function turnedVector(v: Vec3, axis: Vec3, degrees: number): Vec3 {
  const k = unit(axis);
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cross: Vec3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return [v[0] * cos + cross[0] * sin + k[0] * dot * (1 - cos), v[1] * cos + cross[1] * sin + k[1] * dot * (1 - cos), v[2] * cos + cross[2] * sin + k[2] * dot * (1 - cos)];
}

/** A point turned about a pivot. */
export function turnedPoint(p: Vec3, pivot: Vec3, axis: Vec3, degrees: number): Vec3 {
  const d = turnedVector([p[0] - pivot[0], p[1] - pivot[1], p[2] - pivot[2]], axis, degrees);
  return [pivot[0] + d[0], pivot[1] + d[1], pivot[2] + d[2]];
}

const turnedFrame = (f: Frame, move: Move, degrees: number): Frame => ({
  o: turnedPoint(f.o, move.pivot, move.axis, degrees),
  u: turnedVector(f.u, move.axis, degrees),
  v: turnedVector(f.v, move.axis, degrees),
  w: turnedVector(f.w, move.axis, degrees),
});

/**
 * The pieces with each moving group turned by the angle its name has in `angles` (degrees, 0 where it has none). A turned piece no longer carries its `move`: it is drawn where it stands. A body of revolution cannot turn, and is left as it is.
 *
 * @param pieces The pieces of a part.
 * @param angles Degrees by the name of a moving group, such as `grid-fins`.
 * @returns The pieces, with the moving groups turned.
 * @example
 * ```ts
 * import { build } from "@johnmorrisdotca/uchusen-rockets/build";
 * import { movingGroupsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const booster = build({ rocket: "starship", variant: "v3" }).parts[0];
 * console.log(booster ? movingGroupsOf(booster.pieces) : []);
 * ```
 */
export function moved(pieces: readonly Piece[], angles: Readonly<Record<string, number>>): readonly Piece[] {
  if (!pieces.some((piece) => piece.move && angles[piece.move.name])) return pieces;
  return pieces.map((piece) => {
    const move = piece.move;
    const degrees = move ? (angles[move.name] ?? 0) : 0;
    if (!move || degrees === 0 || piece.kind === "lathe" || piece.kind === "instances") return piece;
    if (piece.kind === "plate") return { ...piece, move: undefined, frame: turnedFrame(piece.frame, move, degrees) };
    return { ...piece, move: undefined, paths: piece.paths.map((path) => path.map((p) => turnedPoint(p, move.pivot, move.axis, degrees))) };
  });
}

/**
 * The names of the groups a part has that a flight can turn.
 *
 * @param pieces The pieces of a part.
 * @returns The distinct names, in the order they come.
 * @example
 * ```ts
 * import { build } from "@johnmorrisdotca/uchusen-rockets/build";
 * import { movingGroupsOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const stage = build({ rocket: "falcon-9", variant: "block-5" }).parts[0];
 * console.log(stage ? movingGroupsOf(stage.pieces) : []);
 * ```
 */
export function movingGroupsOf(pieces: readonly Piece[]): string[] {
  return [...new Set(pieces.flatMap((piece) => (piece.move ? [piece.move.name] : [])))];
}
