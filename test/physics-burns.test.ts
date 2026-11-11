// Burns and transfers: impulsive and finite burns, transfers flown by propagation and checked against the closed forms of
// journey/physics.ts, the change of plane at a node, the bi-elliptic transfer, and where two orbits cross.
import assert from "node:assert/strict";
import test from "node:test";
import { biElliptic, burnStart, crossings, deltaV, directionOf, elementsOf, exhaustSpeedOf, flyBurn, flyPlan, gravityAt, impulse, massAfter, nodes, planeChange, propagate, relativeInclination, speedChangeFor, stateOf, type Engine, type State, type Vec3 } from "../src/physics/index.ts";
import { hohmann } from "../src/journey/physics.ts";

const GM = 3.986004418e14;
const EARTH = [{ gm: GM, position: [0, 0, 0] as Vec3 }];
const gravity = (_t: number, p: Vec3) => gravityAt(p, EARTH);
const R1 = 6_778_000;
const R2 = 42_164_000;
const V1 = Math.sqrt(GM / R1);
const LEO: State = { t: 0, position: [R1, 0, 0], velocity: [0, V1, 0] };
const PLAN = hohmann(GM, R1, R2);
const radius = (s: { position: Vec3 }) => Math.hypot(...s.position);
const engineOf = (thrust: number): Engine => ({ thrust, exhaustSpeed: exhaustSpeedOf(314) });
const DEG = Math.PI / 180;

test("an impulsive Hohmann transfer, flown by Kepler's equation, reaches the far circle exactly as journey/physics.ts says", () => {
  assert.ok(Math.abs(speedChangeFor(GM, R1, R1, PLAN.a) - PLAN.dv1) < 1e-9);
  const out = impulse(LEO, PLAN.dv1, "prograde");
  const transfer = elementsOf(GM, out.position, out.velocity);
  assert.ok(Math.abs(transfer.apoapsis - R2) < 1e-3);
  assert.ok(Math.abs(transfer.period / 2 - PLAN.seconds) < 1e-6);
  const apogee = stateOf(transfer, PLAN.seconds);
  assert.ok(Math.abs(radius(apogee) - R2) < 1e-3);
  const done = impulse({ t: PLAN.seconds, ...apogee }, PLAN.dv2, "prograde");
  const final = elementsOf(GM, done.position, done.velocity);
  assert.ok(final.e < 1e-9 && Math.abs(final.a - R2) < 1e-3, `e ${final.e}, a ${final.a}`);
});

test("a Hohmann transfer flown with finite burns, each centred on its point, comes nearer the closed form as the engine gets stronger", () => {
  const end = 1_000 + PLAN.seconds + 3_600;
  const flown = (thrust: number) => {
    const engine = engineOf(thrust);
    const plan = [{ at: 1_000, engine, direction: "prograde" as const, dv: PLAN.dv1 }, { at: 1_000 + PLAN.seconds, engine, direction: "prograde" as const, dv: PLAN.dv2 }];
    const result = flyPlan(LEO, 20_000, plan, end, { step: 2, gravity });
    return { result, final: elementsOf(GM, result.state.position, result.state.velocity) };
  };
  // Measured 2026-11-11, 20 t craft, 314 s engine: 3 MN (burns of 11 and 4 s) ends 1.3 km from the circle's radius with e 7e-5;
  // 1 MN 3.5 km, e 4.5e-5; 300 kN 39 km, e 0.0019; 91 kN (365 and 117 s) 404 km, e 0.025: the longer the burn, the more of it is off its point.
  const misses = [3_000_000, 1_000_000, 300_000, 91_189].map((thrust) => {
    const { result, final } = flown(thrust);
    assert.ok(Math.abs(result.mass - massAfter(exhaustSpeedOf(314), 20_000, PLAN.dv1 + PLAN.dv2)) < 1e-6, "the propellant is the rocket equation's");
    assert.equal(result.burns.length, 2);
    return { a: Math.abs(final.a - R2), e: final.e };
  });
  assert.ok(misses[0]!.a < 5_000 && misses[0]!.e < 1e-4);
  for (let i = 1; i < misses.length; i++) assert.ok(misses[i]!.a > misses[i - 1]!.a * 0.9, `${JSON.stringify(misses)}`);
  assert.ok(misses[3]!.a > 100_000);
});

