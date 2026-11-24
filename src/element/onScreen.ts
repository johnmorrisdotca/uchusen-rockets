/** A stage's box, in CSS pixels, as `getBoundingClientRect` reports it. */
export interface StageBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/** The frame a stage is drawn in, when this page is inside another. `null` is the top window. */
export interface FrameHost {
  box: StageBox;
  frame: { width: number; height: number };
}

/**
 * Whether a stage should start its 3D view. The intersection observer is asked first. A stuck stage
 * (`position: sticky`) can sit in the window while that observer still says it is outside, so a box
 * that actually overlaps the window, with the same 200px margin the observer uses, counts as shown.
 * A stage inside a frame that has been scrolled off the parent window is not shown: its own box still
 * overlaps the frame, which is why the observer's answer has to win there.
 */
export function shownInWindow(reported: boolean, box: StageBox, frame: { width: number; height: number }, margin = 200, host: FrameHost | null = null): boolean {
  if (reported) return true;
  if (host && !overlaps(host.box, host.frame, 0)) return false;
  if (box.width < 1 || box.height < 1) return false;
  return overlaps(box, frame, margin) && box.right > 0 && box.left < frame.width;
}

function overlaps(box: StageBox, frame: { width: number; height: number }, margin: number): boolean {
  return box.bottom > -margin && box.top < frame.height + margin && box.right > -margin && box.left < frame.width + margin;
}

/** Where this window sits in its parent, or null when this is the top window. A frame that cannot be read counts as off the parent, so a scrolled embed stops drawing. */
export function frameHost(win: Window): FrameHost | null {
  if (win.parent === win) return null;
  try {
    const node = win.frameElement;
    if (!(node instanceof Element)) return off();
    const rect = node.getBoundingClientRect();
    return {
      box: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
      frame: { width: win.parent.innerWidth, height: win.parent.innerHeight },
    };
  } catch {
    return off();
  }
}

function off(): FrameHost {
  return { box: { top: -1e6, bottom: -1e6, left: 0, right: 0, width: 0, height: 0 }, frame: { width: 1, height: 1 } };
}
