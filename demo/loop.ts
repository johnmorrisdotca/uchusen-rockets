// A small frame loop for the diagram pages. It runs only while the host is on screen and the tab is shown, asks for a frame at most 30 times a second, and never starts for a reader who asked for less motion.

/**
 * Calls `step(ms)` about 30 times a second, ms being the time since the loop first ran. Nothing is asked for out of sight, on a hidden tab, or with reduced motion.
 * @param host The element whose being on screen keeps the loop going.
 * @param step Draws the picture at that time.
 * @returns Whether a loop was started (false for reduced motion).
 */
export function everyFrame(host: Element, step: (ms: number) => void): boolean {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) return false;
  let seen = true;
  let raf = 0;
  let begun = 0;
  let last = 0;
  const tick = (now: number): void => {
    raf = 0;
    if (!seen || document.hidden || reduced.matches) return;
    raf = requestAnimationFrame(tick);
    if (begun === 0) begun = now;
    if (now - last < 33) return;
    last = now;
    step(now - begun);
  };
  const wake = (): void => {
    if (seen && !document.hidden && !raf && !reduced.matches) raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver((entries) => {
    seen = entries.some((entry) => entry.isIntersecting);
    wake();
  }).observe(host);
  document.addEventListener("visibilitychange", wake);
  reduced.addEventListener("change", () => {
    if (reduced.matches && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    wake();
  });
  wake();
  return true;
}
