// Playing a trip: which phase a moment of playback is in, how mission time maps onto screen time, and where the craft is and how it is going at any mission time. A pure function of the plan and the time, so any frame can be drawn
// without the ones before it and a test needs no clock.
import type { BodySource } from "./bodies.ts";
import { C, G0 } from "./constants.ts";
import { accelerating, transferPoint } from "./physics.ts";
import { positionKm, type Phase, type Trip, type Vec3 } from "./trip.ts";

/**
 * How fast the screen plays: a multiple of normal speed.
 *
 * @example
 * ```ts
 * import type { PlaySpeed } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const fast: PlaySpeed = 4;
 * console.log(fast);
 * ```
 */
export type PlaySpeed = 0.5 | 1 | 2 | 4;

/**
 * Where in a trip a moment of playback is: the phase, how far through it, the mission time and how many mission seconds each screen second shows.
 *
 * @example
 * ```ts
 * import type { Place } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const words = (place: Place) => `${place.phase.id} ${Math.round(place.fraction * 100)} %`;
 * console.log(typeof words);
 * ```
 */
export interface Place {
  phase: Phase;
  index: number;
  /** How far through the phase, 0 to 1. */
  fraction: number;
  /** Mission seconds from lift-off (negative before). */
  missionS: number;
  /** Mission seconds shown per second on the screen in this phase. */
  scale: number;
}

/**
 * What is true of the craft at a moment: its place, speed, acceleration, the distances, the clocks, the signal time home and how far it has turned round.
 *
 * @example
 * ```ts
 * import type { State } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * const speed = (state: State) => `${Math.round(state.speedMs)} m/s`;
 * console.log(typeof speed);
 * ```
 */
export interface State extends Place {
  dateMs: number;
  /** Which way the engine is firing: not at all, pushing it on, or against its motion. */
  burn: "off" | "forward" | "reverse";
  /** How the speed is measured: from the start or destination (for a ship that burns all the way), from the Earth, the Sun or the destination. */
  speedFrame: "start" | "earth" | "sun" | "destination";
  speedMs: number;
  gamma: number;
  /** The acceleration, in g, positive along the motion. */
  accelG: number;
  /** Path flown, km, and the fraction of the path, 0 to 1. */
  doneKm: number;
  progress: number;
  /** The straight line from the craft to the destination, km. */
  toDestinationKm: number;
  /** The craft's place in the trip's frame, km. */
  positionKm: Vec3;
  /** Time on board since lift-off and time since lift-off in the frame of the places, seconds. */
  shipS: number;
  frameS: number;
  /** How long a signal takes to get home from here, seconds. */
  signalS: number;
  /** How far the craft has turned round, 0 (facing forward) to 1 (facing back). */
  turned: number;
}

/**
 * The total time the screen takes to play a trip at a speed.
 * @param trip A planned trip.
 * @param speed The play speed.
 * @returns Seconds.
 * @example
 * ```ts
 * import { playSeconds, type Trip } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const trip: Trip;
 * console.log(playSeconds(trip, 2));
 * ```
 */
export const playSeconds = (trip: Trip, speed: PlaySpeed = 1): number => trip.phases.reduce((sum, p) => sum + p.screenS, 0) / speed;

/**
 * Which phase a moment of playback is in, and the mission time it shows. Inside a phase the two are linear; across phases the scale changes, which is how a minute of burn and a month of coast both fit on the screen.
 * @param trip A planned trip.
 * @param playbackS Seconds since Play was pressed, at the normal speed (a faster speed multiplies the clock before calling).
 * @returns The phase, how far through it, the mission time and the scale.
 * @example
 * ```ts
 * import { placeAt, type Trip } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const trip: Trip;
 * console.log(placeAt(trip, 0).phase.id, placeAt(trip, 1e9).phase.id);
 * ```
 */
export function placeAt(trip: Trip, playbackS: number): Place {
  let left = Math.max(0, playbackS);
  const last = trip.phases.length - 1;
  for (let index = 0; index <= last; index += 1) {
    const phase = trip.phases[index]!;
    if (left < phase.screenS || index === last) {
      const fraction = Math.min(1, left / phase.screenS);
      return { phase, index, fraction, missionS: phase.startS + fraction * (phase.endS - phase.startS), scale: (phase.endS - phase.startS) / phase.screenS };
    }
    left -= phase.screenS;
  }
  throw new Error("A trip has phases.");
}

const mix = (a: number, b: number, f: number): number => a + (b - a) * f;

/**
 * Everything true of the craft at a moment of playback: its place, speed, acceleration, the distances, the clocks and the signal time home.
 * @param trip A planned trip (one that can be played).
 * @param source Where the places are.
 * @param playbackS Seconds since Play was pressed, at the normal speed.
 * @returns The state.
 * @example
 * ```ts
 * import { stateAt, type BodySource, type Trip } from "@johnmorrisdotca/uchusen-rockets/journey";
 *
 * declare const trip: Trip;
 * declare const source: BodySource;
 * console.log(Math.round(stateAt(trip, source, 30).speedMs));
 * ```
 */
