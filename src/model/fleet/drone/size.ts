// The drone's overall size, measured from its pieces. Pure: no three.js and no DOM.
import { boundsOfPieces } from "../../pieces.ts";
import { dronePieces } from "./index.ts";

const b = boundsOfPieces(dronePieces(true));
/** The drone's overall size, metres: across (x), long (z), high (y). */
export const DRONE_SIZE = {
  width: Number((b.max[0] - b.min[0]).toFixed(3)),
  length: Number((b.max[2] - b.min[2]).toFixed(3)),
  height: Number((b.max[1] - b.min[1]).toFixed(3)),
  min: b.min,
  max: b.max,
} as const;
