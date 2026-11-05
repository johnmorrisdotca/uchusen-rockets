// The constants a trip needs, each with where it is from. Metres and seconds unless the name says otherwise. Pure.

/**
 * The speed of light, metres a second (exact, by definition of the metre).
 *
 * @example
 * ```ts
 * import { C } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(C);
 * ```
 */
export const C = 299_792_458;
/**
 * One standard gravity, metres a second squared (exact, by definition).
 *
 * @example
 * ```ts
 * import { G0 } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(G0);
 * ```
 */
export const G0 = 9.80665;
/**
 * One astronomical unit, metres (exact, IAU 2012).
 *
 * @example
 * ```ts
 * import { AU_M } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(AU_M);
 * ```
 */
export const AU_M = 149_597_870_700;
/**
 * One astronomical unit, kilometres.
 *
 * @example
 * ```ts
 * import { AU_KM } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(AU_KM);
 * ```
 */
export const AU_KM = AU_M / 1000;
/**
 * A day, seconds.
 *
 * @example
 * ```ts
 * import { DAY_S } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(DAY_S);
 * ```
 */
export const DAY_S = 86_400;
/**
 * A Julian year, seconds.
 *
 * @example
 * ```ts
 * import { YEAR_S } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(YEAR_S);
 * ```
 */
export const YEAR_S = 31_557_600;
/**
 * A light year, metres.
 *
 * @example
 * ```ts
 * import { LY_M } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(LY_M);
 * ```
 */
export const LY_M = C * YEAR_S;

/**
 * Gravitational parameters (GM), cubic kilometres a second squared. NASA/JPL: "Planetary Satellite Physical Parameters" and "Planetary Physical Parameters"
 * (https://ssd.jpl.nasa.gov/), read 2026-11-04. The Sun's is the IAU 2015 nominal value.
 *
 * @example
 * ```ts
 * import { GM_KM3_S2 } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(GM_KM3_S2.earth, GM_KM3_S2.moon);
 * ```
 */
export const GM_KM3_S2: Readonly<Record<string, number>> = {
  sun: 132_712_440_018,
  mercury: 22_031.868,
  venus: 324_858.592,
  earth: 398_600.4418,
  moon: 4_902.800,
  mars: 42_828.375,
  jupiter: 126_686_534,
  saturn: 37_931_187,
  uranus: 5_793_939,
  neptune: 6_836_529,
  pluto: 869.6,
};

/**
 * Sidereal orbital periods, days (NASA's planetary fact sheets, https://nssdc.gsfc.nasa.gov/planetary/factsheet/).
 *
 * @example
 * ```ts
 * import { PERIOD_DAYS } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(PERIOD_DAYS.mars);
 * ```
 */
export const PERIOD_DAYS: Readonly<Record<string, number>> = {
  mercury: 87.969,
  venus: 224.701,
  earth: 365.256,
  mars: 686.98,
  jupiter: 4332.589,
  saturn: 10759.22,
  uranus: 30685.4,
  neptune: 60189,
  pluto: 90560,
};

/**
 * The height of the circular parking orbit round each kind of body, kilometres: 185 km above the Earth (Apollo's), 100 km above the Moon (Apollo's), 200 km above any other body.
 *
 * @example
 * ```ts
 * import { PARKING_ALTITUDE_KM } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(PARKING_ALTITUDE_KM.earth);
 * ```
 */
export const PARKING_ALTITUDE_KM = { earth: 185, moon: 100, other: 200 } as const;
