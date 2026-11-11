// The port against Orbiter itself: Orbiter's own Elements class (Src/Orbiter/Element.cpp, compiled unchanged by scripts/orbiter-reference.ts)
// gave the elements and the positions in test/data/orbiter-elements.json for six orbits, closed and open; the port must give the same.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { elementsOf, stateOf, type Vec3 } from "../src/physics/index.ts";

interface Answer { a: number; e: number; i: number; node: number; argPeriapsis: number; longitudePeriapsis: number; trueAnomaly: number; eccentricAnomaly: number; meanAnomaly: number; periapsis: number; semiLatus: number; period: number | null; apoapsis: number | null; timeToPeriapsis: number; states: { t: number; position: Vec3; velocity: Vec3 }[] }
const DATA = JSON.parse(readFileSync(new URL("data/orbiter-elements.json", import.meta.url), "utf8")) as { cases: { name: string; gm: number; position: Vec3; velocity: Vec3; orbiter: Answer }[] };

const relative = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));
const apart = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("Orbiter's six orbits are all there, closed and open", () => {
  assert.equal(DATA.cases.length, 6);
  assert.ok(DATA.cases.some((c) => c.orbiter.e > 1));
  assert.ok(DATA.cases.some((c) => c.orbiter.e < 1e-8));
});

for (const c of DATA.cases) {
  test(`the elements of "${c.name}" are Orbiter's`, () => {
    const mine = elementsOf(c.gm, c.position, c.velocity);
    const want = c.orbiter;
    for (const key of ["a", "e", "periapsis", "semiLatus"] as const) assert.ok(relative(mine[key], want[key]) < 1e-9, `${key}: ${mine[key]} against ${want[key]}`);
    // The port takes its angles with atan2 where Orbiter takes acos, which loses half the digits next to 0 and pi: on the circle Orbiter's node and true anomaly are 1.5e-8 radians where the port's are 0.
    for (const key of ["i", "node", "argPeriapsis", "longitudePeriapsis", "trueAnomaly", "eccentricAnomaly", "meanAnomaly"] as const) assert.ok(Math.abs(mine[key] - want[key]) < 3e-8, `${key}: ${mine[key]} against ${want[key]}`);
    assert.equal(Number.isFinite(mine.period), want.period !== null);
    if (want.period !== null) assert.ok(relative(mine.period, want.period) < 1e-9);
    // On a circle, periapsis now and periapsis one turn from now are the same point: Orbiter's rounding put this one a turn away.
    const turn = want.period ?? Infinity;
    const late = Math.min(...[0, turn, -turn].map((k) => Math.abs(mine.timeToPeriapsis - want.timeToPeriapsis + k)));
    assert.ok(late < 1e-6 * Math.max(1, Math.abs(want.timeToPeriapsis)), `timeToPeriapsis: ${mine.timeToPeriapsis} against ${want.timeToPeriapsis}`);
    if (want.apoapsis !== null) assert.ok(relative(mine.apoapsis, want.apoapsis) < 1e-9);
  });

  test(`"${c.name}" is where Orbiter puts it, to the millimetre, at every time`, () => {
    const mine = elementsOf(c.gm, c.position, c.velocity);
    // Orbiter's own answer at time 0 can miss its starting point (by 0.19 m on the circle, from those 1.5e-8 radians); the port may differ by about that much more (twice it for the speed, whose direction the error turns).
    const start = c.orbiter.states.find((s) => s.t === 0)!;
    const own = apart(start.position, c.position);
    const ownSpeed = apart(start.velocity, c.velocity);
    assert.ok(apart(stateOf(mine, 0).position, c.position) < 1e-6, "the port lands on its starting point");
    for (const want of c.orbiter.states) {
      const got = stateOf(mine, want.t);
      assert.ok(apart(got.position, want.position) < 1e-3 + own, `at ${want.t} s: ${apart(got.position, want.position)} m apart`);
      assert.ok(apart(got.velocity, want.velocity) < 1e-6 + 2 * ownSpeed, `at ${want.t} s: ${apart(got.velocity, want.velocity)} m/s apart`);
    }
  });
}
