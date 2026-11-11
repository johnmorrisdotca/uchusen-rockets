// Burns: a change of speed all at once, or an engine firing for a while with the craft's mass falling, pointed along the orbit's
// directions or a fixed one; and a list of planned burns flown with the coasts between them. Pure.
// Prograde, retrograde, normal and antinormal are Orbiter's attitude modes (Src/Orbiter/Vessel.cpp, the navcomp's turn modes: the speed
// relative to the body orbited, and V x R in Orbiter's left-handed frame, which is R x V here); radial in and out are added here. The burn centred on its planned point is the timing of Orbiter's plane-alignment display
// (Src/Orbiter/MfdAlign.cpp: start at the node's time less half the burn), and the impulse along the speed is that of its transfer
// display (Src/Orbiter/MfdTransfer.cpp, CalcElements). Copyright (c) 2000-2026 Martin Schweiger, MIT licence (LICENSES/Orbiter-MIT.txt).
// Written here: the finite burn as an acceleration in the propagator, with the mass falling at the engine's flow, in place of Orbiter's
// per-frame vessel update; the plan of several burns.
import type { StateVector } from "./elements.ts";
import { propagate, type Acceleration, type Method, type State } from "./propagate.ts";
import { burnSeconds, deltaV, massFlow, type Engine } from "./rocket.ts";
import { addScaled, cross, length, scale, sub, type Vec3 } from "./vector.ts";

/**
 * Which way a burn pushes. The named ones follow the craft's motion round the body it orbits: `prograde` along its speed, `retrograde` against it, `normal` along the orbit's angular momentum (to the north of a west-to-east orbit), `antinormal` the other way, `radial-out` away from the body and `radial-in` towards it. A vector is a fixed direction in the frame.
 *
 * @example
 * ```ts
 * import type { Direction } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const raise: Direction = "prograde";
 * const fixed: Direction = [1, 0, 0];
 * console.log(raise, fixed);
 * ```
 */
export type Direction = "prograde" | "retrograde" | "normal" | "antinormal" | "radial-out" | "radial-in" | Vec3;

const unit = (v: Vec3): Vec3 => {
  const l = length(v);
  if (!(l > 0)) throw new RangeError("a direction needs a length");
  return scale(v, 1 / l);
};

/**
 * The unit vector a direction points along, for a craft at a position and speed relative to the body it orbits.
 * @param direction The direction.
 * @param position The craft's position from the body's centre, metres.
 * @param velocity The craft's speed relative to the body, metres a second.
 * @returns A unit vector in the frame.
 * @example
 * ```ts
 * import { directionOf } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(directionOf("normal", [7_000_000, 0, 0], [0, 7_500, 0]));
 * ```
 */
export function directionOf(direction: Direction, position: Vec3, velocity: Vec3): Vec3 {
  switch (direction) {
    case "prograde":
      return unit(velocity);
    case "retrograde":
      return scale(unit(velocity), -1);
    case "normal":
      return unit(cross(position, velocity));
    case "antinormal":
      return scale(unit(cross(position, velocity)), -1);
    case "radial-out":
      return unit(position);
    case "radial-in":
      return scale(unit(position), -1);
    default:
      return unit(direction);
  }
}

/**
 * Where the body the craft orbits is, and how fast it goes, at a time: the named directions are taken from it. Left out, it stands still at the frame's origin.
 *
 * @example
 * ```ts
 * import type { Centre } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earthAtRest: Centre = () => ({ position: [0, 0, 0], velocity: [0, 0, 0] });
 * console.log(earthAtRest(0).position);
 * ```
 */
export type Centre = (t: number) => StateVector;
const ORIGIN: Centre = () => ({ position: [0, 0, 0], velocity: [0, 0, 0] });

/**
 * A change of speed all at once (an impulsive burn), as a planning tool treats a short burn.
 * @param state The craft before the burn.
 * @param dv The change of speed, metres a second.
 * @param direction Which way.
 * @param centre Where the body the craft orbits is; left out, at the origin and still.
 * @returns The craft just after: the same place and time, the new speed.
 * @example
 * ```ts
 * import { elementsOf, impulse } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const after = impulse({ t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0] }, 2_400, "prograde");
 * console.log(((elementsOf(3.986004418e14, after.position, after.velocity).apoapsis - 6_378_137) / 1000).toFixed(0), "km apogee");
 * ```
 */
