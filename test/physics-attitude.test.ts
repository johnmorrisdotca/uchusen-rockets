// Attitude and RCS: Orbiter's own quaternion code and Euler equation (test/data/orbiter-attitude.json, made by scripts/orbiter-reference.ts),
// the turning of a free body against what it must keep, a spin-up from a known torque, torques from thrusters at points, and the
// autopilot's kill-rotation and hold modes converging.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { angularAcceleration, fireFor, gravityAt, gravityGradientTorque, holdDirection, killRotation, propagate, quatFromAxisAngle, rotateVector, spinFor, stepCraft, stepSpin, thrusterPush, torqueLimits, turnBy, unrotateVector, type Craft, type Quat, type Spin, type Thruster, type Vec3 } from "../src/physics/index.ts";

const DATA = JSON.parse(readFileSync(new URL("data/orbiter-attitude.json", import.meta.url), "utf8")) as {
  quaternions: { q: Quat; p: Vec3; omega: Vec3; orbiter: { mul: Vec3; tmul: Vec3; rotated: Quat } }[];
  euler: { inertia: Vec3; torque: Vec3; omega: Vec3; orbiter: { angularAcceleration: Vec3 } }[];
};
const apart = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((x, k) => x - b[k]!));
const DEG = Math.PI / 180;
const momentumIn = (spin: Spin, inertia: Vec3) => rotateVector(spin.q, [inertia[0] * spin.omega[0], inertia[1] * spin.omega[1], inertia[2] * spin.omega[2]]);
const energyOf = (spin: Spin, inertia: Vec3) => 0.5 * (inertia[0] * spin.omega[0] ** 2 + inertia[1] * spin.omega[1] ** 2 + inertia[2] * spin.omega[2] ** 2);

// A craft 8 m long standing along +y: four thrusters at each end pushing sideways, and two pairs for the roll.
const INERTIA: Vec3 = [20_000, 6_000, 20_000];
const THRUSTERS: Thruster[] = [
  ...[4, -4].flatMap((y) => ([[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]] as Vec3[]).map((direction) => ({ position: [0, y, 0] as Vec3, direction, thrust: 445, exhaustSpeed: 2_800 }))),
  ...[1, -1].flatMap((s) => [{ position: [1.5, 0, 0] as Vec3, direction: [0, 0, s] as Vec3, thrust: 445, exhaustSpeed: 2_800 }, { position: [-1.5, 0, 0] as Vec3, direction: [0, 0, -s] as Vec3, thrust: 445, exhaustSpeed: 2_800 }]),
];
const LIMITS = torqueLimits(THRUSTERS);

test("the quaternions turn vectors as Orbiter's own mul and tmul do, and a turn is Orbiter's Rotate to its first order", () => {
  for (const c of DATA.quaternions) {
    assert.ok(apart(rotateVector(c.q, c.p), c.orbiter.mul) < 1e-12);
    assert.ok(apart(unrotateVector(c.q, c.p), c.orbiter.tmul) < 1e-12);
    // Orbiter takes a first-order step and renormalises; the port turns by the exact rotation: they differ by the cube of the angle.
    const angle = Math.hypot(...c.omega);
    assert.ok(apart(turnBy(c.q, c.omega), c.orbiter.rotated) < angle ** 2, `${apart(turnBy(c.q, c.omega), c.orbiter.rotated)} for ${angle} rad`);
  }
});

test("Euler's equation is Orbiter's EulerInv_full, to the last digits", () => {
  for (const c of DATA.euler) assert.ok(apart(angularAcceleration(c.inertia, c.torque, c.omega), c.orbiter.angularAcceleration) < 1e-15 * Math.max(1, Math.hypot(...c.orbiter.angularAcceleration)));
});

test("a body tumbling with no torque keeps its angular momentum and its energy, even about its unstable middle axis", () => {
  const inertia: Vec3 = [1_000, 2_000, 3_000];
  const start: Spin = { t: 0, q: quatFromAxisAngle([1, 2, 3], 0.7), omega: [0.01, 0.3, 0.01] };
  const end = spinFor(start, 600, { step: 0.01, inertia });
  // Measured 2026-11-11 over 600 s: energy kept to 5e-14; the angular momentum, seen from outside, to 2.5e-7 at 0.01 s steps (6e-6 at
  // 0.05 s): the attitude is turned by the step's mean rate, as Orbiter turns it, which is second order.
  assert.ok(apart(momentumIn(end, inertia), momentumIn(start, inertia)) / Math.hypot(...momentumIn(start, inertia)) < 1e-6);
  assert.ok(Math.abs(energyOf(end, inertia) / energyOf(start, inertia) - 1) < 1e-10);
  assert.ok(Math.abs(end.omega[1]) < 0.29, "it has turned away from its middle axis");
});

