// The voyage arithmetic for Ship 02 (and any ship that flies the same profile): relativistic constant proper acceleration, turning round at the halfway point, in an inertial frame in which both ends
// are at rest. No cruise coast and no clamp. For a trip of length D at proper acceleration a, with c the speed of light: the midpoint rapidity is eta = acosh(1 + aD / (2c^2)); the peak speed is c tanh(eta);
// the time on board is 2c eta / a; the time in the endpoints' frame is 2c sinh(eta) / a. A rocket whose exhaust leaves at v_e (a fraction of c) and which changes its rapidity by 2 eta needs the mass
// ratio exp(2 eta / (v_e / c)). Pure, and the same formulas the other ships use.

/** The speed of light, metres a second. */
export const C = 299_792_458;
/** One standard gravity, metres a second squared. */
export const G0 = 9.80665;
/** A Julian year, seconds. */
export const YEAR_S = 31_557_600;
/** A light year, metres. */
export const LY = C * YEAR_S;

export interface Voyage {
  /** The distance, in light years. */
  lightYears: number;
  /** The proper acceleration, in g. */
  g: number;
  /** The rapidity at the midpoint. */
  rapidity: number;
  /** The peak speed as a fraction of c, reached at the flip. */
  peak: number;
  /** The Lorentz factor at the flip. */
  gamma: number;
  /** Years on board. */
  shipYears: number;
  /** Years in the frame of the two ends. */
  endpointYears: number;
  /** Years on board for the half before the flip. */
  halfShipYears: number;
}

/**
 * The flip-and-burn voyage over a distance at a proper acceleration.
 *
 * @param lightYears The distance between the two ends, in light years.
 * @param g The proper acceleration, in g (9.80665 m/s^2).
 * @returns The peak speed, the Lorentz factor and the two durations.
 * @example
 * ```ts
 * import { voyage } from "./journey.ts";
 *
 * console.log(voyage(4.37, 0.015).shipYears.toFixed(2));
 * ```
 */
export function voyage(lightYears: number, g: number): Voyage {
  const a = g * G0;
  const d = lightYears * LY;
  const rapidity = Math.acosh(1 + (a * d) / (2 * C * C));
  return {
    lightYears,
    g,
    rapidity,
    peak: Math.tanh(rapidity),
    gamma: Math.cosh(rapidity),
    shipYears: (2 * C * rapidity) / a / YEAR_S,
    endpointYears: (2 * C * Math.sinh(rapidity)) / a / YEAR_S,
    halfShipYears: (C * rapidity) / a / YEAR_S,
  };
}

/** The mass ratio (start over finish) of the ideal relativistic rocket for a voyage, at an exhaust speed that is a fraction of c. */
export const massRatio = (v: Voyage, exhaustFraction: number): number => Math.exp((2 * v.rapidity) / exhaustFraction);

/** The farthest a ship can go at a proper acceleration with a mass ratio, in light years: the inverse of `voyage` and `massRatio`. */
export function rangeLightYears(ratio: number, exhaustFraction: number, g: number): number {
  const rapidity = (Math.log(ratio) * exhaustFraction) / 2;
  return ((Math.cosh(rapidity) - 1) * 2 * C * C) / (g * G0) / LY;
}

/** The thrust, in newtons, of a ship of this mass (tonnes) at this proper acceleration, in g. */
export const thrustN = (massTonnes: number, g: number): number => massTonnes * 1000 * g * G0;

/** The jet power, in watts, at a thrust and an exhaust speed that is a fraction of c (the non-relativistic half F v_e, which is the right order for v_e = 0.4 c). */
export const jetPowerW = (thrust: number, exhaustFraction: number): number => 0.5 * thrust * exhaustFraction * C;

/** A ship's voyage numbers worked from its masses: dry, payload and propellant, all in tonnes. */
export function ship02Budget(g: number, exhaustFraction: number, lightYears: number, dryT: number, payloadT: number, propellantT: number) {
  const v = voyage(lightYears, g);
  const full = dryT + payloadT + propellantT;
  const ratio = massRatio(v, exhaustFraction);
  const arrival = full / ratio;
  return { voyage: v, fullMassT: full, ratio, arrivalMassT: arrival, propellantUsedT: full - arrival, propellantLeftT: arrival - dryT - payloadT, startThrustN: thrustN(full, g), startJetPowerW: jetPowerW(thrustN(full, g), exhaustFraction) };
}
