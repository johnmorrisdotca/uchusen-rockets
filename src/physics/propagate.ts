// Moving a craft forward in time under any acceleration (gravity from the scene's bodies, an engine, or both), in fixed steps. Pure: the caller says how long, and nothing reads a clock.
// Ported from Orbiter (https://github.com/orbitersim/orbiter), Src/Orbiter/BodyIntegrator.cpp: the linear parts of RK4_LinAng and of the
// symplectic SY2_LinAng, SY4_LinAng, SY6_LinAng and SY8_LinAng (Yoshida's coefficients, as Orbiter has them). Copyright (c) 2000-2026
// Martin Schweiger, MIT licence (LICENSES/Orbiter-MIT.txt). Changed in the port: the turning of the craft is left to a later step; the
// four symplectic methods share one loop built from their weights; each step starts from a fresh acceleration where Orbiter reuses the
// last step's; the time of each evaluation is absolute where Orbiter gives a fraction of its frame.
import { addScaled, type Vec3 } from "./vector.ts";

/**
 * Where a craft is and how fast it goes at a time: seconds from any start the caller picks, metres and metres a second.
 *
 * @example
 * ```ts
 * import type { State } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const start: State = { t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0] };
 * console.log(start.t);
 * ```
 */
export interface State {
  t: number;
  position: Vec3;
  velocity: Vec3;
}

/**
 * What pulls or pushes the craft: its acceleration (metres a second squared) at a time, place and speed. Gravity from the scene's bodies is `gravityAt(position, bodiesAt(t))`; an engine adds its thrust over the craft's mass.
 *
 * @example
 * ```ts
 * import { gravityAt, type Acceleration } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earthOnly: Acceleration = (_t, position) => gravityAt(position, [{ gm: 3.986004418e14, position: [0, 0, 0] }]);
 * console.log(earthOnly(0, [7_000_000, 0, 0], [0, 0, 0])[0].toFixed(3));
 * ```
 */
export type Acceleration = (t: number, position: Vec3, velocity: Vec3) => Vec3;

/**
 * How a step is taken. `rk4` is the classic fourth-order Runge-Kutta, right for forces that depend on the speed (drag). `sy2`, `sy4`, `sy6` and `sy8` are symplectic (leapfrog and Yoshida's fourth, sixth and eighth orders): for gravity they keep the energy of an orbit from drifting over many turns.
 *
 * @example
 * ```ts
 * import type { Method } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const longCoast: Method = "sy4";
 * console.log(longCoast);
 * ```
 */
export type Method = "rk4" | "sy2" | "sy4" | "sy6" | "sy8";

/** Yoshida's weights from the middle out, after the centre one, as Orbiter's SY4, SY6 and SY8 hold them. */
const CBRT2 = 1.25992104989487319066654436028;
const WEIGHTS: Record<Exclude<Method, "rk4">, readonly number[]> = {
  sy2: [],
  sy4: [1 / (2 - CBRT2)],
  sy6: [-0.117767998417887e1, 0.235573213359357e0, 0.784513610477560e0],
  sy8: [0.311790812418427e0, -0.155946803821447e1, -0.167896928259640e1, 0.166335809963315e1, -0.106458714789183e1, 0.136934946416871e1, 0.629030650210433e0],
};

/** The kicks `d` and the drifts `c` of a symmetric symplectic method: `d` is the weights mirrored round the centre one, each drift the mean of the kicks beside it. */
function kicksAndDrifts(weights: readonly number[]): { d: number[]; c: number[] } {
  const centre = 1 - 2 * weights.reduce((sum, w) => sum + w, 0);
  const d = [...[...weights].reverse(), centre, ...weights];
  const c = [d[0]! / 2, ...d.slice(1).map((w, i) => (d[i]! + w) / 2), d[d.length - 1]! / 2];
  return { d, c };
}
const SYMPLECTIC = Object.fromEntries(Object.entries(WEIGHTS).map(([name, weights]) => [name, kicksAndDrifts(weights)])) as Record<Exclude<Method, "rk4">, { d: number[]; c: number[] }>;

function rk4(state: State, h: number, acceleration: Acceleration): State {
  const { t, position: p, velocity: v } = state;
  const h2 = h / 2;
  const a0 = acceleration(t, p, v);
  const va = addScaled(v, a0, h2);
  const a1 = acceleration(t + h2, addScaled(p, v, h2), va);
  const vb = addScaled(v, a1, h2);
  const a2 = acceleration(t + h2, addScaled(p, va, h2), vb);
  const vc = addScaled(v, a2, h);
  const a3 = acceleration(t + h, addScaled(p, vb, h), vc);
  const h6 = h / 6;
  const sum = (x0: Vec3, x1: Vec3, x2: Vec3, x3: Vec3, k: 0 | 1 | 2) => x0[k] + 2 * (x1[k] + x2[k]) + x3[k];
  return {
    t: t + h,
    position: [p[0] + sum(v, va, vb, vc, 0) * h6, p[1] + sum(v, va, vb, vc, 1) * h6, p[2] + sum(v, va, vb, vc, 2) * h6],
    velocity: [v[0] + sum(a0, a1, a2, a3, 0) * h6, v[1] + sum(a0, a1, a2, a3, 1) * h6, v[2] + sum(a0, a1, a2, a3, 2) * h6],
  };
}

