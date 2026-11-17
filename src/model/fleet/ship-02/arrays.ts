// The first design's drive, mended (MODULES-437, LESSONS 29): no chemical-rocket bell blown up to fleet size. Each of the eight torch positions holds a ring of seven magnetic-nozzle thrusters of the kit concepts
// (`mnThruster`: a plasma chamber, superconducting coils and a nozzle that is five separate field-coil rings), one in the middle and six round it, mounted on the drive raft's underside inside the old bell's
// footprint. A variant, beside the original, which stays as it was. Metres. Pure: no three.js and no DOM.
import { place } from "../detail.ts";
import { mnThruster, thrusterRings, thrusterSize } from "../kaminari-concepts/drive.ts";
import type { Piece } from "./adapter.ts";
import { DRIVE } from "./dims.ts";

/** The array: the thruster's scale, how many ring the middle one, the ring's radius and the mounting plane's height on the drive part (the raft's pillars stand above it). */
export const ARRAY = { s: 1.9, ring: 6, r: 14.5, plane: 130 } as const;

/** Thrusters in one torch's place, and in the whole drive. */
export const PER_TORCH = 1 + ARRAY.ring;
export const THRUSTERS = DRIVE.nozzles * PER_TORCH;

/** How far from the torch's axis the array reaches, metres: the ring's radius and the thruster's own flare. Inside the bell's exit radius. */
export const ARRAY_REACH = ARRAY.r + thrusterSize(ARRAY.s).radius;

/** One torch's place filled: a thruster on the axis and a ring of six round it. */
export function arrayPieces(): Piece[] {
  return thrusterRings([{ count: 1, r: 0, s: ARRAY.s }, { count: ARRAY.ring, r: ARRAY.r, s: ARRAY.s }], ARRAY.plane);
}

/** The whole drive: eight arrays, at the eight places the torch nozzles stood. */
export function driveArrays(): Piece[] {
  const out: Piece[] = [];
  for (const x of DRIVE.columns) for (const z of DRIVE.rows) out.push(...place(arrayPieces(), { at: [x, 0, z] }));
  return out;
}

/** One thruster on its own, for its propulsion card. */
export const thrusterCard = (): Piece[] => mnThruster(ARRAY.s);
