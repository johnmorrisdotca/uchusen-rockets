// The flight physics on its own terms: what an orbit keeps over many turns, Kepler's equation, the flattening's pull against its
// potential, the node's drift against the textbook rate, and the rocket equation against a burn flown step by step.
import assert from "node:assert/strict";
import test from "node:test";
import { burnSeconds, deltaV, eccentricAnomaly, elementsOf, exhaustSpeedOf, gravityAt, massAfter, massFlow, path, propagate, stateOf, step, thrustAt, type Engine, type GravityBody, type State, type Vec3 } from "../src/physics/index.ts";
import { G0 } from "../src/journey/constants.ts";

const MU = 3.986004418e14;
const EARTH: GravityBody[] = [{ gm: MU, position: [0, 0, 0] }];
const pull = (_t: number, p: Vec3) => gravityAt(p, EARTH);
const apart = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const energy = (s: State) => (s.velocity[0] ** 2 + s.velocity[1] ** 2 + s.velocity[2] ** 2) / 2 - MU / Math.hypot(...s.position);
const momentum = (s: State) => Math.hypot(...cross(s.position, s.velocity));
// An oval orbit tilted 8 degrees, starting at its perigee 7,000 km from the centre: e = 0.21, 137 minutes round.
const START: State = { t: 0, position: [7_000_000, 0, 0], velocity: [0, 8_200, 1_200] };
const ORBIT = elementsOf(MU, START.position, START.velocity);

test("the test orbit is an oval of e 0.21 taking 137 minutes", () => {
  assert.ok(Math.abs(ORBIT.e - 0.2061) < 1e-4);
  assert.ok(Math.abs(ORBIT.period / 60 - 137.3) < 0.1);
});

test("over 100 turns the symplectic methods keep energy and angular momentum to 1e-12, and the classic Runge-Kutta drifts", () => {
  const run = (method: "rk4" | "sy4" | "sy6" | "sy8") => propagate(START, 100 * ORBIT.period, { step: 20, method, acceleration: pull });
  const drift = (s: State) => ({ energy: Math.abs(energy(s) / energy(START) - 1), momentum: Math.abs(momentum(s) / momentum(START) - 1) });
  // Measured 2026-11-11, 20 s steps: sy4, sy6 and sy8 within 1.4e-13 for both; rk4 4.6e-8 in energy and 1.6e-8 in angular momentum.
  for (const method of ["sy4", "sy6", "sy8"] as const) {
    const d = drift(run(method));
    assert.ok(d.energy < 1e-12 && d.momentum < 1e-12, `${method}: ${JSON.stringify(d)}`);
  }
  const rk = drift(run("rk4"));
  assert.ok(rk.energy > 1e-9 && rk.energy < 1e-6, `rk4: ${rk.energy}`);
});

test("after 100 turns the sixth- and eighth-order methods are where Kepler's equation puts the craft, to a metre", () => {
  const kepler = stateOf(ORBIT, 100 * ORBIT.period);
  // Measured 2026-11-11: sy6 and sy8 under 0.1 m; sy4 443 m and rk4 252 m (their larger step error).
  for (const method of ["sy6", "sy8"] as const) assert.ok(apart(propagate(START, 100 * ORBIT.period, { step: 20, method, acceleration: pull }).position, kepler.position) < 1);
  for (const method of ["sy4", "rk4"] as const) assert.ok(apart(propagate(START, 100 * ORBIT.period, { step: 20, method, acceleration: pull }).position, kepler.position) < 1000);
});

test("once round, the craft is back where it started; run backwards, it returns", () => {
  const round = propagate(START, ORBIT.period, { step: 10, method: "sy8", acceleration: pull });
  assert.ok(apart(round.position, START.position) < 1e-3);
  assert.equal(round.t, ORBIT.period);
  const out = propagate(START, 3_000, { step: 10, method: "rk4", acceleration: pull });
  const back = propagate(out, -3_000, { step: 10, method: "rk4", acceleration: pull });
  assert.ok(apart(back.position, START.position) < 1e-3);
  assert.equal(back.t, 0);
  assert.throws(() => propagate(START, 100, { step: 0, acceleration: pull }), RangeError);
});

