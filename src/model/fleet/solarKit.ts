// Three solar kits that stand in the chute's place: a blanket on a lattice mast, one roll-out blanket, and a square sail.
// Each faces +Z at rest and is tagged so the viewer can turn that face toward the Sun. Pure: no three.js and no DOM.
import type { Piece, Vec3 } from "../pieces.ts";
import { quad } from "./detail.ts";
import { moving } from "./motion.ts";
import { pipe } from "./solids.ts";

export const SOLAR_KITS = ["blanket", "rollout", "sail"] as const;
export type SolarKit = (typeof SOLAR_KITS)[number];

const TRACK = { name: "kit-track", pivot: [0, 0, 0] as Vec3, axis: [0, 1, 0] as Vec3, face: [0, 0, 1] as Vec3 };

const sheet = (material: "kapton" | "gold", x0: number, x1: number, y0: number, y1: number, z: number, thick: number): Piece =>
  quad(material, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], thick);

/** A lattice mast along +X with one gold blanket each side of it. */
function blanket(radius: number): Piece[] {
  const mast = radius;
  const wide = radius * 0.26;
  const out: Piece[] = [];
  for (const z of [-0.35, 0, 0.35]) out.push(pipe(z === 0 ? "hull-grey" : "hull-grey-dark", [1.2, 0, z], [mast, 0, z], z === 0 ? 0.22 : 0.14, 8));
  for (let i = 0; i < 4; i++) {
    const x = 4 + (i * (mast - 8)) / 3;
    out.push(pipe("hull-grey-dark", [x, 0, -0.35], [x, 0, 0.35], 0.1, 6));
  }
  for (const s of [-1, 1] as const) {
    const inner = s * 0.8;
    const outer = s * (0.8 + wide);
    const y0 = Math.min(inner, outer);
    const y1 = Math.max(inner, outer);
    out.push(sheet("kapton", 2, mast - 0.4, y0, y1, 0.02, 0.06));
    const cell0 = s * 1.3;
    const cell1 = s * (0.4 + wide);
    const c0 = Math.min(cell0, cell1);
    const c1 = Math.max(cell0, cell1);
    out.push(sheet("gold", 3, mast * 0.48, c0, c1, 0.1, 0.04));
    out.push(sheet("gold", mast * 0.52, mast - 1.2, c0, c1, 0.1, 0.04));
  }
  out.push(pipe("lamp-red", [mast, 0, 0], [mast + 0.8, 0, 0], 0.16, 8));
  out.push(pipe("copper", [2.4, 0, 0.45], [mast - 1, 0, 0.45], 0.04, 6));
  return out;
}

/** A canister at the root and one unrolled blanket. */
function rollout(radius: number): Piece[] {
  const len = radius;
  const half = radius * 0.16;
  return [
    pipe("hull-grey", [0.2, 0, 0], [3.2, 0, 0], 1.1, 12),
    pipe("hull-grey-dark", [3.2, 0, 0], [3.6, 0, 0], 0.7, 10),
    sheet("kapton", 3.6, len, -half, half, 0.02, 0.06),
    sheet("gold", 4.4, len - 1.2, -half * 0.82, half * 0.82, 0.1, 0.04),
    pipe("hull-grey", [3.6, -half, 0], [len, -half, 0], 0.08, 6),
    pipe("hull-grey", [3.6, half, 0], [len, half, 0], 0.08, 6),
    pipe("lamp-amber", [len, 0, 0], [len + 0.6, 0, 0], 0.14, 8),
    pipe("copper", [4, 0, 0.2], [len - 1, 0, 0.2], 0.04, 6),
  ];
}

/** A square gold sheet with a boom to each corner. */
function sail(radius: number): Piece[] {
  const h = radius * 0.5;
  const out: Piece[] = [sheet("kapton", -h, h, -h, h, 0, 0.05), sheet("gold", -h * 0.92, h * 0.92, -h * 0.92, h * 0.92, 0.08, 0.04)];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) out.push(pipe("hull-grey", [0, 0, 0], [sx * h, sy * h, 0], 0.12, 6));
  out.push(pipe("hull-grey", [-h, 0, 0], [h, 0, 0], 0.1, 6), pipe("hull-grey", [0, -h, 0], [0, h, 0], 0.1, 6));
  out.push(pipe("lamp-red", [h, h, 0], [h + 0.5, h, 0], 0.12, 6), pipe("lamp-amber", [-h, h, 0], [-h - 0.5, h, 0], 0.12, 6));
  return out;
}

/** The kit, with a fixed socket and the array tagged to face the Sun. `radius` is the blanket's reach, in metres. */
export function solarKit(kind: SolarKit, radius: number): Piece[] {
  const socket: Piece[] = [pipe("hull-grey", [0, 0, -1.2], [0, 0, 0.2], 0.35, 8), pipe("lamp-amber", [0, 0, 0.2], [0, 0, 1], 0.1, 6)];
  const wing = kind === "blanket" ? blanket(radius) : kind === "rollout" ? rollout(radius) : sail(radius);
  return [...socket, ...moving(wing, TRACK)];
}
