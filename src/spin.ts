// How a view turns by itself. `way` is which way round: `cw`, clockwise seen from above, takes the near side to the viewer's left, and `ccw` to the right. Pure.

export type Way = "cw" | "ccw";

export interface Spin {
  /** Seconds a turn, 0 for not at all. */
  seconds: number;
  way: Way;
}

const NAMED: Readonly<Record<string, number>> = { off: 0, slow: 180, medium: 67, fast: 20 };

export const DEFAULT_SPIN: Spin = { seconds: 180, way: "cw" };

/** Anything but `ccw` is the default way. */
export const cleanWay = (value: unknown): Way => (value === "ccw" ? "ccw" : "cw");

/** A spin from the `spin` and `way` attributes: a name, or seconds a turn. A nonsense value is the default, and a negative one is none. */
export function spinOf(spin: string | null, way: string | null): Spin {
  const raw = spin === null ? NaN : Object.hasOwn(NAMED, spin) ? NAMED[spin] : Number(spin);
  const seconds = spin === null || spin.trim() === "" || !Number.isFinite(raw) ? DEFAULT_SPIN.seconds : Math.max(0, raw);
  return { seconds, way: cleanWay(way) };
}
