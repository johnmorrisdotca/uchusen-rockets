// The change from a rocket's drawing to its 3D view: the drawing stays a moment even when the 3D view is ready sooner, then a slow crossfade; under reduced motion, a plain short fade. Pure.

/**
 * The drawing stays at least this long after it first comes on screen.
 *
 * @example
 * ```ts
 * import { DRAWING_HOLD_MS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(DRAWING_HOLD_MS);
 * ```
 */
export const DRAWING_HOLD_MS = 1200;
/**
 * How long the drawing and the 3D view cross-fade, in milliseconds.
 *
 * @example
 * ```ts
 * import { CROSSFADE_MS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(CROSSFADE_MS);
 * ```
 */
export const CROSSFADE_MS = 1500;
/**
 * How long the cross-fade lasts for a reader who asked for reduced motion, in milliseconds.
 *
 * @example
 * ```ts
 * import { REDUCED_FADE_MS } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(REDUCED_FADE_MS);
 * ```
 */
export const REDUCED_FADE_MS = 400;

/**
 * How long to wait, once the 3D view is ready at `readyAt`, before it takes over from a drawing first seen at `shownAt` (0 under reduced motion).
 *
 * @param shownAt When the drawing first came on screen, in milliseconds.
 * @param readyAt When the 3D view became ready, on the same clock.
 * @param reducedMotion True when the reader asked for reduced motion.
 * @returns The milliseconds to wait before the 3D view takes over.
 * @example
 * ```ts
 * import { revealDelay } from "@johnmorrisdotca/uchusen-rockets";
 *
 * console.log(revealDelay(0, 300, false), revealDelay(0, 300, true));
 * ```
 */
export function revealDelay(shownAt: number, readyAt: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return Math.max(0, Math.min(DRAWING_HOLD_MS, shownAt + DRAWING_HOLD_MS - readyAt));
}
