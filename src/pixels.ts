// How sharp the 3D canvas may be. The backing store is width x height x ratio squared, and a view as big as a 5K screen at a ratio of 2 would ask the graphics card for 15 million pixels, every frame. Pure.

/**
 * The most the backing store may hold, in pixels (a 620 x 827 view at a ratio of 2 is 2 million).
 *
 * @example
 * ```ts
 * import { MAX_PIXELS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(MAX_PIXELS);
 * ```
 */
export const MAX_PIXELS = 6_000_000;
/**
 * The longest side the backing store may have.
 *
 * @example
 * ```ts
 * import { MAX_SIDE } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(MAX_SIDE);
 * ```
 */
export const MAX_SIDE = 4096;
/**
 * The sharpest ratio ever used, however dense the screen.
 *
 * @example
 * ```ts
 * import { MAX_RATIO } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(MAX_RATIO);
 * ```
 */
export const MAX_RATIO = 2;

/**
 * The device pixel ratio to draw a `width` x `height` view at: the screen's own, held to 2, to 4096 pixels a side and to 6 million in all. At least 0.25, and 1 for a nonsense value.
 *
 * @param width The view's width in CSS pixels.
 * @param height Its height in CSS pixels.
 * @param deviceRatio The screen's own pixel ratio.
 * @returns The ratio to draw at.
 * @example
 * ```ts
 * import { pixelRatioFor } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(pixelRatioFor(620, 827, 3), pixelRatioFor(3000, 3000, 2));
 * ```
 */
export function pixelRatioFor(width: number, height: number, deviceRatio: number): number {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const wanted = Number.isFinite(deviceRatio) && deviceRatio > 0 ? Math.min(deviceRatio, MAX_RATIO) : 1;
  return Math.max(0.25, Math.min(wanted, MAX_SIDE / Math.max(w, h), Math.sqrt(MAX_PIXELS / (w * h))));
}
