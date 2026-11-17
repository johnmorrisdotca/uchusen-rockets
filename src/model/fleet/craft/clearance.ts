// Does a craft fit a door? Width and height of the clear opening against the craft's own envelope, with a margin on every side. The craft goes through the door at any turn about its long axis, so the larger of its
// two cross-section sizes is taken against the door's smaller side. Pure: no three.js and no DOM.
import { boundsOfPieces } from "../../pieces.ts";
import type { Piece } from "../../pieces.ts";
import { DOOR_MARGIN, DOORS, type Door } from "./doors.ts";

/** A craft's envelope, metres: across the long axis in X and in Z, and along it in Y. */
export interface Envelope {
  across: number;
  deep: number;
  long: number;
}

/** The envelope of a set of pieces. */
export function envelopeOf(pieces: readonly Piece[]): Envelope {
  const b = boundsOfPieces(pieces);
  const size = (axis: 0 | 1 | 2) => Number((b.max[axis] - b.min[axis]).toFixed(2));
  return { across: size(0), deep: size(2), long: size(1) };
}

/** What a craft leaves of a door: the spare room on the tighter side, with the margin taken off. Negative: it does not pass. */
export function spareOf(env: Envelope, door: Pick<Door, "wide" | "high">, margin = DOOR_MARGIN): number {
  const bigger = Math.max(env.across, env.deep);
  const smaller = Math.min(env.across, env.deep);
  const flat = Math.min(door.wide - bigger, door.high - smaller);
  const upright = Math.min(door.wide - smaller, door.high - bigger);
  return Number((Math.max(flat, upright) - 2 * margin).toFixed(2));
}

/** The tightest door a craft meets and how much it has to spare there. */
export function tightest(env: Envelope, doors: readonly Door[] = DOORS): { door: Door; spare: number } {
  return doors.map((door) => ({ door, spare: spareOf(env, door) })).sort((a, b) => a.spare - b.spare)[0];
}
