// Orbital elements from a position and a speed, and back again after a time: the two-body orbit, closed or open. Pure.
// Ported from Orbiter (https://github.com/orbitersim/orbiter), Src/Orbiter/Element.cpp, class Elements: Calculate, EccAnomaly,
// TrueAnomaly_from_EccAnomaly, RelPos, Pol2Crt and PosVel. Copyright (c) 2000-2026 Martin Schweiger, MIT licence (LICENSES/Orbiter-MIT.txt).
// Changed in the port: a right-handed frame with z as the pole (Orbiter's is left-handed with y as the pole, so its y and z swap
// and its H = V x R becomes R x V); no cached state; the Kepler solver may take 64 rounds where Orbiter takes 16, so a long
// hyperbolic path still converges; an orbit in the equator's plane run backwards (i = 180 degrees) takes the equatorial branch,
// where Orbiter divides by zero; the inclination, the node, the argument of periapsis and the true anomaly are taken with atan2 in place of
// Orbiter's acos and sign tests (the same angles, without acos's loss of half the digits next to 0 and pi, worth a metre in low orbit
// and a kilometre round the Sun).
import { cross, dot, length, type Vec3 } from "./vector.ts";

const TAU = 2 * Math.PI;
const E_CIRCLE_LIMIT = 1e-8;
const I_NOINC_LIMIT = 1e-8;
const ROUNDS = 64;
const TOLERANCE = 1e-14;

const posAngle = (angle: number): number => {
  const a = angle % TAU;
  return a >= 0 ? a : a + TAU;
};
const clampedAcos = (x: number): number => Math.acos(Math.max(-1, Math.min(1, x)));
const clampStep = (x: number): number => Math.max(-1, Math.min(1, x));

/**
 * A position and a speed, in metres and metres a second, in one frame.
 *
 * @example
 * ```ts
 * import type { StateVector } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const leo: StateVector = { position: [6_778_000, 0, 0], velocity: [0, 7_669, 0] };
 * console.log(leo.velocity[1]);
 * ```
 */
export interface StateVector {
  position: Vec3;
  velocity: Vec3;
}

/**
 * The shape of an orbit and where on it a craft is, worked out from one position and speed (the osculating elements). Angles in radians, lengths in metres, times in seconds.
 *
 * @example
 * ```ts
 * import { elementsOf, type Elements } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const orbit: Elements = elementsOf(3.986004418e14, [7_000_000, 0, 0], [0, 7_546, 0]);
 * console.log(orbit.e.toFixed(4), (orbit.period / 60).toFixed(1));
 * ```
 */
export interface Elements {
  /** The gravitational parameter the elements were worked with, m^3/s^2. */
  gm: number;
  /** Semi-major axis, metres: negative for an open (hyperbolic) path. */
  a: number;
  /** Eccentricity: 0 a circle, below 1 an ellipse, above 1 a hyperbola. */
  e: number;
  /** Inclination to the frame's x-y plane, 0 to pi. */
  i: number;
  /** Longitude of the ascending node, 0 to 2 pi (0 for an orbit in the plane). */
  node: number;
  /** Argument of periapsis, from the node, 0 to 2 pi (0 for a circle). */
  argPeriapsis: number;
  /** Longitude of periapsis: the node plus the argument of periapsis. */
  longitudePeriapsis: number;
  /** True anomaly now: the angle from periapsis to the craft. */
  trueAnomaly: number;
  /** Eccentric anomaly now (the hyperbolic anomaly on an open path). */
  eccentricAnomaly: number;
  /** Mean anomaly now. */
  meanAnomaly: number;
  /** Mean motion, radians a second. */
  meanMotion: number;
  /** Time once round, seconds; Infinity for an open path. */
  period: number;
  /** Distance of periapsis from the centre, metres. */
  periapsis: number;
  /** Distance of apoapsis from the centre, metres; Infinity for an open path. */
  apoapsis: number;
  /** Semi-latus rectum `a (1 - e^2)`, metres. */
  semiLatus: number;
  /** Seconds to the next periapsis (for an open path, to the one periapsis; negative once it is passed). */
  timeToPeriapsis: number;
}

