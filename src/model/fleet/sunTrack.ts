// The angle that turns a face toward the Sun. A group tagged with a rest face uses this instead of the clock.
// Pure: no three.js and no DOM.
import type { Vec3 } from "../pieces.ts";

const dot = (a: readonly number[], b: readonly number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: readonly number[], b: readonly number[]): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: readonly number[], b: readonly number[]): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: readonly number[], k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a: readonly number[]): Vec3 => {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
};

/**
 * Degrees about `axis` that turns `face` toward `sun`. Both are directions in the same frame.
 * Zero when the face already lies along the axis, or when the sun does, because there is then nothing to turn.
 */
export function trackAngle(sun: readonly [number, number, number], axis: readonly [number, number, number], face: readonly [number, number, number]): number {
  const a = unit(axis);
  const project = (v: readonly number[]): Vec3 => sub(v, scale(a, dot(v, a)));
  const rest = project(face);
  const target = project(sun);
  if (Math.hypot(rest[0], rest[1], rest[2]) < 1e-8 || Math.hypot(target[0], target[1], target[2]) < 1e-8) return 0;
  const r = unit(rest);
  const s = unit(target);
  return (Math.atan2(dot(cross(r, s), a), dot(r, s)) * 180) / Math.PI;
}
