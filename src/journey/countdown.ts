// The countdown before the burn and the timers before the braking burn: the preheat bar, the ignition count, and the time to the deceleration burn. Pure functions of the mission time.
import type { Trip } from "./trip.ts";

/**
 * The engine preheat bar before ignition: ten segments and a percent. It fills from 13 seconds before lift-off to 3 seconds before, and is full after.
 * @param missionS Mission seconds from lift-off (negative before).
 * @returns The percent (0 to 100), how many of the ten segments are full, and how full the next one is (0 to 1).
 * @example
 * ```ts
 * import { preheat } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(preheat(-8.5));
 * ```
 */
export function preheat(missionS: number): { percent: number; full: number; partial: number } {
  const share = Math.max(0, Math.min(1, (missionS + 13) / 10));
  const percent = Math.round(share * 100);
  const full = Math.min(10, Math.floor(share * 10));
  return { percent, full, partial: full >= 10 ? 0 : share * 10 - full };
}

/**
 * The ignition count: IGNITION IN 3, 2, 1, then 0 from lift-off, with how far round the ring dial has gone.
 * @param missionS Mission seconds from lift-off (negative before).
 * @returns The number to show (3, 2, 1 or 0) and the ring's sweep (0 to 1).
 * @example
 * ```ts
 * import { ignition } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(ignition(-2.2), ignition(0));
 * ```
 */
export function ignition(missionS: number): { count: number; ring: number } {
  if (missionS >= 0) return { count: 0, ring: 1 };
  return { count: Math.max(0, Math.min(3, Math.ceil(-missionS))), ring: Math.max(0, Math.min(1, (missionS + 3) / 3)) };
}

/**
 * The timer before and during the braking burn: DECELERATION BURN IN until it starts, DECELERATION COMPLETE IN while it runs, nothing after.
 * @param trip A planned trip.
 * @param missionS Mission seconds from lift-off.
 * @returns Which timer, and its seconds; or null when there is none to show.
 * @example
 * ```ts no-run
 * import { burnTimer, type Trip } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const trip: Trip;
 * console.log(burnTimer(trip, 10));
 * ```
 */
export function burnTimer(trip: Trip, missionS: number): { kind: "burn-in" | "complete-in"; seconds: number } | null {
  const braking = trip.phases.find((phase) => phase.id === "brake" || phase.id === "decelerate" || phase.id === "flyby");
  if (!braking || missionS < 0) return null;
  if (missionS < braking.startS) return { kind: "burn-in", seconds: braking.startS - missionS };
  if (missionS < braking.endS) return { kind: "complete-in", seconds: braking.endS - missionS };
  return null;
}
