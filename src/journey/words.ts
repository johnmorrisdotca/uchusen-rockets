// Numbers as words for the panel: distances in kilometres, astronomical units and light time, times, speeds, and the share of the speed of light with as many digits as it needs. Pure; no language in it but the numbers.
import { AU_KM, C } from "./constants.ts";

const GROUP = " ";

/** Whole digits in groups of three, with a narrow space between: 150 000 000. */
function group(digits: string): string {
  const [whole = "", fraction] = digits.split(".");
  const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  if (fraction === undefined) return spaced;
  return `${spaced}.${fraction.length >= 6 ? fraction.replace(/(\d{3})(?=\d)/g, `$1${GROUP}`) : fraction}`;
}

/**
 * A distance in kilometres, with groups of three digits.
 * @param km Kilometres.
 * @returns For example `149 597 871 km`.
 * @example
 * ```ts
 * import { kilometres } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(kilometres(149_597_870.7));
 * ```
 */
export const kilometres = (km: number): string => `${group(Math.round(km).toString())} km`;

/**
 * A distance in astronomical units.
 * @param km Kilometres.
 * @returns For example `1.000 AU`, or `0.00257 AU` for a small one.
 * @example
 * ```ts
 * import { astronomicalUnits } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(astronomicalUnits(149_597_870.7));
 * ```
 */
export const astronomicalUnits = (km: number): string => {
  const au = km / AU_KM;
  return `${au >= 0.1 ? au.toFixed(3) : au.toPrecision(3)} AU`;
};

/**
 * The time light takes to cross a distance, in the unit that reads best.
 * @param km Kilometres.
 * @returns For example `1.28 light-seconds`, `8.3 light-minutes` or `4.37 light-years`.
 * @example
 * ```ts
 * import { lightTime } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(lightTime(384_400), lightTime(149_597_870.7));
 * ```
 */
export function lightTime(km: number): string {
  const s = (km * 1000) / C;
  if (s < 120) return `${s.toFixed(2)} light-seconds`;
  if (s < 7200) return `${(s / 60).toFixed(1)} light-minutes`;
  if (s < 172_800) return `${(s / 3600).toFixed(1)} light-hours`;
  if (s < 31_557_600) return `${(s / 86_400).toFixed(1)} light-days`;
  return `${(s / 31_557_600).toFixed(2)} light-years`;
}

/**
 * A length of time, in the units that read best.
 * @param seconds Seconds.
 * @returns For example `11 min 40 s`, `5 d 2 h` or `258 d 20 h`.
 * @example
 * ```ts
 * import { duration } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(duration(700), duration(258.8 * 86400));
 * ```
 */
export function duration(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
  if (s < 172_800) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`;
  if (s < 63_115_200) return `${Math.floor(s / 86_400)} d ${Math.round((s % 86_400) / 3600)} h`;
  return `${(s / 31_557_600).toFixed(2)} years`;
}

/**
 * A speed in metres a second as metres, kilometres or kilometres a second.
 * @param ms Metres a second.
 * @returns For example `7.79 km/s` or `340 m/s`.
 * @example
 * ```ts
 * import { speedWords } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(speedWords(7790), speedWords(340));
 * ```
 */
export function speedWords(ms: number): string {
  if (Math.abs(ms) < 1000) return `${Math.round(ms)} m/s`;
  return `${group((ms / 1000).toFixed(ms < 100_000 ? 2 : 0))} km/s`;
}

/**
 * The share of the speed of light, with enough digits that it is never rounded up to 100: `99.999 999 99 %` for a speed a hair under c.
 * @param ms Metres a second.
 * @returns The percent, in groups of three digits.
 * @example
 * ```ts
 * import { percentOfLight } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(percentOfLight(29_780), percentOfLight(299_792_457.9999));
 * ```
 */
export function percentOfLight(ms: number): string {
  const beta = ms / C;
  const behind = 1 - beta;
  const digits = behind > 0 && behind < 0.01 ? Math.min(14, Math.ceil(-Math.log10(behind)) + 1) : beta < 0.001 ? 4 : 3;
  return `${group((beta * 100).toFixed(Math.max(2, digits)))} %`;
}

/**
 * An acceleration in g.
 * @param g Standard gravities (positive or negative).
 * @returns For example `0.21 g`, `1.13 g`, `0.015 g`.
 * @example
 * ```ts
 * import { gWords } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(gWords(0.2138), gWords(0.015));
 * ```
 */
export function gWords(g: number): string {
  const a = Math.abs(g);
  return `${a >= 1 ? a.toFixed(2) : a >= 0.1 ? a.toFixed(2) : a.toPrecision(2)} g`;
}

/**
 * A mass in tonnes.
 * @param tonnes Tonnes.
 * @returns For example `43.5 t`, `6.35 million t`.
 * @example
 * ```ts
 * import { tonnesWords } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * console.log(tonnesWords(43.5), tonnesWords(6_350_000));
 * ```
 */
export const tonnesWords = (tonnes: number): string => (tonnes >= 1e6 ? `${(tonnes / 1e6).toFixed(2)} million t` : `${group(tonnes >= 100 ? Math.round(tonnes).toString() : tonnes.toFixed(1))} t`);
