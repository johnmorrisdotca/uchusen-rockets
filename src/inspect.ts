// Where the drones fly while they look over a finished ship. Nothing is built. The path stays outside the hull, the drones keep apart, and each one holds still for a moment with its light on one spot. Pure.
import type { HullBox } from "./swarm.ts";

/**
 * One drone at one moment: where it is, the spot it is looking at, and whether it is holding still.
 * @example
 * ```ts
 * import type { InspectPlace } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const place: InspectPlace = { where: [8, 1, 0], part: [2, 1, 0], paused: false };
 * console.log(place.paused);
 * ```
 */
export interface InspectPlace {
  where: readonly [number, number, number];
  part: readonly [number, number, number];
  /** True while the drone holds still and the light stays on the hull. */
  paused: boolean;
}

const LOOP = 14;
const HOLD = 3;
/** Seats on one ring. Further drones take a wider ring, and each seat stays in its own slice of the circle. */
const SEATS = 4;

/**
 * One drone's place around a finished hull.
 * @param index Which drone, from 0.
 * @param count How many are flying, from 1 to 100.
 * @param age Seconds since the flight started.
 * @param hull The ship's box, in metres.
 * @param speed How fast the clock runs. 1 is the ordinary pace.
 * @returns The drone, the spot on the hull, and whether it is paused.
 * @example
 * ```ts
 * import { inspectAt } from "@johnmorrisdotca/uchusen-rockets";
 *
 * const place = inspectAt(0, 4, 1, { min: [-2, 0, -2], max: [2, 10, 2] });
 * console.log(place.where[0] > 2 ? "out" : "in");
 * ```
 */
export function inspectAt(index: number, count: number, age: number, hull: HullBox, speed = 1): InspectPlace {
  const n = Math.max(1, Math.min(100, Math.floor(count) || 1));
  const i = ((Math.floor(index) % n) + n) % n;
  const pace = Math.max(0.25, speed);
  const span = LOOP / pace;
  const hold = Math.min(span * 0.45, HOLD / pace);
  const fly = Math.max(0.5, span - hold);
  const local = mod(age + i * 1.7, span);
  const paused = local >= fly;
  const along = paused ? 1 : local / fly;
  const seat = i % SEATS;
  const lane = Math.floor(i / SEATS);
  const lanes = Math.max(1, Math.ceil(n / SEATS));
  const slot = (Math.PI * 2) / SEATS;
  const spin = seat * slot + Math.sin(along * Math.PI * 2 + i) * slot * 0.35;
  const cx = (hull.min[0] + hull.max[0]) / 2;
  const cz = (hull.min[2] + hull.max[2]) / 2;
  const hx = Math.max(0.5, (hull.max[0] - hull.min[0]) / 2);
  const hz = Math.max(0.5, (hull.max[2] - hull.min[2]) / 2);
  const tall = Math.max(1, hull.max[1] - hull.min[1]);
  const gap = Math.max(4, Math.max(hx, hz, tall) * 0.08);
  const dx = Math.cos(spin);
  const dz = Math.sin(spin);
  const y = hull.min[1] + tall * ((lane + 0.5) / lanes);
  const face = Math.min(Math.abs(dx) < 1e-6 ? Infinity : hx / Math.abs(dx), Math.abs(dz) < 1e-6 ? Infinity : hz / Math.abs(dz));
  const part: [number, number, number] = [cx + dx * face, y, cz + dz * face];
  const out = face + gap + lane * Math.max(4, gap);
  const where: [number, number, number] = [cx + dx * out, y, cz + dz * out];
  return { where, part, paused };
}

const mod = (value: number, span: number): number => ((value % span) + span) % span;
