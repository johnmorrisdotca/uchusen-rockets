// A craft's attitude: which way it points (a quaternion) and how it turns, moved forward in time by Euler's equations, torques from
// thrusters at points of the craft, and the autopilot's modes: kill the rotation, or turn to and hold a direction. Pure.
// Ported from Orbiter (https://github.com/orbitersim/orbiter): Euler's equations of RigidBody::EulerInv_full and the gravity-gradient
// torque of RigidBody::GetTorque (Src/Orbiter/Rigidbody.cpp), the angular half of RigidBody::RK4_LinAng (Src/Orbiter/BodyIntegrator.cpp),
// the whole of RK4_LinAng for the place and attitude together, a thruster's torque `ref x F` and a group's largest torque (Src/Orbiter/Vessel.cpp, UpdateThrustForces and MaxAngularMoment, summed per axis here), and the
// navcomp's kill-rotation and turn modes (Src/Orbiter/Vessel.cpp, UpdateThrustForces: 1/dt rate control, a tenth of it to kill the rotation, at most 5 degrees a second, slowing within 20 degrees
// of the target, each axis held to 40 per cent of its thrusters when turning). Copyright (c) 2000-2026 Martin Schweiger, MIT licence
// (LICENSES/Orbiter-MIT.txt). Changed in the port: a right-handed frame, so Orbiter's (I w) x w is w x (I w) here and its thruster torque
// crossp(F, ref) is ref x F; real moments of inertia (kg m^2) and torques (N m) in place of Orbiter's per kilogram; a step turns the
// quaternion by the exact rotation of its mean rate where Orbiter's Quaternion::Rotate takes a first-order step and renormalises; the turn
// mode's error is the rotation from the nose to the target (Orbiter's per-axis asin and atan2 are its small-angle form), and the roll is
// held to a chosen roof direction or damped, where Orbiter levels it against the radial direction.
import { add, addScaled, cross, dot, length, scale, sub, type Vec3 } from "./vector.ts";

/**
 * An attitude as a unit quaternion `[w, x, y, z]`: the rotation that takes a vector of the craft's own frame into the scene's frame.
 *
 * @example
 * ```ts
 * import { rotateVector, type Quat } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const level: Quat = [1, 0, 0, 0];
 * console.log(rotateVector(level, [0, 1, 0]));
 * ```
 */
export type Quat = readonly [number, number, number, number];

const normalise = (q: Quat): Quat => {
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
};
const multiply = (a: Quat, b: Quat): Quat => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];

/**
 * The quaternion of a turn by an angle about an axis.
 * @param axis The axis, any length but not zero.
 * @param angle The angle, radians, right-handed about the axis.
 * @returns The unit quaternion.
 * @example
 * ```ts
 * import { quatFromAxisAngle, rotateVector } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(rotateVector(quatFromAxisAngle([0, 0, 1], Math.PI / 2), [1, 0, 0]).map((x) => x.toFixed(3)));
 * ```
 */
