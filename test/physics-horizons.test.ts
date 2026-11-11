// The propagator against JPL Horizons, from the tables saved in test/data/orbit-horizons.json by scripts/fetch-orbit-reference.ts (no network
// here). Each flight starts from Horizons' position and speed, is moved forward with gravity from Horizons' own bodies, and is measured
// against where Horizons puts it. What is left over is named in each test: it is what the flight leaves out, not the integrator.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { elementsOf, gravityAt, propagate, type GravityBody, type Method, type State, type Vec3 } from "../src/physics/index.ts";

interface Flight { jd0: number; step: string; craft: number[][]; bodies: Record<string, number[][]> }
const H = JSON.parse(readFileSync(new URL("data/orbit-horizons.json", import.meta.url), "utf8")) as {
  gm: Record<string, number>;
  obliquityArcsec: number;
  earth: { j2: number; radiusKm: number; gm: number; siderealYearDays: number };
  earthMoonBarycentre: { state: number[] };
  moon: Flight;
  roadster: Flight;
  iss: { craft: number[][] };
};

const DAY = 86_400;
const metres = (row: number[], from: number): Vec3 => [row[from]! * 1000, row[from + 1]! * 1000, row[from + 2]! * 1000];
const stateFrom = (row: number[]): State => ({ t: 0, position: metres(row, 0), velocity: metres(row, 3) });
const apart = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Where a body of a table is at `t` seconds: cubic Hermite between the two rows round it, from their positions and speeds. */
function at(rows: number[][], stepS: number, t: number): Vec3 {
  const i = Math.min(rows.length - 2, Math.max(0, Math.floor(t / stepS)));
  const s = t / stepS - i;
  const [a, b] = [rows[i]!, rows[i + 1]!];
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  const k = (n: 0 | 1 | 2) => 1000 * (h00 * a[n]! + h10 * stepS * a[n + 3]! + h01 * b[n]! + h11 * stepS * b[n + 3]!);
  return [k(0), k(1), k(2)];
}

/** Flies a craft through a flight's table and gives how far it is from Horizons at each row, metres. */
function fly(flight: Flight, stepS: number, gmKm3: Record<string, number>, h: number, method: Method, extra: (name: string) => Partial<GravityBody> = () => ({})): number[] {
  const names = Object.keys(flight.bodies).filter((name) => gmKm3[name] !== undefined);
  const acceleration = (t: number, p: Vec3) => gravityAt(p, names.map((name) => ({ gm: gmKm3[name]! * 1e9, position: at(flight.bodies[name]!, stepS, t), ...extra(name) })));
  let state = stateFrom(flight.craft[0]!);
  const misses: number[] = [];
  for (let i = 1; i < flight.craft.length; i++) {
    state = propagate(state, stepS, { step: h, method, acceleration });
    misses.push(apart(state.position, metres(flight.craft[i]!, 0)));
  }
  return misses;
}

test("the tables line up: the Moon for 28 days every 12 hours, the Roadster for 182 days every 2 days, the ISS for 100 minutes", () => {
  assert.equal(H.moon.craft.length, 57);
  assert.equal(H.roadster.craft.length, 92);
  assert.equal(H.iss.craft.length, 101);
  for (const flight of [H.moon, H.roadster]) for (const rows of Object.values(flight.bodies)) assert.equal(rows.length, flight.craft.length);
});

test("the Moon, flown 28 days with the Sun and the planets as point masses, ends within 2.5 km of Horizons, whatever the method", () => {
  // Measured 2026-11-11: 1.77 km (rk4), 1.80 km (sy4), 1.78 km (sy8), one-hour steps. What is left is mostly the Earth's flattening (next test).
  for (const method of ["rk4", "sy4", "sy8"] as const) {
    const misses = fly(H.moon, DAY / 2, H.gm, 3600, method);
    assert.ok(misses[misses.length - 1]! < 2500, `${method}: ${misses[misses.length - 1]} m`);
  }
});

test("adding the Earth's J2 (Horizons' own) brings the Moon within 1 km of Horizons after 28 days", () => {
  // The Earth's pole in the ecliptic of J2000, from the obliquity on JPL's Astrodynamic Parameters page.
  const obliquity = (H.obliquityArcsec / 3600) * (Math.PI / 180);
  const zonal = { radius: H.earth.radiusKm * 1000, pole: [0, Math.sin(obliquity), Math.cos(obliquity)] as Vec3, j: [H.earth.j2] };
  const flat = fly(H.moon, DAY / 2, H.gm, 3600, "rk4", (name) => (name === "earth" ? { zonal } : {}));
  const round = fly(H.moon, DAY / 2, H.gm, 3600, "rk4");
  // Measured 2026-11-11: 0.76 km, against 1.77 km without it.
  assert.ok(flat[flat.length - 1]! < 1000, `${flat[flat.length - 1]} m`);
  assert.ok(flat[flat.length - 1]! < round[round.length - 1]! / 2);
});

test("the Tesla Roadster, flown half a year round the Sun, ends within 4,500 km of Horizons; the planets' pull is most of what it needs", () => {
  const gm = { ...H.gm, "earth-moon": H.gm.earth! + H.gm.moon! };
  const all = fly(H.roadster, 2 * DAY, gm, DAY / 4, "rk4");
  const sunOnly = fly({ ...H.roadster, bodies: { sun: H.roadster.bodies.sun! } }, 2 * DAY, gm, DAY / 4, "rk4");
  // Measured 2026-11-11: 4,047 km with the Sun and the planets, 20,969 km with the Sun alone. What is left is the push of sunlight:
  // Horizons' solution for the Roadster (JPL #11) fits a radial non-gravitational acceleration, "nominally solar radiation pressure", that gravity alone leaves out.
  assert.ok(all[all.length - 1]! < 4.5e6, `${all[all.length - 1]} m`);
  assert.ok(sunOnly[sunOnly.length - 1]! > 4 * all[all.length - 1]!);
});

test("the ISS, flown 100 minutes round the Earth, ends within 0.3 km of Horizons with the Earth's J2, against 48 km as a point mass", () => {
  const earth = (j: number[]): GravityBody[] => [{ gm: H.earth.gm * 1e9, position: [0, 0, 0], ...(j.length > 0 ? { zonal: { radius: H.earth.radiusKm * 1000, pole: [0, 0, 1], j } } : {}) }];
  const miss = (bodies: GravityBody[]) => {
    const end = propagate(stateFrom(H.iss.craft[0]!), 100 * 60, { step: 5, method: "rk4", acceleration: (_t, p) => gravityAt(p, bodies) });
    return apart(end.position, metres(H.iss.craft[100]!, 0));
  };
  // Measured 2026-11-11: 0.20 km with J2, 48 km without. What is left: the higher terms of the Earth's field, the air and the Earth's pole moving since J2000.
  assert.ok(miss(earth([H.earth.j2])) < 300);
  assert.ok(miss(earth([])) > 40_000);
});

test("the Earth-Moon barycentre's orbit, from Horizons' position and speed, takes the sidereal year Horizons gives (365.25636 days) to within 0.01 day", () => {
  const s = H.earthMoonBarycentre.state;
  const orbit = elementsOf((H.gm.sun! + H.gm.earth! + H.gm.moon!) * 1e9, metres(s, 0), metres(s, 3));
  // Measured 2026-11-11: 365.2574 days. The osculating period wanders with the planets' pull; the mean is the sidereal year.
  assert.ok(Math.abs(orbit.period / DAY - H.earth.siderealYearDays) < 0.01, `${orbit.period / DAY} days`);
});
