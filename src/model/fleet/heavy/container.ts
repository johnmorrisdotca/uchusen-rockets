// The heavy cargo container: a corrugated box with corner castings, a door end with lock rods, and, up close, conduits, a recessed panel, a vent, a power receptacle and lifting eyes on each outward face. It is the container ISV Kaminari (SPX-207)
// carries, 22 m by 22 m by 40 m, drawn here from its size in metres so any ship can ask for another: every small feature is the reference feature (the 22 m box's) times `across / 22`, and the counts of ribs scale with it, so a bigger box has bigger and
// more fittings and a smaller one fewer, never a stretched mesh. At the reference size every number is the one Kaminari had. Pure: no three.js and no DOM.
import { box, facesOf, onFace, pipeOn, stencil, vent, type MaterialName, type Piece, type Rng } from "../solids.ts";

/** The box the numbers below were drawn for, in metres. */
export const CONTAINER_REF = { across: 22, long: 40 } as const;

/** The widest and longest a heavy container may be, in metres: its width 15 to 60 and its length 15 to 200. Narrower boxes are the kit's standard containers. */
export const CONTAINER_LIMITS = { across: [15, 60], long: [15, 200] } as const;

/** The body colours of a container: white and grey, with the odd cream. */
export const CONTAINER_LIVERY: readonly MaterialName[] = ["hull-white", "hull-white", "hull-white", "hull-white", "hull-grey", "hull-white-worn", "hull-white-worn", "hull-grey"];

/** Throws a RangeError naming the limit when a size is outside what a heavy container can be. */
export function checkContainer(across: number, long: number): void {
  if (!(across >= CONTAINER_LIMITS.across[0] && across <= CONTAINER_LIMITS.across[1])) throw new RangeError(`A heavy container is ${CONTAINER_LIMITS.across[0]} to ${CONTAINER_LIMITS.across[1]} m across, not ${across}.`);
  if (!(long >= CONTAINER_LIMITS.long[0] && long <= CONTAINER_LIMITS.long[1])) throw new RangeError(`A heavy container is ${CONTAINER_LIMITS.long[0]} to ${CONTAINER_LIMITS.long[1]} m long, not ${long}.`);
}

/**
 * One heavy container's pieces, its centre at `at`. `ox` and `oz` are the directions that face outward from the spine, so those faces get the detail; `r` is the seeded generator, shared by the boxes of a cell so each looks its own.
 * `fine` leaves out the small fittings on the faces, for the coarse level.
 */
