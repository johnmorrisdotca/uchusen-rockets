// Where the Earth behind the rocket sits and how it turns, as plain sums: the same for the line globe and the realistic one. Pure.

/** One whole turn takes this long. Slow on purpose, so a few draws a second are enough. */
export const TURN_SECONDS = 720;
/** The moment the turn starts from: the Sun over the north, so the part in view is lit. */
export const START_TIME = Date.UTC(2026, 5, 21, 12);
/** Where the view is centred when the turn starts: the Sun is over longitude 0 at the start, up and to the left of this. */
export const CENTRE = { lon: 18, lat: 8 };

const WIDEST_STEP_S = 1;

/** The turn after this many seconds on screen. The Sun keeps its place in the picture while the land turns under it, as a time-lapse from orbit does, so the part in view never goes dark. */
export function turnAt(seconds: number): { yaw: number; time: number } {
  return { yaw: (seconds * 360) / TURN_SECONDS, time: START_TIME + (seconds * 86_400_000) / TURN_SECONDS };
}

/** The seconds a timer's gap adds to the turn: a late timer (a busy page) is not a jump. */
export const stepSeconds = (gapMs: number): number => Math.min(WIDEST_STEP_S, Math.max(0, gapMs) / 1000);

export interface Placement {
  /** The disc's radius, in CSS pixels. */
  radius: number;
  /** How far the disc's middle is from the box's middle, in CSS pixels. */
  panX: number;
  panY: number;
}

/** The Earth as a photograph from orbit shows it: much wider than the view, its edge an arc across the middle of the picture and the planet filling everything under it. */
export function placementIn(width: number, height: number): Placement {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const radius = Math.max(w, h) * 0.86;
  const edgeFromTop = h * 0.5;
  return { radius, panX: w * 0.1, panY: edgeFromTop + radius - h / 2 };
}
