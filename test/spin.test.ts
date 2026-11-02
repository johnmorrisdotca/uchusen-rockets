import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanWay, DEFAULT_SPIN, spinOf } from "../src/index.ts";

test("the way is cw or ccw, and a bad value is the default", () => {
  assert.equal(cleanWay("cw"), "cw");
  assert.equal(cleanWay("ccw"), "ccw");
  for (const bad of ["CCW", "left", "", null, undefined, 3, '"><script>alert(1)</script>']) assert.equal(cleanWay(bad), DEFAULT_SPIN.way);
});

test("a spin is a name or seconds a turn; a bad value is the default and a negative one is none", () => {
  assert.deepEqual(spinOf(null, null), DEFAULT_SPIN);
  assert.deepEqual(spinOf("off", null), { seconds: 0, way: "cw" });
  assert.deepEqual(spinOf("slow", "ccw"), { seconds: 180, way: "ccw" });
  assert.deepEqual(spinOf("medium", "cw"), { seconds: 67, way: "cw" });
  assert.deepEqual(spinOf("fast", "nonsense"), { seconds: 20, way: "cw" });
  assert.deepEqual(spinOf("42", "ccw"), { seconds: 42, way: "ccw" });
  assert.deepEqual(spinOf("-5", null), { seconds: 0, way: "cw" });
  assert.deepEqual(spinOf("not a number", null), DEFAULT_SPIN);
  assert.deepEqual(spinOf("", null), DEFAULT_SPIN);
  // not a name from an object's own properties
  assert.deepEqual(spinOf("constructor", null), DEFAULT_SPIN);
});
