// The box the default fit holds. Usually it is the whole craft. A craft whose arrays or booms reach several times past its body would be drawn small to hold them, so a part may name the width the fit holds instead:
// the thin reaching parts then run off the frame's edge, and the zoom controls still show them. Pure, in metres.
import type { Vec3 } from "./framing.ts";

/**
 * The box a fit holds: `min` to `max`, narrowed to `width` metres across, centred on the craft's axis, when that is narrower than the box. Height is never cut.
 * @param min The lowest corner of the whole craft.
 * @param max The highest corner.
 * @param width The widest the fit holds, in metres, or null to hold everything.
 * @returns The corners the camera frames.
 */
export function fitBox(min: Vec3, max: Vec3, width: number | null): { min: Vec3; max: Vec3 } {
  if (width === null) return { min, max };
  const half = width / 2;
  const cut = (low: number, high: number): [number, number] => [Math.max(low, -half), Math.min(high, half)];
  const [x0, x1] = cut(min[0], max[0]);
  const [z0, z1] = cut(min[2], max[2]);
  return { min: [x0, min[1], z0], max: [x1, max[1], z1] };
}
