import assert from "node:assert/strict";
import { test } from "node:test";
import { easedDistance } from "../src/framing.ts";

test("a camera ease is even in scale and meets both ends", () => {
  assert.ok(Math.abs(easedDistance(60, 1800, 0) - 60) < 1e-6);
  assert.ok(Math.abs(easedDistance(60, 1800, 1) - 1800) < 1e-6);
  const mid = easedDistance(60, 1800, 0.5);
  assert.ok(Math.abs(mid - Math.sqrt(60 * 1800)) < 1, String(mid));
  assert.ok(mid < (60 + 1800) / 2, "the halfway distance is nearer the small end than a straight blend");
  let last = 0;
  for (const t of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
    const distance = easedDistance(60, 1800, t);
    assert.ok(distance > last, `${t} did not grow`);
    last = distance;
  }
});
