// Journey mode's arithmetic against the numbers the sources print: the Hohmann transfers, the burns that leave and enter a well, the synodic period, constant acceleration with a flip, and the launch windows from real positions.
import assert from "node:assert/strict";
import test from "node:test";
import { WAKUSEI_SOURCE } from "../demo/journey-bodies.ts";
import { AU_KM, C, circularSpeed, DAY_S, escapeBurn, flipAndBurn, G0, GM_KM3_S2, hohmann, kepler, LY_M, synodicPeriod, windows, YEAR_S } from "../src/journey/index.ts";
import { transferPoint } from "../src/journey/physics.ts";
import { voyage } from "../src/model/fleet/ship-02/journey.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);
const MU_SUN = GM_KM3_S2.sun!;
const MU_EARTH = GM_KM3_S2.earth!;
const R_LEO = 6378.137 + 185;

test("constants: c, one g, the AU, the Julian year and the light year", () => {
  assert.equal(C, 299_792_458);
  assert.equal(G0, 9.80665);
  assert.equal(AU_KM, 149_597_870.7);
  assert.equal(YEAR_S, 31_557_600);
  near(LY_M, 9.4607304725808e15, 1e3, "a light year in metres");
});

test("Earth to Mars Hohmann between the mean orbits: about 259 days, 2.94 and 2.65 km/s (NASA)", () => {
  const h = hohmann(MU_SUN, AU_KM, 1.52371034 * AU_KM);
  near(h.seconds / DAY_S, 258.8, 0.5, "the flight time, days");
  near(h.dv1, 2.94, 0.01, "the speed change at the Earth");
  near(h.dv2, 2.65, 0.01, "the speed change at Mars");
});

test("the synodic period of the Earth and Mars is 779.9 days", () => {
  near(synodicPeriod(365.256, 686.98), 779.9, 0.1, "days");
});

test("Earth to Moon Hohmann from 185 km: about five days (119.5 hours) and 3.13 km/s", () => {
  const h = hohmann(MU_EARTH, R_LEO, 384_400);
  near(h.seconds / 3600, 119.5, 1, "hours");
  near(h.dv1, 3.13, 0.02, "trans-lunar injection, km/s");
  near(circularSpeed(MU_EARTH, R_LEO), 7.79, 0.01, "circular speed at 185 km, km/s");
});

test("leaving and entering a well: Mars transfer from 185 km 3.6 km/s; lunar orbit insertion 0.82 km/s; Mars capture to low orbit 2.1 km/s", () => {
  near(escapeBurn(MU_EARTH, R_LEO, 2.94), 3.62, 0.03, "Mars transfer burn");
  const h = hohmann(MU_EARTH, R_LEO, 384_400);
  const vInfMoon = circularSpeed(MU_EARTH, 384_400) - Math.sqrt(MU_EARTH * (2 / 384_400 - 1 / h.a));
  near(vInfMoon, 0.832, 0.005, "speed relative to the Moon on arrival, km/s");
  near(escapeBurn(GM_KM3_S2.moon!, 1737.4 + 100, vInfMoon), 0.82, 0.02, "lunar orbit insertion");
  near(escapeBurn(GM_KM3_S2.mars!, 3396.19 + 200, 2.65), 2.1, 0.05, "Mars capture");
});

test("Kepler's equation inverts itself, and the transfer ends where it should", () => {
  for (const e of [0, 0.2, 0.7, 0.95]) for (const m of [0.1, 1, 3, 5]) near(kepler(m, e) - e * Math.sin(kepler(m, e)), m, 1e-10, `e ${e} m ${m}`);
  const h = hohmann(MU_SUN, AU_KM, 1.52371034 * AU_KM);
  const end = transferPoint(MU_SUN, AU_KM, 1.52371034 * AU_KM, 0.5, h.seconds);
  near(end.r, 1.52371034 * AU_KM, 1, "arrives at the far radius");
  near(end.theta, 0.5 + Math.PI, 1e-9, "half a turn on");
  const inward = transferPoint(MU_SUN, 1.52371034 * AU_KM, AU_KM, 0.5, h.seconds);
  near(inward.r, AU_KM, 1, "inward arrives at the near radius");
  near(inward.theta, 0.5 + Math.PI, 1e-9, "inward is half a turn too");
  const start = transferPoint(MU_SUN, AU_KM, 1.52371034 * AU_KM, 0, 0);
  near(start.v, 29.78 + 2.94, 0.05, "leaves at the Earth's speed plus the burn, km/s");
});