export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const l = length(axis);
  const s = Math.sin(angle / 2) / l;
  return [Math.cos(angle / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

/**
 * A vector of the craft's frame in the scene's frame.
 * @param q The attitude.
 * @param v The vector in the craft's frame.
 * @returns The same vector in the scene's frame.
 * @example
 * ```ts
 * import { quatFromAxisAngle, rotateVector } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(rotateVector(quatFromAxisAngle([1, 0, 0], Math.PI / 2), [0, 1, 0]).map((x) => x.toFixed(3)));
 * ```
 */
export function rotateVector(q: Quat, v: Vec3): Vec3 {
  const u: Vec3 = [q[1], q[2], q[3]];
  const t = scale(cross(u, v), 2);
  return add(addScaled(v, t, q[0]), cross(u, t));
}

/**
 * A vector of the scene's frame in the craft's frame: the inverse of {@link rotateVector}.
 * @param q The attitude.
 * @param v The vector in the scene's frame.
 * @returns The same vector in the craft's frame.
 * @example
 * ```ts
 * import { quatFromAxisAngle, unrotateVector } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(unrotateVector(quatFromAxisAngle([1, 0, 0], Math.PI / 2), [0, 0, 1]).map((x) => x.toFixed(3)));
 * ```
 */
export const unrotateVector = (q: Quat, v: Vec3): Vec3 => rotateVector([q[0], -q[1], -q[2], -q[3]], v);

/**
 * Turns an attitude by a rotation given in the craft's own frame (a rotation vector: its direction the axis, its length the angle in radians), as Orbiter's `Quaternion::Rotate` does with the turn rate times the step.
 * @param q The attitude.
 * @param rotation The rotation, in the craft's frame.
 * @returns The new attitude.
 * @example
 * ```ts
 * import { rotateVector, turnBy } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(rotateVector(turnBy([1, 0, 0, 0], [0, 0, Math.PI]), [1, 0, 0]).map((x) => x.toFixed(3)));
 * ```
 */
export function turnBy(q: Quat, rotation: Vec3): Quat {
  const angle = length(rotation);
  return angle > 0 ? normalise(multiply(q, quatFromAxisAngle(rotation, angle))) : q;
}

/**
 * Euler's equations for a body with principal moments of inertia along its own axes: the angular acceleration a torque gives, `I^-1 (torque - w x I w)` (Orbiter's `RigidBody::EulerInv_full`).
 * @param inertia The principal moments of inertia about the craft's x, y and z axes, kg m^2.
 * @param torque The torque, in the craft's frame, N m.
 * @param omega The turn rate, in the craft's frame, radians a second.
 * @returns The angular acceleration, in the craft's frame, radians a second squared.
 * @example
 * ```ts
 * import { angularAcceleration } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(angularAcceleration([1_000, 2_000, 2_500], [0, 0, 50], [0, 0, 0]));
 * ```
 */
export function angularAcceleration(inertia: Vec3, torque: Vec3, omega: Vec3): Vec3 {
  return [
    (torque[0] - (inertia[2] - inertia[1]) * omega[1] * omega[2]) / inertia[0],
    (torque[1] - (inertia[0] - inertia[2]) * omega[2] * omega[0]) / inertia[1],
    (torque[2] - (inertia[1] - inertia[0]) * omega[0] * omega[1]) / inertia[2],
  ];
}

/**
 * The torque a body's gravity puts on a long craft (the gravity gradient), `3 gm / r^3 (u x I u)` with `u` the unit vector to the body in the craft's frame (Orbiter's `RigidBody::GetTorque`, without its damping). It turns a long craft to point at the body.
 * @param gm The body's gravitational parameter, m^3/s^2.
 * @param toBody The body's centre from the craft, in the craft's frame, metres.
 * @param inertia The principal moments of inertia, kg m^2.
 * @returns The torque, in the craft's frame, N m.
 * @example
 * ```ts
 * import { gravityGradientTorque } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * console.log(gravityGradientTorque(3.986004418e14, [-4_800_000, 4_800_000, 0], [100_000, 10_000, 100_000]));
 * ```
 */
export function gravityGradientTorque(gm: number, toBody: Vec3, inertia: Vec3): Vec3 {
  const r = length(toBody);
  const u = scale(toBody, 1 / r);
  return scale(cross(u, [inertia[0] * u[0], inertia[1] * u[1], inertia[2] * u[2]]), (3 * gm) / (r * r * r));
}

/**
 * A craft's attitude and turn rate at a time. The turn rate is in the craft's own frame, radians a second.
 *
 * @example
 * ```ts
 * import type { Spin } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const still: Spin = { t: 0, q: [1, 0, 0, 0], omega: [0, 0, 0] };
 * console.log(still.omega);
 * ```
 */
export interface Spin {
  t: number;
  q: Quat;
  omega: Vec3;
}

/**
 * What turns the craft: the torque in its own frame (N m) at a time, attitude and turn rate.
 *
 * @example
 * ```ts
 * import type { Torque } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const steady: Torque = () => [0, 0, 10];
 * console.log(steady(0, [1, 0, 0, 0], [0, 0, 0]));
 * ```
 */
export type Torque = (t: number, q: Quat, omega: Vec3) => Vec3;

/**
 * One step of a craft's turning: the fourth-order Runge-Kutta step Orbiter takes for the angular state (the angular half of `RK4_LinAng`).
 * @param spin The attitude and turn rate now.
 * @param h The step, seconds.
 * @param inertia The principal moments of inertia, kg m^2.
 * @param torque What turns the craft.
 * @returns The attitude and turn rate `h` seconds later.
 * @example
 * ```ts
 * import { stepSpin } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const next = stepSpin({ t: 0, q: [1, 0, 0, 0], omega: [0, 0, 0] }, 1, [1_000, 1_000, 1_000], () => [0, 0, 10]);
 * console.log(next.omega[2]);
 * ```
 */
export function stepSpin(spin: Spin, h: number, inertia: Vec3, torque: Torque): Spin {
  const next = stepCraft({ ...spin, position: [0, 0, 0], velocity: [0, 0, 0] }, h, { inertia, acceleration: () => [0, 0, 0], torque });
  return { t: next.t, q: next.q, omega: next.omega };
}

/**
 * Turns a craft forward by a span of time, in steps no longer than `options.step`.
 * @param start The attitude and turn rate at the start.
 * @param seconds How long, seconds.
 * @param options The step, the moments of inertia and what turns the craft (no torque when left out).
 * @returns The attitude and turn rate at `start.t + seconds`.
 * @example
 * ```ts
 * import { spinFor } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const tumbling = spinFor({ t: 0, q: [1, 0, 0, 0], omega: [0.1, 0.01, 0] }, 60, { step: 0.1, inertia: [1_000, 2_000, 3_000] });
 * console.log(tumbling.omega.map((x) => x.toFixed(4)));
 * ```
 */
export function spinFor(start: Spin, seconds: number, options: { step: number; inertia: Vec3; torque?: Torque }): Spin {
  if (!(options.step > 0)) throw new RangeError("step must be a positive number of seconds");
  const count = Math.max(1, Math.ceil(Math.abs(seconds) / options.step - 1e-9));
  const torque = options.torque ?? (() => [0, 0, 0] as Vec3);
  let spin = start;
  for (let i = 0; i < count; i++) spin = stepSpin(spin, seconds / count, options.inertia, torque);
  return { ...spin, t: start.t + seconds };
}

/**
 * One thruster: where it is and which way it pushes, in the craft's frame, its thrust and exhaust speed.
 *
 * @example
 * ```ts
 * import type { Thruster } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const quad: Thruster = { position: [2, 10, 0], direction: [0, 0, 1], thrust: 445, exhaustSpeed: 2_800 };
 * console.log(quad.thrust);
 * ```
 */
export interface Thruster {
  /** Where its push acts, from the craft's centre of mass, metres. */
  position: Vec3;
  /** Which way it pushes the craft, a unit vector (the exhaust goes the other way). */
  direction: Vec3;
  /** Thrust at full level, newtons. */
  thrust: number;
  /** Exhaust speed, metres a second. */
  exhaustSpeed: number;
}

/**
 * What a set of thrusters does at given levels: the force and the torque on the craft (`position x force` for each, Orbiter's thruster torque) and the propellant they burn.
 * @param thrusters The thrusters.
 * @param levels Each one's level, 0 to 1, in the same order (missing ones are off).
 * @returns The force (N) and torque (N m), in the craft's frame, and the mass flow (kg/s).
 * @example
 * ```ts
 * import { thrusterPush } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const pair = [{ position: [1, 0, 0] as const, direction: [0, 1, 0] as const, thrust: 100, exhaustSpeed: 2_800 }, { position: [-1, 0, 0] as const, direction: [0, -1, 0] as const, thrust: 100, exhaustSpeed: 2_800 }];
 * console.log(thrusterPush(pair, [1, 1]));
 * ```
 */
export function thrusterPush(thrusters: readonly Thruster[], levels: readonly number[]): { force: Vec3; torque: Vec3; massFlow: number } {
  let force: Vec3 = [0, 0, 0];
  let torque: Vec3 = [0, 0, 0];
  let massFlow = 0;
  thrusters.forEach((thruster, i) => {
    const level = Math.max(0, Math.min(1, levels[i] ?? 0));
    if (level === 0) return;
    const push = scale(thruster.direction, (thruster.thrust * level) / length(thruster.direction));
    force = add(force, push);
    torque = add(torque, cross(thruster.position, push));
    massFlow += (thruster.thrust * level) / thruster.exhaustSpeed;
  });
  return { force, torque, massFlow };
}

/**
 * The largest torque a craft's thrusters can give about each of its axes, each way: for each axis and sense, the thrusters that turn the craft that way, all at full (Orbiter's `MaxAngularMoment` of the attitude groups).
 *
 * @example
 * ```ts
 * import type { TorqueLimits } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const limits: TorqueLimits = { positive: [400, 400, 200], negative: [400, 400, 200] };
 * console.log(limits.positive[2]);
 * ```
 */
export interface TorqueLimits {
  /** About +x, +y and +z, N m (0 or more). */
  positive: Vec3;
  /** About -x, -y and -z, N m (0 or more). */
  negative: Vec3;
}

const groupOf = (torque: Vec3): { axis: 0 | 1 | 2; sign: 1 | -1 } | null => {
  const axis = ([0, 1, 2] as const).reduce((best, k) => (Math.abs(torque[k]) > Math.abs(torque[best]) ? k : best), 0 as 0 | 1 | 2);
  return Math.abs(torque[axis]) > 1e-12 ? { axis, sign: torque[axis] > 0 ? 1 : -1 } : null;
};

/**
 * The torque limits of a set of thrusters. Each thruster belongs to the group of the axis it turns the craft about most, as Orbiter's attitude groups (pitch up and down, yaw left and right, bank left and right) are set up.
 * @param thrusters The thrusters.
 * @returns The largest torque about each axis, each way.
 * @example
 * ```ts
 * import { torqueLimits } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const pair = [{ position: [1, 0, 0] as const, direction: [0, 1, 0] as const, thrust: 100, exhaustSpeed: 2_800 }, { position: [-1, 0, 0] as const, direction: [0, -1, 0] as const, thrust: 100, exhaustSpeed: 2_800 }];
 * console.log(torqueLimits(pair));
 * ```
 */
export function torqueLimits(thrusters: readonly Thruster[]): TorqueLimits {
  const positive: [number, number, number] = [0, 0, 0];
  const negative: [number, number, number] = [0, 0, 0];
  for (const thruster of thrusters) {
    const torque = thrusterPush([thruster], [1]).torque;
    const group = groupOf(torque);
    if (group) (group.sign > 0 ? positive : negative)[group.axis] += Math.abs(torque[group.axis]);
  }
  return { positive, negative };
}

/**
 * Fires the thrusters for a wanted torque: each attitude group at the level that gives its axis's share, held to full, as Orbiter fires a group at the level its navcomp asks for.
 * @param thrusters The thrusters.
 * @param torque The torque wanted, in the craft's frame, N m.
 * @returns Each thruster's level (0 to 1), and what they do together: the force, the torque (which may differ a little from the one wanted, when a group also turns the craft about another axis) and the mass flow.
 * @example
 * ```ts
 * import { fireFor } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const pair = [{ position: [1, 0, 0] as const, direction: [0, 1, 0] as const, thrust: 100, exhaustSpeed: 2_800 }, { position: [-1, 0, 0] as const, direction: [0, -1, 0] as const, thrust: 100, exhaustSpeed: 2_800 }];
 * console.log(fireFor(pair, [0, 0, 50]).levels);
 * ```
 */
export function fireFor(thrusters: readonly Thruster[], torque: Vec3): { levels: number[]; force: Vec3; torque: Vec3; massFlow: number } {
  const limits = torqueLimits(thrusters);
  const levels = thrusters.map((thruster) => {
    const group = groupOf(thrusterPush([thruster], [1]).torque);
    if (!group || Math.sign(torque[group.axis]) !== group.sign) return 0;
    const limit = (group.sign > 0 ? limits.positive : limits.negative)[group.axis];
    return limit > 0 ? Math.min(1, Math.abs(torque[group.axis]) / limit) : 0;
  });
  return { levels, ...thrusterPush(thrusters, levels) };
}

const clampAxis = (torque: Vec3, limits: TorqueLimits, share: number): Vec3 => {
  const one = (k: 0 | 1 | 2) => Math.max(-share * limits.negative[k], Math.min(share * limits.positive[k], torque[k]));
  return [one(0), one(1), one(2)];
};

const perpendicular = (v: Vec3): Vec3 => {
  const other: Vec3 = Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const p = cross(v, other);
  return scale(p, 1 / length(p));
};

/** Orbiter's kill-rotation mode scales each group's level by ten times its largest torque: it asks for a tenth of the torque that would stop the turn in one step. */
const KILL_SHARE = 0.1;

/**
 * The autopilot's kill-rotation mode (Orbiter's navcomp): a tenth of the torque that would stop the turning in one control step, `(-I w / dt + w x I w) / 10`, held to what the thrusters can give. Orbiter switches the mode off once the turn rate is below 1e-5 radians a second.
 * @param spin The attitude and turn rate.
 * @param inertia The principal moments of inertia, kg m^2.
 * @param limits What the thrusters can give.
 * @param dt The control step, seconds (the time until the autopilot looks again).
 * @returns The torque to apply, in the craft's frame, N m.
 * @example
 * ```ts
 * import { killRotation } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const limits = { positive: [200, 200, 200] as const, negative: [200, 200, 200] as const };
 * console.log(killRotation({ t: 0, q: [1, 0, 0, 0], omega: [0.05, 0, 0] }, [1_000, 1_000, 1_000], limits, 0.1));
 * ```
 */
export function killRotation(spin: Spin, inertia: Vec3, limits: TorqueLimits, dt: number): Vec3 {
  const w = spin.omega;
  const iw: Vec3 = [inertia[0] * w[0], inertia[1] * w[1], inertia[2] * w[2]];
  return clampAxis(scale(add(scale(iw, -1 / dt), cross(w, iw)), KILL_SHARE), limits, 1);
}

/** Orbiter's turn modes: at most 5 degrees a second, slowing within 20 degrees of the target, each axis held to 40 per cent. */
const TURN_RATE = (5 * Math.PI) / 180;
const SLOW_WITHIN = (20 * Math.PI) / 180;
const TURN_SHARE = 0.4;

/**
 * The autopilot's turn-and-hold mode (Orbiter's navcomp prograde, retrograde, normal and antinormal modes, for any direction): it asks for a turn rate towards the target of 5 degrees a second, less within 20 degrees of it, and gives the torque that reaches that rate in one control step, each axis held to 40 per cent of its thrusters. With a roof direction it also rolls the craft so that its roof axis points there; without one it stops the roll.
 * @param spin The attitude and turn rate.
 * @param inertia The principal moments of inertia, kg m^2.
 * @param limits What the thrusters can give.
 * @param dt The control step, seconds.
 * @param target The direction to point the nose at, in the scene's frame.
 * @param options The craft's nose and roof axes in its own frame (`[0, 1, 0]` and `[0, 0, 1]` when left out: this package's rockets stand along +y), and the roof's direction in the scene's frame if the roll is to be held.
 * @returns The torque to apply, in the craft's frame, N m.
 * @example
 * ```ts
 * import { holdDirection } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const limits = { positive: [200, 200, 200] as const, negative: [200, 200, 200] as const };
 * console.log(holdDirection({ t: 0, q: [1, 0, 0, 0], omega: [0, 0, 0] }, [1_000, 1_000, 1_000], limits, 0.1, [1, 0, 0]));
 * ```
 */
export function holdDirection(spin: Spin, inertia: Vec3, limits: TorqueLimits, dt: number, target: Vec3, options: { nose?: Vec3; roofAxis?: Vec3; roof?: Vec3 } = {}): Vec3 {
  const nose = scale(options.nose ?? [0, 1, 0], 1 / length(options.nose ?? [0, 1, 0]));
  const towards = unrotateVector(spin.q, target);
  const want = scale(towards, 1 / length(towards));
  const axis = cross(nose, want);
  const angle = Math.atan2(length(axis), dot(nose, want));
  let error: Vec3 = length(axis) > 1e-15 ? scale(axis, angle / length(axis)) : angle > 1 ? scale(perpendicular(nose), Math.PI) : [0, 0, 0];
  const n = nose;
  if (options.roof) {
    const roofAxis = options.roofAxis ?? [0, 0, 1];
    const roofWanted = unrotateVector(spin.q, options.roof);
    const flat = (v: Vec3) => sub(v, scale(n, dot(v, n)));
    const [have, get] = [flat(roofAxis), flat(roofWanted)];
    if (length(have) > 1e-12 && length(get) > 1e-12) error = add(error, scale(n, Math.atan2(dot(cross(have, get), n), dot(have, get))));
  } else {
    error = sub(error, scale(n, dot(error, n)));
  }
  const rate = (e: number) => Math.max(-TURN_RATE, Math.min(TURN_RATE, (TURN_RATE / SLOW_WITHIN) * e));
  const wanted: Vec3 = [rate(error[0]), rate(error[1]), rate(error[2])];
  const torque = (k: 0 | 1 | 2) => (inertia[k] * (wanted[k] - spin.omega[k])) / dt;
  return clampAxis([torque(0), torque(1), torque(2)], limits, TURN_SHARE);
}

/**
 * A craft whose place and attitude move together: where it is, how fast it goes, which way it points and how it turns.
 *
 * @example
 * ```ts
 * import type { Craft } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const parked: Craft = { t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0], q: [1, 0, 0, 0], omega: [0, 0, 0] };
 * console.log(parked.q);
 * ```
 */
export interface Craft {
  t: number;
  position: Vec3;
  velocity: Vec3;
  q: Quat;
  omega: Vec3;
}

/**
 * What moves a craft: its acceleration in the scene's frame (gravity, and an engine's thrust along the nose, which depends on the attitude) and the torque in its own frame.
 *
 * @example
 * ```ts
 * import { gravityAt, rotateVector, type CraftForces } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const earth = [{ gm: 3.986004418e14, position: [0, 0, 0] as const }];
 * const pushAlongNose: CraftForces = {
 *   inertia: [1_000, 1_000, 1_000],
 *   acceleration: (_t, p, _v, q) => {
 *     const g = gravityAt(p, earth);
 *     const push = rotateVector(q, [0, 0.1, 0]);
 *     return [g[0] + push[0], g[1] + push[1], g[2] + push[2]];
 *   },
 *   torque: () => [0, 0, 1],
 * };
 * console.log(pushAlongNose.inertia);
 * ```
 */
export interface CraftForces {
  /** The principal moments of inertia, kg m^2. */
  inertia: Vec3;
  acceleration: (t: number, position: Vec3, velocity: Vec3, q: Quat) => Vec3;
  /** No torque when left out. */
  torque?: Torque;
}

/**
 * One step of a craft's place and attitude together: Orbiter's `RK4_LinAng`, the fourth-order Runge-Kutta step with the position, the speed, the attitude and the turn rate moved as one, so a push along the nose follows the turning nose.
 * @param craft The craft now.
 * @param h The step, seconds.
 * @param forces What moves it.
 * @returns The craft `h` seconds later.
 * @example
 * ```ts
 * import { gravityAt, stepCraft } from "@johnmorrisdotca/uchusen-rockets/physics";
 *
 * const next = stepCraft({ t: 0, position: [6_778_000, 0, 0], velocity: [0, 7_669, 0], q: [1, 0, 0, 0], omega: [0, 0, 0.01] }, 1, { inertia: [1_000, 1_000, 1_000], acceleration: (_t, p) => gravityAt(p, [{ gm: 3.986004418e14, position: [0, 0, 0] }]) });
 * console.log(next.t, next.omega);
 * ```
 */
export function stepCraft(craft: Craft, h: number, forces: CraftForces): Craft {
  const { t, position: p, velocity: v, q, omega: w } = craft;
  const torque = forces.torque ?? (() => [0, 0, 0] as Vec3);
  const moments = (tt: number, pp: Vec3, vv: Vec3, qq: Quat, ww: Vec3): [Vec3, Vec3] => [forces.acceleration(tt, pp, vv, qq), angularAcceleration(forces.inertia, torque(tt, qq, ww), ww)];
  const h2 = h / 2;
  const [a0, b0] = moments(t, p, v, q, w);
  const [pa, va, qa, wa] = [addScaled(p, v, h2), addScaled(v, a0, h2), turnBy(q, scale(w, h2)), addScaled(w, b0, h2)];
  const [a1, b1] = moments(t + h2, pa, va, qa, wa);
  const [pb, vb, qb, wb] = [addScaled(p, va, h2), addScaled(v, a1, h2), turnBy(q, scale(wa, h2)), addScaled(w, b1, h2)];
  const [a2, b2] = moments(t + h2, pb, vb, qb, wb);
  const [pc, vc, qc, wc] = [addScaled(p, vb, h), addScaled(v, a2, h), turnBy(q, scale(wb, h)), addScaled(w, b2, h)];
  const [a3, b3] = moments(t + h, pc, vc, qc, wc);
  const mean = (x0: Vec3, x1: Vec3, x2: Vec3, x3: Vec3): Vec3 => scale(add(add(x0, x3), scale(add(x1, x2), 2)), h / 6);
  return { t: t + h, position: add(p, mean(v, va, vb, vc)), velocity: add(v, mean(a0, a1, a2, a3)), q: turnBy(q, mean(w, wa, wb, wc)), omega: add(w, mean(b0, b1, b2, b3)) };
}
