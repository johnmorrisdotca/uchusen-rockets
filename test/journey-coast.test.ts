import assert from "node:assert/strict";
import { test } from "node:test";
import { ANDROMEDA_LY, ANDROMEDA_PC, C, COAST_MAX_LY, G0, GALACTIC_CENTRE_LY, GALACTIC_CENTRE_PC, LY_M, PROXIMA_LY, coastPlace, keptGoing } from "../src/journey/index.ts";

test("keeping on at the reference extreme covers about fourteen light minutes in a minute and a half aboard", () => {
  // 1.61 million g for 86 s of ship time is the sheet's extreme. It is a check of the arithmetic, not a way to fly.
  const gone = keptGoing(1.61e6 * G0, 86);
  assert.ok(Math.abs(gone.earthS - 14.8 * 60) < 40, String(gone.earthS));
  assert.ok(Math.abs(gone.distanceM / (14 * 60 * C) - 1) < 0.08, String(gone.distanceM));
});

test("a day at one g stays between a light second and a light hour, and the clocks barely disagree", () => {
  const gone = keptGoing(G0, 86_400);
  assert.ok(gone.distanceM > C);
  assert.ok(gone.distanceM < C * 3600);
  assert.ok(Math.abs(gone.earthS - 86_400) < 1);
  assert.deepEqual(keptGoing(0, 10), { distanceM: 0, earthS: 0 });
  assert.deepEqual(keptGoing(G0, 0), { distanceM: 0, earthS: 0 });
});

test("the log line runs from a light second out past Andromeda, with the named places in order", () => {
  assert.equal(GALACTIC_CENTRE_PC, 8178);
  assert.equal(ANDROMEDA_PC, 752_000);
  assert.ok(GALACTIC_CENTRE_LY > 26_000 && GALACTIC_CENTRE_LY < 28_000, String(GALACTIC_CENTRE_LY));
  assert.ok(ANDROMEDA_LY > 2_000_000 && ANDROMEDA_LY < 3_000_000, String(ANDROMEDA_LY));
  assert.ok(ANDROMEDA_LY < COAST_MAX_LY);
  const at = (ly: number): number => coastPlace(ly * LY_M);
  assert.equal(coastPlace(0), 0);
  assert.equal(coastPlace(C), 0);
  assert.ok(coastPlace(C * 3600) < at(1));
  assert.ok(at(1) < at(PROXIMA_LY));
  assert.ok(at(PROXIMA_LY) < at(1_000));
  assert.ok(at(1_000) < at(GALACTIC_CENTRE_LY));
  assert.ok(at(GALACTIC_CENTRE_LY) < at(1_000_000));
  assert.ok(at(1_000_000) < at(ANDROMEDA_LY));
  assert.ok(at(ANDROMEDA_LY) < 1);
  assert.equal(coastPlace(COAST_MAX_LY * LY_M * 10), 1);
});