test("1 g flip and burn over 4.37 light years: about 3.6 years on board, about 6 in Earth's frame, peak 0.95 c", () => {
  const trip = flipAndBurn(4.37 * LY_M, G0, 0);
  near(trip.properSeconds / YEAR_S, 3.59, 0.02, "years on board");
  near(trip.frameSeconds / YEAR_S, 6.0, 0.1, "years in the frame of the two ends");
  near(trip.peakSpeed / C, 0.9525, 0.001, "peak speed in c");
});

test("the flip and burn agrees with the Ship 02 voyage arithmetic for the Proxima trip", () => {
  for (const g of [0.015, 0.04, 1]) {
    const mine = flipAndBurn(4.37 * LY_M, g * G0, 0);
    const theirs = voyage(4.37, g);
    near(mine.properSeconds / YEAR_S, theirs.shipYears, 1e-6, `ship years at ${g} g`);
    near(mine.frameSeconds / YEAR_S, theirs.endpointYears, 1e-6, `frame years at ${g} g`);
    near(mine.peakSpeed / C, theirs.peak, 1e-9, `peak at ${g} g`);
    near(mine.gamma, theirs.gamma, 1e-6, `gamma at ${g} g`);
  }
});

test("in the solar system the flip and burn is 2 sqrt(d / a), and a turn-round adds its own time and distance", () => {
  const d = 2.0 * 149_597_870_700;
  const a = 0.015 * G0;
  const trip = flipAndBurn(d, a, 0);
  near(trip.frameSeconds, 2 * Math.sqrt(d / a), 2 * Math.sqrt(d / a) * 1e-6, "seconds");
  near(trip.properSeconds, trip.frameSeconds, trip.frameSeconds * 1e-6, "no time dilation worth saying");
  const turned = flipAndBurn(d, a, 3600);
  near(turned.frameSeconds, 2 * turned.burnSeconds + 3600, 1e-6, "burns plus the turn");
  assert.ok(turned.peakSpeed < trip.peakSpeed, "a turn that covers distance leaves less to burn");
  near(2 * 0.5 * a * turned.burnSeconds ** 2 + a * turned.burnSeconds * 3600, d, d * 1e-6, "the distance adds up");
});

test("launch windows from the real positions: the Earth to Mars windows of late 2026 and late 2028, 760 to 800 days apart", () => {
  const found = windows(WAKUSEI_SOURCE, "earth", "mars", Date.UTC(2026, 8, 1), 3);
  assert.equal(found.length, 3);
  const dates = found.map((one) => new Date(one.dateMs));
  assert.ok(dates[0]! >= new Date("2026-10-01") && dates[0]! <= new Date("2026-12-31"), `first ${dates[0]?.toISOString()}`);
  assert.ok(dates[1]! >= new Date("2028-11-01") && dates[1]! <= new Date("2029-01-31"), `second ${dates[1]?.toISOString()}`);
  for (let i = 1; i < found.length; i += 1) {
    const gap = (found[i]!.dateMs - found[i - 1]!.dateMs) / (DAY_S * 1000);
    assert.ok(gap > 750 && gap < 800, `gap ${gap}`);
  }
  for (const one of found) {
    assert.ok(one.days > 235 && one.days < 275, `flight ${one.days}`);
    assert.ok(one.dv1 > 2.5 && one.dv1 < 3.6, `dv ${one.dv1}`);
  }
});

test("real positions: Mars was 55.76 million km from the Earth on 2003-08-27 (its closest in 60,000 years); Earth is 0.983 AU from the Sun in early January", () => {
  const at = Date.UTC(2003, 7, 27, 10);
  const earth = WAKUSEI_SOURCE.positionAu("earth", at);
  const mars = WAKUSEI_SOURCE.positionAu("mars", at);
  const km = Math.hypot(earth[0] - mars[0], earth[1] - mars[1], earth[2] - mars[2]) * AU_KM;
  near(km, 55_758_000, 300_000, "the distance, km");
  const perihelion = WAKUSEI_SOURCE.positionAu("earth", Date.UTC(2026, 0, 3, 16));
  near(Math.hypot(...perihelion), 0.9833, 0.001, "AU");
});
