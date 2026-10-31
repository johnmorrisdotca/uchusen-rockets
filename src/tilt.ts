// Tilt to turn: on a phone or tablet, leaning the device turns a 3D view a little. Pure: when it is offered, and how a reading becomes a turn of the view.

export type TiltMode = "off" | "ask" | "on";

/** Off under reduced motion, on a computer with a mouse, or where the browser has no orientation events; "ask" where it must ask first (iOS: a tap
 * on "Tilt to turn" asks, never the page by itself); else on. */
export function tiltMode(env: {
  reducedMotion: boolean;
  coarsePointer: boolean;
  hasOrientation: boolean;
  needsPermission: boolean;
}): TiltMode {
  if (env.reducedMotion || !env.coarsePointer || !env.hasOrientation) return "off";
  return env.needsPermission ? "ask" : "on";
}

export interface Reading {
  /** Front to back, -180 to 180 degrees. */
  beta: number | null;
  /** Left to right, -90 to 90 degrees. */
  gamma: number | null;
}

const GAIN = 0.6;
const MAX_TURN = 25;
const MAX_LEAN = 12;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The turn (degrees round, degrees up or down) for a reading, measured from `rest` (how the device was held when tilting began). `angle` is the
 * screen's orientation (0, 90, 180 or 270), so leaning a phone held sideways still turns the view the way it looks. Null for an empty reading. */
export function tiltTurn(reading: Reading, rest: Reading, angle = 0): { azimuth: number; polar: number } | null {
  if (reading.beta === null || reading.gamma === null || rest.beta === null || rest.gamma === null) return null;
  const dBeta = reading.beta - rest.beta;
  const dGamma = reading.gamma - rest.gamma;
  const turn = ((angle % 360) + 360) % 360;
  const [side, lean] =
    turn === 90 ? [dBeta, -dGamma] : turn === 270 ? [-dBeta, dGamma] : turn === 180 ? [-dGamma, -dBeta] : [dGamma, dBeta];
  return { azimuth: clamp(side * GAIN, -MAX_TURN, MAX_TURN) + 0, polar: clamp(-lean * GAIN * 0.5, -MAX_LEAN, MAX_LEAN) + 0 };
}