export function stateAt(trip: Trip, source: BodySource, playbackS: number): State {
  const place = placeAt(trip, playbackS);
  const t = place.missionS;
  const dateMs = trip.departMs - trip.liftoffBeforeS * 1000 + t * 1000;
  const base = { ...place, dateMs, shipS: Math.max(0, t), frameS: Math.max(0, t), turned: 0 };
  const dest = (ms: number): Vec3 => positionKm(source, trip.to, ms, trip.frame);
  const home = (p: Vec3, ms: number): number => {
    const earth = positionKm(source, "earth", ms, trip.frame);
    return Math.hypot(p[0] - earth[0], p[1] - earth[1], p[2] - earth[2]) / (C / 1000);
  };
  const b = trip.ballistic;
  if (b) {
    const origin = positionKm(source, trip.from, trip.departMs, trip.frame);
    const id = place.phase.id;
    const f = place.fraction;
    const turned = id === "flip" ? f : id === "brake" || id === "flyby" || id === "arrival" ? 1 : 0;
    let speed = 0;
    let frameName: State["speedFrame"] = "earth";
    let accel = 0;
    let burn: State["burn"] = "off";
    let done = 0;
    let pos: Vec3 = origin;
    if (id === "preheat" || id === "ignition") speed = 0;
    else if (id === "ascent") {
      speed = b.parkSpeed * 1000 * f;
      accel = (b.parkSpeed * 1000) / b.ascentS / G0;
      burn = "forward";
    } else if (id === "burn") {
      speed = mix(b.parkSpeed, b.burnEndSpeed, f) * 1000;
      accel = (trip.dv.departure / b.burnS) / G0;
      burn = "forward";
    } else if (id === "coast" || id === "flip") {
      const tau = t - (b.ascentS + b.burnS);
      const p = transferPoint(b.mu, b.r1, b.r2, b.theta0, Math.min(tau, b.transitS));
      pos = [p.r * Math.cos(p.theta), p.r * Math.sin(p.theta), 0];
      speed = p.v * 1000;
      frameName = trip.frame === "sun" ? "sun" : "earth";
      done = arcAt(b.arc, Math.min(tau, b.transitS) / b.transitS);
    } else {
      pos = dest(dateMs);
      done = trip.pathKm;
      frameName = "destination";
      if (id === "brake") {
        speed = mix(b.captureSpeedIn, b.captureSpeedOut, f) * 1000;
        accel = -(trip.dv.arrival / b.brakeS) / G0;
        burn = "reverse";
      } else if (id === "flyby") speed = b.captureSpeedIn * 1000;
      else speed = (trip.verdict.level === "flyby" ? b.captureSpeedIn : b.captureSpeedOut) * 1000;
    }
    if (id === "ascent" || id === "burn") done = 0;
    const target = dest(dateMs);
    return {
      ...base,
      burn,
      speedFrame: frameName,
      speedMs: speed,
      gamma: 1,
      accelG: accel,
      doneKm: done,
      progress: Math.min(1, done / trip.pathKm),
      toDestinationKm: Math.hypot(target[0] - pos[0], target[1] - pos[1], target[2] - pos[2]),
      positionKm: pos,
      signalS: home(pos, dateMs),
      turned,
    };
  }
  const c = trip.continuous!;
  const tb = c.burnS;
  const total = tb * 2 + c.flipS;
  const tt = Math.max(0, Math.min(t, total));
  let x = 0;
  let v = 0;
  let gamma = 1;
  let proper = 0;
  let accel = 0;
  let burn: State["burn"] = "off";
  const peak = accelerating(c.a, tb);
  if (tt <= tb) {
    const s = accelerating(c.a, tt);
    ({ x, v, gamma, proper } = s);
    accel = t > 0 ? 1 : 0;
    burn = t > 0 ? "forward" : "off";
  } else if (tt <= tb + c.flipS) {
    x = peak.x + peak.v * (tt - tb);
    v = peak.v;
    gamma = peak.gamma;
    proper = peak.proper + (tt - tb) / peak.gamma;
  } else {
    const s = accelerating(c.a, total - tt);
    const d = (peak.x * 2 + peak.v * c.flipS);
    x = d - s.x;
    v = s.v;
    gamma = s.gamma;
    proper = 2 * peak.proper + c.flipS / peak.gamma - s.proper;
    accel = -1;
    burn = "reverse";
  }
  const path = trip.pathKm * 1000;
  const turned = place.phase.id === "flip" ? place.fraction : tt > tb + c.flipS ? 1 : 0;
  const f = path > 0 ? x / path : 0;
  const pos: Vec3 = [mix(c.from[0], c.to[0], f), mix(c.from[1], c.to[1], f), mix(c.from[2], c.to[2], f)];
  return {
    ...base,
    burn: place.phase.id === "arrival" ? "off" : burn,
    speedFrame: "start",
    speedMs: place.phase.id === "arrival" ? 0 : v,
    gamma,
    accelG: place.phase.id === "arrival" ? 0 : (accel * c.a) / G0,
    doneKm: x / 1000,
    progress: Math.min(1, Math.max(0, f)),
    toDestinationKm: Math.max(0, (path - x) / 1000),
    positionKm: pos,
    shipS: t <= 0 ? 0 : proper,
    frameS: Math.max(0, t),
    signalS: home(pos, dateMs),
    turned,
  };
}

/** The path flown, km, a fraction of the way through the transit (0 to 1), from the table of cumulative lengths. */
function arcAt(arc: readonly number[], fraction: number): number {
  const at = Math.max(0, Math.min(1, fraction)) * (arc.length - 1);
  const i = Math.min(arc.length - 2, Math.floor(at));
  return mix(arc[i]!, arc[i + 1]!, at - i);
}
