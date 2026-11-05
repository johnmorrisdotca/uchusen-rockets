// The forward view of a trip: stars bunch toward the nose as speed rises, and the destination grows. Pure, so a test can check it without a page.

/**
 * Where one star sits in a forward view, and how blue it is.
 * @param x Across the picture, 0 to 1.
 * @param y Down the picture, 0 to 1.
 * @param beta Speed as a fraction of the speed of light, 0 to 1.
 * @returns The star's place, still 0 to 1, and `blue` from 0 at the edge to 1 at the nose.
 */
export function forwardStar(x: number, y: number, beta: number): { x: number; y: number; blue: number } {
  const pull = Math.min(0.99, Math.max(0, beta)) * 0.85;
  const nx = pull === 0 ? x : 0.5 + (x - 0.5) * (1 - pull);
  const ny = pull === 0 ? y : 0.5 + (y - 0.5) * (1 - pull);
  const reach = Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) / Math.SQRT1_2);
  return { x: nx, y: ny, blue: 1 - reach };
}

/**
 * How far the destination has grown, 0 at departure and 1 at arrival. The growth is slow at first.
 * @param progress How much of the trip is behind, 0 to 1.
 * @returns The growth, 0 to 1.
 */
export function destinationGrow(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return t * t;
}
