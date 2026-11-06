// A ship that fills the frame is near, even when the camera itself has not moved in.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fineDue } from "../src/element/scene.ts";

test("the fine model follows the camera, and a large craft on a page with the Earth", () => {
  assert.equal(fineDue(true, false, 0), true);
  assert.equal(fineDue(false, false, 800), false);
  assert.equal(fineDue(false, true, 259), false);
  assert.equal(fineDue(false, true, 260), true);
  assert.equal(fineDue(false, true, Number.NaN), false);
});
