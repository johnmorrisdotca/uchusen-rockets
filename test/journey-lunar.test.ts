// Leaving the Moon: the cheap five-day Hohmann, the three-day return the page flies (Apollo's trans-Earth injection was about 1 km/s), and a departure onward to another planet.
import assert from "node:assert/strict";
import test from "node:test";
import { GM_KM3_S2, PARKING_ALTITUDE_KM } from "../src/journey/constants.ts";
import { APOLLO_RETURN_S, ENTRY_ALTITUDE_KM, atmosphereReturn, conicPoint, hohmannReturn, leaveForPlanet } from "../src/journey/lunar.ts";
import { circularSpeed } from "../src/journey/physics.ts";

const near = (a: number, b: number, tolerance: number, what: string) => assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a} against ${b}`);
const MU_E = GM_KM3_S2.earth!;
const MU_M = GM_KM3_S2.moon!;
const R_MOON = 384_400;
const R_LLO = 1737.4 + PARKING_ALTITUDE_KM.moon;
const R_LEO = 6378.137 + PARKING_ALTITUDE_KM.earth;
const R_ENTRY = 6378.137 + ENTRY_ALTITUDE_KM;

test("low lunar orbit: circular speed about 1.63 km/s and escape speed about 2.31 km/s", () => {
  near(circularSpeed(MU_M, R_LLO), 1.633, 0.01, "circular, km/s");
  near(circularSpeed(MU_M, R_LLO) * Math.SQRT2, 2.31, 0.01, "escape, km/s");
});

test("the cheapest Moon to Earth return is about 0.82 km/s and five days", () => {
  const back = hohmannReturn(MU_E, MU_M, R_MOON, R_LEO, R_LLO);
  near(back.dvKmS, 0.822, 0.01, "lunar burn, km/s");
  near(back.transitS / 3600, 119.5, 0.5, "hours");
});

test("a three-day return to the atmosphere burns about 1 km/s, as Apollo's trans-Earth injection did", () => {
  // Apollo 11 Mission Report: 3,279 ft/s (999.5 m/s). Apollo 15 flight journal: 928.7 m/s. Apollo 12 flight journal: 72 hours from the burn to the predicted splashdown.
  const back = atmosphereReturn(MU_E, MU_M, R_MOON, R_LLO, R_ENTRY, 0.4, APOLLO_RETURN_S);
  near(back.dvKmS, 1, 0.12, "lunar burn, km/s");
  near(back.transitS / 3600, 72, 1, "hours");
  const start = conicPoint(MU_E, back.conic, 0);
  const end = conicPoint(MU_E, back.conic, back.transitS);
  near(start.r, R_MOON, 50, "leaves from the Moon's distance");
  near(end.r, R_ENTRY, 80, "meets the entry interface");
  near(end.v, back.entrySpeed, 0.05, "entry speed agrees");
});

test("given a real mission's coast the return meets it, at every distance the Moon has (it stood 356,500 to 406,700 km away and an aim search that assumed one branch landed between 65 and 78 hours)", () => {
  for (let rMoon = 356_500; rMoon <= 406_700; rMoon += 2_510) {
    const back = atmosphereReturn(MU_E, MU_M, rMoon, R_LLO, R_ENTRY, 0.4, APOLLO_RETURN_S);
    near(back.transitS / 3600, 72, 0.2, `hours at ${rMoon} km`);
  }
});

test("with no mission to follow the return is the cheapest burn of those that reach the atmosphere, and never dearer than the one aimed at 72 hours", () => {
  for (const rMoon of [356_500, 384_400, 406_700]) {
    const cheap = atmosphereReturn(MU_E, MU_M, rMoon, R_LLO, R_ENTRY, 0.4);
    const apollo = atmosphereReturn(MU_E, MU_M, rMoon, R_LLO, R_ENTRY, 0.4, APOLLO_RETURN_S);
    assert.ok(cheap.dvKmS <= apollo.dvKmS + 1e-9, `${rMoon} km: ${cheap.dvKmS} against ${apollo.dvKmS}`);
    assert.ok(cheap.dvKmS > hohmannReturn(MU_E, MU_M, rMoon, R_LEO, R_LLO).dvKmS - 0.05, "not below the cheapest Hohmann");
  }
});

test("leaving the Moon for a Mars transfer, with the Moon's orbital speed helping, is about 1.6 km/s", () => {
  const burn = leaveForPlanet(MU_E, MU_M, R_MOON, R_LLO, 2.94);
  near(burn.dvKmS, 1.6, 0.05, "lunar burn, km/s");
  assert.ok(burn.dvKmS < 3.6, "less than the same departure from low Earth orbit");
});