/**
 * The eccentric anomaly from the mean anomaly: Kepler's equation `M = E - e sin E` for an ellipse, `M = e sinh E - E` for a hyperbola, solved by Newton's method with each step held to one radian, as Orbiter does.
 * @param meanAnomaly The mean anomaly, radians.
 * @param e The eccentricity, 0 or more (not exactly 1).
 * @returns The eccentric anomaly (the hyperbolic anomaly when `e` is above 1), radians.
 * @example
 * ```ts
 * import { eccentricAnomaly } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(eccentricAnomaly(1, 0.2).toFixed(6), eccentricAnomaly(2, 1.5).toFixed(6));
 * ```
 */
export function eccentricAnomaly(meanAnomaly: number, e: number): number {
  const ma = meanAnomaly;
  let big = ma;
  if (e < 1) {
    let res = ma - big + e * Math.sin(big);
    if (Math.abs(res) > Math.abs(ma)) {
      big = 0;
      res = ma;
    }
    for (let i = 0; Math.abs(res) > TOLERANCE && i < ROUNDS; i++) {
      big += clampStep(res / (1 - e * Math.cos(big)));
      res = ma - big + e * Math.sin(big);
    }
  } else {
    let res = ma - e * Math.sinh(big) + big;
    if (Math.abs(res) > Math.abs(ma)) {
      big = 0;
      res = ma;
    }
    for (let i = 0; Math.abs(res) > TOLERANCE && i < ROUNDS; i++) {
      big += clampStep(res / (e * Math.cosh(big) - 1));
      res = ma - e * Math.sinh(big) + big;
    }
  }
  return big;
}

const trueFromEccentric = (ea: number, e: number): number => {
  if (e < 1) return 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(0.5 * ea));
  const chea = Math.cosh(ea);
  const tra = clampedAcos((e - chea) / (e * chea - 1));
  return ea >= 0 ? tra : -tra;
};

/**
 * The orbital elements of a craft about one body, from its position and speed relative to that body (Orbiter's `Elements::Calculate`).
 * @param gm The gravitational parameter of the body (plus the craft's, which is nothing for a craft), m^3/s^2.
 * @param position The craft's position from the body's centre, metres.
 * @param velocity The craft's speed relative to the body, metres a second.
 * @returns The elements: shape, plane, where the craft is on it, its period and the time to periapsis.
 * @example
 * ```ts
 * import { elementsOf } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const gto = elementsOf(3.986004418e14, [6_563_000, 0, 0], [0, 10_240, 0]);
 * console.log(((gto.apoapsis - 6_378_137) / 1000).toFixed(0), "km apogee");
 * ```
 */
