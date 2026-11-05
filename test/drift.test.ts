import assert from "node:assert/strict";
import { test } from "node:test";
import { coast, wrapShift } from "../src/element/drift.ts";

test("a throw keeps moving at the speed it was given", () => {
  assert.equal(coast(0, 40, 0.5), 20);
  assert.equal(coast(20, 40, 0.5), 40);
  assert.equal(coast(10, 0, 1), 10);
});

test("a centre that leaves one edge comes back at the other", () => {
  assert.equal(wrapShift(800, 800), -800);
  assert.equal(wrapShift(799, 800), 0);
  assert.equal(wrapShift(-1, 800), 800);
  assert.equal(wrapShift(0, 800), 0);
  assert.equal(wrapShift(400, 0), 0);
});
