// One sun-tracking turn for every ship: how far a joint turns about its own axis so a face points as near the sun as that axis allows. A rotary joint and a gimbal each call it. Pure: no three.js and no DOM.
import type { Vec3 } from "../pieces.ts";

/**
 * Degrees to turn about `axis`, right-handed, so `face` points as near `sun` as one axis can. Both directions are in the joint's own frame. Zero when the sun lies on the axis.
 *
 * @param sun Where the light comes from, in the joint's frame.
 * @param axis The joint's axis, in that same frame.
 * @param face The direction the face points at rest.
 * @returns The angle in degrees.
 * @example
 * ```ts
 * import { trackAngle } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(trackAngle([0, 0, 1], [0, 1, 0], [0, 0, 1]));
 * ```
 */
export function trackAngle(sun: Vec3, axis: Vec3, face: Vec3): number {
  const span = Math.hypot(axis[0], axis[1], axis[2]) || 1;
  const ax: Vec3 = [axis[0] / span, axis[1] / span, axis[2] / span];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const flat = (v: Vec3): Vec3 => {
    const along = dot(v, ax);
    return [v[0] - ax[0] * along, v[1] - ax[1] * along, v[2] - ax[2] * along];
  };
  const n = flat(face);
  const s = flat(sun);
  const nl = Math.hypot(n[0], n[1], n[2]);
  const sl = Math.hypot(s[0], s[1], s[2]);
  if (nl < 1e-8 || sl < 1e-8) return 0;
  const cx = n[1] * s[2] - n[2] * s[1];
  const cy = n[2] * s[0] - n[0] * s[2];
  const cz = n[0] * s[1] - n[1] * s[0];
  return (Math.atan2(dot([cx, cy, cz], ax), dot(n, s)) * 180) / Math.PI;
}