export function elementsOf(gm: number, position: Vec3, velocity: Vec3): Elements {
  const v2 = dot(velocity, velocity);
  const r = length(position);
  const h = cross(position, velocity);
  const hl = length(h);
  const rv = dot(position, velocity);
  const a = (r * gm) / (2 * gm - r * v2);
  const k = 1 / r - 1 / a;
  const q = rv / gm;
  const ev: Vec3 = [position[0] * k - velocity[0] * q, position[1] * k - velocity[1] * q, position[2] * k - velocity[2] * q];
  const e = length(ev);
  const closed = e < 1;
  const hxy = Math.hypot(h[0], h[1]);
  const i = Math.atan2(hxy, h[2]);
  const hu: Vec3 = [h[0] / hl, h[1] / hl, h[2] / hl];
  /** The angle from `from` to `to` in the orbit's plane, in the direction of motion, 0 to 2 pi. */
  const along = (from: Vec3, to: Vec3): number => posAngle(Math.atan2(dot(cross(from, to), hu), dot(from, to)));
  const semiLatus = Math.max(0, a * (1 - e * e));
  const meanMotion = closed ? Math.sqrt(gm / (a * a * a)) : Math.sqrt(gm / (-a * a * a));
  const period = closed ? TAU / meanMotion : Infinity;

  const inclined = i > I_NOINC_LIMIT && hxy > I_NOINC_LIMIT * hl;
  const n: Vec3 = inclined ? [-h[1] / hxy, h[0] / hxy, 0] : [1, 0, 0];
  const node = inclined ? posAngle(Math.atan2(n[1], n[0])) : 0;

  let argPeriapsis = 0;
  if (e > E_CIRCLE_LIMIT) {
    if (inclined) {
      argPeriapsis = along(n, ev);
    } else {
      argPeriapsis = Math.atan2(ev[1], ev[0]);
      if (argPeriapsis < 0) argPeriapsis += TAU;
    }
  }
  let longitudePeriapsis = node + argPeriapsis;
  if (longitudePeriapsis >= TAU) longitudePeriapsis -= TAU;

  const trueAnomaly = along(e > E_CIRCLE_LIMIT ? ev : n, position);

  let ea: number;
  let ma: number;
  let timeToPeriapsis: number;
  if (closed) {
    ea = e > E_CIRCLE_LIMIT ? Math.atan2(rv * Math.sqrt(a / gm), a - r) : trueAnomaly;
    ma = ea - e * Math.sin(ea);
    timeToPeriapsis = -ma / meanMotion;
    if (timeToPeriapsis < 0) timeToPeriapsis += period;
  } else {
    const cosTrue = Math.cos(trueAnomaly);
    ea = Math.acosh((e + cosTrue) / (1 + e * cosTrue));
    if (trueAnomaly >= Math.PI) ea = -ea;
    ma = e * Math.sinh(ea) - ea;
    timeToPeriapsis = -ma / meanMotion;
  }

  return {
    gm,
    a,
    e,
    i,
    node,
    argPeriapsis,
    longitudePeriapsis,
    trueAnomaly,
    eccentricAnomaly: ea,
    meanAnomaly: ma,
    meanMotion,
    period,
    periapsis: a - a * e,
    apoapsis: closed ? a + a * e : Infinity,
    semiLatus,
    timeToPeriapsis,
  };
}

/** A point at distance `r` and angle `u` from the node, turned into the frame (Orbiter's `Pol2Crt`). */
function toFrame(el: Elements, r: number, u: number): Vec3 {
  const so = Math.sin(u);
  const co = Math.cos(u);
  const st = Math.sin(el.node);
  const ct = Math.cos(el.node);
  const ci = Math.cos(el.i);
  return [r * (ct * co - st * so * ci), r * (st * co + ct * so * ci), r * so * Math.sin(el.i)];
}

/**
 * Where a craft on a two-body orbit is a time after its elements were taken, and its speed (Orbiter's `Elements::PosVel`): Kepler's equation, with no other pull.
 * @param elements The elements, from {@link elementsOf}.
 * @param seconds The time since the elements were taken, seconds (negative for before).
 * @returns The position from the body's centre (metres) and the speed (metres a second), in the frame of the elements.
 * @example
 * ```ts
 * import { elementsOf, stateOf } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const orbit = elementsOf(3.986004418e14, [7_000_000, 0, 0], [0, 7_546, 0]);
 * const later = stateOf(orbit, orbit.period / 2);
 * console.log((later.position[0] / 1000).toFixed(0), "km");
 * ```
 */
export function stateOf(elements: Elements, seconds: number): StateVector {
  const { e, gm, semiLatus } = elements;
  const ma = elements.meanAnomaly + elements.meanMotion * seconds;
  let ta: number;
  if (e < E_CIRCLE_LIMIT) ta = ma;
  else ta = trueFromEccentric(eccentricAnomaly(e < 1 ? posAngle(ma) : ma, e), e);
  const r = semiLatus / (1 + e * Math.cos(ta));
  const muh = Math.sqrt(gm / semiLatus);
  const vx = -muh * Math.sin(ta);
  const vz = muh * (e + Math.cos(ta));
  return { position: toFrame(elements, r, ta + elements.argPeriapsis), velocity: toFrame(elements, Math.hypot(vx, vz), Math.atan2(vz, vx) + elements.argPeriapsis) };
}