function symplectic(state: State, h: number, acceleration: Acceleration, method: Exclude<Method, "rk4">): State {
  const { c, d } = SYMPLECTIC[method];
  let position = state.position;
  let velocity = state.velocity;
  let section = 0;
  for (let i = 0; i < c.length; i++) {
    position = addScaled(position, velocity, h * c[i]!);
    section += c[i]!;
    if (i < d.length) velocity = addScaled(velocity, acceleration(state.t + section * h, position, velocity), h * d[i]!);
  }
  return { t: state.t + h, position, velocity };
}

/**
 * One step of `h` seconds.
 * @param state Where the craft is now.
 * @param h The step, seconds (negative to go back in time).
 * @param acceleration What pulls or pushes the craft.
 * @param method How the step is taken; `sy4` when left out.
 * @returns Where the craft is `h` seconds later.
 * @example
 * ```ts
 * import { gravityAt, step } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earth = [{ gm: 3.986004418e14, position: [0, 0, 0] as const }];
 * const next = step({ t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0] }, 10, (_t, p) => gravityAt(p, earth));
 * console.log(next.t, (next.position[1] / 1000).toFixed(2), "km");
 * ```
 */
export function step(state: State, h: number, acceleration: Acceleration, method: Method = "sy4"): State {
  return method === "rk4" ? rk4(state, h, acceleration) : symplectic(state, h, acceleration, method);
}

/**
 * How to propagate: the step, what pulls, and the method.
 *
 * @example
 * ```ts
 * import { gravityAt, type PropagateOptions } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const options: PropagateOptions = { step: 30, method: "sy4", acceleration: (_t, p) => gravityAt(p, [{ gm: 3.986004418e14, position: [0, 0, 0] }]) };
 * console.log(options.step);
 * ```
 */
export interface PropagateOptions {
  /** The longest step, seconds (positive). The last step is shortened to land on the time asked. */
  step: number;
  acceleration: Acceleration;
  /** `sy4` when left out. */
  method?: Method;
}

/**
 * Moves a craft forward (or back) by a span of time, in steps no longer than `options.step`.
 * @param start Where the craft is at the start.
 * @param seconds How long, seconds (negative to go back).
 * @param options The step, what pulls and the method.
 * @returns Where the craft is at `start.t + seconds`.
 * @example
 * ```ts
 * import { gravityAt, propagate } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earth = [{ gm: 3.986004418e14, position: [0, 0, 0] as const }];
 * const start = { t: 0, position: [7_000_000, 0, 0] as const, velocity: [0, 7_546.05, 0] as const };
 * const end = propagate(start, 5_828.5, { step: 10, acceleration: (_t, p) => gravityAt(p, earth) });
 * console.log((end.position[0] / 1000).toFixed(1), "km, once round");
 * ```
 */
export function propagate(start: State, seconds: number, options: PropagateOptions): State {
  if (!(options.step > 0)) throw new RangeError("step must be a positive number of seconds");
  const count = Math.max(1, Math.ceil(Math.abs(seconds) / options.step - 1e-9));
  const h = seconds / count;
  let state = start;
  for (let i = 0; i < count; i++) state = step(state, h, options.acceleration, options.method);
  return { ...state, t: start.t + seconds };
}

/**
 * The path a craft takes: its state at `points + 1` evenly spaced times from the start to `start.t + seconds`, for drawing an orbit or a trajectory.
 * @param start Where the craft is at the start.
 * @param seconds How long, seconds.
 * @param points How many stretches the path is cut into (1 or more).
 * @param options The step, what pulls and the method.
 * @returns The states, the first being `start`.
 * @example
 * ```ts
 * import { gravityAt, path } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earth = [{ gm: 3.986004418e14, position: [0, 0, 0] as const }];
 * const line = path({ t: 0, position: [7_000_000, 0, 0], velocity: [0, 7_546, 0] }, 5_828, 8, { step: 10, acceleration: (_t, p) => gravityAt(p, earth) });
 * console.log(line.length);
 * ```
 */
export function path(start: State, seconds: number, points: number, options: PropagateOptions): State[] {
  const parts = Math.max(1, Math.floor(points));
  const states = [start];
  for (let i = 1; i <= parts; i++) states.push(propagate(states[i - 1]!, seconds / parts, options));
  return states;
}
