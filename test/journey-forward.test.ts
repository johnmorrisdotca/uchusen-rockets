import assert from "node:assert/strict";
import { test } from "node:test";
import { bodySpan, destinationGrow, forwardStar } from "../src/journey/forward.ts";

test("a star stays put at rest and crowds the nose as the ship nears light", () => {
  const still = forwardStar(0.1, 0.2, 0);
  assert.equal(still.x, 0.1);
  assert.equal(still.y, 0.2);
  const fast = forwardStar(0.1, 0.2, 0.9);
  assert.ok(fast.x > 0.1 && fast.x < 0.5, String(fast.x));
  assert.ok(fast.y > 0.2 && fast.y < 0.5, String(fast.y));
  assert.ok(forwardStar(0.5, 0.5, 0.9).blue > forwardStar(0.05, 0.05, 0.9).blue);
});

test("the destination is a point at departure and fills the view at arrival", () => {
  assert.equal(destinationGrow(0), 0);
  assert.equal(destinationGrow(1), 1);
  assert.equal(destinationGrow(0.5), 0.25);
  assert.equal(destinationGrow(-1), 0);
  assert.equal(destinationGrow(3), 1);
});

test("a body fills the view on the ground and stays a dot when it is far", () => {
  const ground = bodySpan(6371, 6371);
  const high = bodySpan(6371, 42_000);
  const far = bodySpan(3396, 1e8);
  assert.ok(ground > 0.9, String(ground));
  assert.ok(high < ground && high > 0.1, String(high));
  assert.equal(far, 0.02);
});
