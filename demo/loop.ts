// A small frame loop for the diagram pages. It runs only while the host is on screen and the tab is shown, asks for a frame at most 30 times a second, and never starts for a reader who asked for less motion.

/**
 * Calls `step(ms)` about 30 times a second, ms being the time since the loop first ran. Nothing is asked for out of sight, on a hidden tab, or with reduced motion.
 * @param host The element whose being on screen keeps the loop going.
 * @param step Draws the picture at that time. It returns `false` when there is nothing to draw (the page is still): the loop then asks for no more frames until `wake` is called.
 * @param played For a page with its own Play: whether the reader has pressed it, which lets the loop run under reduced motion. Without it reduced motion starts no loop.
 * @returns `wake`, which starts a rested loop again, or `null` when no loop was started (reduced motion, and no `played`).
 */
export function everyFrame(host: Element, step: (ms: number) => boolean | void, played?: () => boolean): (() => void) | null {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // reduced motion stops the loop unless the page has its own Play and the reader pressed it
  const stilled = (): boolean => reduced.matches && !(played?.() ?? false);
  if (stilled() && !played) return null;
  let seen = true;
  let raf = 0;
  let begun = 0;
  let last = 0;
  const tick = (now: number): void => {
    raf = 0;
    if (!seen || document.hidden || stilled()) return;
    if (begun === 0) begun = now;
    if (now - last < 33) {
      raf = requestAnimationFrame(tick);
      return;
    }
    last = now;
    // a step that has nothing to draw lets the loop rest: no frame is asked for until `wake`
    if (step(now - begun) === false) return;
    raf = requestAnimationFrame(tick);
  };
  const wake = (): void => {
    if (seen && !document.hidden && !raf && !stilled()) raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver((entries) => {
    seen = entries.some((entry) => entry.isIntersecting);
    wake();
  }).observe(host);
  document.addEventListener("visibilitychange", wake);
  reduced.addEventListener("change", () => {
    if (stilled() && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    wake();
  });
  wake();
  return wake;
}
