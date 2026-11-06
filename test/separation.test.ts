import assert from "node:assert/strict";
import { test } from "node:test";
import { variantOf } from "../src/index.ts";
import { separationOf } from "../src/separation.ts";

test("Miyamoto and Ariake let the command citadel leave, and a rocket does not", () => {
  assert.equal(separationOf("starship"), null);
  for (const rocket of ["fleet-ship-03", "fleet-ship-ariake"]) {
    const plan = separationOf(rocket);
    assert.equal(plan?.slot, "command");
    const variant = rocket === "fleet-ship-ariake" ? "ariake" : "miyamoto";
    assert.ok(variantOf(rocket, variant)?.slots.includes("command"), rocket);
  }
});