test("one step of each method moves the craft the same way, and a path is evenly spaced from the start", () => {
  const ends = (["rk4", "sy4", "sy6", "sy8"] as const).map((method) => step(START, 10, pull, method));
  for (const end of ends) assert.ok(apart(end.position, ends[0]!.position) < 0.01);
  // The leapfrog is second order: 0.8 m from the others after one 10 s step here.
  assert.ok(apart(step(START, 10, pull, "sy2").position, ends[0]!.position) < 1);
  const line = path(START, ORBIT.period, 4, { step: 20, acceleration: pull });
  assert.equal(line.length, 5);
  assert.deepEqual(line[0], START);
  assert.ok(Math.abs(line[2]!.t - ORBIT.period / 2) < 1e-9);
  assert.ok(apart(line[4]!.position, START.position) < 50);
});

test("Kepler's equation is solved for ellipses and hyperbolas, far out too", () => {
  for (const e of [0, 0.1, 0.5, 0.9, 0.99])
    for (const m of [0, 0.3, 1, 2, 3, 3.1, 5, 6.2]) {
      const big = eccentricAnomaly(m, e);
      assert.ok(Math.abs(big - e * Math.sin(big) - m) < 1e-12, `e ${e}, M ${m}`);
    }
  for (const e of [1.01, 1.5, 3, 10])
    for (const m of [-50, -2, 0, 0.5, 2, 50, 500]) {
      const big = eccentricAnomaly(m, e);
      assert.ok(Math.abs(e * Math.sinh(big) - big - m) < 1e-10 * Math.max(1, Math.abs(m)), `e ${e}, M ${m}`);
    }
});

test("an open path goes out and comes back the way it was flown", () => {
  const escape = elementsOf(MU, [7_000_000, 0, 0], [0, 12_000, 500]);
  assert.ok(escape.e > 1 && escape.a < 0 && escape.period === Infinity && escape.apoapsis === Infinity);
  const later = stateOf(escape, 20_000);
  const flown = propagate({ t: 0, position: [7_000_000, 0, 0], velocity: [0, 12_000, 500] }, 20_000, { step: 10, method: "sy8", acceleration: pull });
  assert.ok(apart(later.position, flown.position) < 1);
});

test("the flattening's pull (J2, J3, J4) is the slope of its potential, everywhere round the body", () => {
  const radius = 6_400_000;
  const pole: Vec3 = [0.3, -0.2, Math.sqrt(1 - 0.13)];
  const j = [1e-3, -3e-6, -2e-6];
  // The zonal potential: V = (GM / r) (1 - sum Jn (R / r)^n Pn(sin latitude)); the pull is its gradient.
  const legendre = [(s: number) => (3 * s * s - 1) / 2, (s: number) => (5 * s ** 3 - 3 * s) / 2, (s: number) => (35 * s ** 4 - 30 * s * s + 3) / 8];
  const potential = (p: Vec3) => {
    const r = Math.hypot(...p);
    const s = (p[0] * pole[0] + p[1] * pole[1] + p[2] * pole[2]) / r;
    return (MU / r) * (1 - j.reduce((sum, jn, k) => sum + jn * (radius / r) ** (k + 2) * legendre[k]!(s), 0));
  };
  const flat: GravityBody[] = [{ gm: MU, position: [0, 0, 0], zonal: { radius, pole, j } }];
  for (const p of [[7e6, 1e6, 2e6], [-3e6, 5e6, 6.5e6], [1e5, -2e5, 8e6], [6.9e6, -4e6, -3e6]] as Vec3[]) {
    const got = gravityAt(p, flat);
    const h = 1;
    const slope = [0, 1, 2].map((k) => {
      const up = [...p] as [number, number, number];
      const down = [...p] as [number, number, number];
      up[k] += h;
      down[k] -= h;
      return (potential(up) - potential(down)) / (2 * h);
    });
    for (let k = 0; k < 3; k++) assert.ok(Math.abs(got[k]! - slope[k]!) < 1e-7, `at ${p}: ${got} against ${slope}`);
  }
});

