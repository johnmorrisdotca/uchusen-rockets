// Three legs under the saucer. Tucked, they stay by the rim. Planted, they reach down and out. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../../pieces.ts";
import { cyl } from "./shapes.ts";

/** The legs for a tuck of 0 to a plant of 1. */
export function legPieces(legs: number): Piece[] {
  const t = Math.min(1, Math.max(0, legs));
  const drop = 0.04 + 0.18 * t;
  const out: Piece[] = [];
  for (let i = 0; i < 3; i += 1) {
    const a = (i * 120 * Math.PI) / 180;
    const x = Math.cos(a) * 0.22;
    const z = Math.sin(a) * 0.22;
    const top: Vec3 = [x, 0.02, z];
    const foot: Vec3 = [x * (1 + t), -drop, z * (1 + t)];
    out.push(cyl("hull-grey", top, foot, 0.012, 8));
  }
  return out;
}
