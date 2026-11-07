// One template stood at many poses. The mesh keeps the template once and the poses as instance transforms, so a bolt circle is one draw. Expanding is for the line drawings and for anything that still wants a piece per copy.
import { deg } from "../framing.ts";
import type { Instances, Piece, Vec3 } from "./pieces.ts";

export interface StampPose {
  at: Vec3;
  /** Degrees about Y, from +Z towards +X. */
  yaw?: number;
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Pieces moved to a pose: turned about Y, then moved. A lathe keeps its axis. An instances piece keeps its template and composes the pose onto each copy. */
export function applyPose(pieces: readonly Piece[], pose: StampPose): Piece[] {
  const t = deg(pose.yaw ?? 0);
  const c = Math.cos(t);
  const s = Math.sin(t);
  const turn = (p: Vec3): Vec3 => [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  const at = (p: Vec3): Vec3 => add(turn(p), pose.at);
  return pieces.map((piece): Piece => {
    const move = piece.move ? { ...piece.move, pivot: at(piece.move.pivot), axis: turn(piece.move.axis) } : undefined;
    const common = move ? { move } : {};
    if (piece.kind === "instances") {
      return { ...piece, ...common, poses: piece.poses.map((inner) => ({ at: at(inner.at), yaw: (inner.yaw ?? 0) + (pose.yaw ?? 0) })) };
    }
    if (piece.kind === "plate") return { ...piece, ...common, frame: { o: at(piece.frame.o), u: turn(piece.frame.u), v: turn(piece.frame.v), w: turn(piece.frame.w) } };
    if (piece.kind === "lines") return { ...piece, ...common, paths: piece.paths.map((path) => path.map(at)) };
    const [ox, oz] = piece.at ?? [0, 0];
    const o = at([ox, 0, oz]);
    const dy = pose.at[1];
    const lean = piece.lean ? ([piece.lean[0] * c + piece.lean[1] * s, -piece.lean[0] * s + piece.lean[1] * c] as const) : undefined;
    const arc = piece.arc;
    return {
      ...piece,
      ...common,
      at: [o[0], o[2]],
      profile: piece.profile.map(([r, y]) => [r, y + dy] as const),
      ...(piece.rings ? { rings: piece.rings.map((y) => y + dy) } : {}),
      ...(piece.welds ? { welds: piece.welds.map((y) => y + dy) } : {}),
      ...(lean ? { lean } : {}),
      ...(arc ? { arc: (y: number) => [arc(y - dy)[0] + t, arc(y - dy)[1] + t] as const } : {}),
    };
  });
}

/** Every copy as its own piece. Drawings and counts use this. The mesh does not. */
export function expandInstances(pieces: readonly Piece[]): Exclude<Piece, Instances>[] {
  const out: Exclude<Piece, Instances>[] = [];
  const walk = (list: readonly Piece[]): void => {
    for (const piece of list) {
      if (piece.kind === "instances") for (const pose of piece.poses) walk(applyPose(piece.template, pose));
      else out.push(piece);
    }
  };
  walk(pieces);
  return out;
}