export function containerPieces(size: { across: number; long: number }, at: readonly [number, number, number], ox: 1 | -1, oz: 1 | -1, r: Rng, id: string, band: MaterialName, fine = true): Piece[] {
  checkContainer(size.across, size.long);
  const [cx, cy, cz] = at;
  const s = size.across / CONTAINER_REF.across;
  const k = (v: number): number => v * s;
  const out: Piece[] = [];
  const w = size.across - k(0.4);
  const l = size.long - 0.8 * (size.long / CONTAINER_REF.long);
  const base = r.pick(CONTAINER_LIVERY);
  out.push(box(base, [cx, cy, cz], [w, l, w], false));
  // corner castings
  const cast = k(2.2);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) out.push(box("dark", [cx + (sx * (w - k(2))) / 2, cy + (sy * (l - k(2))) / 2, cz + (sz * (w - k(2))) / 2], [cast, cast, cast]));
  const fx = facesOf([cx, cy, cz], [w, l, w], [ox > 0 ? "x+" : "x-", oz > 0 ? "z+" : "z-", "y-", "y+"]);
  // corrugation on the two outward long faces: ribs across the width
  for (const f of fx.slice(0, 2)) {
    const n = Math.max(3, Math.round(9 * s));
    for (let i = 0; i < n; i++) out.push(onFace(i % 2 ? "dark" : base, f, 0, -f.b + k(3) + ((i + 0.5) * (2 * f.b - k(6))) / n, f.a * 2 - k(4.4), k(1.2), k(0.6), k(0.02)));
    out.push(onFace(band, f, 0, f.b * 0.55, f.a * 2 - k(3), k(4.2), k(0.35), k(0.65)));
    if (r.chance(0.5)) out.push(onFace("hull-orange-worn", f, r.range(-f.a * 0.5, f.a * 0.5), r.range(-f.b * 0.5, f.b * 0.5), r.range(k(3), k(7)), r.range(k(3), k(9)), k(0.2), k(0.7)));
  }
  out.push(...stencil(fx[0], id, 0, -fx[0].b * 0.3, k(2.8), "hull-white", k(0.7)));
  // up close: on each outward face a pair of conduits with clamps, a recessed panel with a bolted border, a vent grille, a power receptacle with its yellow cap and a pair of lifting eyes
  for (const f of fine ? fx.slice(0, 2) : []) {
    for (const ta of [-f.a * 0.62, f.a * 0.62]) {
      out.push(...pipeOn(f, ta, -f.b + k(3), ta, f.b - k(3), k(0.38), "coolant", k(6), k(0.5)));
      for (let j = -3; j <= 3; j++) out.push(onFace("black", f, ta, j * (f.b * 0.28), k(1.5), k(0.9), k(1.0), k(1.0)));
    }
    out.push(onFace("dark", f, 0, -f.b * 0.35, f.a * 0.7, f.b * 0.28, k(0.5), k(0.9)), onFace("engine-metal", f, 0, -f.b * 0.35, f.a * 0.72, k(0.25), k(0.7), k(0.9)), onFace("engine-metal", f, 0, -f.b * 0.35 - f.b * 0.14, f.a * 0.72, k(0.25), k(0.7), k(0.9)), onFace("engine-metal", f, 0, -f.b * 0.35 + f.b * 0.14, f.a * 0.72, k(0.25), k(0.7), k(0.9)));
    for (let j = 0; j < 6; j++) out.push(onFace("black", f, -f.a * 0.3 + j * f.a * 0.12, -f.b * 0.35 + f.b * 0.14, k(0.4), k(0.4), k(0.9), k(0.9)), onFace("black", f, -f.a * 0.3 + j * f.a * 0.12, -f.b * 0.35 - f.b * 0.14, k(0.4), k(0.4), k(0.9), k(0.9)));
    out.push(...vent(f, f.a * 0.3, f.b * 0.1, f.a * 0.45, k(2.6), 4, k(0.9)));
    out.push(onFace("dark", f, -f.a * 0.3, f.b * 0.1, k(2.6), k(2.6), k(1.0), k(0.9)), onFace("hull-yellow", f, -f.a * 0.3, f.b * 0.1, k(1.6), k(1.6), k(0.5), k(1.8)), onFace("engine-metal", f, -f.a * 0.3, f.b * 0.1 + k(1.9), k(2.8), k(0.5), k(0.8), k(0.9)));
    for (const sa of [-1, 1]) out.push(onFace("engine-metal", f, sa * (f.a - k(1.8)), f.b - k(1.8), k(1.2), k(1.2), k(1.1), k(1.0)), onFace("black", f, sa * (f.a - k(1.8)), f.b - k(1.8), k(0.6), k(0.6), k(1.4), k(1.0)));
  }
  // the door end: two leaves, four lock rods and their cams, hinges
  const door = fx[2];
  out.push(onFace("dark", door, -door.a / 2, 0, door.a - k(0.6), door.b * 2 - k(2), k(0.5), k(0.02)), onFace("dark", door, door.a / 2, 0, door.a - k(0.6), door.b * 2 - k(2), k(0.5), k(0.02)));
  for (const q of [-8, -3, 3, 8]) out.push(onFace("engine-metal", door, k(q), 0, k(0.5), door.b * 2 - k(3), k(0.7), k(0.4)), onFace("hull-yellow", door, k(q), -door.b + k(4), k(1.1), k(1.1), k(0.9), k(0.4)));
  out.push(onFace("hull-yellow", fx[3], 0, 0, k(5), k(5), k(0.3), k(0.05)));
  return out;
}
