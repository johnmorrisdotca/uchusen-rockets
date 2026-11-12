// An engine's thrust and the propellant it burns, and the rocket equation: what a burn changes the speed by, the mass left and how long it takes. Pure.
// Ported from Orbiter (https://github.com/orbitersim/orbiter): the propellant flow `thrust / isp0` of Vessel::UpdateThrustForces and the
// thrust's scaling in air of ThrusterAtmScale (Src/Orbiter/Vessel.cpp and Vessel.h, with the pfac of Vessel::CreateThruster), and the
// rocket equation `isp * log(m0 / (m0 - m))` of the DeltaGlider's fuel display (Src/Vessel/DeltaGlider/FuelMfd.cpp).
// Copyright (c) 2000-2026 Martin Schweiger, MIT licence (LICENSES/Orbiter-MIT.txt). Orbiter's "Isp" is an exhaust speed in metres a second,
// as `exhaustSpeed` is here; `exhaustSpeedOf` turns a specific impulse in seconds into one. Changed in the port: functions of plain
// numbers in place of a vessel's thrusters and tanks; a tank's efficiency factor is left out.
import { G0 } from "../journey/constants.ts";

const clampThrottle = (throttle: number): number => Math.max(0, Math.min(1, throttle));

/**
 * A rocket engine as Orbiter describes a thruster: its thrust in vacuum, its exhaust speed in vacuum and, if it loses thrust in air, the exhaust speed at a reference pressure.
 *
 * @example
 * ```ts
 * import { exhaustSpeedOf, type Engine } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const sps: Engine = { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) };
 * console.log(sps.exhaustSpeed.toFixed(0), "m/s");
 * ```
 */
export interface Engine {
  /** Thrust in vacuum at full throttle, newtons. */
  thrust: number;
  /** Exhaust speed in vacuum, metres a second (specific impulse times standard gravity). */
  exhaustSpeed: number;
  /** The exhaust speed (metres a second) at a pressure (pascals), such as at sea level, for an engine that loses thrust in air. Left out, the thrust is the same at every pressure. */
  reference?: { exhaustSpeed: number; pressure: number };
}

/**
 * An exhaust speed from a specific impulse: `isp g0`.
 * @param ispSeconds The specific impulse, seconds.
 * @returns The exhaust speed, metres a second.
 * @example
 * ```ts
 * import { exhaustSpeedOf } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(exhaustSpeedOf(311).toFixed(1));
 * ```
 */
export const exhaustSpeedOf = (ispSeconds: number): number => ispSeconds * G0;

/**
 * The propellant an engine burns, kilograms a second: its vacuum thrust over its vacuum exhaust speed, times the throttle. In air the flow stays the same and the thrust falls (see {@link thrustAt}), as in Orbiter.
 * @param engine The engine.
 * @param throttle 0 to 1; 1 when left out.
 * @returns The mass flow, kg/s.
 * @example
 * ```ts
 * import { exhaustSpeedOf, massFlow } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(massFlow({ thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) }).toFixed(2), "kg/s");
 * ```
 */
export const massFlow = (engine: Engine, throttle = 1): number => (engine.thrust * clampThrottle(throttle)) / engine.exhaustSpeed;

/**
 * An engine's thrust at an outside pressure: the vacuum thrust times `max(0, 1 - p (v0 - vref) / (pref v0))`, Orbiter's straight-line model through the vacuum and the reference exhaust speeds.
 * @param engine The engine.
 * @param pressure The outside pressure, pascals (0 in space).
 * @param throttle 0 to 1; 1 when left out.
 * @returns The thrust, newtons.
 * @example
 * ```ts
 * import { exhaustSpeedOf, thrustAt } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const engine = { thrust: 1_000_000, exhaustSpeed: exhaustSpeedOf(330), reference: { exhaustSpeed: exhaustSpeedOf(300), pressure: 101_325 } };
 * console.log(thrustAt(engine, 0), thrustAt(engine, 101_325).toFixed(0));
 * ```
 */
export function thrustAt(engine: Engine, pressure: number, throttle = 1): number {
  const vacuum = engine.thrust * clampThrottle(throttle);
  const ref = engine.reference;
  if (!ref || !(ref.exhaustSpeed > 0) || !(ref.pressure > 0)) return vacuum;
  const pfac = (engine.exhaustSpeed - ref.exhaustSpeed) / (ref.pressure * engine.exhaustSpeed);
  return vacuum * Math.max(0, 1 - pressure * pfac);
}

/**
 * The rocket equation (Tsiolkovsky's): the speed a burn gives, `v ln(m0 / m1)`.
 * @param exhaustSpeed The exhaust speed, metres a second.
 * @param startMass The mass before the burn, kilograms.
 * @param endMass The mass after it, kilograms (more than 0, at most `startMass`).
 * @returns The change of speed, metres a second.
 * @example
 * ```ts
 * import { deltaV, exhaustSpeedOf } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(deltaV(exhaustSpeedOf(314), 30_000, 20_000).toFixed(0), "m/s");
 * ```
 */
export const deltaV = (exhaustSpeed: number, startMass: number, endMass: number): number => exhaustSpeed * Math.log(startMass / endMass);

/**
 * The rocket equation turned round: the mass left after a change of speed, `m0 exp(-dv / v)`.
 * @param exhaustSpeed The exhaust speed, metres a second.
 * @param startMass The mass before the burn, kilograms.
 * @param dv The change of speed, metres a second.
 * @returns The mass after the burn, kilograms; `startMass - massAfter(...)` is the propellant burned.
 * @example
 * ```ts
 * import { exhaustSpeedOf, massAfter } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log((30_000 - massAfter(exhaustSpeedOf(314), 30_000, 1_000)).toFixed(0), "kg burned");
 * ```
 */
export const massAfter = (exhaustSpeed: number, startMass: number, dv: number): number => startMass * Math.exp(-dv / exhaustSpeed);

/**
 * How long an engine must burn, at a steady throttle in vacuum, to change a craft's speed by `dv`: the propellant the rocket equation asks for over the engine's mass flow.
 * @param engine The engine.
 * @param startMass The mass before the burn, kilograms.
 * @param dv The change of speed, metres a second.
 * @param throttle 0 to 1; 1 when left out.
 * @returns The burn's length, seconds (Infinity at zero throttle).
 * @example
 * ```ts
 * import { burnSeconds, exhaustSpeedOf } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(burnSeconds({ thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) }, 30_000, 1_000).toFixed(1), "s");
 * ```
 */
export function burnSeconds(engine: Engine, startMass: number, dv: number, throttle = 1): number {
  const flow = massFlow(engine, throttle);
  return flow > 0 ? (startMass - massAfter(engine.exhaustSpeed, startMass, dv)) / flow : Infinity;
}
