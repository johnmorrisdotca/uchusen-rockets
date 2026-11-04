// The arithmetic of a trip: circular and escape speeds, the Hohmann transfer, leaving and entering a gravity well, Kepler's equation, the synodic period and constant acceleration with a flip.
// Newtonian where the speeds are slow, relativistic (constant proper acceleration) for the flip and burn, which reduces to the Newtonian answer in the solar system. Pure: no clock, no DOM, no dependency.
import { C } from "./constants.ts";

const TAU = 2 * Math.PI;

/**
 * Speed of a circular orbit, kilometres a second.
 * @param muKm3s2 The body's gravitational parameter, km^3/s^2.
 * @param rKm The orbit's radius from the body's centre, km.
 * @returns The speed, km/s.
 * @example
 * ```ts
 * import { circularSpeed } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(circularSpeed(398600.4418, 6378.137 + 185).toFixed(2));
 * ```
 */
export const circularSpeed = (muKm3s2: number, rKm: number): number => Math.sqrt(muKm3s2 / rKm);

/**
 * The Hohmann transfer between two circular orbits about one body: its half-ellipse, its time and the two speed changes.
 * @param muKm3s2 The central body's gravitational parameter, km^3/s^2.
 * @param r1Km The starting radius, km.
 * @param r2Km The final radius, km.
 * @returns The semi-major axis (km), the flight time (seconds), the speed change at the start and at the end (km/s, both positive).
 * @example
 * ```ts
 * import { GM_KM3_S2, hohmann } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const mars = hohmann(GM_KM3_S2.sun!, 149_597_870.7, 1.52371034 * 149_597_870.7);
 * console.log((mars.seconds / 86400).toFixed(1), mars.dv1.toFixed(2), mars.dv2.toFixed(2));
 * ```
 */
export function hohmann(muKm3s2: number, r1Km: number, r2Km: number): { a: number; seconds: number; dv1: number; dv2: number } {
  const a = (r1Km + r2Km) / 2;
  const seconds = Math.PI * Math.sqrt((a * a * a) / muKm3s2);
  const dv1 = Math.abs(Math.sqrt(muKm3s2 / r1Km) * (Math.sqrt((2 * r2Km) / (r1Km + r2Km)) - 1));
  const dv2 = Math.abs(Math.sqrt(muKm3s2 / r2Km) * (1 - Math.sqrt((2 * r1Km) / (r1Km + r2Km))));
  return { a, seconds, dv1, dv2 };
}

/**
 * The burn that takes a craft from a circular parking orbit onto a path that leaves with a given speed at infinity, or, run the other way, that captures it into the same circular orbit: `sqrt(v_inf^2 + 2 mu / r) - sqrt(mu / r)`.
 * @param muKm3s2 The body's gravitational parameter, km^3/s^2.
 * @param rKm The parking orbit's radius, km.
 * @param vInfKmS The speed relative to the body once far from it, km/s.
 * @returns The speed change, km/s.
 * @example
 * ```ts
 * import { escapeBurn } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(escapeBurn(398600.4418, 6378.137 + 185, 2.94).toFixed(2));
 * ```
 */
export const escapeBurn = (muKm3s2: number, rKm: number, vInfKmS: number): number => Math.sqrt(vInfKmS * vInfKmS + (2 * muKm3s2) / rKm) - Math.sqrt(muKm3s2 / rKm);

/**
 * The time between two meetings of two bodies in circular orbits, from their periods: `1 / |1/T1 - 1/T2|`.
 * @param period1 The first period, any unit.
 * @param period2 The second period, in the same unit.
 * @returns The synodic period, in that unit.
 * @example
 * ```ts
 * import { synodicPeriod } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(synodicPeriod(365.256, 686.98).toFixed(1));
 * ```
 */
export const synodicPeriod = (period1: number, period2: number): number => 1 / Math.abs(1 / period1 - 1 / period2);

/**
 * Kepler's equation `M = E - e sin E`, solved for the eccentric anomaly by Newton's method.
 * @param meanAnomaly The mean anomaly, radians.
 * @param e The eccentricity, 0 to below 1.
 * @returns The eccentric anomaly, radians, in the same turn as the mean anomaly.
 * @example
 * ```ts
 * import { kepler } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(kepler(1, 0.2).toFixed(4));
 * ```
 */
