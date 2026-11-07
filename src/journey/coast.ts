// Where a ship would be if it never braked. The same relativistic constant-proper-acceleration arithmetic as the trip, run on past the flip. Pure.
import { AU_M, C, LY_M } from "./constants.ts";

/** One parsec in light years. The IAU definition: 648000/π astronomical units. */
const PC_LY = (648_000 / Math.PI) * (AU_M / LY_M);

/**
 * Proxima Centauri, light years. The same figure as the fleet engine card.
 *
 * @example
 * ```ts
 * import { PROXIMA_LY } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(PROXIMA_LY);
 * ```
 */
export const PROXIMA_LY = 4.2465;

/**
 * Galactic centre, parsecs. GRAVITY Collaboration (Abuter et al.) 2019, A&A 625, L10: R0 = 8178 pc.
 * @example
 * ```ts
 * import { GALACTIC_CENTRE_PC } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(GALACTIC_CENTRE_PC);
 * ```
 */
export const GALACTIC_CENTRE_PC = 8178;

/**
 * Andromeda (M31), parsecs. Riess, Fliri and Valls-Gabaud 2012, ApJ 745, 156: 752 kpc.
 * @example
 * ```ts
 * import { ANDROMEDA_PC } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(ANDROMEDA_PC);
 * ```
 */
export const ANDROMEDA_PC = 752_000;

/**
 * Galactic centre, light years, from `GALACTIC_CENTRE_PC`.
 * @example
 * ```ts
 * import { GALACTIC_CENTRE_LY } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(GALACTIC_CENTRE_LY > 26_000);
 * ```
 */
export const GALACTIC_CENTRE_LY = GALACTIC_CENTRE_PC * PC_LY;

/**
 * Andromeda, light years, from `ANDROMEDA_PC`.
 * @example
 * ```ts
 * import { ANDROMEDA_LY } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(ANDROMEDA_LY > 2_000_000);
 * ```
 */
export const ANDROMEDA_LY = ANDROMEDA_PC * PC_LY;

/**
 * The left end of the log line: one light second, metres.
 * @example
 * ```ts
 * import { C, COAST_MIN_M } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(COAST_MIN_M === C);
 * ```
 */
export const COAST_MIN_M = C;

/**
 * The right end of the log line, light years: past Andromeda, so the galaxy sits inside the line.
 * @example
 * ```ts
 * import { ANDROMEDA_LY, COAST_MAX_LY } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(COAST_MAX_LY > ANDROMEDA_LY);
 * ```
 */
export const COAST_MAX_LY = 4_000_000;

/**
 * Distance and Earth time if a ship keeps proper acceleration `a` (m/s²) for `properS` seconds on board and never brakes, starting from rest.
 * Rapidity is capped so the hyperbolic functions stay finite; a trip inside the solar system is nowhere near the cap.
 * @param a Proper acceleration, metres a second squared.
 * @param properS Time on board, seconds.
 * @returns Distance in the frame the ship started at rest in (metres), and how far that frame's clocks move (seconds).
 * @example
 * ```ts
 * import { G0, keptGoing } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const gone = keptGoing(G0, 86_400);
 * console.log(gone.distanceM > 0, gone.earthS > 86_000);
 * ```
 */
export function keptGoing(a: number, properS: number): { distanceM: number; earthS: number } {
  if (!(a > 0) || !(properS > 0)) return { distanceM: 0, earthS: 0 };
  const phi = Math.min(40, (a * properS) / C);
  const half = Math.sinh(phi / 2);
  return { distanceM: ((C * C) / a) * (2 * half * half), earthS: (C / a) * Math.sinh(phi) };
}

/**
 * Where a distance sits on the log line, 0 at one light second and 1 at `COAST_MAX_LY`. Anything shorter clamps to the left end, anything longer to the right.
 * @param distanceM Metres.
 * @returns A fraction from 0 to 1.
 * @example
 * ```ts
 * import { C, coastPlace } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(coastPlace(C) === 0);
 * ```
 */
export function coastPlace(distanceM: number): number {
  const lo = Math.log(COAST_MIN_M);
  const hi = Math.log(COAST_MAX_LY * LY_M);
  const d = Math.min(COAST_MAX_LY * LY_M, Math.max(COAST_MIN_M, distanceM));
  return (Math.log(d) - lo) / (hi - lo);
}