test("a spinning body with two equal moments wobbles at (C - A) / A times its spin, the textbook rate", () => {
  const [a, c] = [1_000, 1_500];
  const spin = 0.5;
  const end = spinFor({ t: 0, q: [1, 0, 0, 0], omega: [0.01, 0, spin] }, 20, { step: 0.01, inertia: [a, a, c] });
  const turned = Math.atan2(end.omega[1], end.omega[0]);
  const rate = ((c - a) / a) * spin;
  assert.ok(Math.abs(Math.atan2(Math.sin(turned - rate * 20), Math.cos(turned - rate * 20))) < 1e-6, `${turned} against ${rate * 20}`);
});

test("a known torque spins a body up as it should: rate t / I and angle t^2 / 2I, whether from the torque or from a pair of thrusters", () => {
  const end = spinFor({ t: 0, q: [1, 0, 0, 0], omega: [0, 0, 0] }, 20, { step: 0.1, inertia: [1_000, 2_000, 2_500], torque: () => [0, 0, 50] });
  assert.ok(Math.abs(end.omega[2] - (50 * 20) / 2_500) < 1e-12);
  assert.ok(apart(end.q, quatFromAxisAngle([0, 0, 1], (50 * 20 * 20) / (2 * 2_500))) < 1e-9);
  const pair: Thruster[] = [{ position: [2, 0, 0], direction: [0, 1, 0], thrust: 100, exhaustSpeed: 2_800 }, { position: [-2, 0, 0], direction: [0, -1, 0], thrust: 100, exhaustSpeed: 2_800 }];
  const push = thrusterPush(pair, [1, 1]);
  assert.deepEqual(push.force, [0, 0, 0]);
  assert.deepEqual(push.torque, [0, 0, 400]);
  assert.ok(Math.abs(push.massFlow - 200 / 2_800) < 1e-15);
  const spun = spinFor({ t: 0, q: [1, 0, 0, 0], omega: [0, 0, 0] }, 10, { step: 0.1, inertia: [1_000, 1_000, 1_000], torque: () => push.torque });
  assert.ok(Math.abs(spun.omega[2] - 4) < 1e-12);
});

test("the thrusters' limits are each axis's group, and firing for a torque gives it with no push sideways", () => {
  assert.deepEqual(LIMITS, { positive: [3_560, 1_335, 3_560], negative: [3_560, 1_335, 3_560] });
  const fired = fireFor(THRUSTERS, [1_000, -300, 0]);
  assert.ok(apart(fired.torque, [1_000, -300, 0]) < 1e-9);
  assert.ok(Math.hypot(...fired.force) < 1e-9);
  assert.ok(fired.levels.every((level) => level >= 0 && level <= 1));
  assert.deepEqual(fireFor(THRUSTERS, [0, 0, 0]).levels.every((level) => level === 0), true);
});

test("kill rotation stops a tumble below Orbiter's 1e-5 rad/s, never asking more than the thrusters have", () => {
  const dt = 0.1;
  let spin: Spin = { t: 0, q: [1, 0, 0, 0], omega: [0.05, -0.03, 0.02] };
  let burned = 0;
  while (Math.hypot(...spin.omega) >= 1e-5 && spin.t < 120) {
    const torque = killRotation(spin, INERTIA, LIMITS, dt);
    for (let k = 0; k < 3; k++) assert.ok(torque[k]! <= LIMITS.positive[k]! + 1e-9 && -torque[k]! <= LIMITS.negative[k]! + 1e-9);
    const fired = fireFor(THRUSTERS, torque);
    burned += fired.massFlow * dt;
    spin = stepSpin(spin, dt, INERTIA, () => fired.torque);
  }
  // Measured 2026-11-11: stopped in 8.3 s for 0.17 kg of propellant.
  assert.ok(spin.t < 15, `${spin.t} s`);
  assert.ok(burned < 0.5, `${burned} kg`);
});

