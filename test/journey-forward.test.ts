import assert from "node:assert/strict";
import { test } from "node:test";
import { bodySpan, destinationGrow, forwardStar, perceivedAlong, perceivedSpan } from "../src/journey/forward.ts";

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

test("perceived size is a small disc far away and fills the view only up close", () => {
  const far = perceivedSpan(1e8, 1e8, 6371);
  const mid = perceivedSpan(1e6, 1e8, 6371);
  const near = perceivedSpan(6371, 1e8, 6371);
  assert.ok(far > 0.03 && far < 0.06, String(far));
  assert.ok(mid > far && mid < near, `${mid} between ${far} and ${near}`);
  assert.ok(near > 0.85, String(near));
  const leaving = perceivedSpan(1e6, 1e8, 6371);
  const gone = perceivedSpan(1e8, 1e8, 6371);
  assert.ok(gone < leaving, `${gone} should be under ${leaving}`);
});

test("a progress-only perceived size starts small and fills the view at the end", () => {
  const steps = [0, 0.1, 0.25, 0.5, 0.75, 1].map((t) => perceivedAlong(t));
  assert.ok(steps[0]! > 0.03 && steps[0]! < 0.06, String(steps[0]));
  assert.ok(steps[2]! < 0.12, String(steps[2]));
  for (let i = 1; i < steps.length; i += 1) assert.ok(steps[i]! > steps[i - 1]!, `${steps[i]} after ${steps[i - 1]}`);
  assert.ok(steps[5]! > 0.85, String(steps[5]));
});

test("a body fills the view on the ground and stays a dot when it is far", () => {
  const ground = bodySpan(6371, 6371);
  const high = bodySpan(6371, 42_000);
  const far = bodySpan(3396, 1e8);
  assert.ok(ground > 0.9, String(ground));
  assert.ok(high < ground && high > 0.1, String(high));
  assert.equal(far, 0.02);
});
