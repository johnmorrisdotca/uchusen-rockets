// The constants a trip needs, each with where it is from. Metres and seconds unless the name says otherwise. Pure.

/** The speed of light, metres a second (exact, by definition of the metre). */
export const C = 299_792_458;
/** One standard gravity, metres a second squared (exact, by definition). */
export const G0 = 9.80665;
/** One astronomical unit, metres (exact, IAU 2012). */
export const AU_M = 149_597_870_700;
/** One astronomical unit, kilometres. */
export const AU_KM = AU_M / 1000;
/** A day, seconds. */
export const DAY_S = 86_400;
/** A Julian year, seconds. */
export const YEAR_S = 31_557_600;
/** A light year, metres. */
export const LY_M = C * YEAR_S;

/**
 * Gravitational parameters (GM), cubic kilometres a second squared. NASA/JPL: "Planetary Satellite Physical Parameters" and "Planetary Physical Parameters"
 * (https://ssd.jpl.nasa.gov/), read 2026-11-04. The Sun's is the IAU 2015 nominal value.
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

/** Sidereal orbital periods, days (NASA's planetary fact sheets, https://nssdc.gsfc.nasa.gov/planetary/factsheet/). */
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

/** The height of the circular parking orbit round each kind of body, kilometres: 185 km above the Earth (Apollo's), 100 km above the Moon (Apollo's), 200 km above any other body. */
export const PARKING_ALTITUDE_KM = { earth: 185, moon: 100, other: 200 } as const;
