// A still view stops drawing after 90 seconds. A page may name a shorter wait; a blank or bad value keeps the 90 seconds.
import assert from "node:assert/strict";
import { test } from "node:test";
import { IDLE_STOP_MS, idleStopMs, idleStopSeconds } from "../src/element/idleStop.ts";

test("a still view stops after 90 seconds unless the page sets a shorter wait", () => {
  assert.equal(IDLE_STOP_MS, 90_000);
  assert.equal(idleStopMs(undefined), 90_000);
  assert.equal(idleStopMs(idleStopSeconds(null)), 90_000);
  assert.equal(idleStopMs(idleStopSeconds("")), 90_000);
  assert.equal(idleStopMs(idleStopSeconds("no")), 90_000);
  assert.equal(idleStopMs(idleStopSeconds("0")), 90_000);
  assert.equal(idleStopMs(idleStopSeconds("-2")), 90_000);
  assert.equal(idleStopMs(idleStopSeconds("4")), 4_000);
});