export function impulse(state: State, dv: number, direction: Direction, centre: Centre = ORIGIN): State {
  const c = centre(state.t);
  const along = directionOf(direction, sub(state.position, c.position), sub(state.velocity, c.velocity));
  return { ...state, velocity: addScaled(state.velocity, along, dv) };
}

/**
 * When to start a burn so that it is centred on a planned point, as Orbiter's plane-alignment display times one: the point's time less half the burn.
 * @param centreTime When the planned point is reached, seconds.
 * @param seconds How long the burn lasts, seconds.
 * @returns When to start, seconds.
 * @example
 * ```ts
 * import { burnStart } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(burnStart(1_000, 120));
 * ```
 */
export const burnStart = (centreTime: number, seconds: number): number => centreTime - seconds / 2;

/**
 * One burn of an engine at a steady throttle: for a time, or until it has given a change of speed (the rocket equation says how long).
 *
 * @example
 * ```ts
 * import { exhaustSpeedOf, type Burn } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const circularise: Burn = { engine: { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) }, direction: "prograde", dv: 1_500 };
 * console.log(circularise.dv);
 * ```
 */
export interface Burn {
  engine: Engine;
  direction: Direction;
  /** 0 to 1; 1 when left out. */
  throttle?: number;
  /** How long, seconds. Give this or `dv`. */
  seconds?: number;
  /** The change of speed the engine gives, metres a second (not counting gravity's pull meanwhile). */
  dv?: number;
}

/**
 * How a burn or a plan is flown: the step, the gravity of the scene, the body the directions are taken from, and the method.
 *
 * @example
 * ```ts
 * import { gravityAt, type FlyOptions } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const options: FlyOptions = { step: 5, gravity: (_t, p) => gravityAt(p, [{ gm: 3.986004418e14, position: [0, 0, 0] }]) };
 * console.log(options.step);
 * ```
 */
export interface FlyOptions {
  /** The longest step, seconds. */
  step: number;
  /** Gravity (and anything else that pulls) at a time, place and speed. */
  gravity: Acceleration;
  /** The body the craft orbits, for the named directions; at the origin and still when left out. */
  centre?: Centre;
  /** The craft's mass with no propellant, kilograms: a burn that would go below it stops there. 0 when left out. */
  dryMass?: number;
  /** For the burns; `rk4` when left out, as a push along the speed depends on the speed. */
  burnMethod?: Method;
  /** For the coasts between burns; `sy4` when left out. */
  coastMethod?: Method;
}

/**
 * What a burn did: where the craft is at its end, its mass, how long it burned, the speed the engine gave and the propellant used, and whether it ran out.
 *
 * @example
 * ```ts
 * import { exhaustSpeedOf, flyBurn, gravityAt, type BurnResult } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const result: BurnResult = flyBurn({ t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0] }, 20_000, { engine: { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) }, direction: "prograde", seconds: 60 }, { step: 1, gravity: (_t, p) => gravityAt(p, [{ gm: 3.986004418e14, position: [0, 0, 0] }]) });
 * console.log(result.dv.toFixed(1), "m/s for", result.propellant.toFixed(0), "kg");
 * ```
 */
export interface BurnResult {
  state: State;
  mass: number;
  seconds: number;
  dv: number;
  propellant: number;
  /** True when the burn stopped early because the propellant ran out (`dryMass`). */
  short: boolean;
}

/**
 * Flies one burn from a state: gravity and the engine's thrust together, the mass falling at the engine's flow, the thrust kept along its direction as the craft moves.
 * @param start The craft when the engine lights.
 * @param mass Its mass then, kilograms.
 * @param burn The engine, the direction, and how long or how much.
 * @param options The step, the gravity, the centre and the dry mass.
 * @returns Where the craft is when the engine stops, and what the burn did.
 * @example
 * ```ts
 * import { exhaustSpeedOf, flyBurn, gravityAt } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earth = [{ gm: 3.986004418e14, position: [0, 0, 0] as const }];
 * const raise = flyBurn({ t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0] }, 20_000, { engine: { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) }, direction: "prograde", dv: 100 }, { step: 1, gravity: (_t, p) => gravityAt(p, earth) });
 * console.log(raise.seconds.toFixed(1), "s,", raise.mass.toFixed(0), "kg left");
 * ```
 */
