// What the journey needs to know about a place, and where it is. The package depends on no ephemeris: a page hands it a `BodySource`, and `demo/journey-bodies.ts` makes one from wakusei-planets. Pure types.

/**
 * A place a trip can start or end at: the Earth, the Moon or a planet, with what the arithmetic needs.
 *
 * @example
 * ```ts
 * import type { Stop } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const mars: Stop = { id: "mars", name: { en: "Mars", ja: "火星" }, kind: "planet", radiusKm: 3396.19, colour: "#c76a3f" };
 * console.log(mars.name.en);
 * ```
 */
export interface Stop {
  id: string;
  name: { en: string; ja: string };
  kind: "star" | "planet" | "dwarf-planet" | "moon";
  /** The planet a moon goes round. */
  parent?: string;
  /** The equatorial radius, km. */
  radiusKm: number;
  /** The gravitational parameter, km^3/s^2. Left out, the journey's own table (`GM_KM3_S2`) is used. */
  muKm3s2?: number;
  /** The sidereal orbital period, days. Left out, the journey's own table (`PERIOD_DAYS`) is used. */
  periodDays?: number;
  /** The body's mean colour, `#rrggbb`. */
  colour: string;
}

/**
 * Where the stops are, and what they are. The journey's core takes one of these and imports nothing.
 *
 * @example
 * ```ts
 * import type { BodySource } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const empty: BodySource = { stops: [], positionAu: () => [0, 0, 0], offsetKm: () => [0, 0, 0] };
 * console.log(empty.stops.length);
 * ```
 */
export interface BodySource {
  stops: readonly Stop[];
  /** A planet's position round the Sun (ecliptic, astronomical units) at a time in milliseconds since 1970. */
  positionAu(id: string, ms: number): readonly [number, number, number];
  /** A moon's position from its planet's centre (ecliptic, kilometres) at a time. */
  offsetKm(id: string, ms: number): readonly [number, number, number];
}