test("a burn for a change of speed gives that change in free space, burns the rocket equation's propellant, and can be centred on its point", () => {
  const engine = engineOf(91_189);
  const still = { t: 100, position: [0, 0, 0] as Vec3, velocity: [0, 0, 0] as Vec3 };
  const burn = flyBurn(still, 20_000, { engine, direction: [0, 1, 0], dv: 1_000 }, { step: 1, gravity: () => [0, 0, 0] });
  assert.ok(Math.abs(burn.state.velocity[1] - 1_000) < 1e-6);
  assert.ok(Math.abs(burn.dv - 1_000) < 1e-9 && Math.abs(burn.mass - massAfter(engine.exhaustSpeed, 20_000, 1_000)) < 1e-9);
  assert.equal(burn.state.t, 100 + burn.seconds);
  assert.equal(burn.short, false);
  assert.equal(burnStart(500, burn.seconds), 500 - burn.seconds / 2);
  const half = flyBurn(still, 20_000, { engine, direction: [0, 1, 0], seconds: burn.seconds, throttle: 0.5 }, { step: 1, gravity: () => [0, 0, 0] });
  assert.ok(Math.abs(half.dv - deltaV(engine.exhaustSpeed, 20_000, 20_000 - half.propellant)) < 1e-9 && half.dv < 1_000);
});

test("a burn that needs more propellant than there is stops at the dry mass and says so", () => {
  const burn = flyBurn(LEO, 20_000, { engine: engineOf(91_189), direction: "prograde", dv: 10_000 }, { step: 2, gravity, dryMass: 12_000 });
  assert.equal(burn.short, true);
  assert.ok(Math.abs(burn.mass - 12_000) < 1e-6);
  assert.ok(Math.abs(burn.dv - deltaV(exhaustSpeedOf(314), 20_000, 12_000)) < 1e-9);
});

test("the named directions are the orbit's: along the speed, along the angular momentum, away from the body, and a body that moves carries them", () => {
  const p: Vec3 = [R1, 0, 0];
  const v: Vec3 = [0, V1, 0];
  assert.deepEqual(directionOf("prograde", p, v), [0, 1, 0]);
  assert.deepEqual(directionOf("retrograde", p, v), [-0, -1, -0]);
  assert.deepEqual(directionOf("normal", p, v), [0, 0, 1]);
  assert.deepEqual(directionOf("antinormal", p, v), [-0, -0, -1]);
  assert.deepEqual(directionOf("radial-out", p, v), [1, 0, 0]);
  assert.deepEqual(directionOf("radial-in", p, v), [-1, -0, -0]);
  assert.deepEqual(directionOf([0, 0, 5], p, v), [0, 0, 1]);
  assert.throws(() => directionOf([0, 0, 0], p, v), RangeError);
  // A craft beside a body moving at 30 km/s: prograde is along the speed relative to the body, not the frame.
  const moving = impulse({ t: 0, position: [1e11 + R1, 0, 0], velocity: [0, 30_000 + V1, 0] }, 10, "radial-out", () => ({ position: [1e11, 0, 0], velocity: [0, 30_000, 0] }));
  assert.ok(Math.abs(moving.velocity[0] - 10) < 1e-9);
});

test("a change of plane at a node: the nodes lie on both planes, half a turn apart, and a Hohmann transfer with the plane change in its second burn ends on the equator's circle", () => {
  const tilt = 28.5 * DEG;
  const start = propagate({ t: 0, position: [R1, 0, 0], velocity: [0, V1 * Math.cos(tilt), V1 * Math.sin(tilt)] }, 1_000, { step: 5, method: "sy8", acceleration: gravity });
  const ship = elementsOf(GM, start.position, start.velocity);
  const equator = elementsOf(GM, [R1, 0, 0], [0, V1, 0]);
  const n = nodes(ship, equator)!;
  assert.ok(Math.abs(n.relativeInclination - tilt) < 1e-12 && Math.abs(relativeInclination(ship, equator) - tilt) < 1e-12);
  assert.ok(Math.abs(Math.abs(n.ascending.seconds - n.descending.seconds) - ship.period / 2) < 1e-6);
  for (const node of [n.ascending, n.descending]) assert.ok(Math.abs(stateOf(ship, node.seconds).position[2]) < 1e-3);
  assert.ok(stateOf(ship, n.ascending.seconds + 1).position[2] > 0, "the ascending node goes north");
  assert.ok(Math.abs(n.ascending.dv - 2 * V1 * Math.sin(tilt / 2)) < 1e-6);
  assert.equal(nodes(equator, equator), null);

  const there = stateOf(ship, n.descending.seconds);
  const transfer = elementsOf(GM, there.position, impulse({ t: 0, ...there }, PLAN.dv1, "prograde").velocity);
  const apogee = stateOf(transfer, PLAN.seconds);
  const speed = Math.hypot(...apogee.velocity);
  const level: Vec3 = [apogee.velocity[0], apogee.velocity[1], 0];
  const circular = Math.sqrt(GM / R2) / Math.hypot(...level);
  const change: Vec3 = [level[0] * circular - apogee.velocity[0], level[1] * circular - apogee.velocity[1], -apogee.velocity[2]];
  assert.ok(Math.abs(Math.hypot(...change) - planeChange(speed, tilt, Math.sqrt(GM / R2))) < 1e-6);
  const done = impulse({ t: 0, ...apogee }, Math.hypot(...change), change);
  const final = elementsOf(GM, done.position, done.velocity);
  assert.ok(final.i < 1e-9 && final.e < 1e-9 && Math.abs(final.a - R2) < 1e-3, `i ${final.i}, e ${final.e}, a ${final.a}`);
});

