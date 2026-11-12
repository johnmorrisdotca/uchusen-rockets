// The air: Orbiter's own 2006 models (test/data/orbiter-atmosphere.json, from their clbkParams compiled by scripts/orbiter-reference.ts),
// the 1976 U.S. Standard Atmosphere against rows of its printed Table I (test/data/ussa1976-table1.json), and drag in flight.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { airVelocity, atmosphereAt, dragAcceleration, dynamicPressure, EARTH_ATMOSPHERE, exhaustSpeedOf, gravityAt, machNumber, MARS_ATMOSPHERE, propagate, standardAtmosphere, thrustAt, VENUS_ATMOSPHERE, type AtmosphereModel, type State, type Vec3 } from "../src/physics/index.ts";

const ORBITER = JSON.parse(readFileSync(new URL("data/orbiter-atmosphere.json", import.meta.url), "utf8")) as { air: { planet: string; altitude: number; temperature: number; pressure: number; density: number }[] };
const TABLE = JSON.parse(readFileSync(new URL("data/ussa1976-table1.json", import.meta.url), "utf8")) as { rows: { altitude: number; temperature: number; pressure: number; density: number }[] };
const MODELS: Record<string, AtmosphereModel> = { earth: EARTH_ATMOSPHERE, mars: MARS_ATMOSPHERE, venus: VENUS_ATMOSPHERE };
const relative = (a: number, b: number) => Math.abs(a / b - 1);

test("the Earth's, Mars's and Venus's air is what Orbiter's own 2006 models give, at every height", () => {
  assert.ok(ORBITER.air.length >= 25);
  for (const want of ORBITER.air) {
    const got = atmosphereAt(MODELS[want.planet]!, want.altitude);
    for (const key of ["temperature", "pressure", "density"] as const) assert.ok(relative(got[key], want[key]) < 1e-12, `${want.planet} at ${want.altitude} m, ${key}: ${got[key]} against ${want[key]}`);
  }
});

test("above a model's limit there is no air, as in Orbiter; the speed of sound is sqrt(gamma R T)", () => {
  assert.deepEqual(atmosphereAt(EARTH_ATMOSPHERE, 200_001), { temperature: 0, pressure: 0, density: 0, speedOfSound: 0 });
  assert.equal(atmosphereAt(MARS_ATMOSPHERE, 100_001).density, 0);
  const air = atmosphereAt(EARTH_ATMOSPHERE, 11_000);
  assert.ok(Math.abs(air.speedOfSound - Math.sqrt(1.4 * 286.91 * air.temperature)) < 1e-9);
  assert.equal(machNumber(100, atmosphereAt(EARTH_ATMOSPHERE, 300_000)), 0);
  assert.ok(Math.abs(machNumber(air.speedOfSound * 2, air) - 2) < 1e-12);
});

test("the 1976 U.S. Standard Atmosphere, from its defining constants, gives its printed Table I to the table's five figures", () => {
  // Measured 2026-11-11: within 4e-5 in pressure and density and 0.0005 K, the rounding of the printed figures.
  for (const row of TABLE.rows) {
    const air = standardAtmosphere(row.altitude)!;
    assert.ok(Math.abs(air.temperature - row.temperature) < 0.001, `${row.altitude} m: ${air.temperature} K`);
    assert.ok(relative(air.pressure, row.pressure) < 1e-4, `${row.altitude} m: ${air.pressure} Pa`);
    assert.ok(relative(air.density, row.density) < 1e-4, `${row.altitude} m: ${air.density} kg/m^3`);
  }
  assert.equal(standardAtmosphere(90_000), null);
  assert.equal(standardAtmosphere(-6_000), null);
});

test("Orbiter's 2006 Earth agrees with the standard to 20 km and parts from it above: 3 per cent in pressure at 38 km, 17 at 60 km", () => {
  for (const height of [0, 5_000, 11_000, 19_000]) assert.ok(relative(atmosphereAt(EARTH_ATMOSPHERE, height).pressure, standardAtmosphere(height)!.pressure) < 2e-3);
  // Measured 2026-11-11 against the standard: 3.3 per cent at 38 km, 16.8 per cent at 60 km (its upper layers are older ones).
  assert.ok(relative(atmosphereAt(EARTH_ATMOSPHERE, 38_000).pressure, standardAtmosphere(38_000)!.pressure) < 0.04);
  assert.ok(relative(atmosphereAt(EARTH_ATMOSPHERE, 60_000).pressure, standardAtmosphere(60_000)!.pressure) < 0.2);
});

test("drag pushes against the airflow with the dynamic pressure times Cd A, and air that turns with the planet carries a craft at rest on it", () => {
  const drag = dragAcceleration(1.2, [0, 0, -50], 0.5, 100);
  assert.ok(Math.abs(drag[2] - (dynamicPressure(1.2, 50) * 0.5) / 100) < 1e-12 && drag[0] === 0 && drag[1] === 0);
  assert.deepEqual(dragAcceleration(1.2, [0, 0, 0], 0.5, 100), [0, 0, 0]);
  const spin: Vec3 = [0, 0, 7.292115e-5];
  const onTheGround: Vec3 = [6_378_137, 0, 0];
  assert.ok(Math.hypot(...airVelocity(onTheGround, [0, 6_378_137 * 7.292115e-5, 0], spin)) < 1e-9);
});

test("a body dropped from 30 km falls at its terminal speed, sqrt(2 m g / (rho Cd A)), near the ground", () => {
  const gm = 3.986004418e14;
  const radius = EARTH_ATMOSPHERE.radius;
  const [mass, dragArea] = [100, 0.5];
  const acceleration = (_t: number, p: Vec3, v: Vec3): Vec3 => {
    const g = gravityAt(p, [{ gm, position: [0, 0, 0] }]);
    const d = dragAcceleration(atmosphereAt(EARTH_ATMOSPHERE, Math.hypot(...p) - radius).density, v, dragArea, mass);
    return [g[0] + d[0], g[1] + d[1], g[2] + d[2]];
  };
  let state: State = { t: 0, position: [radius + 30_000, 0, 0], velocity: [0, 0, 0] };
  while (Math.hypot(...state.position) - radius > 2_000) state = propagate(state, 1, { step: 0.1, method: "rk4", acceleration });
  const r = Math.hypot(...state.position);
  const terminal = Math.sqrt((2 * mass * (gm / (r * r))) / (atmosphereAt(EARTH_ATMOSPHERE, r - radius).density * dragArea));
  // Measured 2026-11-11: 63.0 m/s at 2 km against 62.4, the lag of a body still slowing as the air thickens.
  assert.ok(relative(Math.hypot(...state.velocity), terminal) < 0.02, `${Math.hypot(...state.velocity)} against ${terminal}`);
});

test("an engine's thrust in air comes from the model's pressure", () => {
  const engine = { thrust: 1_000_000, exhaustSpeed: exhaustSpeedOf(330), reference: { exhaustSpeed: exhaustSpeedOf(300), pressure: 101_325 } };
  assert.ok(Math.abs(thrustAt(engine, atmosphereAt(EARTH_ATMOSPHERE, 0).pressure) - (1_000_000 * 300) / 330) < 1e-6);
  assert.ok(thrustAt(engine, atmosphereAt(EARTH_ATMOSPHERE, 30_000).pressure) > 0.99 * 1_000_000);
});
