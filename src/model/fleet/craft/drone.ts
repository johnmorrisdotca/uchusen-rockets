// The survey drone: a small free-flying probe, 1.6 m long. A round instrument body with a camera and a spectrometer port, a boom with a magnetometer and a sensor head, a dish and four cold-gas pods with their
// jets, and a clamp bar at its foot that rides a hangar cradle. It has no docking collar: a cradle's clamp holds it. Its axis is Y with the nose up (+Y). Metres. Pure: no three.js and no DOM.
import { antenna, cub, hoop, navLight, ringOf, rod, stamp } from "../detail.ts";
import { cyl, revolve } from "../solids.ts";
import type { Piece } from "../../pieces.ts";

/** The drone's own sizes, metres: the body's radius, where it stands, the boom's half length and the foot of the clamp bar. */
export const DRONE = { body: 0.35, y: [0.3, 1.2], boom: 0.6, nose: 1.6 } as const;

/** One cold-gas pod: a small tank with a domed end and a nozzle, standing out of the body at the height of a ring. */
function pod(): Piece[] {
  return [revolve("hull-white", [0, 0.5], [[0.001, -0.14], [0.09, -0.1], [0.09, 0.1], [0.001, 0.14]], 14, { outline: true }), rod("hull-grey-dark", [0, 0, 0.62], [0, 0, 0.72], 0.03, 8)];
}

/**
 * The drone's pieces.
 *
 * @example
 * ```ts
 * import { dronePieces } from "./drone.ts";
 *
 * console.log(dronePieces().length > 50);
 * ```
 */
export function dronePieces(): Piece[] {
  const R = DRONE.body;
  const [y0, y1] = DRONE.y;
  const out: Piece[] = [];
  // the body: a drum with a domed nose and a thrust plate, and the clamp bar at its foot
  out.push(revolve("hull-white", [0, 0], [[0.001, y0], [R, y0], [R, y1], [R * 0.6, y1 + 0.2], [0.001, y1 + 0.26]], 28, { body: true, outline: true }), hoop("hull-grey-dark", R, y0 + 0.06, 0.03, 28, 5), hoop("hull-grey-dark", R, y1 - 0.06, 0.03, 28, 5));
  out.push(cub("hull-grey-dark", [-0.45, 0.45], [0.06, 0.2], [-0.1, 0.1]), rod("hull-grey", [-0.3, 0.2, 0], [-0.3, y0, 0], 0.03, 8), rod("hull-grey", [0.3, 0.2, 0], [0.3, y0, 0], 0.03, 8), cub("hazard", [-0.45, 0.45], [0.2, 0.22], [-0.1, -0.06]));
  // the instruments: a camera and a spectrometer port on the face, a star tracker, a boom out one side with a magnetometer and a sensor head
  out.push(cub("hull-grey-dark", [-0.2, 0.2], [0.55, 0.85], [R - 0.02, R + 0.1]), cyl("black", [0, R + 0.04], 0.1, 0.62, 0.7, 14), cyl("window", [0.08, R + 0.04], 0.04, 0.74, 0.8, 10), cyl("hull-grey-dark", [-0.3, 0.1], 0.07, 1.0, 1.1, 10));
  out.push(rod("hull-grey", [R - 0.05, 0.9, 0], [R + DRONE.boom - 0.05, 0.9, 0], 0.022, 8), cub("hull-grey-dark", [R + DRONE.boom - 0.12, R + DRONE.boom - 0.05], [0.84, 0.96], [-0.06, 0.06]), rod("lamp-blue", [R + DRONE.boom - 0.05, 0.9, 0], [R + DRONE.boom, 0.9, 0], 0.03, 6));
  // four cold-gas pods round the waist, with their jets
  out.push(...stamp(pod(), ringOf(4, 0, 0.6, 45)));
  // a dish and a whip on the nose, lamps
  out.push(...antenna("dish", [0, y1 + 0.2, 0], [0, 1, 0], 0.35, "survey-drone"), ...antenna("whip", [-0.12, y1 + 0.15, 0.1], [-0.2, 1, 0], 0.28, "survey-drone"), ...navLight("port", R, (270 * Math.PI) / 180, 1.05, 0.03), ...navLight("starboard", R, (90 * Math.PI) / 180, 1.05, 0.03), ...navLight("strobe", R, 0, 0.35, 0.03));
  return out;
}