export function flyBurn(start: State, mass: number, burn: Burn, options: FlyOptions): BurnResult {
  const throttle = burn.throttle ?? 1;
  const flow = massFlow(burn.engine, throttle);
  const thrust = flow * burn.engine.exhaustSpeed;
  let seconds = burn.seconds ?? (burn.dv !== undefined ? burnSeconds(burn.engine, mass, burn.dv, throttle) : NaN);
  if (!(seconds >= 0) || !Number.isFinite(seconds)) throw new RangeError("a burn needs seconds, or a dv and an engine that is lit");
  const reserve = options.dryMass ?? 0;
  const longest = flow > 0 ? (mass - reserve) / flow : Infinity;
  const short = seconds > longest;
  if (short) seconds = Math.max(0, longest);
  const centre = options.centre ?? ORIGIN;
  const t0 = start.t;
  const acceleration: Acceleration = (t, p, v) => {
    const c = centre(t);
    const push = directionOf(burn.direction, sub(p, c.position), sub(v, c.velocity));
    return addScaled(options.gravity(t, p, v), push, thrust / (mass - flow * (t - t0)));
  };
  const state = seconds > 0 ? propagate(start, seconds, { step: options.step, method: options.burnMethod ?? "rk4", acceleration }) : start;
  const end = mass - flow * seconds;
  return { state, mass: end, seconds, dv: deltaV(burn.engine.exhaustSpeed, mass, end), propellant: mass - end, short };
}

/**
 * A burn in a plan: the burn, and the time its middle is planned for.
 *
 * @example
 * ```ts
 * import { exhaustSpeedOf, type PlannedBurn } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const departure: PlannedBurn = { at: 1_200, engine: { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) }, direction: "prograde", dv: 2_400 };
 * console.log(departure.at);
 * ```
 */
export interface PlannedBurn extends Burn {
  /** When the middle of the burn falls, seconds. */
  at: number;
}

/**
 * Flies a plan: coasts to each burn, starting it so that its middle falls at its planned time, flies it, and coasts on to the end.
 * @param start The craft at the start.
 * @param mass Its mass then, kilograms.
 * @param burns The planned burns, in any order; they must not overlap.
 * @param end The time to stop, seconds (after the last burn).
 * @param options The step, the gravity, the centre, the dry mass and the methods.
 * @returns The craft at `end`, its mass, and what each burn did, in time order.
 * @example
 * ```ts
 * import { elementsOf, exhaustSpeedOf, flyPlan, gravityAt } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earth = [{ gm: 3.986004418e14, position: [0, 0, 0] as const }];
 * const engine = { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) };
 * const flown = flyPlan({ t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0] }, 20_000, [{ at: 600, engine, direction: "prograde", dv: 100 }], 3_600, { step: 5, gravity: (_t, p) => gravityAt(p, earth) });
 * console.log(((elementsOf(3.986004418e14, flown.state.position, flown.state.velocity).apoapsis - 6_378_137) / 1000).toFixed(0), "km apogee");
 * ```
 */
export function flyPlan(start: State, mass: number, burns: readonly PlannedBurn[], end: number, options: FlyOptions): { state: State; mass: number; burns: BurnResult[] } {
  let state = start;
  let left = mass;
  const done: BurnResult[] = [];
  const coast = (to: number): void => {
    if (to < state.t - 1e-9) throw new RangeError(`the plan goes back in time at ${to} s: burns overlap, or one starts before the craft is there`);
    if (to > state.t) state = propagate(state, to - state.t, { step: options.step, method: options.coastMethod ?? "sy4", acceleration: options.gravity });
  };
  for (const burn of [...burns].sort((a, b) => a.at - b.at)) {
    const lit = burn.engine;
    const seconds = burn.seconds ?? burnSeconds(lit, left, burn.dv ?? NaN, burn.throttle ?? 1);
    coast(burnStart(burn.at, seconds));
    const result = flyBurn(state, left, { ...burn, seconds }, options);
    done.push(result);
    state = result.state;
    left = result.mass;
  }
  coast(end);
  return { state, mass: left, burns: done };
}
