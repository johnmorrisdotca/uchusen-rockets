import assert from "node:assert/strict";
import { test } from "node:test";
import { C } from "../src/journey/constants.ts";
import { CMB_REST_K, cmbAhead } from "../src/journey/physics.ts";

test("the microwave sky stays at rest through the solar system and heats up ahead of a fast ship", () => {
  const orbit = cmbAhead(30_000);
  assert.equal(orbit.fast, false);
  assert.equal(orbit.kelvin, CMB_REST_K);
  const fast = cmbAhead(0.1 * C);
  assert.equal(fast.fast, true);
  const expected = CMB_REST_K * Math.sqrt(1.1 / 0.9);
  assert.ok(Math.abs(fast.kelvin - expected) < 1e-9, `${fast.kelvin} vs ${expected}`);
  assert.ok(fast.kelvin > 3, "a tenth of light speed makes the sky ahead hotter than 3 K");
});
