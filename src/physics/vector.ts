// Three numbers for a place, a speed or an acceleration, and the few sums the flight physics needs. Pure.

/**
 * A vector in three dimensions: `[x, y, z]`, right-handed. The flight physics works in metres, metres a second and metres a second squared, in whatever frame the caller's bodies are given in (for example the ecliptic of J2000 from the solar system's barycentre, or the Earth's equator from its centre).
 *
 * @example
 * ```ts
 * import type { Vec3 } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const issHeight: Vec3 = [6_778_000, 0, 0];
 * console.log(issHeight[0]);
 * ```
 */
export type Vec3 = readonly [number, number, number];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
/** `a + b k`, the step every integrator takes. */
export const addScaled = (a: Vec3, b: Vec3, k: number): Vec3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