test("holding prograde in low orbit: from 90 degrees off the nose comes round within a minute and then stays within 0.3 degrees", () => {
  const gm = 3.986004418e14;
  const r = 6_778_000;
  const dt = 0.1;
  let craft: Craft = { t: 0, position: [r, 0, 0], velocity: [0, Math.sqrt(gm / r), 0], q: quatFromAxisAngle([0, 0, 1], -Math.PI / 2), omega: [0, 0, 0] };
  const off = (c: Craft) => {
    const nose = rotateVector(c.q, [0, 1, 0]);
    const v = c.velocity;
    return Math.acos(Math.min(1, (nose[0] * v[0] + nose[1] * v[1] + nose[2] * v[2]) / Math.hypot(...v))) / DEG;
  };
  assert.ok(Math.abs(off(craft) - 90) < 1e-9);
  const angles: number[] = [];
  for (let k = 0; k < 3_000; k++) {
    const fired = fireFor(THRUSTERS, holdDirection(craft, INERTIA, LIMITS, dt, craft.velocity));
    craft = stepCraft(craft, dt, { inertia: INERTIA, acceleration: (_t, p) => gravityAt(p, [{ gm, position: [0, 0, 0] }]), torque: () => fired.torque });
    angles.push(off(craft));
  }
  // Measured 2026-11-11: under 0.5 degrees after 32 s; then 0.26 degrees behind, the lag of Orbiter's rate law (the orbit's turn rate over its gain).
  assert.ok(angles.findIndex((a) => a < 0.5) * dt < 60);
  assert.ok(Math.max(...angles.slice(600)) < 0.3, `${Math.max(...angles.slice(600))} degrees`);
});

test("with a roof direction the hold also rolls the craft to it", () => {
  const dt = 0.1;
  let spin: Spin = { t: 0, q: quatFromAxisAngle([0, 1, 0], 1), omega: [0, 0, 0] };
  for (let k = 0; k < 1_200; k++) {
    const fired = fireFor(THRUSTERS, holdDirection(spin, INERTIA, LIMITS, dt, [0, 1, 0], { roof: [0, 0, 1] }));
    spin = stepSpin(spin, dt, INERTIA, () => fired.torque);
  }
  assert.ok(apart(rotateVector(spin.q, [0, 0, 1]), [0, 0, 1]) < 0.01);
  assert.ok(apart(rotateVector(spin.q, [0, 1, 0]), [0, 1, 0]) < 0.01);
});

test("the gravity gradient turns a long craft towards the body, and not at all when it points straight at it", () => {
  const inertia: Vec3 = [100_000, 10_000, 100_000];
  assert.ok(Math.hypot(...gravityGradientTorque(3.986004418e14, [0, -6_778_000, 0], inertia)) < 1e-12);
  const tilted = gravityGradientTorque(3.986004418e14, [-6_778_000 * Math.sin(0.1), -6_778_000 * Math.cos(0.1), 0], inertia);
  // The long axis (y) is 0.1 rad off the line to the body, towards +x: the torque turns it back, about -z.
  assert.ok(tilted[2] < 0 && Math.abs(tilted[0]) < 1e-12 && Math.abs(tilted[1]) < 1e-12);
});

test("a craft that does not turn moves as the propagator's classic Runge-Kutta moves it", () => {
  const gm = 3.986004418e14;
  const gravity = (_t: number, p: Vec3) => gravityAt(p, [{ gm, position: [0, 0, 0] }]);
  let craft: Craft = { t: 0, position: [7_000_000, 0, 0], velocity: [0, 7_546, 0], q: [1, 0, 0, 0], omega: [0, 0, 0] };
  for (let k = 0; k < 100; k++) craft = stepCraft(craft, 10, { inertia: INERTIA, acceleration: gravity });
  const flown = propagate({ t: 0, position: [7_000_000, 0, 0], velocity: [0, 7_546, 0] }, 1_000, { step: 10, method: "rk4", acceleration: gravity });
  assert.ok(apart(craft.position, flown.position) < 1e-6);
  assert.deepEqual(craft.q, [1, 0, 0, 0]);
});
