// How a view turns by itself. `way` is which way round: `cw`, clockwise seen from above, takes the near side to the viewer's left, and `ccw` to the right. Pure.

/**
 * Which way a rocket turns: `cw` (clockwise) or `ccw` (counter-clockwise).
 *
 * @example
 * ```ts
 * import type { Way } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const way: Way = "ccw";
 * console.log(way);
 * ```
 */
export type Way = "cw" | "ccw";

/**
 * The slow turn of a rocket: the seconds a full turn takes (0 is none) and which way.
 *
 * @example
 * ```ts
 * import { DEFAULT_SPIN, type Spin } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const spin: Spin = DEFAULT_SPIN;
 * console.log(spin.seconds, spin.way);
 * ```
 */
export interface Spin {
  /** Seconds a turn, 0 for not at all. */
  seconds: number;
  way: Way;
}

const NAMED: Readonly<Record<string, number>> = { off: 0, slow: 180, medium: 67, fast: 20 };

/**
 * The spin used when none is asked for: 180 seconds a turn, clockwise.
 *
 * @example
 * ```ts
 * import { DEFAULT_SPIN } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DEFAULT_SPIN);
 * ```
 */
export const DEFAULT_SPIN: Spin = { seconds: 180, way: "cw" };

/**
 * Anything but `ccw` is the default way.
 *
 * @param value Anything.
 * @returns `ccw` for `ccw`, and `cw` for anything else.
 * @example
 * ```ts
 * import { cleanWay } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(cleanWay("ccw"), cleanWay("left"));
 * ```
 */
export const cleanWay = (value: unknown): Way => (value === "ccw" ? "ccw" : "cw");

/**
 * A spin from the `spin` and `way` attributes: a name, or seconds a turn. A nonsense value is the default, and a negative one is none.
 *
 * @param spin The `spin` attribute: `off`, `slow`, `medium`, `fast`, or seconds a turn. Null when missing.
 * @param way The `way` attribute. Null when missing.
 * @returns The spin to use.
 * @example
 * ```ts
 * import { spinOf } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(spinOf("fast", null), spinOf("30", "ccw"), spinOf("nonsense", null));
 * ```
 */
export function spinOf(spin: string | null, way: string | null): Spin {
  const raw = spin === null ? NaN : Object.hasOwn(NAMED, spin) ? NAMED[spin] : Number(spin);
  const seconds = spin === null || spin.trim() === "" || !Number.isFinite(raw) ? DEFAULT_SPIN.seconds : Math.max(0, raw);
  return { seconds, way: cleanWay(way) };
}
