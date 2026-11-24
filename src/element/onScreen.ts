/** A stage's box, in CSS pixels, as `getBoundingClientRect` reports it. */
export interface StageBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/**
 * Whether a stage should start its 3D view. The intersection observer is asked first. A stuck stage
 * (`position: sticky`) can sit in the window while that observer still says it is outside, so a box
 * that actually overlaps the window, with the same 200px margin the observer uses, counts as shown.
 */
export function shownInWindow(reported: boolean, box: StageBox, frame: { width: number; height: number }, margin = 200): boolean {
  if (reported) return true;
  if (box.width < 1 || box.height < 1) return false;
  return box.bottom > -margin && box.top < frame.height + margin && box.right > 0 && box.left < frame.width;
}