export function kepler(meanAnomaly: number, e: number): number {
  const turns = Math.floor(meanAnomaly / TAU);
  const m = meanAnomaly - turns * TAU;
  let big = e < 0.8 ? m : Math.PI;
  for (let i = 0; i < 30; i += 1) {
    const step = (big - e * Math.sin(big) - m) / (1 - e * Math.cos(big));
    big -= step;
    if (Math.abs(step) < 1e-13) break;
  }
  return big + turns * TAU;
}

/** Where a craft is on a Hohmann half-ellipse `t` seconds after its burn: its distance from the centre (km), its direction (radians, from the departure direction `theta0`) and its speed (km/s). */
export function transferPoint(muKm3s2: number, r1Km: number, r2Km: number, theta0: number, t: number): { r: number; theta: number; v: number } {
  const a = (r1Km + r2Km) / 2;
  const e = Math.abs(r2Km - r1Km) / (r1Km + r2Km);
  const outward = r2Km >= r1Km;
  const n = Math.sqrt(muKm3s2 / (a * a * a));
  const big = kepler((outward ? 0 : Math.PI) + n * t, e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(big / 2), Math.sqrt(1 - e) * Math.cos(big / 2));
  const r = a * (1 - e * Math.cos(big));
  return { r, theta: theta0 + (outward ? nu : nu - Math.PI), v: Math.sqrt(muKm3s2 * (2 / r - 1 / a)) };
}

/** The state of a craft that has burned at constant proper acceleration `a` (m/s^2) for `t` seconds of the frame's time, from rest: distance (m), speed (m/s), Lorentz factor and time on board (s). */
export function accelerating(a: number, t: number): { x: number; v: number; gamma: number; proper: number } {
  const s = (a * t) / C;
  const root = Math.sqrt(1 + s * s);
  return { x: ((C * C) / a) * (root - 1), v: (a * t) / root, gamma: root, proper: (C / a) * Math.asinh(s) };
}

/**
 * A trip of constant acceleration with a turn round in the middle: burn to the halfway point, coast while the craft turns end for end, burn the same acceleration to stop. The relativistic constant-proper-acceleration answer, which is `2 sqrt(d / a)` for slow trips.
 * @param distanceM The distance between the two ends, in the frame in which both are at rest, metres.
 * @param a The proper acceleration, m/s^2.
 * @param flipSeconds How long the turn takes, during which the craft coasts at its peak speed. 0 for the textbook flip.
 * @returns How long each burn lasts in the frame's time, the peak speed, the Lorentz factor then, the time on board and in the frame, and the rapidity at the flip.
 * @example
 * ```ts
 * import { flipAndBurn, G0, LY_M } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const trip = flipAndBurn(4.37 * LY_M, G0, 0);
 * console.log((trip.properSeconds / 31_557_600).toFixed(1), (trip.peakSpeed / 299_792_458).toFixed(3));
 * ```
 */
export function flipAndBurn(distanceM: number, a: number, flipSeconds: number): { burnSeconds: number; peakSpeed: number; gamma: number; properSeconds: number; frameSeconds: number; rapidity: number } {
  // distance = 2 x(tb) + v(tb) flip, with x and v the burn's own: increasing in tb, so bisect.
  const reach = (tb: number): number => {
    const s = accelerating(a, tb);
    return 2 * s.x + s.v * flipSeconds;
  };
  let lo = 0;
  let hi = Math.max(1, Math.sqrt(distanceM / a) * 2);
  while (reach(hi) < distanceM) hi *= 2;
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (reach(mid) < distanceM) lo = mid;
    else hi = mid;
  }
  const burnSeconds = (lo + hi) / 2;
  const peak = accelerating(a, burnSeconds);
  return {
    burnSeconds,
    peakSpeed: peak.v,
    gamma: peak.gamma,
    properSeconds: 2 * peak.proper + flipSeconds / peak.gamma,
    frameSeconds: 2 * burnSeconds + flipSeconds,
    rapidity: Math.asinh((a * burnSeconds) / C),
  };
}

/** The propellant a rocket of exhaust speed `ve` uses to change its speed by `dv` (the Tsiolkovsky equation): the fraction of its starting mass, 0 to 1. Both speeds in the same unit. */
export const propellantFraction = (dv: number, ve: number): number => 1 - Math.exp(-dv / ve);

/** An angle brought into -pi to pi. */
export const wrapPi = (angle: number): number => angle - TAU * Math.round(angle / TAU);

/** The Lorentz factor of a speed in metres a second. */
export const lorentz = (v: number): number => 1 / Math.sqrt(1 - (v / C) ** 2);
