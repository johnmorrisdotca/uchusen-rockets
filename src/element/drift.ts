// A craft thrown across the compare picture keeps its speed, and a centre that leaves one edge comes back at the opposite edge.

/** How far a thrown point moves. The speed stays until something stops it. */
export function coast(at: number, speed: number, dt: number): number {
  return at + speed * dt;
}

/**
 * The pixel shift that brings a centre back inside the picture.
 * Past the far edge, it enters at the near edge. Still inside, it stays.
 */
export function wrapShift(center: number, view: number): number {
  if (view <= 0) return 0;
  if (center >= view) return -view;
  if (center < 0) return view;
  return 0;
}