test("a finite burn along the normal at the node, of Orbiter's estimate v times the angle, turns the plane by that angle to within a twentieth", () => {
  const tilt = 5 * DEG;
  const ship = elementsOf(GM, LEO.position, LEO.velocity);
  const engine = engineOf(91_189);
  const at = ship.period / 2;
  const flown = flyPlan(LEO, 20_000, [{ at, engine, direction: "normal", dv: V1 * tilt }], at + 600, { step: 1, gravity });
  const after = elementsOf(GM, flown.state.position, flown.state.velocity);
  // Measured 2026-11-11: the plane turns by 4.99 degrees.
  assert.ok(Math.abs(after.i - tilt) < tilt / 20, `${after.i / DEG} degrees`);
});

test("the bi-elliptic transfer: with the far point at the final orbit its speeds are Hohmann's, flown it ends on the circle, and far out it costs less", () => {
  const same = biElliptic(GM, R1, R2, R2);
  assert.ok(Math.abs(same.dv1 - PLAN.dv1) < 1e-9 && Math.abs(same.dv2 - PLAN.dv2) < 1e-9 && same.dv3 === 0);
  const rb = 3 * R2;
  const plan = biElliptic(GM, R1, R2, rb);
  let state = impulse(LEO, plan.dv1, "prograde");
  let el = elementsOf(GM, state.position, state.velocity);
  state = { t: 0, ...stateOf(el, el.period / 2) };
  assert.ok(Math.abs(radius(state) - rb) < 1e-3);
  state = impulse(state, plan.dv2, "prograde");
  el = elementsOf(GM, state.position, state.velocity);
  state = { t: 0, ...stateOf(el, el.period / 2) };
  state = impulse(state, plan.dv3, "retrograde");
  const final = elementsOf(GM, state.position, state.velocity);
  assert.ok(final.e < 1e-9 && Math.abs(final.a - R2) < 1e-3);
  // Measured 2026-11-11: to 20 times the starting radius, the far point at 100 times costs less than Hohmann's two burns.
  const far = biElliptic(GM, R1, 20 * R1, 100 * R1);
  const direct = hohmann(GM, R1, 20 * R1);
  assert.ok(far.total < direct.dv1 + direct.dv2);
});

test("where two orbits in one plane cross: both points are on both, orbits that never meet have none, and an open path counts only what it reaches", () => {
  const transfer = elementsOf(GM, [R1, 0, 0], [0, 9_000, 0]);
  const middle = 10_000_000;
  const circle = elementsOf(GM, [middle, 0, 0], [0, Math.sqrt(GM / middle), 0]);
  const found = crossings(transfer, circle);
  assert.equal(found.length, 2);
  for (const nu of found) assert.ok(Math.abs(transfer.semiLatus / (1 + transfer.e * Math.cos(nu)) - middle) < 1e-3);
  const far = elementsOf(GM, [1e9, 0, 0], [0, Math.sqrt(GM / 1e9), 0]);
  assert.deepEqual(crossings(transfer, far), []);
  const escape = elementsOf(GM, [R1, 0, 0], [0, 12_000, 0]);
  assert.equal(crossings(escape, far).length, 2);
  assert.ok(crossings(escape, far).every((nu) => 1 + escape.e * Math.cos(nu) > 0));
});

test("a plan whose burns overlap is refused", () => {
  const engine = engineOf(91_189);
  assert.throws(() => flyPlan(LEO, 20_000, [{ at: 1_000, engine, direction: "prograde", dv: 2_000 }, { at: 1_050, engine, direction: "prograde", dv: 2_000 }], 3_000, { step: 5, gravity }), RangeError);
});