test("J2 turns the orbit's node at the textbook rate, -3/2 n J2 (R/p)^2 cos i", () => {
  const radius = 6_400_000;
  const j2 = 1e-3;
  const flat: GravityBody[] = [{ gm: MU, position: [0, 0, 0], zonal: { radius, pole: [0, 0, 1], j: [j2] } }];
  const tilt = (51.6 * Math.PI) / 180;
  const r = 6_778_000;
  const v = Math.sqrt(MU / r);
  const start: State = { t: 0, position: [r, 0, 0], velocity: [0, v * Math.cos(tilt), v * Math.sin(tilt)] };
  const first = elementsOf(MU, start.position, start.velocity);
  const turns = 15;
  const end = propagate(start, turns * first.period, { step: 10, method: "sy4", acceleration: (_t, p) => gravityAt(p, flat) });
  const last = elementsOf(MU, end.position, end.velocity);
  const turned = Math.atan2(Math.sin(last.node - first.node), Math.cos(last.node - first.node));
  const rate = -1.5 * first.meanMotion * j2 * (radius / first.semiLatus) ** 2 * Math.cos(first.i);
  // Measured 2026-11-11: within 1% of the rate over 15 turns.
  assert.ok(Math.abs(turned / (rate * turns * first.period) - 1) < 0.02, `${turned} against ${rate * turns * first.period}`);
});

test("the rocket equation is what a burn flown step by step gives, and its inverse and the burn's length agree", () => {
  const engine: Engine = { thrust: 91_189, exhaustSpeed: exhaustSpeedOf(314) };
  const m0 = 30_000;
  const flow = massFlow(engine);
  assert.ok(Math.abs(flow - 91_189 / (314 * G0)) < 1e-9);
  const seconds = 300;
  const burn = propagate({ t: 0, position: [0, 0, 0], velocity: [0, 0, 0] }, seconds, { step: 1, method: "rk4", acceleration: (t) => [engine.thrust / (m0 - flow * t), 0, 0] });
  const dv = deltaV(engine.exhaustSpeed, m0, m0 - flow * seconds);
  assert.ok(Math.abs(burn.velocity[0] - dv) < 1e-6, `${burn.velocity[0]} against ${dv}`);
  // Orbiter's DeltaGlider shows `isp * log(m0 / (m0 - m))` for the speed its propellant m can still give.
  assert.equal(deltaV(engine.exhaustSpeed, m0, m0 - 5_000), engine.exhaustSpeed * Math.log(m0 / (m0 - 5_000)));
  assert.ok(Math.abs(massAfter(engine.exhaustSpeed, m0, dv) - (m0 - flow * seconds)) < 1e-6);
  assert.ok(Math.abs(burnSeconds(engine, m0, dv) - seconds) < 1e-9);
  assert.equal(burnSeconds(engine, m0, dv, 0), Infinity);
  assert.ok(Math.abs(burnSeconds(engine, m0, dv, 0.5) - 2 * seconds) < 1e-9);
});

test("in air the thrust falls on Orbiter's straight line, and the flow does not", () => {
  const vacuum = exhaustSpeedOf(330);
  const sea = exhaustSpeedOf(300);
  const engine: Engine = { thrust: 1_000_000, exhaustSpeed: vacuum, reference: { exhaustSpeed: sea, pressure: 101_325 } };
  assert.equal(thrustAt(engine, 0), 1_000_000);
  assert.ok(Math.abs(thrustAt(engine, 101_325) - (1_000_000 * sea) / vacuum) < 1e-6);
  assert.ok(Math.abs(thrustAt(engine, 101_325) / massFlow(engine) - sea) < 1e-9);
  assert.equal(thrustAt(engine, 1e9), 0);
  assert.equal(thrustAt({ thrust: 5, exhaustSpeed: 3_000 }, 101_325), 5);
  assert.equal(thrustAt(engine, 0, 0.25), 250_000);
  assert.equal(massFlow(engine, 2), massFlow(engine, 1));
});
